'use client';

import { useState, useEffect } from 'react';
import { Document, Status } from '@/shared/types';
import { useUpdateDocument } from '@/entities/document';
import { toast } from 'sonner';

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

export function useDocumentForm(doc: Document | undefined) {
    const updateDocumentMutation = useUpdateDocument();
    const [form, setForm] = useState<DocumentFormState>({
        company: '',
        role: '',
        jobPostUrl: '',
        tags: [],
        status: 'writing',
        deadline: '',
        sections: []
    });

    useEffect(() => {
        if (doc) {
            const parsedSections = doc.content.split(/(?=### )/g)
                .filter(s => s.trim())
                .map(s => {
                    const titleMatch = s.match(/^### (.*)(\n|$)/);
                    let title = titleMatch ? titleMatch[1].trim() : '무제';

                    // Parse limit from title if exists (e.g. "Title (500자)")
                    let limit = 500;
                    const limitMatch = title.match(/\((\d+)자\)$/);
                    if (limitMatch) {
                        limit = parseInt(limitMatch[1]);
                        title = title.replace(/\s*\(\d+자\)$/, '');
                    }

                    const content = s.replace(/^### .*\n?/, '').trim();
                    return { title, content, limit };
                });

            const finalSections = parsedSections.length > 0 ? parsedSections : [{ title: '자기소개서', content: doc.content, limit: 500 }];

            setForm({
                company: doc.company,
                role: doc.role,
                jobPostUrl: doc.jobPostUrl || '',
                tags: doc.tags || [],
                status: doc.status || 'writing',
                deadline: doc.deadline || '',
                sections: finalSections
            });
        }
    }, [doc]);

    const updateField = <K extends keyof DocumentFormState>(key: K, value: DocumentFormState[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const updateSection = (index: number, field: keyof Section, value: string) => {
        const newSections = [...form.sections];
        newSections[index] = { ...newSections[index], [field]: value };
        setForm(prev => ({ ...prev, sections: newSections }));
    };

    const addSection = () => {
        setForm(prev => ({
            ...prev,
            sections: [...prev.sections, { title: '', content: '', limit: 500 }]
        }));
    };

    const removeSection = (index: number) => {
        setForm(prev => ({
            ...prev,
            sections: prev.sections.filter((_, i) => i !== index)
        }));
    };

    const saveDocument = async () => {
        if (!doc) return;

        const combinedContent = form.sections.map(s => {
            const titleWithLimit = s.limit ? `${s.title} (${s.limit}자)` : s.title;
            return `### ${titleWithLimit}\n${s.content}`;
        }).join('\n\n');

        try {
            await updateDocumentMutation.mutateAsync({
                id: doc.id,
                company: form.company,
                role: form.role,
                content: combinedContent,
                jobPostUrl: form.jobPostUrl,
                tags: form.tags,
                status: form.status,
                deadline: form.deadline
            });
            toast.success('문서가 저장되었습니다.');
            return true;
        } catch (error) {
            console.error('Failed to save document:', error);
            toast.error('저장에 실패했습니다.');
            return false;
        }
    };

    return {
        form,
        updateField,
        updateSection,
        addSection,
        removeSection,
        saveDocument
    };
}
