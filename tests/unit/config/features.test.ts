import { isWritingStudioEnabled } from '@/shared/config/features';

describe('feature rollout switches', () => {
    const originalValue = process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED;

    afterEach(() => {
        if (originalValue === undefined) delete process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED;
        else process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED = originalValue;
    });

    it('keeps the writing studio enabled by default', () => {
        delete process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED;
        expect(isWritingStudioEnabled()).toBe(true);
    });

    it('disables the writing studio only for the explicit false value', () => {
        process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED = 'false';
        expect(isWritingStudioEnabled()).toBe(false);

        process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED = '0';
        expect(isWritingStudioEnabled()).toBe(true);
    });
});
