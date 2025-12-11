'use client';

import React, { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from './badge';

interface TagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function TagInput({ tags = [], onChange, placeholder = "태그 입력...", className = "" }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const addTag = () => {
        if (inputValue.trim() && !tags.includes(inputValue.trim())) {
            onChange([...tags, inputValue.trim()]);
            setInputValue('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className={`flex flex-wrap gap-2 p-2 bg-zinc-900 border border-zinc-700 rounded-lg focus-within:border-primary transition-colors ${className}`}>
            {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-sm py-1">
                    {tag}
                    <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:bg-zinc-700 rounded-full p-0.5 transition-colors"
                    >
                        <X size={12} />
                    </button>
                </Badge>
            ))}
            <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={addTag}
                className="flex-1 bg-transparent border-none outline-none text-white min-w-[120px] text-sm"
                placeholder={tags.length === 0 ? placeholder : ""}
            />
        </div>
    );
}
