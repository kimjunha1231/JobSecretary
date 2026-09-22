import { useState } from 'react';
import { toast } from 'sonner';
import { Document } from '@/entities/document';

/**
 * 서버에서 소유권과 최종 문서 내용을 다시 확인한 뒤 PDF를 내려받는다.
 * 클라이언트에 PDF renderer와 외부 글꼴을 싣지 않아 초기 번들을 줄이고,
 * 사용자가 화면을 조작해 다른 문서를 출력하는 경계를 서버로 고정한다.
 */
export function usePdfDownload(doc: Document) {
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const downloadPdf = async () => {
        setIsPdfLoading(true);
        try {
            const response = await fetch(`/api/documents/${doc.id}/export`, { cache: 'no-store' });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({})) as { error?: unknown };
                throw new Error(typeof payload.error === 'string' ? payload.error : 'PDF를 만들지 못했습니다.');
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${doc.company}_${doc.role}_자기소개서.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'PDF 생성 중 오류가 발생했습니다.');
        } finally {
            setIsPdfLoading(false);
        }
    };

    return { isPdfLoading, downloadPdf };
}
