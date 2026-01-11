'use client';

import React from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';
import { ArchiveDropZone } from './ArchiveDropZone';
import { KanbanModals } from './KanbanModals';
import { useKanban, KANBAN_COLUMNS } from '@/features/document-kanban';

export function KanbanBoard() {
    const {
        handleDragEnd,
        getApplicationsByStatus,
        isArchiveOver,
        setIsArchiveOver,
        archiveRef,
        modals
    } = useKanban();

    const onDragEnd = (result: DropResult) => {
        handleDragEnd(result);
    };

    const onDragUpdate = (update: { destination?: { droppableId: string } | null }) => {
        setIsArchiveOver(update.destination?.droppableId === 'archive');
    };

    return (
        <div className="space-y-4">
            <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
                <div className="w-full overflow-x-auto pb-6">
                    <div className="flex gap-4 min-w-max items-start w-fit mx-auto">
                        {KANBAN_COLUMNS.map(column => (
                            <KanbanColumn
                                key={column.status}
                                status={column.status}
                                title={column.title}
                                applications={getApplicationsByStatus(column.status)}
                                onDelete={modals.handleDelete}
                                onArchiveAll={modals.handleArchiveAll}
                            />
                        ))}

                        <ArchiveDropZone
                            isOver={isArchiveOver}
                        />
                    </div>
                </div>
            </DragDropContext>

            <KanbanModals modals={modals} />
        </div>
    );
}
