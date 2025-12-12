import { RecommendedDoc } from '@/shared/types';

export type { RecommendedDoc };

export interface ReferenceSearchProps {
    searchTags: string[];
    setSearchTags: (tags: string[]) => void;
    searchResults: RecommendedDoc[];
    setSearchResults: (results: RecommendedDoc[]) => void;
    isSearching: boolean;
    setIsSearching: (isSearching: boolean) => void;
}

export interface ReferenceDrawerProps {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    searchProps: ReferenceSearchProps;
}
