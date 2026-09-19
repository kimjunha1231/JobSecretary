# M3-b 지원 대상과 요구사항 분석

## 목표와 범위

사용자가 회사·직무를 `job_target`으로 만들고, 검수 완료한 채용공고·인재상 자료를 연결한 뒤, 원문 fragment를 근거로 요구사항 후보를 생성·검수한다. 기존 M1 테이블과 RLS를 사용하며 새 원격 DB migration은 추가하지 않는다.

이번 단계에 포함한다.

- `/jobs` 지원 대상 목록·생성·수정 화면
- `/api/job-targets`, `/api/job-targets/[id]` 서버 경계
- 사용자 소유 source document만 job target에 연결
- 승인된 source fragment만 AI 분석 context에 포함
- Gemini JSON 응답을 Zod로 검증하고 존재하는 fragment ID만 저장
- 요구사항 후보의 `suggested → approved/rejected` 상태 변경
- 인증·소유권·AI rate limit·실패 응답 테스트

이번 단계에서 유보한다.

- JavaScript 렌더링·로그인·캡차 페이지 수집
- 자동 지원서 제출
- 요구사항 버전 비교·변경 감지
- 벡터 검색과 전체 경력 근거 추천
- 작성 후보·자소서 생성 스튜디오(M4)

## 현재 근거

- `entities/job-target/model/types.ts`에 `JobTarget`, `JobTargetSource`, `JobRequirement` Zod 타입이 이미 있다.
- `supabase/migrations/20260918010000_m1_domain_foundation.sql`에 세 테이블과 사용자별 RLS 정책이 이미 있다.
- `sourceDocumentService`는 source document와 fragment를 사용자 ID로 제한하고, URL 자료를 `needs_review`로 저장한다.
- `features/ai-assistant/api/ai.service.ts`는 Gemini 호출과 fallback을 가지고 있으나 job analysis 전용 schema와 rate limit operation은 없다.
- 현재 사이드바에는 `/career`만 있고 지원 대상 화면은 없다.

## 완료 조건과 검사

| 조건 | 확인 방법 |
|---|---|
| 비로그인 사용자는 job target과 분석 API를 사용할 수 없다. | service/API 단위 테스트 |
| 다른 사용자의 target/source/requirement ID를 읽거나 수정할 수 없다. | 소유권 조건을 포함한 mock service 테스트, SQL RLS 기존 정책 확인 |
| 분석 context에는 `approved` source document의 fragment만 들어간다. | 분석 service 테스트에서 요청 context와 필터 확인 |
| 모델이 반환한 모르는 fragment ID나 잘못된 category/status는 저장되지 않는다. | Zod·ID allowlist 테스트 |
| AI가 원문 속 지시문을 실행하지 않고 요구사항 데이터로만 취급한다. | system/prompt 경계와 출력 검증 코드 리뷰 |
| 요구사항은 `suggested`로 저장되고 사용자가 승인·거절할 수 있다. | API/UI 상태 변경 테스트 |
| 기존 자료 라이브러리와 작성 흐름이 깨지지 않는다. | `npm run harness:verify`, 더미 env `npm run build` |

## 실행 순서

1. job target 서비스와 public API를 추가한다.
2. source link 동기화와 detail 조회를 구현한다.
3. AI 분석 adapter와 요구사항 저장·상태 변경을 추가한다.
4. `/jobs` 화면과 사이드바 진입점을 연결한다.
5. 단위 테스트, lint, TypeScript, build를 실행하고 문서를 갱신한다.

## 위험과 복구

- Gemini 실패 시 기존 승인된 요구사항을 삭제하지 않고 오류를 반환한다. 새 `suggested` 후보 교체는 분석 요청이 성공적으로 검증된 뒤에만 수행한다.
- AI 응답에 출처가 없거나 허용되지 않은 fragment ID가 포함되면 해당 후보를 저장하지 않고 경고를 반환한다.
- 운영 Supabase/Vercel 자격 증명이 없으므로 migration 적용·배포·실데이터 변경은 수행하지 않는다.

## 진행

- [x] job target service/API
- [x] source link와 requirement state API
- [x] 구조화 요구사항 분석 adapter
- [x] `/jobs` UI와 사이드바
- [x] 검증 및 문서 갱신

## 검증 기록

- `npm run harness:verify` 통과: 18 suites, 157 tests.
- 더미 환경변수 `npm run build` 통과. `/jobs`와 job target API 4개 라우트가 생성되는 것을 확인했다.
- `git diff --check` 통과.
- AI 분석 테스트에서 인증 거부, 잘못된 JSON, 알 수 없는 fragment ID 필터링, prompt injection 경계를 확인했다.
- 운영 Supabase/Vercel에는 변경을 적용하지 않았고, 기존 M1 migration의 job target/requirement 테이블과 RLS를 재사용했다.
