import { createServerSupabaseClient } from '@/shared/api/server';
import { evidenceRecordService } from '@/entities/evidence-record/api';

jest.mock('@/shared/api/server', () => ({
    createServerSupabaseClient: jest.fn(),
}));

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const fragmentId = '11111111-1111-4111-8111-111111111111';
const careerItemId = '22222222-2222-4222-8222-222222222222';
const evidenceRecordId = '33333333-3333-4333-8333-333333333333';
const timestamp = '2026-09-19T00:00:00.000Z';

describe('evidence record source provenance', () => {
    beforeEach(() => {
        mockedCreateServerSupabaseClient.mockReset();
    });

    it('stores timeline fields and links reviewed activities to owned source fragments', async () => {
        const sourceQuery = {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [{ id: fragmentId, content: '검색 결과를 개선해 응답 시간을 30% 줄였습니다.' }], error: null }),
        };
        const careerRow = {
            id: careerItemId,
            user_id: userId,
            kind: 'credential',
            title: 'SQL 개발자 자격시험',
            organization: '한국데이터산업진흥원',
            role: 'SQLD',
            started_at: '2025-01',
            ended_at: '2027-01',
            is_current: false,
            summary: '검색 흐름을 개선했습니다.',
            contribution_note: '검색 UI와 상태 관리를 담당했습니다.',
            skills: ['React'],
            competency_tags: ['문제 해결'],
            status: 'approved',
            version: 1,
            created_at: timestamp,
            updated_at: timestamp,
        };
        const evidenceRow = {
            id: evidenceRecordId,
            career_item_id: careerItemId,
            user_id: userId,
            situation: null,
            problem: '검색 응답이 느렸습니다.',
            action: '상태 흐름을 정리했습니다.',
            result: '응답 시간을 줄였습니다.',
            learning: null,
            metrics: [{ label: '응답 시간', value: '30', unit: '%' }],
            skills: ['React'],
            competency_tags: ['문제 해결'],
            status: 'approved',
            confidence: null,
            version: 1,
            created_at: timestamp,
            updated_at: timestamp,
        };
        const careerInsertQuery = {
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: careerRow, error: null }),
        };
        const careerInsert = jest.fn().mockReturnValue(careerInsertQuery);
        const evidenceInsertQuery = {
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: evidenceRow, error: null }),
        };
        const evidenceSourcesInsert = jest.fn().mockResolvedValue({ error: null });
        const from = jest.fn((table: string) => {
            if (table === 'source_fragments') return sourceQuery;
            if (table === 'career_items') return { insert: careerInsert };
            if (table === 'evidence_records') return { insert: jest.fn().mockReturnValue(evidenceInsertQuery) };
            if (table === 'evidence_sources') return { insert: evidenceSourcesInsert };
            throw new Error(`Unexpected table: ${table}`);
        });
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
            from,
        });

        const result = await evidenceRecordService.createManual({
            title: 'SQL 개발자 자격시험',
            kind: 'credential',
            organization: '한국데이터산업진흥원',
            role: 'SQLD',
            startedAt: '2025-01',
            endedAt: '2027-01',
            summary: '데이터베이스 관련 자격시험을 취득했습니다.',
            problem: '관계형 데이터베이스 지식 검증이 필요했습니다.',
            action: 'SQLD 자격시험을 준비하고 응시했습니다.',
            result: 'SQLD 자격을 취득했습니다.',
            metrics: [{ label: '응답 시간', value: '30', unit: '%' }],
            skills: ['React'],
            competencyTags: ['문제 해결'],
            sourceFragmentIds: [fragmentId],
        });

        expect(result.careerItem).toEqual(expect.objectContaining({
            kind: 'credential',
            organization: '한국데이터산업진흥원',
            role: 'SQLD',
            startedAt: '2025-01',
            endedAt: '2027-01',
        }));
        expect(careerInsert).toHaveBeenCalledWith(expect.objectContaining({
            kind: 'credential',
            title: 'SQL 개발자 자격시험',
            organization: '한국데이터산업진흥원',
            role: 'SQLD',
            started_at: '2025-01',
            ended_at: '2027-01',
            status: 'approved',
        }));
        expect(sourceQuery.eq).toHaveBeenCalledWith('user_id', userId);
        expect(result.sourceFragmentCount).toBe(1);
        expect(evidenceSourcesInsert).toHaveBeenCalledWith([expect.objectContaining({
            evidence_record_id: evidenceRecordId,
            source_fragment_id: fragmentId,
            user_id: userId,
            claim_type: 'action',
            quote_excerpt: expect.stringContaining('응답 시간을 30% 줄였습니다'),
            is_primary: true,
        })]);
    });

    it('preserves the requested order when selecting approved activities for export', async () => {
        const firstRecordId = '44444444-4444-4444-8444-444444444444';
        const secondRecordId = '55555555-5555-4555-8555-555555555555';
        const firstCareerId = '66666666-6666-4666-8666-666666666666';
        const secondCareerId = '77777777-7777-4777-8777-777777777777';
        const makeEvidenceRow = (id: string, careerItemId: string, title: string) => ({
            id,
            career_item_id: careerItemId,
            user_id: userId,
            action: `${title} 행동`,
            result: `${title} 결과`,
            metrics: [],
            skills: [],
            competency_tags: [],
            status: 'approved',
            version: 1,
            created_at: timestamp,
            updated_at: timestamp,
        });
        const makeCareerRow = (id: string, title: string) => ({
            id,
            user_id: userId,
            kind: 'project',
            title,
            organization: null,
            role: null,
            started_at: null,
            ended_at: null,
            is_current: false,
            summary: null,
            contribution_note: null,
            skills: [],
            competency_tags: [],
            status: 'approved',
            version: 1,
            created_at: timestamp,
            updated_at: timestamp,
        });
        const evidenceRows = [
            makeEvidenceRow(firstRecordId, firstCareerId, '첫 활동'),
            makeEvidenceRow(secondRecordId, secondCareerId, '두 번째 활동'),
        ];
        const evidenceQuery: { select: jest.Mock; in: jest.Mock; eq: jest.Mock } = {
            select: jest.fn(),
            in: jest.fn(),
            eq: jest.fn(),
        };
        evidenceQuery.select.mockReturnValue(evidenceQuery);
        evidenceQuery.in.mockReturnValue(evidenceQuery);
        evidenceQuery.eq.mockImplementation((column: string) => column === 'status'
            ? Promise.resolve({ data: evidenceRows, error: null })
            : evidenceQuery);
        const careerQuery = {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
                data: [makeCareerRow(firstCareerId, '첫 활동'), makeCareerRow(secondCareerId, '두 번째 활동')],
                error: null,
            }),
        };
        const sourceQuery = {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
        const from = jest.fn((table: string) => {
            if (table === 'evidence_records') return evidenceQuery;
            if (table === 'career_items') return careerQuery;
            if (table === 'evidence_sources') return sourceQuery;
            throw new Error(`Unexpected table: ${table}`);
        });
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
            from,
        });

        const result = await evidenceRecordService.getApprovedByIds([secondRecordId, firstRecordId]);

        expect(result.map(item => item.record.id)).toEqual([secondRecordId, firstRecordId]);
        expect(result.map(item => item.sourceFragmentCount)).toEqual([0, 0]);
        expect(evidenceQuery.in).toHaveBeenCalledWith('id', [secondRecordId, firstRecordId]);
    });
});
