/**
 * Work_10 (다중 어법 오류 찾기) 문제 생성 로직
 * 원본: src/components/work/Work_10_MultiGrammarError/Work_10_MultiGrammarError.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI, translateToKorean } from './common';

/**
 * 다중 어법 오류 문제 타입 정의
 */
export interface MultiGrammarQuiz {
  passage: string;
  options: number[];
  answerIndex: number;
  translation: string;
  originalWords: string[];
  transformedWords: string[];
  wrongIndexes: number[];
}

/**
 * 유형#10: 다중 어법 오류 찾기 문제 생성
 * @param passage - 영어 본문
 * @returns 다중 어법 오류 문제 데이터
 */
export async function generateWork10Quiz(passage: string): Promise<MultiGrammarQuiz> {
  console.log('🔍 Work_10 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);

  try {
    const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 교육과정 수학능력평가(수능) 수준**의 다중 어법 오류 찾기 문제를 만들어주세요. 어법(문법) 변형이 가능한 서로 다른 "단어" 8개를 선정하되, **수능에서 출제될 수 있는 어법 유형**을 선택하세요.
이 중 3~8개(랜덤)만 어법상 틀리게 변형하고, 나머지는 원형을 유지하세요.

아래 JSON 형식으로만 응답하세요:
{
  "originalWords": ["...", ...], // 8개 원본 단어
  "transformedWords": ["...", ...], // 8개 변형(틀린/정상) 단어
  "wrongIndexes": [0,1,2,5,6,7], // 틀린 단어의 인덱스(0~7), 개수는 3~8개
  "translation": "..." // 본문 번역
}

본문:
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
    const content = data.choices[0].message.content.trim();
    
    // 마크다운 코드 블록 제거
    let cleanedContent = content;
    if (content.includes('```json') || content.includes('```Json') || content.includes('```')) {
      cleanedContent = content.replace(/```(?:json|Json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
    }
    
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    
    let result: any;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('파싱 실패한 내용:', jsonMatch[0]);
      throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
    }

    // 필수 필드 검증
    if (!result.originalWords || !result.transformedWords || !Array.isArray(result.wrongIndexes) || !result.translation) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }

    // 배열 길이 검증
    if (result.originalWords.length !== 8 || result.transformedWords.length !== 8) {
      throw new Error('originalWords와 transformedWords는 정확히 8개여야 합니다.');
    }

    // wrongIndexes 검증
    if (result.wrongIndexes.length < 3 || result.wrongIndexes.length > 8) {
      throw new Error('wrongIndexes는 3~8개의 인덱스를 포함해야 합니다.');
    }

    // 인덱스 범위 검증
    for (const index of result.wrongIndexes) {
      if (index < 0 || index > 7) {
        throw new Error('wrongIndexes의 모든 인덱스는 0~7 범위여야 합니다.');
      }
    }

    // 옵션, 정답 계산
    const wrongCount = result.wrongIndexes.length;
    const options = [3, 4, 5, 6, 7, 8];
    const answerIndex = options.indexOf(wrongCount);

    if (answerIndex === -1) {
      throw new Error('틀린 단어 개수가 유효하지 않습니다.');
    }

    // 본문에 원번호/진하게 적용
    const numberedPassage = applyNumberAndUnderline(
      passage,
      result.originalWords,
      result.transformedWords,
      result.wrongIndexes
    );

    const finalResult: MultiGrammarQuiz = {
      passage: numberedPassage, // 원번호/진하게가 적용된 본문
      options,
      answerIndex,
      translation: result.translation,
      originalWords: result.originalWords,
      transformedWords: result.transformedWords,
      wrongIndexes: result.wrongIndexes
    };

    console.log('✅ Work_10 문제 생성 완료:', finalResult);
    return finalResult;

  } catch (error) {
    console.error('❌ Work_10 문제 생성 실패:', error);
    throw error;
  }
}

/**
 * 본문 내 8개 단어에 원번호/진하게를 정확히 한 번씩 적용하는 함수
 * @param passage - 원본 본문
 * @param originalWords - 원본 단어들
 * @param transformedWords - 변형된 단어들
 * @param wrongIndexes - 틀린 단어의 인덱스들
 * @returns 번호가 매겨진 본문 (HTML 형식)
 */
export function applyNumberAndUnderline(
  passage: string,
  originalWords: string[],
  transformedWords: string[],
  wrongIndexes: number[]
): string {
  let result = passage;
  const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
  const used: boolean[] = Array(originalWords.length).fill(false);
  
  // 역순으로 처리하여 인덱스 충돌 방지
  for (let i = originalWords.length - 1; i >= 0; i--) {
    if (used[i]) continue;
    const originalWord = originalWords[i];
    const displayWord = wrongIndexes.includes(i) ? transformedWords[i] : originalWord;
    const circleNumber = circleNumbers[i];
    const numbered = `<strong>${circleNumber} ${displayWord}</strong>`;
    
    // 첫 번째 등장만 치환
    const regex = new RegExp(`\\b${originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const match = regex.exec(result);
    if (match) {
      const before = result.substring(0, match.index);
      const after = result.substring(match.index + match[0].length);
      result = before + numbered + after;
      used[i] = true;
    }
  }
  
  return result;
}
