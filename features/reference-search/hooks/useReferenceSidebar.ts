'use client';

import { useState, useEffect, useCallback } from 'react';
import { searchDocumentsByTags } from '../api';
import { RecommendedDoc, ReferenceSearchProps } from '../types';

export const useReferenceSidebar = ({
    searchTags,
    setSearchResults,
    setIsSearching
}: Pick<ReferenceSearchProps, 'searchTags' | 'setSearchResults' | 'setIsSearching'>) => {
    const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

    useEffect(() => {
        const fetchReferences = async () => {
            if (searchTags.length === 0) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const results = await searchDocumentsByTags(searchTags);
                setSearchResults(results);
            } catch (error) {
                console.error('Failed to search references:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(fetchReferences, 500);
        return () => clearTimeout(debounceTimer);
    }, [searchTags, setIsSearching, setSearchResults]);

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
    }, []);

    const toggleExpand = useCallback((docId: string) => {
        setExpandedDocId(prev => prev === docId ? null : docId);
    }, []);

    return {
        expandedDocId,
        handleCopy,
        toggleExpand
    };
};
