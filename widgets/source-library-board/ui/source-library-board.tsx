'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    Download,
    ExternalLink,
    FileText,
    Pencil,
    RefreshCw,
    Search,
    Save,
    Sparkles,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/shared/ui';
import type { SourceDocument, SourceFragment } from '@/entities/source-document';
import type { CareerCandidate } from '@/features/career-extraction';
import { filterSourceDocuments } from '@/features/source-search';
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
    const [ocrLoadingId, setOcrLoadingId] = useState<string | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [manualText, setManualText] = useState('');
    const [suggestionsByDocument, setSuggestionsByDocument] = useState<Record<string, CareerCandidate[]>>({});
    const [suggestionLoadingId, setSuggestionLoadingId] = useState<string | null>(null);
    const [savingSuggestionKey, setSavingSuggestionKey] = useState<string | null>(null);
    const [editingSuggestion, setEditingSuggestion] = useState<{ documentId: string; identity: string; value: CareerCandidate } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [kindFilter, setKindFilter] = useState<SourceDocument['kind'] | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<SourceDocument['status'] | 'all'>('all');
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

    const filteredDocuments = useMemo(
        () => filterSourceDocuments(documents, { query: searchQuery, kind: kindFilter, status: statusFilter }),
        [documents, kindFilter, searchQuery, statusFilter],
    );

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

    const runOcr = async (id: string) => {
        setOcrLoadingId(id);
        setError(null);
        try {
            const response = await fetch(`/api/source-documents/${id}/ocr`, { method: 'POST' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'PDF OCR에 실패했습니다.');
            const document = result.document as SourceDocument;
            setDocuments(previous => previous.map(item => item.id === id ? document : item));
            setDetails(previous => previous[id] ? { ...previous, [id]: { ...previous[id], document } } : previous);
            toast.success('AI OCR 결과를 저장했습니다. 본문을 확인하고 검수 완료를 눌러 주세요.');
        } catch (ocrError) {
            setError(ocrError instanceof Error ? ocrError.message : 'PDF OCR에 실패했습니다.');
        } finally {
            setOcrLoadingId(null);
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

    const beginSuggestionEdit = (documentId: string, candidate: CareerCandidate) => {
        setEditingSuggestion({
            documentId,
            identity: suggestionIdentity(candidate),
            value: {
                ...candidate,
                metrics: [...candidate.metrics],
                skills: [...candidate.skills],
                competencyTags: [...candidate.competencyTags],
                sourceFragmentIds: [...candidate.sourceFragmentIds],
            },
        });
        setError(null);
    };

    const updateEditingSuggestion = (field: 'title' | 'organization' | 'role' | 'summary' | 'contributionNote' | 'action' | 'result' | 'learning', value: string) => {
        setEditingSuggestion(previous => previous ? {
            ...previous,
            value: { ...previous.value, [field]: value },
        } : previous);
    };

    const applySuggestionEdit = () => {
        if (!editingSuggestion) return;
        const value = { ...editingSuggestion.value, title: editingSuggestion.value.title.trim() };
        if (!value.title) {
            setError('활동 제목을 입력해 주세요.');
            return;
        }
        const currentCandidates = suggestionsByDocument[editingSuggestion.documentId] ?? [];
        if (currentCandidates.some(candidate => suggestionIdentity(candidate) !== editingSuggestion.identity && suggestionIdentity(candidate) === suggestionIdentity(value))) {
            setError('같은 제목의 활동 후보가 이미 있습니다. 제목을 다르게 입력해 주세요.');
            return;
        }
        setSuggestionsByDocument(previous => ({
            ...previous,
            [editingSuggestion.documentId]: (previous[editingSuggestion.documentId] ?? []).map(candidate => suggestionIdentity(candidate) === editingSuggestion.identity ? value : candidate),
        }));
        setEditingSuggestion(null);
        toast.success('활동 후보를 수정했습니다. 저장 전에 다시 확인해 주세요.');
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
                    <>
                        <div role="region" aria-label="등록 자료 검색 및 필터" className="rounded-2xl border border-white/10 bg-surface/45 p-4">
                            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto] lg:items-end">
                                <label className="space-y-1.5 text-xs text-zinc-400">
                                    <span>자료 검색</span>
                                    <span className="relative block">
                                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
                                        <input
                                            type="search"
                                            value={searchQuery}
                                            onChange={event => setSearchQuery(event.target.value)}
                                            placeholder="제목, URL, 추출 경고 검색"
                                            aria-label="등록 자료 검색"
                                            className="w-full rounded-lg border border-white/10 bg-background px-9 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                                        />
                                    </span>
                                </label>
                                <label className="space-y-1.5 text-xs text-zinc-400">
                                    <span>자료 종류</span>
                                    <select value={kindFilter} onChange={event => setKindFilter(event.target.value as SourceDocument['kind'] | 'all')} aria-label="자료 종류 필터" className="w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20">
                                        <option value="all">전체 종류</option>
                                        {Object.entries(SOURCE_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                </label>
                                <label className="space-y-1.5 text-xs text-zinc-400">
                                    <span>검수 상태</span>
                                    <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as SourceDocument['status'] | 'all')} aria-label="검수 상태 필터" className="w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20">
                                        <option value="all">전체 상태</option>
                                        {Object.entries(SOURCE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                </label>
                                <button type="button" onClick={() => { setSearchQuery(''); setKindFilter('all'); setStatusFilter('all'); }} disabled={!searchQuery && kindFilter === 'all' && statusFilter === 'all'} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">
                                    <X size={14} aria-hidden="true" /> 필터 초기화
                                </button>
                            </div>
                            <p className="mt-3 text-xs text-zinc-500" aria-live="polite">{filteredDocuments.length}개 표시 · 전체 {documents.length}개</p>
                        </div>
                        <div className="grid gap-3">
                        {filteredDocuments.map(document => {
                            const detail = details[document.id];
                            const isExpanded = expandedId === document.id;
                            const isBusy = loadingId === document.id || ocrLoadingId === document.id;
                            const suggestions = suggestionsByDocument[document.id] ?? [];
                            const canSuggest = ['resume', 'portfolio', 'cover_letter'].includes(document.kind) && document.status === 'approved';
                            const canRunOcr = document.status === 'manual_input' && document.mimeType === 'application/pdf' && Boolean(document.storagePath);
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
                                            {document.storagePath && (
                                                <a
                                                    href={`/api/source-documents/${document.id}/original`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary/80 transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                >
                                                    <Download size={13} aria-hidden="true" />
                                                    원본 파일 열기
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
                                                <p className="flex items-center gap-2"><Clock3 size={14} aria-hidden="true" />본문을 읽지 못했습니다. AI OCR 또는 직접 보정 후 검수해 주세요.</p>
                                                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                                    {canRunOcr && <button type="button" onClick={() => void runOcr(document.id)} disabled={isBusy} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50">{ocrLoadingId === document.id ? 'OCR 처리 중…' : 'AI OCR 실행'}</button>}
                                                    <button type="button" onClick={() => void openManualEditor(document.id)} disabled={isBusy} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-300/20 px-2.5 py-1.5 font-semibold text-amber-200 transition hover:bg-amber-300/10 disabled:opacity-50">본문 보정</button>
                                                </div>
                                            </div>
                                            {canRunOcr && <p className="mt-2 leading-5 text-amber-100/60">AI OCR을 실행하면 원본 PDF가 Gemini로 전송됩니다. 결과는 반드시 원본과 대조해 주세요.</p>}
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
                                                            {editingSuggestion?.documentId === document.id && editingSuggestion.identity === suggestionIdentity(candidate) ? (
                                                                <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-background/50 p-3">
                                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                                        <label className="text-xs text-zinc-400">활동 제목<input value={editingSuggestion.value.title} onChange={event => updateEditingSuggestion('title', event.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-background/70 px-2.5 py-2 text-sm text-white outline-none focus:border-primary/60" /></label>
                                                                        <label className="text-xs text-zinc-400">조직 / 회사<input value={editingSuggestion.value.organization ?? ''} onChange={event => updateEditingSuggestion('organization', event.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-background/70 px-2.5 py-2 text-sm text-white outline-none focus:border-primary/60" /></label>
                                                                        <label className="text-xs text-zinc-400">역할<input value={editingSuggestion.value.role ?? ''} onChange={event => updateEditingSuggestion('role', event.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-background/70 px-2.5 py-2 text-sm text-white outline-none focus:border-primary/60" /></label>
                                                                    </div>
                                                                    <label className="block text-xs text-zinc-400">요약<textarea value={editingSuggestion.value.summary ?? ''} onChange={event => updateEditingSuggestion('summary', event.target.value)} rows={2} className="mt-1 w-full resize-y rounded-md border border-white/10 bg-background/70 px-2.5 py-2 text-sm leading-6 text-white outline-none focus:border-primary/60" /></label>
                                                                    <label className="block text-xs text-zinc-400">내 기여<textarea value={editingSuggestion.value.contributionNote ?? ''} onChange={event => updateEditingSuggestion('contributionNote', event.target.value)} rows={2} className="mt-1 w-full resize-y rounded-md border border-white/10 bg-background/70 px-2.5 py-2 text-sm leading-6 text-white outline-none focus:border-primary/60" /></label>
                                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                                        <label className="text-xs text-zinc-400">행동<textarea value={editingSuggestion.value.action ?? ''} onChange={event => updateEditingSuggestion('action', event.target.value)} rows={3} className="mt-1 w-full resize-y rounded-md border border-white/10 bg-background/70 px-2.5 py-2 text-sm leading-6 text-white outline-none focus:border-primary/60" /></label>
                                                                        <label className="text-xs text-zinc-400">결과<textarea value={editingSuggestion.value.result ?? ''} onChange={event => updateEditingSuggestion('result', event.target.value)} rows={3} className="mt-1 w-full resize-y rounded-md border border-white/10 bg-background/70 px-2.5 py-2 text-sm leading-6 text-white outline-none focus:border-primary/60" /></label>
                                                                    </div>
                                                                    <label className="block text-xs text-zinc-400">배운 점<textarea value={editingSuggestion.value.learning ?? ''} onChange={event => updateEditingSuggestion('learning', event.target.value)} rows={2} className="mt-1 w-full resize-y rounded-md border border-white/10 bg-background/70 px-2.5 py-2 text-sm leading-6 text-white outline-none focus:border-primary/60" /></label>
                                                                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingSuggestion(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5"><X size={13} aria-hidden="true" /> 취소</button><button type="button" onClick={applySuggestionEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"><Save size={13} aria-hidden="true" /> 수정 반영</button></div>
                                                                </div>
                                                            ) : (
                                                                <div className="mt-3 space-y-1.5 text-sm leading-6 text-zinc-300">
                                                                    {candidate.summary && <p>{candidate.summary}</p>}
                                                                    {candidate.contributionNote && <p><span className="text-xs text-zinc-500">기여 </span>{candidate.contributionNote}</p>}
                                                                    {candidate.action && <p><span className="text-xs text-zinc-500">행동 </span>{candidate.action}</p>}
                                                                    {candidate.result && <p><span className="text-xs text-zinc-500">결과 </span>{candidate.result}</p>}
                                                                    {candidate.learning && <p><span className="text-xs text-zinc-500">배운 점 </span>{candidate.learning}</p>}
                                                                </div>
                                                            )}
                                                            {(candidate.metrics.length > 0 || candidate.skills.length > 0 || candidate.competencyTags.length > 0) && (
                                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                                    {candidate.metrics.map(metric => <span key={`${suggestionKey}-${metric.label}`} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{metric.label}: {metric.value}{metric.unit ? ` ${metric.unit}` : ''}</span>)}
                                                                    {candidate.skills.map(skill => <span key={`${suggestionKey}-skill-${skill}`} className="rounded-md bg-white/5 px-2 py-1 text-xs text-zinc-400">{skill}</span>)}
                                                                    {candidate.competencyTags.map(tag => <span key={`${suggestionKey}-tag-${tag}`} className="rounded-md bg-white/5 px-2 py-1 text-xs text-zinc-500">{tag}</span>)}
                                                                </div>
                                                            )}
                                                            {!(editingSuggestion?.documentId === document.id && editingSuggestion.identity === suggestionIdentity(candidate)) && <div className="mt-4 flex justify-end gap-2">
                                                                <button type="button" onClick={() => beginSuggestionEdit(document.id, candidate)} disabled={savingSuggestionKey === suggestionKey} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5 disabled:opacity-50"><Pencil size={13} aria-hidden="true" /> 편집</button>
                                                                <button type="button" onClick={() => dismissSuggestion(document.id, candidate)} disabled={savingSuggestionKey === suggestionKey} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5 disabled:opacity-50"><X size={13} aria-hidden="true" /> 제외</button>
                                                                <button type="button" onClick={() => void saveSuggestion(document.id, candidate)} disabled={savingSuggestionKey === suggestionKey} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"><CheckCircle2 size={13} aria-hidden="true" /> {savingSuggestionKey === suggestionKey ? '저장 중…' : '활동으로 저장'}</button>
                                                            </div>}
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
                        {filteredDocuments.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-10 text-center"><Search size={24} className="mx-auto mb-2 text-zinc-600" aria-hidden="true" /><p className="text-sm font-medium text-zinc-300">조건에 맞는 자료가 없습니다.</p><p className="mt-1 text-xs text-zinc-500">검색어 또는 검수 필터를 바꿔 보세요.</p></div>}
                    </>
                )}
            </section>
        </div>
    );
}
