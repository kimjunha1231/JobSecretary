import { createServerSupabaseClient } from '@/shared/api/server';
import { consumeRateLimit } from './ai-rate-limit';

export type AiOperation =
    | 'insight'
    | 'questions'
    | 'draft'
    | 'refine'
    | 'interview'
    | 'job_analysis'
    | 'career_extraction'
    | 'source_ocr'
    | 'outline_generation'
    | 'draft_generation';

export class AiAccessError extends Error {
    public readonly code: 'UNAUTHORIZED' | 'RATE_LIMITED';
    public readonly retryAfterSeconds?: number;

    constructor(
        code: 'UNAUTHORIZED' | 'RATE_LIMITED',
        message: string,
        retryAfterSeconds?: number,
    ) {
        super(message);
        this.name = 'AiAccessError';
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

const OPERATION_LIMITS: Record<AiOperation, { limit: number; windowMs: number }> = {
    insight: { limit: 20, windowMs: 60_000 },
    questions: { limit: 10, windowMs: 60_000 },
    draft: { limit: 8, windowMs: 60_000 },
    refine: { limit: 20, windowMs: 60_000 },
    interview: { limit: 10, windowMs: 60_000 },
    job_analysis: { limit: 5, windowMs: 60_000 },
    career_extraction: { limit: 3, windowMs: 60_000 },
    source_ocr: { limit: 2, windowMs: 60_000 },
    outline_generation: { limit: 5, windowMs: 60_000 },
    draft_generation: { limit: 5, windowMs: 60_000 },
};

export async function requireAiAccess(operation: AiOperation) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        throw new AiAccessError('UNAUTHORIZED', 'Unauthorized');
    }

    const decision = consumeRateLimit(
        `ai:${data.user.id}:${operation}`,
        OPERATION_LIMITS[operation],
    );

    if (!decision.allowed) {
        throw new AiAccessError(
            'RATE_LIMITED',
            'AI 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
            decision.retryAfterSeconds,
        );
    }

    return data.user;
}
