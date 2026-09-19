'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    ArrowLeft,
    Check,
    CheckCircle2,
    ChevronRight,
    Circle,
    FileText,
    Lock,
    Loader2,
    Plus,
    RefreshCw,
    RotateCcw,
    Save,
    Sparkles,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { JobRequirement, JobTarget } from '@/entities/job-target';
import type { EvidenceMatch, OutlineCandidate, WritingSession } from '@/entities/writing-session';
import type { DraftCandidate } from '@/entities/draft-candidate';
import type { EvidenceRecord } from '@/entities/evidence-record';
import type { CareerItem } from '@/entities/career-item';
import { Badge } from '@/shared/ui';

type EvidenceDetails = { record: EvidenceRecord; careerItem: CareerItem };
type MatchDetails = { match: EvidenceMatch; evidence: EvidenceDetails; requirement?: JobRequirement };
type QuestionDetails = { id: string; question: string; charLimit?: number; status: string };
type SessionResponse = {
    session: WritingSession;
    target: JobTarget;
    question: QuestionDetails;
    requirements: JobRequirement[];
    evidence: EvidenceDetails[];
    matches: MatchDetails[];
    outlines: OutlineCandidate[];
    drafts: DraftCandidate[];
    revisions: Array<{ id: string; editor: 'user' | 'ai'; createdAt: string; content: string }>;
};

type Step = 'evidence' | 'outline' | 'draft' | 'edit';
type ManualEvidence = { title: string; action: string; result: string; learning: string };

const STEP_LABELS: Array<{ id: Step; label: string }> = [
    { id: 'evidence', label: '근거 선택' },
    { id: 'outline', label: '개요 비교' },
    { id: 'draft', label: '초안 비교' },
    { id: 'edit', label: '최종 편집' },
];

const STRATEGY_LABELS: Record<OutlineCandidate['strategy'], string> = {
    problem_solving: '문제 해결 중심',
    collaboration: '협업 중심',
    growth: '성장 중심',
    custom: '사용자 정의',
};

const SESSION_STATE_LABELS: Record<WritingSession['state'], string> = {
    evidence_selecting: '근거 선택 중',
    outline_selecting: '개요 선택 중',
    drafting: '초안 준비 중',
    comparing: '초안 비교 중',
    editing: '최종 편집 중',
    finalized: '최종 확정',
    exported: '내보냄',
};

function readJson(value: Response): Promise<Record<string, unknown>> {
    return value.json().catch(() => ({})).then(result => result && typeof result === 'object' ? result as Record<string, unknown> : {});
}

function charCount(value: string): number {
    return Array.from(value).length;
}

function stepForState(state: WritingSession['state']): Step {
    if (state === 'evidence_selecting') return 'evidence';
    if (state === 'outline_selecting' || state === 'drafting') return 'outline';
    if (state === 'comparing') return 'draft';
    return 'edit';
}

