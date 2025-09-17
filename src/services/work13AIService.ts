// Work13 (빈칸 채우기 단어) 관련 AI 서비스 함수들

export interface BlankFillItem {
  blankedText: string;
  correctAnswers: string[]; // 각 빈칸의 정답 배열
  translation: string;
  userAnswer: string;
  isCorrect: boolean | null;
  reasoning?: string; // 주제어 선정 이유
}

export interface Work_13_BlankFillWordData {
  title: string;
  items: BlankFillItem[];
}

// 문장 분할 함수 (개선된 버전)
export const splitSentences = (text: string): string[] => {
  // 1. 먼저 문장 끝 구분자로 분할
  let sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // 2. 문장이 너무 적으면 다른 방법으로 분할 시도
  if (sentences.length < 2) {
    // 마침표로만 분할
    sentences = text
      .split(/\.\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  // 3. 여전히 문장이 적으면 세미콜론으로도 분할
  if (sentences.length < 2) {
    const semicolonSplit = text
      .split(/;\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (semicolonSplit.length > sentences.length) {
      sentences = semicolonSplit;
    }
  }
  
  // 4. 각 문장의 끝에 마침표가 없으면 추가
  sentences = sentences.map(sentence => {
    if (!sentence.match(/[.!?]$/)) {
      return sentence + '.';
    }
    return sentence;
  });
  
  console.log('문장 분할 결과:', {
    원본텍스트: text.substring(0, 100) + '...',
    분할된문장수: sentences.length,
    문장들: sentences.map((s, i) => `${i+1}. ${s.substring(0, 50)}...`)
  });
  
  return sentences;
};

// 문장의 단어 수 계산
export const countWordsInSentence = (sentence: string): number => {
  return sentence.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// 유효한 문장 필터링
export const filterValidSentences = (sentences: string[]): { 
  validSentences: string[], 
  skippedSentences: string[] 
} => {
  const validSentences: string[] = [];
  const skippedSentences: string[] = [];
  
  for (const sentence of sentences) {
    const wordCount = countWordsInSentence(sentence);
    
    // 5-50단어 사이의 문장만 유효
    if (wordCount >= 5 && wordCount <= 50) {
      validSentences.push(sentence);
    } else {
      skippedSentences.push(sentence);
    }
  }
  
  return { validSentences, skippedSentences };
};

// 이미지 → 텍스트 (OpenAI Vision API)
export const imageToTextWithOpenAIVision = async (imageFile: File): Promise<string> => {
  const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  
  const base64 = await fileToBase64(imageFile);
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
  
  const prompt = `영어문제로 사용되는 본문이야.
이 이미지의 내용을 수작업으로 정확히 읽고, 영어 본문만 추려내서 보여줘.
글자는 인쇄글씨체 이외에 손글씨나 원, 밑줄 등 표시되어있는 것은 무시해. 
본문중에 원문자 1, 2, 3... 등으로 표시된건 제거해줘. 
원문자 제거후 줄을 바꾸거나 문단을 바꾸지말고, 전체가 한 문단으로 구성해줘. 
영어 본문만, 아무런 설명이나 안내문 없이, 한 문단으로만 출력해줘.`;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: base64 } }
          ]
        }
      ],
      max_tokens: 2048
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content.trim();
};

// OpenAI API를 사용하여 영어를 한글로 번역
export const translateToKorean = async (englishText: string, apiKey: string): Promise<string> => {
  try {
    console.log('🌐 번역 시작:', englishText.substring(0, 50) + '...');
    
    if (!apiKey) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }

    const prompt = `다음 영어 본문을 자연스러운 한국어로 번역하세요.

번역 요구사항:
- 자연스럽고 매끄러운 한국어
- 원문의 의미를 정확히 전달
- 문학적이고 읽기 쉬운 문체

번역만 반환하세요 (다른 텍스트 없이):

${englishText}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that provides natural Korean translations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 오류:', response.status, errorText);
      throw new Error(`API 호출 실패: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ 번역 완료');
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('API 응답 형식 오류');
    }
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ 번역 오류:', error);
    throw error;
  }
};

