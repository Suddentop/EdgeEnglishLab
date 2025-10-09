# 🔧 개발 환경 설정 가이드

## 📋 개요

EngQuiz 프로젝트는 **개발 환경**과 **프로덕션 환경**에서 서로 다른 방식으로 OpenAI API를 호출합니다.

---

## 🏗️ **환경별 설정**

### **개발 환경** (로컬)

클라이언트에서 **직접 OpenAI API 호출** (PHP 서버 불필요)

**장점**:
- ✅ PHP 서버 설치 불필요
- ✅ 설정 간단
- ✅ 빠른 개발 가능

**단점**:
- ⚠️ API Key가 브라우저에 노출됨 (개발 환경에서만 사용)

### **프로덕션 환경** (배포)

**PHP 프록시 서버**를 통해 API 호출 (API Key 완전 보호)

**장점**:
- ✅ API Key 완전 숨김
- ✅ 보안 강화
- ✅ Rate Limiting 적용

**단점**:
- ⚠️ PHP 서버 필요
- ⚠️ 서버 설정 필요

---

## 🔐 **환경 변수 설정**

### **개발 환경**: `.env.local` (프로젝트 루트)

```env
# 개발 환경: 직접 API 호출
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here

# Firebase 설정
REACT_APP_FIREBASE_API_KEY=AIzaSyDQJynQZGn3TomGEMtZYSGQrYlvO7CApNo
REACT_APP_FIREBASE_AUTH_DOMAIN=edgeenglishlab.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=edgeenglishlab
REACT_APP_FIREBASE_STORAGE_BUCKET=edgeenglishlab.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=13831715924
REACT_APP_FIREBASE_APP_ID=1:13831715924:web:41907bce49707865e981c1
```

### **프로덕션 환경**: `production.env`

```env
# 프로덕션: 프록시 서버 사용 (API Key 숨김)
REACT_APP_API_PROXY_URL=https://edgeenglish.net/php_api_proxy/api-proxy.php

# Firebase 설정
REACT_APP_FIREBASE_API_KEY=AIzaSyDQJynQZGn3TomGEMtZYSGQrYlvO7CApNo
REACT_APP_FIREBASE_AUTH_DOMAIN=edgeenglishlab.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=edgeenglishlab
REACT_APP_FIREBASE_STORAGE_BUCKET=edgeenglishlab.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=13831715924
REACT_APP_FIREBASE_APP_ID=1:13831715924:web:41907bce49707865e981c1

# ⚠️ REACT_APP_OPENAI_API_KEY는 프로덕션에서 절대 설정하지 마세요!
# 서버의 환경 변수로만 관리합니다.
```

---

## 🎯 **작동 방식**

### **코드 로직**:

```typescript
// openaiProxyService.ts
async callOpenAI(request: OpenAIRequest): Promise<OpenAIResponse> {
  // 1. REACT_APP_API_PROXY_URL이 설정되어 있으면 프록시 사용
  if (this.proxyUrl) {
    return await fetch(this.proxyUrl, { ... });
  }
  
  // 2. 프록시 URL이 없으면 직접 호출 (개발 환경)
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  return await fetch('https://api.openai.com/v1/chat/completions', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
}
```

---

## 🚀 **사용 방법**

### **개발 시작**:

1. **환경 변수 파일 생성**
   - 프로젝트 루트에 `.env.local` 파일 생성
   - 위의 "개발 환경" 내용 복사

2. **React 앱 시작**
   ```bash
   npm start
   ```

3. **확인**
   - 콘솔에 "🤖 OpenAI API 직접 호출 중... (개발 환경)" 출력
   - API 정상 작동

### **프로덕션 배포**:

1. **빌드**
   ```bash
   # production.env 파일 사용
   npm run build
   ```

2. **PHP 파일 업로드**
   - `php_api_proxy/` 폴더 전체를 서버에 업로드

3. **서버 환경 변수 설정**
   ```
   OPENAI_API_KEY=실제_키_값
   ```

4. **빌드 파일 배포**
   - `build/` 폴더를 서버에 업로드

---

## ⚠️ **보안 주의사항**

### **개발 환경**:
- ✅ `.env.local` 파일은 Git에 커밋되지 않음 (`.gitignore`에 포함)
- ⚠️ 브라우저 개발자 도구에서 API Key 확인 가능 (로컬에서만 사용)

### **프로덕션 환경**:
- ✅ API Key가 클라이언트에 절대 노출되지 않음
- ✅ 서버 환경 변수로만 관리
- ✅ 프록시 서버가 모든 API 호출 처리

---

## 🔄 **환경 전환**

### **개발 → 프로덕션**:
1. `.env.local` 삭제 또는 REACT_APP_OPENAI_API_KEY 제거
2. REACT_APP_API_PROXY_URL 설정
3. 빌드 및 배포

### **프로덕션 → 개발**:
1. `.env.local` 생성
2. REACT_APP_OPENAI_API_KEY 설정
3. React 앱 재시작

---

## 🧪 **테스트**

### **개발 환경 테스트**:
```bash
# .env.local 파일 확인
cat .env.local

# REACT_APP_OPENAI_API_KEY가 있어야 함
# REACT_APP_API_PROXY_URL이 없어야 함 (또는 주석 처리)
```

### **프로덕션 환경 테스트**:
```bash
# production.env 파일 확인
cat production.env

# REACT_APP_API_PROXY_URL이 있어야 함
# REACT_APP_OPENAI_API_KEY가 없어야 함
```

---

## 📚 **관련 파일**

- `openaiProxyService.ts` - 자동 환경 감지 및 전환
- `.env.local` - 개발 환경 설정 (수동 생성)
- `production.env` - 프로덕션 환경 설정
- `php_api_proxy/` - 프로덕션 프록시 서버

---

## 🆘 **문제 해결**

### "API Key가 설정되지 않았습니다"

**원인**: `.env.local` 파일이 없거나 REACT_APP_OPENAI_API_KEY가 설정되지 않음

**해결**:
1. `.env.local` 파일 생성
2. REACT_APP_OPENAI_API_KEY 설정
3. React 앱 재시작 (중요!)

### "CORS 오류"

**원인**: 프로덕션 서버의 프록시가 localhost를 허용하지 않음

**해결**:
- 개발 환경에서는 `.env.local`에서 REACT_APP_API_PROXY_URL 제거
- 직접 API 호출 사용

