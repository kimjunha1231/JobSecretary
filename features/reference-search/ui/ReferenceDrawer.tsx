import React from 'react';
import { BookOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReferenceSidebar from './ReferenceSidebar';
import { RecommendedDoc } from '@/shared/store/useDraftStore';

interface ReferenceDrawerProps {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    searchProps: {
        searchTags: string[];
        setSearchTags: (tags: string[]) => void;
        searchResults: RecommendedDoc[];
        setSearchResults: (results: RecommendedDoc[]) => void;
        isSearching: boolean;
        setIsSearching: (isSearching: boolean) => void;
    };
}

export function ReferenceDrawer({ isOpen, onOpen, onClose, searchProps }: ReferenceDrawerProps) {
    return (
        <>
            <button
                onClick={onOpen}
                className="lg:hidden fixed bottom-6 right-6 z-30 w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
                <BookOpen size={20} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
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
                                        onClick={onClose}
                                        className="p-2 text-zinc-400 hover:text-white"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ReferenceSidebar {...searchProps} />
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
