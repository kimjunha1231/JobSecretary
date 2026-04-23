# V8 Engine & Memory Optimization (고급 메모리 최적화)

본 문서는 대규모 데이터 처리나 고성능 인터랙션 구현 시 AI 에이전트가 준수해야 하는 엔진 레벨의 최적화 규칙을 정의합니다.

## 1. GC와 STW (Stop-The-World) 제어
- **메모리 할당 최소화:** 렌더링 사이클 내 빈번한 객체/배열 생성을 피하여 Minor GC 빈도를 낮추고 UI 렌더링이 멈추는 STW 현상을 예방합니다.
- **객체 풀링 (Object Pooling):** 빈도가 극도로 높은 데이터(초당 수십 회)는 객체를 재사용하여 GC 부하를 줄입니다.

## 2. V8 최적화 심화 (Hidden Classes & Inline Caching)
- **히든 클래스 안정성:** 생성자(또는 객체 리터럴 초기화) 시점에 모든 프로퍼티를 정의하세요. 이후 프로퍼티를 추가/삭제하면 히든 클래스가 파편화되어 성능이 저하됩니다.
- **단형성(Monomorphic) 유지:** 배열 순회 시 객체의 형태(Shape)를 동일하게 유지하여 V8의 인라인 캐시 최적화가 유효하게 작동하도록 하세요.

## 3. 참조 및 누수 관리 (Retained Size 최소화)
- **Shallow vs Retained Size:** 객체가 삭제될 때 수거될 수 있는 총 메모리량(Retained Size)을 줄이기 위해 연관 참조를 명확히 끊으세요.
- **좀비 참조 차단:** 사용이 끝난 거대 데이터는 `null` 할당이나 `.clear()` 메서드 호출을 통해 가비지 컬렉팅을 돕습니다.

## 4. AbortController 기반 메모리 관리 (Awesome Skill)
- **이벤트 리스너 일괄 해제:** 모든 이벤트 리스너 등록 시 수동 `removeEventListener` 대신 **`AbortController`의 `signal`**을 사용하세요.
- **규칙:** 컴포넌트 언마운트 시 `controller.abort()`를 한 번 호출함으로써, 해당 사이클에서 등록된 모든 비동기 작업과 리스너를 한 번에 안전하게 해제하여 메모리 누수를 원천 차단합니다.

## 5. 약한 참조 (WeakMap / WeakSet)
- DOM 노드나 외부 인스턴스에 메타데이터를 매핑할 때는 무조건 `WeakMap`을 사용하여 GC의 수거를 방해하지 않도록 하세요.
