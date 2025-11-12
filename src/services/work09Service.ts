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
  const prompt = `아래 영어 본문에서 어법(문법) 변형이 가능한 서로 다른 "단어" 5개만 선정하세요.

중요한 규칙:
- 반드시 "단어"만 선정하세요. 여러 단어로 이루어진 구(phrase)는 절대 선정하지 마세요.
- 동일한 단어를 두 번 이상 선택하지 마세요.
- 반드시 각기 다른 문장에서 1개씩만 단어를 선정하세요. (즉, 한 문장에 2개 이상의 단어를 선택하지 마세요.)
- 어법(문법) 변형이 가능한 단어만 선정하세요 (동사, 명사, 형용사, 부사 등).

결과는 아래 JSON 배열 형식으로만 반환하세요:
["단어1", "단어2", "단어3", "단어4", "단어5"]

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
  const grammarTypes = [
    '시제', '조동사', '수동태', '준동사', '가정법', 
    '관계사', '형/부', '수일치/관사', '비교', '도치/강조'
  ];
  
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`어법 변형 시도 ${attempt}/${maxRetries}...`);
    
    const prompt = `You must transform exactly ONE word from the list to create a grammar error for an English quiz.

Original words: ${JSON.stringify(words)}
Grammar types: ${grammarTypes.join(', ')}

CRITICAL REQUIREMENTS:
1. Choose exactly ONE word randomly from the 5 words
2. Transform that word incorrectly according to one grammar rule
3. Keep the other 4 words exactly the same
4. The transformed word must be grammatically WRONG

Examples of transformations:
- "individual" → "individuals" (wrong number)
- "violent" → "violently" (wrong part of speech)
- "go" → "goes" (wrong subject-verb agreement)
- "beautiful" → "beauty" (wrong part of speech)
- "can" → "could" (wrong modal verb)

Return ONLY this JSON format:
{
  "transformedWords": ["word1", "word2", "TRANSFORMED_WORD", "word4", "word5"],
  "answerIndex": 2,
  "original": "original_word_before_transformation",
  "grammarType": "grammar_rule_used"
}`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a grammar expert that creates educational grammar errors.' },
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

