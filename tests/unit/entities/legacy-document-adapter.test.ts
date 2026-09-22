import { parseLegacyDocument } from '@/entities/cover-letter';

describe('parseLegacyDocument', () => {
    it('splits the existing Markdown section format and preserves character limits', () => {
        const result = parseLegacyDocument({
            id: 'legacy-1',
            title: '회사 - 개발자',
            company: '회사',
            role: '개발자',
            status: 'writing',
            content: '### 문제 해결 경험 (500자)\n로그를 분석해 원인을 찾았습니다.\n\n### 협업 경험\n팀과 합의해 배포했습니다.',
        });

        expect(result.parseStatus).toBe('parsed');
        expect(result.questions).toEqual([
            { question: '문제 해결 경험', answer: '로그를 분석해 원인을 찾았습니다.', charLimit: 500, position: 0 },
            { question: '협업 경험', answer: '팀과 합의해 배포했습니다.', position: 1 },
        ]);
    });

    it('keeps an unstructured body and marks it for review instead of dropping it', () => {
        const result = parseLegacyDocument({
            id: 'legacy-2',
            company: '회사',
            role: '개발자',
            content: '제목 없는 자기소개서 본문',
        });

        expect(result.parseStatus).toBe('needs_review');
        expect(result.questions).toHaveLength(1);
        expect(result.questions[0]?.answer).toBe('제목 없는 자기소개서 본문');
        expect(result.warnings).toHaveLength(1);
    });

    it('marks empty sections for review while retaining their position', () => {
        const result = parseLegacyDocument({
            id: 'legacy-3',
            company: '회사',
            role: '개발자',
            content: '### 첫 문항 (300자)\n\n### 두 번째 문항\n답변',
        });

        expect(result.parseStatus).toBe('needs_review');
        expect(result.questions.map(question => question.position)).toEqual([0, 1]);
        expect(result.warnings[0]).toContain('1번 문항');
    });
});
