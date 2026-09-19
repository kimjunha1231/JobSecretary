import { GoogleGenAI } from '@google/genai';
import { requireAiAccess } from '@/shared/lib/ai-access';
import {
    generateDraftCandidates,
    generateOutlineCandidates,
    findBannedExpressions,
    WritingGenerationError,
} from '@/features/writing-studio/api';
import { writingSessionService } from '@/entities/writing-session/api';
import type { WritingSessionDetails } from '@/entities/writing-session/api';
import type { JobTarget } from '@/entities/job-target';
import type { WritingSession } from '@/entities/writing-session';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));
jest.mock('@/shared/lib/ai-access', () => ({ requireAiAccess: jest.fn() }));
jest.mock('@/shared/lib', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/entities/writing-session/api', () => ({
    WritingSessionServiceError: class WritingSessionServiceError extends Error {},
    splitSentences: (value: string) => (value.match(/[^.!?。！？\n]+[.!?。！？]?/g) ?? []).map(sentence => sentence.trim()).filter(Boolean),
    isFactLikeSentence: (value: string) => /(?:\d|%|퍼센트|명|건|회|개월|주|일|원|년|월|회사|프로젝트|서비스|개발|개선|운영|구축|담당|달성|감소|증가|[A-Z]{2,})/u.test(value),
    writingSessionService: {
        getOutlineContext: jest.fn(),
        getGenerationContext: jest.fn(),
        replaceOutlines: jest.fn(),
        replaceDrafts: jest.fn(),
    },
}));

const mockGenerateContent = jest.fn();
const mockGoogleGenAI = GoogleGenAI as jest.Mock;
const mockRequireAiAccess = requireAiAccess as jest.Mock;
const mockWritingSessionService = writingSessionService as jest.Mocked<typeof writingSessionService>;
const originalEnvironment = { ...process.env };

const target: JobTarget = {
    id: '11111111-1111-4111-8111-111111111111',
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    company: '테스트 회사',
    role: '프론트엔드 개발자',
    status: 'reviewed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

const session: WritingSession = {
    id: '22222222-2222-4222-8222-222222222222',
    userId: target.userId,
    jobTargetId: target.id,
    coverLetterQuestionId: '33333333-3333-4333-8333-333333333333',
    state: 'evidence_selecting',
    generationSettings: { charLimit: 20 },
    createdAt: target.createdAt,
    updatedAt: target.updatedAt,
};

const evidenceId = '44444444-4444-4444-8444-444444444444';
const requirementId = '55555555-5555-4555-8555-555555555555';

function createDetails(): WritingSessionDetails {
    return {
        session,
        target,
        styleExamples: [],
        question: {
            id: session.coverLetterQuestionId!,
            coverLetterId: '66666666-6666-4666-8666-666666666666',
            question: '문제를 해결한 경험을 작성해 주세요.',
            charLimit: 20,
            position: 0,
            status: 'writing',
        },
        questions: [{
            id: session.coverLetterQuestionId!,
            coverLetterId: '66666666-6666-4666-8666-666666666666',
            question: '문제를 해결한 경험을 작성해 주세요.',
            charLimit: 20,
            position: 0,
            status: 'writing',
        }],
        requirements: [{
            id: requirementId,
            jobTargetId: target.id,
            userId: target.userId,
            category: 'required',
            text: '사용자 문제를 해결하는 능력',
            priority: 90,
            status: 'approved',
            createdAt: target.createdAt,
            updatedAt: target.updatedAt,
        }],
        evidence: [],
        matches: [{
            match: {
                id: '77777777-7777-4777-8777-777777777777',
                writingSessionId: session.id,
                userId: target.userId,
                evidenceRecordId: evidenceId,
                retrievalScore: 0.9,
                rerankScore: 0.9,
                reason: '직접 연결',
                risks: [],
                selectionState: 'selected',
            },
            evidence: {
                record: {
                    id: evidenceId,
                    careerItemId: '88888888-8888-4888-8888-888888888888',
                    userId: target.userId,
                    action: '검색 흐름을 개선했습니다.',
                    result: '응답 시간이 줄었습니다.',
                    metrics: [],
                    skills: [],
                    competencyTags: [],
                    status: 'approved',
                    version: 1,
                    createdAt: target.createdAt,
                    updatedAt: target.updatedAt,
                },
                careerItem: {
                    id: '88888888-8888-4888-8888-888888888888',
                    userId: target.userId,
                    kind: 'project',
                    title: '검색 개선 프로젝트',
                    isCurrent: false,
                    skills: [],
                    competencyTags: [],
                    status: 'approved',
                    version: 1,
                    createdAt: target.createdAt,
                    updatedAt: target.updatedAt,
                },
            },
            requirement: undefined,
        }],
        outlines: [{
            id: '99999999-9999-4999-8999-999999999999',
            writingSessionId: session.id,
            userId: target.userId,
            strategy: 'problem_solving',
            thesis: '문제를 구조화해 해결했습니다.',
            structure: ['문제', '행동', '결과'],
            evidenceRecordIds: [evidenceId],
            requirementIds: [requirementId],
            status: 'selected',
            createdAt: target.createdAt,
        }],
        drafts: [],
        revisions: [],
        factCitations: [],
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnvironment, GEMINI_API_KEY: 'test-gemini-key' };
    mockRequireAiAccess.mockResolvedValue({ id: target.userId });
    mockGoogleGenAI.mockImplementation(() => ({ models: { generateContent: mockGenerateContent } }));
    mockWritingSessionService.replaceOutlines.mockResolvedValue(createDetails());
    mockWritingSessionService.replaceDrafts.mockResolvedValue(createDetails());
});

