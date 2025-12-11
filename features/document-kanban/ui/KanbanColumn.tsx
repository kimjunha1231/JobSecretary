'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Document, Status } from '@/types';
import { KanbanCard } from './KanbanCard';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface KanbanColumnProps {
    status: Status | 'result';
    title: string;
    applications: Document[];
    // color: string; // Removed as per instruction
    onDelete: (id: string) => void; // Added as per instruction
    onArchiveAll?: (ids: string[]) => void; // Added for archive functionality
}

const statusColors: Record<Status | 'result', string> = {
    writing: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    applied: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    interview: 'from-orange-500/20 to-yellow-500/20 border-orange-500/30',
    pass: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    fail: 'from-red-500/20 to-rose-500/20 border-red-500/30',
    result: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
};

const statusTextColors: Record<Status | 'result', string> = {
    writing: 'text-blue-300',
    applied: 'text-purple-300',
    interview: 'text-orange-300',
    pass: 'text-green-300',
    fail: 'text-red-300',
    result: 'text-emerald-300',
};

export function KanbanColumn({ status, title, applications, onDelete, onArchiveAll }: KanbanColumnProps) { // Added onDelete to props
    const { setNodeRef, isOver } = useDroppable({
        id: status,
    });
    const router = useRouter(); // Added useRouter hook

    return (
        <div
            ref={setNodeRef}
            className={`flex-shrink-0 w-80 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 transition-all flex flex-col ${ // Added flex flex-col
                isOver ? 'border-zinc-600 bg-zinc-900/70' : ''
                }`}
        >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${statusColors[status]}`} />
                    <h3 className={`font-bold text-sm ${statusTextColors[status]}`}>
                        {title}
                    </h3>
                </div>
                <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                    {applications.length}
                </span>
            </div>

            {/* Cards Container */}
            <div className="flex-1 overflow-y-auto min-h-[100px]"> {/* Added flex-1 overflow-y-auto min-h-[100px] */}
                <SortableContext
                    items={applications.map(app => app.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-3 pb-2"> {/* Added pb-2 */}
                        {applications.map((application) => (
                            <KanbanCard
                                key={application.id}
                                application={application}
                                onDelete={onDelete} // Passed onDelete prop
                            />
                        ))}
                    </div>
                </SortableContext>
            </div>

            {/* Add Item Button or Result Archive Button */}
            {status === 'result' ? (
                <button
                    onClick={() => onArchiveAll?.(applications.map(app => app.id))}
                    disabled={applications.length === 0}
                    className="mt-3 w-full py-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/50 transition-all text-sm group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={14} className="group-hover:scale-110 transition-transform rotate-45" />
                    <span>저장소로 모두 보내기</span>
                </button>
            ) : (
                <button
                    onClick={() => router.push(`/write?status=${status}`)}
                    className="mt-3 w-full py-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/50 transition-all text-sm group"
                >
                    <Plus size={14} className="group-hover:scale-110 transition-transform" />
                    <span>새 항목 추가</span>
                </button>
            )}
        </div>
    );
}
