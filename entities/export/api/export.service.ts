import { documentService } from '@/entities/document/api';
import { parseLegacyDocument } from '@/entities/cover-letter/api';
import { evidenceRecordService, type EvidenceRecordDetails, EvidenceRecordServiceError } from '@/entities/evidence-record/api';
import { writingSessionService, type WritingSessionDetails } from '@/entities/writing-session/api';
import { CareerProfileServiceError, careerProfileService, type CareerProfile } from '@/entities/career-profile';
import { DomainIdSchema } from '@/shared/types';
import { z } from 'zod';
import { renderPdfDocument } from './pdf-document';
import type { PdfExportPayload } from '../model';

export class PdfExportServiceError extends Error {
    constructor(
        public readonly code: 'invalid_input' | 'unauthorized' | 'not_found' | 'conflict' | 'storage',
        message: string,
        public readonly status: 400 | 401 | 404 | 409 | 500,
    ) {
        super(message);
        this.name = 'PdfExportServiceError';
    }
}

function parseId(value: unknown, label: string): string {
    const parsed = DomainIdSchema.safeParse(value);
    if (!parsed.success) throw new PdfExportServiceError('invalid_input', `${label}를 확인해 주세요.`, 400);
    return parsed.data;
}

export function buildCoverLetterPdfPayload(details: WritingSessionDetails): PdfExportPayload {
    const questions = [...details.questions].sort((left, right) => left.position - right.position);
    if (questions.length === 0 || questions.some(question => question.status !== 'finalized' || !question.finalAnswer?.trim())) {
        throw new PdfExportServiceError('conflict', '모든 자기소개서 문항을 최종 확정한 뒤 PDF를 만들 수 있습니다.', 409);
    }
    return {
        title: `${details.target.company} 자기소개서`,
        company: details.target.company,
        role: details.target.role,
        subtitle: details.target.deadline ? `지원 마감 ${details.target.deadline}` : undefined,
        sections: questions.map(question => ({
            heading: question.question,
            body: question.finalAnswer!.trim(),
            charCount: Array.from(question.finalAnswer!.trim()).length,
        })),
    };
}

