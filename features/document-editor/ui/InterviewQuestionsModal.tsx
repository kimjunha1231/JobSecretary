'use client';

import { useEffect } from 'react';
import { X, Copy, RefreshCw, MessageCircleQuestion, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInterviewQuestions, InterviewQuestionsModalProps } from '@/features/document-editor';

export function InterviewQuestionsModal({
    isOpen,
    onClose,
    documentContent
}: InterviewQuestionsModalProps) {
    const { questions, isLoading, hasQuestions, handleGenerate, handleCopyAll } = useInterviewQuestions(documentContent);

    useEffect(() => {
        if (isOpen && !hasQuestions) {
            handleGenerate();
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                        <MessageCircleQuestion className="text-indigo-400" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">예상 면접 질문</h2>
                                        <p className="text-sm text-zinc-400">AI가 분석한 맞춤형 면접 질문입니다.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                                        <p className="text-lg font-medium text-zinc-300">질문을 생성하고 있습니다...</p>
                                        <p className="text-sm mt-2">잠시만 기다려주세요.</p>
                                    </div>
                                ) : hasQuestions ? (
                                    <div className="space-y-4">
                                        {questions.map((question, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="bg-zinc-800/50 border border-white/5 rounded-xl p-5 hover:border-indigo-500/30 transition-colors group"
                                            >
                                                <div className="flex gap-4">
                                                    <span className="text-indigo-400 font-mono font-bold text-lg">Q{index + 1}.</span>
                                                    <p className="text-zinc-200 text-lg leading-relaxed">{question}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-zinc-500">
                                        <p>생성된 질문이 없습니다.</p>
                                        <button
                                            onClick={handleGenerate}
                                            className="mt-4 text-indigo-400 hover:underline"
                                        >
                                            다시 시도하기
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-white/10 bg-zinc-900/50 flex justify-between items-center">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                                    <span>다시 생성</span>
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-5 py-2.5 text-zinc-400 hover:text-white transition-colors"
                                    >
                                        닫기
                                    </button>
                                    <button
                                        onClick={handleCopyAll}
                                        disabled={isLoading || !hasQuestions}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Copy size={18} />
                                        <span>전체 복사</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
