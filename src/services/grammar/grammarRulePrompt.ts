/**
 * Grammer_Rule.md 기반 어법 문제 생성 프롬프트
 *
 * docs/grammer/Grammer_List.md의 10가지 문법과
 * docs/grammer/Grammer_Rule.md의 규칙·원리·공식·예시를 기준으로
 * 어법 변형 시 반드시 준수해야 할 내용을 정의합니다.
 *
 * **핵심 원칙:**
 * - 변형된 단어는 반드시 사전에 존재하는 실제 영어 단어여야 함
 * - 비문법적 방법으로 변형하거나 비문·일반적 영어표현에 어긋나는 형태 금지
 * - 철자 오류, 사전에 없는 단어, 문법적으로 존재하지 않는 형태 금지
 */

/** Grammer_List.md 10가지 문법 타입 (공식 목록) */
export const GRAMMAR_TYPES = [
  'Subject-Verb Agreement (Far Subject)', // 1. 주어-동사 수 일치 (수식어구로 멀어진 주어)
  'Relative Pronoun vs Relative Adverb', // 2. 관계대명사 vs 관계부사 (불완전/완전 문장)
  'Participle (Present vs Past)', // 3. 현재분사 vs 과거분사 (능동/수동 관계)
  'Gerund vs Infinitive', // 4. 동명사 vs 부정사 (목적어, 보어 자리)
  'Parallel Structure', // 5. 병렬 구조 (등위접속사 앞뒤 형태)
  'Adjective vs Adverb', // 6. 형용사 vs 부사 (보어 자리 vs 수식어)
  'Voice (Active vs Passive)', // 7. 능동태 vs 수동태 (목적어 유무 등)
  'Preposition + Relative Pronoun', // 8. 전치사+관계대명사 (완전한 문장)
  'Indirect Question Word Order', // 9. 간접의문문 어순
  'Subjunctive Mood', // 10. 가정법 (과거, 과거완료, 혼합)
] as const;

export type GrammarType = (typeof GRAMMAR_TYPES)[number];

/**
 * Grammer_Rule.md 기반 상세 문법 규칙 프롬프트
 * 단어 선택·어법 유형 평가·변형 시 AI에게 제공
 */
