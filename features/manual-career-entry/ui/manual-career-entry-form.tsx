'use client';

import { useState, type FormEvent } from 'react';
import { EMPTY_MANUAL_CAREER_ENTRY, type ManualCareerEntryValues } from '../model';
import { CAREER_ITEM_KIND_LABELS, CareerItemKindSchema } from '@/entities/career-item';

type ManualCareerEntryFormProps = {
    formId?: string;
    initialValues?: Partial<ManualCareerEntryValues>;
    isSaving: boolean;
    mode?: 'create' | 'edit';
    onCancel: () => void;
    onSubmit: (values: ManualCareerEntryValues) => Promise<boolean>;
    requireActionAndResult?: boolean;
    submitLabel?: string;
};

const fieldClass = 'mt-1.5 w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:opacity-50';
const textareaClass = `${fieldClass} min-h-20 resize-y leading-5`;

export function ManualCareerEntryForm({
    formId,
    initialValues,
    isSaving,
    mode = 'create',
    onCancel,
    onSubmit,
    requireActionAndResult = false,
    submitLabel,
}: ManualCareerEntryFormProps) {
    const [values, setValues] = useState<ManualCareerEntryValues>(() => ({ ...EMPTY_MANUAL_CAREER_ENTRY, ...initialValues }));
    const [validationError, setValidationError] = useState<string | null>(null);
    const isCredential = values.kind === 'credential';

    const update = <K extends keyof ManualCareerEntryValues,>(field: K, value: ManualCareerEntryValues[K]) => {
        setValues(current => ({ ...current, [field]: value }));
        setValidationError(null);
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!values.title.trim()) {
            setValidationError(isCredential ? '자격증·시험명을 입력해 주세요.' : '활동명을 입력해 주세요.');
            return;
        }
        if (requireActionAndResult && (!values.action.trim() || !values.result.trim())) {
            setValidationError('내가 한 일과 결과를 모두 입력해 주세요.');
            return;
        }
        if (![values.summary, values.action, values.result, values.learning].some(value => value.trim())) {
            setValidationError(isCredential
                ? '자격 정보나 점수·등급 등 확인 가능한 내용을 하나 이상 입력해 주세요.'
                : '활동 설명이나 결과 근거를 하나 이상 입력해 주세요.');
            return;
        }

        const saved = await onSubmit({
            ...values,
            title: values.title.trim(),
            organization: values.organization.trim(),
            role: values.role.trim(),
            startedAt: values.startedAt.trim(),
            endedAt: values.endedAt.trim(),
            summary: values.summary.trim(),
            action: values.action.trim(),
            result: values.result.trim(),
            learning: values.learning.trim(),
        });
        if (saved) {
            setValues(EMPTY_MANUAL_CAREER_ENTRY);
            setValidationError(null);
        }
    };

    return (
        <form id={formId} onSubmit={event => void submit(event)} className="rounded-2xl border border-primary/20 bg-primary/5 p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-white">{mode === 'edit' ? '활동 수정' : '활동 직접 입력'}</h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-400">{mode === 'edit'
                        ? '변경 내용은 다음 자기소개서 추천과 PDF 출력부터 반영됩니다. 직접 입력한 사실과 수치를 확인해 주세요.'
                        : '저장하면 승인 활동 라이브러리에 바로 추가되어 자기소개서 추천과 PDF에 사용할 수 있습니다. 직접 입력한 사실과 수치를 확인해 주세요.'}</p>
                </div>
                <span className="text-[11px] text-zinc-500">* 제목과 설명/행동/결과 중 하나가 필요합니다</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5 text-xs text-zinc-300">
                    <span>활동 종류</span>
                    <select
                        value={values.kind}
                        onChange={event => {
                            const kind = CareerItemKindSchema.parse(event.target.value);
                            setValues(current => ({ ...current, kind, isCurrent: kind === 'credential' ? false : current.isCurrent }));
                            setValidationError(null);
                        }}
                        className={fieldClass}
                        disabled={isSaving}
                    >
                        {Object.entries(CAREER_ITEM_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </label>
                <label className="space-y-1.5 text-xs text-zinc-300">
                    <span>{isCredential ? '자격증·시험명' : '활동명'} <span aria-hidden="true" className="text-primary">*</span></span>
                    <input
                        value={values.title}
                        onChange={event => update('title', event.target.value)}
                        maxLength={200}
                        required
                        placeholder={isCredential ? '예: 자격증명 또는 어학 시험' : '예: 프로젝트 또는 활동명'}
                        className={fieldClass}
                        disabled={isSaving}
                    />
                </label>
                <label className="space-y-1.5 text-xs text-zinc-300">
                    <span>{isCredential ? '발급·시험 기관 (선택)' : '조직·기관 (선택)'}</span>
                    <input value={values.organization} onChange={event => update('organization', event.target.value)} maxLength={200} className={fieldClass} disabled={isSaving} />
                </label>
                <label className="space-y-1.5 text-xs text-zinc-300">
                    <span>{isCredential ? '자격 분야 (선택)' : '내 역할 (선택)'}</span>
                    <input value={values.role} onChange={event => update('role', event.target.value)} maxLength={200} className={fieldClass} disabled={isSaving} />
                </label>
                <label className="space-y-1.5 text-xs text-zinc-300">
                    <span>{isCredential ? '취득·응시 시점 (선택)' : '시작 시점 (선택)'}</span>
                    <input value={values.startedAt} onChange={event => update('startedAt', event.target.value)} maxLength={100} placeholder="예: 2026.09" className={fieldClass} disabled={isSaving} />
                </label>
                <label className="space-y-1.5 text-xs text-zinc-300">
                    <span>{isCredential ? '유효기간 종료 (선택)' : '종료 시점 (선택)'}</span>
                    <input value={values.endedAt} onChange={event => update('endedAt', event.target.value)} maxLength={100} placeholder="예: 2027.09" className={fieldClass} disabled={isSaving} />
                </label>
                {!isCredential && <label className="flex min-h-10 items-center gap-2 text-xs text-zinc-300">
                    <input type="checkbox" checked={values.isCurrent} onChange={event => update('isCurrent', event.target.checked)} className="size-4 rounded border-white/20 bg-transparent accent-primary focus:ring-primary/40" disabled={isSaving} />
                    <span>현재 진행 중</span>
                </label>}
                <label className="space-y-1.5 text-xs text-zinc-300 md:col-span-2">
                    <span>{isCredential ? '자격 정보 요약 (선택)' : '활동 요약 (선택)'}</span>
                    <textarea value={values.summary} onChange={event => update('summary', event.target.value)} maxLength={10_000} className={textareaClass} disabled={isSaving} />
                </label>
                <label className="space-y-1.5 text-xs text-zinc-300">
                    <span>{isCredential ? '준비·활용 과정 (선택)' : '내가 한 일 (선택)'}</span>
                    <textarea value={values.action} onChange={event => update('action', event.target.value)} maxLength={10_000} className={textareaClass} disabled={isSaving} />
                </label>
                <label className="space-y-1.5 text-xs text-zinc-300">
                    <span>{isCredential ? '점수·등급·결과 (선택)' : '결과·성과 (선택)'}</span>
                    <textarea value={values.result} onChange={event => update('result', event.target.value)} maxLength={10_000} className={textareaClass} disabled={isSaving} />
                </label>
                <label className="space-y-1.5 text-xs text-zinc-300 md:col-span-2">
                    <span>배운 점 (선택)</span>
                    <textarea value={values.learning} onChange={event => update('learning', event.target.value)} maxLength={10_000} className={textareaClass} disabled={isSaving} />
                </label>
            </div>

            {validationError && <p role="alert" className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100">{validationError}</p>}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={onCancel} disabled={isSaving} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50">취소</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50">{isSaving ? '저장 중…' : submitLabel ?? (mode === 'edit' ? '수정 저장' : '활동 저장')}</button>
            </div>
        </form>
    );
}
