# 유형#09, 10 및 패키지#01, 02-유형#09, 10 공통 어법 문제 금지 목록

## 개요

이 문서는 **유형#09 (어법 오류 찾기)**, **유형#10 (다중 어법 오류 찾기)**, 그리고 **패키지#01, 패키지#02의 유형#09, 10**에 공통으로 적용되는 어법 문제 금지 목록을 정리한 것입니다.

모든 금지 규칙은 `src/services/workGrammarRules.ts` 파일에 정의되어 있으며, 다음 4가지 방식으로 적용됩니다:

1. **FORBIDDEN_TRANSFORMATIONS_PROMPT**: AI 프롬프트에 포함되어 변형 생성 시 금지
2. **FORBIDDEN_EXAMPLES_PROMPT**: AI 프롬프트에 포함되어 금지 예시 제공
3. **EXCLUDE_RULES_PROMPT**: 단어 선택 시 필터링 규칙
4. **validateTransformation()**: 코드 레벨 검증 함수

---

## 1. 절대 금지 변형 규칙

### 1.1 완전히 다른 단어로 변형 금지
- **금지**: 전혀 관련 없는 단어로 변형
- **예시**: 
  - `"though" → "thought"` ❌ (완전히 다른 단어: "though" = 접속사/부사, "thought" = 명사/동사)
  - `"through" → "thorough"` ❌
  - `"whether" → "weather"` ❌
  - `"desert" → "dessert"` ❌
  - `"principal" → "principle"` ❌
- **이유**: 철자 오류가 아닌 문법 오류 문제이므로, 문법적으로 관련된 단어여야 함

---

### 1.2 조동사에 "-ing" 추가 금지
- **금지**: 조동사에 "-ing"를 붙여서 존재하지 않는 단어 생성
- **예시**:
  - `"could" → "coulding"` ❌
  - `"should" → "shoulding"` ❌
  - `"would" → "woulding"` ❌
  - `"can" → "caning"` ❌
  - `"may" → "maying"` ❌
  - `"might" → "mighting"` ❌
  - `"must" → "musting"` ❌
  - `"will" → "willing"` ❌
  - `"shall" → "shalling"` ❌
- **허용**: 조동사끼리 교체는 가능
  - `"could" → "should"` ✅
  - `"would" → "could"` ✅
- **이유**: 조동사에 "-ing"를 붙인 단어는 영어에 존재하지 않음

---

### 1.3 부사/접속사/wh-단어에 "-ly" 추가 금지
- **금지**: 이미 부사/접속사/wh-단어인 단어에 "-ly"를 추가하여 존재하지 않는 단어 생성
- **예시**:
  - `"however" → "howeverly"` ❌
  - `"rather" → "ratherly"` ❌
  - `"what" → "whatly"` ❌
  - `"why" → "whyly"` ❌
  - `"where" → "wherely"` ❌
  - `"how" → "howly"` ❌
  - `"whatever" → "whateverly"` ❌
  - `"nevertheless" → "neverthelessly"` ❌
  - `"moreover" → "moreoverly"` ❌
  - `"furthermore" → "furthermorely"` ❌
  - `"therefore" → "thereforely"` ❌
  - `"thus" → "thusly"` ❌
- **이유**: 이미 부사/접속사/wh-단어인 단어는 다시 부사로 만들 수 없으며, 이러한 단어들은 영어에 존재하지 않고 사용되지도 않음

---

### 1.4 주어 대명사를 소유격으로 변형 금지
- **금지**: 주어로 사용된 대명사를 소유격으로 변형
- **예시**:
  - `"it" → "its"` ❌ (주어로 사용된 경우)
  - `"they" → "their"` ❌
  - `"he" → "his"` ❌
  - `"she" → "her"` ❌
  - `"I" → "my"` ❌
  - `"you" → "your"` ❌
  - `"we" → "our"` ❌
  - `"this" → "this's"` ❌ (존재하지 않음)
  - `"that" → "that's"` ❌ (축약형이지 소유격 아님)
  - `"those" → "those's"` ❌ (존재하지 않음)
  - `"these" → "these's"` ❌ (존재하지 않음)
