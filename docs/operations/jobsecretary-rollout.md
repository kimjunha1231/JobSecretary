# JobSecretary 운영 rollout runbook

이 문서는 현재 로컬 코드와 운영 Vercel 프로젝트를 연결할 때 필요한 순서만 정리한다. 원격 Supabase migration, Vercel 환경변수 변경, Production 승격은 담당자의 확인 후 실행한다.

## 현재 기준선

- 로컬 작업 브랜치: `codex/m0-security-foundation`
- 로컬 기능 기준: M0~M6-g, M5-j 구현 커밋까지 포함
- Production 프로젝트: `coverletter_vault` (`https://jobsecretary.lat`)
- 마지막으로 확인한 Production 배포: 2026-09-14, `main` 커밋 `87d8312`
- Vercel Observability Plus metric API는 현재 팀 요금제에서 사용할 수 없었다. Web Analytics/Sentry와 Vercel 로그를 기본 관측 경로로 사용한다.
- 2026-09-21 최신 로컬 커밋 Preview(`coverlettervault-jvxgn883u-junhas-projects-a748ef77.vercel.app`)가 `READY`가 되었고, 보호를 우회하지 않은 `vercel curl`로 `/` 200, 비로그인 `/style` 307, 새 검색 품질 집계 API 401, 회원 탈퇴 `DELETE` 401을 확인했다. Preview 로그에는 조회 시점 오류가 없었고 Production alias는 변경하지 않았다.
- 같은 날 `vercel env ls production`을 읽기 전용으로 확인한 결과 `SUPABASE_SERVICE_ROLE_KEY`와 `NEXT_PUBLIC_WRITING_STUDIO_ENABLED`는 목록에 없고, `GEMINI_API_KEY` 및 Supabase 공개 키는 있었다. service-role 키가 없는 동안 회원 탈퇴 API는 503으로 명확히 차단되며, 실제 키를 채팅이나 저장소에 기록하지 않고 Vercel Production/Preview에 안전하게 추가해야 한다.

## 1. 배포 전 검증

```bash
npm run rollout:verify
npm run harness:verify
NEXT_PUBLIC_SUPABASE_URL=... \
NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
GEMINI_API_KEY=... \
npm run build
git diff --check
```

`rollout:verify`는 migration timestamp 순서와 destructive SQL, read-only verify SQL 누락, 환경변수 템플릿, client service-role 참조, Sentry 개인정보 마스킹을 로컬 파일만으로 확인한다. 이 명령은 Supabase·Vercel 원격 상태를 읽거나 변경하지 않는다.

운영 환경변수에는 비밀값을 저장소나 로그에 출력하지 않는다. `NEXT_PUBLIC_WRITING_STUDIO_ENABLED`는 기본값이 `true`이며, 장애 시 정확히 `false`로 설정하면 `/writing/new`가 기존 `/write`로 돌아간다.

## 2. Supabase 적용 순서

1. 각 migration의 `supabase/verify/*.sql`을 읽기 전용으로 실행해 기존 테이블·정책·Storage bucket을 확인한다.
2. `20260918000000`부터 파일명 순서대로 migration을 적용한다. M4 이후에는 M5 평가/선호·기존 자기소개서 말투 자료(`20260920010000_m5j_source_style_examples.sql`), M2 Storage, M6 OCR 의존성을 확인한다.
3. 적용 직후 사용자 소유 RLS와 `style_evaluation_preferences`의 hash-only 저장을 다시 확인한다.
4. migration이 실패하면 다음 migration으로 건너뛰지 않고, 기존 사용자 데이터에 쓰기를 시작하지 않는다.

이 저장소에서는 원격 DB에 migration을 자동 적용하지 않는다.

## 3. Preview 검증

1. 로컬 브랜치로 Preview를 만들고 deployment protection을 끄지 않은 채 `vercel curl`로 접근한다.
2. 비로그인 상태에서 `/dashboard`, `/career`, `/jobs`, `/write`, `/writing/new`, `/exports`가 랜딩으로 돌아가는지 확인한다.
3. 인증 계정으로 다음 경로를 순서대로 확인한다.
   - 자료 업로드/수동 본문 보정/활동 승인
   - 채용공고·인재상 URL 연결 및 요구사항 승인
   - 작성 세션의 근거·개요·초안 비교와 최종 확정
   - 자기소개서·이력서·포트폴리오 PDF 다운로드
   - blind 비교 선택과 `/style` 선호 요약
   - `/style`에서 검수 완료한 기존 자기소개서를 말투 예문으로 한 번 가져온 뒤 생성 context에 포함되는지 확인
4. 이미지 PDF는 OCR 버튼을 명시적으로 누르기 전에는 Gemini 요청이 발생하지 않는지 확인한다.

## 4. 운영 완료율 기준선(제안)

첫 50개 작성 세션을 기준으로 아래 지표를 관찰한 뒤 기본 경로 전환 여부를 결정한다. 수치는 제품 의사결정을 위한 제안 기준이며 현재 실측값이 아니다.

| 지표 | 확인 이벤트/로그 | 제안 기준 |
| --- | --- | --- |
| 작성 세션 생성 성공률 | `writing_studio_started`, API 5xx | 98% 이상 |
| 최종 확정 전환율 | `writing_studio_finalized` / `writing_studio_started` | 60% 이상 |
| PDF 출력 성공률 | `writing_studio_exported`, `career_exported`, export 5xx | 95% 이상 |
| AI 일시 오류율 | Sentry/Vercel 로그의 429·5xx | 5% 미만 |
| OCR 검수 안전성 | OCR 결과 `needs_review` 상태 | 자동 승인 0건 |
| 개인정보 이벤트 누출 | Web Analytics payload 샘플 | 원문·ID·오류 메시지 0건 |

이벤트는 원문·회사명·직무명·질문·세션 ID·사용자 ID를 포함하지 않는다. Analytics가 차단되어도 작성·출력 기능은 계속 동작해야 한다.

## 5. 점진 전환과 롤백

- Preview에서 기준선을 통과하면 `NEXT_PUBLIC_WRITING_STUDIO_ENABLED=true` 상태로 일부 사용자에게 먼저 노출한다.
- 오류율이나 PDF 실패율이 기준을 벗어나면 `NEXT_PUBLIC_WRITING_STUDIO_ENABLED=false`로 새 작업대 직접 접근까지 차단하고 기존 `/write`를 유지한다.
- 원격 DB migration 오류는 롤백 SQL을 임의로 실행하지 말고, additive migration과 기존 문서 adapter를 유지한 채 원인을 확인한다.
- Production 배포 후 최소 60초 동안 Vercel error 로그를 확인하고, Gemini capacity 오류가 반복되면 모델 fallback·키 fallback 상태와 Sentry 이벤트를 확인한다.
