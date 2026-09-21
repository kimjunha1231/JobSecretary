/** @jest-environment jsdom */

import {
    clearWritingSessionStarted,
    ensureWritingSessionStarted,
    getWritingSessionDurationSeconds,
    markWritingSessionStarted,
} from '@/shared/lib/writing-session-timing';

describe('writing session timing telemetry', () => {
    beforeEach(() => window.sessionStorage.clear());

    it('stores only a local timestamp and returns a bounded duration', () => {
        markWritingSessionStarted('session-a', 1_000);

        expect(getWritingSessionDurationSeconds('session-a', 6_500)).toBe(6);
        expect(window.sessionStorage.getItem('jobsecretary:writing-studio-started-at:session-a')).toBe('1000');
    });

    it('does not replace an existing start when a session is reopened', () => {
        markWritingSessionStarted('session-a', 1_000);
        ensureWritingSessionStarted('session-a', 9_000);

        expect(getWritingSessionDurationSeconds('session-a', 10_000)).toBe(9);
    });

    it('returns no duration for malformed or future timestamps and clears the marker', () => {
        window.sessionStorage.setItem('jobsecretary:writing-studio-started-at:session-a', 'not-a-time');
        expect(getWritingSessionDurationSeconds('session-a', 10_000)).toBeUndefined();

        markWritingSessionStarted('session-a', 20_000);
        expect(getWritingSessionDurationSeconds('session-a', 10_000)).toBeUndefined();

        clearWritingSessionStarted('session-a');
        expect(window.sessionStorage.getItem('jobsecretary:writing-studio-started-at:session-a')).toBeNull();
    });

    it('keeps the timing marker local to the browser session', () => {
        markWritingSessionStarted('private-session-id', 1_000);
        expect(getWritingSessionDurationSeconds('private-session-id', 2_000)).toBe(1);
        expect(window.sessionStorage.getItem('jobsecretary:writing-studio-started-at:private-session-id')).toBe('1000');
    });
});
