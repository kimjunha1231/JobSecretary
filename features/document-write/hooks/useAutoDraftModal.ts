'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUniqueTags } from '@/entities/document/actions';
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
    const [allTags, setAllTags] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setKeywords('');
            setCharLimit(700);
            setSelectedTags([]);

            // Load all unique tags from the server
            getUniqueTags().then(tags => {
                setAllTags(tags);
            }).catch(() => {
                // Silent error
            });
        }
    }, [isOpen]);

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
            const draft = await generateDraft(
                company,
                role,
                question,
                keywords,
                selectedTags, // Pass tags instead of documents
                charLimit
            );

            onDraftGenerated(draft);
            toast.success('초안이 생성되었습니다!');
            onClose();
        } catch (error) {
            toast.error('초안 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    }, [selectedTags, company, role, question, keywords, charLimit, onDraftGenerated, onClose]);

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
