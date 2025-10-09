# PHP API Proxy

OpenAI API Key를 안전하게 숨기고 관리하는 프록시 서버입니다.

## 📁 파일 구조

```
php_api_proxy/
├── api-proxy.php           # 기본 프록시 서버
├── secure-api-proxy.php    # 보안 강화 프록시 서버
├── config.php              # 서버 설정 파일
├── rate-limiter.php        # Rate Limiting 기능
├── rate-limit-config.php   # Rate Limiter 설정 예시
└── test-api.php           # API 연결 테스트 파일
```

## 🔐 보안 설정

### 환경 변수 설정

**중요**: API Key는 절대 코드에 하드코딩하지 마세요!

서버 환경 변수에 다음을 설정하세요:
```bash
OPENAI_API_KEY=your_actual_api_key_here
```

### dothome.co.kr 서버 설정 방법

1. **호스팅 관리자 페이지 접속**
2. **환경 변수 설정 메뉴 선택**
3. **변수명**: `OPENAI_API_KEY`
4. **값**: 실제 OpenAI API Key 입력
5. **저장 및 서버 재시작**

## 🚀 사용 방법

### 1. 기본 프록시 (api-proxy.php)

React 앱의 환경 변수:
```
REACT_APP_API_PROXY_URL=https://edgeenglish.net/php_api_proxy/api-proxy.php
```

### 2. 보안 강화 프록시 (secure-api-proxy.php)

더 강력한 보안이 필요한 경우:
```
REACT_APP_API_PROXY_URL=https://edgeenglish.net/php_api_proxy/secure-api-proxy.php
```

**보안 강화 기능**:
- Rate Limiting (시간당 요청 제한)
- 입력 검증 및 필터링
- CORS 정책 강화
- 실시간 로깅 및 모니터링

## 🧪 테스트

```
https://edgeenglish.net/php_api_proxy/test-api.php
```

⚠️ **주의**: 프로덕션 환경에서는 test-api.php를 삭제하거나 접근을 차단하세요!

## 📊 Rate Limiting 설정

`rate-limit-config.php`에서 설정 변경 가능:

```php
// 시간당 300회 (기본값)
$defaultRateLimit = new RateLimiter('rate_limit.json', 300, 3600);

// 하루당 1000회
$dailyLimit = new RateLimiter('rate_limit.json', 1000, 86400);
```

## 🔒 파일 권한

```bash
chmod 644 *.php
chmod 600 config.php  # 설정 파일은 더 엄격하게
```

## 📝 로그 파일

- `api_logs.txt` - API 호출 로그
- `rate_limit.json` - Rate limiting 데이터

⚠️ 이 파일들은 `.gitignore`에 포함되어 Git에 커밋되지 않습니다.

## 🆘 문제 해결

### API Key not configured 오류

**원인**: 환경 변수가 설정되지 않음

**해결**:
1. 서버 환경 변수 확인
2. `OPENAI_API_KEY` 정확히 설정되었는지 확인
3. 서버 재시작

### Rate limit exceeded 오류

**원인**: 시간당 요청 제한 초과

**해결**:
1. `rate-limit-config.php`에서 제한값 조정
2. 또는 잠시 후 재시도

### CORS 오류

**원인**: 허용되지 않은 도메인에서 접근

**해결**:
- `config.php`의 `CORS_ALLOWED_ORIGINS` 배열에 도메인 추가
- 또는 개별 프록시 파일의 `$allowedOrigins` 수정

## 📚 관련 문서

- [배포 가이드](../docs/배포_dothome_백엔드_서버_배포_가이드.md)
- [문제 해결 가이드](../docs/문제_해결_가이드.md)
- [보안 가이드](../docs/보안_가이드_API_키_보호.md)

