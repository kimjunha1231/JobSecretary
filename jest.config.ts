import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
    coverageProvider: 'v8',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        // Mock ESM modules that Jest can't parse
        '^@google/generative-ai$': '<rootDir>/__mocks__/@google/generative-ai.ts',
        '^@google/genai$': '<rootDir>/__mocks__/@google/genai.ts',
        '^@react-pdf/renderer$': '<rootDir>/__mocks__/@react-pdf/renderer.ts',
        '^@react-pdf/primitives$': '<rootDir>/__mocks__/@react-pdf/primitives.ts',
    },
    testMatch: ['<rootDir>/tests/unit/**/*.test.{ts,tsx}'],
    testPathIgnorePatterns: ['<rootDir>/tests/e2e/'],
    // Module directories for resolving
    moduleDirectories: ['node_modules', '<rootDir>'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
