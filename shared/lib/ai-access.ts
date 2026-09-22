import { createServerSupabaseClient } from '@/shared/api/server';
import { consumeRateLimit, consumeSharedRateLimit, hasSharedRateLimiterConfig } from './ai-rate-limit';
import { logger } from './logger';

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

export type ProtectedOperation = AiOperation | 'source_ingestion';

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

const OPERATION_LIMITS: Record<ProtectedOperation, { limit: number; windowMs: number }> = {
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
    // Source registration can fetch remote URLs and parse large documents even
    // when it does not invoke a model, so it needs an independent budget.
    source_ingestion: { limit: 10, windowMs: 60_000 },
};

export async function requireUserRateLimit(
    operation: ProtectedOperation,
    rateLimitMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        throw new AiAccessError('UNAUTHORIZED', 'Unauthorized');
    }

    const rateLimitKey = `${data.user.id}:${operation}`;
    let decision;
    if (hasSharedRateLimiterConfig()) {
        try {
            decision = await consumeSharedRateLimit(rateLimitKey, OPERATION_LIMITS[operation]);
        } catch {
            logger.error(
                operation === 'source_ingestion'
                    ? 'Shared source ingestion rate limiter unavailable; using local fallback.'
                    : 'Shared AI rate limiter unavailable; using local fallback.',
                'shared_rate_limiter_unavailable',
            );
            decision = null;
        }
    }
    decision ??= consumeRateLimit(`ai:${rateLimitKey}`, OPERATION_LIMITS[operation]);

    if (!decision.allowed) {
        throw new AiAccessError(
            'RATE_LIMITED',
            rateLimitMessage,
            decision.retryAfterSeconds,
        );
    }

    return data.user;
}

export async function requireAiAccess(operation: AiOperation) {
    return requireUserRateLimit(operation, 'AI 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
}
