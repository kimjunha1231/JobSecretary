import { useState } from 'react';
import { toast } from 'sonner';
import { Document } from '@/entities/document';
import { PdfDocument } from '@/entities/document';

/**
 * PDF 다운로드 기능을 제공하는 훅
 * Dynamic import로 @react-pdf/renderer를 로드하여 번들 최적화
 */
export function usePdfDownload(doc: Document) {
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const downloadPdf = async () => {
        setIsPdfLoading(true);
        try {
            const { pdf } = await import('@react-pdf/renderer');
            const blob = await pdf(<PdfDocument doc={ doc } />).toBlob();
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

    return { isPdfLoading, downloadPdf };
}
