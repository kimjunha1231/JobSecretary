'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    Check,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    Circle,
    Download,
    FileText,
    Lock,
    Loader2,
    Plus,
    RefreshCw,
    RotateCcw,
    Save,
    Sparkles,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { JobRequirement, JobTarget } from '@/entities/job-target';
import type { EvidenceMatch, OutlineCandidate, RetrievalEvaluationSummary, WritingSession } from '@/entities/writing-session';
import type { DraftCandidate } from '@/entities/draft-candidate';
import type { EvidenceRecord } from '@/entities/evidence-record';
import type { CareerItem } from '@/entities/career-item';
import { Badge } from '@/shared/ui';
import { DraftParagraphMixer } from './draft-paragraph-mixer';

type EvidenceDetails = { record: EvidenceRecord; careerItem: CareerItem };
type MatchDetails = { match: EvidenceMatch; evidence: EvidenceDetails; requirement?: JobRequirement };
type QuestionDetails = { id: string; question: string; charLimit?: number; status: string; position?: number; finalAnswer?: string };
type SessionResponse = {
    session: WritingSession;
    target: JobTarget;
    styleProfile?: { id: string; name: string };
    styleExamples?: Array<{ id: string; source: 'user_authored' | 'approved_final'; questionId?: string; approved: boolean }>;
    questions: QuestionDetails[];
    question: QuestionDetails;
    requirements: JobRequirement[];
    evidence: EvidenceDetails[];
    matches: MatchDetails[];
    outlines: OutlineCandidate[];
    drafts: DraftCandidate[];
    revisions: Array<{ id: string; editor: 'user' | 'ai'; createdAt: string; content: string }>;
    factCitations: Array<{ id: string; draftCandidateId: string; sentenceIndex: number; sentenceText: string; evidenceRecordIds: string[]; status: 'verified' | 'unverified' }>;
    quality?: {
        evidenceCount: number;
        selectedEvidenceCount: number;
        outlineCandidateCount: number;
        draftCandidateCount: number;
        revisionCount: number;
        userRevisionCount: number;
        factCitationCoverage: number;
    };
};

type Step = 'evidence' | 'outline' | 'draft' | 'edit';
type ManualEvidence = { title: string; action: string; result: string; learning: string };
type EvaluationMetrics = {
    charCount: number;
    charLimit: number;
    overLimit: boolean;
    bannedExpressionCount: number;
    factSentenceCount: number;
    verifiedFactSentenceCount: number;
    factCitationCoverage: number;
    userRevisionRatio: number;
    score: number;
};
type EvaluationCase = {
    id: string;
    questionId: string;
    label: string;
    status: 'active' | 'archived';
    metrics: EvaluationMetrics;
    createdAt: string;
};
type EvaluationRun = {
    id: string;
    caseId: string;
    variant: 'studio' | 'baseline';
    sourceDraftId?: string;
    metrics: EvaluationMetrics;
    createdAt: string;
};

const STEP_LABELS: Array<{ id: Step; label: string }> = [
    { id: 'evidence', label: '근거 선택' },
    { id: 'outline', label: '개요 비교' },
    { id: 'draft', label: '초안 비교' },
    { id: 'edit', label: '최종 편집' },
];

const STRATEGY_LABELS: Record<OutlineCandidate['strategy'], string> = {
    problem_solving: '문제 해결 중심',
    collaboration: '협업 중심',
    growth: '성장 중심',
    custom: '사용자 정의',
};

const SESSION_STATE_LABELS: Record<WritingSession['state'], string> = {
    evidence_selecting: '근거 선택 중',
    outline_selecting: '개요 선택 중',
    drafting: '초안 준비 중',
    comparing: '초안 비교 중',
    editing: '최종 편집 중',
    finalized: '최종 확정',
    exported: '내보냄',
};

function readJson(value: Response): Promise<Record<string, unknown>> {
    return value.json().catch(() => ({})).then(result => result && typeof result === 'object' ? result as Record<string, unknown> : {});
}

function charCount(value: string): number {
    return Array.from(value).length;
}

function splitSentences(value: string): string[] {
    return (value.match(/[^.!?。！？\n]+[.!?。！？]?/g) ?? []).map(sentence => sentence.trim()).filter(Boolean);
}

function isFactLikeSentence(value: string): boolean {
    return /(?:\d|%|퍼센트|명|건|회|개월|주|일|원|년|월|회사|프로젝트|서비스|개발|개선|운영|구축|담당|달성|감소|증가|[A-Z]{2,})/u.test(value);
}

function stepForState(state: WritingSession['state']): Step {
    if (state === 'evidence_selecting') return 'evidence';
    if (state === 'outline_selecting' || state === 'drafting') return 'outline';
    if (state === 'comparing') return 'draft';
    return 'edit';
}

