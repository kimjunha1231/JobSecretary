import { GoogleGenAI } from '@google/genai';
import { generateInterviewQuestions } from '@/features/document-editor/api/interview';
import { AI_MODEL, GEMINI_REQUEST_TIMEOUT_MS, getGeminiModels } from '@/shared/config';
import { logger } from '@/shared/lib';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));
jest.mock('@/shared/lib', () => ({
    logger: { warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/shared/lib/ai-access', () => ({
    requireAiAccess: jest.fn().mockResolvedValue({ id: 'test-user' }),
}));

const mockGenerateContent = jest.fn();
const mockGoogleGenAI = GoogleGenAI as jest.Mock;
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
    process.env.GEMINI_API_KEY = 'test-interview-key';
    mockGoogleGenAI.mockImplementation(() => ({ models: { generateContent: mockGenerateContent } }));
});

afterEach(() => {
    process.env = { ...originalEnvironment };
});

describe('generateInterviewQuestions', () => {
    it('rejects oversized input before calling Gemini', async () => {
        await expect(generateInterviewQuestions('x'.repeat(20_001))).rejects.toThrow('Invalid AI request.');
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('generates a JSON question array through the current SDK with a request timeout', async () => {
        const questions = ['프로젝트에서 맡은 역할은 무엇인가요?', '의견 충돌을 어떻게 해결했나요?'];
        mockGenerateContent.mockResolvedValue({ text: JSON.stringify(questions) });

        await expect(generateInterviewQuestions('동료와 프로젝트를 완수했습니다.')).resolves.toEqual(questions);
        expect(mockGoogleGenAI).toHaveBeenCalledWith({
            apiKey: 'test-interview-key',
            httpOptions: { timeout: GEMINI_REQUEST_TIMEOUT_MS },
        });
        expect(mockGenerateContent).toHaveBeenCalledWith({
            model: AI_MODEL,
            contents: expect.stringContaining('동료와 프로젝트를 완수했습니다.'),
            config: { responseMimeType: 'application/json' },
        });
    });

    it('uses a fallback model when the primary model is unavailable', async () => {
        mockGenerateContent
            .mockRejectedValueOnce(Object.assign(new Error('Model overloaded'), { status: 503 }))
            .mockResolvedValueOnce({ text: '["가장 어려웠던 문제는 무엇인가요?"]' });

        await expect(generateInterviewQuestions('자기소개서')).resolves.toEqual(['가장 어려웠던 문제는 무엇인가요?']);
        expect(mockGenerateContent.mock.calls.map(([parameters]) => parameters.model)).toEqual(getGeminiModels());
    });

    it('accepts a question array wrapped in a JSON code fence', async () => {
        mockGenerateContent.mockResolvedValue({ text: '```json\n["프로젝트 성과는 무엇인가요?"]\n```' });

        await expect(generateInterviewQuestions('자기소개서')).resolves.toEqual(['프로젝트 성과는 무엇인가요?']);
    });

    it.each([
        undefined,
        '',
        ' \n\t ',
        'not JSON',
        'null',
        '[]',
        '"질문 한 개"',
        '{"questions":["질문"]}',
        '["질문",42]',
        '["질문",null]',
        JSON.stringify(['질문', ' \n ']),
        '[""]',
    ])('returns an empty array for invalid questions (%p)', async responseText => {
        mockGenerateContent.mockResolvedValue({ text: responseText });

        await expect(generateInterviewQuestions('자기소개서')).resolves.toEqual([]);
    });

    it('keeps raw SDK errors and keys out of failure logs', async () => {
        const rawMessage = 'Request rejected: x-goog-api-key: test-interview-key; key=test-interview-key';
        mockGenerateContent.mockRejectedValue(Object.assign(new Error(rawMessage), { status: 403 }));

        await expect(generateInterviewQuestions('자기소개서')).resolves.toEqual([]);

        const logOutput = JSON.stringify([(logger.warn as jest.Mock).mock.calls, (logger.error as jest.Mock).mock.calls]);
        expect(logOutput).not.toContain('test-interview-key');
        expect(logOutput).not.toContain(rawMessage);
        expect(logger.error).toHaveBeenCalledWith('Interview Question Generation Error:', expect.any(String));
    });
});
