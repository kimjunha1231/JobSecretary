/** @jest-environment node */

import { GET } from '@/app/api/style-evaluation-preferences/summary/route';
import { styleEvaluationService, StyleEvaluationServiceError } from '@/entities/style-evaluation';

jest.mock('@/entities/style-evaluation', () => ({
    StyleEvaluationServiceError: class StyleEvaluationServiceError extends Error {
        constructor(public readonly code: string, message: string, public readonly status: number) {
            super(message);
        }
    },
    styleEvaluationService: {
        getPreferenceSummary: jest.fn(),
    },
}));
jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));

const mockedService = styleEvaluationService as jest.Mocked<typeof styleEvaluationService>;

describe('style preference summary route', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns a privacy-safe aggregate', async () => {
        mockedService.getPreferenceSummary.mockResolvedValue({
            available: true,
            totalComparisons: 2,
            respondedComparisons: 2,
            studioWins: 1,
            baselineWins: 1,
            lastRespondedAt: '2026-09-19T00:01:00.000Z',
        });

        const response = await GET();

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual(expect.objectContaining({
            totalComparisons: 2,
            studioWins: 1,
        }));
    });

    it('preserves service authentication errors', async () => {
        mockedService.getPreferenceSummary.mockRejectedValue(new StyleEvaluationServiceError('unauthorized', '로그인이 필요합니다.', 401));

        const response = await GET();

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: '로그인이 필요합니다.' });
    });
});
