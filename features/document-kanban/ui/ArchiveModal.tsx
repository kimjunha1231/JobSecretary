'use client';

import React, { useState } from 'react';
import { X, Check, XCircle } from 'lucide-react';

interface ArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (passed: boolean) => void;
}

export function ArchiveModal({ isOpen, onClose, onConfirm }: ArchiveModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async (passed: boolean) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        await onConfirm(passed);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">저장소로 이동</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="text-center space-y-6">
                    <h3 className="text-lg text-zinc-300">서류 합격 여부를 선택해주세요</h3>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => handleConfirm(true)}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Check size={20} />
                            <span>{isSubmitting ? '처리 중...' : '서류 합격'}</span>
                        </button>
                        <button
                            onClick={() => handleConfirm(false)}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <XCircle size={20} />
                            <span>{isSubmitting ? '처리 중...' : '서류 불합격'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

