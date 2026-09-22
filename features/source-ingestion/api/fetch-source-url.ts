import { lookup } from 'node:dns/promises';
import type { LookupAddress, LookupOptions } from 'node:dns';
import { request as httpsRequest } from 'node:https';
import { PassThrough, Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import ipaddr from 'ipaddr.js';

export const MAX_SOURCE_URL_LENGTH = 2_048;
export const MAX_SOURCE_URL_REDIRECTS = 3;
export const MAX_SOURCE_URL_BYTES = 2 * 1024 * 1024;
export const SOURCE_URL_TIMEOUT_MS = 10_000;

const ALLOWED_PROTOCOL = 'https:';
const ALLOWED_PORTS = new Set(['', '443']);
const ALLOWED_CONTENT_TYPES = new Set(['text/html', 'application/xhtml+xml', 'text/plain', 'application/pdf']);
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
    | 'unsupported_content_encoding'
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
    bytes: Uint8Array;
    body?: string;
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

export type PublicHttpsAddress = LookupAddress;

type LookupCallback = (
    error: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
) => void;

type PinnedLookup = (hostname: string, options: LookupOptions, callback: LookupCallback) => void;

const BLOCKED_HOST_MESSAGE = '공개 인터넷 주소가 아닌 URL은 가져올 수 없습니다.';

function normalizeHostname(hostname: string): string {
    return hostname.replace(/^\[|\]$/g, '').toLowerCase();
}

export function createPinnedLookup(hostname: string, addresses: readonly PublicHttpsAddress[]): PinnedLookup {
    const expectedHostname = normalizeHostname(hostname);

    return (requestedHostname, options, callback) => {
        if (normalizeHostname(requestedHostname) !== expectedHostname) {
            callback(Object.assign(new Error('Unexpected hostname lookup'), { code: 'ENOTFOUND' }), '', 0);
            return;
        }

        const requestedFamily = options.family === 'IPv4' ? 4 : options.family === 'IPv6' ? 6 : options.family;
        const candidates = addresses.filter(address => !requestedFamily || address.family === requestedFamily);
        if (candidates.length === 0) {
            callback(Object.assign(new Error('No validated address for requested family'), { code: 'ENOTFOUND' }), '', 0);
            return;
        }

        if (options.all) {
            callback(null, candidates.map(({ address, family }) => ({ address, family })));
            return;
        }

        callback(null, candidates[0].address, candidates[0].family);
    };
}

async function resolvePublicAddresses(url: URL, signal: AbortSignal): Promise<PublicHttpsAddress[]> {
    const hostname = normalizeHostname(url.hostname);
    if (ipaddr.isValid(hostname)) {
        if (isBlockedIpAddress(hostname)) {
            throw new SourceUrlFetchError('blocked_host', BLOCKED_HOST_MESSAGE);
        }
        return [{ address: hostname, family: ipaddr.parse(hostname).kind() === 'ipv4' ? 4 : 6 }];
    }

    let addresses: PublicHttpsAddress[];
    let onAbort: (() => void) | undefined;
    try {
        const lookupPromise = lookup(hostname, { all: true, verbatim: true });
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
            if (signal.aborted) {
                reject(signal.reason);
                return;
            }
            onAbort = () => reject(signal.reason);
            signal.addEventListener('abort', onAbort, { once: true });
        });
        addresses = await Promise.race([lookupPromise, timeoutPromise]);
    } catch (error) {
        if (isTimeoutError(error)) {
            throw new SourceUrlFetchError('timeout', '웹페이지 호스트 확인 시간이 초과되었습니다.', 504);
        }
        throw new SourceUrlFetchError('dns_failed', 'URL의 호스트를 확인하지 못했습니다.', 422);
    } finally {
        if (onAbort) signal.removeEventListener('abort', onAbort);
    }

    if (addresses.length === 0 || addresses.some(({ address }) => isBlockedIpAddress(address))) {
        throw new SourceUrlFetchError('blocked_host', BLOCKED_HOST_MESSAGE);
    }

    return addresses.map(({ address }) => ({
        address,
        family: ipaddr.parse(address).kind() === 'ipv4' ? 4 : 6,
    }));
}

function createByteLimitTransform(): Transform {
    let totalBytes = 0;
    return new Transform({
        transform(chunk: Buffer, _encoding, callback) {
            totalBytes += chunk.byteLength;
            if (totalBytes > MAX_SOURCE_URL_BYTES) {
                callback(new SourceUrlFetchError(
                    'response_too_large',
                    '웹페이지 응답이 너무 큽니다. 2MB 이하의 페이지를 사용해 주세요.',
                    413,
                ));
                return;
            }
            callback(null, chunk);
        },
    });
}

function createDecompressors(contentEncoding: string | undefined): Transform[] {
    const encodings = (contentEncoding ?? '')
        .split(',')
        .map(encoding => encoding.trim().toLowerCase())
        .filter(encoding => encoding && encoding !== 'identity')
        .reverse();

    return encodings.map(encoding => {
        if (encoding === 'gzip' || encoding === 'x-gzip') return createGunzip();
        if (encoding === 'deflate') return createInflate();
        if (encoding === 'br') return createBrotliDecompress();
        throw new SourceUrlFetchError('unsupported_content_encoding', '지원하지 않는 웹페이지 압축 형식입니다.', 422);
    });
}

