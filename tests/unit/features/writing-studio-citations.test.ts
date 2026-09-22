import { retainUnchangedCitationSelections } from '@/features/writing-studio/lib/retain-unchanged-citation-selections';

describe('retainUnchangedCitationSelections', () => {
    it('drops evidence choices for edited sentences and keeps unchanged sentence choices', () => {
        const selections = {
            0: ['activity-1'],
            1: ['activity-2'],
        };

        expect(retainUnchangedCitationSelections(
            '검색을 개선했습니다. 응답 시간을 20% 줄였습니다.',
            '검색 경험을 개선했습니다. 응답 시간을 20% 줄였습니다.',
            selections,
        )).toEqual({ 1: ['activity-2'] });
    });

    it('drops choices when a new sentence shifts their index', () => {
        expect(retainUnchangedCitationSelections(
            '응답 시간을 20% 줄였습니다.',
            '새로운 결과를 확인했습니다. 응답 시간을 20% 줄였습니다.',
            { 0: ['activity-1'] },
        )).toEqual({});
    });
});
