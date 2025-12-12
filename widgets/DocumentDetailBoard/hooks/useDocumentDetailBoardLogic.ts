import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocument, useDeleteDocument } from '@/entities/document';
import { useDocumentEditStore } from '@/entities/document';

export const useDocumentDetailBoardLogic = () => {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { data: doc, isLoading } = useDocument(id);
    const deleteDocumentMutation = useDeleteDocument();
    const { setDocument, setAutoRefineIndex } = useDocumentEditStore();

    const [isDocDeleteModalOpen, setIsDocDeleteModalOpen] = useState(false);
    const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);

    useEffect(() => {
        if (doc) {
            setDocument(doc);
        }
    }, [doc, setDocument]);

    const handleEdit = () => {
        router.push(`/document/${id}/edit`);
    };

    const handleDelete = () => {
        setIsDocDeleteModalOpen(true);
    };

    const confirmDocDelete = async () => {
        if (doc) {
            await deleteDocumentMutation.mutateAsync(doc.id);
            router.push('/archive');
            setIsDocDeleteModalOpen(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleRefineTrigger = (index: number) => {
        setAutoRefineIndex(index);
        router.push(`/document/${id}/edit`);
    };

    const handleBack = () => {
        router.back();
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
