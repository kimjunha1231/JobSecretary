'use client';


import { Loader2, ArrowLeft } from 'lucide-react';
import { ConfirmationModal } from '@/shared/ui';
import { ReferenceSidebar, ReferenceDrawer } from '@/features/reference-search';
import { DocumentEditHeader, DocumentEditor } from '@/features/document-editor';
import { useDocumentEditBoardLogic } from '../hooks';

export function DocumentEditBoard() {
    const {
        doc,
        isLoading,
        autoRefineIndex,
        formProps,
        searchProps,
        modals,
        handlers
    } = useDocumentEditBoardLogic();

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
                    onClick={handlers.handleCancel}
                    className="mt-4 text-primary hover:underline"
                >
                    아카이브로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1600px] mx-auto pb-20 px-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="col-span-1 lg:col-span-9">
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={handlers.handleCancel}
                                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
                            >
                                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                                <span>돌아가기</span>
                            </button>
                        </div>

                        <DocumentEditHeader
                            form={formProps.form}
                            onUpdateField={(key, value) => {
                                formProps.updateField(key, value);
                                if (key === 'tags') {
                                    searchProps.setSearchTags(value as string[]);
                                }
                            }}
                            onCancel={handlers.handleCancel}
                            onSave={handlers.handleSave}
                        />
                    </div>

                    <DocumentEditor
                        sections={formProps.form.sections}
                        onUpdateSection={formProps.updateSection}
                        onAddSection={formProps.addSection}
                        onRemoveSection={handlers.handleDeleteSection}
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
                isOpen={modals.isReferenceOpen}
                onOpen={() => modals.setIsReferenceOpen(true)}
                onClose={() => modals.setIsReferenceOpen(false)}
                searchProps={searchProps}
            />

            <ConfirmationModal
                isOpen={modals.isSectionDeleteModalOpen}
                onClose={() => {
                    modals.setIsSectionDeleteModalOpen(false);
                    modals.setSectionDeleteIndex(null);
                }}
                onConfirm={handlers.confirmSectionDelete}
                title="문항 삭제"
                message="이 문항을 삭제하시겠습니까?"
                confirmText="삭제"
                variant="danger"
            />
        </div>
    );
}
