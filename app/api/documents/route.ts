import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/entities/document/server/document.service';
import { logger } from "@/shared/lib";

export async function GET() {
    try {
        const data = await documentService.getDocuments();
        return NextResponse.json(data);
    } catch (error: any) {
        logger.error('Error fetching documents:', error);
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const data = await documentService.createDocument(body);
        return NextResponse.json(data);
    } catch (error: unknown) {
        logger.error('Error creating document:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await documentService.deleteDocument(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        logger.error('Error deleting document:', error);
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
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
        const data = await documentService.updateDocument(id, body);
        return NextResponse.json(data);
    } catch (error: unknown) {
        logger.error('Error updating document:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
