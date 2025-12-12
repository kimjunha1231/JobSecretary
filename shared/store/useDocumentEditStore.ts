import { create } from 'zustand';
import { Document } from '@/shared/types';
import { Section } from '@/features/document-editor';

interface DocumentEditState {
    document: Document | null;
    formData: {
        company: string;
        role: string;
        status: Document['status'];
        tags: string[];
        deadline: string;
        jobPostUrl: string;
        sections: Section[];
    } | null;
    autoRefineIndex: number | null;

    setDocument: (doc: Document) => void;
    setFormData: (data: DocumentEditState['formData']) => void;
    setAutoRefineIndex: (index: number | null) => void;
    clear: () => void;
}

export const useDocumentEditStore = create<DocumentEditState>((set) => ({
    document: null,
    formData: null,
    autoRefineIndex: null,

    setDocument: (doc) => set({ document: doc }),
    setFormData: (data) => set({ formData: data }),
    setAutoRefineIndex: (index) => set({ autoRefineIndex: index }),
    clear: () => set({ document: null, formData: null, autoRefineIndex: null }),
}));
