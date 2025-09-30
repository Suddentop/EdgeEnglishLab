# 🚀 dothome.co.kr PHP 백엔드 서버 배포 체크리스트

## ✅ 배포 전 준비사항

### 1. dothome.co.kr 계정 확인
- [ ] dothome.co.kr 관리자 페이지 접근 가능
- [ ] FTP 또는 파일 매니저 접근 권한 확인
- [ ] PHP 지원 확인 (PHP 7.4 이상 권장)
- [ ] SSL 인증서 활성화 확인

### 2. 파일 준비 확인
- [ ] `api-proxy.php` 파일 준비됨
- [ ] `secure-api-proxy.php` 파일 준비됨 (권장)
- [ ] `config.php` 파일 준비됨 (API Key 포함)
- [ ] `rate-limiter.php` 파일 준비됨
- [ ] `.htaccess` 파일 준비됨
- [ ] `test-api.php` 파일 준비됨

## 🔧 배포 단계

### 1단계: 서버 파일 업로드
```
📁 /public_html/ 디렉토리에 다음 파일들 업로드:
├── api-proxy.php
├── secure-api-proxy.php (권장)
├── config.php
├── rate-limiter.php
├── .htaccess
└── test-api.php
```

- [ ] 모든 PHP 파일 업로드 완료
- [ ] 파일 권한 설정 (644)
- [ ] .htaccess 파일 업로드 완료

### 2단계: 권한 설정
```bash
chmod 644 *.php
chmod 644 .htaccess
chmod 666 api_logs.txt  # 로그 파일 (자동 생성)
```

- [ ] PHP 파일 권한 설정 (644)
- [ ] .htaccess 파일 권한 설정 (644)
- [ ] 로그 파일 쓰기 권한 확인

### 3단계: API 연결 테스트
1. 브라우저에서 `https://edgeenglish.net/test-api.php` 접속
2. "API 연결 성공!" 메시지 확인
3. AI 응답이 정상적으로 나오는지 확인

- [ ] 테스트 페이지 접속 성공
- [ ] API Key 인증 성공
- [ ] OpenAI API 호출 성공
- [ ] AI 응답 정상 수신

### 4단계: 보안 설정 확인
- [ ] test-api.php 파일 삭제 또는 접근 차단
- [ ] config.php 파일 접근 차단 확인
- [ ] 로그 파일 접근 차단 확인
- [ ] CORS 헤더 정상 작동 확인

### 5단계: React 앱 환경 변수 설정
`.env` 파일에 추가:
```bash
REACT_APP_API_PROXY_URL=https://edgeenglish.net/secure-api-proxy.php
```

- [ ] .env 파일에 프록시 URL 추가
- [ ] 기존 Firebase 설정 유지
- [ ] 환경 변수 재시작 후 적용 확인

## 🧪 배포 후 테스트

### 1. 기본 기능 테스트
- [ ] 퀴즈 생성 기능 테스트
- [ ] AI 응답 정상 수신 확인
- [ ] 에러 처리 정상 작동 확인
- [ ] 로딩 상태 정상 표시 확인

### 2. 보안 기능 테스트
- [ ] 요청 제한 정상 작동 (시간당 300회)
- [ ] 잘못된 요청 차단 확인
- [ ] CORS 정책 정상 적용 확인
- [ ] 로그 파일 정상 생성 확인

### 3. 성능 테스트
- [ ] API 응답 시간 측정 (목표: 10초 이내)
- [ ] 동시 요청 처리 확인
- [ ] 메모리 사용량 모니터링
- [ ] 서버 리소스 사용량 확인

## 📊 모니터링 설정

### 1. 로그 모니터링
```bash
# 실시간 로그 확인
tail -f api_logs.txt

# 에러 로그 확인
grep "ERROR" api_logs.txt

# 요청 제한 로그 확인
grep "Rate limit" api_logs.txt
```

- [ ] 로그 파일 모니터링 설정
- [ ] 에러 알림 설정 (선택사항)
- [ ] 사용량 통계 수집 (선택사항)

### 2. 성능 모니터링
- [ ] API 응답 시간 추적
- [ ] 요청 성공률 모니터링
- [ ] 서버 리소스 사용량 확인
- [ ] OpenAI API 사용량 추적

## 🚨 문제 해결 가이드

### 자주 발생하는 문제들

#### 1. API Key 오류
```
Error: API Key not configured
```
**해결 방법:**
- config.php 파일의 API Key 확인
- 파일 업로드 상태 확인
- 파일 권한 확인

#### 2. CORS 오류
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
**해결 방법:**
- .htaccess 파일의 CORS 설정 확인
- 도메인명 정확성 확인
- 브라우저 캐시 클리어

#### 3. 요청 제한 오류
```
Error: Rate limit exceeded
```
**해결 방법:**
- 시간당 300회 제한 확인
- rate_limit.json 파일 상태 확인
- 필요시 제한 설정 조정

#### 4. PHP 오류
```
Fatal error: Class 'RateLimiter' not found
```
**해결 방법:**
- rate-limiter.php 파일 업로드 확인
- require_once 구문 확인
- 파일 경로 확인

## 📈 성공 지표

### 배포 성공 기준
- [ ] API 연결 테스트 100% 성공
- [ ] 퀴즈 생성 기능 정상 작동
- [ ] 보안 기능 정상 적용
- [ ] 성능 요구사항 충족 (응답 시간 < 10초)
- [ ] 에러율 < 1%

### 운영 성공 기준
- [ ] 일일 API 호출 성공률 > 99%
- [ ] 평균 응답 시간 < 5초
- [ ] 서버 가동률 > 99.9%
- [ ] 보안 침해 사고 0건

---

## 🎉 배포 완료!

모든 체크리스트가 완료되면 dothome.co.kr에서 OpenAI API를 안전하게 사용할 수 있는 백엔드 서버가 구축됩니다!

**주요 장점:**
- ✅ API Key 완전 보안
- ✅ 시간당 300회 요청 제한
- ✅ 실시간 로깅 및 모니터링
- ✅ 자동 에러 처리
- ✅ CORS 보안 정책 적용
