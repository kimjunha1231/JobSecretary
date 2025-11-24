import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
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
        const body = await request.json();
        const { title, company, role, content, jobPostUrl } = body;

        const { data, error } = await supabase
            .from('documents')
            .insert([
                {
                    title,
                    company,
                    role,
                    content,
                    job_post_url: jobPostUrl,
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
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const body = await request.json();
        const { title, company, role, content, jobPostUrl } = body;

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (company !== undefined) updateData.company = company;
        if (role !== undefined) updateData.role = role;
        if (content !== undefined) updateData.content = content;
        if (jobPostUrl !== undefined) updateData.job_post_url = jobPostUrl;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('documents')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating document:', error);
        return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }
}
