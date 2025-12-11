'use client';

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { X, Plus, Check, Loader2 } from 'lucide-react';
import { Badge } from './badge';
import { getUniqueTags } from '@/entities/document';
import { cn } from '@/shared/lib/utils';

interface SmartTagInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    className?: string;
    allowCreate?: boolean;
}

export function SmartTagInput({ tags = [], onChange, placeholder = "태그 입력...", className = "", allowCreate = true }: SmartTagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchTags = async () => {
            setIsLoading(true);
            try {
                const uniqueTags = await getUniqueTags();
                setSuggestions(uniqueTags);
            } catch (error) {
                console.error("Failed to fetch tags:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTags();
    }, []);

    useEffect(() => {
        const filtered = suggestions.filter(tag =>
            tag.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tags.includes(tag)
        );
        setFilteredSuggestions(filtered);
        setSelectedIndex(0);
    }, [inputValue, suggestions, tags]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current && !inputRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const addTag = (tag: string) => {
        const trimmedTag = tag.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            onChange([...tags, trimmedTag]);
            setInputValue('');
            setIsOpen(false);
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.nativeEvent.isComposing) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            if (isOpen && filteredSuggestions.length > 0) {
                addTag(filteredSuggestions[selectedIndex]);
            } else if (inputValue.trim() && allowCreate) {
                addTag(inputValue);
            }
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            onChange(tags.slice(0, -1));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) setIsOpen(true);
            else setSelectedIndex(prev => (prev + 1) % (filteredSuggestions.length + (inputValue && allowCreate ? 1 : 0)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) setIsOpen(true);
            else setSelectedIndex(prev => (prev - 1 + (filteredSuggestions.length + (inputValue && allowCreate ? 1 : 0))) % (filteredSuggestions.length + (inputValue && allowCreate ? 1 : 0)));
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const showCreateOption = allowCreate && inputValue.trim() && !filteredSuggestions.includes(inputValue.trim()) && !tags.includes(inputValue.trim());

    return (
        <div className={cn("relative", className)}>
            <div className="flex flex-wrap gap-2 p-2 bg-zinc-900 border border-zinc-700 rounded-lg focus-within:border-primary transition-colors">
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
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={e => {
                        setInputValue(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent border-none outline-none text-white min-w-[120px] text-sm placeholder:text-zinc-500"
                    placeholder={tags.length === 0 ? placeholder : ""}
                />
            </div>

            {isOpen && (inputValue || filteredSuggestions.length > 0 || isLoading) && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto"
                >
                    {isLoading ? (
                        <div className="p-4 flex items-center justify-center text-zinc-500 text-sm">
                            <Loader2 size={16} className="animate-spin mr-2" />
                            태그 불러오는 중...
                        </div>
                    ) : (
                        <div className="p-1">
                            <div className="text-xs font-medium text-zinc-500 px-2 py-1.5">
                                옵션 선택 또는 생성
                            </div>

                            {filteredSuggestions.map((tag, index) => (
                                <button
                                    key={tag}
                                    onClick={() => addTag(tag)}
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 text-sm rounded flex items-center justify-between group transition-colors",
                                        index === selectedIndex ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 group-hover:bg-primary transition-colors" />
                                        <span>{tag}</span>
                                    </div>
                                </button>
                            ))}

                            {showCreateOption && (
                                <button
                                    onClick={() => addTag(inputValue)}
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 text-sm rounded flex items-center gap-2 transition-colors",
                                        filteredSuggestions.length === selectedIndex ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                    )}
                                >
                                    <div className="flex items-center justify-center w-5 h-5 rounded bg-zinc-800 border border-zinc-600">
                                        <Plus size={12} />
                                    </div>
                                    <span>생성: <span className="text-white font-medium">"{inputValue}"</span></span>
                                </button>
                            )}

                            {!showCreateOption && filteredSuggestions.length === 0 && (
                                <div className="px-2 py-4 text-center text-zinc-500 text-sm">
                                    검색 결과가 없습니다.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
