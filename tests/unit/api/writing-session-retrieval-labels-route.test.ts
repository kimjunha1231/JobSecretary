/** @jest-environment node */

import { GET, PUT } from '@/app/api/writing-sessions/[id]/retrieval-labels/route';
import {
    listRetrievalLabels,
    replaceRetrievalLabels,
    WritingSessionServiceError,
} from '@/entities/writing-session/api';

jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));
jest.mock('@/entities/writing-session/api', () => {
    const actual = jest.requireActual('@/entities/writing-session/api');
    return {
        ...actual,
        listRetrievalLabels: jest.fn(),
        replaceRetrievalLabels: jest.fn(),
    };
});

const mockList = listRetrievalLabels as jest.Mock;
const mockReplace = replaceRetrievalLabels as jest.Mock;

describe('writing-session retrieval label route', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns labels without source content', async () => {
        const labels = [{ requirementId: '11111111-1111-4111-8111-111111111111', evidenceRecordIds: [] }];
        mockList.mockResolvedValue(labels);

        const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ id: 'session-id' }) });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ labels });
        expect(mockList).toHaveBeenCalledWith('session-id');
    });

    it('replaces labels from a JSON request', async () => {
        const labels = [{ requirementId: '11111111-1111-4111-8111-111111111111', evidenceRecordIds: ['22222222-2222-4222-8222-222222222222'] }];
        mockReplace.mockResolvedValue(labels);

        const response = await PUT(new Request('http://localhost', {
            method: 'PUT',
            body: JSON.stringify({ labels }),
        }), { params: Promise.resolve({ id: 'session-id' }) });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ labels });
        expect(mockReplace).toHaveBeenCalledWith('session-id', { labels });
    });

    it('rejects malformed JSON and preserves service errors', async () => {
        const invalid = await PUT(new Request('http://localhost', { method: 'PUT', body: '{' }), {
            params: Promise.resolve({ id: 'session-id' }),
        });
        expect(invalid.status).toBe(400);
        await expect(invalid.json()).resolves.toEqual({ error: 'Invalid JSON body' });
        expect(mockReplace).not.toHaveBeenCalled();

        mockList.mockRejectedValue(new WritingSessionServiceError('not_found', '작성 세션을 찾을 수 없습니다.', 404));
        const missing = await GET(new Request('http://localhost'), { params: Promise.resolve({ id: 'session-id' }) });
        expect(missing.status).toBe(404);
        await expect(missing.json()).resolves.toEqual({ error: '작성 세션을 찾을 수 없습니다.' });
    });
});
