/** @jest-environment node */

import { GET } from '@/app/api/evidence-records/route';
import { PATCH } from '@/app/api/evidence-records/[id]/status/route';
import { EvidenceRecordServiceError, evidenceRecordService } from '@/entities/evidence-record/api';
import { NextRequest } from 'next/server';

jest.mock('@/entities/evidence-record/api', () => ({
    EvidenceRecordServiceError: class EvidenceRecordServiceError extends Error {
        constructor(public readonly code: string, message: string, public readonly status: number) {
            super(message);
        }
    },
    evidenceRecordService: {
        listApproved: jest.fn(),
        updateStatus: jest.fn(),
    },
}));
jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));

const mockedListActivities = evidenceRecordService.listApproved as jest.Mock;
const mockedUpdateStatus = evidenceRecordService.updateStatus as jest.Mock;
const recordId = '33333333-3333-4333-8333-333333333333';

describe('evidence activity status routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedListActivities.mockResolvedValue([]);
        mockedUpdateStatus.mockResolvedValue({
            record: { id: recordId, status: 'archived' },
            careerItem: { title: '검색 서비스 개선', status: 'archived' },
            sourceFragmentCount: 1,
        });
    });

    it('accepts only the requested list status and limit query', async () => {
        const response = await GET(new NextRequest('http://localhost/api/evidence-records?limit=20&status=archived'));

        expect(response.status).toBe(200);
        expect(mockedListActivities).toHaveBeenCalledWith({ limit: '20', status: 'archived' });
    });

    it('passes status updates to the owner-scoped service', async () => {
        const body = { status: 'archived' };
        const response = await PATCH(new Request(`http://localhost/api/evidence-records/${recordId}/status`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        }), { params: Promise.resolve({ id: recordId }) });

        expect(response.status).toBe(200);
        expect(mockedUpdateStatus).toHaveBeenCalledWith(recordId, body);
        await expect(response.json()).resolves.toEqual(expect.objectContaining({ sourceFragmentCount: 1 }));
    });

    it('rejects malformed JSON before calling the service', async () => {
        const response = await PATCH(new Request(`http://localhost/api/evidence-records/${recordId}/status`, {
            method: 'PATCH',
            body: '{',
        }), { params: Promise.resolve({ id: recordId }) });

        expect(response.status).toBe(400);
        expect(mockedUpdateStatus).not.toHaveBeenCalled();
    });

    it('preserves service status conflicts', async () => {
        mockedUpdateStatus.mockRejectedValue(new EvidenceRecordServiceError('conflict', '활동 상태가 이미 바뀌었습니다.', 409));
        const response = await PATCH(new Request(`http://localhost/api/evidence-records/${recordId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'archived' }),
        }), { params: Promise.resolve({ id: recordId }) });

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({ error: '활동 상태가 이미 바뀌었습니다.' });
    });
});
