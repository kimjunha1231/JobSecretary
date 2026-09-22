import {
    SourceDocumentKindSchema,
    SourceDocumentStatusSchema,
    type SourceDocument,
    type SourceDocumentKind,
    type SourceDocumentStatus,
} from '@/entities/source-document';

export type SourceDocumentKindFilter = SourceDocumentKind | 'all';
export type SourceDocumentStatusFilter = SourceDocumentStatus | 'all';

export type SourceDocumentSearchOptions = {
    query?: unknown;
    kind?: unknown;
    status?: unknown;
};

function normalizeSearchText(value: unknown): string {
    return typeof value === 'string'
        ? value.normalize('NFKC').toLocaleLowerCase('ko-KR').trim()
        : '';
}

function getSearchableText(document: SourceDocument): string {
    return [
        document.title,
        document.sourceUrl,
        document.mimeType,
        document.extractionVersion,
        document.extractionWarnings,
    ]
        .flat(Infinity)
        .filter((value): value is string => typeof value === 'string')
        .map(normalizeSearchText)
        .filter(Boolean)
        .join(' ');
}

export function filterSourceDocuments(
    documents: SourceDocument[],
    options: SourceDocumentSearchOptions = {},
): SourceDocument[] {
    const query = normalizeSearchText(options.query);
    const parsedKind = SourceDocumentKindSchema.safeParse(options.kind);
    const parsedStatus = SourceDocumentStatusSchema.safeParse(options.status);
    const kind: SourceDocumentKindFilter = options.kind === 'all' || !parsedKind.success ? 'all' : parsedKind.data;
    const status: SourceDocumentStatusFilter = options.status === 'all' || !parsedStatus.success ? 'all' : parsedStatus.data;

    if (!query && kind === 'all' && status === 'all') return documents;

    return documents.filter(document => {
        const matchesKind = kind === 'all' || document.kind === kind;
        const matchesStatus = status === 'all' || document.status === status;
        const searchableText = getSearchableText(document);
        const matchesQuery = !query
            || searchableText.includes(query)
            || searchableText.replace(/\s+/g, '').includes(query.replace(/\s+/g, ''));
        return matchesKind && matchesStatus && matchesQuery;
    });
}
