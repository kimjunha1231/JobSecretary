import { createServerSupabaseClient } from '@/shared/api/server';
import { jobTargetService } from '@/entities/job-target/api';
import { styleProfileService } from '@/entities/style-profile/api';
import { CareerProfileServiceError, careerProfileService } from '@/entities/career-profile/api';
import { writingSessionService } from '@/entities/writing-session/api';
import { evidenceRecordService } from '@/entities/evidence-record/api';

jest.mock('@/shared/api/server', () => ({
    createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/entities/job-target/api', () => ({
    jobTargetService: { get: jest.fn() },
}));

jest.mock('@/entities/style-profile/api', () => ({
    styleProfileService: { getForGeneration: jest.fn() },
}));

jest.mock('@/entities/career-profile/api', () => ({
    CareerProfileServiceError: class CareerProfileServiceError extends Error {
        constructor(public readonly code: string, message: string, public readonly status: number) {
            super(message);
        }
    },
    careerProfileService: { get: jest.fn() },
}));

jest.mock('@/entities/evidence-record/api', () => ({
    evidenceRecordService: { listApproved: jest.fn(), getApprovedByIds: jest.fn() },
}));

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;
const mockedJobTargetGet = jobTargetService.get as jest.Mock;
const mockedStyleProfileGetForGeneration = styleProfileService.getForGeneration as jest.Mock;
const mockedCareerProfileGet = careerProfileService.get as jest.Mock;
const mockedEvidenceListApproved = evidenceRecordService.listApproved as jest.Mock;
const mockedEvidenceGetApprovedByIds = evidenceRecordService.getApprovedByIds as jest.Mock;

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const targetId = '11111111-1111-4111-8111-111111111111';
const profileId = '22222222-2222-4222-8222-222222222222';
const approvedExampleId = '33333333-3333-4333-8333-333333333333';
const unapprovedExampleId = '44444444-4444-4444-8444-444444444444';

type SessionStorageQueryResult = { data: Record<string, unknown>[]; error: null };
type SessionStorageQuery = {
    insert: (values: unknown) => SessionStorageQuery;
    select: () => SessionStorageQuery;
    delete: () => SessionStorageQuery;
    eq: () => SessionStorageQuery;
    order: () => SessionStorageQuery;
    limit: () => SessionStorageQuery;
    single: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
    then: (
        resolve: (value: SessionStorageQueryResult) => unknown,
        reject?: (reason: unknown) => unknown,
    ) => Promise<unknown>;
};

