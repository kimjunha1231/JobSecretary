import {
    createCareerProfileWritingContext,
    readCareerProfileWritingContext,
} from '@/entities/writing-session/api';
import type { CareerProfile } from '@/entities/career-profile/model';
import { buildWritingContext } from '@/features/writing-studio/api/generate-writing-candidates';
import type { WritingSessionDetails } from '@/entities/writing-session/api';

const profile: CareerProfile = {
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    fullName: '예시 지원자',
    headline: '사용자 문제를 해결하는 프론트엔드 개발자',
    summary: '사용자 피드백과 제품 지표를 함께 보고 제품 경험을 개선합니다.',
    email: 'private@example.com',
    phone: '010-0000-0000',
    location: '서울',
    websiteUrl: 'https://portfolio.example.com',
    githubUrl: 'https://github.com/example',
    linkedinUrl: 'https://linkedin.com/in/example',
    skills: ['TypeScript', 'Next.js', 'TypeScript'],
    updatedAt: '2026-09-22T00:00:00.000Z',
};

describe('writing session career profile context', () => {
    it('keeps only the user-approved headline, summary, and de-duplicated skills', () => {
        expect(createCareerProfileWritingContext(profile)).toEqual({
            headline: profile.headline,
            summary: profile.summary,
            skills: ['TypeScript', 'Next.js'],
        });
        expect(createCareerProfileWritingContext(null)).toBeUndefined();
    });

    it('reads a valid saved snapshot but ignores empty or PII-containing snapshots', () => {
        expect(readCareerProfileWritingContext({})).toBeUndefined();
        expect(readCareerProfileWritingContext({
            careerProfileContext: { headline: '', summary: '', skills: [] },
        })).toBeUndefined();
        expect(readCareerProfileWritingContext({
            careerProfileContext: { headline: '개발자', summary: '', skills: ['Next.js'] },
        })).toEqual({ headline: '개발자', summary: '', skills: ['Next.js'] });
        expect(readCareerProfileWritingContext({
            careerProfileContext: { headline: '개발자', summary: '', skills: ['Next.js'], email: profile.email },
        })).toBeUndefined();
    });

    it('serializes only the allowlisted profile fields into the generation prompt', () => {
        const details = {
            target: { company: '지원 회사', role: '프론트엔드 개발자' },
            question: { question: '지원 직무를 위해 준비한 내용을 적어 주세요.', charLimit: 700 },
            requirements: [],
            matches: [],
            styleExamples: [],
            careerProfileContext: {
                headline: profile.headline,
                summary: profile.summary,
                skills: ['TypeScript', 'Next.js'],
                email: profile.email,
                phone: profile.phone,
                websiteUrl: profile.websiteUrl,
            },
        } as unknown as WritingSessionDetails;

        const prompt = buildWritingContext(details);
        const serialized = prompt.match(/<writing_context_json>([\s\S]*)<\/writing_context_json>/)?.[1];

        expect(serialized).toBeTruthy();
        const context = JSON.parse(serialized!);
        expect(context.candidateProfileContext).toEqual({
            headline: profile.headline,
            summary: profile.summary,
            skills: ['TypeScript', 'Next.js'],
        });
        expect(prompt).not.toContain(profile.fullName);
        expect(prompt).not.toContain(profile.email);
        expect(prompt).not.toContain(profile.phone);
        expect(prompt).not.toContain(profile.location);
        expect(prompt).not.toContain(profile.websiteUrl);
        expect(prompt).not.toContain(profile.githubUrl);
        expect(prompt).not.toContain(profile.linkedinUrl);
    });
});
