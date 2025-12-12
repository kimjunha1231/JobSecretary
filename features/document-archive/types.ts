import { Status } from '@/shared/types';
import type { SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

export interface StatusFilterGroupProps {
    statusFilter: Status | 'all';
    setStatusFilter: (status: Status | 'all') => void;
    screeningFilter: 'all' | 'pass' | 'fail';
    setScreeningFilter: (status: 'all' | 'pass' | 'fail') => void;
    favoriteFilter: boolean;
    setFavoriteFilter: (fav: boolean) => void;
}

export interface TagFilterGroupProps {
    allTags: string[];
    selectedTags: string[];
    toggleTag: (tag: string) => void;
}

export interface SearchFilterProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

export interface ArchiveFilterBarProps extends StatusFilterGroupProps, TagFilterGroupProps, SearchFilterProps {
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
    setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface DndProps {
    sensors: SensorDescriptor<SensorOptions>[];
    activeId: string | null;
    handleDragStart: (event: DragStartEvent) => void;
    handleDragEnd: (event: DragEndEvent) => void;
}

export interface ArchiveDocumentListProps {
    filteredDocs: import('@/entities/document').Document[];
    isFiltered: boolean;
    dndProps: DndProps;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string, isFav: boolean) => void;
}
