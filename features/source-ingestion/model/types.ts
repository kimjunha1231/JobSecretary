import type {
    SourceDocumentKind,
    SourceDocumentOrigin,
    SourceDocumentStatus,
} from '@/entities/source-document';

export const SOURCE_KIND_LABELS: Record<SourceDocumentKind, string> = {
    resume: '이력서',
    portfolio: '포트폴리오',
    cover_letter: '기존 자기소개서',
    job_post: '채용공고',
    talent_page: '인재상/채용 페이지',
    github: 'GitHub 자료',
    other: '기타 자료',
};

export const SOURCE_ORIGIN_LABELS: Record<SourceDocumentOrigin, string> = {
    upload: '파일 업로드',
    url: 'URL',
    pasted_text: '붙여넣기',
};

export const SOURCE_STATUS_LABELS: Record<SourceDocumentStatus, string> = {
    registered: '등록됨',
    fetching: '가져오는 중',
    uploaded: '업로드됨',
    extracting: '본문 추출 중',
    needs_review: '검수 필요',
    approved: '검수 완료',
    archived: '보관됨',
    failed: '실패',
    retrying: '재시도 중',
    manual_input: '직접 입력 필요',
};
