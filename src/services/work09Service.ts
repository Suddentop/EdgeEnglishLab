/**
 * Work_09 (어법 오류 찾기) 문제 생성 로직
 * 원본: src/components/work/Work_09_GrammarError/Work_09_GrammarError.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI, translateToKorean } from './common';

/**
 * 어법 오류 문제 타입 정의
 */
export interface GrammarQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  original: string;
  translation: string;
}

/**
 * 유형#09: 어법 오류 찾기 문제 생성
 * @param passage - 영어 본문
 * @param previouslySelectedWords - 이전에 선택된 단어 목록 (동일 본문으로 여러 번 생성 시 사용)
 * @returns 어법 오류 문제 데이터
 */
export async function generateWork09Quiz(
  passage: string,
  previouslySelectedWords?: string[]
): Promise<GrammarQuiz> {
  console.log('🔍 Work_09 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);

  try {
    // Step 1: 단어 선정 (다양성 검증 포함, 최대 3회 재시도)
    let words = await selectWords(passage, previouslySelectedWords);
    console.log('✅ 선택된 단어들:', words);
    
    // 관계대명사/관계부사/접속사 과다 선택 검증 (최대 3회 재시도)
    // 본문 존재 여부는 selectWords 함수 내부에서 이미 검증됨
    const relativeWords = ['that', 'which', 'who', 'whom', 'whose', 'what', 'whatever', 'when', 'where', 'why', 'how', 'however', 'whichever', 'whoever', 'wherever', 'whenever', 'That', 'Which', 'Who', 'Whom', 'Whose', 'What', 'Whatever', 'When', 'Where', 'Why', 'How', 'However', 'Whichever', 'Whoever', 'Wherever', 'Whenever'];
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      const relativeCount = words.filter(w => relativeWords.includes(w.trim())).length;
      if (relativeCount >= 2) {
        console.warn(`⚠️ 관계대명사/관계부사/접속사가 ${relativeCount}개 선택됨 (최대 1개만 허용). 재시도 ${retryCount + 1}/${maxRetries}...`);
        words = await selectWords(passage, previouslySelectedWords);
        console.log('✅ 재선택된 단어들:', words);
        retryCount++;
        continue;
      }
      break;
    }
    
    // 최종 검증
    const finalRelativeCount = words.filter(w => relativeWords.includes(w.trim())).length;
    if (finalRelativeCount >= 2) {
      console.error(`❌ 재시도 ${maxRetries}회 후에도 관계대명사/관계부사/접속사가 ${finalRelativeCount}개 선택되었습니다. 최대 1개만 허용됩니다.`);
      throw new Error(`단어 선정 실패: 관계대명사/관계부사/접속사가 ${finalRelativeCount}개 선택되었습니다. 최대 1개만 허용됩니다.`);
    }

    // Step 2: 어법 변형
    const transformation = await transformWord(words);
    console.log('✅ 어법 변형 결과:', transformation);

    // Step 3: 원본 단어를 변형된 단어로 교체하면서 번호/밑줄 적용
    const { numberedPassage, passageOrder } = applyNumberAndUnderline(passage, words, transformation.transformedWords);
    console.log('✅ 번호/밑줄 적용 완료');
    console.log('📋 본문에 나타나는 순서 (originalWords 인덱스):', passageOrder);

    // Step 4: 번역
    const translation = await translateToKorean(passage);
    console.log('✅ 번역 완료');

    // 본문에 번호가 매겨진 순서에 맞춰 객관식 옵션 재정렬
    // passageOrder[i] = 본문에서 i번째로 나타나는 단어의 originalWords 인덱스
    const optionsInOrder = passageOrder.map(originalIdx => transformation.transformedWords[originalIdx]);
    
    // 정답 인덱스도 재계산: 본문에서 몇 번째로 나타나는지
    const newAnswerIndex = passageOrder.indexOf(transformation.answerIndex);
    if (newAnswerIndex === -1) {
      throw new Error(`정답 인덱스 재계산 실패: 원본 인덱스 ${transformation.answerIndex}가 passageOrder에 없습니다.`);
    }

    console.log('🎯 최종 결과 조합:');
    console.log('원본 단어들:', words);
    console.log('변형된 단어들:', transformation.transformedWords);
    console.log('본문 순서 (originalWords 인덱스):', passageOrder);
    console.log('객관식 옵션 (본문 순서대로 재정렬):', optionsInOrder);
    console.log('원본 정답 인덱스:', transformation.answerIndex);
    console.log('재계산된 정답 인덱스:', newAnswerIndex);

    const result: GrammarQuiz = {
      passage: numberedPassage,
      options: optionsInOrder,
      answerIndex: newAnswerIndex,
      original: transformation.original,
      translation
    };

    console.log('✅ Work_09 문제 생성 완료:', result);
    return result;

  } catch (error) {
    console.error('❌ Work_09 문제 생성 실패:', error);
    throw new Error(`문제 생성에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * MCP 1: 단어 선정 서비스
 * @param passage - 영어 본문
 * @param previouslySelectedWords - 이전에 선택된 단어 목록
 * @returns 선택된 단어 배열
 */
async function selectWords(
  passage: string,
  previouslySelectedWords?: string[]
): Promise<string[]> {
  // Step 1: 본문에서 어법 변형 가능한 단어 후보를 먼저 추출
  const candidatePrompt = `아래 영어 본문을 분석하여, **대한민국 고등학교 3학년 및 대학수학능력시험(수능) 최고난도 수준**의 어법 오류 찾기 문제로 변형 가능한 단어들을 추출해주세요.

**🎯 추출 기준:**
1. **본문에 실제로 존재하는 단어만 추출** (본문에 나타나는 형태 그대로)
2. **반드시 본문 있는 단어만 선택할 것**
2. **어법 변형 가능한 문법적 단어 우선:**
   - 준동사: to-v, v-ing, p.p 형태
   - 동사: 수 일치, 태, 시제 관련
   - 형용사/부사: 보어 자리, 수식어 자리, 비교급
   - 전치사
   - 관계사/접속사 (최소화)
3. **고유명사, 단순 명사 제외**
4. **기초 단어(a, an, the, is, are 등) 제외**

본문:
${passage}

응답 형식 (JSON 배열, 최소 15개 이상 추출):
["word1", "word2", "word3", ...]`;

  const candidateResponse = await callOpenAI({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant that extracts grammatical words from text. Return only valid JSON arrays.' },
      { role: 'user', content: candidatePrompt }
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  if (!candidateResponse.ok) {
    throw new Error(`OpenAI API 오류: ${candidateResponse.status}`);
  }

  const candidateData = await candidateResponse.json();
  let candidateContent = candidateData.choices[0].message.content.trim();
  
  // 마크다운 코드 블록 제거
  if (candidateContent.includes('```json') || candidateContent.includes('```Json') || candidateContent.includes('```')) {
    candidateContent = candidateContent.replace(/```(?:json|Json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
  }

  let candidateWords: string[] = [];
  try {
    candidateWords = JSON.parse(candidateContent);
    if (!Array.isArray(candidateWords) || candidateWords.length < 10) {
      throw new Error('후보 단어가 부족합니다.');
    }
  } catch (parseError) {
    console.error('후보 단어 파싱 실패:', candidateContent);
    throw new Error('후보 단어 추출에 실패했습니다.');
  }

  // Step 2: 추출된 후보 단어 중에서 본문에 실제로 존재하는 것만 필터링
  const validCandidateWords: string[] = [];
  for (const word of candidateWords) {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
    if (regex.test(passage)) {
      validCandidateWords.push(word);
    }
  }

  if (validCandidateWords.length < 5) {
    throw new Error(`본문에서 어법 변형 가능한 단어가 부족합니다. (${validCandidateWords.length}개 발견, 최소 5개 필요)`);
  }

  console.log(`✅ 본문에서 추출된 유효한 후보 단어: ${validCandidateWords.length}개`);

  // Step 3: 유효한 후보 단어 중에서 최종 5개 선택
  const selectionPrompt = `아래 **본문에서 실제로 추출된 유효한 단어 목록** 중에서, **대한민국 고등학교 3학년 및 대학수학능력시험(수능) 최고난도 수준**의 어법 오류 찾기 문제를 위한 단어 5개를 선정해주세요.

**⚠️ CRITICAL:**
- **아래 목록에 있는 단어만 선택하세요.** 목록에 없는 단어는 절대 선택하지 마세요.
- 관계대명사/관계부사/접속사는 최대 1개만 선택 가능합니다. 2개 이상 선택 시 자동으로 실패 처리됩니다.

**🎯 핵심 선정 기준 (수능 1등급 수준 - 엄격한 다양성 필수):**
1. **복잡한 구문 구조:** 단순한 단문이 아닌, 관계사절, 분사구문, 도치 구문, 가정법 등 **복잡한 문장 구조 내에서 문법적 판단이 필요한 단어**를 우선 선정하세요.
2. **핵심 문법 요소 (다양성 필수 - 관계사/접속사 최대 1개만):**
   - **준동사 (우선 선정):** 부정사(to-v), 동명사(v-ing), 분사(v-ing/p.p)의 구별 (문장의 본동사를 찾는 능력 요구) - **최소 1개 필수**
   - **동사 (우선 선정):** 수 일치(주어가 멀리 떨어져 있는 경우), 태(능동/수동), 시제(완료시제 등) - **최소 1개 필수**
   - **형용사/부사 (우선 선정):** 보어 자리의 형용사 vs 수식어 자리의 부사, 비교급/최상급 - **최소 1개 필수**
   - **전치사 (우선 선정):** 전치사 vs 접속사 구별, 전치사 목적어 자리 - **최소 1개 필수**
   - **관계사/접속사 (최후의 수단):** 관계대명사 vs 관계부사, that vs what, 계속적 용법, 병렬 구조 등 - **최대 1개만 허용, 가능하면 0개**
3. **단순 암기 지양:** 단순한 숙어 암기나 철자 문제는 배제하고, **문맥과 구조를 파악해야만 풀 수 있는 단어**를 선택하세요.
   - 예: 단순 'make'가 아닌, 사역동사/5형식 구조에서의 'make' 또는 목적보어 자리의 형용사/부사 판단.
4. **난이도 상향 조정:** 중학교 수준의 단순한 시제나 인칭 대명사 문제는 절대적으로 피하세요.

**🚫 절대 금지 사항 (엄격히 준수):**
- **관계대명사/관계부사/접속사 과다 선택 절대 금지:** 
  * that, which, who, whom, whose, what, whatever, when, where, why, how, however, whichever, whoever, wherever, whenever 등은 **최대 1개만** 선택 가능
  * 2개 이상 선택 시 자동으로 실패 처리됩니다
- **다양성 필수 (5개 중 최소 4개는 다른 카테고리):**
  * 준동사 1-2개 (to-v, v-ing, p.p 중)
  * 동사 1-2개 (수 일치, 태, 시제 관련)
  * 형용사/부사 1-2개 (보어 자리, 수식어 자리, 비교급 등)
  * 전치사 1개
  * 관계사/접속사 0-1개 (가능하면 0개, 최대 1개)
- **균형잡힌 선택 필수:** 관계사/접속사는 최후의 수단으로만 사용하고, 나머지는 반드시 준동사, 동사, 형용사/부사, 전치사 등으로 다양하게 선택하세요.

**⚠️ 규칙 (엄격히 준수):**
- **반드시 위 목록에 있는 단어만 선택하세요.** 목록에 없는 단어는 절대 선택하지 마세요.
- 반드시 "단어" 단위로 선정하세요. (구/절 단위 X)
- 동일한 단어 중복 선정 금지.
- 각기 다른 문장에서 1개씩만 선정하세요.
- **관계대명사/관계부사/접속사(that, which, who, whom, whose, what, whatever, when, where, why, how, however 등)는 최대 1개만 선택하세요. 가능하면 0개를 선택하세요.**
- **우선 선택 순서: 1) 준동사(to-v, v-ing, p.p), 2) 동사(수일치, 태, 시제), 3) 형용사/부사, 4) 전치사, 5) 관계사/접속사(최후의 수단)**

