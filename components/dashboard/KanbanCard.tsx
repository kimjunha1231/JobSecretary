'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Document } from '@/types';
import { Calendar, Briefcase, Trash2, Star } from 'lucide-react';
import { useState } from 'react';
import { toggleDocumentFavorite } from '@/actions/document';
import { useRouter } from 'next/navigation';

interface KanbanCardProps {
    application: Document;
    onDelete: (id: string) => void;
    isOverlay?: boolean;
}

export function KanbanCard({ application, onDelete, isOverlay }: KanbanCardProps) {
    const router = useRouter();
    const [isFavorite, setIsFavorite] = useState(application.isFavorite || false);

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

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const newStatus = !isFavorite;
        setIsFavorite(newStatus);
        try {
            await toggleDocumentFavorite(application.id, newStatus);
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            setIsFavorite(!newStatus); // Revert on error
        }
    };

    if (isOverlay) {
        return (
            <div
                className="group relative bg-zinc-900 border border-zinc-800 rounded-lg p-4 cursor-grabbing shadow-2xl"
            >
                {/* Delete Button (Hidden in Overlay) */}
                <div className="absolute top-2 right-2 p-1.5 text-zinc-600 opacity-0">
                    <Trash2 size={14} />
                </div>

                {/* Favorite Button (Visible in Overlay) */}
                <button
                    className={`absolute top-2 right-8 p-1.5 rounded transition-colors ${isFavorite ? 'text-yellow-400' : 'text-zinc-600'}`}
                >
                    <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
                </button>

                {/* Company Logo & Name */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {/* Company Logo Badge */}
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                            <span className="text-lg font-bold text-purple-300">
                                {application.logo || application.company.charAt(0).toUpperCase()}
                            </span>
                        </div>

                        {/* Company Name */}
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

                {/* Deadline or Status */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    {application.status === 'writing' ? (
                        getDDay(application.deadline) && (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getDDay(application.deadline)?.startsWith('D-') && parseInt(getDDay(application.deadline)?.replace('D-', '') || '0') <= 3
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : getDDay(application.deadline) === 'D-Day'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                }`}>
                                {getDDay(application.deadline)}
                            </span>
                        )
                    ) : (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${application.status === 'applied' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            application.status === 'interview' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                application.status === 'pass' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                    application.status === 'fail' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                        'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                            }`}>
                            {
                                application.status === 'applied' ? '지원 완료' :
                                    application.status === 'interview' ? '면접' :
                                        application.status === 'pass' ? '합격' :
                                            application.status === 'fail' ? '불합격' :
                                                application.status
                            }
                        </span>
                    )}

                    <div className="flex items-center gap-1.5 text-xs ml-auto">
                        <Calendar size={12} className="text-zinc-500" />
                        <span className="text-zinc-400 font-medium tracking-tight">
                            {application.deadline ? application.deadline.replace(/-/g, '.') : '마감일 미정'}
                        </span>
                    </div>
                </div>
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
            className={`group relative bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-all cursor-pointer ${isDragging ? 'opacity-50' : 'opacity-100'
                }`}
        >
            {/* Delete Button (Visible on Hover) */}
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

            {/* Favorite Button */}
            <button
                onClick={handleToggleFavorite}
                className={`absolute top-2 right-8 p-1.5 rounded transition-colors z-10 opacity-0 group-hover:opacity-100 ${isFavorite ? 'text-yellow-400 opacity-100' : 'text-zinc-600 hover:text-yellow-400 hover:bg-yellow-400/10'}`}
                title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
            >
                <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
            </button>

            {/* Company Logo & Name */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    {/* Company Logo Badge */}
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                        <span className="text-lg font-bold text-purple-300">
                            {application.logo || application.company.charAt(0).toUpperCase()}
                        </span>
                    </div>

                    {/* Company Name */}
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

            {/* Deadline or Status */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                {application.status === 'writing' ? (
                    getDDay(application.deadline) && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getDDay(application.deadline)?.startsWith('D-') && parseInt(getDDay(application.deadline)?.replace('D-', '') || '0') <= 3
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : getDDay(application.deadline) === 'D-Day'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            }`}>
                            {getDDay(application.deadline)}
                        </span>
                    )
                ) : (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${application.status === 'applied' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        application.status === 'interview' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            application.status === 'pass' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                application.status === 'fail' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                        }`}>
                        {
                            application.status === 'applied' ? '지원 완료' :
                                application.status === 'interview' ? '면접' :
                                    application.status === 'pass' ? '합격' :
                                        application.status === 'fail' ? '불합격' :
                                            application.status
                        }
                    </span>
                )}

                <div className="flex items-center gap-1.5 text-xs ml-auto">
                    <Calendar size={12} className="text-zinc-500" />
                    <span className="text-zinc-400 font-medium tracking-tight">
                        {application.deadline ? application.deadline.replace(/-/g, '.') : '마감일 미정'}
                    </span>
                </div>
            </div>
        </div>
    );
}

function getDDay(deadline?: string) {
    if (!deadline) return null;
    const target = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diff = target.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return '마감';
    if (days === 0) return 'D-Day';
    return `D-${days}`;
}
