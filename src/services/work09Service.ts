/**
 * Work_09 (어법 오류 찾기) 문제 생성 로직
 *
 * **전체 흐름 (필수 로직):**
 * 1. 본문에서 어법문제로 적합하고 수준 높은 단어 5개를 선택한다.
 * 2. 그 5개 중 **어느 한 개를 변형할지**는 AI가 "어법문제를 위해 가장 어울리는 단어"로 선택한다.
 * 3. 선택된 그 한 개만 어법 변형한다. 선택된 단어가 to 부정사(to + 동사원형)이면 to 부정사 변형 규칙( to be + 동사ing / to be + 과거분사만 허용)을 따른다.
 */

import { callOpenAI, translateToKorean } from './common';
import { 
  FORBIDDEN_TRANSFORMATIONS_PROMPT, 
  FORBIDDEN_EXAMPLES_PROMPT, 
  EXCLUDE_RULES_PROMPT,
  PREFERRED_ERROR_PATTERNS,
  CANDIDATE_SELECTION_RULES,
  getDifficultyErrorListPrompt,
  DEFAULT_GRAMMAR_DIFFICULTY,
  validateTransformation,
  validatePassageForForbiddenPatterns,
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
  /** 동일 본문 재생성 시 제외할 단어 목록(이번 문제에 사용된 5개 단어) */
  selectedWords: string[];
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

    // Step 1.5: 선택된 5개 단어의 어법 유형 다양성 검증 (최대 5회 재시도 - 형용사/부사 포함 강제)
    let grammarDiversityValid = false;
    let grammarDiversityRetryCount = 0;
    const maxGrammarDiversityRetries = 5;
    /** 변형 시 사용할 단어별 어법 유형 (to 부정사 외 유형에서 오답 생성에 사용) */
    let grammarTypesForWords: Array<{ index: number; word: string; grammarType: string }> = [];
    
    while (!grammarDiversityValid && grammarDiversityRetryCount < maxGrammarDiversityRetries) {
      const grammarTypesResult = await evaluateGrammarTypesForWords(words, passage);
      grammarTypesForWords = grammarTypesResult;
      console.log('📋 선택된 단어들의 어법 유형:', grammarTypesResult);
      
      // 중복된 어법 유형이 있는지 확인
      const typeCounts: { [key: string]: number } = {};
      grammarTypesResult.forEach(item => {
        const type = item.grammarType;
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      
      const duplicateTypes = Object.entries(typeCounts).filter(([_, count]) => count > 1);
      
      if (duplicateTypes.length > 0) {
        console.warn(`⚠️ 중복된 어법 유형 발견 (재시도 ${grammarDiversityRetryCount + 1}/${maxGrammarDiversityRetries}):`, duplicateTypes);
        words = await selectWords(passage, previouslySelectedWords);
        console.log('✅ 재선택된 단어들:', words);
        grammarDiversityRetryCount++;
        continue;
      }
      
      // 형용사/부사 관련 어법이 반드시 1개 이상 포함되어야 함
      const hasAdjAdv = grammarTypesResult.some(item => {
        const g = item.grammarType || '';
        return (g.includes('Adjective') && g.includes('Adverb')) || (g.includes('형용사') && g.includes('부사'));
      });
      if (!hasAdjAdv) {
        console.warn(`⚠️ 형용사/부사 관련 어법 미포함 (재시도 ${grammarDiversityRetryCount + 1}/${maxGrammarDiversityRetries}). 현재: ${grammarTypesResult.map(i => `${i.word}: ${i.grammarType}`).join(', ')}`);
        // 형용사/부사 관련 단어를 명시적으로 포함하도록 재선택
        words = await selectWords(passage, previouslySelectedWords);
        console.log('✅ 재선택된 단어들:', words);
        grammarDiversityRetryCount++;
        continue;
      }
      
      grammarDiversityValid = true;
      console.log('✅ 어법 유형 다양성 검증 통과:', grammarTypesResult.map(item => `${item.word}: ${item.grammarType}`).join(', '));
    }
    
    if (!grammarDiversityValid) {
      console.warn(`⚠️ 어법 유형 다양성 검증 실패 (${maxGrammarDiversityRetries}회 재시도 후). 계속 진행합니다.`);
      if (grammarTypesForWords.length === 0) {
        grammarTypesForWords = await evaluateGrammarTypesForWords(words, passage);
      }
    }

    // Step 2: 5개 중 변형할 1개 선정 — AI가 "어법문제로 가장 어울리는 단어" 1개 선택
    const difficultyResult = await evaluateDifficulty(words, passage);
    console.log('✅ 변형 대상 단어 선정 결과:', difficultyResult);
    console.log(`🎯 변형할 단어: 인덱스 ${difficultyResult.answerIndex}, "${difficultyResult.original}" (어법문제로 가장 적합한 1개)`);

    // 변형 대상 단어의 어법 유형 (to 부정사 외 유형에서 해당 유형에 맞는 오답 생성용)
    const targetGrammarType = grammarTypesForWords.find(g => g.index === difficultyResult.answerIndex)?.grammarType ?? '';

    // Step 3: 선정된 1개만 어법 변형 (to 부정사면 to 부정사 규칙 적용, 그 외는 targetGrammarType에 맞는 오답 생성)
    console.log('[generateWork09Quiz] transformWord 호출:', { answerIndex: difficultyResult.answerIndex, targetWord: words[difficultyResult.answerIndex], targetGrammarType, passage있음: !!passage, passage길이: passage?.length ?? 0, passage앞80자: passage?.slice(0, 80) ?? '(없음)' });
    const transformation = await transformWord(words, difficultyResult.answerIndex, [], passage, targetGrammarType);
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
      translation,
      selectedWords: words
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

${CANDIDATE_SELECTION_RULES}

본문에서 어법 변형 가능한 단어들을 추출하세요. **형태보다 해석과 판단이 필요한 문법**만 대상으로 합니다. 동사·동사구·절 단위·수식어(분사, 관계대명사 등)를 우선 추출하고, 단순 명사·형용사만 나열하지 마세요.

${EXCLUDE_RULES_PROMPT}

**🚨 필수 포함: 형용사/부사 관련 단어 반드시 추출**
- 형용사/부사 관련 어법 문제를 만들 수 있는 단어를 **반드시 포함**하세요
- 예: possible, clear, necessary, important, significant, likely, certain, obvious, apparent, essential, crucial, vital, evident, distinct, precise, accurate, careful, serious, careful, careful, careful 등
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
        // 전치사 뒤 "being"(of being, for being 등)은 단일 단어 변형이 거의 불가 → 후보 제외
        if (word.toLowerCase().trim() === 'being' && /\b(of|for|about|by|with|without)\s+being\b/i.test(sentence)) {
          continue;
        }
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

${CANDIDATE_SELECTION_RULES}

아래 목록에서 **수능 1등급 수준**의 어법 오류 찾기 문제를 위한 단어 5개를 선정하세요.

**⚠️ 필수 규칙 (엄격히 준수 - 위반 시 자동 실패):**
- **목록에 있는 단어만 선택** (목록 외 단어 절대 금지 - 위반 시 재시도됨)
- 단어 단위만 (구/절 금지)
- 중복 불가
- 관계사/접속사(that, which, what, when, where 등)는 **최대 1개만** (2개 이상 시 실패)
- **"being"이 "of being", "for being" 등 전치사 뒤에 나오는 문장에서는 "being"을 선택하지 마세요.** (해당 위치의 "being"은 단일 단어로 유효한 변형이 없음)
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
1. **🚨 필수: 형용사/부사 관련 단어 반드시 1개 이상 선택**
   - 보어 자리에 쓰이는 형용사 (possible, clear, necessary, important, significant, likely, certain, obvious, apparent, essential, crucial, vital, evident, distinct, precise, accurate, careful, serious 등)
   - 수식어로 쓰이는 부사 (possibly, clearly, necessarily, importantly, significantly, likely, certainly, obviously, apparently, essentially, crucially, vitally, evidently, distinctly, precisely, accurately, carefully, seriously 등)
   - 형용사/부사 변형이 가능한 단어를 **반드시 1개 이상** 선택하세요
   - 예: "It remains possible" → "It remains possibly" (possible→possibly), "The result is clear" → "The result is clearly" (clear→clearly)
2. **복잡한 구문 내 문법 판단이 필요한 단어** 우선 (관계사절, 분사구문, 가정법, 도치 등)
3. **🚨 필수 어법 유형 다양성 (5개 선택 시 반드시 서로 다른 어법 유형):**
   아래 어법 유형들을 최대한 다양하게 포함해야 함 (동일 어법 반복 절대 금지):
   - **형용사 vs 부사 (반드시 1개 이상 포함 - 필수)**
   - 관계대명사와 관계부사 (where, when, how 등)
   - 5형식에서 목적격 보어
   - 능동/수동 문제 (Voice)
   - 과거분사/현재분사 (Participle)
   - 대동사 (Do, Be)
   - 도치
   - 수의 일치 (주어+동사)
   - 동명사 vs 부정사 (Gerund vs Infinitive)
   - 병렬 구조 (Parallel Structure)
   - 가정법 (Subjunctive Mood)
   **5개 문제는 모두 서로 다른 어법 유형이어야 하며, 가능한 한 위 목록의 어법 유형들을 다양하게 포함해야 함**
   **🚨 형용사/부사 관련 어법(형용사 vs 부사)은 반드시 5개 중 1개 이상 포함되어야 함. (보어 자리 vs 수식어, possible→possibly, clear→clearly, necessary→necessarily 등)**
   
   **🚨 절대 금지 - 같은 어법 유형 중복:**
   - ❌ 시제 문제(Tense) 2개 이상 선택 금지 (예: was/were, 동사원형+-s/-es 등)
   - ❌ 수동태(Voice) 2개 이상 선택 금지
   - ❌ 완료형(Have + Past Participle) 2개 이상 선택 금지
   - ❌ 분사(Participle) 2개 이상 선택 금지
   - ❌ 같은 어법 유형이 2개 이상 선택되면 자동 실패 및 재시도
   
   **✅ 올바른 예시 (형용사 vs 부사 반드시 포함):**
   - 단어 1: 형용사 vs 부사 - 1개 (필수) ✅
   - 단어 2: 수동태 (Voice) - 1개만 ✅
   - 단어 3: 분사 (Participle) - 1개만 ✅
   - 단어 4: 관계대명사 vs 관계부사 - 1개만 ✅
   - 단어 5: 동명사 vs 부정사 등 - 1개만 ✅
   
   **❌ 잘못된 예시 (절대 금지):**
   - 단어 1: 시제 문제 (Tense) ❌
   - 단어 2: 시제 문제 (Tense) ❌ (중복!)
   - 단어 3: 수동태 (Voice) ❌
   - 단어 4: 수동태 (Voice) ❌ (중복!)
   - 단어 5: 완료형 (Have + PP) ❌
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
      // 형용사/부사 관련 단어가 포함되었는지 사전 검증 (선택적)
      // 일반적인 형용사/부사 패턴 단어 확인
      const commonAdjAdvWords = ['possible', 'clear', 'necessary', 'important', 'significant', 'likely', 'certain', 'obvious', 'apparent', 'essential', 'crucial', 'vital', 'evident', 'distinct', 'precise', 'accurate', 'careful', 'serious', 'possibly', 'clearly', 'necessarily', 'importantly', 'significantly', 'likely', 'certainly', 'obviously', 'apparently', 'essentially', 'crucially', 'vitally', 'evidently', 'distinctly', 'precisely', 'accurately', 'carefully', 'seriously'];
      const hasAdjAdvWord = words.some(w => {
        const wordLower = w.toLowerCase().trim();
        return commonAdjAdvWords.some(adjAdv => wordLower === adjAdv || wordLower.includes(adjAdv));
      });
      
      if (!hasAdjAdvWord && retryCount < maxRetries - 1) {
        // 형용사/부사 관련 단어가 없으면 재시도 (마지막 시도가 아니면)
        const errorMsg = '형용사/부사 관련 단어가 선택되지 않았습니다. 형용사/부사 변형이 가능한 단어(possible, clear, necessary, important, significant, likely, certain, obvious, apparent, essential, crucial, vital, evident, distinct, precise, accurate, careful, serious 등 또는 이들의 부사형)를 반드시 1개 이상 포함하세요.';
        console.warn(`⚠️ ${errorMsg} (재시도 ${retryCount + 1}/${maxRetries})`);
        previousErrors.push(errorMsg);
        retryCount++;
        continue;
      }
      
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
 * 선택된 단어들의 어법 유형 평가 (어법 다양성 검증용)
 * @param words - 선택된 단어 배열
 * @param passage - 영어 본문
 * @returns 각 단어의 어법 유형 정보
 */
async function evaluateGrammarTypesForWords(
  words: string[],
  passage: string
): Promise<Array<{ index: number; word: string; grammarType: string }>> {
  const prompt = `**수능 고난도 어법 오류 문제 - 단어별 어법 유형 평가**

다음 5개 단어 각각에 대해, 이 단어를 변형할 때 사용할 수 있는 **주요 어법 유형**을 평가하세요.

**선택된 단어들:**
${words.map((word, idx) => `${idx + 1}. "${word}"`).join('\n')}

**본문:**
${passage}

**어법 유형 목록:**
1. Subject-Verb Agreement (Far Subject) - 주어-동사 수 일치 (수식어구로 멀어진 주어)
2. Relative Pronoun vs Relative Adverb - 관계대명사 vs 관계부사 (불완전/완전 문장)
3. Participle (Present vs Past) - 현재분사 vs 과거분사 (능동/수동 관계)
4. Gerund vs Infinitive - 동명사 vs 부정사 (목적어, 보어 자리)
5. Parallel Structure - 병렬 구조 (등위접속사 앞뒤 형태)
6. Adjective vs Adverb - 형용사 vs 부사 (보어 자리 vs 수식어)
7. Voice (Active vs Passive) - 능동태 vs 수동태 (목적어 유무 등)
8. Preposition + Relative Pronoun - 전치사+관계대명사 (완전한 문장)
9. Indirect Question Word Order - 간접의문문 어순
10. Subjunctive Mood - 가정법 (과거, 과거완료, 혼합)
11. Tense (Simple Past/Present/Future) - 시제 (단순 시제 변형)
12. Have + Past Participle - 완료형 (have/has/had + 과거분사)

**평가 방법:**
- 각 단어에 대해 위 목록 중에서 **가장 적합한 어법 유형 1개**를 선택하세요
- 단어의 문맥과 문장 구조를 고려하여 평가하세요
- 같은 어법 유형이 여러 단어에 할당되지 않도록 최대한 다양하게 선택하세요

**🚨 필수 규칙 (절대 준수):**
- **형용사/부사 관련 어법(Adjective vs Adverb)은 반드시 5개 중 1개 이상 포함되어야 함**
- 보어 자리(be동사/연결동사 다음)에 쓰이는 형용사나 수식어로 쓰이는 부사가 있으면 **반드시 "Adjective vs Adverb" 유형을 할당**하세요
- 예시: "It remains possible" → possible은 보어 자리이므로 "Adjective vs Adverb" 할당
- 예시: "The result is clear" → clear는 보어 자리이므로 "Adjective vs Adverb" 할당
- 예시: "It is necessary" → necessary는 보어 자리이므로 "Adjective vs Adverb" 할당
- 예시: "clearly stated" → clearly는 수식어이므로 "Adjective vs Adverb" 할당 가능
- **형용사/부사 변형이 가능한 단어가 하나라도 있으면 반드시 그 단어에 "Adjective vs Adverb"를 할당하세요**
- 시제 문제(Tense)나 완료형(Have + Past Participle)은 가능한 한 피하고, 다른 어법 유형을 우선 선택하세요
- 5개 단어가 모두 서로 다른 어법 유형을 가져야 합니다

아래 JSON 형식으로만 응답하세요 (정확히 5개 항목을 반환해야 합니다):
{
  "grammarTypes": [
    ${words.map((word, idx) => `{ "index": ${idx}, "word": "${word}", "grammarType": "Adjective vs Adverb" }`).join(',\n    ')}
  ]
}

**⚠️ 필수:** 반드시 5개 항목을 모두 반환하고, 각 단어마다 서로 다른 어법 유형을 할당해야 합니다.`;

  const response = await callOpenAI({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a grammar expert specializing in Korean CSAT (Suneung) English section. You evaluate the grammar types that can be applied to each word for creating diverse grammar error questions.'
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

    if (!result.grammarTypes || !Array.isArray(result.grammarTypes)) {
      throw new Error('grammarTypes 배열이 올바르지 않습니다.');
    }

    if (result.grammarTypes.length !== words.length) {
      throw new Error(`grammarTypes 배열의 길이가 ${words.length}이 아닙니다. (실제: ${result.grammarTypes.length}개)`);
    }

    // 검증: 각 단어가 원본 배열에 있는지 확인
    const grammarTypeResults = result.grammarTypes.map((item: any) => {
      const wordLower = item.word.trim().toLowerCase();
      const foundIndex = words.findIndex(w => w.trim().toLowerCase() === wordLower);
      
      if (foundIndex === -1) {
        throw new Error(`평가된 단어 "${item.word}"가 선택된 단어 목록에 없습니다.`);
      }

      return {
        index: foundIndex,
        word: words[foundIndex],
        grammarType: item.grammarType || 'Unknown'
      };
    });

    console.log('✅ 어법 유형 평가 완료:', grammarTypeResults);
    return grammarTypeResults;

  } catch (parseError) {
    console.error('어법 유형 평가 파싱 실패:', resultJson);
    throw new Error(`어법 유형 평가에 실패했습니다: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }
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

**선택된 5개 단어:**
${words.map((word, idx) => `${idx + 1}. "${word}"`).join('\n')}

**본문:**
${passage}

**🎯 목표:** 위 5개 단어 중 **어법문제를 위해 가장 어울리는 단어 1개**를 골라, 그 단어를 변형할 대상으로 선택하세요.
- "가장 어울리는" = 변형했을 때 수능/고난도 어법 오류 문항으로 적합한 단어 (어법 복잡도·의미 영향·문맥 판단 필요·출제 빈도 고려).
- to 부정사(예: 본문에 "to create", "to reinvent")인 단어도 선택 가능합니다. 선택 시 변형은 반드시 "to be + 동사ing" 또는 "to be + 과거분사"만 사용됩니다.
- 각 단어의 난이도를 1–10점으로 매긴 뒤, **가장 높은 점수의 단어 1개**를 선택하세요.

**평가 기준 (참고):**
1. 어법 복잡도 (관계사절, 분사구문, 가정법, 도치 등 → 높은 점수)
2. 의미 해석 영향 (틀리면 의미에 큰 영향 → 높은 점수)
3. 문맥 판단 필요 (문장/구조 분석 필요 → 높은 점수)
4. 수능 출제 빈도 (분사구문, 관계사, 가정법, 병렬, 준동사 등 → 높은 점수)
동점이면 어법 복잡도 > 의미 영향 > 문맥 판단 순으로 우선순위를 정하세요.

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
        content: 'You are a grammar expert for the Korean CSAT English section. Your task: given 5 words from a passage, choose exactly ONE word that is most suitable to transform into a grammar error for a high-quality exam item. Consider difficulty, meaning impact, and context. If a word is a to-infinitive (e.g. in "to create"), it can still be chosen; transformation will follow strict rules (to be + V-ing or to be + past participle only).'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
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
 * @param usedGrammarTypes - 이미 사용된 어법 유형 (다양성 강제)
 * @param passage - 원본 본문 (지정 시 치환 후 "of to V" 등 문맥 검증 수행)
 * @param targetGrammarType - 변형 대상 단어의 어법 유형 (to 부정사 외 유형에서 해당 유형에 맞는 오답 생성)
 * @returns 변형된 단어들과 정답 정보
 */
export async function transformWord(
  words: string[],
  answerIndex: number,
  usedGrammarTypes: string[] = [],
  passage?: string,
  targetGrammarType?: string
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
  let previousErrors: string[] = [];
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`어법 변형 시도 ${attempt}/${maxRetries}...`);

    // to 부정사 문맥이면 AI 호출 없이 "be V-ing" / "be V-ed"만 허용하여 즉시 적용 (비문/엉뚱한 단어 방지)
    const targetWordForLog = words[answerIndex]?.trim() ?? '';
    console.log('[transformWord] 진입:', { answerIndex, targetWord: targetWordForLog, passage있음: !!passage, passage길이: passage?.length ?? 0 });
    if (passage) {
      const target = words[answerIndex].trim().toLowerCase();
      const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const toInfinitiveRegex = new RegExp(`\\bto\\s+(?:\\w+\\s+)*${escapedTarget}\\b`, 'i');
      const patternMatches = !target.includes(' ') && toInfinitiveRegex.test(passage);
      // "like to imagine", "want to imagine" 등: to 제거 시 "like be imagining" 비문이 되므로 수동태(be V-ed)만 허용
      const likeToRegex = new RegExp(`\\b(like|want|love|need|expect|prefer|hate|hope|wish)\\s+to\\s+(?:\\w+\\s+)*${escapedTarget}\\b`, 'i');
      const likeToContext = patternMatches && likeToRegex.test(passage);
      console.log('[transformWord] 본문 "to ... [대상]" 패턴 검사:', { 대상: target, 매칭됨: patternMatches, likeTo문맥: likeToContext });
      if (patternMatches) {
        const ingForm = target.endsWith('e') ? target.slice(0, -1) + 'ing' : target + 'ing';
        const edForm = target.endsWith('e') ? target + 'd' : target + 'ed';
        const toVerbRe = new RegExp(`(\\bto\\s+(?:\\w+\\s+)*)(${escapedTarget})(\\b)`, 'i');
        const toInfinitiveCandidates = likeToContext
          ? ['be ' + edForm]
          : ['be ' + ingForm, 'be ' + edForm];
        console.log('[transformWord] to 부정사 규칙 적용 시도 (AI 생략), 후보:', toInfinitiveCandidates, likeToContext ? '(like to 문맥 → 수동태만)' : '');
        for (const corrected of toInfinitiveCandidates) {
          const vt = validateTransformation(words[answerIndex], corrected);
          const fixed = passage.replace(toVerbRe, (_: string, p1: string, _p2: string, p3: string) => p1 + corrected + (p3 || ''));
          const vp = validatePassageForForbiddenPatterns(fixed);
          console.log('[transformWord] 후보 검증:', { corrected, 단어검증: vt.isValid, 단어검증메시지: vt.errorMessage, 지문검증: vp.isValid, 지문검증메시지: vp.errorMessage });
          if (!vt.isValid) continue;
          if (vp.isValid) {
            console.log('✅ to 부정사: AI 호출 없이 규칙 적용 →', corrected);
            return {
              transformedWords: words.map((w, i) => (i === answerIndex ? corrected : w)),
              answerIndex,
              original: words[answerIndex],
              grammarType: 'Gerund vs Infinitive',
            };
          }
        }
        console.warn('[transformWord] to 부정사 규칙 적용 실패: "be V-ing" / "be V-ed" 둘 다 지문 검증 통과 못함 → AI 호출로 진행');
      }

      // "like to imagine" 등에서 선택 단어가 "to imagine"(두 단어)인 경우: "to" 제거 시 "like be imagining" 비문이 되므로 "to be imagined"만 허용
      if (target.includes(' ') && target.startsWith('to ')) {
        const verbPart = target.slice(3).trim();
        const escapedVerb = verbPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const likeToTwoWordRe = new RegExp(`\\b(like|want|love|need|expect|prefer|hate|hope|wish)\\s+to\\s+(?:\\w+\\s+)*${escapedVerb}\\b`, 'i');
        if (likeToTwoWordRe.test(passage)) {
          const baseFromVerb = verbPart.endsWith('e') ? verbPart.slice(0, -1) : verbPart;
          const edForm = verbPart.endsWith('e') ? verbPart + 'd' : verbPart + 'ed';
          const toBeEd = 'to be ' + edForm;
          const toTwoWordRe = new RegExp(`\\b(${escapedTarget.replace(/\s+/g, '\\s+')})\\b`, 'i');
          const vt = validateTransformation(words[answerIndex], toBeEd);
          const fixed = passage.replace(toTwoWordRe, toBeEd);
          const vp = validatePassageForForbiddenPatterns(fixed);
          if (vt.isValid && vp.isValid) {
            console.log('✅ like to + "to V" 규칙 적용 (두 단어) →', toBeEd);
            return {
              transformedWords: words.map((w, i) => (i === answerIndex ? toBeEd : w)),
              answerIndex,
              original: words[answerIndex],
              grammarType: 'Gerund vs Infinitive',
            };
          }
        }
      }

      // 전치사(by/without/of 등) + 동명사(V-ing) 문맥: "by reducing" → "by being reduced"만 허용 (being reducing, of be looking 비문)
      if (target.endsWith('ing') && !target.includes(' ')) {
        const prepGerundRegex = new RegExp(`\\b(by|without|before|after|with|through|of)\\s+(?:\\w+\\s+)*${escapedTarget}\\b`, 'i');
        if (prepGerundRegex.test(passage)) {
          const baseFromIng = target.slice(0, -3);
          const base = baseFromIng.length >= 2 && !/[aeiou]/i.test(baseFromIng.slice(-1)) ? baseFromIng + 'e' : baseFromIng;
          const edForm = base.endsWith('e') ? base + 'd' : base + 'ed';
          const prepGerundRe = new RegExp(`(\\b(?:by|without|before|after|with|through|of)\\s+(?:\\w+\\s+)*)(${escapedTarget})(\\b)`, 'i');
          const corrected = 'being ' + edForm;
          console.log('[transformWord] 전치사+동명사 규칙 적용 시도 (AI 생략), 후보: being + 과거분사만', [corrected]);
          {
            const vt = validateTransformation(words[answerIndex], corrected);
            const fixed = passage.replace(prepGerundRe, (_: string, p1: string, _p2: string, p3: string) => p1 + corrected + (p3 || ''));
            const vp = validatePassageForForbiddenPatterns(fixed);
            if (!vt.isValid) continue;
            if (vp.isValid) {
              console.log('✅ 전치사+동명사: AI 호출 없이 규칙 적용 →', corrected);
              return {
                transformedWords: words.map((w, i) => (i === answerIndex ? corrected : w)),
                answerIndex,
                original: words[answerIndex],
                grammarType: 'Gerund vs Infinitive',
              };
            }
          }
          console.warn('[transformWord] 전치사+동명사 규칙 적용 실패 → AI 호출로 진행');
        }
      }

      // 주어 + be동사(are, is, am, was, were): "be + V-ing" 변형 금지 → 수일치 오류(are→is 등)만 허용
      const beVerbs = ['are', 'is', 'am', 'was', 'were'];
      if (beVerbs.includes(target)) {
        const subjectBeRegex = new RegExp(`\\b([A-Za-z]+(?:\\s+[A-Za-z]+)*)\\s+${escapedTarget}\\b`, 'i');
        if (subjectBeRegex.test(passage)) {
          const wrongNumberMap: Record<string, string> = { are: 'is', is: 'are', am: 'is', was: 'were', were: 'was' };
          const corrected = wrongNumberMap[target];
          if (corrected) {
            const subjectBeRe = new RegExp(`(\\b(?:[A-Za-z]+(?:\\s+[A-Za-z]+)*)\\s+)(${escapedTarget})(\\b)`, 'i');
            const vt = validateTransformation(words[answerIndex], corrected);
            const fixed = passage.replace(subjectBeRe, (_: string, p1: string, _p2: string, p3: string) => p1 + corrected + (p3 || ''));
            const vp = validatePassageForForbiddenPatterns(fixed);
            if (vt.isValid && vp.isValid) {
              console.log('✅ 주어+be동사: AI 호출 없이 수일치 오류만 적용 (be+V-ing 금지) →', corrected);
              return {
                transformedWords: words.map((w, i) => (i === answerIndex ? corrected : w)),
                answerIndex,
                original: words[answerIndex],
                grammarType: 'Subject-Verb Agreement (Far Subject)',
              };
            }
          }
          console.warn('[transformWord] 주어+be동사 규칙 적용 실패 → AI 호출로 진행 (be+V-ing 출력 시 검증에서 차단됨)');
        }
      }
    } else {
      console.log('[transformWord] passage 없음 → to 부정사/전치사+동명사 조기 처리 스킵');
    }

    // 이전 시도에서 발생한 에러 메시지 추가
    const previousErrorsText = previousErrors.length > 0 ? `
**🚨 CRITICAL - Previous Attempt Errors (MUST AVOID):**
The following errors occurred in previous attempts. You MUST NOT repeat these mistakes:
${previousErrors.map((err, idx) => `${idx + 1}. ${err}`).join('\n')}

**You MUST choose a DIFFERENT transformation that does NOT trigger any of the above errors.**
` : '';
    
    // 이미 사용된 어법 유형을 피하도록 프롬프트 구성
    const usedGrammarTypesText = usedGrammarTypes.length > 0 ? `
**🚨 CRITICAL - Grammar Type Diversity (ABSOLUTELY MANDATORY):**
The following grammar types have ALREADY been used in previous transformations. You MUST NOT use these types again:
${usedGrammarTypes.map((type, idx) => `${idx + 1}. ${type}`).join('\n')}

**You MUST select a DIFFERENT grammar type from the list below that is NOT in the above list.**
If all grammar types have been used, prioritize the least recently used types.

**Available grammar types (choose one that is NOT in the used list above):**
${grammarTypes.filter(type => !usedGrammarTypes.includes(type)).map((type, idx) => `${idx + 1}. ${type}`).join('\n')}

**If all types are used, you may reuse the least recently used type, but try to create a variation that is distinct from previous uses.**
` : `
**🚨 CRITICAL - Grammar Type Diversity (ABSOLUTELY MANDATORY):**
You must select a grammar type from the list below. If this is part of a series of transformations, ensure each transformation uses a DIFFERENT grammar type.

**Available grammar types:**
${grammarTypes.map((type, idx) => `${idx + 1}. ${type}`).join('\n')}
`;
    
    const targetWord = words[answerIndex].trim();
    const targetLower = targetWord.toLowerCase();
    const looksLikeBaseVerb = !targetLower.includes(' ') && !targetLower.endsWith('ing') && !targetLower.endsWith('ly') && /^[a-z]+$/.test(targetLower);
    const toInfIngForm = looksLikeBaseVerb ? (targetLower.endsWith('e') ? targetLower.slice(0, -1) + 'ing' : targetLower + 'ing') : '';
    const toInfEdForm = looksLikeBaseVerb ? (targetLower.endsWith('e') ? targetLower + 'd' : targetLower + 'ed') : '';
    const toInfinitiveRuleBlock = looksLikeBaseVerb ? `
**🚨 IF the target word "${targetWord}" appears after "to" in the passage (e.g. "to ${targetWord}"):**
- Your transformedWords[${answerIndex}] MUST be EXACTLY one of: **"be ${toInfIngForm}"** or **"be ${toInfEdForm}"**.
- Outputting only **"${toInfIngForm}"** is REJECTED (produces ungrammatical "to ${toInfIngForm}").
- No other form is accepted for this context.
` : '';

    const auxContractionRegex = /\b(didn't|don't|doesn't|won't|wouldn't|can't|couldn't|shouldn't|shan't|mightn't|mustn't|needn't|haven't|hasn't|hadn't|isn't|aren't|wasn't|weren't)\s+/i;
    const escapedTargetForAux = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const auxPlusTargetContext = passage && looksLikeBaseVerb && new RegExp(`(?:${auxContractionRegex.source})${escapedTargetForAux}\\b`, 'i').test(passage);
    const auxPlusTargetRuleBlock = auxPlusTargetContext ? `
**🚨 CRITICAL - The target word "${targetWord}" appears immediately after a contraction (e.g. "didn't ${targetWord}", "don't ${targetWord}"):**
- You must **NEVER** output **"to ${targetWord}"** (e.g. "to mean"). "didn't to mean", "don't to think" are **completely ungrammatical**.
- Use a different transformation (e.g. tense/form error: "meant", "meaning", or other plausible wrong form). **Never** insert "to" before the verb in this context.
` : '';

    const prompt = `Transform exactly ONE word to create a **High-Level Grammar Error** for Korean CSAT (high school) level.

Original words: ${JSON.stringify(words)}
Target word index: ${answerIndex} (word: "${words[answerIndex]}")
Grammar types: ${grammarTypes.join(', ')}
${usedGrammarTypesText}
${previousErrorsText}
${toInfinitiveRuleBlock}
${auxPlusTargetRuleBlock}
${targetGrammarType ? `
**🎯 TARGET GRAMMAR ERROR TYPE (MANDATORY - NON–TO-INFINITIVE):**
The word at index ${answerIndex} ("${words[answerIndex]}") was selected to create a **${targetGrammarType}** error. You MUST output the **INCORRECT** form so that the blank shows the wrong answer for the student to find.
- ❌ FORBIDDEN: Outputting the same word or the correct form (that would mean no error in the question).
- ✅ REQUIRED: Output a plausible but grammatically WRONG form for this context (e.g. Adjective vs Adverb: "innately"→"innate" or "possible"→"possibly" in wrong place; Participle: "collected"→"collecting" where passive is needed; Voice: active→passive or vice versa; Gerund vs Infinitive: gerund↔infinitive in wrong context).
- The transformed word at index ${answerIndex} must be the **wrong** option that fits the **${targetGrammarType}** error type.
` : ''}

**IMPORTANT:** You MUST transform the word at index ${answerIndex} ("${words[answerIndex]}"). Do NOT transform any other word.

**🚨 CRITICAL - Personal Pronoun + Verb Transformation Rule (ABSOLUTELY MANDATORY):**
If the target word "${words[answerIndex]}" is a verb that appears after a personal pronoun (I/you/we/they/he/she/it) in the sentence, you MUST follow these rules:
- ❌ **ABSOLUTELY FORBIDDEN:** Simply changing the verb to "verb+ing" (e.g., "suggest" → "suggesting", "work" → "working", "believe" → "believing")
- ❌ **ABSOLUTELY FORBIDDEN:** Changing to 3rd person singular "-s" form when the subject is plural (e.g., "They suggest" → "They suggests")
- ✅ **REQUIRED:** Use one of these patterns:
  1. Passive: "They suggest" → "They are suggested"
  2. Perfect passive: "They suggest" → "They have been suggested"
  3. Future: "They suggest" → "They will suggest"
  4. Modal + base: "They suggest" → "They would suggest" / "They should suggest" / "They could suggest"
  5. Modal + have + p.p.: "They suggest" → "They would have suggested"

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
  - ✅ **ALLOWED: Modal verb swapping is ENCOURAGED** (e.g., "would" → "should", "should" → "could", "could" → "would" are ALLOWED - swapping modal verbs creates meaningful grammar errors and is a valid CSAT-level grammar transformation)
- **Personal pronoun + verb structure requires proper verb form**
  - ❌ FORBIDDEN: "they work" → "they working" (needs be-verb helper)
  - ❌ FORBIDDEN: "They suggest" → "They suggesting" (ungrammatical - main verb as -ing without be-verb)
  - ❌ FORBIDDEN: "We believe" → "We believing" (ungrammatical)
  - ✅ ALLOWED: "They suggest" → "They are suggested" (passive)
  - ✅ ALLOWED: "They suggest" → "They have been suggested" (perfect passive)
  - ✅ ALLOWED: "They suggest" → "They will suggest" (future)
  - ✅ ALLOWED: "They suggest" → "They would suggest" / "They should suggest" / "They could suggest" (modal + base)
  - ✅ ALLOWED: "they work" → "they are working" (be-verb + v-ing is correct)
- **🚨 to 부정사(to + 동사원형) 변형 규칙 (필수):**
  - When the target word is a base verb that appears **after "to"** in the passage (e.g. "create" in "to create", "reinvent" in "to reinvent"), you **MUST** output **"be + V-ing"** or **"be + past participle"** so the passage becomes "to be creating" / "to be created" or "to be reinventing" / "to be reinvented".
  - ❌ **NEVER** output **only** "creating" or "reinventing" (that would produce "to creating" / "to reinventing" — ungrammatical).
  - ✅ **REQUIRED:** For "create" in "to create" → output **"be creating"** (result: to be creating) or **"be created"** (result: to be created).
  - ✅ **REQUIRED:** For "reinvent" in "to reinvent" → output **"be reinventing"** or **"be reinvented"**.
- **🚨 "like to / want to" 등 뒤 동사 변형 (필수):** When the phrase is **"like to V"**, **"want to V"**, **"love to V"** etc. (e.g. "we like to imagine"), you **MUST NOT** remove "to". The result must be **"like to be V-ed"** (수동태). Output **"be + past participle"** only (e.g. "imagine" → **"be imagined"** so the sentence becomes "we like to be imagined"). ❌ **FORBIDDEN:** "like be imagining" (to dropped — ungrammatical). ✅ **REQUIRED:** "like to imagine" → output **"be imagined"** (result: we like to be imagined).
- **🚨 전치사 + 동명사(by/without/of 등 + V-ing) 변형 규칙 (필수):**
  - When the target word is a **gerund (V-ing)** that appears **after a preposition** (by, without, of, before, after, with, through) in the passage (e.g. "reducing" in "by reducing", "looking" in "of looking"), you **MUST** output **only "being + past participle"** so the passage becomes "by being reduced", "of being looked".
  - ❌ **NEVER** output **only** "reduced" or "looked" (that would produce "by reduced" / "of looked" — ungrammatical).
  - ❌ **NEVER** output **"being + V-ing"** (e.g. "being reducing", "being looking", "of be looking") — these are **ungrammatical**. Only **"being + past participle"** is allowed.
  - ✅ **REQUIRED:** For "reducing" in "by reducing" → output **"being reduced"** only (result: by being reduced). For "looking" in "of looking" → output **"being looked"** only (result: of being looked).

${PREFERRED_ERROR_PATTERNS}

${getDifficultyErrorListPrompt(DEFAULT_GRAMMAR_DIFFICULTY)}

${FORBIDDEN_TRANSFORMATIONS_PROMPT}

**Exclude:** Modal+verb, simple past(-ed), 3rd person -s/-es (base verb+-s/-es), simple plural, basic articles, simple prepositions, basic tenses, be-verb forms (it was/were, they was/were, etc.), subject-verb tense agreement (1st/2nd person + base verb, 3rd person + base verb + s/-es). ${EXCLUDE_RULES_PROMPT.replace('**제외:**', '')}

**Prioritize:** Errors that change meaning, confuse logic, cause ambiguity - Relative pronouns/adverbs, participles, subjunctive, parallelism, S-V agreement (complex), pronouns, conjunctions vs prepositions, logical subject errors, **complex infinitive structures** (to+be+v-ing, to+have been+p.p, etc.).

**CRITICAL - Grammar Type Diversity (MUST):**
${usedGrammarTypes.length > 0 ? `
**🚨 ABSOLUTELY FORBIDDEN - Do NOT use these already-used grammar types:**
${usedGrammarTypes.map((type, idx) => `- ${type}`).join('\n')}

**You MUST select a DIFFERENT grammar type that is NOT in the list above.**
` : ''}
Each word must create a DIFFERENT grammar error type. Do NOT repeat the same grammar type.
- All errors must be UNIQUE grammar types from the Grammar types list above
- **Prioritize these grammar types for maximum diversity (순서대로 우선순위):**
  * **1순위: Adjective vs Adverb (형용사 vs 부사) — 반드시 포함.** 보어 자리 vs 수식어(possible→possibly, clear→clearly, necessary→necessarily, important→importantly, significant→significantly 등). 형용사/부사 변형이 가능한 단어가 있으면 **반드시 이 유형을 선택**하세요.
  * 2순위: Relative pronouns/adverbs (where, when, how)
  * 3순위: Objective complement (5-pattern)
  * 4순위: Active vs Passive
  * 5순위: Past participle vs Present participle
  * 6순위: Do-support, Be-verb
  * 7순위: Inversion
  * 8순위: Subject-verb agreement

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
- **(Voice - Personal Pronoun + Verb):** When transforming a verb that follows a personal pronoun (I/you/we/they/he/she/it), you MUST use passive, perfect passive, future, or modal forms. **CRITICAL EXAMPLES:**
  - ✅ **ALLOWED:** "They suggest" → "They are suggested" (passive)
  - ✅ **ALLOWED:** "They suggest" → "They have been suggested" (perfect passive)
  - ✅ **ALLOWED:** "They suggest" → "They will suggest" (future)
  - ✅ **ALLOWED:** "They suggest" → "They would suggest" / "They should suggest" / "They could suggest" (modal + base)
  - ❌ **FORBIDDEN:** "They suggest" → "They suggesting" (ungrammatical - main verb as -ing without be-verb)
  - ❌ **FORBIDDEN:** "They suggest" → "They suggests" (too easy - 3rd plural + singular verb)
  - Same rules apply to ALL verbs: "We work" → "We are worked" / "We will work" / "We would work" ✅, but NOT "We working" ❌
- **(Gerund vs Infinitive):** Changing a gerund to an infinitive or vice versa in specific contexts. *Example: "I enjoy [reading -> to read] books."*
- **(Complex Infinitive / to 부정사):** When the target word is the verb in "to + verb" (e.g. "create" in "to create"), you **MUST** output **"be creating"** or **"be created"** (so the result is "to be creating" or "to be created"). **🚨 FORBIDDEN:** Outputting only "creating" (produces "to creating" — ungrammatical). **✅ ALLOWED:** "create" → "be creating", "create" → "be created"; "reinvent" → "be reinventing", "reinvent" → "be reinvented".
- **(like to / want to + 동사):** When the phrase is "like to imagine", "want to believe", etc., you **MUST** output **"be + past participle"** (e.g. "be imagined") so the result is "we like to be imagined". **🚨 FORBIDDEN:** Dropping "to" (produces "we like be imagining" — ungrammatical). **✅ REQUIRED:** "imagine" in "we like to imagine" → **"be imagined"** (result: we like to be imagined).
- **(Preposition + Gerund / 전치사+동명사):** When the target word is a gerund (V-ing) after "by", "without", "of", etc. (e.g. "reducing" in "by reducing them"), you **MUST** output **only "being + past participle"** (e.g. "being reduced"). **🚨 FORBIDDEN:** "by reduced", "of be looking", "being reducing", "being looking" (all ungrammatical). **✅ ALLOWED:** "reducing" → "being reduced"; "looking" → "being looked" only.
- **(Adjective/Adverb — 반드시 포함 권장):** Changing an adjective complement to an adverb, or adverb to adjective where needed. *Examples: "It remains [possible -> possibly]...", "The result is [clearly -> clear]...", "It is [necessary -> necessarily]..."* 형용사/부사 관련 어법은 5개 선택지에 반드시 1개 이상 포함되어야 함.
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

    const systemContent = targetGrammarType
      ? `You are a grammar expert for the Korean CSAT English section. You create grammar errors. For to-infinitives: output ONLY "be + V-ing" or "be + past participle". For other types (e.g. ${targetGrammarType}): you MUST output the INCORRECT form so the blank shows the wrong answer—never leave the word unchanged or output the correct form.`
      : 'You are a grammar expert specializing in the Korean CSAT (Suneung) English section. You create challenging syntax errors. Follow the transformation rules EXACTLY—especially for to-infinitives: output ONLY "be + V-ing" or "be + past participle" of the SAME verb, never a different word.';
    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
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
        const errorMsg = 'AI가 플레이스홀더를 반환했습니다. 실제 영어 단어를 사용해야 합니다.';
        if (attempt < maxRetries) {
          console.warn(`⚠️ 플레이스홀더가 포함된 응답 발견. 재시도 ${attempt + 1}/${maxRetries}...`);
          console.warn('응답 내용:', result);
          previousErrors.push(errorMsg);
          continue;
        } else {
          // 최종 시도에서도 플레이스홀더가 있으면 에러
          console.error('❌ 플레이스홀더가 포함된 최종 응답:', result);
          throw new Error(errorMsg);
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
      let transformedWord = result.transformedWords[result.answerIndex].trim();
      const original = originalWord.toLowerCase();
      const transformed = transformedWord.toLowerCase();
      console.log('[transformWord] AI 변형 결과:', { original: originalWord, transformed: transformedWord, answerIndex: result.answerIndex });

      // to 부정사 문맥: 본문에 "to [원본]" 또는 "to (부사 등) [원본]"이 있으면 변형은 반드시 같은 동사의 "be + 동사ing" 또는 "be + 과거분사"만 허용
      const escapedOriginal = originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const toInfinitiveInPassage = passage && !original.includes(' ') &&
        new RegExp(`\\bto\\s+(?:\\w+\\s+)*${escapedOriginal}\\b`, 'i').test(passage);
      const allowed1 = !original.includes(' ') ? ('be ' + (original.endsWith('e') ? original.slice(0, -1) + 'ing' : original + 'ing')) : '';
      const allowed2 = !original.includes(' ') ? ('be ' + (original.endsWith('e') ? original + 'd' : original + 'ed')) : '';
      console.log('[transformWord] 선검사:', { toInfinitiveInPassage, passage있음: !!passage, 허용형: [allowed1, allowed2], AI변형: transformed });
      let validation: { isValid: boolean; errorMessage?: string } = { isValid: true };
      if (toInfinitiveInPassage) {
        const ingForm = original.endsWith('e') ? original.slice(0, -1) + 'ing' : original + 'ing';
        const edForm = original.endsWith('e') ? original + 'd' : original + 'ed';
        const allowed1 = 'be ' + ingForm;
        const allowed2 = 'be ' + edForm;
        if (transformed !== allowed1 && transformed !== allowed2) {
          validation = {
            isValid: false,
            errorMessage: `본문에 "to ... ${originalWord}"가 있으므로 변형은 반드시 "${allowed1}" 또는 "${allowed2}"만 허용됩니다. 다른 단어(예: "${transformedWord}")는 금지됩니다.`,
          };
        }
      }
      if (validation.isValid) {
        validation = validateTransformation(originalWord, transformedWord);
      }

      // to 부정사 자동 수정: AI가 "creating"만 반환한 경우 "be creating"으로 보정 후 재검증
      if (!validation.isValid && passage && validation.errorMessage && (validation.errorMessage.includes('비문이 됩니다') || validation.errorMessage.includes('to 부정사'))) {
        const baseToIng =
          transformed === original + 'ing' ||
          (original.endsWith('e') && transformed === original.slice(0, -1) + 'ing');
        if (baseToIng && !original.includes(' ')) {
          const corrected = 'be ' + transformedWord;
          const recheck = validateTransformation(originalWord, corrected);
          if (recheck.isValid) {
            const escapedOriginal = originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const firstOccurrenceRe = new RegExp(`\\b${escapedOriginal}\\b`, 'i');
            const renderedPassage = passage.replace(firstOccurrenceRe, corrected);
            const passageValidation = validatePassageForForbiddenPatterns(renderedPassage);
            if (passageValidation.isValid) {
              console.log('✅ to 부정사 자동 수정 적용:', transformedWord, '→', corrected);
              result.transformedWords[result.answerIndex] = corrected;
              transformedWord = corrected;
              validation = { isValid: true };
            }
          }
        }
      }

      // to 부정사 선검사 실패 시: AI 호출 없이 "be V-ing" / "be V-ed"로 로컬 보정 시도 (재시도 전)
      if (!validation.isValid && toInfinitiveInPassage && passage) {
        const ingForm = original.endsWith('e') ? original.slice(0, -1) + 'ing' : original + 'ing';
        const edForm = original.endsWith('e') ? original + 'd' : original + 'ed';
        const toVerbContextRe = new RegExp(`(\\bto\\s+(?:\\w+\\s+)*)(${escapedOriginal})(\\b)`, 'i');
        for (const corrected of ['be ' + ingForm, 'be ' + edForm]) {
          if (!validateTransformation(originalWord, corrected).isValid) continue;
          const fixedPassage = passage.replace(toVerbContextRe, (_: string, prefix: string, _mid: string, suffix: string) => prefix + corrected + (suffix || ''));
          if (validatePassageForForbiddenPatterns(fixedPassage).isValid) {
            result.transformedWords[result.answerIndex] = corrected;
            console.log('✅ to 부정사 로컬 보정 적용 (선검사 실패 후):', transformedWord, '→', corrected);
            return result;
          }
        }
      }

      if (!validation.isValid) {
        const errorMsg = validation.errorMessage || '변형 검증에 실패했습니다.';
        console.warn(`⚠️ [transformWord] 단어 검증 실패:`, errorMsg, '| original:', originalWord, 'transformed:', transformedWord);
        if (attempt < maxRetries) {
          previousErrors.push(errorMsg);
          continue;
        } else {
          console.error('[transformWord] 최종 실패: 단어 검증 단계에서 throw', { attempt, maxRetries, errorMsg });
          throw new Error(errorMsg);
        }
      }

      // 문맥 검증: passage가 주어졌을 때만 치환된 지문에서 "of to V" / "to + 동사ing" 등 금지 패턴 검출
      if (passage) {
        const firstOccurrenceRe = new RegExp(`\\b${escapedOriginal}\\b`, 'i');
        let renderedPassage = passage.replace(firstOccurrenceRe, transformedWord);
        let passageValidation = validatePassageForForbiddenPatterns(renderedPassage);
        const snippetStart = renderedPassage.indexOf(transformedWord);
        const snippet = snippetStart >= 0 ? renderedPassage.slice(Math.max(0, snippetStart - 15), snippetStart + transformedWord.length + 15) : '(없음)';
        console.log('[transformWord] 지문 검증:', {
          isValid: passageValidation.isValid,
          errorMessage: passageValidation.errorMessage,
          치환후_주변문맥: snippet,
        });
        if (!passageValidation.isValid && passageValidation.errorMessage) {
          console.warn('[transformWord] 지문 검증 실패 — 감지된 내용:', passageValidation.errorMessage);
        }
        // "to + 동사ing" 실패 시: "to (부사 등) 원본동사" 구간만 "to ... be V-ing/be V-ed"로 치환 후 재검증
        if (!passageValidation.isValid && passageValidation.errorMessage?.includes('to + 동사ing') && !original.includes(' ')) {
          const ingForm = original.endsWith('e') ? original.slice(0, -1) + 'ing' : original + 'ing';
          const edForm = original.endsWith('e') ? original + 'd' : original + 'ed';
          const toVerbContextRe = new RegExp(`(\\bto\\s+(?:\\w+\\s+)*)(${escapedOriginal})(\\b)`, 'i');
          console.log('[transformWord] "to+동사ing" 감지 → 보정 시도:', ['be ' + ingForm, 'be ' + edForm]);
          for (const corrected of ['be ' + ingForm, 'be ' + edForm]) {
            const fixedPassage = passage.replace(toVerbContextRe, (_: string, prefix: string, _mid: string, suffix: string) => prefix + corrected + (suffix || ''));
            const recheck = validatePassageForForbiddenPatterns(fixedPassage);
            console.log('[transformWord] 보정 후 검증:', { corrected, isValid: recheck.isValid, errorMessage: recheck.errorMessage });
            if (recheck.isValid) {
              result.transformedWords[result.answerIndex] = corrected;
              transformedWord = corrected;
              passageValidation = { isValid: true };
              console.log('✅ to 부정사 강제 보정 적용:', transformedWord, '→', corrected);
              break;
            }
          }
        }
        if (!passageValidation.isValid) {
          const errorMsg = passageValidation.errorMessage || '문맥 패턴 검증에 실패했습니다.';
          console.warn(`⚠️ [transformWord] 지문 검증 실패 (최종):`, errorMsg, '| 치환된 지문 앞 150자:', renderedPassage.slice(0, 150));
          if (attempt < maxRetries) {
            previousErrors.push(errorMsg);
            continue;
          } else {
            console.error('[transformWord] 최종 실패: 지문 검증 단계에서 throw', { attempt, maxRetries, errorMsg });
            throw new Error(errorMsg);
          }
        }
      }

      console.log(`✅ 어법 변형 성공 (시도 ${attempt}번째):`, result);
      return result;

    } catch (parseError) {
      console.warn(`[transformWord] 어법 변형 시도 ${attempt} 실패:`, parseError);
      if (parseError instanceof Error) {
        console.warn('[transformWord] 에러 상세:', { name: parseError.name, message: parseError.message, stack: parseError.stack?.slice(0, 200) });
      }
      if (attempt === maxRetries) {
        console.error('[transformWord] 최종 실패: catch 블록 (재시도 소진)', { attempt, maxRetries });
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

