'use client';

import React, { useState } from 'react';
import { useDocuments } from '@/context/DocumentContext';
import { updateDocumentOrder, toggleDocumentFavorite } from '@/actions/document';
import { Trash2, Search, FileText, PenTool, Calendar, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableDocumentCard } from '@/components/SortableDocumentCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

export default function Archive() {
    const { documents, deleteDocument } = useDocuments();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilters, setSelectedFilters] = useState<string[]>(['all']);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [items, setItems] = useState(documents.filter(doc => doc.isArchived));
    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);
    const [isInlineDeleteModalOpen, setIsInlineDeleteModalOpen] = useState(false);
    const [inlineDeleteTargetId, setInlineDeleteTargetId] = useState<string | null>(null);
    const router = useRouter();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    React.useEffect(() => {
        setItems(documents.filter(doc => doc.isArchived));
    }, [documents]);

    // Reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedFilters, startDate, endDate, selectedTags]);

    // Extract all unique tags
    const allTags = Array.from(new Set(documents.flatMap(doc => doc.tags || []))).sort();

    const toggleFilter = (filter: string) => {
        if (filter === 'all') {
            setSelectedFilters(['all']);
            return;
        }

        setSelectedFilters(prev => {
            const newFilters = prev.filter(f => f !== 'all');
            if (newFilters.includes(filter)) {
                const filtered = newFilters.filter(f => f !== filter);
                return filtered.length === 0 ? ['all'] : filtered;
            } else {
                return [...newFilters, filter];
            }
        });
    };

    const filteredDocs = items.filter(doc => {
        const matchesSearch = searchTerm === '' ||
            doc.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.role.toLowerCase().includes(searchTerm.toLowerCase());

        const isAll = selectedFilters.includes('all');
        const statusFilters = selectedFilters.filter(f => f !== 'all' && f !== 'favorite' && !f.startsWith('screening-'));
        const screeningFilters = selectedFilters.filter(f => f.startsWith('screening-'));
        const showFavorite = selectedFilters.includes('favorite');

        const matchesStatus = isAll ||
            ((statusFilters.length === 0 || statusFilters.includes(doc.status)) &&
                (!showFavorite || doc.isFavorite));

        // Check screening status filters
        const matchesScreening = screeningFilters.length === 0 ||
            (screeningFilters.includes('screening-pass') && doc.documentScreeningStatus === 'pass') ||
            (screeningFilters.includes('screening-fail') && doc.documentScreeningStatus === 'fail');

        let matchesDate = true;
        if (startDate && endDate) {
            const docDate = new Date(doc.createdAt).setHours(0, 0, 0, 0);
            const start = new Date(startDate).setHours(0, 0, 0, 0);
            const end = new Date(endDate).setHours(0, 0, 0, 0);
            matchesDate = docDate >= start && docDate <= end;
        } else if (startDate) {
            const docDate = new Date(doc.createdAt).setHours(0, 0, 0, 0);
            const start = new Date(startDate).setHours(0, 0, 0, 0);
            matchesDate = docDate >= start;
        } else if (endDate) {
            const docDate = new Date(doc.createdAt).setHours(0, 0, 0, 0);
            const end = new Date(endDate).setHours(0, 0, 0, 0);
            matchesDate = docDate <= end;
        }

        const matchesTags = selectedTags.length === 0 ||
            (doc.tags && selectedTags.some(tag => doc.tags.includes(tag)));

        return matchesSearch && matchesStatus && matchesScreening && matchesDate && matchesTags;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
    const paginatedDocs = filteredDocs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
        // Optimistic update
        setItems(prev => prev.map(item => item.id === id ? { ...item, isFavorite } : item));
        try {
            await toggleDocumentFavorite(id, isFavorite);
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            // Revert on error
            setItems(prev => prev.map(item => item.id === id ? { ...item, isFavorite: !isFavorite } : item));
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                const newItems = arrayMove(items, oldIndex, newIndex);

                // Update positions in backend
                const updates = newItems.map((item, index) => ({
                    id: item.id,
                    position: index
                }));
                // Call without await here to avoid blocking UI, handle errors separately if needed
                updateDocumentOrder(updates).catch(error => {
                    console.error('Failed to update order:', error);
                    // Revert on error could be implemented here if needed
                });

                return newItems;
            });
        }
        setActiveId(null);
    };

    const activeDoc = activeId ? items.find(doc => doc.id === activeId) : null;

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">JobSecretary</h1>
                    <p className="text-zinc-400">저장된 자기소개서를 관리하세요</p>
                </div>
                <button
                    onClick={() => router.push('/write?from=archive')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(255,255,255,0.5)] hover:shadow-[0_0_25px_rgba(255,255,255,0.6)] active:scale-95"
                >
                    <PenTool size={18} />
                    <span>작성하기</span>
                </button>
            </div>

            {/* Statistics Section */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center">
                    <span className="text-zinc-400 text-sm mb-1">서류 합격률</span>
                    <span className="text-3xl font-bold text-emerald-400">
                        {documents.length > 0
                            ? Math.round((documents.filter(doc => doc.documentScreeningStatus === 'pass').length / documents.length) * 100)
                            : 0}%
                    </span>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center">
                    <span className="text-zinc-400 text-sm mb-1">서류 합격 / 전체 공고</span>
                    <div className="flex items-end gap-1">
                        <span className="text-3xl font-bold text-white">
                            {documents.filter(doc => doc.documentScreeningStatus === 'pass').length}
                        </span>
                        <span className="text-zinc-500 text-lg mb-1">/</span>
                        <span className="text-zinc-500 text-lg mb-1">{documents.length}</span>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="space-y-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Status Filter Tabs */}
                    <div className="flex flex-wrap gap-2">

                        <button
                            onClick={() => toggleFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedFilters.includes('all')
                                ? 'bg-zinc-700 text-white border border-zinc-600'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                        >
                            전체
                        </button>
                        <button
                            onClick={() => toggleFilter('pass')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedFilters.includes('pass')
                                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                        >
                            합격
                        </button>
                        <button
                            onClick={() => toggleFilter('fail')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedFilters.includes('fail')
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                        >
                            불합격
                        </button>

                        <div className="w-px h-8 bg-zinc-700 mx-2" />

                        <button
                            onClick={() => toggleFilter('screening-pass')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedFilters.includes('screening-pass')
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                        >
                            서류합격
                        </button>

                        <div className="w-px h-8 bg-zinc-700 mx-2" />

                        {/* Favorite Filter */}
                        <button
                            onClick={() => toggleFilter('favorite')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedFilters.includes('favorite')
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                        >
                            ⭐ 즐겨찾기
                        </button>
                    </div>

                    {/* Date Filter */}
                    <DateRangeFilter
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                        onClear={() => {
                            setStartDate('');
                            setEndDate('');
                        }}
                    />
                </div>

                {/* Tag Filter and Items Per Page */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {allTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs text-zinc-500 mr-2">태그:</span>
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`px-2 py-1 rounded text-xs border transition-colors ${selectedTags.includes(tag)
                                        ? 'bg-primary/20 text-primary border-primary/50'
                                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                                        }`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Items Per Page Selector Removed */}
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                        type="text"
                        placeholder="회사명 또는 직무로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-primary transition-colors"
                    />
                </div>
            </div>

            {/* Documents Grid */}
            {searchTerm || !selectedFilters.includes('all') || startDate || endDate || selectedTags.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {paginatedDocs.map((doc, index) => (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => router.push(`/document/${doc.id}`)}
                                className="bg-surface border border-white/5 rounded-xl p-5 hover:border-primary/50 transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleFavorite(doc.id, !doc.isFavorite);
                                            }}
                                            className={`text-zinc-600 hover:text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity ${doc.isFavorite ? 'text-yellow-400 opacity-100' : ''}`}
                                        >
                                            <Star size={16} fill={doc.isFavorite ? "currentColor" : "none"} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setInlineDeleteTargetId(doc.id);
                                                setIsInlineDeleteModalOpen(true);
                                            }}
                                            className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        <h3 className="text-lg font-medium text-white mb-1">{doc.company}</h3>
                                        <p className="text-sm text-zinc-400">{doc.role}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-1 rounded-full border ${doc.status === 'pass' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                doc.status === 'fail' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    doc.status === 'writing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        doc.status === 'interview' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                            'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                }`}>
                                                {doc.status === 'pass' ? '합격' :
                                                    doc.status === 'fail' ? '불합격' :
                                                        doc.status === 'writing' ? '작성 중' :
                                                            doc.status === 'interview' ? '면접 진행 중' :
                                                                doc.status === 'applied' ? '지원 완료' : doc.status
                                                }
                                            </span>

                                            {/* Document Screening Status Badge */}
                                            {doc.documentScreeningStatus && (
                                                <span className={`text-xs px-2 py-1 rounded-full border ${doc.documentScreeningStatus === 'pass'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                    }`}>
                                                    서류 {doc.documentScreeningStatus === 'pass' ? '합격' : '불합격'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                                            <Calendar size={12} />
                                            <span>{doc.createdAt}</span>
                                        </div>
                                    </div>
                                    {/* Tags */}
                                    {doc.tags && doc.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {doc.tags.map((tag, index) => (
                                                <span key={index} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded border border-zinc-700">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={paginatedDocs.map(doc => doc.id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedDocs.map((doc) => (
                                <SortableDocumentCard
                                    key={doc.id}
                                    doc={doc}
                                    onDelete={deleteDocument}
                                    onToggleFavorite={handleToggleFavorite}
                                />
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeDoc ? (
                            <div className="bg-surface border border-primary/50 rounded-xl p-5 shadow-2xl scale-105 cursor-grabbing">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <button className="text-zinc-600">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <h3 className="text-lg font-medium text-white mb-1">{activeDoc.company}</h3>
                                        <p className="text-sm text-zinc-400">{activeDoc.role}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className={`text-xs px-2 py-1 rounded-full border ${activeDoc.status === 'pass' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            activeDoc.status === 'fail' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                activeDoc.status === 'writing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    activeDoc.status === 'interview' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                        'bg-zinc-800 text-zinc-400 border-zinc-700'
                                            }`}>
                                            {activeDoc.status === 'pass' ? '합격' :
                                                activeDoc.status === 'fail' ? '불합격' :
                                                    activeDoc.status === 'writing' ? '작성 중' :
                                                        activeDoc.status === 'applied' ? '지원 완료' :
                                                            activeDoc.status === 'interview' ? '면접 진행 중' : activeDoc.status}
                                        </span>
                                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                                            <Calendar size={12} />
                                            <span>{activeDoc.createdAt}</span>
                                        </div>
                                    </div>
                                    {/* Tags */}
                                    {activeDoc.tags && activeDoc.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {activeDoc.tags.map((tag, index) => (
                                                <span key={index} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded border border-zinc-700">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {/* Pagination Controls */}
            {/* Footer: Pagination & Items Per Page */}
            <div className="flex flex-col items-center gap-4 mt-8">
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 disabled:opacity-50 hover:bg-zinc-700 transition-colors text-xs"
                        >
                            {'<<'}
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded bg-zinc-800 text-zinc-400 disabled:opacity-50 hover:bg-zinc-700 transition-colors"
                        >
                            이전
                        </button>
                        <div className="flex gap-1">
                            {(() => {
                                const maxVisible = 5;
                                let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                                let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                                if (endPage - startPage + 1 < maxVisible) {
                                    startPage = Math.max(1, endPage - maxVisible + 1);
                                }

                                return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded flex items-center justify-center text-sm transition-colors ${currentPage === page
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ));
                            })()}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 rounded bg-zinc-800 text-zinc-400 disabled:opacity-50 hover:bg-zinc-700 transition-colors"
                        >
                            다음
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 disabled:opacity-50 hover:bg-zinc-700 transition-colors text-xs"
                        >
                            {'>>'}
                        </button>
                    </div>
                )}

                {/* Items Per Page Input */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">페이지당 보기:</span>
                    <input
                        type="number"
                        min="1"
                        value={itemsPerPage}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0) {
                                setItemsPerPage(val);
                            }
                        }}
                        className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1 w-16 text-center focus:outline-none focus:border-primary"
                    />
                    <span className="text-xs text-zinc-500">개</span>
                </div>
            </div>

            {filteredDocs.length === 0 && (
                <div className="text-center py-20 text-zinc-500">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>저장된 문서가 없습니다.</p>
                </div>
            )}

            <ConfirmationModal
                isOpen={isInlineDeleteModalOpen}
                onClose={() => {
                    setIsInlineDeleteModalOpen(false);
                    setInlineDeleteTargetId(null);
                }}
                onConfirm={() => {
                    if (inlineDeleteTargetId) {
                        deleteDocument(inlineDeleteTargetId);
                        setInlineDeleteTargetId(null);
                    }
                }}
                title="삭제 확인"
                message="정말 삭제하시겠습니까?"
                confirmText="삭제"
                variant="danger"
            />
        </div>
    );
}
