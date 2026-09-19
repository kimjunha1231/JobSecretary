import { buildWritingQualitySummary, type WritingSessionDetails } from '@/entities/writing-session/api';

const evidenceId = '11111111-1111-4111-8111-111111111111';
const draftId = '22222222-2222-4222-8222-222222222222';

describe('writing session quality summary', () => {
    it('reports selection, user edits, and verified fact coverage from existing workflow data', () => {
        const details = {
            evidence: [{}],
            matches: [{ match: { evidenceRecordId: evidenceId, selectionState: 'selected' } }],
            outlines: [{ status: 'selected' }, { status: 'stale' }],
            drafts: [{ id: draftId, status: 'selected', content: '응답 시간을 20% 줄였습니다.', charCount: 18 }],
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
});
