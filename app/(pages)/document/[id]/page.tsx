'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocument, useDeleteDocument } from '@/entities/document';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ConfirmationModal } from '@/shared/ui';
import { DocumentViewHeader, DocumentViewer, InterviewQuestionsModal } from '@/features/document-editor';
import { useDocumentEditStore } from '@/shared/store/useDocumentEditStore';

export default function DocumentDetailPage() {
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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                <p>문서를 불러오는 중입니다...</p>
            </div>
        );
    }

    if (!doc) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500">
                <p>문서를 찾을 수 없습니다.</p>
                <button
                    onClick={() => router.push('/archive')}
                    className="mt-4 text-primary hover:underline"
                >
                    아카이브로 돌아가기
                </button>
            </div>
        );
    }

    const handleEdit = () => {
        router.push(`/document/${id}/edit`);
    };

    const handleDelete = () => {
        setIsDocDeleteModalOpen(true);
    };

    const confirmDocDelete = async () => {
        await deleteDocumentMutation.mutateAsync(doc.id);
        router.push('/archive');
        setIsDocDeleteModalOpen(false);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleRefineTrigger = (index: number) => {
        setAutoRefineIndex(index);
        router.push(`/document/${id}/edit`);
    };

    const parseSections = () => {
        if (!doc.content) return [];
        const parts = doc.content.split('### ').filter(p => p.trim());
        return parts.map(part => {
            const lines = part.split('\n');
            const title = lines[0].trim();
            const content = lines.slice(1).join('\n').trim();
            return { title, content, limit: 1000 };
        });
    };

    return (
        <div className="mx-auto pb-20 max-w-4xl">
            <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span>목록으로</span>
                    </button>
                </div>

                <DocumentViewHeader
                    doc={doc}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onShowInterviewQuestions={() => setIsInterviewModalOpen(true)}
                />
            </div>

            <DocumentViewer
                sections={parseSections()}
                onCopy={handleCopy}
                onRefine={handleRefineTrigger}
            />

            <ConfirmationModal
                isOpen={isDocDeleteModalOpen}
                onClose={() => setIsDocDeleteModalOpen(false)}
                onConfirm={confirmDocDelete}
                title="문서 삭제"
                message="정말 이 문서를 삭제하시겠습니까?"
                confirmText="삭제"
                variant="danger"
            />

            <InterviewQuestionsModal
                isOpen={isInterviewModalOpen}
                onClose={() => setIsInterviewModalOpen(false)}
                documentContent={doc.content}
            />
        </div>
    );
}
