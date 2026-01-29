/**
 * Work_10 (다중 어법 오류 찾기) 문제 생성 로직
 * 유형#09와 동일한 난이도 평가 및 어법 변형 로직 사용
 */

import { callOpenAI, translateToKorean } from './common';
import { transformWord } from './work09Service';
import { EXCLUDE_RULES_PROMPT, CANDIDATE_SELECTION_RULES } from './workGrammarRules';

/**
 * 다중 어법 오류 문제 타입 정의
 */
export interface MultiGrammarQuiz {
  passage: string; // 원본 본문 (Plain Text)
  numberedPassage: string; // 번호/밑줄 적용된 본문 (HTML)
  options: number[]; // [3,4,5,6,7,8]
  answerIndex: number;
  translation: string;
  originalWords: string[];
  transformedWords: string[];
  wrongIndexes: number[];
}

/**
 * 8개 단어의 난이도를 모두 평가하는 함수 (유형#09의 evaluateDifficulty와 동일한 로직)
 */
async function evaluateDifficultiesForWork10(
  words: string[],
  passage: string
): Promise<Array<{ index: number; word: string; difficulty: number }>> {
  const wordCount = words.length;
  console.log(`🔍 ${wordCount}개 단어 난이도 평가 시작...`);
  
  const prompt = `**수능 고난도 어법 오류 문제 난이도 평가**

다음 ${wordCount}개 단어 각각의 난이도를 평가하세요. **수능 최고난도 수준**의 어법 오류 문제를 만들기에 적합한 정도를 평가합니다.

**선택된 단어들:**
${words.map((word, idx) => `${idx + 1}. "${word}"`).join('\n')}

**본문:**
${passage}

**난이도 평가 기준:**
1. **어법 복잡도**: 복잡한 구문 구조 내에서 판단이 필요한 어법일수록 높은 난이도
   - 관계사절, 분사구문, 가정법, 도치 등 복잡한 구문 구조
   - 단순 시제 변화, 기본 관사, 단순 전치사 등은 낮은 난이도
2. **의미 해석 영향**: 틀리면 문장 의미 해석에 큰 영향을 미치는 단어일수록 높은 난이도
3. **문맥 판단 필요**: 문맥과 문장 구조를 종합적으로 분석해야 판단 가능한 단어일수록 높은 난이도
4. **수능 출제 빈도**: 수능 고난도 문제에 자주 출제되는 어법 유형일수록 높은 난이도
   - 분사구문, 관계사, 가정법, 병렬구조, 수일치(복잡), 준동사 등

**우선 순위 (높은 난이도 순):**
1. 분사구문 (능동/수동 판단, 의미상 주어)
2. 관계사 (관계대명사 vs 관계부사, 전치사+관계대명사)
3. 가정법 (시제 불일치, if 생략)
4. 병렬구조 (형태 일치, 품사 일치)
5. 준동사 (동명사 vs 부정사, 분사 형태 판단)
6. 수일치 (복잡한 주어-동사 일치)
7. 능동/수동 (목적어 유무, 의미 판단)
8. 형용사 vs 부사 (보어 vs 수식어)
9. 전치사 (문맥 판단)
10. 기타

**평가 방법:**
- 위 기준에 따라 각 단어의 난이도를 평가하세요 (1-10점, 10점이 가장 높음)
- 각 단어에 대해 독립적으로 평가하세요

아래 JSON 형식으로만 응답하세요 (정확히 ${wordCount}개 항목을 반환해야 합니다):
{
  "difficulties": [
    ${words.map((word, idx) => `{ "index": ${idx}, "word": "${word}", "difficulty": 8 }`).join(',\n    ')}
  ]
}

**중요:** 반드시 ${wordCount}개 항목을 모두 반환해야 합니다.`;

  const response = await callOpenAI({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a grammar expert specializing in Korean CSAT (Suneung) English section. You evaluate the difficulty level of grammar words for creating high-level exam questions.'
      },
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

  let resultJson = content;
  if (content.includes('```json') || content.includes('```Json') || content.includes('```')) {
    resultJson = content.replace(/```(?:json|Json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
  }

  try {
    const result = JSON.parse(resultJson);

    if (!result.difficulties || !Array.isArray(result.difficulties)) {
      throw new Error('difficulties 배열이 올바르지 않습니다.');
    }

    if (result.difficulties.length !== words.length) {
      throw new Error(`difficulties 배열의 길이가 ${words.length}이 아닙니다. (실제: ${result.difficulties.length}개)`);
    }

    // 검증: 각 단어가 원본 배열에 있는지 확인
    const difficultyResults = result.difficulties.map((item: any) => {
      const wordLower = item.word.trim().toLowerCase();
      const foundIndex = words.findIndex(w => w.trim().toLowerCase() === wordLower);
      
      if (foundIndex === -1) {
        throw new Error(`평가된 단어 "${item.word}"가 선택된 단어 목록에 없습니다.`);
      }

      return {
        index: foundIndex,
        word: words[foundIndex],
        difficulty: item.difficulty || 5
      };
    });

    // 난이도 순으로 정렬 (높은 순)
    difficultyResults.sort((a: { index: number; word: string; difficulty: number }, b: { index: number; word: string; difficulty: number }) => b.difficulty - a.difficulty);

    console.log('✅ 난이도 평가 완료:', difficultyResults);
    return difficultyResults;

  } catch (parseError) {
    console.error('난이도 평가 파싱 실패:', resultJson);
    throw new Error(`난이도 평가에 실패했습니다: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }
}

/**
 * 유형#10: 다중 어법 오류 찾기 문제 생성
 * @param passage - 영어 본문
 * @param previouslySelectedWords - 이전에 선택된 단어 목록 (동일 본문으로 여러 번 생성 시 사용)
 * @returns 다중 어법 오류 문제 데이터
 */
export async function generateWork10Quiz(
  passage: string,
  previouslySelectedWords?: string[]
): Promise<MultiGrammarQuiz> {
  console.log('🔍 Work_10 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Step 1: 8개 단어 선택 (유형#09의 selectWords 로직과 동일하지만 8개 선택)
      // 유형#09의 selectWords를 재사용하되, 8개를 선택하도록 수정된 버전 사용
      const words = await selectWordsForWork10(passage, previouslySelectedWords);
      console.log('✅ 선택된 단어들:', words);

      // Step 2: 난이도 평가 (8개 단어 모두 평가)
      const difficultyResults = await evaluateDifficultiesForWork10(words, passage);
      console.log('✅ 난이도 평가 결과:', difficultyResults);

      // Step 3: 상위 3~8개 선택 (난이도 기반)
      // 선택된 단어 수에 따라 유연하게 처리 (최소 3개, 최대 words.length개)
      const maxWrongCount = Math.min(8, words.length);
      const minWrongCount = Math.min(3, words.length);
      const wrongCount = Math.floor(Math.random() * (maxWrongCount - minWrongCount + 1)) + minWrongCount; // 3~maxWrongCount
      const selectedIndices = difficultyResults.slice(0, wrongCount).map(r => r.index);
      console.log(`🎯 변형할 단어 선정: ${wrongCount}개 (인덱스: ${selectedIndices.join(', ')})`);

      // Step 4: 선택된 단어들을 각각 변형 (순차 처리로 어법 유형 중복 방지)
      // 병렬 처리 시 어법 유형 중복을 방지하기 어려우므로 순차 처리로 변경
      const transformedWords = [...words];
      const grammarTypes: string[] = [];
      const usedGrammarTypes: string[] = [];
      
      // 순차 처리로 각 변형이 이전 어법 유형을 피하도록 함
      for (const index of selectedIndices) {
        try {
          const transformation = await transformWord(words, index, usedGrammarTypes);
          transformedWords[index] = transformation.transformedWords[index];
          grammarTypes.push(transformation.grammarType);
          usedGrammarTypes.push(transformation.grammarType); // 사용된 어법 유형 추적
          console.log(`✅ 인덱스 ${index} 변형 완료: "${words[index]}" → "${transformedWords[index]}" (${transformation.grammarType})`);
          console.log(`📋 현재까지 사용된 어법 유형: ${usedGrammarTypes.join(', ')}`);
        } catch (error) {
          console.warn(`⚠️ 인덱스 ${index} 변형 실패, 원본 유지:`, error);
          // 변형 실패 시 원본 유지
        }
      }

      // Step 5: 번호/밑줄 적용
      const { numberedPassage, passageOrder } = applyNumberAndUnderlineForWork10(
        passage,
        words,
        transformedWords
      );
      console.log('✅ 번호/밑줄 적용 완료');

      // Step 6: 번역
      const translation = await translateToKorean(passage);
      console.log('✅ 번역 완료');

      // wrongIndexes 계산: 본문 순서 기준
      const wrongIndexes: number[] = [];
      selectedIndices.forEach(originalIndex => {
        const newIndex = passageOrder.indexOf(originalIndex);
        if (newIndex !== -1) {
          wrongIndexes.push(newIndex);
        }
      });
      wrongIndexes.sort((a, b) => a - b);

      // 옵션, 정답 계산
      const wrongCountFinal = wrongIndexes.length;
      const options = [3, 4, 5, 6, 7, 8];
      const answerIndex = options.indexOf(wrongCountFinal);

      if (answerIndex === -1) {
        throw new Error(`틀린 단어 개수(${wrongCountFinal})가 유효 범위(3~8)를 벗어났습니다.`);
      }

      // 본문 순서대로 재정렬
      const sortedOriginalWords = passageOrder.map(originalIdx => words[originalIdx]);
      const sortedTransformedWords = passageOrder.map(originalIdx => transformedWords[originalIdx]);

      const result: MultiGrammarQuiz = {
        passage: passage, // 원본 본문
        numberedPassage: numberedPassage, // HTML 적용된 본문
        options,
        answerIndex,
        translation,
        originalWords: sortedOriginalWords,
        transformedWords: sortedTransformedWords,
        wrongIndexes
      };

      console.log('✅ Work_10 문제 생성 완료:', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ Work_10 문제 생성 실패 (재시도 ${retryCount + 1}/${maxRetries}):`, errorMessage);
      
      if (retryCount < maxRetries - 1) {
        retryCount++;
        continue;
      }
      
      console.error('❌ Work_10 문제 생성 실패:', error);
      throw new Error(`문제 생성에 실패했습니다: ${errorMessage}`);
    }
  }
  
  throw new Error(`Work_10 문제 생성이 ${maxRetries}회 재시도 후에도 실패했습니다.`);
}

/**
 * 유형#10용 8개 단어 선택 함수 (유형#09의 selectWords와 동일한 로직, 8개 선택)
 */
async function selectWordsForWork10(
  passage: string,
  previouslySelectedWords?: string[]
): Promise<string[]> {
  // 유형#09의 selectWords 로직을 재사용하되, 8개를 선택하도록 수정
  // 여기서는 간단하게 유형#09의 로직을 복사하여 8개 선택하도록 수정
  
  // Step 1: 후보 단어 추출
  const candidatePrompt = `**수능 고난도 다중 어법 오류 문제용 단어 후보 추출**

${CANDIDATE_SELECTION_RULES}

본문에서 어법 변형 가능한 단어들을 추출하세요. **형태보다 해석과 판단이 필요한 문법**만 대상으로 합니다. 동사·동사구·절 단위·수식어를 우선 추출하고, 단순 명사·형용사만 나열하지 마세요.

${EXCLUDE_RULES_PROMPT}

**🚨 필수 포함: 형용사/부사 관련 단어 반드시 추출**
- 형용사/부사 관련 어법 문제를 만들 수 있는 단어를 **반드시 포함**하세요
- 예: possible, clear, necessary, important, significant, likely, certain, obvious, apparent, essential, crucial, vital, evident, distinct, precise, accurate, careful, serious 등
- 부사: possibly, clearly, necessarily, importantly, significantly, likely, certainly, obviously, apparently, essentially, crucially, vitally, evidently, distinctly, precisely, accurately, carefully, seriously 등
- 보어 자리에 쓰이는 형용사나 수식어로 쓰이는 부사가 있는 경우 반드시 추출

**우선:** 관계사, 분사구문, 가정법, 병렬구조, 수일치(고난도), 대명사, 접속사vs전치사, 의미상 주어/논리 오류, **to 부정사 복잡 구조**(to+be+동사ing, to+have been+p.p 등), **형용사/부사 (반드시 포함)**

**추출 기준:**
- 본문에 실제로 존재하는 단어만 (형태 그대로)
- 문법적으로 변형 가능한 단어 우선 (준동사, 동사, **형용사/부사 (필수)**, 전치사, 관계사/접속사)

본문:
${passage}
${previouslySelectedWords && previouslySelectedWords.length > 0 ? `

**⚠️ 매우 중요 - 이전 선택 단어 제외:**
* 아래 단어들은 이전에 이미 선택된 단어입니다. 이 단어들은 **절대 선택하지 마세요**:
* ${previouslySelectedWords.map(word => `"${word}"`).join(', ')}
* 위 단어들과는 **완전히 다른 단어**를 선택해야 합니다.` : ''}

응답 형식 (JSON 배열, 최소 20개 이상 추출):
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
    
    if (candidateContent.includes('```json') || candidateContent.includes('```Json') || candidateContent.includes('```')) {
      candidateContent = candidateContent.replace(/```(?:json|Json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
    }

    let candidateWords: string[] = [];
    try {
      candidateWords = JSON.parse(candidateContent);
    if (!Array.isArray(candidateWords) || candidateWords.length < 15) {
        throw new Error('후보 단어가 부족합니다.');
      }
    } catch (parseError) {
      console.error('후보 단어 파싱 실패:', candidateContent);
      throw new Error('후보 단어 추출에 실패했습니다.');
    }

  // Step 2: 유효한 후보 단어 필터링 + 등위접속사 제외
  const coordinatingConjunctions = ['or', 'and', 'but', 'nor', 'for', 'so', 'yet'];
    const validCandidateWords: string[] = [];
    for (const word of candidateWords) {
    // 등위접속사 제외
    if (coordinatingConjunctions.includes(word.toLowerCase())) {
      continue;
    }
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
      if (regex.test(passage)) {
        validCandidateWords.push(word);
      }
    }

    if (validCandidateWords.length < 8) {
      throw new Error(`본문에서 어법 변형 가능한 단어가 부족합니다. (${validCandidateWords.length}개 발견, 최소 8개 필요)`);
    }

    console.log(`✅ 본문에서 추출된 유효한 후보 단어: ${validCandidateWords.length}개`);

  // Step 3: 문장별 후보 추출
  const sentences = passage.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
  
  const sentenceCandidates: { sentenceIndex: number; sentence: string; candidates: string[] }[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const candidates: string[] = [];
    
    for (const word of validCandidateWords) {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
      if (regex.test(sentence)) {
        candidates.push(word);
      }
    }
    
    if (candidates.length > 0) {
      sentenceCandidates.push({
        sentenceIndex: i,
        sentence: sentence,
        candidates: candidates
      });
    }
  }
  
  // 유형#10은 8개 단어를 선택해야 하므로, 최소 8개 문장이 필요합니다.
  // 하지만 문장 수가 부족한 경우, 가능한 만큼만 선택하도록 유연하게 처리
  const minSentences = Math.min(8, sentenceCandidates.length);
  if (sentenceCandidates.length < 8) {
    console.warn(`⚠️ 본문에 8개 이상의 문장이 필요하지만, 현재 ${sentenceCandidates.length}개 문장에만 후보 단어가 존재합니다.`);
    // 최소 5개 문장은 있어야 함 (유형#10은 최소 3개 오류를 생성해야 하므로)
    if (sentenceCandidates.length < 5) {
      throw new Error(`본문에 최소 5개 이상의 문장이 필요합니다. (현재: ${sentenceCandidates.length}개 문장에 후보 단어 존재)`);
    }
  }
  
  const sentenceList = sentenceCandidates.map((item, idx) => 
    `문장 ${item.sentenceIndex + 1}: "${item.sentence}"\n가능한 후보 단어: ${JSON.stringify(item.candidates)}`
  ).join('\n\n');
  
  // 선택할 단어 개수 결정 (문장 수에 맞춰 최대 8개)
  const targetWordCount = Math.min(8, sentenceCandidates.length);

  const maxRetries = 5;
  let retryCount = 0;
  let previousErrors: string[] = [];
  
  while (retryCount < maxRetries) {
    try {
      const errorContext = previousErrors.length > 0 ? `

**⚠️ 이전 시도 실패 이유 (반드시 피하세요):**
${previousErrors.map((err, idx) => `${idx + 1}. ${err}`).join('\n')}
위 실수를 반복하지 마세요.` : '';

      const selectionPrompt = `**수능 고난도 다중 어법 오류 문제용 단어 ${targetWordCount}개 선정**${errorContext}

아래 목록에서 **수능 1등급 수준**의 어법 오류 찾기 문제를 위한 단어 ${targetWordCount}개를 선정하세요.

**⚠️ 필수 규칙 (엄격히 준수 - 위반 시 자동 실패):**
${CANDIDATE_SELECTION_RULES}

- **목록에 있는 단어만 선택** (목록 외 단어 절대 금지 - 위반 시 재시도됨)
- 단어 단위만 (구/절 금지)
- **🚨 절대 금지: "prior to", "because of", "instead of", "due to" 같은 전치사구를 "prior"와 "to"로 분리하여 선택하는 것**
- 중복 불가
- 관계사/접속사(that, which, what, when, where 등)는 **최대 1개만** (2개 이상 시 실패)
- **🚨 CRITICAL: 각 문장에서 정확히 1개만 선택** (한 문장에서 여러 단어 선택 시 자동 실패 및 재시도)
- **🚨 절대 금지: 한 문장에서 "are"와 "of" 같이 두 개의 단어를 선택하는 것**
- **🚨 절대 금지: 한 문장에서 "which"와 "since" 같이 두 개의 단어를 선택하는 것**
- **${targetWordCount}개 문제는 모두 다른 어법 유형**으로 생성해야 함 (동일 어법 반복 금지)
- **주어-동사 시제일치 문제 절대 금지** (1인칭/2인칭+동사원형, 3인칭+동사원형+s/-es 등)
- **단순 시제 변형 절대 금지** (was/were, 동사원형+-s/-es 등)
- ${EXCLUDE_RULES_PROMPT.replace('**제외:**', '**어법 변형 금지 규칙:**')}

**📋 본문 (문장 단위):**
${sentenceList}

**선택 방법 (반드시 이 순서로 따라야 함):**
1. 문장 1을 확인하고, 해당 문장에서 **정확히 1개** 단어만 선택 (0개는 안 됨, 2개도 안 됨)
2. 문장 2를 확인하고, 해당 문장에서 **정확히 1개** 단어만 선택 (0개는 안 됨, 2개도 안 됨)
3. 문장 3을 확인하고, 해당 문장에서 **정확히 1개** 단어만 선택 (0개는 안 됨, 2개도 안 됨)
4. ... 각 문장을 순회하며 총 ${targetWordCount}개 단어 선택
5. **절대 금지:** 한 문장에서 2개 이상의 단어를 선택하는 것 (이 규칙 위반 시 자동 실패)
6. **절대 금지:** "prior to"를 "prior"와 "to"로 분리하여 선택하는 것
7. **절대 금지:** "because of"를 "because"와 "of"로 분리하여 선택하는 것
8. **중요:** 정확히 ${targetWordCount}개 단어를 선택해야 합니다. ${targetWordCount}개보다 많거나 적으면 안 됩니다.

**선정 기준:**
1. **🚨 필수: 형용사/부사 관련 단어 반드시 1개 이상 선택**
   - 보어 자리에 쓰이는 형용사 (possible, clear, necessary, important, significant, likely, certain, obvious, apparent, essential, crucial, vital, evident, distinct, precise, accurate, careful, serious 등)
   - 수식어로 쓰이는 부사 (possibly, clearly, necessarily, importantly, significantly, likely, certainly, obviously, apparently, essentially, crucially, vitally, evidently, distinctly, precisely, accurately, carefully, seriously 등)
   - 형용사/부사 변형이 가능한 단어를 **반드시 1개 이상** 선택하세요
   - 예: "It remains possible" → "It remains possibly" (possible→possibly), "The result is clear" → "The result is clearly" (clear→clearly)
2. **복잡한 구문 내 문법 판단이 필요한 단어** 우선 (관계사절, 분사구문, 가정법, 도치 등)
3. **🚨 필수 어법 유형 다양성 (${targetWordCount}개 선택 시 반드시 서로 다른 어법 유형):**
   아래 어법 유형들을 최대한 다양하게 포함해야 함 (동일 어법 반복 절대 금지):
   - **형용사 vs 부사 (반드시 1개 이상 포함 - 필수)**
   - 관계대명사와 관계부사 (where, when, how 등)
   - 5형식에서 목적격 보어
   - 능동/수동 문제
   - 과거분사/현재분사
   - 대동사 (Do, Be)
   - 도치
   - 수의 일치 (주어+동사)
   **${targetWordCount}개 문제는 모두 서로 다른 어법 유형이어야 하며, 가능한 한 위 목록의 어법 유형들을 다양하게 포함해야 함**
   **🚨 형용사/부사 관련 어법(형용사 vs 부사)은 반드시 ${targetWordCount}개 중 1개 이상 포함되어야 함. (보어 자리 vs 수식어, possible→possibly, clear→clearly, necessary→necessarily 등)**
3. **의미 해석 영향:** 틀리면 문장 의미 해석에 실제 영향이 있어야 함
4. **우선 순서:** 준동사 > 동사 > 형용사/부사 > 전치사 > 관계사/접속사

**중요:** 각 문장의 "가능한 후보 단어" 목록에서만 선택하세요. 위 전체 목록이 아닌, 각 문장별로 제시된 후보 단어 목록만 사용하세요.

**🚨 매우 중요 - 선택 전 필수 체크리스트:**
1. 선택하려는 단어가 위 목록에 **정확히 존재하는가?** (목록에 없으면 절대 선택 금지)
2. 이전에 선택한 단어와 같은 문장에 있는가? (같은 문장이면 절대 선택 금지)
3. 각 문장에서 이미 1개를 선택했는가? (이미 선택했다면 그 문장에서 더 이상 선택 금지)
4. "prior to", "because of", "instead of" 같은 구를 분리하여 선택하지 않았는가? (분리 선택 절대 금지)

**올바른 선택 예시:**
- 문장 1: "are" 선택 (목록에 있음, 문장 1에서 1개만) ✅
- 문장 2: "which" 선택 (목록에 있음, 문장 2에서 1개만) ✅
- 문장 3: "prior" 선택 (목록에 있음, 단 "prior to"가 있으면 "prior"만 선택 가능) ✅

**잘못된 선택 예시 (절대 금지):**
- ❌ 문장 1에서 "are"와 "of" 두 개 선택 (한 문장에서 2개 선택 금지)
- ❌ 문장 4에서 "which"와 "since" 두 개 선택 (한 문장에서 2개 선택 금지)
- ❌ 문장 5에서 "prior"와 "to" 두 개 선택 (한 문장에서 2개 선택 금지, "prior to"는 하나의 구)
- ❌ 목록에 없는 "minor" 선택 (목록 외 단어 선택 금지)

**최종 검증:** 각 단어에 대해 "이 문법 오류가 고등학교 교실에서 설명할 가치가 있는가?" 질문하고, "아니오"면 선택하지 마세요.

결과는 아래 JSON 배열 형식으로만 반환하세요 (정확히 ${targetWordCount}개 단어):
${targetWordCount === 8 ? '["word1", "word2", "word3", "word4", "word5", "word6", "word7", "word8"]' : `[${Array.from({ length: targetWordCount }, (_, i) => `"word${i + 1}"`).join(', ')}]`}

**⚠️ 최종 확인 (반드시 체크):**
1. 정확히 ${targetWordCount}개 단어를 선택했는가?
2. 각 문장에서 정확히 1개만 선택했는가? (0개도 안 됨, 2개도 안 됨)
3. 선택한 모든 단어가 위 "가능한 후보 단어" 목록에 있는가?
4. 한 문장에서 2개 이상의 단어를 선택하지 않았는가?
5. "prior to", "because of" 같은 구를 분리하여 선택하지 않았는가?

**📝 Few-shot 예제 (올바른 선택 방법):**

예제 1:
- 문장 1: "There are two forms of strokes - little and big."
  - 가능한 후보: ["are", "of", "forms"]
  - ✅ 올바른 선택: ["are"] (1개만 선택)
  - ❌ 잘못된 선택: ["are", "of"] (2개 선택 금지)

예제 2:
- 문장 4: "One hears less about them since it is the big strokes which often kill."
  - 가능한 후보: ["which", "since", "hears"]
  - ✅ 올바른 선택: ["which"] (1개만 선택)
  - ❌ 잘못된 선택: ["which", "since"] (2개 선택 금지)

예제 3:
- 문장 5: "Little strokes occur in some people for a number of years prior to the development."
  - 가능한 후보: ["prior", "to", "occur", "development"]
  - ✅ 올바른 선택: ["prior"] (1개만 선택, "prior to"는 하나의 구이므로 "prior"만 선택)
  - ❌ 잘못된 선택: ["prior", "to"] (2개 선택 금지, "prior to"를 분리하지 마세요)`;

    const response = await callOpenAI({
      model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `You are a helpful assistant that selects words from a provided list.

CRITICAL RULES (MUST FOLLOW - VIOLATION = AUTOMATIC FAILURE):
1. You MUST ONLY select words that are EXACTLY in the provided sentence-specific candidate lists
2. If a word is NOT in the candidate list for that sentence, you MUST NOT select it
3. You must strictly follow the rule: select EXACTLY ONE word per sentence (NOT zero, NOT two)
4. Return only valid JSON arrays
5. Before selecting any word, verify that it exists in the candidate list for that specific sentence
6. Selecting a word not in the list will cause automatic failure
7. Selecting multiple words from the same sentence will cause automatic failure
8. DO NOT split phrases like "prior to", "because of", "instead of" into separate words
9. If you see "prior to" in a sentence, you can select "prior" OR "to" but NOT BOTH

VERIFICATION STEPS (MANDATORY FOR EACH WORD):
For each word you want to select:
- Step 1: Check if the word exists in the candidate list for that specific sentence (case-insensitive match)
- Step 2: Check which sentence the word belongs to
- Step 3: Check if you have already selected a word from that sentence
- Step 4: If you have already selected a word from that sentence, DO NOT select another word from the same sentence
- Step 5: If all checks pass, you can select the word
- Step 6: If any check fails, DO NOT select the word

EXAMPLES OF CORRECT SELECTION:
- Sentence 1: Select "are" (exists in list, only 1 word from sentence 1) ✅
- Sentence 2: Select "which" (exists in list, only 1 word from sentence 2) ✅
- Sentence 3: Select "prior" (exists in list, only 1 word from sentence 3, even if "prior to" exists) ✅

EXAMPLES OF INCORRECT SELECTION (FORBIDDEN):
- ❌ Sentence 1: Select both "are" AND "of" (2 words from same sentence = FORBIDDEN)
- ❌ Sentence 4: Select both "which" AND "since" (2 words from same sentence = FORBIDDEN)
- ❌ Sentence 5: Select both "prior" AND "to" (2 words from same sentence = FORBIDDEN, even if "prior to" exists)
- ❌ Select "minor" if it's not in the candidate list (word not in list = FORBIDDEN)`
          },
          { role: 'user', content: selectionPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
      let wordsJson = content;
    if (content.includes('```json') || content.includes('```Json') || content.includes('```')) {
        wordsJson = content.replace(/```(?:json|Json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
    }
    
      let words: string[];
      try {
        words = JSON.parse(wordsJson);
      } catch (jsonError) {
        console.warn(`⚠️ JSON 파싱 실패 (재시도 ${retryCount + 1}/${maxRetries}):`, jsonError instanceof Error ? jsonError.message : String(jsonError));
        if (retryCount < maxRetries - 1) {
          retryCount++;
          continue;
        }
        throw new Error(`AI 응답 형식 오류: JSON 파싱에 실패했습니다.`);
    }

      if (!Array.isArray(words)) {
        throw new Error('선택된 단어가 배열 형식이 아닙니다.');
    }

      // 문장 수에 따라 유연하게 처리 (최소 5개, 최대 8개)
      const expectedCount = Math.min(8, sentenceCandidates.length);
      // 단어 수가 맞지 않아도 일단 진행 (나중에 자동 수정)
      if (words.length < 5) {
        throw new Error(`선택된 단어가 너무 적습니다: ${words.length}개 (최소 5개 필요)`);
    }

      // 검증: 각 문장의 후보 목록에 있는지 확인 및 wordSentenceMap 구축
    const invalidWords: string[] = [];
      const wordSentenceMap: { [word: string]: number } = {};
      
      for (const word of words) {
        let found = false;
        let sentenceIndex = -1;
        
        // 모든 문장을 확인하여 해당 단어가 어느 문장에 속하는지 찾기
        for (const item of sentenceCandidates) {
      const wordLower = word.trim().toLowerCase();
          const isInCandidates = item.candidates.some(candidate => candidate.trim().toLowerCase() === wordLower);
          
          if (isInCandidates) {
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
            if (regex.test(item.sentence)) {
              // 여러 문장에 같은 단어가 있을 수 있으므로, 첫 번째로 찾은 문장 사용
              if (!found) {
                found = true;
                sentenceIndex = item.sentenceIndex;
                wordSentenceMap[word] = sentenceIndex;
              }
            }
          }
        }
        
        // 후보 목록에 없어도 본문에 존재하면 문장 찾기 시도
        if (!found) {
          const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
          for (const item of sentenceCandidates) {
            if (regex.test(item.sentence)) {
              found = true;
              sentenceIndex = item.sentenceIndex;
              wordSentenceMap[word] = sentenceIndex;
              break;
            }
          }
        }
        
        if (!found) {
        invalidWords.push(word);
      }
    }
    
    if (invalidWords.length > 0) {
        const errorMsg = `유효한 후보 목록에 없는 단어를 선택했습니다: ${invalidWords.join(', ')}. 각 문장의 "가능한 후보 단어" 목록에서만 선택하세요.`;
        console.warn(`⚠️ 유효하지 않은 단어 선택됨 (재시도 ${retryCount + 1}/${maxRetries}): ${invalidWords.join(', ')}`);
        if (retryCount < maxRetries - 1) {
          previousErrors.push(errorMsg);
          retryCount++;
          continue;
        }
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
        console.warn(`⚠️ 본문에 존재하지 않는 단어 (재시도 ${retryCount + 1}/${maxRetries}): ${missingWords.join(', ')}`);
        if (retryCount < maxRetries - 1) {
          retryCount++;
          continue;
        }
        throw new Error(`본문에 존재하지 않는 단어가 선택되었습니다: ${missingWords.join(', ')}`);
    }

      // 중복 제거: 같은 단어가 여러 번 선택된 경우 제거
      const uniqueWords: string[] = [];
      const seenWords = new Set<string>();
      for (const word of words) {
        const wordLower = word.trim().toLowerCase();
        if (!seenWords.has(wordLower)) {
          seenWords.add(wordLower);
          uniqueWords.push(word);
        }
      }
      
      if (uniqueWords.length !== words.length) {
        console.warn(`⚠️ 중복 단어 제거: ${words.length}개 → ${uniqueWords.length}개`);
        words = uniqueWords;
    }
    
      // 같은 문장에 여러 단어가 선택된 경우, 각 문장에서 첫 번째만 유지
      const sentenceWordCount: { [sentenceIndex: number]: string[] } = {};
      const sentenceFirstWord: { [sentenceIndex: number]: string } = {};
      
      for (const word of words) {
        const sentenceIndex = wordSentenceMap[word];
        if (sentenceIndex !== undefined) {
          if (!sentenceWordCount[sentenceIndex]) {
            sentenceWordCount[sentenceIndex] = [];
            sentenceFirstWord[sentenceIndex] = word;
          }
          sentenceWordCount[sentenceIndex].push(word);
        }
    }

      // 각 문장에서 첫 번째 단어만 유지
      const correctedWords: string[] = [];
      const usedSentences = new Set<number>();
      
      for (const word of words) {
        const sentenceIndex = wordSentenceMap[word];
        if (sentenceIndex !== undefined) {
          if (!usedSentences.has(sentenceIndex)) {
            correctedWords.push(word);
            usedSentences.add(sentenceIndex);
          }
        } else {
          // 문장 인덱스를 찾을 수 없는 경우도 포함 (안전장치)
          correctedWords.push(word);
        }
      }
      
      // 추가 검증: "prior to", "because of" 같은 구가 분리되어 선택되었는지 확인
      const phrasePairs = [
        ['prior', 'to'], ['because', 'of'], ['instead', 'of'], ['due', 'to'],
        ['according', 'to'], ['owing', 'to'], ['thanks', 'to'], ['next', 'to']
      ];
      
      const violations: string[] = [];
      for (const [sentenceIdx, wordList] of Object.entries(sentenceWordCount)) {
        if (wordList.length > 1) {
          const idx = parseInt(sentenceIdx);
          const sentenceItem = sentenceCandidates.find(item => item.sentenceIndex === idx);
          const sentenceText = sentenceItem ? sentenceItem.sentence.substring(0, 80) : '';
          
          // 구(phrase)가 분리되어 선택되었는지 확인
          const wordListLower = wordList.map(w => w.trim().toLowerCase());
          const isPhraseSplit = phrasePairs.some(pair => 
            wordListLower.includes(pair[0].toLowerCase()) && wordListLower.includes(pair[1].toLowerCase())
          );
          
          if (isPhraseSplit) {
            violations.push(`문장 ${idx + 1} ("${sentenceText}..."): ${wordList.join(', ')} (구가 분리되어 선택됨)`);
          } else {
            violations.push(`문장 ${idx + 1} ("${sentenceText}..."): ${wordList.join(', ')}`);
          }
        }
      }
      
      // 수정된 단어 목록 사용
      words = correctedWords;
      
      // 수정 후에도 문제가 있으면 경고만 출력하고 계속 진행
      if (violations.length > 0) {
        console.warn(`⚠️ 같은 문장에서 여러 단어가 선택되어 자동 수정됨 (재시도 ${retryCount + 1}/${maxRetries}):\n${violations.join('\n')}`);
        console.log(`📝 수정된 단어 목록: ${words.length}개 - ${words.join(', ')}`);
      }
      
      // 수정 후 단어 수가 부족한 경우, 사용되지 않은 문장에서 추가로 선택
      if (words.length < targetWordCount) {
        const usedSentenceIndices = new Set<number>();
        for (const word of words) {
          const sentenceIndex = wordSentenceMap[word];
          if (sentenceIndex !== undefined) {
            usedSentenceIndices.add(sentenceIndex);
          }
        }
        
        // 사용되지 않은 문장에서 후보 단어 찾기
        const availableCandidates: { sentenceIndex: number; word: string }[] = [];
        for (const item of sentenceCandidates) {
          if (!usedSentenceIndices.has(item.sentenceIndex)) {
            for (const candidate of item.candidates) {
              // 이미 선택된 단어가 아닌 경우만 추가
              if (!words.some(w => w.trim().toLowerCase() === candidate.trim().toLowerCase())) {
                availableCandidates.push({
                  sentenceIndex: item.sentenceIndex,
                  word: candidate
                });
              }
            }
          }
        }
        
        // 중복 제거 (같은 문장에서 여러 후보가 있을 수 있음)
        const uniqueCandidates: { sentenceIndex: number; word: string }[] = [];
        const seenWords = new Set<string>();
        const seenSentences = new Set<number>();
        
        for (const candidate of availableCandidates) {
          const wordLower = candidate.word.trim().toLowerCase();
          if (!seenWords.has(wordLower) && !seenSentences.has(candidate.sentenceIndex)) {
            seenWords.add(wordLower);
            seenSentences.add(candidate.sentenceIndex);
            uniqueCandidates.push(candidate);
          }
        }
        
        // 부족한 만큼 추가
        const needed = targetWordCount - words.length;
        if (uniqueCandidates.length >= needed) {
          const additionalWords = uniqueCandidates.slice(0, needed).map(c => c.word);
          words = [...words, ...additionalWords];
          console.log(`✅ 부족한 단어 자동 보완: ${additionalWords.length}개 추가 - ${additionalWords.join(', ')}`);
          console.log(`📝 최종 단어 목록: ${words.length}개 - ${words.join(', ')}`);
        } else {
          // 보완할 수 없으면 재시도
          const errorMsg = `수정 후 단어 수가 부족하고 보완할 수 없습니다: ${words.length}개 (필요: ${targetWordCount}개, 사용 가능한 후보: ${uniqueCandidates.length}개). 재시도합니다.`;
          console.warn(`⚠️ ${errorMsg}`);
             if (retryCount < maxRetries - 1) {
            previousErrors.push(errorMsg);
               retryCount++;
            continue;
          }
          // 최소 5개 이상이면 허용 (유형#10은 3-8개 오류이므로)
          if (words.length >= 5) {
            console.warn(`⚠️ 단어 수가 부족하지만 최소 요구사항(5개)을 만족하므로 진행: ${words.length}개`);
            // targetWordCount를 실제 단어 수로 조정
            // 이는 나중에 사용될 수 있으므로 words.length로 조정
          } else {
            throw new Error(`단어 수가 부족합니다: ${words.length}개 (최소 5개 필요)`);
          }
        }
    }

      // 단어 수가 정확히 맞는지 확인
      if (words.length !== targetWordCount) {
        // 초과된 경우 앞에서부터 targetWordCount개만 사용
        if (words.length > targetWordCount) {
          console.warn(`⚠️ 단어 수가 초과되어 앞에서 ${targetWordCount}개만 사용: ${words.length}개 → ${targetWordCount}개`);
          words = words.slice(0, targetWordCount);
    }
      }
      
      console.log(`✅ 단어 선택 성공 (시도 ${retryCount + 1}):`, words);
      previousErrors = [];
      return words;
      
    } catch (parseError: any) {
      console.warn(`⚠️ 예상치 못한 에러 발생 (재시도 ${retryCount + 1}/${maxRetries}):`, parseError instanceof Error ? parseError.message : String(parseError));
      if (retryCount < maxRetries - 1) {
        retryCount++;
        continue;
      }
      console.error('❌ 단어 선택 최종 실패:', parseError);
      throw parseError;
    }
  }
  
  throw new Error(`단어 선택이 ${maxRetries}회 재시도 후에도 실패했습니다.`);
}

/**
 * 유형#10용 번호/밑줄 적용 함수
 */
function applyNumberAndUnderlineForWork10(
  passage: string,
  originalWords: string[],
  transformedWords: string[]
): {
  numberedPassage: string;
  passageOrder: number[];
} {
  const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
  const passageOrder: number[] = [];
  const wordPositions: Array<{ originalIndex: number; start: number; end: number }> = [];
  
  // 각 단어의 위치 찾기
  for (let i = 0; i < originalWords.length; i++) {
    const word = originalWords[i];
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    const match = regex.exec(passage);
    
    if (match) {
      wordPositions.push({
        originalIndex: i,
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  
  // 위치 기준으로 정렬
  wordPositions.sort((a, b) => a.start - b.start);
  
  // passageOrder 생성: 본문 순서대로 나타나는 originalWords 인덱스
  passageOrder.push(...wordPositions.map(wp => wp.originalIndex));
  
  // 뒤에서부터 치환 (인덱스 유지)
  let numberedPassage = passage;
  for (let i = wordPositions.length - 1; i >= 0; i--) {
    const pos = wordPositions[i];
    const circleNumber = circleNumbers[i];
    const displayWord = transformedWords[pos.originalIndex];
    const replacement = `<span class="word-idx">${circleNumber}</span><u>${displayWord}</u>`;
    
    numberedPassage = 
      numberedPassage.substring(0, pos.start) + 
      replacement + 
      numberedPassage.substring(pos.end);
  }
  
  // 줄바꿈 처리
  numberedPassage = numberedPassage.replace(/\n/g, '<br/>');
  
  return { numberedPassage, passageOrder };
}
