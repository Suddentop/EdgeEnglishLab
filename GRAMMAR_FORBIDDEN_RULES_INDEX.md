# 어법 문제 금지목록 — 저장 위치 및 적용 방식 정리

## 요약

| 구분 | 파일 | 저장 형태 | 용도 |
|------|------|------------|------|
| **규칙 정의 (단일 소스)** | `src/services/workGrammarRules.ts` | 금지 3상수 + 허용/권장/선정/난이도 상수·함수 + 검증 함수 | AI 프롬프트·단어 선택·코드 검증 |
| **문서** | `GRAMMAR_FORBIDDEN_RULES.md` | 마크다운 | 사람용 정리·참고 |
| **유형#09 적용** | `src/services/work09Service.ts` | import 후 프롬프트/검증에 사용 | 어법 오류 찾기(5지선다) |
| **유형#10 적용** | `src/services/work10Service.ts` | EXCLUDE_RULES, CANDIDATE_SELECTION_RULES import; 변형은 work09 재사용 | 다중 어법 오류 찾기 |
| **패키지#01/02** | 패키지 컴포넌트는 work09/work10 서비스 호출 | 서비스 통해 간접 적용 | 패키지 내 유형09/10 |

---

## 1. 규칙 정의 파일: `src/services/workGrammarRules.ts`

**역할:** 금지 규칙의 **단일 소스(single source of truth)**. 여기에만 규칙을 두고, 다른 파일은 이 모듈을 import 해서 사용한다.

### 1.1 저장된 항목

| 이름 | 타입 | 설명 |
|------|------|------|
| `FORBIDDEN_TRANSFORMATIONS_PROMPT` | `string` (템플릿 리터럴) | AI에게 “절대 하지 말 것”을 설명하는 **영문** 프롬프트. 최우선 원칙(그럴듯한 어법만 사용) + 각 금지 규칙(조동사+ing, to+to+동사원형, of been, 주어+동사 시제만 등) |
| `FORBIDDEN_EXAMPLES_PROMPT` | `string` (템플릿 리터럴) | AI에게 주는 **금지 예시** 문단. “DO NOT DO THIS” 형식의 예시 나열 |
| `EXCLUDE_RULES_PROMPT` | `string` (한 줄) | **단어 선택 단계**에서 “제외할 대상”을 알려주는 **한국어** 문장. 🎯 원칙 + 제외/금지 규칙을 한 덩어리로 |
| `PREFERRED_ERROR_PATTERNS` | `string` | **허용·권장 오류 패턴** (SV agreement, tense, parallelism, relative clause, pronoun reference, modifier, voice 등). FORBIDDEN과 동일 레벨로 프롬프트에 포함 |
| `DIFFICULTY_ERROR_WEIGHTS` | `Record<string, string[]>` | **난이도별 허용 오류 유형** (high2, high3, csat). 각 키에 해당 난이도 허용 오류 타입 목록 |
| `DEFAULT_GRAMMAR_DIFFICULTY` | `string` | 기본 난이도 (`csat`) |
| `getDifficultyErrorListPrompt(difficulty?)` | `function` | "Select ONE error type from the allowed list for the given difficulty." + 해당 난이도 허용 목록 문자열 반환 |
| `CANDIDATE_SELECTION_RULES` | `string` | **선택지(①~⑤) 선정 기준**: 동사·동사구·절 단위·수식어 우선, 5개 중 최소 3개는 동사/동사구/절 단위. 명사·형용사 위주 방지 |
| `validateTransformation(originalWord, transformedWord)` | `function` | `originalWord` → `transformedWord` 변형이 금지인지 **코드로** 판별. `{ isValid, errorMessage? }` 반환 |

### 1.2 validateTransformation 내부 검증 순서 (블록 번호)

1. 조동사+ing (coulding, shoulding 등)
2. 부사/접속사/wh+ly (howeverly, whatly 등)
3. 주어 대명사 → 소유격 (it→its 등)
4. 주어 대명사 → 다른 주어 대명사 (they→those 등)
5. be동사 → "being"
6. 인칭대명사+동사 → 인칭대명사+동사ing (be 없이)
6a. 주어+동사 인칭 변환 (buy→buys 등, 시제만 허용)
7. 주어-be동사 수일치 (they are→they am, I am→I were 등)
8. 완전히 다른 단어 (though↔thought 등)
9. to+동사ing
9a. to+to+동사원형
9b. 동사원형→"to+동사원형" (to to 동사 방지)
9c. being→be (of be 방지)
9d. being→been (of been 방지)
9e. "being being" 포함
10. 등위접속사 선택 (or, and, but 등)
11. 조동사 다음 동사→동사ing (can praying 등)
12. 수동태→진행형 (was completed→was completing 등)

---

## 2. 문서 파일: `GRAMMAR_FORBIDDEN_RULES.md`

**역할:** 사람이 읽기 위한 정리. **규칙을 정의하는 코드는 아님** — `workGrammarRules.ts`가 실제 규칙 소스다.

