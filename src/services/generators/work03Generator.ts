/**
 * Work_03 (빈칸 단어 문제) 문제 생성 로직
 * 원본: src/components/work/Work_03_VocabularyWord/Work_03_VocabularyWord.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI } from './common';

/**
 * 빈칸 문제 타입 정의
 */
export interface BlankQuiz {
  blankedText: string;
  options: string[];
  answerIndex: number;
}

/**
 * 유형#03: 빈칸(단어) 문제 생성
 * @param passage - 영어 본문
 * @returns 빈칸 문제 데이터
 */
export async function generateWork03Quiz(passage: string): Promise<BlankQuiz> {
  console.log('🔍 Work_03 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);

  try {
    // passage에서 이미 ()로 묶인 단어 추출 (제외 대상)
    const excludedWords: string[] = [];
    const bracketRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = bracketRegex.exec(passage)) !== null) {
      excludedWords.push(match[1].trim());
    }
    
    const prompt = `아래 영어 본문에서 글의 주제와 가장 밀접한, 의미 있는 단어(명사, 키워드 등) 1개를 선정해.

1. 반드시 본문에 실제로 등장한 단어(철자, 형태, 대소문자까지 동일)를 정답으로 선정해야 해. 변형, 대체, 동의어, 어형 변화 없이 본문에 있던 그대로 사용해야 해.

2. 문제의 본문(빈칸 포함)은 반드시 사용자가 입력한 전체 본문과 완전히 동일해야 하며, 일부 문장만 추출하거나, 문장 순서를 바꾸거나, 본문을 요약/변형해서는 안 돼. 오직 정답 단어만 ()로 치환해.

3. 입력된 본문에 이미 ()로 묶인 단어나 구가 있다면, 그 부분은 절대 빈칸 처리 대상으로 삼지 마세요. 반드시 괄호 밖에 있는 단어만 빈칸 후보로 선정하세요.

4. 아래 단어/구는 절대 빈칸 처리하지 마세요: ${excludedWords.length > 0 ? excludedWords.join(', ') : '없음'}

5. 정답(핵심단어) + 오답(비슷한 품사의 단어 4개, 의미는 다름) 총 5개를 생성해.

6. 정답의 위치는 1~5번 중 랜덤.

7. JSON 형식으로 응답하세요:

{
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answerIndex": 0
}

입력된 영어 본문:
${passage}`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.7
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI 응답 전체:', data);
    console.log('AI 응답 내용:', data.choices[0].message.content);
    
    const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    
    console.log('추출된 JSON:', jsonMatch[0]);
    
    let result: any;
    try {
      result = JSON.parse(jsonMatch[0]);
      console.log('파싱된 결과:', result);
    } catch {
      throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
    }

    // 정답 단어가 본문에 실제로 존재하는지 검증
    if (!passage.includes(result.options[result.answerIndex])) {
      throw new Error('정답 단어가 본문에 존재하지 않습니다. AI 응답 오류입니다.');
    }

    // blankedText를 프론트엔드에서 직접 생성 (괄호 split 방식, 괄호 안/밖 완벽 구분)
    function replaceFirstOutsideBrackets(text: string, word: string): string {
      let replaced = false;
      // 괄호로 split (괄호 안/밖 구분)
      const tokens = text.split(/([()])/);
      let inBracket = false;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') {
          inBracket = true;
          continue;
        }
        if (tokens[i] === ')') {
          inBracket = false;
          continue;
        }
        if (!inBracket && !replaced) {
          // 괄호 밖에서만 단어 치환 (단어 경계 체크)
          const regex = new RegExp(`\\b${word}\\b`);
          if (regex.test(tokens[i])) {
            tokens[i] = tokens[i].replace(regex, '(__________)');
            replaced = true;
          }
        }
      }
      // split으로 괄호가 사라지므로, 다시 조립
      let result = '';
      inBracket = false;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') {
          inBracket = true;
          result += '(';
          continue;
        }
        if (tokens[i] === ')') {
          inBracket = false;
          result += ')';
          continue;
        }
        result += tokens[i];
      }
      return result;
    }

    const answer = result.options[result.answerIndex];
    const blankedText = replaceFirstOutsideBrackets(passage, answer);
    result.blankedText = blankedText;
    
    // 빈칸 본문이 원본 본문과 일치하는지 검증
    const blankRestore = result.blankedText.replace(/\( *_{6,}\)/, answer);
    if (blankRestore.trim() !== passage.trim()) {
      throw new Error('빈칸 본문이 원본 본문과 일치하지 않습니다. AI 응답 오류입니다.');
    }
    
    console.log('최종 검증 전 결과:', {
      blankedText: result.blankedText,
      options: result.options,
      answerIndex: result.answerIndex
    });
    
    if (!result.blankedText || !result.options || typeof result.answerIndex !== 'number') {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    console.log('✅ Work_03 문제 생성 완료:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Work_03 문제 생성 실패:', error);
    throw error;
  }
}

