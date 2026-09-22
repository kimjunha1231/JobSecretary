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
- 초안 후보에는 선택적인 `angle` 중심 관점을 함께 받으며, 서버가 같은 관점의 후보가 반복되는지 검증한다. 구버전 응답은 첫 문장을 임시 관점으로 사용하고, 비교 카드에 관점을 표시한다.
- 운영 적용 전 `supabase/verify/rls-m4-writing-studio.sql`에 `draft_fact_citations`가 포함되는지 확인하고 migration 순서를 검증해야 한다.

### M4-b 검증 결과

`npm run harness:verify`(19개 스위트/162개 테스트), 더미 환경변수 `npm run build`, `git diff --check`를 통과했다. AI 문장 citation 누락 테스트는 writing studio 단위 테스트에 포함했으며, 다중 문항·문단 병합 입력은 타입 검사와 build에서 API route 생성까지 확인했다. 초안 관점 중복 방지 회귀 테스트도 추가했다.

## M2-c 이미지형 PDF 수동 보정

### 범위와 완료 조건

1. 텍스트 레이어가 없는 PDF가 자동 추출에 실패해도 자료를 버리지 않고 `manual_input` 상태로 보존한다.
2. 사용자가 자료 상세 화면에서 본문을 붙여넣어 보정하고, 기존 fragment를 새 텍스트 기준으로 교체할 수 있다.
3. 보정 저장은 승인 상태를 유지하지 않고 `needs_review`로 되돌려 다시 검수하게 한다.

### 실행 결과

- `/api/source-documents/[id]/text` PATCH와 `sourceDocumentService.updateManualText`를 추가했다. 서버가 사용자 소유·입력 크기·문서 종류를 확인하고 본문 hash와 fragment를 다시 만든다.
- `/career`의 `manual_input` 자료에 `본문 보정` 편집기를 연결했다. 저장 뒤에는 자동으로 검수 필요 상태가 되며, 기존 자료·원본 PDF는 삭제하지 않는다.
- OCR 공급자가 비활성화된 환경에서는 자동 성공으로 표시하지 않고 수동 경로로 전환한다. 활성화된 환경에서도 OCR은 사용자가 명시적으로 실행한 뒤 `needs_review`로 남아 대조·승인을 요구한다.
- 검증: 수동 보정·OCR ID·인증 경계 테스트와 기존 source ingestion 테스트, `npm run harness:verify`(31개 스위트/220개 테스트), 더미 환경변수 `npm run build`, `git diff --check` 통과.

## M2-d 검수형 활동 후보 추출

### 범위와 완료 조건

1. 승인된 이력서·포트폴리오·기존 자기소개서에서 프로젝트·경력·교육·수상 등의 활동 후보를 서버에서 구조화한다.
2. 모델이 반환한 원문 fragment ID를 사용자 소유 allowlist와 대조하고, 출처가 없는 후보·중복 후보를 저장하지 않는다.
3. 후보를 자동 승인하지 않고 사용자가 비교한 뒤 저장 또는 제외를 선택할 수 있다.
4. 저장된 활동은 원문 `evidence_sources` 인용과 함께 승인된 활동 라이브러리·PDF 출력에서 재사용할 수 있다.

### 실행 결과

- `features/career-extraction`에 Gemini JSON schema·불신 데이터 경계·분당 3회 AI 사용량 제한·fragment allowlist·중복 제거를 추가하고 `/api/source-documents/[id]/suggestions`로 노출했다. 자료가 승인되지 않았거나 보관된 경우에는 호출을 시작하지 않는다.
- `/career` 자료 카드에 `활동 후보 만들기`와 검수 패널을 추가했다. 신뢰도·요약·기여·행동·결과·성과를 비교하고 제목·조직·역할·서술을 직접 편집한 뒤 `활동으로 저장`을 눌러야만 승인된 `career_items`·`evidence_records`가 생성된다.
- `evidenceRecordService.createManual`은 후보의 timeline과 사용자 소유 `sourceFragmentIds`를 검증하고, 저장된 근거마다 `evidence_sources` 원문 인용을 연결한다. 출처 연결에 실패하면 새 활동·근거를 정리한 뒤 오류를 반환한다.
- 후보 parser의 코드펜스·잘못된 JSON·출처 불일치·중복 제거를 단위 테스트로 고정했다. 원격 Supabase/Vercel 설정과 migration은 이 단계에서 변경하지 않았다.

### M2-d 검증 결과

`npm run harness:verify`(25개 스위트/187개 테스트), 더미 환경변수 `npm run build`(exit 0), `git diff --check`를 통과했다. 브라우저 실사용 검증은 인증된 Supabase 환경이 필요해 실행하지 않았다.

## M2-e 비공개 원본 Storage 보관

### 범위와 완료 조건

1. 업로드·붙여넣기·공개 URL로 등록한 원문을 사용자별 비공개 Storage 경로에 보관한다.
2. 원본 다운로드는 문서 소유권을 서버에서 확인한 뒤 5분 만료 서명 링크로만 허용한다.
3. Storage RLS가 `{user_id}/...` prefix를 강제하고, 등록 실패·객체 삭제 실패를 조용한 성공으로 바꾸지 않는다.
4. 회원 탈퇴 시 원본 객체를 먼저 정리하고 auth 사용자 삭제를 수행한다.

### 실행 결과

- `sourceDocumentService.register`가 추출 입력의 원본 바이트를 `source-documents/{user_id}/{document_id}/original.*`에 업로드하고 `source_documents.storage_path`를 저장한다. Storage API가 없는 테스트 double에서는 기존 추출 경계를 유지한다.
- `/api/source-documents/[id]/original`은 사용자 소유 문서만 조회하고 300초짜리 signed URL로 redirect한다. `/career` 카드에서 보관된 원본을 다시 열 수 있다.
- `supabase/migrations/20260919060000_m2_source_storage.sql`에 private bucket과 select/insert/update/delete Storage policy를 추가하고, `supabase/verify/rls-m2-source-storage.sql`에 읽기 전용 점검 쿼리를 추가했다. 운영 Supabase에는 아직 적용하지 않았다.
- 회원 탈퇴 route는 사용자 prefix 아래의 중첩 객체를 정리한 뒤 auth 계정을 삭제한다. 원본 정리에 실패하면 탈퇴를 완료하지 않는다.

### M2-e 검증 결과

`npm run harness:verify`(25개 스위트/189개 테스트), 더미 환경변수 `npm run build`(exit 0), `git diff --check`를 통과했다. 실제 bucket/RLS와 signed URL은 운영 자격 증명이 없어 원격에서 검증하지 않았다.

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
- 저장된 프로필의 설정을 직접 수정하는 UI를 연결했다. 과장 정도(`exaggerationLevel`)와 끝맺음·연결어·금칙어는 사용자가 저장한 값만 다음 생성 context에 들어가며, draft system instruction이 문장 길이와 과장 정도를 말투 제약으로 해석한다.
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

## M5-d 한국어 근거 검색 기준선

### 범위와 판단 기준

1. 공고 요구사항과 승인된 활동을 연결하는 현재 결정론적 검색이 한국어 띄어쓰기·조사·복합어에서도 같은 활동을 놓치지 않도록 정규화한다.
2. 활동 제목·조직·역할·기술·역량 태그는 서술 본문보다 높은 가중치를 주어 사용자가 검토할 우선순위를 설명 가능하게 만든다.
3. 검색 결과는 여전히 승인된 활동과 사용자 소유 데이터만 대상으로 하며, 벡터 저장소나 외부 임베딩 호출을 추가하지 않는다.
4. pgvector/RAG 도입은 실제 사용자 골든셋의 Recall@k·nDCG@k가 이 기준선에 미달하는 측정 결과가 나온 뒤 별도 migration으로 결정한다.

### 실행 결과

- `entities/writing-session/api/writing-session.service.ts`에 NFKC·한국어 소문자·공백 정규화, 조사 접미사 제거, 복합어 문자 bigram 변형을 추가했다. 예를 들어 `검색개선`과 `검색 개선`이 같은 검색 후보로 비교된다.
- 제목·조직·역할·기술·역량 태그의 겹침에는 높은 가중치를, 상황·행동·결과 서술에는 보조 가중치를 적용하고, 설명 가능한 phrase boost와 검토 가능한 최소 점수를 유지한다.
- `tests/unit/entities/writing-session-retrieval.test.ts`에서 복합어 recall, 제목/기술 태그 우선순위, 무관 활동의 검토용 점수 바닥값을 결정론적으로 고정했다.

### M5-d 검증 결과

`npm run harness:verify`(26개 스위트/192개 테스트), 더미 환경변수 `npm run build`, `git diff --check`를 통과했다. 이 단계는 검색 기준선만 개선하며, 실제 사용자 blind A/B나 pgvector/RAG 품질 개선을 완료했다고 의미하지 않는다.

## M5-e 근거 검색 품질 측정 runner

### 범위와 완료 조건

1. 실제 작성 흐름에서 사용하는 동일한 결정론적 ranking으로 Recall@k·nDCG@k·MRR@k를 계산한다.
2. 골든셋 사례마다 정답 근거 ID를 별도로 지정하고, 답변·활동 원문을 평가 결과에 복제하지 않는다.
3. 관련 근거가 없는 사례는 전체 평균에 조용히 0점으로 섞지 않고 별도 개수로 표시한다.
4. 동점 점수의 순서를 evidence ID로 고정해 같은 입력이 항상 같은 결과를 낸다.

### 실행 결과

- `rankEvidence`를 작성 세션의 실제 추천 생성 경로와 평가 runner가 함께 사용하도록 추출했다. 점수 내림차순 뒤 evidence ID 오름차순으로 tie-break하며, 기존 추천 수 제한도 같은 함수로 적용한다.
- `evaluateEvidenceRetrieval`은 승인 근거 후보와 사용자가 표시한 정답 evidence ID만 받아 `caseCount`, `evaluatedCaseCount`, `emptyRelevantLabelCount`, `recallAtK`, `ndcgAtK`, `mrrAtK`를 반환한다. 원문·프롬프트·답변은 저장하거나 반환하지 않는다.
- `tests/unit/entities/writing-session-retrieval.test.ts`에 완전 적중, top-k 누락, 빈 relevance label, 잘못된 k 및 결정론적 tie-break 회귀를 추가했다.

### M5-e 검증 결과

runner는 순수 함수로 단위 검증했으며, 실제 사용자 골든셋 데이터가 아직 없어 운영 검색 품질 수치를 주장하지 않는다. pgvector/RAG 도입 여부는 이 runner에 실제 사례를 넣은 뒤 기준선과 비교해 결정한다.

## M5-f 승인 예문 기반 말투 분석 제안

### 범위와 완료 조건

