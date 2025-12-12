import { useEffect, useState } from 'react';
import { Document } from '@/shared/types';
import { toast } from 'sonner';

export const useDocumentHeader = (doc: Document) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const validateInterviewQuestions = (): boolean => {
        if (!doc.content) {
            toast.error('자기소개서 내용이 없습니다.');
            return false;
        }

        const sections = doc.content.split('### ').filter(section => section.trim().length > 0);

        if (sections.length < 2) {
            toast.error('자기소개서 항목이 2개 이상이어야 합니다.');
            return false;
        }

        const isValid = sections.every(section => {
            const lines = section.split('\n');
            const content = lines.slice(1).join('\n').trim();
            return content.length >= 500;
        });

        if (!isValid) {
            toast.error('각 항목의 내용이 500자 이상이어야 합니다.');
            return false;
        }

        return true;
    };

    return {
        isClient,
        validateInterviewQuestions
    };
};
