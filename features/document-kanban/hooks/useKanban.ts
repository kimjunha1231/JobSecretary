'use client';

import { useState, useEffect, useRef } from 'react';
import {
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    useSensor,
    useSensors,
    PointerSensor,
    useDroppable,
} from '@dnd-kit/core';
import { Document, Status } from '@/entities/document';
import { useDocuments, useUpdateDocument, useDeleteDocument, useArchiveDocuments } from '@/entities/document';
import { KANBAN_COLUMNS } from '../types';
const EMPTY_LIST: Document[] = [];

export function useKanban() {
    const { data } = useDocuments();
    const documents = data || EMPTY_LIST;
    const updateDocumentMutation = useUpdateDocument();
    const deleteDocumentMutation = useDeleteDocument();
    const archiveDocumentsMutation = useArchiveDocuments();
    const [applications, setApplications] = useState<Document[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Modals State
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [resultPendingDocId, setResultPendingDocId] = useState<string | null>(null);
    const [isArchiveResultModalOpen, setIsArchiveResultModalOpen] = useState(false);
    const [isArchiveScreeningModalOpen, setIsArchiveScreeningModalOpen] = useState(false);
    const [archiveFlowDocId, setArchiveFlowDocId] = useState<string | null>(null);
    const [archiveResultStatus, setArchiveResultStatus] = useState<Status | null>(null);
    const [isBulkArchiveModalOpen, setIsBulkArchiveModalOpen] = useState(false);
    const [bulkArchiveTargetIds, setBulkArchiveTargetIds] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    // Archive Drop Zone
    const archiveRef = useRef<HTMLDivElement>(null);
    const { setNodeRef: setArchiveNodeRef, isOver: isArchiveOver } = useDroppable({
        id: 'archive',
    });
    const currentOverIdRef = useRef<string | null>(null);

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

    const isPointerOverArchive = (event: DragEndEvent): boolean => {
        if (!archiveRef.current) return false;
        const rect = archiveRef.current.getBoundingClientRect();
        const pointerX = (event.activatorEvent as PointerEvent)?.clientX;
        const pointerY = (event.activatorEvent as PointerEvent)?.clientY;
        const finalX = pointerX + (event.delta?.x || 0);
        const finalY = pointerY + (event.delta?.y || 0);
        return (
            finalX >= rect.left &&
            finalX <= rect.right &&
            finalY >= rect.top &&
            finalY <= rect.bottom
        );
    };

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

        const isOverColumn = KANBAN_COLUMNS.some(col => col.status === overId);

        if (isOverColumn) {
            const newStatus = overId;
            if (newStatus === 'result') {
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
                await updateDocumentMutation.mutateAsync({ id: draggedId, status: newStatus as Status });
            }
        } else {
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
                    await updateDocumentMutation.mutateAsync({ id: draggedId, status: newStatus });
                }
            }
        }
        setActiveId(null);
        currentOverIdRef.current = null;
    };

    const handleResultConfirm = async (status: Status) => {
        if (resultPendingDocId) {
            setApplications(apps =>
                apps.map(app =>
                    app.id === resultPendingDocId ? { ...app, status } : app
                )
            );
            await updateDocumentMutation.mutateAsync({ id: resultPendingDocId, status });
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

    const handleArchiveScreeningConfirm = async (passed: boolean) => {
        if (archiveFlowDocId && archiveResultStatus) {
            setApplications(apps => apps.filter(app => app.id !== archiveFlowDocId));
            await updateDocumentMutation.mutateAsync({
                id: archiveFlowDocId,
                documentScreeningStatus: passed ? 'pass' : 'fail',
                status: archiveResultStatus,
                isArchived: true
            });
            resetArchiveFlow();
        }
    };

    const handleArchiveAll = async (ids: string[]) => {
        setBulkArchiveTargetIds(ids);
        setIsBulkArchiveModalOpen(true);
    };

    const confirmBulkArchive = async () => {
        if (bulkArchiveTargetIds.length > 0) {
            setApplications(apps => apps.filter(app => !bulkArchiveTargetIds.includes(app.id)));
            await archiveDocumentsMutation.mutateAsync(bulkArchiveTargetIds);
            setBulkArchiveTargetIds([]);
            setIsBulkArchiveModalOpen(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeleteTargetId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteTargetId) {
            setApplications(apps => apps.filter(app => app.id !== deleteTargetId));
            await deleteDocumentMutation.mutateAsync(deleteTargetId);
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

    const activeApplication = activeId
        ? applications.find(app => app.id === activeId)
        : null;

    return {
        applications,
        activeId,
        activeApplication,
        sensors,
        archiveRef,
        setArchiveNodeRef,
        isArchiveOver,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        getApplicationsByStatus,
        modals: {
            isResultModalOpen,
            setIsResultModalOpen,
            setResultPendingDocId,
            handleResultConfirm,
            isArchiveResultModalOpen,
            setIsArchiveResultModalOpen,
            handleArchiveResultConfirm,
            isArchiveScreeningModalOpen,
            setIsArchiveScreeningModalOpen,
            handleArchiveScreeningConfirm,
            resetArchiveFlow,
            isBulkArchiveModalOpen,
            setIsBulkArchiveModalOpen,
            setBulkArchiveTargetIds,
            handleArchiveAll,
            confirmBulkArchive,
            isDeleteModalOpen,
            setIsDeleteModalOpen,
            setDeleteTargetId,
            handleDelete,
            confirmDelete
        }
    };
}
