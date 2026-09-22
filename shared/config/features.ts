/**
 * Public rollout switches are evaluated at build time by Next.js.
 * Keeping the default enabled preserves the current behavior for existing deployments.
 */
export function isWritingStudioEnabled(): boolean {
    return process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED !== 'false';
}
