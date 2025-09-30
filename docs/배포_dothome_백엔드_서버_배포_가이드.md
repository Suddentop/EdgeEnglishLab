# 🚀 dothome.co.kr PHP 백엔드 서버 배포 가이드

## 📋 개요

이 가이드는 EngQuiz 프로젝트를 dothome.co.kr에서 OpenAI API를 안전하게 사용할 수 있도록 PHP 백엔드 서버를 구축하는 방법을 설명합니다.

### 🎯 목표
- OpenAI API Key를 클라이언트에서 완전히 숨김
- 시간당 300회 요청 제한으로 API 남용 방지
- 보안 강화된 프록시 서버 구축
- 실시간 모니터링 및 로깅 시스템 구축

### 🔑 사용된 API Key
```
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
```

## 🏗️ 시스템 아키텍처

```
[React 앱] → [PHP 프록시 서버] → [OpenAI API]
    ↓              ↓                  ↓
프론트엔드      dothome.co.kr      OpenAI 서버
(클라이언트)    (백엔드)          (AI 서비스)
```

### 보안 강화 포인트
- ✅ API Key는 서버에서만 관리
- ✅ CORS 정책으로 허용된 도메인만 접근
- ✅ 요청 제한으로 남용 방지
- ✅ 입력 검증으로 악의적 요청 차단
- ✅ 실시간 로깅으로 모든 활동 추적

## 📁 필요한 파일 목록

### 핵심 서버 파일들
1. **`secure-api-proxy.php`** - 보안 강화된 API 프록시 서버 (권장)
2. **`api-proxy.php`** - 기본 API 프록시 서버
3. **`config.php`** - 서버 설정 파일 (API Key 포함)
4. **`rate-limiter.php`** - 요청 제한 관리 클래스
5. **`.htaccess`** - Apache 보안 설정

### 테스트 및 설정 파일들
6. **`test-api.php`** - API 연결 테스트 도구
7. **`rate-limit-config.php`** - 요청 제한 설정 예시
8. **`env-example.txt`** - 환경 변수 설정 예시

### React 앱 설정
9. **`react-env-example.txt`** - React 환경 변수 예시
10. **`openaiProxyService.ts`** - React용 API 프록시 서비스

## 🚀 단계별 배포 가이드

### 1단계: dothome.co.kr 서버 준비

#### 1.1 계정 확인
- [ ] dothome.co.kr 관리자 페이지 접근 가능
- [ ] FTP 또는 파일 매니저 접근 권한 확인
- [ ] PHP 7.4 이상 버전 지원 확인
- [ ] SSL 인증서 활성화 확인

#### 1.2 디렉토리 구조 확인
```
/public_html/
├── (기존 웹사이트 파일들)
└── (배포할 PHP 파일들)
```

### 2단계: 서버 파일 업로드

#### 2.1 파일 업로드 순서
1. **핵심 서버 파일들 먼저 업로드**
2. **설정 파일 업로드**
3. **보안 파일 업로드**
4. **테스트 파일 업로드**

#### 2.2 업로드할 파일들
```
📁 /public_html/ 디렉토리에 업로드:
├── secure-api-proxy.php    # 메인 API 프록시 서버
├── config.php              # 설정 파일 (API Key 포함)
├── rate-limiter.php        # 요청 제한 관리
├── .htaccess               # 보안 설정
└── test-api.php            # 테스트 도구 (배포 후 삭제)
```

#### 2.3 파일 권한 설정
```bash
# PHP 파일들
chmod 644 *.php

# 설정 파일
chmod 644 .htaccess

# 로그 파일 (자동 생성)
chmod 666 api_logs.txt
```

### 3단계: API 연결 테스트

#### 3.1 테스트 실행
1. 브라우저에서 `https://edgeenglish.net/test-api.php` 접속
2. 다음 메시지 확인:
   ```
   ✅ API 연결 성공!
   AI 응답: API connection successful
   사용된 토큰: [토큰 수]
   ```

#### 3.2 테스트 실패 시 확인사항
- [ ] 파일 업로드 상태 확인
- [ ] 파일 권한 설정 확인
- [ ] PHP 에러 로그 확인
- [ ] API Key 설정 확인

#### 3.3 테스트 완료 후 정리
```bash
# 테스트 파일 삭제 (보안상 중요)
rm test-api.php
```

### 4단계: React 앱 환경 설정

