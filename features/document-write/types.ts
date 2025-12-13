import { z } from 'zod';

export const sectionSchema = z.object({
    title: z.string().min(1, '문항 제목을 입력해주세요'),
    content: z.string(),
    limit: z.number().min(0)
});

export const resumeSchema = z.object({
    company: z.string().min(1, '회사명을 입력해주세요'),
    role: z.string().min(1, '직무를 입력해주세요'),
    jobPostUrl: z.string().optional(),
    tags: z.array(z.string()).default([]),
    deadline: z.string().optional(),
    sections: z.array(sectionSchema).min(1, '최소 하나의 문항이 필요합니다')
});

export type ResumeFormData = z.infer<typeof resumeSchema>;
export type Section = z.infer<typeof sectionSchema>;

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
