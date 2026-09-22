import { createServerSupabaseClient } from '@/shared/api/server';
import { CareerProfileFieldsSchema } from '@/entities/career-profile/model';
import { careerProfileService } from '@/entities/career-profile/api';

jest.mock('@/shared/api/server', () => ({
    createServerSupabaseClient: jest.fn(),
}));

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const profileRow = {
    user_id: userId,
    full_name: '김준하',
    headline: '프론트엔드 개발자',
    summary: '사용자의 문제를 확인하고 개선합니다.',
    email: 'junha@example.com',
    phone: '',
    location: '서울',
    website_url: 'https://junha.example.com',
    github_url: 'https://github.com/junha',
    linkedin_url: '',
    skills: ['TypeScript', 'Next.js'],
    updated_at: '2026-09-22T00:00:00.000Z',
};

function createQuery(result: unknown) {
    const query = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue(result),
        single: jest.fn().mockResolvedValue(result),
        upsert: jest.fn().mockReturnThis(),
    };
    return query;
}

function authenticatedClient(from: jest.Mock) {
    return {
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
        from,
    };
}

describe('career profile service', () => {
    beforeEach(() => mockedCreateServerSupabaseClient.mockReset());

    it('rejects unsafe URLs, malformed email, and client-supplied identity', () => {
        expect(CareerProfileFieldsSchema.safeParse({ githubUrl: 'javascript:alert(1)' }).success).toBe(false);
        expect(CareerProfileFieldsSchema.safeParse({ githubUrl: 'https://user:secret@example.com' }).success).toBe(false);
        expect(CareerProfileFieldsSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
        expect(CareerProfileFieldsSchema.safeParse({ userId }).success).toBe(false);
    });

    it('loads only the authenticated user profile and normalizes skills', async () => {
        const query = createQuery({ data: { ...profileRow, skills: ['TypeScript', ' Next.js ', 'TypeScript'] }, error: null });
        mockedCreateServerSupabaseClient.mockResolvedValue(authenticatedClient(jest.fn().mockReturnValue(query)));

        await expect(careerProfileService.get()).resolves.toEqual({
            profile: expect.objectContaining({ userId, fullName: '김준하', skills: ['TypeScript', 'Next.js'] }),
        });
        expect(query.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('derives owner identity from the authenticated session when saving', async () => {
        const query = createQuery({ data: profileRow, error: null });
        mockedCreateServerSupabaseClient.mockResolvedValue(authenticatedClient(jest.fn().mockReturnValue(query)));

        const result = await careerProfileService.update({
            fullName: '김준하',
            headline: '프론트엔드 개발자',
            summary: '사용자의 문제를 확인하고 개선합니다.',
            email: 'junha@example.com',
            location: '서울',
            websiteUrl: 'https://junha.example.com',
            githubUrl: 'https://github.com/junha',
            skills: ['TypeScript', 'Next.js', 'TypeScript'],
        });

        expect(query.upsert).toHaveBeenCalledWith(expect.objectContaining({
            user_id: userId,
            full_name: '김준하',
            skills: ['TypeScript', 'Next.js'],
        }), { onConflict: 'user_id' });
        expect(result.profile.userId).toBe(userId);
    });

    it('reports a missing database migration without masking other storage errors', async () => {
        const query = createQuery({ data: null, error: { code: 'PGRST205', message: 'table not found' } });
        mockedCreateServerSupabaseClient.mockResolvedValue(authenticatedClient(jest.fn().mockReturnValue(query)));

        await expect(careerProfileService.get()).rejects.toMatchObject({ code: 'unavailable', status: 503 });
    });

    it('requires an authenticated user', async () => {
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
        });

        await expect(careerProfileService.get()).rejects.toMatchObject({ code: 'unauthorized', status: 401 });
    });
});
