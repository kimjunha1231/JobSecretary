# JobSecretary : AI 통합 채용 관리 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![FSD](https://img.shields.io/badge/Architecture-FSD-orange?style=flat-square)](https://feature-sliced.design/)

<br>

## 1. 프로젝트 소개

**JobSecretary**는 취업 준비를 하다 보니 자기소개서 작성, 채용 공고 관리, PDF 변환, 면접 준비 등을 위해 너무 많은 플랫폼을 오가야 해서 비효율적이라 느꼈습니다. 이를 해결하기 위해 **통합 플랫폼 구축**을 목표로 만들었습니다.

사용자는 공고 및 지원현황을 관리하며 흩어져 있는 자기소개서를 태그 기반으로 저장 및 검색하고, **AI**를 활용해 자기소개서 초안 작성부터 교정, 면접 예상 질문 생성까지 취업 전과정을 효율적으로 관리할 수 있습니다.

- **배포 사이트**: [https://jobsecretary.lat](https://jobsecretary.lat)

<br>

## 2. 핵심 기능

| 기능 | 설명 |
| --- | --- |
| **🤖 AI 자기소개서 솔루션** | 사용자 경험 데이터 기반 AI 자기소개서 초안 작성, 교정, 면접 질문 생성 |
| **📊 칸반형 공고 관리** | 드래그 앤 드롭으로 '작성 중 → 지원 완료 → 면접 → 합격/불합격' 채용 단계 관리 |
| **🗂️ 자기소개서 관리** | 태그 기반 자기소개서 저장·검색, PDF 포트폴리오 변환 |

<br>

## 3. 기술 스택

### Frontend
| 분류 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| 폼 상태 관리 | React Hook Form + Zod |
| 서버 상태 관리 | TanStack Query |
| 전역 상태 관리 | Zustand |
| Styling | Tailwind CSS, Shadcn UI |
| Testing | Jest (Unit), Playwright (E2E) |
| 에러 모니터링 | Sentry |

### Backend & Infra
| 분류 | 기술 |
|------|------|
| DB | Supabase |
| AI | Google Gemini API |
| Infra | Vercel |

<br>

## 4. 아키텍처

**Feature-Sliced Design (FSD)** 패턴을 채택하여 기술적 역할이 아닌 **비즈니스 도메인** 기준으로 코드를 격리했습니다.

```
.
├── app/                    # Composition Layer (라우팅 및 페이지 조립)
│   ├── api/                # Server Actions & API Routes
│   └── (pages)/            # 페이지 컴포넌트
├── widgets/                # 하나의 위젯 블록 (Sidebar, KanbanBoard, ArchiveBoard, SourceLibrary)
├── features/               # 사용자 상호작용 기능 하나의 기능
│   ├── document-kanban/    # 칸반 보드 드래그 앤 드롭
│   ├── document-editor/    # 문서 편집 및 뷰어
│   ├── document-write/     # 자소서 작성 폼
│   ├── document-archive/   # 아카이브 필터링 및 목록
│   ├── source-ingestion/   # PDF/DOCX/텍스트 자료 추출 및 등록
│   ├── ai-assistant/       # AI 교정 기능
│   └── auth/               # 인증 및 동의
├── entities/               # 비즈니스 데이터 모델
│   ├── document/           # 자소서 엔티티 (types, actions, hooks, ui)
│   ├── draft/              # 임시 저장 상태
│   └── user/               # 사용자 프로필
├── shared/                 # 공용 모듈
│   ├── ui/                 # 재사용 UI 컴포넌트
│   ├── config/             # 상수 및 설정
│   ├── lib/                # 유틸리티 함수
│   └── api/                # Supabase 클라이언트
└── middleware.ts           # 인증 미들웨어
```

### 보안 기준선(M0)

- 개인 문서와 `/document/*` 경로는 Supabase 세션을 확인한 뒤 사용자 소유 행만 조회합니다.
- AI server action은 인증, 입력 크기, 작업별 호출 제한을 모델 요청 전에 검사합니다. 현재 호출 제한 저장소는 단일 Vercel 인스턴스에서 동작하는 임시 기준선이며, 다중 인스턴스 운영 전 Redis/Upstash 기반 limiter로 교체해야 합니다.
- OAuth callback의 `next`는 같은 origin의 내부 상대 경로만 허용합니다.
- 운영 Supabase에 적용하기 전 `supabase/verify/rls-documents.sql`과 `supabase/verify/rls-user-profiles.sql`로 기존 정책을 확인하고 두 M0 migration을 적용하세요. 예기치 않은 기존 정책이 있으면 migration이 의도적으로 중단됩니다.

### 도메인 기반(M1)

- `CONTEXT.md`에 원본 자료, 경력 항목, 근거 기록, 지원 대상, 작성 세션의 공통 용어와 승인 규칙을 기록했습니다.
- 새 source/career/evidence/job/cover-letter 모델과 Supabase migration은 기존 `documents`를 삭제하지 않고 추가됩니다.
- 기존 Markdown 자기소개서는 `npm run backfill:legacy`로 먼저 dry-run할 수 있습니다. 실제 쓰기는 `BACKFILL_APPLY=true`와 `SUPABASE_SERVICE_ROLE_KEY`를 함께 지정했을 때만 실행됩니다.

### 자료 가져오기(M2)

- `/career`에서 이력서·포트폴리오·기존 자기소개서를 PDF, DOCX, TXT/Markdown 파일 또는 붙여넣은 텍스트로 등록할 수 있습니다.
- 텍스트 레이어가 없는 PDF는 `manual_input`으로 보존되며, `/career` 자료 카드의 `본문 보정`에서 확인한 텍스트를 저장한 뒤 다시 검수할 수 있습니다. 수동 보정 저장은 승인 상태를 자동으로 유지하지 않습니다.
- 서버 Node runtime에서 본문을 추출하고 SHA-256 해시와 페이지/문단 fragment를 저장합니다. 추출 결과는 `needs_review`로 보류되며 사용자가 검수 완료한 자료만 다음 AI 작성 단계에서 사용하도록 설계했습니다.
- 원본 바이너리 Storage 보관과 OCR은 후속 단계로 남아 있습니다. 활동 후보 추출은 자료를 승인한 뒤 사용자가 직접 검수·저장하는 방식으로 먼저 연결했고, A4 PDF는 M6에서 구현했습니다. M2 migration은 `extraction_warnings`만 additive하게 확장합니다.
- 운영 적용 전 `supabase/verify/rls-m2-source-ingestion.sql`로 source 문서의 RLS와 경고 컬럼을 확인한 뒤 migration을 순서대로 적용하세요.

### 검수형 활동 후보 추출(M2-d)

- 승인된 이력서·포트폴리오·기존 자기소개서 카드에서 `활동 후보 만들기`를 실행하면 서버가 Gemini에 원문 fragment를 불신 데이터로 전달하고, 프로젝트·경력·교육·수상 등의 후보를 구조화합니다.
- 모델이 반환한 후보의 `sourceFragmentIds`는 서버 allowlist와 다시 대조합니다. 출처를 확인할 수 없는 후보는 제외하고, 자료가 승인되지 않았거나 보관된 상태면 AI 호출을 시작하지 않습니다.
- 후보는 화면에서 신뢰도·요약·기여·행동·결과·성과를 비교한 뒤 `활동으로 저장` 또는 `제외`할 수 있습니다. 저장을 누른 항목만 승인된 `career_items`·`evidence_records`로 만들어지며 `evidence_sources`에 원문 인용이 연결됩니다.
- AI 사용량은 사용자별 `career_extraction` 작업으로 분당 3회 제한합니다. Gemini 실패·잘못된 JSON·출처 불일치는 빈 성공으로 바꾸지 않고 오류로 안내합니다.
- 후보 추출과 출처 allowlist·중복 제거·코드펜스 JSON 파싱은 `tests/unit/features/career-extraction.test.ts`에서 검증합니다. 원격 Supabase migration/Vercel 설정은 이 단계에서 변경하지 않았습니다.

### 공개 URL 자료 수집(M3-a)

- `/career`에서 채용공고·인재상 자료의 HTTPS 공개 URL을 등록할 수 있습니다. 서버는 URL과 리다이렉트마다 DNS를 확인하고 사설·루프백·link-local·IPv4 매핑 주소, 비표준 포트, 과대 응답을 차단합니다.
- HTML은 브라우저에 렌더링하지 않고 `script`·`style`·주석 등 실행·장식 블록을 제거한 텍스트와 heading/문단 fragment만 저장합니다. 최종 URL과 수집 시각도 함께 보존합니다.
- URL 자료도 파일 자료와 동일하게 `needs_review`로 시작하며 사용자가 검수 완료하기 전에는 다음 작성 흐름의 근거로 사용하지 않습니다. 로그인·캡차·JavaScript 렌더링 페이지와 Gemini 기반 요구사항 분류는 M3-b 이후 단계입니다.

### 지원 대상·요구사항 분석(M3-b)

- `/jobs`에서 회사·직무·고용 형태·마감일을 지원 대상으로 묶고, 경력 자료 라이브러리의 채용공고·인재상 자료를 연결할 수 있습니다.
- 검수 완료한 source fragment만 Gemini 분석 context에 넣고, 원문 안의 지시문은 데이터로 취급하도록 경계를 분리합니다. 모델이 반환한 fragment ID는 서버에서 연결된 승인 자료와 다시 대조합니다.
- 요구사항은 `주요 업무`, `필수 역량`, `우대사항`, `인재상·가치관`, `지원 문항` 후보로 저장되며 `검수 필요 → 승인됨/제외됨`을 사용자가 선택합니다. 각 후보에는 원문 미리보기가 표시됩니다.
- AI 실패·잘못된 JSON·출처 불일치는 기존 승인 요구사항을 조용히 덮어쓰지 않고 오류로 반환합니다. 지원서 초안 후보 비교와 활동 근거 추천은 M4에서 이어집니다.

### 근거 선택형 작성 스튜디오(M4-a)

- `/writing/new?jobTargetId=...`에서 지원 문항과 글자 수를 정해 작성 세션을 만들 수 있습니다.
- 승인된 활동 근거를 요구사항별 추천으로 보고 선택·제외·고정할 수 있으며, 직접 입력한 활동도 승인 근거로 추가할 수 있습니다.
- 선택한 근거만 AI context에 넣어 문제 해결·협업·성장 관점의 개요 후보 3개와 초안 후보 3개를 비교합니다. 선택하지 않은 근거 ID나 잘못된 JSON은 서버에서 저장하지 않습니다.
- 초안 후보는 글자 수를 코드로 다시 계산하며, 제한을 넘은 후보는 선택·최종 확정할 수 없습니다. 사용자 수정과 AI 선택은 revision으로 남습니다.
- 운영 Supabase에는 `supabase/migrations/20260919010000_m4_writing_studio.sql`을 아직 적용하지 않았습니다. PDF 출력과 말투 프로필은 다음 단계입니다.
- 운영 적용 전에는 `supabase/verify/rls-m4-writing-studio.sql`로 작성 세션·후보·revision 테이블의 RLS와 owner policy를 읽기 전용으로 확인해야 합니다.

### 문항 다중 작성·문단 병합·사실 근거 검증(M4-b)

- `/writing/new`에서 한 지원 대상의 자기소개서 문항을 여러 개 등록하면 작성 작업대에서 문항 탭으로 전환할 수 있습니다. 근거·개요·초안·revision은 활성 문항별로 분리됩니다.
- 초안 비교 화면에서 문단마다 후보를 선택해 하나의 편집 초안을 만들 수 있으며, 병합 결과는 사용자 revision으로 남습니다.
- AI 초안은 숫자·날짜·회사·프로젝트 등 사실 문장마다 `evidenceRecordId`를 인용해야 합니다. 편집 화면에서 문장별 활동을 다시 연결할 수 있고, 근거 없는 사실 문장은 최종 확정 전에 차단됩니다.
- `supabase/migrations/20260919020000_m4b_fact_citation_multi_question.sql`은 운영 DB에 아직 적용하지 않았습니다. 적용 전 M4-a migration 이후 순서와 `supabase/verify/rls-m4-writing-studio.sql`의 `draft_fact_citations` RLS를 확인해야 합니다.

### 말투 프로필·품질 요약(M5-a)

- `/style`에서 사용자의 문장 끝맺음, 선호 연결어, 피하고 싶은 표현과 직접 작성한 예문을 말투 프로필로 저장할 수 있습니다. 예문은 승인된 항목만 다음 생성에 사용됩니다.
- `/writing/new`에서 말투 프로필을 선택하면 승인 예문은 사실 근거와 분리된 `style` context로만 전달됩니다. system instruction은 예문에 포함된 회사·수치·사건을 새로운 사실로 복사하지 않도록 고정되어 있습니다.
- `/writing/[sessionId]`는 선택 근거 수, 후보 수, 사용자 수정 횟수, 사실 문장 근거 커버리지를 현재 세션 데이터에서 계산해 보여줍니다.
- `supabase/migrations/20260919030000_m5_style_profile_quality.sql`은 운영 DB에 아직 적용하지 않았습니다. 적용 전 `supabase/verify/rls-m5-style-profile.sql`로 프로필·예문·세션 FK를 읽기 전용 확인해야 합니다. 최종 확정 문장 승격 UX와 문항별 예문 범위는 M5-b에서 구현했고, golden set 평가·검색 품질 측정 후 pgvector/RAG 도입은 다음 단계입니다.

### 최종 답변 예문 승격·문항별 말투 자료(M5-b)

- 최종 확정된 문항에서만 현재 답변을 `approved_final` 말투 예문으로 저장할 수 있습니다. 본문은 클라이언트 입력이 아니라 서버의 `cover_letter_questions.final_answer`에서 읽습니다.
- 예문은 전역 자료와 특정 문항 자료로 구분되며, 작성 중인 문항에는 전역 승인 예문과 현재 문항의 승인 예문만 전달됩니다.
- `supabase/migrations/20260919040000_m5b_question_style_examples.sql`은 운영 DB에 아직 적용하지 않았습니다. 기존 예문은 전역 예문으로 유지되며, 적용 전 M5 RLS 확인 SQL과 함께 migration 순서를 검증해야 합니다.

### 골든셋 품질 평가·초안 비교(M5-c)

- `/writing/[sessionId]`에서 최종 확정 답변을 골든셋 사례로 저장하고, 같은 질문의 최종 답변과 다른 초안 후보를 글자 수·금칙 표현·사실 근거 커버리지·사용자 수정률 기준으로 비교할 수 있습니다.
- 평가 테이블에는 답변 원문 대신 SHA-256 hash와 결정론적 요약 지표만 저장합니다. 사례·실행 결과 모두 사용자 소유 RLS와 세션·문항·초안 소유권 검증을 통과해야 합니다.
- `supabase/migrations/20260919050000_m5c_style_evaluation.sql`은 운영 DB에 아직 적용하지 않았습니다. 적용 전 `supabase/verify/rls-m5c-style-evaluation.sql`을 읽기 전용으로 실행하고, 실제 사용자 사례를 넣기 전에 migration 순서와 정책 결과를 확인해야 합니다.

### 서버 PDF 출력·기존 문서 전환(M6-a)

- 최종 확정된 작성 세션은 `/api/writing-sessions/[id]/export`에서 모든 문항의 확정 상태를 다시 확인한 뒤 A4 PDF로 내려받을 수 있습니다. 미확정 문항이 하나라도 있으면 409로 차단합니다.
- 기존 `/write` 문서는 `/api/documents/[id]/export`로 같은 템플릿의 PDF를 받을 수 있습니다. 원본 `documents` 행은 삭제하거나 새 모델로 덮어쓰지 않습니다.
- PDF renderer는 서버 Node runtime에서만 실행하며, 제출용 PDF에는 evidence ID·프롬프트·평가 메타데이터를 넣지 않습니다. 한국어 Pretendard 글꼴은 `public/fonts`에 번들해 외부 CDN 의존성을 제거했습니다.

### 승인 활동 이력서·포트폴리오 PDF(M6-b)

- `/career`에서 `포트폴리오 PDF` 또는 `이력서 PDF`를 선택하면 `/api/career/export`가 승인된 활동 근거만 A4 PDF로 묶습니다. 아직 승인된 활동이 없으면 빈 파일을 만들지 않고 안내 오류를 반환합니다.
- `/career`의 `승인된 활동 근거` 영역에서 프로젝트·경력·교육·수상 활동을 조직/역할·기여·행동·결과·성과·기술 단위로 확인할 수 있습니다. 이 목록과 PDF 모두 `approved` 상태만 사용합니다.
- 출력에는 활동 제목·조직/역할·기여·상황/행동/결과·성과·기술만 포함하며, UUID·원본 프롬프트·평가 메타데이터는 포함하지 않습니다.
- 이 경로도 서버에서 현재 사용자 소유와 승인 상태를 재조회하므로, 화면에 보이는 목록을 신뢰해 제출 자료를 만들지 않습니다.
- `npm run harness:verify`와 production build를 통과했고, 2페이지 샘플을 PNG로 렌더링해 한글 글리프·줄바꿈·페이지 번호·페이지 나눔을 확인했습니다.

<br>

## 5. 성능 최적화

| 최적화 항목 | 적용 기술 |
|------------|----------|
| **렌더링 최적화** | `useMemo`, `useCallback`으로 칸반 드래그 중 불필요한 리렌더 방지, React Hook Form 비제어 컴포넌트로 타이핑 시 리렌더 최소화 |
| **FCP 개선** | Back-Forward Cache 활성화, Dynamic Import 활용 |
| **접근성** | `aria-label`, `sr-only`, Lighthouse 접근성 점수 개선 |
