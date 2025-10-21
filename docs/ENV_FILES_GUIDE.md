# 📁 환경 변수 파일 가이드

## 📋 루트 폴더 파일 구조

```
engquiz/
├── .env.local              ← 개발 환경 (Git 추적 안 됨)
├── env.local.example       ← 개발 환경 예제
├── env.example             ← 범용 환경 변수 예제
├── production.env          ← 프로덕션 환경
├── .htaccess               ← 프로덕션 서버 Apache 설정
└── php_api_proxy/          ← PHP 프록시 관련 파일들
    ├── api-proxy.php
    ├── config.php
    ├── .env                ← PHP 서버용 (Git 추적 안 됨)
    ├── env-example.txt     ← PHP 서버 환경 변수 예제
    ├── start-php-server.bat
    └── (기타 PHP 파일들)
```

---

## 🎯 **각 파일 용도**

### **개발 환경 (로컬)**

#### `.env.local` (수동 생성 필요)
```env
# 직접 OpenAI API 호출 (PHP 서버 불필요)
REACT_APP_OPENAI_API_KEY=your-api-key-here
REACT_APP_FIREBASE_API_KEY=...
```

**생성 방법**:
```powershell
Copy-Item env.local.example .env.local
```

**특징**:
- ✅ PHP 서버 없이 개발 가능
- ✅ `.gitignore`에 포함 (Git에 커밋 안 됨)
- ⚠️ API Key가 브라우저에 노출됨 (로컬에서만 사용)

---

### **프로덕션 환경 (배포)**

#### `production.env`
```env
# 프록시 서버 사용 (API Key 숨김)
REACT_APP_API_PROXY_URL=https://edgeenglish.net/php_api_proxy/api-proxy.php
REACT_APP_FIREBASE_API_KEY=...
```

**사용 방법**:
```powershell
# 빌드 전에 production.env를 .env로 복사
Copy-Item production.env .env
npm run build
```

**특징**:
- ✅ API Key 완전 보호
- ✅ PHP 프록시 서버 사용
- ✅ 보안 강화

---

### **예제 파일들**

#### `env.example`
- React 앱 환경 변수 기본 예제
- 새 개발자 온보딩용

#### `env.local.example`
- 개발 환경 설정 예제
- `.env.local` 생성 시 참고

---

### **서버 설정**

#### `.htaccess`
- Apache 서버 설정 (dothome.co.kr)
- CORS, 보안, 라우팅 설정
- **프로덕션 배포 시 필요**

---

## 🚀 **빠른 시작**

### **개발 시작**:
```powershell
# 1. 개발 환경 변수 생성
Copy-Item env.local.example .env.local

# 2. React 앱 시작
npm start
```

### **프로덕션 빌드**:
```powershell
# 1. .env.local 삭제 (있다면)
Remove-Item .env.local -ErrorAction SilentlyContinue

# 2. 프로덕션 환경 변수 설정
Copy-Item production.env .env

# 3. 빌드
npm run build
```

---

## 🔐 **보안 체크리스트**

### ✅ **안전한 파일** (Git 커밋 가능)
- `env.example`
- `env.local.example`
- `production.env` (프록시 URL만 포함)
- `.htaccess`

### ❌ **위험한 파일** (Git 커밋 금지)
- `.env`
- `.env.local`
- `php_api_proxy/.env`

이 파일들은 `.gitignore`에 포함되어 있습니다.

---

## 📝 **정리 결과**

### **삭제된 파일**:
- ✅ `react-env-example.txt` (env.example과 중복)

### **이동된 파일**:
- ✅ `.htaccess_fixed` → `docs/backup/`
- ✅ `.htaccess_simple` → `docs/backup/`
- ✅ `start-php-server.bat` → `php_api_proxy/`
- ✅ `env-example.txt` → `php_api_proxy/`

### **루트에 남은 파일** (필수만):
- ✅ `.htaccess` (1개)
- ✅ `env.example` (1개)
- ✅ `env.local.example` (1개)
- ✅ `production.env` (1개)
- ✅ `.env.local` (사용자 생성)

---

## 🆘 **문제 해결**

### "환경 변수가 로드되지 않음"

**원인**: React 앱 재시작 안 함

**해결**:
1. Ctrl+C로 npm start 중지
2. `npm start` 재실행

### ".env.local이 없습니다"

**생성**:
```powershell
Copy-Item env.local.example .env.local
```

---

## 📚 **관련 문서**

- `php_api_proxy/LOCAL_SETUP.md` - 로컬 개발 상세 가이드
- `php_api_proxy/SERVER_DEPLOYMENT.md` - 서버 배포 가이드
- `docs/배포를 위한 빌드 가이드.md` - 전체 배포 프로세스

