# 🦅 JobSecretary - 면접 완벽 대비 가이드 (Master Edition)

> [!TIP]
> **면접 전략의 핵심: "성장 스토리텔링"**
> 단순히 "이 기능을 짰습니다"가 아니라, **"엉망인 코드에서 시작해, AI를 도구 삼아 아키텍처/성능/테스트까지 깊이 파고든 리팩토링 여정"**을 보여주는 것이 이번 면접의 승부처입니다.

---

## 1. 🎤 도입부: 프로젝트 선정 배경 & 전략 (2개월 체험 + 4개월 전환형 맞춤)

> [!IMPORTANT]
> **"채용 연계형" 인터뷰 필승 전략**
> 면접관은 당신을 **"2개월 동안 퍼포먼스를 낼 수 있는가?"(속도)**와 **"4개월 뒤 우리 팀 정규직으로 맞을 그릇인가?"(성장 가능성/품질)** 두 가지 관점으로 봅니다.
> 이 프로젝트는 두 마리 토끼를 다 잡았다는 증거입니다.

**Q. 왜 이 프로젝트를 선택했나요?**
"솔직히 말씀드리면, **가장 엉망이었던 코드를 선택해 제 성장 가능성(Potential)을 증명하고 싶었기 때문입니다.**"

1.  **속도와 적응력 (2개월 검증용)**:
    *   Flex 지원 **단 5일 전**에 기능 구현을 완료했습니다.
    *   초기에는 오직 '빠른 실행'을 위해 하나의 파일로 짰습니다. -> *"입사 초기 2개월, 어떤 업무가 주어져도 마감이 있다면 어떻게든 해낼 수 있는 실행력(Grit)이 있습니다."*
2.  **품질과 장기적 관점 (4개월 전환 검증용)**:
    *   기능이 돌아간 뒤에 멈추지 않고, **AI를 활용해 FSD 아키텍처, 테스트, 성능 최적화**까지 리팩토링했습니다.
    *   *"단순히 기능만 찍어내는 코더가 아니라, 유지보수와 팀의 자산을 생각하는 엔지니어입니다."*

---

## 2. 🏗 아키텍처 & 폴더 구조 (Technical Deep Dive)

### 주제 1: FSD (Feature-Sliced Design) 도입과 시행착오
*"처음엔 Widgets 레이어가 오버엔지니어링이라고 생각했습니다."*

*   **문제 상황**: `Widgets` 없이 `Features`에서 바로 페이지(`App`)로 조립하려니, 서로 다른 Feature끼리 참조하는 **Circular Dependency(순환 참조)**가 발생했습니다. (FSD 원칙 위반: 상위 레이어만 하위 레이어 의존 가능)
*   **해결**: `Widgets` 레이어를 도입하여 Feature들을 조립(Composition)하는 역할을 부여했습니다.
*   **증거 코드**:
    *   `widgets/global-sidebar/ui/GlobalSidebar.tsx`: 여러 페이지에서 쓰이는 거대한 기능 덩어리. `features/auth`의 모달 등을 여기서 import하여 조립.
    *   `features/document-editor`: 순수 비즈니스 로직과 UI 컴포넌트 포함.

### 주제 2: Hooks와 UI의 분리 (Separation of Concerns)
*   **설명**: "컴포넌트는 렌더링만, 로직은 훅이 담당합니다."
*   **증거 코드**:
    *   `GlobalSidebar.tsx`는 UI만 그림.
    *   `useGlobalSidebarLogic.ts`(추정)에서 인증 상태, 모달 상태 등 모든 로직 처리.

### 주제 3: 폴더 구조 상세 설명 가이드 (면접관 질문 대비)

**Q. "폴더 구조가 꽤 복잡한데, 각 폴더의 역할에 대해 설명해주실 수 있나요?"**

> **💡 답변 전략**:
> "Feature-Sliced Design(FSD) 원칙을 도입하여, **변경의 빈도**와 **책임의 범위**에 따라 계층을 나누었습니다. 상위 계층은 하위 계층을 사용할 수 있지만, 역은 불가능하게 하여 **의존성을 단방향으로 관리**했습니다."

1.  **`app/` (App Layer)**:
    *   "Next.js의 App Router 라우팅을 담당하는 **진입점**입니다."
    *   "여기서는 비즈니스 로직을 전혀 작성하지 않고, `Widgets`나 `Features`에서 가져온 컴포넌트를 단순히 **배치**만 합니다. 덕분에 라우팅 로직과 비즈니스 로직이 섞이지 않습니다."

2.  **`widgets/` (Composition Layer)**:
    *   "여러 `Feature`와 `Entity`를 조합해서 만드는 **독립적인 UI 블록**입니다."
    *   "예를 들어 `GlobalSidebar`는 '회원 정보(Entity)', '로그아웃 기능(Feature)', '네비게이션(Shared)'가 모두 섞여있는 복합체인데, 이를 `Widgets`에서 조립하여 페이지에선 깔끔하게 `<GlobalSidebar />` 하나만 쓰면 되게 했습니다."

