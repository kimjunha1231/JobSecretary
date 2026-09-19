import { NextResponse } from 'next/server';
import { JobTargetServiceError, jobTargetService } from '@/entities/job-target/api';
import { logger } from '@/shared/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type JobRequirementRouteContext = {
    params: Promise<{ id: string; requirementId: string }>;
};

function errorResponse(error: unknown, fallback: string): NextResponse {
    if (error instanceof JobTargetServiceError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(request: Request, { params }: JobRequirementRouteContext) {
    try {
        const { id, requirementId } = await params;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
        const requirement = await jobTargetService.updateRequirementStatus(id, requirementId, body);
        return NextResponse.json(requirement);
    } catch (error) {
        return errorResponse(error, '요구사항 상태를 저장하지 못했습니다.');
    }
}
