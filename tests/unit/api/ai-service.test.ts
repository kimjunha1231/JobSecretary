import { GoogleGenAI } from '@google/genai';
import {
    generateDraft,
    generateInsight,
    generateQuestions,
    refineText,
} from '@/features/ai-assistant/api/ai.service';
import { createServerSupabaseClient } from '@/shared/api/server';
import { AI_MODEL, GEMINI_REQUEST_TIMEOUT_MS, getGeminiModels } from '@/shared/config';
import { logger } from '@/shared/lib';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));
jest.mock('@/shared/api/server', () => ({ createServerSupabaseClient: jest.fn() }));
jest.mock('@/shared/lib', () => ({
    logger: { warn: jest.fn(), error: jest.fn() },
}));

const mockGenerateContent = jest.fn();
const mockGetUser = jest.fn();
const mockGoogleGenAI = GoogleGenAI as jest.Mock;
const mockCreateSupabaseClient = createServerSupabaseClient as jest.Mock;
const originalEnvironment = { ...process.env };

beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateContent.mockReset();
    process.env = { ...originalEnvironment };
    Object.keys(process.env).forEach(name => {
        if (name.startsWith('GEMINI_') || /^API_KEYS?(?:_\d+)?$/.test(name)) {
            delete process.env[name];
        }
    });
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    mockGoogleGenAI.mockImplementation(() => ({ models: { generateContent: mockGenerateContent } }));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user' } } });
    const contextQuery = {
        data: [{ content: '과거 프로젝트 경험', company: '이전 회사', role: '개발자' }],
        error: null,
        overlaps: jest.fn().mockReturnThis(),
    };
    mockCreateSupabaseClient.mockResolvedValue({
        auth: { getUser: mockGetUser },
        from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue(contextQuery) }),
        }),
    });
});

afterEach(() => {
    process.env = { ...originalEnvironment };
});

describe('AI service requests', () => {
    it('rejects invalid input before authentication or model calls', async () => {
        await expect(generateQuestions('', '개발자', '')).rejects.toThrow('Invalid AI request.');
        expect(mockGetUser).not.toHaveBeenCalled();
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated insight requests before calling Gemini', async () => {
        mockGetUser.mockResolvedValueOnce({ data: { user: null } });

        await expect(generateInsight('이전 경험을 찾아주세요.', [])).rejects.toThrow('Unauthorized');
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('generates questions with the configured model and request timeout', async () => {
        mockGenerateContent.mockResolvedValue({ text: '1. 협업 경험을 설명해 주세요.' });

        await expect(generateQuestions('지원 회사', '개발자', '')).resolves.toBe('1. 협업 경험을 설명해 주세요.');

        expect(mockGoogleGenAI).toHaveBeenCalledWith({
            apiKey: 'test-gemini-key',
            httpOptions: { timeout: GEMINI_REQUEST_TIMEOUT_MS },
        });
        expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
            model: AI_MODEL,
            contents: expect.stringContaining('지원 회사: 지원 회사'),
            config: expect.objectContaining({ systemInstruction: expect.any(String) }),
        }));
        expect(mockGenerateContent.mock.calls[0][0].config).not.toHaveProperty('temperature');
    });

    it('recovers from model overload by requesting the fallback model', async () => {
        mockGenerateContent
            .mockRejectedValueOnce(Object.assign(new Error('Model is overloaded'), { status: 503 }))
            .mockResolvedValueOnce({ text: '1. 문제를 해결한 경험은 무엇인가요?' });

        await expect(generateQuestions('회사', '개발자', '')).resolves.toContain('문제를 해결한 경험');

        expect(mockGenerateContent.mock.calls.map(([parameters]) => parameters.model)).toEqual(getGeminiModels());
        expect(mockGoogleGenAI.mock.calls.map(([options]) => options.apiKey)).toEqual([
            'test-gemini-key', 'test-gemini-key',
        ]);
    });

    it('uses the next key after an authentication failure', async () => {
        process.env.GEMINI_API_KEYS = 'first-test-key,second-test-key';
        delete process.env.GEMINI_API_KEY;
        mockGenerateContent
            .mockRejectedValueOnce(Object.assign(new Error('Invalid API key'), { status: 403 }))
            .mockResolvedValueOnce({ text: '1. 지원 동기는 무엇인가요?' });

        await expect(generateQuestions('회사', '개발자', '')).resolves.toContain('지원 동기');

        expect(mockGoogleGenAI.mock.calls.map(([options]) => options.apiKey)).toEqual([
            'first-test-key', 'second-test-key',
        ]);
        expect(mockGenerateContent.mock.calls.map(([parameters]) => parameters.model)).toEqual([AI_MODEL, AI_MODEL]);
    });

    it('preserves structured insight responses', async () => {
        const result = { text: '[이전 문서](/document/doc-1)를 참고해 보세요.', relatedDocIds: ['doc-1'] };
        mockGenerateContent.mockResolvedValue({ text: JSON.stringify(result) });

        await expect(generateInsight('협업 경험을 찾아주세요.', [])).resolves.toEqual(result);
        expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
            config: expect.objectContaining({ responseMimeType: 'application/json' }),
        }));
    });

    it('returns the existing question failure message when all keys fail', async () => {
        mockGenerateContent.mockRejectedValue(Object.assign(new Error('Invalid API key'), { status: 403 }));

        await expect(generateQuestions('회사', '개발자', '')).resolves.toBe('질문 생성 중 오류가 발생했습니다.');
    });

    it('keeps raw SDK errors and keys out of insight responses and logs', async () => {
        const rawMessage = 'Request rejected: x-goog-api-key: test-gemini-key; key=test-gemini-key';
        mockGenerateContent.mockRejectedValue(Object.assign(new Error(rawMessage), { status: 403 }));

        const result = await generateInsight('도와주세요.', []);

        expect(result.text).toContain('오류가 발생했습니다');
        expect(result.relatedDocIds).toEqual([]);
        const visibleOutput = JSON.stringify([result, (logger.warn as jest.Mock).mock.calls, (logger.error as jest.Mock).mock.calls]);
        expect(visibleOutput).not.toContain('test-gemini-key');
        expect(visibleOutput).not.toContain(rawMessage);
        expect(logger.error).toHaveBeenCalledWith('Gemini API Error:', expect.any(String));
    });
});

