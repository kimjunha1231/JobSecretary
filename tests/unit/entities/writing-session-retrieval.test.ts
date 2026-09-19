import { scoreEvidence, tokenize } from '@/entities/writing-session/api';
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
});
