import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CareerProfileEditor } from '@/widgets/career-profile-editor/ui/career-profile-editor';

describe('CareerProfileEditor', () => {
    beforeEach(() => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ profile: null }),
            }) as unknown as typeof fetch;
    });

    afterEach(() => jest.restoreAllMocks());

    it('loads, edits, and saves profile fields and comma/newline-separated skills', async () => {
        render(<CareerProfileEditor />);

        const name = await screen.findByRole('textbox', { name: '이름' });
        fireEvent.change(name, { target: { value: '김준하' } });
        fireEvent.change(screen.getByRole('textbox', { name: '핵심 기술' }), { target: { value: 'TypeScript, Next.js\nSupabase' } });

        const fetchMock = global.fetch as jest.Mock;
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ profile: { fullName: '김준하', skills: ['TypeScript', 'Next.js', 'Supabase'] } }),
        });
        fireEvent.click(screen.getByRole('button', { name: '프로필 저장' }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        const [, request] = fetchMock.mock.calls[1] as [string, RequestInit];
        expect(request.method).toBe('PUT');
        expect(JSON.parse(request.body as string)).toEqual(expect.objectContaining({
            fullName: '김준하',
            skills: ['TypeScript', 'Next.js', 'Supabase'],
        }));
        expect(await screen.findByText('이력서 프로필을 저장했습니다.')).toBeInTheDocument();
    });

    it('explains when the profile migration has not been applied', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 503,
            json: async () => ({ error: '프로필 저장 기능은 Supabase 프로필 마이그레이션 적용 후 사용할 수 있습니다.' }),
        }) as unknown as typeof fetch;

        render(<CareerProfileEditor />);

        expect(await screen.findByRole('alert')).toHaveTextContent('Supabase 프로필 마이그레이션 적용 후');
    });
});
