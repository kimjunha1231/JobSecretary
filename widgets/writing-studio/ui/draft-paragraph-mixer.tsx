'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Loader2, Merge, Sparkles } from 'lucide-react';
import type { DraftCandidate } from '@/entities/draft-candidate';
import { Badge } from '@/shared/ui';

type ParagraphChoice = { position: number; sourceDraftId: string; text: string };

function splitParagraphs(value: string): string[] {
    return value.split(/\n\s*\n+/).map(paragraph => paragraph.trim()).filter(Boolean);
}

export function DraftParagraphMixer({
    drafts,
    charLimit,
    busy,
    onSelectDraft,
    onMerge,
}: {
    drafts: DraftCandidate[];
    charLimit: number;
    busy: string | null;
    onSelectDraft: (draftId: string) => void;
    onMerge: (paragraphs: ParagraphChoice[]) => void;
}) {
    const paragraphRows = useMemo(() => {
        const maxParagraphs = drafts.reduce((max, draft) => Math.max(max, splitParagraphs(draft.content).length), 0);
        return Array.from({ length: maxParagraphs }, (_, position) => ({
            position,
            options: drafts.flatMap(draft => {
                const text = splitParagraphs(draft.content)[position];
                return text ? [{ draft, text }] : [];
            }),
        }));
    }, [drafts]);
    const [choices, setChoices] = useState<Record<number, ParagraphChoice>>({});

    useEffect(() => {
        setChoices(current => paragraphRows.reduce<Record<number, ParagraphChoice>>((next, row) => {
            const existing = current[row.position];
            const stillAvailable = existing && row.options.some(option => option.draft.id === existing.sourceDraftId && option.text === existing.text);
            if (stillAvailable) next[row.position] = existing;
            else if (row.options[0]) next[row.position] = { position: row.position, sourceDraftId: row.options[0].draft.id, text: row.options[0].text };
            return next;
        }, {}));
    }, [paragraphRows]);

    if (drafts.length === 0) {
        return <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center text-sm text-zinc-500">아직 초안 후보가 없습니다. 개요를 선택한 뒤 생성해 주세요.</div>;
    }

    return <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-3">
            {drafts.map(draft => {
                const overLimit = draft.charCount > charLimit;
                const selected = draft.status === 'selected';
                const draftBusy = busy === draft.id;
                const unverifiedFactCount = typeof draft.validationResult.unverifiedFactCount === 'number' ? draft.validationResult.unverifiedFactCount : 0;
                return <article key={draft.id} className={`flex flex-col rounded-2xl border p-5 ${selected ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-surface/50'}`}>
                    <div className="flex items-center justify-between gap-2"><Badge variant={selected ? 'success' : overLimit ? 'fail' : 'pending'}>{selected ? '선택됨' : overLimit ? '글자 수 초과' : '후보'}</Badge><span className={`text-xs ${overLimit ? 'text-red-300' : 'text-zinc-500'}`}>{draft.charCount.toLocaleString()} / {charLimit.toLocaleString()}자</span></div>
                    <p className="mt-4 flex-1 whitespace-pre-wrap text-sm leading-7 text-zinc-300">{draft.content}</p>
                    <p className="mt-4 text-xs text-zinc-500">근거 {Array.isArray(draft.evidenceMap.evidenceRecordIds) ? draft.evidenceMap.evidenceRecordIds.length : 0}개 · 문장 근거 {unverifiedFactCount > 0 ? <span className="text-amber-300">{unverifiedFactCount}개 검증 필요</span> : <span className="text-emerald-300">검증됨</span>}</p>
                    <button type="button" onClick={() => onSelectDraft(draft.id)} disabled={selected || overLimit || draft.status === 'stale' || busy !== null} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary/15 px-3 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50">{draftBusy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}{selected ? '선택한 초안' : overLimit ? '초과로 선택 불가' : '이 초안 선택'}</button>
                </article>;
            })}
        </div>
        {paragraphRows.length > 0 && <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 md:p-5" aria-labelledby="paragraph-mixer-title">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Paragraph mixer</p><h3 id="paragraph-mixer-title" className="mt-1 text-lg font-semibold text-white">문단별로 가장 좋은 표현을 고르세요</h3><p className="mt-1 text-xs leading-5 text-zinc-400">각 문단의 후보를 선택하면 하나의 편집 초안으로 합쳐집니다. 병합 후 새로 생긴 사실 문장은 근거를 다시 연결해 주세요.</p></div><button type="button" onClick={() => onMerge(Object.values(choices).sort((left, right) => left.position - right.position))} disabled={busy !== null || Object.keys(choices).length !== paragraphRows.length} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"><Merge size={14} aria-hidden="true" /> 문단 조합으로 편집</button></div>
            <div className="mt-4 space-y-3">{paragraphRows.map(row => <div key={row.position} className="rounded-xl border border-white/10 bg-background/50 p-3"><div className="mb-2 flex items-center gap-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{row.position + 1}</span><span className="text-xs font-semibold text-zinc-300">문단 {row.position + 1}</span></div><div className="grid gap-2 md:grid-cols-3">{row.options.map(option => { const chosen = choices[row.position]?.sourceDraftId === option.draft.id && choices[row.position]?.text === option.text; return <button type="button" key={`${row.position}-${option.draft.id}`} onClick={() => setChoices(current => ({ ...current, [row.position]: { position: row.position, sourceDraftId: option.draft.id, text: option.text } }))} className={`text-left rounded-lg border p-3 text-xs leading-5 transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${chosen ? 'border-primary/60 bg-primary/10 text-white' : 'border-white/10 bg-surface/40 text-zinc-400 hover:bg-white/5'}`}><span className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">후보 {drafts.findIndex(draft => draft.id === option.draft.id) + 1}{chosen ? <Check size={13} className="text-primary" aria-hidden="true" /> : null}</span>{option.text}</button>; })}</div></div>)}</div>
        </section>}
        {drafts.some(draft => draft.status === 'selected') && <p className="flex items-center gap-1.5 text-xs text-emerald-300"><CheckCircle2 size={14} aria-hidden="true" /> 선택한 초안은 아래 최종 편집 단계에서도 계속 수정할 수 있습니다.</p>}
        <p className="flex items-center gap-1.5 text-xs text-zinc-500"><Sparkles size={13} aria-hidden="true" /> 후보의 문장과 근거를 비교한 뒤 내 말투에 맞는 문단을 직접 선택하세요.</p>
    </div>;
}
