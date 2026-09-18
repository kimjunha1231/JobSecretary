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
- 서버 Node runtime에서 본문을 추출하고 SHA-256 해시와 페이지/문단 fragment를 저장합니다. 추출 결과는 `needs_review`로 보류되며 사용자가 검수 완료한 자료만 다음 AI 작성 단계에서 사용하도록 설계했습니다.
- 원본 바이너리 Storage 보관, OCR, 경력 항목 자동 제안, A4 PDF는 후속 단계로 남아 있습니다. M2 migration은 `extraction_warnings`만 additive하게 확장합니다.
- 운영 적용 전 `supabase/verify/rls-m2-source-ingestion.sql`로 source 문서의 RLS와 경고 컬럼을 확인한 뒤 migration을 순서대로 적용하세요.

### 공개 URL 자료 수집(M3-a)

- `/career`에서 채용공고·인재상 자료의 HTTPS 공개 URL을 등록할 수 있습니다. 서버는 URL과 리다이렉트마다 DNS를 확인하고 사설·루프백·link-local·IPv4 매핑 주소, 비표준 포트, 과대 응답을 차단합니다.
- HTML은 브라우저에 렌더링하지 않고 `script`·`style`·주석 등 실행·장식 블록을 제거한 텍스트와 heading/문단 fragment만 저장합니다. 최종 URL과 수집 시각도 함께 보존합니다.
- URL 자료도 파일 자료와 동일하게 `needs_review`로 시작하며 사용자가 검수 완료하기 전에는 다음 작성 흐름의 근거로 사용하지 않습니다. 로그인·캡차·JavaScript 렌더링 페이지와 Gemini 기반 요구사항 분류는 M3-b 이후 단계입니다.

<br>

## 5. 성능 최적화

| 최적화 항목 | 적용 기술 |
|------------|----------|
| **렌더링 최적화** | `useMemo`, `useCallback`으로 칸반 드래그 중 불필요한 리렌더 방지, React Hook Form 비제어 컴포넌트로 타이핑 시 리렌더 최소화 |
| **FCP 개선** | Back-Forward Cache 활성화, Dynamic Import 활용 |
| **접근성** | `aria-label`, `sr-only`, Lighthouse 접근성 점수 개선 |
