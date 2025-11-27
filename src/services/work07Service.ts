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
    const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 교육과정 수학능력평가(수능) 수준**의 주제 추론 문제를 만들어주세요.

**🎯 수능 주제 추론 문제의 특징:**
- 실제 수능에서는 본문 전체의 논리적 흐름, 저자의 주장, 글의 핵심 메시지를 종합적으로 이해해야 정답을 찾을 수 있습니다.
- 단순히 본문의 일부 내용을 요약한 것이 아니라, **본문 전체를 읽고 추론해야 도달할 수 있는 주제**를 선택해야 합니다.
- 수능 수준의 주제는 본문의 표면적 내용이 아닌, **저자의 의도, 글의 목적, 논리적 결론**을 포함합니다.
- 중학교 수준의 단순한 주제 요약이 아닌, 고등학교 수준의 추상적이고 복합적인 주제를 다룹니다.

**⚠️ 절대 피해야 할 주제:**
- ❌ 본문의 첫 문장이나 마지막 문장을 그대로 사용한 주제
- ❌ 본문의 표면적 내용만 나열한 주제 (예: "이 글은 A, B, C에 대해 설명한다")
- ❌ 너무 구체적이고 단순한 주제 (예: "이 글은 사과에 대해 설명한다")
- ❌ 본문 내용과 직접적으로 관련 없는 일반적인 주제

**✅ 수능 수준의 주제 선정 기준:**
1. **본문 전체를 정확히 분석:**
   - 본문의 모든 문단을 읽고 각 문단의 역할을 파악하세요
   - 저자의 주장, 근거, 결론을 명확히 구분하세요
   - 글의 논리적 구조(문제 제시 → 분석 → 해결책 등)를 파악하세요

2. **추상적이고 포괄적인 주제 선택:**
   - 본문의 구체적 내용을 넘어서는 **추상적 개념**을 다루는 주제
   - 예: "The relationship between technology and human interaction" (기술과 인간 상호작용의 관계)
   - 예: "The importance of critical thinking in modern education" (현대 교육에서 비판적 사고의 중요성)
   - 예: "The challenges and opportunities of sustainable development" (지속가능한 발전의 도전과 기회)

3. **저자의 의도와 목적을 반영:**
   - 단순 정보 전달이 아닌, 저자가 독자에게 전달하려는 **핵심 메시지**를 담은 주제
   - 저자의 관점, 태도, 제안을 포함하는 주제

4. **정답 주제 생성:**
   - 본문 전체를 종합적으로 분석한 후, 가장 적절한 주제를 **한 문장 또는 구**로 표현
   - 수능 기출 문제 스타일: 명확하고 간결하며, 본문의 핵심을 정확히 담고 있어야 함

5. **오답 주제 생성 (수능 스타일):**
   - 본문의 일부 내용만 반영한 주제 (부분적 이해)
   - 본문과 관련은 있지만 너무 구체적이거나 좁은 주제
   - 본문과 관련은 있지만 저자의 의도와 다른 주제
   - 본문의 부차적 내용을 중심으로 한 주제
   - 본문의 표면적 내용만 다룬 주제

단계별 작업:
1단계: 본문 전체를 정확히 읽고 논리적 구조 파악 (문제 제시, 분석, 근거, 결론 등)
2단계: 저자의 주장과 핵심 메시지를 종합적으로 분석
3단계: 본문 전체를 종합한 수능 수준의 주제(정답) 1개 생성 (추상적이고 포괄적)
4단계: 본문의 일부만 반영하거나 표면적 내용만 다룬 오답 주제 4개 생성
5단계: 5개 선택지를 배열에 배치 (정답 위치는 랜덤)
6단계: 본문 전체를 한글로 번역
7단계: 정답 선택지만 정확히 한글로 번역
8단계: 모든 선택지(1~5번)를 각각 한글로 번역

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
- 예시: answerIndex=1, options[1]="The future is uncertain but promising." → answerTranslation="미래는 불확실하지만 희망적입니다."
- optionTranslations[1]도 "미래는 불확실하지만 희망적입니다."가 되어야 함
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
    const prompt = `아래 영어 본문을 읽고, 글의 주제를 가장 잘 요약하는 문장/구 1개를 선정해.

단계별 작업:
1단계: 본문을 읽고 주제를 파악
2단계: 주제를 요약하는 정답 문장 1개 생성
3단계: 정답과 유사하지만 다른 의미의 오답 4개 생성
4단계: 5개 선택지를 배열에 배치 (정답 위치는 랜덤)
5단계: 본문 전체를 한글로 번역
6단계: 정답 선택지만 정확히 한글로 번역
7단계: 모든 선택지(1~5번)를 각각 한글로 번역

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
- 예시: answerIndex=1, options[1]="The future is uncertain but promising." → answerTranslation="미래는 불확실하지만 희망적입니다."
- optionTranslations[1]도 "미래는 불확실하지만 희망적입니다."가 되어야 함
- 모든 해석이 정확히 일치해야 함
- 재시도 ${retryCount}번째입니다. 이전에 정답과 해석이 일치하지 않았습니다. 매우 주의하세요.`;

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
