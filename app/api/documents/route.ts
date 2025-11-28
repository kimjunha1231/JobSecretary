import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', user.id) // Filter by user_id
            .order('position', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Error fetching documents:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            title,
            company,
            role,
            content,
            jobPostUrl,
            status,
            tags,
            deadline,
            date,
            logo,
            position,
            isArchived,
            documentScreeningStatus
        } = body;

        // Auto-generate logo if not provided
        const finalLogo = logo || (company ? company.charAt(0).toUpperCase() : 'C');

        const { data, error } = await supabase
            .from('documents')
            .insert([
                {
                    user_id: user.id, // Add user_id
                    title,
                    company,
                    role,
                    content,
                    job_post_url: jobPostUrl,
                    status: status || 'writing',
                    tags: tags || [],
                    deadline,
                    date,
                    logo: finalLogo,
                    position: position || 0,
                    is_archived: Boolean(isArchived),
                    document_screening_status: documentScreeningStatus ?? null
                },
            ])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating document:', error);
        return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id); // Ensure user owns the document

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const body = await request.json();
        const { title, company, role, content, jobPostUrl, status, tags, deadline, date, logo, position, isArchived, documentScreeningStatus } = body;

        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (company !== undefined) updates.company = company;
        if (role !== undefined) updates.role = role;
        if (content !== undefined) updates.content = content;
        if (jobPostUrl !== undefined) updates.job_post_url = jobPostUrl;
        if (status !== undefined) updates.status = status;
        if (tags !== undefined) updates.tags = tags;
        if (deadline !== undefined) updates.deadline = deadline;
        if (date !== undefined) updates.date = date;
        if (logo !== undefined) updates.logo = logo;
        if (position !== undefined) updates.position = position;
        if (isArchived !== undefined) updates.is_archived = isArchived;
        if (documentScreeningStatus !== undefined) updates.document_screening_status = documentScreeningStatus;
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('documents')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id) // Ensure user owns the document
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating document:', error);
        return NextResponse.json({
            error: 'Failed to update document',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
