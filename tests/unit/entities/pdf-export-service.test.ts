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

    it('builds distinct resume and portfolio PDFs from approved activities without exposing internal ids', () => {
        const item = {
            record: {
                id: '11111111-1111-4111-8111-111111111111',
                careerItemId: '22222222-2222-4222-8222-222222222222',
                userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                status: 'approved',
                version: 1,
                situation: '검색 결과가 느렸습니다.',
                problem: '캐시가 제대로 적용되지 않았습니다.',
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
                startedAt: '2025-01',
                endedAt: '2025-03',
                isCurrent: false,
                status: 'approved',
                version: 1,
                summary: '검색 경험을 개선한 프로젝트입니다.',
                contributionNote: '검색 화면과 캐시 정책을 설계했습니다.',
                skills: ['Next.js'],
                competencyTags: [],
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        } as never;
        const portfolio = buildCareerProfilePdfPayload([item], 'portfolio');
        const resume = buildCareerProfilePdfPayload([item], 'resume');

        expect(portfolio.title).toBe('활동 포트폴리오');
        expect(portfolio.profileKind).toBe('portfolio');
        expect(portfolio.sections[0]?.heading).toBe('검색 서비스 개선');
        expect(portfolio.sections[0]?.meta).toBe('예시 회사 · 프론트엔드 개발 · 2025-01 - 2025-03');
        expect(portfolio.sections[0]?.body).toContain('상황: 검색 결과가 느렸습니다.');
        expect(portfolio.sections[0]?.body).toContain('문제: 캐시가 제대로 적용되지 않았습니다.');
        expect(portfolio.sections[0]?.body).toContain('배운 점: 측정부터 시작했습니다.');

        expect(resume.title).toBe('경력 이력서');
        expect(resume.profileKind).toBe('resume');
        expect(resume.subtitle).toContain('핵심 역할과 성과');
        expect(resume.sections[0]?.meta).toBe(portfolio.sections[0]?.meta);
        expect(resume.sections[0]?.body).toContain('- 응답 시간을 20% 줄였습니다.');
        expect(resume.sections[0]?.body).not.toContain('- 성과: 응답 시간 20 %');
        expect(resume.sections[0]?.body).not.toContain('- 성과: 응답 시간 20%');
        expect(resume.sections[0]?.body).toContain('- 기술: Next.js');
        expect(resume.sections[0]?.body).not.toContain('상황:');
        expect(resume.sections[0]?.body).not.toContain('문제:');
        expect(resume.sections[0]?.body).not.toContain('배운 점:');
        expect(JSON.stringify(portfolio)).not.toContain('11111111-1111-4111-8111-111111111111');
        expect(JSON.stringify(portfolio)).not.toContain('22222222-2222-4222-8222-222222222222');
        expect(JSON.stringify(resume)).not.toContain('11111111-1111-4111-8111-111111111111');
        expect(JSON.stringify(resume)).not.toContain('22222222-2222-4222-8222-222222222222');

        const mismatchedMetricResume = buildCareerProfilePdfPayload([{
            record: { status: 'approved', result: '효율은 20배 늘었습니다.', metrics: [{ label: '효율', value: '20', unit: '%' }], skills: [] },
            careerItem: { status: 'approved', title: '검색 개선 프로젝트' },
        } as never], 'resume');
        expect(mismatchedMetricResume.sections[0]?.body).toContain('- 성과: 효율 20%');

        const percentagePointResume = buildCareerProfilePdfPayload([{
            record: { status: 'approved', result: '효율은 20%p 늘었습니다.', metrics: [{ label: '효율', value: '20', unit: '%' }], skills: [] },
            careerItem: { status: 'approved', title: '검색 개선 프로젝트' },
        } as never], 'resume');
        expect(percentagePointResume.sections[0]?.body).toContain('- 효율은 20%p 늘었습니다.');
        expect(percentagePointResume.sections[0]?.body).toContain('- 성과: 효율 20%');

        const compoundUnitResume = buildCareerProfilePdfPayload([{
            record: { status: 'approved', result: '처리량은 20GB/s 입니다.', metrics: [{ label: '처리량', value: '20', unit: 'GB' }], skills: [] },
            careerItem: { status: 'approved', title: '파일 처리 개선' },
        } as never], 'resume');
        expect(compoundUnitResume.sections[0]?.body).toContain('- 처리량은 20GB/s 입니다.');
        expect(compoundUnitResume.sections[0]?.body).toContain('- 성과: 처리량 20 GB');

        const textualPercentagePointResume = buildCareerProfilePdfPayload([{
            record: { status: 'approved', result: '전환율은 20퍼센트포인트 상승했습니다.', metrics: [{ label: '전환율', value: '20', unit: '퍼센트' }], skills: [] },
            careerItem: { status: 'approved', title: '전환율 개선' },
        } as never], 'resume');
        expect(textualPercentagePointResume.sections[0]?.body).toContain('- 전환율은 20퍼센트포인트 상승했습니다.');
        expect(textualPercentagePointResume.sections[0]?.body).toContain('- 성과: 전환율 20 퍼센트');

        const paddedTextualPercentagePointResume = buildCareerProfilePdfPayload([{
            record: { status: 'approved', result: '전환율은 20퍼센트포인트 상승했습니다.', metrics: [{ label: '전환율', value: '20', unit: ' 퍼센트 ' }], skills: [] },
            careerItem: { status: 'approved', title: '전환율 개선' },
        } as never], 'resume');
        expect(paddedTextualPercentagePointResume.sections[0]?.body).toContain('- 성과: 전환율 20 퍼센트');
    });

    it('adds user-provided profile content and contact links without exporting the user id', () => {
        const item = {
            record: { status: 'approved', metrics: [], skills: [] },
            careerItem: { status: 'approved', title: '검수된 프로젝트' },
        } as never;
        const profile = {
            userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            fullName: '예시 지원자',
            headline: '프론트엔드 개발자',
            summary: '사용자 피드백을 기반으로 화면을 개선했습니다.',
            email: 'candidate@example.com',
            phone: '010-0000-0000',
            location: '서울',
            websiteUrl: 'https://portfolio.example.com',
            githubUrl: 'https://github.com/candidate',
            linkedinUrl: '',
            skills: ['TypeScript', 'Next.js'],
            updatedAt: '2026-09-22T00:00:00.000Z',
        };

        const payload = buildCareerProfilePdfPayload([item], 'resume', profile);

        expect(payload.candidateProfile).toMatchObject({
            fullName: '예시 지원자',
            email: 'candidate@example.com',
            websiteUrl: 'https://portfolio.example.com',
        });
        expect(payload.sections.slice(0, 2)).toEqual([
            { heading: '소개', body: '사용자 피드백을 기반으로 화면을 개선했습니다.', charCount: 25 },
            { heading: '핵심 기술', body: 'TypeScript · Next.js', charCount: 20 },
        ]);
        expect(JSON.stringify(payload)).not.toContain('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    });

    it('blocks career PDF export when no activity has been approved', () => {
        expect(() => buildCareerProfilePdfPayload([])).toThrow('승인된 활동 근거를 하나 이상 준비한 뒤 PDF를 만들 수 있습니다.');
    });
});
