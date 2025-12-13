import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// DELETE: Delete user account and all associated data
export async function DELETE() {
    try {
        const cookieStore = await cookies();

        // 1. Create a regular client to get the current user
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Create an Admin client with SERVICE_ROLE_KEY to delete the user
        // Note: This key must be in your .env.local file
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!serviceRoleKey) {

            return NextResponse.json({
                error: 'Server configuration error',
                details: 'Service role key is missing'
            }, { status: 500 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 3. Delete the user from auth.users
        // Because we set up ON DELETE CASCADE in the database, this will automatically
        // delete all related rows in 'documents' and 'user_profiles'.
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (deleteError) {

            return NextResponse.json({
                error: 'Failed to delete user account',
                details: deleteError.message
            }, { status: 500 });
        }

        // 4. Sign out the user from the current session
        await supabase.auth.signOut();

        return NextResponse.json({
            success: true,
            message: '회원 탈퇴가 완료되었습니다. 모든 데이터가 영구 삭제되었습니다.'
        });
    } catch (error) {

        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
