# Architectural Constraints (아키텍처 및 제약조건)

본 문서는 시스템의 물리적, 구조적 제약과 FSD 아키텍처의 엄격한 경계를 정의합니다.

## 1. 기술 스택 (Tech Stack)
- **프레임워크:** Next.js 15 (App Router)
- **UI:** `shadcn/ui` (@/shared/ui), `lucide-react` 우선 사용
- **상태/데이터:** Zustand, TanStack Query, `react-hook-form` + `zod`
- **백엔드:** Supabase (Auth, RLS 필수)

## 2. FSD & Next.js 계층 경계 (Strict Hierarchy)
의존성은 반드시 단방향(**app -> widgets -> features -> entities -> shared**)으로 흐릅니다.

- **Next.js `app/` 레이어:** 오직 라우팅, 레이아웃, 서버 사이드 페칭(RSC)만 담당.
- **Widget-only Composition:** 두 개 이상의 Feature 결합은 반드시 `widgets`에서 수행.
- **Public API (index.ts):** 모든 외부 접근은 반드시 슬라이스의 `index.ts`를 통해서만 수행.

## 3. [Skill] FSD Slice Naming Conventions
완벽한 FSD 구조를 위해 다음 명명 규칙을 엄격히 준수합니다.
- **Case:** 모든 폴더 및 파일 명칭은 **`kebab-case`**를 사용합니다. (예: `job-list`, `user-profile`)
- **Suffix/Structure:** 각 슬라이스 내부 폴더는 오직 `api`, `model`, `ui`, `lib`, `config`만 허용합니다.
- **컴포넌트 명칭:** UI 파일 내의 실제 React 컴포넌트 클래스/함수명은 **`PascalCase`**를 사용합니다.

## 4. [Skill] shadcn/ui Extension Standard
- **원칙:** `shared/ui`에 설치된 기본 컴포넌트 코드를 직접 수정하는 것을 지양합니다.
- **확장 방식:** 새로운 요구사항이 있을 경우, 기존 컴포넌트를 래핑(Wrapping)하거나 `cva` (Class Variance Authority)를 사용하여 스타일 변형을 추가하는 방식으로 확장합니다.

## 5. 성능 및 메모리 제약
- **React Compiler:** `useMemo`/`useCallback` 수동 사용 금지.
- **Next.js 15 Core:** 기본적으로 모든 컴포넌트는 Server Component(RSC)로 작성하며, 인터랙션이 필요한 부분만 최소한으로 Client Component(RCC)로 격리합니다.
