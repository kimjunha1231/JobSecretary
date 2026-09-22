/** @jest-environment node */

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { gzipSync } from 'node:zlib';
import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { fetchSourceUrl, MAX_SOURCE_URL_BYTES } from '@/features/source-ingestion/api';

jest.mock('node:dns/promises', () => ({
    lookup: jest.fn(),
}));

jest.mock('node:https', () => ({
    request: jest.fn(),
}));

const lookupMock = lookup as jest.Mock;
const httpsRequestMock = httpsRequest as unknown as jest.Mock;

describe('pinned HTTPS source transport', () => {
    beforeEach(() => {
        lookupMock.mockReset().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
        httpsRequestMock.mockReset();
    });

    it('connects through the validated lookup, keeps HTTPS verification enabled, and decodes bounded gzip bodies', async () => {
        const html = '<h1>채용 페이지</h1>';
        const compressedBody = gzipSync(html);

        httpsRequestMock.mockImplementation((url, options, callback) => {
            const clientRequest = new EventEmitter() as EventEmitter & { end: jest.Mock };
            clientRequest.end = jest.fn(() => {
                const response = new PassThrough() as PassThrough & {
                    statusCode: number;
                    headers: Record<string, string>;
                };
                response.statusCode = 200;
                response.headers = {
                    'content-type': 'text/html; charset=utf-8',
                    'content-encoding': 'gzip',
                };

                queueMicrotask(() => {
                    callback(response);
                    response.end(compressedBody);
                });
            });
            return clientRequest;
        });

        const result = await fetchSourceUrl('https://example.com/jobs');

        expect(result).toMatchObject({
            finalUrl: 'https://example.com/jobs',
            contentType: 'text/html',
            body: html,
        });
        expect(httpsRequestMock).toHaveBeenCalledTimes(1);

        const [requestUrl, requestOptions] = httpsRequestMock.mock.calls[0] as [URL, {
            agent: false;
            headers: Record<string, string>;
            lookup: unknown;
            rejectUnauthorized?: boolean;
            signal: AbortSignal;
        }];
        expect(requestUrl.hostname).toBe('example.com');
        expect(requestOptions.agent).toBe(false);
        expect(requestOptions.headers['Accept-Encoding']).toBe('gzip, deflate, br');
        expect(requestOptions.signal).toBeInstanceOf(AbortSignal);
        expect(requestOptions.rejectUnauthorized).not.toBe(false);

        const lookupResult: unknown[][] = [];
        const pinnedLookup = requestOptions.lookup as unknown as (
            hostname: string,
            options: { all?: boolean },
            callback: (error: NodeJS.ErrnoException | null, addresses: string | Array<{ address: string; family: number }>) => void,
        ) => void;
        pinnedLookup('example.com', { all: true }, (...args) => lookupResult.push(args));
        expect(lookupResult).toEqual([[null, [{ address: '93.184.216.34', family: 4 }]]]);
    });

    it('rejects a small compressed response that expands beyond the 2MB limit', async () => {
        const compressedBody = gzipSync(Buffer.alloc(MAX_SOURCE_URL_BYTES + 1, 0x61));

        httpsRequestMock.mockImplementation((_url, _options, callback) => {
            const clientRequest = new EventEmitter() as EventEmitter & { end: jest.Mock };
            clientRequest.end = jest.fn(() => {
                const response = new PassThrough() as PassThrough & {
                    statusCode: number;
                    headers: Record<string, string>;
                };
                response.statusCode = 200;
                response.headers = {
                    'content-type': 'text/html; charset=utf-8',
                    'content-encoding': 'gzip',
                    'content-length': String(compressedBody.byteLength),
                };

                queueMicrotask(() => {
                    callback(response);
                    response.end(compressedBody);
                });
            });
            return clientRequest;
        });

        await expect(fetchSourceUrl('https://example.com/large')).rejects.toMatchObject({
            code: 'response_too_large',
            status: 413,
        });
    });
});
