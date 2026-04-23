'use client';

import { useState, useCallback } from 'react';

export const useArchiveModal = (onConfirm: (passed: boolean) => void) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = useCallback(async (passed: boolean) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        await onConfirm(passed);
        setIsSubmitting(false);
    }, [isSubmitting, onConfirm]);

    return {
        isSubmitting,
        handleConfirm
    };
};
