# 🔒 보안 가이드

## API 키 보안 관리

### ⚠️ 중요 경고
- **절대로 실제 API 키를 Git 저장소에 커밋하지 마세요!**
- 모든 API 키는 예시값으로만 제공됩니다.

### 환경 변수 파일 관리

#### 1. **로컬 개발용**
```bash
# .env.local 파일 생성 (Git에 커밋되지 않음)
cp env.local.example .env.local
# 실제 API 키 입력
```

#### 2. **프로덕션 배포용**
- 실제 서버에서는 환경 변수를 직접 설정
- `production.env`는 예시값만 포함

#### 3. **보호되는 파일들**
- `.env`
- `.env.local`
- `.env.development.local`
- `.env.test.local`
- `.env.production.local`
- `production.env`
- `*.key`
- `*.pem`
- `secrets/`

### Firebase API 키 보안

Firebase API 키는 클라이언트에서 노출될 수 있지만, 다음 보안 규칙을 적용하세요:

1. **Firestore 보안 규칙** 설정
2. **Firebase Authentication** 활성화
3. **API 키 도메인 제한** 설정
4. **Firebase Console에서 앱 제한** 설정

### OpenAI API 키 보안

OpenAI API 키는 절대 클라이언트에 노출되어서는 안 됩니다:

1. **백엔드 프록시 서버** 사용 (권장)
2. **환경 변수**로 서버에서만 관리
3. **API 사용량 제한** 설정

### 배포 시 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] 실제 API 키가 예시값으로 변경되었는지 확인
- [ ] `production.env`가 `.gitignore`에 포함되어 있는지 확인
- [ ] 서버 환경 변수에 실제 키가 설정되어 있는지 확인

### 응급 상황 대응

만약 실수로 API 키가 노출되었다면:

1. **즉시 API 키 재발급**
2. **Git 히스토리에서 제거** (`git filter-branch` 사용)
3. **서버 환경 변수 업데이트**
4. **Firebase Console에서 앱 제한 확인**

## 연락처

보안 관련 문의: [보안 담당자 연락처]
