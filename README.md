# 📚 EngQuiz - 영어 퀴즈 생성 및 관리 시스템

AI 기반 영어 퀴즈 생성과 전화번호 기반 회원가입 시스템을 갖춘 종합 영어 학습 웹 애플리케이션입니다.

## ✨ 주요 기능

### 🤖 AI 기반 다양한 문제 유형
- **14가지 문제 유형** 지원 (순서 맞추기, 독해, 어휘, 빈칸 추론 등)
- **OpenAI GPT-4**를 활용한 자연어 처리
- 의미와 주제를 분석하여 자연스러운 문제 생성

### 🔐 전화번호 기반 인증 시스템
- 전화번호를 로그인 ID로 사용
- Firebase Authentication 연동
- 간편하고 안전한 회원가입/로그인

### 💰 포인트 시스템
- 문제 생성 시 포인트 차감
- 포인트 충전 및 관리 기능
- 관리자 포인트 관리 시스템

### 🖨️ 인쇄 기능
- A4 용지에 최적화된 인쇄 레이아웃
- 문제, 선택지, 정답 포함
- 각 문제 유형별 맞춤 인쇄 형식

## 🚀 시작하기

### 1. 프로젝트 클론
```bash
git clone https://github.com/Suddentop/EdgeEngliahLab.git
cd engquiz
```

### 2. 의존성 설치
```bash
npm install
cd functions
npm install
cd ..
```

### 3. 환경 설정
- **Firebase**: 프로젝트 루트에 `.env.local` 생성 후 Firebase·API 프록시 변수 설정.
- **AI API(문제 생성)**: `REACT_APP_API_PROXY_URL` 필수. 예: `https://us-central1-edgeenglishlab.cloudfunctions.net/openaiProxy` (Firebase OpenAI) 또는 `http://localhost:4000` (Ollama 로컬용).
- 환경별 브랜치·설정 루틴: **`WORK_ENVIRONMENTS.md`** 참고.  
- CORS·프록시 구현 설명: **`docs/CORS_AND_API_PROXY.md`** 참고.

예시 `.env.local`:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_API_PROXY_URL=https://us-central1-edgeenglishlab.cloudfunctions.net/openaiProxy
```

### 4. 개발 서버 실행
```bash
npm start
```

### 5. Firebase Functions 배포
```bash
cd functions
firebase deploy --only functions
```

## 🔧 기술 스택

- **Frontend**: React 18, TypeScript
- **Backend**: Firebase Functions
- **Database**: Firestore
- **Authentication**: Firebase Auth
- **AI**: OpenAI GPT-4 API
- **Styling**: CSS3 with modular design
- **Build Tool**: Create React App

## 📱 지원 문제 유형

1. **Work_01**: 문장 순서 맞추기
2. **Work_02**: 독해 문제
3. **Work_03**: 어휘 문제
4. **Work_04**: 구문 빈칸 추론
5. **Work_05**: 문장 빈칸 추론
6. **Work_06**: 문장 위치 찾기
7. **Work_07**: 주제 추론
8. **Work_08**: 제목 추론
9. **Work_09**: 문법 오류 찾기
10. **Work_10**: 다중 문법 오류
11. **Work_11**: 문장 번역
12. **Work_12**: 단어 학습
13. **Work_13**: 단어 빈칸 채우기
14. **Work_14**: 문장 빈칸 채우기

## 🏗️ 프로젝트 구조

```
src/
├── components/
│   ├── work/                 # 각 문제 유형별 컴포넌트
│   ├── auth/                 # 인증 관련 컴포넌트
│   ├── admin/                # 관리자 기능
│   ├── common/               # 공통 컴포넌트
│   └── layout/               # 레이아웃 컴포넌트
├── services/                 # API 서비스
├── utils/                    # 유틸리티 함수
├── contexts/                 # React Context
└── firebase/                 # Firebase 설정
```

## 🔑 인증 시스템

- 이메일/비밀번호 기반 회원가입/로그인
- Firebase Authentication 연동
- 전화번호는 사용자 정보로 저장 (인증에는 사용되지 않음)
- 자동 포인트 초기화

## 📝 라이선스

© 2024 EngQuiz. All rights reserved.

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.
