import { createHash } from 'node:crypto';
import type {
    ExtractionMethod,
    SourceDocumentKind,
    SourceDocumentStatus,
    SourceDocumentOrigin,
} from '@/entities/source-document';

export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_SOURCE_TEXT_LENGTH = 500_000;
export const MAX_SOURCE_FRAGMENT_LENGTH = 100_000;
export const MAX_SOURCE_FRAGMENTS = 1_000;
export const EXTRACTION_VERSION = 'm2-direct-text-v1';

type SourceExtractionErrorCode = 'empty_input' | 'too_large' | 'unsupported_type' | 'parse_failed';

export class SourceExtractionError extends Error {
    constructor(
        public readonly code: SourceExtractionErrorCode,
        message: string,
        public readonly status: 400 | 413 | 422 = 400,
    ) {
        super(message);
        this.name = 'SourceExtractionError';
    }
}

export type SourceFragmentDraft = {
    content: string;
    locator: Record<string, unknown>;
};

export type SourceExtractionResult = {
    rawText?: string;
    fragments: SourceFragmentDraft[];
    contentHash: string;
    mimeType: string;
    pageCount?: number;
    status: SourceDocumentStatus;
    extractionMethod: ExtractionMethod;
    extractionVersion: string;
    warnings: string[];
    kind: SourceDocumentKind;
    originType: SourceDocumentOrigin;
    sourceUrl?: string;
    fetchedAt?: string;
};

const MIME_BY_EXTENSION: Record<string, string> = {
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.markdown': 'text/markdown',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.text': 'text/plain',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const TEXT_MIME_TYPES = new Set([
    'application/json',
    'text/csv',
    'text/html',
    'text/markdown',
    'text/plain',
]);

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function getExtension(filename?: string): string {
    if (!filename) return '';
    const lastSegment = filename.split(/[\\/]/).pop() ?? filename;
    const extension = lastSegment.lastIndexOf('.') >= 0
        ? lastSegment.slice(lastSegment.lastIndexOf('.')).toLowerCase()
        : '';
    return extension;
}

export function inferSourceMimeType(filename?: string, mimeType?: string): string {
    const normalizedMime = mimeType?.split(';')[0]?.trim().toLowerCase() ?? '';
    const extensionMime = MIME_BY_EXTENSION[getExtension(filename)];

    if (normalizedMime && normalizedMime !== 'application/octet-stream') {
        return normalizedMime;
    }

    return extensionMime ?? normalizedMime;
}

function ensureSize(buffer: Uint8Array): void {
    if (buffer.byteLength > MAX_SOURCE_BYTES) {
        throw new SourceExtractionError(
            'too_large',
            `자료는 ${Math.floor(MAX_SOURCE_BYTES / (1024 * 1024))}MB 이하만 가져올 수 있습니다.`,
            413,
        );
    }
}

function normalizeText(value: string): string {
    return value
        .normalize('NFKC')
        .replace(/\u0000/g, '')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function ensureTextSize(text: string): string {
    if (text.length > MAX_SOURCE_TEXT_LENGTH) {
        throw new SourceExtractionError(
            'too_large',
            `추출된 본문은 ${MAX_SOURCE_TEXT_LENGTH.toLocaleString('ko-KR')}자 이하만 저장할 수 있습니다.`,
            413,
        );
    }

    return text;
}

function makeContentHash(buffer: Uint8Array): string {
    return createHash('sha256').update(buffer).digest('hex');
}

function chunkText(text: string, locator: (index: number) => Record<string, unknown>): SourceFragmentDraft[] {
    const chunks: SourceFragmentDraft[] = [];
    let current = '';
    let index = 0;

    const flush = () => {
        const content = current.trim();
        if (!content) return;
        chunks.push({ content, locator: locator(index) });
        index += 1;
        current = '';
    };

    for (const line of text.split('\n')) {
        if (line.length > MAX_SOURCE_FRAGMENT_LENGTH) {
            flush();
            for (let start = 0; start < line.length; start += MAX_SOURCE_FRAGMENT_LENGTH) {
                chunks.push({
                    content: line.slice(start, start + MAX_SOURCE_FRAGMENT_LENGTH),
                    locator: locator(index),
                });
                index += 1;
            }
            continue;
        }

        const next = current ? `${current}\n${line}` : line;
        if (next.length > MAX_SOURCE_FRAGMENT_LENGTH && current) flush();
        current = current ? `${current}\n${line}` : line;
    }
    flush();

    return chunks;
}

export function splitTextIntoFragments(
    value: string,
    locatorPrefix: Record<string, unknown> = {},
): SourceFragmentDraft[] {
    const text = normalizeText(value);
    if (!text) return [];

    const blocks = text.split(/\n{2,}/).map(block => block.trim()).filter(Boolean);
    const fragments: SourceFragmentDraft[] = [];
    const positionOffset = typeof locatorPrefix.position === 'number' ? locatorPrefix.position : 0;

    blocks.forEach((block, blockIndex) => {
        if (block.length <= MAX_SOURCE_FRAGMENT_LENGTH) {
            fragments.push({
                content: block,
                locator: { ...locatorPrefix, type: locatorPrefix.type ?? 'paragraph', position: positionOffset + blockIndex },
            });
            return;
        }

        chunkText(block, chunkIndex => ({
            ...locatorPrefix,
            type: locatorPrefix.type ?? 'paragraph',
            position: positionOffset + blockIndex,
            chunk: chunkIndex,
        })).forEach(fragment => fragments.push(fragment));
    });

    if (fragments.length <= MAX_SOURCE_FRAGMENTS) {
        return fragments;
    }

    const overflow = fragments.slice(MAX_SOURCE_FRAGMENTS - 1)
        .map(fragment => fragment.content)
        .join('\n\n');
    return [
        ...fragments.slice(0, MAX_SOURCE_FRAGMENTS - 1),
        {
            content: overflow.slice(0, MAX_SOURCE_FRAGMENT_LENGTH),
            locator: { ...locatorPrefix, type: locatorPrefix.type ?? 'paragraph', position: MAX_SOURCE_FRAGMENTS - 1, truncated: true },
        },
    ];
}

const HTML_ENTITY_MAP: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    hellip: '…',
    nbsp: ' ',
    lt: '<',
    quot: '"',
};

function decodeHtmlEntities(value: string): string {
    return value
        .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
            const radix = code.toLowerCase().startsWith('x') ? 16 : 10;
            const numericCode = Number.parseInt(code.replace(/^x/i, ''), radix);
            return Number.isFinite(numericCode) ? String.fromCodePoint(Math.min(numericCode, 0x10ffff)) : '';
        })
        .replace(/&([a-z]+);/gi, (_, name: string) => HTML_ENTITY_MAP[name.toLowerCase()] ?? `&${name};`);
}