export const GRAMMAR_RULE_PROMPT = `
**📚 어법 문제 생성 기준: Grammer_Rule.md 10가지 문법 (MANDATORY)**

어법 변형은 반드시 아래 10가지 문법 범주에 한정하며, 각 범주의 규칙·원리·예시를 준수해야 합니다.

---

**1. Subject-Verb Agreement (주어-동사 수 일치)**
- 수식어구(전치사구, 현재/과거분사구, 관계사절)로 주어와 동사가 멀어진 경우, 진짜 주어(핵명사)를 찾아 수 일치
- 부분 표현: Most/Some/All/Half/The rest/percent/of+명사 → of 뒤 명사에 동사 수 일치
- The number of + 단수동사 / A number of + 복수동사
- 상관접속사(Either A or B, Neither A nor B): 근자일치(B에 일치)
- 도치 구문: 부사구 도치 시 동사 뒤 진짜 주어 찾기

---

**2. Relative Pronoun vs Relative Adverb**
- 관계대명사(who, which, that): 뒤 문장 불완전(주어/목적어/보어 중 하나 역할)
- 관계부사(when, where, why, how): 뒤 문장 완전(구조적으로 완결)
- What: 선행사 없음, 뒤 문장 불완전, 명사절 (주어/목적어/보어)

---

**3. Participle (현재분사 vs 과거분사)**
- 문장에 본동사 하나만 존재 원칙; 나머지는 준동사(분사)
- 수식받는 명사와 능동 관계 → -ing / 수동 관계 → p.p.
- 감정 분사: 유발→-ing(boring), 느끼는→p.p.(bored)
- 자동사(occur, happen, consist of)는 수동태·과거분사 수식 불가
- 분사구문: 의미상 주어 = 주절 주어, 능동/수동 판별

---

**4. Gerund vs Infinitive**
- 전치사 뒤 목적어 → 반드시 동명사(-ing). to부정사 불가
- look forward to, object to, devote to 등: to는 전치사 → -ing
- 의미 차이 동사: remember/forget/try/stop/regret/mean 등 (표 참조)

---

**5. Parallel Structure**
- 등위접속사(and, but, or) 연결 요소는 문법적으로 대등한 형태
- not only A but also B: A와 B 품사·구조 일치
- 비교 구문: 비교 대상 병렬 (Driving is easier than riding)

---

**6. Adjective vs Adverb**
- 연결동사(be, become, seem, appear, look, smell, taste, sound, feel) 뒤 → 주격 보어(형용사)
- 5형식 목적격 보어(make, find, keep, consider) → 형용사
- 부사는 동사/형용사/부사/문장 수식

---

**7. Voice (능동태 vs 수동태)**
- 능격동사(open, sell, read, peel, cook): 자동사로 쓰여도 수동 의미 (The door opened, The book sells well)
- 수동태 불가 자동사: happen, occur, take place, consist of, result in, disappear, appear, seem, remain

---

**8. Preposition + Relative Pronoun**
- 관계부사 = 전치사 + 관계대명사 (where = in/at which)
- in which, at which 뒤에는 완전한 문장
- 뒤가 완전한데 which만 쓰인 경우 → 전치사 필요(in which 등)

---

**9. Indirect Question Word Order**
- 간접의문문: 평서문 어순(주어+동사). Where is he? → I don't know [where he is]
- 생각 동사(think, believe, guess 등): Wh-가 문두로 → Where do you think [he is]?

---

**10. Subjunctive Mood**
- 가정법 과거: If I were you → Were I you (도치)
- 가정법 과거완료: If I had known → Had I known
- 미래 가정: If you should need → Should you need
- 혼합 가정법: If I had studied then, I would be ... now

---

**🚨 변형 시 필수 준수 (ABSOLUTE):**
1. 변형 결과는 반드시 **사전에 존재하는 실제 영어 단어**만 사용
2. **비문법적 변형 금지**: coulding, howeverly, to continuing, of be, being bed, be requiresing 등 존재하지 않는 형태
3. **3인칭 단수 동사→진행형:** requires→"is requiring"(O), "be requiresing"(X). be동사는 주어에 맞게(is/are 등), -ing는 원형+-ing(requiring)
4. **조건문+주어+동사→진행형:** If you left→"If you were leaving"(O), "If you leaving"(X). -ing만 쓰지 말고 were/was/is/are+원형+-ing
5. **조동사+수동태:** can drain→"can be drained"(O), "can are drained"(X). 조동사 뒤 be는 원형
6. **관계대명사/관계부사:** how, where 등은 동사 아님. "be howing", "be howed" (X). where/why/what 등으로 치환만 (O)
7. **철자 오류 금지**: 문법 오류이지 철자/오타가 아님
8. **일반적 영어 표현 준수**: 변형 후 문장이 영어 문법 규칙에 위배되면 안 됨
9. 오답은 "이 문맥에서 틀린 선택"이어야 하며, "세상에 없는 문법 형태"가 아니어야 함

**🚨 복합적 변형 우선 (단순 단어 교체 지양):**
- **단순 단어 1개만 바꾸지 말 것.** 도치(Inversion), 치환(Substitution), 관계대명사/관계부사 구문 변경 등 **문장·구문 수준 변형**을 우선 사용
- **도치**: Had I known → If I had known, Were it not for → If it were not for
- **관계사 구조**: which → in which / where, that → where (완전/불완전 문장 판별)
- **분사구문**: 능동/수동 의미상 주어에 따른 -ing vs p.p. 선택
- **병렬구조**: and/but/or 앞뒤 형태 일치
`;

/**
 * 단어 선택 시 사용할 문법 기반 후보 추출 가이드
 */
export const GRAMMAR_BASED_CANDIDATE_GUIDE = `
**Grammer_List.md 10가지 문법에 해당하는 단어 우선 추출:**
1. 주어-동사 수 일치: 동사(수 일치 대상), A/The number of 근처 단어
2. 관계대명사 vs 관계부사: which, where, when, that, what
3. 현재분사 vs 과거분사: -ing/-ed 형태 (능동/수동 판별)
4. 동명사 vs 부정사: to V, V-ing (목적어/보어 자리)
5. 병렬 구조: and/but/or 연결 요소, not only~but also
6. 형용사 vs 부사: 보어 자리 형용사(possible, clear 등), 수식 부사(-ly)
7. 능동 vs 수동: 동사, be+p.p., 능격동사
8. 전치사+관계대명사: in which, at which, for which
9. 간접의문문: 의문사 뒤 어순 (주어+동사)
10. 가정법: if, were, had, would, should
`;
