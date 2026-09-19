'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, FolderKanban, RefreshCw } from 'lucide-react';
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

export function CareerActivityBoard() {
    const [activities, setActivities] = useState<EvidenceRecordDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadActivities = async (showSpinner = false) => {
        if (showSpinner) setIsRefreshing(true);
        setError(null);
        try {
            const response = await fetch('/api/evidence-records?limit=100', { cache: 'no-store' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '승인된 활동을 불러오지 못했습니다.');
            setActivities(Array.isArray(result) ? result as EvidenceRecordDetails[] : []);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : '승인된 활동을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => { void loadActivities(); }, []);

    return (
        <section className="mt-8 space-y-4" aria-labelledby="career-activity-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Approved activities</p>
                    <h2 id="career-activity-title" className="mt-1 text-2xl font-bold text-white">승인된 활동 근거</h2>
                    <p className="mt-1 text-sm text-zinc-400">검수 완료한 활동만 작성 작업대와 이력서·포트폴리오 PDF에 사용됩니다.</p>
                </div>
                <button type="button" onClick={() => void loadActivities(true)} disabled={isRefreshing} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/5 disabled:opacity-50 sm:self-auto">
                    <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" /> 새로고침
                </button>
            </div>

            {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}

            {isLoading ? <div className="rounded-2xl border border-white/10 bg-surface/50 px-5 py-12 text-center text-sm text-zinc-500">승인된 활동을 불러오는 중입니다…</div> : activities.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center"><FolderKanban size={26} className="mx-auto mb-3 text-zinc-600" aria-hidden="true" /><p className="text-sm font-medium text-zinc-300">아직 승인된 활동이 없습니다.</p><p className="mt-1 text-xs leading-5 text-zinc-500">작성 작업대에서 활동을 직접 추가하거나 자료를 검수 완료해 주세요.</p></div> : <div className="grid gap-3 lg:grid-cols-2">{activities.map(({ careerItem, record }) => <article key={record.id} className="rounded-2xl border border-white/10 bg-surface/55 p-4 transition hover:border-white/15 md:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="success">검수 완료</Badge><span className="text-xs text-primary/80">{KIND_LABELS[careerItem.kind]}</span></div><h3 className="mt-2 text-base font-semibold text-white">{careerItem.title}</h3><p className="mt-1 text-xs text-zinc-500">{[careerItem.organization, careerItem.role].filter(Boolean).join(' · ') || '직접 입력한 활동'}</p></div><span className="shrink-0 text-xs text-zinc-600">v{careerItem.version}</span></div><div className="mt-4 space-y-2 text-sm leading-6 text-zinc-300">{careerItem.summary && <p>{careerItem.summary}</p>}{careerItem.contributionNote && <p><span className="text-xs text-zinc-500">기여 </span>{careerItem.contributionNote}</p>}{record.action && <p><span className="text-xs text-zinc-500">행동 </span>{record.action}</p>}{record.result && <p><span className="text-xs text-zinc-500">결과 </span>{record.result}</p>}{record.learning && <p><span className="text-xs text-zinc-500">배운 점 </span>{record.learning}</p>}</div>{(record.metrics.length > 0 || record.skills.length > 0) && <div className="mt-4 flex flex-wrap gap-1.5">{record.metrics.map(metric => <span key={`${record.id}-${metric.label}`} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{metric.label}: {metric.value}{metric.unit ? ` ${metric.unit}` : ''}</span>)}{record.skills.map(skill => <span key={`${record.id}-${skill}`} className="rounded-md bg-white/5 px-2 py-1 text-xs text-zinc-400">{skill}</span>)}</div>}</article>)}</div>}
        </section>
    );
}
