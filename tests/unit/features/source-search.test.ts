import type { SourceDocument } from '@/entities/source-document';
import { filterSourceDocuments } from '@/features/source-search';

function source(overrides: Partial<SourceDocument>): SourceDocument {
    return {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        kind: 'portfolio',
        title: '2026 포트폴리오',
        originType: 'upload',
        mimeType: 'application/pdf',
        status: 'approved',
        extractionMethod: 'direct_text',
        extractionWarnings: [],
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('source document search', () => {
    const documents = [
        source({ title: '2026 포트폴리오', sourceUrl: 'https://portfolio.example/projects' }),
        source({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', kind: 'resume', title: '이력서 OCR 보정본', status: 'needs_review', extractionWarnings: ['원본과 대조해 주세요.'] }),
    ];

    it('searches title, URL, and extraction warnings', () => {
        expect(filterSourceDocuments(documents, { query: 'portfolio.example' })).toHaveLength(1);
        expect(filterSourceDocuments(documents, { query: '대조해 주세요' })).toHaveLength(1);
    });

    it('combines kind and status filters', () => {
        expect(filterSourceDocuments(documents, { kind: 'resume', status: 'needs_review' })).toHaveLength(1);
        expect(filterSourceDocuments(documents, { kind: 'portfolio', status: 'needs_review' })).toHaveLength(0);
    });

    it('returns all documents for empty or invalid filters', () => {
        expect(filterSourceDocuments(documents)).toEqual(documents);
        expect(filterSourceDocuments(documents, { query: ' ', kind: 'invalid', status: 'invalid' })).toEqual(documents);
    });
});
