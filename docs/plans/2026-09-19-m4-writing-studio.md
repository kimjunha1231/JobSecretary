# 작성 스튜디오·말투 개인화 구현 계획

## 결과와 범위

승인된 지원 요구사항과 활동 근거를 세션에 연결하고, 사용자가 근거를 선택한 뒤 개요 후보 3개와 초안 후보 3개를 비교·선택·수정·확정할 수 있는 작성 작업대를 추가한다. M4-b에서는 한 세션의 여러 문항, 문단 단위 병합, 문장별 사실 근거 검증을 이어 붙인다.

M4 단계에서는 PDF 내보내기, 벡터 검색, 말투 프로필 자동 학습, 운영 Supabase 적용을 제외한다. AI는 서버에서만 호출하며, 사용자가 선택하지 않은 활동이나 승인되지 않은 요구사항은 생성 context에 넣지 않는다.

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

## M2-c 이미지형 PDF 수동 보정

### 범위와 완료 조건

1. 텍스트 레이어가 없는 PDF가 자동 추출에 실패해도 자료를 버리지 않고 `manual_input` 상태로 보존한다.
2. 사용자가 자료 상세 화면에서 본문을 붙여넣어 보정하고, 기존 fragment를 새 텍스트 기준으로 교체할 수 있다.
3. 보정 저장은 승인 상태를 유지하지 않고 `needs_review`로 되돌려 다시 검수하게 한다.

### 실행 결과

- `/api/source-documents/[id]/text` PATCH와 `sourceDocumentService.updateManualText`를 추가했다. 서버가 사용자 소유·입력 크기·문서 종류를 확인하고 본문 hash와 fragment를 다시 만든다.
- `/career`의 `manual_input` 자료에 `본문 보정` 편집기를 연결했다. 저장 뒤에는 자동으로 검수 필요 상태가 되며, 기존 자료·원본 PDF는 삭제하지 않는다.
- OCR 공급자 없이 자동 성공으로 표시하지 않고, 텍스트 레이어가 없는 자료는 사용자가 확인 가능한 수동 경로로 전환한다.
- 검증: 수동 보정 ID·인증 경계 테스트와 기존 source ingestion 테스트, `npm run harness:verify`(23개 스위트/180개 테스트), 더미 환경변수 `npm run build`, `git diff --check` 통과.

## M2-d 검수형 활동 후보 추출

### 범위와 완료 조건

1. 승인된 이력서·포트폴리오·기존 자기소개서에서 프로젝트·경력·교육·수상 등의 활동 후보를 서버에서 구조화한다.
2. 모델이 반환한 원문 fragment ID를 사용자 소유 allowlist와 대조하고, 출처가 없는 후보·중복 후보를 저장하지 않는다.
3. 후보를 자동 승인하지 않고 사용자가 비교한 뒤 저장 또는 제외를 선택할 수 있다.
4. 저장된 활동은 원문 `evidence_sources` 인용과 함께 승인된 활동 라이브러리·PDF 출력에서 재사용할 수 있다.

### 실행 결과

- `features/career-extraction`에 Gemini JSON schema·불신 데이터 경계·분당 3회 AI 사용량 제한·fragment allowlist·중복 제거를 추가하고 `/api/source-documents/[id]/suggestions`로 노출했다. 자료가 승인되지 않았거나 보관된 경우에는 호출을 시작하지 않는다.
- `/career` 자료 카드에 `활동 후보 만들기`와 검수 패널을 추가했다. 신뢰도·요약·기여·행동·결과·성과를 비교한 뒤 `활동으로 저장`을 눌러야만 승인된 `career_items`·`evidence_records`가 생성된다.
- `evidenceRecordService.createManual`은 후보의 timeline과 사용자 소유 `sourceFragmentIds`를 검증하고, 저장된 근거마다 `evidence_sources` 원문 인용을 연결한다. 출처 연결에 실패하면 새 활동·근거를 정리한 뒤 오류를 반환한다.
- 후보 parser의 코드펜스·잘못된 JSON·출처 불일치·중복 제거를 단위 테스트로 고정했다. 원격 Supabase/Vercel 설정과 migration은 이 단계에서 변경하지 않았다.

### M2-d 검증 결과

`npm run harness:verify`(25개 스위트/187개 테스트), 더미 환경변수 `npm run build`(exit 0), `git diff --check`를 통과했다. 브라우저 실사용 검증은 인증된 Supabase 환경이 필요해 실행하지 않았다.

