/**
 * Work_04 (빈칸 구 문제) 문제 생성 로직
 * 원본: src/components/work/Work_04_BlankPhraseInference/Work_04_BlankPhraseInference.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI, translateToKorean, addVarietyToPrompt, getProblemGenerationTemperature } from './common';

/**
 * 빈칸 문제 타입 정의
 */
export interface BlankQuiz {
  blankedText: string;
  options: string[];
  answerIndex: number;
  translation?: string;
}

/**
 * 유형#04: 빈칸(구) 문제 생성
 * @param passage - 영어 본문
 * @param previouslySelectedPhrases - 이전에 선택된 구 목록 (동일 본문으로 여러 번 생성 시 사용)
 * @returns 빈칸 문제 데이터
 */
export async function generateWork04Quiz(
  passage: string,
  previouslySelectedPhrases?: string[]
): Promise<BlankQuiz> {
  console.log('🔍 Work_04 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);
  console.log('📌 이전 선택 구:', previouslySelectedPhrases && previouslySelectedPhrases.length > 0 ? previouslySelectedPhrases.join(', ') : '없음');

  try {
    // passage에서 이미 ()로 묶인 구 추출 (제외 대상)
    const excludedPhrases: string[] = [];
    const bracketRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = bracketRegex.exec(passage)) !== null) {
      excludedPhrases.push(match[1].trim());
    }

    const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 교육과정 수학능력평가(수능) 수준**의 빈칸 추론 문제를 만들어주세요. 글의 주제와 가장 밀접한, 의미 있는 구(phrase, 3~10단어 이내) 1개를 선정하되, **수능 수준의 문맥 추론이 필요한 학술적/문학적 구**를 선택하세요.

1. 반드시 본문에 실제로 등장한 구(철자, 형태, 대소문자까지 동일)를 정답으로 선정해야 해. 변형, 대체, 동의어, 어형 변화 없이 본문에 있던 그대로 사용해야 해.

2. 문제의 본문(빈칸 포함)은 반드시 사용자가 입력한 전체 본문과 완전히 동일해야 하며, 일부 문장만 추출하거나, 문장 순서를 바꾸거나, 본문을 요약/변형해서는 안 돼. 오직 정답 구만 ()로 치환해.

3. 입력된 본문에 이미 ()로 묶인 단어나 구가 있다면, 그 부분은 절대 빈칸 처리 대상으로 삼지 마세요. 반드시 괄호 밖에 있는 구만 빈칸 후보로 선정하세요.

4. 아래 구는 절대 빈칸 처리하지 마세요: ${excludedPhrases.length > 0 ? excludedPhrases.join(', ') : '없음'}
${previouslySelectedPhrases && previouslySelectedPhrases.length > 0 ? `
5. **⚠️⚠️⚠️ 절대 필수 - 이전 선택 구 제외 (매우 중요):**
   * 아래 구들은 이전에 이미 선택된 구입니다. 이 구들은 **절대 선택하지 마세요**:
   * ${previouslySelectedPhrases.map(phrase => `"${phrase}"`).join(', ')}
   * 위 구들과는 **완전히 다른 구**를 선택해야 합니다.
   * 본문에서 위 구들을 제외한 다른 적절한 구를 선택하세요.
   * **이전에 선택한 구와 동일하거나 유사한 구를 선택하면 안 됩니다.**
   * **반드시 본문의 다른 위치에서 다른 구를 선택해야 합니다.**` : ''}

${previouslySelectedPhrases && previouslySelectedPhrases.length > 0 ? '6' : '5'}. 정답(구) + 오답(비슷한 길이의 구 4개, 의미는 다름) 총 5개를 생성해.

${previouslySelectedPhrases && previouslySelectedPhrases.length > 0 ? '7' : '6'}. 정답의 위치는 1~5번 중 랜덤.

${previouslySelectedPhrases && previouslySelectedPhrases.length > 0 ? '8' : '7'}. 본문 해석도 함께 제공.

${previouslySelectedPhrases && previouslySelectedPhrases.length > 0 ? '9' : '8'}. 아래 JSON 형식으로 응답:

{
  "options": ["...", ...],
  "answerIndex": 2, // 0~4
  "translation": "..."
}

주의: options의 정답(정답 인덱스에 해당하는 구)는 반드시 본문에 있던 구와 완전히 일치해야 하며, 변형/대체/동의어/어형 변화가 있으면 안 됨. 문제의 본문(빈칸 포함)은 반드시 입력한 전체 본문과 동일해야 함. 입력된 본문에 이미 ()로 묶인 부분은 빈칸 처리 대상에서 제외해야 함.
${previouslySelectedPhrases && previouslySelectedPhrases.length > 0 ? `

**🔴 최종 확인 - 반드시 확인하세요:**
- 위에서 명시한 이전 선택 구들(${previouslySelectedPhrases.map(p => `"${p}"`).join(', ')})은 절대 선택하지 마세요.
- 반드시 본문의 다른 위치에서 다른 구를 선택해야 합니다.
- 이전 선택 구와 동일하거나 유사한 구를 선택하면 안 됩니다.` : ''}

본문:
${passage}`;

    // 다양성 추가
    const enhancedPrompt = addVarietyToPrompt(prompt);
    const temperature = getProblemGenerationTemperature(0.7);

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: enhancedPrompt }],
      max_tokens: 1200,
      temperature: temperature
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    
    let result: any;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
    }

    // 정답 구가 본문에 실제로 존재하는지 검증
    if (!passage.includes(result.options[result.answerIndex])) {
      throw new Error('정답 구가 본문에 존재하지 않습니다. AI 응답 오류입니다.');
    }

    // blankedText를 프론트엔드에서 직접 생성 (괄호 split 방식, 괄호 안/밖 완벽 구분)
    const replaceFirstOutsideBrackets = (text: string, phrase: string): string => {
      let replaced = false;
      const tokens = text.split(/([()])/);
      let inBracket = false;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') { inBracket = true; continue; }
        if (tokens[i] === ')') { inBracket = false; continue; }
        if (!inBracket && !replaced) {
          const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          if (regex.test(tokens[i])) {
            tokens[i] = tokens[i].replace(regex, '(____________________)');
            replaced = true;
          }
        }
      }
      let result = '';
      inBracket = false;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') { inBracket = true; result += '('; continue; }
        if (tokens[i] === ')') { inBracket = false; result += ')'; continue; }
        result += tokens[i];
      }
      return result;
    };

    const answer = result.options[result.answerIndex];
    console.log('✅ 선택된 정답 구:', answer);
    
    // 이전 선택 구와 중복 확인
    if (previouslySelectedPhrases && previouslySelectedPhrases.length > 0) {
      const isDuplicate = previouslySelectedPhrases.some(prev => 
        prev.toLowerCase().trim() === answer.toLowerCase().trim()
      );
      if (isDuplicate) {
        console.warn('⚠️ 경고: 이전에 선택된 구와 동일한 구가 선택되었습니다:', answer);
        console.warn('⚠️ 이전 선택 구 목록:', previouslySelectedPhrases);
      } else {
        console.log('✅ 이전 선택 구와 다른 구가 선택되었습니다.');
      }
    }
    
    const blankedText = replaceFirstOutsideBrackets(passage, answer);
    result.blankedText = blankedText;

    // 복원 검증
    const blankRestore = result.blankedText.replace(/\( *_{10,}\)/, answer);
    if (blankRestore.trim() !== passage.trim()) {
      throw new Error('빈칸 본문이 원본 본문과 일치하지 않습니다. AI 응답 오류입니다.');
    }

    if (!result.blankedText || !result.options || typeof result.answerIndex !== 'number' || !result.translation) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }

    console.log('✅ Work_04 문제 생성 완료:', result);
    return result;

  } catch (error) {
    console.error('❌ Work_04 문제 생성 실패:', error);
    throw error;
  }
}