3.  **`features/` (Business Scenario Layer)**:
    *   "사용자에게 가치를 제공하는 **핵심 기능 단위**입니다."
    *   "예: `auth`(로그인), `document-editor`(문서 편집), `document-kanban`(칸반 보드)."
    *   "이 안에는 UI 뿐만 아니라 해당 기능을 위한 API 호출(`api/`), 상태 관리(`model/`), 훅(`hooks/`)이 **응집도(Cohesion)** 높게 모여 있습니다."

4.  **`entities/` (Domain Model Layer)**:
    *   "비즈니스 데이터의 **형태(Model)와 기본적인 조작**을 정의합니다."
    *   "예: `User`, `Document`. 여기서는 '로그인 버튼을 누른다' 같은 행위는 모르고, 오직 '유저 데이터는 이름과 이메일을 가진다' 같은 **순수한 도메인 지식**만 관리합니다."

5.  **`shared/` (Infrastructure Layer)**:
    *   "프로젝트 전반에서 쓰이는 **재사용 가능한 부품**들입니다."
    *   "비즈니스 로직이 전혀 없는 UI 라이브러리(Button, Input), 유틸리티 함수(Date Formatter), 공통 훅 등이 위치합니다."

---

## 3. ⚡️ 성능 최적화 (Critical Performance Wins)

이 부분이 면접관들이 가장 좋아할 기술적인 디테일입니다.

### ① Dynamic Import (번들 사이즈 최적화)
*"불필요한 리소스 로딩을 제로로 만들었습니다."*

*   **PDF 생성**: `@react-pdf/renderer`는 매우 무거운 라이브러리입니다.
    *   **코드**: `features/document-editor/hooks/usePdfDownload.tsx`
    ```typescript
    // 사용자가 '다운로드' 버튼을 누를 때만 네트워크 요청 발생
    const { pdf } = await import('@react-pdf/renderer');
    ```
*   **마크다운 뷰어**:
    *   **코드**: `features/document-editor/ui/.../DocumentViewer.tsx`
    ```typescript
    const ReactMarkdown = dynamic(() => import('react-markdown'), {
      ssr: false,
      loading: () => <Skeleton /> // 스켈레톤 UI로 UX 유지
    });
    ```
    *   **이유**: 에디터에서는 필요하지만, 목록 페이지에서는 필요 없으므로 초기 번들에서 제외.

### ② 렌더링 최적화: React Hook Form vs Zustand
*"기술적 의사결정의 꽃입니다."*

*   **고민**: 자소서 데이터 유실 방지가 중요 -> Zustand Persist는 타이핑마다 저장(Storage I/O) -> **렉 발생**.
*   **해결**: **React Hook Form (비제어 컴포넌트)** 도입.
    *   타이핑 중 리렌더링 최소화.
    *   데이터 유실(뒤로가기 등) 방지는 `isDirty` 상태를 감지해 **이탈 방지 모달**(`usePageLeaveWarning`)을 띄우는 UX적 해법으로 해결.
*   **증거 코드**: `features/document-write/ui/ResumeForm.tsx`
    *   `useForm({ mode: 'onChange' })` 사용.
    *   `usePageLeaveWarning(isDirty)`로 보호.

---

## 4. 🤖 AI 기능 & 핵심 로직 (The "Wow" Factor)

### ① AI 면접 질문 생성 (Prompt Engineering)
*   **문제**: AI가 줄글로 답하거나 포맷을 어기면 프론트엔드에서 깨짐.
*   **해결**: "20년차 인사담당자" 페르소나 부여 + **JSON Output 강제**.
*   **코드**: `features/document-editor/api/interview.ts`
    ```typescript
    // generationConfig에 responseMimeType: "application/json" 설정
    // 프롬프트에 "오직 JSON 문자열 배열로만 출력" 명시
    ```

### ② 칸반 보드 (Interaction)
*   **기술**: `@dnd-kit` 활용. 단순 드래그가 아니라 `sensors`를 설정하여 미세한 터치/클릭 오작동 방지.
*   **코드**: `features/document-kanban/ui/KanbanBoard.tsx`

---

## 5. 🛡 테스트 & 안정성 (Reliability)

"혼자 개발하더라도 안정성은 놓치고 싶지 않았습니다."

1.  **Unit/Integration Test**: **Jest** (`jest.config.ts` 확인됨, `tests/unit` 등).
2.  **E2E Test**: **Playwright** (`playwright.config.ts` 확인됨). 실제 사용자 시나리오 검증.
3.  **Error Monitoring**: **Sentry** (`sentry.edge.config.ts` 등 연결 확인됨). 배포 후 발생하는 런타임 에러 실시간 추적.

---

## 6. 🎓 전공 CS 및 인성 면접 대비 (One-Day Interview 필수)

