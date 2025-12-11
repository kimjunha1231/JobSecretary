import React, { useEffect, useState } from 'react';
import { Building2, Calendar, Edit2, Save, Trash2, X, MessageCircleQuestion, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, SmartTagInput, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui';
import { Document, Status } from '@/shared/types';
import { DocumentFormState } from '@/features/document-editor';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PdfDocument } from '@/entities/document';

interface DocumentHeaderProps {
    doc: Document;
    isEditing: boolean;
    form: DocumentFormState;
    onUpdateField: <K extends keyof DocumentFormState>(key: K, value: DocumentFormState[K]) => void;
    onEdit: () => void;
    onCancel: () => void;
    onSave: () => void;
    onDelete: () => void;
    onShowInterviewQuestions: () => void;
}

const STATUS_LABELS: Record<Status, string> = {
    writing: '작성 중',
    applied: '지원 완료',
    interview: '면접 진행 중',
    pass: '합격',
    fail: '불합격'
};

const STATUS_BADGE_CLASSES: Record<Status, string> = {
    writing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    applied: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    interview: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    pass: 'bg-green-500/10 text-green-400 border-green-500/20',
    fail: 'bg-red-500/10 text-red-400 border-red-500/20'
};

export function DocumentHeader({
    doc,
    isEditing,
    form,
    onUpdateField,
    onEdit,
    onCancel,
    onSave,
    onDelete,
    onShowInterviewQuestions
}: DocumentHeaderProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleShowInterviewQuestions = () => {
        if (!doc.content) {
            toast.error('자기소개서 내용이 없습니다.');
            return;
        }

        const sections = doc.content.split('### ').filter(section => section.trim().length > 0);

        if (sections.length < 2) {
            toast.error('자기소개서 항목이 2개 이상이어야 합니다.');
            return;
        }

        const isValid = sections.every(section => {
            const lines = section.split('\n');
            // Remove title (first line) and trim whitespace
            const content = lines.slice(1).join('\n').trim();
            return content.length >= 500;
        });

        if (!isValid) {
            toast.error('각 항목의 내용이 500자 이상이어야 합니다.');
            return;
        }

        onShowInterviewQuestions();
    };

    return (
        <div className="flex items-start justify-between">
            <div className="flex-1 mr-8">
                {isEditing ? (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center gap-2 text-zinc-400">
                                <Building2 size={18} />
                                <input
                                    type="text"
                                    value={form.company}
                                    onChange={e => onUpdateField('company', e.target.value)}
                                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white focus:border-primary focus:outline-none w-full max-w-xs"
                                    placeholder="회사명"
                                />
                                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_BADGE_CLASSES[form.status]}`}>
                                    {STATUS_LABELS[form.status]}
                                </span>
                            </div>
                            <p className="text-xs text-zinc-500 pl-6">
                                상태는 지원 현황 칸반에서만 변경할 수 있습니다.
                            </p>
                        </div>
                        <input
                            type="text"
                            value={form.role}
                            onChange={e => onUpdateField('role', e.target.value)}
                            className="text-4xl font-bold text-white bg-zinc-900 border border-zinc-700 rounded px-2 py-1 focus:border-primary focus:outline-none w-full"
                            placeholder="지원 직무"
                        />
                        <input
                            type="url"
                            value={form.jobPostUrl}
                            onChange={e => onUpdateField('jobPostUrl', e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white focus:border-primary focus:outline-none text-sm"
                            placeholder="채용 공고 링크 (선택)"
                        />
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-zinc-400" />
                            <input
                                type="date"
                                value={form.deadline}
                                onChange={e => onUpdateField('deadline', e.target.value)}
                                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white focus:border-primary focus:outline-none text-sm [color-scheme:dark]"
                            />
                        </div>
                        <SmartTagInput
                            tags={form.tags}
                            onChange={tags => onUpdateField('tags', tags)}
                            placeholder="태그 입력..."
                            className="bg-zinc-900 border-zinc-700"
                        />
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-3 text-zinc-400 mb-3">
                            <div className="flex items-center gap-2">
                                <Building2 size={18} />
                                <span className="font-medium text-lg">{doc.company}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_BADGE_CLASSES[doc.status]}`}>
                                {STATUS_LABELS[doc.status]}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight tracking-tight">{doc.role}</h1>
                    </div>
                )}

                {!isEditing && (
                    <div className="space-y-3 mt-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-sm text-zinc-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                <Calendar size={14} />
                                {doc.createdAt}
                            </div>
                            {doc.deadline && (
                                <div className="flex items-center gap-2 text-sm text-zinc-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                    <Calendar size={14} />
                                    마감일: {doc.deadline}
                                </div>
                            )}
                            {doc.tags && doc.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                        {doc.jobPostUrl && (
                            <div className="flex items-start gap-2 text-sm">
                                <span className="text-zinc-500">채용 공고:</span>
                                <a
                                    href={doc.jobPostUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-indigo-400 hover:underline transition-colors break-all"
                                >
                                    {doc.jobPostUrl}
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <TooltipProvider>
                    {isEditing ? (
                        <>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onCancel}
                                        className="p-3 text-zinc-400 hover:text-white hover:bg-white/10 transition-all rounded-xl"
                                    >
                                        <X size={20} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>취소</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onSave}
                                        className="p-3 bg-indigo-600 text-white hover:bg-indigo-500 transition-all rounded-xl shadow-lg shadow-indigo-500/20"
                                    >
                                        <Save size={20} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>저장</p>
                                </TooltipContent>
                            </Tooltip>
                        </>
                    ) : (
                        <>
                            {isClient && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="inline-block">
                                            <PDFDownloadLink
                                                document={<PdfDocument doc={doc} />}
                                                fileName={`${doc.company}_${doc.role}_자기소개서.pdf`}
                                                className="p-3 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all rounded-xl flex items-center justify-center"
                                            >
                                                {({ loading }) => (
                                                    loading ? <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /> : <Download size={20} />
                                                )}
                                            </PDFDownloadLink>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>PDF 다운로드</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={handleShowInterviewQuestions}
                                        className="p-3 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all rounded-xl"
                                    >
                                        <MessageCircleQuestion size={20} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>예상 면접 질문</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onEdit}
                                        className="p-3 text-zinc-400 hover:text-white hover:bg-white/10 transition-all rounded-xl"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>수정</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onDelete}
                                        className="p-3 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all rounded-xl"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>삭제</p>
                                </TooltipContent>
                            </Tooltip>
                        </>
                    )}
                </TooltipProvider>
            </div>
        </div>
    );
}
