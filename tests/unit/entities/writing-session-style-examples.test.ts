import { filterStyleExamplesBySelection } from '@/entities/writing-session/api';
import type { StyleExample } from '@/entities/style-profile/model';

const profileId = '11111111-1111-4111-8111-111111111111';
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const firstExampleId = '22222222-2222-4222-8222-222222222222';
const secondExampleId = '33333333-3333-4333-8333-333333333333';

const examples: StyleExample[] = [
    {
        id: firstExampleId,
        styleProfileId: profileId,
        userId,
        source: 'user_authored',
        content: '먼저 문제를 나누었습니다.',
        approved: true,
        createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
        id: secondExampleId,
        styleProfileId: profileId,
        userId,
        source: 'approved_final',
        content: '작은 실험으로 다음 선택을 확인했습니다.',
        approved: true,
        createdAt: '2026-01-02T00:00:00.000Z',
    },
];

describe('writing session style example selection', () => {
    it('keeps the legacy automatic context when no selection property is saved', () => {
        expect(filterStyleExamplesBySelection(examples, {})).toBe(examples);
    });

    it('allows an explicit empty selection to disable style examples', () => {
        expect(filterStyleExamplesBySelection(examples, { styleExampleIds: [] })).toEqual([]);
    });

    it('filters to selected IDs and ignores unknown IDs', () => {
        expect(filterStyleExamplesBySelection(examples, {
            styleExampleIds: [secondExampleId, '44444444-4444-4444-8444-444444444444'],
        })).toEqual([examples[1]]);
    });
});
