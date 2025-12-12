'use client';

import { useState, useCallback } from 'react';
import { Status } from '@/shared/types';

export const useResultModal = (onConfirm: (status: Status) => void) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = useCallback(async (status: Status) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        await onConfirm(status);
        setIsSubmitting(false);
    }, [isSubmitting, onConfirm]);

    return {
        isSubmitting,
        handleConfirm
    };
};
