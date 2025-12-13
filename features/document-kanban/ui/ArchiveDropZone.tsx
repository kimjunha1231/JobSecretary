import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ArchiveDropZoneProps {
    setNodeRef: (node: HTMLElement | null) => void;
    isOver: boolean;
}

export function ArchiveDropZone({ setNodeRef, isOver }: ArchiveDropZoneProps) {
    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex-shrink-0 w-80 bg-zinc-900/50 border-2 border-dashed rounded-xl p-4 transition-all flex flex-col min-h-[600px]",
                isOver
                    ? "border-zinc-500 bg-zinc-900/80"
                    : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/70"
            )}
        >
            <div className="flex items-center justify-between mb-4 pointer-events-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                    <h3 className="font-bold text-sm text-zinc-400">저장소</h3>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <Plus size={32} className="rotate-45 text-zinc-600" />
                <div className="text-center px-4">
                    <p className="text-zinc-500 text-sm leading-relaxed">
                        저장소에 보관할<br />
                        자기소개서는<br />
                        여기에 드래그해서<br />
                        넣어주세요
                    </p>
                </div>
            </div>
        </div>
    );
}
