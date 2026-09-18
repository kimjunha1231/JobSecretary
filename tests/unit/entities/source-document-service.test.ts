import { createServerSupabaseClient } from '@/shared/api/server';
import {
    sourceDocumentService,
    SourceDocumentServiceError,
} from '@/entities/source-document/api';

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
});
