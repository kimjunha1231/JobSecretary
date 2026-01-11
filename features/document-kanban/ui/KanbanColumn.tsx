'use client';

import React, { useMemo, memo } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { KanbanCard } from './KanbanCard';
import { KanbanColumnProps } from '../types';
import { COLUMN_GRADIENT_STYLES, COLUMN_TEXT_COLORS } from '../lib';

export const KanbanColumn = memo(function KanbanColumn({
    status,
    title,
    applications,
    onDelete,
    onArchiveAll
}: KanbanColumnProps) {
    const router = useRouter();

    return (
        <Droppable droppableId={status}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-80 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 transition-all flex flex-col ${snapshot.isDraggingOver ? 'border-zinc-600 bg-zinc-900/70' : ''
                        }`}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${COLUMN_GRADIENT_STYLES[status]}`} />
                            <h2 className={`font-bold text-sm ${COLUMN_TEXT_COLORS[status]}`}>
                                {title}
                            </h2>
                        </div>
                        <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                            {applications.length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-[100px]">
                        <div className="space-y-3 pb-2">
                            {applications.map((application, index) => (
                                <Draggable
                                    key={application.id}
                                    draggableId={application.id}
                                    index={index}
                                >
                                    {(provided, snapshot) => (
                                        <KanbanCard
                                            application={application}
                                            onDelete={onDelete}
                                            provided={provided}
                                            isDragging={snapshot.isDragging}
                                        />
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    </div>

                    {status === 'result' ? (
                        <button
                            onClick={() => onArchiveAll?.(applications.map(app => app.id))}
                            disabled={applications.length === 0}
                            className="mt-3 w-full py-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/50 transition-all text-sm group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={14} className="group-hover:scale-110 transition-transform rotate-45" />
                            <span>저장소로 모두 보내기</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push(`/write?status=${status}&from=dashboard`)}
                            className="mt-3 w-full py-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/50 transition-all text-sm group"
                        >
                            <Plus size={14} className="group-hover:scale-110 transition-transform" />
                            <span>새 항목 추가</span>
                        </button>
                    )}
                </div>
            )}
        </Droppable>
    );
});
