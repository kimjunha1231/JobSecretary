import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CareerActivityBoard } from '@/widgets/career-activity-board/ui/career-activity-board';

jest.mock('@/shared/lib/product-analytics', () => ({
    trackProductEvent: jest.fn(),
}));

const activity = {
    record: {
        id: '11111111-1111-4111-8111-111111111111',
        status: 'approved',
        action: '검색 흐름을 개선했습니다.',
        result: '탐색 시간을 줄였습니다.',
        learning: '사용자 흐름을 먼저 확인했습니다.',
        metrics: [],
        skills: ['Next.js'],
        revisionNumber: 1,
        version: 1,
        createdAt: '2026-09-22T00:00:00.000Z',
    },
    careerItem: {
        id: '22222222-2222-4222-8222-222222222222',
        kind: 'project',
        title: '검색 서비스 개선',
        organization: '예시 회사',
        role: '프론트엔드 개발',
        startedAt: '2025.01',
        endedAt: '2025.03',
        isCurrent: false,
        summary: '검색 경험을 개선한 프로젝트입니다.',
        contributionNote: '검색 결과 화면을 구현했습니다.',
        version: 1,
        status: 'approved',
    },
    sourceFragmentCount: 0,
};

describe('CareerActivityBoard', () => {
    beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => [activity],
        }) as unknown as typeof fetch;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('keeps PDF selection empty until the user explicitly checks an activity', async () => {
        render(<CareerActivityBoard />);

        const checkbox = await screen.findByRole('checkbox', { name: /검색 서비스 개선 PDF 포함/ });
        const portfolioLink = screen.getByText('포트폴리오 PDF').closest('a');
        expect(portfolioLink).not.toBeNull();

        expect(checkbox).not.toBeChecked();
        expect(portfolioLink).not.toHaveAttribute('href');

        fireEvent.click(checkbox);

        await waitFor(() => expect(portfolioLink).toHaveAttribute('href', expect.stringContaining('ids=11111111-1111-4111-8111-111111111111')));
        expect(checkbox).toBeChecked();
    });

    it('prevents refreshing the activity list while an edit is open', async () => {
        const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [activity] });
        global.fetch = fetchMock as unknown as typeof fetch;
        render(<CareerActivityBoard />);

        fireEvent.click(await screen.findByRole('button', { name: '검색 서비스 개선 활동 수정' }));

        const refreshButton = screen.getByRole('button', { name: '새로고침' });
        expect(refreshButton).toBeDisabled();
        expect(screen.getByDisplayValue(activity.careerItem.title)).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('편집 중인 내용을 보호하기 위해');

        fireEvent.click(refreshButton);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(screen.getByDisplayValue(activity.careerItem.title)).toBeInTheDocument();
    });

    it('prevents opening an edit while refreshing the activity list', async () => {
        let finishRefresh!: (response: { ok: boolean; json: () => Promise<typeof activity[]> }) => void;
        const refreshResponse = new Promise<{ ok: boolean; json: () => Promise<typeof activity[]> }>(resolve => {
            finishRefresh = resolve;
        });
        const fetchMock = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => [activity] })
            .mockReturnValueOnce(refreshResponse);
        global.fetch = fetchMock as unknown as typeof fetch;
        render(<CareerActivityBoard />);

        const editButton = await screen.findByRole('button', { name: '검색 서비스 개선 활동 수정' });
        fireEvent.click(screen.getByRole('button', { name: '새로고침' }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        expect(editButton).toBeDisabled();

        await act(async () => {
            finishRefresh({ ok: true, json: async () => [activity] });
            await refreshResponse;
        });
        await waitFor(() => expect(screen.getByRole('button', { name: '검색 서비스 개선 활동 수정' })).toBeEnabled());
    });

    it('adds a credential from the career activity organizer and refreshes the list', async () => {
        const credentialActivity = {
            ...activity,
            record: { ...activity.record, id: '44444444-4444-4444-8444-444444444444' },
            careerItem: {
                ...activity.careerItem,
                kind: 'credential',
                title: 'TOEIC Speaking',
                organization: '시험 기관',
            },
        };
        const fetchMock = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({ ok: true, json: async () => credentialActivity });
        global.fetch = fetchMock as unknown as typeof fetch;
        render(<CareerActivityBoard />);

        fireEvent.click(await screen.findByRole('button', { name: '활동 직접 추가' }));
        fireEvent.change(screen.getByLabelText('활동 종류'), { target: { value: 'credential' } });
        fireEvent.change(screen.getByLabelText(/자격증·시험명/), { target: { value: 'TOEIC Speaking' } });
        fireEvent.change(screen.getByLabelText(/점수·등급·결과/), { target: { value: 'IH' } });
        fireEvent.click(screen.getByRole('button', { name: '활동 저장' }));

        await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/evidence-records', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"kind":"credential"'),
        })));
        expect(await screen.findByText('TOEIC Speaking')).toBeInTheDocument();
        expect(screen.getAllByText('자격·어학')).toHaveLength(2);
        expect(screen.getByRole('option', { name: '자격·어학' })).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('keeps the manual entry open and reports API errors', async () => {
        const fetchMock = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({ ok: false, json: async () => ({ error: '저장할 수 없습니다.' }) });
        global.fetch = fetchMock as unknown as typeof fetch;
        render(<CareerActivityBoard />);

        fireEvent.click(await screen.findByRole('button', { name: '활동 직접 추가' }));
        const title = screen.getByLabelText(/활동명/);
        fireEvent.change(title, { target: { value: '검색 개선' } });
        fireEvent.change(screen.getByLabelText(/활동 요약/), { target: { value: '검색 흐름을 개선했습니다.' } });
        fireEvent.click(screen.getByRole('button', { name: '활동 저장' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('저장할 수 없습니다.');
        expect(screen.getByLabelText(/활동명/)).toHaveValue('검색 개선');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('prefills an authored activity, patches it, and reflects the saved version', async () => {
        const updatedActivity = {
            ...activity,
            record: { ...activity.record, action: '필터 UI를 추가했습니다.', version: 2 },
            careerItem: { ...activity.careerItem, title: '검색 서비스 필터 개선', version: 2 },
        };
        const fetchMock = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => [activity] })
            .mockResolvedValueOnce({ ok: true, json: async () => updatedActivity });
        global.fetch = fetchMock as unknown as typeof fetch;
        render(<CareerActivityBoard />);

        fireEvent.click(await screen.findByRole('button', { name: '검색 서비스 개선 활동 수정' }));
        expect(screen.getByLabelText(/활동명/)).toHaveValue('검색 서비스 개선');
        expect(screen.getByLabelText(/현재 진행 중/)).not.toBeChecked();
        fireEvent.change(screen.getByLabelText(/활동명/), { target: { value: '검색 서비스 필터 개선' } });
        fireEvent.change(screen.getByLabelText(/내가 한 일/), { target: { value: '필터 UI를 추가했습니다.' } });
        fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));

        expect(await screen.findByText(/활동을 새 버전으로 수정했습니다/)).toBeInTheDocument();
        expect(await screen.findByText('검색 서비스 필터 개선')).toBeInTheDocument();
        expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/evidence-records/${activity.record.id}`, expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('검색 서비스 필터 개선'),
        }));
        expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(expect.objectContaining({
            isCurrent: false,
            action: '필터 UI를 추가했습니다.',
            expectedRecordVersion: activity.record.version,
            expectedCareerVersion: activity.careerItem.version,
        }));
    });

    it('allows editing a source-linked activity and explains that citations stay on the previous version', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ ...activity, sourceFragmentCount: 2 }],
        }) as unknown as typeof fetch;
        render(<CareerActivityBoard />);

        expect(await screen.findByText(/원본 근거 2개 연결/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '검색 서비스 개선 활동 수정' }));
        expect(screen.getByLabelText(/활동명/)).toHaveValue('검색 서비스 개선');
        expect(screen.getByText(/새 버전에는 복사되지 않습니다/)).toBeInTheDocument();
    });

    it('shows revision history without quote text and restores a prior version as a new activity', async () => {
        const priorVersion = {
            record: {
                ...activity.record,
                id: '33333333-3333-4333-8333-333333333333',
                revisionNumber: 1,
                status: 'superseded',
                action: '이전 행동 내용입니다.',
                createdAt: '2026-09-20T00:00:00.000Z',
            },
            careerItemSnapshot: { ...activity.careerItem, title: '이전 활동 이름' },
            sourceFragmentCount: 1,
        };
        const restoredActivity = {
            ...activity,
            record: { ...activity.record, id: '44444444-4444-4444-8444-444444444444', revisionNumber: 3, action: '이전 행동 내용입니다.' },
            careerItem: { ...activity.careerItem, title: '이전 활동 이름' },
            sourceFragmentCount: 1,
        };
        const fetchMock = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => [activity] })
            .mockResolvedValueOnce({ ok: true, json: async () => [activity, priorVersion] })
            .mockResolvedValueOnce({ ok: true, json: async () => restoredActivity });
        global.fetch = fetchMock as unknown as typeof fetch;
        render(<CareerActivityBoard />);

        fireEvent.click(await screen.findByRole('button', { name: '검색 서비스 개선 버전 기록' }));
        expect(await screen.findByText('이전 행동 내용입니다.')).toBeInTheDocument();
        expect(screen.getByText('원본 인용 문구는 이 목록에 표시하지 않습니다.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'v1 버전으로 복원' }));

        expect(await screen.findByRole('status')).toHaveTextContent('선택한 이전 내용을 새 활동 버전으로 복원했습니다.');
        expect(screen.getByText('이전 활동 이름')).toBeInTheDocument();
        expect(fetchMock).toHaveBeenNthCalledWith(3, `/api/evidence-records/${activity.record.id}/restore`, expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ revisionId: priorVersion.record.id }),
        }));
    });

    it('archives an activity and restores it from the archive without offering PDF selection there', async () => {
        const archivedActivity = {
            ...activity,
            record: { ...activity.record, status: 'archived' },
            careerItem: { ...activity.careerItem, status: 'archived' },
        };
        const fetchMock = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => [activity] })
            .mockResolvedValueOnce({ ok: true, json: async () => archivedActivity })
            .mockResolvedValueOnce({ ok: true, json: async () => [archivedActivity] })
            .mockResolvedValueOnce({ ok: true, json: async () => activity })
            .mockResolvedValueOnce({ ok: true, json: async () => [activity] });
        global.fetch = fetchMock as unknown as typeof fetch;
        render(<CareerActivityBoard />);

        fireEvent.click(await screen.findByRole('button', { name: '검색 서비스 개선 활동 보관' }));
        expect(await screen.findByRole('status')).toHaveTextContent('활동을 보관했습니다.');
        expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/evidence-records/${activity.record.id}/status`, expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ status: 'archived' }),
        }));
        expect(screen.queryByText('검색 서비스 개선')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '보관함 보기' }));
        expect(await screen.findByRole('button', { name: '검색 서비스 개선 활동 복원' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: '포트폴리오 PDF' })).not.toBeInTheDocument();
        expect(screen.queryByLabelText('검색 서비스 개선 PDF 포함')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '검색 서비스 개선 활동 복원' }));
        expect(await screen.findByRole('status')).toHaveTextContent('활동을 복원했습니다.');
        expect(fetchMock).toHaveBeenNthCalledWith(4, `/api/evidence-records/${activity.record.id}/status`, expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ status: 'approved' }),
        }));

        fireEvent.click(screen.getByRole('button', { name: '승인된 활동 보기' }));
        expect(await screen.findByText('검색 서비스 개선')).toBeInTheDocument();
        expect(fetchMock).toHaveBeenLastCalledWith('/api/evidence-records?limit=100&status=approved', { cache: 'no-store' });
    });
});