1. 승인된 말투 예문에서 문장 길이·끝맺음·연결어를 서버에서 결정론적으로 분석한다.
2. 분석 결과에는 예문 원문이나 새로운 사실이 포함되지 않고, 분석한 예문 수와 신뢰도만 함께 표시한다.
3. 사용자가 결과를 확인해 반영하기 전에는 기존 프로필이나 생성 context를 자동으로 덮어쓰지 않는다.
4. 다른 사용자 프로필이나 미승인 예문이 분석 대상에 섞이지 않도록 서버 소유권·`approved=true` 조건을 적용한다.

### 실행 결과

- `analyzeStyleExamples`가 승인 예문만 대상으로 문장 길이 통계, 반복 끝맺음, 사전 정의 연결어 빈도를 계산한다. 원문·수치·고유명사는 결과에 넣지 않는다.
- `POST /api/style-profiles/[id]/analyze`는 사용자 소유 프로필을 확인한 뒤 분석 결과만 반환한다. `/style`에서는 `분석하기`와 `분석 결과를 프로필에 반영`을 분리해 사용자가 자율적으로 채택한다.
- 반영 시 기존 PATCH 경계를 재사용해 문장 길이·끝맺음·연결어·분석 메타데이터만 저장하고 금칙 표현은 자동 추론하지 않는다.
- 순수 분석, 미승인 예문 제외, 인증·소유권 경계를 단위 테스트로 고정했다.

### M5-f 검증 결과

`npm run harness:verify`(27개 스위트/199개 테스트), 더미 환경변수 `npm run build`, `git diff --check`를 통과했다. 이 기능은 모델 fine-tuning이 아니라 사용자가 승인한 자료에서 설명 가능한 말투 제안을 만드는 기준선이다.

## M5-g 작성 세션 검색 품질 측정 연결

### 범위와 완료 조건

1. 작성 작업대에서 사용자가 현재 질문의 근거를 선택한 뒤 동일한 runner를 호출할 수 있다.
2. 서버는 사용자 소유 세션의 승인 근거와 승인 요구사항만 읽고, 선택·고정된 match를 relevance label로 변환한다.
3. 빈 label을 숨기지 않고 별도 개수로 표시하며, 원문·답변·평가 결과를 새로 저장하지 않는다.

### 실행 결과

- `POST /api/writing-sessions/[id]/retrieval-evaluation`이 `k`(1~100, 기본 3)를 검증하고 세션 snapshot에서 평가 case를 만든다. 선택·고정된 근거만 label로 사용하고, 승인 목록에 없는 stale ID는 제외한다.
- `/writing/[sessionId]`의 근거 선택 단계에 `검색 품질 기준선` 카드를 추가해 Recall@k·nDCG@k·MRR@k, label이 있는 요구사항 수, 빈 label 수를 즉시 보여준다.
- `GET /api/writing-sessions/retrieval-evaluation`은 최근 사용자 소유 세션을 최대 20개까지 다시 읽어 같은 ranking으로 집계하고, `/style`에 최근 5개 세션의 Recall@3·nDCG@3·MRR@3 요약을 표시한다. 응답에는 원문·활동 내용·세션 ID를 넣지 않는다.
- 이 지표는 사용자의 현재 선택을 이용한 기준선이지 자동 정답 판정이 아니다. 실제 blind A/B와 충분한 골든셋을 수집한 뒤에만 검색 모델 교체나 pgvector/RAG를 결정한다.

### M5-g 검증 결과

라우트의 입력 검증·세션 소유권 위임·오류 응답을 단위 테스트로 고정하고, label 변환은 선택/고정·stale·중복 match 회귀를 검증한다. `npm run harness:verify`와 더미 환경변수 `npm run build`를 완료한 뒤 커밋한다.

## M5-h blind 답변 선호 비교

### 범위와 완료 조건

1. 최종 답변과 다른 초안 후보를 변형 이름·점수 없이 A/B로 보여 주고 사용자가 선호한 쪽을 선택할 수 있다.
2. 서버는 답변 원문을 새 평가 테이블에 복사하지 않고 두 answer hash, 좌우 배치, 선택 결과만 사용자 소유로 저장한다.
3. 이미 선택한 비교와 동시에 제출된 선택은 409로 차단하며, 비교 시작 전에 현재 문항·최종 답변·초안 소유권을 다시 확인한다.
4. 실제 선택 데이터가 충분히 쌓이기 전에는 해당 결과로 pgvector/RAG나 생성 모델 교체를 자동 결정하지 않는다.

### 실행 결과

- `style_evaluation_preferences` migration과 사용자 소유 RLS/읽기 전용 verify SQL을 추가했다. 선택 결과는 `selected_side`, `selected_variant`, `responded_at`과 hash만 저장한다.
- `styleEvaluationService.startBlindComparison`이 현재 평가 사례의 확정 답변과 사용자가 고른 비-stale 초안을 검증하고, 서버에서 좌우 변형을 무작위 배치한 뒤 원문을 화면에만 반환한다. `submitBlindPreference`는 조건부 update로 한 번만 선택을 허용한다.
- `/api/style-evaluation-cases/[id]/blind`와 작성 작업대의 `내용만 비교`/`이 답변 선택` UI를 연결했다. 사용자는 점수와 변형 이름을 보지 않고 내용만 비교할 수 있으며, 선택 이후에는 원문 없는 기록 안내를 받는다.

### M5-h 검증 결과

blind route의 성공·오류 응답, 잘못된 ID·인증 경계와 service 입력 검증을 단위 테스트로 추가한다. 실제 사용자 blind 선호율·작성 시간·수정률은 아직 수집 전이므로 M5 전체 완료 조건으로 기록하지 않는다.

## M5-i blind 선호 요약

### 범위와 완료 조건

1. blind 비교에서 사용자가 고른 변형과 응답 시각만 집계해 말투 프로필 화면에서 개인 기준선을 확인할 수 있다.
2. 요약 API는 답변 원문·hash·좌우 배치를 반환하지 않으며, `style_evaluation_preferences` 마이그레이션 전 배포에서는 기존 화면을 깨뜨리지 않고 `available: false`로 응답한다.
3. 요약은 자동 fine-tuning이나 프로필 덮어쓰기가 아니라 사용자가 다음 비교 사례를 만들고 직접 프로필을 조정하기 위한 설명 가능한 피드백으로 안내한다.

### 실행 결과

- `styleEvaluationService.getPreferenceSummary`가 사용자 소유 preference에서 전체 비교 수·응답 수·studio/baseline 선택 수·마지막 응답 시각만 계산한다.
- `/api/style-evaluation-preferences/summary`를 추가하고, `/style`의 말투 프로필 화면에 비교 현황 카드와 `/writing/new` 재진입 링크를 연결했다.
- 테이블이 아직 없는 환경의 PostgREST/DB 오류를 호환 처리하고, 집계 응답에 원문이 섞이지 않는 service·route 단위 테스트를 추가했다.

### M5-i 검증 결과

전체 정적 검사·단위 테스트·더미 환경변수 production build를 통과했다. `npm test -- --runInBand`는 32개 스위트/224개 테스트를 통과했으며, 실제 사용자 선호 데이터가 충분히 쌓이기 전에는 검색 모델·RAG·프로필 자동 변경을 실행하지 않는다.

## M6-b 승인 활동 이력서·포트폴리오 PDF

### 범위와 완료 조건

1. 승인된 활동 근거를 이력서형·포트폴리오형 A4 PDF로 다운로드할 수 있다.
2. 승인 상태가 아닌 활동은 서버에서 다시 걸러지고, 활동·근거·사용자 내부 ID는 출력하지 않는다.
3. 자료가 없을 때 빈 PDF 대신 사용자가 승인 절차를 먼저 수행하도록 안내한다.

### 실행 결과

- `buildCareerProfilePdfPayload`가 승인된 `career_items`·`evidence_records`만 안전한 문단으로 묶고 `/api/career/export?format=portfolio|resume`에서 서버 PDF로 반환한다.
- `/career`에 승인된 활동 라이브러리와 포트폴리오·이력서 PDF 다운로드 링크를 추가했다. 기존 원본 자료와 검수 흐름은 삭제하거나 덮어쓰지 않는다.
- 활동 PDF에 승인된 프로젝트의 역할·기여·상황/행동/결과·성과·기술만 표시하고 내부 UUID·AI metadata는 넣지 않는다. 최초 구현은 이력서와 포트폴리오의 본문 구성 차이가 충분하지 않았다.
- 검증: PDF payload 단위 테스트에 승인 경계·내부 ID 비노출·빈 목록 차단을 추가했고 `npm run harness:verify`(25개 스위트/187개 테스트), 더미 환경변수 `npm run build`, `git diff --check`를 통과했다.

### M6-b 보완: 이력서와 포트폴리오 출력 분리 (2026-09-22)

- 이력서는 조직·역할·기간을 메타 정보로 분리하고 요약·기여·행동·결과·성과·기술을 간결한 목록과 촘촘한 레이아웃으로 출력한다. 결과 문장에 정량 성과가 이미 포함되어 있으면 같은 지표를 반복하지 않는다.
- 포트폴리오는 조직·역할·기간 아래에 상황·문제·행동·결과·배운 점을 사례 서술형으로 유지한다. 두 출력 모두 승인된 활동만 사용하고 내부 식별자를 포함하지 않는다.
- `/career` 내보내기 선택 영역에 두 출력의 차이를 설명하는 안내를 추가했다.
- 검증: 전체 `npm run harness:verify`(49개 스위트/282개 테스트), Playwright E2E 19개, 더미 환경변수 `npm run build`, `npm run rollout:verify`(7개 검사), `git diff --check` 통과. 합성 자료로 이력서/포트폴리오 PDF를 렌더링해 A4 여백·한국어 글꼴·페이지 나눔을 시각 확인했다.
- Preview `https://coverlettervault-gupjoiokq-junhas-projects-a748ef77.vercel.app` 배포 `dpl_GUjcqdsxTFRAK22DqaX3SqoRDrmC`는 `READY`다. `/` 200, 비로그인 `/career` 307, 두 내보내기 API 401을 확인했고 배포 로그에 오류·경고가 없었다. Production alias와 원격 Supabase는 변경하지 않았다.

## M6-c 선택형 경력 자료 출력

### 범위와 완료 조건

1. 사용자가 승인된 활동 중 이력서·포트폴리오에 포함할 항목을 선택할 수 있다.
2. 선택 순서를 화면에서 바꾸면 서버가 그 순서를 그대로 PDF 문단 순서로 사용한다.
3. 선택된 ID는 서버에서 현재 사용자 소유·승인 상태를 다시 확인하며, 누락되거나 변조된 ID가 있으면 부분 PDF를 만들지 않는다.
4. 선택하지 않은 활동의 내용과 내부 ID는 PDF와 다운로드 응답에 포함하지 않는다.

### 실행 결과

