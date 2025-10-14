# Work 컴포넌트 내역 저장 기능 추가 가이드

## ✅ 완료된 작업

1. **Work_01_ArticleOrder**: ✅ 완료
2. **Work_02_ReadingComprehension**: ✅ 완료
3. **패키지#01, #02, #03**: ✅ 완료

## 🔧 나머지 Work 컴포넌트 업데이트 방법

### 공통 패턴

각 Work 컴포넌트에 다음 두 단계를 추가하면 됩니다:

#### 1단계: Import 추가

파일 상단에 다음 import 추가:

```typescript
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
```

#### 2단계: 문제 생성 완료 후 내역 저장 코드 추가

`setQuiz()` 또는 유사한 함수가 호출되는 곳 **바로 다음**에 추가:

```typescript
// 문제 생성 내역 저장
if (userData?.uid && workTypePoints.length > 0) {
  try {
    const workTypePoint = workTypePoints.find(wt => wt.id === '[FIREBASE_ID]');
    await saveQuizWithPDF({
      userId: userData.uid,
      userName: userData.name || '사용자',
      userNickname: userData.nickname || '사용자',
      workTypeId: '[WORK_ID]',
      workTypeName: getWorkTypeName('[WORK_ID]'),
      points: workTypePoint?.points || 0,
      inputText: [입력텍스트변수명],
      quizData: [퀴즈데이터변수명],
      status: 'success'
    });
    console.log('✅ Work_[WORK_ID] 내역 저장 완료');
  } catch (historyError) {
    console.error('❌ Work_[WORK_ID] 내역 저장 실패:', historyError);
  }
}
```

---

## 📋 각 Work 컴포넌트별 설정

### Work_03_VocabularyWord

```typescript
// 파일: src/components/work/Work_03_VocabularyWord/Work_03_VocabularyWord.tsx

// 1. Import 추가 (기존 import 섹션에)
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';

// 2. setQuiz(quizData) 호출 직후 추가
if (userData?.uid && workTypePoints.length > 0) {
  try {
    const workTypePoint = workTypePoints.find(wt => wt.id === '3');
    await saveQuizWithPDF({
      userId: userData.uid,
      userName: userData.name || '사용자',
      userNickname: userData.nickname || '사용자',
      workTypeId: '03',
      workTypeName: getWorkTypeName('03'),
      points: workTypePoint?.points || 0,
      inputText: inputText,  // 실제 변수명 확인 필요
      quizData: quizData,
      status: 'success'
    });
    console.log('✅ Work_03 내역 저장 완료');
  } catch (historyError) {
    console.error('❌ Work_03 내역 저장 실패:', historyError);
  }
}
```

### Work_04_BlankPhraseInference

```typescript
// Firebase ID: '4'
// Work ID: '04'
// 입력 텍스트 변수: inputText (확인 필요)
// 퀴즈 데이터 변수: quizData (확인 필요)

const workTypePoint = workTypePoints.find(wt => wt.id === '4');
workTypeId: '04',
```

### Work_05_BlankSentenceInference

```typescript
// Firebase ID: '5'
// Work ID: '05'

const workTypePoint = workTypePoints.find(wt => wt.id === '5');
workTypeId: '05',
```

### Work_06_SentencePosition

```typescript
// Firebase ID: '6'
// Work ID: '06'

const workTypePoint = workTypePoints.find(wt => wt.id === '6');
workTypeId: '06',
```

### Work_07_MainIdeaInference

```typescript
// Firebase ID: '7'
// Work ID: '07'

const workTypePoint = workTypePoints.find(wt => wt.id === '7');
workTypeId: '07',
```

### Work_08_TitleInference

```typescript
// Firebase ID: '8'
// Work ID: '08'

const workTypePoint = workTypePoints.find(wt => wt.id === '8');
workTypeId: '08',
```

### Work_09_GrammarError

```typescript
// Firebase ID: '9'
// Work ID: '09'

const workTypePoint = workTypePoints.find(wt => wt.id === '9');
workTypeId: '09',
```

### Work_10_MultiGrammarError

```typescript
// Firebase ID: '10'
// Work ID: '10'

const workTypePoint = workTypePoints.find(wt => wt.id === '10');
workTypeId: '10',
```

### Work_11_SentenceTranslation

```typescript
// Firebase ID: '11'
// Work ID: '11'

const workTypePoint = workTypePoints.find(wt => wt.id === '11');
workTypeId: '11',
```

### Work_13_BlankFillWord

