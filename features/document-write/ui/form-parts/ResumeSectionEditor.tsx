import { PenTool } from 'lucide-react';
import { RefineManager } from '@/features/ai-assistant';
import { LimitSelector } from '@/shared/ui';
import { AutoDraftModal } from '../AutoDraftModal';

interface ResumeSectionEditorProps {
    section: {
        title: string;
        content: string;
        limit: number;
    };
    index: number;
    updateSection: (index: number, key: 'title' | 'content' | 'limit', value: string | number) => void;
    isAutoDraftOpen: boolean;
    setIsAutoDraftOpen: (isOpen: boolean) => void;
    handleDraftGenerated: (draft: string) => void;
    formData: {
        company: string;
        role: string;
    };
}

export function ResumeSectionEditor({
    section,
    index,
    updateSection,
    isAutoDraftOpen,
    setIsAutoDraftOpen,
    handleDraftGenerated,
    formData
}: ResumeSectionEditorProps) {
    return (
        <div className="bg-surface border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <input
                    type="text"
                    value={section.title}
                    onChange={e => updateSection(index, 'title', e.target.value)}
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
                    <RefineManager
                        text={section.content}
                        onApply={(corrected: string) => updateSection(index, 'content', corrected)}
                    />
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <span>글자 수 제한:</span>
                        <LimitSelector
                            value={section.limit}
                            onChange={(val) => updateSection(index, 'limit', val)}
                        />
                    </div>
                </div>
            </div>

            <div className="relative">
                <textarea
                    value={section.content}
                    onChange={e => updateSection(index, 'content', e.target.value)}
                    className="w-full h-64 bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 text-white focus:border-primary focus:outline-none resize-none"
                    placeholder="내용을 입력하세요..."
                    maxLength={section.limit}
                />
            </div>

            <div className="flex justify-between text-xs text-zinc-500">
                <span>{section.content.length} / {section.limit}자</span>
                <span className={section.content.length > section.limit ? 'text-red-400' : ''}>
                    {section.limit - section.content.length}자 남음
                </span>
            </div>

            <AutoDraftModal
                isOpen={isAutoDraftOpen}
                onClose={() => setIsAutoDraftOpen(false)}
                onDraftGenerated={handleDraftGenerated}
                company={formData.company}
                role={formData.role}
                question={section.title}
            />
        </div>
    );
}
