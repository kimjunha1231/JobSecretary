# JobSecretary (CareerVault AI) - AI 기반 자기소개서 관리 및 채용 솔루션

이 프로젝트는 **Next.js 14+ (App Router)**와 **Supabase**를 기반으로 구축된 최신 웹 애플리케이션입니다.  
확장성과 유지보수성을 극대화하기 위해 **FSD (Feature-Sliced Design)** 아키텍처 패턴을 채택하였으며, 대규모 애플리케이션으로의 성장을 고려하여 설계되었습니다.

---

## 🏗️ 아키텍처 설계 및 폴더 구조 (Architecture & Design)

이 프로젝트는 **응집도(Cohesion)는 높이고 결합도(Coupling)는 낮추기 위해** FSD 아키텍처를 Next.js 환경에 맞게 변형하여 적용했습니다.

### 1. 폴더 구조의 의도와 철학

우리는 코드를 기능(Feature)과 도메인(Business Domain) 기준으로 수직 분할했습니다.

#### 📂 `app/` (Routing Layer)
*   **역할**: 오직 **라우팅(Routing)**과 **레이아웃(Layout)**만 담당합니다.
*   **설계 이유**: Next.js App Router의 파일 시스템 기반 라우팅 규칙을 따르면서, 비즈니스 로직이 라우팅 계층에 뒤섞이는 것을 방지합니다. 이곳의 파일들은 최대한 가볍게 유지하며, 실제 로직은 `features`나 `entities`에서 가져와 조립(Composition)만 수행합니다.
*   **주요 변경**:
    *   `app/api/`: 백엔드 API 라우트를 별도로 분리하여 관리 (예: `app/api/auth/callback`).

#### 📂 `features/` (Business Features)
*   **역할**: 사용자에게 가치를 제공하는 **기능 단위**의 묶음입니다. (예: `document-kanban`, `ai-assistant`)
*   **설계 이유**: 특정 기능을 수정해야 할 때, 여러 폴더를 오갈 필요 없이 해당 기능 폴더 안에서 UI, Hook, API 로직을 모두 찾을 수 있도록 **높은 응집도**를 구현했습니다.
*   **구조**:
    *   `features/이름/ui`: 해당 기능 전용 컴포넌트
    *   `features/이름/model` (또는 hooks): 상태 관리 및 로직
    *   `features/이름/api`: 서버 통신 로직

#### 📂 `entities/` (Business Entities)
*   **역할**: 프로젝트의 핵심 **비즈니스 데이터 모델**입니다. (예: `document`, `user`)
*   **설계 이유**: 기능(`features`)들 사이에서 공통으로 사용되는 핵심 데이터와 그에 따른 기본적인 CRUD 동작을 정의합니다. 기능 레벨보다 더 하위 개념으로, 비즈니스 로직의 근간이 됩니다.

#### 📂 `shared/` (Shared Kernel)
*   **역할**: 프로젝트 전반에서 재사용되는 **범용 코드**입니다. 비즈니스 로직과는 무관해야 합니다.
*   **설계 이유**: 특정 도메인에 종속되지 않는 UI 컴포넌트(Button, Input 등), 유틸리티 함수, 전역 설정 등을 모아두어 중복을 제거합니다.
*   **주요 구성**:
    *   `shared/ui`: Shadcn/UI 기반의 디자인 시스템 컴포넌트.
    *   `shared/store`: 전역 상태 관리 (Zustand). (최근 리팩토링으로 루트에서 이동됨)
    *   `shared/types`: 전역 타입 정의 (`types.ts`에서 이동됨).
    *   `shared/api`: Axios/Fetch 클라이언트 인스턴스 설정.

---

## 🛠️ 주요 기술적 의사결정 (Technical Decisions)

### 1. 상태 관리 (State Management)
*   **Server State: TanStack Query (React Query)**
    *   **선택 이유**: 서버 데이터와 클라이언트 데이터의 싱크를 맞추는 복잡함을 해결하기 위함입니다. 캐싱, 중복 요청 방지, Optimistic Update(낙관적 업데이트)를 통해 UX를 극대화했습니다.