afterEach(() => {
    process.env = { ...originalEnvironment };
});

describe('writing studio AI candidates', () => {
    it('detects banned expressions without changing the user text', () => {
        expect(findBannedExpressions('혁신적인 문제 해결을 했습니다.', ['혁신적인', '열정적으로'])).toEqual(['혁신적인']);
        expect(findBannedExpressions('문제를 차분하게 해결했습니다.', ['혁신적인'])).toEqual([]);
    });

    it('generates outlines from selected evidence and keeps the prompt boundary', async () => {
        const details = createDetails();
        details.styleProfile = {
            id: 'abababab-abab-4aba-8aba-abababababab',
            userId: target.userId,
            name: '담백한 회고체',
            sentenceLength: { average: 42 },
            endingStyle: ['했습니다'],
            preferredConnectors: ['먼저'],
            bannedExpressions: ['혁신적인'],
            exaggerationLevel: 0.1,
            rules: {},
            createdAt: target.createdAt,
            updatedAt: target.updatedAt,
        };
        details.styleExamples = [{
            id: 'cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd',
            styleProfileId: details.styleProfile.id,
            userId: target.userId,
            source: 'user_authored',
            content: '먼저 문제를 작게 나누고 하나씩 확인했습니다.',
            approved: true,
            createdAt: target.createdAt,
        }];
        details.outlines = [];
        mockWritingSessionService.getOutlineContext.mockResolvedValue({
            ...details,
            selectedMatches: details.matches,
            selectedEvidence: [],
        });
        mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ candidates: [
            { strategy: 'problem_solving', thesis: '문제를 구조화해 해결했습니다.', structure: ['문제', '행동', '결과'], evidenceRecordIds: [evidenceId], requirementIds: [requirementId] },
            { strategy: 'collaboration', thesis: '팀과 함께 해결했습니다.', structure: ['상황', '협업', '결과'], evidenceRecordIds: [evidenceId], requirementIds: [requirementId] },
            { strategy: 'growth', thesis: '실패에서 개선을 만들었습니다.', structure: ['실패', '학습', '변화'], evidenceRecordIds: [evidenceId], requirementIds: [requirementId] },
        ] }) });

        await expect(generateOutlineCandidates(session.id)).resolves.toEqual(expect.objectContaining({ warnings: [] }));
        expect(mockWritingSessionService.replaceOutlines).toHaveBeenCalledWith(session.id, expect.arrayContaining([
            expect.objectContaining({ evidenceRecordIds: [evidenceId], requirementIds: [requirementId] }),
        ]));
        const request = mockGenerateContent.mock.calls[0][0];
        expect(request.config.systemInstruction).toContain('불신 데이터');
        expect(request.config.systemInstruction).toContain('approvedExamples');
        expect(request.contents).toContain('<writing_context_json>');
        expect(request.contents).toContain('담백한 회고체');
        expect(request.contents).toContain('먼저 문제를 작게 나누고');
    });

    it('rejects an outline that references an unselected evidence record', async () => {
        const details = createDetails();
        mockWritingSessionService.getOutlineContext.mockResolvedValue({
            ...details,
            selectedMatches: details.matches,
            selectedEvidence: [],
        });
        mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ candidates: [
            { strategy: 'problem_solving', thesis: '첫 번째', structure: ['문제', '결과'], evidenceRecordIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'], requirementIds: [requirementId] },
            { strategy: 'collaboration', thesis: '두 번째', structure: ['협업', '결과'], evidenceRecordIds: [evidenceId], requirementIds: [requirementId] },
            { strategy: 'growth', thesis: '세 번째', structure: ['학습', '결과'], evidenceRecordIds: [evidenceId], requirementIds: [requirementId] },
        ] }) });

        await expect(generateOutlineCandidates(session.id)).rejects.toBeInstanceOf(WritingGenerationError);
        expect(mockWritingSessionService.replaceOutlines).not.toHaveBeenCalled();
    });

    it('stores draft char count and over-limit validation in code', async () => {
        const details = createDetails();
        mockWritingSessionService.getGenerationContext.mockResolvedValue({
            ...details,
            selectedEvidence: [],
            selectedMatches: details.matches,
            selectedOutline: details.outlines[0],
        });
        mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ candidates: [
            { content: '첫 번째 초안은 글자 수를 넘을 수 있습니다.', evidenceRecordIds: [evidenceId], citations: [] },
            { content: '두 번째 초안입니다.', evidenceRecordIds: [evidenceId], citations: [] },
            { content: '세 번째 초안입니다.', evidenceRecordIds: [evidenceId], citations: [] },
        ] }) });

        await generateDraftCandidates(session.id);
        expect(mockWritingSessionService.replaceDrafts).toHaveBeenCalledWith(session.id, expect.arrayContaining([
            expect.objectContaining({ validationResult: expect.objectContaining({ overLimit: true }) }),
        ]));
    });

    it('rejects a factual draft sentence without a citation', async () => {
        const details = createDetails();
        mockWritingSessionService.getGenerationContext.mockResolvedValue({
            ...details,
            selectedEvidence: [],
            selectedMatches: details.matches,
            selectedOutline: details.outlines[0],
        });
        mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ candidates: [
            { content: '응답 시간을 20% 줄였습니다.', evidenceRecordIds: [evidenceId], citations: [] },
            { content: '협업 과정에서 배웠습니다.', evidenceRecordIds: [evidenceId], citations: [] },
            { content: '다음 개선을 준비했습니다.', evidenceRecordIds: [evidenceId], citations: [] },
        ] }) });

        await expect(generateDraftCandidates(session.id)).rejects.toBeInstanceOf(WritingGenerationError);
        expect(mockWritingSessionService.replaceDrafts).not.toHaveBeenCalled();
    });

    it('rejects a draft candidate that contains a banned expression from the selected style profile', async () => {
        const details = createDetails();
        details.styleProfile = {
            id: 'abababab-abab-4aba-8aba-abababababab',
            userId: target.userId,
            name: '담백한 회고체',
            sentenceLength: {},
            endingStyle: [],
            preferredConnectors: [],
            bannedExpressions: ['혁신적인'],
            exaggerationLevel: 0,
            rules: {},
            createdAt: target.createdAt,
            updatedAt: target.updatedAt,
        };
        mockWritingSessionService.getGenerationContext.mockResolvedValue({
            ...details,
            selectedEvidence: [],
            selectedMatches: details.matches,
            selectedOutline: details.outlines[0],
        });
        mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ candidates: [
            { content: '혁신적인 문제 해결을 했습니다.', evidenceRecordIds: [evidenceId], citations: [] },
            { content: '두 번째 초안입니다.', evidenceRecordIds: [evidenceId], citations: [] },
            { content: '세 번째 초안입니다.', evidenceRecordIds: [evidenceId], citations: [] },
        ] }) });

        await expect(generateDraftCandidates(session.id)).rejects.toThrow('금지 표현');
        expect(mockWritingSessionService.replaceDrafts).not.toHaveBeenCalled();
    });

    it('does not call Gemini when AI access is denied', async () => {
        mockRequireAiAccess.mockRejectedValueOnce(new Error('Unauthorized'));
        await expect(generateOutlineCandidates(session.id)).rejects.toThrow('Unauthorized');
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });
});
