'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    BriefcaseBusiness,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    FileSearch,
    Link2,
    Loader2,
    Pencil,
    PenLine,
    Plus,
    RefreshCw,
    Save,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SourceDocument } from '@/entities/source-document';
import type {
    JobRequirement,
    JobRequirementCategory,
    JobTarget,
} from '@/entities/job-target';
import { Badge } from '@/shared/ui';
import { SOURCE_KIND_LABELS, SOURCE_STATUS_LABELS } from '@/features/source-ingestion';

const REQUIREMENT_CATEGORY_LABELS: Record<JobRequirementCategory, string> = {
    responsibility: '주요 업무',
    required: '필수 역량',
    preferred: '우대사항',
    value: '인재상·가치관',
    question: '지원 문항',
};

const TARGET_STATUS_LABELS: Record<JobTarget['status'], string> = {
    draft: '작성 중',
    collecting_sources: '자료 수집 중',
    analyzed: '분석 완료',
    reviewed: '검수 완료',
    active: '지원 진행 중',
    closed: '종료',
};

type TargetForm = {
    company: string;
    role: string;
    employmentType: string;
    seniority: string;
    deadline: string;
};

type JobTargetDetailsResponse = {
    target: JobTarget;
    sources: Array<{
        sourceDocumentId: string;
        sourceRole: 'job_post' | 'talent' | 'company' | 'manual';
        isPrimary: boolean;
        sourceDocument: SourceDocument;
    }>;
    requirements: JobRequirement[];
    fragmentPreviews: Record<string, {
        id: string;
        sourceDocumentId: string;
        sourceTitle: string;
        content: string;
        locator: Record<string, unknown>;
    }>;
};

const EMPTY_FORM: TargetForm = {
    company: '',
    role: '',
    employmentType: '',
    seniority: '',
    deadline: '',
};

function targetStatusVariant(status: JobTarget['status']) {
    if (status === 'active' || status === 'reviewed') return 'success' as const;
    if (status === 'analyzed' || status === 'collecting_sources') return 'pending' as const;
    if (status === 'closed') return 'secondary' as const;
    return 'outline' as const;
}

function requirementStatusVariant(status: JobRequirement['status']) {
    if (status === 'approved') return 'success' as const;
    if (status === 'rejected') return 'fail' as const;
    return 'pending' as const;
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date);
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
    const result = await response.json().catch(() => ({}));
    return result && typeof result === 'object' ? result as Record<string, unknown> : {};
}

