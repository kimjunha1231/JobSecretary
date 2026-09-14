# JobSecretary AI 장애 복구

## 목표와 완료 조건

- 초안 작성, 문장 교정, 면접 질문 생성이 유효한 응답을 반환한다.
- 모델 과부하/시간 초과/종료 오류는 지원되는 대체 모델로 전환한다.
- 인증 오류는 기존 키 순서를 유지하고, 요청 오류와 할당량 오류를 무한 재시도하지 않는다.
- 빈 응답이나 잘못된 JSON을 문서 내용 또는 성공 결과로 반영하지 않는다.
- 비밀값은 코드, 로그, PR에 포함하지 않는다. 데이터베이스 변경은 범위 밖이다.

## 확인한 근거

- 운영 `jobsecretary.lat`과 로컬 main은 `6462d0c`로 동일하다.
- 운영 `/write` AI 교정에서 Gemini 503 UNAVAILABLE/high demand 오류를 재현했다.
- 운영 키의 Models API에서 `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`가 `generateContent` 지원 모델로 조회됐다.
- `gemini-flash-latest`가 가리키는 `gemini-3.8-flash`는 직접 JSON 생성 요청에서도 503을 반환했다. 같은 요청에서 `gemini-3.7-flash`와 `gemini-3.6-flash`는 약 2초 안에 유효 JSON을 반환했다.
- 지정 Google 계정의 AI Studio 기존 키 목록 확인. 실제 키값은 기록하지 않는다.
- 설치 버전: Next.js 15.1.11, @google/genai 2.22.0. 이 Next 설치에는 `node_modules/next/dist/docs/`가 없다.
- 독립 코드 조사에서 교정/면접 JSON 구조 미검증과 빈 초안의 성공 처리 결함을 재현했다.

## 실행 순서 및 파일 책임

1. 메인: `shared/config/ai.ts`, `tests/unit/config/ai.test.ts` — 고정 모델(3.7 Flash), 대체 모델(3.6 Flash), 오류 종류에 따른 제한된 전환, 키 마스킹.
2. 독립 작업자: `features/ai-assistant/api/ai.service.ts`, `features/document-editor/api/interview.ts`, `tests/unit/api/*` — 공통 전환 적용, 요청 시간 제한, SDK 통일, 응답 검증.
3. 메인: `.env.example`, 하네스 검증 지침 — 검증된 모델 설정/장애 구분 기록.
4. 통합 후 `npm run harness:verify`, 프로덕션 빌드, 가상 입력을 사용한 실제 Gemini 기능 점검.
5. 자체 리뷰 및 PR. 저장소 규칙에 따라 main 병합은 사용자에게 맡긴다. 배포/운영 확인 상태는 실제 수행 결과로 기록한다.

## 진행

- [x] 운영 장애 재현 및 원인 확인
- [x] 지원 모델의 정상 응답 확인
- [x] 모델 전환 및 응답 검증 구현
- [x] 자동 검사 및 빌드
- [x] 실제 기능 재검증
- [x] 자체 리뷰, PR, 배포 상태 보고

## 검증 중 확인 사항

- 기존 `eslint.config.mjs`가 flat config를 다시 `FlatCompat`로 변환해 ESLint 9에서 순환 구조 오류를 냈다. 설치된 `eslint-config-next`가 제공하는 flat config를 직접 불러오도록 수정한다.
- 설정 복구 후 기존 정책 문구의 JSX 따옴표 2곳, 미사용 import 1곳, API route의 명시적 `any` 2곳이 드러났다. 표시와 오류 응답 동작을 유지하는 범위에서 정리한다.

## 검증 결과

- `npm run harness:verify`: ESLint, TypeScript, Jest 11 suites / 124 tests 통과.
- `npm run build`: Next.js 15.1.11 프로덕션 빌드 통과, 16개 정적 페이지 생성.
- 운영 환경의 기존 `career` 키와 새 전환 함수를 함께 실행했다. `@google/genai` 2.22.0에서 `gemini-3.7-flash`가 유효 JSON을 반환했으며, 과부하 시 `gemini-3.6-flash`로 전환하도록 고정했다.
- 공식 3.8 마이그레이션 지침에 따라 폐기 예정인 `temperature` 생성 옵션을 제거했다.
- 변경 파일에서 실제 Google 키 패턴과 사용자 이메일이 포함되지 않았음을 확인했다.
- 최종 검토에서 SDK가 감싸는 AbortError와 다중 키 429 전환 누락을 발견해 회귀 테스트와 함께 수정했다.

## 참고

- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/changelog
- https://ai.google.dev/gemini-api/docs/troubleshooting
