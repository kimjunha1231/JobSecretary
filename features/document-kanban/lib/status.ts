import { Status } from '@/entities/document';
import { STATUS_LABELS } from '@/shared/config';

// Re-export for convenience
export { STATUS_LABELS };

export const STATUS_BADGE_STYLES: Record<Status, string> = {
    writing: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    applied: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    interview: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    pass: 'bg-green-500/20 text-green-400 border border-green-500/30',
    fail: 'bg-red-500/20 text-red-400 border border-red-500/30'
};

export const COLUMN_GRADIENT_STYLES: Record<Status | 'result', string> = {
    writing: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    applied: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    interview: 'from-orange-500/20 to-yellow-500/20 border-orange-500/30',
    pass: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    fail: 'from-red-500/20 to-rose-500/20 border-red-500/30',
    result: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
};

export const COLUMN_TEXT_COLORS: Record<Status | 'result', string> = {
    writing: 'text-blue-300',
    applied: 'text-purple-300',
    interview: 'text-orange-300',
    pass: 'text-green-300',
    fail: 'text-red-300',
    result: 'text-emerald-300',
};

export function getStatusBadgeStyle(status: Status): string {
    return STATUS_BADGE_STYLES[status] || 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30';
}

export function getStatusLabel(status: Status): string {
    return STATUS_LABELS[status] || status;
}

export function getDDayBadgeStyle(dDay: string | null): string {
    if (!dDay) return '';

    if (dDay === 'D-Day' || dDay === '마감') {
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
    }

    if (dDay.startsWith('D-')) {
        const days = parseInt(dDay.replace('D-', '') || '0');
        if (days <= 3) {
            return 'bg-red-500/20 text-red-400 border border-red-500/30';
        }
    }

    return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
}
