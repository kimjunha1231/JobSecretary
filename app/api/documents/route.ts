import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/entities/document/api/document.service';
import { logger } from "@/shared/lib";

export async function GET() {
    try {
        const data = await documentService.getDocuments();
        return NextResponse.json(data);
    } catch (error: unknown) {
        logger.error('Error fetching documents:', error);
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const data = await documentService.createDocument(body);
        return NextResponse.json(data);
    } catch (error: unknown) {
        logger.error('Error creating document:', error);
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Invalid document input.') {
            return NextResponse.json({ error: 'Invalid document input' }, { status: 400 });
        }
        return NextResponse.json(
            { error: 'Failed to create document' },
            { status: 500 },
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
    } catch (error: unknown) {
        logger.error('Error deleting document:', error);
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Invalid document ID.') {
            return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
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

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const data = await documentService.updateDocument(id, body);
        return NextResponse.json(data);
    } catch (error: unknown) {
        logger.error('Error updating document:', error);
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error instanceof Error && error.message === 'Invalid document input.') {
            return NextResponse.json({ error: 'Invalid document input' }, { status: 400 });
        }
        return NextResponse.json(
            { error: 'Failed to update document' },
            { status: 500 },
        );
    }
}
