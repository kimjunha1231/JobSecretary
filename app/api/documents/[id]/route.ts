import { NextResponse } from 'next/server';
import { documentService } from '@/entities/document/api/document.service';
import { logger } from '@/shared/lib';

type DocumentRouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: DocumentRouteContext) {
    try {
        const { id } = await params;
        const data = await documentService.getDocument(id);

        if (!data) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error: unknown) {
        logger.error('Error fetching document:', error);
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Invalid document ID.') {
            return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
    }
}
