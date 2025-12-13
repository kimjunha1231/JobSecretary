'use client';

import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDraftStore } from '@/entities/draft';
import { ArrowLeft } from 'lucide-react';
import { usePageLeaveWarning } from '../hooks/usePageLeaveWarning';
import StatusConfirmationDialog from './StatusConfirmationDialog';
import {
    ResumeFormHeader,
    ResumeSectionNavigation,
    ResumeSectionEditor,
    ResumeActions
} from './form-parts';
import { ResumeFormData } from '../types';
import { useCreateDocument } from '@/entities/document';
import { toast } from 'sonner';

export default function ResumeForm() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [isAutoDraftOpen, setIsAutoDraftOpen] = useState(false);

    const { setSearchTags } = useDraftStore();
    const createDocumentMutation = useCreateDocument();

    const methods = useForm<ResumeFormData>({
        defaultValues: {
            company: '',
            role: '',
            jobPostUrl: '',
            tags: [],
            deadline: '',
            sections: [{ title: '새 문항', content: '', limit: 500 }]
        },
        mode: 'onChange'
    });

    const { control, handleSubmit, formState: { isDirty } } = methods;

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: 'sections'
    });

    // 페이지 이탈 경고 (RHF isDirty 사용)
    const { handleBack } = usePageLeaveWarning(isDirty);

    const searchParams = useSearchParams();

    const handleSave = async () => {
        setIsSaving(true);
        const data = methods.getValues();

        // 필수 값 검증
        if (!data.company.trim()) {
            toast.error('회사명을 입력해주세요.');
            setIsSaving(false);
            return;
        }
        if (!data.role.trim()) {
            toast.error('직무를 입력해주세요.');
            setIsSaving(false);
            return;
        }

        const origin = searchParams.get('from');
        const initialStatus = searchParams.get('status') || 'writing';

        // Archive에서 온 경우에만 최종 합격/서류 합격 여부를 물어봅니다.
        if (origin === 'archive') {
            setShowStatusDialog(true);
            setIsSaving(false);
            return;
        }

        // Dashboard 등 다른 곳에서 온 경우 해당 상태로 바로 저장
        await handleStatusConfirm({ finalStatus: initialStatus, documentStatus: null });
    };

    const handleStatusConfirm = async (result: { finalStatus: string; documentStatus: 'pass' | 'fail' | null }) => {
        setIsSaving(true);
        setShowStatusDialog(false);

        try {
            const data = methods.getValues();

            // 섹션 내용을 마크다운으로 변환
            const combinedContent = data.sections.map(s => {
                const titleWithLimit = s.limit ? `${s.title} (${s.limit}자)` : s.title;
                return `### ${titleWithLimit}\n${s.content}`;
            }).join('\n\n');

            const origin = searchParams.get('from');
            const isArchived = origin === 'archive';

            await createDocumentMutation.mutateAsync({
                title: `${data.company} - ${data.role}`,
                company: data.company,
                role: data.role,
                content: combinedContent,
                jobPostUrl: data.jobPostUrl,
                tags: data.tags,
                deadline: data.deadline,
                status: result.finalStatus as any,
                isArchived: isArchived,
                documentScreeningStatus: result.documentStatus
            });

            methods.reset(data); // dirty 상태 초기화
            router.push(isArchived ? '/archive' : '/dashboard');
            toast.success('문서가 저장되었습니다.');
        } catch (error) {
            console.error('Failed to save document:', error);
            toast.error('저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDraftGenerated = (draft: string) => {
        // 현재 섹션에 AI 초안 적용
        const currentContent = methods.getValues(`sections.${currentSectionIndex}.content`);
        const newContent = currentContent ? `${currentContent}\n\n${draft}` : draft;

        methods.setValue(`sections.${currentSectionIndex}.content`, newContent, { shouldDirty: true });
        setIsAutoDraftOpen(false);
    };

    return (
        <FormProvider {...methods}>
            <div className="space-y-6">
                <div className="mb-2">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group mb-4"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span>목록으로</span>
                    </button>
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">자기소개서 작성</h1>
                        <p className="text-zinc-400 text-sm lg:text-base">태그를 활용하여 과거 자소서를 참고하며 작성하세요</p>
                    </div>
                </div>

                <ResumeFormHeader
                    setSearchTags={setSearchTags}
                />

                <ResumeSectionNavigation
                    currentSectionIndex={currentSectionIndex}
                    totalSections={fields.length}
                    goToPrevSection={() => setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))}
                    goToNextSection={() => setCurrentSectionIndex(Math.min(fields.length - 1, currentSectionIndex + 1))}
                    addSection={() => {
                        append({ title: '새 문항', content: '', limit: 500 });
                        setCurrentSectionIndex(fields.length);
                    }}
                    removeSection={(index) => {
                        if (fields.length > 1) {
                            remove(index);
                            setCurrentSectionIndex(prev => Math.min(prev, fields.length - 2));
                        }
                    }}
                />

                <ResumeSectionEditor
                    index={currentSectionIndex}
                    isAutoDraftOpen={isAutoDraftOpen}
                    setIsAutoDraftOpen={setIsAutoDraftOpen}
                    handleDraftGenerated={handleDraftGenerated}
                    formData={methods.getValues()}
                />

                <ResumeActions
                    onSave={handleSave}
                    isSaving={isSaving}
                />

                <StatusConfirmationDialog
                    isOpen={showStatusDialog}
                    onClose={() => setShowStatusDialog(false)}
                    onConfirm={handleStatusConfirm}
                />
            </div>
        </FormProvider>
    );
}
