import { useState } from 'react';
import { useDocuments } from '@/entities/document';
import { Document } from '@/entities/document';
import { useParams } from 'next/navigation';
import { Section } from '../types';

interface UseAutoDraftProps {
    sections: Section[];
    onUpdateSection: (index: number, field: keyof Section, value: string) => void;
    doc?: Document;
}

export const useAutoDraft = ({ sections, onUpdateSection, doc }: UseAutoDraftProps) => {
    const [autoDraftIndex, setAutoDraftIndex] = useState<number | null>(null);

    const openAutoDraft = (index: number) => setAutoDraftIndex(index);
    const closeAutoDraft = () => setAutoDraftIndex(null);

    const handleDraftGenerated = (draft: string) => {
        if (autoDraftIndex === null) return;

        const currentContent = sections[autoDraftIndex].content;
        const newContent = currentContent ? `${currentContent}\n\n${draft}` : draft;
        onUpdateSection(autoDraftIndex, 'content', newContent);
    };

    return {
        autoDraftIndex,
        doc,
        openAutoDraft,
        closeAutoDraft,
        handleDraftGenerated,
        isAutoDraftOpen: autoDraftIndex !== null,
        currentQuestion: autoDraftIndex !== null ? sections[autoDraftIndex].title : ''
    };
};
