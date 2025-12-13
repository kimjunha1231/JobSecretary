import { PenTool } from 'lucide-react';
import { RefineManager } from '@/features/ai-assistant';
import { LimitSelector } from '@/shared/ui';
import { useFormContext, Controller } from 'react-hook-form';
import { ResumeFormData } from '../../types';
import { CharacterCounter } from '../CharacterCounter';
import { AutoDraftModal } from '../AutoDraftModal';

interface ResumeSectionEditorProps {
    index: number;
    isAutoDraftOpen: boolean;
    setIsAutoDraftOpen: (isOpen: boolean) => void;
    handleDraftGenerated: (draft: string) => void;
    formData: {
        company: string;
        role: string;
    };
}

export function ResumeSectionEditor({
    index,
    isAutoDraftOpen,
    setIsAutoDraftOpen,
    handleDraftGenerated,
    formData
}: ResumeSectionEditorProps) {
    const { register, control, setValue } = useFormContext<ResumeFormData>();

    return (
        <div className="bg-surface border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <input
                    type="text"
                    {...register(`sections.${index}.title`)}
                    className="flex-1 bg-transparent border-none text-xl font-semibold text-white focus:outline-none"
                    placeholder="문항 제목"
                />
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsAutoDraftOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-medium transition-colors border border-indigo-500/20"
                    >
                        <PenTool size={14} />
                        <span>AI 초안 작성</span>
                    </button>
                    <Controller
                        control={control}
                        name={`sections.${index}.content`}
                        render={({ field: { value, onChange } }) => (
                            <RefineManager
                                text={value}
                                onApply={(corrected: string) => onChange(corrected)}
                            />
                        )}
                    />
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <span>글자 수 제한:</span>
                        <Controller
                            control={control}
                            name={`sections.${index}.limit`}
                            render={({ field: { value, onChange } }) => (
                                <LimitSelector
                                    value={value}
                                    onChange={onChange}
                                />
                            )}
                        />
                    </div>
                </div>
            </div>

            <div className="relative">
                <textarea
                    {...register(`sections.${index}.content`)}
                    className="w-full h-64 bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 text-white focus:border-primary focus:outline-none resize-none"
                    placeholder="내용을 입력하세요..."
                />
            </div>

            <div className="flex justify-between text-xs text-zinc-500">
                <CharacterCounter sectionIndex={index} />
            </div>

            <AutoDraftModal
                isOpen={isAutoDraftOpen}
                onClose={() => setIsAutoDraftOpen(false)}
                onDraftGenerated={handleDraftGenerated}
                company={formData.company}
                role={formData.role}
                question={useFormContext<ResumeFormData>().getValues(`sections.${index}.title`)}
            />
        </div>
    );
}
