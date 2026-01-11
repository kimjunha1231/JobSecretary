'use client';

import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { DraggableProvided, DraggableStyle } from '@hello-pangea/dnd';
import { Calendar, Briefcase, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Document } from '@/entities/document';
import { getDDay, formatDeadline, getStatusBadgeStyle, getStatusLabel, getDDayBadgeStyle } from '../lib';

interface KanbanCardProps {
    application: Document;
    onDelete: (id: string) => void;
    provided: DraggableProvided;
    isDragging: boolean;
}

// Pure, memoized content component - completely isolated
const KanbanCardContent = memo(function KanbanCardContent({
    application,
    onDelete
}: {
    application: Document;
    onDelete: (id: string) => void;
}) {
    const router = useRouter();
    const dDay = getDDay(application.deadline);

    const handleClick = () => {
        router.push(`/document/${application.id}?from=dashboard`);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(application.id);
    };

    return (
        <div onClick={handleClick} className="cursor-pointer">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                        <span className="text-lg font-bold text-purple-300">
                            {application.logo || application.company.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white text-sm">
                            {application.company}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-zinc-300 mt-0.5">
                            <Briefcase size={10} />
                            <span>{application.role}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleDelete}
                    className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="삭제"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                {application.status === 'writing' ? (
                    dDay && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getDDayBadgeStyle(dDay)}`}>
                            {dDay}
                        </span>
                    )
                ) : (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getStatusBadgeStyle(application.status)}`}>
                        {getStatusLabel(application.status)}
                    </span>
                )}

                <div className="flex items-center gap-1.5 text-xs ml-auto">
                    <Calendar size={12} className="text-zinc-300" />
                    <span className="text-zinc-300 font-medium tracking-tight">
                        {formatDeadline(application.deadline)}
                    </span>
                </div>
            </div>
        </div>
    );
});

// Helper to handle DraggableStyle with potential custom width
const getStyle = (style: DraggableStyle | undefined, isDragging: boolean): React.CSSProperties => {
    if (!style) return {};
    return {
        ...style,
        width: isDragging ? '20rem' : (style as any).width,
    };
};

// Main card component using hello-pangea/dnd
export function KanbanCard({ application, onDelete, provided, isDragging }: KanbanCardProps) {
    const card = (
        <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getStyle(provided.draggableProps.style, isDragging)}
            className={`group relative bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-all ${isDragging ? 'opacity-70 shadow-2xl ring-2 ring-purple-500/20 rotate-2 z-[9999]' : 'opacity-100'
                }`}
        >
            <KanbanCardContent
                application={application}
                onDelete={onDelete}
            />
        </div>
    );

    // After switching to window scroll in MainLayout, portaling to document.body
    // works perfectly for both avoiding clipping and triggering window auto-scroll.
    if (isDragging && typeof document !== 'undefined') {
        return createPortal(card, document.body);
    }

    return card;
}