- **이유**: 너무 단순하고 기계적인 변형이며, 의미 있는 문법 오류를 만들지 않음

---

### 1.5 주어 대명사를 다른 주어 대명사로 변형 금지
- **금지**: 주어 대명사를 다른 주어 대명사로 단순 교체
- **예시**:
  - `"they" → "those"` ❌
  - `"this" → "that"` ❌
  - `"these" → "those"` ❌
  - `"I" → "you"` ❌
  - `"he" → "she"` ❌
- **이유**: 단순한 대명사 교체이며, 의미 있는 문법 오류가 아님

---

### 1.6 주어-be동사 수일치 깨는 변형 금지
- **금지**: 주어와 be동사의 수일치를 깨는 변형
- **예시**:
  - `"they are" → "they am"` ❌
  - `"I am" → "I is"` ❌
  - `"you are" → "you am"` ❌
  - `"he is" → "he am"` ❌
  - `"she is" → "she am"` ❌
  - `"that is" → "that are"` ❌
  - `"this is" → "this am"` ❌
  - `"they are" → "they is"` ❌
  - `"I am" → "I are"` ❌
- **허용**: 시제 변경은 허용되지만 수일치는 유지되어야 함
  - `"is" → "was"` ✅
  - `"are" → "were"` ✅
  - `"they are" → "they were"` ✅
- **이유**: 기본 주어-동사 일치 규칙을 깨는 것은 너무 단순한 오류

---

### 1.7 be동사를 단순히 "being"으로 변형 금지
- **금지**: be동사를 단순히 "being"으로 변형
- **예시**:
  - `"is" → "being"` ❌
  - `"are" → "being"` ❌
  - `"was" → "being"` ❌
  - `"were" → "being"` ❌
  - `"there is" → "there being"` ❌
  - `"there are" → "there being"` ❌
  - `"Language is" → "Language being"` ❌
- **허용**: 시제 변경은 허용
  - `"is" → "was"` ✅
  - `"are" → "were"` ✅
- **이유**: 너무 단순하고 기계적인 변형이며, 의미 있는 문법 오류를 만들지 않음

---

### 1.8 주어+동사를 주어+동사ing로 변경 금지 (be동사 없이)
- **금지**: be동사 없이 주어+동사를 주어+동사ing로 변경
- **예시**:
  - `"they work" → "they working"` ❌
  - `"they rely" → "they relying"` ❌
  - `"it consist" → "it consisting"` ❌
  - `"they fill" → "they filling"` ❌
- **허용**: be동사를 포함한 변형은 허용
  - `"they work" → "they are working"` ✅
  - `"they rely" → "they are relying"` ✅
- **이유**: 주어+동사ing 구조는 be동사가 필요하며, be동사 없이는 비문법적 구조가 됨

---

### 1.9 "to + 동사원형" → "to + 동사ing" 변형 금지
- **금지**: to 부정사에서 "to + 동사원형"을 "to + 동사ing"로 변형
- **예시**:
  - `"to continue" → "to continuing"` ❌
  - `"to rely" → "to relying"` ❌
  - `"to fill" → "to filling"` ❌
  - `"to prey" → "to preying"` ❌
- **허용**: 다른 형태의 변형은 허용
  - `"to continue" → "continuing"` ✅ (to 제거)
  - `"to continue" → "to be continued"` ✅ (수동태)
  - `"to continue" → "to be continuing"` ✅ (진행형)
  - `"to continue" → "to have been continued"` ✅ (완료 수동태)
- **이유**: "to + 동사ing" 패턴은 영어에 존재하지 않음

---

