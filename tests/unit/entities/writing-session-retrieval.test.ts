import { buildEvidenceRetrievalCases, evaluateEvidenceRetrieval, rankEvidence, scoreEvidence, tokenize } from '@/entities/writing-session/api';
import type { EvidenceRecordDetails } from '@/entities/evidence-record/api';
import type { JobRequirement } from '@/entities/job-target/model';

const timestamp = '2026-09-19T00:00:00.000Z';

function makeEvidence(overrides: Partial<Pick<EvidenceRecordDetails['careerItem'], 'title' | 'organization' | 'role' | 'summary' | 'skills' | 'competencyTags'>> = {}): EvidenceRecordDetails {
    return {
        careerItem: {
            id: '11111111-1111-4111-8111-111111111111',
            userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            kind: 'project',
            title: overrides.title ?? '검색개선 프로젝트',
            organization: overrides.organization,
            role: overrides.role,
            summary: overrides.summary ?? '검색 흐름을 개선했습니다.',
            skills: overrides.skills ?? ['React'],
            competencyTags: overrides.competencyTags ?? ['문제 해결'],
            isCurrent: false,
            status: 'approved',
            version: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
        record: {
            id: '22222222-2222-4222-8222-222222222222',
            careerItemId: '11111111-1111-4111-8111-111111111111',
            userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            revisionNumber: 1,
            action: '검색 상태를 정리했습니다.',
            result: '응답 시간을 줄였습니다.',
            metrics: [],
            skills: ['React'],
            competencyTags: ['문제 해결'],
            status: 'approved',
            version: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
    };
}

function makeRequirement(text: string): JobRequirement {
    return {
        id: '33333333-3333-4333-8333-333333333333',
        jobTargetId: '44444444-4444-4444-8444-444444444444',
        userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        category: 'required',
        text,
        priority: 80,
        status: 'approved',
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

function withIds(evidence: EvidenceRecordDetails, recordId: string, careerItemId: string): EvidenceRecordDetails {
    return {
        careerItem: { ...evidence.careerItem, id: careerItemId },
        record: { ...evidence.record, id: recordId, careerItemId },
    };
}

describe('writing evidence retrieval baseline', () => {
    it('keeps Korean compound words searchable with spaced requirements', () => {
        const tokens = tokenize('검색개선 프로젝트');
        expect([...tokens]).toEqual(expect.arrayContaining(['검색개선', '검색', '개선']));
        expect(scoreEvidence(makeRequirement('검색 개선'), makeEvidence())).toBeGreaterThan(0.7);
    });

    it('weights title, role, and skill matches above incidental narrative words', () => {
        const titleMatch = scoreEvidence(makeRequirement('TypeScript'), makeEvidence({ title: 'TypeScript 검색 프로젝트', skills: ['TypeScript'] }));
        const narrativeOnly = scoreEvidence(makeRequirement('TypeScript'), makeEvidence({ title: '검색 프로젝트', skills: [], competencyTags: [], summary: 'TypeScript라는 단어를 회고에서 한 번 언급했습니다.' }));

        expect(titleMatch).toBeGreaterThan(narrativeOnly);
        expect(titleMatch).toBeGreaterThan(0.8);
    });

    it('keeps a non-zero reviewable floor for unrelated approved activities', () => {
        const score = scoreEvidence(makeRequirement('데이터베이스 운영'), makeEvidence({ title: '브랜드 캠페인', summary: '콘텐츠를 기획했습니다.', skills: [], competencyTags: [] }));

        expect(score).toBeGreaterThanOrEqual(0.1);
        expect(score).toBeLessThan(0.3);
    });

    it('uses deterministic ranking and reports Recall@k, nDCG@k, and MRR@k', () => {
        const relevant = withIds(makeEvidence({ title: 'TypeScript 검색 플랫폼', skills: ['TypeScript'] }), '44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555');
        const distractor = withIds(makeEvidence({ title: '브랜드 캠페인', summary: 'TypeScript라는 단어를 회고에서 한 번 언급했습니다.', skills: [], competencyTags: [] }), '66666666-6666-4666-8666-666666666666', '77777777-7777-4777-8777-777777777777');
        const requirement = makeRequirement('TypeScript');

        expect(rankEvidence(requirement, [distractor, relevant], 2).map(item => item.evidence.record.id)).toEqual([relevant.record.id, distractor.record.id]);
        expect(evaluateEvidenceRetrieval([{ requirement, evidence: [distractor, relevant], relevantEvidenceIds: [relevant.record.id] }], { k: 1 })).toMatchObject({
            caseCount: 1,
            evaluatedCaseCount: 1,
            recallAtK: 1,
            ndcgAtK: 1,
            mrrAtK: 1,
        });
    });

    it('exposes a measurable miss when the relevant activity is outside the top k', () => {
        const relevant = withIds(makeEvidence({ title: '브랜드 캠페인', summary: '운영 경험을 정리했습니다.', skills: [] }), '88888888-8888-4888-8888-888888888888', '99999999-9999-4999-8999-999999999999');
        const distractor = withIds(makeEvidence({ title: '운영 플랫폼', skills: ['운영'] }), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
        const result = evaluateEvidenceRetrieval([{ requirement: makeRequirement('운영'), evidence: [relevant, distractor], relevantEvidenceIds: [relevant.record.id] }], { k: 1 });

        expect(result.recallAtK).toBe(0);
        expect(result.ndcgAtK).toBe(0);
        expect(result.mrrAtK).toBe(0);
    });

    it('does not hide empty relevance labels and rejects an invalid k', () => {
        const result = evaluateEvidenceRetrieval([{ requirement: makeRequirement('검색'), evidence: [makeEvidence()], relevantEvidenceIds: [] }]);

        expect(result).toMatchObject({ caseCount: 1, evaluatedCaseCount: 0, emptyRelevantLabelCount: 1, recallAtK: 0, ndcgAtK: 0, mrrAtK: 0 });
        expect(() => evaluateEvidenceRetrieval([], { k: 0 })).toThrow('검색 평가의 k는 1에서 100 사이의 정수여야 합니다.');
    });

    it('builds labels from selected or locked session matches and ignores stale IDs', () => {
        const evidence = withIds(makeEvidence(), 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
        const requirement = makeRequirement('검색');
        const cases = buildEvidenceRetrievalCases({
            requirements: [requirement],
            evidence: [evidence],
            matches: [
                { match: { jobRequirementId: requirement.id, evidenceRecordId: evidence.record.id, selectionState: 'selected' } },
                { match: { jobRequirementId: requirement.id, evidenceRecordId: evidence.record.id, selectionState: 'locked' } },
                { match: { jobRequirementId: requirement.id, evidenceRecordId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', selectionState: 'selected' } },
                { match: { jobRequirementId: requirement.id, evidenceRecordId: evidence.record.id, selectionState: 'rejected' } },
            ],
        } as never);

        expect(cases).toHaveLength(1);
        expect(cases[0].relevantEvidenceIds).toEqual([evidence.record.id]);
    });

    it('prefers explicit user-authored labels and preserves an explicit empty label', () => {
        const selectedEvidence = withIds(makeEvidence({ title: '선택된 활동' }), 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
        const otherEvidence = withIds(makeEvidence({ title: '정답으로 표시한 활동' }), 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'ffffffff-ffff-4fff-8fff-ffffffffffff');
        const requirement = makeRequirement('검색');
        const details = {
            requirements: [requirement],
            evidence: [selectedEvidence, otherEvidence],
            matches: [{ match: { jobRequirementId: requirement.id, evidenceRecordId: selectedEvidence.record.id, selectionState: 'selected' } }],
        } as never;

        expect(buildEvidenceRetrievalCases(details, [{ requirementId: requirement.id, evidenceRecordIds: [otherEvidence.record.id] }])[0].relevantEvidenceIds)
            .toEqual([otherEvidence.record.id]);
        expect(buildEvidenceRetrievalCases(details, [{ requirementId: requirement.id, evidenceRecordIds: [] }])[0].relevantEvidenceIds)
            .toEqual([]);
    });
});