export function WritingStudioBoard({ sessionId }: { sessionId: string }) {
    const [details, setDetails] = useState<SessionResponse | null>(null);
    const [step, setStep] = useState<Step>('evidence');
    const [isLoading, setIsLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [manualEvidence, setManualEvidence] = useState<ManualEvidence>({ title: '', action: '', result: '', learning: '' });
    const [showEvidenceForm, setShowEvidenceForm] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [citationEvidenceBySentence, setCitationEvidenceBySentence] = useState<Record<number, string[]>>({});
    const [evaluationCase, setEvaluationCase] = useState<EvaluationCase | null>(null);
    const [evaluationRuns, setEvaluationRuns] = useState<EvaluationRun[]>([]);
    const [evaluationError, setEvaluationError] = useState<string | null>(null);
    const [retrievalEvaluation, setRetrievalEvaluation] = useState<RetrievalEvaluationSummary | null>(null);
    const [retrievalEvaluationError, setRetrievalEvaluationError] = useState<string | null>(null);

    const setCitationSelections = (draft: DraftCandidate | undefined) => {
        const citations = draft?.evidenceMap.citations;
        if (!Array.isArray(citations)) {
            setCitationEvidenceBySentence({});
            return;
        }
        setCitationEvidenceBySentence(citations.reduce<Record<number, string[]>>((next, citation) => {
            if (!citation || typeof citation !== 'object') return next;
            const item = citation as { sentenceIndex?: unknown; evidenceRecordIds?: unknown };
            if (typeof item.sentenceIndex === 'number' && Array.isArray(item.evidenceRecordIds)) {
                next[item.sentenceIndex] = item.evidenceRecordIds.filter((value): value is string => typeof value === 'string');
            }
            return next;
        }, {}));
    };

    const loadEvaluation = async (questionId: string) => {
        setEvaluationError(null);
        try {
            const casesResponse = await fetch(`/api/writing-sessions/${sessionId}/evaluation-cases`, { cache: 'no-store' });
            const casesResult = await readJson(casesResponse);
            if (!casesResponse.ok) throw new Error(typeof casesResult.error === 'string' ? casesResult.error : '평가 사례를 불러오지 못했습니다.');
            const cases = Array.isArray(casesResult.cases) ? casesResult.cases as EvaluationCase[] : [];
            const currentCase = cases.find(item => item.questionId === questionId && item.status === 'active') ?? null;
            setEvaluationCase(currentCase);
            if (!currentCase) {
                setEvaluationRuns([]);
                return;
            }
            const runsResponse = await fetch(`/api/style-evaluation-cases/${currentCase.id}/runs`, { cache: 'no-store' });
            const runsResult = await readJson(runsResponse);
            if (!runsResponse.ok) throw new Error(typeof runsResult.error === 'string' ? runsResult.error : '평가 결과를 불러오지 못했습니다.');
            setEvaluationRuns(Array.isArray(runsResult.runs) ? runsResult.runs as EvaluationRun[] : []);
        } catch {
            setEvaluationCase(null);
            setEvaluationRuns([]);
            // The evaluation migration may be rolled out after the writing studio.
            // Keep the main writing flow usable until the user explicitly starts an evaluation.
            setEvaluationError(null);
        }
    };

    const loadSession = async (showSpinner = false) => {
        if (showSpinner) setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/writing-sessions/${sessionId}`, { cache: 'no-store' });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '작성 세션을 불러오지 못했습니다.');
            const next = result as unknown as SessionResponse;
            setDetails(next);
            setStep(current => current === 'evidence' && next.session.state !== 'evidence_selecting' ? stepForState(next.session.state) : current);
            const selectedDraft = next.drafts.find(draft => draft.status === 'selected');
            if (selectedDraft) {
                setEditedContent(selectedDraft.content);
                setCitationSelections(selectedDraft);
            }
            void loadEvaluation(next.question.id);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : '작성 세션을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void loadSession(true); }, [sessionId]);

    const selectedMatches = useMemo(() => details?.matches.filter(item => ['selected', 'locked'].includes(item.match.selectionState)) ?? [], [details]);
    const selectedOutline = details?.outlines.find(outline => outline.status === 'selected');
    const selectedDraft = details?.drafts.find(draft => draft.status === 'selected');
    const charLimit = details?.question.charLimit ?? 700;
    const editedCount = charCount(editedContent);
    const approvedRequirementCount = details?.requirements.filter(requirement => requirement.status === 'approved').length ?? 0;

    const updateDetails = async (response: Response, fallback: string) => {
        const result = await readJson(response);
        if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : fallback);
        const next = result as unknown as SessionResponse;
        setDetails(next);
        setRetrievalEvaluation(null);
        setRetrievalEvaluationError(null);
        return next;
    };

    const switchQuestion = async (questionId: string) => {
        if (questionId === details?.question.id) return;
        setBusy(`question-${questionId}`);
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/questions/${questionId}`, { method: 'PATCH' }), '문항을 전환하지 못했습니다.');
            setStep(stepForState(next.session.state));
            const selected = next.drafts.find(draft => draft.status === 'selected');
            setEditedContent(selected?.content ?? '');
            setCitationSelections(selected);
            void loadEvaluation(next.question.id);
            toast.success('작업 문항을 전환했습니다.');
        } catch (switchError) {
            setError(switchError instanceof Error ? switchError.message : '문항을 전환하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const changeMatch = async (match: MatchDetails, selectionState: 'selected' | 'rejected' | 'locked') => {
        setBusy(match.match.id);
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/evidence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selections: [{ matchId: match.match.id, selectionState }] }),
            }), '근거 선택을 저장하지 못했습니다.');
            setStep('evidence');
            toast.success(selectionState === 'rejected' ? '이 근거를 제외했습니다.' : '선택한 근거를 저장했습니다.');
            return next;
        } catch (changeError) {
            setError(changeError instanceof Error ? changeError.message : '근거 선택을 저장하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const refreshMatches = async () => {
        setBusy('refresh-matches');
        try {
            await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/evidence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: true }),
            }), '활동 근거 목록을 새로 연결하지 못했습니다.');
            toast.success('승인된 활동 근거를 다시 연결했습니다.');
        } catch (refreshError) {
            setError(refreshError instanceof Error ? refreshError.message : '활동 근거 목록을 새로 연결하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const runRetrievalEvaluation = async () => {
        setBusy('retrieval-evaluation');
        setRetrievalEvaluationError(null);
        try {
            const response = await fetch(`/api/writing-sessions/${sessionId}/retrieval-evaluation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ k: 3 }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '검색 품질을 측정하지 못했습니다.');
            setRetrievalEvaluation(result as unknown as RetrievalEvaluationSummary);
            toast.success('현재 선택을 기준으로 검색 품질을 측정했습니다.');
        } catch (evaluationError) {
            setRetrievalEvaluationError(evaluationError instanceof Error ? evaluationError.message : '검색 품질을 측정하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const addManualEvidence = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!manualEvidence.title.trim() || !manualEvidence.action.trim() || !manualEvidence.result.trim()) {
            toast.error('활동명, 내가 한 일, 결과를 입력해 주세요.');
            return;
        }
        setBusy('manual-evidence');
        try {
            const response = await fetch('/api/evidence-records', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: manualEvidence.title.trim(),
                    action: manualEvidence.action.trim(),
                    result: manualEvidence.result.trim(),
                    learning: manualEvidence.learning.trim(),
                }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '활동 근거를 저장하지 못했습니다.');
            await refreshMatches();
            setManualEvidence({ title: '', action: '', result: '', learning: '' });
            setShowEvidenceForm(false);
            toast.success('활동 근거를 추가하고 선택 목록을 갱신했습니다.');
        } catch (addError) {
            setError(addError instanceof Error ? addError.message : '활동 근거를 저장하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const generateOutlines = async () => {
        setBusy('outlines');
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/outlines/generate`, { method: 'POST' }), '개요 후보를 생성하지 못했습니다.');
            setStep('outline');
            toast.success('서로 다른 개요 후보 3개를 만들었습니다.');
            return next;
        } catch (generateError) {
            setError(generateError instanceof Error ? generateError.message : '개요 후보를 생성하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const selectOutline = async (outlineId: string) => {
        setBusy(outlineId);
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/outlines/${outlineId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'selected' }),
            }), '개요 선택을 저장하지 못했습니다.');
            setStep('outline');
            toast.success('개요를 선택했습니다. 이제 초안을 비교할 수 있습니다.');
            return next;
        } catch (selectError) {
            setError(selectError instanceof Error ? selectError.message : '개요 선택을 저장하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const generateDrafts = async () => {
        setBusy('drafts');
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/drafts/generate`, { method: 'POST' }), '초안 후보를 생성하지 못했습니다.');
            setStep('draft');
            toast.success('비교할 초안 후보 3개를 만들었습니다.');
            return next;
        } catch (generateError) {
            setError(generateError instanceof Error ? generateError.message : '초안 후보를 생성하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const selectDraft = async (draftId: string) => {
        setBusy(draftId);
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/drafts/${draftId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'selected' }),
            }), '초안 선택을 저장하지 못했습니다.');
            setStep('edit');
            const selected = next.drafts.find(draft => draft.status === 'selected');
            setEditedContent(selected?.content ?? '');
            setCitationSelections(selected);
            toast.success('초안을 선택했습니다. 직접 수정한 뒤 확정할 수 있습니다.');
            return next;
        } catch (selectError) {
            setError(selectError instanceof Error ? selectError.message : '초안 선택을 저장하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const mergeDrafts = async (paragraphs: Array<{ position: number; sourceDraftId: string; text: string }>) => {
        setBusy('merge-drafts');
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/drafts/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paragraphs }),
            }), '문단을 병합하지 못했습니다.');
            setStep('edit');
            const selected = next.drafts.find(draft => draft.status === 'selected');
            setEditedContent(selected?.content ?? '');
            setCitationSelections(selected);
            toast.success('문단을 조합한 편집 초안을 만들었습니다.');
        } catch (mergeError) {
            setError(mergeError instanceof Error ? mergeError.message : '문단을 병합하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const saveDraft = async () => {
        setBusy('save-draft');
        try {
            await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/drafts/${selectedDraft?.id ?? ''}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: editedContent,
                    citations: splitSentences(editedContent).flatMap((sentence, sentenceIndex) => {
                        const evidenceRecordIds = citationEvidenceBySentence[sentenceIndex] ?? [];
                        return evidenceRecordIds.length > 0 ? [{ sentenceIndex, sentenceText: sentence, factType: /\d|%/.test(sentence) ? 'metric' : 'claim', evidenceRecordIds }] : [];
                    }),
                }),
            }), '수정한 초안을 저장하지 못했습니다.');
            toast.success('수정한 초안을 저장했습니다.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : '수정한 초안을 저장하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const finalizeDraft = async () => {
        setBusy('finalize');
        try {
            const next = await updateDetails(await fetch(`/api/writing-sessions/${sessionId}/finalize`, { method: 'POST' }), '자기소개서를 확정하지 못했습니다.');
            setStep('edit');
            const finalized = next.drafts.find(draft => draft.status === 'selected');
            setEditedContent(finalized?.content ?? editedContent);
            setCitationSelections(finalized);
            toast.success('자기소개서를 최종 확정했습니다.');
        } catch (finalizeError) {
            setError(finalizeError instanceof Error ? finalizeError.message : '자기소개서를 확정하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const promoteStyleExample = async () => {
        if (!details?.styleProfile) return;
        setBusy('promote-style-example');
        try {
            const response = await fetch(`/api/style-profiles/${details.styleProfile.id}/examples/promote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId: details.question.id }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '최종 답변을 말투 예문으로 저장하지 못했습니다.');
            await loadSession();
            toast.success('최종 답변을 승인 말투 예문으로 저장했습니다.');
        } catch (promoteError) {
            setError(promoteError instanceof Error ? promoteError.message : '최종 답변을 말투 예문으로 저장하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const downloadFinalPdf = async () => {
        const allFinalized = Boolean(details?.questions.length && details.questions.every(question => question.status === 'finalized' && question.finalAnswer?.trim()));
        if (!allFinalized) {
            toast.error('모든 문항을 최종 확정한 뒤 PDF를 만들 수 있습니다.');
            return;
        }
        setBusy('export-pdf');
        try {
            const response = await fetch(`/api/writing-sessions/${sessionId}/export`, { cache: 'no-store' });
            if (!response.ok) {
                const result = await readJson(response);
                throw new Error(typeof result.error === 'string' ? result.error : '자기소개서 PDF를 만들지 못했습니다.');
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${details?.target.company ?? '자기소개서'}-자기소개서.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success('자기소개서 PDF를 다운로드했습니다.');
        } catch (exportError) {
            setError(exportError instanceof Error ? exportError.message : '자기소개서 PDF를 만들지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const createEvaluationCase = async () => {
        if (!finalized) {
            toast.error('최종 확정한 답변만 골든셋 사례로 저장할 수 있습니다.');
            return;
        }
        setBusy('evaluation-case');
        try {
            const response = await fetch(`/api/writing-sessions/${sessionId}/evaluation-cases`, { method: 'POST' });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '평가 사례를 저장하지 못했습니다.');
            const nextCase = result as unknown as EvaluationCase;
            setEvaluationCase(nextCase);
            setEvaluationRuns([]);
            setEvaluationError(null);
            toast.success('현재 최종 답변을 골든셋 사례로 저장했습니다.');
        } catch (caseError) {
            setEvaluationError(caseError instanceof Error ? caseError.message : '평가 사례를 저장하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    const runEvaluation = async (variant: 'studio' | 'baseline', draftId?: string) => {
        if (!evaluationCase) return;
        setBusy(`evaluation-${variant}-${draftId ?? 'studio'}`);
        try {
            const response = await fetch(`/api/style-evaluation-cases/${evaluationCase.id}/runs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ variant, ...(draftId ? { draftId } : {}) }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '평가를 실행하지 못했습니다.');
            const run = result as unknown as EvaluationRun;
            setEvaluationRuns(current => [run, ...current.filter(item => item.id !== run.id)]);
            setEvaluationError(null);
            toast.success(variant === 'studio' ? '최종 답변 평가를 갱신했습니다.' : '초안 비교 평가를 추가했습니다.');
        } catch (runError) {
            setEvaluationError(runError instanceof Error ? runError.message : '평가를 실행하지 못했습니다.');
        } finally {
            setBusy(null);
        }
    };

    if (isLoading) return <div className="rounded-2xl border border-white/10 bg-surface/50 px-5 py-16 text-center text-sm text-zinc-500">작성 작업대를 불러오는 중입니다…</div>;
    if (!details) return <div className="space-y-4"><Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16} aria-hidden="true" /> 지원 대상으로 돌아가기</Link><div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error ?? '작성 세션을 불러오지 못했습니다.'}</div></div>;

    const activeCandidates = details.outlines.filter(outline => outline.status !== 'stale');
    const activeDrafts = details.drafts.filter(draft => draft.status !== 'stale');
    const finalized = details.session.state === 'finalized' || details.session.state === 'exported' || details.question.status === 'finalized';
    const styleExampleSaved = details.styleExamples?.some(example => example.source === 'approved_final' && example.questionId === details.question.id && example.approved) ?? false;

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"><ArrowLeft size={16} aria-hidden="true" /> 지원 대상으로 돌아가기</Link>
                    <div className="mt-5 flex flex-wrap items-center gap-2"><Badge variant={finalized ? 'success' : 'pending'}>{SESSION_STATE_LABELS[details.session.state]}</Badge><span className="text-xs text-zinc-500">{details.target.company} · {details.target.role}</span></div>
                    <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">작성 작업대</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{details.question.question}</p>
                    {(details.styleProfile || details.quality) && <div className="mt-4 flex max-w-4xl flex-wrap items-center gap-2 text-xs text-zinc-500">
                        {details.styleProfile && <span className="rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-primary">말투 프로필 · {details.styleProfile.name} · 승인 예문 {(details.styleExamples ?? []).filter(example => example.approved).length}개</span>}
                        {details.quality && <span className="rounded-lg border border-white/10 bg-surface/50 px-2.5 py-1.5">근거 {details.quality.selectedEvidenceCount}/{details.quality.evidenceCount} · 후보 {details.quality.outlineCandidateCount + details.quality.draftCandidateCount}개 · 내 수정 {details.quality.userRevisionCount}회 · 사실 근거 {(details.quality.factCitationCoverage * 100).toFixed(0)}%</span>}
                    </div>}
                    {details.questions.length > 1 && <div className="mt-4 flex max-w-3xl gap-2 overflow-x-auto pb-1" role="tablist" aria-label="자기소개서 문항">
                        {details.questions.map((question, index) => <button key={question.id} type="button" role="tab" aria-selected={question.id === details.question.id} onClick={() => void switchQuestion(question.id)} disabled={busy !== null} className={`shrink-0 rounded-lg border px-3 py-2 text-left text-xs transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${question.id === details.question.id ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 text-zinc-400 hover:bg-white/5'}`}><span className="mr-1.5 text-[10px] text-zinc-600">{index + 1}</span>{question.question.slice(0, 42)}{question.question.length > 42 ? '…' : ''}</button>)}
                    </div>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
                    {finalized && <button type="button" onClick={() => void downloadFinalPdf()} disabled={busy !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"><Download size={15} aria-hidden="true" /> PDF 다운로드</button>}
                    <button type="button" onClick={() => void loadSession(true)} disabled={isLoading || busy !== null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"><RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" /> 새로고침</button>
                </div>
            </div>

            {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"><AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}

            {step === 'edit' && selectedDraft && <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4" aria-labelledby="fact-citation-title"><div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300/80">Fact check</p><h2 id="fact-citation-title" className="mt-1 text-base font-semibold text-white">사실 문장에 활동 근거 연결</h2><p className="mt-1 text-xs leading-5 text-zinc-400">숫자·회사·프로젝트처럼 확인 가능한 문장을 선택한 활동과 연결하면 최종 확정할 수 있습니다.</p></div><span className="text-xs text-amber-200">검증 필요 {typeof selectedDraft.validationResult.unverifiedFactCount === 'number' ? selectedDraft.validationResult.unverifiedFactCount : 0}개</span></div><div className="mt-3 space-y-2">{splitSentences(editedContent).map((sentence, sentenceIndex) => isFactLikeSentence(sentence) ? <label key={`${sentenceIndex}-${sentence.slice(0, 12)}`} className="grid gap-2 rounded-xl border border-white/10 bg-background/40 p-3 md:grid-cols-[1fr_220px] md:items-center"><span className="text-xs leading-5 text-zinc-300"><span className="mr-1.5 text-[10px] text-zinc-600">{sentenceIndex + 1}</span>{sentence}</span><select value={citationEvidenceBySentence[sentenceIndex]?.[0] ?? ''} onChange={event => setCitationEvidenceBySentence(current => ({ ...current, [sentenceIndex]: event.target.value ? [event.target.value] : [] }))} disabled={finalized} className="w-full rounded-lg border border-white/10 bg-background px-2.5 py-2 text-xs text-zinc-300 outline-none focus:border-primary/60"><option value="">근거를 선택하세요</option>{selectedMatches.map(item => <option key={item.evidence.record.id} value={item.evidence.record.id}>{item.evidence.careerItem.title}</option>)}</select></label> : null)}</div></section>}

            <nav aria-label="작성 단계" className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-surface/45 p-2 md:grid-cols-4">
                {STEP_LABELS.map((item, index) => {
                    const currentIndex = STEP_LABELS.findIndex(stepItem => stepItem.id === step);
                    const canOpen = index <= currentIndex || (item.id === 'outline' && activeCandidates.length > 0) || (item.id === 'draft' && activeDrafts.length > 0) || (item.id === 'edit' && Boolean(selectedDraft));
                    return <button key={item.id} type="button" onClick={() => canOpen && setStep(item.id)} disabled={!canOpen} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${step === item.id ? 'bg-primary/15 font-semibold text-primary' : canOpen ? 'text-zinc-300 hover:bg-white/5' : 'cursor-not-allowed text-zinc-600'}`}><span className="text-xs">0{index + 1}</span>{item.label}{index < STEP_LABELS.length - 1 && <ChevronRight size={14} className="hidden text-zinc-700 md:block" aria-hidden="true" />}</button>;
                })}
            </nav>

            {step === 'evidence' && (
                <section className="space-y-5" aria-labelledby="evidence-step-title">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">01 · Evidence</p><h2 id="evidence-step-title" className="mt-1 text-2xl font-bold text-white">활동 근거를 직접 고르세요</h2><p className="mt-1 text-sm text-zinc-400">선택한 근거만 개요와 초안 생성에 전달됩니다. 추천 이유를 읽고 제외하거나 고정할 수 있습니다.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowEvidenceForm(previous => !previous)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5"><Plus size={15} aria-hidden="true" /> 활동 직접 추가</button><button type="button" onClick={() => void refreshMatches()} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"><RotateCcw size={15} aria-hidden="true" /> 추천 갱신</button></div></div>
                    {showEvidenceForm && <form onSubmit={addManualEvidence} className="grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 md:grid-cols-2"><label className="space-y-1.5 text-xs text-zinc-300 md:col-span-2"><span>활동명</span><input value={manualEvidence.title} onChange={event => setManualEvidence(previous => ({ ...previous, title: event.target.value }))} maxLength={200} placeholder="예: 사내 검색 서비스 개선" className="w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm text-white outline-none focus:border-primary/60" /></label><label className="space-y-1.5 text-xs text-zinc-300"><span>내가 한 일</span><textarea value={manualEvidence.action} onChange={event => setManualEvidence(previous => ({ ...previous, action: event.target.value }))} maxLength={10_000} className="min-h-24 w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm leading-5 text-white outline-none focus:border-primary/60" /></label><label className="space-y-1.5 text-xs text-zinc-300"><span>결과</span><textarea value={manualEvidence.result} onChange={event => setManualEvidence(previous => ({ ...previous, result: event.target.value }))} maxLength={10_000} className="min-h-24 w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm leading-5 text-white outline-none focus:border-primary/60" /></label><label className="space-y-1.5 text-xs text-zinc-300 md:col-span-2"><span>배운 점 (선택)</span><textarea value={manualEvidence.learning} onChange={event => setManualEvidence(previous => ({ ...previous, learning: event.target.value }))} maxLength={10_000} className="min-h-20 w-full rounded-lg border border-white/10 bg-background px-3 py-2.5 text-sm leading-5 text-white outline-none focus:border-primary/60" /></label><div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setShowEvidenceForm(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:bg-white/5">취소</button><button type="submit" disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{busy === 'manual-evidence' && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} 저장</button></div></form>}
                    <section className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4" aria-labelledby="retrieval-evaluation-title"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex items-center gap-2"><BarChart3 size={18} className="text-sky-300" aria-hidden="true" /><h3 id="retrieval-evaluation-title" className="text-base font-semibold text-white">검색 품질 기준선</h3></div><p className="mt-1 text-xs leading-5 text-zinc-400">현재 질문에서 선택하거나 고정한 근거를 relevance label로 삼아 추천 순위를 측정합니다. 이 결과는 사용자의 선택 기반 기준선이며, 정답 데이터로 자동 확정하지 않습니다.</p></div><button type="button" onClick={() => void runRetrievalEvaluation()} disabled={busy !== null || approvedRequirementCount === 0} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-400/20 disabled:opacity-50">{busy === 'retrieval-evaluation' && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} 현재 선택으로 측정</button></div>{approvedRequirementCount === 0 && <p className="mt-3 rounded-lg border border-white/10 bg-background/30 px-3 py-2 text-xs text-zinc-500">승인된 공고 요구사항이 있어야 질문별 검색 품질을 측정할 수 있습니다.</p>}{retrievalEvaluationError && <p role="alert" className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{retrievalEvaluationError}</p>}{retrievalEvaluation && <div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-white/10 bg-background/30 px-3 py-2"><p className="text-[11px] text-zinc-500">Recall@{retrievalEvaluation.k}</p><p className="mt-1 text-lg font-semibold text-white">{Math.round(retrievalEvaluation.recallAtK * 100)}%</p></div><div className="rounded-lg border border-white/10 bg-background/30 px-3 py-2"><p className="text-[11px] text-zinc-500">nDCG@{retrievalEvaluation.k}</p><p className="mt-1 text-lg font-semibold text-white">{Math.round(retrievalEvaluation.ndcgAtK * 100)}%</p></div><div className="rounded-lg border border-white/10 bg-background/30 px-3 py-2"><p className="text-[11px] text-zinc-500">MRR@{retrievalEvaluation.k}</p><p className="mt-1 text-lg font-semibold text-white">{Math.round(retrievalEvaluation.mrrAtK * 100)}%</p></div><div className="sm:col-span-3"><p className="text-xs text-zinc-500">라벨이 있는 요구사항 {retrievalEvaluation.evaluatedCaseCount}/{retrievalEvaluation.caseCount}개 · 선택 라벨이 비어 있는 요구사항 {retrievalEvaluation.emptyRelevantLabelCount}개</p></div></div>}</section>
                    <div className="grid gap-3">{details.matches.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center"><FileText size={25} className="mx-auto mb-3 text-zinc-600" aria-hidden="true" /><p className="text-sm font-medium text-zinc-300">추천할 승인 활동 근거가 없습니다.</p><p className="mt-1 text-xs leading-5 text-zinc-500">활동을 직접 추가하거나 경력 자료를 검수한 뒤 추천 갱신을 눌러 주세요.</p></div> : details.matches.map(item => { const selected = ['selected', 'locked'].includes(item.match.selectionState); const matchBusy = busy === item.match.id; return <article key={item.match.id} className={`rounded-2xl border p-4 transition md:p-5 ${selected ? 'border-primary/40 bg-primary/5' : 'border-white/10 bg-surface/50'}`}><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant={selected ? 'success' : item.match.selectionState === 'rejected' ? 'fail' : 'pending'}>{selected ? item.match.selectionState === 'locked' ? '고정됨' : '선택됨' : item.match.selectionState === 'rejected' ? '제외됨' : '추천됨'}</Badge>{item.requirement && <span className="text-xs text-primary/80">{item.requirement.category} · 우선순위 {item.requirement.priority}</span>}</div><h3 className="mt-2 text-base font-semibold text-white">{item.evidence.careerItem.title}</h3><p className="mt-1 text-xs text-zinc-500">{item.evidence.careerItem.organization || '직접 입력한 활동'} · 관련도 {Math.round((item.match.rerankScore ?? 0) * 100)}%</p><p className="mt-3 text-sm leading-6 text-zinc-300">{item.evidence.record.action || item.evidence.record.result || item.evidence.careerItem.summary}</p>{item.match.reason && <p className="mt-2 text-xs leading-5 text-zinc-500">추천 이유: {item.match.reason}</p>}{item.evidence.record.metrics.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{item.evidence.record.metrics.map(metric => <span key={`${metric.label}-${metric.value}`} className="rounded-md bg-white/5 px-2 py-1 text-xs text-zinc-400">{metric.label}: {metric.value}{metric.unit ? ` ${metric.unit}` : ''}</span>)}</div>}</div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => void changeMatch(item, selected ? 'rejected' : 'selected')} disabled={matchBusy} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${selected ? 'bg-emerald-500/15 text-emerald-300 hover:bg-red-500/15 hover:text-red-300' : 'bg-primary/15 text-primary hover:bg-primary/25'}`}>{matchBusy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : selected ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}{selected ? '선택 해제' : '근거 선택'}</button>{selected && <button type="button" onClick={() => void changeMatch(item, item.match.selectionState === 'locked' ? 'selected' : 'locked')} disabled={matchBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"><Lock size={14} aria-hidden="true" />{item.match.selectionState === 'locked' ? '고정 해제' : '고정'}</button>}</div></div></article>; })}</div>
                    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface/40 p-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-medium text-white">선택한 근거 {selectedMatches.length}개 · 승인 요구사항 {approvedRequirementCount}개</p><p className="mt-1 text-xs text-zinc-500">근거와 승인된 요구사항이 각각 하나 이상 있어야 개요 후보를 만들 수 있습니다.</p></div><button type="button" onClick={() => void generateOutlines()} disabled={selectedMatches.length === 0 || approvedRequirementCount === 0 || busy !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{busy === 'outlines' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />} 개요 후보 3개 만들기</button></div>
                </section>
            )}

            {step === 'outline' && <section className="space-y-5" aria-labelledby="outline-step-title"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">02 · Outline</p><h2 id="outline-step-title" className="mt-1 text-2xl font-bold text-white">서사가 다른 개요를 비교하세요</h2><p className="mt-1 text-sm text-zinc-400">중심 주장과 전개 방식이 다른 후보 중 하나를 선택해야 초안을 만들 수 있습니다.</p></div><button type="button" onClick={() => void generateOutlines()} disabled={busy !== null || selectedMatches.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"><Sparkles size={15} aria-hidden="true" /> 다시 생성</button></div>{activeCandidates.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center text-sm text-zinc-500">아직 개요 후보가 없습니다. 근거 선택 단계에서 생성해 주세요.</div> : <div className="grid gap-4 lg:grid-cols-3">{activeCandidates.map(outline => { const selected = outline.status === 'selected'; const outlineBusy = busy === outline.id; return <article key={outline.id} className={`flex flex-col rounded-2xl border p-5 ${selected ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-surface/50'}`}><div className="flex items-center justify-between gap-2"><Badge variant={selected ? 'success' : outline.status === 'rejected' ? 'secondary' : 'pending'}>{selected ? '선택됨' : STRATEGY_LABELS[outline.strategy]}</Badge>{selected && <CheckCircle2 size={18} className="text-emerald-300" aria-hidden="true" />}</div><h3 className="mt-4 text-lg font-semibold leading-7 text-white">{outline.thesis}</h3><ol className="mt-4 flex-1 space-y-2 text-sm leading-6 text-zinc-400">{outline.structure.map((part, index) => <li key={`${outline.id}-${part}`} className="flex gap-2"><span className="text-primary/70">{index + 1}</span><span>{part}</span></li>)}</ol><p className="mt-4 text-xs text-zinc-500">근거 {outline.evidenceRecordIds.length}개 · 요구사항 {outline.requirementIds.length}개</p><button type="button" onClick={() => void selectOutline(outline.id)} disabled={selected || outline.status === 'stale' || busy !== null} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary/15 px-3 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50">{outlineBusy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}{selected ? '선택한 개요' : '이 개요 선택'}</button></article>; })}</div>}<div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface/40 p-4 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-medium text-white">{selectedOutline ? '개요가 선택되었습니다.' : '개요를 하나 선택해 주세요.'}</p><p className="mt-1 text-xs text-zinc-500">선택한 개요와 근거만 초안 생성에 사용됩니다.</p></div><button type="button" onClick={() => void generateDrafts()} disabled={!selectedOutline || busy !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{busy === 'drafts' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />} 초안 후보 3개 만들기</button></div></section>}

            {step === 'draft' && <section className="space-y-5" aria-labelledby="draft-step-title"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">03 · Draft</p><h2 id="draft-step-title" className="mt-1 text-2xl font-bold text-white">초안을 나란히 비교하세요</h2><p className="mt-1 text-sm text-zinc-400">글자 수 제한을 넘은 후보는 선택할 수 없습니다. 선택 후 직접 문장을 고칠 수 있습니다.</p></div><button type="button" onClick={() => void generateDrafts()} disabled={busy !== null || !selectedOutline} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"><Sparkles size={15} aria-hidden="true" /> 다시 생성</button></div><DraftParagraphMixer drafts={activeDrafts} charLimit={charLimit} busy={busy} onSelectDraft={draftId => void selectDraft(draftId)} onMerge={paragraphs => void mergeDrafts(paragraphs)} /></section>}

            {step === 'edit' && <section className="space-y-5" aria-labelledby="edit-step-title"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">04 · Final edit</p><h2 id="edit-step-title" className="mt-1 text-2xl font-bold text-white">직접 다듬고 확정하세요</h2><p className="mt-1 text-sm text-zinc-400">수정본은 revision으로 남습니다. 글자 수 제한을 넘으면 확정할 수 없습니다.</p></div>{selectedDraft && <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4" aria-labelledby="evaluation-title"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex items-center gap-2"><ClipboardCheck size={18} className="text-primary" aria-hidden="true" /><h3 id="evaluation-title" className="text-base font-semibold text-white">골든셋 품질 비교</h3></div><p className="mt-1 text-xs leading-5 text-zinc-400">최종 답변을 사례로 저장하면 글자 수, 금칙 표현, 사실 근거를 같은 기준으로 비교할 수 있습니다. 답변 원문은 평가 테이블에 복사하지 않습니다.</p></div>{!evaluationCase ? <button type="button" onClick={() => void createEvaluationCase()} disabled={!finalized || busy !== null} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"><ClipboardCheck size={14} aria-hidden="true" /> 사례로 저장</button> : <span className="shrink-0 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs text-primary">사례 저장됨</span>}</div>{evaluationError && <p role="alert" className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{evaluationError}</p>}{evaluationCase && <><div className="mt-4 grid gap-2 sm:grid-cols-4"><div className="rounded-lg border border-white/10 bg-background/40 px-3 py-2"><p className="text-[11px] text-zinc-500">기준 점수</p><p className="mt-1 text-lg font-semibold text-white">{evaluationCase.metrics.score.toFixed(1)}</p></div><div className="rounded-lg border border-white/10 bg-background/40 px-3 py-2"><p className="text-[11px] text-zinc-500">글자 수</p><p className={`mt-1 text-sm font-semibold ${evaluationCase.metrics.overLimit ? 'text-red-300' : 'text-zinc-200'}`}>{evaluationCase.metrics.charCount.toLocaleString()} / {evaluationCase.metrics.charLimit.toLocaleString()}</p></div><div className="rounded-lg border border-white/10 bg-background/40 px-3 py-2"><p className="text-[11px] text-zinc-500">금칙 표현</p><p className="mt-1 text-sm font-semibold text-zinc-200">{evaluationCase.metrics.bannedExpressionCount}개</p></div><div className="rounded-lg border border-white/10 bg-background/40 px-3 py-2"><p className="text-[11px] text-zinc-500">사실 근거</p><p className="mt-1 text-sm font-semibold text-zinc-200">{Math.round(evaluationCase.metrics.factCitationCoverage * 100)}%</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void runEvaluation('studio')} disabled={!finalized || busy !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50">{busy === 'evaluation-studio-studio' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ClipboardCheck size={14} aria-hidden="true" />} 최종 답변 평가</button>{activeDrafts.filter(draft => draft.id !== selectedDraft.id).map((draft, index) => <button key={`evaluation-${draft.id}`} type="button" onClick={() => void runEvaluation('baseline', draft.id)} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50">{busy === `evaluation-baseline-${draft.id}` && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} 초안 {index + 1} 비교</button>)}</div>{evaluationRuns.length > 0 && <div className="mt-4 overflow-x-auto rounded-lg border border-white/10"><table className="min-w-full text-left text-xs"><caption className="sr-only">골든셋 평가 결과</caption><thead className="bg-background/40 text-zinc-500"><tr><th scope="col" className="px-3 py-2 font-medium">변형</th><th scope="col" className="px-3 py-2 font-medium">점수</th><th scope="col" className="px-3 py-2 font-medium">글자 수</th><th scope="col" className="px-3 py-2 font-medium">사실 근거</th><th scope="col" className="px-3 py-2 font-medium">실행 시각</th></tr></thead><tbody className="divide-y divide-white/10">{evaluationRuns.map(run => <tr key={run.id} className="text-zinc-300"><td className="px-3 py-2">{run.variant === 'studio' ? '최종 답변' : '초안 비교'}</td><td className="px-3 py-2 font-semibold text-white">{run.metrics.score.toFixed(1)}</td><td className="px-3 py-2">{run.metrics.charCount.toLocaleString()} / {run.metrics.charLimit.toLocaleString()}{run.metrics.overLimit ? ' · 초과' : ''}</td><td className="px-3 py-2">{Math.round(run.metrics.factCitationCoverage * 100)}%</td><td className="px-3 py-2 text-zinc-500">{new Date(run.createdAt).toLocaleString('ko-KR')}</td></tr>)}</tbody></table></div>}</>}</section>}{selectedDraft ? <div className="rounded-2xl border border-white/10 bg-surface/55 p-4 md:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Badge variant={finalized ? 'success' : 'pending'}>{finalized ? '최종 확정됨' : '편집 중'}</Badge><span className={`text-xs ${editedCount > charLimit ? 'text-red-300' : 'text-zinc-500'}`}>{editedCount.toLocaleString()} / {charLimit.toLocaleString()}자</span></div><span className="text-xs text-zinc-600">revision {details.revisions.length}개</span></div><textarea value={editedContent} onChange={event => setEditedContent(event.target.value)} maxLength={100_000} disabled={finalized} className="min-h-[420px] w-full resize-y rounded-xl border border-white/10 bg-background px-4 py-4 text-sm leading-7 text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-80" /><div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-zinc-500">{editedCount > charLimit ? '글자 수를 줄인 뒤 저장·확정해 주세요.' : '선택한 활동 근거와 개요를 바탕으로 직접 문장을 완성하세요.'}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditedContent(selectedDraft.content)} disabled={busy !== null || finalized} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"><X size={14} aria-hidden="true" /> 되돌리기</button><button type="button" onClick={() => void saveDraft()} disabled={busy !== null || finalized || editedCount === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"><Save size={14} aria-hidden="true" /> 저장</button><button type="button" onClick={() => void finalizeDraft()} disabled={busy !== null || finalized || editedCount === 0 || editedCount > charLimit} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"><CheckCircle2 size={14} aria-hidden="true" /> 최종 확정</button>{finalized && details.styleProfile && <button type="button" onClick={() => void promoteStyleExample()} disabled={busy !== null || styleExampleSaved} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"><Sparkles size={14} aria-hidden="true" />{styleExampleSaved ? '말투 예문에 저장됨' : '말투 예문으로 저장'}</button>}</div></div></div> : <div className="rounded-2xl border border-dashed border-white/15 bg-surface/30 px-5 py-12 text-center text-sm text-zinc-500">먼저 초안 후보를 선택해 주세요.</div>}</section>}
        </div>
    );
}
