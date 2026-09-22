import { NextResponse } from 'next/server';
import { StyleProfileServiceError, styleProfileService, type StyleExampleUpdateInput } from '@/entities/style-profile';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ exampleId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
    try {
        const { exampleId } = await params;
        let body: unknown;
        try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
        return NextResponse.json(await styleProfileService.updateExample(exampleId, (body ?? {}) as StyleExampleUpdateInput));
    } catch (error) {
        if (error instanceof StyleProfileServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
        logger.error('Style example update failed.', error);
        return NextResponse.json({ error: '말투 예문을 저장하지 못했습니다.' }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
    try {
        const { exampleId } = await params;
        await styleProfileService.removeExample(exampleId);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        if (error instanceof StyleProfileServiceError) return NextResponse.json({ error: error.message }, { status: error.status });
        logger.error('Style example deletion failed.', error);
        return NextResponse.json({ error: '말투 예문을 삭제하지 못했습니다.' }, { status: 500 });
    }
}
