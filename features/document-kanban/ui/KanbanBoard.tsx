'use client';

import React, { useMemo } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { ArchiveDropZone } from './ArchiveDropZone';
import { KanbanModals } from './KanbanModals';
import { useKanban, KANBAN_COLUMNS, createKanbanCollisionDetection } from '@/features/document-kanban';

export function KanbanBoard() {
    const {
        activeApplication,
        sensors,
        archiveRef,
        setArchiveNodeRef,
        isArchiveOver,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        getApplicationsByStatus,
        modals
    } = useKanban();

    const collisionDetection = useMemo(() => createKanbanCollisionDetection(), []);

    return (
        <div className="space-y-4">
            <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >

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
                            setNodeRef={(node) => {
                                setArchiveNodeRef(node);
                                (archiveRef as React.MutableRefObject<HTMLDivElement | null>).current = node as HTMLDivElement;
                            }}
                            isOver={isArchiveOver}
                        />
                    </div>
                </div>


                <DragOverlay>
                    {activeApplication ? (
                        <div className="opacity-70 rotate-3 scale-105">
                            <KanbanCard
                                application={activeApplication}
                                onDelete={() => { }}
                                isOverlay
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>


            <KanbanModals modals={modals} />
        </div>
    );
}
