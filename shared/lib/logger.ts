type LogLevel = 'info' | 'warn' | 'error';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
    info: (message: string, ...args: unknown[]) => {
        if (!isProduction) {

        }
    },
    warn: (message: string, ...args: unknown[]) => {
        if (!isProduction) {

        }
    },
    error: (message: string, error?: unknown) => {

    }
};
