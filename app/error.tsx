'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center gap-4">
            <h2 className="text-2xl font-bold">문제가 발생했습니다.</h2>
            <p className="text-zinc-400">잠시 후 다시 시도해 주세요.</p>
            <button
                onClick={reset}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
                다시 시도
            </button>
        </div>
    );
}
