/**
 * Work_07 (주제 추론) 문제 생성 로직
 * 원본: src/components/work/Work_07_MainIdeaInference/Work_07_MainIdeaInference.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI, translateToKorean } from './common';

/**
 * 주제 추론 문제 타입 정의
 */
export interface MainIdeaQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation: string;
  optionTranslations: string[];
}

/**
 * 유형#07: 주제 추론 문제 생성
 * @param passage - 영어 본문
 * @returns 주제 추론 문제 데이터
 */
export async function generateWork07Quiz(passage: string): Promise<MainIdeaQuiz> {
  console.log('🔍 Work_07 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);

  try {
    const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 3학년 및 대학수학능력시험(수능) 수준**의 **고난도 주제 추론 문제**를 만들어주세요.

**🎯 핵심 요구사항:**
1. **정답의 명확성:** 5개의 선택지 중 정답은 **오직 하나**여야 하며, 본문의 핵심 내용을 가장 포괄적이고 정확하게 담고 있어야 합니다. 논란의 여지가 없도록 명확해야 합니다.
2. **매력적인 오답 (Distractors):** 오답 선택지들은 정답과 **비슷해 보이지만 명확히 틀린** 논리적 함정을 포함해야 합니다.
   - **너무 지엽적인 내용:** 본문에 언급되었지만 전체 주제가 아닌 세부 사항.
   - **너무 포괄적인 내용:** 본문의 범위를 벗어나는 지나친 일반화.
   - **인과관계 왜곡:** 원인과 결과를 반대로 서술하거나 잘못 연결.
   - **본문과 반대되는 내용:** 본문의 주장과 정면으로 배치되는 내용.
   - **언급되지 않은 내용:** 본문의 핵심 키워드를 사용했지만 본문에는 없는 내용.
3. **난이도 상향:** 
   - 선택지의 어휘와 문장 구조를 **고급 수준**으로 작성하세요.
   - 단순한 요약이 아닌, **추상적이고 비유적인 표현**을 사용하여 본문의 심층적인 이해를 요구하세요.
   - 정답이 쉽게 눈에 띄지 않도록 모든 선택지의 길이와 형식을 비슷하게 맞추세요.

**⚠️ 절대 피해야 할 것:**
- ❌ 정답과 의미가 거의 동일한 오답을 만들지 마세요. (중복 정답 시비 방지)
- ❌ 단순히 본문의 문장을 그대로 복사하여 선택지를 만들지 마세요. (Paraphrasing 필수)
- ❌ 너무 쉬운 유치한 오답(전혀 관련 없는 내용)을 포함하지 마세요.

**✅ 단계별 작업:**
1단계: 본문 전체를 정독하고 핵심 주제, 요지, 저자의 의도를 파악합니다.
2단계: **고3 수능 수준**의 고급 어휘와 구문을 사용하여 정답 선택지 1개를 작성합니다. (추상적, 함축적 표현 권장)
3단계: 위에서 언급한 '매력적인 오답' 유형을 활용하여 오답 4개를 작성합니다. 정답과 **의미적 거리는 멀되, 형태적 유사성은 가깝게** 만드세요.
4단계: 5개 선택지를 배열에 배치합니다. (정답 위치는 랜덤)
5단계: 본문 전체를 자연스러운 한국어로 번역합니다.
6단계: 각 선택지를 정확한 한국어로 번역합니다. (직역보다는 의미 전달 위주)

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
      temperature: 0.3 // 더 낮은 temperature로 일관성 향상
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
    if (!result.passage || !result.options || typeof result.answerIndex !== 'number' || 
        !result.translation || !result.answerTranslation || !result.optionTranslations) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }

    // answerIndex 범위 검증
    if (result.answerIndex < 0 || result.answerIndex > 4) {
      throw new Error('answerIndex는 0~4 범위여야 합니다.');
    }

    // options 배열 길이 검증
    if (result.options.length !== 5) {
      throw new Error('options는 정확히 5개의 선택지여야 합니다.');
    }

    // optionTranslations 배열 길이 검증
    if (result.optionTranslations.length !== 5) {
      throw new Error('optionTranslations는 정확히 5개의 해석이 있어야 합니다.');
    }

    // 정답과 해석 일치성 검증
    const answerOption = result.options[result.answerIndex];
    const answerTranslation = result.answerTranslation;
    const optionTranslation = result.optionTranslations[result.answerIndex];

    if (answerTranslation !== optionTranslation) {
      console.warn('정답 해석과 선택지 해석이 일치하지 않습니다. 재시도를 권장합니다.');
    }

    console.log('✅ Work_07 문제 생성 완료:', result);
    return result;

  } catch (error) {
    console.error('❌ Work_07 문제 생성 실패:', error);
    throw error;
  }
}

