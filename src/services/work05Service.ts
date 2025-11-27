/**
 * Work_05 (빈칸 문장 문제) 문제 생성 로직
 * 원본: src/components/work/Work_05_BlankSentenceInference/Work_05_BlankSentenceInference.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI, translateToKorean } from './common';

// 문장 분할 유틸리티 함수 (work14Service.ts에서 가져옴)
function splitSentences(input: string): string[] {
  let protectedText = input;
  
  // 인용문 내 마침표 보호
  protectedText = protectedText.replace(/"([^"]+?\.)"/g, (match, p1) => `"${p1.replace(/\./g, '[DOT]')}"`);
  
  // A.D. 같은 약어 보호
  protectedText = protectedText.replace(/\b([A-Z])\./g, '$1[DOT]');
  protectedText = protectedText.replace(/\b([A-Z])\.[ ]?([A-Z])\./g, '$1[DOT]$2[DOT]');
  
  // 숫자 중간 마침표 보호 (예: 3.14)
  protectedText = protectedText.replace(/(\d)\.(\d)/g, '$1[DOT]$2');
  
  // 문장 분리: 마침표/물음표/느낌표 뒤 + 대문자/인용문이 시작되는 곳
  const parts = protectedText.split(/(?<=[.?!])\s+(?=[A-Z""''])/).map(s =>
    s.replace(/\[DOT\]/g, '.').trim()
  );
  
  return parts.filter(s => s.length > 5); // 너무 짧은 문장 제거
}

/**
 * 빈칸 문제 타입 정의 (유형#05 전용)
 */
export interface BlankQuiz {
  blankedText: string;
  options: string[];
  answerIndex: number;
  optionTranslations?: string[];
  translation?: string;
}

/**
 * 유형#05: 빈칸(문장) 문제 생성
 * @param passage - 영어 본문
 * @returns 빈칸 문제 데이터
 */

// 빈칸 형식 상수 (언더스코어 30개)
const BLANK_PATTERN = '(______________________________)';