```typescript
// Firebase ID: '13'
// Work ID: '13'

const workTypePoint = workTypePoints.find(wt => wt.id === '13');
workTypeId: '13',
```

### Work_14_BlankFillSentence

```typescript
// Firebase ID: '14'
// Work ID: '14'

const workTypePoint = workTypePoints.find(wt => wt.id === '14');
workTypeId: '14',
```

---

## 🔍 코드 삽입 위치 찾는 방법

각 Work 컴포넌트에서 다음 패턴을 찾으세요:

1. `setQuiz(` 를 검색
2. 또는 `setQuizData(` 를 검색
3. 또는 유사한 상태 업데이트 함수 검색

예시:
```typescript
// 이런 패턴을 찾으세요
const quizData = await generateSomeQuiz(input);
setQuiz(quizData);  // ← 이 줄 바로 다음에 내역 저장 코드 추가

// 또는
setQuizData({
  ...someData
});  // ← 이 블록 바로 다음에 내역 저장 코드 추가
```

---

## ⚠️ 주의사항

1. **변수명 확인**: 각 컴포넌트마다 `inputText`, `text`, `passage` 등 다른 이름을 사용할 수 있음
2. **퀴즈 데이터 변수명**: `quiz`, `quizData`, `blankQuiz` 등 다양할 수 있음
3. **async/await**: 이미 async 함수 안에 있어야 함
4. **workTypePoints**: 이미 컴포넌트에 로드되어 있어야 함 (대부분 이미 있음)

---

## 🧪 테스트 방법

1. 해당 Work 컴포넌트에서 문제 생성
2. 브라우저 콘솔에서 "✅ Work_XX 내역 저장 완료" 메시지 확인
3. "내정보" 페이지에서 생성 내역 확인
4. 7일 이내 PDF 다운로드 가능 확인

---

## 📝 예제: Work_03 완전한 코드

```typescript
// src/components/work/Work_03_VocabularyWord/Work_03_VocabularyWord.tsx

import React, { useState, useRef, useEffect } from 'react';
// ... 기타 imports ...
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';  // ← 추가
import { useAuth } from '../../../contexts/AuthContext';

const Work_03_VocabularyWord: React.FC = () => {
  const { userData, loading } = useAuth();
  // ... 기타 states ...

  const handleGenerateQuiz = async () => {
    try {
      // ... 문제 생성 로직 ...
      
      const quizData = await generateBlankQuiz(inputText);
      setQuiz(quizData);

      // ↓↓↓ 여기에 추가 ↓↓↓
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          const workTypePoint = workTypePoints.find(wt => wt.id === '3');
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '03',
            workTypeName: getWorkTypeName('03'),
            points: workTypePoint?.points || 0,
            inputText: inputText,
            quizData: quizData,
            status: 'success'
          });
          console.log('✅ Work_03 내역 저장 완료');
        } catch (historyError) {
          console.error('❌ Work_03 내역 저장 실패:', historyError);
        }
      }
      // ↑↑↑ 여기까지 ↑↑↑

    } catch (error) {
      // ... 에러 처리 ...
    }
  };

  return (
    // ... JSX ...
  );
};
```

---

## 🚀 자동화 옵션

모든 Work 컴포넌트를 수동으로 업데이트하는 대신, 다음과 같은 방법도 고려할 수 있습니다:

1. **검색/치환 도구 사용**: VSCode의 다중 파일 검색/치환
2. **스크립트 작성**: Node.js 스크립트로 일괄 패치
3. **AI 코딩 도구**: GitHub Copilot, Cursor AI 등 활용

---

## ✅ 진행 상황 체크리스트

- [x] Work_01_ArticleOrder
- [x] Work_02_ReadingComprehension
- [ ] Work_03_VocabularyWord
- [ ] Work_04_BlankPhraseInference
- [ ] Work_05_BlankSentenceInference
- [ ] Work_06_SentencePosition
- [ ] Work_07_MainIdeaInference
- [ ] Work_08_TitleInference
- [ ] Work_09_GrammarError
- [ ] Work_10_MultiGrammarError
- [ ] Work_11_SentenceTranslation
- [ ] Work_13_BlankFillWord
- [ ] Work_14_BlankFillSentence

---

## 💡 도움말

문제가 발생하거나 특정 컴포넌트의 구조가 다르다면:
1. 해당 파일의 구조를 먼저 파악
2. `setQuiz` 호출 위치 확인
3. 변수명 확인
4. async/await 확인
5. 필요시 개별 지원 요청