### 1.10 등위접속사 선택 금지
- **금지**: 등위접속사를 선택하여 어법 변형 문제 생성
- **등위접속사 목록**: `or`, `and`, `but`, `nor`, `for`, `so`, `yet`
- **예시**:
  - `"or" → "and"` ❌
  - `"and" → "or"` ❌
  - `"but" → "and"` ❌
- **이유**: 단순한 단어 교체이며, 해석이나 판단이 필요한 의미 있는 문법 오류가 아님

---

### 1.11 조동사 다음 동사를 단순히 동사ing로 변형 금지
- **금지**: 조동사 다음 동사를 be동사 없이 단순히 동사ing로 변형
- **예시**:
  - `"can prey" → "can praying"` ❌
  - `"can rely" → "can relying"` ❌
  - `"can consist" → "can consisting"` ❌
  - `"can fill" → "can filling"` ❌
- **허용**: be동사를 포함한 변형은 허용
  - `"can prey" → "can be preying"` ✅
  - `"can prey" → "can have preyed"` ✅ (완료형)
  - `"can prey" → "should prey"` ✅ (조동사 교체)
  - `"may prey" → "might prey"` ✅ (조동사 교체)
- **이유**: 조동사 다음에는 동사원형이 와야 하는 기본 어법을 무시함

---

## 2. 단어 선택 시 제외 규칙 (EXCLUDE_RULES_PROMPT)

단어 선택 단계에서 다음 규칙들은 자동으로 제외됩니다:

### 2.1 기본 문법 규칙 제외
- **조동사+동사원형**: `can do`, `should go` 등
- **규칙과거형(-ed)**: `worked`, `played` 등
- **3인칭-s/-es**: `works`, `plays` 등 (동사원형+-s/-es)
- **단순 단복수**: `book/books`, `child/children` 등
- **기본 관사**: `a`, `an`, `the`
- **단순 전치사**: `in`, `on`, `at`, `by` 등
- **초급 시제**: 기본적인 시제 변형
- **be동사 단순형**: `it was/were`, `they was/were` 등
- **주어-동사 시제일치**: `1인칭/2인칭+동사원형`, `3인칭+동사원형+s/-es` 등
- **고유명사**: 사람 이름, 지명 등

### 2.2 특별 금지 규칙 (단어 선택 시)
- **to 부정사 단순 변형**: `to+동사원형 → to+동사ing` (예: `to rely → to relying`)
- **주어-be동사 수일치 깨는 변형**: `they are → they am`, `I am → I is` 등
- **존재하지 않는 단어 생성**: `however → howeverly`, `what → whatly` 등
- **주어 대명사를 다른 주어 대명사로 변형**: `they → those`, `this → that` 등
- **be동사를 단순히 "being"으로 변형**: `is → being`, `are → being` 등
- **일반동사를 주어+동사ing로 변경**: `work → working` (be동사 없이)
- **조동사 다음 동사를 단순히 동사ing로 변형**: `can prey → can praying` 등
- **등위접속사 선택**: `or`, `and`, `but`, `nor`, `for`, `so`, `yet` 등

---

## 3. 코드 레벨 검증 (validateTransformation 함수)

`validateTransformation()` 함수는 변형된 단어가 금지된 패턴인지 코드 레벨에서 검증합니다.

### 3.1 검증 항목
1. 조동사+ing 패턴 검증
2. 부사/접속사/wh-단어에 "-ly" 추가 패턴 검증
3. 주어 대명사를 소유격으로 변형 검증
4. 주어 대명사를 다른 주어 대명사로 변형 검증
5. be동사를 단순히 "being"으로 변형 검증
6. 일반동사를 주어+동사ing로 변경 검증 (be동사 없이)
7. 주어-be동사 수일치 깨는 변형 검증
8. 완전히 다른 단어인지 확인
9. "to + 동사ing" 패턴 검증
10. 등위접속사 선택 검증
11. 조동사 다음 동사를 단순히 동사ing로 변형 검증

### 3.2 검증 결과
- **isValid: false**: 금지된 변형으로 판단, errorMessage 제공
- **isValid: true**: 허용된 변형

