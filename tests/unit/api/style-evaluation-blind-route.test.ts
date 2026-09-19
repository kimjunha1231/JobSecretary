/** @jest-environment node */

import { POST, PATCH } from '@/app/api/style-evaluation-cases/[id]/blind/route';
import { styleEvaluationService, StyleEvaluationServiceError } from '@/entities/style-evaluation';

jest.mock('@/entities/style-evaluation', () => ({
    StyleEvaluationServiceError: class StyleEvaluationServiceError extends Error {
        constructor(public readonly code: string, message: string, public readonly status: number) {
            super(message);
        }
    },
    styleEvaluationService: {
        startBlindComparison: jest.fn(),
        submitBlindPreference: jest.fn(),
    },
}));
jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));

const mockedService = styleEvaluationService as jest.Mocked<typeof styleEvaluationService>;

describe('blind style evaluation route', () => {
    beforeEach(() => jest.clearAllMocks());

    it('starts a comparison without returning the variant assignment', async () => {
        mockedService.startBlindComparison.mockResolvedValue({
            id: '11111111-1111-4111-8111-111111111111',
            leftContent: '답변 A',
            rightContent: '답변 B',
            createdAt: '2026-09-19T00:00:00.000Z',
        });

        const response = await POST(
            new Request('http://localhost/api/style-evaluation-cases/case/blind', {
                method: 'POST',
                body: JSON.stringify({ draftId: '22222222-2222-4222-8222-222222222222' }),
            }),
            { params: Promise.resolve({ id: '33333333-3333-4333-8333-333333333333' }) },
        );

        expect(response.status).toBe(201);
        await expect(response.json()).resolves.toEqual(expect.objectContaining({ leftContent: '답변 A', rightContent: '답변 B' }));
        expect(mockedService.startBlindComparison).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333', { draftId: '22222222-2222-4222-8222-222222222222' });
    });

    it('stores only the selected side and preserves service errors', async () => {
        mockedService.submitBlindPreference.mockResolvedValue({
            id: '11111111-1111-4111-8111-111111111111',
            selectedSide: 'right',
            respondedAt: '2026-09-19T00:00:01.000Z',
        });

        const response = await PATCH(
            new Request('http://localhost/api/style-evaluation-cases/case/blind', {
                method: 'PATCH',
                body: JSON.stringify({ preferenceId: '11111111-1111-4111-8111-111111111111', selectedSide: 'right' }),
            }),
            { params: Promise.resolve({ id: '33333333-3333-4333-8333-333333333333' }) },
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual(expect.objectContaining({ selectedSide: 'right' }));

        mockedService.submitBlindPreference.mockRejectedValue(new StyleEvaluationServiceError('conflict', '이미 선택한 비교입니다.', 409));
        const conflict = await PATCH(
            new Request('http://localhost/api/style-evaluation-cases/case/blind', { method: 'PATCH', body: JSON.stringify({}) }),
            { params: Promise.resolve({ id: '33333333-3333-4333-8333-333333333333' }) },
        );
        expect(conflict.status).toBe(409);
    });
});
