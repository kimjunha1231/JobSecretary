'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useDocuments } from '@/entities/document';
import { generateDraft } from '@/shared/api/ai';
import { toast } from 'sonner';

interface UseAutoDraftModalProps {
    isOpen: boolean;
    company: string;
    role: string;
    question: string;
    onDraftGenerated: (draft: string) => void;
    onClose: () => void;
}

export const useAutoDraftModal = ({
    isOpen,
    company,
    role,
    question,
    onDraftGenerated,
    onClose
}: UseAutoDraftModalProps) => {
    const [keywords, setKeywords] = useState('');
    const [charLimit, setCharLimit] = useState(700);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const { data: documents = [] } = useDocuments();

    useEffect(() => {
        if (isOpen) {
            setKeywords('');
            setCharLimit(700);
            setSelectedTags([]);
        }
    }, [isOpen]);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        documents.forEach(doc => {
            doc.tags?.forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    }, [documents]);

    const toggleTag = useCallback((tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    }, []);

    const handleGenerate = useCallback(async () => {
        setIsGenerating(true);
        try {
            const contextDocuments = selectedTags.length > 0
                ? documents.filter(doc => doc.tags?.some(tag => selectedTags.includes(tag)))
                : documents;

            if (selectedTags.length > 0 && contextDocuments.length === 0) {
                toast.warning('선택한 태그와 일치하는 문서가 없습니다. 전체 문서를 참고합니다.');
            }

            const finalDocs = contextDocuments.length > 0 ? contextDocuments : documents;
            const draft = await generateDraft(company, role, question, keywords, finalDocs, charLimit);

            onDraftGenerated(draft);
            toast.success('초안이 생성되었습니다!');
            onClose();
        } catch (error) {

            toast.error('초안 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    }, [selectedTags, documents, company, role, question, keywords, charLimit, onDraftGenerated, onClose]);

    return {
        keywords,
        setKeywords,
        charLimit,
        setCharLimit,
        selectedTags,
        allTags,
        isGenerating,
        toggleTag,
        handleGenerate
    };
};
