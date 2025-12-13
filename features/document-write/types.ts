export interface Section {
    title: string;
    content: string;
    limit: number;
}

export interface ResumeFormData {
    company: string;
    role: string;
    jobPostUrl: string;
    tags: string[];
    deadline: string;
    sections: Section[];
}

export interface AutoDraftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDraftGenerated: (draft: string) => void;
    company: string;
    role: string;
    question: string;
}

export interface StatusConfirmationResult {
    finalStatus: string;
    documentStatus: 'pass' | 'fail' | null;
}

export interface StatusConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (result: StatusConfirmationResult) => void;
}
