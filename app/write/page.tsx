'use client';

import React, { useState, Suspense } from 'react';
import ResumeForm from '@/components/write/ResumeForm';
import ReferenceSidebar from '@/components/write/ReferenceSidebar';
import { BookOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function WriteContent() {
    const [isReferenceOpen, setIsReferenceOpen] = useState(false);

    return (
        <div className="w-full h-full overflow-hidden flex flex-col relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0">
                {/* Left Side: Resume Form */}
                <div className="col-span-1 lg:col-span-9 h-full overflow-y-auto pr-2 lg:pr-4 custom-scrollbar pb-20 lg:pb-6">
                    <div className="mb-6 lg:mb-8">
                        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">자기소개서 작성</h1>
                        <p className="text-zinc-400 text-sm lg:text-base">태그를 활용하여 과거 자소서를 참고하며 작성하세요</p>
                    </div>
                    <ResumeForm />
                </div>

                {/* Right Side: Reference Sidebar (Desktop) */}
                <div className="hidden lg:block lg:col-span-3 h-full border-l border-white/10 pl-4 min-h-0">
                    <ReferenceSidebar />
                </div>
            </div>

            {/* Mobile Reference Sidebar Toggle */}
            <button
                onClick={() => setIsReferenceOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 z-30 w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
                <BookOpen size={20} />
            </button>

            {/* Mobile Reference Sidebar Drawer */}
            <AnimatePresence>
                {isReferenceOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsReferenceOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-surface border-l border-white/10 z-50 lg:hidden shadow-2xl"
                        >
                            <div className="h-full flex flex-col p-4">
                                <div className="flex justify-end mb-2">
                                    <button
                                        onClick={() => setIsReferenceOpen(false)}
                                        className="p-2 text-zinc-400 hover:text-white"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ReferenceSidebar />
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function WritePage() {
    return (
        <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-neutral-400 text-sm">로딩 중...</p>
                </div>
            </div>
        }>
            <WriteContent />
        </Suspense>
    );
}
