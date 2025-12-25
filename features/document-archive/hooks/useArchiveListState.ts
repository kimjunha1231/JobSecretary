import { useState, useEffect } from 'react';
import { Document } from '@/entities/document';

export const useArchivePagination = (filteredDocs: Document[]) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);

    // Reset page when filtering changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filteredDocs]);

    const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
    const paginatedDocs = filteredDocs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return {
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        totalPages,
        paginatedDocs
    };
};

export const useArchiveListUi = () => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const openDeleteModal = (id: string) => {
        setDeleteTargetId(id);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setDeleteTargetId(null);
    };

    return {
        isDeleteModalOpen,
        deleteTargetId,
        openDeleteModal,
        closeDeleteModal
    };
};
