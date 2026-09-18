const DEFAULT_REDIRECT_PATH = '/archive';

/**
 * Accept only same-origin, root-relative paths for post-authentication redirects.
 * Absolute URLs, protocol-relative URLs, and backslash-based URL tricks fall back
 * to the authenticated archive page.
 */
export function getSafeInternalPath(
    value: string | null | undefined,
    origin: string,
    fallback = DEFAULT_REDIRECT_PATH,
): string {
    if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
        return fallback;
    }

    try {
        const candidate = new URL(value, origin);
        if (candidate.origin !== origin) {
            return fallback;
        }

        return `${candidate.pathname}${candidate.search}${candidate.hash}`;
    } catch {
        return fallback;
    }
}
