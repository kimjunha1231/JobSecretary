import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

type Check = { name: string; ok: boolean; detail: string };

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const checks: Check[] = [];

function addCheck(name: string, ok: boolean, detail: string): void {
    checks.push({ name, ok, detail });
}

function read(relativePath: string): string {
    return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function list(relativeDirectory: string): string[] {
    return readdirSync(path.join(repoRoot, relativeDirectory), { withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => entry.name);
}

function walk(relativeDirectory: string): string[] {
    const absoluteDirectory = path.join(repoRoot, relativeDirectory);
    const result: string[] = [];
    const visit = (directory: string) => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const absolutePath = path.join(directory, entry.name);
            if (entry.isDirectory()) visit(absolutePath);
            else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) result.push(absolutePath);
        }
    };
    visit(absoluteDirectory);
    return result;
}

function verifyMigrationOrder(): void {
    const files = list('supabase/migrations')
        .filter(file => file.endsWith('.sql'))
        .sort((left, right) => left.localeCompare(right));
    const parsed = files.map(file => ({
        file,
        timestamp: /^([0-9]{14})_/.exec(file)?.[1] ?? '',
    }));
    const invalid = parsed.filter(item => item.timestamp.length === 0);
    const sorted = [...parsed].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    const timestamps = parsed.map(item => item.timestamp);
    const duplicateTimestamps = timestamps.filter((value, index) => value && timestamps.indexOf(value) !== index);
    addCheck(
        'Supabase migration filename/order',
        invalid.length === 0 && duplicateTimestamps.length === 0 && parsed.every((item, index) => item.file === sorted[index]?.file),
        invalid.length > 0
            ? `timestamp가 없는 파일: ${invalid.map(item => item.file).join(', ')}`
            : duplicateTimestamps.length > 0
                ? `중복 timestamp: ${[...new Set(duplicateTimestamps)].join(', ')}`
                : `${parsed.length}개 migration이 timestamp 순서로 정렬됨`,
    );

    const dangerousFiles = files.filter(file => /(?:drop\s+(?:table|schema|database)|truncate\s+)/i.test(read(path.join('supabase/migrations', file))));
    addCheck(
        'Migration destructive SQL guard',
        dangerousFiles.length === 0,
        dangerousFiles.length === 0 ? 'drop table/schema/database 및 truncate 없음' : `확인 필요: ${dangerousFiles.join(', ')}`,
    );
}

