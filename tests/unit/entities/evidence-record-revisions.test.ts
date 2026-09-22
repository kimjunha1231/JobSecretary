import { createServerSupabaseClient } from '@/shared/api/server';
import { EvidenceRecordServiceError, evidenceRecordService } from '@/entities/evidence-record/api';

jest.mock('@/shared/api/server', () => ({ createServerSupabaseClient: jest.fn() }));

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const careerItemId = '22222222-2222-4222-8222-222222222222';
const currentRecordId = '33333333-3333-4333-8333-333333333333';
const oldRecordId = '44444444-4444-4444-8444-444444444444';
const restoredRecordId = '55555555-5555-4555-8555-555555555555';
const timestamp = '2026-09-22T00:00:00.000Z';

type QueryResult = { data: unknown; error: unknown };
type QueryMock = {
    select: jest.Mock;
    eq: jest.Mock;
    in: jest.Mock;
    order: jest.Mock;
    limit: jest.Mock;
    range: jest.Mock;
    maybeSingle: jest.Mock;
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
};

function createQuery(result: QueryResult) {
    const query = {} as QueryMock;
    query.select = jest.fn(() => query);
    query.eq = jest.fn(() => query);
    query.in = jest.fn(() => query);
    query.order = jest.fn(() => query);
    query.limit = jest.fn(() => query);
    query.range = jest.fn(() => query);
    query.maybeSingle = jest.fn(() => Promise.resolve(result));
    query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
    return query;
}

function evidenceRow(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        career_item_id: careerItemId,
        user_id: userId,
        situation: '검색 사용 흐름을 확인했습니다.',
        problem: '사용자가 결과를 찾기 어려웠습니다.',
        action: '필터 기능을 추가했습니다.',
        result: '탐색 단계를 줄였습니다.',
        learning: '행동 전후를 비교했습니다.',
        metrics: [],
        skills: ['React'],
        competency_tags: ['문제 해결'],
        status: id === currentRecordId ? 'approved' : 'superseded',
        version: 1,
        revision_number: id === currentRecordId ? 3 : 1,
        career_item_snapshot: id === oldRecordId ? careerRow({ title: '이전 활동 이름' }) : careerRow(),
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
        version: 4,
        created_at: timestamp,
        updated_at: timestamp,
        ...overrides,
    };
}

function setup({
    mode = 'history',
    requestedRecord = { data: { id: currentRecordId, career_item_id: careerItemId }, error: null },
    revisions = { data: [evidenceRow(currentRecordId), evidenceRow(oldRecordId)], error: null },
    sourceRows = { data: [
        { evidence_record_id: oldRecordId, source_fragment_id: '66666666-6666-4666-8666-666666666666' },
        { evidence_record_id: oldRecordId, source_fragment_id: '66666666-6666-4666-8666-666666666666' },
    ], error: null },
    recordsForRestore = { data: [evidenceRow(currentRecordId), evidenceRow(oldRecordId)], error: null },
    careerForRestore = { data: { id: careerItemId, status: 'approved', version: 4 }, error: null },
    rpcResult = {
        record: evidenceRow(restoredRecordId, { status: 'approved', revision_number: 4, revision_of: currentRecordId, restored_from_id: oldRecordId }),
        careerItem: careerRow({ title: '이전 활동 이름', version: 5 }),
        sourceFragmentCount: 1,
    },
    rpcError = null,
    user = { id: userId },
}: {
    mode?: 'history' | 'restore';
    requestedRecord?: QueryResult;
    revisions?: QueryResult | QueryResult[];
    sourceRows?: QueryResult;
    recordsForRestore?: QueryResult;
    careerForRestore?: QueryResult;
    rpcResult?: unknown;
    rpcError?: unknown;
    user?: { id: string } | null;
} = {}) {
    const readRequestedQuery = createQuery(requestedRecord);
    const revisionResults = Array.isArray(revisions) ? revisions : [revisions];
    const historyQueries = revisionResults.map(createQuery);
    const historyQuery = historyQueries[0];
    const sourceQuery = createQuery(sourceRows);
    const restoreRecordsQuery = createQuery(recordsForRestore);
    const careerQuery = createQuery(careerForRestore);
    const evidenceQueries = mode === 'history'
        ? [readRequestedQuery, ...historyQueries]
        : [restoreRecordsQuery];
    const sourceQueries = [sourceQuery];
    const from = jest.fn((table: string) => {
        if (table === 'evidence_records') return evidenceQueries.shift();
        if (table === 'evidence_sources') return sourceQueries.shift() ?? sourceQuery;
        if (table === 'career_items') return careerQuery;
        throw new Error(`Unexpected table: ${table}`);
    });
    const rpc = jest.fn().mockResolvedValue({ data: rpcResult, error: rpcError });
    mockedCreateServerSupabaseClient.mockResolvedValue({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
        from,
        rpc,
    });
    return { from, readRequestedQuery, historyQuery, historyQueries, sourceQuery, restoreRecordsQuery, careerQuery, rpc };
}

