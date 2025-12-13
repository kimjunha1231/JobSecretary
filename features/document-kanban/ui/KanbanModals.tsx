'use client';

import React from 'react';
import { ResultSelectionModal } from './ResultSelectionModal';
import { ArchiveModal } from './ArchiveModal';
import { DeleteConfirmationModal, ConfirmationModal } from '@/shared/ui';
import { useKanban } from '../hooks/useKanban';

// Define the type based on useKanban return type
type KanbanModalsState = ReturnType<typeof useKanban>['modals'];

interface KanbanModalsProps {
    modals: KanbanModalsState;
}

export function KanbanModals({ modals }: KanbanModalsProps) {
    return (
        <>
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
        </>
    );
}
