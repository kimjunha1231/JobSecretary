import { Plus, Trash2, PenTool } from 'lucide-react';
import { RefineManager } from '@/features/ai-assistant';
import { Section, useAutoDraft, DocumentEditorProps } from '@/features/document-editor';
import { AutoDraftModal } from '@/features/document-write';
import { LimitSelector } from '@/entities/document';

export function DocumentEditor({
    sections,
    onUpdateSection,
    onAddSection,
    onRemoveSection,
    autoRefineIndex,
    doc: docProp
}: DocumentEditorProps) {
    const {
        doc,
        openAutoDraft,
        closeAutoDraft,
        handleDraftGenerated,
        isAutoDraftOpen,
        currentQuestion
    } = useAutoDraft({ sections, onUpdateSection, doc: docProp });

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
                                aria-label="문항 제목"
                            />
                            <button
                                onClick={() => onRemoveSection(index)}
                                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all rounded-lg"
                                title="문항 삭제"
                                aria-label="문항 삭제"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between gap-3 pl-10">
                            <div className="flex items-center gap-2 text-sm text-zinc-400 font-mono">
                                <span>{section.content.length} / {section.limit}자</span>
                                <span className={section.content.length > section.limit ? 'text-red-400' : ''}>
                                    ({section.limit - section.content.length}자 남음)
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 text-sm text-zinc-400 mr-2">
                                    <span>글자 수:</span>
                                    <LimitSelector
                                        value={section.limit}
                                        onChange={(val) => onUpdateSection(index, 'limit', val.toString())}
                                    />
                                </div>
                                <button
                                    onClick={() => openAutoDraft(index)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-medium transition-colors border border-indigo-500/20"
                                    aria-label="AI 초안 작성"
                                >
                                    <PenTool size={14} />
                                    <span>AI 초안 작성</span>
                                </button>
                                <RefineManager
                                    text={section.content}
                                    onApply={(corrected) => onUpdateSection(index, 'content', corrected)}
                                    autoTrigger={autoRefineIndex === index}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <textarea
                            value={section.content}
                            onChange={e => onUpdateSection(index, 'content', e.target.value)}
                            className="w-full h-64 bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 text-zinc-300 leading-relaxed focus:border-primary focus:outline-none resize-none"
                            placeholder="내용을 입력하세요..."
                            maxLength={section.limit}
                            aria-label="문항 내용"
                        />
                    </div>
                </div>
            ))}

            <button
                onClick={onAddSection}
                className="w-full py-4 border-2 border-dashed border-zinc-700 rounded-2xl text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-medium"
                aria-label="새 문항 추가하기"
            >
                <Plus size={20} />
                문항 추가하기
            </button>

            {doc && (
                <AutoDraftModal
                    isOpen={isAutoDraftOpen}
                    onClose={closeAutoDraft}
                    onDraftGenerated={handleDraftGenerated}
                    company={doc.company}
                    role={doc.role}
                    question={currentQuestion}
                />
            )}
        </div>
    );
}
