import { RecommendedDoc } from '@/entities/document';

export interface Section {
    title: string;
    content: string;
    limit: number;
}

export interface FormData {
    company: string;
    role: string;
    jobPostUrl: string;
    tags: string[];
    deadline?: string;
}

export interface DraftState {
    // Form Data
    formData: FormData;
    sections: Section[];
    currentSectionIndex: number;

    // Search State
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
