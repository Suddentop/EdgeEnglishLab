/**
 * Work_08 (제목 추론) 문제 생성 로직
 * 원본: src/components/work/Work_08_TitleInference/Work_08_TitleInference.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI, translateToKorean } from './common';

/**
 * 제목 추론 문제 타입 정의
 */
export interface TitleQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation: string;
  optionTranslations: string[];
}

/**
 * 유형#08: 제목 추론 문제 생성
 * @param passage - 영어 본문
 * @returns 제목 추론 문제 데이터
 */
export async function generateWork08Quiz(passage: string): Promise<TitleQuiz> {
  console.log('🔍 Work_08 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);

  try {
    const prompt = `아래 영어 본문을 읽고, 글의 주제의식에 가장 적합한 제목(title) 1개를 선정해.

요구사항:
1. 정답 제목(문장/구) + 오답(비슷한 길이의 제목 4개, 의미는 다름) 총 5개를 생성
2. 정답의 위치는 1~5번 중 랜덤
3. 본문 해석도 함께 제공
4. 각 옵션(1번~5번)에 대한 한글 해석을 반드시 제공

아래 JSON 형식으로 정확히 응답해줘:

{
  "passage": "영어 본문 내용",
  "options": ["첫번째 옵션 제목", "두번째 옵션 제목", "세번째 옵션 제목", "네번째 옵션 제목", "다섯번째 옵션 제목"],
  "answerIndex": 2,
  "translation": "본문의 한글 해석",
  "answerTranslation": "정답 제목의 한글 해석",
  "optionTranslations": ["첫번째 옵션의 한글 해석", "두번째 옵션의 한글 해석", "세번째 옵션의 한글 해석", "네번째 옵션의 한글 해석", "다섯번째 옵션의 한글 해석"]
}

본문:
${passage}

중요: optionTranslations 배열에는 반드시 5개의 한글 해석이 순서대로 들어가야 합니다. 각 옵션의 제목을 한국어로 자연스럽게 번역해주세요.`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7
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

    // 필수 필드 검증
    if (!result.passage || !result.options || typeof result.answerIndex !== 'number' || !result.translation) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }

    // answerTranslation이 없으면 빈 문자열로 보완
    if (!result.answerTranslation) {
      result.answerTranslation = '';
    }

    // optionTranslations가 없으면 빈 배열로 보완
    if (!result.optionTranslations || !Array.isArray(result.optionTranslations)) {
      result.optionTranslations = result.options.map(() => '');
    }

    // answerIndex 범위 검증
    if (result.answerIndex < 0 || result.answerIndex > 4) {
      throw new Error('answerIndex는 0~4 범위여야 합니다.');
    }

    // options 배열 길이 검증
    if (result.options.length !== 5) {
      throw new Error('options는 정확히 5개의 선택지여야 합니다.');
    }

    // optionTranslations 배열 길이 검증 및 보완
    if (result.optionTranslations.length !== 5) {
      // 부족한 경우 빈 문자열로 채움
      while (result.optionTranslations.length < 5) {
        result.optionTranslations.push('');
      }
      // 초과하는 경우 자름
      if (result.optionTranslations.length > 5) {
        result.optionTranslations = result.optionTranslations.slice(0, 5);
      }
    }

    console.log('✅ Work_08 문제 생성 완료:', result);
    return result;

  } catch (error) {
    console.error('❌ Work_08 문제 생성 실패:', error);
    throw error;
  }
}
