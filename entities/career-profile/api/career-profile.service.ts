import { createServerSupabaseClient } from '@/shared/api/server';
import {
    CareerProfileFieldsSchema,
    CareerProfileSchema,
    type CareerProfile,
} from '@/entities/career-profile/model';

type ServiceCode = 'unauthorized' | 'invalid_input' | 'unavailable' | 'storage';

export class CareerProfileServiceError extends Error {
    constructor(
        public readonly code: ServiceCode,
        message: string,
        public readonly status: 400 | 401 | 500 | 503,
    ) {
        super(message);
        this.name = 'CareerProfileServiceError';
    }
}

function getDatabaseFailure(error: unknown): CareerProfileServiceError {
    const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    const code = typeof record.code === 'string' ? record.code : '';
    if (code === '42P01' || code === 'PGRST205') {
        return new CareerProfileServiceError(
            'unavailable',
            '프로필 저장 기능은 Supabase 프로필 마이그레이션 적용 후 사용할 수 있습니다.',
            503,
        );
    }
    return new CareerProfileServiceError('storage', '이력서 프로필을 저장하거나 불러오지 못했습니다.', 500);
}

async function getAuthenticatedClient() {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new CareerProfileServiceError('unauthorized', '로그인이 필요합니다.', 401);
    return { supabase, userId: user.id };
}

function mapCareerProfile(record: Record<string, unknown>): CareerProfile {
    return CareerProfileSchema.parse({
        userId: record.user_id,
        fullName: record.full_name,
        headline: record.headline,
        summary: record.summary,
        email: record.email,
        phone: record.phone,
        location: record.location,
        websiteUrl: record.website_url,
        githubUrl: record.github_url,
        linkedinUrl: record.linkedin_url,
        skills: record.skills,
        updatedAt: record.updated_at,
    });
}

function parseInput(input: unknown) {
    const result = CareerProfileFieldsSchema.safeParse(input);
    if (!result.success) {
        throw new CareerProfileServiceError('invalid_input', result.error.issues[0]?.message ?? '프로필 정보를 확인해 주세요.', 400);
    }
    return result.data;
}

export const careerProfileService = {
    async get(): Promise<{ profile: CareerProfile | null }> {
        const { supabase, userId } = await getAuthenticatedClient();
        const { data, error } = await supabase
            .from('career_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw getDatabaseFailure(error);
        return { profile: data ? mapCareerProfile(data as Record<string, unknown>) : null };
    },

    async update(input: unknown): Promise<{ profile: CareerProfile }> {
        const parsed = parseInput(input);
        const { supabase, userId } = await getAuthenticatedClient();
        const { data, error } = await supabase
            .from('career_profiles')
            .upsert({
                user_id: userId,
                full_name: parsed.fullName,
                headline: parsed.headline,
                summary: parsed.summary,
                email: parsed.email,
                phone: parsed.phone,
                location: parsed.location,
                website_url: parsed.websiteUrl,
                github_url: parsed.githubUrl,
                linkedin_url: parsed.linkedinUrl,
                skills: parsed.skills,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            .select('*')
            .single();
        if (error) throw getDatabaseFailure(error);
        return { profile: mapCareerProfile(data as Record<string, unknown>) };
    },
};
