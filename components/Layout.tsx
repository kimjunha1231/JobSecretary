'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Archive, PenTool, Command, PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

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

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, signInWithGoogle, signOut } = useAuth();

  // Handle responsive sidebar state
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-background text-zinc-100 flex font-sans overflow-hidden selection:bg-primary/30 selection:text-white">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        layout
        initial={false}
        animate={{
          width: isSidebarOpen ? 256 : 0,
          x: isSidebarOpen ? 0 : -256,
          opacity: isSidebarOpen ? 1 : 0
        }}
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto border-r border-border bg-surface/95 backdrop-blur-xl flex flex-col justify-between h-screen overflow-hidden ${!isSidebarOpen && 'lg:w-0 lg:border-none'}`}
        style={{ pointerEvents: isSidebarOpen ? 'auto' : 'none' }}
        aria-hidden={!isSidebarOpen}
      >
        <div className="p-6 w-[256px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                <Command size={18} className="text-white" />
              </div>
              <h1 className="font-bold text-lg tracking-tight">CoverLetter Vault</h1>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSidebarOpen(false);
              }}
              className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded z-10"
              title="사이드바 닫기"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

          <nav className="space-y-1">
            <SidebarItem to="/archive" icon={<Archive size={18} />} label="아카이브" />
            <SidebarItem to="/write" icon={<PenTool size={18} />} label="작성하기" />
          </nav>
        </div>

        <div className="p-6 space-y-4 w-[256px]">
          <div className="pt-4 border-t border-border/50">
            {user ? (
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

      {/* Main Content */}
      <motion.main
        layout
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
        className="flex-1 relative overflow-y-auto h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background w-full"
      >
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

        {/* Open Sidebar Button */}
        <AnimatePresence>
          {!isSidebarOpen && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => setIsSidebarOpen(true)}
              className="fixed top-6 left-6 z-[40] p-3 bg-surface border border-white/20 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all shadow-xl"
            >
              <PanelLeftOpen size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto p-4 md:p-8 relative z-10 h-full">
          {children}
        </div>
      </motion.main>
    </div>
  );
};