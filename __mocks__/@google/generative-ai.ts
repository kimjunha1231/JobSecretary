/**
 * Mock Google Generative AI module for testing
 * Prevents ESM parsing issues and actual API calls
 */

export const GoogleGenerativeAI = jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
            response: {
                text: jest.fn().mockReturnValue('Mocked AI response'),
            },
        }),
        generateContentStream: jest.fn().mockResolvedValue({
            stream: {
                [Symbol.asyncIterator]: async function* () {
                    yield { text: () => 'Mocked ' };
                    yield { text: () => 'streaming ' };
                    yield { text: () => 'response' };
                },
            },
        }),
    }),
}));

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
