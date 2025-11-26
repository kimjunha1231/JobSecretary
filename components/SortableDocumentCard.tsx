'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, Trash2 } from 'lucide-react';
import { Document } from '@/types';
import { useRouter } from 'next/navigation';

interface SortableDocumentCardProps {
    doc: Document;
    onDelete: (id: string) => void;
}

export function SortableDocumentCard({ doc, onDelete }: SortableDocumentCardProps) {
    const router = useRouter();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: doc.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => router.push(`/document/${doc.id}`)}
            className="bg-surface border border-white/5 rounded-xl p-5 hover:border-primary/50 transition-all cursor-pointer group relative"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                    <FileText size={20} />
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(doc.id);
                    }}
                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    // Prevent drag start on delete button
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Trash2 size={16} />
                </button>
            </div>

            <h3 className="text-lg font-medium text-white mb-1">{doc.company}</h3>
            <p className="text-sm text-zinc-400">{doc.role}</p>
        </div>
    );
}
