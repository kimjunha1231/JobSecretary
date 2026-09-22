import { AiAccessError, requireAiAccess, requireUserRateLimit } from '@/shared/lib/ai-access';
import { createServerSupabaseClient } from '@/shared/api/server';
import {
    consumeRateLimit,
    consumeSharedRateLimit,
    hasSharedRateLimiterConfig,
} from '@/shared/lib/ai-rate-limit';
import { logger } from '@/shared/lib/logger';

jest.mock('@/shared/api/server', () => ({
    createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/shared/lib/ai-rate-limit', () => ({
    consumeRateLimit: jest.fn(),
    consumeSharedRateLimit: jest.fn(),
    hasSharedRateLimiterConfig: jest.fn(),
}));

jest.mock('@/shared/lib/logger', () => ({
    logger: { error: jest.fn() },
}));

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;
const mockedConsumeRateLimit = consumeRateLimit as jest.Mock;
const mockedConsumeSharedRateLimit = consumeSharedRateLimit as jest.Mock;
const mockedHasSharedRateLimiterConfig = hasSharedRateLimiterConfig as jest.Mock;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('requireAiAccess shared limiter fallback', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedCreateServerSupabaseClient.mockResolvedValue({
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        });
        mockedConsumeRateLimit.mockReturnValue({ allowed: true, remaining: 2 });
        mockedConsumeSharedRateLimit.mockResolvedValue(undefined);
        mockedHasSharedRateLimiterConfig.mockReturnValue(true);
    });

    it('falls back to the local limiter when the shared backend is unavailable', async () => {
        mockedConsumeSharedRateLimit.mockRejectedValue(new Error('network'));

        await expect(requireAiAccess('insight')).resolves.toEqual({ id: 'user-1' });
        expect(mockedConsumeRateLimit).toHaveBeenCalledWith('ai:user-1:insight', expect.any(Object));
        expect(mockedLogger.error).toHaveBeenCalledWith(
            'Shared AI rate limiter unavailable; using local fallback.',
            'shared_rate_limiter_unavailable',
        );
    });

    it('does not call the shared backend when it is not configured', async () => {
        mockedHasSharedRateLimiterConfig.mockReturnValue(false);

        await expect(requireAiAccess('insight')).resolves.toEqual({ id: 'user-1' });
        expect(mockedConsumeSharedRateLimit).not.toHaveBeenCalled();
        expect(mockedConsumeRateLimit).toHaveBeenCalledWith('ai:user-1:insight', expect.any(Object));
    });

    it('uses a shared rejection and does not consume the local bucket', async () => {
        mockedConsumeSharedRateLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfterSeconds: 9 });

        await expect(requireAiAccess('insight')).rejects.toMatchObject<Partial<AiAccessError>>({
            code: 'RATE_LIMITED',
            retryAfterSeconds: 9,
        });
        expect(mockedConsumeRateLimit).not.toHaveBeenCalled();
    });

    it('applies the same shared budget boundary to source ingestion', async () => {
        await expect(requireUserRateLimit('source_ingestion', '자료 등록 요청이 너무 많습니다.')).resolves.toEqual({ id: 'user-1' });

        expect(mockedConsumeRateLimit).toHaveBeenCalledWith('ai:user-1:source_ingestion', expect.objectContaining({
            limit: 10,
            windowMs: 60_000,
        }));
    });
});
