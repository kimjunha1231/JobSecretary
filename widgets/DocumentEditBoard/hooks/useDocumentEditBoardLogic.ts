import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocument } from '@/entities/document';
import { useDocumentForm } from '@/features/document-editor/hooks';
import { useDocumentEditStore } from '@/entities/document';
import { useReferenceSearch } from '@/features/reference-search';

export const useDocumentEditBoardLogic = () => {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { data: doc, isLoading } = useDocument(id);
    const { autoRefineIndex, setAutoRefineIndex } = useDocumentEditStore();

    const formProps = useDocumentForm(doc || undefined);
    const searchProps = useReferenceSearch();

    const [isSectionDeleteModalOpen, setIsSectionDeleteModalOpen] = useState(false);
    const [sectionDeleteIndex, setSectionDeleteIndex] = useState<number | null>(null);
    const [isReferenceOpen, setIsReferenceOpen] = useState(false);

    useEffect(() => {
        if (doc?.tags && doc.tags.length > 0) {
            searchProps.setSearchTags(doc.tags);
        }
    }, [doc]);

    // 페이지 떠날 때 autoRefineIndex 초기화
    useEffect(() => {
        return () => {
            setAutoRefineIndex(null);
        };
    }, [setAutoRefineIndex]);

    const handleSave = async () => {
        const success = await formProps.saveDocument();
        if (success) {
            router.push(`/document/${id}`);
        }
    };

    const handleCancel = () => {
        router.push(`/document/${id}`);
    };

    const handleDeleteSection = (index: number) => {
        setSectionDeleteIndex(index);
        setIsSectionDeleteModalOpen(true);
    };

    const confirmSectionDelete = () => {
        if (sectionDeleteIndex !== null) {
            formProps.removeSection(sectionDeleteIndex);
            setSectionDeleteIndex(null);
        }
        setIsSectionDeleteModalOpen(false);
    };

    return {
        doc,
        isLoading,
        autoRefineIndex,
        formProps,
        searchProps,
        modals: {
            isSectionDeleteModalOpen,
            setIsSectionDeleteModalOpen,
            isReferenceOpen,
            setIsReferenceOpen,
            sectionDeleteIndex,
            setSectionDeleteIndex
        },
        handlers: {
            handleSave,
            handleCancel,
            handleDeleteSection,
            confirmSectionDelete
        }
    };
};
