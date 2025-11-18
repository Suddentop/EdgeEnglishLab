// Work_02 독해 문제 생성 서비스

// 프록시 서버 또는 직접 OpenAI API 호출 헬퍼 함수
async function callOpenAIAPI(requestBody: any): Promise<Response> {
  const proxyUrl = process.env.REACT_APP_API_PROXY_URL || '';
  const directApiKey = process.env.REACT_APP_OPENAI_API_KEY;
  
  console.log('🔍 Work02 환경 변수 확인:', {
    proxyUrl: proxyUrl ? '설정됨' : '없음',
    directApiKey: directApiKey ? '설정됨' : '없음'
  });
  
  // 프록시 URL이 설정된 경우 프록시 사용 (프로덕션)
  if (proxyUrl) {
    console.log('🤖 OpenAI 프록시 서버 호출 중...');
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    // 프록시 응답에서 401 에러인 경우 상세 정보 제공
    if (response.status === 401) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = 'OpenAI API 인증 실패 (401)';
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = `OpenAI API 인증 실패: ${errorData.error.message}`;
        }
      } catch (e) {
        // JSON 파싱 실패 시 기본 메시지 사용
      }
      
      console.error('❌ API 인증 오류:', errorMessage);
      console.error('💡 해결 방법:');
      console.error('   1. 프록시 서버의 OpenAI API 키가 올바른지 확인하세요.');
      console.error('   2. API 키가 만료되지 않았는지 확인하세요.');
      console.error('   3. 프록시 서버 설정을 확인하세요.');
    }
    
    return response;
  }
  
  // 개발 환경: 직접 API 호출
  if (!directApiKey) {
    throw new Error('API Key가 설정되지 않았습니다. .env.local 파일에 REACT_APP_OPENAI_API_KEY를 설정해주세요.');
  }
  
  console.log('🤖 OpenAI API 직접 호출 중... (개발 환경)');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${directApiKey}`,
    },
    body: JSON.stringify(requestBody),
  });
  
  // 직접 API 호출에서 401 에러인 경우 상세 정보 제공
  if (response.status === 401) {
    const errorText = await response.text().catch(() => '');
    let errorMessage = 'OpenAI API 인증 실패 (401)';
    
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.error?.message) {
        errorMessage = `OpenAI API 인증 실패: ${errorData.error.message}`;
      }
    } catch (e) {
      // JSON 파싱 실패 시 기본 메시지 사용
    }
    
    console.error('❌ API 인증 오류:', errorMessage);
    console.error('💡 해결 방법:');
    console.error('   1. .env.local 파일의 REACT_APP_OPENAI_API_KEY가 올바른지 확인하세요.');
    console.error('   2. API 키가 만료되지 않았는지 확인하세요.');
    console.error('   3. OpenAI 계정의 API 키 사용량을 확인하세요.');
  }
  
  return response;
}

interface WordReplacement {
  original: string;           // 원본 단어/숙어
  replacement: string;        // 교체된 단어/숙어
  originalMeaning: string;    // 원본 단어/숙어의 한국어 뜻
  replacementMeaning: string; // 교체된 단어/숙어의 한국어 뜻
}

export interface Work02QuizData {
  title: string;
  originalText: string;      // 원본 본문
  modifiedText: string;      // 단어가 교체된 본문
  replacements: WordReplacement[];  // 교체된 단어들
  translation: string;       // 본문 해석
}

// Step 1: 문장 분리
async function splitSentences(passage: string): Promise<string[]> {
  const prompt = `You will receive an English passage. Split it into individual sentences.
Use the following rules:
- End of sentence is marked by '.', '?', or '!' followed by a space or newline.
- Keep sentence punctuation.
- Do not merge or break sentences.

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no code blocks.

Passage:
${passage}

