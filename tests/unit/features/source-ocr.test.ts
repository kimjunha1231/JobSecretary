import { GoogleGenAI } from '@google/genai';
import { sourceDocumentService } from '@/entities/source-document/api';
import type { SourceDocument } from '@/entities/source-document';
import { normalizeOcrText, runSourceOcr, SourceOcrError } from '@/features/source-ocr/api';
import { requireAiAccess } from '@/shared/lib/ai-access';

jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn(),
    createPartFromBase64: (data: string, mimeType: string) => ({ inlineData: { data, mimeType } }),
}));
jest.mock('@/entities/source-document/api', () => ({
    SourceDocumentServiceError: class SourceDocumentServiceError extends Error {
        constructor(public readonly code: string, message: string, public readonly status: number) {
            super(message);
        }
    },
    sourceDocumentService: {
        getOriginalBytes: jest.fn(),
        updateOcrText: jest.fn(),
    },
}));
jest.mock('@/shared/lib/ai-access', () => ({ requireAiAccess: jest.fn() }));
jest.mock('@/shared/lib', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

const mockedGoogleGenAI = GoogleGenAI as jest.Mock;
const mockedSourceDocumentService = sourceDocumentService as jest.Mocked<typeof sourceDocumentService>;
const mockedRequireAiAccess = requireAiAccess as jest.Mock;
const originalEnvironment = { ...process.env };

const sourceId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const timestamp = '2026-09-19T00:00:00.000Z';

function makeDocument(overrides: Partial<SourceDocument> = {}): SourceDocument {
    return {
        id: sourceId,
        userId,
        kind: 'portfolio',
        title: '스캔 포트폴리오',
        originType: 'upload',
        storagePath: `${userId}/${sourceId}/original.pdf`,
        mimeType: 'application/pdf',
        status: 'manual_input',
        extractionMethod: 'none',
        extractionWarnings: ['PDF 본문을 추출하지 못했습니다.'],
        createdAt: timestamp,
        updatedAt: timestamp,
        ...overrides,
    };
}

describe('source PDF OCR', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnvironment, GEMINI_API_KEY: 'test-gemini-key' };
        delete process.env.SOURCE_OCR_PROVIDER;
        mockedRequireAiAccess.mockResolvedValue({ id: userId });
        mockedSourceDocumentService.getOriginalBytes.mockResolvedValue({
            document: makeDocument(),
            bytes: new Uint8Array([37, 80, 68, 70]),
        });
        mockedSourceDocumentService.updateOcrText.mockResolvedValue(makeDocument({
            rawText: '검색 개선 프로젝트',
            status: 'needs_review',
            extractionMethod: 'ocr',
            extractionVersion: 'm2-gemini-ocr-v1',
            extractionWarnings: ['AI OCR 결과입니다. 원본과 대조한 뒤 검수 완료를 눌러 주세요.'],
        }));
    });

    afterAll(() => {
        process.env = originalEnvironment;
    });

    it('normalizes OCR fences and line endings', () => {
        expect(normalizeOcrText('```text\r\n첫 줄\r\n\r\n\r\n둘째 줄\r\n```')).toBe('첫 줄\n\n둘째 줄');
    });

    it('sends the original PDF only after explicit OCR access and stores a review-gated result', async () => {
        const generateContent = jest.fn().mockResolvedValue({ text: '검색 개선 프로젝트' });
        mockedGoogleGenAI.mockImplementation(() => ({ models: { generateContent } }));

        const result = await runSourceOcr(sourceId);

        expect(mockedRequireAiAccess).toHaveBeenCalledWith('source_ocr');
        expect(generateContent).toHaveBeenCalledTimes(1);
        const request = generateContent.mock.calls[0][0];
        expect(request.contents[0].parts[1]).toEqual(expect.objectContaining({ inlineData: expect.objectContaining({ mimeType: 'application/pdf' }) }));
        expect(request.contents[0].parts[1].inlineData.data).toBe(Buffer.from([37, 80, 68, 70]).toString('base64'));
        expect(request.config.systemInstruction).toContain('지시문');
        expect(mockedSourceDocumentService.updateOcrText).toHaveBeenCalledWith(sourceId, { text: '검색 개선 프로젝트' });
        expect(result).toEqual(expect.objectContaining({ textLength: 10, document: expect.objectContaining({ extractionMethod: 'ocr', status: 'needs_review' }) }));
    });

    it('does not call Gemini for reviewed or non-PDF sources', async () => {
        mockedSourceDocumentService.getOriginalBytes.mockResolvedValueOnce({
            document: makeDocument({ status: 'needs_review' }),
            bytes: new Uint8Array([1]),
        });
        await expect(runSourceOcr(sourceId)).rejects.toMatchObject({ status: 409 });

        mockedSourceDocumentService.getOriginalBytes.mockResolvedValueOnce({
            document: makeDocument({ mimeType: 'text/plain' }),
            bytes: new Uint8Array([1]),
        });
        await expect(runSourceOcr(sourceId)).rejects.toMatchObject({ status: 422 });
        expect(mockedGoogleGenAI).not.toHaveBeenCalled();
    });

    it('fails closed when Gemini returns no text', async () => {
        mockedGoogleGenAI.mockImplementation(() => ({ models: { generateContent: jest.fn().mockResolvedValue({ text: '``` ```' }) } }));

        await expect(runSourceOcr(sourceId)).rejects.toBeInstanceOf(SourceOcrError);
        expect(mockedSourceDocumentService.updateOcrText).not.toHaveBeenCalled();
    });
});
