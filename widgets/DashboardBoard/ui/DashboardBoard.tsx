'use client';

import { KanbanBoard } from '@/features/document-kanban';

export function DashboardBoard() {
    return (
        <div className="pb-20">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">지원 현황</h1>
                <p className="text-zinc-400">드래그 앤 드롭으로 지원 현황을 관리하세요</p>
            </div>
            <KanbanBoard />
        </div>
    );
}
