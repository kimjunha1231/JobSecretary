import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { JobTargetBoard } from '@/widgets/job-target-board/ui/job-target-board';

describe('JobTargetBoard recruitment source workflow', () => {
    afterEach(() => jest.restoreAllMocks());

    it('offers inline recruitment URL import and only lets approved source documents be selected', async () => {
        global.fetch = jest.fn(async input => {
            const url = String(input);
            if (url.startsWith('/api/job-targets?')) return { ok: true, json: async () => [] } as Response;
            if (url.startsWith('/api/source-documents?')) {
                return {
                    ok: true,
                    json: async () => [
                        {
                            id: 'approved-source',
                            kind: 'job_post',
                            title: '프론트엔드 채용공고',
                            status: 'approved',
                            createdAt: '2026-09-22T00:00:00.000Z',
                        },
                        {
                            id: 'pending-source',
                            kind: 'talent_page',
                            title: '인재상 페이지',
                            status: 'needs_review',
                            createdAt: '2026-09-22T00:00:00.000Z',
                        },
                    ],
                } as Response;
            }
            throw new Error(`Unexpected request: ${url}`);
        }) as unknown as typeof fetch;

        render(<JobTargetBoard />);

        expect(await screen.findByRole('checkbox', { name: /프론트엔드 채용공고.*검수 완료/ })).toBeInTheDocument();
        expect(screen.queryByRole('checkbox', { name: /인재상 페이지/ })).not.toBeInTheDocument();
        expect(await screen.findByText(/검수 또는 처리가 필요한 채용 자료 1개/)).toBeInTheDocument();

        fireEvent.click(screen.getByText('채용공고·인재상 링크 바로 가져오기'));
        const kindSelect = await screen.findByRole('combobox', { name: '자료 종류' }) as HTMLSelectElement;
        await waitFor(() => expect(kindSelect.value).toBe('job_post'));
        expect(Array.from(kindSelect.options).map(option => option.value)).toEqual(['job_post', 'talent_page']);
        expect(screen.getByRole('radio', { name: '웹페이지 URL' })).toHaveAttribute('aria-checked', 'true');
    });
});
