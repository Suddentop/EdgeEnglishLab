/**
 * Work_05 (빈칸 문장 문제) 문제 생성 로직
 * 원본: src/components/work/Work_05_BlankSentenceInference/Work_05_BlankSentenceInference.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI, translateToKorean } from './common';

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
export async function generateWork05Quiz(passage: string): Promise<BlankQuiz> {
  console.log('🔍 Work_05 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);

  try {
    // passage에서 이미 ()로 묶인 문장 추출 (제외 대상)
    const excludedSentences: string[] = [];
    const bracketRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = bracketRegex.exec(passage)) !== null) {
      excludedSentences.push(match[1].trim());
    }

    const prompt = `아래 영어 본문에서 글의 주제와 가장 밀접한, 의미 있는 문장(sentence) 1개를 선정해.

1. 반드시 본문에 실제로 등장한 문장(철자, 형태, 대소문자까지 동일)을 정답으로 선정해야 해. 변형, 대체, 동의어, 어형 변화 없이 본문에 있던 그대로 사용해야 해.

2. 문제의 본문(빈칸 포함)은 반드시 사용자가 입력한 전체 본문과 완전히 동일해야 하며, 일부 문장만 추출하거나, 문장 순서를 바꾸거나, 본문을 요약/변형해서는 안 돼. 오직 정답 문장만 ()로 치환해.

3. 입력된 본문에 이미 ()로 묶인 문장이 있다면, 그 부분은 절대 빈칸 처리 대상으로 삼지 마세요. 반드시 괄호 밖에 있는 문장만 빈칸 후보로 선정하세요.

4. 아래 문장은 절대 빈칸 처리하지 마세요: ${excludedSentences.length > 0 ? excludedSentences.join(', ') : '없음'}

5. 정답(문장) + 오답(본문과 유사한 주제/맥락의 새로운 문장 4개) 총 5개를 생성해.
   - 오답 문장들은 본문의 주제와 유사하지만 본문에 없는 새로운 내용이어야 함
   - 본문의 다른 문장을 그대로 사용하면 안 됨
   - 정답과 비슷한 길이와 문체로 작성해야 함
   - 본문의 맥락과 관련이 있지만 실제로는 틀린 내용이어야 함

6. 정답의 위치는 1~5번 중 랜덤.

7. 각 선택지(정답 포함)에 대한 한국어 해석을 생성해.

8. 아래 JSON 형식으로 응답 (optionTranslations 필드는 반드시 포함해야 함):

{
  "options": ["영어 선택지1", "영어 선택지2", "영어 선택지3", "영어 선택지4", "영어 선택지5"],
  "answerIndex": 2,
  "optionTranslations": ["한국어 해석1", "한국어 해석2", "한국어 해석3", "한국어 해석4", "한국어 해석5"]
}

주의: options의 정답(정답 인덱스에 해당하는 문장)은 반드시 본문에 있던 문장과 완전히 일치해야 하며, 변형/대체/동의어/어형 변화가 있으면 안 됨. 문제의 본문(빈칸 포함)은 반드시 입력한 전체 본문과 동일해야 함. 입력된 본문에 이미 ()로 묶인 부분은 빈칸 처리 대상에서 제외해야 함.

본문:
${passage}`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.7
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

    // 정답 문장이 본문에 실제로 존재하는지 검증 (더 유연한 검증)
    const answerSentence = result.options[result.answerIndex];
    const passageNormalized = passage.replace(/\s+/g, ' ').trim();
    const answerNormalized = answerSentence.replace(/\s+/g, ' ').trim();
    
    console.log('정답 검증:', {
      answerSentence,
      answerNormalized,
      passageContains: passage.includes(answerSentence),
      passageNormalizedContains: passageNormalized.includes(answerNormalized)
    });
    
    if (!passage.includes(answerSentence) && !passageNormalized.includes(answerNormalized)) {
      console.warn('정답 문장이 본문과 정확히 일치하지 않지만 계속 진행합니다.');
    }

    // blankedText를 프론트엔드에서 직접 생성 (괄호 split 방식, 괄호 안/밖 완벽 구분)
    const replaceFirstOutsideBrackets = (text: string, sentence: string): string => {
      let replaced = false;
      const tokens = text.split(/([()])/);
      let inBracket = false;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') { inBracket = true; continue; }
        if (tokens[i] === ')') { inBracket = false; continue; }
        if (!inBracket && !replaced) {
          const regex = new RegExp(sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          if (regex.test(tokens[i])) {
            tokens[i] = tokens[i].replace(regex, '(__________)');
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
    let blankedText;
    
    try {
      blankedText = replaceFirstOutsideBrackets(passage, answer);
    } catch (error) {
      console.warn('빈칸 생성 실패, 원본 본문을 그대로 사용합니다:', error);
      blankedText = passage;
    }
    
    result.blankedText = blankedText;
    
    // 복원 검증 (더 유연하게)
    const blankRestore = result.blankedText.replace(/\( *_{6,}\)/, answer);
    const passageTrimmed = passage.replace(/\s+/g, ' ').trim();
    const restoreTrimmed = blankRestore.replace(/\s+/g, ' ').trim();
    
    if (restoreTrimmed !== passageTrimmed) {
      console.warn('빈칸 복원 검증 실패하지만 계속 진행합니다:', {
        original: passageTrimmed,
        restored: restoreTrimmed
      });
    }

    if (!result.blankedText || !result.options || typeof result.answerIndex !== 'number') {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
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

  } catch (error) {
    console.error('❌ Work_05 문제 생성 실패:', error);
    throw error;
  }
}
