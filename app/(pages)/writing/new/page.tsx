import { Suspense } from 'react';
import { WritingSessionStart } from '@/widgets/writing-studio';

export default function WritingSessionNewPage() {
    return (
        <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-zinc-500">작성 준비 화면을 불러오는 중입니다…</div>}>
            <WritingSessionStart />
        </Suspense>
    );
}
