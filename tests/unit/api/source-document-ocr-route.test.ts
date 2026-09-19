/** @jest-environment node */

import { POST } from '@/app/api/source-documents/[id]/ocr/route';
import { SourceDocumentServiceError } from '@/entities/source-document/api';
import { runSourceOcr, SourceOcrError } from '@/features/source-ocr/api';
import { AiAccessError } from '@/shared/lib/ai-access';

jest.mock('@/entities/source-document/api', () => ({
    SourceDocumentServiceError: class SourceDocumentServiceError extends Error {
        constructor(public readonly code: string, message: string, public readonly status: number) {
            super(message);
        }
    },
}));
jest.mock('@/features/source-ocr/api', () => ({
    SourceOcrError: class SourceOcrError extends Error {
        constructor(message: string, public readonly status: number) {
            super(message);
        }
    },
    runSourceOcr: jest.fn(),
}));
jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));

const mockedRunSourceOcr = runSourceOcr as jest.Mock;

describe('source document OCR route', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns the review-gated OCR result', async () => {
        mockedRunSourceOcr.mockResolvedValue({
            document: { id: 'source-id', status: 'needs_review', extractionMethod: 'ocr' },
            warnings: ['원본과 대조해 주세요.'],
            textLength: 20,
        });

        const response = await POST(
            new Request('http://localhost/api/source-documents/source-id/ocr', { method: 'POST' }),
            { params: Promise.resolve({ id: 'source-id' }) },
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual(expect.objectContaining({ textLength: 20 }));
        expect(mockedRunSourceOcr).toHaveBeenCalledWith('source-id');
    });

    it('preserves OCR and service status codes', async () => {
        mockedRunSourceOcr.mockRejectedValueOnce(new SourceOcrError('검수 대기 상태의 자료만 OCR할 수 있습니다.', 409));
        const conflict = await POST(
            new Request('http://localhost/api/source-documents/source-id/ocr', { method: 'POST' }),
            { params: Promise.resolve({ id: 'source-id' }) },
        );
        expect(conflict.status).toBe(409);

        mockedRunSourceOcr.mockRejectedValueOnce(new SourceDocumentServiceError('not_found', '자료를 찾을 수 없습니다.', 404));
        const notFound = await POST(
            new Request('http://localhost/api/source-documents/source-id/ocr', { method: 'POST' }),
            { params: Promise.resolve({ id: 'source-id' }) },
        );
        expect(notFound.status).toBe(404);
    });

    it('returns retry metadata when the AI limiter denies the request', async () => {
        mockedRunSourceOcr.mockRejectedValue(new AiAccessError('RATE_LIMITED', '잠시 후 다시 시도해주세요.', 17));

        const response = await POST(
            new Request('http://localhost/api/source-documents/source-id/ocr', { method: 'POST' }),
            { params: Promise.resolve({ id: 'source-id' }) },
        );

        expect(response.status).toBe(429);
        expect(response.headers.get('Retry-After')).toBe('17');
    });
});
