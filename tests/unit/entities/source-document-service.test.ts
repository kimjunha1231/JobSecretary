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
});
