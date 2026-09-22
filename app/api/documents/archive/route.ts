import { createServerSupabaseClient } from '@/shared/api/server';
import { NextResponse } from 'next/server';
import { logger } from "@/shared/lib";
import { z } from 'zod';

const archiveInputSchema = z.object({
    ids: z.array(z.string().trim().min(1).max(200)).min(1).max(100),
});

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return new NextResponse('Invalid JSON body', { status: 400 });
        }

        const parsedBody = archiveInputSchema.safeParse(body);
        if (!parsedBody.success) {
            return new NextResponse('Invalid request body', { status: 400 });
        }

        const { error } = await supabase
            .from('documents')
            .update({ is_archived: true })
            .in('id', parsedBody.data.ids)
            .eq('user_id', user.id);

        if (error) {
            logger.error('Error archiving documents:', error);
            return new NextResponse('Internal Server Error', { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Error in archive API:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
