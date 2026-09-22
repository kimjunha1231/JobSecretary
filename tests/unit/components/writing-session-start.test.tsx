import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WritingSessionStart } from '@/widgets/writing-studio/ui/writing-session-start';

jest.mock('@/shared/lib/product-analytics', () => ({ trackProductEvent: jest.fn() }));
jest.mock('@/shared/lib/writing-session-timing', () => ({ markWritingSessionStarted: jest.fn() }));
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    useSearchParams: jest.fn(),
}));

const mockedUseRouter = useRouter as jest.Mock;
const mockedUseSearchParams = useSearchParams as jest.Mock;
const push = jest.fn();

describe('WritingSessionStart career profile choice', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedUseRouter.mockReturnValue({ push });
        mockedUseSearchParams.mockReturnValue(new URLSearchParams());
        global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url.startsWith('/api/job-targets')) {
                return { ok: true, json: async () => [{ id: 'target-1', company: '예시 회사', role: '개발자' }] } as Response;
            }
            if (url === '/api/style-profiles') return { ok: true, json: async () => [] } as Response;
            if (url === '/api/career-profiles/me') {
                return { ok: true, json: async () => ({ profile: { headline: '프론트엔드 개발자', summary: '', skills: [] } }) } as Response;
            }
            if (url === '/api/writing-sessions' && init?.method === 'POST') {
                return { ok: true, json: async () => ({ session: { id: 'session-1' } }) } as Response;
            }
            throw new Error(`Unexpected request: ${url}`);
        }) as unknown as typeof fetch;
    });

    afterEach(() => jest.restoreAllMocks());

    it('leaves profile context off by default and sends only the explicit opt-in flag', async () => {
        render(<WritingSessionStart />);

        const checkbox = await screen.findByRole('checkbox', { name: /내 직무 소개·요약·핵심 기술/ });
        expect(checkbox).not.toBeChecked();
        await waitFor(() => expect(checkbox).toBeEnabled());
        await waitFor(() => expect(screen.getByRole('button', { name: '작성 작업대 열기' })).toBeEnabled());

        fireEvent.change(screen.getByPlaceholderText(/지원한 직무를 수행하기 위해 준비해 온 과정/), {
            target: { value: '문제를 해결한 경험을 적어 주세요.' },
        });
        fireEvent.click(screen.getByRole('button', { name: '작성 작업대 열기' }));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/writing-sessions', expect.objectContaining({ method: 'POST' })));
        const fetchMock = global.fetch as jest.Mock;
        const request = fetchMock.mock.calls.find(([url]) => String(url) === '/api/writing-sessions')?.[1] as RequestInit;
        expect(JSON.parse(request.body as string)).toEqual(expect.objectContaining({ includeCareerProfile: false }));

        fireEvent.click(checkbox);
        fireEvent.click(screen.getByRole('button', { name: '작성 작업대 열기' }));
        await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/writing-sessions')).toHaveLength(2));
        const optedInRequest = fetchMock.mock.calls.filter(([url]) => String(url) === '/api/writing-sessions')[1]?.[1] as RequestInit;
        expect(JSON.parse(optedInRequest.body as string)).toEqual(expect.objectContaining({ includeCareerProfile: true }));
        expect(push).toHaveBeenLastCalledWith('/writing/session-1');
    });

    it('keeps ordinary writing available and disables profile context until profile guidance exists', async () => {
        global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url.startsWith('/api/job-targets')) {
                return { ok: true, json: async () => [{ id: 'target-1', company: '예시 회사', role: '개발자' }] } as Response;
            }
            if (url === '/api/style-profiles') return { ok: true, json: async () => [] } as Response;
            if (url === '/api/career-profiles/me') return { ok: true, json: async () => ({ profile: null }) } as Response;
            if (url === '/api/writing-sessions' && init?.method === 'POST') {
                return { ok: true, json: async () => ({ session: { id: 'session-1' } }) } as Response;
            }
            throw new Error(`Unexpected request: ${url}`);
        }) as unknown as typeof fetch;

        render(<WritingSessionStart />);

        const checkbox = await screen.findByRole('checkbox', { name: /내 직무 소개·요약·핵심 기술/ });
        expect(checkbox).toBeDisabled();
        expect(screen.getByRole('link', { name: '프로필 입력하기' })).toHaveAttribute('href', '/career#career-profile-title');

        fireEvent.change(screen.getByPlaceholderText(/지원한 직무를 수행하기 위해 준비해 온 과정/), {
            target: { value: '문제를 해결한 경험을 적어 주세요.' },
        });
        fireEvent.click(screen.getByRole('button', { name: '작성 작업대 열기' }));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/writing-sessions', expect.objectContaining({ method: 'POST' })));
        const request = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url) === '/api/writing-sessions')?.[1] as RequestInit;
        expect(JSON.parse(request.body as string)).toEqual(expect.objectContaining({ includeCareerProfile: false }));
    });

    it('does not block regular writing when profile storage is unavailable', async () => {
        global.fetch = jest.fn(async input => {
            const url = String(input);
            if (url.startsWith('/api/job-targets')) {
                return { ok: true, json: async () => [{ id: 'target-1', company: '예시 회사', role: '개발자' }] } as Response;
            }
            if (url === '/api/style-profiles') return { ok: true, json: async () => [] } as Response;
            if (url === '/api/career-profiles/me') return { ok: false, status: 503, json: async () => ({ error: 'unavailable' }) } as Response;
            throw new Error(`Unexpected request: ${url}`);
        }) as unknown as typeof fetch;

        render(<WritingSessionStart />);

        expect(await screen.findByRole('checkbox', { name: /내 직무 소개·요약·핵심 기술/ })).toBeDisabled();
        expect(screen.getByText(/일반 작성은 가능하며, 나중에 다시 확인해 주세요/)).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: '작성 작업대 열기' })).toBeEnabled();
    });

    it('does not wait for the optional profile check before enabling the writing form', async () => {
        global.fetch = jest.fn(async input => {
            const url = String(input);
            if (url.startsWith('/api/job-targets')) {
                return { ok: true, json: async () => [{ id: 'target-1', company: '예시 회사', role: '개발자' }] } as Response;
            }
            if (url === '/api/style-profiles') return { ok: true, json: async () => [] } as Response;
            if (url === '/api/career-profiles/me') return await new Promise<Response>(() => {});
            throw new Error(`Unexpected request: ${url}`);
        }) as unknown as typeof fetch;

        render(<WritingSessionStart />);

        await waitFor(() => expect(screen.getByRole('button', { name: '작성 작업대 열기' })).toBeEnabled());
        expect(screen.getByRole('checkbox', { name: /내 직무 소개·요약·핵심 기술/ })).toBeDisabled();
        expect(screen.getByText(/프로필 참고 기능을 확인하는 중입니다. 일반 작성은 그대로 진행할 수 있습니다/)).toBeInTheDocument();
    });
});
