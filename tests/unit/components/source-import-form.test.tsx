import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SourceImportForm } from '@/features/source-ingestion/ui/source-import-form';

describe('SourceImportForm configuration', () => {
    afterEach(() => jest.restoreAllMocks());

    it('restricts job analysis imports to recruitment materials and starts on URL mode', async () => {
        const onCreated = jest.fn();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ document: { id: 'source-1', kind: 'job_post' } }),
        }) as unknown as typeof fetch;

        render(
            <SourceImportForm
                allowedKinds={['job_post', 'talent_page']}
                initialKind="job_post"
                initialMode="url"
                onCreated={onCreated}
            />,
        );

        const kindSelect = screen.getByRole('combobox', { name: '자료 종류' }) as HTMLSelectElement;
        expect(kindSelect.value).toBe('job_post');
        expect(Array.from(kindSelect.options).map(option => option.value)).toEqual(['job_post', 'talent_page']);
        expect(screen.getByRole('radio', { name: '웹페이지 URL' })).toHaveAttribute('aria-checked', 'true');

        fireEvent.change(screen.getByRole('textbox', { name: /채용공고·인재상·포트폴리오 URL/ }), {
            target: { value: 'https://careers.example.com/frontend' },
        });
        fireEvent.click(screen.getByRole('button', { name: '자료 등록' }));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/source-documents', expect.objectContaining({ method: 'POST' })));
        const request = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit;
        expect(JSON.parse(request.body as string)).toEqual({
            kind: 'job_post',
            title: '',
            originType: 'url',
            sourceUrl: 'https://careers.example.com/frontend',
        });
        expect(onCreated).toHaveBeenCalledWith({ id: 'source-1', kind: 'job_post' });
    });

    it('preserves the career library defaults when no options are passed', () => {
        render(<SourceImportForm />);

        expect((screen.getByRole('combobox', { name: '자료 종류' }) as HTMLSelectElement).value).toBe('portfolio');
        expect(screen.getByRole('radio', { name: '파일 업로드' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('combobox', { name: '자료 종류' }).querySelectorAll('option')).toHaveLength(7);
    });
});
