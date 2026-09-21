/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/writing-sessions/retrieval-evaluation/route';
import {
    buildEvidenceRetrievalCases,
    evaluateEvidenceRetrieval,
    WritingSessionServiceError,
    writingSessionService,
} from '@/entities/writing-session/api';

jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));
jest.mock('@/entities/writing-session/api', () => {
    const actual = jest.requireActual('@/entities/writing-session/api');
    return {
        ...actual,
        writingSessionService: { list: jest.fn(), get: jest.fn() },
        buildEvidenceRetrievalCases: jest.fn(),
        evaluateEvidenceRetrieval: jest.fn(),
    };
});

const mockList = writingSessionService.list as jest.Mock;
const mockGet = writingSessionService.get as jest.Mock;
const mockBuildCases = buildEvidenceRetrievalCases as jest.Mock;
const mockEvaluate = evaluateEvidenceRetrieval as jest.Mock;

describe('aggregate writing-session retrieval evaluation route', () => {
    beforeEach(() => jest.clearAllMocks());

    it('aggregates recent owned session snapshots without returning content', async () => {
        mockList.mockResolvedValue([{ id: 'session-a' }, { id: 'session-b' }]);
        mockGet.mockResolvedValueOnce({ id: 'details-a' }).mockResolvedValueOnce({ id: 'details-b' });
        mockBuildCases
            .mockReturnValueOnce([{ relevantEvidenceIds: ['evidence-a'] }])
            .mockReturnValueOnce([{ relevantEvidenceIds: [] }]);
        mockEvaluate.mockReturnValue({
            k: 3,
            caseCount: 2,
            evaluatedCaseCount: 1,
            emptyRelevantLabelCount: 1,
            recallAtK: 1,
            ndcgAtK: 1,
            mrrAtK: 1,
        });

        const response = await GET(new NextRequest('http://localhost/api/writing-sessions/retrieval-evaluation?limit=2&k=3'));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            k: 3,
            caseCount: 2,
            evaluatedCaseCount: 1,
            emptyRelevantLabelCount: 1,
            recallAtK: 1,
            ndcgAtK: 1,
            mrrAtK: 1,
            sessionCount: 2,
            evaluatedSessionCount: 1,
        });
        expect(mockList).toHaveBeenCalledWith({ limit: 2 });
        expect(mockGet).toHaveBeenNthCalledWith(1, 'session-a');
        expect(mockGet).toHaveBeenNthCalledWith(2, 'session-b');
        expect(mockEvaluate).toHaveBeenCalledWith([{ relevantEvidenceIds: ['evidence-a'] }, { relevantEvidenceIds: [] }], { k: 3 });
    });

    it('uses bounded defaults and rejects invalid query values', async () => {
        mockList.mockResolvedValue([]);
        mockEvaluate.mockReturnValue({
            k: 3,
            caseCount: 0,
            evaluatedCaseCount: 0,
            emptyRelevantLabelCount: 0,
            recallAtK: 0,
            ndcgAtK: 0,
            mrrAtK: 0,
        });

        const response = await GET(new NextRequest('http://localhost/api/writing-sessions/retrieval-evaluation'));
        expect(response.status).toBe(200);
        expect(mockList).toHaveBeenCalledWith({ limit: 5 });
        expect(mockEvaluate).toHaveBeenCalledWith([], { k: 3 });

        const invalidResponse = await GET(new NextRequest('http://localhost/api/writing-sessions/retrieval-evaluation?limit=21'));
        expect(invalidResponse.status).toBe(400);
        expect(mockList).toHaveBeenCalledTimes(1);
    });

    it('preserves authenticated service errors', async () => {
        mockList.mockRejectedValue(new WritingSessionServiceError('unauthorized', 'Unauthorized', 401));

        const response = await GET(new NextRequest('http://localhost/api/writing-sessions/retrieval-evaluation'));
        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    });
});
