import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RefineManager } from '@/features/ai-assistant';
import { refineText } from '@/features/ai-assistant';

// Mock the server action
jest.mock('@/features/ai-assistant', () => ({
    refineText: jest.fn(),
    RefineManager: jest.requireActual('@/features/ai-assistant').RefineManager,
}));

// Mock sonner toast
jest.mock('sonner', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

describe('RefineManager', () => {
    const mockOnApply = jest.fn();
    const mockText = "This is a test text for refinement.";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the AI Refine button', () => {
        render(<RefineManager text={mockText} onApply={mockOnApply} />);
        expect(screen.getByText('AI 교정')).toBeInTheDocument();
    });

    it('shows error toast if text is too short', () => {
        render(<RefineManager text="Short" onApply={mockOnApply} />);
        fireEvent.click(screen.getByText('AI 교정'));
        // We can't easily check toast calls without more setup, but we can check if refineText was NOT called
        expect(refineText).not.toHaveBeenCalled();
    });

    it('calls refineText and shows modal on success', async () => {
        (refineText as jest.Mock).mockResolvedValue({
            original: mockText,
            corrected: "This is a corrected text.",
            changes: ["Fixed grammar"],
        });

        render(<RefineManager text={mockText} onApply={mockOnApply} />);
        fireEvent.click(screen.getByText('AI 교정'));

        expect(screen.getByText('분석 중...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('AI 맞춤법 및 어조 교정')).toBeInTheDocument();
        });

        expect(screen.getByText('교정 전')).toBeInTheDocument();
        expect(screen.getByText('교정 후')).toBeInTheDocument();
    });

    it('applies changes when Apply button is clicked', async () => {
        (refineText as jest.Mock).mockResolvedValue({
            original: mockText,
            corrected: "This is a corrected text.",
            changes: ["Fixed grammar"],
        });

        render(<RefineManager text={mockText} onApply={mockOnApply} />);
        fireEvent.click(screen.getByText('AI 교정'));

        await waitFor(() => {
            expect(screen.getByText('적용하기')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('적용하기'));

        expect(mockOnApply).toHaveBeenCalledWith("This is a corrected text.");
    });
});
