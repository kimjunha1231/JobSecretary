import { Status, Document } from '@/shared/types';

export interface Section {
    title: string;
    content: string;
    limit: number;
}

export interface DocumentFormState {
    company: string;
    role: string;
    jobPostUrl: string;
    tags: string[];
    status: Status;
    deadline: string;
    sections: Section[];
}

// Component Props
export interface DocumentEditorProps {
    sections: Section[];
    onUpdateSection: (index: number, field: keyof Section, value: string) => void;
    onAddSection: () => void;
    onRemoveSection: (index: number) => void;
    autoRefineIndex: number | null;
    doc?: Document;
}

export interface DocumentEditHeaderProps {
    form: DocumentFormState;
    onUpdateField: <K extends keyof DocumentFormState>(key: K, value: DocumentFormState[K]) => void;
    onCancel: () => void;
    onSave: () => void;
}

export interface DocumentViewerProps {
    sections: Section[];
    onCopy: (text: string, index: number) => void;
    onRefine: (index: number) => void;
}

export interface DocumentViewHeaderProps {
    doc: Document;
    onEdit: () => void;
    onDelete: () => void;
    onShowInterviewQuestions: () => void;
}

export interface InterviewQuestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentContent: string;
}
