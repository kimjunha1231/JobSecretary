import { createServerSupabaseClient } from '@/shared/api/server';

export const userProfileService = {
    async getUserProfile() {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new Error('Unauthorized');
        }

        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

        return {
            exists: !!profile,
            hasConsent: !!(profile?.terms_accepted_at && profile?.privacy_accepted_at),
            profile: profile || null
        };
    },

    async upsertUserProfile(consentData: { termsAccepted: boolean; privacyAccepted: boolean }) {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new Error('Unauthorized');
        }

        const { termsAccepted, privacyAccepted } = consentData;

        if (!termsAccepted || !privacyAccepted) {
            throw new Error('Both consents are required');
        }

        const now = new Date().toISOString();

        // Upsert user profile
        const { data, error } = await supabase
            .from('user_profiles')
            .upsert({
                user_id: user.id,
                terms_accepted_at: now,
                privacy_accepted_at: now,
                updated_at: now
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return { success: true, profile: data };
    }
};
