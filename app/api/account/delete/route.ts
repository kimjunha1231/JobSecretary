import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logger } from '@/shared/lib';

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
        // This server-only key must be configured before deletion is enabled.
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!serviceRoleKey) {
            logger.error('Account deletion is unavailable: missing service role configuration.');
            return NextResponse.json({ error: '회원 탈퇴 기능이 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.' }, { status: 503 });
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

        const sourceBucket = process.env.SUPABASE_SOURCE_STORAGE_BUCKET?.trim() || 'source-documents';
        const sourceStorage = supabaseAdmin.storage.from(sourceBucket);
        const listSourceObjects = async (prefix: string): Promise<string[]> => {
            const paths: string[] = [];
            for (let offset = 0; ; offset += 1000) {
                const { data: objects, error: listError } = await sourceStorage.list(prefix, { limit: 1000, offset });
                if (listError) {
                    // A deployment without the optional bucket has no source objects to clean up.
                    if (/not found|does not exist|bucket/i.test(listError.message)) return [];
                    throw listError;
                }
                for (const object of objects ?? []) {
                    if (!object.name) continue;
                    const objectPath = `${prefix}/${object.name}`;
                    if (object.id) paths.push(objectPath);
                    else paths.push(...await listSourceObjects(objectPath));
                }
                if (!objects || objects.length < 1000) break;
            }
            return paths;
        };

        let sourceObjectPaths: string[];
        try {
            sourceObjectPaths = await listSourceObjects(user.id);
        } catch (listError) {
            logger.error('Failed to list source originals before account deletion:', listError);
            return NextResponse.json({ error: '원본 자료를 정리하지 못해 회원 탈퇴를 완료할 수 없습니다.' }, { status: 500 });
        }
        for (let index = 0; index < sourceObjectPaths.length; index += 100) {
            const { error: removeError } = await sourceStorage.remove(sourceObjectPaths.slice(index, index + 100));
            if (removeError) {
                logger.error('Failed to remove source originals before account deletion:', removeError);
                return NextResponse.json({ error: '원본 자료를 정리하지 못해 회원 탈퇴를 완료할 수 없습니다.' }, { status: 500 });
            }
        }

        // 3. Delete the user from auth.users
        // Because we set up ON DELETE CASCADE in the database, this will automatically
        // delete all related rows in 'documents' and 'user_profiles'.
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (deleteError) {
            logger.error('Failed to delete user account:', deleteError);
            return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 });
        }

        // 4. Sign out the user from the current session
        await supabase.auth.signOut();

        return NextResponse.json({
            success: true,
            message: '회원 탈퇴가 완료되었습니다. 모든 데이터가 영구 삭제되었습니다.'
        });
    } catch (error) {
        logger.error('Account deletion request failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