export function buildLegacyDocumentPdfPayload(document: NonNullable<Awaited<ReturnType<typeof documentService.getDocument>>>): PdfExportPayload {
    const parsed = parseLegacyDocument({
        id: document.id,
        title: document.title,
        company: document.company,
        role: document.role,
        content: document.content,
        status: document.status,
        deadline: document.deadline,
    });
    return {
        title: document.title || `${document.company} 자기소개서`,
        company: document.company,
        role: document.role,
        subtitle: document.deadline ? `지원 마감 ${document.deadline}` : undefined,
        sections: parsed.questions.map(question => ({
            heading: question.question,
            body: question.answer,
            charCount: Array.from(question.answer).length,
        })),
    };
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasExactMetricAmount(result: string, value: string, unit?: string): boolean {
    const normalizedUnit = unit?.trim();
    const compactResult = result.replace(/\s+/g, '');
    const compactAmount = `${value}${normalizedUnit ?? ''}`.replace(/\s+/g, '');
    if (!compactAmount) return false;
    const amountPattern = escapeRegExp(compactAmount);
    // Reject Latin/slash unit continuations, but allow Korean prose particles around the amount.
    const amountBoundary = '(^|[^0-9.,A-Za-z/%％])';
    const amountEndBoundary = '($|[^0-9.,A-Za-z/%％])';
    const percentagePointSuffix = normalizedUnit && /^(?:%|％|퍼센트)$/u.test(normalizedUnit) ? '(?!p|P|포인트)' : '';
    const pattern = /\d/.test(value)
        ? `${amountBoundary}${amountPattern}${percentagePointSuffix}${amountEndBoundary}`
        : amountPattern;
    return new RegExp(pattern, 'u').test(compactResult);
}

function formatMetric(metric: EvidenceRecordDetails['record']['metrics'][number]): string {
    const unit = metric.unit?.trim();
    const value = unit && /^(?:%|％)$/.test(unit) ? `${metric.value}${unit}` : `${metric.value}${unit ? ` ${unit}` : ''}`;
    return `${metric.label} ${value}`;
}

function buildCareerSection(item: EvidenceRecordDetails, kind: 'resume' | 'portfolio'): PdfExportPayload['sections'][number] {
    const { careerItem, record } = item;
    const timeline = [careerItem.startedAt, careerItem.endedAt ?? (careerItem.isCurrent ? '현재' : undefined)]
        .filter(Boolean)
        .join(' - ');
    const meta = [careerItem.organization, careerItem.role, timeline].filter(Boolean).join(' · ');
    const metrics = record.metrics.length > 0
        ? `성과: ${record.metrics.map(formatMetric).join(' · ')}`
        : undefined;
    const resumeMetrics = record.result && record.metrics.every(metric => (
        record.result?.includes(metric.label) && hasExactMetricAmount(record.result, metric.value, metric.unit)
    )) ? undefined : metrics;
    const skills = record.skills.length > 0 ? `기술: ${record.skills.join(', ')}` : undefined;
    const paragraphs = kind === 'resume'
        ? [
            careerItem.summary,
            careerItem.contributionNote,
            record.action,
            record.result,
            resumeMetrics,
            skills,
        ]
        : [
            careerItem.summary,
            careerItem.contributionNote,
            record.situation && `상황: ${record.situation}`,
            record.problem && `문제: ${record.problem}`,
            record.action && `행동: ${record.action}`,
            record.result && `결과: ${record.result}`,
            record.learning && `배운 점: ${record.learning}`,
            metrics,
            skills,
        ];
    const uniqueParagraphs = [...new Set(paragraphs.filter((paragraph): paragraph is string => Boolean(paragraph?.trim())))];
    const body = kind === 'resume'
        ? uniqueParagraphs.map(paragraph => `- ${paragraph}`).join('\n')
        : uniqueParagraphs.join('\n\n');
    const fallback = '승인된 활동 설명이 아직 없습니다.';
    return {
        heading: careerItem.title,
        meta: meta || undefined,
        body: body || fallback,
        charCount: Array.from(body || fallback).length,
    };
}

export function buildCareerProfilePdfPayload(
    items: EvidenceRecordDetails[],
    kind: 'resume' | 'portfolio' = 'portfolio',
    candidateProfile?: CareerProfile | null,
): PdfExportPayload {
    const activitySections = items
        .filter(item => item.record.status === 'approved' && item.careerItem.status === 'approved')
        .map(item => buildCareerSection(item, kind));

    const profileSections: PdfExportPayload['sections'] = [];
    if (candidateProfile?.summary) {
        profileSections.push({
            heading: '소개',
            body: candidateProfile.summary,
            charCount: Array.from(candidateProfile.summary).length,
        });
    }
    if (candidateProfile?.skills.length) {
        const skills = candidateProfile.skills.join(' · ');
        profileSections.push({ heading: '핵심 기술', body: skills, charCount: Array.from(skills).length });
    }

    const sections = [...profileSections, ...activitySections];
    if (sections.length === 0) {
        throw new PdfExportServiceError('conflict', '승인된 활동 근거를 하나 이상 준비한 뒤 PDF를 만들 수 있습니다.', 409);
    }

    const profileFields = candidateProfile
        ? {
            fullName: candidateProfile.fullName,
            headline: candidateProfile.headline,
            summary: candidateProfile.summary,
            email: candidateProfile.email,
            phone: candidateProfile.phone,
            location: candidateProfile.location,
            websiteUrl: candidateProfile.websiteUrl,
            githubUrl: candidateProfile.githubUrl,
            linkedinUrl: candidateProfile.linkedinUrl,
            skills: candidateProfile.skills,
        }
        : undefined;
    const hasProfileContent = profileFields && Object.values(profileFields).some(value => (
        Array.isArray(value) ? value.length > 0 : Boolean(value)
    ));

    return {
        title: kind === 'resume' ? '경력 이력서' : '활동 포트폴리오',
        subtitle: kind === 'resume'
            ? `검수 완료 활동 ${activitySections.length}개 · 핵심 역할과 성과`
            : `검수 완료 활동 ${activitySections.length}개 · 활동별 상세 사례`,
        profileKind: kind,
        candidateProfile: hasProfileContent ? profileFields : undefined,
        sections,
    };
}

export const pdfExportService = {
    async renderWritingSession(sessionIdInput: unknown): Promise<Buffer> {
        const sessionId = parseId(sessionIdInput, '작성 세션 ID');
        const details = await writingSessionService.get(sessionId);
        return renderPdfDocument(buildCoverLetterPdfPayload(details));
    },

    async renderLegacyDocument(documentIdInput: unknown): Promise<Buffer> {
        const documentId = parseId(documentIdInput, '문서 ID');
        let document: Awaited<ReturnType<typeof documentService.getDocument>>;
        try {
            document = await documentService.getDocument(documentId);
        } catch (error) {
            if (error instanceof Error && error.message === 'Unauthorized') {
                throw new PdfExportServiceError('unauthorized', '로그인이 필요합니다.', 401);
            }
            if (error instanceof Error && error.message === 'Invalid document ID.') {
                throw new PdfExportServiceError('invalid_input', '문서 ID를 확인해 주세요.', 400);
            }
            throw error;
        }
        if (!document) throw new PdfExportServiceError('not_found', '문서를 찾을 수 없습니다.', 404);
        return renderPdfDocument(buildLegacyDocumentPdfPayload(document));
    },

    async renderCareerProfile(kind: 'resume' | 'portfolio' = 'portfolio', evidenceIds?: string[]): Promise<Buffer> {
        let items: EvidenceRecordDetails[];
        try {
            if (evidenceIds === undefined) {
                items = await evidenceRecordService.listApproved({ limit: 100 });
            } else {
                const parsedIds = z.array(DomainIdSchema).max(100).safeParse(evidenceIds);
                if (!parsedIds.success || parsedIds.data.length === 0) {
                    throw new PdfExportServiceError('invalid_input', 'PDF에 넣을 활동을 하나 이상 선택해 주세요.', 400);
                }
                const uniqueIds = [...new Set(parsedIds.data)];
                items = await evidenceRecordService.getApprovedByIds(uniqueIds);
                if (items.length !== uniqueIds.length || items.some(item => item.record.status !== 'approved' || item.careerItem.status !== 'approved')) {
                    throw new PdfExportServiceError('conflict', '선택한 활동을 다시 확인해 주세요.', 409);
                }
            }
        } catch (error) {
            if (error instanceof PdfExportServiceError) throw error;
            if (error instanceof EvidenceRecordServiceError) {
                throw new PdfExportServiceError(
                    error.code === 'unauthorized' ? 'unauthorized' : error.code === 'invalid_input' ? 'invalid_input' : 'storage',
                    error.code === 'unauthorized' ? '로그인이 필요합니다.' : '활동 근거를 불러오지 못했습니다.',
                    error.code === 'unauthorized' ? 401 : error.code === 'invalid_input' ? 400 : 500,
                );
            }
            throw error;
        }

        let candidateProfile: CareerProfile | null = null;
        try {
            ({ profile: candidateProfile } = await careerProfileService.get());
        } catch (error) {
            if (error instanceof CareerProfileServiceError && error.code === 'unavailable') {
                // Preserve the existing activity-only export until M6-h is migrated.
                candidateProfile = null;
            } else if (error instanceof CareerProfileServiceError && error.code === 'unauthorized') {
                throw new PdfExportServiceError('unauthorized', '로그인이 필요합니다.', 401);
            } else if (error instanceof CareerProfileServiceError) {
                throw new PdfExportServiceError('storage', '이력서 프로필을 불러오지 못했습니다.', 500);
            } else {
                throw error;
            }
        }
        return renderPdfDocument(buildCareerProfilePdfPayload(items, kind, candidateProfile));
    },
};

export function createPdfDownloadResponse(buffer: Buffer, filename: string): Response {
    const encodedFilename = encodeURIComponent(filename);
    return new Response(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="jobsecretary.pdf"; filename*=UTF-8''${encodedFilename}`,
            'Cache-Control': 'private, no-store',
            'Content-Length': String(buffer.byteLength),
        },
    });
}
