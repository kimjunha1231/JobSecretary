'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Archive, PenTool, Sparkles, Command, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AiSidebar } from './AiSidebar';

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
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background text-zinc-100 flex font-sans overflow-hidden selection:bg-primary/30 selection:text-white">
      {/* Sidebar */}
      <motion.aside
        layout
        initial={false}
        animate={{
          width: isSidebarOpen ? 256 : 0,
          opacity: isSidebarOpen ? 1 : 0
        }}
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
        className="flex-shrink-0 border-r border-border bg-surface/50 backdrop-blur-xl flex flex-col justify-between h-screen sticky top-0 z-20 overflow-hidden"
        style={{ pointerEvents: isSidebarOpen ? 'auto' : 'none' }}
        aria-hidden={!isSidebarOpen}
      >
        <div className="p-6 w-[256px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                <Command size={18} className="text-white" />
              </div>
              <h1 className="font-bold text-lg tracking-tight">CareerVault</h1>
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
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white">Alex Dev</span>
                <span className="text-[10px] text-zinc-500">무료 플랜</span>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <motion.main
        layout
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
        className="flex-1 relative overflow-y-auto h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background"
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
              className="fixed top-6 left-6 z-[100] p-3 bg-surface border border-white/20 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all shadow-xl"
            >
              <PanelLeftOpen size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto p-8 relative z-10 h-full">
          {children}
        </div>

        {/* Floating AI Assistant Button */}
        <motion.button
          onClick={() => setIsAiOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-tr from-primary to-purple-600 text-white rounded-full shadow-2xl hover:shadow-primary/50 hover:scale-110 transition-all duration-200 group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
        </motion.button>
      </motion.main>

      {/* Global AI Sidebar */}
      <AiSidebar isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
};