'use client';

import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    ExternalLink,
    FileText,
    RefreshCw,
    Save,
    Sparkles,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/shared/ui';
import type { SourceDocument, SourceFragment } from '@/entities/source-document';
import type { CareerCandidate } from '@/features/career-extraction';
import {
    SOURCE_KIND_LABELS,
    SOURCE_ORIGIN_LABELS,
    SOURCE_STATUS_LABELS,
    SourceImportForm,
} from '@/features/source-ingestion';

type SourceDetail = {
    document: SourceDocument;
    fragments: SourceFragment[];
};

const CAREER_KIND_LABELS: Record<CareerCandidate['kind'], string> = {
    project: '프로젝트',
    work: '경력',
    education: '교육',
    award: '수상',
    leadership: '리더십',
    community: '커뮤니티',
    other: '기타',
};

function statusVariant(status: SourceDocument['status']) {
    if (status === 'approved') return 'success' as const;
    if (status === 'needs_review' || status === 'manual_input') return 'pending' as const;
    if (status === 'failed') return 'fail' as const;
    return 'secondary' as const;
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date);
}

function suggestionIdentity(candidate: CareerCandidate): string {
    return `${candidate.kind}:${candidate.title}:${candidate.sourceFragmentIds.join(',')}`;
}

export function SourceLibraryBoard() {
    const [documents, setDocuments] = useState<SourceDocument[]>([]);
    const [details, setDetails] = useState<Record<string, SourceDetail>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [manualText, setManualText] = useState('');
    const [suggestionsByDocument, setSuggestionsByDocument] = useState<Record<string, CareerCandidate[]>>({});
    const [suggestionLoadingId, setSuggestionLoadingId] = useState<string | null>(null);
    const [savingSuggestionKey, setSavingSuggestionKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadDocuments = async (showSpinner = false) => {
        if (showSpinner) setIsRefreshing(true);
        setError(null);
        try {
            const response = await fetch('/api/source-documents', { cache: 'no-store' });
            const result = await response.json().catch(() => []);
            if (!response.ok) {
                throw new Error(typeof result.error === 'string' ? result.error : '자료 목록을 불러오지 못했습니다.');
            }
            setDocuments(Array.isArray(result) ? result : []);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : '자료 목록을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        void loadDocuments();
    }, []);

    const toggleDetail = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }

        setExpandedId(id);
        if (details[id]) return;

        setLoadingId(id);
        try {
            const response = await fetch(`/api/source-documents/${id}`, { cache: 'no-store' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '자료 본문을 불러오지 못했습니다.');
            setDetails(previous => ({ ...previous, [id]: result }));
        } catch (detailError) {
            setError(detailError instanceof Error ? detailError.message : '자료 본문을 불러오지 못했습니다.');
        } finally {
            setLoadingId(null);
        }
    };

    const approveDocument = async (id: string) => {
        setLoadingId(id);
        try {
            const response = await fetch(`/api/source-documents/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '검수 상태를 저장하지 못했습니다.');
            setDocuments(previous => previous.map(document => document.id === id ? result : document));
            setDetails(previous => previous[id] ? { ...previous, [id]: { ...previous[id], document: result } } : previous);
        } catch (approveError) {
            setError(approveError instanceof Error ? approveError.message : '검수 상태를 저장하지 못했습니다.');
        } finally {
            setLoadingId(null);
        }
    };

    const openManualEditor = async (id: string) => {
        setEditingTextId(id);
        const existing = details[id];
        if (existing) {
            setManualText(existing.document.rawText ?? existing.fragments.map(fragment => fragment.content).join('\n\n'));
            return;
        }

        setLoadingId(id);
        try {
            const response = await fetch(`/api/source-documents/${id}`, { cache: 'no-store' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '자료 본문을 불러오지 못했습니다.');
            const next = result as SourceDetail;
            setDetails(previous => ({ ...previous, [id]: next }));
            setManualText(next.document.rawText ?? next.fragments.map(fragment => fragment.content).join('\n\n'));
        } catch (editorError) {
            setEditingTextId(null);
            setError(editorError instanceof Error ? editorError.message : '자료 본문을 불러오지 못했습니다.');
        } finally {
            setLoadingId(null);
        }
    };

    const saveManualText = async (id: string) => {
        if (!manualText.trim()) {
            setError('보정할 텍스트를 입력해 주세요.');
            return;
        }
        setLoadingId(id);
        try {
            const response = await fetch(`/api/source-documents/${id}/text`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: manualText }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '자료 본문을 저장하지 못했습니다.');
            setDocuments(previous => previous.map(document => document.id === id ? result : document));
            setDetails(previous => previous[id] ? { ...previous, [id]: { ...previous[id], document: result } } : previous);
            setEditingTextId(null);
            toast.success('본문을 저장했습니다. 내용을 확인한 뒤 검수 완료를 눌러 주세요.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : '자료 본문을 저장하지 못했습니다.');
        } finally {
            setLoadingId(null);
        }
    };

    const generateSuggestions = async (id: string) => {
        setSuggestionLoadingId(id);
        setError(null);
        try {
            const response = await fetch(`/api/source-documents/${id}/suggestions`, { method: 'POST' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '활동 후보를 만들지 못했습니다.');
            const candidates = Array.isArray(result.candidates) ? result.candidates as CareerCandidate[] : [];
            setSuggestionsByDocument(previous => ({ ...previous, [id]: candidates }));
            if (Array.isArray(result.warnings) && result.warnings.length > 0) {
                toast.info(result.warnings[0]);
            } else {
                toast.success(candidates.length > 0 ? `${candidates.length}개의 활동 후보를 만들었습니다.` : '검토할 활동 후보가 없습니다.');
            }
        } catch (suggestionError) {
            setError(suggestionError instanceof Error ? suggestionError.message : '활동 후보를 만들지 못했습니다.');
        } finally {
            setSuggestionLoadingId(null);
        }
    };

    const dismissSuggestion = (documentId: string, candidate: CareerCandidate) => {
        const identity = suggestionIdentity(candidate);
        setSuggestionsByDocument(previous => ({
            ...previous,
            [documentId]: (previous[documentId] ?? []).filter(item => suggestionIdentity(item) !== identity),
        }));
    };

    const saveSuggestion = async (documentId: string, candidate: CareerCandidate) => {
        const key = `${documentId}-${suggestionIdentity(candidate)}`;
        setSavingSuggestionKey(key);
        setError(null);
        try {
            const response = await fetch('/api/evidence-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: candidate.title,
                    kind: candidate.kind,
                    organization: candidate.organization ?? undefined,
                    role: candidate.role ?? undefined,
                    startedAt: candidate.startedAt ?? undefined,
                    endedAt: candidate.endedAt ?? undefined,
                    isCurrent: candidate.isCurrent,
                    summary: candidate.summary ?? undefined,
                    contributionNote: candidate.contributionNote ?? undefined,
                    situation: candidate.situation ?? undefined,
                    problem: candidate.problem ?? undefined,
                    action: candidate.action ?? undefined,
                    result: candidate.result ?? undefined,
                    learning: candidate.learning ?? undefined,
                    metrics: candidate.metrics,
                    skills: candidate.skills,
                    competencyTags: candidate.competencyTags,
                    sourceFragmentIds: candidate.sourceFragmentIds,
                }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '활동을 저장하지 못했습니다.');
            dismissSuggestion(documentId, candidate);
            toast.success('활동 라이브러리에 저장했습니다.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : '활동을 저장하지 못했습니다.');
        } finally {
            setSavingSuggestionKey(null);
        }
    };

    return (
        <div className="space-y-6">
            <SourceImportForm onCreated={() => void loadDocuments(true)} />

            <section className="space-y-4" aria-labelledby="source-library-title">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Career library</p>
                        <h2 id="source-library-title" className="mt-1 text-2xl font-bold text-white">등록한 경력 자료</h2>
                        <p className="mt-1 text-sm text-zinc-400">검수 완료한 자료만 다음 자기소개서 작성의 근거로 사용됩니다.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void loadDocuments(true)}
                        disabled={isRefreshing}
                        className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/5 disabled:opacity-50 sm:self-auto"
                    >
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
                    <div className="rounded-2xl border border-white/10 bg-surface/50 px-5 py-12 text-center text-sm text-zinc-500">자료를 불러오는 중입니다…</div>
                ) : documents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-14 text-center">
                        <FileText size={26} className="mx-auto mb-3 text-zinc-600" aria-hidden="true" />
                        <p className="text-sm font-medium text-zinc-300">아직 등록한 자료가 없습니다.</p>
                        <p className="mt-1 text-xs text-zinc-500">이력서나 포트폴리오를 먼저 등록해 보세요.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {documents.map(document => {
                            const detail = details[document.id];
                            const isExpanded = expandedId === document.id;
                            const isBusy = loadingId === document.id;
                            const suggestions = suggestionsByDocument[document.id] ?? [];
                            const canSuggest = ['resume', 'portfolio', 'cover_letter'].includes(document.kind) && document.status === 'approved';
                            return (
                                <article key={document.id} className="rounded-2xl border border-white/10 bg-surface/55 p-4 transition hover:border-white/15 md:p-5">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant={statusVariant(document.status)}>{SOURCE_STATUS_LABELS[document.status]}</Badge>
                                                <span className="text-xs text-zinc-500">{SOURCE_KIND_LABELS[document.kind]}</span>
                                                <span className="text-xs text-zinc-600">· {SOURCE_ORIGIN_LABELS[document.originType]}</span>
                                            </div>
                                            <h3 className="mt-2 truncate text-base font-semibold text-white">{document.title}</h3>
                                            <p className="mt-1 text-xs text-zinc-500">{formatDate(document.createdAt)} · {document.mimeType ?? '텍스트'}</p>
                                            {document.sourceUrl && (
                                                <a
                                                    href={document.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-primary/80 transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                >
                                                    <ExternalLink size={13} className="shrink-0" aria-hidden="true" />
                                                    <span className="truncate">원문 열기</span>
                                                </a>
                                            )}
                                            {document.extractionWarnings?.length > 0 && (
                                                <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-amber-300/80">
                                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                                                    <span>{document.extractionWarnings[0]}</span>
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {document.status === 'needs_review' && (
                                                <button
                                                    type="button"
                                                    onClick={() => void approveDocument(document.id)}
                                                    disabled={isBusy}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                                                >
                                                    <CheckCircle2 size={14} aria-hidden="true" />
                                                    검수 완료
                                                </button>
                                            )}
                                            {canSuggest && (
                                                <button
                                                    type="button"
                                                    onClick={() => void generateSuggestions(document.id)}
                                                    disabled={isBusy || suggestionLoadingId === document.id}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
                                                >
                                                    <Sparkles size={14} aria-hidden="true" />
                                                    {suggestionLoadingId === document.id ? '후보 만드는 중…' : '활동 후보 만들기'}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                aria-expanded={isExpanded}
                                                onClick={() => void toggleDetail(document.id)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5"
                                            >
                                                {isExpanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                                                본문 보기
                                            </button>
                                        </div>
                                    </div>

                                    {document.status === 'manual_input' && (
                                        <div className="mt-4 rounded-lg bg-amber-500/10 px-3 py-3 text-xs text-amber-200/80">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <p className="flex items-center gap-2"><Clock3 size={14} aria-hidden="true" />텍스트를 직접 입력하거나 다시 등록한 뒤 검수해 주세요.</p>
                                                <button type="button" onClick={() => void openManualEditor(document.id)} disabled={isBusy} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-300/20 px-2.5 py-1.5 font-semibold text-amber-200 transition hover:bg-amber-300/10 disabled:opacity-50">본문 보정</button>
                                            </div>
                                            {editingTextId === document.id && <div className="mt-3 border-t border-amber-300/10 pt-3">
                                                <label className="block text-xs text-amber-100/80" htmlFor={`manual-text-${document.id}`}>추출되지 않은 PDF의 내용을 붙여넣어 주세요.</label>
                                                <textarea id={`manual-text-${document.id}`} value={manualText} onChange={event => setManualText(event.target.value)} maxLength={500_000} className="mt-2 min-h-48 w-full resize-y rounded-lg border border-white/10 bg-background/60 px-3 py-2.5 text-sm leading-6 text-white outline-none focus:border-primary/60" />
                                                <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setEditingTextId(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/5"><X size={13} aria-hidden="true" /> 취소</button><button type="button" onClick={() => void saveManualText(document.id)} disabled={isBusy || !manualText.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"><Save size={13} aria-hidden="true" /> 저장 후 검수</button></div>
                                            </div>}
                                        </div>
                                    )}

                                    {suggestions.length > 0 && (
                                        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-primary">검수할 활동 후보</h4>
                                                    <p className="mt-1 text-xs leading-5 text-zinc-400">원문에서 찾은 후보입니다. 저장을 눌러 승인한 항목만 활동 라이브러리에 추가됩니다.</p>
                                                </div>
                                                <span className="text-xs text-zinc-500">{suggestions.length}개 대기 중</span>
                                            </div>
                                            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                                {suggestions.map(candidate => {
                                                    const suggestionKey = `${document.id}-${suggestionIdentity(candidate)}`;
                                                    const timeline = [candidate.startedAt, candidate.endedAt ?? (candidate.isCurrent ? '현재' : undefined)].filter(Boolean).join(' ~ ');
                                                    return (
                                                        <article key={suggestionKey} className="rounded-xl border border-white/10 bg-background/40 p-4">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <Badge variant="pending">{CAREER_KIND_LABELS[candidate.kind]}</Badge>
                                                                        {candidate.confidence != null && <span className="text-xs text-zinc-500">신뢰도 {Math.round(candidate.confidence * 100)}%</span>}
                                                                    </div>
                                                                    <h5 className="mt-2 text-sm font-semibold text-white">{candidate.title}</h5>
                                                                    <p className="mt-1 text-xs text-zinc-500">{[candidate.organization, candidate.role, timeline].filter(Boolean).join(' · ') || '원문 기반 활동 후보'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 space-y-1.5 text-sm leading-6 text-zinc-300">
                                                                {candidate.summary && <p>{candidate.summary}</p>}
                                                                {candidate.contributionNote && <p><span className="text-xs text-zinc-500">기여 </span>{candidate.contributionNote}</p>}
                                                                {candidate.action && <p><span className="text-xs text-zinc-500">행동 </span>{candidate.action}</p>}
                                                                {candidate.result && <p><span className="text-xs text-zinc-500">결과 </span>{candidate.result}</p>}
                                                                {candidate.learning && <p><span className="text-xs text-zinc-500">배운 점 </span>{candidate.learning}</p>}
                                                            </div>
                                                            {(candidate.metrics.length > 0 || candidate.skills.length > 0 || candidate.competencyTags.length > 0) && (
                                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                                    {candidate.metrics.map(metric => <span key={`${suggestionKey}-${metric.label}`} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{metric.label}: {metric.value}{metric.unit ? ` ${metric.unit}` : ''}</span>)}
                                                                    {candidate.skills.map(skill => <span key={`${suggestionKey}-skill-${skill}`} className="rounded-md bg-white/5 px-2 py-1 text-xs text-zinc-400">{skill}</span>)}
                                                                    {candidate.competencyTags.map(tag => <span key={`${suggestionKey}-tag-${tag}`} className="rounded-md bg-white/5 px-2 py-1 text-xs text-zinc-500">{tag}</span>)}
                                                                </div>
                                                            )}
                                                            <div className="mt-4 flex justify-end gap-2">
                                                                <button type="button" onClick={() => dismissSuggestion(document.id, candidate)} disabled={savingSuggestionKey === suggestionKey} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5 disabled:opacity-50"><X size={13} aria-hidden="true" /> 제외</button>
                                                                <button type="button" onClick={() => void saveSuggestion(document.id, candidate)} disabled={savingSuggestionKey === suggestionKey} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"><CheckCircle2 size={13} aria-hidden="true" /> {savingSuggestionKey === suggestionKey ? '저장 중…' : '활동으로 저장'}</button>
                                                            </div>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {isExpanded && (
                                        <div className="mt-4 border-t border-white/10 pt-4">
                                            {loadingId === document.id && !detail ? (
                                                <p className="text-sm text-zinc-500">본문을 불러오는 중입니다…</p>
                                            ) : detail ? (
                                                <div className="space-y-3">
                                                    <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                                                        {(detail.document.rawText ?? detail.fragments.map(fragment => fragment.content).join('\n\n')).slice(0, 4000)}
                                                    </p>
                                                    {(detail.document.rawText ?? '').length > 4000 && <p className="text-xs text-zinc-600">미리보기는 4,000자까지 표시합니다.</p>}
                                                </div>
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
