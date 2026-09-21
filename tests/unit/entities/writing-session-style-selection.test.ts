import { createServerSupabaseClient } from '@/shared/api/server';
import { jobTargetService } from '@/entities/job-target/api';
import { styleProfileService } from '@/entities/style-profile/api';
import { writingSessionService } from '@/entities/writing-session/api';

jest.mock('@/shared/api/server', () => ({
    createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/entities/job-target/api', () => ({
    jobTargetService: { get: jest.fn() },
}));

jest.mock('@/entities/style-profile/api', () => ({
    styleProfileService: { getForGeneration: jest.fn() },
}));

jest.mock('@/entities/evidence-record/api', () => ({
    evidenceRecordService: { listApproved: jest.fn(), getApprovedByIds: jest.fn() },
}));

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;
const mockedJobTargetGet = jobTargetService.get as jest.Mock;
const mockedStyleProfileGetForGeneration = styleProfileService.getForGeneration as jest.Mock;

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const targetId = '11111111-1111-4111-8111-111111111111';
const profileId = '22222222-2222-4222-8222-222222222222';
const approvedExampleId = '33333333-3333-4333-8333-333333333333';
const unapprovedExampleId = '44444444-4444-4444-8444-444444444444';

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
});
