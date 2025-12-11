'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Archive, Command, PanelLeftClose, LogOut, LayoutDashboard, FileText, Shield, UserX, Mail, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/shared/store/useAuthStore';
import { DeleteAccountModal } from '@/features/auth';

const SidebarItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const pathname = usePathname();
  const isActive = pathname === to;

  return (
    <Link
      href={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative ${isActive
        ? 'text-white bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
        } `}
    >
      <span className={`${isActive ? 'text-primary' : 'text-zinc-500 group-hover:text-zinc-300'} `}>
        {icon}
      </span>
      <span className="whitespace-nowrap overflow-hidden">{label}</span>
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute left-0 w-1 h-5 bg-primary rounded-r-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </Link>
  );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const { user, isLoading, signInWithGoogle, signOut, showAlert } = useAuth();

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      showAlert('회원 탈퇴가 완료되었습니다. 모든 데이터가 삭제되었습니다.', 'success');
      setIsDeleteModalOpen(false);
      router.refresh();

      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      console.error('Error deleting account:', error);
      showAlert('회원 탈퇴 중 오류가 발생했습니다.', 'error');
      setIsDeleteModalOpen(false);
    }
  };

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
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={20} className="animate-spin text-zinc-500" />
              </div>
            ) : user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {user.user_metadata.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Profile" className="w-8 h-8 rounded-full border border-zinc-600" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600 flex items-center justify-center text-xs font-bold">
                        {user.email?.[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-white max-w-[100px] truncate">{user.user_metadata.full_name || user.email?.split('@')[0]}</span>
                    </div>
                  </div>
                  <button
                    onClick={signOut}
                    className="text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded"
                    title="로그아웃"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 border border-transparent hover:border-red-500/30"
                >
                  <UserX size={14} />
                  <span>회원 탈퇴</span>
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google 로그인
              </button>
            )}
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