*   **Client State: Zustand**
    *   **선택 이유**: Redux의 복잡한 보일러플레이트 없이 매우 직관적이고 가볍습니다. `shared/store`에 위치하여 인증 정보나 작성 중인 드래프트 데이터 같은 전역 클라이언트 상태를 관리합니다.

### 2. 보안 전략 (Security)
*   **Supabase Auth & RLS (Row Level Security)**
    *   **선택 이유**: DB 연결 정보를 숨기는 고전적인 방식 대신, 클라이언트에서 바로 DB에 접근하되 **"누가 어떤 행(Row)을 볼 수 있는가"**를 DB 엔진 수준에서 제어합니다.
    *   **보안 강화**: 클라이언트 사이드(`entities/document/api.ts`)에서도 `user_id`를 명시적으로 체크하는 이중 방어 로직을 추가하여, URL ID 추측 공격 등을 원천 차단했습니다.
    *   **암호화**: 데이터 자체 암호화(난독화)보다는 PostgreSQL의 TDE(투명 암호화)와 RLS를 신뢰하여, 검색(Searchability)과 AI 분석 같은 데이터 활용성을 해치지 않는 보안 방식을 택했습니다.

### 3. 스타일링 (Styling)
*   **Tailwind CSS + Shadcn/UI**
    *   **선택 이유**: 클래스명 고민 시간을 줄이고 배포 용량을 최적화합니다. Shadcn/UI를 통해 아름답고 접근성 높은 컴포넌트를 즉시 도입하여 개발 속도를 높였습니다. FSD 구조에 맞춰 `tailwind.config.ts`의 `content` 경로를 최적화했습니다.

---

## 🚀 최근 리팩토링 내역 (Recent Refactorings)

프로젝트의 구조적 완성도를 높이기 위해 다음과 같은 작업을 수행했습니다.

1.  **Project Restructuring (FSD Compliance)**
    *   `types.ts` ➡️ `shared/types/index.ts`: 전역 타입 정의를 공유 레이어로 이동.
    *   `store/` ➡️ `shared/store/`: 전역 상태 관리를 공유 레이어로 이동.
    *   이를 통해 루트 디렉토리를 정리하고 FSD 계층 구조를 명확히 했습니다.

2.  **Auth Route Optimization**
    *   `app/auth/callback` ➡️ `app/api/auth/callback`: 인증 콜백 처리는 화면이 없는 백엔드 로직이므로 `api` 네임스페이스로 이동하여 역할 명시.

3.  **Critical Bug Fixes**
    *   **Infinite Loop Fix**: `useKanban` 및 `archive` 페이지에서 의존성 배열 문제로 인한 무한 렌더링 수정 (Stable Reference 패턴 적용).
    *   **Navigation Guard**: 페이지 이탈 시 데이터 유실 방지 로직 강화.

---

## 📁 Directory Tree

```
.
├── app/                        # Next.js App Router (Pages & API)
│   ├── (pages)/                # Route Groups (URL path에 영향 없음)
│   ├── api/                    # Backend API Routes
│   └── layout.tsx              # Root Layout
├── features/                   # 기능 단위 (FSD Slice)
│   ├── document-kanban/        # 칸반 보드 기능
│   ├── document-editor/        # 자소서 에디터 기능
│   ├── ai-assistant/           # AI 첨삭/질문 기능
│   └── ...
├── entities/                   # 데이터 모델 단위 (FSD Entity)
│   └── document/               # 문서 도메인 로직 (Query, Mutation, UI)
├── shared/                     # 공용 모듈 (FSD Shared)
│   ├── ui/                     # 공용 UI 컴포넌트
│   ├── store/                  # 전역 상태 (Zustand)
│   ├── types/                  # 전역 타입
│   └── api/                    # API 클라이언트 설정
└── ...
```
