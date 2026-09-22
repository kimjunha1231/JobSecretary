import { createServerSupabaseClient } from '@/shared/api/server';
import { EvidenceRecordServiceError, evidenceRecordService } from '@/entities/evidence-record/api';

jest.mock('@/shared/api/server', () => ({
    createServerSupabaseClient: jest.fn(),
}));

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const recordId = '33333333-3333-4333-8333-333333333333';
const careerItemId = '22222222-2222-4222-8222-222222222222';
const timestamp = '2026-09-22T00:00:00.000Z';

type QueryResult = { data: unknown; error: unknown };
type QueryMock = {
    select: jest.Mock;
    eq: jest.Mock;
    in: jest.Mock;
    update: jest.Mock;
    maybeSingle: jest.Mock;
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
};

function createQuery(result: QueryResult): QueryMock {
    const query = {} as QueryMock;
    query.select = jest.fn(() => query);
    query.eq = jest.fn(() => query);
    query.in = jest.fn(() => query);
    query.update = jest.fn(() => query);
    query.maybeSingle = jest.fn(() => Promise.resolve(result));
    query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
    return query;
}

function evidenceRow(overrides: Record<string, unknown> = {}) {
    return {
        id: recordId,
        career_item_id: careerItemId,
        user_id: userId,
        situation: '사용자 검색이 어려웠습니다.',
        problem: '검색 결과를 찾기 어려웠습니다.',
        action: '기존 결과 흐름을 정리했습니다.',
        result: '탐색 단계를 줄였습니다.',
        learning: '사용자 흐름을 먼저 확인했습니다.',
        metrics: [],
        skills: ['React'],
        competency_tags: ['문제 해결'],
        status: 'approved',
        confidence: null,
        version: 3,
        created_at: timestamp,
        updated_at: timestamp,
        ...overrides,
    };
}

function careerRow(overrides: Record<string, unknown> = {}) {
    return {
        id: careerItemId,
        user_id: userId,
        kind: 'project',
        title: '검색 서비스 개선',
        organization: '제품 팀',
        role: '프론트엔드 개발자',
        started_at: '2025.01',
        ended_at: '2025.03',
        is_current: false,
        summary: '검색 결과 탐색을 개선했습니다.',
        team_size: 4,
        contribution_note: '검색 결과 UI를 담당했습니다.',
        skills: ['React'],
        competency_tags: ['문제 해결'],
        status: 'approved',
        version: 2,
        created_at: timestamp,
        updated_at: timestamp,
        ...overrides,
    };
}

function mockDatabase({
    currentEvidence = { data: evidenceRow(), error: null },
    currentCareer = { data: careerRow(), error: null },
    rpcResult = {
        record: evidenceRow({ status: 'archived', version: 4 }),
        careerItem: careerRow({ status: 'archived', version: 3 }),
        sourceFragmentCount: 1,
    },
    rpcError = null,
    user = { id: userId },
}: {
    currentEvidence?: QueryResult;
    currentCareer?: QueryResult;
    rpcResult?: QueryResult['data'];
    rpcError?: QueryResult['error'];
    user?: { id: string } | null;
} = {}) {
    const evidenceReadQuery = createQuery(currentEvidence);
    const careerReadQuery = createQuery(currentCareer);
    const rpc = jest.fn().mockResolvedValue({ data: rpcResult, error: rpcError });
    const from = jest.fn((table: string) => {
        if (table === 'evidence_records') return evidenceReadQuery;
        if (table === 'career_items') return careerReadQuery;
        throw new Error(`Unexpected table: ${table}`);
    });
    mockedCreateServerSupabaseClient.mockResolvedValue({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
        from,
        rpc,
    });
    return { from, evidenceReadQuery, careerReadQuery, rpc };
}

describe('evidence activity archive status', () => {
    beforeEach(() => mockedCreateServerSupabaseClient.mockReset());

    it('archives owner activity atomically and preserves the source count', async () => {
        const db = mockDatabase();

        const result = await evidenceRecordService.updateStatus(recordId, { status: 'archived' });

        expect(db.careerReadQuery.eq).toHaveBeenCalledWith('user_id', userId);
        expect(db.evidenceReadQuery.eq).toHaveBeenCalledWith('user_id', userId);
        expect(db.rpc).toHaveBeenCalledWith('set_evidence_activity_status', expect.objectContaining({
            p_record_id: recordId,
            p_expected_record_version: 3,
            p_expected_career_version: 2,
            p_next_status: 'archived',
        }));
        expect(result.record.status).toBe('archived');
        expect(result.careerItem.status).toBe('archived');
        expect(result.sourceFragmentCount).toBe(1);
    });

    it('restores an archived activity to the approved state', async () => {
        const db = mockDatabase({
            currentEvidence: { data: evidenceRow({ status: 'archived' }), error: null },
            currentCareer: { data: careerRow({ status: 'archived' }), error: null },
            rpcResult: {
                record: evidenceRow({ status: 'approved', version: 4 }),
                careerItem: careerRow({ status: 'approved', version: 3 }),
                sourceFragmentCount: 1,
            },
        });

        const result = await evidenceRecordService.updateStatus(recordId, { status: 'approved' });

        expect(db.rpc).toHaveBeenCalledWith('set_evidence_activity_status', expect.objectContaining({ p_next_status: 'approved' }));
        expect(result.record.status).toBe('approved');
        expect(result.careerItem.status).toBe('approved');
    });

    it('rejects invalid status, missing records, and mismatched row states before writes', async () => {
        const invalidDatabase = mockDatabase();
        await expect(evidenceRecordService.updateStatus(recordId, { status: 'deleted' })).rejects.toMatchObject({ status: 400 });
        expect(invalidDatabase.rpc).not.toHaveBeenCalled();

        const missingDatabase = mockDatabase({ currentEvidence: { data: null, error: null } });
        await expect(evidenceRecordService.updateStatus(recordId, { status: 'archived' })).rejects.toMatchObject({ status: 404 });
        expect(missingDatabase.rpc).not.toHaveBeenCalled();

        const mismatchDatabase = mockDatabase({ rpcError: { code: '40001' } });
        await expect(evidenceRecordService.updateStatus(recordId, { status: 'archived' })).rejects.toMatchObject({ status: 409 });
        expect(mismatchDatabase.rpc).toHaveBeenCalled();
    });

    it('returns a conflict when an optimistic status update no longer matches', async () => {
        const db = mockDatabase({ rpcError: { code: '40001' } });

        await expect(evidenceRecordService.updateStatus(recordId, { status: 'archived' })).rejects.toMatchObject({ status: 409 });
        expect(db.rpc).toHaveBeenCalledTimes(1);
    });

    it('returns a generic storage error for an unexpected database failure', async () => {
        const db = mockDatabase({ rpcError: { code: 'XX000' } });

        await expect(evidenceRecordService.updateStatus(recordId, { status: 'archived' })).rejects.toMatchObject({
            code: 'storage',
            status: 500,
            message: '활동 상태를 변경하지 못했습니다.',
        });
        expect(db.rpc).toHaveBeenCalledTimes(1);
    });

    it('does not query data when the caller is not authenticated', async () => {
        const db = mockDatabase({ user: null });

        await expect(evidenceRecordService.updateStatus(recordId, { status: 'archived' })).rejects.toMatchObject({ status: 401 });
        expect(db.from).not.toHaveBeenCalled();
    });
});
