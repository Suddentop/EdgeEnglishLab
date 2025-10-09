# OpenAI API 프록시 서버 배포 가이드

## 📋 개요
dothome.co.kr에서 OpenAI API Key를 안전하게 숨기는 프록시 서버 구축 가이드입니다.

## 🔑 API Key 정보
- **API Key**: 서버 환경 변수로 설정 (보안상 하드코딩 금지)
- **모델**: GPT-4o, GPT-3.5-turbo 지원
- **용도**: 영어 퀴즈 생성 AI 서비스
- **설정 방법**: dothome.co.kr 서버 관리자 페이지에서 환경 변수 `OPENAI_API_KEY` 설정

## 🚀 배포 단계

### 1단계: dothome.co.kr 서버 파일 업로드

다음 파일들을 `/public_html/` 디렉토리에 업로드하세요:

```
/public_html/
├── api-proxy.php          # 기본 API 프록시 서버
├── secure-api-proxy.php   # 보안 강화 버전 (권장)
├── config.php             # 설정 파일
├── rate-limiter.php       # 요청 제한 관리
├── .htaccess              # 보안 설정
├── test-api.php           # 테스트 파일 (배포 후 삭제)
└── env-example.txt        # 환경 변수 예시
```

### 2단계: 파일 권한 설정

```bash
chmod 644 *.php
chmod 644 .htaccess
chmod 666 api_logs.txt
```

### 3단계: API 연결 테스트

1. 브라우저에서 `https://edgeenglish.net/test-api.php` 접속
2. "API 연결 성공!" 메시지 확인
3. 테스트 완료 후 `test-api.php` 파일 삭제

### 4단계: React 앱 환경 변수 설정

`.env` 파일에 다음 내용 추가:

```bash
# API 프록시 서버 URL
REACT_APP_API_PROXY_URL=https://edgeenglish.net/secure-api-proxy.php

# 기존 Firebase 설정은 그대로 유지
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
# ... 기타 Firebase 설정
```

### 5단계: React 앱 코드 수정

기존 OpenAI API 직접 호출 코드를 프록시 서버 호출로 변경:

```typescript
// 기존 코드 (API Key 노출)
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
  },
  // ...
});

// 수정된 코드 (프록시 서버 사용)
const response = await fetch(process.env.REACT_APP_API_PROXY_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [...],
    // ...
  })
});
```

## 🔒 보안 기능

### Rate Limiting
- 시간당 300회 요청 제한
- IP 기반 요청 추적
- 초과 시 429 에러 반환

### 입력 검증
- 허용된 모델만 사용 가능
- 메시지 개수 제한 (최대 50개)
- 토큰 수 제한 (최대 4000개)

### 로깅
- 모든 API 호출 로그 기록
- 에러 및 경고 메시지 추적
- IP 주소 및 타임스탬프 기록

### CORS 제한
- 허용된 도메인에서만 접근 가능
- `https://edgeenglish.net`
- `https://www.edgeenglish.net`

## 📊 모니터링

### 로그 파일 확인
```bash
tail -f api_logs.txt
```

### 주요 로그 패턴
- `[INFO]`: 정상 요청
- `[WARNING]`: 요청 제한 초과, 잘못된 요청
- `[ERROR]`: API 오류, 서버 오류

## 🛠️ 문제 해결

### API Key 오류
```
Error: API Key not configured
```
→ `config.php`에서 API Key 확인

### 요청 제한 오류
```
Error: Rate limit exceeded
```
→ 시간당 300회 제한 확인, 필요시 `rate-limiter.php`에서 설정 변경

### CORS 오류
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
→ `.htaccess`에서 허용된 도메인 확인

## 📈 성능 최적화

### 권장 설정
- `secure-api-proxy.php` 사용 (보안 강화 버전)
- 요청 타임아웃: 60초
- 연결 타임아웃: 10초
- SSL 인증서 검증 활성화

### 캐싱 고려사항
- 동일한 요청에 대한 응답 캐싱 구현 가능
- Redis 또는 파일 기반 캐시 시스템 구축

## 🔄 업데이트 및 유지보수

### 정기 점검 항목
1. API 사용량 모니터링
2. 로그 파일 크기 확인
3. 보안 설정 검토
4. 성능 지표 확인

### 백업 및 복구
- 설정 파일 정기 백업
- 로그 파일 아카이브
- API Key 교체 시 전체 시스템 재배포

---

## 📞 지원

문제가 발생하거나 추가 도움이 필요한 경우:
1. 로그 파일 확인
2. 테스트 API 호출 실행
3. 설정 파일 검증
4. 필요시 기술 지원 요청