- `/career` 승인 활동 카드에 선택 checkbox, 전체 선택/해제, 선택 순서 위·아래 이동과 선택 개수 안내를 추가했다. PDF 링크는 선택한 evidence ID와 순서를 URL에 담아 새로고침·공유 가능한 다운로드 요청으로 만든다.
- `/api/career/export`는 `ids`를 검증하고 `evidenceRecordService.getApprovedByIds`로 사용자 소유·승인 활동만 다시 읽는다. 요청 순서를 보존하고 선택 항목이 하나라도 빠지면 409로 중단한다.
- 기존 `ids` 없는 다운로드는 승인 활동 전체 출력으로 유지해 이전 링크와 호환한다.
- `getApprovedByIds` 요청 순서 회귀 테스트를 추가해 Supabase의 `in` 조회가 반환 순서를 바꾸더라도 PDF 순서가 흔들리지 않게 했다.

### M6-c 검증 결과

`npm run harness:verify`(26개 스위트/193개 테스트), 더미 환경변수 `npm run build`, `git diff --check`를 통과했다. 실제 Supabase RLS·Storage와 인증된 브라우저 다운로드는 운영 자격 증명 없이 원격 검증하지 않았다.

## M6-a 한국어 PDF 출력과 기존 문서 전환

### 범위와 완료 조건

1. 최종 확정 자기소개서, 기존 문서, 승인된 경력 자료를 A4 PDF로 다운로드할 수 있다.
2. 내부 evidence ID·프롬프트·평가용 메타데이터는 제출용 PDF에 노출하지 않는다.
3. 한국어 글꼴을 외부 CDN에 의존하지 않고 페이지 나눔·줄바꿈·헤더·푸터를 유지한다.
4. 기존 `/write` 문서는 삭제하지 않고 새 출력 API와 전환 링크를 제공한다.

### 접근

- 서버 Node runtime의 `@react-pdf/renderer`를 사용하고, 저장된 최종 답변을 서버에서 다시 확인한 뒤 PDF를 생성한다.
- 새 작성 세션은 모든 문항이 `finalized`인 경우에만 제출용 자기소개서 PDF를 허용한다. 기존 문서는 사용자 소유권을 확인한 뒤 legacy adapter를 통해 같은 템플릿으로 렌더링한다.
- 스캔 PDF OCR은 M6-d의 선택형 경로로 분리한다. 이 단계에서는 OCR 성공을 자동 승인으로 가장하지 않고, 수동 보정 또는 명시적 OCR 실행 뒤 항상 `needs_review`로 되돌린다.

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

## M6-d 선택형 스캔 PDF OCR fallback

### 범위와 완료 조건

1. 텍스트 레이어가 없는 PDF를 사용자가 직접 요청했을 때만 OCR adapter로 보낸다.
2. 원본 PDF의 사용자 소유권과 10MB 제한을 서버에서 확인하고, OCR 결과는 기존 원본 hash·저장 경로와 연결한다.
3. OCR 결과는 자동 승인·자동 활동 생성에 사용하지 않고 `needs_review`와 경고를 유지한다.
4. Gemini가 비활성화되거나 빈 결과를 반환하면 수동 본문 보정으로 복구하며, 승인·검수 완료 자료를 OCR로 덮어쓰지 않는다.

### 실행 결과

- `features/source-ocr`에 선택형 Gemini PDF adapter를 추가했다. 요청 전 `source_ocr` 사용자별 분당 2회 제한을 적용하고, 문서 안의 지시문은 불신 데이터로 처리하도록 system instruction을 고정했다.
- `sourceDocumentService.getOriginalBytes`는 사용자 소유 행과 private Storage 경로를 함께 확인해 원본 바이트를 읽는다. `updateOcrText`는 `manual_input` 자료만 허용하고 기존 PDF `content_hash`·`mime_type`·Storage 경로를 보존한 채 `ocr` fragment를 재생성한다.
- `/api/source-documents/[id]/ocr`와 `/career` 카드의 `AI OCR 실행` 버튼을 연결했다. 사용자는 원본 PDF가 Gemini로 전송된다는 사실을 확인할 수 있고, 결과를 본문에서 대조한 뒤에만 검수 완료할 수 있다. `SOURCE_OCR_PROVIDER=disabled` 설정은 수동 보정만 허용한다.

### M6-d 검증 결과

`tests/unit/features/source-ocr.test.ts`, `tests/unit/entities/source-document-service.test.ts`, `tests/unit/api/source-document-ocr-route.test.ts`에서 PDF inline data 전송, 빈 결과 fail-closed, 소유권·Storage 다운로드, 승인 상태 덮어쓰기 방지와 상태 코드를 검증한다. 전체 harness/build/diff 검증과 외부 구현 계획 갱신은 커밋 후 기록한다.

## M6-e 출력 센터 진입점

### 범위와 완료 조건

1. 승인 활동 PDF와 자기소개서 PDF 기능을 한 페이지에서 찾을 수 있다.
2. 출력 센터는 기존 `/career`, `/writing/new`, `/archive` 흐름으로만 연결하고 별도 복제 데이터를 만들지 않는다.
3. 인증되지 않은 사용자는 다른 보호 경로와 동일하게 랜딩 페이지로 돌아간다.

### 실행 결과

- `/exports`에 이력서·포트폴리오·자기소개서·기존 문서 카드를 추가하고, 승인 데이터만 출력한다는 검수 원칙과 A4 PDF 안내를 표시했다.
- 전역 사이드바에 `출력 센터`를 추가하고 middleware 보호 경로에 `/exports`를 포함했다.
- 기존 PDF API와 데이터 소유권·승인 검증은 변경하지 않아 출력 허브가 새로운 우회 경계를 만들지 않는다.
- E2E 보호 경로 목록과 랜딩 페이지 접근성 선택자를 현재 UI에 맞게 갱신했다.

### M6-e 검증 결과

`npm run harness:verify`(31개 스위트/220개 테스트), 더미 환경변수 `npm run build`(exit 0), `git diff --check`를 통과했다. Playwright Chromium E2E 19개 시나리오(랜딩·반응형·주요 보호 경로)를 통과하도록 `playwright.config.ts`를 `tests/e2e` 전용으로 정리했다. CUA 브라우저에서 랜딩 페이지와 비로그인 `/dashboard`, `/archive`, `/write`, `/exports` 리디렉션을 확인했으며, 인증된 출력 다운로드는 운영 자격 증명 없이 원격 검증하지 않았다.

## M6-f 작성 작업대 롤백 스위치

### 범위와 완료 조건

1. `NEXT_PUBLIC_WRITING_STUDIO_ENABLED=false`를 배포하면 기존 `/write` 화면의 새 작업대 링크뿐 아니라 `/writing/new` 직접 접근도 기존 화면으로 돌아간다.
2. 기본값은 활성화로 유지하고, 명시적인 문자열 `false`만 비활성화로 해석한다.
3. 플래그 판정은 한 곳에서 공유해 링크와 진입 경로가 서로 다른 상태를 보이지 않게 한다.

### 실행 결과

- `shared/config/features.ts`에 공통 `isWritingStudioEnabled` 판정을 만들고 기존 `/write` 링크 노출과 `/writing/new` 서버 리디렉션에서 함께 사용한다.
- 기능 플래그 단위 테스트로 기본 활성화·명시적 비활성화·다른 문자열의 회귀를 고정했다.

### M6-f 검증 결과

기능 플래그 단위 테스트, 린트, 타입 검사를 통과했다. 실제 Vercel 환경변수 변경과 운영 트래픽 전환은 사용자 승인 없이는 실행하지 않는다.

## M6-g 개인정보 없는 제품 완료율 측정

### 범위와 완료 조건

1. 작성 시작·근거/개요/초안/편집 단계 완료·최종 확정·PDF 출력·blind 선택을 Vercel Analytics custom event로 측정할 수 있다.
2. 이벤트 payload에는 원문, 회사명, 직무명, 질문, 세션 ID, 사용자 ID, URL, 오류 메시지를 넣지 않고 집계 가능한 값만 허용한다.
3. Analytics 전송 실패나 차단은 제품 동작에 영향을 주지 않으며, 기존 Sentry 오류 추적과 분리한다.

### 실행 결과

- `shared/lib/product-analytics.ts`에 이벤트 이름·속성 allowlist를 만들고 클라이언트에서만 호출하도록 했다.
- `/writing/new`, `/writing/[sessionId]`, `/career`에서 작성 funnel과 PDF 출력·blind 선택을 기록한다. 이벤트는 문서 내용이나 내부 ID를 전달하지 않는다.
- 근거·개요·초안 선택, 문단 병합, 수정 저장을 `writing_studio_choice` 집계 이벤트로 기록하고, 모든 문항 최종 확정 때 브라우저 `sessionStorage`의 시작 시각에서 총 작성 시간을 계산한다. 시간은 최대 24시간으로 제한하며 원문·세션 ID는 Analytics payload에 넣지 않는다.
- 이벤트 계층 자체를 단위 테스트해 임의의 text/identifier 제거와 Analytics 예외 무시를 고정했다.
- Supabase/Vercel 운영 적용 순서와 제안 완료율 기준은 `docs/operations/jobsecretary-rollout.md`에 별도로 기록해 실제 트래픽 전환 전 검증 항목을 재현할 수 있게 했다.

### M6-g 검증 결과

제품 Analytics·작성 시간 모듈 단위 테스트, 린트, 타입 검사를 통과했다. 실제 Vercel Analytics 대시보드의 이벤트 수치는 운영 배포와 사용자 트래픽이 필요하므로 아직 측정하지 않았다.

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
- 생성 context가 길이 제한에 걸릴 때 현재 문항에서 확정한 승인 예문을 먼저 사용하도록 문항 일치·작성 시각·예문 ID 순으로 결정론적으로 정렬한다.

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
- 생성 context가 길이 제한을 넘을 때는 현재 문항 예문을 전역 예문보다 먼저 잘라 사용해, 질문에 맞는 사용자의 실제 문체가 우선 유지된다. 문항별 예문·전역 예문·생성 context의 소유권 경계는 그대로 유지한다.
- 검증: `npm run harness:verify`(21개 스위트/169개 테스트), 더미 환경변수 `npm run build`(exit 0), `git diff --check` 통과.

## M5-j 기존 자기소개서 말투 자료 가져오기

### 범위와 완료 조건

1. 사용자가 검수 완료한 기존 자기소개서를 말투 프로필의 승인 예문으로 명시적으로 가져올 수 있다.
2. 서버가 자료·프로필의 사용자 소유권과 `cover_letter`·`approved` 상태를 다시 확인하며, 임의의 다른 자료나 미검수 원문을 말투 context에 넣지 않는다.
3. 가져온 예문은 `source_document_id`로 원본 연결을 보존하고, 사용자가 승인 해제·삭제할 수 있다.
4. 원문이 비어 있거나 20,000자를 넘으면 조용히 자르지 않고 수동 문단 추가를 안내한다.

### 실행 결과