Required JSON format:
{
  "sentences": ["Sentence 1.", "Sentence 2?", "Sentence 3!"]
}`;

  const response = await callOpenAIAPI({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
    temperature: 0
  });

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('AI로부터 올바른 응답을 받지 못했습니다.');
  }

  const content = data.choices[0].message.content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
  }

  try {
    let cleanJson = jsonMatch[0]
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/\n/g, ' ')
      .trim();
    
    const result = JSON.parse(cleanJson);
    if (!result.sentences || !Array.isArray(result.sentences)) {
      throw new Error('AI 응답에 sentences 배열이 없습니다.');
    }
    return result.sentences;
  } catch (parseError) {
    throw new Error(`JSON 파싱 실패: ${parseError}`);
  }
}

// Step 2: 문장별 단어 선택
async function selectWordFromSentence(sentence: string, index: number, usedWords: string[] = []): Promise<{index: number, original: string}> {
  const usedWordsText = usedWords.length > 0 ? `\n\nALREADY USED WORDS (do not select these): ${usedWords.join(', ')}` : '';
  
  const prompt = `You are selecting one important word from sentence #${index + 1} below.

RULES:
1. Only ONE word should be selected. Never more than one.
2. Select a word that is NOT already used in previous sentences.
3. Choose a meaningful word that would be good for vocabulary learning.

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no code blocks.

Sentence #${index + 1}: ${sentence}${usedWordsText}

Required JSON format:
{
  "index": 5,
  "original": "important"
}`;

  const response = await callOpenAIAPI({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
    temperature: 0
  });

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('AI로부터 올바른 응답을 받지 못했습니다.');
  }

  const content = data.choices[0].message.content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
  }

  try {
    let cleanJson = jsonMatch[0]
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/\n/g, ' ')
      .trim();
    
    const result = JSON.parse(cleanJson);
    if (typeof result.index !== 'number' || typeof result.original !== 'string') {
      throw new Error('AI 응답에 올바른 index와 original이 없습니다.');
    }
    return result;
  } catch (parseError) {
    throw new Error(`JSON 파싱 실패: ${parseError}`);
  }
}

// Step 3: 단어 교체
async function replaceWordInSentence(sentence: string, wordIndex: number, originalWord: string): Promise<{replacement: string, originalMeaning: string, replacementMeaning: string}> {
  const prompt = `You will replace one word in a sentence with a synonym.

RULES:
1. Replace the word at index ${wordIndex} with a synonym.
2. The synonym should be appropriate for the context.
3. Provide Korean meanings for both words.

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no code blocks.

Sentence: ${sentence}
Word to replace: "${originalWord}" (at index ${wordIndex})

Required JSON format:
{
  "replacement": "significant",
  "originalMeaning": "중요한",
  "replacementMeaning": "중요한, 의미있는"
}`;

  const response = await callOpenAIAPI({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0
  });

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('AI로부터 올바른 응답을 받지 못했습니다.');
  }

  const content = data.choices[0].message.content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
  }

  try {
    let cleanJson = jsonMatch[0]
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/\n/g, ' ')
      .trim();
    
    const result = JSON.parse(cleanJson);
    if (typeof result.replacement !== 'string' || typeof result.originalMeaning !== 'string' || typeof result.replacementMeaning !== 'string') {
      throw new Error('AI 응답에 올바른 replacement, originalMeaning, replacementMeaning이 없습니다.');
    }
    return result;
  } catch (parseError) {
    throw new Error(`JSON 파싱 실패: ${parseError}`);
  }
}

// Step 4: 본문에서 단어 교체 (순차 처리)
function replaceWordsInTextSequentially(originalText: string, sentences: string[], replacements: WordReplacement[]): string {
  let modifiedText = originalText;
  let currentPosition = 0;
  
  // 각 문장별로 순차적으로 처리
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const replacement = replacements[i];
    
    if (!replacement) continue;
    
    // 현재 문장의 시작 위치 찾기
    const sentenceStart = modifiedText.indexOf(sentence, currentPosition);
    if (sentenceStart === -1) {
      console.warn(`문장 ${i + 1}을 찾을 수 없음: "${sentence.substring(0, 50)}..."`);
      continue;
    }
    
    const sentenceEnd = sentenceStart + sentence.length;
    
    // 현재 문장 내에서만 단어 교체
    const sentenceText = modifiedText.substring(sentenceStart, sentenceEnd);
    const escapedOriginal = replacement.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedOriginal}\\b`, 'gi');
    
    const beforeReplace = sentenceText;
    const modifiedSentence = sentenceText.replace(regex, replacement.replacement);
    
    if (beforeReplace !== modifiedSentence) {
      console.log(`문장 ${i + 1} 교체 성공: "${replacement.original}" → "${replacement.replacement}"`);
      // 전체 텍스트에서 해당 문장 부분만 교체
      modifiedText = modifiedText.substring(0, sentenceStart) + modifiedSentence + modifiedText.substring(sentenceEnd);
    } else {
      console.warn(`문장 ${i + 1} 교체 실패: "${replacement.original}"를 찾을 수 없음`);
    }
    
    // 다음 문장 처리를 위해 위치 업데이트
    currentPosition = sentenceStart + modifiedSentence.length;
  }
  
  return modifiedText;
}

