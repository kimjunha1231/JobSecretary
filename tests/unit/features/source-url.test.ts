/** @jest-environment node */

import { lookup } from 'node:dns/promises';
import {
    fetchSourceUrl,
    createPinnedLookup,
    htmlToFragments,
    htmlToText,
    isBlockedIpAddress,
    validateExternalUrl,
    MAX_SOURCE_URL_BYTES,
    SourceUrlFetchError,
    type SourceUrlRequester,
} from '@/features/source-ingestion/api';

jest.mock('node:dns/promises', () => ({
    lookup: jest.fn(),
}));

const mockedLookup = lookup as jest.Mock;

describe('safe source URL ingestion', () => {
    beforeEach(() => {
        mockedLookup.mockReset();
        mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    });

    it('allows only public HTTPS URLs with the default port', () => {
        expect(validateExternalUrl('https://example.com/careers').hostname).toBe('example.com');
        expect(() => validateExternalUrl('http://example.com')).toThrow(SourceUrlFetchError);
        expect(() => validateExternalUrl('https://example.com:8443')).toThrow('기본 포트');
        expect(() => validateExternalUrl('https://user:pass@example.com')).toThrow('사용자 정보');
    });

    it('blocks private, loopback, and IPv4-mapped addresses', () => {
        expect(isBlockedIpAddress('127.0.0.1')).toBe(true);
        expect(isBlockedIpAddress('10.0.0.10')).toBe(true);
        expect(isBlockedIpAddress('::1')).toBe(true);
        expect(isBlockedIpAddress('::ffff:127.0.0.1')).toBe(true);
        expect(isBlockedIpAddress('93.184.216.34')).toBe(false);
    });

    it('converts HTML to text and keeps useful block locators', () => {
        const html = '<h1>프론트엔드&nbsp;개발자</h1><script>ignore()</script><p>검색 &amp; 추천</p><li>협업</li>';

        expect(htmlToText(html)).toBe('프론트엔드 개발자\n\n검색 & 추천\n\n협업');
        expect(htmlToFragments(html)).toEqual([
            expect.objectContaining({ content: '프론트엔드 개발자', locator: { type: 'heading', tag: 'h1', position: 0 } }),
            expect.objectContaining({ content: '검색 & 추천', locator: { type: 'paragraph', tag: 'p', position: 1 } }),
            expect.objectContaining({ content: '협업', locator: { type: 'paragraph', tag: 'li', position: 2 } }),
        ]);
        expect(htmlToText('<p>visible</p><script>hidden')).toBe('visible');
    });

    it('blocks a hostname that resolves to a private address before fetching', async () => {
        mockedLookup.mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }]);
        const requester = jest.fn<Promise<Response>, Parameters<SourceUrlRequester>>();

        await expect(fetchSourceUrl('https://public-looking.example/jobs', requester)).rejects.toMatchObject({ code: 'blocked_host' });
        expect(requester).not.toHaveBeenCalled();
    });

    it('fetches public HTML and revalidates redirect targets', async () => {
        const requester = jest.fn<Promise<Response>, Parameters<SourceUrlRequester>>().mockResolvedValue(new Response('<h1>채용</h1>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
        }));

        await expect(fetchSourceUrl('https://example.com/jobs', requester)).resolves.toMatchObject({
            finalUrl: 'https://example.com/jobs',
            contentType: 'text/html',
            body: '<h1>채용</h1>',
        });
        expect(requester).toHaveBeenLastCalledWith(
            expect.objectContaining({ hostname: 'example.com' }),
            [{ address: '93.184.216.34', family: 4 }],
            expect.any(AbortSignal),
        );

        requester.mockResolvedValueOnce(new Response(null, {
            status: 302,
            headers: { location: 'https://127.0.0.1/private' },
        }));
        await expect(fetchSourceUrl('https://example.com/redirect', requester)).rejects.toMatchObject({ code: 'blocked_host' });
        expect(requester).toHaveBeenCalledTimes(2);

        requester.mockResolvedValueOnce(new Response(null, {
            status: 302,
            headers: { location: 'http://example.com/insecure' },
        }));
        await expect(fetchSourceUrl('https://example.com/bad-redirect', requester)).rejects.toMatchObject({ code: 'invalid_url' });
    });

    it('accepts a public PDF and keeps its bytes for the existing PDF extractor', async () => {
        const pdfBytes = Uint8Array.from([37, 80, 68, 70, 45, 49, 46, 55]);
        const requester = jest.fn<Promise<Response>, Parameters<SourceUrlRequester>>().mockResolvedValue(new Response(pdfBytes, {
            status: 200,
            headers: { 'content-type': 'application/pdf' },
        }));

        const result = await fetchSourceUrl('https://example.com/file.pdf', requester);
        expect(result).toMatchObject({
            finalUrl: 'https://example.com/file.pdf',
            contentType: 'application/pdf',
        });
        expect(result.body).toBeUndefined();
        expect(Array.from(result.bytes)).toEqual(Array.from(pdfBytes));
    });

    it('rejects unsupported media and oversized responses before parsing', async () => {
        const requester = jest.fn<Promise<Response>, Parameters<SourceUrlRequester>>().mockResolvedValue(new Response('not an archive', {
            status: 200,
            headers: { 'content-type': 'application/zip' },
        }));
        await expect(fetchSourceUrl('https://example.com/file.zip', requester)).rejects.toMatchObject({
            code: 'unsupported_content_type',
        });

        requester.mockResolvedValueOnce(new Response(null, {
            status: 200,
            headers: {
                'content-type': 'text/html',
                'content-length': String(MAX_SOURCE_URL_BYTES + 1),
            },
        }));
        await expect(fetchSourceUrl('https://example.com/large', requester)).rejects.toMatchObject({
            code: 'response_too_large',
        });
    });

    it('only returns addresses validated for the exact hostname at socket lookup time', () => {
        const pinnedLookup = createPinnedLookup('example.com', [
            { address: '93.184.216.34', family: 4 },
            { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
        ]);
        const allCallback = jest.fn();
        const wrongHostCallback = jest.fn();

        pinnedLookup('example.com', { all: true }, allCallback);
        pinnedLookup('attacker.example', { all: true }, wrongHostCallback);

        expect(allCallback).toHaveBeenCalledWith(null, [
            { address: '93.184.216.34', family: 4 },
            { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
        ]);
        expect(wrongHostCallback.mock.calls[0][0]).toMatchObject({ code: 'ENOTFOUND' });
    });

    it('maps connection timeouts to a retryable timeout error', async () => {
        const timeoutError = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
        const requester = jest.fn<Promise<Response>, Parameters<SourceUrlRequester>>().mockRejectedValue(timeoutError);

        await expect(fetchSourceUrl('https://example.com/jobs', requester)).rejects.toMatchObject({
            code: 'timeout',
            status: 504,
        });
    });
});
