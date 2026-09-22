/** @jest-environment node */

import { PATCH } from '@/app/api/evidence-records/[id]/route';
import { EvidenceRecordServiceError, evidenceRecordService } from '@/entities/evidence-record/api';

jest.mock('@/entities/evidence-record/api', () => ({
    EvidenceRecordServiceError: class EvidenceRecordServiceError extends Error {
        constructor(public readonly code: string, message: string, public readonly status: number) {
            super(message);
        }
    },
    evidenceRecordService: { updateManual: jest.fn() },
}));
jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));

const mockedUpdateManual = evidenceRecordService.updateManual as jest.Mock;
const recordId = '33333333-3333-4333-8333-333333333333';

describe('manual evidence update route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedUpdateManual.mockResolvedValue({
            record: { id: recordId, action: '개선했습니다.' },
            careerItem: { id: '22222222-2222-4222-8222-222222222222', title: '검색 개선' },
            sourceFragmentCount: 0,
        });
    });

    it('passes the route ID and validated body to the service', async () => {
        const body = { title: '검색 개선', kind: 'project', summary: '검색 흐름을 개선했습니다.', action: '화면을 수정했습니다.', result: '탐색이 쉬워졌습니다.' };
        const requestBody = { ...body, expectedRecordVersion: 3, expectedCareerVersion: 2 };
        const response = await PATCH(new Request(`http://localhost/api/evidence-records/${recordId}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(requestBody),
        }), { params: Promise.resolve({ id: recordId }) });

        expect(response.status).toBe(200);
        expect(mockedUpdateManual).toHaveBeenCalledWith(recordId, body, { recordVersion: 3, careerItemVersion: 2 });
        await expect(response.json()).resolves.toEqual(expect.objectContaining({ sourceFragmentCount: 0 }));
    });

    it('rejects malformed JSON without calling the service', async () => {
        const response = await PATCH(new Request(`http://localhost/api/evidence-records/${recordId}`, {
            method: 'PATCH',
            body: '{',
        }), { params: Promise.resolve({ id: recordId }) });

        expect(response.status).toBe(400);
        expect(mockedUpdateManual).not.toHaveBeenCalled();
    });

    it('preserves the conflict response for source-linked activities', async () => {
        mockedUpdateManual.mockRejectedValue(new EvidenceRecordServiceError(
            'conflict',
            '원본 근거가 연결된 활동은 직접 수정할 수 없습니다.',
            409,
        ));
        const response = await PATCH(new Request(`http://localhost/api/evidence-records/${recordId}`, {
            method: 'PATCH',
            body: JSON.stringify({}),
        }), { params: Promise.resolve({ id: recordId }) });

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({ error: '원본 근거가 연결된 활동은 직접 수정할 수 없습니다.' });
    });
});
