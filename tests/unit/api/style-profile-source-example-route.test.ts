/** @jest-environment node */

import { POST } from '@/app/api/style-profiles/[id]/examples/from-source/route';
import { StyleProfileServiceError, styleProfileService } from '@/entities/style-profile';

jest.mock('@/entities/style-profile', () => ({
    StyleProfileServiceError: class StyleProfileServiceError extends Error {
        constructor(public readonly code: string, message: string, public readonly status: number) {
            super(message);
        }
    },
    styleProfileService: {
        importSourceDocument: jest.fn(),
    },
}));
jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));

const mockedService = styleProfileService as jest.Mocked<typeof styleProfileService>;
const profileId = '11111111-1111-4111-8111-111111111111';
const sourceDocumentId = '22222222-2222-4222-8222-222222222222';

describe('style profile source example route', () => {
    beforeEach(() => jest.clearAllMocks());

    it('validates the source document before calling the service', async () => {
        const response = await POST(
            new Request('http://localhost/api/style-profiles/profile/examples/from-source', {
                method: 'POST',
                body: JSON.stringify({ sourceDocumentId: 'not-a-uuid' }),
                headers: { 'Content-Type': 'application/json' },
            }),
            { params: Promise.resolve({ id: profileId }) },
        );

        expect(response.status).toBe(400);
        expect(mockedService.importSourceDocument).not.toHaveBeenCalled();
    });

    it('returns the imported profile and examples', async () => {
        mockedService.importSourceDocument.mockResolvedValue({
            profile: { id: profileId } as never,
            examples: [],
        });

        const response = await POST(
            new Request('http://localhost/api/style-profiles/profile/examples/from-source', {
                method: 'POST',
                body: JSON.stringify({ sourceDocumentId }),
                headers: { 'Content-Type': 'application/json' },
            }),
            { params: Promise.resolve({ id: profileId }) },
        );

        expect(response.status).toBe(201);
        expect(mockedService.importSourceDocument).toHaveBeenCalledWith(profileId, sourceDocumentId);
    });

    it('preserves service conflicts', async () => {
        mockedService.importSourceDocument.mockRejectedValue(new StyleProfileServiceError('conflict', '검수 완료한 자료만 가져올 수 있습니다.', 409));

        const response = await POST(
            new Request('http://localhost/api/style-profiles/profile/examples/from-source', {
                method: 'POST',
                body: JSON.stringify({ sourceDocumentId }),
                headers: { 'Content-Type': 'application/json' },
            }),
            { params: Promise.resolve({ id: profileId }) },
        );

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({ error: '검수 완료한 자료만 가져올 수 있습니다.' });
    });
});
