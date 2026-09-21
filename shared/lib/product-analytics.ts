'use client';

import { track } from '@vercel/analytics';

type ProductEvent =
    | { name: 'writing_studio_started'; properties: { question_count: number } }
    | { name: 'writing_studio_finalized'; properties: { question_count: number; duration_seconds?: number } }
    | { name: 'writing_studio_exported'; properties: { format: 'self_intro' } }
    | { name: 'writing_studio_step_completed'; properties: { step: 'evidence' | 'outline' | 'draft' | 'edit' } }
    | { name: 'writing_studio_choice'; properties: { choice: 'evidence_selected' | 'evidence_rejected' | 'evidence_locked' | 'outline_selected' | 'draft_selected' | 'paragraph_mixed' | 'draft_saved' } }
    | { name: 'blind_preference_responded'; properties: { selected_side: 'left' | 'right' } }
    | { name: 'career_exported'; properties: { format: 'resume' | 'portfolio' } }
    | { name: 'writing_studio_error'; properties: { operation: 'create_session' | 'finalize' | 'export' | 'blind_preference' } };

const ALLOWED_PROPERTY_KEYS = new Set([
    'question_count',
    'format',
    'step',
    'choice',
    'duration_seconds',
    'selected_side',
    'operation',
]);

function isPrimitive(value: unknown): value is string | number | boolean | null {
    return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/**
 * Product funnel telemetry deliberately accepts only aggregate, non-content values.
 * Never pass document text, company names, user IDs, URLs, or error messages here.
 */
export function trackProductEvent(event: ProductEvent): void {
    if (typeof window === 'undefined') return;
    const properties = Object.fromEntries(
        Object.entries(event.properties).filter(([key, value]) => ALLOWED_PROPERTY_KEYS.has(key) && isPrimitive(value)),
    );
    try {
        track(event.name, properties);
    } catch {
        // Analytics is optional and must never break writing or export actions.
    }
}
