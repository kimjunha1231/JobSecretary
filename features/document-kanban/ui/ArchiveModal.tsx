'use client';

import { Check, XCircle } from 'lucide-react';
import { BaseModal } from '@/shared/ui';
import { ArchiveModalProps } from '../types';
import { useArchiveModal } from '../hooks';

export function ArchiveModal({ isOpen, onClose, onConfirm }: ArchiveModalProps) {
    const { isSubmitting, handleConfirm } = useArchiveModal(onConfirm);

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="저장소로 이동"
        >
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
        </BaseModal>
    );
}
