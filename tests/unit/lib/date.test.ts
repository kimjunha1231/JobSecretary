import { getDDay, formatDeadline } from '@/features/document-kanban/lib/date';

describe('date utilities', () => {
    describe('getDDay', () => {
        beforeEach(() => {
            // Mock current date to 2024-06-15 for consistent testing
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2024-06-15'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return null for undefined deadline', () => {
            expect(getDDay(undefined)).toBeNull();
        });

        it('should return null for empty string deadline', () => {
            expect(getDDay('')).toBeNull();
        });

        it('should return "D-Day" for today', () => {
            expect(getDDay('2024-06-15')).toBe('D-Day');
        });

        it('should return "마감" for past dates', () => {
            expect(getDDay('2024-06-14')).toBe('마감');
            expect(getDDay('2024-06-01')).toBe('마감');
            expect(getDDay('2024-01-01')).toBe('마감');
        });

        it('should return "D-1" for tomorrow', () => {
            expect(getDDay('2024-06-16')).toBe('D-1');
        });

        it('should return correct D-day for future dates', () => {
            expect(getDDay('2024-06-17')).toBe('D-2');
            expect(getDDay('2024-06-18')).toBe('D-3');
            expect(getDDay('2024-06-22')).toBe('D-7');
            expect(getDDay('2024-07-15')).toBe('D-30');
        });
    });

    describe('formatDeadline', () => {
        it('should format date with dots', () => {
            expect(formatDeadline('2024-06-15')).toBe('2024.06.15');
            expect(formatDeadline('2024-12-31')).toBe('2024.12.31');
        });

        it('should return "마감일 미정" for undefined', () => {
            expect(formatDeadline(undefined)).toBe('마감일 미정');
        });

        it('should return "마감일 미정" for empty string', () => {
            expect(formatDeadline('')).toBe('마감일 미정');
        });
    });
});
