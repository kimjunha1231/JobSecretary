'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftOpen } from 'lucide-react';
import { GlobalSidebar } from '@/widgets';
import { usePathname } from 'next/navigation';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-background text-zinc-100 flex font-sans selection:bg-primary/30 selection:text-white">
      {!isLandingPage && (
        <GlobalSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      )}

      <motion.main
        layout
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
        className="flex-1 relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background w-full min-h-screen"
      >
        <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0"></div>

        <AnimatePresence>
          {!isSidebarOpen && !isLandingPage && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => setIsSidebarOpen(true)}
              className="fixed top-6 left-6 z-[40] p-3 bg-surface border border-white/20 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all shadow-xl"
              aria-label="사이드바 열기"
            >
              <PanelLeftOpen size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        <div className={`${isLandingPage ? '' : 'max-w-[1600px] mx-auto px-4 py-4 md:px-6 md:py-8'} relative z-10`}>
          {children}
        </div>
      </motion.main>
    </div>
  );
};
