import { createServerSupabaseClient } from '@/shared/api/server';
import {
    sourceDocumentService,
    SourceDocumentServiceError,
} from '@/entities/source-document/api';
import { jobTargetService } from '@/entities/job-target/api';
import { extractSourceFile, fetchSourceUrl } from '@/features/source-ingestion/api';

jest.mock('@/shared/api/server', () => ({
    createServerSupabaseClient: jest.fn(),
}));
jest.mock('@/features/source-ingestion/api', () => {
    const actual = jest.requireActual('@/features/source-ingestion/api');
    return {
        ...actual,
        extractSourceFile: jest.fn(),
        fetchSourceUrl: jest.fn(),
    };
});

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;
const mockedExtractSourceFile = extractSourceFile as jest.Mock;
const mockedFetchSourceUrl = fetchSourceUrl as jest.Mock;
const sourceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const fragmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const userId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const timestamp = '2026-09-19T00:00:00.000Z';

describe('source document service boundary', () => {
    beforeEach(() => {
        mockedCreateServerSupabaseClient.mockReset();
        mockedExtractSourceFile.mockReset();
        mockedFetchSourceUrl.mockReset();
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

    it('routes a public PDF URL through the PDF extractor and stores the binary original', async () => {
        const sourceRow = {
            id: sourceId,
            user_id: userId,
            kind: 'resume',
            title: '온라인 이력서',
            origin_type: 'url',
            source_url: 'https://portfolio.example/resume.pdf',
            storage_path: null,
            raw_text: '문제에 집중하는 개발자',
            content_hash: 'b'.repeat(64),
            mime_type: 'application/pdf',
            page_count: 1,
            status: 'needs_review',
            extraction_method: 'direct_text',
            extraction_version: 'm2-direct-text-v1',
            extraction_warnings: [],
            fetched_at: timestamp,
            approved_at: null,
            created_at: timestamp,
            updated_at: timestamp,
        };
        const fragmentRow = {
            id: fragmentId,
            source_document_id: sourceId,
            user_id: userId,
            locator: { type: 'page', page: 1, position: 0 },
            content: '문제에 집중하는 개발자',
            created_at: timestamp,
        };
        const pdfBytes = Uint8Array.from([37, 80, 68, 70]);
        mockedFetchSourceUrl.mockResolvedValue({
            finalUrl: 'https://portfolio.example/resume.pdf',
            contentType: 'application/pdf',
            bytes: pdfBytes,
        });
        mockedExtractSourceFile.mockResolvedValue({
            rawText: '문제에 집중하는 개발자',
            fragments: [{ content: '문제에 집중하는 개발자', locator: { type: 'page', page: 1, position: 0 } }],
            contentHash: 'b'.repeat(64),
            mimeType: 'application/pdf',
            pageCount: 1,
            status: 'needs_review',
            extractionMethod: 'direct_text',
            extractionVersion: 'm2-direct-text-v1',
            warnings: [],
            kind: 'resume',
            originType: 'url',
        });

        const sourceInsertQuery = {
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: sourceRow, error: null }),
        };
        const fragmentInsertQuery = {
            select: jest.fn().mockResolvedValue({ data: [fragmentRow], error: null }),
        };
        const storedPath = `${userId}/${sourceId}/original.pdf`;
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
            kind: 'resume',
            title: '온라인 이력서',
            originType: 'url',
            sourceUrl: 'https://portfolio.example/resume.pdf',
        });

        expect(mockedFetchSourceUrl).toHaveBeenCalledWith('https://portfolio.example/resume.pdf');
        expect(mockedExtractSourceFile).toHaveBeenCalledWith(expect.objectContaining({
            buffer: pdfBytes,
            filename: 'resume.pdf',
            mimeType: 'application/pdf',
            originType: 'url',
        }));
        expect(storageFile.upload).toHaveBeenCalledWith(storedPath, Buffer.from(pdfBytes), expect.objectContaining({
            contentType: 'application/pdf',
        }));
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

    it('downloads an original only through the authenticated owner-scoped storage path', async () => {
        const sourceRow = {
            id: sourceId,
            user_id: userId,
            kind: 'portfolio',
            title: '스캔 포트폴리오',
            origin_type: 'upload',
            source_url: null,
            storage_path: `${userId}/${sourceId}/original.pdf`,
            raw_text: null,
            content_hash: 'a'.repeat(64),
            mime_type: 'application/pdf',
            page_count: 1,
            status: 'manual_input',
            extraction_method: 'none',
            extraction_version: 'm2-direct-text-v1',
            extraction_warnings: ['PDF 본문을 추출하지 못했습니다.'],
            fetched_at: null,
            approved_at: null,
            created_at: timestamp,
            updated_at: timestamp,
        };
        const query = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: sourceRow, error: null }),
        };
        const download = jest.fn().mockResolvedValue({ data: { arrayBuffer: jest.fn().mockResolvedValue(Uint8Array.from([37, 80, 68, 70]).buffer) }, error: null });
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
            from: jest.fn().mockReturnValue(query),
            storage: { from: jest.fn().mockReturnValue({ download }) },
        });

        const result = await sourceDocumentService.getOriginalBytes(sourceId);

        expect(query.eq).toHaveBeenCalledWith('user_id', userId);
        expect(download).toHaveBeenCalledWith(`${userId}/${sourceId}/original.pdf`);
        expect(Buffer.from(result.bytes).toString()).toBe('%PDF');
        expect(result.document.status).toBe('manual_input');
    });

    it('keeps the original PDF identity while replacing only OCR text and fragments', async () => {
        const sourceRow = {
            id: sourceId,
            user_id: userId,
            kind: 'portfolio',
            title: '스캔 포트폴리오',
            origin_type: 'upload',
            source_url: null,
            storage_path: `${userId}/${sourceId}/original.pdf`,
            raw_text: null,
            content_hash: 'b'.repeat(64),
            mime_type: 'application/pdf',
            page_count: 2,
            status: 'manual_input',
            extraction_method: 'none',
            extraction_version: 'm2-direct-text-v1',
            extraction_warnings: ['PDF 본문을 추출하지 못했습니다.'],
            fetched_at: null,
            approved_at: null,
            created_at: timestamp,
            updated_at: timestamp,
        };
        const updatedRow = {
            ...sourceRow,
            raw_text: 'OCR로 읽은 프로젝트',
            status: 'needs_review',
            extraction_method: 'ocr',
            extraction_version: 'm2-gemini-ocr-v1',
            extraction_warnings: ['AI OCR 결과입니다. 원본과 대조한 뒤 검수 완료를 눌러 주세요.'],
        };
        const existingQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: sourceRow, error: null }),
        };
        const updateQuery = {
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: updatedRow, error: null }),
        };
        const deleteQuery = { eq: jest.fn().mockReturnThis() };
        const insertQuery = {};
        const from = jest.fn()
            .mockReturnValueOnce({ select: jest.fn().mockReturnValue(existingQuery) })
            .mockReturnValueOnce({ update: jest.fn().mockReturnValue(updateQuery) })
            .mockReturnValueOnce({ delete: jest.fn().mockReturnValue(deleteQuery) })
            .mockReturnValueOnce({ insert: jest.fn().mockReturnValue(insertQuery) });
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
            from,
        });

        const result = await sourceDocumentService.updateOcrText(sourceId, { text: 'OCR로 읽은 프로젝트' });

        expect(result).toEqual(expect.objectContaining({ extractionMethod: 'ocr', status: 'needs_review', mimeType: 'application/pdf', contentHash: 'b'.repeat(64) }));
        expect(updateQuery.eq).toHaveBeenCalledWith('user_id', userId);
        expect(from).toHaveBeenCalledTimes(4);
    });

    it('does not overwrite an already reviewed source with OCR', async () => {
        const query = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { status: 'approved', kind: 'portfolio' }, error: null }),
        };
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
            from: jest.fn().mockReturnValue(query),
        });

        await expect(sourceDocumentService.updateOcrText(sourceId, { text: '덮어쓰면 안 됨' }))
            .rejects.toMatchObject({ code: 'conflict', status: 409 });
    });
});
