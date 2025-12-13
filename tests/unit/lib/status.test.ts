import {
    getStatusBadgeStyle,
    getStatusLabel,
    getDDayBadgeStyle,
    STATUS_BADGE_STYLES,
    COLUMN_GRADIENT_STYLES,
    COLUMN_TEXT_COLORS,
} from '@/features/document-kanban/lib/status';
import { Status } from '@/shared/types';

describe('status utilities', () => {
    describe('getStatusBadgeStyle', () => {
        it('should return correct style for "writing" status', () => {
            expect(getStatusBadgeStyle('writing')).toContain('blue');
        });

        it('should return correct style for "applied" status', () => {
            expect(getStatusBadgeStyle('applied')).toContain('purple');
        });

        it('should return correct style for "interview" status', () => {
            expect(getStatusBadgeStyle('interview')).toContain('orange');
        });

        it('should return correct style for "pass" status', () => {
            expect(getStatusBadgeStyle('pass')).toContain('green');
        });

        it('should return correct style for "fail" status', () => {
            expect(getStatusBadgeStyle('fail')).toContain('red');
        });

        it('should return fallback style for unknown status', () => {
            const result = getStatusBadgeStyle('unknown' as Status);
            expect(result).toContain('zinc');
        });
    });

    describe('getStatusLabel', () => {
        it('should return Korean label for "writing"', () => {
            expect(getStatusLabel('writing')).toBe('작성 중');
        });

        it('should return Korean label for "applied"', () => {
            expect(getStatusLabel('applied')).toBe('지원 완료');
        });

        it('should return Korean label for "interview"', () => {
            expect(getStatusLabel('interview')).toBe('면접');
        });

        it('should return Korean label for "pass"', () => {
            expect(getStatusLabel('pass')).toBe('합격');
        });

        it('should return Korean label for "fail"', () => {
            expect(getStatusLabel('fail')).toBe('불합격');
        });

        it('should return the status itself for unknown status', () => {
            expect(getStatusLabel('custom' as Status)).toBe('custom');
        });
    });

    describe('getDDayBadgeStyle', () => {
        it('should return empty string for null', () => {
            expect(getDDayBadgeStyle(null)).toBe('');
        });

        it('should return urgent style for "D-Day"', () => {
            const result = getDDayBadgeStyle('D-Day');
            expect(result).toContain('red');
        });

        it('should return urgent style for "마감"', () => {
            const result = getDDayBadgeStyle('마감');
            expect(result).toContain('red');
        });

        it('should return urgent style for D-1, D-2, D-3', () => {
            expect(getDDayBadgeStyle('D-1')).toContain('red');
            expect(getDDayBadgeStyle('D-2')).toContain('red');
            expect(getDDayBadgeStyle('D-3')).toContain('red');
        });

        it('should return normal style for D-4 and beyond', () => {
            expect(getDDayBadgeStyle('D-4')).toContain('orange');
            expect(getDDayBadgeStyle('D-7')).toContain('orange');
            expect(getDDayBadgeStyle('D-30')).toContain('orange');
        });
    });

    describe('exported constants', () => {
        it('should have all statuses in STATUS_BADGE_STYLES', () => {
            const expectedStatuses: Status[] = ['writing', 'applied', 'interview', 'pass', 'fail'];
            expectedStatuses.forEach(status => {
                expect(STATUS_BADGE_STYLES[status]).toBeDefined();
            });
        });

        it('should have all statuses in COLUMN_GRADIENT_STYLES', () => {
            const expectedKeys = ['writing', 'applied', 'interview', 'pass', 'fail', 'result'];
            expectedKeys.forEach(key => {
                expect(COLUMN_GRADIENT_STYLES[key as Status | 'result']).toBeDefined();
            });
        });

        it('should have all statuses in COLUMN_TEXT_COLORS', () => {
            const expectedKeys = ['writing', 'applied', 'interview', 'pass', 'fail', 'result'];
            expectedKeys.forEach(key => {
                expect(COLUMN_TEXT_COLORS[key as Status | 'result']).toBeDefined();
            });
        });
    });
});
