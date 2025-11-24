# Gemini API 연동 가이드

## 1. API 키 발급받기

### Google AI Studio에서 무료 API 키 받기
1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. Google 계정으로 로그인
3. "Get API Key" 또는 "Create API Key" 클릭
4. API 키 복사 (예: `AIzaSyC...`)

## 2. 환경 변수 설정

### `.env.local` 파일 생성
프로젝트 루트에 `.env.local` 파일을 만들고 다음 내용 추가:

```bash
# Gemini API
API_KEY=여기에_발급받은_API_키_붙여넣기

# Supabase (이미 있음)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**예시:**
```bash
API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. 서버 재시작

환경 변수를 추가한 후 **반드시** 서버를 재시작해야 합니다:

```bash
# 기존 서버 종료 (Ctrl+C)
# 서버 재시작
npm run dev
```

## 4. 테스트

### AI 어시스턴트 사용해보기
1. 브라우저에서 `http://localhost:3000` 접속
2. 좌측 사이드바에서 "AI 어시스턴트" 클릭
3. 질문 입력 (예: "팀워크 경험 찾아줘")
4. AI가 응답하면 성공!

## 5. 무료 할당량

### Gemini 2.0 Flash Experimental (현재 사용 중)
- **가격**: 완전 무료 (베타 기간)
- **제한**: 분당 요청 수 제한 있음 (일반적으로 충분)

### 할당량 초과 시
무료 할당량을 초과하면:
1. Google Cloud Console에서 결제 계정 설정
2. 또는 `gemini-1.5-flash-8b` (더 저렴한 모델)로 변경

## 6. 문제 해결

### "API Key missing" 에러
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- 파일명이 정확히 `.env.local`인지 확인 (`.env`가 아님)
- 서버를 재시작했는지 확인

### "API 키를 확인해 주세요" 에러
- API 키가 올바른지 확인
- Google AI Studio에서 API 키가 활성화되어 있는지 확인
- 할당량을 초과하지 않았는지 확인

## 현재 설정

현재 프로젝트는 다음과 같이 설정되어 있습니다:

- **자기소개서 검색**: `gemini-2.0-flash-exp` (무료, 고성능)
- **질문 생성**: `gemini-1.5-flash` (저렴, 안정적)
- **API 키 위치**: `process.env.API_KEY`

## 다음 단계

1. ✅ API 키 발급
2. ✅ `.env.local` 파일 생성 및 키 추가
3. ✅ 서버 재시작
4. ✅ AI 어시스턴트 테스트
