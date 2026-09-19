import { redirect } from 'next/navigation';
import WritingSessionNewPage from '@/app/(pages)/writing/new/page';

jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/widgets/writing-studio', () => ({ WritingSessionStart: () => null }));

const mockedRedirect = redirect as unknown as jest.Mock;

describe('writing session entry page', () => {
    const originalValue = process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED;

    afterEach(() => {
        jest.clearAllMocks();
        if (originalValue === undefined) delete process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED;
        else process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED = originalValue;
    });

    it('redirects direct access to the legacy writer when rollout is disabled', () => {
        process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED = 'false';

        WritingSessionNewPage();

        expect(mockedRedirect).toHaveBeenCalledWith('/write');
    });

    it('renders the new writer when rollout is enabled', () => {
        delete process.env.NEXT_PUBLIC_WRITING_STUDIO_ENABLED;

        const result = WritingSessionNewPage();

        expect(mockedRedirect).not.toHaveBeenCalled();
        expect(result).toBeTruthy();
    });
});