describe('generateDraft', () => {
    it('returns the draft verbatim and includes past cover letter context', async () => {
        const draft = '문제를 분석하고 해결했습니다.\n\n동료와 협업했습니다.';
        mockGenerateContent.mockResolvedValue({ text: draft });

        await expect(generateDraft('회사', '개발자', '경험을 설명하세요.', '협업', ['개발'], 500)).resolves.toBe(draft);
        expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
            contents: expect.stringContaining('과거 프로젝트 경험'),
            config: expect.objectContaining({ systemInstruction: expect.stringContaining('500자') }),
        }));
    });

    it.each([undefined, '', ' \n\t '])('rejects an empty draft response (%p)', async responseText => {
        mockGenerateContent.mockResolvedValue({ text: responseText });

        await expect(generateDraft('회사', '개발자', '질문', '')).rejects.toThrow('초안 생성 중 오류가 발생했습니다.');
    });

    it('rejects failed generation instead of returning error text as a draft', async () => {
        mockGenerateContent.mockRejectedValue(Object.assign(new Error('key=test-gemini-key'), { status: 403 }));

        await expect(generateDraft('회사', '개발자', '질문', '')).rejects.toThrow('초안 생성 중 오류가 발생했습니다.');
        expect(JSON.stringify((logger.error as jest.Mock).mock.calls)).not.toContain('test-gemini-key');
    });

    it('does not make a Gemini request for an unauthenticated user', async () => {
        mockGetUser.mockResolvedValueOnce({ data: { user: null } });

        await expect(generateDraft('회사', '개발자', '질문', '')).rejects.toThrow('Unauthorized');
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });
});

describe('refineText', () => {
    it('validates the response and preserves the input as the diff original', async () => {
        const original = '팀과 함꼐 문제를 해결했어요.';
        mockGenerateContent.mockResolvedValue({ text: JSON.stringify({
            original: '모델이 임의로 바꾼 원문',
            corrected: '팀과 함께 문제를 해결했습니다.',
            changes: ['맞춤법 수정', '정중한 어조로 변경'],
        }) });

        await expect(refineText(original)).resolves.toEqual({
            original,
            corrected: '팀과 함께 문제를 해결했습니다.',
            changes: ['맞춤법 수정', '정중한 어조로 변경'],
        });
    });

    it('accepts a valid response wrapped in a JSON code fence', async () => {
        mockGenerateContent.mockResolvedValue({
            text: '```json\n{"original":"원문","corrected":"교정문","changes":[]}\n```',
        });

        await expect(refineText('원문')).resolves.toEqual({ original: '원문', corrected: '교정문', changes: [] });
    });

    it.each([
        undefined,
        '',
        'not JSON',
        'null',
        '[]',
        '{"corrected":"교정문","changes":[]}',
        '{"original":123,"corrected":"교정문","changes":[]}',
        '{"original":"원문","corrected":123,"changes":[]}',
        '{"original":"원문","corrected":"","changes":[]}',
        JSON.stringify({ original: '원문', corrected: ' \n\t ', changes: [] }),
        '{"original":"원문","corrected":"교정문","changes":"수정"}',
        '{"original":"원문","corrected":"교정문","changes":["수정",42]}',
    ])('returns null for an invalid refinement response (%p)', async responseText => {
        mockGenerateContent.mockResolvedValue({ text: responseText });

        await expect(refineText('원문')).resolves.toBeNull();
    });
});
