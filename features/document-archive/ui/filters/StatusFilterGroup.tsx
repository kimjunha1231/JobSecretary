import React from 'react';
import { StatusFilterGroupProps } from '../../types';

const FilterButton = ({ label, isActive, onClick, activeClass }: { label: string, isActive: boolean, onClick: () => void, activeClass: string }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
            ? activeClass
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
    >
        {label}
    </button>
);

export const StatusFilterGroup = ({
    statusFilter,
    setStatusFilter,
    screeningFilter,
    setScreeningFilter,
    favoriteFilter,
    setFavoriteFilter
}: StatusFilterGroupProps) => {
    return (
        <div className="flex flex-wrap gap-2">
            <FilterButton
                label="전체"
                isActive={statusFilter === 'all' && screeningFilter === 'all'}
                onClick={() => { setStatusFilter('all'); setScreeningFilter('all'); }}
                activeClass="bg-zinc-700 text-white border border-zinc-600"
            />
            <FilterButton
                label="합격"
                isActive={statusFilter === 'pass'}
                onClick={() => setStatusFilter(statusFilter === 'pass' ? 'all' : 'pass')}
                activeClass="bg-green-500/20 text-green-300 border border-green-500/30"
            />
            <FilterButton
                label="불합격"
                isActive={statusFilter === 'fail'}
                onClick={() => setStatusFilter(statusFilter === 'fail' ? 'all' : 'fail')}
                activeClass="bg-red-500/20 text-red-300 border border-red-500/30"
            />

            <div className="w-px h-8 bg-zinc-700 mx-2" />

            <FilterButton
                label="서류합격"
                isActive={screeningFilter === 'pass'}
                onClick={() => setScreeningFilter(screeningFilter === 'pass' ? 'all' : 'pass')}
                activeClass="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            />

            <div className="w-px h-8 bg-zinc-700 mx-2" />

            <FilterButton
                label="즐겨찾기"
                isActive={favoriteFilter}
                onClick={() => setFavoriteFilter(!favoriteFilter)}
                activeClass="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
            />
        </div>
    );
};
