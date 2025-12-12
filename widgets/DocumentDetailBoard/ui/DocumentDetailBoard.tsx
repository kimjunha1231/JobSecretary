'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { ConfirmationModal } from '@/shared/ui';
import { DocumentViewHeader, DocumentViewer, InterviewQuestionsModal } from '@/features/document-editor';
import { useDocumentDetailBoardLogic } from '../hooks';

export function DocumentDetailBoard() {
    const { doc, isLoading, modals, handlers, parseSections } = useDocumentDetailBoardLogic();

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
                    onClick={handlers.handleBack}
                    className="mt-4 text-primary hover:underline"
                >
                    아카이브로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto pb-20 max-w-4xl">
            <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={handlers.handleBack}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span>목록으로</span>
                    </button>
                </div>

                <DocumentViewHeader
                    doc={doc}
                    onEdit={handlers.handleEdit}
                    onDelete={handlers.handleDelete}
                    onShowInterviewQuestions={() => modals.setIsInterviewModalOpen(true)}
                />
            </div>

            <DocumentViewer
                sections={parseSections()}
                onCopy={handlers.handleCopy}
                onRefine={handlers.handleRefineTrigger}
            />

            <ConfirmationModal
                isOpen={modals.isDocDeleteModalOpen}
                onClose={() => modals.setIsDocDeleteModalOpen(false)}
                onConfirm={handlers.confirmDocDelete}
                title="문서 삭제"
                message="정말 이 문서를 삭제하시겠습니까?"
                confirmText="삭제"
                variant="danger"
            />

            <InterviewQuestionsModal
                isOpen={modals.isInterviewModalOpen}
                onClose={() => modals.setIsInterviewModalOpen(false)}
                documentContent={doc.content}
            />
        </div>
    );
}