## M5-a 말투 프로필과 설명 가능한 품질 요약

### 범위와 완료 조건

1. 사용자가 소유한 말투 프로필과 예문을 저장하고, 예문을 승인/해제/삭제할 수 있다.
2. 작성 세션 시작 시 프로필을 선택하고, 승인된 예문만 생성 context에 전달한다.
3. 말투 자료는 사실 근거와 별도 객체로 전달하며, 예문의 회사·수치·사건을 근거로 사용하지 않도록 AI 계약을 명시한다.
4. 기존 선택·후보·citation·revision 데이터에서 근거 선택률, 후보 수, 사용자 수정 횟수, 사실 근거 커버리지를 설명 가능한 요약으로 계산한다.
5. 서비스·API·RLS·프롬프트 경계를 단위 테스트와 build로 확인한다.

### 실행 결과

- `supabase/migrations/20260919030000_m5_style_profile_quality.sql`에 `style_profiles`, `style_examples`와 사용자 소유 RLS를 추가했다. 예문 정책은 프로필 소유권까지 확인하며, 운영 Supabase에는 적용하지 않았다.
- `/style`에서 프로필의 끝맺음·선호 연결어·금칙어·직접 작성 예문을 입력하고 승인 상태를 관리한다. `/writing/new`에서 사용할 프로필을 선택할 수 있고, `/writing/[sessionId]` 헤더에 적용 프로필과 작업 품질 요약을 표시한다.
- `styleProfileService.getForGeneration`은 승인된 예문만 반환한다. AI context의 `style`은 말투 참고 자료로만 취급하고, 사실·수치·고유명사를 생성 근거로 재사용하지 않도록 개요·초안 system instruction을 고정했다.
- `buildWritingQualitySummary`는 DB 이벤트를 새로 만들지 않고 현재 세션의 선택 근거, 활성 후보, revision, 사실 citation에서 재현 가능한 지표를 계산한다. 운영용 golden set, A/B 평가, pgvector 검색은 M5 전체 범위에서 후속으로 남겼다.

### 검증

`npm run harness:verify`(20개 스위트/165개 테스트), 더미 환경변수 `npm run build`(exit 0), `git diff --check`를 통과했다. 말투 context/예문 경계·금칙어 검증과 품질 요약 계산 단위 테스트를 추가했다.

### 남은 위험과 다음 단계

- 새 migration은 아직 원격 Supabase에 적용하지 않았다. 적용 전 migration 순서, style_examples의 프로필 소유권 RLS, 기존 세션의 null `style_profile_id`를 `supabase/verify/rls-m5-style-profile.sql`로 읽기 전용 검증해야 한다.
- 최종 확정 문장 승격과 질문별 예문 범위는 M5-b에서 연결했다. 남은 M5 범위는 금칙어 회귀 검증을 포함한 golden set 평가, A/B 비교, 검색 품질 측정이다.
- 검색 품질이 실제 활동 라이브러리에서 부족하다는 측정 결과가 확인된 뒤에만 pgvector/RAG를 도입한다. 지금은 승인 근거 allowlist와 설명 가능한 지표를 기준선으로 유지한다.

## M5-c 골든셋 평가와 작성 품질 비교

### 범위와 완료 조건

1. 승인된 최종 답변을 사실 근거·말투·글자 수 검증이 가능한 평가 사례로 등록할 수 있다.
2. 기존 즉시 생성 경로와 작성 스튜디오 후보를 동일한 질문·근거에서 비교할 수 있다.
3. 평가는 원문 내용을 로그에 복제하지 않고 사용자 소유의 사례와 요약 지표만 저장한다.
4. 근거 없는 주장, 금칙어, 글자 수 초과, 사용자 수정률을 반복 실행해 회귀를 확인할 수 있다.

### 접근

- 새 모델 호출이나 pgvector 도입보다 먼저 결정론적 평가 runner를 만든다. 현재 서비스가 이미 계산하는 citation·금칙어·글자 수·revision 지표를 같은 기준으로 재사용한다.
- 평가 사례와 실행 결과는 사용자 소유 RLS로 보호하고, 답변 원문은 사례 등록 시 서버에서 읽어 해시와 지표만 저장한다.
- 벡터 검색은 전문 검색 기준선과 골든셋 결과가 부족하다는 증거가 생긴 뒤 별도 migration으로 분리한다.

### 실행 순서