function stripHtml(value: string): string {
    return decodeHtmlEntities(
        value
            .replace(/<!--([\s\S]*?)-->/g, '')
            .replace(/<(script|style|noscript|svg|template|iframe|object|embed|canvas)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
            .replace(/<\/?(br|p|div|section|article|li|h[1-6]|header|footer|main|aside|tr)\b[^>]*>/gi, '\n')
            .replace(/<[^>]+>/g, ' '),
    );
}

export function htmlToText(value: string): string {
    return normalizeText(stripHtml(value));
}

export function htmlToFragments(value: string): SourceFragmentDraft[] {
    const withoutUnsafeBlocks = value
        .replace(/<!--([\s\S]*?)-->/g, '')
        .replace(/<(script|style|noscript|svg|template|iframe|object|embed|canvas)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '');
    const blockPattern = /<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    const fragments: SourceFragmentDraft[] = [];
    let match: RegExpExecArray | null;
    let position = 0;

    while ((match = blockPattern.exec(withoutUnsafeBlocks)) !== null) {
        const content = htmlToText(match[2]);
        if (!content) continue;
        const type = match[1].toLowerCase().startsWith('h') ? 'heading' : 'paragraph';
        splitTextIntoFragments(content, { type, tag: match[1].toLowerCase(), position })
            .forEach(fragment => fragments.push(fragment));
        position += 1;
    }

    return fragments.length > 0 ? fragments : splitTextIntoFragments(htmlToText(value), { type: 'paragraph' });
}

function buildResult({
    rawText,
    fragments,
    buffer,
    mimeType,
    pageCount,
    warnings,
    kind,
    originType,
    extractionMethod = 'direct_text',
}: {
    rawText: string;
    fragments: SourceFragmentDraft[];
    buffer: Uint8Array;
    mimeType: string;
    pageCount?: number;
    warnings?: string[];
    kind: SourceDocumentKind;
    originType: SourceDocumentOrigin;
    extractionMethod?: ExtractionMethod;
}): SourceExtractionResult {
    const normalizedText = ensureTextSize(normalizeText(rawText));
    const hasText = normalizedText.length > 0;

    return {
        ...(hasText ? { rawText: normalizedText } : {}),
        fragments: hasText ? fragments.filter(fragment => fragment.content.trim()).slice(0, MAX_SOURCE_FRAGMENTS) : [],
        contentHash: makeContentHash(buffer),
        mimeType,
        ...(pageCount ? { pageCount } : {}),
        status: hasText ? 'needs_review' : 'manual_input',
        extractionMethod: hasText ? extractionMethod : 'none',
        extractionVersion: EXTRACTION_VERSION,
        warnings: [
            ...(warnings ?? []),
            ...(hasText ? [] : ['텍스트를 추출하지 못했습니다. 내용을 직접 붙여넣어 검수해 주세요.']),
        ],
        kind,
        originType,
    };
}

export function extractTextSource({
    text,
    kind,
    originType = 'pasted_text',
    mimeType = 'text/plain',
}: {
    text: string;
    kind: SourceDocumentKind;
    originType?: SourceDocumentOrigin;
    mimeType?: string;
}): SourceExtractionResult {
    const normalizedMimeType = inferSourceMimeType(undefined, mimeType) || 'text/plain';
    if (!TEXT_MIME_TYPES.has(normalizedMimeType)) {
        throw new SourceExtractionError('unsupported_type', '붙여넣기 자료는 일반 텍스트 형식이어야 합니다.');
    }

    const buffer = Buffer.from(text, 'utf8');
    ensureSize(buffer);
    const normalizedText = normalizeText(text);
    if (!normalizedText) {
        throw new SourceExtractionError('empty_input', '등록할 텍스트를 입력해 주세요.');
    }

    return buildResult({
        rawText: normalizedText,
        fragments: splitTextIntoFragments(normalizedText),
        buffer,
        mimeType: normalizedMimeType,
        kind,
        originType,
        extractionMethod: 'manual',
    });
}

export function extractHtmlSource({
    html,
    kind,
    originType = 'url',
    mimeType = 'text/html',
}: {
    html: string;
    kind: SourceDocumentKind;
    originType?: SourceDocumentOrigin;
    mimeType?: string;
}): SourceExtractionResult {
    const buffer = Buffer.from(html, 'utf8');
    ensureSize(buffer);
    const normalizedText = htmlToText(html);
    return buildResult({
        rawText: normalizedText,
        fragments: htmlToFragments(html),
        buffer,
        mimeType,
        kind,
        originType,
        extractionMethod: 'direct_text',
    });
}

async function extractPdfSource({
    buffer,
    kind,
    originType,
    mimeType,
}: {
    buffer: Buffer;
    kind: SourceDocumentKind;
    originType: SourceDocumentOrigin;
    mimeType: string;
}): Promise<SourceExtractionResult> {
    try {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });

        try {
            const result = await parser.getText();
            const pageFragments = result.pages.flatMap(page =>
                splitTextIntoFragments(page.text, { type: 'page', page: page.num }),
            );

            return buildResult({
                rawText: result.text,
                fragments: pageFragments.length > 0 ? pageFragments : splitTextIntoFragments(result.text),
                buffer,
                mimeType,
                pageCount: result.total,
                kind,
                originType,
            });
        } finally {
            await parser.destroy();
        }
    } catch (error) {
        if (error instanceof SourceExtractionError) throw error;
        throw new SourceExtractionError('parse_failed', 'PDF 본문을 읽지 못했습니다. 파일이 손상되지 않았는지 확인해 주세요.', 422);
    }
}

