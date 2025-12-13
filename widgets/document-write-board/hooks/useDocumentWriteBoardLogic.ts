import { useState } from 'react';
import { useDraftStore } from '@/entities/draft';

export const useDocumentWriteBoardLogic = () => {
    const [isReferenceOpen, setIsReferenceOpen] = useState(false);
    const {
        searchTags,
        searchResults,
        isSearching,
        setSearchTags,
        setSearchResults,
        setIsSearching
    } = useDraftStore();

    const searchProps = {
        searchTags,
        setSearchTags,
        searchResults,
        setSearchResults,
        isSearching,
        setIsSearching
    };

    const referenceDrawer = {
        isOpen: isReferenceOpen,
        onOpen: () => setIsReferenceOpen(true),
        onClose: () => setIsReferenceOpen(false)
    };

    return {
        searchProps,
        referenceDrawer
    };
};
