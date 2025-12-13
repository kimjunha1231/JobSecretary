# 📑 Job Secretary: 취업의 모든 과정을 하나로, AI 취업 비서

> **"Notion, Figma, Word, PPT... 왜 취업 준비는 여러 도구를 왔다 갔다 해야 할까?"**
>
> 흩어진 채용 공고 관리부터 자소서 작성, 이력서/포트폴리오 제작까지.
> 취업의 **A to Z를 한곳에서 끝낼 수 있는 올인원 플랫폼**입니다.

<br/>

## 1. 기획 배경: "내가 불편해서 만든 서비스"
취업 준비를 하면서 가장 힘들었던 점은, 하나의 지원서를 완성하기 위해 너무 많은 도구를 켜놔야 한다는 점, 그리고 **쌓여가는 자료를 효율적으로 관리하기 어렵다**는 점이었습니다.

* **도구의 파편화**: 채용 현황(Notion), 이력서(Figma), 자소서(Word) 등 도구가 분산되어 컨텍스트 스위칭 비용이 컸습니다.
* **자료 관리의 비효율**: 자소서를 파일(PDF/Docs)로만 저장하다 보니, 정작 지원할 때 **"예전에 썼던 '성장 과정'이나 '도전 경험' 항목이 어느 파일에 있었지?"** 하고 찾는 데 많은 시간을 허비했습니다.

저는 이 불편함을 해결하기 위해 **"플랫폼 이동 없이 모든 준비 과정을 물 흐르듯 연결하고, 과거의 기록을 태그로 쉽게 찾아 쓸 수 있는 서비스"**를 기획하게 되었습니다.

<br/>

## 2. 프로젝트 현황 및 목표
* **✅ 현재 구현 기능 (Phase 1)**
    * **Dashboard**: 칸반 보드 형태의 직관적인 **지원 현황 관리**
    * **AI Smart Editor**: AI 초안 생성, 맞춤법 교정, **자동 저장(Debounce)** 기능
    * **Smart Archive**: **태그 기반 검색**으로 과거 자소서 검색 및 참조 (Ctrl+F의 한계 극복)
    * **PDF Generator**: 작성된 자소서 깔끔한 디자인의 제출용 PDF로 즉시 변환
* **🚀 확장 예정 기능 (Phase 2)**
    * **Resume/Portfolio Builder**: 웹에서 직접 꾸미는 드래그 앤 드롭 빌더
    * **Mock Interview**: 자소서 기반 AI 면접 질문 생성 및 시뮬레이션

<br/>

## 3. Technology Strategy: 이유 있는 기술 선정

단순히 트렌디한 기술을 쫓기보다, **1인 개발의 효율성**과 **사용자 경험(UX)**을 최우선으로 고려하여 기술 스택을 선정했습니다.

### 3.1. Core: Next.js (App Router)
* **선정 이유**: **"1인 개발의 생산성 극대화"**
    * 프론트엔드와 백엔드를 별도로 구축할 경우 발생하는 통신 비용과 관리 포인트를 줄이고자 했습니다.
    * Next.js의 **API Routes**를 활용해 별도의 백엔드 서버 없이도 DB 연결 및 AI API 연동을 하나의 프레임워크 안에서 처리하여, MVP 개발 속도를 비약적으로 높였습니다.

### 3.2. Styling: Tailwind CSS + Shadcn UI
* **선정 이유**: **"일관된 디자인 시스템과 커스터마이징의 유연함"**
    * **Shadcn UI (Radix UI 기반)**: 일반적인 UI 라이브러리와 달리 소스 코드를 직접 가져와(Copy-paste) 사용하는 방식이므로, 디자인 수정이 자유롭고 **Radix UI**가 제공하는 웹 접근성(Accessibility)을 기본으로 확보할 수 있었습니다.
    * **Tailwind CSS**: Shadcn UI와의 호환성이 뛰어나고, 클래스명 고민 없이 빠르게 스타일을 입힐 수 있어 디자인 작업 시간을 단축했습니다.

