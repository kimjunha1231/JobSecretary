'use client';

import { Check, XCircle } from 'lucide-react';
import { BaseModal } from '@/shared/ui';
import { ResultSelectionModalProps } from '../types';
import { useResultModal } from '../hooks';

export function ResultSelectionModal({ isOpen, onClose, onConfirm }: ResultSelectionModalProps) {
    const { isSubmitting, handleConfirm } = useResultModal(onConfirm);

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="결과 입력"
        >
            <div className="text-center space-y-6">
                <h3 className="text-lg text-zinc-300">합격 여부를 선택해주세요</h3>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => handleConfirm('pass')}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Check size={20} />
                        <span>{isSubmitting ? '처리 중...' : '합격'}</span>
                    </button>
                    <button
                        onClick={() => handleConfirm('fail')}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <XCircle size={20} />
                        <span>{isSubmitting ? '처리 중...' : '불합격'}</span>
                    </button>
                </div>
            </div>
        </BaseModal>
    );
}
