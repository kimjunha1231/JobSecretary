import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useDocument } from '@/entities/document';
import { useDocumentForm, useEditPageLeaveWarning } from '@/features/document-editor/hooks';
import { useDocumentEditStore } from '@/entities/document';
import { useReferenceSearch } from '@/features/reference-search';

export const useDocumentEditBoardLogic = () => {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params?.id as string;
    const router = useRouter();
    const { data: doc, isLoading } = useDocument(id);
    const { autoRefineIndex, setAutoRefineIndex } = useDocumentEditStore();

    const formProps = useDocumentForm(doc || undefined);
    const { handleBack: handleBackWithWarning } = useEditPageLeaveWarning(formProps.isDirty);

    const searchProps = useReferenceSearch();

    const [isSectionDeleteModalOpen, setIsSectionDeleteModalOpen] = useState(false);
    const [sectionDeleteIndex, setSectionDeleteIndex] = useState<number | null>(null);
    const [isReferenceOpen, setIsReferenceOpen] = useState(false);

    // URL 파라미터에서 origin 확인 (dashboard 또는 archive)
    const getOriginPath = () => {
        const origin = searchParams.get('from');
        if (origin === 'dashboard') return '/dashboard';
        if (origin === 'archive') return '/archive';
        // origin이 없으면 문서의 isArchived 상태로 판단
        return doc?.isArchived ? '/archive' : '/dashboard';
    };

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
            // 저장 후 상세 페이지로 이동 (origin 정보 유지)
            const origin = searchParams.get('from');
            const detailUrl = origin
                ? `/document/${id}?from=${origin}`
                : `/document/${id}`;
            router.push(detailUrl);
        }
    };

    const handleCancel = () => {
        // 취소 시 상세 페이지로 이동 (origin 정보 유지)
        const origin = searchParams.get('from');
        const detailUrl = origin
            ? `/document/${id}?from=${origin}`
            : `/document/${id}`;

        handleBackWithWarning(detailUrl);
    };

    const handleBackToList = () => {
        // 목록으로 가기 버튼 클릭 시 상세 페이지로 이동 (origin 정보 유지)
        const origin = searchParams.get('from');
        const detailUrl = origin
            ? `/document/${id}?from=${origin}`
            : `/document/${id}`;

        handleBackWithWarning(detailUrl);
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
            handleBackToList,
            handleDeleteSection,
            confirmSectionDelete
        }
    };
};
