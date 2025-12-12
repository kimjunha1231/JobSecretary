'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

interface UseCopyToClipboardOptions {
    successMessage?: string;
    errorMessage?: string;
}

export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
    const {
        successMessage = '복사되었습니다!',
        errorMessage = '복사에 실패했습니다.'
    } = options;

    const copy = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(successMessage);
            return true;
        } catch (error) {
            console.error('Failed to copy:', error);
            toast.error(errorMessage);
            return false;
        }
    }, [successMessage, errorMessage]);

    return { copy };
}
