// Work13 (빈칸 채우기 단어) 관련 AI 서비스 함수들
// import { openAIProxyService } from './openaiProxyService'; // 프록시 서버 대신 직접 API 호출 사용

// 프록시 서버 또는 직접 OpenAI API 호출 헬퍼 함수
async function callOpenAIAPI(requestBody: any): Promise<Response> {
  const proxyUrl = process.env.REACT_APP_API_PROXY_URL;
  const directApiKey = process.env.REACT_APP_OPENAI_API_KEY;
  
  if (proxyUrl) {
    // 프록시 서버 사용 (프로덕션)
    console.log('🤖 OpenAI 프록시 서버 호출 중...');
    return await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } else if (directApiKey) {
    // 개발 환경: 직접 API 호출
    console.log('🤖 OpenAI API 직접 호출 중... (개발 환경)');
    return await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${directApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } else {
    throw new Error('API 설정이 없습니다. .env.local 파일을 확인해주세요.');
  }
}

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

// 문장을 분할하는 함수
const splitSentences = (text: string): string[] => {
  // 기본 문장 분할 (마침표, 느낌표, 물음표 기준)
  let sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  
  if (sentences.length < 2) {
    // 세미콜론으로도 분할 시도
    sentences = text.split(';').map(s => s.trim()).filter(s => s.length > 0);
  }
  
  if (sentences.length < 2) {
    // 문장이 부족하면 전체 텍스트를 하나의 문장으로 처리
    return [text.trim()];
  }

  // 세미콜론 분할이 더 많은 문장을 만들었다면 사용
  const semicolonSplit = text.split(';').map(s => s.trim()).filter(s => s.length > 0);
  if (semicolonSplit.length > sentences.length) {
    sentences = semicolonSplit;
  }

  // 각 문장이 마침표로 끝나지 않으면 마침표 추가
  return sentences.map(sentence => {
    if (!sentence.match(/[.!?]$/)) {
      return sentence + '.';
    }
    return sentence;
  });
};

// 문장의 단어 수를 계산하는 함수
const countWordsInSentence = (sentence: string): number => {
  return sentence.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// 유효한 문장들을 필터링하는 함수
const filterValidSentences = (sentences: string[]) => {
  const validSentences: string[] = [];
  const skippedSentences: string[] = [];
  
  sentences.forEach(sentence => {
    const wordCount = countWordsInSentence(sentence);
    if (wordCount >= 5 && wordCount <= 50) {
      validSentences.push(sentence);
    } else {
      skippedSentences.push(sentence);
    }
  });
  
  return { validSentences, skippedSentences };
};

// OpenAI API를 사용하여 영어를 한글로 번역
export const translateToKorean = async (englishText: string): Promise<string> => {
  try {
    console.log('🌐 번역 시작:', englishText.substring(0, 50) + '...');

    const prompt = `다음 영어 본문을 자연스러운 한국어로 번역하세요.

번역 요구사항:
- 자연스럽고 매끄러운 한국어
- 원문의 의미를 정확히 전달
- 문학적이고 읽기 쉬운 문체

번역만 반환하세요 (다른 텍스트 없이):

${englishText}`;

    const request = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system' as const, content: 'You are a helpful assistant that provides natural Korean translations.' },
          { role: 'user' as const, content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 800,
    };

    const response = await callOpenAIAPI(request);

    if (!response.ok) {
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
  
  // 먼저 문장을 분할하고 필터링
  const allSentences = splitSentences(passage);
  const { validSentences, skippedSentences } = filterValidSentences(allSentences);
  
  console.log('문장 분석 (AI 호출 전):', {
    전체문장수: allSentences.length,
    유효문장수: validSentences.length,
    제외문장수: skippedSentences.length,
    제외된문장들: skippedSentences.map(s => `${s.substring(0, 30)}... (${countWordsInSentence(s)}개 단어)`)
  });
  
  // 문장별로 명확히 구분된 프롬프트 생성
  const sentenceList = validSentences.map((sentence, index) => 
    `문장 ${index + 1}: "${sentence}"`
  ).join('\n\n');
  
  const prompt = `다음 ${validSentences.length}개 문장에서 각 문장마다 핵심 단어 1개씩을 선택하세요.

**문장 목록:**
${sentenceList}

**작업 방법:**
1. 문장 1을 읽고 → 핵심 단어 1개 선택
2. 문장 2를 읽고 → 핵심 단어 1개 선택
3. ... 모든 문장 처리

**중요 규칙:**
- 각 문장에서 정확히 1개씩만 선택
- 모든 문장을 처리 (건너뛰지 않음)
- JSON 형식으로만 응답

입력된 영어 본문:
${passage}`;
  
  try {
    const request = {
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system' as const, 
          content: `You are an expert English teacher creating blank-fill problems.

CRITICAL RULES:
1. You will receive ${validSentences.length} sentences
2. Select exactly ONE word from each sentence
3. Process ALL ${validSentences.length} sentences - no skipping
4. Return exactly ${validSentences.length} words total

PROCESSING METHOD:
- Read each sentence carefully
- Select the most important word (noun, verb, or adjective)
- Avoid articles (a, an, the), prepositions (in, on, at), conjunctions (and, or, but)
- Each sentence must contribute exactly 1 word

OUTPUT FORMAT:
Return JSON only:
{
  "blankedText": "text with (_______________) for selected words",
  "correctAnswers": ["word1", "word2", ...]
}

Remember: ${validSentences.length} sentences = exactly ${validSentences.length} words!` 
        },
        { role: 'user' as const, content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.01
    };

    const response = await callOpenAIAPI(request);

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
      일치여부: validSentences.length === selectedWordsCount
    });
    
    if (validSentences.length !== selectedWordsCount) {
      console.warn(`⚠️ 문장 수 불일치: ${validSentences.length}개 문장에서 ${selectedWordsCount}개 단어 선택됨`);
      
      if (retryCount < 3) {
        console.log(`🔄 재시도 ${retryCount + 1}/3...`);
        
        const retryPrompt = `다시 시도: 다음 ${validSentences.length}개 문장에서 각 문장마다 정확히 1개씩 단어를 선택하세요.

문장 목록:
${validSentences.map((s, i) => `${i+1}. ${s}`).join('\n')}

JSON 형식으로 응답:
{
  "blankedText": "빈칸이 포함된 전체 본문",
  "correctAnswers": ["단어1", "단어2", ...]
}

입력된 영어 본문:
${passage}`;

        // 재시도용 간단한 프롬프트로 다시 시도
        const retryRequest = {
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system' as const, 
              content: `You are an expert English teacher. Select exactly ONE word from each sentence. Process all ${validSentences.length} sentences. Return JSON format only.`
            },
            { role: 'user' as const, content: retryPrompt }
          ],
          max_tokens: 2000,
          temperature: 0.01
        };

        // 직접 OpenAI API 호출 (재시도)
        const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
        if (!apiKey) {
          throw new Error('OpenAI API 키가 설정되지 않았습니다.');
        }

        const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(retryRequest)
        });

        if (!retryResponse.ok) {
          throw new Error(`API 호출 실패: ${retryResponse.status}`);
        }

        const retryData = await retryResponse.json();
        const retryJsonMatch = retryData.choices[0].message.content.match(/\{[\s\S]*\}/);
        if (retryJsonMatch) {
          try {
            const retryResult = JSON.parse(retryJsonMatch[0]);
            if (retryResult.blankedText && retryResult.correctAnswers && 
                Array.isArray(retryResult.correctAnswers) && 
                retryResult.correctAnswers.length === validSentences.length) {
              console.log('✅ 재시도 성공 - 모든 문장에서 단어 선택 완료');
              result = retryResult;
            } else {
              throw new Error('재시도 결과가 유효하지 않습니다.');
            }
          } catch (retryError) {
            console.error('재시도 JSON 파싱 오류:', retryError);
            return generateBlankFillQuizWithAI(passage, retryCount + 1);
          }
        } else {
          return generateBlankFillQuizWithAI(passage, retryCount + 1);
        }
      } else {
        throw new Error(`❌ 심각한 오류: AI가 ${validSentences.length}개 문장 중 ${selectedWordsCount}개만 처리했습니다. 
        
        문장 목록:
        ${validSentences.map((s, i) => `${i+1}. ${s}`).join('\n')}
        
        선택된 단어: ${result.correctAnswers.join(', ')}
        
        모든 문장에서 단어를 선택해야 합니다. 다시 시도해주세요.`);
      }
    }
  
    // 2단계: 문장별 단어 매핑 검증 (개선된 버전)
    console.log('🔍 2단계: 문장별 단어 매핑 검증');
    const selectedWords = result.correctAnswers;
    
    // 각 문장에 대해 선택된 단어 중 하나가 있는지 확인 (더 유연한 검색)
    const sentenceWordMapping: { 
      sentenceIndex: number, 
      sentence: string, 
      matchedWord?: string,
      allWordsInSentence: string[],
      searchResults: { word: string, found: boolean }[]
    }[] = [];
    
    for (let i = 0; i < validSentences.length; i++) {
      const sentence = validSentences[i];
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      const searchResults = selectedWords.map((word: string) => ({
        word,
        found: sentenceWords.some(sentenceWord => 
          sentenceWord.includes(word.toLowerCase()) || 
          word.toLowerCase().includes(sentenceWord)
        )
      }));
      
      const matchedWord = searchResults.find((sr: { word: string; found: boolean }) => sr.found)?.word;
      
      sentenceWordMapping.push({
        sentenceIndex: i,
        sentence,
        matchedWord,
        allWordsInSentence: sentenceWords,
        searchResults
      });
    }
    
    // 매핑 결과 출력
    console.log('📊 문장-단어 매핑 결과:');
    sentenceWordMapping.forEach(mapping => {
      console.log(`문장 ${mapping.sentenceIndex + 1}: "${mapping.sentence}"`);
      console.log(`  선택된 단어: ${mapping.matchedWord || '없음'}`);
      console.log(`  검색 결과:`, mapping.searchResults);
    });
    
    // 매핑되지 않은 문장들 확인
    const missingSentences = sentenceWordMapping.filter(mapping => !mapping.matchedWord);
    
    if (missingSentences.length > 0) {
      console.warn(`⚠️ ${missingSentences.length}개 문장에서 단어를 찾을 수 없음`);
      
      if (retryCount < 3) {
        console.log('🔄 매핑 실패로 인한 재시도...');
        return generateBlankFillQuizWithAI(passage, retryCount + 1);
      } else {
        throw new Error(`❌ 매핑 실패: ${missingSentences.length}개 문장에서 선택된 단어를 찾을 수 없습니다.`);
      }
    }
    
    // 3단계: 빈칸 본문 검증
    console.log('🔍 3단계: 빈칸 본문 검증');
    const originalLower = passage.toLowerCase();
    const blankedLower = result.blankedText.toLowerCase();
    
    // 각 정답이 원본에 존재하는지 확인
    const allAnswersExist = result.correctAnswers.every((answer: string) => {
      const answerLower = answer.toLowerCase();
      const found = originalLower.includes(answerLower);
      
      if (!found) {
        console.warn(`❌ 정답 "${answer}"이 원본에 없음`);
        
        // 단어 경계를 고려한 검색 시도
        const wordBoundaryRegex = new RegExp(`\\b${answerLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        const wordBoundaryFound = wordBoundaryRegex.test(originalLower);
        
        if (!wordBoundaryFound) {
          console.warn(`❌ 단어 경계 검색으로도 "${answer}"를 찾을 수 없음`);
          return false;
        }
      }
      
      return true;
    });
    
    if (!allAnswersExist) {
      throw new Error('선택된 단어 중 일부가 원본 본문에 존재하지 않습니다.');
    }
    
    // 빈칸 본문이 원본과 일치하는지 확인 (빈칸 부분 제외)
    const normalizedOriginal = originalLower.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
    const normalizedBlanked = blankedLower.replace(/\(_______________\)/g, '').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
    
    if (normalizedBlanked !== normalizedOriginal) {
      console.warn('⚠️ 빈칸 본문이 원본과 일치하지 않음');
      console.log('원본:', normalizedOriginal.substring(0, 100));
      console.log('빈칸:', normalizedBlanked.substring(0, 100));
      
      if (allAnswersExist && result.blankedText.includes('(_______________)')) {
        console.log('✅ 정답은 모두 존재하고 빈칸 표시도 있음 - 허용');
      } else {
        throw new Error('빈칸 본문이 원본 본문과 일치하지 않습니다. AI 응답 오류입니다.');
      }
    }
    
    // 번역은 별도 함수로 처리
    console.log('번역 시작...');
    const translation = await translateToKorean(passage);
    result.translation = translation;
    
    console.log('최종 검증 전 결과:', {
      blankedText: result.blankedText,
      correctAnswers: result.correctAnswers,
      translation: result.translation
    });
    
    // 최종 검증
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

// 이미지를 텍스트로 변환하는 함수 (OpenAI Vision API 사용)
export const imageToTextWithOpenAIVision = async (imageFile: File): Promise<string> => {
  const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  
  const base64 = await fileToBase64(imageFile);
  
  const prompt = `영어문제로 사용되는 본문이야.
이 이미지의 내용을 수작업으로 정확히 읽고, 영어 본문만 추려내서 보여줘.
글자는 인쇄글씨체 이외에 손글씨나 원, 밑줄 등 표시되어있는 것은 무시해. 
본문중에 원문자 1, 2, 3... 등으로 표시된건 제거해줘. 
원문자 제거후 줄을 바꾸거나 문단을 바꾸지말고, 전체가 한 문단으로 구성해줘. 
영어 본문만, 아무런 설명이나 안내문 없이, 한 문단으로만 출력해줘.`;
  
  const request = {
    model: 'gpt-4o',
    messages: [
      { 
        role: 'user' as const, 
        content: [
          { type: 'text' as const, text: prompt },
          { type: 'image_url' as const, image_url: { url: base64 } }
        ]
      }
    ],
    max_tokens: 2048
  };
  
  // 직접 OpenAI API 호출 (이미지 처리)
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`API 호출 실패: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
};
