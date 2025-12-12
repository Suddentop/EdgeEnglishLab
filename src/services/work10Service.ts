/**
 * Work_10 (다중 어법 오류 찾기) 문제 생성 로직
 * 원본: src/components/work/Work_10_MultiGrammarError/Work_10_MultiGrammarError.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI } from './common';

/**
 * 다중 어법 오류 문제 타입 정의
 */
export interface MultiGrammarQuiz {
  passage: string; // 원본 본문 (Plain Text)
  numberedPassage: string; // 번호/밑줄 적용된 본문 (HTML)
  options: number[]; // [3,4,5,6,7,8]
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
     - **수 일치 (Complex Subject-Verb Agreement):** 주어와 동사가 수식어구(관계사절, 전치사구 등)로 인해 멀리 떨어진 경우. (e.g., "The detailed analysis of the samples *were*(x) -> was")
     - **능동 vs 수동 (Voice):** 의미상 주어와의 관계를 파악해야 하는 태의 오류. (e.g., "The experiments *conducting*(x) -> conducted")
     - **준동사 (Verbals):** 본동사 자리인지 준동사 자리인지 구별하는 오류. (e.g., "A system *designed* to improve efficiency *generating*(x) -> generates")
     - **관계사 vs 접속사 (Relatives vs Conjunctions):** 완전/불완전 문장 구조에 따른 오류. (e.g., "The place *which*(x) we visited -> where", "The fact *which*(x) he arrived -> that")
     - **형용사 vs 부사 (Adjective vs Adverb):** 보어 자리나 수식 관계에서의 품사 오류. (e.g., "It remains *silently*(x) -> silent")
     - **병렬 구조 (Parallelism):** 등위접속사나 상관접속사로 연결된 요소의 형태 불일치.

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
      messages: [{ role: 'system', content: 'You are an English grammar expert specializing in the Korean CSAT (Suneung). You create challenging syntax errors.' }, { role: 'user', content: prompt }],
      max_tokens: 3000,
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
    // 위치 정보를 찾아서 저장
    const wordsInfo: {
        original: string;
        transformed: string;
        isWrong: boolean;
        start: number;
        end: number;
    }[] = [];

    // 중복 단어 처리를 위해 검색 시작 위치를 추적
    // 단, AI가 순서대로 줬다는 보장이 없으므로, 일단 모든 occurrences를 찾고 가장 적절한 조합을 찾아야 하는데,
    // 간단하게 "AI가 본문 순서대로 주었을 것이다"라고 가정하거나,
    // 아니면 "최대한 앞에서부터 찾되 겹치지 않게" 할당.
    
    // 여기서는 "각 단어를 본문에서 찾되, 이전 단어 이후부터 찾음"으로 하기엔 순서가 섞여있을 수 있음.
    // 하지만 "서로 다른 위치"라고 했으므로, 전체 스캔 후 정렬이 안전함.
    
    // 1. 각 단어의 모든 등장 위치를 찾음
    const occurrences: { word: string, index: number }[] = [];
    result.originalWords.forEach((word: string) => {
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
        let match;
        while ((match = regex.exec(passage)) !== null) {
            occurrences.push({ word: word, index: match.index });
        }
    });

    // 2. originalWords와 occurrences를 매칭 (Greedy or simple matching)
    // AI가 준 순서와 무관하게, 본문 내 위치를 할당해야 함.
    // 하지만 transformedWords와 wrongIndexes는 originalWords의 인덱스를 따름.
    // 따라서 "originalWords[i]"가 본문의 "어느 위치"에 해당하는지 결정해야 함.
    
    // 문제: "is"가 2번 등장하는데 originalWords에 "is"가 1번 있으면, 어느 "is"인가?
    // AI가 똑똑하다면 문맥상 중요한 걸 골랐겠지만, 우리는 모름.
    // 보통 첫 번째 등장을 매핑하는 것이 안전하지만, 만약 originalWords에 "is", "is"가 있다면 각각 다른 위치여야 함.
    
    // 매핑 전략: 
    // originalWords를 순회하며 본문에서 가장 먼저 나오는(사용되지 않은) 위치를 할당.
    
    const usedIndices = new Set<number>();
    const mappedWords: any[] = [];

