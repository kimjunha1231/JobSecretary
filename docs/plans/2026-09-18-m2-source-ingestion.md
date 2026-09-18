# M2 경력 자료 가져오기와 검수 대기 라이브러리

## 목표

이력서·포트폴리오·기존 자기소개서의 파일 또는 붙여넣은 텍스트를 하나의 source document로 등록하고, 추출된 본문과 구간(fragment)을 사용자별로 저장한다. 자동 추출 결과는 바로 AI 컨텍스트로 사용하지 않고 `needs_review` 상태로 보류하며, 사용자가 라이브러리에서 확인한 뒤 승인할 수 있게 한다.

## 현재 근거

- M1에서 `source_documents`와 `source_fragments` 테이블, 사용자 소유 RLS, `SourceDocument` 모델이 추가되어 있다.
- 기존 앱은 `documents`에 자기소개서 본문을 저장하지만 PDF·DOCX·텍스트 자료를 읽어 경력 단위로 보관하는 서버 경계가 없다.
- 운영 Supabase에는 접근 자격 증명이 없으므로 migration 적용과 실제 데이터 쓰기는 수행하지 않는다.
- OCR, 외부 URL 수집, 원본 바이너리 Storage 보관은 SSRF·실행시간·보존정책을 별도로 검토해야 하므로 이번 단계에서 제외한다.

## 이번 단계 범위

1. PDF(`pdf-parse`), DOCX(`mammoth`), 일반 텍스트/Markdown 추출 adapter 추가
2. 본문 정규화·SHA-256 해시·페이지/문단 fragment 생성 및 최대 크기 검증
3. 인증된 `/api/source-documents` 등록·목록 API와 `/api/source-documents/[id]` 조회·검수 상태 변경 API 추가
4. `/career` 보호 페이지와 경력 자료 라이브러리 UI(파일/붙여넣기 등록, 상태 표시, 승인) 추가
5. 추출·입력 경계 단위 테스트와 기존 harness/build 회귀 검증

## 완료 조건

- 허용된 PDF/DOCX/텍스트만 서버 Node runtime에서 처리하고, 10MB 및 500,000자 제한을 넘으면 저장하지 않는다.
- 추출 결과는 원문 해시와 fragment locator를 보존하며, 텍스트가 없는 PDF는 OCR 결과로 가장하지 않고 `manual_input`과 경고로 남긴다.
- 모든 source document/fragment 쿼리는 인증 사용자와 `user_id` 조건을 함께 사용한다.
- 등록 직후 상태는 `needs_review`(빈 추출은 `manual_input`)이고, 승인 API를 통해서만 `approved`로 바뀐다.
- 브라우저는 Supabase를 직접 호출하지 않고 같은 출처 API만 사용한다.
- lint, TypeScript, Jest, 더미 환경변수 production build가 통과한다.

## 위험과 복구

- PDF/DOCX parser가 Vercel Edge에서 실행되지 않으므로 route runtime을 Node.js로 고정한다. 실행시간·메모리 한도는 실제 배포 관찰 후 비동기 job으로 분리한다.
- 원본 파일은 이번 단계에서 Storage에 보관하지 않고 추출 본문만 저장한다. 원본 보존과 OCR은 다음 migration/보존정책을 확정한 뒤 추가한다.
- Supabase migration이 아직 적용되지 않은 환경에서는 API가 일반 오류를 반환할 수 있으며, 운영 DB에 임의로 쓰지 않는다.

## 진행

- [x] extraction adapters — PDF/DOCX/text parser와 fragment/hash 결과
- [x] source API — 등록·목록·조회·승인 상태의 서버 서비스와 route
- [x] career library UI — 보호 route, 등록 form, 검수 상태 목록
- [x] regression verification — 추출/API 입력 단위 테스트, lint, TypeScript, Jest, build

## 검증 기록

- `npm run lint` 통과
- `npx tsc --noEmit` 통과
- `npm test -- --runInBand tests/unit/features/source-ingestion.test.ts` 통과 (5 tests)
- 더미 환경변수 기반 `npm run build` 통과; `/career`, `/api/source-documents`, `/api/source-documents/[id]` route 생성 확인
- `npm run harness:verify` 통과 (16 suites, 145 tests)
- 마지막 경계 변경 후 더미 환경변수 기반 `npm run build` 재통과
- 운영 Supabase에는 migration을 적용하지 않음
