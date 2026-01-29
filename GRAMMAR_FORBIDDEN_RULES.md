# 유형#09, 10 및 패키지#01, 02-유형#09, 10 공통 어법 문제 금지 목록

## 가장 중요한 원칙 (최우선)

**변형된 어법(오답)은 반드시 그럴듯한 어법이어야 한다.**  
즉, **영어 문법에서 실제로 사용되는 형태**여야 하며, **영어 문법에 전혀 사용되지 않는 어법을 창조하면 안 된다.**

- ✅ **허용:** 문맥에서는 틀리지만, 다른 문맥에서는 쓰이는 **실제 영어 형태** (예: "I was"는 현재 맥락에서는 틀리지만 "was"는 영어에 존재하는 형태)
- ❌ **금지:** 영어에 존재하지 않는 형태를 만드는 것 (예: "coulding", "to continuing", "of be", "to to reinvent" — 이런 패턴은 영어에 없음)

오답은 "이 문맥에서는 틀린 선택"이어야 할 뿐, "세상에 없는 문법을 만든 것"이면 안 된다.

---

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

### 1.6 주어-be동사 수일치 깨는 변형 금지 (시제만 변경)
- **금지**: 주어와 be동사의 수일치를 깨는 변형
- **예시**:
  - `"they are" → "they am"` ❌
  - `"I am" → "I is"`, `"I am" → "I are"`, **`"I am" → "I were"`** ❌
  - `"you are" → "you am"` ❌
  - `"he is" → "he am"`, `"he is" → "he are"` ❌
  - `"she is" → "she am"`, `"she is" → "she are"` ❌
  - `"that is" → "that are"` ❌
  - `"this is" → "this am"` ❌
  - `"they are" → "they is"` ❌
- **허용 (시제만 변경, 수일치 유지)**:
  - `"I am" → "I was"` ✅ (I were 금지)
  - `"he/she/it is" → "he/she/it was"` ✅ (am, are 금지)
  - `"they are" → "they were"` ✅
  - `"is" → "was"`, `"are" → "were"` ✅
- **이유**: 주어+동사 변형 시 인칭 변환 없이 **시제만** 변경해야 함

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

### 1.8 인칭대명사+동사 → 인칭대명사+동사ing 금지 (be동사 없이) — 공통 규칙

**문장에 "인칭대명사(I/you/we/they/he/she/it) + 동사"가 나올 때** 적용되는 공통 규칙입니다. 특정 동사(suggest 등)만이 아닌 **모든 동사**에 적용됩니다.

- **금지**: 동사를 단순히 "동사+ing"로 바꿔 **"인칭대명사+동사ing"** 로 만드는 것
- **예시**:
  - `"They suggest" → "They suggesting"` ❌
  - `"We work" → "We working"` ❌
  - `"They rely" → "They relying"` ❌
  - `"They say" → "They saying"` ❌
- **이유**: 주어+동사ing 구조는 be동사가 필요하며, be동사 없이는 비문이다.

**✅ 인칭대명사+동사에서 동사를 변형할 때 허용 (우선 사용):**
  - **인칭대명사 + 수동태**: `They are suggested`, `We are told`
  - **인칭대명사 + have/has been + 과거분사**: `They have been suggested`, `We have been told`
  - **인칭대명사 + will + 동사원형**: `They will suggest`, `We will work`
  - **인칭대명사 + would/could/should + 동사원형**: `They would suggest`, `We could believe`

---

### 1.9 주어+동사 변형 시 인칭 변환 금지 — 시제만 변경

- **금지**: 주어+동사에서 동사를 **인칭/수에 맞춰** 변형하는 것
  - `"We buy" → "We buys"` ❌
  - `"They suggest" → "They suggests"` ❌
  - `"We believe" → "We believes"` ❌
- **허용**: **시제만** 변경
  - `"We buy" → "We bought"` ✅
  - `"They suggest" → "They suggested"` ✅
- **be동사**: 위 1.6 참조 — `I am` → `I was` (I were 금지), `he/she/it is` → `he/she/it was` (am, are 금지)

---

### 1.10 "to + 동사원형" → "to + 동사ing" 변형 금지
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

