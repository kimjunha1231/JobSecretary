import { Document, Status } from './model';

// Database record to Document type mapping
export interface DocumentRecord {
    id: string;
    user_id: string;
    title: string;
    company: string;
    role: string;
    content: string;
    status: string;
    tags: string[];
    created_at: string;
    job_post_url?: string;
    position?: number;
    deadline?: string;
    date?: string;
    logo?: string;
    is_favorite?: boolean;
    is_archived?: boolean;
    document_screening_status?: 'pass' | 'fail' | null;
}

// Map database record to Document type
export function mapRecordToDocument(record: DocumentRecord): Document {
    return {
        id: record.id,
        user_id: record.user_id,
        title: record.title || '',
        company: record.company || '',
        role: record.role || '',
        content: record.content || '',
        status: record.status as Status,
        tags: record.tags || [],
        createdAt: record.created_at,
        jobPostUrl: record.job_post_url,
        position: record.position,
        deadline: record.deadline,
        isFavorite: record.is_favorite || false,
        isArchived: record.is_archived || false,
        documentScreeningStatus: record.document_screening_status || null,
    };
}

// Map Document type to database update payload
export function mapDocumentToRecord(doc: Partial<Document>): Record<string, unknown> {
    const record: Record<string, unknown> = {};

    if (doc.title !== undefined) record.title = doc.title;
    if (doc.company !== undefined) {
        record.company = doc.company;
        record.logo = doc.company.charAt(0).toUpperCase();
    }
    if (doc.role !== undefined) record.role = doc.role;
    if (doc.content !== undefined) record.content = doc.content;
    if (doc.status !== undefined) record.status = doc.status;
    if (doc.tags !== undefined) record.tags = doc.tags;
    if (doc.jobPostUrl !== undefined) record.job_post_url = doc.jobPostUrl;
    if (doc.position !== undefined) record.position = doc.position;
    if (doc.deadline !== undefined) record.deadline = doc.deadline;
    if (doc.isFavorite !== undefined) record.is_favorite = doc.isFavorite;
    if (doc.isArchived !== undefined) record.is_archived = doc.isArchived;
    if (doc.documentScreeningStatus !== undefined) record.document_screening_status = doc.documentScreeningStatus;

    return record;
}
