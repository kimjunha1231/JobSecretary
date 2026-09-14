// Pin the model: the latest alias can switch to an overloaded/new model
// without a deployment. Keep a separately verified model for availability.
export const AI_MODEL = 'gemini-3.5-flash';
export const GEMINI_REQUEST_TIMEOUT_MS = 25_000;
const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash-lite';

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

export function getGeminiModels(): string[] {
    const primary = process.env.GEMINI_MODEL?.trim() || AI_MODEL;
    const fallback = splitConfiguredKeys(
        process.env.GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACK_MODEL,
    );
    return [...new Set([primary, ...fallback])];
}

const getErrorStatus = (error: unknown): number | undefined => {
    if (typeof error !== 'object' || error === null) return undefined;
    if ('status' in error && typeof error.status === 'number') return error.status;
    const namedTimeout = 'name' in error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    // @google/genai 1.x wraps fetch aborts in a plain Error in apiCall().
    const wrappedTimeout = error instanceof Error
        && /^exception (?:AbortError|TimeoutError): .* sending request$/.test(error.message);
    if (namedTimeout || wrappedTimeout) {
        return 504;
    }
    return undefined;
};

/** Keep both SDK versions and configuration failures safe to log. */
export function getGeminiErrorSummary(error: unknown): string {
    const message = error instanceof Error ? error.message : 'Unknown Gemini error';
    return getGeminiApiKeys()
        .reduce((redacted, key) => redacted.split(key).join('[REDACTED]'), message)
        .replace(/AIza[\w-]+/g, '[REDACTED]')
        .replace(/key=[^&\s"']+/gi, 'key=[REDACTED]');
}

type GeminiAttempt = { model: string; keyIndex: number; keyCount: number };

/**
 * Retry authentication and rate-limit failures with another configured key.
 * Model outages and timeouts switch models immediately because another key
 * cannot fix provider capacity. Invalid requests fail without another attempt.
 */
export async function withGeminiFallback<T>(
    operation: (apiKey: string, model: string) => Promise<T>,
    onError?: (error: unknown, attempt: GeminiAttempt) => void,
): Promise<T> {
    const apiKeys = getGeminiApiKeys();
    if (apiKeys.length === 0) {
        throw new Error('Gemini API key is missing. Set GEMINI_API_KEY in the server environment.');
    }

    const rejectedKeyIndexes = new Set<number>();
    let lastError: unknown;
    for (const model of getGeminiModels()) {
        for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
            if (rejectedKeyIndexes.has(keyIndex)) continue;
            try {
                return await operation(apiKeys[keyIndex], model);
            } catch (error) {
                lastError = error;
                onError?.(error, { model, keyIndex, keyCount: apiKeys.length });
                const status = getErrorStatus(error);
                const invalidKey = status === 400 && error instanceof Error
                    && /API_KEY_(?:INVALID|EXPIRED)|API key (?:not valid|expired)/i.test(error.message);
                if (status === 401 || status === 403 || invalidKey) {
                    rejectedKeyIndexes.add(keyIndex);
                    continue;
                }
                if (status === 429) continue;
                if (status !== undefined && [404, 500, 502, 503, 504].includes(status)) {
                    break;
                }
                throw error;
            }
        }
        if (rejectedKeyIndexes.size === apiKeys.length) break;
    }
    throw lastError;
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
