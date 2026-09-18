'use client';

import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    FileText,
    RefreshCw,
} from 'lucide-react';
import { Badge } from '@/shared/ui';
import type { SourceDocument, SourceFragment } from '@/entities/source-document';
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

export function SourceLibraryBoard() {
    const [documents, setDocuments] = useState<SourceDocument[]>([]);
    const [details, setDetails] = useState<Record<string, SourceDetail>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadingId, setLoadingId] = useState<string | null>(null);
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
                                        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200/80">
                                            <Clock3 size={14} aria-hidden="true" />
                                            텍스트를 직접 입력하거나 다시 등록한 뒤 검수해 주세요.
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
