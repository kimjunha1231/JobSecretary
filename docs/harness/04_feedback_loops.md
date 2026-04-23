# Feedback Loops (검증 및 시니어 리뷰)

본 문서는 에이전트가 병합 전 스스로를 검열하는 시니어 레벨 잣대를 정의합니다.

## 1. [Skill] Senior Code Review Checklist (Updated)
에이전트는 다음 질문에 "예"라고 답할 수 있어야 합니다.

1. **URL State:** 검색 필터나 페이지네이션 상태가 URL 파라미터와 동기화되었는가? (공유 가능한가?)
2. **Query Factory:** 쿼리 키를 하드코딩하지 않고 중앙 Key Factory를 사용했는가?
3. **Supabase Client:** 환경(Server/Client)에 맞는 클라이언트를 정확히 사용했는가?
4. **shadcn/ui:** 원본 컴포넌트를 파괴하지 않고 합성(Composition) 방식으로 확장했는가?
5. **FSD Naming:** 모든 슬라이스 및 폴더명이 `kebab-case`로 명명되었는가?
6. **Devil's Advocate:** (필수) 이 코드가 실패할 수 있는 시나리오를 하나 이상 찾고 대응했는가?

## 2. 기계적 검증 (harness:verify)
- 전체/부분 검증을 선택적으로 수행하되, 결과 로그를 아티팩트화하여 보관합니다.

## 3. 관측 가능성 (Sentry)
- 에러를 삼키지 말고 Sentry로 정확히 Throw 하였는지 확인합니다. Next.js 15의 `error.tsx` 패턴을 준수했는지 체크합니다.
