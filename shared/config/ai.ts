// The former gemini-2.5-flash-lite model is no longer available to new API
// users. Keep one supported Flash alias for all AI features in the app.
export const AI_MODEL = 'gemini-flash-latest';

const splitConfiguredKeys = (value: string | undefined): string[] => {
    if (!value) return [];

    return value
        .split(/[\n,]/)
        .map((key) => key.trim().replace(/^(\"|')(.*)\1$/, '$2').trim())
        .filter(Boolean);
};

const getIndexedKeys = (prefix: string): string[] => {
    const indexedKeys = Object.entries(process.env)
        .map(([name, value]) => {
            const match = name.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:_(\\d+))$`));
            return match ? { index: Number(match[1]), value } : null;
        })
        .filter((entry): entry is { index: number; value: string | undefined } => entry !== null)
        .sort((left, right) => left.index - right.index);

    return indexedKeys.flatMap(({ value }) => splitConfiguredKeys(value));
};

/**
 * Returns all configured Gemini keys in fallback order.
 *
 * Supported forms:
 * - GEMINI_API_KEYS=key-a,key-b
 * - GEMINI_API_KEY=key-a with GEMINI_API_KEY_2=key-b
 * - API_KEYS/API_KEY/API_KEY_N as legacy aliases
 */
export function getGeminiApiKeys(): string[] {
    const keys = [
        ...splitConfiguredKeys(process.env.GEMINI_API_KEYS),
        ...splitConfiguredKeys(process.env.GEMINI_API_KEY),
        ...getIndexedKeys('GEMINI_API_KEY'),
        ...splitConfiguredKeys(process.env.API_KEYS),
        ...splitConfiguredKeys(process.env.API_KEY),
        ...getIndexedKeys('API_KEY'),
    ];

    return [...new Set(keys)];
}

/**
 * Returns the server-only Gemini API key.
 *
 * GEMINI_API_KEY is the canonical name used by the related interview
 * tooling. API_KEY remains supported so existing deployments can migrate
 * without an outage.
 */
export function getGeminiApiKey(): string {
    const apiKey = getGeminiApiKeys()[0];

    if (!apiKey) {
        throw new Error('Gemini API key is missing. Set GEMINI_API_KEY in the server environment.');
    }

    return apiKey;
}

/**
 * Executes a Gemini request with each configured key until one succeeds.
 * The callback receives the key only at runtime and callers should never log
 * it. The last error is re-thrown when every key fails.
 */
export async function withGeminiKeyFallback<T>(
    operation: (apiKey: string, keyIndex: number) => Promise<T>,
    onError?: (error: unknown, keyIndex: number, keyCount: number) => void,
): Promise<T> {
    const apiKeys = getGeminiApiKeys();
    if (apiKeys.length === 0) {
        throw new Error('Gemini API key is missing. Set GEMINI_API_KEY in the server environment.');
    }

    let lastError: unknown;
    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
        try {
            return await operation(apiKeys[keyIndex], keyIndex);
        } catch (error) {
            lastError = error;
            onError?.(error, keyIndex, apiKeys.length);
        }
    }

    if (lastError instanceof Error) {
        throw lastError;
    }

    throw new Error('All configured Gemini API keys failed.');
}
