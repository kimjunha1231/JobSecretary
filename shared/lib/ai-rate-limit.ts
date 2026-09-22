export type RateLimitOptions = {
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

type SharedRateLimitResponse = {
    result?: unknown;
    error?: unknown;
};

const SHARED_LIMITER_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { count, ttl }
`;

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

function getSharedLimiterConfig(): { url: string; token: string } | null {
    const rawUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!rawUrl || !token) return null;

    try {
        const url = new URL(rawUrl);
        if (url.protocol !== 'https:') return null;
        return { url: url.toString().replace(/\/$/, ''), token };
    } catch {
        return null;
    }
}

/**
 * Lets callers avoid invoking the remote limiter when the optional backend is
 * not configured. This keeps the local fallback quiet in development and in
 * tests while preserving fail-open behavior for configured-but-unavailable
 * backends.
 */
export function hasSharedRateLimiterConfig(): boolean {
    return getSharedLimiterConfig() !== null;
}

function parseSharedDecision(
    payload: SharedRateLimitResponse,
    limit: number,
): RateLimitDecision {
    if (typeof payload.error === 'string') {
        throw new Error('shared_rate_limiter_command_failed');
    }

    const result = Array.isArray(payload.result) ? payload.result : [];
    const count = Number(result[0]);
    const ttlMs = Number(result[1]);
    if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ttlMs)) {
        throw new Error('shared_rate_limiter_invalid_response');
    }

    if (count > limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(1, Math.ceil(Math.max(0, ttlMs) / 1_000)),
        };
    }

    return {
        allowed: true,
        remaining: Math.max(0, limit - count),
    };
}

/**
 * Uses an optional Upstash REST EVAL script for a cross-instance fixed window.
 * Returns null when the shared limiter is not configured so callers can keep
 * the local in-memory fallback. Backend/configuration errors are thrown and
 * are intentionally handled by the caller without exposing the token.
 */
export async function consumeSharedRateLimit(
    key: string,
    { limit, windowMs }: RateLimitOptions,
    fetchImpl: typeof fetch = fetch,
): Promise<RateLimitDecision | null> {
    const config = getSharedLimiterConfig();
    if (!config) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2_000);
    let response: Response;
    try {
        response = await fetchImpl(config.url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(['EVAL', SHARED_LIMITER_SCRIPT, '1', `jobsecretary:ai:${key}`, String(windowMs)]),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }
    const payload = await response.json().catch(() => ({})) as SharedRateLimitResponse;
    if (!response.ok) throw new Error('shared_rate_limiter_request_failed');
    return parseSharedDecision(payload, limit);
}

export function resetRateLimits() {
    buckets.clear();
}
