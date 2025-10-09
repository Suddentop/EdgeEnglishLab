# 🚀 서버 배포 가이드

## 📋 dothome.co.kr 서버 설정

### 1단계: 환경 변수 설정 (필수!)

**호스팅 관리자 페이지에서 설정:**

```
변수명: OPENAI_API_KEY
값: 
```

### 2단계: 파일 업로드

FTP로 다음 파일들을 `/public_html/php_api_proxy/` 경로에 업로드:

```
php_api_proxy/
├── api-proxy.php
├── secure-api-proxy.php
├── config.php
├── rate-limiter.php
├── rate-limit-config.php
└── test-api.php (테스트 후 삭제)
```

### 3단계: 파일 권한 설정

```bash
chmod 644 *.php
chmod 600 config.php  # 설정 파일은 더 엄격하게
```

### 4단계: 테스트

브라우저에서 접속:
```
https://edgeenglish.net/php_api_proxy/test-api.php
```

✅ **성공 확인 후** test-api.php 파일 삭제!

### 5단계: React 앱 환경 변수 확인

`production.env` 파일:
```
REACT_APP_API_PROXY_URL=https://edgeenglish.net/php_api_proxy/api-proxy.php
```

### 6단계: 빌드 및 배포

```bash
npm run build
```

빌드된 파일을 `/public_html/` 에 업로드

---

## 🔐 보안 체크리스트

- [ ] 서버 환경 변수에 OPENAI_API_KEY 설정됨
- [ ] test-api.php 파일 삭제됨
- [ ] config.php 파일 권한 600 설정됨
- [ ] .htaccess로 config.php 접근 차단 확인
- [ ] API 로그 파일 권한 확인
- [ ] CORS 설정 확인 (edgeenglish.net만 허용)

---

## 🆘 문제 해결

### "API Key not configured" 오류

**원인**: 환경 변수가 설정되지 않음

**해결**:
1. 호스팅 관리자 > 환경 변수 재확인
2. 변수명 철자 확인: `OPENAI_API_KEY` (정확히 일치해야 함)
3. 서버 재시작

### "CORS 오류"

**원인**: 허용되지 않은 도메인에서 접근

**해결**:
- `api-proxy.php` 또는 `secure-api-proxy.php`의 `$allowedOrigins` 배열에 도메인 추가

### "Rate limit exceeded"

**원인**: 시간당 요청 제한 초과

**해결**:
- `rate-limit-config.php`에서 제한값 조정
- 또는 `rate_limit.json` 파일 삭제 후 재시작

---

## 📊 모니터링

### 로그 파일 확인

```bash
tail -f api_logs.txt
```

### Rate Limit 상태 확인

```bash
cat rate_limit.json
```

---

## 🔄 API Key 교체 시

1. 호스팅 관리자에서 환경 변수 값만 변경
2. 서버 재시작
3. 코드 수정 불필요 (환경 변수만 사용)

---

## 📞 지원

문제 발생 시:
1. `api_logs.txt` 로그 확인
2. `test-api.php`로 연결 테스트
3. [문제 해결 가이드](../docs/문제_해결_가이드.md) 참고

