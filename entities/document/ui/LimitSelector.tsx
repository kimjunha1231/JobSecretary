'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const LIMIT_OPTIONS = [300, 500, 700, 1000, 1500, 2000];

interface LimitSelectorProps {
    value: number;
    onChange: (value: number) => void;
}

export const LimitSelector: React.FC<LimitSelectorProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [customValue, setCustomValue] = useState(value.toString());

    React.useEffect(() => {
        setCustomValue(value.toString());
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomValue(val);
        const num = parseInt(val);
        if (!isNaN(num) && num > 0) {
            onChange(num);
        }
    };

    const handleSelectOption = (option: number) => {
        setCustomValue(option.toString());
        onChange(option);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    value={customValue}
                    onChange={handleInputChange}
                    className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:border-primary focus:outline-none"
                    min="1"
                    aria-label="글자 수 제한 직접 입력"
                />
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1 hover:bg-zinc-800 rounded transition-colors"
                    aria-label="글자 수 제한 선택"
                >
                    <ChevronDown size={16} className="text-zinc-400" />
                </button>
            </div>
            {isOpen && (
                <div className="absolute top-full mt-1 bg-zinc-900 border border-zinc-700 rounded shadow-lg z-10">
                    {LIMIT_OPTIONS.map(option => (
                        <button
                            key={option}
                            onClick={() => handleSelectOption(option)}
                            className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-800 transition-colors"
                            aria-label={`${option}자로 제한`}
                        >
                            {option}자
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
