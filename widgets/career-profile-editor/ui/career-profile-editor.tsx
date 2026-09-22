'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import type { CareerProfile, CareerProfileFields } from '@/entities/career-profile';

const EMPTY_PROFILE: CareerProfileFields = {
    fullName: '',
    headline: '',
    summary: '',
    email: '',
    phone: '',
    location: '',
    websiteUrl: '',
    githubUrl: '',
    linkedinUrl: '',
    skills: [],
};

const inputClassName = 'mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60';
const labelClassName = 'block text-sm font-medium text-zinc-300';

export function CareerProfileEditor() {
    const [profile, setProfile] = useState<CareerProfileFields>(EMPTY_PROFILE);
    const [skillsText, setSkillsText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        let isCurrent = true;

        void fetch('/api/career-profiles/me', { cache: 'no-store' })
            .then(async response => {
                const result = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '프로필을 불러오지 못했습니다.');
                const next = (result.profile ?? EMPTY_PROFILE) as CareerProfile;
                if (isCurrent) {
                    const { userId: _userId, updatedAt: _updatedAt, ...fields } = next as CareerProfile;
                    setProfile({ ...EMPTY_PROFILE, ...fields });
                    setSkillsText(fields.skills.join(', '));
                }
            })
            .catch(loadError => {
                if (isCurrent) setError(loadError instanceof Error ? loadError.message : '프로필을 불러오지 못했습니다.');
            })
            .finally(() => {
                if (isCurrent) setIsLoading(false);
            });

        return () => { isCurrent = false; };
    }, []);

    const updateField = (key: keyof Omit<CareerProfileFields, 'skills'>, value: string) => {
        setProfile(current => ({ ...current, [key]: value }));
        setNotice(null);
    };

    const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setNotice(null);
        setIsSaving(true);

        const payload: CareerProfileFields = {
            ...profile,
            skills: [...new Set(skillsText.split(/[\n,]/).map(skill => skill.trim()).filter(Boolean))],
        };

        try {
            const response = await fetch('/api/career-profiles/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '프로필을 저장하지 못했습니다.');
            const saved = (result.profile ?? payload) as CareerProfile;
            const { userId: _userId, updatedAt: _updatedAt, ...fields } = saved as CareerProfile;
            setProfile({ ...EMPTY_PROFILE, ...fields });
            setSkillsText(fields.skills.join(', '));
            setNotice('이력서 프로필을 저장했습니다.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : '프로필을 저장하지 못했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="mt-6 rounded-2xl border border-white/10 bg-surface/40 p-5 md:p-6" aria-labelledby="career-profile-title">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Resume identity</p>
                    <h2 id="career-profile-title" className="mt-1 text-xl font-bold text-white">이력서 기본 정보</h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">이름·소개·연락처·기술을 직접 정리해 활동 PDF에 함께 넣을 수 있습니다.</p>
                </div>
                <p className="max-w-md text-xs leading-5 text-zinc-500">저장한 연락처는 PDF 출력에만 사용되며, 자기소개서 생성 AI 요청에는 포함되지 않습니다.</p>
            </div>

            {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2.5 text-sm leading-5 text-red-200">{error}</p>}

            <form className="space-y-5" onSubmit={saveProfile}>
                <fieldset disabled={isLoading || isSaving} className="space-y-5 disabled:opacity-80">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className={labelClassName} htmlFor="career-profile-full-name">
                            이름
                            <input id="career-profile-full-name" className={inputClassName} value={profile.fullName} maxLength={120} autoComplete="name" onChange={event => updateField('fullName', event.target.value)} placeholder="PDF에 표시할 이름" />
                        </label>
                        <label className={labelClassName} htmlFor="career-profile-headline">
                            희망 직무·한 줄 소개
                            <input id="career-profile-headline" className={inputClassName} value={profile.headline} maxLength={160} onChange={event => updateField('headline', event.target.value)} placeholder="예: 사용자 문제를 끝까지 해결하는 프론트엔드 개발자" />
                        </label>
                    </div>

                    <label className={labelClassName} htmlFor="career-profile-summary">
                        간단 소개
                        <textarea id="career-profile-summary" className={`${inputClassName} min-h-24 resize-y`} value={profile.summary} maxLength={2_000} onChange={event => updateField('summary', event.target.value)} placeholder="어떤 문제를 잘 해결하고 어떤 방식으로 일하는지 적어 주세요." />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <label className={labelClassName} htmlFor="career-profile-email">
                            이메일
                            <input id="career-profile-email" className={inputClassName} type="email" value={profile.email} maxLength={254} autoComplete="email" onChange={event => updateField('email', event.target.value)} placeholder="name@example.com" />
                        </label>
                        <label className={labelClassName} htmlFor="career-profile-phone">
                            전화번호
                            <input id="career-profile-phone" className={inputClassName} type="tel" value={profile.phone} maxLength={60} autoComplete="tel" onChange={event => updateField('phone', event.target.value)} placeholder="선택 입력" />
                        </label>
                        <label className={labelClassName} htmlFor="career-profile-location">
                            지역
                            <input id="career-profile-location" className={inputClassName} value={profile.location} maxLength={120} autoComplete="address-level2" onChange={event => updateField('location', event.target.value)} placeholder="예: 서울" />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <label className={labelClassName} htmlFor="career-profile-website">
                            포트폴리오 링크
                            <input id="career-profile-website" className={inputClassName} type="url" value={profile.websiteUrl} maxLength={300} onChange={event => updateField('websiteUrl', event.target.value)} placeholder="https://" />
                        </label>
                        <label className={labelClassName} htmlFor="career-profile-github">
                            GitHub 링크
                            <input id="career-profile-github" className={inputClassName} type="url" value={profile.githubUrl} maxLength={300} onChange={event => updateField('githubUrl', event.target.value)} placeholder="https://github.com/" />
                        </label>
                        <label className={labelClassName} htmlFor="career-profile-linkedin">
                            LinkedIn 링크
                            <input id="career-profile-linkedin" className={inputClassName} type="url" value={profile.linkedinUrl} maxLength={300} onChange={event => updateField('linkedinUrl', event.target.value)} placeholder="https://www.linkedin.com/" />
                        </label>
                    </div>

                    <label className={labelClassName} htmlFor="career-profile-skills">
                        핵심 기술
                        <textarea id="career-profile-skills" className={`${inputClassName} min-h-20 resize-y`} value={skillsText} maxLength={2_000} onChange={event => { setSkillsText(event.target.value); setNotice(null); }} placeholder="쉼표 또는 줄바꿈으로 구분해 입력해 주세요. 예: TypeScript, Next.js, Supabase" />
                    </label>
                </fieldset>

                <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p aria-live="polite" className={`text-sm ${notice ? 'text-emerald-300' : 'text-zinc-500'}`}>{isLoading ? '저장한 프로필을 불러오는 중입니다.' : notice ?? '비워 둔 항목은 PDF에 표시하지 않습니다.'}</p>
                    <button type="submit" disabled={isLoading || isSaving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50">
                        <Save size={16} aria-hidden="true" />
                        {isSaving ? '저장 중…' : '프로필 저장'}
                    </button>
                </div>
            </form>
        </section>
    );
}
