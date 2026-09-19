import { buildCareerProfilePdfPayload, buildCoverLetterPdfPayload, buildLegacyDocumentPdfPayload, PdfExportServiceError } from '@/entities/export/api';

describe('PDF export payload boundary', () => {
    it('requires every writing question to be finalized', () => {
        const details = {
            target: { company: '예시 회사', role: '프론트엔드 개발자', deadline: undefined },
            questions: [
                { id: '11111111-1111-4111-8111-111111111111', position: 0, question: '지원 동기', status: 'finalized', finalAnswer: '첫 답변' },
                { id: '22222222-2222-4222-8222-222222222222', position: 1, question: '협업 경험', status: 'writing' },
            ],
        } as never;

        expect(() => buildCoverLetterPdfPayload(details)).toThrow(PdfExportServiceError);
        expect(() => buildCoverLetterPdfPayload(details)).toThrow('모든 자기소개서 문항을 최종 확정한 뒤 PDF를 만들 수 있습니다.');
    });

    it('orders finalized questions and excludes internal metadata', () => {
        const details = {
            target: { company: '예시 회사', role: '프론트엔드 개발자', deadline: '2026-10-01' },
            questions: [
                { id: '22222222-2222-4222-8222-222222222222', position: 1, question: '두 번째', status: 'finalized', finalAnswer: '두 번째 답변' },
                { id: '11111111-1111-4111-8111-111111111111', position: 0, question: '첫 번째', status: 'finalized', finalAnswer: '첫 번째 답변' },
            ],
        } as never;

        expect(buildCoverLetterPdfPayload(details)).toEqual({
            title: '예시 회사 자기소개서',
            company: '예시 회사',
            role: '프론트엔드 개발자',
            subtitle: '지원 마감 2026-10-01',
            sections: [
                { heading: '첫 번째', body: '첫 번째 답변', charCount: 7 },
                { heading: '두 번째', body: '두 번째 답변', charCount: 7 },
            ],
        });
    });

    it('converts legacy markdown sections without leaking document ids', () => {
        const payload = buildLegacyDocumentPdfPayload({
            id: '33333333-3333-4333-8333-333333333333',
            user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            title: '지원서',
            company: '예시 회사',
            role: '개발자',
            content: '### 문제 해결 (10자)\n문제를 해결했습니다.\n\n### 협업\n함께 만들었습니다.',
            status: 'writing',
            tags: [],
            createdAt: '2026-01-01T00:00:00.000Z',
        });

        expect(payload.sections).toEqual([
            { heading: '문제 해결', body: '문제를 해결했습니다.', charCount: 11 },
            { heading: '협업', body: '함께 만들었습니다.', charCount: 10 },
        ]);
        expect(JSON.stringify(payload)).not.toContain('33333333-3333-4333-8333-333333333333');
    });

    it('builds a career PDF from approved activities without exposing internal ids', () => {
        const payload = buildCareerProfilePdfPayload([{
            record: {
                id: '11111111-1111-4111-8111-111111111111',
                careerItemId: '22222222-2222-4222-8222-222222222222',
                userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                status: 'approved',
                version: 1,
                action: '캐시 전략을 바꾸었습니다.',
                result: '응답 시간을 20% 줄였습니다.',
                learning: '측정부터 시작했습니다.',
                metrics: [{ label: '응답 시간', value: '20', unit: '%' }],
                skills: ['Next.js'],
                competencyTags: [],
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
            careerItem: {
                id: '22222222-2222-4222-8222-222222222222',
                userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                kind: 'project',
                title: '검색 서비스 개선',
                organization: '예시 회사',
                role: '프론트엔드 개발',
                isCurrent: false,
                status: 'approved',
                version: 1,
                skills: ['Next.js'],
                competencyTags: [],
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        } as never], 'portfolio');

        expect(payload.title).toBe('활동 포트폴리오');
        expect(payload.sections[0]?.heading).toBe('검색 서비스 개선');
        expect(payload.sections[0]?.body).toContain('응답 시간을 20% 줄였습니다.');
        expect(JSON.stringify(payload)).not.toContain('11111111-1111-4111-8111-111111111111');
        expect(JSON.stringify(payload)).not.toContain('22222222-2222-4222-8222-222222222222');
    });

    it('blocks career PDF export when no activity has been approved', () => {
        expect(() => buildCareerProfilePdfPayload([])).toThrow('승인된 활동 근거를 하나 이상 준비한 뒤 PDF를 만들 수 있습니다.');
    });
});
