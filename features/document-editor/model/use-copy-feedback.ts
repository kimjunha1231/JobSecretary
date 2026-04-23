import { useState, useCallback } from 'react';

export const useCopyFeedback = (duration: number = 2000) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const copyWithFeedback = useCallback((text: string, index: number, onCopy?: (text: string, index: number) => void) => {
        onCopy?.(text, index);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), duration);
    }, [duration]);

    const isCopied = (index: number) => copiedIndex === index;

    return {
        copiedIndex,
        copyWithFeedback,
        isCopied
    };
};
