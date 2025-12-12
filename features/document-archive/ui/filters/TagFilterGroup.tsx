import React from 'react';
import { TagFilterGroupProps } from '../../types';

export const TagFilterGroup = ({ allTags, selectedTags, toggleTag }: TagFilterGroupProps) => {
    if (allTags.length === 0) return null;

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-zinc-500 mr-2">태그:</span>
                {allTags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${selectedTags.includes(tag)
                            ? 'bg-primary/20 text-primary border-primary/50'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                            }`}
                    >
                        #{tag}
                    </button>
                ))}
            </div>
        </div>
    );
};
