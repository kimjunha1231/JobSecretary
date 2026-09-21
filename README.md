# JobSecretary : AI 통합 채용 관리 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![FSD](https://img.shields.io/badge/Architecture-FSD-orange?style=flat-square)](https://feature-sliced.design/)

<br>

## 1. 프로젝트 소개

**JobSecretary**는 취업 준비를 하다 보니 자기소개서 작성, 채용 공고 관리, PDF 변환, 면접 준비 등을 위해 너무 많은 플랫폼을 오가야 해서 비효율적이라 느꼈습니다. 이를 해결하기 위해 **통합 플랫폼 구축**을 목표로 만들었습니다.

사용자는 공고 및 지원현황을 관리하며 흩어져 있는 자기소개서를 태그 기반으로 저장 및 검색하고, **AI**를 활용해 자기소개서 초안 작성부터 교정, 면접 예상 질문 생성까지 취업 전과정을 효율적으로 관리할 수 있습니다.

- **배포 사이트**: [https://jobsecretary.lat](https://jobsecretary.lat)

<br>

## 2. 핵심 기능

| 기능 | 설명 |
| --- | --- |
| **🤖 AI 자기소개서 솔루션** | 사용자 경험 데이터 기반 AI 자기소개서 초안 작성, 교정, 면접 질문 생성 |
| **📊 칸반형 공고 관리** | 드래그 앤 드롭으로 '작성 중 → 지원 완료 → 면접 → 합격/불합격' 채용 단계 관리 |
| **🗂️ 자기소개서 관리** | 태그 기반 자기소개서 저장·검색, PDF 포트폴리오 변환 |

<br>

## 3. 기술 스택

### Frontend
| 분류 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| 폼 상태 관리 | React Hook Form + Zod |
| 서버 상태 관리 | TanStack Query |
| 전역 상태 관리 | Zustand |
| Styling | Tailwind CSS, Shadcn UI |
| Testing | Jest (Unit), Playwright (E2E) |
| 에러 모니터링 | Sentry |

### Backend & Infra
| 분류 | 기술 |
|------|------|
| DB | Supabase |
| AI | Google Gemini API |
| Infra | Vercel |

<br>

## 4. 아키텍처

**Feature-Sliced Design (FSD)** 패턴을 채택하여 기술적 역할이 아닌 **비즈니스 도메인** 기준으로 코드를 격리했습니다.

```
.
├── app/                    # Composition Layer (라우팅 및 페이지 조립)
│   ├── api/                # Server Actions & API Routes
│   └── (pages)/            # 페이지 컴포넌트
├── widgets/                # 하나의 위젯 블록 (Sidebar, KanbanBoard, ArchiveBoard, SourceLibrary)
├── features/               # 사용자 상호작용 기능 하나의 기능
│   ├── document-kanban/    # 칸반 보드 드래그 앤 드롭
│   ├── document-editor/    # 문서 편집 및 뷰어
│   ├── document-write/     # 자소서 작성 폼
│   ├── document-archive/   # 아카이브 필터링 및 목록
│   ├── source-ingestion/   # PDF/DOCX/텍스트 자료 추출 및 등록
│   ├── ai-assistant/       # AI 교정 기능
│   └── auth/               # 인증 및 동의
├── entities/               # 비즈니스 데이터 모델
│   ├── document/           # 자소서 엔티티 (types, actions, hooks, ui)
│   ├── draft/              # 임시 저장 상태
│   └── user/               # 사용자 프로필
├── shared/                 # 공용 모듈
│   ├── ui/                 # 재사용 UI 컴포넌트
│   ├── config/             # 상수 및 설정
│   ├── lib/                # 유틸리티 함수
│   └── api/                # Supabase 클라이언트
└── middleware.ts           # 인증 미들웨어
```

### 보안 기준선(M0)

- 개인 문서와 `/document/*` 경로는 Supabase 세션을 확인한 뒤 사용자 소유 행만 조회합니다.
- AI server action은 인증, 입력 크기, 작업별 호출 제한을 모델 요청 전에 검사합니다. 현재 호출 제한 저장소는 단일 Vercel 인스턴스에서 동작하는 임시 기준선이며, 다중 인스턴스 운영 전 Redis/Upstash 기반 limiter로 교체해야 합니다.
- OAuth callback의 `next`는 같은 origin의 내부 상대 경로만 허용합니다.
- Sentry는 default PII 전송을 사용하지 않으며, client Replay는 텍스트·입력값·미디어를 마스킹/차단합니다. 개인 문서 원문을 관측성 payload로 보내지 않는 것을 기본값으로 둡니다.
- 운영 Supabase에 적용하기 전 `supabase/verify/rls-documents.sql`과 `supabase/verify/rls-user-profiles.sql`로 기존 정책을 확인하고 두 M0 migration을 적용하세요. 예기치 않은 기존 정책이 있으면 migration이 의도적으로 중단됩니다.

### 도메인 기반(M1)

- `CONTEXT.md`에 원본 자료, 경력 항목, 근거 기록, 지원 대상, 작성 세션의 공통 용어와 승인 규칙을 기록했습니다.
- 새 source/career/evidence/job/cover-letter 모델과 Supabase migration은 기존 `documents`를 삭제하지 않고 추가됩니다.
- 기존 Markdown 자기소개서는 `npm run backfill:legacy`로 먼저 dry-run할 수 있습니다. 실제 쓰기는 `BACKFILL_APPLY=true`와 `SUPABASE_SERVICE_ROLE_KEY`를 함께 지정했을 때만 실행됩니다.

### 자료 가져오기(M2)

- `/career`에서 이력서·포트폴리오·기존 자기소개서를 PDF, DOCX, TXT/Markdown 파일 또는 붙여넣은 텍스트로 등록할 수 있습니다.
- 텍스트 레이어가 없는 PDF는 `manual_input`으로 보존되며, `/career` 자료 카드에서 직접 본문을 보정하거나 원본 PDF를 명시적으로 Gemini OCR에 보낼 수 있습니다. 어느 경로든 결과는 `needs_review`로 돌아가며 사용자가 원본과 대조한 뒤 승인해야 합니다.
- 서버 Node runtime에서 본문을 추출하고 SHA-256 해시와 페이지/문단 fragment를 저장합니다. 추출 결과는 `needs_review`로 보류되며 사용자가 검수 완료한 자료만 다음 AI 작성 단계에서 사용하도록 설계했습니다.
- 원본 바이너리는 비공개 `source-documents` Storage bucket에 사용자별 경로로 보관하고, 5분짜리 서명 링크로만 열 수 있게 연결했습니다. 활동 후보 추출은 자료를 승인한 뒤 사용자가 직접 검수·저장하는 방식으로 연결했고, A4 PDF는 M6에서 구현했습니다.
- 스캔 PDF의 선택형 OCR은 `POST /api/source-documents/[id]/ocr`에서만 실행되며 사용자별 `source_ocr` 분당 2회 제한을 적용합니다. 원본 PDF는 호출 순간에만 Gemini로 전송되고, OCR 결과는 자동 승인·자동 활동 생성에 사용되지 않습니다. `SOURCE_OCR_PROVIDER=disabled`로 수동 보정만 유지할 수 있습니다.
- `supabase/migrations/20260919060000_m2_source_storage.sql`은 bucket과 Storage RLS를 추가합니다. 운영 적용 전 `supabase/verify/rls-m2-source-storage.sql`과 기존 `supabase/verify/rls-m2-source-ingestion.sql`을 읽기 전용으로 확인하세요. 이 작업에서는 원격 Supabase/Vercel에 migration을 적용하지 않았습니다.

### 검수형 활동 후보 추출(M2-d)

- 승인된 이력서·포트폴리오·기존 자기소개서 카드에서 `활동 후보 만들기`를 실행하면 서버가 Gemini에 원문 fragment를 불신 데이터로 전달하고, 프로젝트·경력·교육·수상 등의 후보를 구조화합니다.
- 모델이 반환한 후보의 `sourceFragmentIds`는 서버 allowlist와 다시 대조합니다. 출처를 확인할 수 없는 후보는 제외하고, 자료가 승인되지 않았거나 보관된 상태면 AI 호출을 시작하지 않습니다.
- 후보는 화면에서 신뢰도·요약·기여·행동·결과·성과를 비교하고 제목·조직·역할·서술을 직접 편집한 뒤 `활동으로 저장` 또는 `제외`할 수 있습니다. 저장을 누른 항목만 승인된 `career_items`·`evidence_records`로 만들어지며 `evidence_sources`에 원문 인용이 연결됩니다.
- AI 사용량은 사용자별 `career_extraction` 작업으로 분당 3회 제한합니다. Gemini 실패·잘못된 JSON·출처 불일치는 빈 성공으로 바꾸지 않고 오류로 안내합니다.
- 후보 추출과 출처 allowlist·중복 제거·코드펜스 JSON 파싱은 `tests/unit/features/career-extraction.test.ts`에서 검증합니다. 원격 Supabase migration/Vercel 설정은 이 단계에서 변경하지 않았습니다.

### 공개 URL 자료 수집(M3-a)

- `/career`에서 채용공고·인재상 자료의 HTTPS 공개 URL을 등록할 수 있습니다. 서버는 URL과 리다이렉트마다 DNS를 확인하고 사설·루프백·link-local·IPv4 매핑 주소, 비표준 포트, 과대 응답을 차단합니다.
- HTML은 브라우저에 렌더링하지 않고 `script`·`style`·주석 등 실행·장식 블록을 제거한 텍스트와 heading/문단 fragment만 저장합니다. 최종 URL과 수집 시각도 함께 보존합니다.
- URL 자료도 파일 자료와 동일하게 `needs_review`로 시작하며 사용자가 검수 완료하기 전에는 다음 작성 흐름의 근거로 사용하지 않습니다. 로그인·캡차·JavaScript 렌더링 페이지와 Gemini 기반 요구사항 분류는 M3-b 이후 단계입니다.

### 지원 대상·요구사항 분석(M3-b)

- `/jobs`에서 회사·직무·고용 형태·마감일을 지원 대상으로 묶고, 경력 자료 라이브러리의 채용공고·인재상 자료를 연결할 수 있습니다.
- 검수 완료한 source fragment만 Gemini 분석 context에 넣고, 원문 안의 지시문은 데이터로 취급하도록 경계를 분리합니다. 모델이 반환한 fragment ID는 서버에서 연결된 승인 자료와 다시 대조합니다.
- 요구사항은 `주요 업무`, `필수 역량`, `우대사항`, `인재상·가치관`, `지원 문항` 후보로 저장되며 `검수 필요 → 승인됨/제외됨`을 사용자가 선택합니다. 각 후보에는 원문 미리보기가 표시됩니다.
- AI 실패·잘못된 JSON·출처 불일치는 기존 승인 요구사항을 조용히 덮어쓰지 않고 오류로 반환합니다. 지원서 초안 후보 비교와 활동 근거 추천은 M4에서 이어집니다.

### 근거 선택형 작성 스튜디오(M4-a)

- `/writing/new?jobTargetId=...`에서 지원 문항과 글자 수를 정해 작성 세션을 만들 수 있습니다.
- 승인된 활동 근거를 요구사항별 추천으로 보고 선택·제외·고정할 수 있으며, 직접 입력한 활동도 승인 근거로 추가할 수 있습니다.
- 선택한 근거만 AI context에 넣어 문제 해결·협업·성장 관점의 개요 후보 3개와 초안 후보 3개를 비교합니다. 선택하지 않은 근거 ID나 잘못된 JSON은 서버에서 저장하지 않습니다.
- 초안 후보에는 중심 관점(`angle`)을 함께 검증해 같은 관점의 후보 3개가 저장되지 않도록 하고, 비교 카드에서 관점을 확인할 수 있습니다. 모델이 관점을 생략한 구버전 응답은 첫 문장을 임시 기준으로 사용합니다.
- 초안 후보는 글자 수를 코드로 다시 계산하며, 제한을 넘은 후보는 선택·최종 확정할 수 없습니다. 사용자 수정과 AI 선택은 revision으로 남습니다.
- 운영 Supabase에는 `supabase/migrations/20260919010000_m4_writing_studio.sql`을 아직 적용하지 않았습니다. 말투 프로필·PDF 출력·출력 센터는 구현되어 있지만, 운영 migration 적용은 별도 승인 후 진행합니다.
- 운영 적용 전에는 `supabase/verify/rls-m4-writing-studio.sql`로 작성 세션·후보·revision 테이블의 RLS와 owner policy를 읽기 전용으로 확인해야 합니다.

### 문항 다중 작성·문단 병합·사실 근거 검증(M4-b)

- `/writing/new`에서 한 지원 대상의 자기소개서 문항을 여러 개 등록하면 작성 작업대에서 문항 탭으로 전환할 수 있습니다. 근거·개요·초안·revision은 활성 문항별로 분리됩니다.
- 초안 비교 화면에서 문단마다 후보를 선택해 하나의 편집 초안을 만들 수 있으며, 병합 결과는 사용자 revision으로 남습니다.
- AI 초안은 숫자·날짜·회사·프로젝트 등 사실 문장마다 `evidenceRecordId`를 인용해야 합니다. 편집 화면에서 문장별 활동을 다시 연결할 수 있고, 근거 없는 사실 문장은 최종 확정 전에 차단됩니다.
- `supabase/migrations/20260919020000_m4b_fact_citation_multi_question.sql`은 운영 DB에 아직 적용하지 않았습니다. 적용 전 M4-a migration 이후 순서와 `supabase/verify/rls-m4-writing-studio.sql`의 `draft_fact_citations` RLS를 확인해야 합니다.

### 말투 프로필·품질 요약(M5-a)

- `/style`에서 사용자의 문장 끝맺음, 선호 연결어, 피하고 싶은 표현과 직접 작성한 예문을 말투 프로필로 저장할 수 있습니다. 예문은 승인된 항목만 다음 생성에 사용됩니다.
- `/writing/new`에서 말투 프로필을 선택하면 승인 예문은 사실 근거와 분리된 `style` context로만 전달됩니다. system instruction은 예문에 포함된 회사·수치·사건을 새로운 사실로 복사하지 않도록 고정되어 있습니다.
- `/writing/[sessionId]`는 선택 근거 수, 후보 수, 사용자 수정 횟수, 사실 문장 근거 커버리지를 현재 세션 데이터에서 계산해 보여줍니다.
- 승인된 기존 자기소개서는 `/style`에서 말투 예문으로 명시적으로 가져올 수 있습니다. 서버가 사용자 소유·`cover_letter`·`approved` 상태와 20,000자 제한을 다시 확인하고, 가져온 원문은 사실 근거가 아닌 `source_document` 말투 자료로만 사용합니다.
- `supabase/migrations/20260919030000_m5_style_profile_quality.sql`은 운영 DB에 아직 적용하지 않았습니다. 적용 전 `supabase/verify/rls-m5-style-profile.sql`로 프로필·예문·세션 FK를 읽기 전용 확인해야 합니다. 최종 확정 문장 승격 UX와 문항별 예문 범위는 M5-b에서 구현했고, golden set 평가·검색 품질 측정 후 pgvector/RAG 도입은 다음 단계입니다.

### 최종 답변 예문 승격·문항별 말투 자료(M5-b)

- 최종 확정된 문항에서만 현재 답변을 `approved_final` 말투 예문으로 저장할 수 있습니다. 본문은 클라이언트 입력이 아니라 서버의 `cover_letter_questions.final_answer`에서 읽습니다.
- 예문은 전역 자료와 특정 문항 자료로 구분되며, 작성 중인 문항에는 전역 승인 예문과 현재 문항의 승인 예문만 전달됩니다.
- 생성 context가 길이 제한에 걸릴 때도 현재 문항에서 확정한 승인 예문을 먼저 사용하고, 전역 예문은 뒤에서 보조하도록 결정론적으로 정렬합니다.
- `supabase/migrations/20260919040000_m5b_question_style_examples.sql`은 운영 DB에 아직 적용하지 않았습니다. 기존 예문은 전역 예문으로 유지되며, 적용 전 M5 RLS 확인 SQL과 함께 migration 순서를 검증해야 합니다.

### 골든셋 품질 평가·초안 비교(M5-c)

- `/writing/[sessionId]`에서 최종 확정 답변을 골든셋 사례로 저장하고, 같은 질문의 최종 답변과 다른 초안 후보를 글자 수·금칙 표현·사실 근거 커버리지·사용자 수정률 기준으로 비교할 수 있습니다.
- 평가 테이블에는 답변 원문 대신 SHA-256 hash와 결정론적 요약 지표만 저장합니다. 사례·실행 결과 모두 사용자 소유 RLS와 세션·문항·초안 소유권 검증을 통과해야 합니다.
- `supabase/migrations/20260919050000_m5c_style_evaluation.sql`은 운영 DB에 아직 적용하지 않았습니다. 적용 전 `supabase/verify/rls-m5c-style-evaluation.sql`을 읽기 전용으로 실행하고, 실제 사용자 사례를 넣기 전에 migration 순서와 정책 결과를 확인해야 합니다.

### 한국어 근거 검색 기준선(M5-d)

- 공고 요구사항과 승인 활동을 매칭할 때 NFKC·공백·한국어 조사 정규화와 복합어 문자 bigram을 사용해 `검색개선`과 `검색 개선`처럼 표기가 다른 표현의 recall을 높였습니다.
- 활동 제목·조직·역할·기술·역량 태그는 서술 본문보다 높은 가중치로 계산하고, 결과에는 사용자가 검토할 수 있는 최소 점수와 설명 가능한 매칭 이유를 유지합니다.
- 외부 임베딩이나 pgvector는 아직 추가하지 않았습니다. 실제 골든셋에서 Recall@k·nDCG@k가 기준선에 미달하는 경우에만 사용자 격리·비용·지연시간을 포함한 별도 migration으로 도입합니다.
- `npm run harness:verify`(26 suites/192 tests)와 더미 production build를 통과했습니다.

### 근거 검색 품질 측정(M5-e)

- 작성 작업대가 사용하는 동일한 ranking을 `evaluateEvidenceRetrieval` runner가 재사용해 Recall@k·nDCG@k·MRR@k를 계산합니다. 동점은 evidence ID로 정렬해 실행마다 결과가 바뀌지 않습니다.
- 골든셋에는 정답 evidence ID만 넣고 원문·답변은 평가 결과에 복제하지 않습니다. 관련 근거가 표시되지 않은 사례는 `emptyRelevantLabelCount`로 따로 확인합니다.
- 실제 사용자 사례 측정 전에는 pgvector/RAG를 추가하지 않습니다. 기준선 수치와 비교해 검색 실패가 확인될 때만 별도 migration과 hybrid retrieval을 검토합니다.

### 승인 예문 기반 말투 분석(M5-f)

- `/style`에서 승인 예문만 분석해 문장 길이·끝맺음·반복 연결어를 제안합니다. 원문이나 예문에 포함된 회사·수치·사건은 분석 결과로 복사하지 않습니다.
- `분석하기`와 `분석 결과를 프로필에 반영`을 분리해 사용자가 결과를 확인하기 전에는 프로필이 바뀌지 않습니다. 금칙 표현도 자동으로 추론하지 않고 직접 관리하도록 유지합니다.
- API는 프로필 소유권과 `approved=true` 조건을 서버에서 다시 확인합니다. 이는 fine-tuning이 아니라 설명 가능한 말투 기준선을 만드는 단계입니다.

### 작성 세션 검색 품질 측정(M5-g)

- `/writing/[sessionId]`의 근거 선택 단계에서 `현재 선택으로 측정`을 누르면 `POST /api/writing-sessions/[id]/retrieval-evaluation`이 실행됩니다. 기본 `k=3`이며 1~100 범위의 `k`를 받을 수 있습니다.
- 서버는 해당 사용자의 승인 근거·승인 요구사항만 읽고, 현재 질문에서 선택하거나 고정한 match를 relevance label로 변환합니다. 선택하지 않은 추천과 stale ID는 label에서 제외합니다.
- 화면에는 Recall@k·nDCG@k·MRR@k, label이 있는 요구사항 수, 빈 label 수를 표시합니다. 이는 사용자의 선택 기반 기준선이지 정답 자동 판정이나 모델 학습 데이터 저장이 아닙니다.

### 답변 blind 선호 비교(M5-h)

- 골든셋 사례를 저장한 뒤 `내용만 비교`를 누르면 최종 답변과 다른 초안 후보를 A/B 이름만 붙여 보여 줍니다. 점수·변형 이름은 선택 전 화면에 공개하지 않아 사용자의 선호를 별도로 기록할 수 있습니다.
- 서버는 두 답변의 hash, 좌우 변형 배치, 사용자가 고른 쪽과 응답 시각만 저장하며 답변 원문은 새 평가 테이블에 복사하지 않습니다. 같은 비교의 중복 선택과 동시 제출은 409로 차단합니다.
- `supabase/migrations/20260919070000_m5h_blind_style_preferences.sql`과 `supabase/verify/rls-m5h-blind-style-preferences.sql`은 운영 DB에 아직 적용하지 않았습니다. 실제 사용자 선택이 쌓인 뒤 변형별 선호율·품질 지표를 함께 보고 검색/생성 변경 여부를 판단합니다.

### blind 선호 요약(M5-i)

- `/style`에는 blind 비교에서 사용자가 선택한 스튜디오 답변·기준 초안의 횟수와 마지막 응답 시각을 보여주는 요약 카드가 있습니다. 답변 원문과 hash는 이 화면이나 요약 API에 포함하지 않습니다.
- `GET /api/style-evaluation-preferences/summary`는 사용자별 집계만 반환하며, preference migration이 아직 운영 DB에 적용되지 않은 배포에서는 `available: false`로 호환 응답합니다.
- 이 요약은 자동 학습이나 말투 프로필 덮어쓰기가 아니라 다음 비교를 설계하고 사용자가 직접 프로필을 조정하기 위한 기준선입니다. 실제 사용자 데이터가 충분히 쌓이기 전에는 pgvector/RAG 도입이나 생성 모델 변경을 결정하지 않습니다.

### 기존 자기소개서 말투 자료 가져오기(M5-j)

- `/style`의 각 프로필에서 검수 완료한 기존 `cover_letter` 자료를 골라 승인 예문으로 추가할 수 있습니다. 직접 붙여넣지 않아도 과거 자기소개서의 문장 길이·끝맺음·연결어를 현재 프로필 분석과 다음 생성 context에 재사용합니다.
- `POST /api/style-profiles/[id]/examples/from-source`는 자료 ID만 받고, 서버에서 현재 사용자 소유·`approved`·`cover_letter` 상태와 원문/fragment를 다시 확인합니다. 20,000자를 넘거나 본문이 비어 있으면 저장하지 않습니다.
- `style_examples.source_document_id`와 `source = 'source_document'`로 원본 연결을 보존하고, 예문을 삭제하거나 사용 중지하면 다음 생성에서 제외할 수 있습니다. 사실 근거 검색과 말투 예문 검색은 계속 분리됩니다.
- `supabase/migrations/20260920010000_m5j_source_style_examples.sql`과 `supabase/verify/rls-m5j-source-style-examples.sql`은 운영 DB에 아직 적용하지 않았습니다. M2 자료·M5 스타일 migration 이후 순서로 읽기 전용 검증을 먼저 실행해야 합니다.

### 서버 PDF 출력·기존 문서 전환(M6-a)

- 최종 확정된 작성 세션은 `/api/writing-sessions/[id]/export`에서 모든 문항의 확정 상태를 다시 확인한 뒤 A4 PDF로 내려받을 수 있습니다. 미확정 문항이 하나라도 있으면 409로 차단합니다.
- 기존 `/write` 문서는 `/api/documents/[id]/export`로 같은 템플릿의 PDF를 받을 수 있습니다. 원본 `documents` 행은 삭제하거나 새 모델로 덮어쓰지 않습니다.
- PDF renderer는 서버 Node runtime에서만 실행하며, 제출용 PDF에는 evidence ID·프롬프트·평가 메타데이터를 넣지 않습니다. 한국어 Pretendard 글꼴은 `public/fonts`에 번들해 외부 CDN 의존성을 제거했습니다.

### 승인 활동 이력서·포트폴리오 PDF(M6-b)

- `/career`에서 `포트폴리오 PDF` 또는 `이력서 PDF`를 선택하면 `/api/career/export`가 승인된 활동 근거만 A4 PDF로 묶습니다. 아직 승인된 활동이 없으면 빈 파일을 만들지 않고 안내 오류를 반환합니다.
- `/career`의 `승인된 활동 근거` 영역에서 프로젝트·경력·교육·수상 활동을 조직/역할·기여·행동·결과·성과·기술 단위로 확인할 수 있습니다. 이 목록과 PDF 모두 `approved` 상태만 사용합니다.
- 출력에는 활동 제목·조직/역할·기여·상황/행동/결과·성과·기술만 포함하며, UUID·원본 프롬프트·평가 메타데이터는 포함하지 않습니다.
- 이 경로도 서버에서 현재 사용자 소유와 승인 상태를 재조회하므로, 화면에 보이는 목록을 신뢰해 제출 자료를 만들지 않습니다.
- `npm run harness:verify`와 production build를 통과했고, 2페이지 샘플을 PNG로 렌더링해 한글 글리프·줄바꿈·페이지 번호·페이지 나눔을 확인했습니다.

### 선택형 경력 자료 출력(M6-c)

- `/career`에서 승인된 활동을 checkbox로 고르고, 위/아래 버튼으로 이력서·포트폴리오에 들어갈 순서를 정할 수 있습니다. 선택 상태는 다운로드 URL의 `ids`에 담겨 새로고침·공유한 링크에서도 같은 출력 대상을 가리킵니다.
- 서버는 선택한 evidence ID를 현재 사용자 소유·승인 상태로 다시 조회하고 요청 순서를 복원합니다. 하나라도 누락되거나 변조되면 부분 PDF를 만들지 않고 409를 반환합니다.
- `ids`가 없는 기존 다운로드 링크는 모든 승인 활동을 출력하는 호환 경로로 유지합니다.

### 선택형 스캔 PDF OCR 보정(M6-d)

- 텍스트 레이어가 없는 PDF 카드에서 `AI OCR 실행`을 눌렀을 때만 원본 PDF를 Gemini에 전송합니다. OCR 결과는 원본 PDF의 hash·저장 경로를 유지한 채 `ocr` 추출 방식과 새 fragment로 저장합니다.
- 결과는 항상 `needs_review`에 머물며, 원본과 대조하기 전에는 자기소개서 근거·활동 후보 추출에 사용할 수 없습니다. 이미 검수 중이거나 승인된 자료를 OCR 결과로 덮어쓰는 요청은 서버에서 409로 거부합니다.
- Gemini가 비활성화됐거나 결과가 비어 있으면 수동 본문 보정으로 복구할 수 있습니다. OCR 호출·원본 다운로드·결과 저장은 모두 사용자 소유권과 서버 인증 경계를 통과합니다.

### 출력 센터 진입점(M6-e)

- `/exports`에서 승인 활동 이력서·포트폴리오, 자기소개서, 기존 문서 PDF 흐름을 한 화면에서 찾을 수 있습니다. 각 카드는 기존 `/career`, `/writing/new`, `/archive`로 연결되며 별도 복제 데이터는 만들지 않습니다.
- 전역 사이드바에 `출력 센터`를 추가했고 middleware에서도 로그인 전용 경로로 보호합니다. 비로그인 사용자는 다른 작업 화면과 동일하게 랜딩으로 돌아갑니다.

### 작성 작업대 롤백 스위치(M6-f)

- `NEXT_PUBLIC_WRITING_STUDIO_ENABLED`는 기본값이 활성화이며, 배포 환경에서 정확히 `false`로 설정하면 기존 `/write`의 새 작업대 링크와 `/writing/new` 직접 접근이 모두 기존 작성 화면으로 돌아갑니다.
- 링크와 직접 접근이 같은 공통 판정을 사용하므로 점진적 노출 중 장애가 발생해도 우회 진입이 남지 않습니다. 실제 Vercel 환경변수 변경은 원격 운영 승인 후 적용합니다.

### 운영 rollout

- Supabase migration 순서, Preview 검증, 개인정보 없는 Analytics 지표, 작성 작업대 롤백 기준은 [`docs/operations/jobsecretary-rollout.md`](docs/operations/jobsecretary-rollout.md)에 정리했습니다.
- 마지막으로 확인한 Production은 원격 `main`의 2026-09-14 커밋이며, 로컬 개선 커밋은 Preview와 운영 승인 후 별도로 승격해야 합니다.

### 제품 완료율 측정(M6-g)

- 작성 시작, 근거·개요·초안·편집 단계 완료, 최종 확정, 자기소개서/경력 PDF 출력, blind 선택을 Vercel Analytics custom event로 측정할 수 있습니다.
- 근거·개요·초안 선택, 문단 병합, 수정 저장과 같은 사용자 선택을 별도 집계하고, 모든 문항을 확정한 시점에는 브라우저 세션에만 보관한 시작 시각으로 총 소요시간(초)을 계산합니다. 선택 종류·문항 수·시간만 전송합니다.
- 이벤트에는 문서 원문·회사명·직무명·질문·세션 ID·사용자 ID·URL·오류 메시지를 보내지 않고, 문항 수·출력 형식·선택 방향처럼 집계 가능한 값만 보냅니다.
- Analytics 전송이 실패해도 작성과 PDF 출력은 계속 동작합니다. 실제 이벤트 수치는 운영 배포 후 Vercel 대시보드에서 확인해야 합니다.

<br>

## 5. 성능 최적화

| 최적화 항목 | 적용 기술 |
|------------|----------|
| **렌더링 최적화** | `useMemo`, `useCallback`으로 칸반 드래그 중 불필요한 리렌더 방지, React Hook Form 비제어 컴포넌트로 타이핑 시 리렌더 최소화 |
| **FCP 개선** | Back-Forward Cache 활성화, Dynamic Import 활용 |
| **접근성** | `aria-label`, `sr-only`, Lighthouse 접근성 점수 개선 |
