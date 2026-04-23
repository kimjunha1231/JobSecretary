# AI Agent Rules (Harness Master - AGENTS.md)

Welcome to the JobSecretary project. 본 문서는 프로젝트에 접근하는 모든 AI 에이전트의 진입점(Entry Point)이자 핵심 철학을 담은 지도입니다.

## Core Beliefs (에이전트 우선 철학)
1. **사람은 코드를 직접 수정하지 않고 의도만 명시한다.**
2. **에이전트가 볼 수 없는 지식은 존재하지 않는 것과 같다.** (모든 룰과 컨텍스트는 문서화되어야 함)
3. **모든 변경 사항은 단 한 번의 지시로 설계, 가상 환경 개발, 자체 리뷰까지 자동화하되, 최종 병합은 사용자가 PR을 통해 직접 수행한다.** (Human-in-the-loop)
4. **하네스 시스템은 자가 진화한다.** (에이전트는 새로운 교훈을 얻으면 하네스 문서를 직접 업데이트하여 시스템을 개선한다.)

---

## Harness Engineering 문서 지도 (Document Map)
에이전트는 작업 성격에 맞춰 필요한 문서만 선별적으로 참조하여 토큰 효율을 극대화합니다.

| 문서명 | 주요 내용 | 참조 조건 (Trigger) |
| :--- | :--- | :--- |
| **[01_constraints.md](./docs/harness/01_constraints.md)** | 아키텍처 제약, 기술 스택, FSD 계층 | **모든 설계 및 구현 시작 전 필수** |
| **[02_orchestration.md](./docs/harness/02_orchestration.md)** | 원샷 파이프라인, Git 워크플로우, 자가 진화 | **작업 흐름 제어 및 병합 시 필수** |
| **[03_implementation.md](./docs/harness/03_implementation.md)** | 클린 코드, 함수형 원칙, 에이전트 가독성 | **실제 코드 작성 단계에서 필수** |
| **[04_feedback_loops.md](./docs/harness/04_feedback_loops.md)** | 시니어 리뷰(6대 잣대), 테스트, 검증 | **검증 및 PR(Merge) 전 단계에서 필수** |
| **[05_v8_optimization.md](./docs/harness/05_v8_memory_optimization.md)** | V8 히든 클래스, GC 관리, AbortController | **대량 데이터, 애니메이션, 성능 이슈 작업 시** |

---

## Agent 시작 가이드 (Master Prompt Flow)
에이전트는 새로운 태스크를 받으면 어떠한 대기나 지연 없이 즉각 다음의 "전 자동화" 룰을 따릅니다.
1. 이 문서를 읽고, 필요한 경우 위 `docs/harness/` 내부의 문서들을 추가 조회하여 컨텍스트를 확보하세요.
2. 유저의 추가 승인 대기 없이, 즉시 `git checkout -b`로 가상 환경을 만들고 코드를 설계/개발하세요.
3. 작업 완료 후 `npm run harness:verify` 기계적 검증과 `04_feedback_loops.md`의 시니어 리뷰를 스스로 통과하면, 작업 내용을 커밋하고 PR(Pull Request) 형태로 보고한 뒤 사용자의 병합 승인을 대기하세요.
4. **작업 중 발견된 새로운 규칙이나 예외 상황은 반드시 관련 하네스 문서에 업데이트하여 시스템을 진화시키세요.**
