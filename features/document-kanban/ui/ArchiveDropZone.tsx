import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Droppable } from '@hello-pangea/dnd';

// 이제 부모로부터 props를 받을 필요가 없습니다.
export function ArchiveDropZone() {
    return (
        <Droppable droppableId="archive">
            {(provided, snapshot) => (
                <div
                    // 1. ref 연결 (라이브러리가 DOM을 찾을 수 있게 함)
                    ref={provided.innerRef}
                    // 2. 드롭 영역에 필요한 속성 전달
                    {...provided.droppableProps}
                    className={cn(
                        "flex-shrink-0 w-80 bg-zinc-900/50 border-2 border-dashed rounded-xl p-4 transition-all flex flex-col min-h-[600px]",
                        // 3. snapshot.isDraggingOver를 사용하여 스스로 스타일 변경
                        snapshot.isDraggingOver
                            ? "border-zinc-500 bg-zinc-900/80" // 드래그 중일 때
                            : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/70" // 평소
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
                    {/* 4. placeholder 필수 (드래그 시 공간 확보용, 필수 요소) */}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    );
}