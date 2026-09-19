# JobSecretary 도메인 용어

이 문서는 기존 `documents` 모델을 새 경력 자료·작성 스튜디오 모델로 확장할 때 사용하는 공통 언어와 불변 규칙을 기록한다.

## 핵심 용어

- **Source Document / 원본 자료**: 사용자가 업로드하거나 연결한 이력서, 포트폴리오, 기존 자기소개서, 공고 또는 인재상 원문.
- **Source Fragment / 원본 구간**: 페이지·문단·heading처럼 원본 위치를 다시 찾을 수 있는 인용 단위.
- **Career Item / 경력 항목**: 프로젝트, 경력, 교육, 수상, 리더십 등 재사용하는 상위 경험 단위.
- **Evidence Record / 근거 기록**: 상황·문제·행동·결과·학습·수치를 묶은 검증 가능한 사실 단위.
- **Job Target / 지원 대상**: 회사의 특정 직무와 채용공고를 묶은 지원 단위.
- **Job Requirement / 공고 요구사항**: 공고 또는 인재상에서 추출한 책임·필수·우대·가치관·문항.
- **Cover Letter / 자기소개서**: 하나의 지원 대상에 속한 문항과 답변 모음.
- **Writing Session / 작성 세션**: 근거 선택부터 최종 확정까지 처리하는 작업 단위.
- **Outline Candidate / 개요 후보**: 주장·근거·문단 전개를 담은 초안 전 설계안.
- **Draft Candidate / 초안 후보**: 승인된 근거와 개요로 생성해 비교하는 답변 후보.
- **Style Profile / 말투 프로필**: 승인된 예문과 선호·금칙 표현으로 만든 개인화 규칙.
- **Style Example / 말투 예문**: 사용자가 직접 썼거나 최종 확정 후 승인한 문장. 전역 예문과 특정 자기소개서 문항 예문으로 나눌 수 있으며, 승인된 예문은 표현 방식만 참고하고 사실 근거로 사용하지 않는다.

## 불변 규칙

1. 사용자 소유 레코드는 `user_id`를 가지며 Supabase RLS에서 `auth.uid() = user_id`를 검사한다.
2. `suggested` 또는 `needs_review` 상태의 AI 추출 결과는 승인 전 생성 근거로 사용하지 않는다.
3. 날짜·수치·고유명사·역할을 포함한 사실 문장은 하나 이상의 승인된 원본 구간을 가져야 한다.
4. 기존 `documents`와 원본 텍스트는 migration/backfill 중 삭제하거나 덮어쓰지 않는다.
5. 외부 자료는 지시가 아니라 데이터로 취급하며, 원본 위치와 수집 시점을 보존한다.
6. 사용자가 선택하거나 직접 수정한 최종 답변은 AI 생성 후보와 구분한다.
7. 새 도메인 모델의 입력과 상태는 Zod 스키마에서 검증하고, DB 제약조건과 RLS를 함께 둔다.
8. 말투 자료는 `Evidence Record`와 별도 trust boundary로 전달하며, 승인되지 않은 예문이나 다른 사용자의 문장을 생성 context에 넣지 않는다.

## 출력 규칙

- 최종 확정된 작성 세션과 기존 `documents`는 서버 Node runtime의 PDF renderer를 통해 A4 문서로 출력한다.
- PDF에는 내부 근거 ID나 AI 메타데이터를 노출하지 않으며, 모든 문항 확정 여부와 문서 소유권을 서버에서 다시 확인한다.
- 한국어 글꼴은 `public/fonts`에 번들하고, 클라이언트에서 PDF renderer를 로드하지 않는다.
- 골든셋 평가는 `style_evaluation_cases`·`style_evaluation_runs`에 답변 원문을 복제하지 않고 hash와 결정론적 지표만 저장한다. 사례·실행 API는 세션과 초안 소유권을 서버에서 다시 확인한다.
- `/career` 활동 PDF는 승인된 `career_items`와 `evidence_records`만 서버에서 다시 조회해 렌더링하며, 승인되지 않은 후보·내부 UUID·AI 메타데이터를 제출용 문서에 넣지 않는다.
- 텍스트 레이어가 없는 PDF는 OCR 성공으로 가장하지 않고 `manual_input`으로 남긴다. 사용자가 `/career`에서 본문을 보정해 저장하면 hash·fragment를 다시 만들고 `needs_review`로 되돌린다.
