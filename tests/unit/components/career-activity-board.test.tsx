import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    },
    careerItem: {
        id: '22222222-2222-4222-8222-222222222222',
        kind: 'project',
        title: '검색 서비스 개선',
        organization: '예시 회사',
        role: '프론트엔드 개발',
        summary: '검색 경험을 개선한 프로젝트입니다.',
        contributionNote: '검색 결과 화면을 구현했습니다.',
        version: 1,
        status: 'approved',
    },
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
});
