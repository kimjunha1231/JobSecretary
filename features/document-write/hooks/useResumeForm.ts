'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useDraftStore } from '@/shared/store/useDraftStore';
import { useAddDocument } from '@/entities/document';

export const useResumeForm = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const status = searchParams.get('status') || 'writing';
    const fromArchive = searchParams.get('from') === 'archive';
    const addDocumentMutation = useAddDocument();

    const [isSaving, setIsSaving] = useState(false);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [isAutoDraftOpen, setIsAutoDraftOpen] = useState(false);

    const {
        formData,
        sections,
        currentSectionIndex,
        setFormData,
        setCurrentSectionIndex,
        addSection,
        removeSection,
        updateSection,
        clearDraft,
        setSearchTags
    } = useDraftStore();

    const goToPrevSection = useCallback(() => {
        setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1));
    }, [currentSectionIndex, setCurrentSectionIndex]);

    const goToNextSection = useCallback(() => {
        setCurrentSectionIndex(Math.min(sections.length - 1, currentSectionIndex + 1));
    }, [currentSectionIndex, sections.length, setCurrentSectionIndex]);

    const saveDocument = useCallback(async (finalStatus: string, screeningStatus: 'pass' | 'fail' | null = null) => {
        const combinedContent = sections.map(s => {
            return `### ${s.title}\n${s.content}`;
        }).join('\n\n');

        try {
            setIsSaving(true);
            await addDocumentMutation.mutateAsync({
                title: `${formData.role} at ${formData.company}`,
                company: formData.company,
                role: formData.role,
                content: combinedContent,
                jobPostUrl: formData.jobPostUrl,
                tags: formData.tags,
                status: finalStatus as any,
                deadline: formData.deadline,
                isArchived: fromArchive,
                documentScreeningStatus: screeningStatus
            });

            clearDraft();
            setSearchTags([]);
            toast.success('저장되었습니다!');

            if (fromArchive) {
                router.push('/archive');
            } else {
                router.push('/dashboard');
            }
        } catch (error) {
            console.error('Failed to save document:', error);
            toast.error('저장에 실패했습니다.');
            setIsSaving(false);
        }
    }, [sections, formData, fromArchive, addDocumentMutation, clearDraft, setSearchTags, router]);

    const handleSave = useCallback(async () => {
        if (isSaving) return;

        if (!formData.company) {
            toast.error('회사명을 입력해주세요.');
            return;
        }

        if (fromArchive) {
            setShowStatusDialog(true);
            return;
        }

        await saveDocument(status);
    }, [isSaving, formData.company, fromArchive, status, saveDocument]);

    const handleStatusConfirm = useCallback(({ finalStatus, documentStatus }: { finalStatus: string; documentStatus: 'pass' | 'fail' | null }) => {
        setShowStatusDialog(false);
        setSelectedStatus(finalStatus);
        saveDocument(finalStatus, documentStatus);
    }, [saveDocument]);

    const handleDraftGenerated = useCallback((draft: string) => {
        const currentContent = sections[currentSectionIndex].content;
        const newContent = currentContent ? `${currentContent}\n\n${draft}` : draft;
        updateSection(currentSectionIndex, 'content', newContent);
    }, [sections, currentSectionIndex, updateSection]);

    const currentSection = sections[currentSectionIndex];

    return {
        // State
        formData,
        sections,
        currentSectionIndex,
        currentSection,
        isSaving,
        showStatusDialog,
        isAutoDraftOpen,

        // Actions
        setFormData,
        addSection,
        removeSection,
        updateSection,
        setSearchTags,
        goToPrevSection,
        goToNextSection,
        handleSave,
        handleStatusConfirm,
        handleDraftGenerated,
        setShowStatusDialog,
        setIsAutoDraftOpen
    };
};
