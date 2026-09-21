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
    const files = list('supabase/migrations').filter(file => file.endsWith('.sql'));
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
    ];
    const missing = required.flatMap(([, expected]) => expected.filter(file => !verifyFiles.has(file)));
    addCheck(
        'Read-only Supabase verify SQL coverage',
        missing.length === 0,
        missing.length === 0 ? `${required.length}개 migration 그룹의 verify SQL 확인됨` : `누락: ${missing.join(', ')}`,
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
