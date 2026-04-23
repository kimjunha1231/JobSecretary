import { renderHook, act } from '@testing-library/react';
import { useDraftStore } from '@/entities/draft';

describe('useDraftStore', () => {
    beforeEach(() => {
        // Reset store before each test
        const { result } = renderHook(() => useDraftStore());
        act(() => {
            result.current.clearDraft();
        });
    });

    it('should have initial state', () => {
        const { result } = renderHook(() => useDraftStore());
        expect(result.current.sections).toHaveLength(1);
        expect(result.current.sections[0].title).toBe('새 문항');
        expect(result.current.formData.company).toBe('');
    });

    it('should add a section', () => {
        const { result } = renderHook(() => useDraftStore());

        act(() => {
            result.current.addSection();
        });

        expect(result.current.sections).toHaveLength(2);
        expect(result.current.currentSectionIndex).toBe(1);
    });

    it('should update a section', () => {
        const { result } = renderHook(() => useDraftStore());

        act(() => {
            result.current.updateSection(0, 'title', 'Updated Title');
            result.current.updateSection(0, 'content', 'Updated Content');
        });

        expect(result.current.sections[0].title).toBe('Updated Title');
        expect(result.current.sections[0].content).toBe('Updated Content');
    });

    it('should remove a section', () => {
        const { result } = renderHook(() => useDraftStore());

        // Add two sections first (total 3)
        act(() => {
            result.current.addSection();
            result.current.addSection();
        });
        expect(result.current.sections).toHaveLength(3);

        // Remove the middle one (index 1)
        act(() => {
            result.current.removeSection(1);
        });

        expect(result.current.sections).toHaveLength(2);
    });

    it('should not remove the last remaining section', () => {
        const { result } = renderHook(() => useDraftStore());
        expect(result.current.sections).toHaveLength(1);

        act(() => {
            result.current.removeSection(0);
        });

        expect(result.current.sections).toHaveLength(1);
    });

    it('should update form data', () => {
        const { result } = renderHook(() => useDraftStore());

        act(() => {
            result.current.setFormData({
                company: 'Google',
                role: 'Frontend Developer'
            });
        });

        expect(result.current.formData.company).toBe('Google');
        expect(result.current.formData.role).toBe('Frontend Developer');
    });

    it('should clear draft', () => {
        const { result } = renderHook(() => useDraftStore());

        act(() => {
            result.current.setFormData({ company: 'Test' });
            result.current.addSection();
            result.current.clearDraft();
        });

        expect(result.current.formData.company).toBe('');
        expect(result.current.sections).toHaveLength(1);
        expect(result.current.sections[0].content).toBe('');
    });
});
