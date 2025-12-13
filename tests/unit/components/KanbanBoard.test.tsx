import React from 'react';
import { render, screen } from '@testing-library/react';
import { KanbanBoard } from '@/features/document-kanban';
import { useKanban } from '@/features/document-kanban';

// Mock the custom hook
jest.mock('@/features/document-kanban/hooks/useKanban');

// Mock DndContext components to avoid complex dnd logic in unit tests
jest.mock('@dnd-kit/core', () => ({
    DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useSensor: jest.fn(),
    useSensors: jest.fn(),
    PointerSensor: jest.fn(),
    KeyboardSensor: jest.fn(),
    closestCorners: jest.fn(),
    pointerWithin: jest.fn(),
    rectIntersection: jest.fn(),
    useDroppable: jest.fn().mockReturnValue({
        setNodeRef: jest.fn(),
        isOver: false,
    }),
}));

jest.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: jest.fn(),
        transform: null,
        transition: null,
    }),
    verticalListSortingStrategy: {},
}));

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}));

describe('KanbanBoard', () => {
    const mockUseKanban = {
        applications: [],
        activeId: null,
        sensors: [],
        archiveRef: { current: null },
        setArchiveNodeRef: jest.fn(),
        isArchiveOver: false,
        handleDragStart: jest.fn(),
        handleDragOver: jest.fn(),
        handleDragEnd: jest.fn(),
        getApplicationsByStatus: jest.fn().mockReturnValue([]),
        modals: {
            isResultModalOpen: false,
            setIsResultModalOpen: jest.fn(),
            setResultPendingDocId: jest.fn(),
            handleResultConfirm: jest.fn(),
            isArchiveResultModalOpen: false,
            resetArchiveFlow: jest.fn(),
            handleArchiveResultConfirm: jest.fn(),
            isArchiveScreeningModalOpen: false,
            handleArchiveScreeningConfirm: jest.fn(),
            isDeleteModalOpen: false,
            setIsDeleteModalOpen: jest.fn(),
            setDeleteTargetId: jest.fn(),
            confirmDelete: jest.fn(),
            isBulkArchiveModalOpen: false,
            setIsBulkArchiveModalOpen: jest.fn(),
            setBulkArchiveTargetIds: jest.fn(),
            confirmBulkArchive: jest.fn(),
            handleDelete: jest.fn(),
            handleArchiveAll: jest.fn(),
        }
    };

    beforeEach(() => {
        (useKanban as jest.Mock).mockReturnValue(mockUseKanban);
    });

    it('renders all columns', () => {
        render(<KanbanBoard />);
        expect(screen.getByText('작성 중')).toBeInTheDocument();
        expect(screen.getByText('지원 완료')).toBeInTheDocument();
        expect(screen.getByText('면접')).toBeInTheDocument();
        expect(screen.getByText('결과')).toBeInTheDocument();
    });

    it('renders the archive drop zone', () => {
        render(<KanbanBoard />);
        expect(screen.getByText('저장소')).toBeInTheDocument();
        expect(screen.getByText(/저장소에 보관할/)).toBeInTheDocument();
    });
});
