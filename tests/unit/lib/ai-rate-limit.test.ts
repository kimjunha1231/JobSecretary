import { consumeRateLimit, consumeSharedRateLimit, resetRateLimits } from '@/shared/lib/ai-rate-limit';

describe('AI rate limiter', () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    beforeEach(() => {
        resetRateLimits();
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });

    afterEach(() => {
        if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
        else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
        if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
        else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    });

    it('allows up to the configured limit and returns a retry delay afterwards', () => {
        expect(consumeRateLimit('user:insight', { limit: 2, windowMs: 60_000 }, 1_000)).toEqual({
            allowed: true,
            remaining: 1,
        });
        expect(consumeRateLimit('user:insight', { limit: 2, windowMs: 60_000 }, 1_001)).toEqual({
            allowed: true,
            remaining: 0,
        });

        expect(consumeRateLimit('user:insight', { limit: 2, windowMs: 60_000 }, 2_000)).toEqual({
            allowed: false,
            remaining: 0,
            retryAfterSeconds: 59,
        });
    });

    it('starts a fresh window after the current bucket expires', () => {
        expect(consumeRateLimit('user:draft', { limit: 1, windowMs: 1_000 }, 1_000).allowed).toBe(true);
        expect(consumeRateLimit('user:draft', { limit: 1, windowMs: 1_000 }, 1_999).allowed).toBe(false);
        expect(consumeRateLimit('user:draft', { limit: 1, windowMs: 1_000 }, 2_000)).toEqual({
            allowed: true,
            remaining: 0,
        });
    });

    it('returns null when the optional shared limiter is not configured', async () => {
        const fetchImpl = jest.fn();
        await expect(consumeSharedRateLimit('user:insight', { limit: 2, windowMs: 60_000 }, fetchImpl)).resolves.toBeNull();
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('uses the shared fixed-window script without putting the token in the URL', async () => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test/';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'server-only-token';
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ result: [2, 58_000] }),
        });

        await expect(consumeSharedRateLimit('user:insight', { limit: 3, windowMs: 60_000 }, fetchImpl)).resolves.toEqual({
            allowed: true,
            remaining: 1,
        });

        const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://redis.example.test');
        expect(init.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer server-only-token' }));
        expect(JSON.parse(String(init.body))).toEqual(expect.arrayContaining(['EVAL', expect.any(String), '1', 'jobsecretary:ai:user:insight', '60000']));
        expect(url).not.toContain('server-only-token');
    });

    it('returns a retry delay when the shared limiter rejects the request', async () => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'server-only-token';
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ result: [4, 1_200] }),
        });

        await expect(consumeSharedRateLimit('user:insight', { limit: 3, windowMs: 60_000 }, fetchImpl)).resolves.toEqual({
            allowed: false,
            remaining: 0,
            retryAfterSeconds: 2,
        });
    });
});