### 1.10a "to + 동사원형" → "to + to + 동사원형" 변형 금지
- **금지**: to 부정사에서 "to + 동사원형"을 변형할 때 "to + to + 동사원형"으로 만드는 것
- **예시**:
  - `"to reinvent" → "to to reinvent"` ❌
  - `"to rely" → "to to rely"` ❌
  - `"to fill" → "to to fill"` ❌
- **허용**: to 부정사 변형 시 올바른 형태만 사용
  - `"to reinvent" → "to be reinventing"` ✅ (to+be+~ing)
  - `"to reinvent" → "to be reinvented"` ✅ (to+be+~ed)
  - `"to continue" → "continuing"` ✅ (to 제거)
  - `"to continue" → "to have been continued"` ✅
- **이유**: "to+to+동사원형"은 영어 문법에 존재하지 않는 형태이며, to 부정사를 변형할 때는 반드시 "to+be+~ing", "to+be+~ed" 등 올바른 형태로만 변형해야 함

---

### 1.11 등위접속사 선택 금지
- **금지**: 등위접속사를 선택하여 어법 변형 문제 생성
- **등위접속사 목록**: `or`, `and`, `but`, `nor`, `for`, `so`, `yet`
- **예시**:
  - `"or" → "and"` ❌
  - `"and" → "or"` ❌
  - `"but" → "and"` ❌
- **이유**: 단순한 단어 교체이며, 해석이나 판단이 필요한 의미 있는 문법 오류가 아님

---

### 1.12 조동사 다음 동사를 단순히 동사ing로 변형 금지
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

### 1.13 전치사+동명사(of being 등) → 전치사+동사원형(of be) 변형 금지
- **금지**: 전치사 뒤의 동명사를 동사원형으로 변형하여 "전치사+동사원형" 비문 생성
- **예시**:
  - `"of being" → "of be"` ❌
  - `"for being" → "for be"` ❌
  - `"The thought of being" → "The thought of be"` ❌
- **이유**: 전치사(of, for 등) 뒤에는 명사 또는 동명사(gerund)가 와야 하며, 동사원형(be, have, do)을 쓸 수 없음. "being" → "be" 변형은 "of be" 등 비문을 만듦

---

### 1.13a "of being" → "of been", "of being being" 변형 금지
- **금지**: "of being"을 "of been" 또는 "of being being"으로 변형
- **예시**:
  - `"of being" → "of been"` ❌ ("of been"은 영어에 없는 형태)
  - `"of being" → "of being being"` ❌ ("of being being"은 영어에 없는 형태)
- **허용**: "of + 동명사" 변형 시 **of+being+과거분사** 또는 **of+being+~ing** 형태만 사용
  - `"of being" → "of being seen"`, `"of being done"` ✅
- **이유**: "of been", "of being being"은 영어 문법에 존재하지 않음

---

### 1.13b "of+동사ing" → "of+과거형" 변형 금지
- **금지**: "of + 일반동사ing"(of being, of having, of doing 등)를 "of + 과거형/과거분사"(of been, of had, of did 등)로 변형
- **허용**: "of + 동명사" 변형 시 **of+being+pp** 또는 **of+being+~ing** 형태만 사용 (of+being+과거분사, of+being+동사ing 등)
- **이유**: 전치사 "of" 뒤에는 명사/동명사가 와야 하며, 과거형 단독은 올 수 없음

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
- **to+to+동사원형 금지**: `to+동사원형 → to+to+동사원형` (예: `to reinvent → to to reinvent`) — 문법에 없는 형태. 변형 시 `to+be+~ing`, `to+be+~ed` 등만 사용
- **주어-be동사 수일치 깨는 변형**: `they are → they am`, `I am → I is` 등
- **존재하지 않는 단어 생성**: `however → howeverly`, `what → whatly` 등
- **주어 대명사를 다른 주어 대명사로 변형**: `they → those`, `this → that` 등
- **be동사를 단순히 "being"으로 변형**: `is → being`, `are → being` 등
- **인칭대명사+동사에서 동사를 단순히 동사+ing로**: `They suggest → They suggesting`, `We work → We working` 등 금지. 변형 시 인칭대명사+수동태, 인칭대명사+have/has been+과거분사, 인칭대명사+will+동사원형, 인칭대명사+would/could/should+동사원형 사용
- **3인칭 복수 주어(They, We) + 단수동사(-s)**: `They suggest → They suggests`, `We believe → We believes` (난이도 너무 낮음)
- **조동사 다음 동사를 단순히 동사ing로 변형**: `can prey → can praying` 등
- **등위접속사 선택**: `or`, `and`, `but`, `nor`, `for`, `so`, `yet` 등
- **전치사+동명사 → 전치사+동사원형**: `of being → of be`, `for being → for be` 등 (전치사 뒤에는 명사/동명사만 가능)
- **of being → of been, of being being**: 금지 (영어에 없는 형태). of+동명사 변형 시 of+being+pp, of+being+~ing 만 허용
- **of+동사ing → of+과거형**: `of being → of been` 등 금지. of+being+과거분사 또는 of+being+~ing 만 허용

