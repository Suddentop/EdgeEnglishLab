# 🚀 edgeenglish.net 정적 사이트 배포 가이드

## 📋 배포 체크리스트

### ✅ 1단계: 파일 업로드
1. **정적 파일들** (`build/` 폴더 내용)
   - `index.html`
   - `static/` 폴더 (CSS, JS, 이미지)
   - `favicon.ico`, `logo.png`, `howtowork.png`

2. **서버 설정 파일들**
   - `.htaccess` (Apache 서버 설정)
   - `production.env` (환경 변수 참고용)

3. **백엔드 API 파일들** (PHP 프록시 서버)
   - `secure-api-proxy.php` (메인 API 프록시)
   - `api-proxy.php` (기본 API 프록시)
   - `config.php` (서버 설정)
   - `rate-limiter.php` (요청 제한)
   - `test-api.php` (API 테스트용)

### ✅ 2단계: 서버 설정
1. **파일 권한 설정**
   ```bash
   chmod 644 .htaccess
   chmod 644 *.php
   chmod 666 api_logs.txt (자동 생성됨)
   chmod 666 rate_limit.json (자동 생성됨)
   ```

2. **환경 변수 설정** (서버 관리자 패널에서)
   ```
   OPENAI_API_KEY='YOUR_OPENAI_API_KEY_HERE"
   API_RATE_LIMIT=300
   API_TIMEOUT=60
   ```

### ✅ 3단계: 연결 테스트
1. **웹사이트 접속**: https://edgeenglish.net
2. **API 프록시 테스트**: https://edgeenglish.net/test-api.php
3. **AI 기능 테스트**: 웹사이트에서 AI 문제 생성 기능 사용

## 🔧 주요 설정 파일 설명

### `.htaccess`
- React Router 지원 (SPA 라우팅)
- CORS 설정 (API 프록시용)
- 보안 헤더 설정
- 성능 최적화 (Gzip, 캐싱)

### `secure-api-proxy.php`
- OpenAI API 프록시 서버
- 요청 제한 (시간당 300회)
- 입력 검증 및 로깅
- CORS 지원

### `config.php`
- 서버 환경 설정
- API Key 및 제한 설정
- 허용된 도메인 설정

## 🛡️ 보안 기능

1. **API Key 보호**: 클라이언트에 노출되지 않음
2. **요청 제한**: 시간당 300회 제한
3. **입력 검증**: 악성 요청 차단
4. **CORS 보호**: 허용된 도메인만 접근 가능
5. **로깅**: 모든 API 호출 기록

## 📊 모니터링

- **API 로그**: `api_logs.txt` 파일 확인
- **요청 제한 데이터**: `rate_limit.json` 파일 확인
- **서버 에러 로그**: 호스팅 제공업체 로그 확인

## 🚨 문제 해결

1. **API 연결 실패**: `test-api.php`로 테스트
2. **CORS 오류**: `.htaccess` CORS 설정 확인
3. **권한 오류**: 파일 권한 설정 확인
4. **환경 변수**: 서버 설정에서 API Key 확인

## 📞 지원

문제 발생 시 다음 정보와 함께 문의:
- 에러 메시지
- `api_logs.txt` 내용
- 브라우저 개발자 도구 콘솔 로그

