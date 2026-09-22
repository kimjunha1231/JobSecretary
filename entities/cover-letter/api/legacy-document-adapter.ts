import { LegacyCoverLetterDraftSchema, type LegacyCoverLetterDraft, type CoverLetterStatus } from '../model/index.ts';

export type LegacyDocumentInput = {
    id: string;
    title?: string | null;
    company?: string | null;
    role?: string | null;
    content?: string | null;
    status?: string | null;
    deadline?: string | null;
};

const SECTION_HEADING = /^###\s+([^\n]+?)(?:\s+\((\d+)자\))?\s*$/gm;

function mapStatus(status: string | null | undefined): CoverLetterStatus {
    if (status === 'writing' || status === 'applied' || status === 'interview' || status === 'pass' || status === 'fail') {
        return status;
    }
    return 'writing';
}

/**
 * Converts the current Markdown convention into a reviewable cover-letter draft.
 * It never drops the original body; malformed sections are explicitly marked for review.
 */
export function parseLegacyDocument(document: LegacyDocumentInput): LegacyCoverLetterDraft {
    const content = document.content ?? '';
    const matches = Array.from(content.matchAll(SECTION_HEADING));
    const warnings: string[] = [];
    const questions: LegacyCoverLetterDraft['questions'] = [];

    if (matches.length === 0) {
        warnings.push('문항 제목을 찾지 못해 전체 본문을 검수 대상으로 보존했습니다.');
        questions.push({
            question: '자기소개서 본문',
            answer: content.trim(),
            position: 0,
        });
    } else {
        const firstMatchStart = matches[0]?.index ?? 0;
        if (content.slice(0, firstMatchStart).trim()) {
            warnings.push('첫 문항 앞에 제목이 없는 본문이 있어 원문만 보존했습니다.');
        }

        matches.forEach((match, position) => {
            const heading = match[1]?.trim() || `문항 ${position + 1}`;
            const charLimit = match[2] ? Number(match[2]) : undefined;
            const bodyStart = (match.index ?? 0) + match[0].length;
            const bodyEnd = matches[position + 1]?.index ?? content.length;
            const answer = content.slice(bodyStart, bodyEnd).trim();

            if (!answer) {
                warnings.push(`${position + 1}번 문항의 답변이 비어 있습니다.`);
            }

            questions.push({
                question: heading,
                answer,
                ...(charLimit === undefined ? {} : { charLimit }),
                position,
            });
        });
    }

    const draft: LegacyCoverLetterDraft = {
        legacyDocumentId: document.id,
        title: document.title?.trim() || `${document.company?.trim() || '회사 미지정'} - ${document.role?.trim() || '직무 미지정'}`,
        company: document.company?.trim() || '회사 미지정',
        role: document.role?.trim() || '직무 미지정',
        status: mapStatus(document.status),
        ...(document.deadline?.trim() ? { deadline: document.deadline.trim() } : {}),
        legacyContent: content,
        questions,
        parseStatus: warnings.length > 0 ? 'needs_review' : 'parsed',
        warnings,
    };

    return LegacyCoverLetterDraftSchema.parse(draft);
}
