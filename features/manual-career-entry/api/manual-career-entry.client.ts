import type { EvidenceRecordDetails, EvidenceRecordHistoryEntry } from '@/entities/evidence-record';
import type { ManualCareerEntryValues } from '../model';

type SaveManualCareerEntryOptions = {
    recordId?: string;
    expectedRecordVersion?: number;
    expectedCareerVersion?: number;
};

export async function saveManualCareerEntry(
    values: ManualCareerEntryValues,
    { recordId, expectedRecordVersion, expectedCareerVersion }: SaveManualCareerEntryOptions = {},
): Promise<EvidenceRecordDetails> {
    const body = recordId
        ? { ...values, expectedRecordVersion, expectedCareerVersion }
        : values;
    const response = await fetch(recordId
        ? `/api/evidence-records/${encodeURIComponent(recordId)}`
        : '/api/evidence-records', {
        method: recordId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const result: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
            ? result.error
            : recordId ? '활동을 수정하지 못했습니다.' : '활동을 저장하지 못했습니다.';
        throw new Error(message);
    }
    return result as EvidenceRecordDetails;
}

export async function loadCareerActivityHistory(recordId: string): Promise<EvidenceRecordHistoryEntry[]> {
    const response = await fetch(`/api/evidence-records/${encodeURIComponent(recordId)}/history`, { cache: 'no-store' });
    const result: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
            ? result.error
            : '활동 버전을 불러오지 못했습니다.';
        throw new Error(message);
    }
    return Array.isArray(result) ? result as EvidenceRecordHistoryEntry[] : [];
}

export async function restoreCareerActivityRevision(recordId: string, revisionId: string): Promise<EvidenceRecordDetails> {
    const response = await fetch(`/api/evidence-records/${encodeURIComponent(recordId)}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId }),
    });
    const result: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
            ? result.error
            : '이전 활동 버전을 복원하지 못했습니다.';
        throw new Error(message);
    }
    return result as EvidenceRecordDetails;
}
