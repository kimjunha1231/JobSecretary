'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

export interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg';
    showCloseButton?: boolean;
    closeOnBackdropClick?: boolean;
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
};

export function BaseModal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    showCloseButton = true,
    closeOnBackdropClick = true
}: BaseModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeOnBackdropClick ? onClose : undefined}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full ${sizeClasses[size]} pointer-events-auto max-h-[90vh] overflow-y-auto`}>
                            {(title || showCloseButton) && (
                                <div className="flex items-center justify-between p-6 pb-0">
                                    {title && (
                                        <h2 className="text-xl font-bold text-white">{title}</h2>
                                    )}
                                    {showCloseButton && (
                                        <button
                                            onClick={onClose}
                                            className="p-1 text-zinc-500 hover:text-white transition-colors ml-auto"
                                        >
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="p-6">
                                {children}
                            </div>

                            {footer && (
                                <div className="p-6 pt-0">
                                    {footer}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
