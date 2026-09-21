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
});
