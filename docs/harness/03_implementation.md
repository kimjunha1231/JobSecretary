# Implementation & Coding Rules (구현 및 코드 품질)

본 문서는 실질적인 코딩 강령과 선별된 정예 스킬(Skill)의 구현 패턴을 정의합니다.

## 1. [Skill] Supabase Client Factory
환경에 따라 올바른 Supabase 클라이언트를 생성해야 합니다.
- **Server Component (RSC/Actions):** `createClient()` (서버용 쿠키 핸들러 포함) 사용.
- **Client Component (RCC):** `createBrowserClient()` 사용.
- **주의:** 절대 클라이언트에서 서버용 클라이언트를 호출하거나 그 반대의 경우를 만들지 마세요.

## 2. [Skill] TanStack Query Key Factory
쿼리 키의 파편화를 막기 위해 중앙 집중식 팩토리를 사용합니다.
- **패턴:** `const queryKeys = { jobs: { all: ['jobs'], detail: (id: string) => ['jobs', id] } }`
- **활용:** `useQuery({ queryKey: queryKeys.jobs.detail(id), ... })`

## 3. [Skill] Next.js URL State Sync (Search Params)
검색 필터, 페이지네이션 등 공유가 필요한 상태는 Zustand 대신 URL을 사용합니다.
- **원칙:** 사용자가 페이지를 새로고침하거나 링크를 공유했을 때 동일한 결과가 보여야 합니다.
- **방법:** `useSearchParams` 또는 `nuqs` 같은 라이브러리를 사용하여 상태와 URL 파라미터를 동기화합니다.

## 4. Naming & Complexity Threshold
- **Boring Code:** 직관적인 코드 우선.
- **Complexity:** 상태 2개/로직 10줄 미만은 컴포넌트 내부 유지, 그 이상은 **Thick Hooks**로 분리.

## 5. V8 최적화 (Hidden Class)
- 객체 프로퍼티 할당 순서 고정 및 `delete` 연산자 사용 금지.

## 6. 에이전트 가독성
- 복잡한 최적화 구간에는 `// @agent-info:` 주석 필수.