**첫 면접이자 마지막 면접**이라면, 프로젝트 발표 후 남은 시간에 **"기본기 검증(CS)"**과 **"조직 적합성(인성)"** 질문이 반드시 들어옵니다.

### 💻 필수 CS 질문 (프론트엔드 Focus)

**Q. 브라우저 렌더링 과정 (Critical Rendering Path)을 설명해보세요.**
> *Dynamic Import 최적화와 연결해서 답변하세요!*
> A. "HTML을 파싱해 DOM을, CSS를 파싱해 CSSOM을 만듭니다. 이 둘을 합쳐 Render Tree를 만들고, 레이아웃(Reflow)과 페인팅(Repaint) 과정을 거쳐 화면에 그립니다.
> 저는 이번 프로젝트에서 초기 로딩 속도(FCP)를 줄이기 위해 `optimizePackageImports`와 `Dynamic Import`를 사용하여 초기 번들 사이즈를 줄임으로써, 파싱 및 실행 시간을 단축시켰습니다."

**Q. 자바스크립트는 싱글 스레드인데 비동기 처리를 어떻게 하나요? (Event Loop)**
> *Supabase, AI API 호출과 연결!*
> A. "JS 엔진은 Call Stack이 하나지만, 브라우저가 제공하는 Web API(fetch 등)와 Task Queue, Event Loop를 통해 비동기로 동작합니다.
> 예를 들어, AI 면접 질문 생성(`generateInterviewQuestions`) 시 `await`를 만나면 메인 스레드를 차단하지 않고 Web API에 위임한 뒤, 응답이 오면 마이크로태스크 큐를 통해 콜스택이 비었을 때 실행됩니다. 덕분에 AI 답변을 기다리는 동안에도 UI가 멈추지 않습니다."

**Q. REST API와 GraphQL의 차이? (Next.js Server Actions와 연결)**
> A. "REST는 URL 자원 기반으로 정해진 데이터를 받지만, GraphQL은 필요한 데이터만 쿼리합니다.
> 하지만 저는 이번에 **Next.js Server Actions**를 사용하여, 별도의 API 엔드포인트 관리 없이 함수 호출처럼 백엔드 로직을 수행했습니다. 이는 타입 안전성(Type Safety)을 유지하면서 네트워크 오버헤드를 줄이는 모던한 방식이라 선택했습니다."

---

### 😊 인성 및 컬쳐핏 (Behavioral)

"완벽한 사람보다 **'같이 일하고 싶은, 성장하는 사람'**임을 보여주세요."

**Q. 혼자 다 개발했는데, 협업 경험은 없나요? 갈등이 생기면 어떡할 건가요?**
> A. "학교 프로젝트에선 주로 리더를 맡아 의견을 조율해왔습니다. (Tito 토론 서비스 예시 활용)
> 이번 프로젝트는 혼자 했지만, **'미래의 동료가 읽을 코드'**라고 생각하고 짰습니다. FSD를 도입한 이유도, 테스트 코드를 짠 이유도 저보다 '남'이 제 코드를 봤을 때 쉽게 이해하고 수정하기 위함이었습니다. 갈등이 생기면 '내 코드'를 고집하기보다 '팀의 목표'에 부합하는지 데이터 기반으로 소통하겠습니다."

**Q. 가장 큰 실패 경험은?**
> A. "*Tito 서비스 때 웹소켓 채팅방 코드를 3번이나 갈아엎은 경험*이 있습니다. 당시엔 힘들었지만, 그때 '설계 없이 코딩하면 어떤 대가를 치르는지' 뼈저리게 배웠습니다. 그 실패 덕분에 이번 프로젝트에선 기획과 아키텍처 설계에 전체 시간의 40%를 쓸 만큼 성장했습니다."

**Q. 주말에 주로 뭐 하나요? (개발 열정 확인)**
> A. "부트캠프나 스터디를 하기도 하지만, 요즘은 제가 만든 이 서비스(JobSecretary)를 직접 써보며 친구들에게 피드백을 받아 개선하고 있습니다. (실제 사용자 피드백 반영 경험 어필)"

---

## 7. 🎯 발표/시연 체크리스트

발표 직전에 이 파일들을 탭에 열어두세요. (바로 보여줄 수 있게)

1.  [구조] `widgets/global-sidebar/ui/GlobalSidebar.tsx` (FSD의 위젯 계층 설명)
2.  [최적화] `features/document-editor/hooks/usePdfDownload.tsx` (Dynamic Import의 교과서)
3.  [최적화] `features/document-editor/ui/detail-components/DocumentViewer.tsx` (Lazy Loading)
4.  [최적화/UX] `features/document-write/ui/ResumeForm.tsx` (RHF & 이탈 방지)
5.  [AI] `features/document-editor/api/interview.ts` (JSON 프롬프트)
6.  [설정] `jest.config.ts`, `playwright.config.ts` (테스트 환경 자랑)