/**
 * 유형#07: 주제 추론 문제 생성 (재시도 버전)
 * @param passage - 영어 본문
 * @param retryCount - 재시도 횟수
 * @returns 주제 추론 문제 데이터
 */
export async function generateWork07QuizWithRetry(passage: string, retryCount: number = 1): Promise<MainIdeaQuiz> {
  console.log(`🔍 Work_07 문제 생성 시작 (재시도 ${retryCount}번째)...`);
  console.log('📝 입력 텍스트 길이:', passage.length);

  try {
    const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 3학년 및 수능(CSAT) 최고난도 수준**의 주제 추론 문제를 다시 만들어주세요.

**🚨 긴급 수정 요청 (이전 시도 실패 원인):**
- 이전 결과에서 정답과 오답의 구분이 모호했습니다.
- 오답이 너무 매력적이어서 정답과 논리적으로 겹치는 부분이 있었습니다.

**🎯 재시도 핵심 목표:**
1. **정답의 유일성 확보:** 정답은 본문의 모든 문장을 아우르는 **가장 포괄적인 제목/주제**여야 합니다. 반면 오답은 명백하게 **"틀린"** 부분이 있어야 합니다.
2. **오답의 함정 패턴 명확화:**
   - **Too Narrow:** 본문의 일부 예시만 언급한 것.
   - **Too Broad:** 본문보다 너무 범위가 넓은 일반론.
   - **Contradictory:** 본문의 사실과 반대되는 내용.
   - **Irrelevant:** 본문의 키워드만 사용했지 내용은 무관한 것.
3. **고급 영어 구사:** 선택지의 영어 표현을 **수능 1등급 수준**의 어휘와 복잡한 구문으로 업그레이드하세요.

**✅ 단계별 작업:**
1단계: 본문의 주제를 한 문장으로 정의합니다.
2단계: 주제를 바탕으로 **고난도 어휘**를 사용하여 정답 선택지를 만듭니다.
3단계: 위 '오답 함정 패턴' 4가지를 각각 하나씩 적용하여 오답 4개를 만듭니다.
4단계: 5개 선택지를 배열에 배치합니다. (정답 위치는 랜덤)
5단계: 각 선택지와 본문을 정확히 번역합니다.

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
      temperature: 0.1 // 재시도 시 매우 낮은 temperature로 일관성 극대화
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
    if (!result.passage || !result.options || typeof result.answerIndex !== 'number' || 
        !result.translation || !result.answerTranslation || !result.optionTranslations) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }

    // answerIndex 범위 검증
    if (result.answerIndex < 0 || result.answerIndex > 4) {
      throw new Error('answerIndex는 0~4 범위여야 합니다.');
    }

    // options 배열 길이 검증
    if (result.options.length !== 5) {
      throw new Error('options는 정확히 5개의 선택지여야 합니다.');
    }

    // optionTranslations 배열 길이 검증
    if (result.optionTranslations.length !== 5) {
      throw new Error('optionTranslations는 정확히 5개의 해석이 있어야 합니다.');
    }

    // 정답과 해석 일치성 검증
    const answerOption = result.options[result.answerIndex];
    const answerTranslation = result.answerTranslation;
    const optionTranslation = result.optionTranslations[result.answerIndex];

    if (answerTranslation !== optionTranslation) {
      console.warn('정답 해석과 선택지 해석이 일치하지 않습니다.');
    }

    console.log('✅ Work_07 문제 생성 완료 (재시도):', result);
    return result;

  } catch (error) {
    console.error(`❌ Work_07 문제 생성 실패 (재시도 ${retryCount}번째):`, error);
    throw error;
  }
}
