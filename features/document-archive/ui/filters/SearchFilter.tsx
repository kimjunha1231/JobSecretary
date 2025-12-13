import React from 'react';
import { Search } from 'lucide-react';
import { SearchFilterProps } from '../../types';

export const SearchFilter = ({ searchTerm, setSearchTerm }: SearchFilterProps) => {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
                type="text"
                placeholder="회사명 또는 직무로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-primary transition-colors"
                aria-label="문서 검색"
            />
        </div>
    );
};
