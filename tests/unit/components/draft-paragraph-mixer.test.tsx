import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DraftParagraphMixer } from '@/widgets/writing-studio/ui/draft-paragraph-mixer';
import type { DraftCandidate } from '@/entities/draft-candidate';

function draft(id: string, content: string): DraftCandidate {
    return {
        id,
        status: 'candidate',
        content,
        charCount: Array.from(content).length,
        validationResult: { unverifiedFactCount: 0, variation: '' },
        evidenceMap: { evidenceRecordIds: [], citations: [] },
    } as unknown as DraftCandidate;
}

describe('DraftParagraphMixer', () => {
    it('requires an explicit choice for every paragraph before merging', () => {
        const onMerge = jest.fn();
        render(
            <DraftParagraphMixer
                drafts={[draft('draft-a', '첫 문단 A\n\n둘째 문단 A'), draft('draft-b', '첫 문단 B\n\n둘째 문단 B')]}
                charLimit={700}
                busy={null}
                onSelectDraft={jest.fn()}
                onMerge={onMerge}
            />,
        );

        const mergeButton = screen.getByRole('button', { name: /문단 조합으로 편집/ });
        expect(mergeButton).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: /첫 문단 B/ }));
        expect(mergeButton).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: /둘째 문단 A/ }));
        expect(mergeButton).toBeEnabled();

        fireEvent.click(mergeButton);
        expect(onMerge).toHaveBeenCalledWith([
            { position: 0, sourceDraftId: 'draft-b', text: '첫 문단 B' },
            { position: 1, sourceDraftId: 'draft-a', text: '둘째 문단 A' },
        ]);
    });
});
