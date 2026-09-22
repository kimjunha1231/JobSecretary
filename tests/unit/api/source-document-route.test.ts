/** @jest-environment node */

import { POST } from '@/app/api/source-documents/route';
import { sourceDocumentService } from '@/entities/source-document/api';
import { AiAccessError, requireUserRateLimit } from '@/shared/lib/ai-access';

jest.mock('@/entities/source-document/api', () => ({
    SourceDocumentServiceError: class SourceDocumentServiceError extends Error {
        constructor(public readonly code: string, message: string, public readonly status: number) {
            super(message);
        }
    },
    sourceDocumentService: { register: jest.fn() },
}));
jest.mock('@/shared/lib/ai-access', () => ({
    AiAccessError: class AiAccessError extends Error {
        constructor(
            public readonly code: 'UNAUTHORIZED' | 'RATE_LIMITED',
            message: string,
            public readonly retryAfterSeconds?: number,
        ) {
            super(message);
        }
    },
    requireUserRateLimit: jest.fn(),
}));
jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));

const mockedRegister = sourceDocumentService.register as jest.Mock;
const mockedRequireUserRateLimit = requireUserRateLimit as jest.Mock;

describe('source document registration route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedRequireUserRateLimit.mockResolvedValue({ id: 'user-id' });
        mockedRegister.mockResolvedValue({
            document: { id: 'source-id', rawText: 'private source text', status: 'needs_review' },
            fragments: [],
            warnings: [],
        });
    });

    it('checks the ingestion budget before parsing the request body', async () => {
        const response = await POST(new Request('http://localhost/api/source-documents', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ kind: 'resume', title: '이력서', originType: 'pasted_text', text: '경력 내용' }),
        }) as never);

        expect(response.status).toBe(201);
        expect(mockedRequireUserRateLimit).toHaveBeenCalledWith(
            'source_ingestion',
            '자료 등록 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        );
        expect(mockedRegister).toHaveBeenCalledWith(expect.objectContaining({ kind: 'resume', text: '경력 내용' }));
        await expect(response.json()).resolves.toEqual(expect.objectContaining({
            document: { id: 'source-id', status: 'needs_review' },
        }));
    });

    it('returns retry metadata when ingestion is rate limited', async () => {
        mockedRequireUserRateLimit.mockRejectedValue(new AiAccessError('RATE_LIMITED', '자료 등록 요청이 너무 많습니다.', 12));

        const response = await POST(new Request('http://localhost/api/source-documents', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
        }) as never);

        expect(response.status).toBe(429);
        expect(response.headers.get('Retry-After')).toBe('12');
        expect(mockedRegister).not.toHaveBeenCalled();
    });
});
