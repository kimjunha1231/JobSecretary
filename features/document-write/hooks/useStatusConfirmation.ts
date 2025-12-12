'use client';

import { useState, useCallback } from 'react';
import { StatusConfirmationResult } from '../types';

export const useStatusConfirmation = (onConfirm: (result: StatusConfirmationResult) => void) => {
    const [documentStatus, setDocumentStatus] = useState<'pass' | 'fail' | null>(null);
    const [finalStatus, setFinalStatus] = useState<'pass' | 'fail' | null>(null);

    const handleConfirm = useCallback(() => {
        let status = 'writing';

        if (finalStatus === 'pass') {
            status = 'pass';
        } else if (finalStatus === 'fail') {
            status = 'fail';
        } else if (documentStatus === 'pass') {
            status = 'interview';
        } else if (documentStatus === 'fail') {
            status = 'fail';
        } else {
            status = 'applied';
        }

        onConfirm({
            finalStatus: status,
            documentStatus
        });
    }, [finalStatus, documentStatus, onConfirm]);

    const canConfirm = documentStatus !== null || finalStatus !== null;

    return {
        documentStatus,
        setDocumentStatus,
        finalStatus,
        setFinalStatus,
        handleConfirm,
        canConfirm
    };
};
