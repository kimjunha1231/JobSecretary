'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Download, FolderKanban, History, Pencil, Plus, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import type { EvidenceRecordDetails, EvidenceRecordHistoryEntry } from '@/entities/evidence-record';
import { CAREER_ITEM_KIND_LABELS, type CareerItemKind } from '@/entities/career-item';
import { filterCareerActivities } from '@/features/career-search';
import { loadCareerActivityHistory, ManualCareerEntryForm, restoreCareerActivityRevision, saveManualCareerEntry, type ManualCareerEntryValues } from '@/features/manual-career-entry';
import { Badge } from '@/shared/ui';
import { trackProductEvent } from '@/shared/lib/product-analytics';

function getRecordId(activity: EvidenceRecordDetails): string {
    return activity.record.id;
}

function toManualEntryValues(activity: EvidenceRecordDetails): ManualCareerEntryValues {
    const { careerItem, record } = activity;
    return {
        title: careerItem.title,
        kind: careerItem.kind,
        organization: careerItem.organization ?? '',
        role: careerItem.role ?? '',
        startedAt: careerItem.startedAt ?? '',
        endedAt: careerItem.endedAt ?? '',
        isCurrent: careerItem.isCurrent,
        summary: careerItem.summary ?? '',
        action: record.action ?? '',
        result: record.result ?? '',
        learning: record.learning ?? '',
    };
}

function getHistoryStatusLabel(status: EvidenceRecordHistoryEntry['record']['status']): string {
    if (status === 'approved') return '현재 버전';
    if (status === 'superseded') return '이전 버전';
    if (status === 'archived') return '보관됨';
    return '검수 상태';
}

