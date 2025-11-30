import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import RefineManager from '@/components/write/RefineManager';
import { Section } from '@/hooks/useDocumentForm';

interface DocumentEditorProps {
    sections: Section[];
    onUpdateSection: (index: number, field: keyof Section, value: string) => void;
    onAddSection: () => void;
    onRemoveSection: (index: number) => void;
    autoRefineIndex: number | null;
}

export function DocumentEditor({
    sections,
    onUpdateSection,
    onAddSection,
    onRemoveSection,
    autoRefineIndex
}: DocumentEditorProps) {
    return (
        <div className="space-y-8">
            {sections.map((section, index) => (
                <div key={index} className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-start gap-3 mb-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 text-primary text-sm font-mono font-bold shrink-0 mt-1">
                                {index + 1}
                            </span>
                            <input
                                type="text"
                                value={section.title}
                                onChange={e => onUpdateSection(index, 'title', e.target.value)}
                                className="flex-1 bg-transparent border-none text-xl font-semibold text-white focus:outline-none focus:ring-0 placeholder-zinc-600 break-words"
                                placeholder="문항 제목"
                            />
                            <button
                                onClick={() => onRemoveSection(index)}
                                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all rounded-lg"
                                title="문항 삭제"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between gap-3 pl-10">
                            <span className="text-sm text-zinc-500 font-mono">
                                {section.content.length}자
                            </span>
                            <RefineManager
                                text={section.content}
                                onApply={(corrected) => onUpdateSection(index, 'content', corrected)}
                                autoTrigger={autoRefineIndex === index}
                            />
                        </div>
                    </div>
                    <div className="p-8">
                        <textarea
                            value={section.content}
                            onChange={e => onUpdateSection(index, 'content', e.target.value)}
                            className="w-full h-64 bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 text-zinc-300 leading-relaxed focus:border-primary focus:outline-none resize-none"
                            placeholder="내용을 입력하세요..."
                        />
                    </div>
                </div>
            ))}
            <button
                onClick={onAddSection}
                className="w-full py-4 border-2 border-dashed border-zinc-700 rounded-2xl text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-medium"
            >
                <Plus size={20} />
                문항 추가하기
            </button>
        </div>
    );
}