function toWebResponse(incoming: import('node:http').IncomingMessage): Response {
    const status = incoming.statusCode ?? 0;
    if (status < 200 || status > 599) {
        incoming.destroy();
        throw new SourceUrlFetchError('fetch_failed', '웹페이지 응답을 읽지 못했습니다.', 502);
    }

    const headers = new Headers();
    for (const name of ['content-type', 'location'] as const) {
        const value = incoming.headers[name];
        if (typeof value === 'string') headers.set(name, value);
    }

    if ([204, 205, 304].includes(status)) {
        incoming.resume();
        return new Response(null, { status, headers });
    }

    const output = new PassThrough();
    const transforms = [
        createByteLimitTransform(),
        ...createDecompressors(incoming.headers['content-encoding']),
        createByteLimitTransform(),
    ];
    void pipeline([incoming, ...transforms, output]).catch(error => output.destroy(error));

    // Both wire and decoded bytes are limited, so compression cannot bypass the parser cap.
    const body = Readable.toWeb(output) as ReadableStream<Uint8Array>;
    return new Response(body, { status, headers });
}

export type SourceUrlRequester = (
    url: URL,
    addresses: readonly PublicHttpsAddress[],
    signal: AbortSignal,
) => Promise<Response>;

const requestPinnedHttps: SourceUrlRequester = (url, addresses, signal) => new Promise((resolve, reject) => {
    const request = httpsRequest(url, {
        method: 'GET',
        agent: false,
        lookup: createPinnedLookup(url.hostname, addresses),
        headers: {
            Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,text/plain;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'User-Agent': 'JobSecretarySourceFetcher/1.0',
        },
        signal,
    }, incoming => {
        try {
            resolve(toWebResponse(incoming));
        } catch (error) {
            incoming.destroy();
            reject(error);
        }
    });

    request.once('error', reject);
    request.end();
});

function isTimeoutError(error: unknown): boolean {
    return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

function throwFetchError(error: unknown): never {
    if (error instanceof SourceUrlFetchError) throw error;
    if (isTimeoutError(error)) {
        throw new SourceUrlFetchError('timeout', '웹페이지 응답 시간이 초과되었습니다.', 504);
    }
    throw new SourceUrlFetchError('fetch_failed', '웹페이지를 가져오지 못했습니다.', 502);
}

async function readResponseBytes(response: Response): Promise<Uint8Array> {
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_URL_BYTES) {
        throw new SourceUrlFetchError('response_too_large', '웹페이지 응답이 너무 큽니다. 2MB 이하의 페이지를 사용해 주세요.', 413);
    }

    if (!response.body) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > MAX_SOURCE_URL_BYTES) {
            throw new SourceUrlFetchError('response_too_large', '웹페이지 응답이 너무 큽니다. 2MB 이하의 페이지를 사용해 주세요.', 413);
        }
        return bytes;
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
                await reader.cancel().catch(() => undefined);
                throw new SourceUrlFetchError('response_too_large', '웹페이지 응답이 너무 큽니다. 2MB 이하의 페이지를 사용해 주세요.', 413);
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
}

function isRedirectStatus(status: number): boolean {
    return [301, 302, 303, 307, 308].includes(status);
}

export async function fetchSourceUrl(
    value: unknown,
    requester: SourceUrlRequester = requestPinnedHttps,
): Promise<SourceUrlFetchResult> {
    let currentUrl = validateExternalUrl(value);

    for (let redirectCount = 0; redirectCount <= MAX_SOURCE_URL_REDIRECTS; redirectCount += 1) {
        const signal = AbortSignal.timeout(SOURCE_URL_TIMEOUT_MS);
        const addresses = await resolvePublicAddresses(currentUrl, signal);

        let response: Response;
        try {
            response = await requester(currentUrl, addresses, signal);
        } catch (error) {
            throwFetchError(error);
        }

        if (isRedirectStatus(response.status)) {
            await response.body?.cancel().catch(() => undefined);
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
            await response.body?.cancel().catch(() => undefined);
            throw new SourceUrlFetchError('http_error', '웹페이지가 정상적으로 응답하지 않았습니다.', 422);
        }

        const contentType = (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()) || '';
        if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
            await response.body?.cancel().catch(() => undefined);
            throw new SourceUrlFetchError('unsupported_content_type', 'HTML, 일반 텍스트 또는 PDF URL만 가져올 수 있습니다.', 422);
        }

        let bytes: Uint8Array;
        try {
            bytes = await readResponseBytes(response);
        } catch (error) {
            if (error instanceof SourceUrlFetchError) throw error;
            throwFetchError(error);
        }

        return {
            finalUrl: currentUrl.toString(),
            contentType,
            bytes,
            ...(contentType === 'application/pdf' ? {} : { body: Buffer.from(bytes).toString('utf8') }),
        };
    }

    throw new SourceUrlFetchError('redirect_limit', 'URL 리다이렉트 횟수가 너무 많습니다.', 422);
}
