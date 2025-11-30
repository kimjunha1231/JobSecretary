'use client';

import React, { useEffect, useState } from 'react';
import { searchDocumentsByTags } from '@/actions/search';
import { Search, Copy, Loader2, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartTagInput } from '@/components/ui/smart-tag-input';
import { Badge } from '@/components/ui/badge';
import { RecommendedDoc } from '@/stores/useWriteStore';

const getTagColor = (tag: string) => {
    const colors = [
        "bg-blue-500/15 text-blue-500 border-blue-500/20 hover:bg-blue-500/25",
        "bg-green-500/15 text-green-500 border-green-500/20 hover:bg-green-500/25",
        "bg-purple-500/15 text-purple-500 border-purple-500/20 hover:bg-purple-500/25",
        "bg-orange-500/15 text-orange-500 border-orange-500/20 hover:bg-orange-500/25",
        "bg-pink-500/15 text-pink-500 border-pink-500/20 hover:bg-pink-500/25",
        "bg-cyan-500/15 text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/25",
        "bg-yellow-500/15 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/25",
        "bg-indigo-500/15 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/25",
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

interface ReferenceSidebarProps {
    searchTags: string[];
    setSearchTags: (tags: string[]) => void;
    searchResults: RecommendedDoc[];
    setSearchResults: (results: RecommendedDoc[]) => void;
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
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const fetchDocuments = async () => {
            if (searchTags.length === 0) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const docs = await searchDocumentsByTags(searchTags);
                setSearchResults(docs);
            } catch (error) {
                console.error("Failed to search documents:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(fetchDocuments, 300); // Debounce
        return () => clearTimeout(timeoutId);
    }, [searchTags, setSearchResults, setIsSearching]);

    const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="mb-6 flex items-center gap-2 text-indigo-400">
                <Search size={20} />
                <h2 className="font-semibold text-lg">참고 자료 검색</h2>
            </div>

            <div className="mb-6">
                <SmartTagInput
                    tags={searchTags}
                    onChange={setSearchTags}
                    placeholder="태그로 검색 (예: 리더십, 프로젝트)"
                    className="bg-zinc-900/50 border-white/10"
                    allowCreate={false}
                />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {searchTags.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center p-4">
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                            <FileText size={24} />
                        </div>
                        <p>태그를 입력하여<br />과거 자소서를 검색해보세요.</p>
                    </div>
                ) : isSearching ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-zinc-900/50 rounded-xl p-4 border border-white/5 animate-pulse">
                                <div className="h-4 bg-zinc-800 rounded w-3/4 mb-3" />
                                <div className="h-20 bg-zinc-800 rounded w-full mb-3" />
                                <div className="h-8 bg-zinc-800 rounded w-full" />
                            </div>
                        ))}
                        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm mt-4">
                            <Loader2 size={14} className="animate-spin" />
                            <span>문서를 검색 중입니다...</span>
                        </div>
                    </div>
                ) : searchResults.length === 0 ? (
                    <div className="text-center text-zinc-500 p-8 bg-zinc-900/30 rounded-xl border border-white/5">
                        <p>검색 결과가 없습니다.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {searchResults.map((doc) => (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                onClick={() => toggleExpand(doc.id)}
                                className={`group bg-zinc-900/40 border border-white/5 rounded-xl p-5 transition-all duration-300 backdrop-blur-sm cursor-pointer ${expandedId === doc.id ? 'bg-zinc-900/80 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'hover:bg-zinc-900/60 hover:border-indigo-500/30'}`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-medium text-white text-sm">{doc.companyName}</h3>
                                        {doc.subtitle && (
                                            <p className="text-xs text-indigo-400 mt-0.5">{doc.subtitle}</p>
                                        )}
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {doc.tags?.map(tag => (
                                                <Badge
                                                    key={tag}
                                                    variant="outline"
                                                    className={`text-[10px] px-1.5 py-0 h-5 border ${getTagColor(tag)}`}
                                                >
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                </div>

                                <div className={`relative transition-all duration-300 ${expandedId === doc.id ? '' : 'max-h-24 overflow-hidden'}`}>
                                    {doc.originalContent.split(/(?=### )/g).map((section, i) => {
                                        if (section.startsWith('### ')) {
                                            const newlineIndex = section.indexOf('\n');
                                            const title = section.slice(4, newlineIndex > -1 ? newlineIndex : undefined);
                                            const body = newlineIndex > -1 ? section.slice(newlineIndex + 1) : '';
                                            return (
                                                <div key={i} className="mb-3 last:mb-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="text-indigo-400 font-bold text-sm">{title}</h4>
                                                        <button
                                                            onClick={(e) => handleCopy(e, body.trim(), `${doc.id}-${i}`)}
                                                            className="p-1 text-zinc-500 hover:text-white hover:bg-white/10 rounded transition-colors"
                                                            title="이 문항 복사"
                                                        >
                                                            {copiedId === `${doc.id}-${i}` ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{body.trim()}</p>
                                                </div>
                                            );
                                        }
                                        return <p key={i} className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed mb-3">{section.trim()}</p>;
                                    })}
                                    {expandedId !== doc.id && (
                                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-zinc-900/40 to-transparent pointer-events-none" />
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}