function verifyReadOnlyScripts(): void {
    const verifyFiles = new Set(list('supabase/verify'));
    const required: Array<[string, string[]]> = [
        ['20260918000000', ['rls-documents.sql']],
        ['20260918000001', ['rls-user-profiles.sql']],
        ['20260918010000', ['rls-m1-domain.sql']],
        ['20260918020000', ['rls-m2-source-ingestion.sql']],
        ['20260919010000', ['rls-m4-writing-studio.sql']],
        ['20260919030000', ['rls-m5-style-profile.sql']],
        ['20260919050000', ['rls-m5c-style-evaluation.sql']],
        ['20260919060000', ['rls-m2-source-storage.sql']],
        ['20260919070000', ['rls-m5h-blind-style-preferences.sql']],
        ['20260920010000', ['rls-m5j-source-style-examples.sql']],
        ['20260921010000', ['rls-m5k-retrieval-labels.sql']],
        ['20260922010000', ['rls-m6h-career-profiles.sql']],
        ['20260922020000', ['m6n-career-credential-kind.sql']],
        ['20260922030000', ['m6r-career-activity-revisions.sql']],
    ];
    const missing = required.flatMap(([, expected]) => expected.filter(file => !verifyFiles.has(file)));
    addCheck(
        'Read-only Supabase verify SQL coverage',
        missing.length === 0,
        missing.length === 0 ? `${required.length}개 migration 그룹의 verify SQL 확인됨` : `누락: ${missing.join(', ')}`,
    );

    const careerProfileVerify = read('supabase/verify/rls-m6h-career-profiles.sql')
        .replace(/--.*$/gm, '')
        .trim();
    const careerProfileStatements = careerProfileVerify
        .split(';')
        .map(statement => statement.trim())
        .filter(Boolean);
    const careerProfileVerifyIsReadOnly = careerProfileStatements.length > 0
        && careerProfileStatements.every(statement => /^select\b/i.test(statement));
    const careerProfileSecurityChecks = [
        'has_table_privilege',
        'row_security_forced',
        'has_only_expected_owner_policies',
        'has_user_id_primary_key',
        'has_auth_user_cascade_foreign_key',
        'has_skills_limit',
        'has_all_profile_length_checks',
        'pg_policies',
    ].every(fragment => careerProfileVerify.includes(fragment));
    addCheck(
        'Career profile verify security coverage',
        careerProfileVerifyIsReadOnly && careerProfileSecurityChecks,
        careerProfileVerifyIsReadOnly && careerProfileSecurityChecks
            ? 'RLS, effective grants, owner policies, keys, and input limits are checked with SELECT only'
            : 'career_profiles verify SQL의 읽기 전용 및 보안 확인 항목을 검토해야 함',
    );

    const credentialKindMigration = read('supabase/migrations/20260922020000_m6n_career_credential_kind.sql');
    const credentialKindVerify = read('supabase/verify/m6n-career-credential-kind.sql')
        .replace(/--.*$/gm, '')
        .trim();
    const credentialKindStatements = credentialKindVerify
        .split(';')
        .map(statement => statement.trim())
        .filter(Boolean);
    const credentialKindVerifyIsReadOnly = credentialKindStatements.length > 0
        && credentialKindStatements.every(statement => /^select\b/i.test(statement));
    const credentialKindContractPresent = credentialKindMigration.includes('career_items_kind_check')
        && credentialKindMigration.includes("'credential'")
        && credentialKindVerify.includes('career_items_kind_check')
        && credentialKindVerify.includes('has_credential_kind_check');
    addCheck(
        'Career credential kind migration coverage',
        credentialKindVerifyIsReadOnly && credentialKindContractPresent,
        credentialKindVerifyIsReadOnly && credentialKindContractPresent
            ? 'credential 종류의 additive constraint migration과 SELECT-only verify SQL 확인됨'
            : 'career_items credential constraint migration/verify SQL을 검토해야 함',
    );

    const activityRevisionMigration = read('supabase/migrations/20260922030000_m6r_career_activity_revisions.sql');
    const activityRevisionVerify = read('supabase/verify/m6r-career-activity-revisions.sql')
        .replace(/--.*$/gm, '')
        .trim();
    const activityRevisionStatements = activityRevisionVerify
        .split(';')
        .map(statement => statement.trim())
        .filter(Boolean);
    const activityRevisionVerifyIsReadOnly = activityRevisionStatements.length > 0
        && activityRevisionStatements.every(statement => /^select\b/i.test(statement));
    const reviseFunctionStart = activityRevisionMigration.indexOf('create or replace function public.revise_evidence_activity(');
    const restoreFunctionStart = activityRevisionMigration.indexOf('create or replace function public.restore_evidence_activity_revision(');
    const statusFunctionStart = activityRevisionMigration.indexOf('create or replace function public.set_evidence_activity_status(');
    const reviseFunctionSql = reviseFunctionStart >= 0 && restoreFunctionStart > reviseFunctionStart
        ? activityRevisionMigration.slice(reviseFunctionStart, restoreFunctionStart)
        : '';
    const restoreFunctionSql = restoreFunctionStart >= 0 && statusFunctionStart > restoreFunctionStart
        ? activityRevisionMigration.slice(restoreFunctionStart, statusFunctionStart)
        : '';
    const activityRevisionSecurityContract = [
        'security invoker',
        "set search_path = ''",
        'auth.uid()',
        'revoke all on function',
        'to authenticated',
        'career_item_snapshot',
        'revision_of',
        'restored_from_id',
    ].every(fragment => activityRevisionMigration.toLowerCase().includes(fragment.toLowerCase()))
        && activityRevisionMigration.toLowerCase().includes('p_next_status is null')
        && reviseFunctionSql.length > 0
        && !reviseFunctionSql.includes('public.evidence_sources')
        && restoreFunctionSql.includes('insert into public.evidence_sources')
        && restoreFunctionSql.includes('source.evidence_record_id = v_target_record.id');
    const activityRevisionVerifyContract = [
        'has_revision_columns',
        'row_security_enabled',
        'row_security_forced',
        'has_only_authenticated_owner_policy',
        'authenticated_can_update_career_items',
        'authenticated_can_insert_evidence',
        'authenticated_can_restore_sources',
        'uses_security_invoker',
        'has_empty_search_path',
        'authenticated_can_execute_all',
        'anon_cannot_execute_any',
        'public_cannot_execute_any',
    ].every(fragment => activityRevisionVerify.includes(fragment));
    addCheck(
        'Career activity revision migration coverage',
        activityRevisionVerifyIsReadOnly && activityRevisionSecurityContract && activityRevisionVerifyContract,
        activityRevisionVerifyIsReadOnly && activityRevisionSecurityContract && activityRevisionVerifyContract
            ? 'revision columns, forced owner RLS, required invoker table/function grants, and SELECT-only verification are present'
            : 'career activity revision migration/verify SQL의 원자성 및 권한 경계를 검토해야 함',
    );
}

