'use client';

const STORAGE_PREFIX = 'jobsecretary:writing-studio-started-at:';
const MAX_DURATION_SECONDS = 24 * 60 * 60;

function storageKey(sessionId: string): string {
    return `${STORAGE_PREFIX}${sessionId}`;
}

function getSessionStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

function isValidSessionId(sessionId: string): boolean {
    return typeof sessionId === 'string' && sessionId.trim().length > 0 && sessionId.length <= 200;
}

export function markWritingSessionStarted(sessionId: string, now = Date.now()): void {
    if (!isValidSessionId(sessionId) || !Number.isFinite(now) || now < 0) return;
    const storage = getSessionStorage();
    if (!storage) return;
    try {
        storage.setItem(storageKey(sessionId), String(Math.floor(now)));
    } catch {
        // Timing is optional telemetry and must never block the writing flow.
    }
}

export function ensureWritingSessionStarted(sessionId: string, now = Date.now()): void {
    if (!isValidSessionId(sessionId)) return;
    const storage = getSessionStorage();
    if (!storage) return;
    try {
        const existing = Number(storage.getItem(storageKey(sessionId)));
        if (Number.isFinite(existing) && existing >= 0 && existing <= now) return;
    } catch {
        // Fall through and attempt to establish a fresh timestamp.
    }
    markWritingSessionStarted(sessionId, now);
}

export function getWritingSessionDurationSeconds(sessionId: string, now = Date.now()): number | undefined {
    if (!isValidSessionId(sessionId) || !Number.isFinite(now) || now < 0) return undefined;
    const storage = getSessionStorage();
    if (!storage) return undefined;
    try {
        const startedAt = Number(storage.getItem(storageKey(sessionId)));
        if (!Number.isFinite(startedAt) || startedAt < 0 || startedAt > now) return undefined;
        return Math.min(MAX_DURATION_SECONDS, Math.max(0, Math.round((now - startedAt) / 1_000)));
    } catch {
        return undefined;
    }
}

export function clearWritingSessionStarted(sessionId: string): void {
    if (!isValidSessionId(sessionId)) return;
    const storage = getSessionStorage();
    if (!storage) return;
    try {
        storage.removeItem(storageKey(sessionId));
    } catch {
        // Timing is optional telemetry and must never block the writing flow.
    }
}
