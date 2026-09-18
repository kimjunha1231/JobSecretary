type RateLimitOptions = {
    limit: number;
    windowMs: number;
};

type RateLimitBucket = {
    count: number;
    resetAt: number;
};

export type RateLimitDecision = {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds?: number;
};

const globalState = globalThis as typeof globalThis & {
    __jobSecretaryAiRateLimits?: Map<string, RateLimitBucket>;
};

const buckets = globalState.__jobSecretaryAiRateLimits ?? new Map<string, RateLimitBucket>();
globalState.__jobSecretaryAiRateLimits = buckets;

function pruneExpiredBuckets(now: number) {
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) {
            buckets.delete(key);
        }
    }
}

/**
 * Best-effort per-instance limiter for expensive AI calls.
 * A shared limiter (for example Redis/Upstash) can replace this store later
 * without changing the AI service contract.
 */
export function consumeRateLimit(
    key: string,
    { limit, windowMs }: RateLimitOptions,
    now = Date.now(),
): RateLimitDecision {
    pruneExpiredBuckets(now);

    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: Math.max(0, limit - 1) };
    }

    if (current.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
        };
    }

    current.count += 1;
    return { allowed: true, remaining: Math.max(0, limit - current.count) };
}

export function resetRateLimits() {
    buckets.clear();
}