async function extractDocxSource({
    buffer,
    kind,
    originType,
    mimeType,
}: {
    buffer: Buffer;
    kind: SourceDocumentKind;
    originType: SourceDocumentOrigin;
    mimeType: string;
}): Promise<SourceExtractionResult> {
    try {
        const mammothModule = await import('mammoth');
        const mammoth = mammothModule.default ?? mammothModule;
        const result = await mammoth.extractRawText({ buffer });
        const warnings = result.messages
            .filter(message => message.type === 'warning')
            .map(message => message.message)
            .slice(0, 10);

        return buildResult({
            rawText: result.value,
            fragments: splitTextIntoFragments(result.value),
            buffer,
            mimeType,
            warnings,
            kind,
            originType,
        });
    } catch (error) {
        if (error instanceof SourceExtractionError) throw error;
        throw new SourceExtractionError('parse_failed', 'DOCX 본문을 읽지 못했습니다. 파일이 손상되지 않았는지 확인해 주세요.', 422);
    }
}

export async function extractSourceFile({
    buffer,
    filename,
    mimeType,
    kind,
    originType = 'upload',
}: {
    buffer: Uint8Array;
    filename?: string;
    mimeType?: string;
    kind: SourceDocumentKind;
    originType?: SourceDocumentOrigin;
}): Promise<SourceExtractionResult> {
    ensureSize(buffer);

    const normalizedMimeType = inferSourceMimeType(filename, mimeType);
    const extension = getExtension(filename);
    const isPdf = normalizedMimeType === 'application/pdf' || extension === '.pdf';
    const isDocx = normalizedMimeType === DOCX_MIME_TYPE || extension === '.docx';
    const isText = TEXT_MIME_TYPES.has(normalizedMimeType);

    if (!isPdf && !isDocx && !isText) {
        throw new SourceExtractionError('unsupported_type', 'PDF, DOCX, TXT, Markdown, CSV, JSON 파일만 가져올 수 있습니다.');
    }

    const nodeBuffer = Buffer.from(buffer);
    if (isPdf) {
        return extractPdfSource({ buffer: nodeBuffer, kind, originType, mimeType: 'application/pdf' });
    }
    if (isDocx) {
        return extractDocxSource({ buffer: nodeBuffer, kind, originType, mimeType: DOCX_MIME_TYPE });
    }

    const text = nodeBuffer.toString('utf8');
    const normalizedText = normalizeText(text);
    if (!normalizedText) {
        throw new SourceExtractionError('empty_input', '등록할 텍스트가 없습니다.');
    }

    return buildResult({
        rawText: normalizedText,
        fragments: splitTextIntoFragments(normalizedText),
        buffer: nodeBuffer,
        mimeType: normalizedMimeType || 'text/plain',
        kind,
        originType,
    });
}
