# M0 보안·저장소 기준선 구현 계획

## 목표

새로운 경력 자료와 채용공고 URL을 받기 전에 인증, 사용자 소유권, AI 호출, 외부 입력, 의존성의 경계를 코드와 migration으로 고정한다. 기존 `documents` 데이터는 삭제하지 않고 다음 단계의 backfill을 준비한다.

## 확인된 근거

- `middleware.ts`의 보호 목록은 `/dashboard`, `/write`, `/archive`에만 한정되어 있다.
- `app/api/auth/callback/route.ts`는 `next` 값을 내부 경로인지 검증하지 않고 redirect에 사용한다.
- `features/ai-assistant/api/ai.service.ts`의 `generateDraft()`만 사용자 인증을 검사하고, 다른 AI 함수에는 공통 인증·사용량 제한이 없다.
- `entities/document/model/use-document.ts`, `use-document-mutations.ts`는 브라우저에서 Supabase를 직접 호출한다.
- 저장소에 Supabase schema/RLS migration이 없다.
- `package.json`의 Next.js 15.1.11, Sentry 8.41.0, Sharp 0.33.5는 audit 결과 업데이트 검토가 필요하다.

## 실행 순서

1. Next.js 15 패치 라인과 호환 lint config, Sentry, Sharp, PostCSS를 업데이트한다.
2. 공개·개인 라우트의 인증 경계를 정리하고 OAuth 내부 redirect 검증을 추가한다.
3. AI 호출 공통 wrapper에 인증, 입력 크기, 사용자별 rate limit, timeout, 안전한 오류 응답을 추가한다.
4. 기존 문서 테이블의 RLS를 재현 가능한 migration으로 기록하고 새 사용자 소유 테이블용 정책 템플릿을 추가한다.
5. 문서 상세 조회·수정·삭제 중 한 경로를 server repository/API 경계로 이전해 이후 migration 패턴을 고정한다.
6. 보안·소유권·redirect·AI 제한 회귀 테스트를 추가한다.

## 완료 조건

- 비로그인 사용자는 개인 문서 경로와 AI route에 접근할 수 없다.
- 다른 사용자의 문서 ID를 알아도 조회·수정·삭제할 수 없다.
- OAuth callback은 허용된 내부 상대 경로로만 이동한다.
- 인증되지 않았거나 입력 크기·rate limit을 넘은 AI 요청은 모델 호출 전에 거절된다.
- migration과 테스트가 저장소에 있으며 운영 schema 확인 전에는 원격 DB를 변경하지 않는다.
- `npm run harness:verify`와 더미 공개 환경값 기반 `npm run build`가 통과한다.

## 위험과 복구

- 패치 업데이트 중 breaking change가 나타나면 같은 major의 안정된 패치로 고정하고 변경을 단계별로 되돌린다.
- RLS migration은 additive하게 추가하며 기존 `documents`를 삭제하지 않는다.
- 브라우저 직접 호출을 전환하는 동안 기존 adapter를 유지해 기능을 비교한다.
- 운영 Supabase와 Vercel 환경변수는 이 작업에서 수정하지 않는다.

## 진행

- [x] 의존성 보안 업데이트 — Next.js 15.5.25 패치 라인과 호환되는 Sentry 10.75.0, Sharp 0.35.4, PostCSS 8.5.28을 반영하고, Google 인증 라이브러리의 중첩 `minimatch`는 `overrides`로 안전한 패치 버전을 고정했다. `next.config.mjs`는 Sentry 10의 권장 `@sentry/nextjs/config` 경로를 사용한다. `npm audit --omit=dev`는 3건(Next 15가 고정한 중첩 PostCSS 1건과 peer/dev 경로의 저·중 위험 2건)으로 줄었으며, Next 16으로의 메이저 전환은 별도 호환성 작업으로 남겼다.
- [x] 인증 라우트와 OAuth redirect 보호 — `/document` 보호 경로를 추가하고 same-origin 내부 상대 경로만 허용하는 `getSafeInternalPath`를 적용했다.
- [x] AI 공통 보호 wrapper — 모든 Gemini server action에 인증, 입력 길이/배열 제한, 작업별 제한, 기존 timeout/fallback을 연결했다. 모델을 호출하지 않아도 외부 URL fetch·문서 파싱을 수행하는 `POST /api/source-documents`에도 사용자별 10회/분 제한을 추가했다. `UPSTASH_REDIS_REST_URL`·`UPSTASH_REDIS_REST_TOKEN`이 설정된 환경에서는 EVAL 기반 공유 제한기를 사용하고, 미설정·장애 시 인메모리 제한기로 안전하게 폴백한다.
- [x] Supabase RLS migration — `documents`와 `user_profiles` 각각에 소유권 정책 migration과 읽기 전용 정책 점검 SQL을 추가했다. 예기치 않은 기존 정책이 있으면 migration이 중단되며, 운영 DB에는 적용하지 않았다.
- [x] server data boundary 전환 — 문서 상세 조회와 생성·수정·삭제·보관 mutation을 `/api/documents` 계열 서버 repository 경계로 이전했다. 문서 API 입력 Zod 검증과 server-side 사용자 소유권 필터를 적용했다.
- [x] 회귀 검증 — redirect/rate limit/AI 입력·인증 회귀 테스트를 추가했고 lint, TypeScript, Jest(현재 14 suites/138 tests), 더미 환경변수 기반 production build를 통과했다.
- [x] 문서 입력 개인정보 보호 보완 — Sentry의 default PII 전송을 끄고 client Replay에서 텍스트·입력값·미디어를 명시적으로 마스킹/차단했다. 작성 문서가 관측성 데이터에 섞이지 않는 구성을 코드에 고정했으며, harness와 production build를 다시 통과했다.

## 검증 기록

- `npm run lint` 통과 (Next 15.5의 `next lint` deprecation 및 기존 boundaries 경고만 표시)
- `npx tsc --noEmit` 통과
- `npm test -- --runInBand` 통과 (45 suites, 269 tests)
- `NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... GEMINI_API_KEY=... npm run build` 통과
- 더미 공개 환경변수 기반 Playwright Chromium E2E 19개 통과, `npm run rollout:verify` 7개 점검 통과
- Preview `coverlettervault-2w7k5k0hb-junhas-projects-a748ef77.vercel.app`가 `READY`가 되었고 `/` 200, 비로그인 `/career` 307, 인증 필요 API 401, error/warning 로그 없음 확인
- 운영 Supabase/Vercel 환경변수와 원격 DB는 자격 증명 부재로 변경하지 않음
