import { useState, useEffect } from 'react';
import {
    useArchivedDocuments,
    useDeleteDocument,
    toggleDocumentFavorite,
    updateDocumentOrder
} from '@/entities/document';
import { useArchiveFilters } from './useArchiveFilters';
import { Document } from '@/shared/types';
import {
    DragEndEvent,
    DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    sortableKeyboardCoordinates,
    arrayMove
} from '@dnd-kit/sortable';

const EMPTY_LIST: Document[] = [];

export const useArchiveLogic = () => {
    const { data } = useArchivedDocuments();
    const archivedDocuments = data || EMPTY_LIST;
    const deleteDocumentMutation = useDeleteDocument();

    // items state for DnD optimistic updates
    const [items, setItems] = useState<Document[]>(archivedDocuments);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Sync items with server data when it changes
    useEffect(() => {
        setItems(archivedDocuments);
    }, [archivedDocuments]);

    // Use Custom Hook for Filters
    const {
        searchTerm, setSearchTerm,
        statusFilter, setStatusFilter,
        screeningFilter, setScreeningFilter,
        startDate, setStartDate,
        endDate, setEndDate,
        selectedTags, setSelectedTags,
        favoriteFilter, setFavoriteFilter,
        filteredDocs
    } = useArchiveFilters(items);

    // Extract all unique tags
    const allTags = Array.from(new Set(archivedDocuments.flatMap(doc => doc.tags || []))).sort();

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);

            const newItems = arrayMove(items, oldIndex, newIndex);

            setItems(newItems);

            // Update positions in backend
            const updates = newItems.map((item, index) => ({
                id: item.id,
                position: index
            }));

            updateDocumentOrder(updates).catch(error => {
                console.error('Failed to update order:', error);
            });
        }
        setActiveId(null);
    };

    const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
        // Optimistic update
        setItems(prev => prev.map(item => item.id === id ? { ...item, isFavorite } : item));
        try {
            await toggleDocumentFavorite(id, isFavorite);
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            // Revert on error
            setItems(prev => prev.map(item => item.id === id ? { ...item, isFavorite: !isFavorite } : item));
        }
    };

    const isFiltered = !!(
        searchTerm ||
        statusFilter !== 'all' ||
        screeningFilter !== 'all' ||
        startDate ||
        endDate ||
        selectedTags.length > 0 ||
        favoriteFilter
    );

    return {
        // Data
        archivedDocuments, // Raw data for stats
        filteredDocs,      // Filtered list for display
        items,            // Complete list for DnD
        allTags,

        // Filter Stats
        filterState: {
            searchTerm, setSearchTerm,
            statusFilter, setStatusFilter,
            screeningFilter, setScreeningFilter,
            startDate, setStartDate,
            endDate, setEndDate,
            selectedTags, setSelectedTags,
            favoriteFilter, setFavoriteFilter,
        },
        toggleTag,

        // DnD
        dndProps: {
            sensors,
            activeId,
            handleDragStart,
            handleDragEnd,
        },
        isFiltered,

        // Actions
        handleToggleFavorite,
        deleteDocument: deleteDocumentMutation.mutate,
    };
};
