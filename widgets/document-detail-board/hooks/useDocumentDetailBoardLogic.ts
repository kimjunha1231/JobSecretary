import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useDocument, useDeleteDocument } from '@/entities/document';
import { useDocumentEditStore } from '@/entities/document';

export const useDocumentDetailBoardLogic = () => {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params?.id as string;
    const router = useRouter();
    const { data: doc, isLoading } = useDocument(id);
    const deleteDocumentMutation = useDeleteDocument();
    const { setDocument, setAutoRefineIndex } = useDocumentEditStore();

    const [isDocDeleteModalOpen, setIsDocDeleteModalOpen] = useState(false);
    const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);

    // URL 파라미터에서 origin 확인 (dashboard 또는 archive)
    // origin이 없으면 document의 isArchived 상태로 판단
    const getOriginPath = () => {
        const origin = searchParams.get('from');
        if (origin === 'dashboard') return '/dashboard';
        if (origin === 'archive') return '/archive';
        // origin이 없으면 문서의 isArchived 상태로 판단
        return doc?.isArchived ? '/archive' : '/dashboard';
    };

    useEffect(() => {
        if (doc) {
            setDocument(doc);
        }
    }, [doc, setDocument]);

    const handleEdit = () => {
        // 수정 페이지로 이동할 때도 origin 정보 전달
        const origin = searchParams.get('from');
        const editUrl = origin
            ? `/document/${id}/edit?from=${origin}`
            : `/document/${id}/edit`;
        router.push(editUrl);
    };

    const handleDelete = () => {
        setIsDocDeleteModalOpen(true);
    };

    const confirmDocDelete = async () => {
        if (doc) {
            await deleteDocumentMutation.mutateAsync(doc.id);
            router.push(getOriginPath());
            setIsDocDeleteModalOpen(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleRefineTrigger = (index: number) => {
        setAutoRefineIndex(index);
        // AI 교정 트리거 시에도 origin 정보 전달
        const origin = searchParams.get('from');
        const editUrl = origin
            ? `/document/${id}/edit?from=${origin}`
            : `/document/${id}/edit`;
        router.push(editUrl);
    };

    const handleBack = () => {
        // router.back() 대신 명시적으로 목록 페이지로 이동
        router.push(getOriginPath());
    };

    const parseSections = () => {
        if (!doc?.content) return [];
        const parts = doc.content.split('### ').filter(p => p.trim());
        return parts.map(part => {
            const lines = part.split('\n');
            const title = lines[0].trim();
            const content = lines.slice(1).join('\n').trim();
            return { title, content, limit: 1000 };
        });
    };

    return {
        doc,
        isLoading,
        modals: {
            isDocDeleteModalOpen,
            setIsDocDeleteModalOpen,
            isInterviewModalOpen,
            setIsInterviewModalOpen
        },
        handlers: {
            handleEdit,
            handleDelete,
            confirmDocDelete,
            handleCopy,
            handleRefineTrigger,
            handleBack
        },
        parseSections
    };
};
