# PHP API Proxy Server

OpenAI API를 안전하게 프록시하는 서버입니다.

## 🔒 보안 설정

### 1. API Key 설정
서버에 환경 변수로 API Key를 설정하세요:

```bash
# Linux/Mac
export OPENAI_API_KEY="your_actual_api_key_here"

# Windows
set OPENAI_API_KEY=your_actual_api_key_here
```

### 2. 파일 권한 설정
```bash
chmod 600 config.php
chmod 644 secure-api-proxy.php
```

### 3. .htaccess 보안 설정
```apache
# config.php 직접 접근 차단
<Files "config.php">
    Order Allow,Deny
    Deny from all
</Files>
```

## 📁 파일 구조
- `secure-api-proxy.php` - 메인 프록시 서버
- `config.php` - 설정 파일 (환경 변수 사용)
- `rate-limiter.php` - 요청 제한 관리
- `env.example` - 환경 변수 예시

## ⚠️ 주의사항
- **절대 실제 API Key를 코드에 하드코딩하지 마세요**
- **환경 변수만 사용하여 API Key를 관리하세요**
- **config.php 파일은 서버에서만 접근 가능하도록 설정하세요**
