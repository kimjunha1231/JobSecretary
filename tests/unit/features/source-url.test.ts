/** @jest-environment node */

import { lookup } from 'node:dns/promises';
import {
    fetchSourceUrl,
    htmlToFragments,
    htmlToText,
    isBlockedIpAddress,
    validateExternalUrl,
    MAX_SOURCE_URL_BYTES,
    SourceUrlFetchError,
} from '@/features/source-ingestion/api';

jest.mock('node:dns/promises', () => ({
    lookup: jest.fn(),
}));

const mockedLookup = lookup as jest.Mock;

describe('safe source URL ingestion', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        mockedLookup.mockReset();
        mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    });

    afterEach(() => {
        global.fetch = originalFetch;
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
        const fetchMock = jest.fn();
        global.fetch = fetchMock;

        await expect(fetchSourceUrl('https://public-looking.example/jobs')).rejects.toMatchObject({ code: 'blocked_host' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('fetches public HTML and revalidates redirect targets', async () => {
        const fetchMock = jest.fn().mockResolvedValue(new Response('<h1>채용</h1>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
        }));
        global.fetch = fetchMock;

        await expect(fetchSourceUrl('https://example.com/jobs')).resolves.toMatchObject({
            finalUrl: 'https://example.com/jobs',
            contentType: 'text/html',
            body: '<h1>채용</h1>',
        });

        fetchMock.mockResolvedValueOnce(new Response(null, {
            status: 302,
            headers: { location: 'https://127.0.0.1/private' },
        }));
        await expect(fetchSourceUrl('https://example.com/redirect')).rejects.toMatchObject({ code: 'blocked_host' });
        expect(fetchMock).toHaveBeenCalledTimes(2);

        fetchMock.mockResolvedValueOnce(new Response(null, {
            status: 302,
            headers: { location: 'http://example.com/insecure' },
        }));
        await expect(fetchSourceUrl('https://example.com/bad-redirect')).rejects.toMatchObject({ code: 'invalid_url' });
    });

    it('rejects unsupported media and oversized responses before parsing', async () => {
        global.fetch = jest.fn().mockResolvedValue(new Response('not a pdf', {
            status: 200,
            headers: { 'content-type': 'application/pdf' },
        }));
        await expect(fetchSourceUrl('https://example.com/file.pdf')).rejects.toMatchObject({
            code: 'unsupported_content_type',
        });

        global.fetch = jest.fn().mockResolvedValue(new Response(null, {
            status: 200,
            headers: {
                'content-type': 'text/html',
                'content-length': String(MAX_SOURCE_URL_BYTES + 1),
            },
        }));
        await expect(fetchSourceUrl('https://example.com/large')).rejects.toMatchObject({
            code: 'response_too_large',
        });
    });
});
