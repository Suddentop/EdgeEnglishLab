# 작업 환경 정의 및 루틴

www.edgeenglish.net 사이트 개발 시 사용하는 **세 가지 작업 환경**과, 환경별 브랜치·API·작업 루틴을 정의합니다.

---

## 1. 환경 정의

| 환경 | 목적 | AI 백엔드 | GitHub 브랜치 |
|------|------|-----------|----------------|
| **engquiz** | 빌드 후 **배포**용. 실제 서비스(edgeenglish.net)에 반영되는 코드. | **OpenAI API** (Firebase Functions 프록시) | `main` |
| **dev** | engquiz에 반영하기 **전** 변경·테스트용. 파일/코드/컴포넌트/디자인 수정 후 여기서 검증. | **OpenAI API** (Firebase Functions 프록시) | `dev` |
| **ollama** | engquiz와 **동일한 파일 구성**. AI만 OpenAI 대신 **Ollama(llama 3.2)** 로 학습·추론 개발. | **Ollama (llama 3.2)** | `ollama` |

---

## 2. 환경별로 할 일

### engquiz 환경에서 작업할 때

1. **브랜치**: GitHub에서 **engquiz(배포)용 파일** 사용 → `main` 브랜치 사용.
2. **로컬 동기화**:
   ```powershell
   git fetch origin
   git checkout main
   git pull origin main
   ```
3. **설정**: `.env.local` 에서 `REACT_APP_API_PROXY_URL` = **Firebase OpenAI 프록시** (`https://us-central1-edgeenglishlab.cloudfunctions.net/openaiProxy`).
4. **작업**: 배포할 코드만 수정. 테스트는 dev에서 끝낸 뒤 반영.

### dev 환경에서 작업할 때

1. **브랜치**: GitHub에서 **dev용 파일** 사용 → `dev` 브랜치 사용.
2. **로컬 동기화**:
   ```powershell
   git fetch origin
   git checkout dev
   git pull origin dev
   ```
3. **설정**: `.env.local` 에서 `REACT_APP_API_PROXY_URL` = **Firebase OpenAI 프록시** (engquiz와 동일: `https://us-central1-edgeenglishlab.cloudfunctions.net/openaiProxy`).
4. **작업**: 파일/코드/컴포넌트/디자인 변경 후 **여기서 테스트**. 완료되면 engquiz(`main`)와 동기화한 뒤, engquiz에서 빌드·배포.
5. **로컬(localhost) API 호출**: Firebase Functions 프록시는 CORS를 허용하므로 **localhost에서 바로 호출 가능**. 별도 setupProxy 불필요.

### ollama 환경에서 작업할 때

1. **브랜치**: GitHub에서 **ollama용 파일** 사용 → `ollama` 브랜치 사용.
2. **로컬 동기화**:
   ```powershell
   git fetch origin
   git checkout ollama
   git pull origin ollama
   ```
3. **설정**: `.env.local` 에서 `REACT_APP_API_PROXY_URL` = **Ollama 프록시** (`http://localhost:4000`). `npm run proxy:ollama` 실행 필요.
4. **작업**: AI 모델 학습·추론만 Ollama(llama 3.2)로 개발. 코드 구조는 engquiz와 동일하게 유지.

---

## 3. 매 작업 전 루틴 (체크리스트)

작업을 시작하기 전에 아래를 확인합니다.

- [ ] **지금 어떤 환경에서 작업하는지** 정했는가? (engquiz / dev / ollama)
- [ ] **현재 브랜치**가 그 환경에 맞는가?
  - engquiz → `main`
  - dev → `dev`
  - ollama → `ollama`
- [ ] **해당 브랜치 최신**인가? (`git fetch origin` 후 `git pull origin <브랜치>`)
- [ ] **.env.local** 이 해당 환경에 맞는가?
  - engquiz, dev → Firebase OpenAI 프록시 URL
  - ollama → `http://localhost:4000` (그리고 Ollama 프록시 실행 여부)

환경을 바꿀 때마다 위 체크리스트를 한 번씩 수행합니다.

---

## 4. 환경 전환 요약

| 하려는 일 | 사용할 환경 | 브랜치 | API |
|-----------|-------------|--------|-----|
| 배포용 코드 수정·빌드·배포 | engquiz | `main` | OpenAI |
| 새 기능/UI 수정 후 테스트 | dev | `dev` | OpenAI |
| Ollama로 AI 학습·추론 실험 | ollama | `ollama` | Ollama |

---

## 5. 스크립트로 전환하기

PowerShell 스크립트로 한 번에 브랜치 전환·안내까지 하려면:

```powershell
.\scripts\switch-environment.ps1 -Environment engquiz   # main + OpenAI 안내
.\scripts\switch-environment.ps1 -Environment dev       # dev + OpenAI 안내
.\scripts\switch-environment.ps1 -Environment ollama     # ollama + Ollama 안내
```

(스크립트는 `scripts/switch-environment.ps1` 에 정의됨.)

---

## 6. API 프록시 (Firebase 사용 시)

**engquiz·dev**는 **Firebase Functions openaiProxy**를 사용합니다. (`REACT_APP_API_PROXY_URL=https://us-central1-edgeenglishlab.cloudfunctions.net/openaiProxy`)

- Firebase는 **CORS를 허용**하므로 localhost·edgeenglish.net 어디서든 동일 URL로 호출 가능.
- PHP(edgeenglish.net) 프록시를 쓰는 경우에만 `getEffectiveProxyUrl()`·setupProxy가 사용됨. (참고: `docs/CORS_AND_API_PROXY.md`)

---

## 7. 빌드 및 배포 (환경 구분 요약)

**중요**: 앱 코드는 **Git 브랜치를 읽지 않습니다**. 환경 구분은 **브랜치(수동)** + **.env.local의 REACT_APP_API_PROXY_URL**로만 이루어집니다.

| 목적 | 브랜치 | .env.local REACT_APP_API_PROXY_URL | 빌드 후 |
|------|--------|-------------------------------------|---------|
| **edgeenglish.net 배포** | `main` (또는 `dev`에서 머지 후) | `https://us-central1-edgeenglishlab.cloudfunctions.net/openaiProxy` | `npm run build` → build 폴더를 서버에 배포 |
| **로컬 테스트(OpenAI)** | `main` / `dev` | `https://us-central1-edgeenglishlab.cloudfunctions.net/openaiProxy` | `npm start`로 동일 설정 사용 |
| **Ollama 로컬 개발** | `ollama` | `http://localhost:4000` | 이 설정으로 빌드하면 **배포용이 아님** (build-safe.js에서 경고 출력) |

**배포용 빌드 체크리스트**:

1. 배포할 브랜치로 전환 (`main` 또는 dev 머지 후).
2. `.env.local`에 `REACT_APP_API_PROXY_URL=https://us-central1-edgeenglishlab.cloudfunctions.net/openaiProxy` 인지 확인.
3. `npm run build` 실행.
4. `build` 폴더를 edgeenglish.net 서버에 업로드.

`REACT_APP_API_PROXY_URL`이 `localhost:4000`인 상태로 빌드하면, 그 빌드는 edgeenglish.net에 배포하면 안 됩니다. Ollama 로컬 전용입니다.
