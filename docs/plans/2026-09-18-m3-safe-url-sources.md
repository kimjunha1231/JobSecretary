# M3-a 채용공고·인재상 URL 안전 수집

## 목표

채용공고와 인재상 페이지 URL을 사용자가 등록하면 서버가 안전하게 원문을 가져와 `source_documents`/`source_fragments`로 저장한다. URL 원문은 지시가 아니라 데이터로 취급하고, HTML은 렌더링하지 않고 텍스트·출처·수집 시각만 검수 대기 상태로 보관한다.

## 현재 근거

- M2에서 파일·붙여넣기 자료는 `sourceDocumentService.register`와 `/career` 라이브러리로 등록할 수 있다.
- `source_documents`에는 `source_url`, `fetched_at`, `kind=job_post|talent_page` 필드가 이미 있지만 URL fetch 경계는 아직 없다.
- 기존 `job_targets`/`job_target_sources` 테이블과 모델은 M1에서 추가됐지만 지원 대상 CRUD와 URL 연결 화면은 아직 없다.
- 운영 Supabase/Vercel에는 접근 자격 증명이 없어 migration 적용이나 실제 외부 URL 쓰기는 수행하지 않는다.

## 이번 단계 범위

1. HTTPS URL 검증과 SSRF 방어(DNS 사설·루프백 차단, 검증된 주소로 socket 연결 고정, 기본 포트, 사용자 정보 차단)
2. 수동 리다이렉트(최대 3회), 10초 timeout, 응답 2MB cap, HTML/일반 텍스트 MIME whitelist
3. HTML에서 script/style/comment를 제거한 텍스트·heading/문단 fragment 추출
4. source document POST에 URL 등록 경로 추가와 `/career` URL 입력 UI 추가
5. URL validator, HTML sanitizer, 인증 선행, 실패 상태 단위 테스트

## 완료 조건

- `http`, localhost, 사설 IP, loopback, link-local, multicast, 비표준 포트 URL은 fetch 전에 거절한다.
- 리다이렉트 대상도 동일한 검증을 통과해야 하며, 제한 초과·응답 크기·MIME·timeout 실패는 사용자에게 안전한 4xx 응답으로 반환한다.
- 저장되는 값은 추출된 텍스트, fragment locator, 원본 URL, 최종 수집 시각, 본문 해시이며 HTML을 브라우저에 삽입하지 않는다.
- URL source도 `needs_review`로 시작하고 사용자 승인 전에는 다음 작성 흐름에서 사용할 수 없도록 상태를 보존한다.
- 등록 API는 인증을 fetch보다 먼저 확인하고, 사용자별 source 조회 조건을 유지한다.
- lint, TypeScript, Jest, production build가 통과한다.

## 유보 사항

- URL과 `job_target`을 하나의 트랜잭션으로 묶는 지원 대상 CRUD
- Gemini 기반 요구사항·인재상 자동 분류와 `job_requirements` 생성
- JavaScript 렌더링이 필요한 페이지, 로그인/캡차/유료벽 우회
- 원본 HTML 전체 저장, OCR, 외부 검색 엔진·벡터 DB 연동

## 위험과 복구

- DNS A/AAAA 전체 주소를 검증한 뒤 같은 주소 목록만 custom socket lookup에 제공하고 연결마다 agent 재사용을 끈다. 리다이렉트도 매 단계 새로 확인·고정한다. 네트워크 경계는 애플리케이션 외부 egress 정책으로도 제한하는 것이 바람직하다.
- HTML 파서는 DOM을 실행하지 않는다. HTML 구조가 깨지거나 텍스트가 없으면 `manual_input`/`needs_review`로 남기고 원문을 성공으로 가장하지 않는다.
- 외부 사이트의 robots 정책·이용약관·응답 변동은 수집 성공과 별개로 운영 정책에서 확인한다.

## 진행

- [x] safe URL fetch adapter — URL/redirect/DNS/MIME/size/timeout 경계
- [x] DNS rebinding 보완 — 연결 시 재조회 대신 검증된 주소에 고정
- [x] source registration — URL source API와 원본 메타데이터 저장
- [x] career library UI — URL 입력과 상태 표시
- [x] regression verification — 보안 경계 단위 테스트, lint, TypeScript, Jest, build

## 검증 기록

- `npm run harness:verify` 통과: 17 suites, 151 tests.
- 더미 환경변수 `npm run build` 통과. `/career`, `/api/source-documents`, `/api/source-documents/[id]` 라우트가 생성되는 것을 확인했다.
- `git diff --check` 통과.
- URL 수집 경계는 단위 테스트로 HTTPS·공개 IP·IPv4 매핑 주소·리다이렉트 재검증·MIME·응답 크기·HTML unsafe block 제거를 확인했다.
- `supabase/migrations/20260918010000_m1_domain_foundation.sql`에 이미 `source_url`/`fetched_at`이 있어 새 원격 migration은 추가하지 않았다. 운영 Supabase/Vercel에는 적용하지 않았다.
- 2026-09-22 DNS rebinding 후속 보완: DNS 전체 결과 중 사설 주소가 하나라도 섞이면 거절하고, 검사한 A/AAAA 주소 목록만 custom socket lookup에 전달한다. 매 연결마다 agent 재사용을 끄고 리다이렉트마다 같은 과정을 반복한다. 조회·응답을 포함해 각 hop을 10초로 제한한다.
- 후속 검증: `npm run harness:verify -- --runInBand` 린트·TypeScript 및 65개 스위트/366개 테스트 통과, `npm run rollout:verify` 10개 점검 통과, 더미 환경변수를 사용한 `npm run build` 통과, `git diff --check` 통과. 기존 Supabase Edge Runtime 경고는 계속 관찰되며 이번 변경과 무관하다.
