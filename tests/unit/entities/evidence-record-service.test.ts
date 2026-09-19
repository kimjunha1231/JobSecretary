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
            kind: 'project',
            title: '검색 개선',
            organization: '테스트 팀',
            role: '프론트엔드 개발자',
            started_at: '2025-01',
            ended_at: '2025-03',
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
        const evidenceInsertQuery = {
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: evidenceRow, error: null }),
        };
        const evidenceSourcesInsert = jest.fn().mockResolvedValue({ error: null });
        const from = jest.fn((table: string) => {
            if (table === 'source_fragments') return sourceQuery;
            if (table === 'career_items') return { insert: jest.fn().mockReturnValue(careerInsertQuery) };
            if (table === 'evidence_records') return { insert: jest.fn().mockReturnValue(evidenceInsertQuery) };
            if (table === 'evidence_sources') return { insert: evidenceSourcesInsert };
            throw new Error(`Unexpected table: ${table}`);
        });
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
            from,
        });

        const result = await evidenceRecordService.createManual({
            title: '검색 개선',
            kind: 'project',
            organization: '테스트 팀',
            role: '프론트엔드 개발자',
            startedAt: '2025-01',
            endedAt: '2025-03',
            summary: '검색 흐름을 개선했습니다.',
            problem: '검색 응답이 느렸습니다.',
            action: '상태 흐름을 정리했습니다.',
            result: '응답 시간을 줄였습니다.',
            metrics: [{ label: '응답 시간', value: '30', unit: '%' }],
            skills: ['React'],
            competencyTags: ['문제 해결'],
            sourceFragmentIds: [fragmentId],
        });

        expect(result.careerItem).toEqual(expect.objectContaining({ startedAt: '2025-01', endedAt: '2025-03' }));
        expect(sourceQuery.eq).toHaveBeenCalledWith('user_id', userId);
        expect(evidenceSourcesInsert).toHaveBeenCalledWith([expect.objectContaining({
            evidence_record_id: evidenceRecordId,
            source_fragment_id: fragmentId,
            user_id: userId,
            claim_type: 'action',
            quote_excerpt: expect.stringContaining('응답 시간을 30% 줄였습니다'),
            is_primary: true,
        })]);
    });
});
