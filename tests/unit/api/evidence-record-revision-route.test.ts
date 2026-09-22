/** @jest-environment node */

import { GET as getHistory } from '@/app/api/evidence-records/[id]/history/route';
import { POST as restoreRevision } from '@/app/api/evidence-records/[id]/restore/route';
import { EvidenceRecordServiceError, evidenceRecordService } from '@/entities/evidence-record/api';

jest.mock('@/entities/evidence-record/api', () => ({
    EvidenceRecordServiceError: class EvidenceRecordServiceError extends Error {
        constructor(public readonly code: string, message: string, public readonly status: number) { super(message); }
    },
    evidenceRecordService: { getHistory: jest.fn(), restoreRevision: jest.fn() },
}));
jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));

const mockedGetHistory = evidenceRecordService.getHistory as jest.Mock;
const mockedRestoreRevision = evidenceRecordService.restoreRevision as jest.Mock;
const recordId = '33333333-3333-4333-8333-333333333333';
const revisionId = '44444444-4444-4444-8444-444444444444';

describe('evidence record revision routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetHistory.mockResolvedValue([{ record: { id: revisionId }, careerItemSnapshot: null, sourceFragmentCount: 1 }]);
        mockedRestoreRevision.mockResolvedValue({ record: { id: '55555555-5555-4555-8555-555555555555' } });
    });

    it('returns owner-scoped version history', async () => {
        const response = await getHistory(new Request(`http://localhost/api/evidence-records/${recordId}/history`), {
            params: Promise.resolve({ id: recordId }),
        });

        expect(response.status).toBe(200);
        expect(mockedGetHistory).toHaveBeenCalledWith(recordId);
        await expect(response.json()).resolves.toHaveLength(1);
    });

    it('passes the selected previous revision to the restore service', async () => {
        const response = await restoreRevision(new Request(`http://localhost/api/evidence-records/${recordId}/restore`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ revisionId }),
        }), { params: Promise.resolve({ id: recordId }) });

        expect(response.status).toBe(200);
        expect(mockedRestoreRevision).toHaveBeenCalledWith(recordId, revisionId);
    });

    it('rejects malformed JSON before the restore service runs', async () => {
        const response = await restoreRevision(new Request(`http://localhost/api/evidence-records/${recordId}/restore`, {
            method: 'POST',
            body: '{',
        }), { params: Promise.resolve({ id: recordId }) });

        expect(response.status).toBe(400);
        expect(mockedRestoreRevision).not.toHaveBeenCalled();
    });

    it('preserves restore conflicts from the service', async () => {
        mockedRestoreRevision.mockRejectedValue(new EvidenceRecordServiceError('conflict', '복원 충돌', 409));
        const response = await restoreRevision(new Request(`http://localhost/api/evidence-records/${recordId}/restore`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ revisionId }),
        }), { params: Promise.resolve({ id: recordId }) });

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({ error: '복원 충돌' });
    });
});
