'use client';

import { FormEvent, useRef, useState } from 'react';
import { FileUp, ClipboardPaste, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SourceDocumentKind } from '@/entities/source-document';
import { SOURCE_KIND_LABELS } from '../model';

type SourceImportFormProps = {
    onCreated?: (document: Record<string, unknown>) => void;
};

const sourceKinds: SourceDocumentKind[] = [
    'resume',
    'portfolio',
    'cover_letter',
    'job_post',
    'talent_page',
    'github',
    'other',
];

type ImportMode = 'file' | 'text' | 'url';

export function SourceImportForm({ onCreated }: SourceImportFormProps) {
    const [kind, setKind] = useState<SourceDocumentKind>('portfolio');
    const [mode, setMode] = useState<ImportMode>('file');
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (mode === 'url' && !sourceUrl.trim()) {
            toast.error('가져올 웹페이지 URL을 입력해 주세요.');
            return;
        }
        if (mode === 'file' && !file) {
            toast.error('업로드할 파일을 선택해 주세요.');
            return;
        }
        if (mode === 'text' && !text.trim()) {
            toast.error('자료 내용을 붙여넣어 주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            let response: Response;
            if (mode === 'url') {
                response = await fetch('/api/source-documents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        kind,
                        title: title.trim(),
                        originType: 'url',
                        sourceUrl: sourceUrl.trim(),
                    }),
                });
            } else {
                const formData = new FormData();
                formData.append('kind', kind);
                formData.append('title', title.trim());
                if (mode === 'file' && file) {
                    formData.append('file', file);
                    formData.append('originType', 'upload');
                } else {
                    formData.append('text', text);
                    formData.append('originType', 'pasted_text');
                }
                response = await fetch('/api/source-documents', {
                    method: 'POST',
                    body: formData,
                });
            }
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof result.error === 'string' ? result.error : '자료를 등록하지 못했습니다.');
            }

            onCreated?.(result.document ?? {});
            setTitle('');
            setText('');
            setSourceUrl('');
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            const warningCount = Array.isArray(result.warnings) ? result.warnings.length : 0;
            toast.success(warningCount > 0 ? '자료를 등록했습니다. 검수 안내를 확인해 주세요.' : '자료를 등록했습니다. 검수 후 AI가 참고합니다.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : '자료를 등록하지 못했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-surface/70 p-5 md:p-6 space-y-5">
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
                    <FileUp size={20} aria-hidden="true" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-white">자료 가져오기</h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                        파일·텍스트·공개 웹페이지 또는 PDF URL을 등록하면 본문을 나눠 저장합니다. 등록 직후에는 검수 전 상태로 보류됩니다.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <label className="space-y-2 text-sm text-zinc-300">
                    <span>자료 종류</span>
                    <select
                        value={kind}
                        onChange={event => setKind(event.target.value as SourceDocumentKind)}
                        className="w-full rounded-xl border border-white/10 bg-background px-3 py-2.5 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                    >
                        {sourceKinds.map(sourceKind => (
                            <option key={sourceKind} value={sourceKind}>{SOURCE_KIND_LABELS[sourceKind]}</option>
                        ))}
                    </select>
                </label>
                <label className="space-y-2 text-sm text-zinc-300">
                    <span>자료 제목</span>
                    <input
                        value={title}
                        onChange={event => setTitle(event.target.value)}
                        placeholder="예: 2025 상반기 포트폴리오"
                        maxLength={200}
                        className="w-full rounded-xl border border-white/10 bg-background px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                    />
                </label>
            </div>

            <div className="space-y-3" role="radiogroup" aria-label="자료 등록 방식">
                <p className="text-sm text-zinc-300">등록 방식</p>
                <div className="grid gap-2 sm:grid-cols-3">
                    {([
                        { value: 'file', label: '파일 업로드', icon: FileUp },
                        { value: 'text', label: '텍스트 붙여넣기', icon: ClipboardPaste },
                        { value: 'url', label: '웹페이지 URL', icon: Link2 },
                    ] as const).map(option => {
                        const Icon = option.icon;
                        const selected = mode === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setMode(option.value)}
                                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${selected
                                    ? 'border-primary/60 bg-primary/10 text-primary'
                                    : 'border-white/10 bg-background/40 text-zinc-400 hover:border-white/20 hover:text-zinc-200'}`}
                            >
                                <Icon size={16} aria-hidden="true" />
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {mode === 'file' && (
                <label className="group flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-background/40 px-4 py-5 text-center transition hover:border-primary/50 hover:bg-primary/5">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,.text,.md,.markdown,.csv,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                        onChange={event => setFile(event.target.files?.[0] ?? null)}
                        className="sr-only"
                    />
                    <FileUp size={22} className="mb-2 text-zinc-400 transition group-hover:text-primary" aria-hidden="true" />
                    <span className="text-sm font-medium text-zinc-200">파일 선택</span>
                    <span className="mt-1 text-xs text-zinc-500">PDF, DOCX, TXT, Markdown · 최대 10MB</span>
                    {file && <span className="mt-3 max-w-full truncate text-xs text-primary">{file.name}</span>}
                </label>
            )}

            {mode === 'text' && (
                <label className="flex min-h-32 flex-col rounded-xl border border-white/10 bg-background/40 px-4 py-3">
                    <span className="mb-2 flex items-center gap-2 text-sm text-zinc-300">
                        <ClipboardPaste size={16} aria-hidden="true" />
                        텍스트 붙여넣기
                    </span>
                    <textarea
                        value={text}
                        onChange={event => setText(event.target.value)}
                        placeholder="이력서나 프로젝트 설명을 붙여넣어도 됩니다."
                        maxLength={500_000}
                        className="min-h-20 flex-1 resize-y bg-transparent text-sm leading-6 text-white placeholder:text-zinc-600 outline-none"
                    />
                </label>
            )}

            {mode === 'url' && (
                <label className="flex flex-col gap-2 rounded-xl border border-white/10 bg-background/40 px-4 py-3 text-sm text-zinc-300">
                    <span className="flex items-center gap-2">
                        <Link2 size={16} aria-hidden="true" />
                        채용공고·인재상·포트폴리오 URL
                    </span>
                    <input
                        type="url"
                        value={sourceUrl}
                        onChange={event => setSourceUrl(event.target.value)}
                        placeholder="https://company.example/careers/frontend"
                        maxLength={2_048}
                        inputMode="url"
                        autoComplete="url"
                        className="rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-xs leading-5 text-zinc-500">HTTPS 공개 페이지의 HTML·일반 텍스트·PDF만 가져옵니다. 로그인·자바스크립트 렌더링 페이지는 지원하지 않으며, 가져온 자료는 검수 후 사용됩니다.</span>
                </label>
            )}

            <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-zinc-500">자동 추출 결과는 승인하기 전까지 자소서 생성에 사용하지 않습니다.</p>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                    {isSubmitting ? '등록 중…' : '자료 등록'}
                </button>
            </div>
        </form>
    );
}
