'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { BaseModal } from '@/shared/ui';
import { StatusConfirmationDialogProps } from '../types';
import { useStatusConfirmation } from '../hooks';

export default function StatusConfirmationDialog({ isOpen, onClose, onConfirm }: StatusConfirmationDialogProps) {
    const {
        documentStatus,
        setDocumentStatus,
        finalStatus,
        setFinalStatus,
        handleConfirm,
        canConfirm
    } = useStatusConfirmation(onConfirm);

    const footer = (
        <div className="flex gap-3">
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
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="지원 결과 입력"
            footer={footer}
        >
            <div className="space-y-6">
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
        </BaseModal>
    );
}
