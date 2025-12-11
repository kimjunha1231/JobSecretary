'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = '확인',
    message = '계속하시겠습니까?',
    confirmText = '확인',
    cancelText = '취소',
    variant = 'warning'
}: ConfirmationModalProps) {
    const variantStyles = {
        danger: {
            icon: 'text-red-400',
            iconBg: 'bg-red-500/10 border-red-500/20',
            button: 'bg-red-500 hover:bg-red-600'
        },
        warning: {
            icon: 'text-yellow-400',
            iconBg: 'bg-yellow-500/10 border-yellow-500/20',
            button: 'bg-yellow-500 hover:bg-yellow-600'
        },
        info: {
            icon: 'text-blue-400',
            iconBg: 'bg-blue-500/10 border-blue-500/20',
            button: 'bg-blue-500 hover:bg-blue-600'
        }
    };

    const styles = variantStyles[variant];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
                    >
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 w-full max-w-md pointer-events-auto relative">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            {/* Icon */}
                            <div className={`flex items-center justify-center w-12 h-12 rounded-full border mb-4 ${styles.iconBg}`}>
                                <AlertCircle className={styles.icon} size={24} />
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-bold text-white mb-2">
                                {title}
                            </h3>

                            {/* Message */}
                            <p className="text-zinc-400 mb-6">
                                {message}
                            </p>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors ${styles.button}`}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
