'use client';

import { useState } from 'react';
import { useDraftStore, RecommendedDoc } from '@/shared/store/useDraftStore';

export function useReferenceSearch(initialTags: string[] = []) {
    const [searchTags, setSearchTags] = useState<string[]>(initialTags);
    const [searchResults, setSearchResults] = useState<RecommendedDoc[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    return {
        searchTags,
        setSearchTags,
        searchResults,
        setSearchResults,
        isSearching,
        setIsSearching
    };
}