- `StyleExampleSourceSchema`에 `source_document`를 추가하고 `StyleExampleSchema`에 선택적 `sourceDocumentId`를 연결했다.
- `styleProfileService.importSourceDocument`와 `POST /api/style-profiles/[id]/examples/from-source`를 추가했다. 서비스는 사용자 소유 프로필·검수 완료 `cover_letter` 자료·원문/fragment를 확인하고 동일 자료의 중복 가져오기를 멱등적으로 처리한다.
- `/style`에서 승인된 기존 자기소개서 목록을 선택해 프로필에 추가할 수 있게 했고, 예문 카드에 `기존 자기소개서` 출처를 표시했다. 생성에는 승인 상태인 예문만 전달된다.
- `20260920010000_m5j_source_style_examples.sql`에서 source FK·check constraint·사용자 소유와 승인 cover-letter 조건을 포함한 RLS를 추가했다. 운영 Supabase에는 적용하지 않았다.
- `supabase/verify/rls-m5j-source-style-examples.sql`을 추가해 column·FK·policy를 읽기 전용으로 확인할 수 있게 했다.

### M5-j 검증 결과

`npm run harness:verify`(36개 스위트/238개 테스트), 더미 환경변수 `npm run build`(exit 0), `git diff --check`를 통과했다. 운영 DB migration과 실제 사용자 문체 자료 import는 아직 실행하지 않았다.

## M5-a 말투 설정 초기화 보완

`/style`에서 저장된 문장 길이(최소·최대·평균)와 과장 정도를 직접 조정할 수 있게 했다. 과장 정도를 다시 `기본`으로 선택하면 클라이언트가 명시적인 `null`을 보내고, 서비스가 `exaggeration_level`을 null로 갱신한다. 최소 문장 길이가 최대 길이보다 큰 설정은 서버에서 거부한다. 분석 결과를 반영할 때도 문장 길이 설정이 함께 갱신된다. 이전 값이 남아 다음 생성에 계속 영향을 주는 회귀를 막기 위해 서비스 경계 테스트를 추가했다. 해당 수정 후 `npm run harness:verify`(37개 스위트/246개 테스트), 더미 환경변수 `npm run build`, `git diff --check`를 통과했다.

## M5-l 사용자 선택형 말투 예문

### 범위와 완료 조건

1. 작성 시작 전에 승인된 말투 예문을 최대 5개까지 사용자가 직접 고를 수 있다.
2. 예문을 선택하지 않은 기존 세션은 자동 최근 5개 선택을 유지하고, 빈 배열은 의도적으로 예문을 사용하지 않는 선택으로 구분한다.
3. 서버가 프로필 소유권·승인 상태·선택 ID를 다시 확인하며, 세션 설정에는 예문 ID만 저장한다.
4. 선택된 예문은 세션 상세와 개요·초안 생성 context에 동일하게 반영된다. 자동 선택은 현재 문항·전역 예문만 사용하고, 사용자가 직접 고른 같은 프로필의 다른 문항 예문은 명시적 선택으로 범위를 확장한다.

### 실행 결과

- `/writing/new`에 승인 예문 카드와 체크박스를 추가했다. 자동 선택/직접 선택 상태, 최대 5개 제한, 모두 해제 상태를 화면에 표시한다.
- `writingSessionService.create`는 선택 ID가 해당 사용자 소유·승인 예문인지 검증하고 `generation_settings.styleExampleIds`에 정규화된 ID 배열만 저장한다. 설정 키가 없으면 이전 동작을 보존한다.
- 세션 상세 조회에서 저장된 선택을 다시 적용해 말투 context와 실제 생성 입력의 예문 집합이 어긋나지 않게 했다. 자동 선택은 현재 문항·전역 예문으로 제한하고, 명시적으로 선택한 다른 문항 예문은 승인·소유권을 확인한 뒤 함께 전달한다. 예문 원문은 기존 `style_examples`에서만 읽고 세션에는 복제하지 않는다.
- 선택 없음·빈 선택·알 수 없는 ID 필터링을 순수 단위 테스트로 고정했다. 별도 Supabase migration은 필요하지 않으며 운영 DB에는 원격 변경을 적용하지 않았다.

### M5-l 검증 결과

`npm run harness:verify`(49개 스위트/280개 테스트), 더미 환경변수 `npm run build`, Playwright Chromium E2E, `git diff --check`를 통과했다. 승인되지 않은 예문이 세션 생성 전에 차단되는 서버 경계도 단위 테스트로 확인했다. 실제 말투 예문 선택과 생성 결과의 체감 품질은 인증된 사용자 평가가 필요하므로 운영 배포 후 별도 측정 대상으로 남긴다.

## M6-h 개인 이력서 프로필과 PDF 반영

### 현재 근거

- 제공된 이력서·포트폴리오는 이미지형 PDF라 텍스트 레이어가 없다. 로컬 OCR로 구조를 확인한 결과, 기본 인적사항·소개·핵심 기술 외에 학력·자격·수상·프로젝트가 제출 자료의 핵심을 이룬다.
- `/career`의 기존 PDF는 승인 활동을 출력하지만 이름, 소개, 연락처, 개인 링크, 전체 핵심 기술을 입력·저장하는 사용자 소유 리소스는 없다.
- 기존 경력 자료 종류에 `education`·`award`가 이미 있으므로 중복 데이터 모델은 추가하지 않고, 승인된 활동과 개인 헤더를 한 PDF에서 조합한다.

### 목표와 완료 조건

1. 사용자가 `/career`에서 이름·직무 소개·요약·연락처·링크·핵심 기술을 편집하고 저장할 수 있다.
2. 프로필은 로그인한 사용자만 읽고 수정할 수 있도록 별도 additive migration과 강제 RLS 정책으로 보호한다.
3. 이력서·포트폴리오 PDF에 입력한 프로필과 선택한 승인 활동을 함께 반영하되, 값이 비어 있으면 임의 정보를 만들지 않는다.
4. 프로필 테이블 migration 전 환경에서도 기존 승인 활동 PDF 다운로드는 계속 작동한다. 편집 화면은 migration 누락을 분명히 알린다.
5. 클라이언트의 사용자 ID를 신뢰하지 않고 서버 인증 세션에서 소유자를 결정하며, 원격 DB에 직접 DDL/DML을 실행하지 않는다.

### 실행 순서

1. 사용자 소유 `career_profiles` 테이블·RLS migration 및 읽기 전용 검증 SQL 추가
2. 입력 검증이 포함된 GET/PUT 단일 사용자 프로필 API 구현
3. `/career` 편집 UI와 접근성·로딩·실패 상태 연결
4. 승인 활동 PDF builder/renderer에 프로필 소개·기술·연락 링크 연결
5. 소유권·입력·출력 회귀 테스트, rollout preflight, build·E2E 확인 후 계획 갱신

### 위험과 경계

- 연락처는 개인정보이므로 owner-only RLS를 적용하고 로그·분석 이벤트·생성 prompt에 포함하지 않는다. 이 단계에서는 사용자가 PDF 출력을 직접 요청한 경우에만 문서에 포함한다.
- migration은 저장소에만 추가한다. Supabase 운영 적용은 별도 검증과 사용자 확인 뒤 진행한다.

### 실행 결과와 검증

- `career_profiles` 단일 사용자 행 테이블과 강제 RLS, `anon`/`public` 권한 회수, 인증 사용자 최소 권한(select/insert/update)만 허용하는 additive migration을 추가했다. 함께 제공하는 verify SQL은 컬럼·사용자 키·외래 키 cascade·RLS 강제·owner policy·권한을 읽기 전용으로 확인한다.
- `/api/career-profiles/me` GET/PUT은 세션에서 user ID를 구하고, 클라이언트가 보내는 user ID를 거부한다. 이메일·HTTP(S) 링크·길이·기술 목록을 검증하고, 프로필 응답은 `private, no-store`로 반환한다.
- `/career`에 이름·직무 소개·요약·연락처·개인 링크·핵심 기술 편집기를 추가했다. 저장 프로필은 생성 AI context에 넣지 않고, PDF에서만 사용한다. 학력·수상·프로젝트는 기존 승인 활동 모델을 재사용한다.
- 이력서·포트폴리오 PDF에 이름·소개·연락처·클릭 가능한 링크·핵심 기술을 추가했고, 기존 승인 활동 상세는 그대로 포함한다. 프로필 테이블이 아직 없는 환경에서는 기존 PDF export만 활동 기반으로 계속 작동한다.
- 검증: `npm run harness:verify -- --runInBand` 53개 스위트/295개 테스트, 더미 Supabase 환경변수 기반 `npm run build`, `npm run rollout:verify` 7개 사전 점검, Playwright Chromium E2E 19개, `git diff --check` 통과.
- Supabase 운영 migration 적용과 Vercel 배포는 실행하지 않았다. 따라서 기존 PDF 다운로드는 가능하지만, 새 프로필 저장 기능은 해당 migration 적용 후 활성화된다. 원본 이력서의 인적 정보는 코드나 DB에 임의 복사하지 않았으므로 프로필 화면에서 사용자가 확인 후 입력해야 한다.

## M6-i 이력서 프로필의 선택형 작성 context

### 현재 근거

- M6-h에서 `career_profiles`와 편집·PDF 흐름을 추가했지만, `features/writing-studio/api/generate-writing-candidates.ts`의 context에는 지원 대상·문항·말투·선택 활동만 들어간다.
- 사용자의 직무 소개·요약·핵심 기술은 사용자가 요청한 자기소개서 작성 근거로 연결되어 있지 않다. 이름·이메일·전화번호·위치·외부 링크까지 전달할 필요는 없다.
- 작성 세션은 이미 `generation_settings` JSON을 저장하므로 새 원격 스키마 변경 없이 opt-in과 서버가 만든 비민감 프로필 snapshot을 세션 단위로 보존할 수 있다.

### 완료 조건

1. 새 작성 세션에서 프로필 사용은 기본 비활성이고 사용자가 매번 명시적으로 선택한다.
2. 선택 시 서버가 인증 사용자 프로필을 가져오며, 직무 소개·요약·핵심 기술만 세션 snapshot과 AI context에 포함한다. 클라이언트 임의 프로필 값은 받지 않는다.
3. 이름·연락처·위치·개인 링크는 세션 설정·AI prompt에 저장/전달되지 않는다.
4. 프로필은 강조 방향을 안내할 뿐 프로젝트·성과·회사·날짜·수치를 뒷받침하는 근거로 사용하지 않는다. 구체 주장은 계속 사용자가 선택한 승인 활동과 citation으로 제한한다.
5. 비활성·기존 세션의 동작은 그대로 유지되고, 프로필 migration 누락/빈 프로필은 작성 자료를 만들기 전에 명확한 오류로 반환한다.

### 실행 순서와 검증

