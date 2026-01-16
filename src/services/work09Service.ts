/**
 * Work_09 (어법 오류 찾기) 문제 생성 로직
 * 원본: src/components/work/Work_09_GrammarError/Work_09_GrammarError.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI, translateToKorean } from './common';
import { 
  FORBIDDEN_TRANSFORMATIONS_PROMPT, 
  FORBIDDEN_EXAMPLES_PROMPT, 
  EXCLUDE_RULES_PROMPT,
  validateTransformation 
} from './workGrammarRules';

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

    // Step 2: 난이도 평가 (선택된 5개 단어 중 가장 난이도 높은 단어 선정)
    const difficultyResult = await evaluateDifficulty(words, passage);
    console.log('✅ 난이도 평가 결과:', difficultyResult);
    console.log(`🎯 정답 단어 선정: 인덱스 ${difficultyResult.answerIndex}, 단어 "${difficultyResult.original}", 난이도 ${difficultyResult.difficulty}`);

    // Step 3: 어법 변형 (난이도 평가로 선정된 단어를 변형)
    const transformation = await transformWord(words, difficultyResult.answerIndex);
    console.log('✅ 어법 변형 결과:', transformation);

    // Step 4: 원본 단어를 변형된 단어로 교체하면서 번호/밑줄 적용
    const { numberedPassage, passageOrder } = applyNumberAndUnderline(passage, words, transformation.transformedWords);
    console.log('✅ 번호/밑줄 적용 완료');
    console.log('📋 본문에 나타나는 순서 (originalWords 인덱스):', passageOrder);

    // Step 5: 번역
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
  // Step 1: 본문에서 어법 변형 가능한 단어 후보를 먼저 추출 (재시도 불필요, 한 번만 수행)
  const candidatePrompt = `**수능 고난도 어법 오류 문제용 단어 후보 추출**

본문에서 어법 변형 가능한 단어들을 추출하세요. **형태보다 해석과 판단이 필요한 문법**만 대상으로 합니다.

${EXCLUDE_RULES_PROMPT}

**우선:** 관계사, 분사구문, 가정법, 병렬구조, 수일치(고난도), 대명사, 접속사vs전치사, 의미상 주어/논리 오류, **to 부정사 복잡 구조**(to+be+동사ing, to+have been+p.p 등)

**추출 기준:**
- 본문에 실제로 존재하는 단어만 (형태 그대로)
- 문법적으로 변형 가능한 단어 우선 (준동사, 동사, 형용사/부사, 전치사, 관계사/접속사)

본문:
${passage}
${previouslySelectedWords && previouslySelectedWords.length > 0 ? `

**⚠️ 매우 중요 - 이전 선택 단어 제외:**
* 아래 단어들은 이전에 이미 선택된 단어입니다. 이 단어들은 **절대 선택하지 마세요**:
* ${previouslySelectedWords.map(word => `"${word}"`).join(', ')}
* 위 단어들과는 **완전히 다른 단어**를 선택해야 합니다.` : ''}

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

  // Step 2: 추출된 후보 단어 중에서 본문에 실제로 존재하는 것만 필터링 + 등위접속사 제외
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

  if (validCandidateWords.length < 5) {
    throw new Error(`본문에서 어법 변형 가능한 단어가 부족합니다. (${validCandidateWords.length}개 발견, 최소 5개 필요)`);
  }

  console.log(`✅ 본문에서 추출된 유효한 후보 단어: ${validCandidateWords.length}개`);

  // Step 3: 유효한 후보 단어 중에서 최종 5개 선택 (문장별 후보 추출 방식)
  // 본문을 문장 단위로 분할 (마침표, 느낌표, 물음표 기준)
  const sentences = passage.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
  
  // 각 문장별로 후보 단어 추출 (코드 레벨에서 미리 추출)
  const sentenceCandidates: { sentenceIndex: number; sentence: string; candidates: string[] }[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const candidates: string[] = [];
    
    // 유효한 후보 단어 중에서 이 문장에 실제로 존재하는 단어만 추출
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
  
  if (sentenceCandidates.length < 5) {
    throw new Error(`본문에 5개 이상의 문장이 필요합니다. (현재: ${sentenceCandidates.length}개 문장에 후보 단어 존재)`);
  }
  
  // 문장별 후보 단어를 프롬프트에 포함
  const sentenceList = sentenceCandidates.map((item, idx) => 
    `문장 ${item.sentenceIndex + 1}: "${item.sentence}"\n가능한 후보 단어: ${JSON.stringify(item.candidates)}`
  ).join('\n\n');
  
  const maxRetries = 5;
  let retryCount = 0;
  let previousErrors: string[] = [];
  
  while (retryCount < maxRetries) {
    try {

      const errorContext = previousErrors.length > 0 ? `

**⚠️ 이전 시도 실패 이유 (반드시 피하세요):**
${previousErrors.map((err, idx) => `${idx + 1}. ${err}`).join('\n')}
위 실수를 반복하지 마세요.` : '';

      const selectionPrompt = `**수능 고난도 어법 오류 문제용 단어 5개 선정**${errorContext}

아래 목록에서 **수능 1등급 수준**의 어법 오류 찾기 문제를 위한 단어 5개를 선정하세요.

**⚠️ 필수 규칙 (엄격히 준수 - 위반 시 자동 실패):**
- **목록에 있는 단어만 선택** (목록 외 단어 절대 금지 - 위반 시 재시도됨)
- 단어 단위만 (구/절 금지)
- 중복 불가
- 관계사/접속사(that, which, what, when, where 등)는 **최대 1개만** (2개 이상 시 실패)
- **🚨 CRITICAL: 각 문장에서 최대 1개만 선택** (한 문장에서 여러 단어 선택 시 자동 실패 및 재시도)
- **5개 문제는 모두 다른 어법 유형**으로 생성해야 함 (동일 어법 반복 금지)
- **주어-동사 시제일치 문제 절대 금지** (1인칭/2인칭+동사원형, 3인칭+동사원형+s/-es 등)
- **단순 시제 변형 절대 금지** (was/were, 동사원형+-s/-es 등)
- ${EXCLUDE_RULES_PROMPT.replace('**제외:**', '**어법 변형 금지 규칙:**')}

**📋 본문 (문장 단위):**
${sentenceList}

**선택 방법 (반드시 이 순서로 따라야 함):**
1. 문장 1을 확인하고, 해당 문장에서 **최대 1개** 단어만 선택 (또는 0개)
2. 문장 2를 확인하고, 해당 문장에서 **최대 1개** 단어만 선택 (또는 0개)
3. 문장 3을 확인하고, 해당 문장에서 **최대 1개** 단어만 선택 (또는 0개)
4. ... 각 문장을 순회하며 총 5개 단어 선택
5. **절대 금지:** 한 문장에서 2개 이상의 단어를 선택하는 것 (이 규칙 위반 시 자동 실패)

**선정 기준:**
1. **복잡한 구문 내 문법 판단이 필요한 단어** 우선 (관계사절, 분사구문, 가정법, 도치 등)
2. **🚨 필수 어법 유형 다양성 (5개 선택 시 반드시 서로 다른 어법 유형):**
   아래 어법 유형들을 최대한 다양하게 포함해야 함 (동일 어법 반복 절대 금지):
   - 관계대명사와 관계부사 (where, when, how 등)
   - 형용사 vs 부사
   - 5형식에서 목적격 보어
   - 능동/수동 문제
   - 과거분사/현재분사
   - 대동사 (Do, Be)
   - 도치
   - 수의 일치 (주어+동사)
   **5개 문제는 모두 서로 다른 어법 유형이어야 하며, 가능한 한 위 목록의 어법 유형들을 다양하게 포함해야 함**
3. **의미 해석 영향:** 틀리면 문장 의미 해석에 실제 영향이 있어야 함
4. **우선 순서:** 준동사 > 동사 > 형용사/부사 > 전치사 > 관계사/접속사

**중요:** 각 문장의 "가능한 후보 단어" 목록에서만 선택하세요. 위 전체 목록이 아닌, 각 문장별로 제시된 후보 단어 목록만 사용하세요.

**🚨 매우 중요 - 선택 전 필수 체크리스트:**
1. 선택하려는 단어가 위 목록에 **정확히 존재하는가?** (목록에 없으면 절대 선택 금지)
2. 이전에 선택한 단어와 같은 문장에 있는가? (같은 문장이면 절대 선택 금지)
3. 각 문장에서 이미 1개를 선택했는가? (이미 선택했다면 그 문장에서 더 이상 선택 금지)

**올바른 선택 예시:**
- 문장 1: "word1" 선택 (목록에 있음) ✅
- 문장 2: "word2" 선택 (목록에 있음, 문장 1과 다른 문장) ✅
- 문장 3: "word3" 선택 (목록에 있음, 문장 1,2와 다른 문장) ✅
- 문장 4: "word4" 선택 (목록에 있음, 이전 문장들과 다른 문장) ✅
- 문장 5: "word5" 선택 (목록에 있음, 이전 문장들과 다른 문장) ✅

**잘못된 선택 예시 (절대 금지):**
- ❌ 문장 3에서 "word1"과 "word2" 두 개 선택 (한 문장에서 2개 선택 금지)
- ❌ 목록에 없는 "where" 선택 (목록 외 단어 선택 금지)
- ❌ 문장 1에서 이미 선택했는데 문장 1에서 또 선택 (같은 문장 중복 선택 금지)

**최종 검증:** 각 단어에 대해 "이 문법 오류가 고등학교 교실에서 설명할 가치가 있는가?" 질문하고, "아니오"면 선택하지 마세요.

결과는 아래 JSON 배열 형식으로만 반환하세요:
["word1", "word2", "word3", "word4", "word5"]`;

  const response = await callOpenAI({
    model: 'gpt-4o',
    messages: [
          { role: 'system', content: `You are a helpful assistant that selects words from a provided list. 

CRITICAL RULES (MUST FOLLOW):
1. You MUST ONLY select words that are EXACTLY in the provided validCandidateWords list
2. If a word is NOT in the validCandidateWords list, you MUST NOT select it
3. You must strictly follow the rule: select at most ONE word per sentence
4. Return only valid JSON arrays
5. Before selecting any word, verify that it exists in the validCandidateWords list
6. Selecting a word not in the list will cause automatic failure
7. Selecting multiple words from the same sentence will cause automatic failure

VERIFICATION STEPS:
For each word you want to select:
- Step 1: Check if the word exists in the validCandidateWords list (case-insensitive match)
- Step 2: Check which sentence the word belongs to
- Step 3: Check if you have already selected a word from that sentence
- Step 4: If both checks pass, you can select the word
- Step 5: If any check fails, DO NOT select the word` },
      { role: 'user', content: selectionPrompt }
    ],
        temperature: 0.2,
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
    if (!Array.isArray(words) || words.length !== 5) {
      throw new Error('선택된 단어가 5개가 아닙니다.');
    }
    
      // 선택된 단어가 각 문장의 후보 목록에 있는지 검증 (코드 레벨 검증)
    const invalidWords: string[] = [];
      const wordSentenceMap: { [word: string]: number } = {}; // 각 단어가 어느 문장에 속하는지
      
    for (const word of words) {
        let found = false;
        let sentenceIndex = -1;
        
        // 각 문장별 후보 목록에서 단어 찾기
        for (const item of sentenceCandidates) {
      const wordLower = word.trim().toLowerCase();
          const isInCandidates = item.candidates.some(candidate => candidate.trim().toLowerCase() === wordLower);
          
          if (isInCandidates) {
            // 문장에 실제로 존재하는지 확인
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
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
    
      // 같은 문장에 여러 단어가 선택되었는지 검증 (코드 레벨 검증)
      const sentenceWordCount: { [sentenceIndex: number]: string[] } = {};
      for (const word of words) {
        const sentenceIndex = wordSentenceMap[word];
        if (sentenceIndex !== undefined) {
          if (!sentenceWordCount[sentenceIndex]) {
            sentenceWordCount[sentenceIndex] = [];
          }
          sentenceWordCount[sentenceIndex].push(word);
        }
      }
      
      // 같은 문장에 2개 이상 있는 경우 찾기
      const violations: string[] = [];
      for (const [sentenceIdx, wordList] of Object.entries(sentenceWordCount)) {
        if (wordList.length > 1) {
          const idx = parseInt(sentenceIdx);
          const sentenceItem = sentenceCandidates.find(item => item.sentenceIndex === idx);
          const sentenceText = sentenceItem ? sentenceItem.sentence.substring(0, 80) : '';
          violations.push(`문장 ${idx + 1} ("${sentenceText}..."): ${wordList.join(', ')}`);
        }
      }
      
      if (violations.length > 0) {
        const errorMsg = `한 문장에서 여러 단어를 선택했습니다: ${violations.map(v => v.split(':')[1].trim()).join(', ')}. 각 문장에서 최대 1개만 선택하세요.`;
        console.warn(`⚠️ 같은 문장에서 여러 단어가 선택됨 (재시도 ${retryCount + 1}/${maxRetries}):\n${violations.join('\n')}`);
        if (retryCount < maxRetries - 1) {
          previousErrors.push(errorMsg);
          retryCount++;
          continue;
        }
        throw new Error(`한 문장에서 여러 단어가 선택되었습니다:\n${violations.join('\n')}`);
      }
      
      // 모든 검증 통과
      console.log(`✅ 단어 선택 성공 (시도 ${retryCount + 1}):`, words);
      previousErrors = []; // 성공 시 에러 기록 초기화
    return words;
      
    } catch (parseError: any) {
      // 예상치 못한 에러 (API 에러 등)
      console.warn(`⚠️ 예상치 못한 에러 발생 (재시도 ${retryCount + 1}/${maxRetries}):`, parseError instanceof Error ? parseError.message : String(parseError));
      if (retryCount < maxRetries - 1) {
        retryCount++;
        continue;
      }
      // 최종 재시도 실패
      console.error('❌ 단어 선택 최종 실패:', parseError);
      throw parseError;
    }
  }
  
  throw new Error(`단어 선택이 ${maxRetries}회 재시도 후에도 실패했습니다.`);
}

/**
 * MCP 2: 난이도 평가 서비스
 * @param words - 선택된 단어 배열
 * @param passage - 영어 본문
 * @returns 가장 난이도 높은 단어의 인덱스와 정보
 */
