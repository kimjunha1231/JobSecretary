import {
    CareerExtractionError,
    generateCareerCandidates,
    parseModelResponse,
    validateCandidates,
} from '@/features/career-extraction/api';
import { GoogleGenAI } from '@google/genai';
import { sourceDocumentService } from '@/entities/source-document/api';
import { requireAiAccess } from '@/shared/lib/ai-access';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));
jest.mock('@/entities/source-document/api', () => ({
    SourceDocumentServiceError: class SourceDocumentServiceError extends Error {},
    sourceDocumentService: { get: jest.fn() },
}));
jest.mock('@/shared/lib/ai-access', () => ({ requireAiAccess: jest.fn() }));
jest.mock('@/shared/lib', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

const fragmentId = '11111111-1111-4111-8111-111111111111';
const otherFragmentId = '22222222-2222-4222-8222-222222222222';
const sourceDocumentId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';

const mockedGoogleGenAI = GoogleGenAI as jest.Mock;
const mockedSourceDocumentService = sourceDocumentService as jest.Mocked<typeof sourceDocumentService>;
const mockedRequireAiAccess = requireAiAccess as jest.Mock;
const originalEnvironment = { ...process.env };

describe('career candidate extraction validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnvironment, GEMINI_API_KEY: 'test-gemini-key' };
        mockedRequireAiAccess.mockResolvedValue({ id: userId });
    });

    afterAll(() => {
        process.env = originalEnvironment;
    });

    it('parses a JSON response wrapped in a markdown code fence', () => {
        expect(parseModelResponse(`\n\`\`\`json\n${JSON.stringify({ candidates: [{ kind: 'project', title: '검색 개선', sourceFragmentIds: [fragmentId] }] })}\n\`\`\`\n`)).toEqual({
            candidates: [{
                kind: 'project',
                title: '검색 개선',
                isCurrent: false,
                metrics: [],
                skills: [],
                competencyTags: [],
                sourceFragmentIds: [fragmentId],
            }],
        });
    });

    it('accepts source-grounded credential candidates for certificates and language scores', () => {
        const parsed = parseModelResponse(JSON.stringify({ candidates: [{
            kind: 'credential',
            title: 'TOEIC Speaking',
            organization: '시험 기관',
            result: 'IH',
            sourceFragmentIds: [fragmentId],
        }] }));
        const result = validateCandidates(parsed.candidates, new Set([fragmentId]));

        expect(result.candidates).toEqual([expect.objectContaining({
            kind: 'credential',
            title: 'TOEIC Speaking',
            result: 'IH',
            sourceFragmentIds: [fragmentId],
        })]);
        expect(result.warnings).toEqual([]);
    });

    it('rejects malformed or structurally invalid model output', () => {
        expect(() => parseModelResponse('{"candidates":[{"kind":"unknown"}]}')).toThrow(CareerExtractionError);
        expect(() => parseModelResponse('not json')).toThrow(CareerExtractionError);
    });

    it('filters candidates with unknown source fragments and deduplicates titles', () => {
        const result = validateCandidates([
            { kind: 'project', title: '검색 개선', sourceFragmentIds: [fragmentId], isCurrent: false, metrics: [], skills: [], competencyTags: [] },
            { kind: 'project', title: '  검색   개선 ', sourceFragmentIds: [fragmentId], isCurrent: false, metrics: [], skills: [], competencyTags: [] },
            { kind: 'work', title: '출처 없음', sourceFragmentIds: [otherFragmentId], isCurrent: false, metrics: [], skills: [], competencyTags: [] },
        ], new Set([fragmentId]));

        expect(result.candidates).toHaveLength(1);
        expect(result.candidates[0]).toEqual(expect.objectContaining({ title: '검색 개선' }));
        expect(result.warnings).toEqual(['출처를 확인할 수 없는 활동 후보를 제외했습니다.']);
    });

    it('fails closed when every candidate lacks a trusted source fragment', () => {
        expect(() => validateCandidates([
            { kind: 'project', title: '검증 불가', sourceFragmentIds: [otherFragmentId], isCurrent: false, metrics: [], skills: [], competencyTags: [] },
        ], new Set([fragmentId]))).toThrow(expect.objectContaining({ status: 422 }));
    });

    it('does not call Gemini until the source document is approved', async () => {
        mockedSourceDocumentService.get.mockResolvedValue({
            document: {
                id: sourceDocumentId,
                userId,
                kind: 'portfolio',
                title: '포트폴리오',
                originType: 'upload',
                status: 'needs_review',
                extractionMethod: 'direct_text',
                extractionWarnings: [],
                createdAt: '2026-09-19T00:00:00.000Z',
                updatedAt: '2026-09-19T00:00:00.000Z',
            },
            fragments: [{
                id: fragmentId,
                sourceDocumentId,
                userId,
                locator: { type: 'paragraph', position: 0 },
                content: '검색 개선 프로젝트',
                createdAt: '2026-09-19T00:00:00.000Z',
            }],
        });

        await expect(generateCareerCandidates(sourceDocumentId)).rejects.toThrow('먼저 자료를 검수 완료해 주세요.');
        expect(mockedGoogleGenAI).not.toHaveBeenCalled();
    });

    it('returns only source-grounded candidates for an approved document', async () => {
        mockedSourceDocumentService.get.mockResolvedValue({
            document: {
                id: sourceDocumentId,
                userId,
                kind: 'portfolio',
                title: '포트폴리오',
                originType: 'upload',
                status: 'approved',
                extractionMethod: 'direct_text',
                extractionWarnings: [],
                createdAt: '2026-09-19T00:00:00.000Z',
                updatedAt: '2026-09-19T00:00:00.000Z',
            },
            fragments: [{
                id: fragmentId,
                sourceDocumentId,
                userId,
                locator: { type: 'paragraph', position: 0 },
                content: '검색 개선 프로젝트',
                createdAt: '2026-09-19T00:00:00.000Z',
            }],
        });
        const generateContent = jest.fn().mockResolvedValue({
            text: JSON.stringify({ candidates: [
                { kind: 'project', title: '검색 개선', summary: '검색 흐름을 개선했습니다.', sourceFragmentIds: [fragmentId] },
                { kind: 'project', title: '출처 없음', sourceFragmentIds: [otherFragmentId] },
            ] }),
        });
        mockedGoogleGenAI.mockImplementation(() => ({ models: { generateContent } }));

        const result = await generateCareerCandidates(sourceDocumentId);

        expect(result.candidates).toHaveLength(1);
        expect(result.candidates[0]).toEqual(expect.objectContaining({ title: '검색 개선', sourceFragmentIds: [fragmentId] }));
        expect(result.warnings).toEqual(['출처를 확인할 수 없는 활동 후보를 제외했습니다.']);
        expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({ contents: expect.stringContaining(fragmentId) }));
        expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
            config: expect.objectContaining({
                systemInstruction: expect.stringContaining('자격증·면허·어학 시험'),
            }),
        }));
    });
});
