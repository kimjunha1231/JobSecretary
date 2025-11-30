'use client';

import React from 'react';
import { Search, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartTagInput } from '@/components/ui/smart-tag-input';
import { searchDocumentsByTags } from '@/actions/search';
import { RecommendedDoc } from '@/store/useDraftStore';

interface ReferenceSidebarProps {
    searchTags: string[];
    setSearchTags: (tags: string[]) => void;
    searchResults: RecommendedDoc[];
    setSearchResults: (docs: RecommendedDoc[]) => void;
    isSearching: boolean;
    setIsSearching: (isSearching: boolean) => void;
}

export default function ReferenceSidebar({
    searchTags,
    setSearchTags,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching
}: ReferenceSidebarProps) {
    const [expandedDocId, setExpandedDocId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchReferences = async () => {
            if (searchTags.length === 0) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const results = await searchDocumentsByTags(searchTags);
                setSearchResults(results);
            } catch (error) {
                console.error('Failed to search references:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(fetchReferences, 500);
        return () => clearTimeout(debounceTimer);
    }, [searchTags, setIsSearching, setSearchResults]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here
    };

    return (
        <div className="h-full flex flex-col">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">참고 자료 검색</h2>
                <p className="text-sm text-zinc-400 mb-4">
                    태그를 입력하여 과거 자기소개서를 찾아보세요
                </p>
                <SmartTagInput
                    tags={searchTags}
                    onChange={setSearchTags}
                    placeholder="태그 입력 (예: 도전, 협업)"
                    className="bg-zinc-900 border-zinc-700"
                />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
                {isSearching ? (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                        <p className="text-sm">검색 중...</p>
                    </div>
                ) : searchResults.length > 0 ? (
                    <div className="space-y-4">
                        {searchResults.map((doc) => (
                            <div
                                key={doc.id}
                                className="bg-zinc-900/50 border border-white/5 rounded-lg overflow-hidden transition-all hover:border-white/10"
                            >
                                <div
                                    onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                                    className="p-4 cursor-pointer flex items-start justify-between"
                                >
                                    <div>
                                        <h3 className="font-medium text-white text-sm">{doc.companyName}</h3>
                                        {doc.subtitle && (
                                            <p className="text-xs text-indigo-400 mt-0.5">{doc.subtitle}</p>
                                        )}
                                        {doc.tags && doc.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {doc.tags.map(tag => (
                                                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {expandedDocId === doc.id ? (
                                        <ChevronUp size={16} className="text-zinc-500" />
                                    ) : (
                                        <ChevronDown size={16} className="text-zinc-500" />
                                    )}
                                </div>

                                <AnimatePresence>
                                    {expandedDocId === doc.id && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: 'auto' }}
                                            exit={{ height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0 border-t border-white/5 bg-zinc-900/30">
                                                {doc.originalContent.split(/(?=### )/g).map((section, i) => {
                                                    const titleMatch = section.match(/^### (.*)(\n|$)/);
                                                    const title = titleMatch ? titleMatch[1].trim() : '내용';
                                                    const content = section.replace(/^### .*\n?/, '').trim();

                                                    if (!content) return null;

                                                    return (
                                                        <div key={i} className="mb-4 last:mb-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs font-medium text-zinc-300">{title}</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCopy(content);
                                                                    }}
                                                                    className="p-1 text-zinc-500 hover:text-white transition-colors"
                                                                    title="내용 복사"
                                                                >
                                                                    <Copy size={12} />
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-4 hover:line-clamp-none transition-all">
                                                                {content}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                ) : searchTags.length > 0 ? (
                    <div className="text-center py-10 text-zinc-500">
                        <Search size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">검색 결과가 없습니다</p>
                    </div>
                ) : (
                    <div className="text-center py-10 text-zinc-500">
                        <Search size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">태그를 입력하여 검색해보세요</p>
                    </div>
                )}
            </div>
        </div>
    );
}
