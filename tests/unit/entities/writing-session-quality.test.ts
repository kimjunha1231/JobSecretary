import { buildWritingQualitySummary, type WritingSessionDetails } from '@/entities/writing-session/api';
import { isUserFactCheckReviewed, markGeneratedDraftCitationsPendingReview } from '@/entities/writing-session/api/writing-session.service';

const evidenceId = '11111111-1111-4111-8111-111111111111';
const draftId = '22222222-2222-4222-8222-222222222222';

describe('writing session quality summary', () => {
    it('reports selection, user edits, and verified fact coverage from existing workflow data', () => {
        const details = {
            evidence: [{}],
            matches: [{ match: { evidenceRecordId: evidenceId, selectionState: 'selected' } }],
            outlines: [{ status: 'selected' }, { status: 'stale' }],
            drafts: [{ id: draftId, status: 'selected', content: '응답 시간을 20% 줄였습니다.', charCount: 18, validationResult: { factReviewVersion: 1 } }],
            revisions: [{ editor: 'ai' }, { editor: 'user' }, { editor: 'user' }],
            factCitations: [{ draftCandidateId: draftId, sentenceIndex: 0, status: 'verified', evidenceRecordIds: [evidenceId] }],
            question: { charLimit: 20 },
        } as unknown as Pick<WritingSessionDetails, 'evidence' | 'matches' | 'outlines' | 'drafts' | 'revisions' | 'factCitations' | 'question'>;

        expect(buildWritingQualitySummary(details)).toEqual(expect.objectContaining({
            evidenceCount: 1,
            selectedEvidenceCount: 1,
            outlineCandidateCount: 1,
            selectedOutline: true,
            draftCandidateCount: 1,
            selectedDraftId: draftId,
            revisionCount: 3,
            userRevisionCount: 2,
            factSentenceCount: 1,
            verifiedFactSentenceCount: 1,
            factCitationCoverage: 1,
            overLimit: false,
        }));
    });

    it('does not count legacy verified-looking citations without an explicit user review marker', () => {
        const details = {
            evidence: [{}],
            matches: [{ match: { evidenceRecordId: evidenceId, selectionState: 'selected' } }],
            outlines: [],
            drafts: [{ id: draftId, status: 'selected', content: '응답 시간을 20% 줄였습니다.', charCount: 18, validationResult: {} }],
            revisions: [],
            factCitations: [{ draftCandidateId: draftId, sentenceIndex: 0, status: 'verified', evidenceRecordIds: [evidenceId] }],
            question: { charLimit: 20 },
        } as unknown as Pick<WritingSessionDetails, 'evidence' | 'matches' | 'outlines' | 'drafts' | 'revisions' | 'factCitations' | 'question'>;

        expect(buildWritingQualitySummary(details)).toEqual(expect.objectContaining({
            factSentenceCount: 1,
            verifiedFactSentenceCount: 0,
            factCitationCoverage: 0,
        }));
    });

    it('keeps generated citations pending until a user explicitly reviews and saves them', () => {
        const pending = markGeneratedDraftCitationsPendingReview({
            citations: [{
                sentenceIndex: 0,
                sentenceText: '검색 성공률을 75% 개선했습니다.',
                factType: 'metric',
                evidenceRecordIds: [evidenceId],
                status: 'verified',
            }],
            unverifiedFactIndexes: [],
            sentences: ['검색 성공률을 75% 개선했습니다.', '팀 의견을 먼저 듣고 정리했습니다.'],
        });

        expect(pending.citations[0]?.status).toBe('unverified');
        expect(pending.unverifiedFactIndexes).toEqual([0]);
        expect(isUserFactCheckReviewed({ factReviewVersion: 0 })).toBe(false);
        expect(isUserFactCheckReviewed({})).toBe(false);
        expect(isUserFactCheckReviewed({ factReviewVersion: 1 })).toBe(true);
        expect(isUserFactCheckReviewed({ factReviewVersion: 1 }, [{ status: 'unverified' }])).toBe(false);
        expect(isUserFactCheckReviewed({ factReviewVersion: 1 }, [{ status: 'verified' }])).toBe(true);
    });
});
