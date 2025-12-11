'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocuments, useDeleteDocument } from '@/entities/document';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { ConfirmationModal } from '@/shared/ui';
import { ReferenceSidebar, ReferenceDrawer } from '@/features/reference-search';
import { AiSidebar } from '@/features/ai-assistant';
import { useDocumentForm } from '@/features/document-editor';
import { useReferenceSearch } from '@/features/reference-search';
import { DocumentHeader, DocumentEditor, DocumentViewer, InterviewQuestionsModal } from '@/features/document-editor';

export default function DocumentDetail() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { data: documents = [], isLoading } = useDocuments();
    const deleteDocumentMutation = useDeleteDocument();

    const doc = documents.find(d => d.id === id);

    // Hooks
    const {
        form,
        updateField,
        updateSection,
        addSection,
        removeSection,
        saveDocument
    } = useDocumentForm(doc);

    const searchProps = useReferenceSearch();

    // Local UI State
    const [isEditing, setIsEditing] = useState(false);
    const [autoRefineIndex, setAutoRefineIndex] = useState<number | null>(null);
    const [isDocDeleteModalOpen, setIsDocDeleteModalOpen] = useState(false);
    const [isSectionDeleteModalOpen, setIsSectionDeleteModalOpen] = useState(false);
    const [sectionDeleteIndex, setSectionDeleteIndex] = useState<number | null>(null);
    const [isReferenceOpen, setIsReferenceOpen] = useState(false);
    const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);

    // Initialize search tags when doc loads
    useEffect(() => {
        if (doc?.tags && doc.tags.length > 0) {
            searchProps.setSearchTags(doc.tags);
        }
    }, [doc]);

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

    const handleSave = async () => {
        const success = await saveDocument();
        if (success) {
            setIsEditing(false);
        }
    };

    const handleDelete = () => {
        setIsDocDeleteModalOpen(true);
    };

    const confirmDocDelete = async () => {
        await deleteDocumentMutation.mutateAsync(doc.id);
        router.push('/archive');
        setIsDocDeleteModalOpen(false);
    };

    const handleDeleteSection = (index: number) => {
        setSectionDeleteIndex(index);
        setIsSectionDeleteModalOpen(true);
    };

    const confirmSectionDelete = () => {
        if (sectionDeleteIndex !== null) {
            removeSection(sectionDeleteIndex);
            setSectionDeleteIndex(null);
        }
        setIsSectionDeleteModalOpen(false);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleRefineTrigger = (index: number) => {
        setAutoRefineIndex(index);
        setIsEditing(true);
    };

    return (
        <div className={`mx-auto pb-20 ${isEditing ? 'w-full max-w-[1600px] px-4' : 'max-w-4xl'}`}>
            <div className={isEditing ? 'grid grid-cols-1 lg:grid-cols-12 gap-6' : ''}>
                <div className={isEditing ? 'col-span-1 lg:col-span-9' : ''}>
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

                        <DocumentHeader
                            doc={doc}
                            isEditing={isEditing}
                            form={form}
                            onUpdateField={(key, value) => {
                                updateField(key, value);
                                if (key === 'tags') {
                                    searchProps.setSearchTags(value as string[]);
                                }
                            }}
                            onEdit={() => setIsEditing(true)}
                            onCancel={() => setIsEditing(false)}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            onShowInterviewQuestions={() => setIsInterviewModalOpen(true)}
                        />
                    </div>

                    {isEditing ? (
                        <DocumentEditor
                            sections={form.sections}
                            onUpdateSection={updateSection}
                            onAddSection={addSection}
                            onRemoveSection={handleDeleteSection}
                            autoRefineIndex={autoRefineIndex}
                        />
                    ) : (
                        <DocumentViewer
                            sections={form.sections}
                            onCopy={handleCopy}
                            onRefine={handleRefineTrigger}
                        />
                    )}
                </div>

                {isEditing && (
                    <div className="hidden lg:block lg:col-span-3">
                        <div className="sticky top-24 h-[calc(100vh-8rem)] border-l border-white/10 pl-4">
                            <ReferenceSidebar {...searchProps} />
                        </div>
                    </div>
                )}
            </div>

            {isEditing && (
                <>
                    <ReferenceDrawer
                        isOpen={isReferenceOpen}
                        onOpen={() => setIsReferenceOpen(true)}
                        onClose={() => setIsReferenceOpen(false)}
                        searchProps={searchProps}
                    />
                </>
            )}

            <ConfirmationModal
                isOpen={isDocDeleteModalOpen}
                onClose={() => setIsDocDeleteModalOpen(false)}
                onConfirm={confirmDocDelete}
                title="문서 삭제"
                message="정말 이 문서를 삭제하시겠습니까?"
                confirmText="삭제"
                variant="danger"
            />

            <ConfirmationModal
                isOpen={isSectionDeleteModalOpen}
                onClose={() => {
                    setIsSectionDeleteModalOpen(false);
                    setSectionDeleteIndex(null);
                }}
                onConfirm={confirmSectionDelete}
                title="문항 삭제"
                message="이 문항을 삭제하시겠습니까?"
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
