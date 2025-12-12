'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocument } from '@/entities/document';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ConfirmationModal } from '@/shared/ui';
import { ReferenceSidebar, ReferenceDrawer } from '@/features/reference-search';
import { useDocumentForm, DocumentEditHeader, DocumentEditor } from '@/features/document-editor';
import { useReferenceSearch } from '@/features/reference-search';
import { useDocumentEditStore } from '@/shared/store/useDocumentEditStore';

export default function DocumentEditPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { data: doc, isLoading } = useDocument(id);
    const { autoRefineIndex, setAutoRefineIndex, clear } = useDocumentEditStore();

    const {
        form,
        updateField,
        updateSection,
        addSection,
        removeSection,
        saveDocument
    } = useDocumentForm(doc || undefined);

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
            removeSection(sectionDeleteIndex);
            setSectionDeleteIndex(null);
        }
        setIsSectionDeleteModalOpen(false);
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto pb-20 px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="col-span-1 lg:col-span-9">
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
                            >
                                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                <span>돌아가기</span>
                            </button>
                        </div>

                        <DocumentEditHeader
                            form={form}
                            onUpdateField={(key, value) => {
                                updateField(key, value);
                                if (key === 'tags') {
                                    searchProps.setSearchTags(value as string[]);
                                }
                            }}
                            onCancel={handleCancel}
                            onSave={handleSave}
                        />
                    </div>

                    <DocumentEditor
                        sections={form.sections}
                        onUpdateSection={updateSection}
                        onAddSection={addSection}
                        onRemoveSection={handleDeleteSection}
                        autoRefineIndex={autoRefineIndex}
                    />
                </div>

                <div className="hidden lg:block lg:col-span-3">
                    <div className="sticky top-24 h-[calc(100vh-8rem)] border-l border-white/10 pl-4">
                        <ReferenceSidebar {...searchProps} />
                    </div>
                </div>
            </div>

            <ReferenceDrawer
                isOpen={isReferenceOpen}
                onOpen={() => setIsReferenceOpen(true)}
                onClose={() => setIsReferenceOpen(false)}
                searchProps={searchProps}
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
        </div>
    );
}