### 3.3. Quality & Stability
* **Type Safety**: **TypeScript**를 엄격하게 적용하여 런타임 에러를 사전에 방지했습니다.
* **Testing**: **Jest**와 **Playwright**를 도입하여 핵심 기능(에디터, 로그인)의 안정성을 확보했습니다.

### 3.4. Tech Stack Overview
프로젝트에 사용된 핵심 기술 스택 요약입니다.

| Category | Technologies |
| :--- | :--- |
| **Core** | **Next.js 15 (App Router)**, **React 19**, TypeScript, Node.js |
| **State Management** | **TanStack Query (React Query)**, **Zustand** |
| **Database & Auth** | **Supabase** (PostgreSQL, Auth) |
| **Styling** | **Tailwind CSS**, **Shadcn UI (Radix UI)**, Lucide React, Framer Motion |
| **Testing** | Jest, React Testing Library, Playwright |
| **Deployment** | Vercel, Vercel Analytics |

<br/>

## 4. Architecture: FSD (Feature-Sliced Design)

### 4.1. 왜 FSD를 선택했나?
이 프로젝트는 앞으로 **'문서 에디터', '디자인 툴', '채용 대시보드'** 등 서로 성격이 완전히 다른 기능들이 계속 추가될 예정입니다.

만약 일반적인 계층형 구조(Layered Architecture)를 쓴다면, 나중에 '포트폴리오' 기능을 만들다가 실수로 '자소서' 코드를 건드리거나, 공통 폴더가 비대해져 유지보수가 힘든 **'거대한 진흙 덩어리(Big Ball of Mud)'**가 될 위험이 컸습니다.

그래서 기능별로 코드를 명확히 격리할 수 있는 **FSD**를 도입했습니다.
* **확장성**: `features/document-archive`와 `features/document-editor`가 독립적인 것처럼, 앞으로 추가될 `resume` 기능도 기존 코드 영향 없이 안전하게 확장할 수 있습니다.
* **유지보수**: 관련된 코드(UI, 로직)가 한곳에 모여 있어, 수정할 때 여기저기 찾아다니지 않아도 됩니다.

> **💡 Monorepo를 쓰지 않은 이유**
> 자소서 데이터가 면접 질문 생성에 쓰이는 등 **기능 간 데이터 의존성이 매우 높습니다.** 물리적 분리(Monorepo)는 오히려 상태 관리를 복잡하게 만드는 오버엔지니어링이라 판단하여, **단일 레포지토리 내에서 모듈성을 극대화하는 FSD**를 선택했습니다.

<br/>

### 4.2. 시행착오와 구조 개선 (Refactoring)
아키텍처를 적용하는 과정에서 겪은 문제들을 해결하며 구조를 단단하게 다졌습니다.

**1) Widgets 레이어 도입 (의존성 문제 해결)**
* **문제**: 초기엔 `features/archive` 페이지에서 `features/write`의 버튼을 가져다 쓰려다 보니, FSD의 핵심인 **'Slice 간 참조 금지' 원칙**에 부딪혔습니다.
* **해결**: 조립 전용 레이어인 **`Widgets`**를 도입했습니다. `widgets/ArchiveBoard`를 만들어 이곳에서 서로 다른 Feature들을 레고처럼 조립함으로써 의존성 규칙을 준수했습니다.

```tsx
// widgets/ArchiveBoard/ui/ArchiveBoard.tsx
// Widget 레이어는 서로 다른 Feature들을 자유롭게 조립할 수 있는 '허브'입니다.

import { ArchiveList } from '@/features/document-archive'; // Feature A
import { WriteButton } from '@/features/document-write';   // Feature B
import { TagSearch } from '@/features/reference-search';   // Feature C

export function ArchiveBoard() {
    return (
        <div className="board-layout">
            <TagSearch />   {/* 검색 기능 */}
            <WriteButton /> {/* 작성 기능 */}
            <ArchiveList /> {/* 목록 기능 */}
        </div>
    );
}
```

