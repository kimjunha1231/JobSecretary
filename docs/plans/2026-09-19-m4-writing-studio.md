# M4 작성 스튜디오 구현 계획

## 결과와 범위

승인된 지원 요구사항과 활동 근거를 세션에 연결하고, 사용자가 근거를 선택한 뒤 개요 후보 3개와 초안 후보 3개를 비교·선택·수정·확정할 수 있는 작성 작업대를 추가한다. M4-b에서는 한 세션의 여러 문항, 문단 단위 병합, 문장별 사실 근거 검증을 이어 붙인다.

이번 단계에서는 PDF 내보내기, 벡터 검색, 말투 프로필 자동 학습, 운영 Supabase 적용은 제외한다. AI는 서버에서만 호출하며, 사용자가 선택하지 않은 활동이나 승인되지 않은 요구사항은 생성 context에 넣지 않는다.

## 현재 근거

- `entities/writing-session/model/types.ts`와 `entities/draft-candidate/model/types.ts`에 세션·근거 매칭·개요·초안 도메인 타입은 있으나 저장 테이블과 서비스가 없다.
- M1 migration에 `career_items`, `evidence_records`, `job_requirements`, `cover_letters`, `cover_letter_questions`와 사용자별 RLS가 존재한다.
- M3-b에서 지원 대상과 승인된 공고 요구사항 API가 구현되어 있다.
- 현재 `/career`는 source document 검수만 제공하므로 M4 화면에서 직접 입력한 활동 근거를 승인 상태로 추가할 수 있는 최소 입력을 제공한다.

## M4-a 완료 조건과 검증

1. 인증 사용자가 지원 대상과 문항으로 작성 세션을 만들고 새로고침 후 세션을 다시 불러올 수 있다.
2. 승인된 요구사항과 승인된 근거만 매칭 후보로 보이며, 사용자가 선택·제외·고정할 수 있다.
3. 선택한 근거가 없으면 개요·초안 AI 호출이 시작되지 않는다.
4. 개요 후보는 서로 다른 전략 또는 주장으로 3개 저장되고 선택할 수 있다.
5. 선택한 개요와 근거로 초안 후보 3개를 저장하고 비교 화면에서 하나를 선택할 수 있다.
6. 글자 수 제한을 넘는 초안은 선택·최종 확정할 수 없다.
7. 근거 선택이 바뀌면 기존 개요·초안은 `stale`로 표시되고 다시 생성해야 한다.
8. 최종 확정과 사용자 수정은 revision으로 저장된다.
9. AI context는 JSON 원문을 불신 데이터로 감싸고, 응답 ID는 서버 allowlist로 다시 검증한다.

검사: `npm run harness:verify`, 더미 환경변수 `npm run build`, `git diff --check`, AI JSON/근거 allowlist/글자 수·stale 단위 테스트.

## 실행 순서

1. [x] M4 저장 테이블·RLS migration과 도메인 타입 보완
2. [x] 근거/작성 세션 서버 서비스 및 인증·소유권 검증
3. [x] 개요·초안 생성 adapter와 AI 사용량 제한
4. [x] API route와 `/writing/new`, `/writing/[sessionId]` 작업대 UI
5. [x] 테스트·빌드·계획 업데이트

## 실제 결과

- `supabase/migrations/20260919010000_m4_writing_studio.sql`에 작성 세션·근거 매칭·개요·초안·revision 테이블과 강제 RLS를 추가했다. 운영 DB에는 적용하지 않았다.
- `/api/writing-sessions/**`와 `/api/evidence-records`를 추가하고, 모든 조회·변경에서 인증 사용자와 세션/자료 소유권을 다시 확인한다.
- 승인된 요구사항·활동만 생성 context에 포함하고, Gemini JSON의 근거 ID를 서버 allowlist로 검증한다. 선택 변경 시 기존 후보를 `stale`로 만든다.
- `/writing/new`와 `/writing/[sessionId]`에서 근거 선택·직접 활동 추가·개요 3개·초안 3개·문단 없는 직접 편집·최종 확정 흐름을 연결했다.
- 검증: `npm run harness:verify` 19 suites/161 tests, 더미 환경변수 `npm run build`, `git diff --check` 통과.

## 위험과 복구

- 새 migration은 코드 저장소에만 추가하고 운영 Supabase에는 적용하지 않는다.
- AI 실패·잘못된 JSON·근거 ID 불일치는 후보를 저장하지 않고 오류로 반환한다.
- 세션 조회에 필요한 테이블이 운영 DB에 아직 없으면 API가 실패할 수 있으므로 배포 전 migration dry-run과 RLS 검증을 수행한다.

## M4-b 범위와 완료 조건

1. 한 작성 세션을 만들 때 문항을 여러 개 등록하고 작업대의 문항 탭으로 전환할 수 있다.
2. 근거·개요·초안·revision이 활성 문항별로 분리되어 다른 문항의 후보가 섞이지 않는다.
3. 초안 비교 화면에서 문단마다 후보를 선택해 하나의 병합 초안을 만들 수 있고, 병합 이력이 revision에 남는다.
4. 숫자·날짜·회사·프로젝트 등 사실 문장에 선택한 활동 근거를 연결한다. 근거 없는 사실 문장은 저장은 가능하지만 최종 확정은 차단한다.
5. AI 응답의 문장 인용 ID·문장 원문·중복 문장 번호를 서버에서 다시 검증한다.

### M4-b 실행 결과

- `supabase/migrations/20260919020000_m4b_fact_citation_multi_question.sql`에서 `cover_letter_id`, 문항별 후보 범위, `draft_fact_citations`와 강제 RLS를 additive하게 추가했다. 운영 Supabase에는 적용하지 않았다.
- 작성 세션 생성 API와 `/writing/new` 화면이 `questions[]`를 지원하고, 작업대는 문항 탭과 문항별 근거·개요·초안 조회를 제공한다.
- `/api/writing-sessions/[id]/drafts/merge`와 문단 mixer로 세 후보의 문단을 조합하고, 병합 초안은 선택된 상태와 revision으로 저장한다.
- AI 초안 schema가 문장별 citation을 요구하며, 사용자가 편집 화면에서 사실 문장별 활동을 연결할 수 있다. 근거가 없는 사실 문장은 최종 확정 전에 오류로 안내한다.
- 운영 적용 전 `supabase/verify/rls-m4-writing-studio.sql`에 `draft_fact_citations`가 포함되는지 확인하고 migration 순서를 검증해야 한다.

### M4-b 검증 결과

`npm run harness:verify`(19개 스위트/162개 테스트), 더미 환경변수 `npm run build`, `git diff --check`를 통과했다. AI 문장 citation 누락 테스트는 writing studio 단위 테스트에 포함했으며, 다중 문항·문단 병합 입력은 타입 검사와 build에서 API route 생성까지 확인했다.
