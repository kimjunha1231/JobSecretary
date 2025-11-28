import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { ids } = await request.json();

        if (!ids || !Array.isArray(ids)) {
            return new NextResponse('Invalid request body', { status: 400 });
        }

        const { error } = await supabase
            .from('documents')
            .update({ is_archived: true })
            .in('id', ids)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error archiving documents:', error);
            return new NextResponse('Internal Server Error', { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in archive API:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
