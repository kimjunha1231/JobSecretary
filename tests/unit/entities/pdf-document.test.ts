import { renderPdfDocument } from '@/entities/export/api';

describe('PDF document renderer', () => {
    it('returns a PDF buffer for a Korean A4 document payload', async () => {
        const buffer = await renderPdfDocument({
            title: '예시 회사 자기소개서',
            company: '예시 회사',
            role: '프론트엔드 개발자',
            subtitle: '지원 마감 2026-10-01',
            sections: [
                {
                    heading: '지원 동기',
                    body: '사용자가 직접 확인한 근거를 바탕으로 작성한 답변입니다.\n두 번째 문장도 한글로 렌더링됩니다.',
                    charCount: 49,
                },
            ],
        });

        expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
        expect(buffer.length).toBeGreaterThan(10);
        expect(buffer.toString('latin1')).toContain('%%EOF');
    });

    it('renders the compact resume profile layout with activity metadata', async () => {
        const buffer = await renderPdfDocument({
            title: '경력 이력서',
            subtitle: '검수 완료 활동 1개 · 핵심 역할과 성과',
            profileKind: 'resume',
            sections: [
                {
                    heading: '검색 서비스 개선',
                    meta: '예시 회사 · 프론트엔드 개발 · 2025-01 - 2025-03',
                    body: '- 캐시 전략을 바꾸었습니다.\n- 응답 시간을 20% 줄였습니다.',
                    charCount: 36,
                },
            ],
        });

        expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
        expect(buffer.toString('latin1')).toContain('%%EOF');
    });

    it('renders user-entered resume identity and contact links', async () => {
        const buffer = await renderPdfDocument({
            title: '경력 이력서',
            profileKind: 'resume',
            candidateProfile: {
                fullName: '예시 지원자',
                headline: '프론트엔드 개발자',
                summary: '',
                email: 'candidate@example.com',
                phone: '010-0000-0000',
                location: '서울',
                websiteUrl: 'https://portfolio.example.com',
                githubUrl: 'https://github.com/candidate',
                linkedinUrl: '',
                skills: ['TypeScript'],
            },
            sections: [{ heading: '핵심 기술', body: 'TypeScript', charCount: 10 }],
        });

        expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
        expect(buffer.toString('latin1')).toContain('%%EOF');
    });
});
