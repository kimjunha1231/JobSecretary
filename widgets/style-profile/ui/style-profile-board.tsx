'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/shared/ui';

type Example = { id: string; content: string; source: 'user_authored' | 'approved_final'; approved: boolean };
type Profile = {
    id: string;
    name: string;
    endingStyle: string[];
    preferredConnectors: string[];
    bannedExpressions: string[];
};

type ProfileResponse = { profile: Profile; examples: Example[] };

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

    const loadProfiles = async () => {
        setError(null);
        try {
            const response = await fetch('/api/style-profiles', { cache: 'no-store' });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '말투 프로필을 불러오지 못했습니다.');
            setProfiles(Array.isArray(result) ? result as unknown as ProfileResponse[] : []);
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
            toast.error(typeof result.error === 'string' ? result.error : '예문을 저장하지 못했습니다.');
            return;
        }
        setExampleDrafts(current => ({ ...current, [profileId]: '' }));
        await loadProfiles();
        toast.success('승인 예문을 추가했습니다.');
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
        <section className="space-y-3" aria-labelledby="profile-list-title"><div><h2 id="profile-list-title" className="text-xl font-semibold text-white">저장된 프로필</h2><p className="mt-1 text-xs text-zinc-500">승인된 예문만 생성 context에 들어갑니다.</p></div>{isLoading ? <div className="rounded-2xl border border-white/10 bg-surface/40 px-5 py-12 text-center text-sm text-zinc-500">말투 프로필을 불러오는 중입니다…</div> : profiles.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center text-sm text-zinc-500">아직 말투 프로필이 없습니다.</div> : <div className="grid gap-4 md:grid-cols-2">{profiles.map(item => <article key={item.profile.id} className="rounded-2xl border border-white/10 bg-surface/50 p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{item.profile.name}</h3><div className="mt-2 flex flex-wrap gap-1.5">{item.profile.endingStyle.map(value => <Badge key={`ending-${value}`} variant="secondary">끝: {value}</Badge>)}{item.profile.preferredConnectors.map(value => <Badge key={`connector-${value}`} variant="secondary">연결: {value}</Badge>)}{item.profile.bannedExpressions.map(value => <Badge key={`banned-${value}`} variant="fail">금지: {value}</Badge>)}</div></div><span className="text-xs text-zinc-500">승인 예문 {item.examples.filter(example => example.approved).length}개</span></div><div className="mt-4 space-y-2">{item.examples.length === 0 ? <p className="text-xs text-zinc-600">아직 승인 예문이 없습니다.</p> : item.examples.map(example => <div key={example.id} className="rounded-xl border border-white/10 bg-background/40 p-3"><p className="whitespace-pre-wrap text-xs leading-5 text-zinc-300">{example.content}</p><div className="mt-3 flex items-center justify-between gap-2"><button type="button" onClick={() => void toggleExample(example)} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${example.approved ? 'bg-emerald-500/15 text-emerald-300' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>{example.approved && <Check size={13} aria-hidden="true" />}{example.approved ? '생성에 사용 중' : '생성에 사용'}</button><button type="button" onClick={() => void removeExample(example.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300"><Trash2 size={13} aria-hidden="true" /> 삭제</button></div></div>)}</div><div className="mt-4 border-t border-white/10 pt-4"><label className="block space-y-1.5 text-xs text-zinc-400"><span>이 프로필에 예문 추가</span><textarea value={exampleDrafts[item.profile.id] ?? ''} onChange={event => setExampleDrafts(current => ({ ...current, [item.profile.id]: event.target.value }))} maxLength={20_000} placeholder="내가 직접 쓴 문장을 추가해 주세요." className="min-h-20 w-full resize-y rounded-lg border border-white/10 bg-background px-3 py-2.5 text-xs leading-5 text-white outline-none focus:border-primary/60" /></label><div className="mt-2 flex justify-end"><button type="button" onClick={() => void addExample(item.profile.id)} disabled={!exampleDrafts[item.profile.id]?.trim()} className="rounded-lg bg-primary/15 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50">승인 예문 추가</button></div></div></article>)}</div>}</section>
    </div>;
}