**2) Shared 레이어 역할 재정립 (Audit)**
* **문제**: "재사용되면 무조건 Shared"라는 생각에, 비즈니스 로직이 포함된 컴포넌트까지 `shared` 폴더에 방치되어 있었습니다.
* **해결**:
    * 로직이 포함된 사이드바 → **`widgets/GlobalSidebar`**로 승격
    * 전역 상태(Store) → **`entities/draft`** 등 도메인 모델로 이동

**3) 코드 품질 개선 (Type & Logic 분리)**
* **타입 중앙화**: 여러 파일에 흩어져 있던 타입을 `features/document-editor/types.ts`로 통합 관리했습니다.
* **UI/Model 분리**: 컴포넌트가 비대해지는 것을 막기 위해 `ui`(Pure View)와 `model`(Custom Hooks)로 역할을 철저히 분리했습니다.

<br/>

## 5. Problem Solving: 주도적인 기술적 의사결정

AI 도구를 활용하되, 기술적 판단의 최종 책임자는 저 자신임을 잊지 않고 개발했습니다.

### 5.1. AI와의 아키텍처 논쟁: "UX를 위해 구조를 바꾸다"
자소서 에디터 기능을 개발할 때, AI 코파일럿과 설계 방향이 충돌했던 경험입니다.

**1) 상황 (Conflict): 효율성 vs 확장성**
* **AI의 제안**: "1인 개발이고 규모가 작으니, 하나의 페이지(`page.tsx`) 안에서 `isEditMode` 상태값 하나로 '뷰어'와 '에디터'를 조건부 렌더링합시다. (데이터 재호출 비용 절감)"
* **나의 판단**: 이 방식은 구현은 빠를지 몰라도, **UX와 아키텍처 원칙(SRP)** 측면에서 문제가 있다고 판단했습니다.

**2) 문제 정의 (Analysis)**
제가 직접 테스트해보니 두 가지 치명적인 문제가 있었습니다.
* **UX 결함**: 수정 모드에서 실수로 '뒤로가기'를 누르면, 뷰어가 아닌 아예 목록으로 튕겨 나가는 현상 발생.
* **구조적 결함**: 하나의 파일에 '읽기 로직'과 '수정 로직(Form)'이 뒤엉켜 가독성이 떨어짐.

**3) 해결 및 설득 (Solution)**
저는 AI의 제안을 수용하지 않고 다음과 같이 구조 변경을 지시했습니다.
> *"데이터 재호출 문제는 **Zustand(Client State)**를 통해 데이터를 유지하면 해결된다. 당장의 편의성보다 **라우트를 `/view`와 `/edit`으로 물리적으로 분리**하여 코드의 책임을 나누는 것이 장기적인 유지보수와 UX에 맞다."*

**4) 결과 (Result)**
결국 라우트를 분리하고 폴더 구조를 `detail-components`와 `edit-components`로 쪼갰습니다. 덕분에 **'뒤로가기' UX도 정상화**되었고, 이후 유지보수 작업 시 **코드 파악 속도도 훨씬 빨라졌습니다.**

<br/>

### 5.2. 상태 관리의 명확한 기준 (Server vs Client)
복잡도를 낮추기 위해 데이터의 성격에 따라 관리 도구를 이원화했습니다.

| 종류 | 도구 | 역할 |
| :--- | :--- | :--- |
| **Server State** | **TanStack Query** | DB 데이터(자소서 목록 등)의 캐싱, 동기화, 로딩 상태 관리 |
| **Client State** | **Zustand** | 복잡한 에디터 Form 데이터 및 다크 모드 등 전역 UI 상태 관리 |

<br/>

## 6. 마치며
이 프로젝트를 통해 **"사용자의 불편함을 기술로 해결하는 기획력"**뿐만 아니라, **"이유 있는 기술 선정을 통한 생산성 확보"**, 그리고 **"지속 가능한 코드를 위한 아키텍처 설계 능력"**을 길렀습니다. 앞으로도 '왜?'라는 질문을 던지며 더 나은 사용자 경험과 코드 품질을 고민하는 개발자가 되겠습니다.