# CareerVault: AI-Powered Career Asset Management System

> **"Scalable Architecture for Personalized Career Data"**

1인 개발의 효율성(Antigravity)을 넘어, **지속 가능한 확장성(Sustainability)**과 **유지보수성(Maintainability)**을 고려한 엔터프라이즈급 아키텍처로 재설계된 채용 관리 플랫폼입니다.

## 1. 프로젝트 개요 (Overview)

CareerVault는 파편화된 취업 준비 과정(자소서 작성, 공고 관리, 일정 추적)을 통합하고, AI 기술을 활용해 개인의 커리어 데이터를 자산화하는 솔루션입니다.

초기 MVP 단계에서는 빠른 개발 속도에 집중했으나, 기능이 고도화됨에 따라 복잡해지는 상태 관리와 대규모 데이터 처리, UI/로직의 결합도 증가 문제를 해결하기 위해 아키텍처를 전면 리팩토링했습니다.

- **Live Demo**: [https://coverlettervault.vercel.app](https://coverlettervault.vercel.app)
- **Tech Stack**: Next.js 14+, TypeScript, Supabase, TanStack Query, Tailwind CSS, Shadcn/UI

---

## 2. 아키텍처 설계 의도 (Architecture Decision Records)

단순한 기능 구현을 넘어, **"팀 규모가 커지고 기능이 10배 늘어나도 유지보수 가능한가?"**라는 질문에 답하기 위해 다음과 같은 아키텍처를 도입했습니다.

### 🏗 1) Feature-Sliced Structure (도메인 주도 설계)
거대한 모놀리식 구조의 한계를 극복하고, 향후 Micro-Frontend 전환까지 고려하여 코드를 기능(Feature/Domain) 단위로 격리했습니다.

*   **Problem**: 기존에는 `components`, `hooks` 등 기술적인 분류를 사용하여, 하나의 기능을 수정하려면 여러 폴더를 오가야 했고 도메인 간 경계가 모호했습니다.
*   **Solution**: **Co-location(관심사의 근접성)** 원칙에 따라 관련 코드를 한곳에 모으는 FSD(Feature-Sliced Design) 패턴을 적용했습니다.

### 🎨 2) Headless & Compound Component (디자인 시스템)
기획과 디자인의 변경에 유연하게 대처하고, 비즈니스 로직과 UI 표현을 철저히 분리하기 위해 디자인 시스템을 추상화했습니다.

*   **Problem**: 컴포넌트 내부에 드래그 로직과 스타일링이 강하게 결합되어 있어, 디자인 변경 시 로직까지 건드려야 하는 위험이 있었습니다.
*   **Solution**: **Shadcn/UI (Radix UI)** 기반의 Headless 패턴을 적극 도입하여, 접근성(A11y)과 기능은 보장하되 스타일링의 자유도를 확보했습니다. 로직과 뷰를 분리하여 재사용성을 극대화했습니다.

### ⚡️ 3) Server State Management (API 계층 분리)
단순한 Fetching을 넘어, **TanStack Query**를 도입하여 데이터 동기화 전략을 고도화했습니다.

*   **Problem**: 서버 상태와 클라이언트 상태의 동기화가 수동으로 이루어졌고, 캐싱 전략이 부재했습니다.
*   **Solution**: Server Actions를 API 계층으로 추상화하고, React Query로 감싸서 **캐싱, 중복 요청 방지, Optimistic Update(낙관적 업데이트)**를 체계적으로 관리했습니다. 이를 통해 칸반 보드 드래그 시 네이티브 앱 수준의 즉각적인 반응성을 확보했습니다.

---

## 3. 핵심 기술적 도전 (Technical Challenges)

### 🚀 대규모 데이터 렌더링 성능 최적화
수백 개의 지원 내역 카드가 있는 칸반 보드에서 드래그 앤 드롭 시 발생하는 리렌더링 비용을 최소화했습니다.

*   **Memoization**: `React.memo`와 `useCallback`을 활용해 드래그 중인 카드 외의 다른 컬럼/카드가 불필요하게 렌더링 되는 것을 방지했습니다.
*   **Optimistic UI**: 네트워크 요청이 완료되기 전에 UI를 먼저 업데이트하고, 실패 시 롤백(Rollback)하는 트랜잭션 처리를 구현했습니다.

### � Enterprise-Grade Security (RLS)
프론트엔드 로직에 의존하지 않는 견고한 보안을 구축했습니다.

*   **Row Level Security**: Supabase의 RLS 정책을 통해 DB 레벨에서 데이터 접근 권한을 제어합니다. 이는 API 엔드포인트가 노출되더라도 데이터 유출을 원천적으로 차단합니다.
*   **Double Validation**: 클라이언트 API 계층에서도 `user_id` 검증 로직을 추가하여 이중 보안 체계를 수립했습니다.

---

## 4. 디렉토리 구조 (Directory Structure)

```bash
.
├── app/                    # Next.js App Router (Composition Layer)
│   ├── api/                # Backend API Routes
│   └── (pages)/            # Page Components
├── features/               # Domain Logic (핵심 비즈니스 기능 단위)
│   ├── document-kanban/    # 지원 현황 관리 도메인
│   ├── document-editor/    # 에디터 도메인
│   └── ai-assistant/       # AI 기능 도메인
├── entities/               # Business Entities (데이터 모델 단위)
│   └── document/           # 문서 모델 (API, Actions, UI)
├── shared/                 # Shared Kernel (공용 모듈)
│   ├── ui/                 # Atomic Design Components
│   ├── store/              # Global State (Zustand)
│   ├── types/              # Global Types
│   └── lib/                # Utilities
└── middleware.ts           # Auth Protection
```

---

## 5. 시작하기 (Getting Started)

**Clone the repository**

```bash
git clone https://github.com/kimjunha1231/CareerSecretary.git
```

**Install dependencies**

```bash
npm install
```

**Set up environment variables**
Create a `.env.local` file and add your Supabase & Gemini API keys.

**Run the development server**

```bash
npm run dev
```