1. `/writing/new`에 기본 꺼짐의 프로필 참고 선택과 전송 범위 안내를 추가하고 request에 boolean opt-in만 보낸다.
2. 작성 세션 서비스가 opt-in이 켜진 경우에만 서버 세션으로 프로필을 확인하고 허용 필드만 `generation_settings`에 snapshot으로 저장한다.
3. outline/draft prompt에 허용된 snapshot만 포함하고, 근거·citation system instruction의 범위는 바꾸지 않는다.
4. 입력 경계, owner lookup, 미적용 migration/빈 profile, 연락처 비포함, opt-in/default-off, prompt grounding을 자동 테스트한다.
5. harness, build, rollout preflight, diff 검증 후 운영 Supabase/Vercel은 변경하지 않고 계획을 갱신한다.

### 위험과 경계

- 사용자가 opt-in했을 때만 선택한 직무 소개·요약·기술이 외부 AI provider의 생성 입력이 된다. 이를 화면에서 명시하고 세션별로 기본 꺼짐을 유지한다.
- 프로필 내용은 사용자 작성 맥락이지 활동 증거가 아니다. 성과 주장이나 인용 허용목록을 확대하지 않는다.

### 실행 결과와 검증

- `/writing/new`에 기본 꺼짐의 세션별 opt-in을 추가했고, 선택되는 필드와 제외되는 개인정보를 생성 전에 안내한다. 작성 작업대에서도 실제 사용된 snapshot을 확인할 수 있다.
- `writingSessionService.create`는 opt-in일 때만 현재 로그인 사용자 프로필을 조회하고 `headline`·`summary`·`skills`만 `generation_settings`에 저장한다. 빈 프로필 또는 career profile migration 미적용은 cover letter/session row를 만들기 전에 오류로 끝난다.
- 실제 저장 경로 테스트에서 opt-in한 작성 세션에 허용된 세 필드만 저장되고 이름·연락처·위치·개인 링크가 snapshot에 남지 않는 것을 확인했다. 이 검증 중 말투 프로필이 없는 세션의 DB `NULL`을 문자열로 파싱하던 기존 오류를 발견해 `styleProfileId` 매핑을 nullable 처리했다.
- outline·draft AI context는 허용 필드만 JSON으로 전달한다. system instruction은 이를 강조 방향으로만 사용하고 구체 성과·수치·회사·프로젝트 주장은 사용자가 고른 승인 활동과 기존 citation으로만 뒷받침하도록 유지한다. 이름·연락처·위치·링크는 snapshot과 prompt 모두에 들어가지 않는다.
- 검증: 이번 변경 후 `npm run harness:verify -- --runInBand` 55개 스위트/302개 테스트, `npm run rollout:verify` 7개 점검, `git diff --check` 통과. 더미 Supabase 환경변수 기반 `npm run build`와 Playwright Chromium E2E 19개는 직전 M6-i 검증 결과이며, 이번 서비스의 nullable 매핑 변경 뒤에는 재실행하지 않았다. 빌드는 기존 Edge Runtime 정적 생성 경고와 함께 성공했다.
- 추가 migration은 필요하지 않다. 운영 Supabase와 Vercel은 변경하지 않았으며, 프로필 opt-in은 M6-h의 `career_profiles` migration 적용 및 프로필 저장 이후 사용 가능하다.

## M6-j 지원 대상 화면의 채용 링크 등록 흐름

### 현재 근거와 범위

- `/career`의 `SourceImportForm`은 이미 공개 웹페이지/PDF URL을 `job_post` 또는 `talent_page` 자료로 등록할 수 있고, URL 가져오기는 HTTPS 허용·DNS/IP 검사·redirect 제한·크기·시간 제한을 둔다.
- `/jobs`는 해당 자료를 지원 대상에 연결해 분석하고 `responsibility`·`required`·`preferred`·`value`·`question` 후보를 원문 fragment 출처와 함께 보여준다. 다만 링크 등록과 요구사항 분석 사이에 `/career`로 이동해야 하며, 자료 선택 목록에는 검수 전 문서도 노출된다.
- 목표는 새 분석 모델이나 외부 서비스가 아니라, 기존의 안전한 URL 수집·원문 검수·출처 기반 분석을 `/jobs`에서 더 발견하기 쉽고 잘못된 상태로 실행하기 어렵게 연결하는 것이다.

### 완료 조건과 검증

1. `/jobs`에서 채용공고·인재상 자료를 바로 등록할 수 있고, 등록된 자료가 목록에 갱신된다. 확인: UI 테스트가 URL request와 생성 callback을 확인한다.
2. 이 화면의 등록기는 `job_post`/`talent_page`만 노출하고 URL 모드로 시작하되, 공용 자료 등록기는 기존 기본값을 유지한다. 확인: 기본/제한 모드 UI 테스트.
3. 지원 대상 분석에 연결 가능한 문서는 승인된 자료만 선택 가능하고, 검수 대기 건에는 검수 안내 경로가 보인다. 확인: 화면 조건 검토와 type/lint/build.
4. AI는 기존 출처 기반 분석 API를 그대로 사용하고 migration, Supabase 운영 데이터, Vercel 배포에는 손대지 않는다. 확인: diff와 rollout preflight.

### 구현 순서와 위험 경계

1. `SourceImportForm`에 선택 가능한 자료 종류와 초기 종류/입력 방식을 선택적으로 받도록 확장하고 기본 사용의 기존 동작을 보존한다.
2. `JobTargetBoard`의 생성 폼과 분리된 접이식 영역에 제한형 가져오기를 배치하고 생성 후 자료를 다시 불러온다. 승인된 자료만 연결 후보로 보여 주고, 미승인 자료에는 `/career` 검수 안내를 제공한다.
3. 컴포넌트 테스트, 전체 harness, build, rollout preflight, diff 검증 후 이 계획의 결과를 갱신한다.

URL이 로그인 뒤에서만 보이거나 JavaScript 렌더링이 필수인 페이지는 기존 지원 범위 밖이며, 이 단계에서 우회 수집이나 자동 승인은 추가하지 않는다.

### 실행 결과와 검증

- `/jobs`에 접이식 채용공고·인재상 가져오기를 추가했다. 이 화면에서는 URL 입력을 기본 선택하고 자료 종류를 `job_post`/`talent_page`로 제한한다. 등록 성공 후 지원 대상 및 자료 목록을 다시 불러온다.
- 지원 대상 등록에는 승인된 공고·인재상만 선택 후보로 보여 준다. 검수 전·처리 중 자료는 분석에 연결되지 않는다는 안내와 `/career` 검수 화면 링크를 제공하며, 기존 자료 라이브러리 등록기의 종류·파일 업로드 기본값은 그대로 유지한다.
- 테스트: 제한형 URL 등록의 POST 본문/callback, 자료 라이브러리 기본값, `/jobs` 승인 자료 필터·인라인 URL 기본값을 확인했다. `npm run harness:verify -- --runInBand`: 57개 스위트/305개 테스트 통과.
- 더미 Supabase 환경변수 기반 `npm run build` 통과. 기존 Supabase realtime-js Edge Runtime 경고와 빌드 캐시의 큰 문자열 경고가 있었고, 새 오류는 없었다. `npm run rollout:verify` 7개 점검 및 `git diff --check` 통과.
- 공개 URL의 SSRF 방어, 페이지 추출 한계, 원문 수동 검수, 근거 fragment 인용 분석을 변경하지 않았다. 운영 Supabase와 Vercel은 변경하지 않았다.

## M6-k 작성 시작 전 프로필 context 준비 상태 확인

### 현재 근거와 범위

- M6-i에서는 프로필 context를 세션별 opt-in으로 안전하게 저장하지만, `/writing/new`은 프로필 저장 여부·필요 필드·migration 이용 가능 여부를 확인하지 않고 체크박스를 항상 활성화한다. 사용자가 프로필이 비어 있거나 저장 기능이 준비되지 않은 상태에서 선택해야만 세션 생성 오류를 알 수 있다.
- `/api/career-profiles/me`는 기존 인증 API이며 `headline`·`summary`·`skills` 중 하나 이상이 있으면 작성 참고 context로 유효하다. 나머지 일반 자기소개서 시작 흐름은 프로필 없이도 계속 가능해야 한다.

### 완료 조건과 검증

1. 프로필 상태를 확인 중/준비됨/내용 없음/기능 사용 불가로 구분하고, headline·summary·skills 중 하나가 있어야 체크할 수 있다. 확인: UI 서비스 응답별 테스트.
2. missing/unavailable 상태에서 일반 작성은 가능하며 프로필 입력·확인 경로와 쉬운 안내를 제공한다. 확인: session-start UI 테스트.
3. 선택 프로필 조회는 지원 대상·말투 프로필 로딩이나 작성 시작을 막지 않는다. 확인: profile request를 미해결로 둔 비차단 테스트.
4. DB·AI prompt·Analytics 계약과 원격 상태는 변경하지 않는다. 확인: diff review, harness, build, rollout preflight.

### 실행 결과와 검증

- `/writing/new`이 프로필 준비 상태를 확인한다. context에 허용된 직무 소개·요약·기술이 없으면 체크박스를 비활성화하고 `/career#career-profile-title`로 안내한다. API/migration 확인 실패도 일반 작성을 차단하지 않고 별도 메시지를 보인다.
- 프로필 검사는 지원 대상·말투 프로필 조회와 독립 실행하므로 느린 프로필 응답이 필수 작성 시작 UI를 막지 않는다. profile 값은 analytics나 클라이언트 로그로 보내지 않는다.
- 응답별 UI, 누락 프로필, 기능 불가, 미해결 profile request 비차단을 검사했다. `npm run harness:verify -- --runInBand`: 57개 스위트/308개 테스트 통과; 더미 Supabase 환경변수 `npm run build` 통과; `npm run rollout:verify` 7개 점검 및 `git diff --check` 통과.
- 운영 Supabase와 Vercel은 변경하지 않았다. 인증된 사용자로 실제 저장·생성 흐름을 확인하는 Preview 단계는 migration 적용 후 진행해야 한다.

## M6-l 개인 프로필 migration의 최소 권한 검증 강화

### 근거와 변경

- M6-h의 migration은 `authenticated`에 최소 권한을 grant했지만, 테이블에 예상 외의 기존 권한이 있으면 이를 회수하지 않았다. 단일 `FOR ALL` 정책은 실제 grant가 없어도 쓰기/삭제 policy 경계를 필요 이상으로 넓게 표현했다.
- migration에서 `anon`, `authenticated`, `public`의 기존 table grants를 회수한 뒤 `authenticated`에 select/insert/update만 부여한다. 삭제 권한은 열지 않고, SELECT·INSERT·UPDATE 각각에 owner 검사 정책을 분리했다. 예상하지 않은 기존 정책이 있으면 migration을 중단해 검토하도록 했다.
- 읽기 전용 verify SQL은 RLS/정책 조건, anon과 authenticated의 유효 table privilege, user_id PK, `auth.users(id)` cascade FK, 입력 제한을 확인하고 정의도 조회한다. rollout preflight는 해당 스크립트가 SELECT 문으로만 구성되는지와 핵심 확인 항목의 존재를 검사한다.

