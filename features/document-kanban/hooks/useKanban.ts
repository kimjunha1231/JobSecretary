'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DropResult } from '@hello-pangea/dnd';
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


    useEffect(() => {
        setApplications(documents.filter(doc => !doc.isArchived));
    }, [documents]);

    const resetArchiveFlow = useCallback(() => {
        setArchiveFlowDocId(null);
        setArchiveResultStatus(null);
        setIsArchiveResultModalOpen(false);
        setIsArchiveScreeningModalOpen(false);
    }, []);

    // Simplified drag end handler for @hello-pangea/dnd
    const handleDragEnd = useCallback(async (result: DropResult) => {
        const { draggableId, destination, source } = result;

        // Dropped outside any droppable
        if (!destination) {
            return;
        }

        // Dropped in the same position
        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }

        const draggedApp = applications.find(app => app.id === draggableId);
        if (!draggedApp) return;

        const destDroppableId = destination.droppableId;

        // Handle Archive Drop Zone
        if (destDroppableId === 'archive') {
            setArchiveFlowDocId(draggableId);
            const alreadyHasResult = draggedApp.status === 'pass' || draggedApp.status === 'fail';
            if (alreadyHasResult) {
                setArchiveResultStatus(draggedApp.status);
                setIsArchiveScreeningModalOpen(true);
                setIsArchiveResultModalOpen(false);
            } else {
                setArchiveResultStatus(null);
                setIsArchiveResultModalOpen(true);
            }
            // Scroll to top even when modal opens
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Handle Result column (pass/fail selection required)
        if (destDroppableId === 'result') {
            setResultPendingDocId(draggableId);
            setIsResultModalOpen(true);
            // Scroll to top even when modal opens
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Handle regular status change
        const newStatus = destDroppableId as Status;
        if (draggedApp.status !== newStatus) {
            setApplications(apps =>
                apps.map(app =>
                    app.id === draggableId ? { ...app, status: newStatus } : app
                )
            );
            await updateDocumentMutation.mutateAsync({ id: draggableId, status: newStatus });
        }
        // Scroll to top after any valid drag and drop
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [applications, updateDocumentMutation, resetArchiveFlow]);

    const handleResultConfirm = useCallback(async (status: Status) => {
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
    }, [resultPendingDocId, updateDocumentMutation]);

    const handleArchiveResultConfirm = useCallback((status: Status) => {
        if (!archiveFlowDocId) return;
        const normalizedStatus: Status = status === 'pass' ? 'pass' : 'fail';
        setArchiveResultStatus(normalizedStatus);
        setIsArchiveResultModalOpen(false);
        setIsArchiveScreeningModalOpen(true);
    }, [archiveFlowDocId]);

    const handleArchiveScreeningConfirm = useCallback(async (passed: boolean) => {
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
    }, [archiveFlowDocId, archiveResultStatus, updateDocumentMutation, resetArchiveFlow]);

    const handleArchiveAll = useCallback(async (ids: string[]) => {
        setBulkArchiveTargetIds(ids);
        setIsBulkArchiveModalOpen(true);
    }, []);

    const confirmBulkArchive = useCallback(async () => {
        if (bulkArchiveTargetIds.length > 0) {
            setApplications(apps => apps.filter(app => !bulkArchiveTargetIds.includes(app.id)));
            await archiveDocumentsMutation.mutateAsync(bulkArchiveTargetIds);
            setBulkArchiveTargetIds([]);
            setIsBulkArchiveModalOpen(false);
        }
    }, [bulkArchiveTargetIds, archiveDocumentsMutation]);

    const handleDelete = useCallback(async (id: string) => {
        setDeleteTargetId(id);
        setIsDeleteModalOpen(true);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (deleteTargetId) {
            setApplications(apps => apps.filter(app => app.id !== deleteTargetId));
            await deleteDocumentMutation.mutateAsync(deleteTargetId);
            setDeleteTargetId(null);
            setIsDeleteModalOpen(false);
        }
    }, [deleteTargetId, deleteDocumentMutation]);

    const applicationsByStatus = useMemo(() => {
        const groups: Record<string, Document[]> = {
            writing: [],
            applied: [],
            interview: [],
            result: [],
        };

        applications.forEach(app => {
            if (app.status === 'pass' || app.status === 'fail') {
                groups.result.push(app);
            } else if (groups[app.status]) {
                groups[app.status].push(app);
            }
        });

        return groups;
    }, [applications]);

    const getApplicationsByStatus = useCallback((status: Status | 'result') => {
        return applicationsByStatus[status] || EMPTY_LIST;
    }, [applicationsByStatus]);

    const modals = useMemo(() => ({
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
    }), [
        isResultModalOpen,
        handleResultConfirm,
        isArchiveResultModalOpen,
        handleArchiveResultConfirm,
        isArchiveScreeningModalOpen,
        handleArchiveScreeningConfirm,
        resetArchiveFlow,
        isBulkArchiveModalOpen,
        handleArchiveAll,
        confirmBulkArchive,
        isDeleteModalOpen,
        handleDelete,
        confirmDelete
    ]);

    return {
        applications,
        handleDragEnd,
        getApplicationsByStatus,
        modals
    };
}
