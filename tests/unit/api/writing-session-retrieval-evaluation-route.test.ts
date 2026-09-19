/** @jest-environment node */

import { POST } from '@/app/api/writing-sessions/[id]/retrieval-evaluation/route';
import { WritingSessionServiceError, writingSessionService } from '@/entities/writing-session/api';
import { buildEvidenceRetrievalCases, evaluateEvidenceRetrieval } from '@/entities/writing-session/api';

jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));
jest.mock('@/entities/writing-session/api', () => {
    const actual = jest.requireActual('@/entities/writing-session/api');
    return {
        ...actual,
        writingSessionService: { get: jest.fn() },
        buildEvidenceRetrievalCases: jest.fn(),
        evaluateEvidenceRetrieval: jest.fn(),
    };
});

const mockGet = writingSessionService.get as jest.Mock;
const mockBuildCases = buildEvidenceRetrievalCases as jest.Mock;
const mockEvaluate = evaluateEvidenceRetrieval as jest.Mock;

describe('writing-session retrieval evaluation route', () => {
    beforeEach(() => jest.clearAllMocks());

    it('uses the authenticated session snapshot and returns metrics for the requested k', async () => {
        const details = { requirements: [], evidence: [], matches: [] };
        const cases = [{ requirement: {}, evidence: [], relevantEvidenceIds: [] }];
        const summary = {
            k: 5,
            caseCount: 1,
            evaluatedCaseCount: 0,
            emptyRelevantLabelCount: 1,
            recallAtK: 0,
            ndcgAtK: 0,
            mrrAtK: 0,
        };
        mockGet.mockResolvedValue(details);
        mockBuildCases.mockReturnValue(cases);
        mockEvaluate.mockReturnValue(summary);

        const response = await POST(
            new Request('http://localhost/api/writing-sessions/session/retrieval-evaluation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ k: 5 }),
            }),
            { params: Promise.resolve({ id: 'session-id' }) },
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual(summary);
        expect(mockGet).toHaveBeenCalledWith('session-id');
        expect(mockBuildCases).toHaveBeenCalledWith(details);
        expect(mockEvaluate).toHaveBeenCalledWith(cases, { k: 5 });
    });

    it('rejects an invalid k before loading a session', async () => {
        const response = await POST(
            new Request('http://localhost/api/writing-sessions/session/retrieval-evaluation', {
                method: 'POST',
                body: JSON.stringify({ k: 0 }),
            }),
            { params: Promise.resolve({ id: 'session-id' }) },
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: '검색 평가 조건을 확인해 주세요.' });
        expect(mockGet).not.toHaveBeenCalled();
    });

    it('uses k=3 when the request body is empty', async () => {
        const details = { requirements: [], evidence: [], matches: [] };
        const summary = {
            k: 3,
            caseCount: 0,
            evaluatedCaseCount: 0,
            emptyRelevantLabelCount: 0,
            recallAtK: 0,
            ndcgAtK: 0,
            mrrAtK: 0,
        };
        mockGet.mockResolvedValue(details);
        mockBuildCases.mockReturnValue([]);
        mockEvaluate.mockReturnValue(summary);

        const response = await POST(
            new Request('http://localhost/api/writing-sessions/session/retrieval-evaluation', { method: 'POST' }),
            { params: Promise.resolve({ id: 'session-id' }) },
        );

        expect(response.status).toBe(200);
        expect(mockEvaluate).toHaveBeenCalledWith([], { k: 3 });
    });

    it('rejects malformed JSON without loading a session', async () => {
        const response = await POST(
            new Request('http://localhost/api/writing-sessions/session/retrieval-evaluation', {
                method: 'POST',
                body: '{"k":',
            }),
            { params: Promise.resolve({ id: 'session-id' }) },
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: 'Invalid JSON body' });
        expect(mockGet).not.toHaveBeenCalled();
    });

    it('preserves service errors without exposing an internal failure', async () => {
        mockGet.mockRejectedValue(new WritingSessionServiceError('not_found', '작성 세션을 찾을 수 없습니다.', 404));

        const response = await POST(
            new Request('http://localhost/api/writing-sessions/session/retrieval-evaluation', {
                method: 'POST',
                body: JSON.stringify({}),
            }),
            { params: Promise.resolve({ id: 'session-id' }) },
        );

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({ error: '작성 세션을 찾을 수 없습니다.' });
    });
});
