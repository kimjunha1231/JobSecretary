import { create } from 'zustand';
import { Document } from './types';

// Section interface was previously imported from features/document-editor.
// This violates FSD (Entity cannot depend on Feature).
// We should define Section here or in a shared type.
// Since Section is a core part of a Document's structure in this app, defining it in Entity or Shared is correct.
// Given it's used in ResumeForm (Feature) and DocumentEditor (Feature), Shared/Types or Entity/Document/Model/Types is best.
// Adding it to entities/document/model/types.ts is clean.

export interface Section {
    title: string;
    content: string;
    limit: number;
}

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