export function CareerActivityBoard() {
    const [activities, setActivities] = useState<EvidenceRecordDetails[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [kindFilter, setKindFilter] = useState<CareerItemKind | 'all'>('all');
    const [showArchived, setShowArchived] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [editingExpectedVersions, setEditingExpectedVersions] = useState<{
        recordId: string;
        recordVersion: number;
        careerItemVersion: number;
    } | null>(null);
    const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
    const [historyEntries, setHistoryEntries] = useState<EvidenceRecordHistoryEntry[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);
    const [isSavingManualEntry, setIsSavingManualEntry] = useState(false);
    const [changingStatusRecordId, setChangingStatusRecordId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const selectionInitialized = useRef(false);
    const historyRequestId = useRef(0);

    const loadActivities = async (showSpinner = false, archived = showArchived) => {
        if (showSpinner) setIsRefreshing(true);
        setError(null);
        try {
            const status = archived ? 'archived' : 'approved';
            const response = await fetch(`/api/evidence-records?limit=100&status=${status}`, { cache: 'no-store' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '활동을 불러오지 못했습니다.');
            const nextActivities = Array.isArray(result) ? result as EvidenceRecordDetails[] : [];
            setActivities(nextActivities);
            const nextIds = nextActivities.map(getRecordId);
            setSelectedIds(current => {
                if (!selectionInitialized.current) {
                    selectionInitialized.current = true;
                    return [];
                }
                const availableIds = new Set(nextIds);
                return current.filter(id => availableIds.has(id));
            });
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : '활동을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => { void loadActivities(); }, []);

    const createManualActivity = async (values: ManualCareerEntryValues): Promise<boolean> => {
        setIsSavingManualEntry(true);
        setError(null);
        setNotice(null);
        try {
            const createdActivity = await saveManualCareerEntry(values);
            setActivities(current => [createdActivity, ...current.filter(item => getRecordId(item) !== getRecordId(createdActivity))].slice(0, 100));
            setShowManualEntry(false);
            setNotice('활동을 저장했습니다.');
            return true;
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : '활동을 저장하지 못했습니다.');
            return false;
        } finally {
            setIsSavingManualEntry(false);
        }
    };

    const updateManualActivity = async (id: string, values: ManualCareerEntryValues): Promise<boolean> => {
        setIsSavingManualEntry(true);
        setError(null);
        setNotice(null);
        try {
            if (!editingExpectedVersions || editingExpectedVersions.recordId !== id) {
                throw new Error('수정 기준 버전을 찾지 못했습니다. 활동을 다시 열어 주세요.');
            }
            const updatedActivity = await saveManualCareerEntry(values, {
                recordId: id,
                expectedRecordVersion: editingExpectedVersions.recordVersion,
                expectedCareerVersion: editingExpectedVersions.careerItemVersion,
            });
            setActivities(current => current.map(item => getRecordId(item) === id ? updatedActivity : item));
            setSelectedIds(current => current.map(selectedId => selectedId === id ? getRecordId(updatedActivity) : selectedId));
            setEditingRecordId(null);
            setEditingExpectedVersions(null);
            setHistoryRecordId(null);
            setNotice('활동을 새 버전으로 수정했습니다. 원본 근거는 이전 버전에 보존했습니다.');
            return true;
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : '활동을 수정하지 못했습니다.');
            return false;
        } finally {
            setIsSavingManualEntry(false);
        }
    };

    const toggleActivityHistory = async (id: string) => {
        if (historyRecordId === id) {
            historyRequestId.current += 1;
            setHistoryRecordId(null);
            setHistoryEntries([]);
            setIsLoadingHistory(false);
            return;
        }

        const requestId = historyRequestId.current + 1;
        historyRequestId.current = requestId;
        setHistoryRecordId(id);
        setHistoryEntries([]);
        setIsLoadingHistory(true);
        setError(null);
        try {
            const entries = await loadCareerActivityHistory(id);
            if (historyRequestId.current === requestId) setHistoryEntries(entries);
        } catch (historyError) {
            if (historyRequestId.current === requestId) {
                setError(historyError instanceof Error ? historyError.message : '활동 버전을 불러오지 못했습니다.');
                setHistoryRecordId(null);
            }
        } finally {
            if (historyRequestId.current === requestId) setIsLoadingHistory(false);
        }
    };

    const restoreActivityRevision = async (currentRecordId: string, revisionId: string) => {
        setRestoringRevisionId(revisionId);
        setError(null);
        setNotice(null);
        try {
            const restoredActivity = await restoreCareerActivityRevision(currentRecordId, revisionId);
            const restoredRecordId = getRecordId(restoredActivity);
            setActivities(current => current.map(item => getRecordId(item) === currentRecordId ? restoredActivity : item));
            setSelectedIds(current => current.map(id => id === currentRecordId ? restoredRecordId : id));
            setHistoryRecordId(null);
            setHistoryEntries([]);
            setNotice('선택한 이전 내용을 새 활동 버전으로 복원했습니다.');
        } catch (restoreError) {
            setError(restoreError instanceof Error ? restoreError.message : '이전 활동 버전을 복원하지 못했습니다.');
        } finally {
            setRestoringRevisionId(null);
        }
    };

    const updateActivityArchiveStatus = async (id: string, archived: boolean) => {
        setChangingStatusRecordId(id);
        setError(null);
        setNotice(null);
        try {
            const response = await fetch(`/api/evidence-records/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: archived ? 'archived' : 'approved' }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '활동 상태를 변경하지 못했습니다.');
            setActivities(current => current.filter(item => getRecordId(item) !== id));
            setSelectedIds(current => current.filter(item => item !== id));
            setEditingRecordId(current => current === id ? null : current);
            setEditingExpectedVersions(current => current?.recordId === id ? null : current);
            setHistoryRecordId(current => current === id ? null : current);
            setNotice(archived ? '활동을 보관했습니다. 보관함에서 언제든 복원할 수 있습니다.' : '활동을 복원했습니다. 승인된 활동 목록에 다시 표시됩니다.');
        } catch (statusError) {
            setError(statusError instanceof Error ? statusError.message : '활동 상태를 변경하지 못했습니다.');
        } finally {
            setChangingStatusRecordId(null);
        }
    };

    const toggleArchivedView = () => {
        const nextArchivedView = !showArchived;
        setShowArchived(nextArchivedView);
        setShowManualEntry(false);
        setEditingRecordId(null);
        setEditingExpectedVersions(null);
        setHistoryRecordId(null);
        setHistoryEntries([]);
        setSelectedIds([]);
        setActivities([]);
        setIsLoading(true);
        void loadActivities(true, nextArchivedView);
    };

    const toggleSelected = (id: string) => {
        setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    };

    const moveSelected = (id: string, direction: -1 | 1) => {
        setSelectedIds(current => {
            const index = current.indexOf(id);
            const nextIndex = index + direction;
            if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
            const next = [...current];
            [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
            return next;
        });
    };

    const buildExportHref = (format: 'resume' | 'portfolio') => {
        const params = new URLSearchParams({ format, ids: selectedIds.join(',') });
        return `/api/career/export?${params.toString()}`;
    };

    const filteredActivities = useMemo(
        () => filterCareerActivities(activities, { query: searchQuery, kind: kindFilter }),
        [activities, kindFilter, searchQuery],
    );
    const hasSelection = selectedIds.length > 0;
    const selectedPosition = new Map(selectedIds.map((id, index) => [id, index] as const));
    const selectVisible = () => {
        const visibleIds = filteredActivities.map(getRecordId);
        setSelectedIds(current => [...current, ...visibleIds.filter(id => !current.includes(id))]);
    };

    return (
        <section className="mt-8 space-y-4" aria-labelledby="career-activity-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">{showArchived ? 'Archived activities' : 'Approved activities'}</p>
                    <h2 id="career-activity-title" className="mt-1 text-2xl font-bold text-white">{showArchived ? '보관된 활동' : '승인된 활동 근거'}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{showArchived ? '보관된 활동은 작성 자료와 PDF에서 제외됩니다. 필요하면 복원할 수 있습니다.' : '검수 완료한 활동을 고르고 순서를 정해 이력서·포트폴리오 PDF로 출력할 수 있습니다.'}</p>
                </div>
                <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                    {!showArchived && <button type="button" onClick={() => { setEditingRecordId(null); setEditingExpectedVersions(null); setShowManualEntry(current => !current); }} aria-expanded={showManualEntry} aria-controls={showManualEntry ? 'career-manual-entry-form' : undefined} className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-primary/40">
                        <Plus size={15} aria-hidden="true" /> {showManualEntry ? '입력 닫기' : '활동 직접 추가'}
                    </button>}
                    <button type="button" onClick={toggleArchivedView} aria-pressed={showArchived} disabled={isLoading || isRefreshing || showManualEntry || editingRecordId !== null || isSavingManualEntry || changingStatusRecordId !== null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50">
                        {showArchived ? '승인된 활동 보기' : '보관함 보기'}
                    </button>
                    <button type="button" onClick={() => void loadActivities(true)} disabled={isLoading || isRefreshing || isSavingManualEntry || changingStatusRecordId !== null || editingRecordId !== null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50" title={editingRecordId !== null ? '편집 중인 내용을 보호하기 위해 잠시 사용할 수 없습니다.' : undefined}>
                        <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" /> 새로고침
                    </button>
                </div>
            </div>

            {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}
            {editingRecordId !== null && <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary/90">편집 중인 내용을 보호하기 위해 목록 새로고침을 잠시 막았습니다. 활동을 저장하거나 취소한 뒤 새로고침해 주세요.</p>}
            {notice && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200">{notice}</p>}

            {showManualEntry && <ManualCareerEntryForm
                formId="career-manual-entry-form"
                isSaving={isSavingManualEntry}
                onCancel={() => setShowManualEntry(false)}
                onSubmit={createManualActivity}
            />}

            {isLoading ? <div className="rounded-2xl border border-white/10 bg-surface/50 px-5 py-12 text-center text-sm text-zinc-500">{showArchived ? '보관된 활동' : '승인된 활동'}을 불러오는 중입니다…</div> : activities.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center"><FolderKanban size={26} className="mx-auto mb-3 text-zinc-600" aria-hidden="true" /><p className="text-sm font-medium text-zinc-300">{showArchived ? '보관된 활동이 없습니다.' : '아직 승인된 활동이 없습니다.'}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{showArchived ? '활동 목록에서 항목을 보관하면 여기에 나타나며, 필요할 때 복원할 수 있습니다.' : '작성 작업대에서 활동을 직접 추가하거나 자료를 검수 완료해 주세요.'}</p></div> : <>
                <div role="region" aria-label="활동 검색 및 필터" className="rounded-2xl border border-white/10 bg-surface/45 p-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
                        <label className="space-y-1.5 text-xs text-zinc-400">
                            <span>활동 검색</span>
                            <span className="relative block">
                                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={event => setSearchQuery(event.target.value)}
                                    placeholder="프로젝트, 조직, 기술, 성과 검색"
                                    aria-label="승인된 활동 검색"
                                    className="w-full rounded-lg border border-white/10 bg-background px-9 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                                />
                            </span>
                        </label>
                        <label className="space-y-1.5 text-xs text-zinc-400">
                            <span>활동 종류</span>
                            <select
                                value={kindFilter}
                                onChange={event => setKindFilter(event.target.value as CareerItemKind | 'all')}
                                aria-label="활동 종류 필터"
                                className="w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="all">전체 종류</option>
                                {Object.entries(CAREER_ITEM_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </label>
                        <button
                            type="button"
                            onClick={() => { setSearchQuery(''); setKindFilter('all'); }}
                            disabled={!searchQuery && kindFilter === 'all'}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <X size={14} aria-hidden="true" /> 필터 초기화
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500" aria-live="polite">
                        <span>{filteredActivities.length}개 표시 · 전체 {activities.length}개</span>
                        {!showArchived && <button type="button" onClick={selectVisible} disabled={filteredActivities.length === 0} className="rounded-md border border-primary/20 px-2.5 py-1.5 text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40">검색 결과 선택</button>}
                    </div>
                </div>
                {!showArchived && <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 md:p-5" aria-labelledby="career-export-title">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Export selection</p>
                            <h3 id="career-export-title" className="mt-1 text-base font-semibold text-white">PDF에 넣을 활동 선택</h3>
                            <p className="mt-1 text-xs leading-5 text-zinc-400" aria-live="polite">{selectedIds.length}개 선택 · 카드의 위/아래 버튼으로 출력 순서를 바꿀 수 있습니다.</p>
                            <p className="mt-1 text-xs leading-5 text-zinc-500">이력서는 핵심 역할과 성과를 요약하고, 포트폴리오는 활동의 배경과 과정을 자세히 담습니다.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setSelectedIds(activities.map(getRecordId))} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5">전체 선택</button>
                            <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5">선택 해제</button>
                            <a href={hasSelection ? buildExportHref('portfolio') : undefined} onClick={() => { if (hasSelection) trackProductEvent({ name: 'career_exported', properties: { format: 'portfolio' } }); }} aria-disabled={!hasSelection} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${hasSelection ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'cursor-not-allowed bg-primary/20 text-primary/50'}`}>
                                <Download size={14} aria-hidden="true" /> 포트폴리오 PDF
                            </a>
                            <a href={hasSelection ? buildExportHref('resume') : undefined} onClick={() => { if (hasSelection) trackProductEvent({ name: 'career_exported', properties: { format: 'resume' } }); }} aria-disabled={!hasSelection} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${hasSelection ? 'border-white/10 text-zinc-300 hover:bg-white/5' : 'cursor-not-allowed border-white/5 text-zinc-600'}`}>
                                <Download size={14} aria-hidden="true" /> 이력서 PDF
                            </a>
                        </div>
                    </div>
                </div>}

                <div className="grid gap-3 lg:grid-cols-2">
                    {filteredActivities.map(activity => {
                        const { careerItem, record } = activity;
                        const id = getRecordId(activity);
                        const position = selectedPosition.get(id);
                        const isSelected = position !== undefined;
                        return <article key={id} className={`rounded-2xl border bg-surface/55 p-4 transition md:p-5 ${isSelected ? 'border-primary/40' : 'border-white/10 hover:border-white/15'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    {!showArchived && <label className="mt-0.5 flex shrink-0 cursor-pointer items-center" aria-label={`${careerItem.title} PDF 포함`}>
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(id)} className="size-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary/40" />
                                    </label>}
                                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant={showArchived ? 'secondary' : 'success'}>{showArchived ? '보관됨' : '검수 완료'}</Badge><span className="text-xs text-primary/80">{CAREER_ITEM_KIND_LABELS[careerItem.kind]}</span>{isSelected && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">출력 {position + 1}</span>}</div><h3 className="mt-2 text-base font-semibold text-white">{careerItem.title}</h3><p className="mt-1 text-xs text-zinc-500">{[careerItem.organization, careerItem.role].filter(Boolean).join(' · ') || '직접 입력한 활동'}</p></div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1"><span className="text-xs text-zinc-600">v{careerItem.version}</span>{!showArchived && isSelected && <><button type="button" onClick={() => moveSelected(id, -1)} disabled={position === 0} aria-label={`${careerItem.title} 출력 순서 위로`} className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"><ChevronUp size={15} aria-hidden="true" /></button><button type="button" onClick={() => moveSelected(id, 1)} disabled={position === selectedIds.length - 1} aria-label={`${careerItem.title} 출력 순서 아래로`} className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"><ChevronDown size={15} aria-hidden="true" /></button></>}</div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                {!showArchived && (activity.sourceFragmentCount && activity.sourceFragmentCount > 0
                                    ? <p className="text-[11px] text-zinc-500">원본 근거 {activity.sourceFragmentCount}개 연결 · 수정하면 인용은 이전 버전에 남고 새 버전에는 복사되지 않습니다.</p>
                                    : activity.sourceFragmentCount === 0
                                        ? <span className="text-[11px] text-zinc-600">연결된 원본 근거 없음</span>
                                        : <span className="text-[11px] text-zinc-600">원본 연결 여부 확인 중</span>)}
                                <div className="flex flex-wrap gap-2">
                                    {!showArchived && <button type="button" onClick={() => { setShowManualEntry(false); setHistoryRecordId(null); setEditingExpectedVersions({ recordId: id, recordVersion: record.version, careerItemVersion: careerItem.version }); setEditingRecordId(id); setError(null); setNotice(null); }} aria-label={`${careerItem.title} 활동 수정`} aria-expanded={editingRecordId === id} aria-controls={editingRecordId === id ? `career-entry-edit-${id}` : undefined} disabled={isLoading || isRefreshing || isSavingManualEntry || changingStatusRecordId !== null || restoringRevisionId !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"><Pencil size={13} aria-hidden="true" /> 수정</button>}
                                    <button type="button" onClick={() => void toggleActivityHistory(id)} aria-label={`${careerItem.title} 버전 기록`} aria-expanded={historyRecordId === id} aria-controls={historyRecordId === id ? `career-history-${id}` : undefined} disabled={isSavingManualEntry || changingStatusRecordId !== null || restoringRevisionId !== null || editingRecordId === id} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"><History size={13} aria-hidden="true" /> 버전 기록</button>
                                </div>
                                <button type="button" onClick={() => void updateActivityArchiveStatus(id, !showArchived)} aria-label={`${careerItem.title} 활동 ${showArchived ? '복원' : '보관'}`} disabled={isLoading || isRefreshing || isSavingManualEntry || changingStatusRecordId !== null || editingRecordId === id} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50">
                                    {changingStatusRecordId === id ? '처리 중…' : showArchived ? '복원' : '보관'}
                                </button>
                            </div>
                            <div className="mt-4 space-y-2 text-sm leading-6 text-zinc-300">{careerItem.summary && <p>{careerItem.summary}</p>}{careerItem.contributionNote && <p><span className="text-xs text-zinc-500">기여 </span>{careerItem.contributionNote}</p>}{record.action && <p><span className="text-xs text-zinc-500">행동 </span>{record.action}</p>}{record.result && <p><span className="text-xs text-zinc-500">결과 </span>{record.result}</p>}{record.learning && <p><span className="text-xs text-zinc-500">배운 점 </span>{record.learning}</p>}</div>
                            {(record.metrics.length > 0 || record.skills.length > 0) && <div className="mt-4 flex flex-wrap gap-1.5">{record.metrics.map(metric => <span key={`${record.id}-${metric.label}`} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{metric.label}: {metric.value}{metric.unit ? ` ${metric.unit}` : ''}</span>)}{record.skills.map(skill => <span key={`${record.id}-${skill}`} className="rounded-md bg-white/5 px-2 py-1 text-xs text-zinc-400">{skill}</span>)}</div>}
                            {editingRecordId === id && <ManualCareerEntryForm
                                formId={`career-entry-edit-${id}`}
                                initialValues={toManualEntryValues(activity)}
                                isSaving={isSavingManualEntry}
                                mode="edit"
                                onCancel={() => { setEditingRecordId(null); setEditingExpectedVersions(null); }}
                                onSubmit={values => updateManualActivity(id, values)}
                            />}
                            {historyRecordId === id && <section id={`career-history-${id}`} aria-label={`${careerItem.title} 활동 버전 기록`} className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-xs font-semibold text-zinc-200">활동 버전 기록</h3>
                                    <span className="text-[11px] text-zinc-500">원본 인용 문구는 이 목록에 표시하지 않습니다.</span>
                                </div>
                                {isLoadingHistory ? <p role="status" className="mt-3 text-xs text-zinc-500">버전 기록을 불러오는 중입니다…</p>
                                    : historyEntries.length === 0 ? <p className="mt-3 text-xs text-zinc-500">표시할 버전이 없습니다.</p>
                                        : <ol className="mt-3 space-y-2">
                                            {historyEntries.map(entry => {
                                                const isRestorable = entry.record.status === 'superseded' && entry.careerItemSnapshot !== null && !showArchived;
                                                return <li key={entry.record.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                                            <span className="font-semibold text-zinc-200">v{entry.record.revisionNumber}</span>
                                                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-zinc-400">{getHistoryStatusLabel(entry.record.status)}</span>
                                                            <time dateTime={entry.record.createdAt} className="text-zinc-500">{entry.record.createdAt.slice(0, 10)}</time>
                                                        </div>
                                                        <span className="text-[11px] text-zinc-500">원본 근거 {entry.sourceFragmentCount}개</span>
                                                    </div>
                                                    <p className="mt-2 text-xs font-medium text-zinc-300">{entry.careerItemSnapshot?.title ?? '이 버전의 활동 정보 스냅샷은 저장되어 있지 않습니다.'}</p>
                                                    <div className="mt-1 space-y-1 text-xs leading-5 text-zinc-400">
                                                        {entry.record.action && <p><span className="text-zinc-500">행동 </span>{entry.record.action}</p>}
                                                        {entry.record.result && <p><span className="text-zinc-500">결과 </span>{entry.record.result}</p>}
                                                        {entry.record.learning && <p><span className="text-zinc-500">배운 점 </span>{entry.record.learning}</p>}
                                                    </div>
                                                    {isRestorable && <button type="button" onClick={() => void restoreActivityRevision(id, entry.record.id)} disabled={restoringRevisionId !== null || isSavingManualEntry || changingStatusRecordId !== null} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/20 px-2.5 py-1.5 text-xs text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50">
                                                        <RotateCcw size={13} aria-hidden="true" /> {restoringRevisionId === entry.record.id ? '복원 중…' : `v${entry.record.revisionNumber} 버전으로 복원`}
                                                    </button>}
                                                </li>;
                                            })}
                                        </ol>}
                            </section>}
                        </article>;
                    })}
                </div>
                {filteredActivities.length === 0 && <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-10 text-center"><Search size={24} className="mx-auto mb-2 text-zinc-600" aria-hidden="true" /><p className="text-sm font-medium text-zinc-300">조건에 맞는 활동이 없습니다.</p><p className="mt-1 text-xs text-zinc-500">검색어 또는 활동 종류 필터를 바꿔 보세요.</p></div>}
            </>}
        </section>
    );
}
