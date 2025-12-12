type LogLevel = 'info' | 'warn' | 'error';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
    info: (message: string, ...args: unknown[]) => {
        if (!isProduction) {
            console.log(`[INFO] ${message}`, ...args);
        }
    },
    warn: (message: string, ...args: unknown[]) => {
        if (!isProduction) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    },
    error: (message: string, error?: unknown) => {
        // In production, you might want to send this to Sentry/Datadog
        console.error(`[ERROR] ${message}`, error);
    }
};
