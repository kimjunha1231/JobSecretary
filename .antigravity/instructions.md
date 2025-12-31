# JobSecretary 프로젝트 개발 지침 (Antigravity Instructions)

이 문서는 Antigravity AI 어시스턴트가 **JobSecretary** 프로젝트를 개발할 때 반드시 준수해야 하는 핵심 지침을 담고 있습니다.

## 1. 언어 및 소통 규칙 (Korean Priority)
- **사고 과정(Sequential Thinking MCP)**: 복잡한 로직 분석, 아키텍처 설계, 디버깅 등 심층적인 사고가 필요한 경우 **MCP Sequential Thinking 도구**를 적극적으로 활용하며, 모든 사고 과정은 **한글**로 작성합니다.
- **토큰 효율성 (Codebase Summary)**: 프로젝트의 큰 흐름이나 구조를 파악할 때는 `.antigravity/codebase-summary.md`를 우선적으로 참조하여 불필요한 파일 조회를 최소화하고 토큰을 절약합니다. 대규모 변경 시 해당 요약 파일도 함께 업데이트합니다.
- **사용자 소통**: 사용자에게 보고하거나 질문할 때도 **한글**을 사용하며, 정중하고 협력적인 태도를 유지합니다.

## 2. 아키텍처 및 코드 스타일 (Maintainability & Style)
- **FSD (Feature-Sliced Design) 심화**:
    - **Layered Structure**: `app > widgets > features > entities > shared` 순의 의존성 흐름을 엄격히 준수합니다.
    - **Slices Internals**: 각 Slice 내부는 `ui`, `model`(state/hooks/types), `api`, `lib`(utils) 폴더로 구조를 통일합니다.
    - **Public API**: 모든 외부 접근은 각 Slice의 `index.ts`를 통해서만 이루어져야 합니다.
- **Naming Convention**:
    - **Components**: PascalCase (예: `ResumeCard.tsx`)
    - **Hooks/Functions/Variables**: camelCase (예: `useResumeStore`, `handleDownload`)
    - **Types/Interfaces**: PascalCase, 인터페이스는 명사형으로 작성 (예: `ResumeContent`, `ResumeEditProps`)
- **Clean Code**:
    - **Thick Hooks, Thin Components**: UI는 데이터 전달과 렌더링에만 집중하고, 모든 비즈니스 로직은 커스텀 훅으로 추상화합니다.
    - **Early Return**: 조건부 렌더링이나 로직 처리에 Early Return 패턴을 사용하여 가독성을 확보합니다.

## 3. 일관적인 UI/UX (UI/UX Consistency)
- **Design System**: 
    - **Spacing**: 모든 여백은 4px 또는 8px의 배수를 사용합니다 (Tailwind의 `p-2`, `m-4` 등).
    - **Typography**: `globals.css`의 유틸리티 클래스를 사용하며, 가독성을 위해 한글 폰트(`Pretendard`)의 `letter-spacing: -0.02em`과 `line-height`를 최적화하여 적용합니다.
    - **Semantic Colors**: 브랜드 컬러 외에도 상태를 나타내는 색상(Error: Red-500, Success: Green-500, Warning: Amber-500)을 일관되게 사용합니다.
- **Micro-interactions**: 
    - **Animations**: `framer-motion` 사용 시 `type: "spring"`, `stiffness: 260`, `damping: 20` 정도의 탄성 있는 효과를 기본으로 사용하여 '살아있는' 느낌을 줍니다.
    - **States**: 모든 인터랙티브 요소는 Hover, Active, Disabled, Loading 상태를 시각적으로 명확히 구분합니다.

## 4. 성능 최적화 (Performance Optimization)
- **Next.js Optimization**:
    - **RSC vs RCC**: 정적 데이터 표현은 **Server Components(RSC)**를 기본으로 하고, 사용자 상호작용이 필요한 폼이나 모달만 **Client Components(RCC)**로 최소화하여 작성합니다.
    - **next/image & next/font**: 이미지와 폰트 최적화 도구를 강제 사용하여 LCP를 관리합니다.
- **Data Handling**:
    - **Dynamic Imports**: 에디터나 차트 등 무거운 컴포넌트는 SSR 단계에서 제외하고 필요 시 로드되도록 `dynamic()` 임포트를 사용합니다.
    - **Optimistic Updates**: 데이터 변경 시 TanStack Query의 `onMutate`를 사용하여 지연 없는 반응성을 제공합니다.
