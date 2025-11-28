import React from 'react';
import { KanbanBoard } from '@/components/dashboard/KanbanBoard';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
    return (
        <div className="pb-20">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">지원 현황</h1>
                <p className="text-zinc-400">드래그 앤 드롭으로 지원 현황을 관리하세요</p>
            </div>

            {/* Kanban Board */}
            <KanbanBoard />
        </div>
    );
}
