'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Plus, Trash2, ChevronLeft, ChevronRight, PenTool } from 'lucide-react';
import { toast } from 'sonner';
import { useDraftStore } from '@/shared/store/useDraftStore';
import { useAddDocument } from '@/entities/document';
import { SmartTagInput, LimitSelector } from '@/shared/ui';
import { RefineManager } from '@/features/ai-assistant';
import StatusConfirmationDialog from './StatusConfirmationDialog';
import { AutoDraftModal } from './AutoDraftModal';

export default function ResumeForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const status = searchParams.get('status') || 'writing';
    const fromArchive = searchParams.get('from') === 'archive';
    const addDocumentMutation = useAddDocument();
    const [isSaving, setIsSaving] = useState(false);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [isAutoDraftOpen, setIsAutoDraftOpen] = useState(false);

    const {
        formData,
        sections,
        currentSectionIndex,
        setFormData,
        setCurrentSectionIndex,
        addSection,
        removeSection,
        updateSection,
        clearDraft,
        setSearchTags // Now from the same store
    } = useDraftStore();

    const goToPrevSection = () => {
        setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1));
    };

    const goToNextSection = () => {
        setCurrentSectionIndex(Math.min(sections.length - 1, currentSectionIndex + 1));
    };

    const handleSave = async () => {
        if (isSaving) return;

        if (!formData.company) {
            toast.error('회사명을 입력해주세요.');
            return;
        }

        if (fromArchive) {
            setShowStatusDialog(true);
            return;
        }

        await saveDocument(status);
    };

    const saveDocument = async (finalStatus: string, screeningStatus: 'pass' | 'fail' | null = null) => {
        const combinedContent = sections.map(s => {
            return `### ${s.title}\n${s.content}`;
        }).join('\n\n');

        try {
            setIsSaving(true);
            await addDocumentMutation.mutateAsync({
                title: `${formData.role} at ${formData.company}`,
                company: formData.company,
                role: formData.role,
                content: combinedContent,
                jobPostUrl: formData.jobPostUrl,
                tags: formData.tags,
                status: finalStatus as any,
                deadline: formData.deadline,
                isArchived: fromArchive,
                documentScreeningStatus: screeningStatus
            });

            clearDraft();
            setSearchTags([]);
            toast.success('저장되었습니다!');

            if (fromArchive) {
                router.push('/archive');
            } else {
                router.push('/dashboard');
            }
        } catch (error) {
            console.error('Failed to save document:', error);
            toast.error('저장에 실패했습니다.');
            setIsSaving(false);
        }
    };

    const handleStatusConfirm = ({ finalStatus, documentStatus }: { finalStatus: string; documentStatus: 'pass' | 'fail' | null }) => {
        setShowStatusDialog(false);
        setSelectedStatus(finalStatus);
        saveDocument(finalStatus, documentStatus);
    };

    const handleDraftGenerated = (draft: string) => {
        const currentContent = sections[currentSectionIndex].content;
        const newContent = currentContent ? `${currentContent}\n\n${draft}` : draft;
        updateSection(currentSectionIndex, 'content', newContent);
    };

    const currentSection = sections[currentSectionIndex];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
                    <label className="text-sm text-zinc-400">회사명</label>
                    <input
                        type="text"
                        value={formData.company}
                        onChange={e => setFormData({ company: e.target.value })}
                        className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="지원 회사"
                    />
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
                    <label className="text-sm text-zinc-400">직무</label>
                    <input
                        type="text"
                        value={formData.role}
                        onChange={e => setFormData({ role: e.target.value })}
                        className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="지원 직무"
                    />
                </div>
                <div className="flex flex-col gap-2 flex-[1.4] min-w-[260px]">
                    <label className="text-sm text-zinc-400">마감일 (선택)</label>
                    <input
                        type="date"
                        value={formData.deadline || ''}
                        onChange={e => setFormData({ deadline: e.target.value })}
                        className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
                    />
                </div>
                <div className="flex flex-col gap-2 flex-[1.4] min-w-[260px]">
                    <label className="text-sm text-zinc-400">채용 공고 링크 (선택)</label>
                    <input
                        type="url"
                        value={formData.jobPostUrl}
                        onChange={e => setFormData({ jobPostUrl: e.target.value })}
                        className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="https://..."
                    />
                </div>
            </div>

            <div>
                <label className="text-sm text-zinc-400 mb-2 block">태그</label>
                <SmartTagInput
                    tags={formData.tags}
                    onChange={tags => {
                        setFormData({ tags });
                        setSearchTags(tags);
                    }}
                    placeholder="태그를 입력하거나 선택하세요 (예: 취미, 성장과정)"
                    className="bg-surface border-white/10"
                />
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-6">
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToPrevSection}
                        disabled={currentSectionIndex === 0}
                        className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm text-zinc-400">
                        문항 {currentSectionIndex + 1} / {sections.length}
                    </span>
                    <button
                        onClick={goToNextSection}
                        disabled={currentSectionIndex === sections.length - 1}
                        className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={addSection}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        <Plus size={16} />
                        문항 추가
                    </button>
                    {sections.length > 1 && (
                        <button
                            onClick={() => removeSection(currentSectionIndex)}
                            className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-surface border border-white/10 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <input
                        type="text"
                        value={currentSection.title}
                        onChange={e => updateSection(currentSectionIndex, 'title', e.target.value)}
                        className="flex-1 bg-transparent border-none text-xl font-semibold text-white focus:outline-none"
                        placeholder="문항 제목"
                    />
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsAutoDraftOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-medium transition-colors border border-indigo-500/20"
                        >
                            <PenTool size={14} />
                            <span>AI 초안 작성</span>
                        </button>
                        <RefineManager
                            text={currentSection.content}
                            onApply={(corrected: string) => updateSection(currentSectionIndex, 'content', corrected)}
                        />
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <span>글자 수 제한:</span>
                            <LimitSelector
                                value={currentSection.limit}
                                onChange={(val) => updateSection(currentSectionIndex, 'limit', val)}
                            />
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <textarea
                        value={currentSection.content}
                        onChange={e => updateSection(currentSectionIndex, 'content', e.target.value)}
                        className="w-full h-64 bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 text-white focus:border-primary focus:outline-none resize-none"
                        placeholder="내용을 입력하세요..."
                        maxLength={currentSection.limit}
                    />
                </div>

                <div className="flex justify-between text-xs text-zinc-500">
                    <span>{currentSection.content.length} / {currentSection.limit}자</span>
                    <span className={currentSection.content.length > currentSection.limit ? 'text-red-400' : ''}>
                        {currentSection.limit - currentSection.content.length}자 남음
                    </span>
                </div>
            </div>

            <div className="pt-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground hover:bg-indigo-600 hover:text-white rounded-lg transition-colors disabled:cursor-not-allowed disabled:text-black shadow-lg shadow-primary/20"
                >
                    {isSaving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>저장 중...</span>
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            <span>저장하기</span>
                        </>
                    )}
                </button>
            </div>

            <StatusConfirmationDialog
                isOpen={showStatusDialog}
                onClose={() => setShowStatusDialog(false)}
                onConfirm={handleStatusConfirm}
            />

            <AutoDraftModal
                isOpen={isAutoDraftOpen}
                onClose={() => setIsAutoDraftOpen(false)}
                onDraftGenerated={handleDraftGenerated}
                company={formData.company}
                role={formData.role}
                question={currentSection.title}
            />
        </div >
    );
}
