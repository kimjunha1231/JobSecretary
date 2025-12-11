'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, XCircle } from 'lucide-react';

interface StatusConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (result: { finalStatus: string; documentStatus: 'pass' | 'fail' | null }) => void;
}

export default function StatusConfirmationDialog({ isOpen, onClose, onConfirm }: StatusConfirmationDialogProps) {
    const [documentStatus, setDocumentStatus] = useState<'pass' | 'fail' | null>(null);
    const [finalStatus, setFinalStatus] = useState<'pass' | 'fail' | null>(null);

    if (!isOpen) return null;

    const handleConfirm = () => {
        // Determine the final status based on selections
        let status = 'writing';

        if (finalStatus === 'pass') {
            status = 'pass';
        } else if (finalStatus === 'fail') {
            status = 'fail';
        } else if (documentStatus === 'pass') {
            status = 'interview';
        } else if (documentStatus === 'fail') {
            status = 'fail';
        } else {
            status = 'applied';
        }

        onConfirm({
            finalStatus: status,
            documentStatus
        });
    };

    const canConfirm = documentStatus !== null || finalStatus !== null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative bg-surface border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">지원 결과 입력</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {/* Document Screening */}
                    <div>
                        <label className="text-sm font-medium text-zinc-300 mb-3 block">
                            서류 전형 결과
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setDocumentStatus('pass')}
                                className={`p-4 rounded-xl border-2 transition-all ${documentStatus === 'pass'
                                        ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                    }`}
                            >
                                <CheckCircle2 className="w-5 h-5 mx-auto mb-2" />
                                <span className="text-sm font-medium">합격</span>
                            </button>
                            <button
                                onClick={() => setDocumentStatus('fail')}
                                className={`p-4 rounded-xl border-2 transition-all ${documentStatus === 'fail'
                                        ? 'bg-red-500/10 border-red-500 text-red-400'
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                    }`}
                            >
                                <XCircle className="w-5 h-5 mx-auto mb-2" />
                                <span className="text-sm font-medium">불합격</span>
                            </button>
                        </div>
                    </div>

                    {/* Final Result */}
                    <div>
                        <label className="text-sm font-medium text-zinc-300 mb-3 block">
                            최종 합격 여부
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setFinalStatus('pass')}
                                className={`p-4 rounded-xl border-2 transition-all ${finalStatus === 'pass'
                                        ? 'bg-green-500/10 border-green-500 text-green-400'
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                    }`}
                            >
                                <CheckCircle2 className="w-5 h-5 mx-auto mb-2" />
                                <span className="text-sm font-medium">최종 합격</span>
                            </button>
                            <button
                                onClick={() => setFinalStatus('fail')}
                                className={`p-4 rounded-xl border-2 transition-all ${finalStatus === 'fail'
                                        ? 'bg-red-500/10 border-red-500 text-red-400'
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                    }`}
                            >
                                <XCircle className="w-5 h-5 mx-auto mb-2" />
                                <span className="text-sm font-medium">최종 불합격</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}
