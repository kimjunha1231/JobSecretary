import { createServerSupabaseClient } from '@/shared/api/server';
import { styleProfileService } from '@/entities/style-profile/api';

jest.mock('@/shared/api/server', () => ({
    createServerSupabaseClient: jest.fn(),
}));

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;
const profileId = '11111111-1111-4111-8111-111111111111';
const questionId = '22222222-2222-4222-8222-222222222222';
const exampleId = '33333333-3333-4333-8333-333333333333';
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const profileRecord = {
    id: profileId,
    user_id: userId,
    name: '담백한 회고체',
    sentence_length: {},
    ending_style: ['했습니다'],
    preferred_connectors: [],
    banned_expressions: [],
    exaggeration_level: null,
    rules: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
};

function queryWithResult(result: unknown) {
    const query = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(result),
        maybeSingle: jest.fn().mockResolvedValue(result),
        single: jest.fn().mockResolvedValue(result),
    };
    return query;
}

describe('style profile service boundary', () => {
    beforeEach(() => {
        mockedCreateServerSupabaseClient.mockReset();
    });

    it('rejects malformed profile and question IDs before opening Supabase', async () => {
        await expect(styleProfileService.promoteFinalAnswer('not-a-uuid', questionId)).rejects.toMatchObject({ code: 'invalid_input', status: 400 });
        expect(mockedCreateServerSupabaseClient).not.toHaveBeenCalled();
    });

    it('requires authentication before promoting a final answer', async () => {
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
        });

        await expect(styleProfileService.promoteFinalAnswer(profileId, questionId)).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
    });

    it('analyzes only approved examples after checking profile ownership', async () => {
        const profileQuery = queryWithResult({ data: profileRecord, error: null });
        const examplesQuery: { select: jest.Mock; eq: jest.Mock; order: jest.Mock } = {
            select: jest.fn(),
            eq: jest.fn(),
            order: jest.fn(),
        };
        examplesQuery.select.mockReturnValue(examplesQuery);
        examplesQuery.order.mockReturnValue(examplesQuery);
        examplesQuery.eq.mockImplementation((column: string) => column === 'approved'
            ? Promise.resolve({ data: [{
                id: exampleId,
                style_profile_id: profileId,
                user_id: userId,
                source: 'user_authored',
                content: '먼저 문제를 나누었습니다.',
                approved: true,
                created_at: '2026-01-01T00:00:00.000Z',
            }], error: null })
            : examplesQuery);
        const from = jest.fn()
            .mockReturnValueOnce(profileQuery)
            .mockReturnValueOnce(examplesQuery);
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
            from,
        });

        await expect(styleProfileService.analyze(profileId)).resolves.toMatchObject({
            analyzedExampleCount: 1,
            sentenceCount: 1,
        });
        expect(examplesQuery.eq).toHaveBeenCalledWith('approved', true);
    });

    it('does not allow the general example endpoint to self-label arbitrary text as a final answer', async () => {
        await expect(styleProfileService.addExample(profileId, {
            source: 'approved_final',
            content: '임의로 입력한 최종 답변처럼 보이는 문장',
            approved: true,
        } as never)).rejects.toMatchObject({ code: 'invalid_input', status: 400 });
        expect(mockedCreateServerSupabaseClient).not.toHaveBeenCalled();
    });

    it('reads the finalized question from the database and stores it idempotently', async () => {
        const profileQuery = queryWithResult({ data: profileRecord, error: null });
        const questionQuery = queryWithResult({ data: { id: questionId, status: 'finalized', final_answer: '문제를 나누어 하나씩 해결했습니다.' }, error: null });
        const existingQuery = queryWithResult({ data: [], error: null });
        const insertQuery = queryWithResult({ data: {
            id: exampleId,
            style_profile_id: profileId,
            user_id: userId,
            question_id: questionId,
            source: 'approved_final',
            content: '문제를 나누어 하나씩 해결했습니다.',
            approved: true,
            created_at: '2026-01-01T00:00:00.000Z',
        }, error: null });
        const from = jest.fn()
            .mockReturnValueOnce(profileQuery)
            .mockReturnValueOnce(questionQuery)
            .mockReturnValueOnce(existingQuery)
            .mockReturnValueOnce({
                insert: jest.fn().mockReturnValue(insertQuery),
            });
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
            from,
        });

        await expect(styleProfileService.promoteFinalAnswer(profileId, questionId)).resolves.toMatchObject({
            id: exampleId,
            styleProfileId: profileId,
            questionId,
            source: 'approved_final',
            approved: true,
        });
        expect(from).toHaveBeenCalledWith('cover_letter_questions');
        expect(insertQuery.select).toHaveBeenCalledWith('*');
    });
});
