'use client';

import React from 'react';
import {
    DndContext,
    closestCenter,
    DragOverlay
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { Trash2, FileText } from 'lucide-react';
import { Document } from '@/entities/document';
import { SortableDocumentCard } from './SortableDocumentCard';
import { DndProps } from '../../types';

interface DnDDocumentViewProps {
    documents: Document[];
    dndProps: DndProps;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string, isFav: boolean) => void;
}

export const DnDDocumentView = ({
    documents,
    dndProps,
    onDelete,
    onToggleFavorite
}: DnDDocumentViewProps) => {
    const activeDoc = dndProps.activeId
        ? documents.find(doc => doc.id === dndProps.activeId)
        : null;

    return (
        <DndContext
            sensors={dndProps.sensors}
            collisionDetection={closestCenter}
            onDragStart={dndProps.handleDragStart}
            onDragEnd={dndProps.handleDragEnd}
        >
            <SortableContext
                items={documents.map(doc => doc.id)}
                strategy={rectSortingStrategy}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 col-span-full">
                    {documents.map((doc) => (
                        <SortableDocumentCard
                            key={doc.id}
                            doc={doc}
                            onDelete={(id) => onDelete(id)}
                            onToggleFavorite={onToggleFavorite}
                        />
                    ))}
                </div>
            </SortableContext>
            <DragOverlay>
                {activeDoc ? (
                    <div className="bg-surface border border-primary/50 rounded-xl p-5 shadow-2xl scale-105 cursor-grabbing">
                        {/* Simplified Overlay Card */}
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
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
