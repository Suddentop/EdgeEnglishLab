# 🔐 보안 가이드

## API 키 관리

### ⚠️ 중요 사항
- **절대 API 키를 코드에 하드코딩하지 마세요**
- **GitHub에 API 키를 커밋하지 마세요**
- **환경 변수만 사용하세요**

### 🔑 API 키 설정 방법

1. **환경 변수 파일 생성**
   ```bash
   cp env.example .env
   ```

2. **API 키 설정**
   ```bash
   # .env 파일에서
   REACT_APP_OPENAI_API_KEY=your_actual_api_key_here
   ```

3. **파일 확인**
   ```bash
   # .env 파일이 Git에서 제외되는지 확인
   git status
   # .env 파일이 나타나지 않아야 함
   ```

### 🛡️ 보안 도구

#### Pre-commit Hook
- API 키 커밋 방지
- 자동으로 민감한 정보 검사
- `.git/hooks/pre-commit` 파일에 설정됨

#### .gitignore 설정
- `.env` 파일 자동 제외
- 키 파일들 자동 제외
- 개발/프로덕션 환경 변수 파일들 제외

### 🚨 문제 발생 시

#### API 키 노출 시
1. **즉시 키 비활성화**
2. **새 키 생성**
3. **Git 히스토리 정리** (필요시)
4. **팀원들에게 새 키 공유**

#### Git 히스토리에서 키 제거
```bash
# Git 히스토리에서 .env 파일 제거
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch .env' \
--prune-empty --tag-name-filter cat -- --all

# 강제 푸시 (주의: 팀 작업 시 협의 필요)
git push origin --force --all
```

### 📋 체크리스트

#### 개발 전
- [ ] `.env` 파일 생성
- [ ] API 키 환경 변수로 설정
- [ ] 코드에 하드코딩 없음 확인

#### 커밋 전
- [ ] Pre-commit hook 실행 확인
- [ ] 민감한 정보 검사 통과
- [ ] `.env` 파일 커밋되지 않음 확인

#### 배포 전
- [ ] 프로덕션 환경 변수 설정
- [ ] API 키 권한 최소화
- [ ] 모니터링 설정

### 🔄 정기 관리

- **3개월마다 API 키 교체**
- **팀원들과 보안 가이드 공유**
- **정기적인 보안 검토**

---

**보안은 모든 팀원의 책임입니다. 의심스러운 활동을 발견하면 즉시 보고하세요.**
