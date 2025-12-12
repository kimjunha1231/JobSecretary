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
    return deadline ? deadline.replace(/-/g, '.') : '마감일 미정';
}