export function JobTargetBoard() {
    const [targets, setTargets] = useState<JobTarget[]>([]);
    const [sourceDocuments, setSourceDocuments] = useState<SourceDocument[]>([]);
    const [details, setDetails] = useState<Record<string, JobTargetDetailsResponse>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingForm, setEditingForm] = useState<TargetForm>(EMPTY_FORM);
    const [form, setForm] = useState<TargetForm>(EMPTY_FORM);
    const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadPage = async (showSpinner = false) => {
        if (showSpinner) setIsRefreshing(true);
        setError(null);
        try {
            const [targetResponse, sourceResponse] = await Promise.all([
                fetch('/api/job-targets?limit=30', { cache: 'no-store' }),
                fetch('/api/source-documents?limit=50', { cache: 'no-store' }),
            ]);
            const targetResult = await targetResponse.json().catch(() => []);
            const sourceResult = await sourceResponse.json().catch(() => []);
            if (!targetResponse.ok) {
                throw new Error(typeof targetResult.error === 'string' ? targetResult.error : '지원 대상 목록을 불러오지 못했습니다.');
            }
            if (!sourceResponse.ok) {
                throw new Error(typeof sourceResult.error === 'string' ? sourceResult.error : '자료 목록을 불러오지 못했습니다.');
            }
            setTargets(Array.isArray(targetResult) ? targetResult : []);
            setSourceDocuments(Array.isArray(sourceResult) ? sourceResult : []);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : '지원 대상 정보를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        void loadPage();
    }, []);

    const toggleSource = (id: string) => {
        setSelectedSourceIds(previous => previous.includes(id)
            ? previous.filter(sourceId => sourceId !== id)
            : [...previous, id]);
    };

    const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!form.company.trim() || !form.role.trim()) {
            toast.error('회사와 직무를 입력해 주세요.');
            return;
        }
        setIsCreating(true);
        try {
            const selectedSources = sourceDocuments.filter(source => selectedSourceIds.includes(source.id));
            const response = await fetch('/api/job-targets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company: form.company.trim(),
                    role: form.role.trim(),
                    employmentType: form.employmentType.trim(),
                    seniority: form.seniority.trim(),
                    deadline: form.deadline.trim(),
                    sourceLinks: selectedSources.map(source => ({
                        sourceDocumentId: source.id,
                        sourceRole: source.kind === 'job_post' ? 'job_post' : 'talent',
                        isPrimary: false,
                    })),
                }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '지원 대상을 만들지 못했습니다.');
            const created = result.target as JobTarget | undefined;
            if (created) setTargets(previous => [created, ...previous]);
            if (result.target && result.sources && result.requirements) {
                const createdDetails = result as unknown as JobTargetDetailsResponse;
                setDetails(previous => ({ ...previous, [createdDetails.target.id]: createdDetails }));
            }
            setForm(EMPTY_FORM);
            setSelectedSourceIds([]);
            toast.success('지원 대상을 만들었습니다.');
        } catch (createError) {
            toast.error(createError instanceof Error ? createError.message : '지원 대상을 만들지 못했습니다.');
        } finally {
            setIsCreating(false);
        }
    };

    const toggleDetail = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(id);
        if (details[id]) return;
        setLoadingId(id);
        try {
            const response = await fetch(`/api/job-targets/${id}`, { cache: 'no-store' });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '지원 대상 상세 정보를 불러오지 못했습니다.');
            setDetails(previous => ({ ...previous, [id]: result as unknown as JobTargetDetailsResponse }));
        } catch (detailError) {
            setError(detailError instanceof Error ? detailError.message : '지원 대상 상세 정보를 불러오지 못했습니다.');
        } finally {
            setLoadingId(null);
        }
    };

    const analyzeTarget = async (id: string) => {
        setLoadingId(id);
        setError(null);
        try {
            const response = await fetch(`/api/job-targets/${id}/analyze`, { method: 'POST' });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '요구사항 분석에 실패했습니다.');
            const analyzed = result as unknown as JobTargetDetailsResponse & { warnings?: string[] };
            setDetails(previous => ({ ...previous, [id]: analyzed }));
            setTargets(previous => previous.map(target => target.id === id ? analyzed.target : target));
            setExpandedId(id);
            const warningCount = Array.isArray(analyzed.warnings) ? analyzed.warnings.length : 0;
            toast.success(warningCount > 0 ? '요구사항을 분석했지만 일부 후보를 제외했습니다.' : '요구사항 후보를 만들었습니다. 검수해 주세요.');
        } catch (analysisError) {
            setError(analysisError instanceof Error ? analysisError.message : '요구사항 분석에 실패했습니다.');
        } finally {
            setLoadingId(null);
        }
    };

    const startEditing = (target: JobTarget) => {
        setExpandedId(target.id);
        setEditingId(target.id);
        setEditingForm({
            company: target.company,
            role: target.role,
            employmentType: target.employmentType ?? '',
            seniority: target.seniority ?? '',
            deadline: target.deadline ?? '',
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingForm(EMPTY_FORM);
    };

    const saveEditing = async (id: string) => {
        if (!editingForm.company.trim() || !editingForm.role.trim()) {
            toast.error('회사와 직무를 입력해 주세요.');
            return;
        }
        setLoadingId(id);
        try {
            const response = await fetch(`/api/job-targets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company: editingForm.company.trim(),
                    role: editingForm.role.trim(),
                    employmentType: editingForm.employmentType.trim(),
                    seniority: editingForm.seniority.trim(),
                    deadline: editingForm.deadline.trim(),
                }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '지원 대상 정보를 저장하지 못했습니다.');
            const updated = result as unknown as JobTargetDetailsResponse;
            setTargets(previous => previous.map(target => target.id === id ? updated.target : target));
            setDetails(previous => ({ ...previous, [id]: updated }));
            cancelEditing();
            toast.success('지원 대상 정보를 저장했습니다.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : '지원 대상 정보를 저장하지 못했습니다.');
        } finally {
            setLoadingId(null);
        }
    };

    const updateRequirement = async (targetId: string, requirementId: string, status: 'approved' | 'rejected') => {
        setLoadingId(requirementId);
        try {
            const response = await fetch(`/api/job-targets/${targetId}/requirements/${requirementId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '요구사항 상태를 저장하지 못했습니다.');
            const updatedRequirement = result as unknown as JobRequirement;
            setDetails(previous => {
                const detail = previous[targetId];
                if (!detail) return previous;
                return {
                    ...previous,
                    [targetId]: {
                        ...detail,
                        requirements: detail.requirements.map(requirement => requirement.id === requirementId ? updatedRequirement : requirement),
                    },
                };
            });
            toast.success(status === 'approved' ? '요구사항을 승인했습니다.' : '요구사항을 제외했습니다.');
        } catch (requirementError) {
            setError(requirementError instanceof Error ? requirementError.message : '요구사항 상태를 저장하지 못했습니다.');
        } finally {
            setLoadingId(null);
        }
    };

    const selectableSources = sourceDocuments.filter(source => source.kind === 'job_post' || source.kind === 'talent_page');

    return (
        <div className="space-y-6">
            <form onSubmit={handleCreate} className="rounded-2xl border border-white/10 bg-surface/70 p-5 md:p-6">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
                        <BriefcaseBusiness size={20} aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">지원 대상 만들기</h2>
                        <p className="mt-1 text-sm leading-6 text-zinc-400">회사와 직무를 만들고 검수한 채용 자료를 연결하면 요구사항을 비교할 수 있습니다.</p>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {([
                        ['company', '회사명', '예: 네이버'],
                        ['role', '지원 직무', '예: 프론트엔드 개발자'],
                        ['employmentType', '고용 형태', '예: 정규직'],
                        ['seniority', '경력 수준', '예: 신입·주니어'],
                        ['deadline', '마감일', '예: 2026-10-15'],
                    ] as const).map(([key, label, placeholder]) => (
                        <label key={key} className="space-y-2 text-sm text-zinc-300">
                            <span>{label}{(key === 'company' || key === 'role') && <span className="ml-1 text-primary">*</span>}</span>
                            <input
                                value={form[key]}
                                onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))}
                                placeholder={placeholder}
                                maxLength={200}
                                className="w-full rounded-xl border border-white/10 bg-background px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                            />
                        </label>
                    ))}
                </div>

                <fieldset className="mt-5 space-y-3">
                    <legend className="text-sm text-zinc-300">연결할 채용 자료 <span className="text-xs text-zinc-500">(선택)</span></legend>
                    {selectableSources.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-xs leading-5 text-zinc-500">먼저 경력 자료 라이브러리에서 채용공고나 인재상 URL을 등록하고 검수해 주세요.</p>
                    ) : (
                        <div className="grid gap-2 md:grid-cols-2">
                            {selectableSources.map(source => {
                                const checked = selectedSourceIds.includes(source.id);
                                return (
                                    <label key={source.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${checked ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-background/30 hover:border-white/20'}`}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleSource(source.id)}
                                            className="mt-1 h-4 w-4 accent-primary"
                                        />
                                        <span className="min-w-0">
                                            <span className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                                                <span className="truncate">{source.title}</span>
                                                <span className="text-xs text-zinc-500">{SOURCE_KIND_LABELS[source.kind]}</span>
                                            </span>
                                            <span className="mt-1 block text-xs text-zinc-500">{SOURCE_STATUS_LABELS[source.status]} · {formatDate(source.createdAt)}</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </fieldset>

                <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-zinc-500">요구사항 분석에는 검수 완료한 자료만 사용됩니다.</p>
                    <button type="submit" disabled={isCreating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                        {isCreating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                        {isCreating ? '만드는 중…' : '지원 대상 추가'}
                    </button>
                </div>
            </form>

            <section className="space-y-4" aria-labelledby="job-target-title">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Job targets</p>
                        <h2 id="job-target-title" className="mt-1 text-2xl font-bold text-white">지원 대상</h2>
                        <p className="mt-1 text-sm text-zinc-400">공고와 인재상에서 추출한 요구사항을 직접 검수합니다.</p>
                    </div>
                    <button type="button" onClick={() => void loadPage(true)} disabled={isRefreshing} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/5 disabled:opacity-50 sm:self-auto">
                        <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
                        새로고침
                    </button>
                </div>

                {error && (
                    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{error}</span>
                    </div>
                )}

                {isLoading ? (
                    <div className="rounded-2xl border border-white/10 bg-surface/50 px-5 py-12 text-center text-sm text-zinc-500">지원 대상을 불러오는 중입니다…</div>
                ) : targets.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-14 text-center">
                        <BriefcaseBusiness size={26} className="mx-auto mb-3 text-zinc-600" aria-hidden="true" />
                        <p className="text-sm font-medium text-zinc-300">아직 지원 대상이 없습니다.</p>
                        <p className="mt-1 text-xs text-zinc-500">위에서 회사와 직무를 먼저 추가해 보세요.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {targets.map(target => {
                            const detail = details[target.id];
                            const expanded = expandedId === target.id;
                            const busy = loadingId === target.id;
                            const approvedSourceCount = detail?.sources.filter(source => source.sourceDocument.status === 'approved').length ?? 0;
                            const suggestedCount = detail?.requirements.filter(requirement => requirement.status === 'suggested').length ?? 0;
                            return (
                                <article key={target.id} className="rounded-2xl border border-white/10 bg-surface/55 p-4 transition hover:border-white/15 md:p-5">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant={targetStatusVariant(target.status)}>{TARGET_STATUS_LABELS[target.status]}</Badge>
                                                {target.deadline && <span className="text-xs text-zinc-500">마감 {target.deadline}</span>}
                                            </div>
                                            <h3 className="mt-2 text-base font-semibold text-white">{target.company} · {target.role}</h3>
                                            <p className="mt-1 text-xs text-zinc-500">{target.employmentType || '고용 형태 미입력'} · {target.seniority || '경력 수준 미입력'} · {formatDate(target.updatedAt)} 수정</p>
                                            {detail && <p className="mt-2 text-xs text-zinc-500">연결 자료 {detail.sources.length}개 · 승인 자료 {approvedSourceCount}개 · 검수 대기 요구사항 {suggestedCount}개</p>}
                                        </div>
                                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                                            <button type="button" onClick={() => startEditing(target)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5 disabled:opacity-50">
                                                <Pencil size={14} aria-hidden="true" />
                                                정보 수정
                                            </button>
                                            <button type="button" onClick={() => void analyzeTarget(target.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50">
                                                {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <FileSearch size={14} aria-hidden="true" />}
                                                요구사항 분석
                                            </button>
                                            <Link href={`/writing/new?jobTargetId=${encodeURIComponent(target.id)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20">
                                                <PenLine size={14} aria-hidden="true" />
                                                작성 시작
                                            </Link>
                                            <button type="button" aria-expanded={expanded} onClick={() => void toggleDetail(target.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5">
                                                {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                                                상세 보기
                                            </button>
                                        </div>
                                    </div>

                                    {expanded && (
                                        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                                            {loadingId === target.id && !detail ? (
                                                <p className="text-sm text-zinc-500">상세 정보를 불러오는 중입니다…</p>
                                            ) : detail ? (
                                                <>
                                                    {editingId === target.id && (
                                                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                                                            <div className="grid gap-3 md:grid-cols-2">
                                                                {([
                                                                    ['company', '회사명'],
                                                                    ['role', '지원 직무'],
                                                                    ['employmentType', '고용 형태'],
                                                                    ['seniority', '경력 수준'],
                                                                    ['deadline', '마감일'],
                                                                ] as const).map(([key, label]) => (
                                                                    <label key={key} className="space-y-1.5 text-xs text-zinc-300">
                                                                        <span>{label}</span>
                                                                        <input
                                                                            value={editingForm[key]}
                                                                            onChange={event => setEditingForm(previous => ({ ...previous, [key]: event.target.value }))}
                                                                            maxLength={200}
                                                                            className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                                                                        />
                                                                    </label>
                                                                ))}
                                                            </div>
                                                            <div className="mt-3 flex justify-end gap-2">
                                                                <button type="button" onClick={cancelEditing} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5 disabled:opacity-50">
                                                                    <XCircle size={14} aria-hidden="true" /> 취소
                                                                </button>
                                                                <button type="button" onClick={() => void saveEditing(target.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
                                                                    {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />} 저장
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-2">
                                                        {detail.sources.map(source => (
                                                            <a key={`${source.sourceDocumentId}-${source.sourceRole}`} href={source.sourceDocument.sourceUrl ?? `/career`} target={source.sourceDocument.sourceUrl ? '_blank' : undefined} rel={source.sourceDocument.sourceUrl ? 'noopener noreferrer' : undefined} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-2 text-xs text-zinc-300 transition hover:border-primary/40 hover:text-primary">
                                                                <Link2 size={13} aria-hidden="true" />
                                                                <span className="max-w-56 truncate">{source.sourceDocument.title}</span>
                                                                <span className="text-zinc-600">· {source.sourceRole === 'job_post' ? '공고' : '인재상'}</span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                    {detail.requirements.length === 0 ? (
                                                        <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">아직 요구사항 후보가 없습니다. 승인된 자료가 연결된 뒤 분석을 실행해 주세요.</div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {detail.requirements.map(requirement => {
                                                                const preview = requirement.sourceFragmentId ? detail.fragmentPreviews[requirement.sourceFragmentId] : undefined;
                                                                const requirementBusy = loadingId === requirement.id;
                                                                return (
                                                                    <div key={requirement.id} className="rounded-xl border border-white/10 bg-background/30 p-4">
                                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                            <div className="min-w-0">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <Badge variant={requirementStatusVariant(requirement.status)}>{requirement.status === 'suggested' ? '검수 필요' : requirement.status === 'approved' ? '승인됨' : '제외됨'}</Badge>
                                                                                    <span className="text-xs text-primary/80">{REQUIREMENT_CATEGORY_LABELS[requirement.category]}</span>
                                                                                    <span className="text-xs text-zinc-600">우선순위 {requirement.priority}</span>
                                                                                </div>
                                                                                <p className="mt-2 text-sm leading-6 text-zinc-200">{requirement.text}</p>
                                                                                {preview && (
                                                                                    <p className="mt-3 border-l-2 border-primary/30 pl-3 text-xs leading-5 text-zinc-500">
                                                                                        출처: {preview.sourceTitle} · {preview.content}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                            {requirement.status === 'suggested' && (
                                                                                <div className="flex shrink-0 items-center gap-2">
                                                                                    <button type="button" onClick={() => void updateRequirement(target.id, requirement.id, 'approved')} disabled={requirementBusy} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-2 text-xs text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50">
                                                                                        <CheckCircle2 size={14} aria-hidden="true" /> 승인
                                                                                    </button>
                                                                                    <button type="button" onClick={() => void updateRequirement(target.id, requirement.id, 'rejected')} disabled={requirementBusy} className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-2 text-xs text-red-300 transition hover:bg-red-500/20 disabled:opacity-50">
                                                                                        <XCircle size={14} aria-hidden="true" /> 제외
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </>
                                            ) : null}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
