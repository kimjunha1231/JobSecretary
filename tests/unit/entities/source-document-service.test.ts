import { createServerSupabaseClient } from '@/shared/api/server';
import {
    sourceDocumentService,
    SourceDocumentServiceError,
} from '@/entities/source-document/api';
import { jobTargetService } from '@/entities/job-target/api';

jest.mock('@/shared/api/server', () => ({
    createServerSupabaseClient: jest.fn(),
}));

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;
const sourceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const fragmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const userId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const timestamp = '2026-09-19T00:00:00.000Z';

describe('source document service boundary', () => {
    beforeEach(() => {
        mockedCreateServerSupabaseClient.mockReset();
    });

    it('checks authentication before extracting an uploaded source', async () => {
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
            },
        });

        await expect(sourceDocumentService.register({
            kind: 'portfolio',
            title: '포트폴리오',
            originType: 'upload',
            buffer: Buffer.from('not parsed because user is signed out'),
            filename: 'portfolio.txt',
        })).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
    });

    it('rejects malformed source IDs before touching the database', async () => {
        await expect(sourceDocumentService.updateStatus('not-a-uuid', { status: 'approved' }))
            .rejects.toBeInstanceOf(SourceDocumentServiceError);
        expect(mockedCreateServerSupabaseClient).not.toHaveBeenCalled();
    });

    it('rejects malformed manual text updates before touching the database', async () => {
        await expect(sourceDocumentService.updateManualText('not-a-uuid', { text: '보정 본문' }))
            .rejects.toMatchObject({ code: 'invalid_input', status: 400 });
        expect(mockedCreateServerSupabaseClient).not.toHaveBeenCalled();
    });

    it('requires authentication before saving manual text for an image-only source', async () => {
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
            },
        });

        await expect(sourceDocumentService.updateManualText('11111111-1111-4111-8111-111111111111', { text: '보정 본문' }))
            .rejects.toMatchObject({ code: 'unauthorized', status: 401 });
    });

    it('checks authentication before creating a job target', async () => {
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
            },
        });

        await expect(jobTargetService.create({
            company: '회사',
            role: '개발자',
        })).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
    });

    it('rejects malformed job target IDs before opening a session', async () => {
        await expect(jobTargetService.get('not-a-uuid')).rejects.toMatchObject({ code: 'invalid_input', status: 400 });
        expect(mockedCreateServerSupabaseClient).not.toHaveBeenCalled();
    });

    it('keeps the authenticated user filter when reading a job target', async () => {
        const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
        const query = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle,
        };
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-a' } } }),
            },
            from: jest.fn().mockReturnValue(query),
        });

        await expect(jobTargetService.get('11111111-1111-4111-8111-111111111111'))
            .rejects.toMatchObject({ code: 'not_found', status: 404 });
        expect(query.eq).toHaveBeenCalledWith('user_id', 'user-a');
    });

    it('stores an uploaded original under a user-scoped private path', async () => {
        const sourceRow = {
            id: sourceId,
            user_id: userId,
            kind: 'portfolio',
            title: '포트폴리오',
            origin_type: 'pasted_text',
            source_url: null,
            storage_path: null,
            raw_text: '검색 개선 프로젝트',
            content_hash: 'a'.repeat(64),
            mime_type: 'text/plain',
            page_count: null,
            status: 'needs_review',
            extraction_method: 'manual',
            extraction_version: 'm2-direct-text-v1',
            extraction_warnings: [],
            fetched_at: null,
            approved_at: null,
            created_at: timestamp,
            updated_at: timestamp,
        };
        const fragmentRow = {
            id: fragmentId,
            source_document_id: sourceId,
            user_id: userId,
            locator: { type: 'paragraph', position: 0 },
            content: '검색 개선 프로젝트',
            created_at: timestamp,
        };
        const sourceInsertQuery = {
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: sourceRow, error: null }),
        };
        const fragmentInsertQuery = {
            select: jest.fn().mockResolvedValue({ data: [fragmentRow], error: null }),
        };
        const storedPath = `${userId}/${sourceId}/original.txt`;
        const sourceUpdateQuery = {
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { ...sourceRow, storage_path: storedPath }, error: null }),
        };
        const storageFile = {
            upload: jest.fn().mockResolvedValue({ data: { path: storedPath }, error: null }),
            remove: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
        const from = jest.fn()
            .mockReturnValueOnce({ insert: jest.fn().mockReturnValue(sourceInsertQuery) })
            .mockReturnValueOnce({ insert: jest.fn().mockReturnValue(fragmentInsertQuery) })
            .mockReturnValueOnce({ update: jest.fn().mockReturnValue(sourceUpdateQuery) });
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
            from,
            storage: { from: jest.fn().mockReturnValue(storageFile) },
        });

        const result = await sourceDocumentService.register({
            kind: 'portfolio',
            title: '포트폴리오',
            originType: 'pasted_text',
            text: '검색 개선 프로젝트',
            mimeType: 'text/plain',
        });

        expect(storageFile.upload).toHaveBeenCalledWith(storedPath, expect.any(Buffer), expect.objectContaining({ contentType: 'text/plain', upsert: false }));
        expect(result.document.storagePath).toBe(storedPath);
        expect(result.fragments).toHaveLength(1);
    });

    it('creates a short-lived signed URL only for the authenticated owner', async () => {
        const query = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { storage_path: `${userId}/${sourceId}/original.pdf` }, error: null }),
        };
        const createSignedUrl = jest.fn().mockResolvedValue({ data: { signedUrl: 'https://storage.example/signed' }, error: null });
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
            from: jest.fn().mockReturnValue(query),
            storage: { from: jest.fn().mockReturnValue({ createSignedUrl }) },
        });

        await expect(sourceDocumentService.createOriginalDownloadUrl(sourceId)).resolves.toBe('https://storage.example/signed');
        expect(query.eq).toHaveBeenCalledWith('user_id', userId);
        expect(createSignedUrl).toHaveBeenCalledWith(`${userId}/${sourceId}/original.pdf`, 300);
    });
});
