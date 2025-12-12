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
 * @returns 어법 오류 문제 데이터
 */
export async function generateWork09Quiz(passage: string): Promise<GrammarQuiz> {
  console.log('🔍 Work_09 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);

  try {
    // Step 1: 단어 선정
    const words = await selectWords(passage);
    console.log('✅ 선택된 단어들:', words);

    // Step 2: 어법 변형
    const transformation = await transformWord(words);
    console.log('✅ 어법 변형 결과:', transformation);

    // Step 3: 원본 단어를 변형된 단어로 교체하면서 번호/밑줄 적용
    const numberedPassage = applyNumberAndUnderline(passage, words, transformation.transformedWords);
    console.log('✅ 번호/밑줄 적용 완료');

    // Step 4: 번역
    const translation = await translateToKorean(passage);
    console.log('✅ 번역 완료');

    // 객관식은 본문에 번호가 매겨진 순서 그대로 (섞지 않음)
    const optionsInOrder = transformation.transformedWords;

    console.log('🎯 최종 결과 조합:');
    console.log('원본 단어들:', words);
    console.log('변형된 단어들:', transformation.transformedWords);
    console.log('객관식 옵션 (순서 그대로):', optionsInOrder);
    console.log('원본 정답 인덱스:', transformation.answerIndex);
    console.log('정답 인덱스 (변경 없음):', transformation.answerIndex);

    const result: GrammarQuiz = {
      passage: numberedPassage,
      options: optionsInOrder,
      answerIndex: transformation.answerIndex,
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
 * @returns 선택된 단어 배열
 */
async function selectWords(passage: string): Promise<string[]> {
  const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 3학년 및 대학수학능력시험(수능) 최고난도 수준**의 어법 오류 찾기 문제를 위한 단어 5개를 선정해주세요.

**🎯 핵심 선정 기준 (수능 1등급 수준):**
1. **복잡한 구문 구조:** 단순한 단문이 아닌, 관계사절, 분사구문, 도치 구문, 가정법 등 **복잡한 문장 구조 내에서 문법적 판단이 필요한 단어**를 우선 선정하세요.
2. **핵심 문법 요소:**
   - **준동사:** 부정사(to-v), 동명사(v-ing), 분사(v-ing/p.p)의 구별
   - **동사:** 수 일치(주어가 멀리 떨어져 있는 경우), 태(능동/수동), 시제(완료시제 등)
   - **관계사:** 관계대명사 vs 관계부사, that vs what, 계속적 용법 등
   - **접속사:** 병렬 구조, 전치사 vs 접속사 구별
   - **형용사/부사:** 보어 자리의 형용사 vs 수식어 자리의 부사
3. **단순 암기 지양:** 단순한 숙어 암기나 철자 문제는 배제하고, **문맥과 구조를 파악해야만 풀 수 있는 단어**를 선택하세요.

**⚠️ 규칙:**
- 반드시 "단어" 단위로 선정하세요. (구/절 단위 X)
- 동일한 단어 중복 선정 금지.
- 각기 다른 문장에서 1개씩만 선정하세요.
- 고유명사나 단순 명사는 피하고, 문법적 기능이 있는 단어를 선택하세요.

결과는 아래 JSON 배열 형식으로만 반환하세요:
["word1", "word2", "word3", "word4", "word5"]

본문:
${passage}`;

  const response = await callOpenAI({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant that only returns valid JSON arrays.' },
      { role: 'user', content: prompt }
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

**🔥 Examples of High-Quality CSAT Errors:**
- **(Participle):** Changing a correct past participle (p.p.) to a present participle (v-ing) where the passive meaning is required, or vice versa. *Example: "The data [collected -> collecting] by the sensors..."*
- **(Subject-Verb):** Changing the verb number when the subject is separated by a long modifier clause. *Example: "The detailed analysis of the samples [show -> shows] that..."*
- **(Relative Clause):** Changing 'which' to 'where' or 'what' to 'that' in complex relative clauses. *Example: "The house [in which -> which] he lived..." (if 'lived' is intransitive here it might need 'where' or 'in which')*
- **(Adjective/Adverb):** Changing an adjective complement to an adverb. *Example: "It remains [possible -> possibly]..."*
- **(Parallelism):** Breaking the parallel structure in a list or comparison.

**Selection:** Randomly choose ONE word to transform. Keep the other 4 words exactly the same.

Return ONLY this JSON format:
{
  "transformedWords": ["word1", "word2", "WRONG_WORD", "word4", "word5"],
  "answerIndex": 2,
  "original": "CORRECT_WORD",
  "grammarType": "Selected Grammar Type"
}

**⚠️ IMPORTANT:**
- In the "transformedWords" array, replace the chosen word with the **ACTUAL INCORRECT WORD** you created.
- The transformed word must be **grammatically INCORRECT** in the context of the original sentence.
- Do NOT transform proper nouns or simple nouns unless it's a specific countable/uncountable trick.`;

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
 * @returns 번호가 매겨진 본문 (HTML 형식)
 */
function applyNumberAndUnderline(passage: string, originalWords: string[], transformedWords: string[]): string {
  let result = passage;

  const wordPositions: { word: string; transformedWord: string; index: number; position: number }[] = [];

  originalWords.forEach((originalWord, index) => {
    const transformedWord = transformedWords[index];
    const regex = new RegExp(`\\b${originalWord}\\b`);
    const match = result.match(regex);
    if (match && match.index !== undefined) {
      wordPositions.push({
        word: originalWord,
        transformedWord: transformedWord,
        index,
        position: match.index
      });
    }
  });

  wordPositions.sort((a, b) => a.position - b.position);

  const used = new Set<string>();
  wordPositions.reverse().forEach((wordPos, reverseIndex) => {
    const numberIndex = wordPositions.length - 1 - reverseIndex;
    const num = '①②③④⑤'[numberIndex];

    if (used.has(wordPos.word)) return;

    const regex = new RegExp(`\\b${wordPos.word}\\b`);
    if (regex.test(result)) {
      result = result.replace(
        regex,
        `${num}<span class="grammar-error-highlight"><u>${wordPos.transformedWord}</u></span>`
      );
      used.add(wordPos.word);
    }
  });

  const numCount = (result.match(/[①②③④⑤]/g) || []).length;
  const underlineCount = (result.match(/<u>.*?<\/u>/g) || []).length;

  if (numCount !== 5 || underlineCount !== 5) {
    throw new Error(`번호/밑줄 적용 실패: 번호 ${numCount}개, 밑줄 ${underlineCount}개 적용됨`);
  }

  return result;
}