function verifyEnvironmentTemplate(): void {
    const envExample = read('.env.example');
    const requiredNames = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'GEMINI_API_KEYS',
        'NEXT_PUBLIC_WRITING_STUDIO_ENABLED',
    ];
    const missing = requiredNames.filter(name => !new RegExp(`^${name}=`, 'm').test(envExample));
    addCheck(
        'Environment template',
        missing.length === 0,
        missing.length === 0 ? `${requiredNames.length}개 필수 환경변수 이름이 .env.example에 있음` : `누락: ${missing.join(', ')}`,
    );

    const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
    const requiredScripts = ['dev', 'build', 'harness:verify', 'start'];
    const missingScripts = requiredScripts.filter(name => typeof packageJson.scripts?.[name] !== 'string');
    addCheck(
        'Required npm scripts',
        missingScripts.length === 0,
        missingScripts.length === 0 ? requiredScripts.join(', ') : `누락: ${missingScripts.join(', ')}`,
    );
}

function verifyPrivacyBoundaries(): void {
    const sourceFiles = ['app', 'widgets', 'features', 'entities', 'shared'].flatMap(walk);
    const clientSecretLeaks = sourceFiles.filter(file => {
        const content = readFileSync(file, 'utf8');
        return /['"]use client['"]/.test(content) && content.includes('SUPABASE_SERVICE_ROLE_KEY');
    });
    addCheck(
        'Client service-role boundary',
        clientSecretLeaks.length === 0,
        clientSecretLeaks.length === 0 ? 'use client 파일에서 service-role key 참조 없음' : `확인 필요: ${clientSecretLeaks.map(file => path.relative(repoRoot, file)).join(', ')}`,
    );

    const sentryFiles = ['instrumentation-client.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts'];
    const missingPrivacyGuards = sentryFiles.filter(file => {
        const content = read(file);
        return !content.includes('sendDefaultPii: false');
    });
    const clientReplay = read('instrumentation-client.ts');
    const replayMasked = ['maskAllText: true', 'maskAllInputs: true', 'blockAllMedia: true'].every(value => clientReplay.includes(value));
    addCheck(
        'Sentry privacy boundary',
        missingPrivacyGuards.length === 0 && replayMasked,
        missingPrivacyGuards.length === 0 && replayMasked ? 'PII 비활성화 및 replay text/input/media 마스킹 확인됨' : 'Sentry 개인정보 보호 설정을 확인해야 함',
    );
}

verifyMigrationOrder();
verifyReadOnlyScripts();
verifyEnvironmentTemplate();
verifyPrivacyBoundaries();

for (const check of checks) {
    console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`);
}

if (checks.some(check => !check.ok)) {
    process.exitCode = 1;
} else {
    console.log(`\nRollout preflight passed (${checks.length} checks). No remote state was changed.`);
}
