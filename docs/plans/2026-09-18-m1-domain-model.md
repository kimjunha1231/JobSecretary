# M1 도메인 모델과 기존 문서 이전 기반

## 목표

기존 `documents` 문자열 모델을 삭제하지 않고, 이후 이력서·포트폴리오·근거 선택형 작성 기능이 사용할 수 있는 핵심 도메인 타입과 Supabase 테이블 기반을 추가한다. 이번 단계에서는 파일/OCR 수집기, 실제 backfill 실행, 새 UI를 범위에서 제외하고 읽기·검수 가능한 구조를 먼저 고정한다.

## 현재 근거

- 기존 문서는 `entities/document/model/types.ts`의 단일 `Document`로 회사·직무·문항·답변이 한 `content` 문자열에 합쳐져 있다.
- `features/document-write/ui/resume-form.tsx`는 `### 문항 (글자 수)` Markdown 규칙으로 여러 문항을 저장한다.
- 저장소에는 Supabase schema migration이 없고, M0에서 RLS migration만 추가된 상태다.
- 운영 Supabase schema와 실제 문서 수는 확인하지 못했으므로 backfill은 dry-run 기본으로 둔다.

## 이번 단계 범위

1. `CONTEXT.md`에 도메인 용어와 불변 규칙 기록
2. source document, career item, evidence record, job target, cover letter, writing session, draft candidate, style profile의 Zod public model 추가
3. 핵심 테이블(source, fragment, career, evidence, job, cover letter)과 사용자 소유 RLS migration 추가
4. 기존 문서 Markdown을 문항 초안으로 변환하는 순수 adapter와 단위 테스트 추가
5. Supabase service-role 기반 backfill script 추가(기본 dry-run, `BACKFILL_APPLY=true`일 때만 쓰기)

## 완료 조건

- 새 도메인 모델은 enum/status와 사용자 입력 길이를 코드에서 검증한다.
- migration은 기존 `documents`를 삭제하거나 변경하지 않고 새 테이블만 추가한다.
- 새 테이블의 select/insert/update/delete가 `auth.uid() = user_id` 정책으로 보호된다.
- Markdown 문항이 0개, 1개, 여러 개인 경우를 모두 보존하고 파싱 실패는 `needs_review`로 보고된다.
- backfill script는 기본 실행에서 쓰기를 하지 않고, 문서 수·성공·검수 필요·실패 수와 본문 해시만 출력한다.
- 기존 harness와 production build가 통과한다.

## 위험과 복구

- 운영 schema가 제안 컬럼과 다르면 migration은 적용 전 실패해야 하며, 기존 `documents`는 건드리지 않는다.
- backfill은 `BACKFILL_APPLY=true`를 명시하지 않으면 읽기 전용이며, 중복 방지를 위해 `legacy_document_id`를 확인한다.
- 이후 단계에서 domain schema가 바뀌면 새 migration을 추가하고 기존 source/cover letter를 삭제하지 않는다.

## 진행

- [x] domain vocabulary — `CONTEXT.md` 추가
- [x] public models — 7개 entity의 Zod schema와 input/status 타입 추가
- [x] schema/RLS migration — source/career/evidence/job/cover-letter 기반 테이블과 RLS 추가
- [x] legacy adapter and tests — Markdown 문항 분리, 빈/비정형 본문 검수 상태 테스트
- [x] dry-run backfill script — `BACKFILL_APPLY=true` 없이는 쓰기 금지, 문서 수·문항 수·본문 manifest hash 보고
- [x] regression verification — lint, TypeScript, Jest(14 suites/138 tests), production build 통과

## 검증 기록

- `npm run lint` 통과
- `npx tsc --noEmit` 통과
- `npm test -- --runInBand` 통과 (14 suites, 138 tests)
- 더미 환경변수 기반 `npm run build` 통과
- `npm run backfill:legacy`는 환경변수 미설정 시 쓰기 전에 중단됨을 확인
- 운영 Supabase에 migration/backfill을 실행하지 않음
