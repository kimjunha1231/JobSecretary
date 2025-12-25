'use client';

import { useState, useMemo } from 'react';
import { Document, Status } from '@/entities/document';

export function useArchiveFilters(documents: Document[]) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
    const [screeningFilter, setScreeningFilter] = useState<'all' | 'pass' | 'fail'>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const [favoriteFilter, setFavoriteFilter] = useState(false);

    const filteredDocs = useMemo(() => {
        return documents.filter(doc => {
            // 1. Search Term
            const matchesSearch =
                doc.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

            if (!matchesSearch) return false;

            // 2. Status Filter
            if (statusFilter !== 'all' && doc.status !== statusFilter) return false;

            // 3. Screening Status Filter
            if (screeningFilter !== 'all') {
                if (screeningFilter === 'pass' && doc.documentScreeningStatus !== 'pass') return false;
                if (screeningFilter === 'fail' && doc.documentScreeningStatus !== 'fail') return false;
            }

            // 4. Date Range Filter
            if (startDate) {
                const docDate = new Date(doc.createdAt);
                const start = new Date(startDate);
                if (docDate < start) return false;
            }
            if (endDate) {
                const docDate = new Date(doc.createdAt);
                const end = new Date(endDate);
                // Set end date to end of day
                end.setHours(23, 59, 59, 999);
                if (docDate > end) return false;
            }

            // 5. Tag Filter (OR 조건: 선택한 태그 중 하나라도 포함되면 표시)
            if (selectedTags.length > 0) {
                const hasAnyTag = selectedTags.some(tag => doc.tags?.includes(tag));
                if (!hasAnyTag) return false;
            }

            // 6. Favorite Filter
            if (favoriteFilter && !doc.isFavorite) return false;

            return true;
        });
    }, [documents, searchTerm, statusFilter, screeningFilter, startDate, endDate, selectedTags, favoriteFilter]);

    return {
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        screeningFilter,
        setScreeningFilter,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        selectedTags,
        setSelectedTags,
        favoriteFilter,
        setFavoriteFilter,
        filteredDocs
    };
}
