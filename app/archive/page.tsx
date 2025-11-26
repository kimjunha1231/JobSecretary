'use client';

import React, { useState } from 'react';
import { useDocuments } from '@/context/DocumentContext';
import { updateDocumentOrder } from '@/actions/document';
import { Trash2, Search, FileText } from 'lucide-react';
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
import { Document } from '@/types';

export default function Archive() {
    const { documents, deleteDocument } = useDocuments();
    const [searchTerm, setSearchTerm] = useState('');
    const [items, setItems] = useState(documents);
    const [activeId, setActiveId] = useState<string | null>(null);
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
        setItems(documents);
    }, [documents]);

    const filteredDocs = searchTerm
        ? items.filter(doc =>
            doc.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.role.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : items;

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);

            const newOrder = arrayMove(items, oldIndex, newIndex);
            setItems(newOrder);

            // Create updates array with new positions
            const updates = newOrder.map((doc, index) => ({
                id: doc.id,
                position: index
            }));

            // Optimistic update
            try {
                await updateDocumentOrder(updates);
            } catch (error) {
                console.error('Failed to update order:', error);
                // Revert on error could be implemented here if needed
            }
        }
        setActiveId(null);
    };

    const activeDoc = activeId ? items.find(doc => doc.id === activeId) : null;

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">아카이브</h1>
                <p className="text-zinc-400">저장된 자기소개서를 관리하세요</p>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    type="text"
                    placeholder="회사명 또는 직무로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-primary transition-colors"
                />
            </div>

            {/* Documents Grid */}
            {searchTerm ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {filteredDocs.map((doc, index) => (
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
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }}
                                        className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <h3 className="text-lg font-medium text-white mb-1">{doc.company}</h3>
                                <p className="text-sm text-zinc-400">{doc.role}</p>
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
                        items={items.map(doc => doc.id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map((doc) => (
                                <SortableDocumentCard
                                    key={doc.id}
                                    doc={doc}
                                    onDelete={deleteDocument}
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
                                <h3 className="text-lg font-medium text-white mb-1">{activeDoc.company}</h3>
                                <p className="text-sm text-zinc-400">{activeDoc.role}</p>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {filteredDocs.length === 0 && (
                <div className="text-center py-20 text-zinc-500">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>저장된 문서가 없습니다.</p>
                </div>
            )}
        </div>
    );
}