1. [x] 골든셋 도메인 모델·migration·RLS와 평가 runner를 추가한다.
2. [x] 작성 세션에서 최종 답변을 평가 사례로 등록하는 API와 비교 화면을 추가한다.
3. [x] 금칙어·citation·글자 수·수정률 회귀 테스트와 결과 요약을 추가한다.
4. [x] harness/build/diff 검증 후 외부 구현 계획을 갱신한다.

### M5-c 실행 결과

- `entities/style-evaluation`에 답변 원문을 저장하지 않고 SHA-256 hash와 결정론적 지표만 기록하는 평가 runner를 추가했다. 글자 수 초과, 금칙 표현, 사실 문장·citation 커버리지, 사용자 수정률을 동일한 기준으로 계산한다.
- `supabase/migrations/20260919050000_m5c_style_evaluation.sql`에 사용자 소유 `style_evaluation_cases`·`style_evaluation_runs`와 강제 RLS를 추가했다. 세션·문항·말투 프로필·비교 초안의 소유권을 정책에서 다시 확인하며, 운영 Supabase에는 적용하지 않았다.
- `/api/writing-sessions/[id]/evaluation-cases`와 `/api/style-evaluation-cases/[id]/runs`를 추가하고, 작성 작업대에서 최종 답변을 골든셋 사례로 저장한 뒤 최종 답변과 초안을 비교할 수 있게 연결했다.
- `tests/unit/entities/style-evaluation-service.test.ts`에 동일 입력 결정성, citation 누락, 인증·ID 경계 테스트를 추가했다.
- 검증: `npm run harness:verify`(25개 스위트/187개 테스트), 더미 환경변수 `npm run build`, `git diff --check` 통과.

## M6-b 승인 활동 이력서·포트폴리오 PDF

### 범위와 완료 조건

1. 승인된 활동 근거를 이력서형·포트폴리오형 A4 PDF로 다운로드할 수 있다.
2. 승인 상태가 아닌 활동은 서버에서 다시 걸러지고, 활동·근거·사용자 내부 ID는 출력하지 않는다.
3. 자료가 없을 때 빈 PDF 대신 사용자가 승인 절차를 먼저 수행하도록 안내한다.

### 실행 결과

- `buildCareerProfilePdfPayload`가 승인된 `career_items`·`evidence_records`만 안전한 문단으로 묶고 `/api/career/export?format=portfolio|resume`에서 서버 PDF로 반환한다.
- `/career`에 승인된 활동 라이브러리와 포트폴리오·이력서 PDF 다운로드 링크를 추가했다. 기존 원본 자료와 검수 흐름은 삭제하거나 덮어쓰지 않는다.
- 활동 PDF에 승인된 프로젝트의 역할·기여·상황/행동/결과·성과·기술만 표시하고 내부 UUID·AI metadata는 넣지 않는다.
- 검증: PDF payload 단위 테스트에 승인 경계·내부 ID 비노출·빈 목록 차단을 추가했고 `npm run harness:verify`(25개 스위트/187개 테스트), 더미 환경변수 `npm run build`, `git diff --check`를 통과했다.

## M6-a 한국어 PDF 출력과 기존 문서 전환

### 범위와 완료 조건

1. 최종 확정 자기소개서, 기존 문서, 승인된 경력 자료를 A4 PDF로 다운로드할 수 있다.
2. 내부 evidence ID·프롬프트·평가용 메타데이터는 제출용 PDF에 노출하지 않는다.
3. 한국어 글꼴을 외부 CDN에 의존하지 않고 페이지 나눔·줄바꿈·헤더·푸터를 유지한다.
4. 기존 `/write` 문서는 삭제하지 않고 새 출력 API와 전환 링크를 제공한다.

### 접근

- 서버 Node runtime의 `@react-pdf/renderer`를 사용하고, 저장된 최종 답변을 서버에서 다시 확인한 뒤 PDF를 생성한다.
- 새 작성 세션은 모든 문항이 `finalized`인 경우에만 제출용 자기소개서 PDF를 허용한다. 기존 문서는 사용자 소유권을 확인한 뒤 legacy adapter를 통해 같은 템플릿으로 렌더링한다.
- OCR은 공급자 없이 자동 성공으로 가장하지 않는다. 스캔 PDF는 `manual_input` 경고로 남기고 사용자가 보정한 텍스트만 경력 근거로 승인한다.

### 실행 순서

