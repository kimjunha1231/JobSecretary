/**
 * Mock @google/genai module for testing
 * This is a different package from @google/generative-ai
 */

export const GoogleGenAI = jest.fn().mockImplementation(() => ({
    models: {
        generateContent: jest.fn().mockResolvedValue({
            text: 'Mocked AI response',
        }),
    },
}));

export class ApiError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

// Export all named exports from the module
export const ActivityHandling = {};
export const AdapterSize = {};
export const ApiSpec = {};
export const AuthType = {};
export const Batches = {};
export const Behavior = {};
export const BlockedReason = {};
export const Caches = {};
export const Chat = {};
export const Chats = {};
export const HarmCategory = {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
};
export const HarmBlockThreshold = {
    BLOCK_NONE: 'BLOCK_NONE',
    BLOCK_LOW_AND_ABOVE: 'BLOCK_LOW_AND_ABOVE',
    BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
    BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
};