#### 4.1 환경 변수 설정
`.env` 파일에 다음 내용 추가:
```bash
# API 프록시 서버 URL
REACT_APP_API_PROXY_URL=https://edgeenglish.net/secure-api-proxy.php

# 기존 Firebase 설정 유지
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

#### 4.2 React 앱 재시작
```bash
npm start
```

### 5단계: 기존 코드 수정

#### 5.1 기존 AI 서비스 수정
기존 OpenAI API 직접 호출 코드를 프록시 서버 호출로 변경:

```typescript
// 기존 코드 (API Key 노출 위험)
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
  },
  body: JSON.stringify({...})
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
    max_tokens: 2000,
    temperature: 0.1
  })
});
```

#### 5.2 수정이 필요한 파일들
- `src/services/work13AIService.ts`
- `src/services/work14AIService.ts`
- `src/components/work/Package_01_MultiQuizGenerater/Package_01_MultiQuizGenerater.tsx`
- `src/components/work/Work_03_VocabularyWord/Work_03_VocabularyWord.tsx`
- `src/components/work/Work_07_MainIdeaInference/Work_07_MainIdeaInference.tsx`

## 🔒 보안 기능 상세

### 요청 제한 (Rate Limiting)
- **제한**: 시간당 300회 요청
- **시간 윈도우**: 3600초 (1시간)
- **식별 방법**: IP 주소 + User Agent
- **초과 시**: 429 에러 반환

### 입력 검증
- **모델 허용 목록**: gpt-4o, gpt-4, gpt-3.5-turbo
- **메시지 개수 제한**: 최대 50개
- **토큰 수 제한**: 최대 4000개
- **필수 필드 검증**: model, messages 필수

### CORS 정책
- **허용된 도메인**: 
  - `https://edgeenglish.net`
  - `https://www.edgeenglish.net`
- **허용된 메서드**: POST, GET, OPTIONS
- **허용된 헤더**: Content-Type, Authorization

### 로깅 시스템
- **로그 파일**: `api_logs.txt`
- **기록 내용**: 
  - 요청 시간 및 IP
  - 요청 내용 (민감 정보 제외)
  - 응답 상태
  - 에러 메시지

## 📊 모니터링 및 관리

### 실시간 모니터링
```bash
# 실시간 로그 확인
tail -f api_logs.txt

# 에러 로그만 확인
grep "ERROR" api_logs.txt

# 요청 제한 관련 로그
grep "Rate limit" api_logs.txt
```

### 성능 지표
- **응답 시간**: 평균 5초 이내
- **성공률**: 99% 이상
- **가동률**: 99.9% 이상
- **에러율**: 1% 이하

### 정기 점검 항목
- [ ] API 사용량 모니터링
- [ ] 로그 파일 크기 확인
- [ ] 서버 리소스 사용량 확인
- [ ] 보안 설정 검토

## 🛠️ 문제 해결 가이드

### 자주 발생하는 문제들

#### 1. API Key 오류
```
Error: API Key not configured
```
**원인**: config.php 파일의 API Key 설정 문제
**해결 방법**:
1. config.php 파일 확인
2. API Key 정확성 검증
3. 파일 업로드 상태 확인

#### 2. CORS 오류
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
**원인**: 도메인 설정 또는 .htaccess 문제
**해결 방법**:
1. .htaccess 파일의 CORS 설정 확인
2. 도메인명 정확성 확인
3. 브라우저 캐시 클리어

#### 3. 요청 제한 오류
```
Error: Rate limit exceeded
```
**원인**: 시간당 300회 제한 초과
**해결 방법**:
1. rate_limit.json 파일 확인
2. 필요시 제한 설정 조정
3. 사용 패턴 분석

#### 4. PHP 클래스 오류
```
Fatal error: Class 'RateLimiter' not found
```
**원인**: rate-limiter.php 파일 누락 또는 경로 문제
**해결 방법**:
1. rate-limiter.php 파일 업로드 확인
2. require_once 구문 확인
3. 파일 경로 정확성 확인

## 📈 성능 최적화

### 권장 설정
- **프록시 서버**: `secure-api-proxy.php` 사용
- **요청 타임아웃**: 60초
- **연결 타임아웃**: 10초
- **SSL 검증**: 활성화

### 캐싱 전략
- 동일한 요청에 대한 응답 캐싱 구현 가능
- Redis 또는 파일 기반 캐시 시스템 구축
- 캐시 만료 시간 설정 (예: 1시간)

### 확장성 고려사항
- 사용자 증가에 따른 서버 리소스 모니터링
- 필요시 로드 밸런싱 구현
- 데이터베이스 연동으로 사용량 추적

## 🔄 유지보수 가이드

### 정기 백업
- 설정 파일 정기 백업
- 로그 파일 아카이브
- API Key 교체 시 전체 시스템 재배포

### 업데이트 절차
1. 새 버전 파일 준비
2. 기존 파일 백업
3. 새 파일 업로드
4. 테스트 실행
5. 문제 없으면 완료

### 모니터링 알림 설정
- API 에러율 임계값 설정
- 서버 리소스 사용량 알림
- 요청 제한 초과 알림

---

## 🎉 배포 완료 체크리스트

### 필수 확인사항
- [ ] 모든 서버 파일 업로드 완료
- [ ] API 연결 테스트 성공
- [ ] React 앱 환경 변수 설정 완료
- [ ] 기존 코드 수정 완료
- [ ] 보안 설정 적용 완료

### 선택 확인사항
- [ ] 모니터링 시스템 구축
- [ ] 백업 시스템 설정
- [ ] 성능 최적화 적용
- [ ] 문서화 완료

**모든 체크리스트가 완료되면 dothome.co.kr에서 안전하게 OpenAI API를 사용할 수 있는 백엔드 서버가 구축됩니다!** 🚀
