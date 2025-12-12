import { Check, Copy, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Section, useCopyFeedback, DocumentViewerProps } from '@/features/document-editor';

export function DocumentViewer({ sections, onCopy, onRefine }: DocumentViewerProps) {
    const { copyWithFeedback, isCopied } = useCopyFeedback();

    return (
        <div className="space-y-8">
            {sections.map((section, index) => (
                <div key={index} className="bg-surface border border-white/5 rounded-2xl overflow-hidden hover:border-primary/30 transition-colors shadow-sm group">
                    <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-start gap-3 mb-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 text-primary text-sm font-mono font-bold shrink-0 mt-1">
                                {index + 1}
                            </span>
                            <h3 className="text-xl font-semibold text-white flex-1 break-words leading-relaxed">
                                {section.title}
                            </h3>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => copyWithFeedback(section.content, index, onCopy)}
                                    className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 opacity-0 group-hover:opacity-100"
                                    title="내용 복사"
                                >
                                    {isCopied(index) ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                                </button>
                                <button
                                    onClick={() => onRefine(index)}
                                    className="text-zinc-500 hover:text-purple-400 transition-colors p-2 rounded-lg hover:bg-purple-500/10 opacity-0 group-hover:opacity-100"
                                    title="AI 교정"
                                >
                                    <Sparkles size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 pl-10">
                            <span className="text-sm text-zinc-500 font-mono">
                                {section.content.length}자
                            </span>
                        </div>
                    </div>
                    <div className="p-8 text-zinc-300 leading-relaxed whitespace-pre-wrap text-lg">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                </div>
            ))}
        </div>
    );
}