---

## 3. 코드 레벨 검증 (validateTransformation 함수)

`validateTransformation()` 함수는 변형된 단어가 금지된 패턴인지 코드 레벨에서 검증합니다.

### 3.1 검증 항목
1. 조동사+ing 패턴 검증
2. 부사/접속사/wh-단어에 "-ly" 추가 패턴 검증
3. 주어 대명사를 소유격으로 변형 검증
4. 주어 대명사를 다른 주어 대명사로 변형 검증
5. be동사를 단순히 "being"으로 변형 검증
6. **인칭대명사+동사 → 인칭대명사+동사ing 금지 검증** (모든 동사 공통, be동사 없이)
7. **3인칭 복수 주어 + 단수동사(-s) 검증**: `suggest → suggests`, `believe → believes` 등 금지
8. 주어-be동사 수일치 깨는 변형 검증
9. 완전히 다른 단어인지 확인
10. "to + 동사ing" 패턴 검증
10a. **"to+to+동사원형" 패턴 검증**: 변형 결과가 "to to + 동사원형"으로 시작하면 절대 금지
10b. **전치사+동명사 → 전치사+동사원형 검증**: "being" → "be" 변형 금지 (of be, for be 등 비문 방지)
10c. **"of being" → "of been" 검증**: "being" → "been" 변형 금지 (of been 비문 방지)
10d. **"of being being" 검증**: 변형 결과에 "being being" 포함 시 금지
11. 등위접속사 선택 검증
12. 조동사 다음 동사를 단순히 동사ing로 변형 검증

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
- ✅ **주어+동사 시제만 변경:** `"We buy" → "We bought"`, `"They suggest" → "They suggested"` (인칭 변환 금지)
- ✅ **be동사 시제만 변경:** `"I am" → "I was"`, `"he is" → "he was"`, `"they are" → "they were"`
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
| 6 | 주어-be동사 수일치 깨기 / I am→I were 금지 | `they are → they am`, `I am → I were` | 시제만 변경: I am→I was, he is→he was |
| 6a | 주어+동사 인칭 변환 금지 | `We buy → We buys` | 시제만 변경: We buy→We bought |
| 7 | be동사 → "being" | `is → being` | 너무 단순한 변형 |
| 8 | 주어+동사 → 주어+동사ing (be동사 없이) | `they work → they working` | 비문법적 구조 |
| 9 | to+동사원형 → to+동사ing | `to continue → to continuing` | 존재하지 않는 패턴 |
| 9a | to+동사원형 → to+to+동사원형 | `to reinvent → to to reinvent` | 문법에 없는 형태; to+be+~ing, to+be+~ed 등만 사용 |
| 9b | 전치사+동명사 → 전치사+동사원형 | `of being → of be` | 전치사 뒤에는 명사/동명사만 가능 |
| 9c | of being → of been, of being being | `of being → of been` | 영어에 없는 형태; of+being+pp, of+being+~ing 만 허용 |
| 9d | of+동사ing → of+과거형 | `of being → of been` | of+being+pp 또는 of+being+~ing 만 허용 |
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
