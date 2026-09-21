import { z } from 'zod';
import type { EvidenceRecordDetails } from '@/entities/evidence-record/api';
import type { JobRequirement } from '@/entities/job-target/model';
import type { WritingSessionDetails } from './writing-session.service';
import { rankEvidence } from './writing-session.service';

const retrievalEvaluationOptionsSchema = z.object({
    k: z.number().int().min(1).max(100).default(3),
});

export const RetrievalEvaluationSummarySchema = z.object({
    k: z.number().int().min(1).max(100),
    caseCount: z.number().int().min(0),
    evaluatedCaseCount: z.number().int().min(0),
    emptyRelevantLabelCount: z.number().int().min(0),
    recallAtK: z.number().min(0).max(1),
    ndcgAtK: z.number().min(0).max(1),
    mrrAtK: z.number().min(0).max(1),
});
export type RetrievalEvaluationSummary = z.infer<typeof RetrievalEvaluationSummarySchema>;

export const RetrievalEvaluationAggregateSummarySchema = RetrievalEvaluationSummarySchema.extend({
    sessionCount: z.number().int().min(0),
    evaluatedSessionCount: z.number().int().min(0),
});
export type RetrievalEvaluationAggregateSummary = z.infer<typeof RetrievalEvaluationAggregateSummarySchema>;

export type RetrievalEvaluationCase = {
    requirement: JobRequirement;
    evidence: EvidenceRecordDetails[];
    relevantEvidenceIds: string[];
};

/**
 * Builds evaluation labels from the evidence a user selected or locked in the
 * current writing session. Rejected and merely suggested matches are not
 * treated as relevant labels, and stale IDs are ignored when an approved
 * activity is no longer available in the session snapshot.
 */
export function buildEvidenceRetrievalCases(
    details: Pick<WritingSessionDetails, 'requirements' | 'evidence' | 'matches'>,
): RetrievalEvaluationCase[] {
    const approvedEvidenceIds = new Set(details.evidence.map(item => item.record.id));
    const relevantByRequirement = new Map<string, Set<string>>();

    for (const item of details.matches) {
        const requirementId = item.match.jobRequirementId;
        const evidenceId = item.match.evidenceRecordId;
        if (!requirementId || !approvedEvidenceIds.has(evidenceId)) continue;
        if (!['selected', 'locked'].includes(item.match.selectionState)) continue;
        const relevant = relevantByRequirement.get(requirementId) ?? new Set<string>();
        relevant.add(evidenceId);
        relevantByRequirement.set(requirementId, relevant);
    }

    return details.requirements.map(requirement => ({
        requirement,
        evidence: details.evidence,
        relevantEvidenceIds: [...(relevantByRequirement.get(requirement.id) ?? new Set<string>())],
    }));
}

function roundMetric(value: number): number {
    return Math.round(value * 10_000) / 10_000;
}

function discountedGain(ranks: number[]): number {
    return ranks.reduce((total, rank) => total + (1 / Math.log2(rank + 1)), 0);
}

export function evaluateEvidenceRetrieval(
    cases: readonly RetrievalEvaluationCase[],
    options: { k?: number } = {},
): RetrievalEvaluationSummary {
    const parsedOptions = retrievalEvaluationOptionsSchema.safeParse(options);
    if (!parsedOptions.success) throw new Error('검색 평가의 k는 1에서 100 사이의 정수여야 합니다.');
    const k = parsedOptions.data.k;
    const evaluated = cases.map(item => {
        const relevantIds = new Set(item.relevantEvidenceIds);
        if (relevantIds.size === 0) return undefined;

        const ranked = rankEvidence(item.requirement, item.evidence, item.evidence.length);
        const relevantRanks = ranked
            .slice(0, k)
            .map((entry, index) => relevantIds.has(entry.evidence.record.id) ? index + 1 : 0)
            .filter((rank): rank is number => rank > 0);
        const recallAtK = relevantRanks.length / relevantIds.size;
        const idealRankCount = Math.min(k, relevantIds.size);
        const idealDcg = discountedGain(Array.from({ length: idealRankCount }, (_, index) => index + 1));
        const ndcgAtK = idealDcg === 0 ? 0 : discountedGain(relevantRanks) / idealDcg;
        const mrrAtK = relevantRanks.length > 0 ? 1 / relevantRanks[0] : 0;
        return { recallAtK, ndcgAtK, mrrAtK };
    }).filter((item): item is { recallAtK: number; ndcgAtK: number; mrrAtK: number } => Boolean(item));

    const average = (selector: (item: (typeof evaluated)[number]) => number) => evaluated.length === 0
        ? 0
        : evaluated.reduce((total, item) => total + selector(item), 0) / evaluated.length;

    return RetrievalEvaluationSummarySchema.parse({
        k,
        caseCount: cases.length,
        evaluatedCaseCount: evaluated.length,
        emptyRelevantLabelCount: cases.length - evaluated.length,
        recallAtK: roundMetric(average(item => item.recallAtK)),
        ndcgAtK: roundMetric(average(item => item.ndcgAtK)),
        mrrAtK: roundMetric(average(item => item.mrrAtK)),
    });
}
