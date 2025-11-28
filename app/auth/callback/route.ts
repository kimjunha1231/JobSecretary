import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/archive';

    if (code) {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookieStore.set({ name, value, ...options });
                    },
                    remove(name: string, options: CookieOptions) {
                        cookieStore.set({ name, value: '', ...options });
                    },
                },
            }
        );

        const { error, data } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            console.log('🔐 User logged in:', data.user.email);

            // Check if user has given consent
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', data.user.id)
                .single();

            console.log('📋 Profile check:', {
                exists: !!profile,
                hasTerms: !!profile?.terms_accepted_at,
                hasPrivacy: !!profile?.privacy_accepted_at,
                error: profileError?.message
            });

            // If no profile or no consent, redirect to consent page
            if (!profile || !profile.terms_accepted_at || !profile.privacy_accepted_at) {
                console.log('➡️ Redirecting to consent page');
                return NextResponse.redirect(`${origin}/auth/consent?new_user=true`);
            }

            console.log('✅ User has consent, proceeding to archive');
            // Existing user with consent, proceed normally
            const nextUrl = new URL(next, origin);
            nextUrl.searchParams.set('login', 'success');
            return NextResponse.redirect(nextUrl);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

