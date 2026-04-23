import { create } from 'zustand';
import { DraftState } from './types';

export const useDraftStore = create<DraftState>()((set) => ({
    // Form Data
    formData: {
        company: '',
        role: '',
        jobPostUrl: '',
        tags: [],
    },
    sections: [{ title: '지원동기', content: '', limit: 500 }],
    currentSectionIndex: 0,

    // Search State
    searchTags: [],
    searchResults: [],
    isSearching: false,

    // Actions
    setFormData: (newFormData) => set((state) => ({ formData: { ...state.formData, ...newFormData } })),
    setSections: (sections) => set({ sections }),
    setCurrentSectionIndex: (index) => set({ currentSectionIndex: index }),
    addSection: () => set((state) => ({
        sections: [...state.sections, { title: '새 항목', content: '', limit: 500 }],
        currentSectionIndex: state.sections.length // Move to new section
    })),
    removeSection: (index) => set((state) => {
        const newSections = state.sections.filter((_, i) => i !== index);
        // Ensure at least one section exists
        if (newSections.length === 0) {
            newSections.push({ title: '지원동기', content: '', limit: 500 });
        }
        // Adjust index if necessary
        let newIndex = state.currentSectionIndex;
        if (newIndex >= newSections.length) {
            newIndex = newSections.length - 1;
        }
        return { sections: newSections, currentSectionIndex: newIndex };
    }),
    updateSection: (index, field, value) => set((state) => ({
        sections: state.sections.map((section, i) =>
            i === index ? { ...section, [field]: value } : section
        )
    })),
    clearDraft: () => set({
        formData: { company: '', role: '', jobPostUrl: '', tags: [] },
        sections: [{ title: '지원동기', content: '', limit: 500 }],
        currentSectionIndex: 0,
        searchTags: [],
        searchResults: [],
        isSearching: false
    }),

    // Search Actions
    setSearchTags: (tags) => set({ searchTags: tags }),
    setSearchResults: (docs) => set({ searchResults: docs }),
    setIsSearching: (isSearching) => set({ isSearching }),
}));