---

## 4. 적용 범위

### 4.1 적용되는 유형
- ✅ **유형#09** (어법 오류 찾기)
- ✅ **유형#10** (다중 어법 오류 찾기)
- ✅ **패키지#01 - 유형#09**
- ✅ **패키지#01 - 유형#10**
- ✅ **패키지#02 - 유형#09**
- ✅ **패키지#02 - 유형#10**

### 4.2 적용 방식
1. **AI 프롬프트**: `FORBIDDEN_TRANSFORMATIONS_PROMPT`, `FORBIDDEN_EXAMPLES_PROMPT`가 프롬프트에 포함
2. **단어 선택 필터링**: `EXCLUDE_RULES_PROMPT`가 단어 선택 프롬프트에 포함
3. **코드 검증**: `validateTransformation()` 함수가 변형 결과를 검증

---

## 5. 허용되는 변형 예시

### 5.1 조동사 관련
- ✅ `"could" → "should"` (조동사 교체)
- ✅ `"would" → "could"` (조동사 교체)
- ✅ `"can prey" → "can be preying"` (조동사 + be + v-ing)
- ✅ `"can prey" → "can have preyed"` (조동사 + have + p.p)
- ✅ `"may prey" → "might prey"` (조동사 교체)

### 5.2 be동사 관련
- ✅ `"is" → "was"` (시제 변경)
- ✅ `"are" → "were"` (시제 변경)
- ✅ `"they are" → "they were"` (시제 변경, 수일치 유지)

### 5.3 동사 형태 관련
- ✅ `"they work" → "they are working"` (be동사 포함)
- ✅ `"to continue" → "continuing"` (to 제거)
- ✅ `"to continue" → "to be continued"` (수동태)
- ✅ `"to continue" → "to be continuing"` (진행형)
- ✅ `"to continue" → "to have been continued"` (완료 수동태)

---

## 6. 금지 규칙 요약표

| 번호 | 금지 규칙 | 주요 예시 | 이유 |
|------|----------|----------|------|
| 1 | 완전히 다른 단어로 변형 | `though → thought` | 문법 오류가 아닌 철자 오류 |
| 2 | 조동사에 "-ing" 추가 | `could → coulding` | 존재하지 않는 단어 |
| 3 | 부사/접속사/wh-단어에 "-ly" 추가 | `however → howeverly` | 존재하지 않는 단어 |
| 4 | 주어 대명사 → 소유격 | `it → its` | 너무 단순한 변형 |
| 5 | 주어 대명사 → 다른 주어 대명사 | `they → those` | 단순 교체 |
| 6 | 주어-be동사 수일치 깨기 | `they are → they am` | 기본 규칙 위반 |
| 7 | be동사 → "being" | `is → being` | 너무 단순한 변형 |
| 8 | 주어+동사 → 주어+동사ing (be동사 없이) | `they work → they working` | 비문법적 구조 |
| 9 | to+동사원형 → to+동사ing | `to continue → to continuing` | 존재하지 않는 패턴 |
| 10 | 등위접속사 선택 | `or → and` | 단순 교체 |
| 11 | 조동사+동사 → 조동사+동사ing (be동사 없이) | `can prey → can praying` | 기본 어법 위반 |

---

## 7. 파일 위치

- **금지 규칙 정의**: `src/services/workGrammarRules.ts`
- **유형#09 서비스**: `src/services/work09Service.ts`
- **유형#10 서비스**: `src/services/work10Service.ts`
- **패키지#01**: `src/components/work/Package_01_MultiQuizGenerater/Package_01_MultiQuizGenerater.tsx`
- **패키지#02**: `src/components/work/Package_02_TwoStepQuiz/Package_02_TwoStepQuiz.tsx`

---

**참고**: 이 금지 목록은 모든 어법 문제 생성 시 자동으로 적용되며, AI 프롬프트와 코드 레벨 검증을 통해 이중으로 보장됩니다.
