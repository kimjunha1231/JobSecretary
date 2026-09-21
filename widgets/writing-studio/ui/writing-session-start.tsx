'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, PenLine, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { JobTarget } from '@/entities/job-target';
import { trackProductEvent } from '@/shared/lib/product-analytics';
import { markWritingSessionStarted } from '@/shared/lib/writing-session-timing';

type StyleExampleOption = { id: string; content: string; approved: boolean; questionId?: string };
type StyleProfileOption = { profile: { id: string; name: string; bannedExpressions: string[]; endingStyle: string[] }; examples: StyleExampleOption[] };

export function WritingSessionStart() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedTargetId = searchParams.get('jobTargetId') ?? '';
    const [targets, setTargets] = useState<JobTarget[]>([]);
    const [styleProfiles, setStyleProfiles] = useState<StyleProfileOption[]>([]);
    const [styleProfileId, setStyleProfileId] = useState('');
    const [selectedStyleExampleIds, setSelectedStyleExampleIds] = useState<string[] | null>(null);
    const [jobTargetId, setJobTargetId] = useState(requestedTargetId);
    const [questions, setQuestions] = useState<Array<{ question: string; charLimit: string }>>([{ question: '', charLimit: '700' }]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        void Promise.all([
            fetch('/api/job-targets?limit=50', { cache: 'no-store' }).then(async response => {
                const result = await response.json().catch(() => []);
                if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '지원 대상 목록을 불러오지 못했습니다.');
                return Array.isArray(result) ? result as JobTarget[] : [];
            }),
            fetch('/api/style-profiles', { cache: 'no-store' }).then(async response => {
                const result = await response.json().catch(() => []);
                if (!response.ok) return [];
                return Array.isArray(result) ? result as StyleProfileOption[] : [];
            }),
        ])
            .then(([nextTargets, nextProfiles]) => {
                if (!active) return;
                setTargets(nextTargets);
                setJobTargetId(current => current || nextTargets[0]?.id || '');
                setStyleProfiles(nextProfiles);
            })
            .catch(loadError => {
                if (active) setError(loadError instanceof Error ? loadError.message : '지원 대상 목록을 불러오지 못했습니다.');
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });
        return () => { active = false; };
    }, []);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const validQuestions = questions.filter(item => item.question.trim());
        if (!jobTargetId || validQuestions.length === 0) {
            toast.error('지원 대상과 자기소개서 문항을 하나 이상 입력해 주세요.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const response = await fetch('/api/writing-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobTargetId,
                    styleProfileId: styleProfileId || undefined,
                    styleExampleIds: styleProfileId && selectedStyleExampleIds !== null ? selectedStyleExampleIds : undefined,
                    questions: validQuestions.map(item => ({ question: item.question.trim(), charLimit: Number(item.charLimit) })),
                }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.session?.id) {
                throw new Error(typeof result.error === 'string' ? result.error : '작성 세션을 만들지 못했습니다.');
            }
            markWritingSessionStarted(result.session.id);
            trackProductEvent({ name: 'writing_studio_started', properties: { question_count: validQuestions.length } });
            router.push(`/writing/${result.session.id}`);
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : '작성 세션을 만들지 못했습니다.';
            trackProductEvent({ name: 'writing_studio_error', properties: { operation: 'create_session' } });
            setError(message);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedStyleProfile = styleProfiles.find(item => item.profile.id === styleProfileId);
    const approvedStyleExamples = selectedStyleProfile?.examples.filter(example => example.approved) ?? [];
    const automaticStyleExampleIds = approvedStyleExamples.slice(0, 5).map(example => example.id);
    const activeStyleExampleIds = selectedStyleExampleIds ?? automaticStyleExampleIds;

    const toggleStyleExample = (exampleId: string, checked: boolean) => {
        const current = new Set(activeStyleExampleIds);
        if (checked) {
            if (current.size >= 5) {
                toast.error('한 세션에서 사용할 말투 예문은 최대 5개까지 선택할 수 있습니다.');
                return;
            }
            current.add(exampleId);
        } else {
            current.delete(exampleId);
        }
        setSelectedStyleExampleIds([...current]);
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-20">
            <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                <ArrowLeft size={16} aria-hidden="true" /> 지원 대상으로 돌아가기
            </Link>
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Writing studio</p>
                <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">근거를 고르고 작성 시작</h1>
                <p className="mt-3 text-sm leading-6 text-zinc-400 md:text-base">AI가 바로 답을 확정하지 않습니다. 먼저 문항과 글자 수를 정한 뒤 활동 근거, 개요, 초안을 차례로 비교합니다.</p>
            </div>

            {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-surface/60 p-5 md:p-7">
                <label className="block space-y-2 text-sm text-zinc-300">
                    <span>지원 대상</span>
                    {isLoading ? (
                        <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-background px-3 py-3 text-sm text-zinc-500"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> 지원 대상을 불러오는 중입니다…</span>
                    ) : (
                        <select value={jobTargetId} onChange={event => setJobTargetId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-background px-3 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20">
                            <option value="">지원 대상을 선택해 주세요</option>
                            {targets.map(target => <option key={target.id} value={target.id}>{target.company} · {target.role}</option>)}
                        </select>
                    )}
                </label>
                <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex-1 space-y-1.5 text-sm text-zinc-300"><span>말투 프로필 (선택)</span><select value={styleProfileId} onChange={event => { setStyleProfileId(event.target.value); setSelectedStyleExampleIds(null); }} className="w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm text-white outline-none focus:border-primary/60"><option value="">기본 말투로 작성</option>{styleProfiles.map(item => <option key={item.profile.id} value={item.profile.id}>{item.profile.name} · 승인 예문 {item.examples.filter(example => example.approved).length}개</option>)}</select></label>
                    <Link href="/style" className="shrink-0 text-xs text-primary transition hover:text-white">말투 프로필 관리 →</Link>
                </div>
                {styleProfileId && approvedStyleExamples.length > 0 && <fieldset className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <legend className="px-1 text-sm font-semibold text-primary">이번 작성에 사용할 말투 예문</legend>
                    <p className="mt-1 text-xs leading-5 text-zinc-400">기본값은 승인 예문 중 최근 5개입니다. 이번 지원서와 더 잘 맞는 예문만 남기거나 모두 해제할 수 있습니다. 예문 속 회사·수치·사건은 말투 참고로만 전달됩니다.</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">{approvedStyleExamples.map(example => <label key={example.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-background/40 px-3 py-2.5 text-xs text-zinc-300 transition hover:border-primary/40"><input type="checkbox" checked={activeStyleExampleIds.includes(example.id)} onChange={event => toggleStyleExample(example.id, event.target.checked)} className="mt-0.5 accent-primary" /><span><span className="block font-medium text-zinc-200">{example.questionId ? '문항별 예문' : '전역 예문'}</span><span className="mt-1 block leading-5 text-zinc-500">{example.content.slice(0, 180)}{example.content.length > 180 ? '…' : ''}</span></span></label>)}</div>
                    <p className="mt-3 text-[11px] text-zinc-500">현재 선택 {activeStyleExampleIds.length}/5개 · {selectedStyleExampleIds === null ? '자동 선택' : '직접 선택'}</p>
                </fieldset>}
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div><span className="text-sm text-zinc-300">자기소개서 문항</span><p className="mt-1 text-xs text-zinc-500">한 세션에서 여러 문항을 만들고 작업대의 탭으로 전환할 수 있습니다.</p></div>
                        <button type="button" onClick={() => setQuestions(current => [...current, { question: '', charLimit: '700' }])} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5"><Plus size={14} aria-hidden="true" /> 문항 추가</button>
                    </div>
                    <div className="space-y-3">
                        {questions.map((item, index) => <div key={index} className="rounded-xl border border-white/10 bg-background/60 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-primary/80">문항 {index + 1}</span>{questions.length > 1 && <button type="button" onClick={() => setQuestions(current => current.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300"><Trash2 size={13} aria-hidden="true" /> 삭제</button>}</div>
                            <textarea value={item.question} onChange={event => setQuestions(current => current.map((currentItem, itemIndex) => itemIndex === index ? { ...currentItem, question: event.target.value } : currentItem))} maxLength={5_000} placeholder="예: 지원한 직무를 수행하기 위해 준비해 온 과정을 구체적인 경험과 함께 작성해 주세요." className="min-h-28 w-full resize-y rounded-lg border border-white/10 bg-background px-3 py-3 text-sm leading-6 text-white placeholder:text-zinc-600 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20" />
                            <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-zinc-600">{item.question.length.toLocaleString()} / 5,000자</span><label className="flex items-center gap-2 text-xs text-zinc-400"><span>답변 글자 수</span><input type="number" min={100} max={100_000} value={item.charLimit} onChange={event => setQuestions(current => current.map((currentItem, itemIndex) => itemIndex === index ? { ...currentItem, charLimit: event.target.value } : currentItem))} className="w-24 rounded-lg border border-white/10 bg-background px-2 py-1.5 text-right text-xs text-white outline-none focus:border-primary/60" /></label></div>
                        </div>)}
                    </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-zinc-500">승인된 요구사항과 활동 근거가 없으면 AI 생성 단계로 넘어갈 수 없습니다.</p>
                    <button type="submit" disabled={isSubmitting || isLoading || targets.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <PenLine size={16} aria-hidden="true" />}
                        {isSubmitting ? '작업대 준비 중…' : '작성 작업대 열기'}
                    </button>
                </div>
            </form>
        </div>
    );
}
