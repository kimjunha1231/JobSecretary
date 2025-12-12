'use client';

import { Sparkles, RefreshCw, X, Check } from 'lucide-react';
import { computeDiff } from '@/shared/lib/diff';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { useRefineManager } from '../hooks';

interface RefineManagerProps {
    text: string;
    onApply: (correctedText: string) => void;
    autoTrigger?: boolean;
}

export default function RefineManager({ text, onApply, autoTrigger = false }: RefineManagerProps) {
    const { isLoading, result, handleRefine, clearResult } = useRefineManager({ text, autoTrigger });

    const handleApply = () => {
        if (result) {
            onApply(result.corrected);
            clearResult();
            toast.success('교정된 내용이 적용되었습니다.');
        }
    };

    if (result) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-5xl max-h-[85vh] flex flex-col bg-zinc-900 border border-purple-500/30 rounded-xl overflow-hidden shadow-2xl shadow-purple-900/20 animate-in zoom-in-95 duration-200">

                    <div className="flex-none flex items-center justify-between px-6 py-4 bg-zinc-950 border-b border-white/5">
                        <div className="flex items-center gap-2 text-purple-400">
                            <Sparkles size={18} />
                            <span className="text-base font-semibold">AI 맞춤법 및 어조 교정</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={clearResult}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                title="취소"
                            >
                                <X size={20} />
                            </button>
                            <button
                                onClick={handleApply}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-purple-900/20"
                                title="적용하기"
                            >
                                <Check size={18} />
                                <span>적용하기</span>
                            </button>
                        </div>
                    </div>


                    <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 min-h-full divide-y md:divide-y-0 md:divide-x divide-white/10">

                            <div className="p-6 bg-zinc-950/50">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider bg-zinc-900 px-2 py-1 rounded">교정 전</div>
                                </div>
                                <div className="text-zinc-400 text-base leading-relaxed whitespace-pre-wrap">
                                    {computeDiff(result.original, result.corrected).map((part, i) => (
                                        <span
                                            key={i}
                                            className={cn(
                                                part.type === 'removed' && "bg-red-500/20 text-red-300 line-through decoration-red-500/50",
                                                part.type === 'added' && "hidden"
                                            )}
                                        >
                                            {part.value}
                                        </span>
                                    ))}
                                </div>
                            </div>


                            <div className="p-6 bg-purple-900/5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-xs text-purple-400 font-bold uppercase tracking-wider bg-purple-900/20 px-2 py-1 rounded border border-purple-500/20">교정 후</div>
                                </div>
                                <div className="text-zinc-100 text-base leading-relaxed whitespace-pre-wrap">
                                    {computeDiff(result.original, result.corrected).map((part, i) => (
                                        <span
                                            key={i}
                                            className={cn(
                                                part.type === 'added' && "bg-green-500/20 text-green-300",
                                                part.type === 'removed' && "hidden"
                                            )}
                                        >
                                            {part.value}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>


                    {result.changes && result.changes.length > 0 && (
                        <div className="flex-none px-6 py-4 bg-zinc-950 border-t border-white/5 flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-medium text-zinc-500 mr-2 uppercase tracking-wider">Changes:</span>
                            {result.changes.map((change, index) => (
                                <span
                                    key={index}
                                    className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium rounded-full"
                                >
                                    {change}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={handleRefine}
            disabled={isLoading}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10",
                isLoading && "opacity-70 cursor-wait"
            )}
        >
            {isLoading ? (
                <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>분석 중...</span>
                </>
            ) : (
                <>
                    <Sparkles size={16} />
                    <span>AI 교정</span>
                </>
            )}
        </button>
    );
}