describe('evidence activity revision history and restore', () => {
    beforeEach(() => mockedCreateServerSupabaseClient.mockReset());

    it('returns owner-scoped version snapshots and citation counts without selecting quote excerpts', async () => {
        const db = setup();

        const result = await evidenceRecordService.getHistory(currentRecordId);

        expect(db.readRequestedQuery.eq).toHaveBeenCalledWith('user_id', userId);
        expect(db.historyQuery.eq).toHaveBeenCalledWith('user_id', userId);
        expect(db.historyQuery.in).toHaveBeenCalledWith('status', ['approved', 'superseded', 'archived']);
        expect(db.sourceQuery.select).toHaveBeenCalledWith('evidence_record_id, source_fragment_id');
        expect(db.sourceQuery.select).not.toHaveBeenCalledWith(expect.stringContaining('quote_excerpt'));
        expect(result).toHaveLength(2);
        expect(result[1]).toEqual(expect.objectContaining({
            record: expect.objectContaining({ id: oldRecordId, revisionNumber: 1 }),
            careerItemSnapshot: expect.objectContaining({ title: '이전 활동 이름' }),
            sourceFragmentCount: 1,
        }));
        expect(JSON.stringify(result)).not.toContain('quote_excerpt');
    });

    it('paginates through every revision when a chain contains more than one page', async () => {
        const rows = Array.from({ length: 105 }, (_, index) => {
            const id = `${String(index + 10).padStart(8, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
            return evidenceRow(id, { revision_number: 105 - index });
        });
        const db = setup({ revisions: [
            { data: rows.slice(0, 100), error: null },
            { data: rows.slice(100), error: null },
        ] });

        const result = await evidenceRecordService.getHistory(currentRecordId);

        expect(result).toHaveLength(105);
        expect(db.historyQueries[0].range).toHaveBeenCalledWith(0, 99);
        expect(db.historyQueries[1].range).toHaveBeenCalledWith(100, 199);
    });

    it('does not reveal a record outside the authenticated user scope', async () => {
        const db = setup({ requestedRecord: { data: null, error: null } });

        await expect(evidenceRecordService.getHistory(currentRecordId)).rejects.toMatchObject({ code: 'not_found', status: 404 });
        expect(db.from).toHaveBeenCalledTimes(1);
    });

    it('explains that the database migration is required when revision columns are missing', async () => {
        setup({ revisions: { data: null, error: { code: 'PGRST204' } } });

        await expect(evidenceRecordService.getHistory(currentRecordId)).rejects.toMatchObject({ code: 'unavailable', status: 503 });
    });

    it('restores an earlier revision as a new current revision through the owner-scoped RPC', async () => {
        const db = setup({ mode: 'restore' });

        const result = await evidenceRecordService.restoreRevision(currentRecordId, oldRecordId);

        expect(db.restoreRecordsQuery.in).toHaveBeenCalledWith('id', [currentRecordId, oldRecordId]);
        expect(db.careerQuery.eq).toHaveBeenCalledWith('user_id', userId);
        expect(db.rpc).toHaveBeenCalledWith('restore_evidence_activity_revision', expect.objectContaining({
            p_current_record_id: currentRecordId,
            p_target_record_id: oldRecordId,
            p_expected_current_record_version: 1,
            p_expected_career_version: 4,
            p_expected_target_record_version: 1,
        }));
        expect(result.record.id).toBe(restoredRecordId);
        expect(result.record.restoredFromId).toBe(oldRecordId);
        expect(result.sourceFragmentCount).toBe(1);
    });

    it('rejects unrelated, current, or snapshot-less versions before invoking restore', async () => {
        const mismatch = setup({ mode: 'restore', recordsForRestore: { data: [evidenceRow(currentRecordId), evidenceRow(oldRecordId, { career_item_id: '77777777-7777-4777-8777-777777777777' })], error: null } });
        await expect(evidenceRecordService.restoreRevision(currentRecordId, oldRecordId)).rejects.toMatchObject({ status: 409 });
        expect(mismatch.rpc).not.toHaveBeenCalled();

        const noSnapshot = setup({ mode: 'restore', recordsForRestore: { data: [evidenceRow(currentRecordId), evidenceRow(oldRecordId, { career_item_snapshot: null })], error: null } });
        await expect(evidenceRecordService.restoreRevision(currentRecordId, oldRecordId)).rejects.toMatchObject({ status: 409 });
        expect(noSnapshot.rpc).not.toHaveBeenCalled();
    });

    it('does not misreport a missing revision migration as a user conflict', async () => {
        const legacyTarget = Object.fromEntries(Object.entries(evidenceRow(oldRecordId))
            .filter(([key]) => key !== 'revision_number' && key !== 'career_item_snapshot'));
        const db = setup({ mode: 'restore', recordsForRestore: { data: [evidenceRow(currentRecordId), legacyTarget], error: null } });

        await expect(evidenceRecordService.restoreRevision(currentRecordId, oldRecordId)).rejects.toMatchObject({ code: 'unavailable', status: 503 });
        expect(db.rpc).not.toHaveBeenCalled();
    });

    it('maps stale restore versions to a conflict and does not leak database details', async () => {
        const db = setup({ mode: 'restore', rpcError: { code: '40001', message: 'private database detail' } });

        await expect(evidenceRecordService.restoreRevision(currentRecordId, oldRecordId)).rejects.toEqual(expect.objectContaining({
            code: 'conflict',
            status: 409,
            message: '다른 화면에서 활동이 먼저 변경되었습니다. 새로고침 후 다시 시도해 주세요.',
        } satisfies Partial<EvidenceRecordServiceError>));
        expect(db.rpc).toHaveBeenCalledTimes(1);
    });
});
