/**
 * Work_10 (다중 어법 오류 찾기) 문제 생성 로직
 * 원본: src/components/work/Work_10_MultiGrammarError/Work_10_MultiGrammarError.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI, translateToKorean, addVarietyToPrompt, getProblemGenerationTemperature } from './common';

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
 * @param previouslySelectedWords - 이전에 선택된 단어 목록 (동일 본문으로 여러 번 생성 시 사용)
 * @returns 다중 어법 오류 문제 데이터
 */
export async function generateWork10Quiz(
  passage: string,
  previouslySelectedWords?: string[]
): Promise<MultiGrammarQuiz> {
  console.log('🔍 Work_10 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
    // Step 1: 본문에서 어법 변형 가능한 단어 후보를 먼저 추출
    const candidatePrompt = `**수능 고난도 다중 어법 오류 문제용 단어 후보 추출**

본문에서 어법 변형 가능한 단어들을 추출하세요. **형태보다 해석과 판단이 필요한 문법**만 대상으로 합니다.

**제외:** 조동사+동사원형, 규칙과거형(-ed), 3인칭-s/-es(동사원형+-s/-es), 단순 단복수, 기본 관사(a/an/the), 단순 전치사, 초급 시제, be동사 단순형(it was/were, they was/were 등), 주어-동사 시제일치(1인칭/2인칭+동사원형, 3인칭+동사원형+s/-es), 고유명사, **to 부정사 단순 변형**(to+동사원형 → to+동사ing)

**우선:** 관계사, 분사구문, 가정법, 병렬구조, 수일치(고난도), 대명사, 접속사vs전치사, 의미상 주어/논리 오류, **to 부정사 복잡 구조**(to+be+동사ing, to+have been+p.p 등)

**추출 기준:**
- 본문에 실제로 존재하는 단어만 (형태 그대로)
- 한 단어(Single Word) 단위만 (구/절 금지)
- 문법적으로 변형 가능한 단어 우선 (준동사, 동사, 형용사/부사, 전치사, 관계사/접속사)

본문:
${passage}
${previouslySelectedWords && previouslySelectedWords.length > 0 ? `

**⚠️ 매우 중요 - 이전 선택 단어 제외:**
* 아래 단어들은 이전에 이미 선택된 단어입니다. 이 단어들은 **절대 선택하지 마세요**:
* ${previouslySelectedWords.map(word => `"${word}"`).join(', ')}
* 위 단어들과는 **완전히 다른 단어**를 선택해야 합니다.
* 본문에서 위 단어들을 제외한 다른 적절한 단어를 선택하세요.` : ''}

응답 형식 (JSON 배열, 최소 15개 이상 추출):
["word1", "word2", "word3", ...]`;

    const candidateResponse = await callOpenAI({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that extracts grammatical words from text. Return only valid JSON arrays.' },
        { role: 'user', content: candidatePrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    if (!candidateResponse.ok) {
      throw new Error(`OpenAI API 오류: ${candidateResponse.status}`);
    }

    const candidateData = await candidateResponse.json();
    let candidateContent = candidateData.choices[0].message.content.trim();
    
    // 마크다운 코드 블록 제거
    if (candidateContent.includes('```json') || candidateContent.includes('```Json') || candidateContent.includes('```')) {
      candidateContent = candidateContent.replace(/```(?:json|Json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
    }

    let candidateWords: string[] = [];
    try {
      candidateWords = JSON.parse(candidateContent);
      if (!Array.isArray(candidateWords) || candidateWords.length < 10) {
        throw new Error('후보 단어가 부족합니다.');
      }
    } catch (parseError) {
      console.error('후보 단어 파싱 실패:', candidateContent);
      throw new Error('후보 단어 추출에 실패했습니다.');
    }

    // Step 2: 추출된 후보 단어 중에서 본문에 실제로 존재하는 것만 필터링
    const validCandidateWords: string[] = [];
    for (const word of candidateWords) {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
      if (regex.test(passage)) {
        validCandidateWords.push(word);
      }
    }

    if (validCandidateWords.length < 8) {
      throw new Error(`본문에서 어법 변형 가능한 단어가 부족합니다. (${validCandidateWords.length}개 발견, 최소 8개 필요)`);
    }

    console.log(`✅ 본문에서 추출된 유효한 후보 단어: ${validCandidateWords.length}개`);

    // Step 3: 유효한 후보 단어 중에서 최종 8개 선택 및 어법 변형
    // 본문을 문장 단위로 분할 (마침표, 느낌표, 물음표 기준)
    const sentences = passage.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
    const sentenceList = sentences.map((sentence, index) => 
      `문장 ${index + 1}: "${sentence}"`
    ).join('\n\n');

    const prompt = `**수능 고난도 다중 어법 오류 문제 생성**

아래 목록에서 **수능 최고난도 수준**의 다중 어법 오류 찾기 문제를 위한 단어 8개를 선정하고, 3~8개를 변형하세요.

**⚠️ 필수 규칙 (엄격히 준수):**
- 목록에 있는 단어만 선택 (목록 외 단어 절대 금지)
- 한 단어(Single Word) 단위만 (구/절 금지, 예: "can prey"(X) -> "prey"(O))
- 중복 불가 (서로 다른 위치의 8개 단어)
- wrongIndexes는 3~8개 (절대 2개 이하, 9개 이상 금지)
- 모든 wrongIndexes 값은 0~7 범위
- **🚨 CRITICAL: 각 문장에서 최대 1개만 선택** (한 문장에서 여러 단어 선택 시 자동 실패)
- **8개 문제는 모두 다른 어법 유형**으로 변형해야 함 (동일 어법 반복 금지)
- **주어-동사 시제일치 문제 절대 금지** (1인칭/2인칭+동사원형, 3인칭+동사원형+s/-es 등)
- **단순 시제 변형 절대 금지** (was/were, 동사원형+-s/-es 등)
- **to 부정사 단순 변형 절대 금지**: "to continue" → "to continuing" 같은 단순 변형은 금지. 반드시 "to be continuing" 또는 "to have been continuing" 같은 복잡한 구조만 사용

**📋 본문 (문장 단위):**
${sentenceList}

**선택 방법:**
1. 문장 1에서 최대 1개 단어 선택 (또는 0개)
2. 문장 2에서 최대 1개 단어 선택 (또는 0개)
3. ... 각 문장을 순회하며 총 8개 단어 선택
4. **중요:** 각 문장에서 2개 이상 선택 절대 금지 (이 규칙 위반 시 자동 실패)

**단어 선정 기준 (8개):**
1. **문장 구조를 결정하는 핵심어** 위주: 준동사, 동사, 형용사/부사, 전치사, 관계사/접속사
2. **🚨 필수 어법 유형 다양성 (8개 선택 시 반드시 서로 다른 어법 유형):**
   아래 어법 유형들을 최대한 다양하게 포함해야 함 (동일 어법 반복 절대 금지):
   - 관계대명사와 관계부사 (where, when, how 등)
   - 형용사 vs 부사
   - 5형식에서 목적격 보어
   - 능동/수동 문제
   - 과거분사/현재분사
   - 대동사 (Do, Be)
   - 도치
   - 수의 일치 (주어+동사)
   **8개 문제는 모두 서로 다른 어법 유형이어야 하며, 가능한 한 위 목록의 어법 유형들을 다양하게 포함해야 함**
3. **의미 해석 영향:** 틀리면 문장 의미 해석에 실제 영향이 있어야 함
4. 단순 명사, 기본 관사, 단순 전치사 제외

**어법 변형 기준 (3~8개):**
- 단순 철자 오류가 아닌 **고난도 문법 오류**
- **🚨 변형된 오류들은 모두 서로 다른 어법 유형**이어야 함 (동일 어법 반복 절대 금지)
- 아래 어법 유형들을 최대한 다양하게 포함:
  * 관계대명사와 관계부사 (where, when, how 등)
  * 형용사 vs 부사
  * 5형식에서 목적격 보어
  * 능동/수동 문제
  * 과거분사/현재분사
  * 대동사 (Do, Be)
  * 도치
  * 수의 일치 (주어+동사)
- 변형된 오류가 의미 해석에 실제 영향이 있어야 함
- **to 부정사 변형 시:** "to continue" → "to continuing" 같은 단순 변형은 절대 금지. 반드시 "to be continuing" 또는 "to have been continuing" 같은 복잡한 구조만 사용
- 나머지 단어는 원본 그대로 유지

**유효한 후보 단어 목록:**
${JSON.stringify(validCandidateWords, null, 2)}

**최종 검증:** 각 단어에 대해 "이 문법 오류가 고등학교 교실에서 설명할 가치가 있는가?" 질문하고, "아니오"면 선택/변형하지 마세요.

아래 JSON 형식으로만 응답하세요:
{
  "originalWords": ["word1", "word2", "word3", "word4", "word5", "word6", "word7", "word8"],
  "transformedWords": ["word1", "wrong_word", "word3", "word4", "word5", "wrong_word", "wrong_word", "word8"],
  "wrongIndexes": [1, 5, 6]
}`;

    // 다양성 추가
    const enhancedPrompt = addVarietyToPrompt(prompt);
    const temperature = getProblemGenerationTemperature(0.7);

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: 'You are an English grammar expert specializing in the Korean CSAT (Suneung). You create challenging syntax errors.' }, { role: 'user', content: enhancedPrompt }],
      max_tokens: 3000,
      temperature: temperature
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
    if (!result.originalWords || !result.transformedWords || !Array.isArray(result.wrongIndexes)) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }

    // 배열 길이 검증
    if (result.originalWords.length !== 8 || result.transformedWords.length !== 8) {
      throw new Error('originalWords와 transformedWords는 정확히 8개여야 합니다.');
    }

    // 선택된 단어가 유효한 후보 목록에 있는지 검증
    const invalidWords: string[] = [];
    for (const word of result.originalWords) {
      const wordLower = word.trim().toLowerCase();
      const isValid = validCandidateWords.some(candidate => candidate.trim().toLowerCase() === wordLower);
      if (!isValid) {
        invalidWords.push(word);
      }
    }
    
    if (invalidWords.length > 0) {
      console.error(`❌ 유효하지 않은 단어 선택됨: ${invalidWords.join(', ')}`);
      throw new Error(`유효한 후보 목록에 없는 단어가 선택되었습니다: ${invalidWords.join(', ')}`);
    }

    // wrongIndexes 검증 (더 엄격하게)
    if (!Array.isArray(result.wrongIndexes)) {
      throw new Error('wrongIndexes는 배열이어야 합니다.');
    }
    
    if (result.wrongIndexes.length < 3 || result.wrongIndexes.length > 8) {
      console.error(`❌ wrongIndexes 개수 오류: ${result.wrongIndexes.length}개 (필요: 3~8개)`);
      throw new Error(`wrongIndexes는 3~8개의 인덱스를 포함해야 합니다. (현재: ${result.wrongIndexes.length}개)`);
    }

    // 인덱스 범위 검증
    for (const index of result.wrongIndexes) {
      if (typeof index !== 'number' || index < 0 || index > 7) {
        throw new Error(`wrongIndexes의 모든 인덱스는 0~7 범위의 숫자여야 합니다. (잘못된 값: ${index})`);
      }
    }
    
    // 중복 인덱스 검증
    const uniqueIndexes = new Set(result.wrongIndexes);
    if (uniqueIndexes.size !== result.wrongIndexes.length) {
      throw new Error('wrongIndexes에 중복된 인덱스가 있습니다.');
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
             console.warn(`⚠️ Word not found or all occurrences used: ${word}`);
             if (retryCount < maxRetries - 1) {
               console.warn(`재시도 ${retryCount + 1}/${maxRetries}...`);
               retryCount++;
               continue; // while 루프의 다음 반복으로
             }
             throw new Error(`선정된 단어 '${word}'가 본문에 존재하지 않거나 중복 할당되었습니다.`);
        }
    }

    // 3. 본문 위치(start) 기준으로 정렬
    mappedWords.sort((a, b) => a.start - b.start);

    // 3.5. 같은 문장에 여러 단어가 선택되었는지 검증
    const passageSentences = passage.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
    // 각 문장의 시작 위치 계산 (원본 passage 기준)
    const sentenceBounds: Array<{ start: number, end: number, text: string }> = [];
    let currentPos = 0;
    for (const sentence of passageSentences) {
      const start = passage.indexOf(sentence, currentPos);
      if (start >= 0) {
        const end = start + sentence.length;
        sentenceBounds.push({ start, end, text: sentence });
        currentPos = end;
      } else {
        // 찾지 못한 경우 (거의 발생하지 않음)
        sentenceBounds.push({ start: currentPos, end: currentPos + sentence.length, text: sentence });
        currentPos += sentence.length;
      }
    }
    
    const sentenceWordCount: { [sentenceIndex: number]: Array<{ word: string, start: number }> } = {};
    
    // 각 단어가 어느 문장에 속하는지 확인
    for (const mappedWord of mappedWords) {
      let sentenceIndex = -1;
      for (let i = 0; i < sentenceBounds.length; i++) {
        const bound = sentenceBounds[i];
        if (mappedWord.start >= bound.start && mappedWord.start < bound.end) {
          sentenceIndex = i;
          break;
        }
      }
      
      if (sentenceIndex >= 0) {
        if (!sentenceWordCount[sentenceIndex]) {
          sentenceWordCount[sentenceIndex] = [];
        }
        sentenceWordCount[sentenceIndex].push({ word: mappedWord.original, start: mappedWord.start });
      }
    }
    
    // 같은 문장에 2개 이상 있는 경우 찾기
    const violations: string[] = [];
    for (const [sentenceIdx, wordList] of Object.entries(sentenceWordCount)) {
      if (wordList.length > 1) {
        const idx = parseInt(sentenceIdx);
        const sentenceText = sentenceBounds[idx].text.substring(0, 80);
        violations.push(`문장 ${idx + 1} ("${sentenceText}..."): ${wordList.map(w => w.word).join(', ')}`);
      }
    }
    
    if (violations.length > 0) {
      console.error(`❌ 같은 문장에서 여러 단어가 선택됨:\n${violations.join('\n')}`);
      if (retryCount < maxRetries - 1) {
        console.warn(`재시도 ${retryCount + 1}/${maxRetries}...`);
        retryCount++;
        continue; // while 루프의 다음 반복으로
      }
      throw new Error(`한 문장에서 여러 단어가 선택되었습니다:\n${violations.join('\n')}`);
    }

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

    // 번역 생성 (입력된 영어 본문을 직접 번역)
    console.log('🌐 본문 번역 시작...');
    const translation = await translateToKorean(passage);
    console.log('✅ 번역 완료');

    const finalResult: MultiGrammarQuiz = {
      passage: passage, // 원본 본문
      numberedPassage: numberedPassage, // HTML 적용된 본문
      options,
      answerIndex,
      translation: translation, // translateToKorean으로 생성한 번역
      originalWords: sortedOriginalWords, // 정렬된 순서 반환
      transformedWords: sortedTransformedWords, // 정렬된 순서 반환
      wrongIndexes: sortedWrongIndexes // 재계산된 인덱스 반환
    };

      console.log('✅ Work_10 문제 생성 완료:', finalResult);
      return finalResult;

    } catch (error) {
      // wrongIndexes 검증 실패 또는 단어 선택 실패 시 재시도
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (
        (errorMessage.includes('wrongIndexes') || 
         errorMessage.includes('유효한 후보 목록에 없는 단어') ||
         errorMessage.includes('본문에 존재하지 않거나 중복 할당'))
        && retryCount < maxRetries - 1
      ) {
        console.warn(`⚠️ Work_10 문제 생성 실패 (재시도 ${retryCount + 1}/${maxRetries}):`, errorMessage);
        retryCount++;
        continue; // while 루프의 다음 반복으로
      }
      
      // 최종 실패 또는 재시도 불가능한 에러
      console.error('❌ Work_10 문제 생성 실패:', error);
      throw error;
    }
  }
  
  // 모든 재시도 실패
  throw new Error(`Work_10 문제 생성이 ${maxRetries}회 재시도 후에도 실패했습니다.`);
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
