# 테스트 사용자 일괄 생성 가이드

## 방법 1: Cloud Function API 사용 (권장)

### 전제 조건
1. Cloud Function이 배포되어 있어야 합니다:
   ```bash
   cd functions
   firebase deploy --only functions:batchCreateUsersByAdmin
   ```

2. 관리자 UID를 확인하세요 (웹사이트에서 로그인 후 브라우저 콘솔에서 확인 가능)

### 실행 방법

```bash
# 관리자 UID를 인자로 전달
node scripts/batchCreateUsersViaAPI.js YOUR_ADMIN_UID

# 또는 스크립트 파일에서 ADMIN_UID 변수를 직접 수정
```

## 방법 2: Firebase Admin SDK 직접 사용

### 전제 조건
1. Firebase Admin SDK 서비스 계정 키 파일이 필요합니다
2. `functions/serviceAccountKey.json` 파일이 있어야 합니다

### 실행 방법

1. `scripts/batchCreateUsers.js` 파일을 열어서 `adminUid` 변수를 관리자 UID로 수정
2. 실행:
   ```bash
   node scripts/batchCreateUsers.js
   ```

## 생성될 사용자 목록

- edgeuser03@naver.com ~ edgeuser22@naver.com (총 20명)
- 비밀번호: @testpw00
- 기본 포인트: 30,000P
- 역할: user

## 주의사항

- 이미 존재하는 이메일은 건너뜁니다
- 생성 실패한 사용자는 결과에 표시됩니다
- API 제한을 피하기 위해 약간의 지연이 있습니다

