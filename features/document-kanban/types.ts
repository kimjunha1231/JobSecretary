import { Status, Document } from '@/shared/types';

export interface ArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (passed: boolean) => void;
}

export interface ResultSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (status: Status) => void;
}

export interface KanbanCardProps {
    application: Document;
    onDelete: (id: string) => void;
    isOverlay?: boolean;
}

export interface KanbanColumnProps {
    status: Status | 'result';
    title: string;
    applications: Document[];
    onDelete: (id: string) => void;
    onArchiveAll?: (ids: string[]) => void;
}

export interface KanbanColumnConfig {
    status: Status | 'result';
    title: string;
    color: string;
}

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
    { status: 'writing', title: '작성 중', color: 'blue' },
    { status: 'applied', title: '지원 완료', color: 'purple' },
    { status: 'interview', title: '면접', color: 'orange' },
    { status: 'result', title: '결과', color: 'green' },
];
