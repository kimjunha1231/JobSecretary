import { createServerSupabaseClient } from '@/shared/api/server';
import { writingSessionService } from '@/entities/writing-session/api';
import {
    answerHash,
    evaluateAnswer,
    styleEvaluationService,
    StyleEvaluationServiceError,
} from '@/entities/style-evaluation/api';

jest.mock('@/shared/api/server', () => ({
    createServerSupabaseClient: jest.fn(),
}));
jest.mock('@/entities/writing-session/api', () => {
    const actual = jest.requireActual('@/entities/writing-session/api');
    return { ...actual, writingSessionService: { get: jest.fn() } };
});

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;
const mockedWritingSessionService = writingSessionService as jest.Mocked<typeof writingSessionService>;

describe('style evaluation service', () => {
    beforeEach(() => {
        mockedCreateServerSupabaseClient.mockReset();
    });

    it('calculates deterministic quality metrics without storing answer text', () => {
        const content = '프로젝트에서 응답 시간을 20% 줄였습니다. 협업 방식을 개선했습니다.';
        const first = evaluateAnswer(content, {
            charLimit: 10,
            bannedExpressions: ['개선'],
            factCitationSentenceIndexes: [0],
        });
        const second = evaluateAnswer(content, {
            charLimit: 10,
            bannedExpressions: ['개선'],
            factCitationSentenceIndexes: [0],
        });

        expect(first).toEqual(second);
        expect(first).toMatchObject({
            charCount: Array.from(content).length,
            charLimit: 10,
            overLimit: true,
            bannedExpressionCount: 1,
            factSentenceCount: 2,
            verifiedFactSentenceCount: 1,
            factCitationCoverage: 0.5,
            score: 65,
        });
        expect(answerHash(content)).toMatch(/^[a-f0-9]{64}$/);
    });

    it('does not count unverified fact sentences as covered', () => {
        const result = evaluateAnswer('숫자 20%를 달성했습니다.', {
            charLimit: 700,
            factCitationSentenceIndexes: [],
        });

        expect(result.factSentenceCount).toBe(1);
        expect(result.verifiedFactSentenceCount).toBe(0);
        expect(result.factCitationCoverage).toBe(0);
    });

    it('rejects malformed session ids before opening Supabase', async () => {
        await expect(styleEvaluationService.listCases('not-a-uuid'))
            .rejects.toMatchObject({ code: 'invalid_input', status: 400 });
        expect(mockedCreateServerSupabaseClient).not.toHaveBeenCalled();
    });

    it('requires authentication before reading evaluation cases', async () => {
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
        });

        await expect(styleEvaluationService.listCases('11111111-1111-4111-8111-111111111111'))
            .rejects.toBeInstanceOf(StyleEvaluationServiceError);
        await expect(styleEvaluationService.listCases('22222222-2222-4222-8222-222222222222'))
            .rejects.toMatchObject({ code: 'unauthorized', status: 401 });
    });

    it('rejects malformed blind comparison input before authentication', async () => {
        await expect(styleEvaluationService.startBlindComparison('not-a-uuid', { draftId: 'not-a-uuid' }))
            .rejects.toMatchObject({ code: 'invalid_input', status: 400 });
        await expect(styleEvaluationService.submitBlindPreference('not-a-uuid', { preferenceId: 'not-a-uuid', selectedSide: 'left' }))
            .rejects.toMatchObject({ code: 'invalid_input', status: 400 });
        expect(mockedCreateServerSupabaseClient).not.toHaveBeenCalled();
    });

    it('requires authentication before starting a blind comparison', async () => {
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
        });

        await expect(styleEvaluationService.startBlindComparison(
            '11111111-1111-4111-8111-111111111111',
            { draftId: '22222222-2222-4222-8222-222222222222' },
        )).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
        expect(mockedWritingSessionService.get).not.toHaveBeenCalled();
    });
});
