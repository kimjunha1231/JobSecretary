import type { EvidenceRecordDetails } from '@/entities/evidence-record';
import { filterCareerActivities } from '@/features/career-search';

function activity(overrides: Partial<Pick<EvidenceRecordDetails['careerItem'], 'kind' | 'title' | 'organization' | 'role' | 'summary' | 'skills'>> & Partial<Pick<EvidenceRecordDetails['record'], 'action' | 'result' | 'skills'>>): EvidenceRecordDetails {
    return {
        careerItem: {
            kind: 'project',
            title: 'JobSecretary',
            organization: '개인 프로젝트',
            role: '프론트엔드 개발자',
            summary: '지원 자료를 정리하는 서비스',
            skills: ['Next.js', 'TypeScript'],
            competencyTags: ['문제 해결'],
            ...overrides,
        },
        record: {
            action: '사용자 선택형 작성 흐름을 구현했습니다.',
            result: '작성 시간을 줄였습니다.',
            learning: '검수 가능한 근거의 중요성을 배웠습니다.',
            skills: ['Supabase'],
            competencyTags: ['협업'],
            metrics: [{ label: '테스트', value: '254', unit: '개' }],
        },
    } as unknown as EvidenceRecordDetails;
}

describe('career activity search', () => {
    const activities = [
        activity({ title: 'JobSecretary', organization: '개인 프로젝트' }),
        activity({ kind: 'education', title: '웹 접근성 교육', organization: '온라인 강의', skills: ['웹 접근성'] }),
    ];

    it('searches across activity metadata, skills, actions, and metrics', () => {
        expect(filterCareerActivities(activities, { query: 'typescript' })).toHaveLength(1);
        expect(filterCareerActivities(activities, { query: '254개' })).toHaveLength(2);
        expect(filterCareerActivities(activities, { query: '접근성' })).toHaveLength(1);
    });

    it('normalizes Korean casing and whitespace while filtering by kind', () => {
        expect(filterCareerActivities(activities, { query: '  JOBSECRETARY ', kind: 'project' })).toHaveLength(1);
        expect(filterCareerActivities(activities, { query: 'jobsecretary', kind: 'education' })).toHaveLength(0);
    });

    it('returns all activities for an empty or invalid filter', () => {
        expect(filterCareerActivities(activities)).toEqual(activities);
        expect(filterCareerActivities(activities, { query: '   ', kind: 'not-a-kind' })).toEqual(activities);
    });
});
