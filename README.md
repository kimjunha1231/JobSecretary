# JobSecretary : AI 통합 채용 관리 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
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
| **🤖 AI 자소서 솔루션** | 사용자 경험 데이터 기반 AI 자기소개서 초안 작성, 교정, 면접 질문 생성 |
| **📊 칸반형 공고 관리** | 드래그 앤 드롭으로 '작성 중 → 지원 완료 → 면접 → 합격/불합격' 채용 단계 관리 |
| **🗂️ 커리어 자산화** | 태그 기반 자소서 저장·검색, PDF 포트폴리오 변환 |

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

### Backend & Infra
| 분류 | 기술 |
|------|------|
| DB | Supabase |
| AI | Google Gemini API |
| 에러 모니터링 | Sentry |
| 배포 | Vercel |

<br>

## 4. 아키텍처

**Feature-Sliced Design (FSD)** 패턴을 채택하여 기술적 역할이 아닌 **비즈니스 도메인** 기준으로 코드를 격리했습니다.

```
.
├── app/                    # Composition Layer (라우팅 및 페이지 조립)
│   ├── api/                # Server Actions & API Routes
│   └── (pages)/            # 페이지 컴포넌트
├── widgets/                # 하나의 위젯 블록 (Sidebar, KanbanBoard, ArchiveBoard)
├── features/               # 사용자 상호작용 기능 하나의 기능
│   ├── document-kanban/    # 칸반 보드 드래그 앤 드롭
│   ├── document-editor/    # 문서 편집 및 뷰어
│   ├── document-write/     # 자소서 작성 폼
│   ├── document-archive/   # 아카이브 필터링 및 목록
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

<br>

## 5. 성능 최적화

| 최적화 항목 | 적용 기술 |
|------------|----------|
| **렌더링 최적화** | `useMemo`, `useCallback`으로 칸반 드래그 중 불필요한 리렌더 방지, React Hook Form 비제어 컴포넌트로 타이핑 시 리렌더 최소화 |
| **FCP 개선** | Back-Forward Cache 활성화, Dynamic Import 활용 |
| **접근성** | `aria-label`, `sr-only`, Lighthouse 접근성 점수 개선 |


