import {
    MAX_SOURCE_TEXT_LENGTH,
    SourceExtractionError,
    extractSourceFile,
    extractTextSource,
    inferSourceMimeType,
    splitTextIntoFragments,
} from '@/features/source-ingestion/api';

describe('source ingestion extraction', () => {
    it('normalizes pasted text and creates reviewable fragments', () => {
        const result = extractTextSource({
            text: '  첫 번째 프로젝트  \r\n\r\n두 번째 프로젝트\n',
            kind: 'portfolio',
        });

        expect(result.rawText).toBe('첫 번째 프로젝트\n\n두 번째 프로젝트');
        expect(result.status).toBe('needs_review');
        expect(result.extractionMethod).toBe('manual');
        expect(result.fragments).toHaveLength(2);
        expect(result.fragments[0].locator).toMatchObject({ type: 'paragraph', position: 0 });
        expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('keeps page locators when splitting extracted page text', () => {
        const fragments = splitTextIntoFragments('문단 1\n\n문단 2', { type: 'page', page: 3 });

        expect(fragments).toHaveLength(2);
        expect(fragments[0].locator).toMatchObject({ type: 'page', page: 3, position: 0 });
        expect(fragments[1].locator).toMatchObject({ type: 'page', page: 3, position: 1 });
    });

    it('caps a single oversized line into valid fragment lengths', () => {
        const fragments = splitTextIntoFragments('x'.repeat(100_001));

        expect(fragments).toHaveLength(2);
        expect(Math.max(...fragments.map(fragment => fragment.content.length))).toBeLessThanOrEqual(100_000);
    });

    it('rejects empty and oversized input before registration', () => {
        expect(() => extractTextSource({ text: '   ', kind: 'resume' })).toThrow(SourceExtractionError);
        expect(() => extractTextSource({ text: 'a'.repeat(MAX_SOURCE_TEXT_LENGTH + 1), kind: 'resume' }))
            .toThrow('500,000');
    });

    it('extracts a supported text file and rejects unknown file types', async () => {
        const result = await extractSourceFile({
            buffer: Buffer.from('# Project\n\nBuilt a search flow.'),
            filename: 'portfolio.md',
            kind: 'portfolio',
        });

        expect(result.mimeType).toBe('text/markdown');
        expect(result.extractionMethod).toBe('direct_text');
        expect(result.fragments).toHaveLength(2);
        expect(inferSourceMimeType('resume.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        await expect(extractSourceFile({
            buffer: Buffer.from('binary'),
            filename: 'archive.zip',
            kind: 'other',
        })).rejects.toMatchObject({ code: 'unsupported_type' });
    });

});
