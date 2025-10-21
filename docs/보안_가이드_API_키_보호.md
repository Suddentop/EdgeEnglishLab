# API 키 보안 가이드

## 🚨 현재 보안 상태

### 문제점
현재 애플리케이션에서 OpenAI API 키는 `REACT_APP_OPENAI_API_KEY` 환경변수를 통해 관리되고 있습니다. 하지만 React의 `REACT_APP_` 접두사가 붙은 환경변수는 **빌드 시 클라이언트 번들에 포함**되어 브라우저에서 접근 가능한 상태가 됩니다.

### 현재 적용된 임시 보안 조치
1. **콘솔 로그 제거**: API 키를 직접 콘솔에 출력하는 코드를 모두 주석 처리
   - `Work_11_SentenceTranslation.tsx`
   - `Package_01_MultiQuizGenerater.tsx`
2. **환경변수 파일 경고 추가**: `env.example`에 보안 경고 메시지 추가

## 🔒 권장 보안 해결방안

### 1. 백엔드 API 프록시 구현 (권장)
```
클라이언트 → 백엔드 서버 → OpenAI API
```

#### 장점
- API 키가 클라이언트에 노출되지 않음
- 요청 로깅 및 모니터링 가능
- 사용량 제한 및 접근 제어 가능

#### 구현 방법
1. Firebase Functions 또는 별도 백엔드 서버 구축
2. 클라이언트에서는 자체 API 엔드포인트 호출
3. 백엔드에서 OpenAI API 호출 후 결과 반환

### 2. 서버리스 함수 활용
```javascript
// Firebase Functions 예시
exports.callOpenAI = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  
  // OpenAI API 호출
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${functions.config().openai.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data.payload)
  });
  
  return await response.json();
});
```

### 3. 환경별 설정 분리
```
개발환경: 클라이언트에서 직접 API 호출 (개발 편의성)
운영환경: 백엔드 프록시를 통한 API 호출 (보안)
```

## ⚠️ 현재 상태에서의 주의사항

### 빌드 시 확인사항
1. `npm run build` 실행 후 `build/static/js/` 폴더의 JS 파일에서 API 키 검색
2. API 키가 포함되어 있다면 즉시 키 재발급 및 보안 조치 필요

### 임시 보안 조치
1. OpenAI 대시보드에서 API 키 사용량 모니터링
2. 의심스러운 사용량 발견 시 즉시 키 재발급
3. API 키에 사용량 제한 설정

## 🔧 즉시 실행 가능한 조치

### 1. 현재 API 키 보안 확인
```bash
# 빌드 파일에서 API 키 검색
npm run build
grep -r "your-api-key-" build/
```

### 2. 새로운 API 키 발급 및 제한 설정
1. https://platform.openai.com/api-keys 접속
2. 기존 키 삭제 또는 비활성화
3. 새 키 발급 시 사용량 제한 설정

### 3. 환경변수 업데이트
```bash
# .env 파일 업데이트
REACT_APP_OPENAI_API_KEY=새로운_키_값
```

## 📋 장기 계획

1. **Phase 1**: Firebase Functions를 통한 API 프록시 구현
2. **Phase 2**: 클라이언트 코드에서 직접 OpenAI API 호출 제거
3. **Phase 3**: 환경변수에서 `REACT_APP_OPENAI_API_KEY` 제거

## 🚨 긴급 대응 절차

API 키 노출이 확인된 경우:
1. 즉시 OpenAI 대시보드에서 해당 키 비활성화
2. 새로운 키 발급 및 사용량 제한 설정
3. 배포된 애플리케이션 즉시 업데이트
4. 사용량 로그 확인 및 비정상적 사용 패턴 모니터링

