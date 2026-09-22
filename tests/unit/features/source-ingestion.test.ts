import {
    MAX_SOURCE_TEXT_LENGTH,
    SourceExtractionError,
    extractSourceFile,
    extractTextSource,
    inferSourceMimeType,
    splitTextIntoFragments,
} from '@/features/source-ingestion/api';
import { PDFParse } from 'pdf-parse';

jest.mock('pdf-parse', () => ({
    PDFParse: jest.fn(),
}));

const mockedPdfParse = PDFParse as unknown as jest.Mock;

describe('source ingestion extraction', () => {
    beforeEach(() => mockedPdfParse.mockReset());

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

    it('treats page separators from an image-only PDF as manual input, not extracted text', async () => {
        mockedPdfParse.mockImplementation(() => ({
            getText: jest.fn().mockResolvedValue({
                text: '\n-- 1 of 2 --\n\n-- 2 of 2 --',
                total: 2,
                pages: [{ num: 1, text: '' }, { num: 2, text: '' }],
            }),
            destroy: jest.fn().mockResolvedValue(undefined),
        }));

        const result = await extractSourceFile({
            buffer: Buffer.from('%PDF mock'),
            filename: 'scanned-resume.pdf',
            kind: 'resume',
        });

        expect(result.status).toBe('manual_input');
        expect(result.extractionMethod).toBe('none');
        expect(result.rawText).toBeUndefined();
        expect(result.fragments).toEqual([]);
        expect(result.pageCount).toBe(2);
        expect(result.warnings).toContain('텍스트를 추출하지 못했습니다. 내용을 직접 붙여넣어 검수해 주세요.');
    });

    it('keeps page locators while excluding empty pages from extracted PDF text', async () => {
        mockedPdfParse.mockImplementation(() => ({
            getText: jest.fn().mockResolvedValue({
                text: '실제 프로젝트 설명\n-- 1 of 2 --\n\n-- 2 of 2 --',
                total: 2,
                pages: [{ num: 1, text: '실제 프로젝트 설명' }, { num: 2, text: '' }],
            }),
            destroy: jest.fn().mockResolvedValue(undefined),
        }));

        const result = await extractSourceFile({
            buffer: Buffer.from('%PDF mock'),
            filename: 'portfolio.pdf',
            kind: 'portfolio',
        });

        expect(result.status).toBe('needs_review');
        expect(result.rawText).toBe('실제 프로젝트 설명');
        expect(result.fragments).toEqual([
            expect.objectContaining({
                content: '실제 프로젝트 설명',
                locator: expect.objectContaining({ type: 'page', page: 1 }),
            }),
        ]);
    });

});
