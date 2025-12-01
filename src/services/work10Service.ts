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
    const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 3학년 및 대학수학능력시험(수능) 최고난도 수준**의 다중 어법 오류 찾기 문제를 만들어주세요.

**🎯 핵심 요구사항 (CSAT Level):**
1. **단어 선정 (8개):**
   - **⚠️ 절대 규칙: 본문에 실제로 존재하는 단어여야 합니다. (철자, 대소문자 정확히 일치)**
   - **⚠️ 절대 규칙: 반드시 "한 단어(Single Word)" 단위로만 선정하세요. (구/절 금지)**
     - (X) "can prey" (두 단어 금지)
     - (O) "prey"
   - 본문의 핵심 구조를 결정하는 중요 단어(동사, 준동사, 접속사, 관계사 등) 위주로 8개를 선정하세요.
   - **중복 금지:** 본문 내에서 서로 다른 위치에 있는 8개의 단어를 선정하되, 가능한 서로 다른 단어를 선택하세요.

2. **어법 변형 (3~8개):**
   - 선정된 8개 단어 중 **3개에서 8개**를 랜덤하게 선택하여 **어법상 틀리게** 변형하세요.
   - **변형 수준:** 단순한 철자 오류가 아닌, **고난도 문법 오류**를 만드세요.
     - **수 일치:** 주어와 동사가 멀리 떨어진 경우의 수 일치 오류.
     - **태(Voice):** 능동태를 수동태로, 수동태를 능동태로 잘못 변형.
     - **준동사:** 동사 자리에 준동사를 쓰거나, 준동사 자리에 동사를 쓰는 오류.
     - **관계사/접속사:** 완전한 문장 뒤에 관계대명사를 쓰거나, 불완전한 문장 뒤에 접속사를 쓰는 오류.
     - **병렬 구조:** 등위접속사로 연결된 요소들의 형태 불일치.

3. **나머지 단어:** 변형되지 않은 나머지 단어들은 반드시 **원본 그대로** 유지하세요.

아래 JSON 형식으로만 응답하세요:
{
  "originalWords": ["...", ...], // 선정된 8개 원본 단어 (본문과 정확히 일치해야 함)
  "transformedWords": ["...", ...], // 8개 단어 (틀린 것은 변형됨, 맞는 것은 원본 그대로)
  "wrongIndexes": [0,1,2,5,6,7], // 틀린 단어의 배열 인덱스 (0~7), 개수는 3~8개 사이
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

    // 본문 존재 여부 검증 (Strict check)
    for (const word of result.originalWords) {
      // 특수문자 이스케이프 처리 후 정규식 생성
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
      if (!regex.test(passage)) {
        throw new Error(`선정된 단어 '${word}'가 본문에 존재하지 않습니다.`);
      }
    }

    // 본문 내 단어 위치 기준으로 정렬
    const wordsInfo = result.originalWords.map((word: string, idx: number) => {
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const match = regex.exec(passage);
      return {
        original: word,
        transformed: result.transformedWords[idx],
        isWrong: result.wrongIndexes.includes(idx),
        position: match ? match.index : 999999 // 찾지 못하면 뒤로 보냄 (오류 방지)
      };
    });

    // position 기준 오름차순 정렬
    wordsInfo.sort((a: any, b: any) => a.position - b.position);

    // 배열 재구성
    const sortedOriginalWords = wordsInfo.map((w: any) => w.original);
    const sortedTransformedWords = wordsInfo.map((w: any) => w.transformed);
    const sortedWrongIndexes = wordsInfo
      .map((w: any, idx: number) => w.isWrong ? idx : -1)
      .filter((idx: number) => idx !== -1);

    // 옵션, 정답 계산
    const wrongCount = sortedWrongIndexes.length;
    const options = [3, 4, 5, 6, 7, 8];
    const answerIndex = options.indexOf(wrongCount);

    if (answerIndex === -1) {
      throw new Error('틀린 단어 개수가 유효하지 않습니다.');
    }

    // 본문에 원번호/진하게 적용 (정렬된 단어 리스트 사용)
    const numberedPassage = applyNumberAndUnderline(
      passage,
      sortedOriginalWords,
      sortedTransformedWords,
      sortedWrongIndexes
    );

    const finalResult: MultiGrammarQuiz = {
      passage: numberedPassage, // 원번호/진하게가 적용된 본문
      options,
      answerIndex,
      translation: result.translation,
      originalWords: sortedOriginalWords, // 정렬된 순서 반환
      transformedWords: sortedTransformedWords, // 정렬된 순서 반환
      wrongIndexes: sortedWrongIndexes // 재계산된 인덱스 반환
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
