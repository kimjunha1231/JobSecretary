import { getSafeInternalPath } from '@/shared/lib/safe-redirect';

describe('getSafeInternalPath', () => {
    const origin = 'https://jobsecretary.example';

    it.each([
        [null, '/archive'],
        ['https://evil.example/phishing', '/archive'],
        ['//evil.example/phishing', '/archive'],
        ['/\\\\evil.example', '/archive'],
        ['not-a-path', '/archive'],
    ])('rejects unsafe redirect %p', (value, expected) => {
        expect(getSafeInternalPath(value, origin)).toBe(expected);
    });

    it('preserves a same-origin path, query, and hash', () => {
        expect(getSafeInternalPath('/document/123?from=login#top', origin)).toBe(
            '/document/123?from=login#top',
        );
    });
});