- **가장 중요한 원칙** (최우선): 그럴듯한 어법만, 영어에 없는 어법 창조 금지
- **§1** 절대 금지 변형 규칙 (1.1~1.13b): 예시·허용·이유
- **§2** 단어 선택 시 제외 규칙 (EXCLUDE_RULES와 대응)
- **§3** 코드 레벨 검증: validateTransformation 항목 정리
- **§4** 적용 범위: 유형#09, #10, 패키지#01/02 유형09/10
- **§5** 허용 변형 예시
- **§6** 금지 규칙 요약표
- **§7** 파일 위치 안내

규칙을 **추가·수정할 때**는 반드시 `workGrammarRules.ts`를 수정하고, 필요하면 `GRAMMAR_FORBIDDEN_RULES.md`를 같이 갱신한다.

---

## 3. 적용 위치: 어디서 어떻게 쓰이는지

### 3.1 유형#09 — `src/services/work09Service.ts`

| 사용처 | 사용 방식 |
|--------|------------|
| **단어 후보 추출** (selectWords) | 후보 추출 프롬프트에 `EXCLUDE_RULES_PROMPT` 포함 |
| **5개 단어 선택** (selectWords) | 선택 프롬프트에 `EXCLUDE_RULES_PROMPT` (어법 변형 금지 규칙으로) 포함 |
| **어법 변형** (transformWord) | 변형 요청 프롬프트에 `FORBIDDEN_TRANSFORMATIONS_PROMPT`, `FORBIDDEN_EXAMPLES_PROMPT` 포함 + 변형 결과에 `validateTransformation(originalWord, transformedWord)` 호출. 실패 시 재시도 |

→ **금지목록 4가지(프롬프트 2개 + EXCLUDE + validateTransformation) 모두 사용.**

### 3.2 유형#10 — `src/services/work10Service.ts`

| 사용처 | 사용 방식 |
|--------|------------|
| **8개 단어 선택** (selectWordsForWork10) | 후보 추출·최종 선택 프롬프트에 `EXCLUDE_RULES_PROMPT` 포함 |
| **어법 변형** | work09Service의 `transformWord`를 재사용 → 그 안에서 `FORBIDDEN_*` 프롬프트와 `validateTransformation` 사용 |

→ **EXCLUDE_RULES는 work10Service에서 직접 사용**, 나머지는 work09의 transformWord 경로로 적용.

### 3.3 패키지#01 — `src/components/work/Package_01_MultiQuizGenerater/Package_01_MultiQuizGenerater.tsx`

- 유형#09/10 생성 시 `generateWork09QuizService`, `generateWork10QuizService` 호출.
- **별도 import 없음** — 서비스 내부에서 `workGrammarRules`를 쓰므로, **금지목록은 서비스를 통해 자동 적용**.

### 3.4 패키지#02 — `src/components/work/Package_02_TwoStepQuiz/Package_02_TwoStepQuiz.tsx`

- 마찬가지로 `generateWork09Quiz`, `generateWork10Quiz`만 호출.
- **금지목록은 work09/work10 서비스 경로로만 적용.**

---

## 4. 규칙을 추가/수정할 때 체크리스트

1. **`src/services/workGrammarRules.ts`**
   - 금지할 변형이면: `FORBIDDEN_TRANSFORMATIONS_PROMPT`, `FORBIDDEN_EXAMPLES_PROMPT`에 문구 추가.
   - 단어 선택에서도 막아야 하면: `EXCLUDE_RULES_PROMPT`에 문구 추가.
   - 코드로 막을 수 있으면: `validateTransformation` 안에 검증 블록 추가 (예: 9d, 9e).
2. **`GRAMMAR_FORBIDDEN_RULES.md`**
   - §1에 새 금지 규칙 번호와 설명, §2/§3/§6 필요 시 갱신.
3. **다른 파일**
   - work09/work10은 이미 `workGrammarRules`를 import 하므로, **새 상수/함수만 export 하면** 기존 사용처에서 그대로 반영된다. 별도 수정은 보통 불필요.

---

## 5. 파일 경로 한눈에 보기

```
d:\Dev\engquiz\
├── src\
│   ├── services\
│   │   ├── workGrammarRules.ts   ← 금지목록 정의 (상수 3개 + validateTransformation)
│   │   ├── work09Service.ts      ← FORBIDDEN_*, EXCLUDE_RULES, validateTransformation 사용
│   │   └── work10Service.ts     ← EXCLUDE_RULES 사용, 변형은 work09 재사용
│   └── components\work\
│       ├── Work_09_GrammarError\           ← generateWork09Quiz 호출
│       ├── Work_10_MultiGrammarError\      ← generateWork10Quiz 호출
│       ├── Package_01_MultiQuizGenerater\  ← 위 서비스 호출
│       └── Package_02_TwoStepQuiz\         ← 위 서비스 호출
├── GRAMMAR_FORBIDDEN_RULES.md    ← 사람용 문서 (규칙 정리)
└── GRAMMAR_FORBIDDEN_RULES_INDEX.md  ← 이 파일 (저장 위치·적용 방식 정리)
```

이 인덱스는 “금지목록이 어느 파일에 어떻게 저장·적용되는지”만 정리한 것이며, 실제 금지 규칙의 문구와 예시는 `workGrammarRules.ts`와 `GRAMMAR_FORBIDDEN_RULES.md`를 참고하면 된다.
