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
- 활동 PDF에 승인된 프로젝트의 역할·기여·상황/행동/결과·성과·기술만 표시하고 내부 UUID·AI metadata는 넣지 않는다.
- 검증: PDF payload 단위 테스트에 승인 경계·내부 ID 비노출·빈 목록 차단을 추가했고 `npm run harness:verify`(25개 스위트/187개 테스트), 더미 환경변수 `npm run build`, `git diff --check`를 통과했다.

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
