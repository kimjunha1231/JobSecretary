import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface RecommendedDoc {
    id: string;
    companyName: string;
    originalContent: string;
    subtitle?: string;
    aiAdvice: string;
    similarityScore: number;
    tags?: string[];
}

interface Section {
    title: string;
    content: string;
    limit: number;
}

interface FormData {
    company: string;
    role: string;
    jobPostUrl: string;
    tags: string[];
    deadline?: string;
}

interface DraftState {
    // Form Data
    formData: FormData;
    sections: Section[];
    currentSectionIndex: number;

    // Search State (Merged from useWriteStore)
    searchTags: string[];
    searchResults: RecommendedDoc[];
    isSearching: boolean;

    // Actions
    setFormData: (formData: Partial<FormData>) => void;
    setSections: (sections: Section[]) => void;
    setCurrentSectionIndex: (index: number) => void;
    addSection: () => void;
    removeSection: (index: number) => void;
    updateSection: (index: number, field: keyof Section, value: string | number) => void;
    clearDraft: () => void;

    // Search Actions
    setSearchTags: (tags: string[]) => void;
    setSearchResults: (docs: RecommendedDoc[]) => void;
    setIsSearching: (isSearching: boolean) => void;
}

const initialFormData: FormData = {
    company: '',
    role: '',
    jobPostUrl: '',
    tags: [],
    deadline: ''
};

const initialSections: Section[] = [
    { title: '새 문항', content: '', limit: 500 }
];

export const useDraftStore = create<DraftState>()(
    persist(
        (set, get) => ({
            // Initial State
            formData: initialFormData,
            sections: initialSections,
            currentSectionIndex: 0,
            searchTags: [],
            searchResults: [],
            isSearching: false,

            // Form Actions
            setFormData: (newFormData) =>
                set((state) => ({
                    formData: { ...state.formData, ...newFormData }
                })),

            setSections: (sections) => set({ sections }),

            setCurrentSectionIndex: (index) => set({ currentSectionIndex: index }),

            addSection: () =>
                set((state) => {
                    const lastSection = state.sections[state.sections.length - 1];
                    const newLimit = lastSection ? lastSection.limit : 500;
                    const newSections = [...state.sections, { title: '새 문항', content: '', limit: newLimit }];
                    return {
                        sections: newSections,
                        currentSectionIndex: newSections.length - 1
                    };
                }),

            removeSection: (index) =>
                set((state) => {
                    if (state.sections.length === 1) return state;

                    const newSections = state.sections.filter((_, i) => i !== index);
                    const newIndex = state.currentSectionIndex >= newSections.length
                        ? Math.max(0, newSections.length - 1)
                        : state.currentSectionIndex;

                    return {
                        sections: newSections,
                        currentSectionIndex: newIndex
                    };
                }),

            updateSection: (index, field, value) =>
                set((state) => ({
                    sections: state.sections.map((s, i) =>
                        i === index ? { ...s, [field]: value } : s
                    )
                })),

            clearDraft: () =>
                set({
                    formData: initialFormData,
                    sections: [{ title: '새 문항', content: '', limit: 500 }],
                    currentSectionIndex: 0,
                    searchTags: [],
                    searchResults: [],
                    isSearching: false
                }),

            // Search Actions
            setSearchTags: (tags) => set({ searchTags: tags }),
            setSearchResults: (docs) => set({ searchResults: docs }),
            setIsSearching: (isSearching) => set({ isSearching }),
        }),
        {
            name: 'careervault-draft-storage',
            storage: createJSONStorage(() => localStorage),
            // Optionally, we might want to exclude search state from persistence
            // partialize: (state) => ({ formData: state.formData, sections: state.sections, currentSectionIndex: state.currentSectionIndex }),
        }
    )
);
