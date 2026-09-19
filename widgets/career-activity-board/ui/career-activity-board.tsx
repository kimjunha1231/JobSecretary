'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Download, FolderKanban, RefreshCw } from 'lucide-react';
import type { EvidenceRecordDetails } from '@/entities/evidence-record';
import { Badge } from '@/shared/ui';

const KIND_LABELS: Record<EvidenceRecordDetails['careerItem']['kind'], string> = {
    project: '프로젝트',
    work: '경력',
    education: '교육',
    award: '수상',
    leadership: '리더십',
    community: '커뮤니티',
    other: '기타',
};

function getRecordId(activity: EvidenceRecordDetails): string {
    return activity.record.id;
}

export function CareerActivityBoard() {
    const [activities, setActivities] = useState<EvidenceRecordDetails[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const selectionInitialized = useRef(false);

    const loadActivities = async (showSpinner = false) => {
        if (showSpinner) setIsRefreshing(true);
        setError(null);
        try {
            const response = await fetch('/api/evidence-records?limit=100', { cache: 'no-store' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '승인된 활동을 불러오지 못했습니다.');
            const nextActivities = Array.isArray(result) ? result as EvidenceRecordDetails[] : [];
            setActivities(nextActivities);
            const nextIds = nextActivities.map(getRecordId);
            setSelectedIds(current => {
                if (!selectionInitialized.current && nextIds.length > 0) {
                    selectionInitialized.current = true;
                    return nextIds;
                }
                const availableIds = new Set(nextIds);
                return current.filter(id => availableIds.has(id));
            });
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : '승인된 활동을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => { void loadActivities(); }, []);

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

    const hasSelection = selectedIds.length > 0;
    const selectedPosition = new Map(selectedIds.map((id, index) => [id, index] as const));

    return (
        <section className="mt-8 space-y-4" aria-labelledby="career-activity-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Approved activities</p>
                    <h2 id="career-activity-title" className="mt-1 text-2xl font-bold text-white">승인된 활동 근거</h2>
                    <p className="mt-1 text-sm text-zinc-400">검수 완료한 활동을 고르고 순서를 정해 이력서·포트폴리오 PDF로 출력할 수 있습니다.</p>
                </div>
                <button type="button" onClick={() => void loadActivities(true)} disabled={isRefreshing} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/5 disabled:opacity-50 sm:self-auto">
                    <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" /> 새로고침
                </button>
            </div>

            {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}

            {isLoading ? <div className="rounded-2xl border border-white/10 bg-surface/50 px-5 py-12 text-center text-sm text-zinc-500">승인된 활동을 불러오는 중입니다…</div> : activities.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center"><FolderKanban size={26} className="mx-auto mb-3 text-zinc-600" aria-hidden="true" /><p className="text-sm font-medium text-zinc-300">아직 승인된 활동이 없습니다.</p><p className="mt-1 text-xs leading-5 text-zinc-500">작성 작업대에서 활동을 직접 추가하거나 자료를 검수 완료해 주세요.</p></div> : <>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 md:p-5" aria-labelledby="career-export-title">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Export selection</p>
                            <h3 id="career-export-title" className="mt-1 text-base font-semibold text-white">PDF에 넣을 활동 선택</h3>
                            <p className="mt-1 text-xs leading-5 text-zinc-400" aria-live="polite">{selectedIds.length}개 선택 · 카드의 위/아래 버튼으로 출력 순서를 바꿀 수 있습니다.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setSelectedIds(activities.map(getRecordId))} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5">전체 선택</button>
                            <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5">선택 해제</button>
                            <a href={hasSelection ? buildExportHref('portfolio') : undefined} aria-disabled={!hasSelection} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${hasSelection ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'cursor-not-allowed bg-primary/20 text-primary/50'}`}>
                                <Download size={14} aria-hidden="true" /> 포트폴리오 PDF
                            </a>
                            <a href={hasSelection ? buildExportHref('resume') : undefined} aria-disabled={!hasSelection} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${hasSelection ? 'border-white/10 text-zinc-300 hover:bg-white/5' : 'cursor-not-allowed border-white/5 text-zinc-600'}`}>
                                <Download size={14} aria-hidden="true" /> 이력서 PDF
                            </a>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                    {activities.map(activity => {
                        const { careerItem, record } = activity;
                        const id = getRecordId(activity);
                        const position = selectedPosition.get(id);
                        const isSelected = position !== undefined;
                        return <article key={id} className={`rounded-2xl border bg-surface/55 p-4 transition md:p-5 ${isSelected ? 'border-primary/40' : 'border-white/10 hover:border-white/15'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    <label className="mt-0.5 flex shrink-0 cursor-pointer items-center" aria-label={`${careerItem.title} PDF 포함`}>
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(id)} className="size-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary/40" />
                                    </label>
                                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="success">검수 완료</Badge><span className="text-xs text-primary/80">{KIND_LABELS[careerItem.kind]}</span>{isSelected && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">출력 {position + 1}</span>}</div><h3 className="mt-2 text-base font-semibold text-white">{careerItem.title}</h3><p className="mt-1 text-xs text-zinc-500">{[careerItem.organization, careerItem.role].filter(Boolean).join(' · ') || '직접 입력한 활동'}</p></div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1"><span className="text-xs text-zinc-600">v{careerItem.version}</span>{isSelected && <><button type="button" onClick={() => moveSelected(id, -1)} disabled={position === 0} aria-label={`${careerItem.title} 출력 순서 위로`} className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"><ChevronUp size={15} aria-hidden="true" /></button><button type="button" onClick={() => moveSelected(id, 1)} disabled={position === selectedIds.length - 1} aria-label={`${careerItem.title} 출력 순서 아래로`} className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"><ChevronDown size={15} aria-hidden="true" /></button></>}</div>
                            </div>
                            <div className="mt-4 space-y-2 text-sm leading-6 text-zinc-300">{careerItem.summary && <p>{careerItem.summary}</p>}{careerItem.contributionNote && <p><span className="text-xs text-zinc-500">기여 </span>{careerItem.contributionNote}</p>}{record.action && <p><span className="text-xs text-zinc-500">행동 </span>{record.action}</p>}{record.result && <p><span className="text-xs text-zinc-500">결과 </span>{record.result}</p>}{record.learning && <p><span className="text-xs text-zinc-500">배운 점 </span>{record.learning}</p>}</div>
                            {(record.metrics.length > 0 || record.skills.length > 0) && <div className="mt-4 flex flex-wrap gap-1.5">{record.metrics.map(metric => <span key={`${record.id}-${metric.label}`} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{metric.label}: {metric.value}{metric.unit ? ` ${metric.unit}` : ''}</span>)}{record.skills.map(skill => <span key={`${record.id}-${skill}`} className="rounded-md bg-white/5 px-2 py-1 text-xs text-zinc-400">{skill}</span>)}</div>}
                        </article>;
                    })}
                </div>
            </>}
        </section>
    );
}
