import { consumeRateLimit, resetRateLimits } from '@/shared/lib/ai-rate-limit';

describe('AI rate limiter', () => {
    beforeEach(() => {
        resetRateLimits();
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
});
