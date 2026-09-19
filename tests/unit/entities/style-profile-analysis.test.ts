import { analyzeStyleExamples } from '@/entities/style-profile/api';

describe('style profile analysis', () => {
    it('derives sentence length, endings, and connectors from approved examples only', () => {
        const result = analyzeStyleExamples([
            { approved: true, content: '먼저 문제를 나누었습니다. 이후 원인을 확인했습니다.' },
            { approved: true, content: '그래서 팀과 해결책을 만들었습니다.' },
            { approved: false, content: '하지 않은 표현입니다. 따라서 분석에서 빠져야 합니다.' },
        ]);

        expect(result.analyzedExampleCount).toBe(2);
        expect(result.sentenceCount).toBe(3);
        expect(result.sentenceLength.min).toBeGreaterThan(0);
        expect(result.sentenceLength.max).toBeGreaterThanOrEqual(result.sentenceLength.min ?? 0);
        expect(result.endingStyle).toEqual(expect.arrayContaining(['습니다']));
        expect(result.preferredConnectors).toEqual(expect.arrayContaining(['먼저', '이후', '그래서']));
        expect(result.confidence).toBeGreaterThan(0);
        expect(JSON.stringify(result)).not.toContain('문제를 나누었습니다');
    });

    it('returns an explicit low-confidence empty analysis without inventing defaults', () => {
        expect(analyzeStyleExamples([])).toEqual({
            analyzedExampleCount: 0,
            sentenceCount: 0,
            sentenceLength: {},
            endingStyle: [],
            preferredConnectors: [],
            confidence: 0,
        });
    });
});