### 검증 및 경계

- `npm run rollout:verify`: 8개 점검 통과. `git diff --check` 통과.
- 이 환경에는 `psql` 실행 파일이 없어 verify SQL을 실제 PostgreSQL에서 파싱·실행하지 못했다. 따라서 SQL 결과가 운영 Supabase에서 검증되었다고 간주하지 않는다.
- 원격 Supabase와 Vercel은 읽거나 변경하지 않았고, migration은 로컬 파일로만 준비되어 있다.

## M6-m 프로필 context의 초안 사실 근거 회귀 테스트

### 검토 근거와 보완

- 초안 생성 system instruction에는 프로필을 사용자가 선택한 강조 방향으로만 활용하고, 활동 근거에 없는 프로젝트·성과·회사·날짜·수치의 근거로 사용하지 말라는 규칙이 이미 있다.
- 기존 테스트는 허용된 프로필 필드가 JSON context에 들어가고 개인정보가 제외되는 점은 확인했지만, 실제 draft 생성 요청의 system instruction에 해당 규칙이 포함되는지, 프로필에만 있는 수치가 근거 없이 생성되면 저장 전에 거부되는지는 고정하지 않았다.
- 별도 생성 규칙은 바꾸지 않고 실제 `generateDraftCandidates` 호출을 통해 위 경계를 검증하는 회귀 테스트를 추가했다.

### 검증 및 경계

- 프로필 요약에만 존재하는 `75%` 성과를 draft 후보가 근거 연결 없이 주장하면 사실 문장 검증에서 거부되고 `replaceDrafts`로 저장되지 않는 것을 확인했다. 요청 prompt에는 프로필 context와 강조 방향 전용 규칙이 모두 포함된다.
- `npm run harness:verify -- --runInBand`: lint·TypeScript 검사 통과, 57개 스위트/309개 테스트 통과. `npm run rollout:verify`: 8개 점검 통과. `git diff --check` 통과.
- 이번 보완은 테스트만 추가했으며 프롬프트 동작, DB, 외부 배포 상태는 변경하지 않았다.

## M6-n 자격·어학 이력 유형 지원

### 현재 근거와 범위

- 제공된 이력서에는 자격증과 어학 시험 성적이 별도 이력으로 기록되어 있다. 포트폴리오도 자격·수상·프로젝트를 분리해 구성한다.
- 현재 `CareerItemKindSchema`와 `career_items.kind` 제약에는 자격·어학 유형이 없어 AI 후보가 이를 `other`나 `education`으로 뭉뚱그릴 수 있다.
- UI 표기는 `자격·어학`, 저장 enum은 교육 수료·수상 이력과 구분되는 `credential`을 사용한다. 사용자가 검수·승인하기 전 후보 상태와 근거 인용 규칙은 그대로 둔다.

### 완료 조건과 검증

1. 공통 Zod 타입과 Supabase 제약이 `credential`을 허용한다. 확인: migration preflight와 rollout의 SELECT-only 검증 SQL.
2. 후보 추출 prompt가 자격증·면허·어학 시험, 교육 수료, 수상을 서로 구분하며 새 유형도 기존 source fragment 검증을 통과해야 한다. 확인: 추출 parser/grounding 테스트.
3. 자료 후보 카드와 승인 활동 필터에서 모두 `자격·어학`으로 표시되고 검색할 수 있다. 확인: 검색 테스트와 TypeScript/UI 정적 검증.
4. 원본 자료, 사용자 레코드, 운영 Supabase/Vercel에는 직접 쓰지 않는다. migration은 로컬에만 준비한다.

### 실행 결과와 검증

- 공통 `CareerItemKindSchema`와 자료 후보/승인 활동의 표시에 `credential`을 추가했다. 작성 안내는 자격증·면허·어학 시험을 자격·어학으로, 교육 수료와 수상을 각각 별도 유형으로 안내하며 원문 fragment 검수 규칙은 유지한다.
- 기존 M1 migration은 수정하지 않았다. `20260922020000_m6n_career_credential_kind.sql`에 additive check constraint 교체를 추가했고, `supabase/verify/m6n-career-credential-kind.sql`은 constraint 포함 여부만 SELECT로 확인한다. rollout preflight도 새 migration 순서와 read-only 검사 포함 여부를 확인한다.
- 자격·어학 후보 parser/source-grounding 및 활동 필터 테스트를 추가했다. `npm run harness:verify -- --runInBand`: lint·TypeScript 통과, 57개 스위트/311개 테스트 통과. `npm run rollout:verify`: 9개 점검 통과. 더미 환경변수 기반 `npm run build` 성공, `git diff --check` 통과.
- 빌드에는 기존 `@supabase/realtime-js` Edge Runtime 호환 경고와 webpack 캐시의 큰 문자열 경고가 있었다. 이번 변경에서 발생한 빌드 오류는 없었다.
- PDF는 로컬에서 시각적으로만 검토했으며 OCR 원문을 Gemini에 전송하지 않았다. Supabase CLI/psql 연동이 없어 migration·verify SQL을 원격에 적용하거나 실제 DB에서 실행하지 않았다. Vercel 배포도 하지 않았다.

## M6-o 활동 라이브러리 직접 등록과 유형 선택

### 현재 근거와 범위

- `/career`는 승인 활동을 검색·필터링·PDF 선택하는 목록이지만 그 화면에서 새 활동을 직접 등록할 수는 없다. `/writing`의 활동 직접 입력은 현재 활동 종류를 전달하지 않아 API 기본값인 `project`로 저장된다.
- `evidenceRecordService.createManual`은 이미 종류·기관·역할·기간·요약·근거 서술을 받아 Career Item과 Evidence Record를 만들고, 사용자가 직접 저장한 항목을 승인 상태로 둔다.
- 도메인 경계상 원본 자료에서 추출한 사실은 승인된 Source Fragment에 연결하고, 직접 작성한 사실은 저장 동작으로 확정된 사용자 직접 입력 근거로 구분한다.

### 완료 조건과 검증

1. `/career`에서 사용자가 활동을 직접 추가할 수 있고, 모든 Career Item 종류(자격·어학 포함), 기관, 역할/등급, 기간과 요약/행동/결과를 보낼 수 있다. 확인: 활동 목록 컴포넌트 테스트가 POST payload와 새 목록 반영을 확인한다.
2. `/writing`의 기존 직접 입력도 같은 폼과 종류 선택을 사용하며 기존 활동명·행동·결과 필수 조건을 유지한다. 확인: 폼 단위 테스트와 전체 UI/type 검사.
3. 수동 기록의 필드·길이·소유권 검증은 기존 API를 그대로 사용한다. 새 테이블·migration은 만들지 않으며 원격 Supabase/Vercel은 변경하지 않는다.
4. 터치·키보드·좁은 화면에서도 폼을 사용하고 제출 중·검증 오류 상태를 알 수 있다. 확인: label/role 기반 접근성 테스트 및 responsive class review.

### 구현 순서

1. 공유 `manual-career-entry` feature form과 값 타입을 만든다. 업무 맥락에 따라 credential 필드 설명과 writing 모드 필수 조건을 표시한다.
2. `/career` 활동 보드에 생성·새로고침 흐름을 연결하고, `/writing` 기존 입력 UI를 같은 폼으로 교체한다.
3. 서비스/UI 회귀 테스트 후 harness, build, rollout preflight, diff 검증을 수행한다.

### 실행 결과

- 공유 폼으로 프로젝트·경력·교육·수상·자격/어학 등 종류를 선택해 직접 저장할 수 있게 했다. `/career`는 저장 성공 응답을 활동 목록에 즉시 반영하고, `/writing`은 기존처럼 행동과 결과를 필수로 확인한 뒤 근거 목록을 다시 연결한다. API 실패 시 폼 입력은 유지한다.
- 자격·어학 선택 시 필드 안내를 시험/자격명, 발급·시험 기관, 취득·응시 시점, 점수·등급에 맞게 바꾼다. 화면은 기존 다크 기술형 디자인 토큰을 따르고, label·오류 alert·focus ring과 좁은 화면용 grid를 사용한다.
- 서비스 테스트는 `career_items` insert payload의 credential 종류·기관·역할·기간까지 확인한다. 공유 폼·활동 목록 UI 및 Evidence Record 서비스에 대한 집중 테스트 3개 스위트/8개 테스트 통과.
- `npm run harness:verify -- --runInBand`: lint·TypeScript 검사 및 58개 스위트/316개 테스트 통과. `npm run rollout:verify`: 9개 점검 통과. 더미 Supabase/AI 환경변수 기반 `npm run build` 성공. `git diff --check` 통과.
- build에는 webpack의 큰 cache 문자열 경고와 Edge Runtime 페이지의 정적 생성 제한 안내가 있었지만 빌드는 성공했다. rollout 사전 점검은 로컬 파일만 확인하며 원격 Supabase/Vercel은 조회·수정·배포하지 않았다.

## M6-p 직접 입력 활동 수정

### 현재 근거와 범위

- M6-o는 활동을 직접 추가할 수 있게 했지만 `/career` 목록에는 수정 동작이 없고 `app/api/evidence-records/route.ts`도 GET/POST만 제공한다. 입력 오류를 고치려면 새 활동을 중복 생성해야 한다.
- 이력서/포트폴리오 원본 fragment에 연결된 활동은 `evidence_sources` 인용이 기존 사실을 설명한다. 해당 행을 덮어쓰면 인용이 새 문구를 증명하는 것처럼 남을 수 있다.
- 이번 단계는 원본 연결이 없는 사용자 직접 입력 활동의 수정만 허용한다. source-linked 활동은 이번 단계에서 편집할 수 없다고 UI/API에서 명확히 알리고, 별도 버전 생성 및 원본 근거 보존은 후속 설계로 남긴다. 하드 삭제나 원격 DB 작업은 범위에 넣지 않는다.

### 완료 조건과 검증

1. `/career`에서 편집 가능한 직접 입력 활동을 불러와 기존 값으로 폼을 채우고 수정 결과를 카드에 반영한다. 확인: 보드 UI 테스트의 GET → PATCH → 갱신 흐름.
2. 서버는 세션 사용자 소유의 승인 활동만 수정하고, ID/본문 길이와 필수 근거를 Zod로 검증하며 동시 수정은 충돌로 거부한다. 확인: 서비스/API 테스트의 미인증·타인/없는 ID·잘못된 입력·충돌 케이스.
3. `evidence_sources`가 있는 활동은 수정할 수 없고 인용 데이터를 건드리지 않는다. 확인: source-linked 수정 거절 테스트.
4. 화면은 출처 연결 건수를 구분해 직접 수정 가능한 항목만 수정 버튼을 제공하고, 저장 중·성공·실패 상태를 키보드와 보조기술에 전달한다. 확인: 접근성 역할 테스트, focus/responsive class review.
5. DB migration, 외부 서비스 변경 없이 현행 RLS를 통과하는 사용자 JWT 쿼리만 사용한다. 확인: 추가된 모든 DB 조건에 user_id 필터, 전체 harness/build 및 rollout verify.

