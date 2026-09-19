import { Suspense } from 'react';
import { DocumentWriteBoard } from '@/widgets';

export default function WritePage() {
    const writingStudioEnabled = process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED !== 'false';

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-zinc-500">로딩 중...</div>}>
            <DocumentWriteBoard showWritingStudioLink={writingStudioEnabled} />
        </Suspense>
    );
}