export function WritingStudioBoard({ sessionId }: { sessionId: string }) {
    const [details, setDetails] = useState<SessionResponse | null>(null);
    const [step, setStep] = useState<Step>('evidence');
    const [isLoading, setIsLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [manualEvidence, setManualEvidence] = useState<ManualEvidence>({ title: '', action: '', result: '', learning: '' });
    const [showEvidenceForm, setShowEvidenceForm] = useState(false);
    const [editedContent, setEditedContent] = useState('');

    const loadSession = async (showSpinner = false) => {
        if (showSpinner) setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/writing-sessions/${sessionId}`, { cache: 'no-store' });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '작성 세션을 불러오지 못했습니다.');
            const next = result as unknown as SessionResponse;
            setDetails(next);
            setStep(current => current === 'evidence' && next.session.state !== 'evidence_selecting' ? stepForState(next.session.state) : current);
            const selectedDraft = next.drafts.find(draft => draft.status === 'selected');
            if (selectedDraft) setEditedContent(selectedDraft.content);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : '작성 세션을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void loadSession(true); }, [sessionId]);

    const selectedMatches = useMemo(() => details?.matches.filter(item => ['selected', 'locked'].includes(item.match.selectionState)) ?? [], [details]);
    const selectedOutline = details?.outlines.find(outline => outline.status === 'selected');
    const selectedDraft = details?.drafts.find(draft => draft.status === 'selected');
    const charLimit = details?.question.charLimit ?? 700;
    const editedCount = charCount(editedContent);
    const approvedRequirementCount = details?.requirements.filter(requirement => requirement.status === 'approved').length ?? 0;

    const updateDetails = async (response: Response, fallback: string) => {
        const result = await readJson(response);
        if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : fallback);
        const next = result as unknown as SessionResponse;
        setDetails(next);
        return next;
    };

    const changeMatch = async (match: MatchDetails, selectionState: 'selected' | 'rejected' | 'locked') => {
        setBusy(match.match.id);
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/evidence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selections: [{ matchId: match.match.id, selectionState }] }),
            }), '근거 선택을 저장하지 못했습니다.');
            setStep('evidence');
            toast.success(selectionState === 'rejected' ? '이 근거를 제외했습니다.' : '선택한 근거를 저장했습니다.');
            return next;
        } catch (changeError) {
            setError(changeError instanceof Error ? changeError.message : '근거 선택을 저장하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const refreshMatches = async () => {
        setBusy('refresh-matches');
        try {
            await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/evidence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: true }),
            }), '활동 근거 목록을 새로 연결하지 못했습니다.');
            toast.success('승인된 활동 근거를 다시 연결했습니다.');
        } catch (refreshError) {
            setError(refreshError instanceof Error ? refreshError.message : '활동 근거 목록을 새로 연결하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const addManualEvidence = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!manualEvidence.title.trim() || !manualEvidence.action.trim() || !manualEvidence.result.trim()) {
            toast.error('활동명, 내가 한 일, 결과를 입력해 주세요.');
            return;
        }
        setBusy('manual-evidence');
        try {
            const response = await fetch('/api/evidence-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: manualEvidence.title.trim(),
                    action: manualEvidence.action.trim(),
                    result: manualEvidence.result.trim(),
                    learning: manualEvidence.learning.trim(),
                }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '활동 근거를 저장하지 못했습니다.');
            await refreshMatches();
            setManualEvidence({ title: '', action: '', result: '', learning: '' });
            setShowEvidenceForm(false);
            toast.success('활동 근거를 추가하고 선택 목록을 갱신했습니다.');
        } catch (addError) {
            setError(addError instanceof Error ? addError.message : '활동 근거를 저장하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const generateOutlines = async () => {
        setBusy('outlines');
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/outlines/generate`, { method: 'POST' }), '개요 후보를 생성하지 못했습니다.');
            setStep('outline');
            toast.success('서로 다른 개요 후보 3개를 만들었습니다.');
            return next;
        } catch (generateError) {
            setError(generateError instanceof Error ? generateError.message : '개요 후보를 생성하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const selectOutline = async (outlineId: string) => {
        setBusy(outlineId);
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/outlines/${outlineId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'selected' }),
            }), '개요 선택을 저장하지 못했습니다.');
            setStep('outline');
            toast.success('개요를 선택했습니다. 이제 초안을 비교할 수 있습니다.');
            return next;
        } catch (selectError) {
            setError(selectError instanceof Error ? selectError.message : '개요 선택을 저장하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const generateDrafts = async () => {
        setBusy('drafts');
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/drafts/generate`, { method: 'POST' }), '초안 후보를 생성하지 못했습니다.');
            setStep('draft');
            toast.success('비교할 초안 후보 3개를 만들었습니다.');
            return next;
        } catch (generateError) {
            setError(generateError instanceof Error ? generateError.message : '초안 후보를 생성하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const selectDraft = async (draftId: string) => {
        setBusy(draftId);
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/drafts/${draftId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'selected' }),
            }), '초안 선택을 저장하지 못했습니다.');
            setStep('edit');
            const selected = next.drafts.find(draft => draft.status === 'selected');
            setEditedContent(selected?.content ?? '');
            toast.success('초안을 선택했습니다. 직접 수정한 뒤 확정할 수 있습니다.');
            return next;
        } catch (selectError) {
            setError(selectError instanceof Error ? selectError.message : '초안 선택을 저장하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const saveDraft = async () => {
        setBusy('save-draft');
        try {
            await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/drafts/${selectedDraft?.id ?? ''}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editedContent }),
            }), '수정한 초안을 저장하지 못했습니다.');
            toast.success('수정한 초안을 저장했습니다.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : '수정한 초안을 저장하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const finalizeDraft = async () => {
        setBusy('finalize');
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/finalize`, { method: 'POST' }), '자기소개서를 확정하지 못했습니다.');
            setStep('edit');
            const finalized = next.drafts.find(draft => draft.status === 'selected');
            setEditedContent(finalized?.content ?? editedContent);
            toast.success('자기소개서를 최종 확정했습니다.');
        } catch (finalizeError) {
            setError(finalizeError instanceof Error ? finalizeError.message : '자기소개서를 확정하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    if (isLoading) return <div className="rounded-2xl border border-white/10 bg-surface/50 px-5 py-16 text-center text-sm text-zinc-500">작성 작업대를 불러오는 중입니다…</div>;
    if (!details) return <div className="space-y-4"><Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16} aria-hidden="true" /> 지원 대상으로 돌아가기</Link><div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error ?? '작성 세션을 불러오지 못했습니다.'}</div></div>;

    const activeCandidates = details.outlines.filter(outline => outline.status !== 'stale');
    const activeDrafts = details.drafts.filter(draft => draft.status !== 'stale');
    const finalized = details.session.state === 'finalized' || details.session.state === 'exported';

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"><ArrowLeft size={16} aria-hidden="true" /> 지원 대상으로 돌아가기</Link>
                    <div className="mt-5 flex flex-wrap items-center gap-2"><Badge variant={finalized ? 'success' : 'pending'}>{SESSION_STATE_LABELS[details.session.state]}</Badge><span className="text-xs text-zinc-500">{details.target.company} · {details.target.role}</span></div>
                    <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">작성 작업대</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{details.question.question}</p>
                </div>
                <button type="button" onClick={() => void loadSession(true)} disabled={isLoading} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"><RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" /> 새로고침</button>
            </div>

            {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}

            <nav aria-label="작성 단계" className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-surface/45 p-2 md:grid-cols-4">
                {STEP_LABELS.map((item, index) => {
                    const currentIndex = STEP_LABELS.findIndex(stepItem => stepItem.id === step);
                    const canOpen = index <= currentIndex || (item.id === 'outline' && activeCandidates.length > 0) || (item.id === 'draft' && activeDrafts.length > 0) || (item.id === 'edit' && Boolean(selectedDraft));
                    return <button key={item.id} type="button" onClick={() => canOpen && setStep(item.id)} disabled={!canOpen} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${step === item.id ? 'bg-primary/15 font-semibold text-primary' : canOpen ? 'text-zinc-300 hover:bg-white/5' : 'cursor-not-allowed text-zinc-600'}`}><span className="text-xs">0{index + 1}</span>{item.label}{index < STEP_LABELS.length - 1 && <ChevronRight size={14} className="hidden text-zinc-700 md:block" aria-hidden="true" />}</button>;
                })}
            </nav>

            {step === 'evidence' && (
                <section className="space-y-5" aria-labelledby="evidence-step-title">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">01 · Evidence</p><h2 id="evidence-step-title" className="mt-1 text-2xl font-bold text-white">활동 근거를 직접 고르세요</h2><p className="mt-1 text-sm text-zinc-400">선택한 근거만 개요와 초안 생성에 전달됩니다. 추천 이유를 읽고 제외하거나 고정할 수 있습니다.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowEvidenceForm(previous => !previous)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5"><Plus size={15} aria-hidden="true" /> 활동 직접 추가</button><button type="button" onClick={() => void refreshMatches()} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"><RotateCcw size={15} aria-hidden="true" /> 추천 갱신</button></div></div>
                    {showEvidenceForm && <form onSubmit={addManualEvidence} className="grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 md:grid-cols-2"><label className="space-y-1.5 text-xs text-zinc-300 md:col-span-2"><span>활동명</span><input value={manualEvidence.title} onChange={event => setManualEvidence(previous => ({ ...previous, title: event.target.value }))} maxLength={200} placeholder="예: 사내 검색 서비스 개선" className="w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm text-white outline-none focus:border-primary/60" /></label><label className="space-y-1.5 text-xs text-zinc-300"><span>내가 한 일</span><textarea value={manualEvidence.action} onChange={event => setManualEvidence(previous => ({ ...previous, action: event.target.value }))} maxLength={10_000} className="min-h-24 w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm leading-5 text-white outline-none focus:border-primary/60" /></label><label className="space-y-1.5 text-xs text-zinc-300"><span>결과</span><textarea value={manualEvidence.result} onChange={event => setManualEvidence(previous => ({ ...previous, result: event.target.value }))} maxLength={10_000} className="min-h-24 w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm leading-5 text-white outline-none focus:border-primary/60" /></label><label className="space-y-1.5 text-xs text-zinc-300 md:col-span-2"><span>배운 점 (선택)</span><textarea value={manualEvidence.learning} onChange={event => setManualEvidence(previous => ({ ...previous, learning: event.target.value }))} maxLength={10_000} className="min-h-20 w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm leading-5 text-white outline-none focus:border-primary/60" /></label><div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setShowEvidenceForm(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:bg-white/5">취소</button><button type="submit" disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{busy === 'manual-evidence' && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} 저장</button></div></form>}
                    <div className="grid gap-3">{details.matches.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center"><FileText size={25} className="mx-auto mb-3 text-zinc-600" aria-hidden="true" /><p className="text-sm font-medium text-zinc-300">추천할 승인 활동 근거가 없습니다.</p><p className="mt-1 text-xs leading-5 text-zinc-500">활동을 직접 추가하거나 경력 자료를 검수한 뒤 추천 갱신을 눌러 주세요.</p></div> : details.matches.map(item => { const selected = ['selected', 'locked'].includes(item.match.selectionState); const matchBusy = busy === item.match.id; return <article key={item.match.id} className={`rounded-2xl border p-4 transition md:p-5 ${selected ? 'border-primary/40 bg-primary/5' : 'border-white/10 bg-surface/50'}`}><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant={selected ? 'success' : item.match.selectionState === 'rejected' ? 'fail' : 'pending'}>{selected ? item.match.selectionState === 'locked' ? '고정됨' : '선택됨' : item.match.selectionState === 'rejected' ? '제외됨' : '추천됨'}</Badge>{item.requirement && <span className="text-xs text-primary/80">{item.requirement.category} · 우선순위 {item.requirement.priority}</span>}</div><h3 className="mt-2 text-base font-semibold text-white">{item.evidence.careerItem.title}</h3><p className="mt-1 text-xs text-zinc-500">{item.evidence.careerItem.organization || '직접 입력한 활동'} · 관련도 {Math.round((item.match.rerankScore ?? 0) * 100)}%</p><p className="mt-3 text-sm leading-6 text-zinc-300">{item.evidence.record.action || item.evidence.record.result || item.evidence.careerItem.summary}</p>{item.match.reason && <p className="mt-2 text-xs leading-5 text-zinc-500">추천 이유: {item.match.reason}</p>}{item.evidence.record.metrics.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{item.evidence.record.metrics.map(metric => <span key={`${metric.label}-${metric.value}`} className="rounded-md bg-white/5 px-2 py-1 text-xs text-zinc-400">{metric.label}: {metric.value}{metric.unit ? ` ${metric.unit}` : ''}</span>)}</div>}</div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => void changeMatch(item, selected ? 'rejected' : 'selected')} disabled={matchBusy} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${selected ? 'bg-emerald-500/15 text-emerald-300 hover:bg-red-500/15 hover:text-red-300' : 'bg-primary/15 text-primary hover:bg-primary/25'}`}>{matchBusy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : selected ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}{selected ? '선택 해제' : '근거 선택'}</button>{selected && <button type="button" onClick={() => void changeMatch(item, item.match.selectionState === 'locked' ? 'selected' : 'locked')} disabled={matchBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"><Lock size={14} aria-hidden="true" />{item.match.selectionState === 'locked' ? '고정 해제' : '고정'}</button>}</div></div></article>; })}</div>
                    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface/40 p-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-medium text-white">선택한 근거 {selectedMatches.length}개 · 승인 요구사항 {approvedRequirementCount}개</p><p className="mt-1 text-xs text-zinc-500">근거와 승인된 요구사항이 각각 하나 이상 있어야 개요 후보를 만들 수 있습니다.</p></div><button type="button" onClick={() => void generateOutlines()} disabled={selectedMatches.length === 0 || approvedRequirementCount === 0 || busy !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{busy === 'outlines' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />} 개요 후보 3개 만들기</button></div>
                </section>
            )}

            {step === 'outline' && <section className="space-y-5" aria-labelledby="outline-step-title"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">02 · Outline</p><h2 id="outline-step-title" className="mt-1 text-2xl font-bold text-white">서사가 다른 개요를 비교하세요</h2><p className="mt-1 text-sm text-zinc-400">중심 주장과 전개 방식이 다른 후보 중 하나를 선택해야 초안을 만들 수 있습니다.</p></div><button type="button" onClick={() => void generateOutlines()} disabled={busy !== null || selectedMatches.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"><Sparkles size={15} aria-hidden="true" /> 다시 생성</button></div>{activeCandidates.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center text-sm text-zinc-500">아직 개요 후보가 없습니다. 근거 선택 단계에서 생성해 주세요.</div> : <div className="grid gap-4 lg:grid-cols-3">{activeCandidates.map(outline => { const selected = outline.status === 'selected'; const outlineBusy = busy === outline.id; return <article key={outline.id} className={`flex flex-col rounded-2xl border p-5 ${selected ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-surface/50'}`}><div className="flex items-center justify-between gap-2"><Badge variant={selected ? 'success' : outline.status === 'rejected' ? 'secondary' : 'pending'}>{selected ? '선택됨' : STRATEGY_LABELS[outline.strategy]}</Badge>{selected && <CheckCircle2 size={18} className="text-emerald-300" aria-hidden="true" />}</div><h3 className="mt-4 text-lg font-semibold leading-7 text-white">{outline.thesis}</h3><ol className="mt-4 flex-1 space-y-2 text-sm leading-6 text-zinc-400">{outline.structure.map((part, index) => <li key={`${outline.id}-${part}`} className="flex gap-2"><span className="text-primary/70">{index + 1}</span><span>{part}</span></li>)}</ol><p className="mt-4 text-xs text-zinc-500">근거 {outline.evidenceRecordIds.length}개 · 요구사항 {outline.requirementIds.length}개</p><button type="button" onClick={() => void selectOutline(outline.id)} disabled={selected || outline.status === 'stale' || busy !== null} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary/15 px-3 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50">{outlineBusy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}{selected ? '선택한 개요' : '이 개요 선택'}</button></article>; })}</div>}<div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface/40 p-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-medium text-white">{selectedOutline ? '개요가 선택되었습니다.' : '개요를 하나 선택해 주세요.'}</p><p className="mt-1 text-xs text-zinc-500">선택한 개요와 근거만 초안 생성에 사용됩니다.</p></div><button type="button" onClick={() => void generateDrafts()} disabled={!selectedOutline || busy !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{busy === 'drafts' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />} 초안 후보 3개 만들기</button></div></section>}

            {step === 'draft' && <section className="space-y-5" aria-labelledby="draft-step-title"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">03 · Draft</p><h2 id="draft-step-title" className="mt-1 text-2xl font-bold text-white">초안을 나란히 비교하세요</h2><p className="mt-1 text-sm text-zinc-400">글자 수 제한을 넘은 후보는 선택할 수 없습니다. 선택 후 직접 문장을 고칠 수 있습니다.</p></div><button type="button" onClick={() => void generateDrafts()} disabled={busy !== null || !selectedOutline} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"><Sparkles size={15} aria-hidden="true" /> 다시 생성</button></div>{activeDrafts.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center text-sm text-zinc-500">아직 초안 후보가 없습니다. 개요를 선택한 뒤 생성해 주세요.</div> : <div className="grid gap-4 lg:grid-cols-3">{activeDrafts.map(draft => { const overLimit = draft.charCount > charLimit; const selected = draft.status === 'selected'; const draftBusy = busy === draft.id; return <article key={draft.id} className={`flex flex-col rounded-2xl border p-5 ${selected ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-surface/50'}`}><div className="flex items-center justify-between gap-2"><Badge variant={selected ? 'success' : overLimit ? 'fail' : 'pending'}>{selected ? '선택됨' : overLimit ? '글자 수 초과' : '후보'}</Badge><span className={`text-xs ${overLimit ? 'text-red-300' : 'text-zinc-500'}`}>{draft.charCount.toLocaleString()} / {charLimit.toLocaleString()}자</span></div><p className="mt-4 flex-1 whitespace-pre-wrap text-sm leading-7 text-zinc-300">{draft.content}</p><p className="mt-4 text-xs text-zinc-500">근거 {Array.isArray(draft.evidenceMap.evidenceRecordIds) ? draft.evidenceMap.evidenceRecordIds.length : 0}개</p><button type="button" onClick={() => void selectDraft(draft.id)} disabled={selected || overLimit || draft.status === 'stale' || busy !== null} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary/15 px-3 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50">{draftBusy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}{selected ? '선택한 초안' : overLimit ? '초과로 선택 불가' : '이 초안 선택'}</button></article>; })}</div>}</section>}

            {step === 'edit' && <section className="space-y-5" aria-labelledby="edit-step-title"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">04 · Final edit</p><h2 id="edit-step-title" className="mt-1 text-2xl font-bold text-white">직접 다듬고 확정하세요</h2><p className="mt-1 text-sm text-zinc-400">수정본은 revision으로 남습니다. 글자 수 제한을 넘으면 확정할 수 없습니다.</p></div>{selectedDraft ? <div className="rounded-2xl border border-white/10 bg-surface/55 p-4 md:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Badge variant={finalized ? 'success' : 'pending'}>{finalized ? '최종 확정됨' : '편집 중'}</Badge><span className={`text-xs ${editedCount > charLimit ? 'text-red-300' : 'text-zinc-500'}`}>{editedCount.toLocaleString()} / {charLimit.toLocaleString()}자</span></div><span className="text-xs text-zinc-600">revision {details.revisions.length}개</span></div><textarea value={editedContent} onChange={event => setEditedContent(event.target.value)} maxLength={100_000} disabled={finalized} className="min-h-[420px] w-full resize-y rounded-xl border border-white/10 bg-background px-4 py-4 text-sm leading-7 text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-80" /><div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-zinc-500">{editedCount > charLimit ? '글자 수를 줄인 뒤 저장·확정해 주세요.' : '선택한 활동 근거와 개요를 바탕으로 직접 문장을 완성하세요.'}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditedContent(selectedDraft.content)} disabled={busy !== null || finalized} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"><X size={14} aria-hidden="true" /> 되돌리기</button><button type="button" onClick={() => void saveDraft()} disabled={busy !== null || finalized || editedCount === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"><Save size={14} aria-hidden="true" /> 저장</button><button type="button" onClick={() => void finalizeDraft()} disabled={busy !== null || finalized || editedCount === 0 || editedCount > charLimit} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"><CheckCircle2 size={14} aria-hidden="true" /> 최종 확정</button></div></div></div> : <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center text-sm text-zinc-500">먼저 초안 후보를 선택해 주세요.</div>}</section>}
        </div>
    );
}
