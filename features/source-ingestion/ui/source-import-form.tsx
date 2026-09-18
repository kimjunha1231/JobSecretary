'use client';

import { FormEvent, useRef, useState } from 'react';
import { FileUp, ClipboardPaste, Loader2 } from 'lucide-react';
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

export function SourceImportForm({ onCreated }: SourceImportFormProps) {
    const [kind, setKind] = useState<SourceDocumentKind>('portfolio');
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!file && !text.trim()) {
            toast.error('파일을 선택하거나 자료 내용을 붙여넣어 주세요.');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('kind', kind);
            formData.append('title', title.trim());
            if (file) {
                formData.append('file', file);
                formData.append('originType', 'upload');
            } else {
                formData.append('text', text);
                formData.append('originType', 'pasted_text');
            }

            const response = await fetch('/api/source-documents', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof result.error === 'string' ? result.error : '자료를 등록하지 못했습니다.');
            }

            onCreated?.(result.document ?? {});
            setTitle('');
            setText('');
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
                        PDF·DOCX·텍스트를 등록하면 본문을 나눠 저장합니다. 등록 직후에는 검수 전 상태로 보류됩니다.
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

            <div className="grid gap-4 md:grid-cols-2">
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

                <label className="flex min-h-32 flex-col rounded-xl border border-white/10 bg-background/40 px-4 py-3">
                    <span className="mb-2 flex items-center gap-2 text-sm text-zinc-300">
                        <ClipboardPaste size={16} aria-hidden="true" />
                        텍스트 붙여넣기
                    </span>
                    <textarea
                        value={text}
                        onChange={event => {
                            setText(event.target.value);
                            if (event.target.value) setFile(null);
                        }}
                        placeholder="이력서나 프로젝트 설명을 붙여넣어도 됩니다."
                        maxLength={500_000}
                        className="min-h-20 flex-1 resize-y bg-transparent text-sm leading-6 text-white placeholder:text-zinc-600 outline-none"
                    />
                </label>
            </div>

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
