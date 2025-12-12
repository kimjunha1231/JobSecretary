'use client';

import { AlertTriangle, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeleteAccountModalProps } from '../types';
import { useDeleteAccountForm } from '../hooks';

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
    isOpen,
    onClose,
    onConfirm
}) => {
    const {
        confirmText,
        setConfirmText,
        isDeleting,
        isConfirmValid,
        handleDelete
    } = useDeleteAccountForm();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="bg-neutral-900 border border-red-900/50 rounded-2xl shadow-2xl max-w-md w-full p-6"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                                <AlertTriangle className="text-red-500" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-neutral-100">회원 탈퇴</h2>
                                <p className="text-sm text-neutral-500">정말로 탈퇴하시겠습니까?</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Warning Message */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 mb-6">
                        <p className="text-sm text-red-400 font-medium mb-2">⚠️ 다음 데이터가 영구적으로 삭제됩니다:</p>
                        <ul className="text-xs text-neutral-400 space-y-1 ml-4 list-disc">
                            <li>작성한 모든 자기소개서 및 이력서</li>
                            <li>지원 현황 및 채용 공고 내역</li>
                            <li>작성 중인 모든 초안</li>
                            <li>개인정보 및 계정 설정</li>
                        </ul>
                        <p className="text-xs text-red-400 font-semibold mt-3">
                            ⚠️ 이 작업은 되돌릴 수 없습니다!
                        </p>
                    </div>

                    {/* Confirmation Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                            계속하려면 <span className="text-red-400 font-bold">"회원탈퇴"</span>를 입력하세요
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            disabled={isDeleting}
                            placeholder="회원탈퇴"
                            className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            취소
                        </button>
                        <button
                            onClick={() => handleDelete(onConfirm)}
                            disabled={!isConfirmValid || isDeleting}
                            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${isConfirmValid && !isDeleting
                                ? 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg hover:shadow-red-600/30'
                                : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                                }`}
                        >
                            {isDeleting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                                    삭제 중...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} />
                                    탈퇴하기
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