export async function evaluateDifficulty(
  words: string[],
  passage: string
): Promise<{
  answerIndex: number;
  original: string;
  difficulty: number;
}> {
  const prompt = `**수능 고난도 어법 오류 문제 난이도 평가**

다음 5개 단어 중에서 **수능 최고난도 수준**의 어법 오류 문제를 만들기에 가장 적합한 단어 1개를 선정하세요.

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

**결정 방법:**
- 위 기준에 따라 각 단어의 난이도를 평가하고 (1-10점, 10점이 가장 높음)
- 가장 높은 난이도 점수를 받은 단어 1개를 선택
- 동점인 경우, 어법 복잡도 > 의미 해석 영향 > 문맥 판단 필요 순서로 우선순위 결정

아래 JSON 형식으로만 응답하세요:
{
  "answerIndex": 2,
  "original": "collected",
  "difficulty": 9
}`;

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
    max_tokens: 500,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API 오류: ${response.status}`);
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
    if (!result.original || typeof result.original !== 'string') {
      throw new Error('original이 올바르지 않습니다.');
    }

    // original 단어가 배열에 실제로 존재하는지 확인하고, 인덱스 찾기
    const wordLower = result.original.trim().toLowerCase();
    const foundIndex = words.findIndex(w => w.trim().toLowerCase() === wordLower);
    
    if (foundIndex === -1) {
      throw new Error(`선정된 단어 "${result.original}"가 선택된 단어 목록에 없습니다.`);
    }

    // answerIndex 검증 (original 기준으로 찾은 인덱스가 유효한지 확인)
    if (typeof result.answerIndex === 'number' && (result.answerIndex < 0 || result.answerIndex > 4)) {
      console.warn(`⚠️ answerIndex(${result.answerIndex})가 범위를 벗어났습니다. original("${result.original}")의 실제 인덱스(${foundIndex})를 사용합니다.`);
    }

    // answerIndex와 실제 찾은 인덱스가 다른 경우, 실제 인덱스로 교정
    if (typeof result.answerIndex === 'number' && foundIndex !== result.answerIndex) {
      console.warn(`⚠️ answerIndex(${result.answerIndex})와 original("${result.original}")의 실제 인덱스(${foundIndex})가 일치하지 않습니다. 실제 인덱스로 교정합니다.`);
    }

    const finalAnswerIndex = foundIndex;
    const finalOriginal = words[finalAnswerIndex]; // 원본 배열에서 정확한 형태 가져오기

    console.log(`✅ 난이도 평가 완료: 인덱스 ${finalAnswerIndex}, 단어 "${finalOriginal}", 난이도 ${result.difficulty || 'N/A'}`);
    return {
      answerIndex: finalAnswerIndex,
      original: finalOriginal,
      difficulty: result.difficulty || 0
    };

  } catch (parseError) {
    console.error('난이도 평가 파싱 실패:', resultJson);
    throw new Error(`난이도 평가에 실패했습니다: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }
}

