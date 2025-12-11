'use client';

import React, { useState } from 'react';
import { useArchivedDocuments, useDeleteDocument, toggleDocumentFavorite, updateDocumentOrder } from '@/entities/document';
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
import { SortableDocumentCard } from '@/entities/document';
import { DateRangeFilter, ConfirmationModal } from '@/shared/ui';
import { useArchiveFilters } from '@/features/document-archive';

import { Document } from '@/types';

const EMPTY_LIST: Document[] = [];

export default function Archive() {
    const { data } = useArchivedDocuments();
    const archivedDocuments = data || EMPTY_LIST;
    const deleteDocumentMutation = useDeleteDocument();
    const [items, setItems] = useState(archivedDocuments);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);
    const [isInlineDeleteModalOpen, setIsInlineDeleteModalOpen] = useState(false);
    const [inlineDeleteTargetId, setInlineDeleteTargetId] = useState<string | null>(null);
    const router = useRouter();

    // Use Custom Hook for Filters
    const {
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        screeningFilter,
        setScreeningFilter,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        selectedTags,
        setSelectedTags,
        favoriteFilter,
        setFavoriteFilter,
        filteredDocs
    } = useArchiveFilters(items);

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
        setItems(archivedDocuments);
    }, [archivedDocuments]);

    // Reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, screeningFilter, startDate, endDate, selectedTags]);

    // Extract all unique tags
    const allTags = Array.from(new Set(archivedDocuments.flatMap(doc => doc.tags || []))).sort();

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
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);

            const newItems = arrayMove(items, oldIndex, newIndex);

            setItems(newItems);

            // Update positions in backend
            const updates = newItems.map((item, index) => ({
                id: item.id,
                position: index
            }));

            updateDocumentOrder(updates).catch(error => {
                console.error('Failed to update order:', error);
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

    // Helper for filter buttons
    const FilterButton = ({ label, isActive, onClick, activeClass }: any) => (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                ? activeClass
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">자기소개서 저장소</h1>
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
                        {archivedDocuments.length > 0
                            ? Math.round((archivedDocuments.filter(doc => doc.documentScreeningStatus === 'pass').length / archivedDocuments.length) * 100)
                            : 0}%
                    </span>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center">
                    <span className="text-zinc-400 text-sm mb-1">서류 합격 / 전체 공고</span>
                    <div className="flex items-end gap-1">
                        <span className="text-3xl font-bold text-white">
                            {archivedDocuments.filter(doc => doc.documentScreeningStatus === 'pass').length}
                        </span>
                        <span className="text-zinc-500 text-lg mb-1">/</span>
                        <span className="text-zinc-500 text-lg mb-1">{archivedDocuments.length}</span>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="space-y-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Status Filter Tabs */}
                    <div className="flex flex-wrap gap-2">
                        <FilterButton
                            label="전체"
                            isActive={statusFilter === 'all' && screeningFilter === 'all'}
                            onClick={() => { setStatusFilter('all'); setScreeningFilter('all'); }}
                            activeClass="bg-zinc-700 text-white border border-zinc-600"
                        />
                        <FilterButton
                            label="합격"
                            isActive={statusFilter === 'pass'}
                            onClick={() => setStatusFilter(statusFilter === 'pass' ? 'all' : 'pass')}
                            activeClass="bg-green-500/20 text-green-300 border border-green-500/30"
                        />
                        <FilterButton
                            label="불합격"
                            isActive={statusFilter === 'fail'}
                            onClick={() => setStatusFilter(statusFilter === 'fail' ? 'all' : 'fail')}
                            activeClass="bg-red-500/20 text-red-300 border border-red-500/30"
                        />

                        <div className="w-px h-8 bg-zinc-700 mx-2" />

                        <FilterButton
                            label="서류합격"
                            isActive={screeningFilter === 'pass'}
                            onClick={() => setScreeningFilter(screeningFilter === 'pass' ? 'all' : 'pass')}
                            activeClass="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        />

                        <div className="w-px h-8 bg-zinc-700 mx-2" />

                        <FilterButton
                            label="즐겨찾기"
                            isActive={favoriteFilter}
                            onClick={() => setFavoriteFilter(!favoriteFilter)}
                            activeClass="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                        />
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
            {filteredDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Drag and Drop Context or Static Grid depending on filters */}
                    {/* Note: Drag and drop is only enabled when no filters are active to prevent confusion with ordering */}
                    {(searchTerm || statusFilter !== 'all' || screeningFilter !== 'all' || startDate || endDate || selectedTags.length > 0) ? (
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
                                                className={`hover:text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity ${doc.isFavorite ? 'text-yellow-400 opacity-100' : 'text-zinc-600'}`}
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 col-span-full">
                                    {paginatedDocs.map((doc) => (
                                        <SortableDocumentCard
                                            key={doc.id}
                                            doc={doc}
                                            onDelete={(id) => deleteDocumentMutation.mutate(id)}
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
                </div>
            ) : (
                <div className="text-center py-20 text-zinc-500">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>조건에 맞는 문서가 없습니다.</p>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col items-center gap-4 mt-8">
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
            )}

            <ConfirmationModal
                isOpen={isInlineDeleteModalOpen}
                onClose={() => {
                    setIsInlineDeleteModalOpen(false);
                    setInlineDeleteTargetId(null);
                }}
                onConfirm={() => {
                    if (inlineDeleteTargetId) {
                        deleteDocumentMutation.mutate(inlineDeleteTargetId);
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
