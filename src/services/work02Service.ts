// Work_02 독해 문제 생성 서비스

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
async function splitSentences(passage: string, apiKey: string): Promise<string[]> {
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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0
    })
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
async function selectWordFromSentence(sentence: string, index: number, apiKey: string, usedWords: string[] = []): Promise<{index: number, original: string}> {
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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0
    })
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
async function replaceWordInSentence(sentence: string, wordIndex: number, originalWord: string, apiKey: string): Promise<{replacement: string, originalMeaning: string, replacementMeaning: string}> {
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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0
    })
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

// Step 4: 본문 번역
async function translatePassage(passage: string, apiKey: string): Promise<string> {
  const prompt = `Translate the following English passage to Korean. Provide a natural, fluent Korean translation.

Passage:
${passage}

IMPORTANT: Return ONLY the Korean translation. No explanations, no markdown, no code blocks.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0
    })
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
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
  
  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.');
  }

  try {
    console.log('🔍 Work_02 문제 생성 시작...');
    
    // Step 1: 문장 분리
    console.log('📝 Step 1: 문장 분리 중...');
    const sentences = await splitSentences(passage, apiKey);
    console.log(`✅ ${sentences.length}개 문장으로 분리 완료`);

    // Step 2: 각 문장에서 단어 선택
    console.log('🔍 Step 2: 단어 선택 중...');
    const selectedWords: {index: number, original: string}[] = [];
    const usedWords: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const wordSelection = await selectWordFromSentence(sentences[i], i, apiKey, usedWords);
      selectedWords.push(wordSelection);
      usedWords.push(wordSelection.original.toLowerCase());
      console.log(`✅ 문장 ${i + 1}: "${wordSelection.original}" 선택`);
    }

    // Step 3: 단어 교체
    console.log('🔄 Step 3: 단어 교체 중...');
    const replacements: WordReplacement[] = [];
    const modifiedSentences: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const wordSelection = selectedWords[i];
      
      const replacement = await replaceWordInSentence(sentence, wordSelection.index, wordSelection.original, apiKey);
      
      // 문장에서 단어 교체
      const words = sentence.split(' ');
      words[wordSelection.index] = replacement.replacement;
      const modifiedSentence = words.join(' ');
      modifiedSentences.push(modifiedSentence);
      
      replacements.push({
        original: wordSelection.original,
        replacement: replacement.replacement,
        originalMeaning: replacement.originalMeaning,
        replacementMeaning: replacement.replacementMeaning
      });
      
      console.log(`✅ 문장 ${i + 1}: "${wordSelection.original}" → "${replacement.replacement}"`);
    }

    // Step 4: 본문 번역
    console.log('🌐 Step 4: 본문 번역 중...');
    const translation = await translatePassage(passage, apiKey);
    console.log('✅ 번역 완료');

    const result: Work02QuizData = {
      title: '독해 문제',
      originalText: passage,
      modifiedText: modifiedSentences.join(' '),
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

