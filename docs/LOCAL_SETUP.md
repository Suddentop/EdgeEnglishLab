# 🔧 로컬 개발 환경 설정

## ⚡ 빠른 시작 (PHP 서버 없이)

PHP가 설치되지 않은 경우, 개발 환경에서 OpenAI API를 직접 호출할 수 있습니다.

---

## 📝 **설정 방법**

### **1단계: .env.local 파일 생성**

프로젝트 루트(`D:\Dev\engquiz`)에 **`.env.local`** 파일 생성:

```env
# 개발 환경: 직접 OpenAI API 호출
REACT_APP_OPENAI_API_KEY=

# Firebase 설정
REACT_APP_FIREBASE_API_KEY=AIzaSyDQJynQZGn3TomGEMtZYSGQrYlvO7CApNo
REACT_APP_FIREBASE_AUTH_DOMAIN=edgeenglishlab.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=edgeenglishlab
REACT_APP_FIREBASE_STORAGE_BUCKET=edgeenglishlab.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=13831715924
REACT_APP_FIREBASE_APP_ID=1:13831715924:web:41907bce49707865e981c1
```

### **2단계: React 앱 시작**

```powershell
npm start
```

### **3단계: 확인**

콘솔에 다음 메시지가 표시되면 성공:
```
🔓 직접 API 호출 (개발 환경)
```

---

## 🎯 **환경별 작동 방식**

### **개발 환경** (PHP 없이)

```
React App (localhost:3000)
    ↓ 직접 호출
OpenAI API (api.openai.com)
```

**환경 변수**:
- ✅ `REACT_APP_OPENAI_API_KEY` - 설정함
- ❌ `REACT_APP_API_PROXY_URL` - 설정 안 함

### **프로덕션 환경** (PHP 프록시)

```
React App (edgeenglish.net)
    ↓ 프록시 경유
PHP Proxy (php_api_proxy/)
    ↓ 서버 환경 변수
OpenAI API (api.openai.com)
```

**환경 변수**:
- ❌ `REACT_APP_OPENAI_API_KEY` - 설정 안 함 (보안)
- ✅ `REACT_APP_API_PROXY_URL` - 설정함

---

## 🔐 **보안 주의사항**

### ⚠️ **개발 환경 (로컬에서만 사용)**

- API Key가 브라우저에 노출됨
- **절대 프로덕션 빌드에 포함하지 마세요!**
- `.env.local` 파일은 Git에 커밋되지 않음

### ✅ **프로덕션 환경 (안전)**

- API Key가 서버 환경 변수로만 존재
- 클라이언트에 절대 노출되지 않음
- 프록시 서버가 모든 요청 처리

---

## 🛠️ **PowerShell 명령어**

### **파일 생성**:
```powershell
# .env.local 파일 생성
@"
REACT_APP_OPENAI_API_KEY=
REACT_APP_FIREBASE_API_KEY=AIzaSyDQJynQZGn3TomGEMtZYSGQrYlvO7CApNo
REACT_APP_FIREBASE_AUTH_DOMAIN=edgeenglishlab.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=edgeenglishlab
REACT_APP_FIREBASE_STORAGE_BUCKET=edgeenglishlab.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=13831715924
REACT_APP_FIREBASE_APP_ID=1:13831715924:web:41907bce49707865e981c1
"@ | Out-File -FilePath ".env.local" -Encoding utf8
```

### **파일 확인**:
```powershell
Get-Content .env.local
```

### **파일 삭제** (프로덕션 빌드 전):
```powershell
Remove-Item .env.local
```

---

## ✅ **전환 가이드**

### **개발 → 프로덕션**

1. `.env.local` 삭제
   ```powershell
   Remove-Item .env.local
   ```

2. `production.env` 사용
   ```powershell
   Copy-Item production.env .env
   ```

3. 빌드
   ```powershell
   npm run build
   ```

### **프로덕션 → 개발**

1. `.env.local` 생성 (위 명령어 사용)

2. React 앱 재시작
   ```powershell
   npm start
   ```

---

## 🧪 **테스트**

### **API 호출 방식 확인**:

브라우저 콘솔에서:
```
🔓 직접 API 호출 (개발 환경)  ← 개발 환경
🔒 프록시 서버 사용             ← 프로덕션 환경
```

---

## 📚 **관련 문서**

- `DEVELOPMENT_GUIDE.md` - 전체 개발 가이드
- `SERVER_DEPLOYMENT.md` - 서버 배포 가이드
- `README.md` - 프록시 서버 사용법

---

## 🆘 **문제 해결**

### "API 설정이 없습니다"

**.env.local 파일이 없거나 내용이 비어있음**

**해결**:
1. `.env.local` 파일 생성 (위 명령어 사용)
2. React 앱 재시작 (중요!)

### "401 Unauthorized"

**API Key가 잘못되었거나 만료됨**

**해결**:
1. OpenAI 대시보드에서 새 API Key 발급
2. `.env.local` 파일의 REACT_APP_OPENAI_API_KEY 업데이트
3. React 앱 재시작

### "환경 변수가 로드되지 않음"

**React 앱이 재시작되지 않음**

**해결**:
- 환경 변수 변경 후 **반드시 React 앱 재시작 필요**
- `Ctrl+C`로 중지 후 `npm start`

