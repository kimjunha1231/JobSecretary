'use client';

import React from 'react';
import { Calendar, X } from 'lucide-react';

interface DateRangeFilterProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    onClear: () => void;
}

export function DateRangeFilter({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onClear,
}: DateRangeFilterProps) {
    return (
        <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2 px-2">
                <Calendar size={14} className="text-zinc-500" />
                <span className="text-xs text-zinc-500 font-medium">기간</span>
            </div>
            <div className="flex items-center gap-1">
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    className="bg-transparent border-none text-xs text-zinc-300 focus:ring-0 p-1 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
                <span className="text-zinc-600 text-xs">~</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    className="bg-transparent border-none text-xs text-zinc-300 focus:ring-0 p-1 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
            </div>
            {(startDate || endDate) && (
                <button
                    onClick={onClear}
                    className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
                    title="기간 초기화"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
