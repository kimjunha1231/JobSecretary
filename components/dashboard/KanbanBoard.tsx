'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    DragOverEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    pointerWithin,
    rectIntersection,
    useDroppable,
} from '@dnd-kit/core';
import { Document, Status } from '@/types';
import { Plus } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { ResultSelectionModal } from './ResultSelectionModal';
import { ArchiveModal } from './ArchiveModal';
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useDocuments } from '@/context/DocumentContext';

const COLUMNS: { status: Status | 'result'; title: string; color: string }[] = [
    { status: 'writing', title: '작성 중', color: 'blue' },
    { status: 'applied', title: '지원 완료', color: 'purple' },
    { status: 'interview', title: '면접', color: 'orange' },
    { status: 'result', title: '결과', color: 'green' },
];

export function KanbanBoard() {
    const { documents, updateDocument, deleteDocument, archiveDocuments } = useDocuments();
    const [applications, setApplications] = useState<Document[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    
    // 결과 컬럼용 모달 상태
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [resultPendingDocId, setResultPendingDocId] = useState<string | null>(null);
    
    // 저장소용 모달 상태 (드래그앤드롭)
    const [isArchiveResultModalOpen, setIsArchiveResultModalOpen] = useState(false);
    const [isArchiveScreeningModalOpen, setIsArchiveScreeningModalOpen] = useState(false);
    const [archiveFlowDocId, setArchiveFlowDocId] = useState<string | null>(null);
    const [archiveResultStatus, setArchiveResultStatus] = useState<Status | null>(null);
    
    // 저장소로 모두 보내기용 모달 상태
    const [isBulkArchiveModalOpen, setIsBulkArchiveModalOpen] = useState(false);
    const [bulkArchiveTargetIds, setBulkArchiveTargetIds] = useState<string[]>([]);
    
    // 삭제 모달 상태
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    
    const router = useRouter();

    // Archive drop zone
    const archiveRef = useRef<HTMLDivElement>(null);
    const { setNodeRef: setArchiveNodeRef, isOver: isArchiveOver } = useDroppable({
        id: 'archive',
    });
    
    // 드래그 중 현재 위치 추적
    const currentOverIdRef = useRef<string | null>(null);
    
    // 저장소 영역에 마우스가 있는지 확인하는 함수
    const isPointerOverArchive = (event: DragEndEvent): boolean => {
        if (!archiveRef.current) return false;
        
        const rect = archiveRef.current.getBoundingClientRect();
        const pointerX = (event.activatorEvent as PointerEvent)?.clientX;
        const pointerY = (event.activatorEvent as PointerEvent)?.clientY;
        
        // delta를 더해서 최종 위치 계산
        const finalX = pointerX + (event.delta?.x || 0);
        const finalY = pointerY + (event.delta?.y || 0);
        
        return (
            finalX >= rect.left &&
            finalX <= rect.right &&
            finalY >= rect.top &&
            finalY <= rect.bottom
        );
    };

    // Sync with context documents
    useEffect(() => {
        setApplications(documents.filter(doc => !doc.isArchived));
    }, [documents]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        currentOverIdRef.current = null;
    };

    const handleDragOver = (event: DragOverEvent) => {
        const overId = event.over?.id as string | null;
        currentOverIdRef.current = overId;
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        const draggedId = active.id as string;

        // 저장소에 드롭한 경우 - 마우스 위치로 직접 확인
        const droppedOnArchive = isPointerOverArchive(event);
        
        if (droppedOnArchive || over?.id === 'archive') {
            const activeApp = applications.find(app => app.id === draggedId);
            if (activeApp) {
                setArchiveFlowDocId(draggedId);
                const alreadyHasResult = activeApp.status === 'pass' || activeApp.status === 'fail';

                if (alreadyHasResult) {
                    setArchiveResultStatus(activeApp.status);
                    setIsArchiveScreeningModalOpen(true);
                    setIsArchiveResultModalOpen(false);
                } else {
                    setArchiveResultStatus(null);
                    setIsArchiveResultModalOpen(true);
                }
            } else {
                resetArchiveFlow();
            }
            setActiveId(null);
            currentOverIdRef.current = null;
            return;
        }

        if (!over) {
            setActiveId(null);
            currentOverIdRef.current = null;
            return;
        }

        const overId = over.id as string;

        const activeApp = applications.find(app => app.id === draggedId);
        if (!activeApp) {
            setActiveId(null);
            currentOverIdRef.current = null;
            return;
        }

        // 컬럼에 드롭한 경우
        const isOverColumn = COLUMNS.some(col => col.status === overId);

        if (isOverColumn) {
            const newStatus = overId;

            if (newStatus === 'result') {
                // 결과 컬럼에 드롭 - 최종 합격 여부 모달
                setResultPendingDocId(draggedId);
                setIsResultModalOpen(true);
                setActiveId(null);
                return;
            }

            if (activeApp.status !== newStatus) {
                setApplications(apps =>
                    apps.map(app =>
                        app.id === draggedId ? { ...app, status: newStatus as Status } : app
                    )
                );
                await updateDocument(draggedId, { status: newStatus as Status });
            }
        } else {
            // 카드 위에 드롭한 경우
            const overApp = applications.find(app => app.id === overId);

            if (overApp) {
                const newStatus = overApp.status;

                if ((newStatus === 'pass' || newStatus === 'fail') && activeApp.status !== 'pass' && activeApp.status !== 'fail') {
                    setResultPendingDocId(draggedId);
                    setIsResultModalOpen(true);
                    setActiveId(null);
                    return;
                }

                if (activeApp.status !== newStatus) {
                    setApplications(apps =>
                        apps.map(app =>
                            app.id === draggedId ? { ...app, status: newStatus } : app
                        )
                    );
                    await updateDocument(draggedId, { status: newStatus });
                }
            }
        }

        setActiveId(null);
        currentOverIdRef.current = null;
    };

    // 결과 컬럼 모달 확인 핸들러
    const handleResultConfirm = async (status: Status) => {
        if (resultPendingDocId) {
            setApplications(apps =>
                apps.map(app =>
                    app.id === resultPendingDocId ? { ...app, status } : app
                )
            );
            await updateDocument(resultPendingDocId, { status });
            setIsResultModalOpen(false);
            setResultPendingDocId(null);
        }
    };

    const resetArchiveFlow = () => {
        setArchiveFlowDocId(null);
        setArchiveResultStatus(null);
        setIsArchiveResultModalOpen(false);
        setIsArchiveScreeningModalOpen(false);
    };

    const handleArchiveResultConfirm = (status: Status) => {
        if (!archiveFlowDocId) return;
        const normalizedStatus: Status = status === 'pass' ? 'pass' : 'fail';
        setArchiveResultStatus(normalizedStatus);
        setIsArchiveResultModalOpen(false);
        setIsArchiveScreeningModalOpen(true);
    };

    // 저장소 모달 확인 핸들러 (드래그앤드롭)
    const handleArchiveScreeningConfirm = async (passed: boolean) => {
        if (archiveFlowDocId && archiveResultStatus) {
            setApplications(apps => apps.filter(app => app.id !== archiveFlowDocId));
            await updateDocument(archiveFlowDocId, {
                documentScreeningStatus: passed ? 'pass' : 'fail',
                status: archiveResultStatus,
                isArchived: true
            });
            resetArchiveFlow();
        }
    };

    // 저장소로 모두 보내기 핸들러
    const handleArchiveAll = async (ids: string[]) => {
        setBulkArchiveTargetIds(ids);
        setIsBulkArchiveModalOpen(true);
    };

    const confirmBulkArchive = async () => {
        if (bulkArchiveTargetIds.length > 0) {
            setApplications(apps => apps.filter(app => !bulkArchiveTargetIds.includes(app.id)));
            await archiveDocuments(bulkArchiveTargetIds);
            setBulkArchiveTargetIds([]);
            setIsBulkArchiveModalOpen(false);
        }
    };

    // 삭제 핸들러
    const handleDelete = async (id: string) => {
        setDeleteTargetId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteTargetId) {
            setApplications(apps => apps.filter(app => app.id !== deleteTargetId));
            await deleteDocument(deleteTargetId);
            setDeleteTargetId(null);
            setIsDeleteModalOpen(false);
        }
    };

    const getApplicationsByStatus = (status: Status | 'result') => {
        if (status === 'result') {
            return applications.filter(app => app.status === 'pass' || app.status === 'fail');
        }
        return applications.filter(app => app.status === status);
    };

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
                                onDelete={handleDelete}
                                onArchiveAll={handleArchiveAll}
                            />
                        ))}

                        {/* Archive Drop Zone */}
                        <div
                            ref={(node) => {
                                setArchiveNodeRef(node);
                                (archiveRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                            }}
                            className={`flex-shrink-0 w-80 bg-zinc-900/50 border-2 border-dashed rounded-xl p-4 transition-all flex flex-col min-h-[600px] ${
                                isArchiveOver ? 'border-zinc-500 bg-zinc-900/80' : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/70'
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
                                onDelete={() => {}}
                                isOverlay
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* 결과 컬럼용 모달 - 최종 합격 여부 */}
            <ResultSelectionModal
                isOpen={isResultModalOpen}
                onClose={() => {
                    setIsResultModalOpen(false);
                    setResultPendingDocId(null);
                }}
                onConfirm={handleResultConfirm}
            />

            <ResultSelectionModal
                isOpen={isArchiveResultModalOpen}
                onClose={() => {
                    resetArchiveFlow();
                }}
                onConfirm={handleArchiveResultConfirm}
            />

            {/* 저장소용 모달 - 서류 합격 여부 */}
            <ArchiveModal
                isOpen={isArchiveScreeningModalOpen}
                onClose={() => {
                    resetArchiveFlow();
                }}
                onConfirm={handleArchiveScreeningConfirm}
            />

            {/* 삭제 확인 모달 */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteTargetId(null);
                }}
                onConfirm={confirmDelete}
            />

            {/* 저장소로 모두 보내기 모달 */}
            <ConfirmationModal
                isOpen={isBulkArchiveModalOpen}
                onClose={() => {
                    setIsBulkArchiveModalOpen(false);
                    setBulkArchiveTargetIds([]);
                }}
                onConfirm={confirmBulkArchive}
                title="저장소로 이동"
                message="이 항목들을 모두 보관함으로 이동하시겠습니까?"
                confirmText="이동"
                variant="info"
            />
        </div>
    );
}
