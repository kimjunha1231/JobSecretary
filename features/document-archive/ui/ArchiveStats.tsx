
import { Document } from '@/shared/types';

interface ArchiveStatsProps {
    documents: Document[];
}

export const ArchiveStats = ({ documents }: ArchiveStatsProps) => {
    return (
        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center">
                <span className="text-zinc-400 text-sm mb-1">서류 합격률</span>
                <span className="text-3xl font-bold text-emerald-400">
                    {documents.length > 0
                        ? Math.round((documents.filter(doc => doc.documentScreeningStatus === 'pass').length / documents.length) * 100)
                        : 0}%
                </span>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center">
                <span className="text-zinc-400 text-sm mb-1">서류 합격 / 전체 공고</span>
                <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold text-white">
                        {documents.filter(doc => doc.documentScreeningStatus === 'pass').length}
                    </span>
                    <span className="text-zinc-500 text-lg mb-1">/</span>
                    <span className="text-zinc-500 text-lg mb-1">{documents.length}</span>
                </div>
            </div>
        </div>
    );
};
