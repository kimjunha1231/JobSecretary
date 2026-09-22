import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ManualCareerEntryForm } from '@/features/manual-career-entry';

describe('ManualCareerEntryForm', () => {
    it('shows credential-specific fields and submits typed metadata', async () => {
        const onSubmit = jest.fn().mockResolvedValue(true);
        render(<ManualCareerEntryForm isSaving={false} onCancel={jest.fn()} onSubmit={onSubmit} initialValues={{ kind: 'work', isCurrent: true }} />);

        fireEvent.change(screen.getByLabelText('활동 종류'), { target: { value: 'credential' } });
        expect(screen.queryByLabelText(/현재 진행 중/)).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/자격증·시험명/), { target: { value: 'SQL 개발자 자격시험' } });
        fireEvent.change(screen.getByLabelText(/발급·시험 기관/), { target: { value: '한국데이터산업진흥원' } });
        fireEvent.change(screen.getByLabelText(/취득·응시 시점/), { target: { value: '2026.09' } });
        fireEvent.change(screen.getByLabelText(/점수·등급·결과/), { target: { value: 'SQLD 취득' } });
        fireEvent.click(screen.getByRole('button', { name: '활동 저장' }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
            title: 'SQL 개발자 자격시험',
            kind: 'credential',
            organization: '한국데이터산업진흥원',
            role: '',
            startedAt: '2026.09',
            endedAt: '',
            isCurrent: false,
            summary: '',
            action: '',
            result: 'SQLD 취득',
            learning: '',
        }));
    });

    it('keeps the writing flow requirement for action and result', async () => {
        const onSubmit = jest.fn().mockResolvedValue(true);
        render(<ManualCareerEntryForm isSaving={false} onCancel={jest.fn()} onSubmit={onSubmit} requireActionAndResult submitLabel="근거 추가" />);

        fireEvent.change(screen.getByLabelText(/활동명/), { target: { value: '검색 개선' } });
        fireEvent.change(screen.getByLabelText(/활동 요약/), { target: { value: '검색 흐름을 개선했습니다.' } });
        fireEvent.click(screen.getByRole('button', { name: '근거 추가' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('내가 한 일과 결과를 모두 입력해 주세요.');
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('loads existing values for editing, including the current-role flag', () => {
        render(<ManualCareerEntryForm
            isSaving={false}
            onCancel={jest.fn()}
            onSubmit={jest.fn().mockResolvedValue(true)}
            initialValues={{ kind: 'work', title: '프론트엔드 개발', isCurrent: true, action: '검색 화면을 개선했습니다.' }}
            submitLabel="수정 저장"
        />);

        expect(screen.getByLabelText(/활동명/)).toHaveValue('프론트엔드 개발');
        expect(screen.getByLabelText(/현재 진행 중/)).toBeChecked();
        expect(screen.getByLabelText(/내가 한 일/)).toHaveValue('검색 화면을 개선했습니다.');
    });

    it('preserves entered values when the save request fails', async () => {
        const onSubmit = jest.fn().mockResolvedValue(false);
        render(<ManualCareerEntryForm isSaving={false} onCancel={jest.fn()} onSubmit={onSubmit} />);

        const title = screen.getByLabelText(/활동명/);
        fireEvent.change(title, { target: { value: '검색 개선' } });
        fireEvent.change(screen.getByLabelText(/활동 요약/), { target: { value: '검색 흐름을 개선했습니다.' } });
        fireEvent.click(screen.getByRole('button', { name: '활동 저장' }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalled());
        expect(title).toHaveValue('검색 개선');
    });
});