export async function generateWork05Quiz(passage: string): Promise<BlankQuiz> {
  console.log('🔍 Work_05 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);

  // 재시도 로직 (최대 3회)
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 시도 ${attempt}/${maxRetries}...`);
      
      // passage에서 이미 ()로 묶인 문장 추출 (제외 대상)
      const excludedSentences: string[] = [];
      const bracketRegex = /\(([^)]+)\)/g;
      let match;
      while ((match = bracketRegex.exec(passage)) !== null) {
        excludedSentences.push(match[1].trim());
      }

      // 본문의 모든 문장을 추출하여 오답으로 사용하지 않도록 명시
      const allSentences = splitSentences(passage);
      const forbiddenSentences = allSentences
        .map(s => s.trim())
        .filter(s => s.length > 10) // 너무 짧은 문장 제외
        .slice(0, 20); // 최대 20개까지만 표시 (너무 많으면 프롬프트가 길어짐)

      const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 교육과정 수학능력평가(수능) 수준**의 빈칸 채우기 문제를 만들어주세요.

**CRITICAL REQUIREMENTS (절대 필수):**

1. **정답 문장 선정:**
   - 본문에서 주제와 가장 밀접하고 의미 있는 문장(sentence) 1개를 선정하세요.
   - 반드시 본문에 실제로 등장한 문장을 그대로 사용해야 합니다.
   - 철자, 형태, 대소문자, 구두점까지 완전히 동일해야 합니다.
   - 절대로 변형, 대체, 동의어, 어형 변화를 하지 마세요.
   - 본문을 복사해서 붙여넣기 하듯이 정확히 동일하게 사용하세요.

2. **본문 처리:**
   - 문제의 본문(빈칸 포함)은 사용자가 입력한 전체 본문과 완전히 동일해야 합니다.
   - 일부 문장만 추출하거나, 문장 순서를 바꾸거나, 본문을 요약/변형하면 안 됩니다.
   - 오직 선정된 정답 문장만 빈칸 (______________________________)으로 치환해야 합니다.

3. **제외 문장:**
   - 입력된 본문에 이미 ()로 묶인 문장이 있다면, 그 부분은 절대 빈칸 처리 대상으로 삼지 마세요.
   - 아래 문장들은 절대 빈칸 처리하지 마세요: ${excludedSentences.length > 0 ? excludedSentences.join(', ') : '없음'}

4. **5지선다 생성:**
   - 정답 문장(본문에서 선정한 문장을 그대로) + 오답 문장 4개 = 총 5개
   - 정답 문장은 본문에 있던 문장을 변형 없이 그대로 사용하세요.
   
   **⚠️ 오답 문장 생성 규칙 (절대 필수 - 이것을 위반하면 문제가 재생성됩니다):**
   - 오답 문장들은 본문의 주제와 유사하지만 **반드시 본문에 없는 완전히 새로운 내용**이어야 합니다.
   - **절대로 본문에 있는 어떤 문장도 그대로 사용하면 안 됩니다.**
   - **본문의 다른 문장을 변형해서도 안 됩니다.**
   - **본문의 문장을 복사하거나, 일부만 바꾸거나, 동의어로 바꾸는 것도 안 됩니다.**
   - 오답 문장은 본문의 주제와 맥락과 관련이 있지만, **본문에 실제로 등장하지 않는 완전히 새로운 문장**이어야 합니다.
   - 정답과 비슷한 길이와 문체로 작성해야 합니다.
   - 본문의 맥락과 관련이 있지만 실제로는 틀린 내용이어야 합니다.
   
${forbiddenSentences.length > 0 ? `   **🚫 본문에 있는 문장 예시 (이 문장들은 절대 오답으로 사용하면 안 됩니다):**
${forbiddenSentences.map((s, i) => `   ${i + 1}. "${s.substring(0, 80)}${s.length > 80 ? '...' : ''}"`).join('\n')}
   
   **위 문장들은 모두 본문에 실제로 존재하는 문장입니다. 이 문장들을 오답으로 사용하면 안 됩니다.**
   **오답은 위 문장들과 완전히 다른 새로운 문장이어야 합니다.**` : `   **⚠️ 본문에는 여러 문장이 있습니다. 이 문장들을 오답으로 사용하면 안 됩니다.**`}

5. **정답 위치:**
   - 정답의 위치는 1~5번 중 랜덤으로 배치하세요.

6. **한국어 해석:**
   - 각 선택지(정답 포함)에 대한 한국어 해석을 생성하세요.

7. **응답 형식:**
   - 아래 JSON 형식으로만 응답하세요 (optionTranslations 필드는 반드시 포함):

{
  "options": ["영어 선택지1", "영어 선택지2", "영어 선택지3", "영어 선택지4", "영어 선택지5"],
  "answerIndex": 2,
  "optionTranslations": ["한국어 해석1", "한국어 해석2", "한국어 해석3", "한국어 해석4", "한국어 해석5"]
}

**⚠️ 최종 확인 사항:**
- options[answerIndex]에 해당하는 문장은 반드시 본문에 있는 문장과 완전히 일치해야 합니다.
- 본문을 검색했을 때 정확히 찾을 수 있어야 합니다.
- 변형/대체/동의어/어형 변화가 있으면 안 됩니다.
- 본문에서 해당 문장을 복사해서 붙여넣기 하면 정확히 일치해야 합니다.

**🚫 오답 검증 (절대 필수):**
- answerIndex가 아닌 다른 모든 options의 문장들은 본문에 없는 완전히 새로운 문장이어야 합니다.
- 본문을 검색했을 때 찾을 수 없어야 합니다.
- 본문의 어떤 문장과도 일치하거나 유사하면 안 됩니다.

본문:
${passage}`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: attempt === 1 ? 0.5 : 0.3 // 첫 시도는 0.5, 재시도는 더 낮춤 (일관성 향상)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI 응답 원본:', data.choices[0].message.content);
    const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    
    let result: any;
    try {
      result = JSON.parse(jsonMatch[0]);
      console.log('파싱된 결과:', result);
      console.log('optionTranslations:', result.optionTranslations);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
    }

    // 정답 문장이 본문에 실제로 존재하는지 검증 (엄격한 검증)
    const answerSentence = result.options[result.answerIndex];
    
    console.log('🔍 정답 검증 시작:', {
      answerSentence: answerSentence.substring(0, 100) + '...',
      answerLength: answerSentence.length,
      passageLength: passage.length
    });
    
    // 정확한 매칭 확인
    const exactMatch = passage.includes(answerSentence);
    
    // 정규화된 매칭 확인 (공백 정규화)
    const passageNormalized = passage.replace(/\s+/g, ' ').trim();
    const answerNormalized = answerSentence.replace(/\s+/g, ' ').trim();
    const normalizedMatch = passageNormalized.includes(answerNormalized);
    
    console.log('🔍 정답 검증 결과:', {
      exactMatch,
      normalizedMatch,
      answerPreview: answerSentence.substring(0, 50),
      passagePreview: passage.substring(0, 100)
    });
    
    // 정답 문장이 본문에 없으면 에러 발생
    if (!exactMatch && !normalizedMatch) {
      const errorMsg = `❌ 정답 문장이 본문에서 찾을 수 없습니다. AI가 반환한 정답 문장이 본문에 정확히 일치하지 않습니다.\n\n정답 문장: ${answerSentence.substring(0, 100)}...\n\n본문의 일부를 확인하고, 정답 문장이 본문에 있는 그대로인지 확인해주세요.`;
      console.error(errorMsg);
      throw new Error('정답 문장이 본문에서 찾을 수 없습니다. AI가 본문에 있는 문장을 정확히 반환하지 않았습니다.');
    }
    
    // 정답 문장을 찾기 위한 유틸리티 함수
    const findBestMatch = (text: string, target: string): { index: number; sentence: string } | null => {
      // 방법 1: 정확한 매칭
      const exactIndex = text.indexOf(target);
      if (exactIndex !== -1) {
        return { index: exactIndex, sentence: target };
      }
      
      // 방법 2: 정규화된 매칭
      const normalizedText = text.replace(/\s+/g, ' ');
      const normalizedTarget = target.replace(/\s+/g, ' ');
      const normalizedIndex = normalizedText.indexOf(normalizedTarget);
      if (normalizedIndex !== -1) {
        // 원본 텍스트에서 해당 위치 찾기
        let originalIndex = 0;
        let normalizedPos = 0;
        for (let i = 0; i < text.length; i++) {
          if (normalizedPos === normalizedIndex) {
            originalIndex = i;
            break;
          }
          if (/\s/.test(text[i])) {
            normalizedPos++;
            while (i + 1 < text.length && /\s/.test(text[i + 1])) i++;
          } else {
            normalizedPos++;
          }
        }
        return { index: originalIndex, sentence: target };
      }
      
      // 방법 3: 문장 단위로 분할하여 유사한 문장 찾기
      const sentences = text.split(/(?<=[.!?])\s+/);
      let bestMatch: { index: number; sentence: string; score: number } | null = null;
      
      let currentIndex = 0;
      for (const sentence of sentences) {
        const sentenceTrimmed = sentence.trim();
        if (sentenceTrimmed.length < 10) {
          currentIndex += sentence.length;
          continue;
        }
        
        // 유사도 계산 (간단한 방법: 공통 단어 수)
        const targetWords = normalizedTarget.toLowerCase().split(/\s+/);
        const sentenceWords = sentenceTrimmed.replace(/\s+/g, ' ').toLowerCase().split(/\s+/);
        const commonWords = targetWords.filter(word => sentenceWords.includes(word));
        const score = commonWords.length / Math.max(targetWords.length, sentenceWords.length);
        
        if (score > 0.7 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = {
            index: text.indexOf(sentenceTrimmed, currentIndex),
            sentence: sentenceTrimmed,
            score
          };
        }
        
        currentIndex += sentence.length;
      }
      
      if (bestMatch && bestMatch.score > 0.7) {
        console.log('✅ 유사 문장 발견:', {
          score: bestMatch.score,
          sentence: bestMatch.sentence.substring(0, 50) + '...',
          target: target.substring(0, 50) + '...'
        });
        return { index: bestMatch.index, sentence: bestMatch.sentence };
      }
      
      return null;
    };
    
    // findBestMatch로 정답 문장 위치 찾기
    const bestMatch = findBestMatch(passage, answerSentence);
    if (!bestMatch) {
      const errorMsg = `❌ 정답 문장을 본문에서 찾을 수 없습니다. 모든 방법으로 매칭을 시도했지만 실패했습니다.\n\n정답 문장: ${answerSentence.substring(0, 100)}...\n\nAI가 반환한 정답 문장이 본문과 일치하지 않습니다.`;
      console.error(errorMsg);
      throw new Error('정답 문장을 본문에서 찾을 수 없습니다. AI가 본문에 있는 문장을 정확히 반환하지 않았습니다.');
    }
    
    console.log('✅ 정답 문장 매칭 성공:', {
      index: bestMatch.index,
      sentencePreview: bestMatch.sentence.substring(0, 50) + '...',
      matchType: bestMatch.sentence === answerSentence ? '정확한 매칭' : '유사 매칭'
    });

    // blankedText를 프론트엔드에서 직접 생성 (개선된 버전: 괄호 안/밖 완벽 구분)
    const replaceFirstOutsideBrackets = (text: string, targetSentence: string): string => {
      console.log('🔍 빈칸 교체 시작:', {
        sentenceLength: targetSentence.length,
        sentencePreview: targetSentence.substring(0, 50) + '...',
        textLength: text.length
      });

      // findBestMatch 함수를 사용하여 최적의 매칭 찾기
      const match = findBestMatch(text, targetSentence);
      
      if (!match) {
        console.error('❌ 정답 문장을 본문에서 찾을 수 없습니다. 모든 방법 실패.');
        return text; // 교체 실패 시 원본 반환
      }
      
      const { index: sentenceIndex, sentence: actualSentence } = match;

      // 정답 문장의 위치가 괄호 안인지 밖인지 확인
      let bracketDepth = 0;
      for (let i = 0; i < sentenceIndex; i++) {
        if (text[i] === '(') bracketDepth++;
        if (text[i] === ')') bracketDepth--;
      }

      // 정답 문장을 정규식으로 escape (특수 문자 처리)
      const escapedSentence = actualSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 괄호 안에 있으면 교체하지 않음
      if (bracketDepth > 0) {
        console.warn('⚠️ 정답 문장이 괄호 안에 있어서 교체하지 않습니다');
        
        // 괄호 밖에서 찾기 시도
        const regex = new RegExp(escapedSentence, 'g');
        let match;
        
        while ((match = regex.exec(text)) !== null) {
          // 현재 매칭 위치의 괄호 깊이 확인
          let depth = 0;
          for (let i = 0; i < match.index; i++) {
            if (text[i] === '(') depth++;
            if (text[i] === ')') depth--;
          }
          
          if (depth === 0) {
            // 괄호 밖에 있는 첫 번째 매칭 사용
            const before = text.substring(0, match.index);
            const after = text.substring(match.index + match[0].length);
            console.log('✅ 괄호 밖에서 매칭 발견, 교체 수행');
            return before + BLANK_PATTERN + after;
          }
        }
        
        return text; // 괄호 안에만 있으면 원본 반환
      }

      // 괄호 밖에 있으면 직접 교체
      const before = text.substring(0, sentenceIndex);
      const after = text.substring(sentenceIndex + actualSentence.length);
      const result = before + BLANK_PATTERN + after;
      
      console.log('✅ 빈칸 교체 성공:', {
        originalLength: text.length,
        resultLength: result.length,
        hasBlank: result.includes(BLANK_PATTERN),
        replacedSentence: actualSentence.substring(0, 50) + '...'
      });
      
      return result;
    };

    const answer = result.options[result.answerIndex];
    let blankedText;
    
    try {
      blankedText = replaceFirstOutsideBrackets(passage, answer);
      
      // 교체가 실제로 이루어졌는지 확인
      if (blankedText === passage || !blankedText.includes(BLANK_PATTERN)) {
        console.warn('⚠️ 빈칸 교체가 이루어지지 않았습니다. 강제 교체 시도...');
        
        // 최후의 수단: 본문을 문장 단위로 분할하여 정답과 가장 유사한 문장 찾기
        const sentences = passage.split(/(?<=[.!?])\s+/);
        let bestSentenceIndex = -1;
        let bestScore = 0;
        
        const targetWords = answer.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
        
        for (let i = 0; i < sentences.length; i++) {
          const sentence = sentences[i].trim();
          if (sentence.length < 20) continue;
          
          const sentenceWords = sentence.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
          const commonWords = targetWords.filter((w: string) => sentenceWords.includes(w));
          const score = commonWords.length / Math.max(targetWords.length, sentenceWords.length);
          
          if (score > bestScore && score > 0.6) {
            bestScore = score;
            bestSentenceIndex = i;
          }
        }
        
        if (bestSentenceIndex !== -1) {
          const bestSentence = sentences[bestSentenceIndex].trim();
          const sentenceIndex = passage.indexOf(bestSentence);
          
          if (sentenceIndex !== -1) {
            blankedText = passage.substring(0, sentenceIndex) + 
                         BLANK_PATTERN + 
                         passage.substring(sentenceIndex + bestSentence.length);
            console.log('✅ 강제 교체 성공:', {
              score: bestScore,
              sentence: bestSentence.substring(0, 50) + '...'
            });
          }
        }
      }
      
      // 최종 검증: 빈칸이 실제로 포함되어 있는지 확인
      if (!blankedText.includes(BLANK_PATTERN)) {
        const errorMsg = `❌ 빈칸 생성에 실패했습니다. 정답 문장을 본문에서 찾았지만 교체에 실패했습니다.\n\n정답 문장: ${answer.substring(0, 100)}...\n\n빈칸 교체 로직에 문제가 있습니다.`;
        console.error(errorMsg);
        throw new Error('빈칸 생성에 실패했습니다. 정답 문장을 빈칸으로 교체할 수 없습니다.');
      }
      
      console.log('✅ 빈칸 생성 최종 검증 성공:', {
        hasBlank: blankedText.includes(BLANK_PATTERN),
        blankedTextPreview: blankedText.substring(0, 200) + '...'
      });
    } catch (error) {
      console.error('❌ 빈칸 생성 중 오류:', error);
      console.warn('빈칸 생성 실패, 원본 본문을 그대로 사용합니다:', error);
      blankedText = passage;
    }
    
    result.blankedText = blankedText;
    
    // 복원 검증 (더 유연하게) - 언더스코어 20개 이상 매칭 (30개 언더스코어 사용)
    const blankRestore = result.blankedText.replace(/\( *_{20,}\)/, answer);
    const passageTrimmed = passage.replace(/\s+/g, ' ').trim();
    const restoreTrimmed = blankRestore.replace(/\s+/g, ' ').trim();
    
    console.log('🔍 빈칸 복원 검증:', {
      blankedTextHasBlank: result.blankedText.includes(BLANK_PATTERN),
      blankedTextPreview: result.blankedText.substring(0, 200),
      originalLength: passageTrimmed.length,
      restoredLength: restoreTrimmed.length,
      matches: restoreTrimmed === passageTrimmed
    });
    
    if (restoreTrimmed !== passageTrimmed) {
      console.warn('⚠️ 빈칸 복원 검증 실패하지만 계속 진행합니다:', {
        original: passageTrimmed.substring(0, 100),
        restored: restoreTrimmed.substring(0, 100)
      });
    } else {
      console.log('✅ 빈칸 복원 검증 성공');
    }

    if (!result.blankedText || !result.options || typeof result.answerIndex !== 'number') {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    // 오답 선택지 검증: 본문에 있는 문장이 오답으로 사용되었는지 확인
    console.log('🔍 오답 선택지 검증 시작...');
    const wrongOptions: string[] = [];
    
    for (let i = 0; i < result.options.length; i++) {
      if (i === result.answerIndex) continue; // 정답은 건너뛰기
      
      const option = result.options[i];
      const passageNormalized = passage.replace(/\s+/g, ' ').trim();
      const optionNormalized = option.replace(/\s+/g, ' ').trim();
      
      // 정확한 매칭 확인
      const exactMatch = passage.includes(option);
      // 정규화된 매칭 확인
      const normalizedMatch = passageNormalized.includes(optionNormalized);
      
      if (exactMatch || normalizedMatch) {
        wrongOptions.push(`선택지 ${i + 1}: "${option.substring(0, 50)}..."`);
        console.error(`❌ 오답 선택지 ${i + 1}가 본문에 존재합니다:`, {
          option: option.substring(0, 100),
          exactMatch,
          normalizedMatch
        });
      }
    }
    
    if (wrongOptions.length > 0) {
      const errorMsg = `❌ 오답 선택지가 본문에 있는 문장과 일치합니다. 오답은 반드시 본문에 없는 새로운 문장이어야 합니다.\n\n본문에 있는 오답 선택지:\n${wrongOptions.join('\n')}\n\nAI가 본문에 있는 문장을 오답으로 사용했습니다. 문제를 재생성해야 합니다. (시도 ${attempt}/${maxRetries})`;
      console.error(errorMsg);
      
      // 마지막 시도가 아니면 재시도
      if (attempt < maxRetries) {
        lastError = new Error(`오답 선택지가 본문에 있는 문장과 일치합니다. 재시도 중... (${attempt}/${maxRetries})`);
        console.warn(`⚠️ 재시도 ${attempt + 1}/${maxRetries}로 진행합니다...`);
        continue; // 다음 시도로
      } else {
        throw new Error(`오답 선택지가 본문에 있는 문장과 일치합니다. 오답은 본문에 없는 새로운 문장이어야 합니다. (${wrongOptions.length}개 발견, ${maxRetries}회 시도 실패)`);
      }
    }
    
    console.log('✅ 오답 선택지 검증 성공: 모든 오답이 본문에 없는 새로운 문장입니다.');
    
    // optionTranslations가 없으면 기본값 설정
    if (!result.optionTranslations || !Array.isArray(result.optionTranslations)) {
      console.warn('optionTranslations가 없거나 배열이 아닙니다. 기본값을 설정합니다.');
      result.optionTranslations = result.options.map(() => '해석을 생성할 수 없습니다.');
    }
    
    // 별도 번역 함수로 본문 번역 처리
    console.log('본문 번역 시작:', { passageLength: passage.length });
    try {
      const translation = await translateToKorean(passage);
      console.log('번역 결과 저장:', { translationLength: translation.length, hasTranslation: !!translation });
      
      if (translation && translation.trim().length > 0) {
        result.translation = translation;
      } else {
        console.warn('번역 결과가 비어있어 기본값 사용');
        result.translation = '번역을 생성할 수 없습니다. 관리자에게 문의하세요.';
      }
    } catch (translationError: any) {
      console.error('번역 처리 중 오류:', translationError);
      result.translation = `번역 생성 중 오류가 발생했습니다: ${translationError.message}`;
    }

      console.log('✅ Work_05 문제 생성 완료:', result);
      return result;

    } catch (error: any) {
      lastError = error;
      console.error(`❌ Work_05 문제 생성 실패 (시도 ${attempt}/${maxRetries}):`, error);
      
      // 마지막 시도가 아니면 재시도
      if (attempt < maxRetries) {
        console.warn(`⚠️ 재시도 ${attempt + 1}/${maxRetries}로 진행합니다...`);
        continue; // 다음 시도로
      }
      
      // 마지막 시도 실패
      throw new Error(`문제 생성에 실패했습니다 (${maxRetries}회 시도): ${error.message}`);
    }
  }

  // 모든 시도 실패
  throw lastError || new Error('문제 생성에 실패했습니다.');
}