- **Form Performance**: React Hook Form의 `uncontrolled mode`를 활용하여 타이핑 시 전체 컴포넌트 리렌더링을 방지합니다.

## 5. 데이터 관리 및 보안 (Reliability & Security)
- **State Role**: `TanStack Query`는 서버 데이터(캐싱, 동기화)를, `Zustand`는 클라이언트 로컬 상태를 전담합니다.
- **Security**: 모든 데이터 쟁취는 Supabase RLS 규칙에 의존하며, 클라이언트 사이드에서 불필요한 민감 정보 처리를 지양합니다.
- **Error Boundaries**: 페이지 및 위젯 단위로 Error Boundary를 설정하여 부분적인 장애가 전체 서비스 중단으로 이어지지 않도록 합니다.

## 6. 품질 보증 및 테스트 (Simultaneous Testing)
- **Test-Driven Culture**: 새로운 기능 개발이나 리팩토링 시, **테스트 코드를 동시에 작성**하는 것을 원칙으로 합니다.
- **Unit Tests (Jest)**: 복잡한 비즈니스 로직을 담은 커스텀 훅, 유틸리티 함수, 엔티티 모델에 대해 유닛 테스트를 작성하여 로직의 정합성을 검증합니다.
- **E2E Tests (Playwright)**: 사용자의 핵심 저니(로그인, 이력서 생성/저장, PDF 다운로드 등)에 대해 시나리오 기반의 E2E 테스트를 작성하여 전체 프로세스의 안정성을 보장합니다.

## 7. 접근성 및 SEO (Accessibility & SEO)
- **Accessibility (a11y)**:
    - **Semantic HTML**: 레이아웃 구성 시 의미에 맞는 HTML 태그(`main`, `section`, `article`, `aside` 등)를 기본적으로 사용합니다.
    - **Labeling & Alt Text**: 모든 폼 요소에 `label`을 부여하고, 모든 이미지 요소에는 의미 있는 `alt` 속성을 추가합니다. 아이콘 버튼에는 `aria-label`을 필수 적용합니다.
    - **Color Contrast**: 텍스트와 배경 간의 명도 대비를 WCAG AA 표준(4.5:1) 이상으로 유지하여 저시력 사용자의 가독성을 보장합니다.
    - **Focus & Keyboard**: 
        - 포커스 링(Focus ring)을 제거하지 않고 시각적으로 명확히 표시합니다.
        - 모달, 네비게이션, 에디터 등 모든 기능이 키보드(Tab, Enter, Space, Arrow keys)만으로 조작 가능해야 합니다.
    - **Motion Reduction**: `framer-motion` 등을 통한 애니메이션 구현 시 `prefers-reduced-motion` 미디어 쿼리를 존중하여, 모션 감소 설정 사용 시 부드러운 페이드 효과로 대체합니다.
    - **Live Regions**: 로딩 상태나 실시간 피드백이 발생할 때 `aria-live` 속성을 사용하여 스크린 리더 사용자에게 정보를 즉각 전달합니다.
    - **Touch Targets**: 모바일 환경을 고려하여 모든 클릭 가능한 요소의 최소 터치 영역을 44x44px 이상으로 확보합니다.
- **SEO Optimization**:
    - **Metadata API**: 페이지별로 고유하고 설명적인 `title`과 `description`을 설정하며, Open Graph 태그를 통해 공유 시 가독성을 높입니다.
    - **Semantic Data (JSON-LD)**: 서비스의 주요 정보(이력서 가이드, FAQ 등)에 대해 구조화된 데이터(JSON-LD)를 적용하여 검색 결과 시인성을 개선합니다.
    - **Hierarchy**: 한 페이지에 하나의 `h1` 태그만 존재하도록 하며, 논리적인 헤딩 순서(h1 -> h2 -> h3)를 준수합니다.

---
Antigravity는 이 지침을 기반으로 단순한 코드 작성을 넘어, **JobSecretary** 프로젝트가 기술적 완성도, 미적 완성도, 그리고 사용자 포용성과 검색 발견 가능성까지 동시에 갖출 수 있도록 가이드합니다.