1. [x] 한국어 PDF renderer·템플릿·Node API route를 추가한다.
2. [x] 작성 작업대와 기존 문서 상세 화면에 다운로드 UI를 연결한다.
3. [x] PDF 텍스트·페이지 수·한글 글리프·페이지 이미지 visual QA를 추가한다.
4. [x] 기존 `/write` 전환 링크와 `NEXT_PUBLIC_WRITING_STUDIO_ENABLED=false` rollback flag를 추가하고 계획을 갱신한다.

### M6-a 실행 결과

- `entities/export`에 서버 전용 PDF payload 검증·한국어 Pretendard 글꼴·A4 템플릿을 추가하고, `/api/writing-sessions/[id]/export`와 `/api/documents/[id]/export`를 연결했다.
- 작성 세션 PDF는 모든 문항이 `finalized`이고 답변이 비어 있지 않을 때만 생성한다. 기존 문서는 `parseLegacyDocument` adapter로 문항을 복원해 같은 템플릿으로 출력한다.
- 기존 클라이언트 `@react-pdf/renderer` 동적 로딩과 외부 CDN 글꼴 의존성을 제거하고, 브라우저는 서버 PDF 응답만 다운로드한다.
- 검증: `npm run harness:verify`(22개 스위트/172개 테스트), 더미 환경변수 `npm run build`(exit 0), PDF 샘플 2페이지의 텍스트·PNG visual QA, `git diff --check` 통과.

## M5-b 최종 답변 예문 승격과 문항별 말투 자료

### 범위와 완료 조건

1. 최종 확정된 자기소개서 문항만 `approved_final` 말투 예문으로 승격할 수 있다.
2. 승격 API가 인증 사용자, 확정 문항, 선택된 말투 프로필을 모두 다시 확인하고 임의의 본문을 받지 않는다.
3. 예문은 전역 자료 또는 특정 문항 자료로 구분되며, 생성 시 현재 문항에 맞는 전역·문항별 승인 예문만 사용한다.
4. `/writing/[sessionId]`에서 확정 답변을 예문으로 저장하고 `/style`에서 문항별 출처를 확인할 수 있다.
5. 기존 예문과 세션은 migration 후에도 유지되고, 문항 소유권 RLS를 통과한다.

### 접근

- `style_examples.question_id`를 nullable FK로 추가해 기존 전역 예문과 호환한다.
- 본문을 클라이언트에서 전달받아 `approved_final`로 표시하지 않고, 서비스가 `cover_letter_questions.final_answer`와 `status = finalized`를 읽어 저장한다.
- 질문별 조회는 프로필 소유권과 질문 소유권을 모두 확인한 뒤 전역 예문과 현재 문항 예문만 합친다. pgvector나 새 검색 계층은 추가하지 않는다.

### 실행 순서

1. [x] style example 모델·migration·RLS에 `question_id`와 문항 소유권을 추가한다.
2. [x] 확정 답변 승격 서비스와 API를 추가하고 중복 저장을 방지한다.
3. [x] 작성 작업대의 승격 버튼과 `/style`의 문항별 표시를 연결한다.
4. [x] 질문별 prompt context, 소유권·승격·중복 방지 테스트를 추가한다.
5. [x] harness/build/diff 검증 후 이 계획과 외부 구현 계획을 갱신한다.

### M5-b 실행 결과

- `supabase/migrations/20260919040000_m5b_question_style_examples.sql`에서 기존 예문을 전역(`question_id is null`)으로 유지하면서 문항별 FK·인덱스·문항 소유권 RLS를 추가했다. 운영 Supabase에는 적용하지 않았다.
- `styleProfileService.promoteFinalAnswer`는 본문을 클라이언트에서 받지 않고 사용자 소유의 `cover_letter_questions.final_answer`와 `status = finalized`를 확인해 `approved_final` 예문으로 저장한다. 같은 프로필·문항·본문을 다시 저장하면 기존 예문을 반환한다.
- 작성 작업대의 최종 확정 화면에서 선택된 말투 프로필로 답변을 예문에 승격할 수 있고, `/style`에서는 전역/문항별·직접 작성/최종 확정 출처를 구분해 확인할 수 있다.
- 질문별 세션 조회는 전역 승인 예문과 현재 문항의 승인 예문만 prompt context에 포함한다. 다른 문항의 예문이나 다른 사용자의 자료는 포함하지 않는다.
- 검증: `npm run harness:verify`(21개 스위트/169개 테스트), 더미 환경변수 `npm run build`(exit 0), `git diff --check` 통과.
