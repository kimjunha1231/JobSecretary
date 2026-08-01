import {
    getGeminiApiKey,
    getGeminiApiKeys,
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
});
