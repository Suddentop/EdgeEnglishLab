/**
 * Work_06 (문장 위치 찾기) 문제 생성 로직
 * 원본: src/components/work/Work_06_SentencePosition/Work_06_SentencePosition.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI, translateToKorean } from './common';

/**
 * 문장 위치 찾기 문제 타입 정의
 */
export interface SentencePositionQuiz {
  id?: string; // 다중 입력 처리를 위한 ID
  missingSentence: string;
  numberedPassage: string;
  answerIndex: number; // 0~4 (①~⑤)
  translation: string;
}

/**
 * 유형#06: 문장 위치 찾기 문제 생성
 * @param passage - 영어 본문
 * @returns 문장 위치 찾기 문제 데이터
 */
export async function generateWork06Quiz(passage: string): Promise<SentencePositionQuiz> {
  console.log('🔍 Work_06 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);

  try {
    const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 교육과정 수학능력평가(수능) 수준**의 문장 위치 찾기 문제를 만들어주세요. 글의 주제와 가장 밀접한, 의미 있는 문장 1개를 선정하되, **수능 수준의 문맥 이해가 필요한 핵심 문장**을 선택하세요.

**절대 지켜야 할 규칙 (위반 시 오류):**
1. 본문을 문장 단위로 분할할 때, 정확히 5개의 위치에만 원문자를 삽입
2. 원문자는 반드시 ①, ②, ③, ④, ⑤ 순서대로 사용 (중복 없음, ⑥ 이상 사용 금지)
3. 빠진 문장이 들어갈 위치는 1~5 중 하나로 지정 (answerIndex는 0~4)
4. **절대 금지**: 본문에 "정답위치", "정답", "(정답: X)", "[정답 위치: X]", "[정답 위치]", "정답 위치", "위치", "정답은", "정답이", "정답을" 같은 텍스트를 절대 포함하지 말 것
5. 각 원문자는 문장 앞에 삽입
6. 원문자 뒤에는 반드시 공백이 있어야 함
7. ⑥, ⑦, ⑧, ⑨, ⑩ 등은 절대 사용하지 말 것
8. 본문에는 영어 문장만 포함하고, 정답 관련 한글 텍스트는 절대 포함하지 말 것
9. 원본 본문에 없던 텍스트는 절대 추가하지 말 것
10. **중요**: numberedPassage 필드에는 오직 영어 문장과 원문자(①~⑤)만 포함하고, 그 외의 모든 텍스트는 제외
11. **절대 금지**: [1], [2], [3], (1), (2), (3), {1}, {2}, {3} 등 모든 숫자 마커 사용 금지
12. **절대 금지**: 원문자 중복 사용 금지 (①, ②, ③, ④, ⑤ 각각 한 번씩만 사용)

**작업 순서:**
1. 본문에서 가장 중요한 주제 문장 1개를 선정하여 제거 (이것이 missingSentence)
2. 남은 본문을 문장 단위로 분할 (마침표, 느낌표, 물음표 기준)
3. 처음 5개 문장 앞에 ①~⑤를 순서대로 삽입 (중복 없이) (이것이 numberedPassage)
4. 빠진 문장이 들어갈 위치를 1~5 중 하나로 결정 (answerIndex: 0~4)
5. **중요**: translation 필드에는 원본 본문(주요문장이 빠지기 전 원본 본문)의 한국어 해석을 제공해야 합니다.

**translation 필드 규칙 (절대 필수, 위반 시 오류):**
- ⚠️ translation은 반드시 원본 본문(주요문장을 원래의 위치에 포함한 전체 영어 본문)의 한국어 해석이어야 합니다.
- ⚠️ 절대로 원문자(①, ②, ③, ④, ⑤)를 포함하면 안 됩니다.
- ⚠️ 절대로 numberedPassage의 번역이 아닙니다. 원본 본문(passage)의 번역입니다.
- ⚠️ missingSentence가 원래 위치에 포함된 상태의 전체 본문을 한국어로 번역한 것입니다.
- ⚠️ 각 본문마다 원본이 다르므로, translation도 각 본문의 원본에 맞는 고유한 해석이어야 합니다.

**정확한 예시:**
원본 본문이 다음과 같다면:
"The main topic sentence that was removed. First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Additional sentences."

{
  "missingSentence": "The main topic sentence that was removed.",
  "numberedPassage": "① First sentence. ② Second sentence. ③ Third sentence. ④ Fourth sentence. ⑤ Fifth sentence. Additional sentences.",
  "answerIndex": 2,
  "translation": "제거된 주제 문장이 여기에 있습니다. 첫 번째 문장. 두 번째 문장. 세 번째 문장. 네 번째 문장. 다섯 번째 문장. 추가 문장들."
}

**절대 금지사항 (위반 시 오류):**
- 본문에 "[정답 위치: X]" 텍스트 포함 금지
- 본문에 "[정답 위치]" 텍스트 포함 금지
- 본문에 "정답 위치(X)" 텍스트 포함 금지
- 본문에 "정답 위치 X" 텍스트 포함 금지
- 본문에 "정답(X)" 텍스트 포함 금지
- 본문에 "정답 X" 텍스트 포함 금지
- 본문에 "위치(X)" 텍스트 포함 금지
- 본문에 "위치 X" 텍스트 포함 금지
- 본문에 "정답" 또는 "위치" 관련 텍스트 포함 금지
- 본문에 "[1]", "[2]", "[3]" 등 숫자만 있는 대괄호 포함 금지
- 본문에 "(1)", "(2)", "(3)" 등 숫자만 있는 괄호 포함 금지
- 본문에 "{1}", "{2}", "{3}" 등 숫자만 있는 중괄호 포함 금지
- ⑥ 이상의 원문자 사용 금지
- 원문자 중복 사용 금지 (①, ②, ③, ④, ⑤ 각각 한 번씩만)
- 본문에 한글 텍스트 포함 금지 (영어만)
- 본문에 특수 기호나 숫자 마커 포함 금지
- 원본 본문에 없던 텍스트 추가 금지

**입력 본문:**
${passage}`;

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
      console.log('파싱된 결과:', result);
    } catch {
      throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
    }

    // 필수 필드 검증
    if (!result.missingSentence || !result.numberedPassage || typeof result.answerIndex !== 'number' || !result.translation) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }

    // answerIndex 범위 검증 (0~4)
    if (result.answerIndex < 0 || result.answerIndex > 4) {
      throw new Error('answerIndex는 0~4 범위여야 합니다.');
    }

    // 원문자 중복 사용 검증
    const numberedPassage = result.numberedPassage;
    const circles = ['①', '②', '③', '④', '⑤'];
    for (const circle of circles) {
      const count = (numberedPassage.match(new RegExp(circle, 'g')) || []).length;
      if (count > 1) {
        throw new Error(`원문자 ${circle}가 중복 사용되었습니다.`);
      }
    }

    // ⑥ 이상의 원문자 사용 금지 검증
    const invalidCircles = ['⑥', '⑦', '⑧', '⑨', '⑩'];
    for (const circle of invalidCircles) {
      if (numberedPassage.includes(circle)) {
        throw new Error(`금지된 원문자 ${circle}가 사용되었습니다.`);
      }
    }

    // 금지된 텍스트 검증
    const forbiddenTexts = ['정답위치', '정답', '(정답:', '[정답 위치:', '[정답 위치]', '정답 위치', '위치', '정답은', '정답이', '정답을'];
    for (const text of forbiddenTexts) {
      if (numberedPassage.includes(text)) {
        throw new Error(`금지된 텍스트 "${text}"가 포함되었습니다.`);
      }
    }

    console.log('✅ Work_06 문제 생성 완료:', result);
    return result;

  } catch (error) {
    console.error('❌ Work_06 문제 생성 실패:', error);
    throw error;
  }
}
