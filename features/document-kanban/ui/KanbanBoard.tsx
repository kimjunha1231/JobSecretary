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

        modals
    } = useKanban();

    const onDragEnd = (result: DropResult) => {
        handleDragEnd(result);
    };

    return (
        <div className="space-y-4">
            <DragDropContext onDragEnd={onDragEnd} >
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

                        />
                    </div>
                </div>
            </DragDropContext>

            <KanbanModals modals={modals} />
        </div>
    );
}
