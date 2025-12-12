import { useRouter } from 'next/navigation';
import { PenTool } from 'lucide-react';

export const ArchiveHeader = () => {
    const router = useRouter();

    return (
        <div className="mb-8 flex items-center justify-between">
            <div>
                <h1 className="text-4xl font-bold text-white mb-2">자기소개서 저장소</h1>
                <p className="text-zinc-400">저장된 자기소개서를 관리하세요</p>
            </div>
            <button
                onClick={() => router.push('/write?from=archive')}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(255,255,255,0.5)] hover:shadow-[0_0_25px_rgba(255,255,255,0.6)] active:scale-95"
            >
                <PenTool size={18} />
                <span>작성하기</span>
            </button>
        </div>
    );
};
