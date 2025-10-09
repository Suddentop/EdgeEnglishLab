# 📝 .htaccess 설정 변경 사항

**날짜**: 2025-10-08  
**변경 사유**: 정적 사이트 배포 요구사항

---

## 🔄 **변경 내용**

### **이전 구조**
```
engquiz/
├── .htaccess              ← 루트에 있음 (모든 설정 포함)
└── php_api_proxy/
    └── (PHP 파일들)
```

### **변경 후 구조**
```
engquiz/
├── (루트에 .htaccess 없음) ✅
└── php_api_proxy/
    ├── .htaccess          ← PHP 프록시 전용 설정
    └── (PHP 파일들)
```

---

## 📋 **.htaccess 역할 분리**

### **루트 .htaccess** (제거됨)
- ~~React Router SPA 라우팅~~
- ~~성능 최적화 (Gzip, 캐싱)~~
- ~~보안 헤더~~

→ **정적 사이트 호스팅이므로 불필요**

### **php_api_proxy/.htaccess** (새로 생성)
- ✅ PHP 파일 보안 (config.php 접근 차단)
- ✅ 환경 변수 파일 보호 (.env* 차단)
- ✅ 로그 파일 접근 차단
- ✅ PHP 설정 (타임아웃, 메모리)
- ✅ CORS 보안 헤더
- ✅ 디렉토리 브라우징 비활성화

---

## 🎯 **정적 사이트 배포 특징**

### **React 앱 (정적 HTML/JS/CSS)**
- 서버 사이드 라우팅 불필요
- .htaccess 없이도 작동
- 모든 라우팅은 클라이언트에서 처리

### **PHP API 프록시**
- php_api_proxy 폴더에만 .htaccess 필요
- 보안 설정 및 CORS 처리
- 민감한 파일 접근 차단

---

## ⚠️ **주의사항**

### **React Router 직접 URL 접근**

만약 다음과 같은 문제가 발생한다면:

```
https://edgeenglish.net/profile → 404 오류
https://edgeenglish.net/quiz → 404 오류
```

**원인**: 서버가 SPA 라우팅을 지원하지 않음

**해결 방법 1**: Hash Router 사용
```typescript
// src/App.tsx
import { HashRouter } from 'react-router-dom';

// BrowserRouter → HashRouter로 변경
<HashRouter>
  {/* routes */}
</HashRouter>
```

URL이 `https://edgeenglish.net/#/profile` 형태로 변경됨

**해결 방법 2**: 서버 설정 요청
호스팅 업체에 "모든 경로를 index.html로 리다이렉트" 요청

**해결 방법 3**: 루트에 간단한 .htaccess 추가
```apache
# SPA 라우팅만 지원 (최소 설정)
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # php_api_proxy 제외
    RewriteCond %{REQUEST_URI} !^/php_api_proxy/
    
    # 정적 파일이 아닌 경우 index.html로
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

---

## 📊 **현재 설정 요약**

| 항목 | 위치 | 용도 |
|------|------|------|
| .htaccess | ❌ 루트 없음 | - |
| .htaccess | ✅ php_api_proxy/ | PHP 보안 설정 |
| React 라우팅 | 클라이언트 사이드 | BrowserRouter |

---

## 🚀 **배포 후 테스트**

### **테스트 항목**:

1. **메인 페이지**: `https://edgeenglish.net/`
2. **직접 URL**: `https://edgeenglish.net/profile` (404 발생 가능)
3. **API 프록시**: `https://edgeenglish.net/php_api_proxy/test-api.php`

만약 #2에서 404 오류 발생 시 → 위의 해결 방법 참고

---

## 📚 **관련 문서**

- `deployment_package/배포_절차.txt` - 배포 절차
- `docs/배포를 위한 빌드 가이드.md` - 전체 빌드 가이드
- `docs/문제_해결_가이드.md` - 문제 해결

---

## ✅ **변경 사항 적용 완료**

- ✅ 루트 .htaccess 제거
- ✅ php_api_proxy/.htaccess 생성
- ✅ 배포 패키지 업데이트
- ✅ 문서 업데이트

