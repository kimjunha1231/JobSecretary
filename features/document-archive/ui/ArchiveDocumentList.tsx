import { ConfirmationModal } from '@/shared/ui';
import { ArchiveDocumentListProps } from '../types';
import { EmptyArchiveState } from './list/EmptyArchiveState';
import { PaginationControls } from './list/PaginationControls';
import { FilteredDocumentView } from './list/FilteredDocumentView';
import { DnDDocumentView } from './list/DnDDocumentView';
import { useArchivePagination, useArchiveListUi } from '../hooks/useArchiveListState';

export const ArchiveDocumentList = ({
    filteredDocs,
    isFiltered,
    dndProps,
    onDelete,
    onToggleFavorite
}: ArchiveDocumentListProps) => {
    const {
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        totalPages,
        paginatedDocs
    } = useArchivePagination(filteredDocs);

    const {
        isDeleteModalOpen,
        deleteTargetId,
        openDeleteModal,
        closeDeleteModal
    } = useArchiveListUi();

    return (
        <div>
            {filteredDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isFiltered ? (
                        <FilteredDocumentView
                            documents={paginatedDocs}
                            onToggleFavorite={onToggleFavorite}
                            onDeleteClick={openDeleteModal}
                        />
                    ) : (
                        <DnDDocumentView
                            documents={paginatedDocs}
                            dndProps={dndProps}
                            onDelete={openDeleteModal}
                            onToggleFavorite={onToggleFavorite}
                        />
                    )}
                </div>
            ) : (
                <EmptyArchiveState />
            )}

            {/* Pagination Controls */}
            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={closeDeleteModal}
                onConfirm={() => {
                    if (deleteTargetId) {
                        onDelete(deleteTargetId);
                        closeDeleteModal();
                    }
                }}
                title="삭제 확인"
                message="정말 삭제하시겠습니까?"
                confirmText="삭제"
                variant="danger"
            />
        </div>
    );
};
