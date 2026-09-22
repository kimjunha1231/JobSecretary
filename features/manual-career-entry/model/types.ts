import type { CareerItemKind } from '@/entities/career-item';

export type ManualCareerEntryValues = {
    title: string;
    kind: CareerItemKind;
    organization: string;
    role: string;
    startedAt: string;
    endedAt: string;
    isCurrent: boolean;
    summary: string;
    action: string;
    result: string;
    learning: string;
};

export const EMPTY_MANUAL_CAREER_ENTRY: ManualCareerEntryValues = {
    title: '',
    kind: 'project',
    organization: '',
    role: '',
    startedAt: '',
    endedAt: '',
    isCurrent: false,
    summary: '',
    action: '',
    result: '',
    learning: '',
};
