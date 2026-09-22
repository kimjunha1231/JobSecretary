import { createServerSupabaseClient } from '@/shared/api/server';
import { EvidenceRecordServiceError, evidenceRecordService } from '@/entities/evidence-record/api';

jest.mock('@/shared/api/server', () => ({
    createServerSupabaseClient: jest.fn(),
}));

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const recordId = '33333333-3333-4333-8333-333333333333';
const careerItemId = '22222222-2222-4222-8222-222222222222';
const timestamp = '2026-09-19T00:00:00.000Z';
const expectedVersions = { recordVersion: 3, careerItemVersion: 2 };

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
        metrics: [{ label: '탐색 단계', value: '3', unit: '단계' }],
        skills: ['React'],
        competency_tags: ['문제 해결'],
        status: 'approved',
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
        title: '검색 결과 개선',
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
    evidenceRead = { data: evidenceRow(), error: null },
    careerRead = { data: careerRow(), error: null },
    rpcResult = {
        record: evidenceRow({ id: '55555555-5555-4555-8555-555555555555', action: '필터 기능을 추가했습니다.', result: '탐색 단계를 더 줄였습니다.', learning: '조건별 사용 흐름을 비교했습니다.', version: 1, revision_number: 4 }),
        careerItem: careerRow({ version: 3, title: '검색 결과 개선 수정' }),
        sourceFragmentCount: 0,
    },
    rpcError = null,
}: {
    evidenceRead?: QueryResult;
    careerRead?: QueryResult;
    rpcResult?: QueryResult['data'];
    rpcError?: QueryResult['error'];
} = {}) {
    const evidenceReadQuery = createQuery(evidenceRead);
    const careerReadQuery = createQuery(careerRead);
    const rpc = jest.fn().mockResolvedValue({ data: rpcResult, error: rpcError });
    const from = jest.fn((table: string) => {
        if (table === 'evidence_records') return evidenceReadQuery;
        if (table === 'career_items') return careerReadQuery;
        throw new Error(`Unexpected table: ${table}`);
    });
    mockedCreateServerSupabaseClient.mockResolvedValue({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
        from,
        rpc,
    });
    return { from, evidenceReadQuery, careerReadQuery, rpc };
}

const updateInput = {
    title: '검색 결과 개선 수정',
    kind: 'project' as const,
    organization: '제품 팀',
    role: '프론트엔드 개발자',
    startedAt: '2025.01',
    endedAt: '2025.03',
    isCurrent: false,
    summary: '검색 결과 탐색을 개선했습니다.',
    action: '필터 기능을 추가했습니다.',
    result: '탐색 단계를 더 줄였습니다.',
    learning: '조건별 사용 흐름을 비교했습니다.',
};

describe('manual evidence update', () => {
    beforeEach(() => mockedCreateServerSupabaseClient.mockReset());

    it('creates a new owner-scoped revision and preserves the original evidence row', async () => {
        const db = mockDatabase();
        const result = await evidenceRecordService.updateManual(recordId, updateInput, expectedVersions);

        expect(db.from).toHaveBeenNthCalledWith(1, 'evidence_records');
        expect(db.evidenceReadQuery.eq).toHaveBeenCalledWith('user_id', userId);
        expect(db.careerReadQuery.eq).toHaveBeenCalledWith('user_id', userId);
        expect(db.rpc).toHaveBeenCalledWith('revise_evidence_activity', expect.objectContaining({
            p_record_id: recordId,
            p_expected_record_version: 3,
            p_expected_career_version: 2,
            p_title: updateInput.title,
            p_action: updateInput.action,
        }));
        expect(result.sourceFragmentCount).toBe(0);
        expect(result.record.id).toBe('55555555-5555-4555-8555-555555555555');
        expect(result.record.revisionNumber).toBe(4);
        expect(result.record.version).toBe(1);
        expect(result.careerItem.version).toBe(3);
    });

    it('uses an atomic revision RPC so source links stay on the prior evidence row', async () => {
        const db = mockDatabase({
            rpcResult: {
                record: evidenceRow({ id: '55555555-5555-4555-8555-555555555555', version: 1, revision_number: 4, revision_of: recordId }),
                careerItem: careerRow({ title: updateInput.title, version: 3 }),
                sourceFragmentCount: 0,
            },
        });

        const result = await evidenceRecordService.updateManual(recordId, updateInput, expectedVersions);

        expect(db.rpc).toHaveBeenCalledTimes(1);
        expect(result.sourceFragmentCount).toBe(0);
        expect(result.record.revisionOf).toBe(recordId);
    });

    it('reports an optimistic conflict from the transaction RPC', async () => {
        const db = mockDatabase({ rpcError: { code: '40001' } });

        await expect(evidenceRecordService.updateManual(recordId, updateInput, expectedVersions)).rejects.toEqual(expect.objectContaining({
            code: 'conflict',
            status: 409,
        }));
    });

    it('reports a clear service-unavailable error when the migration RPC is missing', async () => {
        mockDatabase({ rpcError: { code: 'PGRST202' } });

        await expect(evidenceRecordService.updateManual(recordId, updateInput, expectedVersions)).rejects.toMatchObject({
            code: 'unavailable',
            status: 503,
        });
    });

    it('rejects malformed activity IDs before accessing the database', async () => {
        await expect(evidenceRecordService.updateManual('not-an-id', updateInput, undefined)).rejects.toMatchObject({ status: 400 });
        expect(mockedCreateServerSupabaseClient).not.toHaveBeenCalled();
    });

    it('requires the versions captured when the edit form was opened', async () => {
        await expect(evidenceRecordService.updateManual(recordId, updateInput, undefined)).rejects.toMatchObject({
            code: 'invalid_input',
            status: 400,
        });
        expect(mockedCreateServerSupabaseClient).not.toHaveBeenCalled();
    });

    it('requires a signed-in user before reading activity records', async () => {
        const from = jest.fn();
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
            from,
        });

        await expect(evidenceRecordService.updateManual(recordId, updateInput, expectedVersions)).rejects.toMatchObject({
            code: 'unauthorized',
            status: 401,
        });
        expect(from).not.toHaveBeenCalled();
    });

    it('returns not found for records outside the authenticated user scope', async () => {
        const db = mockDatabase({ evidenceRead: { data: null, error: null } });

        await expect(evidenceRecordService.updateManual(recordId, updateInput, expectedVersions)).rejects.toMatchObject({
            code: 'not_found',
            status: 404,
        });
        expect(db.from).toHaveBeenCalledTimes(1);
        expect(db.evidenceReadQuery.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('rejects a stale edit snapshot before calling the revision RPC', async () => {
        const db = mockDatabase({ evidenceRead: { data: evidenceRow({ version: 4 }), error: null } });

        await expect(evidenceRecordService.updateManual(recordId, updateInput, expectedVersions)).rejects.toMatchObject({
            code: 'conflict',
            status: 409,
        });
        expect(db.rpc).not.toHaveBeenCalled();
    });

    it('rejects source IDs in an edit request before accessing the database', async () => {
        await expect(evidenceRecordService.updateManual(recordId, { ...updateInput, sourceFragmentIds: ['11111111-1111-4111-8111-111111111111'] }, expectedVersions))
            .rejects.toMatchObject({ code: 'invalid_input', status: 400 });
        expect(mockedCreateServerSupabaseClient).not.toHaveBeenCalled();
    });
});
