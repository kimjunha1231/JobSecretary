import { useState } from 'react';
import { Building2, Calendar, Edit2, Trash2, MessageCircleQuestion, Download } from 'lucide-react';
import { Badge, TooltipButton, TooltipProvider, Spinner } from '@/shared/ui';
import { Status } from '@/shared/types';
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from '@/shared/config';
import { useDocumentHeader, DocumentViewHeaderProps } from '@/features/document-editor';
import { PdfDocument } from '@/entities/document';
import { toast } from 'sonner';

export function DocumentViewHeader({
    doc,
    onEdit,
    onDelete,
    onShowInterviewQuestions
}: DocumentViewHeaderProps) {
    const { isClient, validateInterviewQuestions } = useDocumentHeader(doc);
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const handleShowInterviewQuestions = () => {
        if (validateInterviewQuestions()) {
            onShowInterviewQuestions();
        }
    };

    const handleDownloadPdf = async () => {
        setIsPdfLoading(true);
        try {
            const { pdf } = await import('@react-pdf/renderer');
            const blob = await pdf(<PdfDocument doc={doc} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${doc.company}_${doc.role}_자기소개서.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {

            toast.error('PDF 생성 중 오류가 발생했습니다.');
        } finally {
            setIsPdfLoading(false);
        }
    };

    return (
        <div className="flex items-start justify-between">
            <div className="flex-1 mr-8">
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

                <div className="space-y-3 mt-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-zinc-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                            <Calendar size={14} />
                            {new Date(doc.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </div>
                        {doc.deadline && (
                            <div className="flex items-center gap-2 text-sm text-zinc-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                <Calendar size={14} />
                                마감일: {new Date(doc.deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
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
            </div>

            <div className="flex gap-2">
                <TooltipProvider>
                    {isClient && (
                        <TooltipButton
                            icon={isPdfLoading
                                ? <Spinner size="sm" className="border-zinc-400 border-t-transparent" />
                                : <Download size={20} />
                            }
                            tooltip="PDF 다운로드"
                            onClick={handleDownloadPdf}
                            disabled={isPdfLoading}
                            className="text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10"
                            aria-label={isPdfLoading ? "PDF 생성 중" : "PDF 다운로드"}
                        />
                    )}
                    <TooltipButton
                        icon={<MessageCircleQuestion size={20} />}
                        tooltip="예상 면접 질문"
                        onClick={handleShowInterviewQuestions}
                        className="text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10"
                        aria-label="예상 면접 질문 보기"
                    />
                    <TooltipButton
                        icon={<Edit2 size={20} />}
                        tooltip="수정"
                        onClick={onEdit}
                        className="text-zinc-400 hover:text-white hover:bg-white/10"
                        aria-label="문서 수정"
                    />
                    <TooltipButton
                        icon={<Trash2 size={20} />}
                        tooltip="삭제"
                        onClick={onDelete}
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                        aria-label="문서 삭제"
                    />
                </TooltipProvider>
            </div>
        </div>
    );
}