### 접근과 순서

1. 기존 `EvidenceRecordDetails` 응답에 연결 source 수를 포함해 UI에서 수정 가능 여부를 추측하지 않도록 한다.
2. `PATCH /api/evidence-records/[id]`와 service update를 추가한다. 서버는 승인 상태/소유권/출처 없음/현재 version을 확인하고, 두 테이블 업데이트가 부분 적용되면 첫 변경을 보상 복구한다. 활동 데이터는 SQL 조합 없이 Supabase query builder로 전달한다.
3. 공통 입력 폼은 초기값과 진행 중 상태를 지원하게 하고, 활동 카드의 기존 다크 기술형 UI에 행 단위 수정 상태를 추가한다.
4. 서비스/API/보드 단위 테스트 뒤 harness, rollout verify, production build와 diff 검증을 수행한다.

### 위험과 후속

- 두 행 업데이트는 현재 schema의 독립 REST 쿼리이므로 DB transaction은 아니다. 두 번째 변경 실패 시 보상 복구를 시도하고 복구 실패는 generic storage error로 처리하되, 완전한 원자성이 필요하면 향후 RPC transaction으로 옮긴다.
- source-linked 활동 수정, 과거 버전 열람/복원, 활동 아카이브는 여전히 미구현이며 이 변경으로 구현 완료로 간주하지 않는다.

### 실행 결과와 검증

- `/career` 활동 카드에 수정 진입을 추가했다. 입력 폼은 기존 항목 값과 현재 진행 상태를 채우며 성공하면 카드 내용을 갱신하고, 실패하면 입력을 유지한다. 직접 만든 항목의 핵심 입력만 바꾸고 폼에 없는 지표·기술·문제·기여 데이터는 업데이트 payload에서 제외해 보존한다.
- evidence 목록에 source fragment 수를 포함했다. 수가 0인 항목만 편집 버튼이 표시되며 출처 연결 항목에는 차단 사유를 표시한다. API도 같은 출처 검사를 독립적으로 수행한다.
- `PATCH /api/evidence-records/[id]`는 세션 사용자 ID, 승인 상태, Zod ID/본문 검증, 소유권 조건, optimistic version 조건을 확인한다. Evidence Record 업데이트 실패 시 Career Item 복구를 시도하며 복구 자체가 실패하면 내부 상세를 노출하지 않는 저장 오류를 반환한다.
- service/API/form/activity-board 회귀 테스트를 추가했다. 미인증, 사용자 범위 밖 ID, malformed ID/JSON, source-linked 차단, stale version 충돌, 두 테이블 변경 및 보상 복구 성공/실패, 편집 폼 초기값과 UI 반영을 검증한다.
- `npm run harness:verify -- --runInBand`: 린트·TypeScript 통과, 60개 스위트/330개 테스트 통과. `npm run rollout:verify`: 9개 점검 통과. 더미 Supabase/AI 환경변수로 production build 성공. `git diff --check` 통과.
- Next.js/ESLint 경계 selector 폐기 안내와 Edge Runtime 페이지의 정적 생성 제한 경고가 있었지만 검사·빌드는 통과했다. Supabase 실DB 통합 시험, migration, Vercel 반영은 수행하지 않았다.

## M6-q 활동 보관 및 복원

### 범위와 완료 조건

1. 사용자는 승인된 활동을 삭제하지 않고 보관할 수 있고, 보관함에서 승인 상태로 복원할 수 있다. 확인: `/career` UI에서 보관 → 보관함 이동 → 복원 → 활성 목록 재조회 흐름.
2. 보관된 활동과 근거는 작성 context 및 PDF 내보내기에서 제외된다. 확인: 기존 `listApproved` 기본값이 승인 상태만 반환한다는 서비스 경계 테스트 및 archive 상태 변경 테스트.
3. 상태 변경은 로그인한 소유자의 현재 기대 상태/버전에만 적용되고, 두 테이블 변경 중 하나가 실패하면 앞선 변경을 보상 복구한다. 확인: 미인증·타인/없는 ID·stale 상태·rollback 성공/실패 테스트.
4. 보관함에서는 활동 선택·순서 지정·PDF 출력/수정이 불가능하고 복원만 제공한다. 확인: 키보드 접근 가능한 toggle/button 및 UI 회귀 테스트.
5. 활동 본문, `evidence_sources`, 원본 파일은 변경/삭제하지 않으며 migration·원격 Supabase/Vercel 조작을 하지 않는다. 확인: mutation payload 및 diff 검토.

### 접근과 순서

1. `listApproved`에 승인/보관 status 필터를 추가하고, 기존 작성·내보내기 호출의 기본 동작은 승인 전용으로 유지한다.
2. 소유권·상태·version을 조건으로 하는 archive/restore service와 `/api/evidence-records/[id]/status` PATCH route를 추가한다. Career Item과 Evidence Record가 불일치하거나 예상 상태가 아니면 409를 반환한다.
3. `/career`에 승인 목록/보관함 전환, 상태 변경, 성공·실패 상태를 추가한다. 보관함에서 selection·edit·PDF 액션은 노출하지 않는다.
4. service/route/UI 테스트 후 필요한 harness, rollout, build, diff 검증을 실행한다.

### 위험과 경계

- 두 테이블은 별도 REST update이므로 완전한 transaction은 아니며, 보상 복구 실패를 검출해 generic storage error로 처리한다. 트랜잭션 보장이 필요하면 별도 승인 하에 DB RPC로 옮긴다.
- 이 기능은 승인된 활동만 대상으로 한다. needs_review/suggested 항목과 과거 revision 탐색은 범위에 포함하지 않는다.

### 실행 결과와 검증

- `/career` 활동 목록에 보관함 보기/승인 활동 보기 전환을 추가했다. 활성 목록에서 보관하고 보관함에서 복원할 수 있으며, 보관함에는 PDF 선택·출력 및 수정 동작을 노출하지 않는다. 입력 편집·저장·목록 갱신 중에는 목록 전환을 막아 작성 중 내용이나 오래된 상태를 덮지 않게 했다.
- `GET /api/evidence-records?status=archived`는 사용자 소유의 보관 상태만 반환하며, 기본 목록·작성 컨텍스트·PDF export는 승인 상태만 사용한다. 승인/보관 두 테이블의 상태가 일치하지 않으면 일반 목록에서 제외해 승인 자료로 잘못 사용되지 않도록 했다.
- `PATCH /api/evidence-records/[id]/status`는 허용 상태만 받고, 사용자 ID·기대 상태·버전 조건을 확인해 Career Item과 Evidence Record를 함께 변경한다. 두 번째 쓰기 실패 시 첫 쓰기를 보상 복구하고 복구 실패는 generic storage error로 반환한다. `evidence_sources`와 본문/원본은 수정하거나 삭제하지 않는다.
- service/API/UI 회귀 테스트에서 인증, 잘못된 상태, 없는 ID, 상태 충돌, optimistic version 충돌, 보상 복구, 인용 건수 보존, 보관 목록 전환과 복원 및 보관함에서 출력 대상 제외를 확인했다.
- 검증: `npm run harness:verify -- --runInBand` 린트·TypeScript 통과, 62개 스위트/342개 테스트 통과. `npm run rollout:verify` 9개 점검 통과, 더미 환경변수 `npm run build` 성공, `git diff --check` 통과. 비차단 경고는 Next.js `next lint`/ESLint selector 폐기 안내와 Edge Runtime 정적 생성 제한뿐이다.
- DB migration 추가/적용, 운영 Supabase 변경, Vercel 배포는 하지 않았다. 두 테이블은 별도 REST 요청이므로 완전한 DB 트랜잭션은 아니며, 보상 복구 자체가 실패한 경우 운영 복구 경로는 향후 RPC 트랜잭션 적용 전까지 남은 위험이다.

## M6-r 원본 연결 활동의 안전한 수정과 버전 이력

### 현재 근거와 목표

- M6-p에서는 `evidence_sources` 인용을 잘못된 최신 내용에 붙이지 않도록 원본 연결 활동 편집을 차단했다. 사용자가 직접 수정하거나 이전 버전을 확인·복원하는 경로는 없다.
- `career_items`는 활동의 현재 메타데이터 행이고, `evidence_records`는 활동별로 여러 근거 행을 가질 수 있다. `evidence_sources`는 근거 행에 연결되므로 기존 행을 보존하고 새 근거 행을 만들면 원본 인용을 과거 버전에 고정할 수 있다.
- 승인 활동 편집은 단일 PostgreSQL transaction/RPC에서 이전 근거 supersede, 현재 활동 갱신, 새 근거 생성과 스냅샷 기록을 수행한다. history는 동일 `career_item_id`의 버전을 보여주고, 복원은 과거 내용을 새 현재 버전으로 복제하며 그 내용에 대응하는 원본 인용만 새 행에 복사한다.
- RPC는 `SECURITY INVOKER`, `auth.uid()`/user-scoped row filters 및 RLS/grant를 사용한다. migration과 읽기 전용 verify SQL은 로컬에만 추가하고 운영 Supabase에는 적용하지 않는다.

### 완료 조건과 검증

1. source-linked 승인 활동 수정 시 새 `evidence_record` revision이 생성되고, 기존 텍스트와 `evidence_sources` 연결은 superseded history에 그대로 남는다. 새 revision은 그 문장을 증명한다고 오인될 수 있는 인용을 갖지 않는다. 확인: RPC migration 계약 검사와 service/API/UI 단위 테스트.
2. 동일 활동의 모든 버전과 메타데이터 snapshot을 사용자 전용 history API/UI에서 볼 수 있고, quote excerpt나 타 사용자 데이터는 노출하지 않는다. 확인: history service/route/component 테스트 및 RLS read-only verify SQL.
3. 과거 버전 복원은 이전 내용을 덮어쓰지 않고 새로운 활성 revision을 생성하며, 선택된 버전의 텍스트와 source link만 일치하게 복사한다. 확인: restore RPC/service/UI 테스트.
4. 동시에 편집/보관/복원하거나 다른 사용자의 ID를 전달해도 활동 행 잠금·user_id·expected version/status 검사로 일관성을 지키며, 사용자 입력 길이·종류를 서버에서 검증한다. 확인: stale/unauthorized/invalid-input 테스트와 `SECURITY INVOKER`/함수 EXECUTE/RLS migration 계약 검토.
5. 기존 source-free 직접 입력 수정은 호환을 유지하고, DB migration은 운영에 적용하지 않는다. 확인: 기존 회귀 테스트와 migration verify 결과.