    for (let i = 0; i < result.originalWords.length; i++) {
        const word = result.originalWords[i];
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
        
        let match;
        let found = false;
        
        while ((match = regex.exec(passage)) !== null) {
            if (!usedIndices.has(match.index)) {
                mappedWords.push({
                    original: word,
                    transformed: result.transformedWords[i],
                    isWrong: result.wrongIndexes.includes(i),
                    start: match.index,
                    end: match.index + match[0].length,
                    originalIndex: i // 원래 배열에서의 인덱스 (wrongIndexes 참조용)
                });
                usedIndices.add(match.index);
                found = true;
                break; // 첫 번째 미사용 위치 할당
            }
        }
        
        if (!found) {
             console.warn(`Word not found or all occurrences used: ${word}`);
             // 에러를 던지기보다, 해당 단어는 건너뛰거나(문제 개수 줄어듬) 처리해야 함.
             // 여기서는 Strict하게 에러 처리하되, 사용자 경험을 위해 fallback 가능성 고려.
             throw new Error(`선정된 단어 '${word}'가 본문에 존재하지 않거나 중복 할당되었습니다.`);
        }
    }

    // 3. 본문 위치(start) 기준으로 정렬
    mappedWords.sort((a, b) => a.start - b.start);

    // 4. 정렬된 순서대로 데이터 재구성
    const sortedOriginalWords = mappedWords.map(w => w.original);
    const sortedTransformedWords = mappedWords.map(w => w.transformed);
    // wrongIndexes는 재계산 필요: 정렬된 배열에서 isWrong이 true인 인덱스들
    const sortedWrongIndexes: number[] = [];
    mappedWords.forEach((w, newIndex) => {
        if (w.isWrong) {
            sortedWrongIndexes.push(newIndex);
        }
    });

    // 옵션, 정답 계산
    const wrongCount = sortedWrongIndexes.length;
    const options = [3, 4, 5, 6, 7, 8];
    const answerIndex = options.indexOf(wrongCount);

    if (answerIndex === -1) {
      throw new Error(`틀린 단어 개수(${wrongCount})가 유효 범위(3~8)를 벗어났습니다.`);
    }

    // 본문에 원번호/진하게 적용 (정렬된 단어 리스트와 위치 정보 사용)
    // 위치 정보(start, end)를 알고 있으므로 string slicing으로 정확하게 치환 가능.
    // 뒤에서부터 치환해야 인덱스가 안 꼬임.
    
    let numberedPassage = passage;
    const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
    
    // mappedWords는 start 오름차순 정렬되어 있음. 뒤에서부터 순회.
    for (let i = mappedWords.length - 1; i >= 0; i--) {
        const item = mappedWords[i];
        const circleNumber = circleNumbers[i]; // 정렬된 순서에 따른 번호
        const displayWord = item.transformed; // 변형된(또는 원본) 단어
        
        // HTML 적용: <strong>① word</strong>
        // Work_10 스타일은 <u> 태그 사용? 원본 코드는 <u> 사용했음. 
        // prompt says "원번호/밑줄".
        // Let's check original component usage.
        // Component uses: applyNumberAndUnderline returns `...${circle}...<u>${displayWord}</u>...` (Wait, regex replacement)
        // Code at line 342: `${'①... '[i]}<u>${displayWord}</u>`
        // So it's "①<u>Word</u>" or similar.
        // Let's use <strong> for number and <u> for word to be safe and clear.
        // Or follow the component style: Circle + Underline.
        const replacement = `<span class="word-idx">${circleNumber}</span><u>${displayWord}</u>`;
        
        numberedPassage = 
            numberedPassage.substring(0, item.start) + 
            replacement + 
            numberedPassage.substring(item.end);
    }
    
    // 줄바꿈 처리
    numberedPassage = numberedPassage.replace(/\n/g, '<br/>');

    const finalResult: MultiGrammarQuiz = {
      passage: passage, // 원본 본문
      numberedPassage: numberedPassage, // HTML 적용된 본문
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
 * (Legacy) 본문 내 8개 단어에 원번호/진하게를 적용하는 함수
 * 이제 generateWork10Quiz 내부에서 처리하므로 외부에서는 사용하지 않을 수 있음.
 * 하지만 호환성을 위해 남겨두거나 삭제. 여기서는 export 유지.
 */
export function applyNumberAndUnderline(
  passage: string,
  originalWords: string[],
  transformedWords: string[],
  wrongIndexes: number[]
): string {
    // This function is now deprecated in favor of the robust processing inside generateWork10Quiz
    return passage; 
}
