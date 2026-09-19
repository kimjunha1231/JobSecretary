'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { StylePreferenceSummary } from '@/entities/style-evaluation';
import type { StyleProfileAnalysis } from '@/entities/style-profile';
import type { SourceDocument } from '@/entities/source-document';
import { Badge } from '@/shared/ui';

type Example = { id: string; content: string; source: 'user_authored' | 'approved_final' | 'source_document'; questionId?: string; sourceDocumentId?: string; approved: boolean };
type Profile = {
    id: string;
    name: string;
    sentenceLength?: { min?: number; max?: number; average?: number };
    endingStyle: string[];
    preferredConnectors: string[];
    bannedExpressions: string[];
};
type ProfileResponse = { profile: Profile; examples: Example[] };

type SourceDocumentSummary = Pick<SourceDocument, 'id' | 'title' | 'kind' | 'status' | 'createdAt'>;

function splitInput(value: string): string[] {
    return [...new Set(value.split(/[,\n]/).map(item => item.trim()).filter(Boolean))].slice(0, 100);
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
    const result = await response.json().catch(() => ({}));
    return result && typeof result === 'object' ? result as Record<string, unknown> : {};
}

export function StyleProfileBoard() {
    const [profiles, setProfiles] = useState<ProfileResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', endingStyle: '', preferredConnectors: '', bannedExpressions: '', example: '' });
    const [exampleDrafts, setExampleDrafts] = useState<Record<string, string>>({});
    const [analyses, setAnalyses] = useState<Record<string, StyleProfileAnalysis>>({});
    const [analysisBusy, setAnalysisBusy] = useState<string | null>(null);
    const [preferenceSummary, setPreferenceSummary] = useState<StylePreferenceSummary | null>(null);
    const [sourceDocuments, setSourceDocuments] = useState<SourceDocumentSummary[]>([]);
    const [sourceImportDrafts, setSourceImportDrafts] = useState<Record<string, string>>({});
    const [sourceImportBusy, setSourceImportBusy] = useState<string | null>(null);

    const loadProfiles = async () => {
        setError(null);
        try {
            const [profilesResponse, preferenceResponse, sourceResponse] = await Promise.all([
                fetch('/api/style-profiles', { cache: 'no-store' }),
                fetch('/api/style-evaluation-preferences/summary', { cache: 'no-store' }),
                fetch('/api/source-documents?status=approved&limit=50', { cache: 'no-store' }),
            ]);
            const result = await readJson(profilesResponse);
            if (!profilesResponse.ok) throw new Error(typeof result.error === 'string' ? result.error : '말투 프로필을 불러오지 못했습니다.');
            setProfiles(Array.isArray(result) ? result as unknown as ProfileResponse[] : []);
            if (preferenceResponse.ok) {
                const preferenceResult = await readJson(preferenceResponse);
                setPreferenceSummary(preferenceResult as unknown as StylePreferenceSummary);
            } else {
                setPreferenceSummary(null);
            }
            if (sourceResponse.ok) {
                const sourceResult = await readJson(sourceResponse);
                setSourceDocuments((Array.isArray(sourceResult) ? sourceResult : []).filter((item): item is SourceDocumentSummary => {
                    const source = item as Record<string, unknown>;
                    return source.kind === 'cover_letter' && source.status === 'approved'
                        && typeof source.id === 'string' && typeof source.title === 'string';
                }));
            } else {
                setSourceDocuments([]);
            }
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : '말투 프로필을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void loadProfiles(); }, []);

    const createProfile = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!form.name.trim()) {
            toast.error('말투 프로필 이름을 입력해 주세요.');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/style-profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    endingStyle: splitInput(form.endingStyle),
                    preferredConnectors: splitInput(form.preferredConnectors),
                    bannedExpressions: splitInput(form.bannedExpressions),
                }),
            });
            const result = await readJson(response);
            if (!response.ok || !result.profile || typeof (result.profile as Record<string, unknown>).id !== 'string') throw new Error(typeof result.error === 'string' ? result.error : '말투 프로필을 만들지 못했습니다.');
            const profileId = (result.profile as { id: string }).id;
            if (form.example.trim()) {
                const exampleResponse = await fetch(`/api/style-profiles/${profileId}/examples`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source: 'user_authored', content: form.example.trim(), approved: true }),
                });
                const exampleResult = await readJson(exampleResponse);
                if (!exampleResponse.ok) throw new Error(typeof exampleResult.error === 'string' ? exampleResult.error : '말투 예문을 저장하지 못했습니다.');
            }
            setForm({ name: '', endingStyle: '', preferredConnectors: '', bannedExpressions: '', example: '' });
            await loadProfiles();
            toast.success('말투 프로필을 만들었습니다.');
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : '말투 프로필을 만들지 못했습니다.';
            setError(message);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleExample = async (example: Example) => {
        const response = await fetch(`/api/style-profiles/examples/${example.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approved: !example.approved }),
        });
        const result = await readJson(response);
        if (!response.ok) {
            toast.error(typeof result.error === 'string' ? result.error : '예문 상태를 저장하지 못했습니다.');
            return;
        }
        await loadProfiles();
    };

    const addExample = async (profileId: string) => {
        const content = exampleDrafts[profileId]?.trim() ?? '';
        if (!content) {
            toast.error('추가할 예문을 입력해 주세요.');
            return;
        }
        const response = await fetch(`/api/style-profiles/${profileId}/examples`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'user_authored', content, approved: true }),
        });
        const result = await readJson(response);
        if (!response.ok) {
            toast.error(typeof result.error === 'string' ? result.error : '말투 예문을 추가하지 못했습니다.');
            return;
        }
        setExampleDrafts(current => ({ ...current, [profileId]: '' }));
        await loadProfiles();
        toast.success('승인 예문을 추가했습니다.');
    };

    const analyzeProfile = async (profileId: string) => {
        setAnalysisBusy(`analyze:${profileId}`);
        try {
            const response = await fetch(`/api/style-profiles/${profileId}/analyze`, { method: 'POST' });
            const result = await readJson(response);
            if (!response.ok || typeof result.confidence !== 'number') throw new Error(typeof result.error === 'string' ? result.error : '승인 예문을 분석하지 못했습니다.');
            setAnalyses(current => ({ ...current, [profileId]: result as unknown as StyleProfileAnalysis }));
            toast.success('승인 예문에서 말투 특징을 분석했습니다.');
        } catch (analysisError) {
            toast.error(analysisError instanceof Error ? analysisError.message : '승인 예문을 분석하지 못했습니다.');
        } finally {
            setAnalysisBusy(null);
        }
    };

    const applyAnalysis = async (profileId: string) => {
        const result = analyses[profileId];
        if (!result) return;
        setAnalysisBusy(`apply:${profileId}`);
        try {
            const response = await fetch(`/api/style-profiles/${profileId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sentenceLength: result.sentenceLength,
                    endingStyle: result.endingStyle,
                    preferredConnectors: result.preferredConnectors,
                    rules: {
                        source: 'approved_examples',
                        analyzedExampleCount: result.analyzedExampleCount,
                        confidence: result.confidence,
                    },
                }),
            });
            const responseBody = await readJson(response);
            if (!response.ok) throw new Error(typeof responseBody.error === 'string' ? responseBody.error : '분석 결과를 프로필에 반영하지 못했습니다.');
            await loadProfiles();
            toast.success('분석한 말투 특징을 프로필에 반영했습니다.');
        } catch (applyError) {
            toast.error(applyError instanceof Error ? applyError.message : '분석 결과를 프로필에 반영하지 못했습니다.');
        } finally {
            setAnalysisBusy(null);
        }
    };

    const removeExample = async (exampleId: string) => {
        const response = await fetch(`/api/style-profiles/examples/${exampleId}`, { method: 'DELETE' });
        const result = await readJson(response);
        if (!response.ok) {
            toast.error(typeof result.error === 'string' ? result.error : '예문을 삭제하지 못했습니다.');
            return;
        }
        await loadProfiles();
    };

    const importSourceDocument = async (profileId: string) => {
        const sourceDocumentId = sourceImportDrafts[profileId];
        if (!sourceDocumentId) {
            toast.error('가져올 기존 자기소개서를 선택해 주세요.');
            return;
        }
        setSourceImportBusy(profileId);
        try {
            const response = await fetch(`/api/style-profiles/${profileId}/examples/from-source`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceDocumentId }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '기존 자기소개서를 가져오지 못했습니다.');
            await loadProfiles();
            toast.success('기존 자기소개서를 말투 예문으로 추가했습니다.');
        } catch (importError) {
            toast.error(importError instanceof Error ? importError.message : '기존 자기소개서를 가져오지 못했습니다.');
        } finally {
            setSourceImportBusy(null);
        }
    };

    return <div className="mx-auto max-w-5xl space-y-6 pb-20">
        <Link href="/writing/new" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"><ArrowLeft size={16} aria-hidden="true" /> 작성 시작으로 돌아가기</Link>
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Voice profile</p><h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">내 말투 프로필</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">직접 쓴 문장과 선호 표현을 승인해 두면 AI는 사실 근거와 분리된 말투 자료로만 참고합니다. 예문을 복사하는 대신 문장 길이와 어조를 맞추는 데 사용합니다.</p></div>
        {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        <form onSubmit={createProfile} className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 md:p-6">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-white">새 프로필 만들기</h2><p className="mt-1 text-xs text-zinc-500">입력한 예문은 승인된 경우에만 다음 생성에 포함됩니다.</p></div><Plus size={18} className="text-primary" aria-hidden="true" /></div>
            <label className="block space-y-1.5 text-xs text-zinc-300"><span>프로필 이름</span><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} maxLength={100} placeholder="예: 담백한 프로젝트 회고" className="w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm text-white outline-none focus:border-primary/60" /></label>
            <div className="grid gap-3 md:grid-cols-3"><label className="space-y-1.5 text-xs text-zinc-300"><span>문장 끝맺음</span><input value={form.endingStyle} onChange={event => setForm(current => ({ ...current, endingStyle: event.target.value }))} placeholder="했습니다, 배웠습니다" className="w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm text-white outline-none focus:border-primary/60" /></label><label className="space-y-1.5 text-xs text-zinc-300"><span>선호 연결어</span><input value={form.preferredConnectors} onChange={event => setForm(current => ({ ...current, preferredConnectors: event.target.value }))} placeholder="먼저, 이후, 그래서" className="w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm text-white outline-none focus:border-primary/60" /></label><label className="space-y-1.5 text-xs text-zinc-300"><span>피하고 싶은 표현</span><input value={form.bannedExpressions} onChange={event => setForm(current => ({ ...current, bannedExpressions: event.target.value }))} placeholder="열정적으로, 혁신적인" className="w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm text-white outline-none focus:border-primary/60" /></label></div>
            <label className="block space-y-1.5 text-xs text-zinc-300"><span>내가 직접 쓴 예문 (선택)</span><textarea value={form.example} onChange={event => setForm(current => ({ ...current, example: event.target.value }))} maxLength={20_000} placeholder="최종 합격 자소서나 프로젝트 회고 중 내 표현이 잘 드러나는 문단을 붙여 넣어 주세요." className="min-h-32 w-full resize-y rounded-lg border border-white/10 bg-background px-3 py-3 text-sm leading-6 text-white outline-none focus:border-primary/60" /></label>
            <div className="flex justify-end"><button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">{isSubmitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />} 프로필 저장</button></div>
        </form>
        {preferenceSummary?.available && <section className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5 md:p-6" aria-labelledby="preference-summary-title">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/80">Blind preference loop</p>
                    <h2 id="preference-summary-title" className="mt-2 text-xl font-semibold text-white">내가 고른 답변이 다음 개선의 기준이 됩니다</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">비교에서 고른 변형과 시각만 집계합니다. 답변 원문은 이 요약에 저장하지 않으며, 결과가 자동으로 말투를 바꾸지는 않습니다. 개인 기준선을 확인하면서 필요한 프로필만 직접 조정할 수 있습니다.</p>
                </div>
                <Link href="/writing/new" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-amber-200/30 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-200/10 focus:outline-none focus:ring-2 focus:ring-amber-200/40">비교 사례 만들기</Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-background/30 p-3"><p className="text-[11px] text-zinc-500">전체 비교</p><p className="mt-1 text-2xl font-semibold text-white">{preferenceSummary.totalComparisons}</p></div>
                <div className="rounded-xl border border-white/10 bg-background/30 p-3"><p className="text-[11px] text-zinc-500">응답한 비교</p><p className="mt-1 text-2xl font-semibold text-white">{preferenceSummary.respondedComparisons}</p></div>
                <div className="rounded-xl border border-white/10 bg-background/30 p-3"><p className="text-[11px] text-zinc-500">스튜디오 답변 선택</p><p className="mt-1 text-2xl font-semibold text-amber-100">{preferenceSummary.studioWins}</p></div>
                <div className="rounded-xl border border-white/10 bg-background/30 p-3"><p className="text-[11px] text-zinc-500">기준 초안 선택</p><p className="mt-1 text-2xl font-semibold text-zinc-200">{preferenceSummary.baselineWins}</p></div>
            </div>
            {preferenceSummary.lastRespondedAt && <p className="mt-4 text-xs text-zinc-500">마지막 선택 {new Date(preferenceSummary.lastRespondedAt).toLocaleString('ko-KR')}</p>}
        </section>}
        <section className="space-y-3" aria-labelledby="profile-list-title">
            <div><h2 id="profile-list-title" className="text-xl font-semibold text-white">저장된 프로필</h2><p className="mt-1 text-xs text-zinc-500">승인된 예문만 생성 context에 들어갑니다. 분석 결과는 확인한 뒤 반영할 수 있습니다.</p></div>
            {isLoading ? <div className="rounded-2xl border border-white/10 bg-surface/40 px-5 py-12 text-center text-sm text-zinc-500">말투 프로필을 불러오는 중입니다…</div> : profiles.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center text-sm text-zinc-500">아직 말투 프로필이 없습니다.</div> : <div className="grid gap-4 md:grid-cols-2">{profiles.map(item => {
                const profileAnalysis = analyses[item.profile.id];
                const approvedExampleCount = item.examples.filter(example => example.approved).length;
                return <article key={item.profile.id} className="rounded-2xl border border-white/10 bg-surface/50 p-5">
                    <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{item.profile.name}</h3><div className="mt-2 flex flex-wrap gap-1.5">{item.profile.endingStyle.map(value => <Badge key={`ending-${value}`} variant="secondary">끝: {value}</Badge>)}{item.profile.preferredConnectors.map(value => <Badge key={`connector-${value}`} variant="secondary">연결: {value}</Badge>)}{item.profile.bannedExpressions.map(value => <Badge key={`banned-${value}`} variant="fail">금지: {value}</Badge>)}</div></div><span className="text-xs text-zinc-500">승인 예문 {approvedExampleCount}개</span></div>
                    <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-medium text-primary">예문에서 말투 분석</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">승인 예문만 사용하며 원문은 분석 결과에 저장하지 않습니다.</p></div><button type="button" onClick={() => void analyzeProfile(item.profile.id)} disabled={analysisBusy !== null || approvedExampleCount === 0} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-primary/30 px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50">{analysisBusy === `analyze:${item.profile.id}` ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />} 분석하기</button></div>{profileAnalysis && <div className="mt-3 space-y-2 border-t border-primary/10 pt-3"><p className="text-xs text-zinc-300">{profileAnalysis.sentenceCount}문장 분석 · 신뢰도 {Math.round(profileAnalysis.confidence * 100)}%{profileAnalysis.sentenceLength.average ? ` · 평균 ${profileAnalysis.sentenceLength.average.toFixed(1)}자` : ''}</p><div className="flex flex-wrap gap-1.5">{profileAnalysis.endingStyle.map(value => <Badge key={`analysis-ending-${value}`} variant="secondary">끝: {value}</Badge>)}{profileAnalysis.preferredConnectors.map(value => <Badge key={`analysis-connector-${value}`} variant="secondary">연결: {value}</Badge>)}</div><button type="button" onClick={() => void applyAnalysis(item.profile.id)} disabled={analysisBusy !== null} className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50">{analysisBusy === `apply:${item.profile.id}` && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} 분석 결과를 프로필에 반영</button></div>}</div>
                    {sourceDocuments.length > 0 && <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-400/5 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-medium text-sky-200">기존 자기소개서에서 말투 가져오기</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">검수 완료한 내 자기소개서 원문을 이 프로필의 승인 예문으로 연결합니다. 사실 근거와는 분리해 말투만 참고합니다.</p></div><span className="text-[11px] text-zinc-600">{sourceDocuments.length}개 사용 가능</span></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select aria-label={`${item.profile.name}에 가져올 기존 자기소개서`} value={sourceImportDrafts[item.profile.id] ?? ''} onChange={event => setSourceImportDrafts(current => ({ ...current, [item.profile.id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-background px-2.5 py-2 text-xs text-white outline-none focus:border-sky-300/60"><option value="">자기소개서 선택</option>{sourceDocuments.map(source => <option key={source.id} value={source.id}>{source.title}</option>)}</select><button type="button" onClick={() => void importSourceDocument(item.profile.id)} disabled={sourceImportBusy !== null || !sourceImportDrafts[item.profile.id]} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-sky-300/30 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/10 disabled:cursor-not-allowed disabled:opacity-50">{sourceImportBusy === item.profile.id && <Loader2 size={13} className="animate-spin" aria-hidden="true" />} 예문으로 추가</button></div></div>}
                    <div className="mt-4 space-y-2">{item.examples.length === 0 ? <p className="text-xs text-zinc-600">아직 승인 예문이 없습니다.</p> : item.examples.map(example => <div key={example.id} className="rounded-xl border border-white/10 bg-background/40 p-3"><div className="mb-2 flex flex-wrap gap-1.5"><Badge variant={example.approved ? 'success' : 'secondary'}>{example.approved ? '승인됨' : '보류'}</Badge><Badge variant="secondary">{example.questionId ? '문항별 예문' : '전역 예문'} · {example.source === 'approved_final' ? '최종 확정문' : example.source === 'source_document' ? '기존 자기소개서' : '직접 작성'}</Badge></div><p className="whitespace-pre-wrap text-xs leading-5 text-zinc-300">{example.content}</p><div className="mt-3 flex items-center justify-between gap-2"><button type="button" onClick={() => void toggleExample(example)} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${example.approved ? 'bg-emerald-500/15 text-emerald-300' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>{example.approved && <Check size={13} aria-hidden="true" />}{example.approved ? '생성에 사용 중' : '생성에 사용'}</button><button type="button" onClick={() => void removeExample(example.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300"><Trash2 size={13} aria-hidden="true" /> 삭제</button></div></div>)}</div>
                    <div className="mt-4 border-t border-white/10 pt-4"><label className="block space-y-1.5 text-xs text-zinc-400"><span>이 프로필에 예문 추가</span><textarea value={exampleDrafts[item.profile.id] ?? ''} onChange={event => setExampleDrafts(current => ({ ...current, [item.profile.id]: event.target.value }))} maxLength={20_000} placeholder="내가 직접 쓴 문장을 추가해 주세요." className="min-h-20 w-full resize-y rounded-lg border border-white/10 bg-background px-3 py-2.5 text-xs leading-5 text-white outline-none focus:border-primary/60" /></label><div className="mt-2 flex justify-end"><button type="button" onClick={() => void addExample(item.profile.id)} disabled={!exampleDrafts[item.profile.id]?.trim()} className="rounded-lg bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50">승인 예문 추가</button></div></div>
                </article>;
            })}</div>}
        </section>
    </div>;
}
