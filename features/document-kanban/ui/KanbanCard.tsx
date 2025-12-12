'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Briefcase, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { KanbanCardProps } from '../types';
import { getDDay, formatDeadline, getStatusBadgeStyle, getStatusLabel, getDDayBadgeStyle } from '../lib';

export function KanbanCard({ application, onDelete, isOverlay }: KanbanCardProps) {
    const router = useRouter();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: application.id, disabled: isOverlay });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const dDay = getDDay(application.deadline);

    const renderCardContent = () => (
        <>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                        <span className="text-lg font-bold text-purple-300">
                            {application.logo || application.company.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h4 className="font-semibold text-white text-sm">
                            {application.company}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                            <Briefcase size={10} />
                            <span>{application.role}</span>
                        </div>
                    </div>
                </div>
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
                    <Calendar size={12} className="text-zinc-500" />
                    <span className="text-zinc-400 font-medium tracking-tight">
                        {formatDeadline(application.deadline)}
                    </span>
                </div>
            </div>
        </>
    );

    if (isOverlay) {
        return (
            <div className="group relative bg-zinc-900 border border-zinc-800 rounded-lg p-4 cursor-grabbing shadow-2xl">
                <div className="absolute top-2 right-2 p-1.5 text-zinc-600 opacity-0">
                    <Trash2 size={14} />
                </div>
                {renderCardContent()}
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => router.push(`/document/${application.id}`)}
            className={`group relative bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-all cursor-pointer ${isDragging ? 'opacity-50' : 'opacity-100'}`}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(application.id);
                }}
                className="absolute top-2 right-2 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded opacity-0 group-hover:opacity-100 transition-all z-10"
                title="삭제"
            >
                <Trash2 size={14} />
            </button>
            {renderCardContent()}
        </div>
    );
}
