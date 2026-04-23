/**
 * 날짜 관련 공통 유틸리티
 */

export function getDDay(deadline?: string): string | null {
    if (!deadline) return null;
    const target = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diff = target.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return '마감';
    if (days === 0) return 'D-Day';
    return `D-${days}`;
}

export function formatDeadline(deadline?: string): string {
    if (!deadline) return '마감일 미정';
    return deadline.replace(/-/g, '.');
}

/**
 * 상대 날짜 포맷팅 (오늘, 어제 또는 YYYY.MM.DD)
 */
export function formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    
    yesterday.setDate(today.getDate() - 1);
    
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return '오늘';
    if (date.getTime() === yesterday.getTime()) return '어제';
    
    return dateString.replace(/-/g, '.');
}
