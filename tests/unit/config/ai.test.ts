import {
    AI_MODEL,
    getGeminiApiKey,
    getGeminiApiKeys,
    getGeminiModels,
    getGeminiErrorSummary,
    withGeminiFallback,
    withGeminiKeyFallback,
} from '@/shared/config/ai';

describe('getGeminiApiKey', () => {
    const keyEnvironmentNames = [
        'GEMINI_API_KEYS',
        'GEMINI_API_KEY',
        'GEMINI_API_KEY_1',
        'GEMINI_API_KEY_2',
        'API_KEYS',
        'API_KEY',
        'API_KEY_1',
        'API_KEY_2',
        'GEMINI_MODEL',
        'GEMINI_FALLBACK_MODELS',
    ];
    const originalEnvironment = Object.fromEntries(
        keyEnvironmentNames.map((name) => [name, process.env[name]])
    );

    afterEach(() => {
        keyEnvironmentNames.forEach((name) => {
            const originalValue = originalEnvironment[name];
            if (originalValue === undefined) {
                delete process.env[name];
            } else {
                process.env[name] = originalValue;
            }
        });
    });

    const clearKeyEnvironment = () => {
        keyEnvironmentNames.forEach((name) => delete process.env[name]);
    };

    beforeEach(clearKeyEnvironment);

    it('uses GEMINI_API_KEY as the canonical variable', () => {
        process.env.GEMINI_API_KEY = '  "gemini-key"  ';
        process.env.API_KEY = 'legacy-key';

        expect(getGeminiApiKey()).toBe('gemini-key');
    });

    it('falls back to API_KEY for existing deployments', () => {
        delete process.env.GEMINI_API_KEY;
        process.env.API_KEY = '  legacy-key  ';

        expect(getGeminiApiKey()).toBe('legacy-key');
    });

    it('throws a configuration error when no key is present', () => {
        clearKeyEnvironment();

        expect(() => getGeminiApiKey()).toThrow('Gemini API key is missing');
    });

    it('collects comma-separated, numbered, and legacy keys in fallback order', () => {
        clearKeyEnvironment();
        process.env.GEMINI_API_KEYS = ' "key-a" , key-b ';
        process.env.GEMINI_API_KEY = 'key-b';
        process.env.GEMINI_API_KEY_2 = '"key-c"';
        process.env.API_KEY = 'legacy-key';

        expect(getGeminiApiKeys()).toEqual(['key-a', 'key-b', 'key-c', 'legacy-key']);
    });

    it('tries the next key when a previous key fails', async () => {
        clearKeyEnvironment();
        process.env.GEMINI_API_KEYS = 'key-a,key-b';
        const attempts: string[] = [];

        const result = await withGeminiKeyFallback(async (apiKey, keyIndex) => {
            attempts.push(`${apiKey}:${keyIndex}`);
            if (keyIndex === 0) {
                throw new Error('first key failed');
            }
            return 'success';
        });

        expect(result).toBe('success');
        expect(attempts).toEqual(['key-a:0', 'key-b:1']);
    });

    it('pins the verified GA models instead of following the latest alias', () => {
        expect(getGeminiModels()).toEqual(['gemini-3.7-flash', 'gemini-3.6-flash']);
    });

    it('supports a runtime model override and deduplicates fallback models', () => {
        process.env.GEMINI_MODEL = ' custom-primary ';
        process.env.GEMINI_FALLBACK_MODELS = 'custom-primary, custom-fallback\ncustom-fallback';
        expect(getGeminiModels()).toEqual(['custom-primary', 'custom-fallback']);
    });

    it.each([404, 500, 502, 503, 504])('switches models on %i without retrying the same model with another key', async (status) => {
        process.env.GEMINI_API_KEYS = 'key-a,key-b';
        const outage = Object.assign(new Error('model unavailable'), { status });
        const operation = jest.fn()
            .mockRejectedValueOnce(outage)
            .mockResolvedValueOnce('corrected text');

        await expect(withGeminiFallback(operation)).resolves.toBe('corrected text');
        expect(operation.mock.calls).toEqual([
            ['key-a', AI_MODEL],
            ['key-a', 'gemini-3.6-flash'],
        ]);
    });

    it('tries another credential after an authentication failure and keeps that credential during a model outage', async () => {
        process.env.GEMINI_API_KEYS = 'invalid-key,valid-key';
        const operation = jest.fn()
            .mockRejectedValueOnce(Object.assign(new Error('invalid key'), { status: 403 }))
            .mockRejectedValueOnce(Object.assign(new Error('high demand'), { status: 503 }))
            .mockResolvedValueOnce('questions');

        await expect(withGeminiFallback(operation)).resolves.toBe('questions');
        expect(operation.mock.calls).toEqual([
            ['invalid-key', AI_MODEL],
            ['valid-key', AI_MODEL],
            ['valid-key', 'gemini-3.6-flash'],
        ]);
    });

    it('recognizes Gemini invalid-key errors reported with status 400', async () => {
        process.env.GEMINI_API_KEYS = 'invalid-key,valid-key';
        const operation = jest.fn()
            .mockRejectedValueOnce(Object.assign(new Error('API key not valid. Please pass a valid API key.'), { status: 400 }))
            .mockResolvedValueOnce('draft');
        await expect(withGeminiFallback(operation)).resolves.toBe('draft');
        expect(operation).toHaveBeenNthCalledWith(2, 'valid-key', AI_MODEL);
    });

    it('does not retry an invalid request', async () => {
        process.env.GEMINI_API_KEYS = 'key-a,key-b';
        const failure = Object.assign(new Error('request rejected'), { status: 400 });
        const operation = jest.fn().mockRejectedValue(failure);
        await expect(withGeminiFallback(operation)).rejects.toBe(failure);
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('tries another credential when a project reaches its rate limit', async () => {
        process.env.GEMINI_API_KEYS = 'rate-limited-key,available-key';
        const operation = jest.fn()
            .mockRejectedValueOnce(Object.assign(new Error('quota exhausted'), { status: 429 }))
            .mockResolvedValueOnce('draft');
        await expect(withGeminiFallback(operation)).resolves.toBe('draft');
        expect(operation.mock.calls).toEqual([
            ['rate-limited-key', AI_MODEL],
            ['available-key', AI_MODEL],
        ]);
    });

    it('does not retry parsing or application errors', async () => {
        process.env.GEMINI_API_KEY = 'key-a';
        const failure = new SyntaxError('Invalid JSON response');
        const operation = jest.fn().mockRejectedValue(failure);
        await expect(withGeminiFallback(operation)).rejects.toBe(failure);
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('switches models when a request reaches its time limit', async () => {
        process.env.GEMINI_API_KEY = 'key-a';
        const operation = jest.fn()
            .mockRejectedValueOnce(Object.assign(new Error('timed out'), { name: 'TimeoutError' }))
            .mockResolvedValueOnce('recovered');
        await expect(withGeminiFallback(operation)).resolves.toBe('recovered');
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it('recognizes the plain Error used by the installed SDK for a timed-out fetch', async () => {
        process.env.GEMINI_API_KEY = 'key-a';
        const operation = jest.fn()
            .mockRejectedValueOnce(new Error('exception AbortError: This operation was aborted sending request'))
            .mockResolvedValueOnce('recovered');
        await expect(withGeminiFallback(operation)).resolves.toBe('recovered');
        expect(operation).toHaveBeenNthCalledWith(2, 'key-a', 'gemini-3.6-flash');
    });

    it('stops after the configured models fail and retains the final error', async () => {
        process.env.GEMINI_API_KEYS = 'key-a,key-b';
        const failure = Object.assign(new Error('high demand'), { status: 503 });
        const operation = jest.fn().mockRejectedValue(failure);
        const onError = jest.fn();
        await expect(withGeminiFallback(operation, onError)).rejects.toBe(failure);
        expect(operation).toHaveBeenCalledTimes(2);
        expect(onError).toHaveBeenLastCalledWith(failure, {
            model: 'gemini-3.6-flash', keyIndex: 0, keyCount: 2,
        });
    });

    it('fails before invoking the provider when no credential is configured', async () => {
        const operation = jest.fn();
        await expect(withGeminiFallback(operation)).rejects.toThrow('Gemini API key is missing');
        expect(operation).not.toHaveBeenCalled();
    });

    it('redacts configured credentials from both URLs and header-shaped errors', () => {
        process.env.GEMINI_API_KEY = 'private-gemini-key';
        const message = getGeminiErrorSummary(new Error(
            'https://example.com?key=private-gemini-key&other=1 x-goog-api-key: private-gemini-key',
        ));
        expect(message).not.toContain('private-gemini-key');
        expect(message).toContain('[REDACTED]');
        expect(message).toContain('other=1');
    });
});
