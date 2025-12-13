import { renderHook, act } from '@testing-library/react';
import { useDocumentEditStore } from '@/entities/document/model/useDocumentEditStore';
import { Document } from '@/entities/document/model/types';

describe('useDocumentEditStore', () => {
    beforeEach(() => {
        // Reset store before each test
        const { result } = renderHook(() => useDocumentEditStore());
        act(() => {
            result.current.clear();
        });
    });

    const mockDocument: Document = {
        id: 'test-id-123',
        title: 'Test Document',
        company: 'Google',
        role: 'Frontend Developer',
        content: 'Test content',
        status: 'writing',
        tags: ['react', 'typescript'],
        createdAt: '2024-01-01',
        position: 0,
        isFavorite: false,
        isArchived: false,
        documentScreeningStatus: null,
    };

    it('should have initial state', () => {
        const { result } = renderHook(() => useDocumentEditStore());
        expect(result.current.document).toBeNull();
        expect(result.current.formData).toBeNull();
        expect(result.current.autoRefineIndex).toBeNull();
    });

    it('should set document', () => {
        const { result } = renderHook(() => useDocumentEditStore());

        act(() => {
            result.current.setDocument(mockDocument);
        });

        expect(result.current.document).toEqual(mockDocument);
        expect(result.current.document?.company).toBe('Google');
    });

    it('should set form data', () => {
        const { result } = renderHook(() => useDocumentEditStore());

        const formData = {
            company: 'Meta',
            role: 'Backend Developer',
            status: 'applied' as const,
            tags: ['nodejs'],
            deadline: '2024-12-31',
            jobPostUrl: 'https://example.com',
            sections: [{ title: 'Section 1', content: 'Content', limit: 500 }],
        };

        act(() => {
            result.current.setFormData(formData);
        });

        expect(result.current.formData).toEqual(formData);
        expect(result.current.formData?.company).toBe('Meta');
        expect(result.current.formData?.sections).toHaveLength(1);
    });

    it('should set autoRefineIndex', () => {
        const { result } = renderHook(() => useDocumentEditStore());

        act(() => {
            result.current.setAutoRefineIndex(2);
        });

        expect(result.current.autoRefineIndex).toBe(2);

        act(() => {
            result.current.setAutoRefineIndex(null);
        });

        expect(result.current.autoRefineIndex).toBeNull();
    });

    it('should clear all state', () => {
        const { result } = renderHook(() => useDocumentEditStore());

        // Set some state
        act(() => {
            result.current.setDocument(mockDocument);
            result.current.setFormData({
                company: 'Test',
                role: 'Test',
                status: 'writing',
                tags: [],
                deadline: '',
                jobPostUrl: '',
                sections: [],
            });
            result.current.setAutoRefineIndex(1);
        });

        expect(result.current.document).not.toBeNull();
        expect(result.current.formData).not.toBeNull();
        expect(result.current.autoRefineIndex).not.toBeNull();

        // Clear
        act(() => {
            result.current.clear();
        });

        expect(result.current.document).toBeNull();
        expect(result.current.formData).toBeNull();
        expect(result.current.autoRefineIndex).toBeNull();
    });
});
