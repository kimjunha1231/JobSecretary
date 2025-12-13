'use client';

import React from 'react';
import Link from 'next/link';
import { Archive, Command, PanelLeftClose, FileText, Shield, Mail, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useGlobalSidebarLogic } from '../hooks';
import { SidebarItem } from './SidebarItem';
import { SidebarUserProfile } from './SidebarUserProfile';

const DeleteAccountModal = dynamic(() => import('@/features/auth').then(mod => mod.DeleteAccountModal), {
    ssr: false
});

interface GlobalSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GlobalSidebar: React.FC<GlobalSidebarProps> = ({ isOpen, onClose }) => {
    const {
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        user,
        isLoading,
        signInWithGoogle,
        signOut,
        handleDeleteAccount
    } = useGlobalSidebarLogic(onClose);

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                layout
                initial={false}
                animate={{
                    width: isOpen ? 256 : 0,
                    x: isOpen ? 0 : -256,
                    opacity: isOpen ? 1 : 0
                }}
                transition={{ type: "spring", stiffness: 260, damping: 32 }}
                className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto border-r border-border bg-surface flex flex-col justify-between h-screen overflow-hidden ${!isOpen && 'lg:w-0 lg:border-none'}`}
                style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
                aria-hidden={!isOpen}
            >
                <div className="p-6 w-[256px]">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                                <Command size={18} className="text-white" />
                            </div>
                            <h1 className="font-bold text-lg tracking-tight">JobSecretary</h1>
                        </div>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onClose();
                            }}
                            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded z-10"
                            title="사이드바 닫기"
                            aria-label="사이드바 닫기"
                        >
                            <PanelLeftClose size={18} />
                        </button>
                    </div>

                    <nav className="space-y-1">
                        <SidebarItem to="/dashboard" icon={<LayoutDashboard size={18} />} label="지원 현황" />
                        <SidebarItem to="/archive" icon={<Archive size={18} />} label="자기소개서 저장소" />
                    </nav>
                </div>

                <div className="p-6 space-y-4 w-[256px]">
                    {/* Policy Links */}
                    <div className="space-y-1">
                        <Link
                            href="/policy/terms"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200"
                        >
                            <FileText size={14} />
                            <span>이용약관</span>
                        </Link>
                        <Link
                            href="/policy/privacy"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200"
                        >
                            <Shield size={14} />
                            <span>개인정보처리방침</span>
                        </Link>
                        <a
                            href="mailto:rlawnsgk0610@gmail.com"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all duration-200"
                        >
                            <Mail size={14} />
                            <span>문의 : rlawnsgk0610@gmail.com</span>
                        </a>
                    </div>

                    <div className="pt-4 border-t border-border/50">
                        <SidebarUserProfile
                            user={user}
                            isLoading={isLoading}
                            onSignOut={signOut}
                            onSignIn={signInWithGoogle}
                            onDeleteAccount={() => setIsDeleteModalOpen(true)}
                        />
                    </div>
                </div>
            </motion.aside>

            {/* Delete Account Modal */}
            <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteAccount}
            />
        </>
    );
};