**유효한 후보 단어 목록 (본문에 실제로 존재하는 단어들):**
${JSON.stringify(validCandidateWords, null, 2)}

**선택 규칙:**
- 반드시 본문에 있는 단어만 선택하세요
- 위 목록에 있는 단어만 선택하세요
- 관계사/접속사는 최대 1개만
- 다양성 필수: 준동사, 동사, 형용사/부사, 전치사 등으로 다양하게

결과는 아래 JSON 배열 형식으로만 반환하세요:
["word1", "word2", "word3", "word4", "word5"]`;

  const response = await callOpenAI({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant that selects words from a provided list. You must ONLY select words that are in the provided list. Return only valid JSON arrays.' },
      { role: 'user', content: selectionPrompt }
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API 오류: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  // 마크다운 코드 블록 제거
  let wordsJson = content;
  if (content.includes('```json') || content.includes('```Json') || content.includes('```')) {
    wordsJson = content.replace(/```(?:json|Json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
  }

  try {
    const words = JSON.parse(wordsJson);
    if (!Array.isArray(words) || words.length !== 5) {
      throw new Error('선택된 단어가 5개가 아닙니다.');
    }
    
    // 선택된 단어가 유효한 후보 목록에 있는지 검증
    const invalidWords: string[] = [];
    for (const word of words) {
      const wordLower = word.trim().toLowerCase();
      const isValid = validCandidateWords.some(candidate => candidate.trim().toLowerCase() === wordLower);
      if (!isValid) {
        invalidWords.push(word);
      }
    }
    
    if (invalidWords.length > 0) {
      console.error(`❌ 유효하지 않은 단어 선택됨: ${invalidWords.join(', ')}`);
      throw new Error(`유효한 후보 목록에 없는 단어가 선택되었습니다: ${invalidWords.join(', ')}`);
    }
    
    // 본문 존재 여부 최종 검증
    const missingWords: string[] = [];
    for (const word of words) {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
      if (!regex.test(passage)) {
        missingWords.push(word);
      }
    }
    
    if (missingWords.length > 0) {
      console.error(`❌ 본문에 존재하지 않는 단어: ${missingWords.join(', ')}`);
      throw new Error(`본문에 존재하지 않는 단어가 선택되었습니다: ${missingWords.join(', ')}`);
    }
    
    return words;
  } catch (parseError) {
    console.error('파싱 실패한 내용:', wordsJson);
    throw new Error('단어 선택 결과를 파싱할 수 없습니다.');
  }
}

/**
 * MCP 3: 어법 변형 서비스 (재시도 로직 포함)
 * @param words - 선택된 단어 배열
 * @returns 변형된 단어들과 정답 정보
 */
async function transformWord(words: string[]): Promise<{
  transformedWords: string[];
  answerIndex: number;
  original: string;
  grammarType: string;
}> {
  // 수능 고난도 어법 유형 리스트 (2024학년도 수능 트렌드 반영)
  const grammarTypes = [
    'Subject-Verb Agreement (Far Subject)', // 주어-동사 수 일치 (수식어구로 멀어진 주어)
    'Relative Pronoun vs Relative Adverb', // 관계대명사 vs 관계부사 (불완전/완전 문장)
    'Participle (Present vs Past)', // 현재분사 vs 과거분사 (능동/수동 관계)
    'Gerund vs Infinitive', // 동명사 vs 부정사 (목적어, 보어 자리)
    'Parallel Structure', // 병렬 구조 (등위접속사 앞뒤 형태)
    'Adjective vs Adverb', // 형용사 vs 부사 (보어 자리 vs 수식어)
    'Voice (Active vs Passive)', // 능동태 vs 수동태 (목적어 유무 등)
    'Preposition + Relative Pronoun', // 전치사+관계대명사 (완전한 문장)
    'Indirect Question Word Order', // 간접의문문 어순
    'Subjunctive Mood' // 가정법 (과거, 과거완료, 혼합)
  ];
  
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`어법 변형 시도 ${attempt}/${maxRetries}...`);
    
    const prompt = `You must transform exactly ONE word from the list to create a **High-Level Grammar Error** suitable for the Korean CSAT (Suneung - College Scholastic Ability Test).

Original words: ${JSON.stringify(words)}
Grammar types: ${grammarTypes.join(', ')}

**🎯 Critical Requirements for CSAT Level (High Difficulty):**
1.  **Do NOT create trivial errors** like spelling, simple pluralization (e.g. apple->apples), or obvious tense changes (e.g. go->went) unless the context makes it very tricky.
2.  **Focus on Structural Syntax:** The error must require analyzing the sentence structure (clauses, modifiers, subject location) to detect.
3.  **Contextual Logic:** The error should look grammatically plausible at a glance (e.g., using a past participle that looks like a past tense verb) but be structurally incorrect.
4.  **Diversity Priority:** If the word list contains multiple relative pronouns/adverbs/conjunctions (that, which, what, when, where, how, whatever, etc.), **PRIORITIZE transforming non-relative/non-conjunction words** (verbs, participles, gerunds, infinitives, adjectives, adverbs, prepositions) to ensure variety. Only transform a relative pronoun/adverb/conjunction if it's the ONLY option that creates a meaningful high-level error.

**🔥 Examples of High-Quality CSAT Errors (Prioritize These):**
- **(Participle):** Changing a correct past participle (p.p.) to a present participle (v-ing) where the passive meaning is required, or vice versa. *Example: "The data [collected -> collecting] by the sensors..."*
- **(Subject-Verb Agreement):** Changing the verb number when the subject is separated by a long modifier clause. *Example: "The detailed analysis of the samples [show -> shows] that..."*
- **(Gerund vs Infinitive):** Changing a gerund to an infinitive or vice versa in specific contexts. *Example: "I enjoy [reading -> to read] books."*
- **(Adjective/Adverb):** Changing an adjective complement to an adverb. *Example: "It remains [possible -> possibly]..."*
- **(Voice):** Changing active to passive or vice versa incorrectly. *Example: "The problem [was solved -> solved] by the team."*
- **(Preposition):** Changing a correct preposition to an incorrect one. *Example: "depend [on -> of] something"*
- **(Relative Clause - Use Sparingly):** Only if necessary, changing 'which' to 'where' or 'what' to 'that' in complex relative clauses. *Example: "The house [in which -> which] he lived..."*

**Selection Strategy (STRICT - Must Follow):**
1. **MANDATORY First Priority:** If the word list contains ANY verbs, participles (v-ing/p.p), gerunds, infinitives, adjectives, adverbs, or prepositions, you MUST transform one of these. DO NOT transform relative pronouns/adverbs/conjunctions if other options exist.
2. **ABSOLUTE Last Resort:** Only transform a relative pronoun/adverb/conjunction (that, which, what, when, where, how, whatever, etc.) if ALL other words in the list are also relative pronouns/adverbs/conjunctions AND there is no other viable option.
3. **Prohibited:** If the word list has 2+ relative pronouns/adverbs/conjunctions, you MUST transform a non-relative word. Transforming a relative word in this case will be considered a failure.
4. Randomly choose ONE word to transform. Keep the other 4 words exactly the same.

Return ONLY this JSON format. **YOU MUST USE REAL ENGLISH WORDS, NOT PLACEHOLDERS:**

Example 1 (if transforming "collected"):
{
  "transformedWords": ["survives", "hunting", "collecting", "balance", "spread"],
  "answerIndex": 2,
  "original": "collected",
  "grammarType": "Participle (Present vs Past)"
}

Example 2 (if transforming "which"):
{
  "transformedWords": ["survives", "where", "balance", "being", "spread"],
  "answerIndex": 1,
  "original": "which",
  "grammarType": "Relative Pronoun vs Relative Adverb"
}

**⚠️ CRITICAL RULES:**
1. **DO NOT use placeholders like "WRONG_WORD", "CORRECT_WORD", "word1", "word2", "actual_incorrect_word", etc.**
2. **You MUST use REAL English words that are grammatically incorrect in the context.**
3. In "transformedWords", keep 4 words exactly as they appear in the input, and replace ONLY the chosen word with the actual incorrect word.
4. The transformed word must be a **real English word** that is grammatically incorrect in the sentence context.
5. Do NOT transform proper nouns or simple nouns unless it's a specific countable/uncountable trick.`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a grammar expert specializing in the Korean CSAT (Suneung) English section. You create challenging syntax errors.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    if (!response.ok) {
      if (attempt === maxRetries) {
        throw new Error(`OpenAI API 오류: ${response.status}`);
      }
      continue;
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // 마크다운 코드 블록 제거
    let resultJson = content;
    if (content.includes('```json') || content.includes('```Json') || content.includes('```')) {
      resultJson = content.replace(/```(?:json|Json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
    }

    try {
      const result = JSON.parse(resultJson);
      
      // 검증
      if (!result.transformedWords || !Array.isArray(result.transformedWords) || 
          result.transformedWords.length !== 5) {
        throw new Error('transformedWords가 올바르지 않습니다.');
      }
      
      if (typeof result.answerIndex !== 'number' || result.answerIndex < 0 || result.answerIndex > 4) {
        throw new Error('answerIndex가 올바르지 않습니다.');
      }
      
      if (!result.original || !result.grammarType) {
        throw new Error('original 또는 grammarType이 누락되었습니다.');
      }

      // 플레이스홀더 검증: "WRONG_WORD", "CORRECT_WORD" 등의 플레이스홀더가 있는지 확인
      const placeholders = ['WRONG_WORD', 'CORRECT_WORD', 'word1', 'word2', 'word3', 'word4', 'word5', 'actual_incorrect_word', 'actual_correct_word'];
      const hasPlaceholder = result.transformedWords.some((w: string) => 
        placeholders.some(p => w.toUpperCase().includes(p.toUpperCase()))
      ) || placeholders.some(p => result.original.toUpperCase().includes(p.toUpperCase()));
      
      if (hasPlaceholder) {
        if (attempt < maxRetries) {
          console.warn(`⚠️ 플레이스홀더가 포함된 응답 발견. 재시도 ${attempt + 1}/${maxRetries}...`);
          console.warn('응답 내용:', result);
          continue;
        } else {
          // 최종 시도에서도 플레이스홀더가 있으면 에러
          console.error('❌ 플레이스홀더가 포함된 최종 응답:', result);
          throw new Error('AI가 플레이스홀더를 반환했습니다. 실제 영어 단어를 사용해야 합니다.');
        }
      }

      // 관계사/접속사 변형 검증: 관계사/접속사가 2개 이상인데 그 중 하나를 변형했다면 재시도
      const relativeWords = ['that', 'which', 'who', 'whom', 'whose', 'what', 'whatever', 'when', 'where', 'why', 'how', 'however', 'whichever', 'whoever', 'wherever', 'whenever'];
      const originalRelativeCount = words.filter(w => relativeWords.includes(w.trim().toLowerCase())).length;
      const transformedWordIsRelative = relativeWords.includes(result.original.trim().toLowerCase());
      
      if (originalRelativeCount >= 2 && transformedWordIsRelative && attempt < maxRetries) {
        console.warn(`⚠️ 관계사/접속사가 ${originalRelativeCount}개인데 그 중 하나를 변형함. 재시도...`);
        continue;
      }

      console.log(`✅ 어법 변형 성공 (시도 ${attempt}번째):`, result);
      return result;

    } catch (parseError) {
      console.warn(`어법 변형 시도 ${attempt} 실패:`, parseError);
      if (attempt === maxRetries) {
        throw new Error('어법 변형에 실패했습니다.');
      }
    }
  }

  throw new Error('어법 변형 재시도 횟수를 초과했습니다.');
}

/**
 * MCP 4: 번호/밑줄 적용 함수
 * @param passage - 원본 본문
 * @param originalWords - 원본 단어들
 * @param transformedWords - 변형된 단어들
 * @returns 번호가 매겨진 본문 (HTML 형식)과 본문에 나타나는 순서 정보
 */
function applyNumberAndUnderline(
  passage: string, 
  originalWords: string[], 
  transformedWords: string[]
): { numberedPassage: string; passageOrder: number[] } {
  let result = passage;

  // 각 단어의 모든 등장 위치를 찾음
  const occurrences: { word: string; transformedWord: string; originalIndex: number; position: number }[] = [];
  
  originalWords.forEach((originalWord, index) => {
    const transformedWord = transformedWords[index];
    const escapedWord = originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    let match;
    while ((match = regex.exec(passage)) !== null) {
      occurrences.push({
        word: originalWord,
        transformedWord: transformedWord,
        originalIndex: index,
        position: match.index
      });
    }
  });

  // 위치 기준으로 정렬
  occurrences.sort((a, b) => a.position - b.position);

  // originalWords 순서대로 매핑 (각 단어의 첫 번째 미사용 위치 할당)
  const usedIndices = new Set<number>();
  const mappedWords: { word: string; transformedWord: string; originalIndex: number; position: number }[] = [];

  for (let i = 0; i < originalWords.length; i++) {
    const word = originalWords[i];
    let found = false;

    // 해당 단어의 모든 등장 위치 중 사용되지 않은 첫 번째 위치 찾기
    for (const occ of occurrences) {
      if (occ.originalIndex === i && !usedIndices.has(occ.position)) {
        mappedWords.push(occ);
        usedIndices.add(occ.position);
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`선정된 단어 '${word}'가 본문에 존재하지 않거나 중복 할당되었습니다.`);
    }
  }

  // 위치 기준으로 다시 정렬 (본문 순서대로)
  mappedWords.sort((a, b) => a.position - b.position);

  // 본문에 나타나는 순서 정보 저장 (originalIndex의 순서)
  const passageOrder = mappedWords.map(item => item.originalIndex);

  // 뒤에서부터 치환 (인덱스가 꼬이지 않도록)
  const circleNumbers = ['①', '②', '③', '④', '⑤'];
  for (let i = mappedWords.length - 1; i >= 0; i--) {
    const item = mappedWords[i];
    const num = circleNumbers[i];
    const escapedWord = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`);
    
    result = result.replace(
      regex,
      `${num}<span class="grammar-error-highlight"><u>${item.transformedWord}</u></span>`
    );
  }

  const numCount = (result.match(/[①②③④⑤]/g) || []).length;
  const underlineCount = (result.match(/<u>.*?<\/u>/g) || []).length;

  if (numCount !== originalWords.length || underlineCount !== originalWords.length) {
    throw new Error(`번호/밑줄 적용 실패: 번호 ${numCount}개, 밑줄 ${underlineCount}개 적용됨 (예상: ${originalWords.length}개)`);
  }

  return { numberedPassage: result, passageOrder };
}