// Step 5: 본문 번역
async function translatePassage(passage: string): Promise<string> {
  const prompt = `Translate the following English passage to Korean. Provide a natural, fluent Korean translation.

Passage:
${passage}

IMPORTANT: Return ONLY the Korean translation. No explanations, no markdown, no code blocks.`;

  const response = await callOpenAIAPI({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0
  });

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('AI로부터 올바른 응답을 받지 못했습니다.');
  }

  return data.choices[0].message.content.trim();
}

// 메인 함수: 독해 문제 생성
export async function generateWork02Quiz(passage: string): Promise<Work02QuizData> {

  try {
    console.log('🔍 Work_02 문제 생성 시작...');
    
    // Step 1: 문장 분리
    console.log('📝 Step 1: 문장 분리 중...');
    const sentences = await splitSentences(passage);
    console.log(`✅ ${sentences.length}개 문장으로 분리 완료`);

    // Step 2: 각 문장에서 단어 선택
    console.log('🔍 Step 2: 단어 선택 중...');
    const selectedWords: {index: number, original: string}[] = [];
    const usedWords: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const wordSelection = await selectWordFromSentence(sentences[i], i, usedWords);
      selectedWords.push(wordSelection);
      usedWords.push(wordSelection.original.toLowerCase());
      console.log(`✅ 문장 ${i + 1}: "${wordSelection.original}" 선택`);
    }

    // Step 3: 단어 교체
    console.log('🔄 Step 3: 단어 교체 중...');
    const replacements: WordReplacement[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const wordSelection = selectedWords[i];
      
      const replacement = await replaceWordInSentence(sentence, wordSelection.index, wordSelection.original);
      
      replacements.push({
        original: wordSelection.original,
        replacement: replacement.replacement,
        originalMeaning: replacement.originalMeaning,
        replacementMeaning: replacement.replacementMeaning
      });
      
      console.log(`✅ 문장 ${i + 1}: "${wordSelection.original}" → "${replacement.replacement}"`);
    }

    // Step 4: 본문에서 단어 교체 (순차 처리)
    console.log('🔄 Step 4: 본문에서 단어 교체 중...');
    const modifiedText = replaceWordsInTextSequentially(passage, sentences, replacements);

    // Step 5: 본문 번역
    console.log('🌐 Step 5: 본문 번역 중...');
    const translation = await translatePassage(passage);
    console.log('✅ 번역 완료');

    const result: Work02QuizData = {
      title: '독해 문제',
      originalText: passage,
      modifiedText: modifiedText,
      replacements: replacements,
      translation: translation
    };

    console.log('🎉 Work_02 퀴즈 생성 완료:', result);
    return result;

  } catch (error) {
    console.error('❌ Work_02 문제 생성 실패:', error);
    throw error;
  }
}