/**
 * MCP 3: 어법 변형 서비스 (재시도 로직 포함)
 * @param words - 선택된 단어 배열
 * @param answerIndex - 변형할 단어의 인덱스 (명시적으로 지정)
 * @returns 변형된 단어들과 정답 정보
 */
export async function transformWord(
  words: string[],
  answerIndex: number
): Promise<{
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
    
    const prompt = `Transform exactly ONE word to create a **High-Level Grammar Error** for Korean CSAT (high school) level.

Original words: ${JSON.stringify(words)}
Target word index: ${answerIndex} (word: "${words[answerIndex]}")
Grammar types: ${grammarTypes.join(', ')}

**IMPORTANT:** You MUST transform the word at index ${answerIndex} ("${words[answerIndex]}"). Do NOT transform any other word.

**Principle:** Generate errors that require interpretation/judgment, NOT simple mechanical rules.

**🚨 CRITICAL - Context-Aware Transformation (ABSOLUTELY MANDATORY):**
You MUST consider the grammatical context where the word appears. The transformation must create a grammatically incorrect word **in that specific context**, while maintaining basic grammar rules.

**Example of CORRECT transformation:**
- If the word "prey" appears after "can" (e.g., "can prey"), you CANNOT transform it to "praying" because this breaks the basic rule "modal + base verb". 
- **ALLOWED:** "can prey" → "can be preying" (modal + be + v-ing is correct)
- **FORBIDDEN:** "can prey" → "can praying" (this breaks the basic rule "modal + base verb")

**🚨 CRITICAL - Word Relationship (ABSOLUTELY MANDATORY):**
The transformed word MUST be **grammatically related** to the original word. They must be:
- The same word in different grammatical forms (e.g., "collected" → "collecting", "possible" → "possibly")
- Related words from the same word family (e.g., "which" → "where" [both relative pronouns], "be" → "been" [both forms of be-verb])
- Grammatical variations of the same root word (e.g., "to improve" → "to be improving", "to have been improved")

**🚨 CRITICAL - Basic Grammar Rules Must Be Maintained:**
When transforming a word, you MUST NOT break basic grammar rules:
- **Modal verbs (can, could, should, would, may, might, must, will, shall) must be followed by base verb form**
  - ❌ FORBIDDEN: "can prey" → "can praying" (breaks modal + base verb rule)
  - ✅ ALLOWED: "can prey" → "can be preying" (modal + be + v-ing is correct)
- **Subject + verb structure requires proper verb form**
  - ❌ FORBIDDEN: "they work" → "they working" (needs be-verb helper)
  - ✅ ALLOWED: "they work" → "they are working" (be-verb + v-ing is correct)
- **"to + base verb" cannot become "to + verb-ing"**
  - ❌ FORBIDDEN: "to continue" → "to continuing" (this pattern doesn't exist)
  - ✅ ALLOWED: "to continue" → "to be continuing" (to + be + v-ing is correct)

${FORBIDDEN_TRANSFORMATIONS_PROMPT}

**Exclude:** Modal+verb, simple past(-ed), 3rd person -s/-es (base verb+-s/-es), simple plural, basic articles, simple prepositions, basic tenses, be-verb forms (it was/were, they was/were, etc.), subject-verb tense agreement (1st/2nd person + base verb, 3rd person + base verb + s/-es). ${EXCLUDE_RULES_PROMPT.replace('**제외:**', '')}

**Prioritize:** Errors that change meaning, confuse logic, cause ambiguity - Relative pronouns/adverbs, participles, subjunctive, parallelism, S-V agreement (complex), pronouns, conjunctions vs prepositions, logical subject errors, **complex infinitive structures** (to+be+v-ing, to+have been+p.p, etc.).

**CRITICAL - Grammar Type Diversity (MUST):**
Each of the 5 words must create a DIFFERENT grammar error type. Do NOT repeat the same grammar type.
- All 5 errors must be UNIQUE grammar types from the Grammar types list above
- **Prioritize these grammar types for maximum diversity:**
  * Relative pronouns/adverbs (where, when, how)
  * Adjective vs Adverb
  * Objective complement (5-pattern)
  * Active vs Passive
  * Past participle vs Present participle
  * Do-support, Be-verb
  * Inversion
  * Subject-verb agreement

**Requirements:**
1. Must affect meaning interpretation (not just mechanically wrong)
2. Requires analyzing sentence structure (clauses, modifiers, subject location)
3. Looks plausible but structurally incorrect
4. If multiple relative pronouns/conjunctions exist, transform non-relative words first
5. **Each word must create a DIFFERENT grammar error type** (no duplicates)

**Verification:** "Would this grammar mistake be worth explaining in a high school classroom?" If no, choose different word/error.

**🔥 Examples of High-Quality CSAT Errors (Prioritize These):**
- **(Participle):** Changing a correct past participle (p.p.) to a present participle (v-ing) where the passive meaning is required, or vice versa. *Example: "The data [collected -> collecting] by the sensors..."*
- **(Subject-Verb Agreement):** Changing the verb number when the subject is separated by a long modifier clause. *Example: "The detailed analysis of the samples [show -> shows] that..."*
- **(Gerund vs Infinitive):** Changing a gerund to an infinitive or vice versa in specific contexts. *Example: "I enjoy [reading -> to read] books."*
- **(Complex Infinitive):** Using complex infinitive structures (to+be+v-ing, to+have been+p.p) instead of simple transformations. *Example: "The goal is [to be improving -> to improve]" or "She seems [to have been injured -> to be injured]". **🚨 ABSOLUTELY FORBIDDEN:** "to + 동사원형" → "to + 동사ing" (e.g., "to continue" → "to continuing" is FORBIDDEN - this pattern does not exist). **✅ ALLOWED:** "to + 동사원형" → "동사+ing" (e.g., "to continue" → "continuing"), "to + 동사원형" → "to be + 과거분사" (e.g., "to continue" → "to be continued"), "to + 동사원형" → "to be + 동사ing" (e.g., "to continue" → "to be continuing"), "to + 동사원형" → "to have been + 과거분사" (e.g., "to continue" → "to have been continued").
- **(Adjective/Adverb):** Changing an adjective complement to an adverb. *Example: "It remains [possible -> possibly]..."*
- **(Voice):** Changing active to passive or vice versa incorrectly. *Example: "The problem [was solved -> solved] by the team."*
- **(Preposition):** Changing a correct preposition to an incorrect one. *Example: "depend [on -> of] something"*
- **(Relative Clause - Use Sparingly):** Only if necessary, changing 'which' to 'where' or 'what' to 'that' in complex relative clauses. *Example: "The house [in which -> which] he lived..."* (✅ "which" and "where" are related - both relative pronouns/adverbs)

${FORBIDDEN_EXAMPLES_PROMPT}

**Selection Strategy (STRICT - Must Follow):**
1. **MANDATORY:** You MUST transform the word at index ${answerIndex} ("${words[answerIndex]}"). This word has been selected as the highest difficulty word.
2. **DO NOT transform any other word.** Keep the other ${words.length - 1} words exactly the same.
3. Even if the target word is a relative pronoun/adverb/conjunction, you MUST transform it (it was selected because it has the highest difficulty).

Return ONLY this JSON format. **YOU MUST USE REAL ENGLISH WORDS, NOT PLACEHOLDERS:**

Example 1 (if transforming "collected" in a 5-word array):
{
  "transformedWords": ["survives", "hunting", "collecting", "balance", "spread"],
  "answerIndex": 2,
  "original": "collected",
  "grammarType": "Participle (Present vs Past)"
}

Example 2 (if transforming "which" in a 5-word array):
{
  "transformedWords": ["survives", "where", "balance", "being", "spread"],
  "answerIndex": 1,
  "original": "which",
  "grammarType": "Relative Pronoun vs Relative Adverb"
}

**⚠️ CRITICAL RULES:**
1. **DO NOT use placeholders like "WRONG_WORD", "CORRECT_WORD", "word1", "word2", "actual_incorrect_word", etc.**
2. **You MUST use REAL English words that are grammatically incorrect in the context.**
3. In "transformedWords", keep ${words.length - 1} words exactly as they appear in the input, and replace ONLY the chosen word with the actual incorrect word.
4. The "transformedWords" array MUST have exactly ${words.length} elements (same length as the input "words" array).
5. The transformed word must be a **real English word** that is grammatically incorrect in the sentence context.
6. Do NOT transform proper nouns or simple nouns unless it's a specific countable/uncountable trick.`;

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
      
      // 검증: words 배열의 길이에 맞춰 동적으로 검증
      const expectedLength = words.length;
      if (!result.transformedWords || !Array.isArray(result.transformedWords) || 
          result.transformedWords.length !== expectedLength) {
        throw new Error(`transformedWords가 올바르지 않습니다. (예상: ${expectedLength}개, 실제: ${result.transformedWords?.length || 0}개)`);
      }
      
      if (typeof result.answerIndex !== 'number' || result.answerIndex < 0 || result.answerIndex >= expectedLength) {
        throw new Error(`answerIndex가 올바르지 않습니다. (범위: 0~${expectedLength - 1}, 실제: ${result.answerIndex})`);
      }

      // 명시적으로 지정된 answerIndex와 일치하는지 확인
      if (result.answerIndex !== answerIndex) {
        throw new Error(`변형된 단어의 answerIndex(${result.answerIndex})가 지정된 인덱스(${answerIndex})와 일치하지 않습니다.`);
      }
      
      if (!result.original || !result.grammarType) {
        throw new Error('original 또는 grammarType이 누락되었습니다.');
      }

      // original이 지정된 단어와 일치하는지 확인
      const expectedWord = words[answerIndex];
      if (result.original.trim().toLowerCase() !== expectedWord.trim().toLowerCase()) {
        throw new Error(`변형된 단어의 original("${result.original}")가 지정된 단어("${expectedWord}")와 일치하지 않습니다.`);
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

      // 단어 관계 검증: 변형된 단어가 원본 단어와 문법적으로 관련되어 있는지 확인
      const originalWord = result.original.trim();
      const transformedWord = result.transformedWords[result.answerIndex].trim();
      
      // 공통 검증 함수 사용
      const validation = validateTransformation(originalWord, transformedWord);
      if (!validation.isValid) {
        console.warn(`⚠️ ${validation.errorMessage} 재시도...`);
        if (attempt < maxRetries) {
          continue;
        } else {
          throw new Error(validation.errorMessage || '변형 검증에 실패했습니다.');
        }
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

  // 뒤에서부터 치환 (인덱스가 꼬이지 않도록, 위치 기반으로 직접 치환)
  const circleNumbers = ['①', '②', '③', '④', '⑤'];
  for (let i = mappedWords.length - 1; i >= 0; i--) {
    const item = mappedWords[i];
    const num = circleNumbers[i];
    const replacement = `${num}<span class="grammar-error-highlight"><u>${item.transformedWord}</u></span>`;
    
    // 위치 기반으로 직접 치환 (regex 대신)
    const wordLength = item.word.length;
    result = result.substring(0, item.position) + replacement + result.substring(item.position + wordLength);
  }

  const numCount = (result.match(/[①②③④⑤]/g) || []).length;
  const underlineCount = (result.match(/<u>.*?<\/u>/g) || []).length;

  if (numCount !== originalWords.length || underlineCount !== originalWords.length) {
    throw new Error(`번호/밑줄 적용 실패: 번호 ${numCount}개, 밑줄 ${underlineCount}개 적용됨 (예상: ${originalWords.length}개)`);
  }

  return { numberedPassage: result, passageOrder };
}

