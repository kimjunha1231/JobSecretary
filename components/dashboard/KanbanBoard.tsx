'use client';

import React from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    pointerWithin,
    rectIntersection,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { ResultSelectionModal } from './ResultSelectionModal';
import { ArchiveModal } from './ArchiveModal';
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useKanban } from '@/hooks/useKanban';
import { Status } from '@/types';

const COLUMNS: { status: Status | 'result'; title: string; color: string }[] = [
    { status: 'writing', title: '작성 중', color: 'blue' },
    { status: 'applied', title: '지원 완료', color: 'purple' },
    { status: 'interview', title: '면접', color: 'orange' },
    { status: 'result', title: '결과', color: 'green' },
];

export function KanbanBoard() {
    const {
        applications,
        activeId,
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

    // Custom collision detection
    const customCollisionDetection = (args: any) => {
        const pointerCollisions = pointerWithin(args);
        const archivePointerCollision = pointerCollisions.find((c: any) => c.id === 'archive');
        if (archivePointerCollision) {
            return [archivePointerCollision];
        }
        if (pointerCollisions.length > 0) {
            return pointerCollisions;
        }
        const rectCollisions = rectIntersection(args);
        const archiveRectCollision = rectCollisions.find((c: any) => c.id === 'archive');
        if (archiveRectCollision) {
            return [archiveRectCollision];
        }
        return closestCorners(args);
    };

    const activeApplication = activeId
        ? applications.find(app => app.id === activeId)
        : null;

    return (
        <div className="space-y-4">
            <DndContext
                sensors={sensors}
                collisionDetection={customCollisionDetection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                {/* Kanban Board Container */}
                <div className="w-full overflow-x-auto pb-6">
                    <div className="flex gap-4 min-w-max items-start w-fit mx-auto">
                        {COLUMNS.map(column => (
                            <KanbanColumn
                                key={column.status}
                                status={column.status}
                                title={column.title}
                                applications={getApplicationsByStatus(column.status)}
                                onDelete={modals.handleDelete}
                                onArchiveAll={modals.handleArchiveAll}
                            />
                        ))}

                        {/* Archive Drop Zone */}
                        <div
                            ref={(node) => {
                                setArchiveNodeRef(node);
                                (archiveRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                            }}
                            className={`flex-shrink-0 w-80 bg-zinc-900/50 border-2 border-dashed rounded-xl p-4 transition-all flex flex-col min-h-[600px] ${isArchiveOver ? 'border-zinc-500 bg-zinc-900/80' : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/70'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-4 pointer-events-none">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                                    <h3 className="font-bold text-sm text-zinc-400">저장소</h3>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center gap-3 pointer-events-none">
                                <Plus size={32} className="rotate-45 text-zinc-600" />
                                <div className="text-center px-4">
                                    <p className="text-zinc-500 text-sm leading-relaxed">
                                        저장소에 보관할<br />
                                        자기소개서는<br />
                                        여기에 드래그해서<br />
                                        넣어주세요
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Drag Overlay */}
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

            {/* Modals */}
            <ResultSelectionModal
                isOpen={modals.isResultModalOpen}
                onClose={() => {
                    modals.setIsResultModalOpen(false);
                    modals.setResultPendingDocId(null);
                }}
                onConfirm={modals.handleResultConfirm}
            />

            <ResultSelectionModal
                isOpen={modals.isArchiveResultModalOpen}
                onClose={modals.resetArchiveFlow}
                onConfirm={modals.handleArchiveResultConfirm}
            />

            <ArchiveModal
                isOpen={modals.isArchiveScreeningModalOpen}
                onClose={modals.resetArchiveFlow}
                onConfirm={modals.handleArchiveScreeningConfirm}
            />

            <DeleteConfirmationModal
                isOpen={modals.isDeleteModalOpen}
                onClose={() => {
                    modals.setIsDeleteModalOpen(false);
                    modals.setDeleteTargetId(null);
                }}
                onConfirm={modals.confirmDelete}
            />

            <ConfirmationModal
                isOpen={modals.isBulkArchiveModalOpen}
                onClose={() => {
                    modals.setIsBulkArchiveModalOpen(false);
                    modals.setBulkArchiveTargetIds([]);
                }}
                onConfirm={modals.confirmBulkArchive}
                title="저장소로 이동"
                message="이 항목들을 모두 보관함으로 이동하시겠습니까?"
                confirmText="이동"
                variant="info"
            />
        </div>
    );
}
