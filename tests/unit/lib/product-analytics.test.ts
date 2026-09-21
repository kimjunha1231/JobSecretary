/** @jest-environment jsdom */

import { track } from '@vercel/analytics';
import { trackProductEvent } from '@/shared/lib/product-analytics';

jest.mock('@vercel/analytics', () => ({ track: jest.fn() }));

const mockedTrack = track as jest.Mock;

describe('product analytics', () => {
    beforeEach(() => jest.clearAllMocks());

    it('sends only aggregate allowlisted properties', () => {
        trackProductEvent({ name: 'writing_studio_started', properties: { question_count: 3 } });

        expect(mockedTrack).toHaveBeenCalledWith('writing_studio_started', { question_count: 3 });
    });

    it('does not expose arbitrary text or identifiers', () => {
        trackProductEvent({ name: 'writing_studio_error', properties: { operation: 'export' } });

        expect(mockedTrack).toHaveBeenCalledWith('writing_studio_error', { operation: 'export' });
        expect(mockedTrack.mock.calls[0][1]).not.toHaveProperty('content');
        expect(mockedTrack.mock.calls[0][1]).not.toHaveProperty('session_id');
    });

    it('records only aggregate writing choices and duration', () => {
        trackProductEvent({ name: 'writing_studio_choice', properties: { choice: 'draft_selected' } });
        trackProductEvent({ name: 'writing_studio_finalized', properties: { question_count: 2, duration_seconds: 184 } });

        expect(mockedTrack).toHaveBeenNthCalledWith(1, 'writing_studio_choice', { choice: 'draft_selected' });
        expect(mockedTrack).toHaveBeenNthCalledWith(2, 'writing_studio_finalized', { question_count: 2, duration_seconds: 184 });
    });

    it('swallows analytics failures so product actions remain usable', () => {
        mockedTrack.mockImplementationOnce(() => { throw new Error('analytics unavailable'); });

        expect(() => trackProductEvent({ name: 'career_exported', properties: { format: 'resume' } })).not.toThrow();
    });
});
