'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, X, Check, ArrowRight } from 'lucide-react';
import { refineText, RefineResult } from '@/actions/refine';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RefineManagerProps {
    text: string;
    onApply: (correctedText: string) => void;
}

export default function RefineManager({ text, onApply }: RefineManagerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<RefineResult | null>(null);

    const handleRefine = async () => {
        if (!text || text.trim().length < 10) {
            toast.error('교정할 텍스트가 너무 짧습니다. (10자 이상)');
            return;
        }

        setIsLoading(true);
        try {
            const refineResult = await refineText(text);
            if (refineResult) {
                setResult(refineResult);
            } else {
                toast.error('AI 교정에 실패했습니다. 잠시 후 다시 시도해주세요.');
            }
        } catch (error) {
            console.error('Refine failed:', error);
            toast.error('오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (result) {
            onApply(result.corrected);
            setResult(null);
            toast.success('교정된 내용이 적용되었습니다.');
        }
    };

    const handleCancel = () => {
        setResult(null);
    };

    if (result) {
        return (
            <div className="w-full mt-4 animate-in fade-in slide-in-from-top duration-300">
                <div className="bg-zinc-900 border border-purple-500/30 rounded-xl overflow-hidden shadow-2xl shadow-purple-900/20">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-white/5">
                        <div className="flex items-center gap-2 text-purple-400">
                            <Sparkles size={16} />
                            <span className="text-sm font-medium">AI 맞춤법 및 윤문 교정</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCancel}
                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                title="취소"
                            >
                                <X size={18} />
                            </button>
                            <button
                                onClick={handleApply}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                                title="적용하기"
                            >
                                <Check size={16} />
                                <span>적용</span>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
                        {/* Original */}
                        <div className="p-4 bg-zinc-950/50">
                            <div className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">Original</div>
                            <div className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                                {result.original}
                            </div>
                        </div>

                        {/* Corrected */}
                        <div className="p-4 bg-purple-900/10">
                            <div className="text-xs text-purple-400 mb-2 font-medium uppercase tracking-wider">Refined</div>
                            <div className="text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap">
                                {result.corrected}
                            </div>
                        </div>
                    </div>

                    {/* Changes Summary */}
                    {result.changes && result.changes.length > 0 && (
                        <div className="px-4 py-3 bg-zinc-950/80 border-t border-white/5 flex flex-wrap gap-2 items-center">
                            <span className="text-xs text-zinc-500 mr-1">변경사항:</span>
                            {result.changes.map((change, index) => (
                                <span
                                    key={index}
                                    className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs rounded-full"
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