// 본문 → 빈칸 채우기 문제 생성 (AI) - 문장별로 주제어(핵심 의미 단어) 1개씩 선택
export const generateBlankFillQuizWithAI = async (passage: string, retryCount: number = 0): Promise<BlankFillItem> => {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
  
  // 먼저 문장을 분할하고 필터링
  const allSentences = splitSentences(passage);
  const { validSentences, skippedSentences } = filterValidSentences(allSentences);
  
  console.log('문장 분석 (AI 호출 전):', {
    전체문장수: allSentences.length,
    유효문장수: validSentences.length,
    제외문장수: skippedSentences.length,
    제외된문장들: skippedSentences.map(s => `${s.substring(0, 30)}... (${countWordsInSentence(s)}개 단어)`)
  });
  
  const prompt = `다음 ${validSentences.length}개 문장을 하나씩 분석하여 각 문장에서 핵심 단어 1개씩을 선택하세요.

**문장별 분석 (각 문장을 개별적으로 처리):**
${validSentences.map((sentence, index) => `
문장 ${index + 1}: "${sentence}"
→ 이 문장의 핵심 의미를 파악하고, 그 의미를 가장 잘 나타내는 단어 1개를 선택하세요.
→ 선택할 단어는 반드시 이 문장에 실제로 존재해야 합니다.
→ 문장의 주제, 주요 동작, 핵심 개념을 나타내는 단어를 선택하세요.`).join('\n')}

**작업 절차:**
1. 문장 1을 읽고 분석 → 핵심 단어 1개 선택
2. 문장 2를 읽고 분석 → 핵심 단어 1개 선택  
3. 문장 3을 읽고 분석 → 핵심 단어 1개 선택
4. ... (모든 문장에 대해 반복)
5. 선택한 단어들을 (_______________)로 교체하여 빈칸 문제 생성

**절대 규칙:**
- **${validSentences.length}개 문장 = 정확히 ${validSentences.length}개 단어 선택**
- **각 문장에서 1개씩만 선택 (건너뛰지 말 것)**
- **선택한 단어는 해당 문장에 반드시 존재해야 함**

**단어 선택 기준 (매우 중요):**
1. **문장의 핵심 의미를 나타내는 단어**를 선택하세요
2. **동사, 명사, 형용사** 중에서 문장의 주요 의미를 담당하는 단어
3. **절대 피해야 할 단어들:**
   - 관사 (a, an, the)
   - 전치사 (in, on, at, by, for, with, etc.)
   - 접속사 (and, or, but, so, etc.)
   - 대명사 (it, this, that, they, etc.)
   - 조동사 (will, can, should, etc.)
   - 문장의 첫 번째 단어나 마지막 단어를 무작정 선택하지 말 것

4. **선택 우선순위:**
   - 문장의 주제나 핵심 개념을 나타내는 명사
   - 문장의 주요 동작을 나타내는 동사
   - 문장의 핵심 특성을 나타내는 형용사
   - 문장의 의미를 이해하는 데 필수적인 단어

5. **선택 방법:**
   - 문장을 읽고 "이 문장이 무엇에 대해 말하고 있는가?"를 생각하세요
   - 그 답에 가장 중요한 역할을 하는 단어를 선택하세요
   - 문장에서 그 단어를 제거하면 문장의 의미가 크게 달라지는 단어를 선택하세요

**예시:**
- "The cat is sleeping on the mat." → "sleeping" (핵심 동작)
- "She bought a beautiful red dress." → "dress" (핵심 명사) 또는 "beautiful" (핵심 형용사)
- "The weather is very cold today." → "cold" (핵심 형용사)
- "Social media is shifting the power from marketers to consumers where the stories told by the consumers themselves are often more potent than the ones told by the brands." → "shifting" (핵심 동작, 문장의 주요 변화를 나타냄) ❌ "brands" (마지막 단어이지만 핵심 의미 아님)
- "The company announced a major breakthrough in renewable energy technology." → "breakthrough" (핵심 명사, 문장의 핵심 내용) ❌ "technology" (마지막 단어이지만 핵심 의미 아님)
- "Students are struggling with the complex mathematical concepts." → "struggling" (핵심 동작, 문장의 주요 상황) ❌ "concepts" (마지막 단어이지만 핵심 의미 아님)

**출력 형식 (JSON만):**
{
  "blankedText": "빈칸이 포함된 전체 본문",
  "correctAnswers": ["단어1", "단어2", "단어3", ...]
}

**중요한 체크리스트:**
- 문장 개수를 세어보세요: ${validSentences.length}개
- 각 문장에서 1개씩 단어를 선택하세요
- 총 ${validSentences.length}개 단어가 선택되어야 합니다
- 문장을 하나도 건너뛰지 마세요!

**중요 (절대 규칙):**
- **반드시 ${validSentences.length}개의 단어를 선택해야 함**
- **모든 문장에서 1개씩 선택 (건너뛰지 말 것)**
- **문장을 하나도 건너뛰지 마세요!**
- **${validSentences.length}개 문장 = 정확히 ${validSentences.length}개 단어**
- JSON 형식으로만 응답
- **절대 문장의 마지막 단어를 무작정 선택하지 마세요!**
- **문장의 위치(첫 번째, 마지막)가 아닌 의미의 중요성으로 선택하세요**
- **문장을 읽고 "이 문장이 무엇을 말하려고 하는가?"를 먼저 파악한 후, 그 의미를 가장 잘 나타내는 단어를 선택하세요**
- **위치에 의존하지 말고 의미에 의존하세요!**

**처리 순서 (구체적 예시):**
현재 ${validSentences.length}개 문장이 있습니다. 각 문장에서 1개씩 선택하세요:

${validSentences.map((sentence, index) => `${index + 1}. 문장 ${index + 1}: "${sentence.substring(0, 100)}${sentence.length > 100 ? '...' : ''}" → [여기서 1개 단어 선택]`).join('\n')}

**절대 규칙 (위반 시 오류):**
- 문장 개수 = 선택된 단어 개수
- ${validSentences.length}개 문장 → 정확히 ${validSentences.length}개 단어 선택
- 모든 문장에서 1개씩 선택 (건너뛰지 말 것)
- 문장을 하나도 건너뛰면 안 됩니다!

입력된 영어 본문:
${passage}`;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
         messages: [
           { 
             role: 'system', 
             content: `You are an expert English teacher creating blank-fill problems. You will process sentences ONE BY ONE.

CRITICAL PROCESSING RULES:
1. You will receive ${validSentences.length} sentences
2. Process each sentence individually and sequentially
3. For each sentence, select exactly ONE word that carries the core meaning
4. The selected word MUST exist in that specific sentence
5. You must process ALL ${validSentences.length} sentences - no skipping
6. Return exactly ${validSentences.length} words total

SENTENCE-BY-SENTENCE PROCESSING:
- Read Sentence 1 → Analyze its meaning → Select 1 word from Sentence 1
- Read Sentence 2 → Analyze its meaning → Select 1 word from Sentence 2  
- Read Sentence 3 → Analyze its meaning → Select 1 word from Sentence 3
- Continue for all ${validSentences.length} sentences

WORD SELECTION STRATEGY:
- Ask: "What is the main idea of this specific sentence?"
- Find the word that best represents that main idea
- The word must be present in that exact sentence
- Prefer content words (nouns, verbs, adjectives) over function words
- Avoid articles, prepositions, conjunctions, pronouns

OUTPUT FORMAT:
Return a JSON object with:
- "blankedText": the original text with selected words replaced by (_______________)
- "correctAnswers": array of exactly ${validSentences.length} selected words

Remember: ${validSentences.length} sentences = exactly ${validSentences.length} words!` 
           },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.01
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
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
    
    // 필수 필드 검증
    if (!result.blankedText || !result.correctAnswers || !Array.isArray(result.correctAnswers)) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    // 문장 수와 선택된 단어 수 일치 검증
    const selectedWordsCount = result.correctAnswers.length;
    
    console.log('문장 수 검증:', {
      validSentencesCount: validSentences.length,
      selectedWordsCount: selectedWordsCount,
      validSentences: validSentences.map(s => s.substring(0, 50) + '...')
    });
    
    // 1단계: 개수 검증 (강화)
    console.log('🔢 1단계: 개수 검증');
    console.log('문장별 상세 정보:', validSentences.map((sentence, index) => ({
      문장번호: index + 1,
      문장내용: sentence.substring(0, 80) + (sentence.length > 80 ? '...' : ''),
      단어수: countWordsInSentence(sentence)
    })));
    
    if (validSentences.length !== selectedWordsCount) {
      console.error('❌ 개수 불일치 상세:', {
        유효문장수: validSentences.length,
        선택된단어수: selectedWordsCount,
        차이: validSentences.length - selectedWordsCount,
        비율: `${selectedWordsCount}/${validSentences.length} (${Math.round(selectedWordsCount/validSentences.length*100)}%)`,
        선택된단어들: result.correctAnswers,
        문장목록: validSentences.map((s, i) => `${i+1}. ${s.substring(0, 50)}...`)
      });
      
      // 재시도 로직 (최대 2회)
      if (retryCount < 2) {
        console.log(`🔄 재시도 ${retryCount + 1}/2 - 문장별 단어 선택 강화로 재시도`);
        return generateBlankFillQuizWithAI(passage, retryCount + 1);
      }
      
      throw new Error(`❌ 심각한 오류: AI가 ${validSentences.length}개 문장 중 ${selectedWordsCount}개만 처리했습니다. 
      
      문장 목록:
      ${validSentences.map((s, i) => `${i+1}. ${s}`).join('\n')}
      
      선택된 단어: ${result.correctAnswers.join(', ')}
      
      모든 문장에서 단어를 선택해야 합니다. 다시 시도해주세요.`);
    }
  
     // 2단계: 문장별 단어 매핑 검증 (개선된 버전)
     console.log('🔍 2단계: 문장별 단어 매핑 검증');
     const selectedWords = result.correctAnswers;
     
     // 각 문장에 대해 선택된 단어 중 하나가 있는지 확인
     const sentenceWordMapping: { 
       sentenceIndex: number, 
       sentence: string, 
       matchedWord?: string,
       allWordsInSentence: string[],
       searchResults: { word: string, found: boolean }[]
     }[] = [];
     
     for (let i = 0; i < validSentences.length; i++) {
       const sentence = validSentences[i];
       const sentenceWords = sentence.toLowerCase().split(/\s+/).filter(w => w.length > 0);
       const searchResults: { word: string, found: boolean }[] = [];
       let matchedWord: string | undefined;
       
       // 선택된 단어들을 이 문장에서 검색
       for (const selectedWord of selectedWords) {
         const found = sentenceWords.some(word => 
           word.includes(selectedWord.toLowerCase()) || 
           selectedWord.toLowerCase().includes(word)
         );
         searchResults.push({ word: selectedWord, found });
         
         if (found && !matchedWord) {
           matchedWord = selectedWord;
         }
       }
       
       sentenceWordMapping.push({
         sentenceIndex: i + 1,
         sentence: sentence.substring(0, 100) + (sentence.length > 100 ? '...' : ''),
         matchedWord,
         allWordsInSentence: sentenceWords,
         searchResults
       });
       
       console.log(`  문장 ${i + 1}: ${matchedWord ? '✅' : '❌'} ${matchedWord ? `"${matchedWord}"` : '단어 없음'}`);
       if (!matchedWord) {
         console.log(`    문장의 단어들: [${sentenceWords.slice(0, 10).join(', ')}${sentenceWords.length > 10 ? '...' : ''}]`);
         console.log(`    선택된 단어들: [${selectedWords.join(', ')}]`);
       }
     }
     
     const missingSentences = sentenceWordMapping.filter(item => !item.matchedWord);
     
     if (missingSentences.length > 0) {
       console.error('❌ 문장별 단어 매핑 실패 상세:');
       missingSentences.forEach(item => {
         console.error(`  문장 ${item.sentenceIndex}: "${item.sentence}"`);
         console.error(`    문장의 단어들: [${item.allWordsInSentence.join(', ')}]`);
         console.error(`    검색 결과:`, item.searchResults);
       });
       
       // 재시도 로직 (최대 2회)
       if (retryCount < 2) {
         console.log(`🔄 재시도 ${retryCount + 1}/2 - 문장별 단어 매핑 실패로 재시도`);
         return generateBlankFillQuizWithAI(passage, retryCount + 1);
       }
       
       const missingDetails = missingSentences.map(item => 
         `문장 ${item.sentenceIndex}: "${item.sentence.substring(0, 80)}..."`
       ).join('\n');
       
       throw new Error(`AI가 ${missingSentences.length}개 문장에서 단어를 선택하지 않았습니다. 모든 문장에서 단어를 선택해야 합니다. 다시 시도해주세요.\n\n누락된 문장들:\n${missingDetails}`);
     }
    
    console.log('✅ 모든 문장에서 단어 선택 완료 - 검증 통과');
    console.log('🔍 === AI 응답 상세 분석 완료 ===');
    
    // 각 정답 단어가 본문에 실제로 존재하는지 검증 (대소문자 구분 없이)
    const correctAnswers = result.correctAnswers;
    const passageLower = passage.toLowerCase();
    
    console.log('검증 정보:', {
      originalPassage: passage.substring(0, 100) + '...',
      correctAnswers: correctAnswers,
      passageLower: passageLower.substring(0, 100) + '...'
    });
    
    // 본문에서 이미 ()로 묶인 단어나 구 추출 (제외할 단어들)
    const excludedWords: string[] = [];
    const bracketRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = bracketRegex.exec(passage)) !== null) {
      excludedWords.push(match[1].trim());
    }
    
    for (let i = 0; i < correctAnswers.length; i++) {
      const answerLower = correctAnswers[i].toLowerCase();
      
      if (!passageLower.includes(answerLower)) {
        // 정확한 단어 경계로 다시 검증
        const wordBoundaryRegex = new RegExp(`\\b${answerLower}\\b`);
        if (!wordBoundaryRegex.test(passageLower)) {
          console.error('정답 단어 검증 실패:', {
            correctAnswer: correctAnswers[i],
            passage: passage.substring(0, 200),
            excludedWords
          });
          throw new Error(`정답 단어 "${correctAnswers[i]}"가 본문에 존재하지 않습니다. AI 응답 오류입니다.`);
        }
      }
    }

    // 주제어 선정 품질 검증
    console.log('주제어 선정 품질 검증:', {
      correctAnswers: correctAnswers,
      passage: passage.substring(0, 200)
    });
    
    // 빈칸 본문이 원본 본문과 일치하는지 검증
    let blankRestore = result.blankedText;
    for (let i = 0; i < correctAnswers.length; i++) {
      blankRestore = blankRestore.replace(/\(_{15}\)/, correctAnswers[i]);
    }
    
    // 공백과 구두점을 정규화하여 비교
    const normalizeText = (text: string) => {
      return text
        .trim()
        .replace(/\s+/g, ' ')  // 여러 공백을 하나로
        .replace(/[.,!?;:]/g, '')  // 구두점 제거
        .toLowerCase();
    };
    
    const normalizedOriginal = normalizeText(passage);
    const normalizedRestored = normalizeText(blankRestore);
    
    console.log('빈칸 본문 검증:', {
      original: normalizedOriginal.substring(0, 100),
      restored: normalizedRestored.substring(0, 100),
      blankedText: result.blankedText.substring(0, 100),
      match: normalizedRestored === normalizedOriginal
    });
    
    if (normalizedRestored !== normalizedOriginal) {
      console.warn('빈칸 본문 검증 실패 - 상세 정보:', {
        original: passage.substring(0, 300),
        blankedText: result.blankedText.substring(0, 300),
        restored: blankRestore.substring(0, 300),
        correctAnswers: correctAnswers
      });
      
      // 정답 단어가 본문에 존재하고, 빈칸이 적절히 배치되어 있으면 통과
      const allAnswersExist = correctAnswers.every((answer: string) => 
        passageLower.includes(answer.toLowerCase())
      );
      if (allAnswersExist && result.blankedText.includes('(_______________)')) {
        console.log('정답 단어가 본문에 존재하고 빈칸이 적절히 배치되어 있어 통과합니다.');
      } else {
        throw new Error('빈칸 본문이 원본 본문과 일치하지 않습니다. AI 응답 오류입니다.');
      }
    }
    
    // 번역은 별도 함수로 처리
    console.log('번역 시작...');
    const translation = await translateToKorean(passage, apiKey);
    result.translation = translation;
    
    console.log('최종 검증 전 결과:', {
      blankedText: result.blankedText,
      correctAnswers: result.correctAnswers,
      translation: result.translation
    });
    
    if (!result.blankedText || !result.correctAnswers || !result.translation) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    console.log('AI 응답 검증 완료, 반환할 결과:', result);
    return result;
    
  } catch (error) {
    console.error('AI 문제 생성 오류:', error);
    throw error;
  }
};
