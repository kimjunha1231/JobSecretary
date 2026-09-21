import type { EvidenceRecordDetails } from '@/entities/evidence-record';
import { CareerItemKindSchema, type CareerItemKind } from '@/entities/career-item';

export type CareerActivityKindFilter = CareerItemKind | 'all';

export type CareerActivitySearchOptions = {
    query?: unknown;
    kind?: unknown;
};

function normalizeSearchText(value: unknown): string {
    return typeof value === 'string'
        ? value.normalize('NFKC').toLocaleLowerCase('ko-KR').trim()
        : '';
}

function getSearchableText(activity: EvidenceRecordDetails): string {
    const { careerItem, record } = activity;
    return [
        careerItem.title,
        careerItem.organization,
        careerItem.role,
        careerItem.summary,
        careerItem.contributionNote,
        careerItem.skills,
        careerItem.competencyTags,
        record.action,
        record.result,
        record.learning,
        record.competencyTags,
        record.metrics.map(metric => [metric.label, metric.value, metric.unit]),
        record.skills,
    ]
        .flat(Infinity)
        .filter((value): value is string => typeof value === 'string')
        .map(normalizeSearchText)
        .filter(Boolean)
        .join(' ');
}

export function filterCareerActivities(
    activities: EvidenceRecordDetails[],
    options: CareerActivitySearchOptions = {},
): EvidenceRecordDetails[] {
    const query = normalizeSearchText(options.query);
    const parsedKind = CareerItemKindSchema.safeParse(options.kind);
    const kind: CareerActivityKindFilter = options.kind === 'all' || !parsedKind.success
        ? 'all'
        : parsedKind.data;

    if (!query && kind === 'all') return activities;

    return activities.filter(activity => {
        const matchesKind = kind === 'all' || activity.careerItem.kind === kind;
        const searchableText = getSearchableText(activity);
        const matchesQuery = !query
            || searchableText.includes(query)
            || searchableText.replace(/\s+/g, '').includes(query.replace(/\s+/g, ''));
        return matchesKind && matchesQuery;
    });
}