function createSessionStorageMock() {
    const idsByTable: Record<string, string> = {
        cover_letters: '55555555-5555-4555-8555-555555555555',
        cover_letter_questions: '66666666-6666-4666-8666-666666666666',
        writing_sessions: '77777777-7777-4777-8777-777777777777',
    };
    const rowsByTable = new Map<string, Record<string, unknown>[]>();
    const insertPayloads: Array<{ table: string; values: unknown }> = [];
    const timestamp = '2026-09-22T00:00:00.000Z';

    const from = jest.fn((table: string) => {
        let operation: 'select' | 'insert' | 'delete' = 'select';
        let payload: unknown;

        const materialize = () => {
            if (operation === 'insert') {
                insertPayloads.push({ table, values: payload });
                const values = Array.isArray(payload) ? payload : [payload];
                const inserted = values.map((value, index) => ({
                    ...(value as Record<string, unknown>),
                    id: idsByTable[table] ?? `88888888-8888-4888-8888-${String(index + 1).padStart(12, '0')}`,
                    created_at: timestamp,
                    updated_at: timestamp,
                }));
                rowsByTable.set(table, [...(rowsByTable.get(table) ?? []), ...inserted]);
                return inserted;
            }
            if (operation === 'delete') {
                rowsByTable.set(table, []);
                return [];
            }
            return rowsByTable.get(table) ?? [];
        };

        let query: SessionStorageQuery;
        query = {
            insert: jest.fn((values: unknown) => {
                operation = 'insert';
                payload = values;
                return query;
            }),
            select: jest.fn(() => query),
            delete: jest.fn(() => {
                operation = 'delete';
                return query;
            }),
            eq: jest.fn(() => query),
            order: jest.fn(() => query),
            limit: jest.fn(() => query),
            single: jest.fn(async () => ({ data: materialize()[0] ?? null, error: null })),
            then: (resolve: (value: SessionStorageQueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
                Promise.resolve({ data: materialize(), error: null }).then(resolve, reject),
        };

        return query;
    });

    return { from, insertPayloads };
}

describe('writing session style example authorization', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
            from: jest.fn(),
        });
        mockedJobTargetGet.mockResolvedValue({
            target: { id: targetId, company: '테스트 회사', role: '개발자' },
            requirements: [],
        });
        mockedStyleProfileGetForGeneration.mockResolvedValue({
            examples: [{ id: approvedExampleId, approved: true }],
        });
        mockedEvidenceListApproved.mockResolvedValue([]);
        mockedEvidenceGetApprovedByIds.mockResolvedValue([]);
    });

    it('rejects an unapproved example before creating any cover-letter rows', async () => {
        const supabase = await createServerSupabaseClient();

        await expect(writingSessionService.create({
            jobTargetId: targetId,
            styleProfileId: profileId,
            styleExampleIds: [unapprovedExampleId],
            questions: [{ question: '문제를 해결한 경험을 적어 주세요.', charLimit: 700 }],
        })).rejects.toMatchObject({ code: 'invalid_input', status: 400 });

        expect(mockedStyleProfileGetForGeneration).toHaveBeenCalledWith(profileId);
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it('requires a saved writing context before creating cover-letter rows when opted in', async () => {
        const supabase = await createServerSupabaseClient();
        mockedCareerProfileGet.mockResolvedValue({ profile: null });

        await expect(writingSessionService.create({
            jobTargetId: targetId,
            question: '문제를 해결한 경험을 적어 주세요.',
            includeCareerProfile: true,
        })).rejects.toMatchObject({ code: 'invalid_input', status: 422 });

        expect(mockedCareerProfileGet).toHaveBeenCalledTimes(1);
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it('preserves the migration-not-applied response when profile context is explicitly requested', async () => {
        const supabase = await createServerSupabaseClient();
        mockedCareerProfileGet.mockRejectedValue(new CareerProfileServiceError(
            'unavailable',
            '프로필 저장 기능은 Supabase 프로필 마이그레이션 적용 후 사용할 수 있습니다.',
            503,
        ));

        await expect(writingSessionService.create({
            jobTargetId: targetId,
            question: '문제를 해결한 경험을 적어 주세요.',
            includeCareerProfile: true,
        })).rejects.toMatchObject({ code: 'unavailable', status: 503 });

        expect(supabase.from).not.toHaveBeenCalled();
    });

    it('stores only the opted-in, non-contact profile snapshot in the created writing session', async () => {
        const storage = createSessionStorageMock();
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
            from: storage.from,
        });
        mockedCareerProfileGet.mockResolvedValue({
            profile: {
                userId,
                fullName: '민감한 이름',
                headline: '사용자 문제를 해결하는 프론트엔드 개발자',
                summary: '사용자 피드백과 제품 지표를 함께 보고 제품 경험을 개선합니다.',
                email: 'private@example.com',
                phone: '010-0000-0000',
                location: '서울',
                websiteUrl: 'https://portfolio.example.com',
                githubUrl: 'https://github.com/example',
                linkedinUrl: 'https://linkedin.com/in/example',
                skills: ['TypeScript', 'Next.js'],
                updatedAt: '2026-09-22T00:00:00.000Z',
            },
        });

        const details = await writingSessionService.create({
            jobTargetId: targetId,
            question: '문제를 해결한 경험을 적어 주세요.',
            includeCareerProfile: true,
        });

        const sessionInsert = storage.insertPayloads.find(payload => payload.table === 'writing_sessions');
        expect(mockedCareerProfileGet).toHaveBeenCalledTimes(1);
        expect(sessionInsert?.values).toMatchObject({
            user_id: userId,
            generation_settings: {
                careerProfileContext: {
                    headline: '사용자 문제를 해결하는 프론트엔드 개발자',
                    summary: '사용자 피드백과 제품 지표를 함께 보고 제품 경험을 개선합니다.',
                    skills: ['TypeScript', 'Next.js'],
                },
            },
        });
        const savedSettings = JSON.stringify((sessionInsert?.values as { generation_settings: unknown }).generation_settings);
        expect(savedSettings).not.toContain('민감한 이름');
        expect(savedSettings).not.toContain('private@example.com');
        expect(savedSettings).not.toContain('010-0000-0000');
        expect(savedSettings).not.toContain('서울');
        expect(savedSettings).not.toContain('portfolio.example.com');
        expect(details.careerProfileContext).toEqual({
            headline: '사용자 문제를 해결하는 프론트엔드 개발자',
            summary: '사용자 피드백과 제품 지표를 함께 보고 제품 경험을 개선합니다.',
            skills: ['TypeScript', 'Next.js'],
        });
    });
});
