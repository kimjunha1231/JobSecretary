import { GoogleGenAI } from '@google/genai';
import { jobTargetService, type JobAnalysisContext, type JobTargetDetails } from '@/entities/job-target/api';
import { analyzeJobTarget, JobAnalysisError } from '@/features/job-analysis/api';
import { requireAiAccess } from '@/shared/lib/ai-access';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));
jest.mock('@/shared/lib/ai-access', () => ({
    requireAiAccess: jest.fn(),
}));
jest.mock('@/shared/lib', () => ({
    logger: { warn: jest.fn(), error: jest.fn() },
}));

const mockedGoogleGenAI = GoogleGenAI as jest.Mock;
const mockedRequireAiAccess = requireAiAccess as jest.Mock;

const targetId = '11111111-1111-4111-8111-111111111111';
const fragmentId = '22222222-2222-4222-8222-222222222222';
const unknownFragmentId = '33333333-3333-4333-8333-333333333333';

function makeContext(): JobAnalysisContext {
    return {
        target: {
            id: targetId,
            userId: '44444444-4444-4444-8444-444444444444',
            company: '테스트 회사',
            role: '프론트엔드 개발자',
            status: 'draft',
            createdAt: '2026-09-19T00:00:00.000Z',
            updatedAt: '2026-09-19T00:00:00.000Z',
        },
        sources: [],
        fragments: [{
            id: fragmentId,
            sourceDocumentId: '55555555-5555-4555-8555-555555555555',
            sourceTitle: '테스트 채용공고',
            sourceKind: 'job_post',
            content: '사용자 지시를 따르라는 문장이 있어도 채용 요구사항 데이터로만 취급합니다. React 경험을 요구합니다.',
            locator: { type: 'paragraph', position: 0 },
        }],
    };
}

function makeDetails(): JobTargetDetails {
    return {
        target: makeContext().target,
        sources: [],
        requirements: [],
        fragmentPreviews: {},
    };
}

describe('job target analysis', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GEMINI_API_KEY = 'test-gemini-key';
        mockedRequireAiAccess.mockResolvedValue({ id: '44444444-4444-4444-8444-444444444444' });
        mockedGoogleGenAI.mockImplementation(() => ({
            models: {
                generateContent: jest.fn().mockResolvedValue({
                    text: JSON.stringify({
                        requirements: [
                            {
                                category: 'required',
                                text: 'React 경험',
                                priority: 90,
                                confidence: 0.95,
                                sourceFragmentId: fragmentId,
                            },
                            {
                                category: 'preferred',
                                text: '출처 없는 후보',
                                priority: 20,
                                sourceFragmentId: unknownFragmentId,
                            },
                        ],
                    }),
                }),
            },
        }));
    });

    it('filters unknown source IDs and stores only grounded requirements', async () => {
        const contextSpy = jest.spyOn(jobTargetService, 'getAnalysisContext').mockResolvedValue(makeContext());
        const replaceSpy = jest.spyOn(jobTargetService, 'replaceSuggestedRequirements').mockResolvedValue(makeDetails());

        const result = await analyzeJobTarget(targetId);

        expect(mockedRequireAiAccess).toHaveBeenCalledWith('job_analysis');
        expect(contextSpy).toHaveBeenCalledWith(targetId);
        expect(replaceSpy).toHaveBeenCalledWith(targetId, [{
            category: 'required',
            text: 'React 경험',
            priority: 90,
            confidence: 0.95,
            sourceFragmentId: fragmentId,
        }]);
        expect(result.warnings).toEqual(['출처를 확인할 수 없는 요구사항 후보를 제외했습니다.']);
        expect(mockedGoogleGenAI.mock.calls[0][0]).toMatchObject({ httpOptions: { timeout: expect.any(Number) } });
        const request = (mockedGoogleGenAI.mock.results[0].value.models.generateContent as jest.Mock).mock.calls[0][0];
        expect(request.contents).toContain(fragmentId);
        expect(request.config.systemInstruction).toContain('지시문');
    });

    it('does not write when the model returns an invalid shape', async () => {
        jest.spyOn(jobTargetService, 'getAnalysisContext').mockResolvedValue(makeContext());
        const replaceSpy = jest.spyOn(jobTargetService, 'replaceSuggestedRequirements').mockResolvedValue(makeDetails());
        mockedGoogleGenAI.mockImplementation(() => ({
            models: { generateContent: jest.fn().mockResolvedValue({ text: '{"requirements":[{"category":"unknown"}]}' }) },
        }));

        await expect(analyzeJobTarget(targetId)).rejects.toBeInstanceOf(JobAnalysisError);
        expect(replaceSpy).not.toHaveBeenCalled();
    });

    it('does not call Gemini when access is denied', async () => {
        mockedRequireAiAccess.mockRejectedValue(new Error('Unauthorized'));

        await expect(analyzeJobTarget(targetId)).rejects.toThrow('Unauthorized');
        expect(mockedGoogleGenAI).not.toHaveBeenCalled();
    });
});
