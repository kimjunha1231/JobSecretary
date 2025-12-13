import { logger } from '@/shared/lib/logger';

describe('logger', () => {
    const consoleSpy = {
        log: jest.spyOn(console, 'log').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
        error: jest.spyOn(console, 'error').mockImplementation(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        consoleSpy.log.mockRestore();
        consoleSpy.warn.mockRestore();
        consoleSpy.error.mockRestore();
    });

    // Note: NODE_ENV is evaluated at module load time, so we test current behavior
    // The logger is loaded in 'test' environment which behaves like development

    describe('in test/development environment', () => {
        it('should log info messages', () => {
            logger.info('Test info message', { data: 'test' });
            expect(consoleSpy.log).toHaveBeenCalledWith(
                '[INFO] Test info message',
                { data: 'test' }
            );
        });

        it('should log warn messages', () => {
            logger.warn('Test warning message', 'extra arg');
            expect(consoleSpy.warn).toHaveBeenCalledWith(
                '[WARN] Test warning message',
                'extra arg'
            );
        });

        it('should log error messages', () => {
            const error = new Error('Test error');
            logger.error('Test error message', error);
            expect(consoleSpy.error).toHaveBeenCalledWith(
                '[ERROR] Test error message',
                error
            );
        });
    });

    describe('error logging', () => {
        it('should ALWAYS log error messages regardless of environment', () => {
            jest.clearAllMocks();
            const error = new Error('Critical error');
            logger.error('Critical failure', error);
            expect(consoleSpy.error).toHaveBeenCalledWith(
                '[ERROR] Critical failure',
                error
            );
        });

        it('should handle undefined error in error logging', () => {
            logger.error('Error without error object');
            expect(consoleSpy.error).toHaveBeenCalledWith(
                '[ERROR] Error without error object',
                undefined
            );
        });
    });

    describe('edge cases', () => {
        it('should handle multiple arguments in info', () => {
            logger.info('Multiple args', 1, 'two', { three: 3 });
            expect(consoleSpy.log).toHaveBeenCalledWith(
                '[INFO] Multiple args',
                1,
                'two',
                { three: 3 }
            );
        });

        it('should handle empty message', () => {
            logger.info('');
            expect(consoleSpy.log).toHaveBeenCalledWith('[INFO] ');
        });

        it('should handle complex objects as args', () => {
            const complexObj = { nested: { deep: { value: 42 } } };
            logger.info('Complex object', complexObj);
            expect(consoleSpy.log).toHaveBeenCalledWith(
                '[INFO] Complex object',
                complexObj
            );
        });
    });
});
