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
    const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 3학년 및 대학수학능력시험(수능) 수준**의 **고난도 제목 추론 문제**를 만들어주세요.

**🎯 핵심 요구사항:**
1. **정답의 명확성:** 5개의 선택지 중 정답은 **오직 하나**여야 하며, 본문의 핵심 내용을 가장 **함축적이고 효과적**으로 표현한 제목이어야 합니다.
2. **제목의 특성:**
   - 단순한 요약문이 아닌, 독자의 호기심을 자극하거나 글의 핵심을 꿰뚫는 **Short Phrase (구)** 형태나 **질문** 형태를 사용하세요.
   - **비유적 표현(Metaphor)**이나 **상징적 어휘**를 적절히 사용하여 고난도 문제를 만드세요.
3. **매력적인 오답 (Distractors):** 정답과 비슷해 보이지만 논리적으로 명확히 틀린 함정을 만드세요.
   - **Too Broad:** "Science and Life" 처럼 너무 막연하고 포괄적인 제목.
   - **Too Narrow:** 본문의 예시나 일부분에만 초점을 맞춘 제목.
   - **Misleading:** 본문의 키워드를 사용했지만 저자의 의도와 반대되거나 다른 방향의 제목.
   - **Vague:** 그럴듯해 보이지만 본문의 핵심 메시지와는 거리가 먼 모호한 제목.
4. **난이도 상향:**
   - 선택지의 어휘 수준을 **수능 1등급 수준**으로 높이세요.
   - 정답이 너무 뻔하게 드러나지 않도록 모든 선택지의 길이와 문법 구조를 비슷하게 맞추세요.

**✅ 단계별 작업:**
1단계: 본문의 핵심 메시지와 저자의 의도를 파악합니다.
2단계: 이를 가장 잘 표현하는 **함축적이고 세련된 영어 제목(정답)**을 1개 작성합니다.
3단계: 위 '매력적인 오답' 패턴을 활용하여 오답 4개를 작성합니다. (정답과 의미적 거리는 멀되, 형태적 유사성은 가깝게)
4단계: 5개 선택지를 배열에 배치합니다. (정답 위치는 랜덤)
5단계: 본문과 선택지를 정확하고 자연스러운 한국어로 번역합니다.

아래 JSON 형식으로 응답:
{
  "passage": "원본 영어 본문",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answerIndex": 0,
  "translation": "본문 전체의 한글 해석",
  "answerTranslation": "정답 선택지의 정확한 한글 해석",
  "optionTranslations": ["선택지1 해석", "선택지2 해석", "선택지3 해석", "선택지4 해석", "선택지5 해석"]
}

본문:
${passage}

중요 규칙:
- answerIndex는 0~4 사이의 숫자 (배열 인덱스)
- answerTranslation은 반드시 options[answerIndex]의 정확한 번역
- optionTranslations는 모든 선택지의 해석 배열 (options와 동일한 순서)
- 모든 해석이 정확히 일치해야 함`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.5
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

/**
 * 유형#08: 제목 추론 문제 생성 (재시도 버전)
 * @param passage - 영어 본문
 * @param retryCount - 재시도 횟수
 * @returns 제목 추론 문제 데이터
 */
export async function generateWork08QuizWithRetry(passage: string, retryCount: number = 1): Promise<TitleQuiz> {
  console.log(`🔍 Work_08 문제 생성 시작 (재시도 ${retryCount}번째)...`);
  console.log('📝 입력 텍스트 길이:', passage.length);

  try {
    const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 3학년 및 수능(CSAT) 최고난도 수준**의 **제목 추론 문제**를 다시 만들어주세요.

**🚨 긴급 수정 요청 (이전 시도 실패 원인):**
- 이전 결과에서 정답 제목과 오답 제목의 구분이 모호했습니다.
- 오답이 정답과 너무 비슷하거나, 정답이 너무 평이했습니다.

**🎯 재시도 핵심 목표:**
1. **정답의 유일성:** 정답 제목은 본문의 전체 내용을 관통하는 **가장 핵심적이고 함축적인(Implicative)** 표현이어야 합니다.
2. **오답의 명확성:** 오답은 반드시 **"틀린 이유"**가 명확해야 합니다.
   - **Too Broad:** 너무 광범위한 제목
   - **Too Narrow:** 지엽적인 제목
   - **Contradictory:** 내용 불일치
   - **Keyword Trap:** 키워드만 나열한 함정
3. **고급 표현:** 제목에 **비유(Metaphor), 언어유희(Pun), 의문문** 등을 활용하여 수준 높은 문제를 만드세요.

**✅ 단계별 작업:**
1단계: 본문의 주제를 한 문장으로 정의하고, 이를 가장 매력적인 제목으로 다듬습니다. (정답)
2단계: 위 '오답 함정 패턴'을 적용하여 오답 4개를 작성합니다. 정답과 **형태는 비슷하지만 내용은 명확히 달라야** 합니다.
3단계: 5개 선택지를 배열에 배치합니다. (정답 위치는 랜덤)
4단계: 각 선택지와 본문을 정확히 번역합니다.

아래 JSON 형식으로 응답:
{
  "passage": "원본 영어 본문",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answerIndex": 0,
  "translation": "본문 전체의 한글 해석",
  "answerTranslation": "정답 선택지의 정확한 한글 해석",
  "optionTranslations": ["선택지1 해석", "선택지2 해석", "선택지3 해석", "선택지4 해석", "선택지5 해석"]
}

본문:
${passage}

중요 규칙:
- answerIndex는 0~4 사이의 숫자 (배열 인덱스)
- answerTranslation은 반드시 options[answerIndex]의 정확한 번역
- optionTranslations는 모든 선택지의 해석 배열 (options와 동일한 순서)
- 재시도 ${retryCount}번째입니다. 이번에는 반드시 정답과 오답이 명확히 구분되어야 합니다.`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3 // 재시도 시 더 낮은 temperature 사용
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

    console.log('✅ Work_08 문제 생성 완료 (재시도):', result);
    return result;

  } catch (error) {
    console.error(`❌ Work_08 문제 생성 실패 (재시도 ${retryCount}번째):`, error);
    throw error;
  }
}
