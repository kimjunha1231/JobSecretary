import { Suspense } from 'react';
import { DocumentWriteBoard } from '@/widgets';
import { isWritingStudioEnabled } from '@/shared/config';

export default function WritePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-zinc-500">로딩 중...</div>}>
            <DocumentWriteBoard showWritingStudioLink={isWritingStudioEnabled()} />
        </Suspense>
    );
}
