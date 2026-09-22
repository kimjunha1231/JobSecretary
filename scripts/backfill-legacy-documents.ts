import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { parseLegacyDocument, type LegacyDocumentInput } from '../entities/cover-letter/api/legacy-document-adapter.ts';

type LegacyDocumentRow = LegacyDocumentInput & {
    user_id: string;
};

type BackfillFailure = {
    documentId: string;
    reason: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const applyChanges = process.env.BACKFILL_APPLY === 'true';

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

function hashContent(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
}

async function loadLegacyDocuments(): Promise<LegacyDocumentRow[]> {
    const { data, error } = await supabase
        .from('documents')
        .select('id, user_id, title, company, role, content, status, deadline')
        .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as LegacyDocumentRow[];
}

async function backfillDocument(document: LegacyDocumentRow): Promise<'created' | 'skipped' | 'review'> {
    const draft = parseLegacyDocument(document);

    if (!applyChanges) {
        return draft.parseStatus === 'needs_review' ? 'review' : 'created';
    }

    const { data: existing, error: existingError } = await supabase
        .from('cover_letters')
        .select('id')
        .eq('legacy_document_id', document.id)
        .eq('user_id', document.user_id)
        .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return 'skipped';

    const now = new Date().toISOString();
    const content = document.content ?? '';
    const sourceStatus = draft.parseStatus === 'needs_review' ? 'needs_review' : 'approved';

    const { data: source, error: sourceError } = await supabase
        .from('source_documents')
        .insert({
            user_id: document.user_id,
            kind: 'cover_letter',
            title: draft.title,
            origin_type: 'pasted_text',
            raw_text: content,
            content_hash: hashContent(content),
            mime_type: 'text/markdown',
            status: sourceStatus,
            extraction_method: 'manual',
            extraction_version: 'legacy-documents-v1',
            approved_at: sourceStatus === 'approved' ? now : null,
        })
        .select('id')
        .single();

    if (sourceError || !source) throw sourceError ?? new Error('Source document was not created.');

    const { data: target, error: targetError } = await supabase
        .from('job_targets')
        .insert({
            user_id: document.user_id,
            company: draft.company,
            role: draft.role,
            deadline: draft.deadline ?? null,
            status: 'draft',
        })
        .select('id')
        .single();

    if (targetError || !target) throw targetError ?? new Error('Job target was not created.');

    const { error: targetSourceError } = await supabase.from('job_target_sources').insert({
        job_target_id: target.id,
        source_document_id: source.id,
        user_id: document.user_id,
        source_role: 'manual',
        is_primary: true,
    });
    if (targetSourceError) throw targetSourceError;

    const { data: coverLetter, error: coverLetterError } = await supabase
        .from('cover_letters')
        .insert({
            user_id: document.user_id,
            job_target_id: target.id,
            legacy_document_id: document.id,
            title: draft.title,
            company: draft.company,
            role: draft.role,
            deadline: draft.deadline ?? null,
            status: draft.status,
            legacy_content: draft.legacyContent,
            version: 1,
        })
        .select('id')
        .single();

    if (coverLetterError || !coverLetter) throw coverLetterError ?? new Error('Cover letter was not created.');

    for (const question of draft.questions) {
        const { data: fragment, error: fragmentError } = await supabase
            .from('source_fragments')
            .insert({
                source_document_id: source.id,
                user_id: document.user_id,
                locator: {
                    type: 'legacy_markdown_section',
                    position: question.position,
                    legacyDocumentId: document.id,
                },
                content: question.answer,
            })
            .select('id')
            .single();

        if (fragmentError || !fragment) throw fragmentError ?? new Error('Source fragment was not created.');

        const { error: questionError } = await supabase.from('cover_letter_questions').insert({
            cover_letter_id: coverLetter.id,
            user_id: document.user_id,
            question: question.question,
            char_limit: question.charLimit ?? null,
            position: question.position,
            final_answer: question.answer,
            status: draft.parseStatus === 'needs_review' ? 'needs_review' : 'finalized',
        });
        if (questionError) throw questionError;
    }

    return draft.parseStatus === 'needs_review' ? 'review' : 'created';
}

const documents = await loadLegacyDocuments();
const failures: BackfillFailure[] = [];
const questionCount = documents.reduce((count, document) => count + parseLegacyDocument(document).questions.length, 0);
const contentManifest = documents
    .map(document => `${document.id}:${hashContent(document.content ?? '')}`)
    .sort()
    .join('\n');
let created = 0;
let skipped = 0;
let review = 0;

for (const document of documents) {
    try {
        const result = await backfillDocument(document);
        if (result === 'created') created += 1;
        if (result === 'skipped') skipped += 1;
        if (result === 'review') review += 1;
    } catch (error) {
        failures.push({
            documentId: document.id,
            reason: error instanceof Error ? error.message : 'Unknown backfill error',
        });
    }
}

console.log(JSON.stringify({
    mode: applyChanges ? 'apply' : 'dry-run',
    total: documents.length,
    questionCount,
    contentManifestHash: hashContent(contentManifest),
    created,
    skipped,
    needsReview: review,
    failed: failures.length,
    failures,
}, null, 2));

if (failures.length > 0) {
    process.exitCode = 1;
}