### 구현 순서와 위험

1. `evidence_records`에 revision parent/restored-from relation 및 career snapshot을 더하는 additive migration과 SELECT-only verify SQL을 추가한다. 실제 Supabase DDL/마이그레이션 실행은 하지 않는다.
2. revision·restore RPC를 구현하고 제한된 role만 실행할 수 있게 하며, source-linked text는 과거 evidence row와 citation 관계에 남긴다.
3. service, history/restore API, feature client 및 `/career` UI를 연결한다. revision chain은 한 번에 승인 상태 버전 한 건을 유지하며 다른 증거 행은 변경하지 않는다.
4. SQL 계약·service/API/UI 회귀를 확인한 후 harness, rollout preflight, build, diff를 검증한다.

실패 모드: migration 미적용 환경에서 RPC를 찾을 수 없으면 명확한 503으로 안내한다. source copy는 선택 복원 원문이 동일한 경우에만 실행되고 DB transaction 안에서 처리한다. RPC 권한·RLS가 맞지 않으면 기능을 차단하며 권한을 넓히는 fallback은 추가하지 않는다.

### 실행 결과와 검증

- `evidence_records`에 revision 번호/parent/restored-from ID와 활동 metadata snapshot을 추가하는 M6-r migration 및 SELECT-only verify SQL을 로컬에 추가했다. 운영 Supabase에는 적용하지 않았다.
- `revise_evidence_activity`, `restore_evidence_activity_revision`, `set_evidence_activity_status`를 `SECURITY INVOKER` + 빈 `search_path`로 추가했다. 각 RPC는 `auth.uid()`와 소유자 조건, 상태/version 확인, 활동 row lock을 사용하며 `authenticated`만 실행 가능하도록 제한했다. revision 및 archive/restore의 두 테이블 변경은 한 트랜잭션으로 처리한다.
- 승인 활동 편집은 원본 행을 superseded 처리하고 새 승인 revision을 만든다. 이전 `evidence_sources`는 기존 revision에 그대로 두고 편집본에는 자동 복사하지 않는다. 과거 revision 복원은 선택한 revision의 실제 인용 행만 새 승인 revision에 복사한다.
- 사용자 소유 history API는 revision 내용·metadata snapshot·원본 연결 개수만 반환하고 quote excerpt는 조회하거나 노출하지 않는다. `/career`에서는 승인/보관 활동 모두 버전 기록을 확인할 수 있고, 승인 활동의 이전 snapshot을 새 버전으로 복원할 수 있다. 편집/복원 후 PDF 선택 ID도 새 record ID로 이어진다.
- 기존 source-free 편집 UI 흐름은 유지하면서 저장을 revision 생성으로 전환했다. migration 미적용 시 RPC 부재를 503으로 분류해 DB 업데이트 필요 안내를 반환한다.
- 편집 폼을 연 시점의 evidence/career 버전을 요청에 실어 보내고, service와 RPC에서 모두 최신 버전과 비교해 다른 탭의 선행 저장을 409로 거절한다. history는 100개 단위 페이지 조회 및 citation count 배치로 전체 revision chain을 반환한다. PostgreSQL status RPC의 null 입력 검증도 명시했다.
- M6-r 읽기 전용 검증 SQL을 보강했다. SECURITY INVOKER 함수에 필요한 `career_items`·`evidence_records`·`evidence_sources`의 강제 RLS, 정확한 단일 소유자 정책, 함수 실행 및 테이블 권한을 각각 확인한다. 이 점검은 DB 메타데이터만 읽으며 실제 migration 실행을 대체하지 않는다.
- 검증: 전체 lint, TypeScript, 64개 테스트 스위트/356개 테스트 통과. `npm run rollout:verify`의 10개 점검 통과. 더미 Supabase/AI 환경변수로 production build 성공, `git diff --check` 통과. 빌드는 기존 Supabase Edge Runtime 의존성 경고와 Edge 페이지의 정적 생성 제한 안내를 남겼다.
- 로컬 PostgreSQL/CLI가 없어 migration SQL 자체를 DB에 적용해 파싱·실행하는 검증은 하지 않았다. 실제 Supabase migration, Vercel 배포, commit은 수행하지 않았다.

## M6-s 리뷰 후속: 사실 근거 확인, 편집 입력 보호, PDF 지표 정합성

### 근거와 완료 조건

- 누적 변경 독립 리뷰에서 AI가 고른 활동 ID만으로 프로필 기반 수치 문장이 검증 완료될 수 있음, 목록 새로고침이 편집 중인 폼을 언마운트할 수 있음, 이력서 PDF에서 성과 지표의 단위 불일치로 별도 수치가 사라질 수 있음이 확인되었다.
- 생성된 citation은 사용자 확인 전까지 제안 상태여야 하며, 미확인/과거 형식의 초안은 최종 확정할 수 없어야 한다.
- 편집 중 목록 새로고침이 차단되고, PDF 중복 생략 판단은 지표 label과 값·단위가 모두 맞을 때만 가능해야 한다.
- 후속 재리뷰에서 문장 편집 후 citation 재사용, 구버전 초안의 근거율 과대 표시, 새로고침 도중 편집 시작, `%`/`퍼센트`와 `%p`/`퍼센트포인트` 및 `GB`와 `GB/s` 합성 단위 혼동을 추가로 확인했다.

### 변경 및 검증

- AI 생성 citation을 `unverified`로 보존하고 해당 문장 수를 검토 필요로 표시한다. 편집기에서 기존 AI/legacy ID를 자동 선택하지 않으며, 사용자가 활동을 직접 골라 저장한 버전(`factReviewVersion: 1`)과 verified 상태가 모두 있어야 최종 확정한다. 확인: writing studio 생성 회귀 및 citation review 단위 테스트.
- 활동 편집 중 목록 새로고침 버튼을 비활성화하고 안내를 표시한다. 확인: 입력 유지·fetch 미호출 UI 테스트.
- 이력서 PDF에서 label과 값·단위가 결과에 정확히 포함된 경우에만 별도 지표를 생략하고 퍼센트 출력 간격을 정리한다. 확인: 단위 불일치 회귀 테스트.
- 문장 내용 또는 위치가 바뀌면 해당 문장 citation 선택을 즉시 제거하고, 명시적 사용자 검토 마커가 없는 과거 citation은 품질 근거율에서 제외한다. 확인: citation 보존/제거 및 legacy coverage 테스트.
- 새로고침 도중 활동 편집 시작을 막고, 영문·한글 단위 접미사나 슬래시로 이어진 합성 단위를 단순 수치/단위와 일치하는 것으로 처리하지 않는다. 확인: 비동기 UI 경합, 퍼센트포인트와 합성 단위 PDF 테스트.
- 운영 runbook의 M6-h~M6-s 기능/배포 기준선과 M6-r migration 적용·verify 순서를 갱신했다. 원격 Supabase/Vercel은 변경하지 않았다.
- 검증: `npm run harness:verify`의 lint·TypeScript·65개 테스트 스위트/362개 테스트 통과. `npm run rollout:verify` 10개 점검, `git diff --check`, 더미 Supabase/AI 환경변수를 사용한 production build도 통과했다. 빌드는 기존 Supabase Realtime 의존성의 Edge Runtime Node API 경고 및 Edge 페이지 정적 생성 제한 안내를 남겼다.
- 연속 독립 리뷰에서 나온 총 11개 구체적 finding을 수정했다. PostgreSQL/실 Supabase에서 migration SQL 실행은 검증하지 않았으며 운영 DB migration과 Vercel Production 배포는 하지 않았다.

### M6-s 전달 상태 (2026-09-22)

- 기능 커밋 `e9533e5a8bc9aa1683d3435e6d97804a670563d2`와 문서 동기화 커밋 `843f276fba3183258e0242cfb2ee0a64836c6a8c`를 feature branch에 push했고 PR #3에 포함했다. GitHub에서 원격 head 일치와 필수 Vercel 검사를 확인했다.
- `843f276` Preview는 `READY`이며 공개 진입점과 비로그인 보호 경로/API 응답을 확인했다. 실제 사용자 로그인·Supabase 연동을 포함한 경력 프로필 저장, 인용 검토, PDF 생성은 Preview에서 아직 확인하지 않았다.
- 남은 release gate는 PR 병합, migration을 timestamp 순서대로 운영자가 적용하고 verify SQL로 확인, 인증된 Preview 전체 흐름 검증, 운영 환경 설정 확인, Production 배포 후 관측이다. 이 작업에서는 원격 Supabase와 Production을 변경하지 않았다.

## M6-t 스캔 PDF 페이지 구분자 오분류 방지

### 발견과 범위

- `pdf-parse`의 `getText().text`는 각 페이지 본문 외에 기본 페이지 경계 문자열도 합칠 수 있다. 페이지별 `text`가 전부 비어 있어도 전체 `text`만 보면 내용이 있는 것처럼 보이고, 기존 fallback은 이 문자열을 자료 본문과 근거 조각으로 등록할 수 있었다.
- PDF 자료는 페이지별 실제 본문만 결합한다. 구분자는 본문·활동 근거로 저장하지 않으며, 모든 페이지 본문이 비어 있으면 `manual_input`으로 돌려 수동 입력 또는 선택형 OCR로 안내한다.
- 텍스트와 빈 페이지가 섞인 PDF는 실제 텍스트만 추출하되 페이지 locator를 유지한다. OCR 실행 전에는 외부 AI 호출이 없어야 하고, OCR 결과는 기존처럼 항상 사용자 검수 대기 상태다.

### 변경 및 검증

- `extractPdfSource`에서 `result.text` fallback을 제거하고 `result.pages[].text`만 `rawText`와 fragment 원천으로 사용한다.
- 페이지 경계 문자열만 있는 스캔 PDF 및 실제 본문/빈 페이지 혼합 PDF 회귀 테스트를 추가했다. 검증: `npm run harness:verify`의 lint·TypeScript·65개 테스트 스위트/364개 테스트 통과, `npm run rollout:verify` 10개 점검 통과, 실제 로컬 PDF 두 파일이 모두 `manual_input`/fragment 0으로 분류됨.
- 커밋 `3ef7197e996ff38ffa62f9272c0e6d0ea0a64a81` Preview 배포 `dpl_2UxMuktH7ktV8TUr21iZvsw7SxT4`가 `READY`이며 `/` 200, 비로그인 `/career` 307, 비로그인 `/api/career-profiles/me` 401, 최근 30분 오류 로그 없음. PR #3의 Vercel 및 Preview Comments 검사는 통과했다.
- 인증 사용자 기반 Supabase 저장, 인용 검토, 실제 PDF 내보내기는 여전히 인증 계정과 운영자가 migration을 적용한 뒤 검증해야 한다. 이 변경에서 Gemini OCR, 원격 Supabase migration, Production 변경은 수행하지 않았다.
