'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, Trash2, Calendar, Star } from 'lucide-react';
import { Document } from '@/entities/document';
import { useRouter } from 'next/navigation';

interface SortableDocumentCardProps {
    doc: Document;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string, isFavorite: boolean) => void;
}

export function SortableDocumentCard({ doc, onDelete, onToggleFavorite }: SortableDocumentCardProps) {
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
            onClick={() => router.push(`/document/${doc.id}?from=archive`)}
            className="bg-surface border border-white/5 rounded-xl p-5 hover:border-primary/50 transition-all cursor-pointer group relative"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                    <FileText size={20} />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(doc.id, !doc.isFavorite);
                        }}
                        className={`p-2 hover:text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity ${doc.isFavorite ? 'text-yellow-400 opacity-100' : 'text-zinc-600'}`}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label={doc.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                    >
                        <Star size={16} fill={doc.isFavorite ? "currentColor" : "none"} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(doc.id);
                        }}
                        className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        // Prevent drag start on delete button
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label="문서 삭제"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <div>
                    <h3 className="text-lg font-medium text-white mb-1">{doc.company}</h3>
                    <p className="text-sm text-zinc-300">{doc.role}</p>
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
                                        doc.status === 'applied' ? '지원 완료' :
                                            doc.status === 'interview' ? '면접 진행 중' : doc.status}
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
                    <div className="flex items-center gap-1 text-xs text-zinc-300">
                        <Calendar size={12} />
                        <span>{new Date(doc.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
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
        </div>
    );
}
