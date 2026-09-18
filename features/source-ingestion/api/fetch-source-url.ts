import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

export const MAX_SOURCE_URL_LENGTH = 2_048;
export const MAX_SOURCE_URL_REDIRECTS = 3;
export const MAX_SOURCE_URL_BYTES = 2 * 1024 * 1024;
export const SOURCE_URL_TIMEOUT_MS = 10_000;

const ALLOWED_PROTOCOL = 'https:';
const ALLOWED_PORTS = new Set(['', '443']);
const ALLOWED_CONTENT_TYPES = new Set(['text/html', 'application/xhtml+xml', 'text/plain']);
const BLOCKED_IP_RANGES = new Set([
    'private',
    'loopback',
    'linkLocal',
    'uniqueLocal',
    'carrierGradeNat',
    'unspecified',
    'multicast',
    'reserved',
    'broadcast',
    'benchmarking',
    'as112',
    'as112v6',
    'amt',
    'ipv4Mapped',
    'rfc6145',
    'rfc6052',
]);

export type SourceUrlFetchErrorCode =
    | 'invalid_url'
    | 'blocked_host'
    | 'dns_failed'
    | 'timeout'
    | 'redirect_limit'
    | 'missing_redirect'
    | 'unsupported_content_type'
    | 'response_too_large'
    | 'http_error'
    | 'fetch_failed';

export class SourceUrlFetchError extends Error {
    constructor(
        public readonly code: SourceUrlFetchErrorCode,
        message: string,
        public readonly status: 400 | 413 | 422 | 502 | 504 = 400,
    ) {
        super(message);
        this.name = 'SourceUrlFetchError';
    }
}

export type SourceUrlFetchResult = {
    finalUrl: string;
    contentType: string;
    body: string;
};

export function validateExternalUrl(value: unknown): URL {
    if (typeof value !== 'string' || value.trim().length === 0 || value.length > MAX_SOURCE_URL_LENGTH) {
        throw new SourceUrlFetchError('invalid_url', 'URL은 2,048자 이하로 입력해 주세요.');
    }

    let url: URL;
    try {
        url = new URL(value.trim());
    } catch {
        throw new SourceUrlFetchError('invalid_url', 'URL 형식을 확인해 주세요.');
    }

    if (url.protocol !== ALLOWED_PROTOCOL || !url.hostname || !ALLOWED_PORTS.has(url.port)) {
        throw new SourceUrlFetchError('invalid_url', 'HTTPS 기본 포트를 사용하는 공개 URL만 가져올 수 있습니다.');
    }
    if (url.username || url.password) {
        throw new SourceUrlFetchError('invalid_url', '사용자 정보가 포함된 URL은 가져올 수 없습니다.');
    }

    return url;
}

export function isBlockedIpAddress(address: string): boolean {
    if (!ipaddr.isValid(address)) return true;

    try {
        const parsed = ipaddr.parse(address);
        if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
            // Do not let an IPv4 address hide inside an IPv6 literal.
            return true;
        }
        return BLOCKED_IP_RANGES.has(parsed.range());
    } catch {
        return true;
    }
}

async function validateResolvableHost(url: URL): Promise<void> {
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (ipaddr.isValid(hostname)) {
        if (isBlockedIpAddress(hostname)) {
            throw new SourceUrlFetchError('blocked_host', '공개 인터넷 주소가 아닌 URL은 가져올 수 없습니다.');
        }
        return;
    }

    let addresses: Array<{ address: string }>;
    try {
        addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
        throw new SourceUrlFetchError('dns_failed', 'URL의 호스트를 확인하지 못했습니다.', 422);
    }

    if (addresses.length === 0 || addresses.some(({ address }) => isBlockedIpAddress(address))) {
        throw new SourceUrlFetchError('blocked_host', '공개 인터넷 주소가 아닌 URL은 가져올 수 없습니다.');
    }
}

async function readResponseBody(response: Response): Promise<string> {
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_URL_BYTES) {
        throw new SourceUrlFetchError('response_too_large', '웹페이지 응답이 너무 큽니다. 2MB 이하의 페이지를 사용해 주세요.', 413);
    }

    if (!response.body) {
        const text = await response.text();
        if (Buffer.byteLength(text, 'utf8') > MAX_SOURCE_URL_BYTES) {
            throw new SourceUrlFetchError('response_too_large', '웹페이지 응답이 너무 큽니다. 2MB 이하의 페이지를 사용해 주세요.', 413);
        }
        return text;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;
            totalBytes += value.byteLength;
            if (totalBytes > MAX_SOURCE_URL_BYTES) {
                await reader.cancel();
                throw new SourceUrlFetchError('response_too_large', '웹페이지 응답이 너무 큽니다. 2MB 이하의 페이지를 사용해 주세요.', 413);
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
}

function isRedirectStatus(status: number): boolean {
    return [301, 302, 303, 307, 308].includes(status);
}

export async function fetchSourceUrl(value: unknown): Promise<SourceUrlFetchResult> {
    let currentUrl = validateExternalUrl(value);

    for (let redirectCount = 0; redirectCount <= MAX_SOURCE_URL_REDIRECTS; redirectCount += 1) {
        await validateResolvableHost(currentUrl);

        let response: Response;
        try {
            response = await fetch(currentUrl, {
                method: 'GET',
                redirect: 'manual',
                headers: {
                    Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
                    'User-Agent': 'JobSecretarySourceFetcher/1.0',
                },
                signal: AbortSignal.timeout(SOURCE_URL_TIMEOUT_MS),
            });
        } catch (error) {
            if (error instanceof SourceUrlFetchError) throw error;
            if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
                throw new SourceUrlFetchError('timeout', '웹페이지 응답 시간이 초과되었습니다.', 504);
            }
            throw new SourceUrlFetchError('fetch_failed', '웹페이지를 가져오지 못했습니다.', 502);
        }

        if (isRedirectStatus(response.status)) {
            if (redirectCount === MAX_SOURCE_URL_REDIRECTS) {
                throw new SourceUrlFetchError('redirect_limit', 'URL 리다이렉트 횟수가 너무 많습니다.', 422);
            }
            const location = response.headers.get('location');
            if (!location) {
                throw new SourceUrlFetchError('missing_redirect', '리다이렉트 대상 URL을 확인하지 못했습니다.', 422);
            }
            try {
                currentUrl = validateExternalUrl(new URL(location, currentUrl).toString());
            } catch (error) {
                if (error instanceof SourceUrlFetchError) throw error;
                throw new SourceUrlFetchError('invalid_url', '리다이렉트 대상 URL을 확인할 수 없습니다.', 422);
            }
            continue;
        }

        if (!response.ok) {
            throw new SourceUrlFetchError('http_error', '웹페이지가 정상적으로 응답하지 않았습니다.', 422);
        }

        const contentType = (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()) || '';
        if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
            throw new SourceUrlFetchError('unsupported_content_type', 'HTML 또는 일반 텍스트 페이지 URL만 가져올 수 있습니다.', 422);
        }

        let body: string;
        try {
            body = await readResponseBody(response);
        } catch (error) {
            if (error instanceof SourceUrlFetchError) throw error;
            throw new SourceUrlFetchError('fetch_failed', '웹페이지 응답을 읽지 못했습니다.', 502);
        }

        return { finalUrl: currentUrl.toString(), contentType, body };
    }

    throw new SourceUrlFetchError('redirect_limit', 'URL 리다이렉트 횟수가 너무 많습니다.', 422);
}
