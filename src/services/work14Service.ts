// Work14 관련 AI 서비스 함수들

// 프록시 서버 또는 직접 OpenAI API 호출 헬퍼 함수
async function callOpenAIAPI(requestBody: any): Promise<Response> {
  const proxyUrl = process.env.REACT_APP_API_PROXY_URL || '';
  const directApiKey = process.env.REACT_APP_OPENAI_API_KEY;
  
  console.log('🔍 Work14 환경 변수 확인:', {
    proxyUrl: proxyUrl ? `설정됨 (${proxyUrl})` : '없음',
    directApiKey: directApiKey ? '설정됨' : '없음'
  });
  
  // 프록시 URL이 설정된 경우 프록시 사용 (프로덕션)
  if (proxyUrl) {
    console.log('🤖 OpenAI 프록시 서버 호출 중...', proxyUrl);
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
  
  console.log('🤖 OpenAI 직접 API 호출 중...');
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

export interface BlankQuizData {
  blankedText: string;
  correctAnswers: string[];
  translation: string;
  userAnswers: string[];
  isCorrect: boolean | null;
  selectedSentences?: string[];
  options?: string[];
  answerIndex?: number;
  userAnswer?: string;
}

export interface BlankFillSentenceData {
  blankedText: string;
  correctAnswers: string[];
  translation: string;
  userAnswers: string[];
  isCorrect: boolean | null;
}

// 이미지를 텍스트로 변환하는 함수
export const imageToTextWithOpenAIVision = async (imageData: string | File): Promise<string> => {
  // File 객체인 경우 base64로 변환
  let base64Image: string;
  if (imageData instanceof File) {
    base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageData);
    });
  } else {
    base64Image = imageData;
  }
  
  const response = await callOpenAIAPI({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '이 이미지에서 영어 텍스트를 추출해주세요. 텍스트만 반환하고 다른 설명은 하지 마세요.'
          },
            {
              type: 'image_url',
              image_url: {
                url: base64Image
              }
            }
        ]
      }
    ],
    max_tokens: 2000,
    temperature: 0.1
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
};

// 문장을 분할하는 함수 (개선된 버전)
export const splitSentences = (input: string): string[] => {
  console.log('=== 문장 분할 시작 ===');
  console.log('입력 텍스트:', input);
  
  let protectedText = input;

  // 인용문 내 마침표 보호
  protectedText = protectedText.replace(/"([^"]+?\.)"/g, (match, p1) => `"${p1.replace(/\./g, '[DOT]')}"`);

  // A.D. 같은 약어 보호
  protectedText = protectedText.replace(/\b([A-Z])\./g, '$1[DOT]');
  protectedText = protectedText.replace(/\b([A-Z])\.[ ]?([A-Z])\./g, '$1[DOT]$2[DOT]');

  // 숫자 중간 마침표 보호 (예: 3.14)
  protectedText = protectedText.replace(/(\d)\.(\d)/g, '$1[DOT]$2');

  // 문장 분리: 마침표/물음표/느낌표 뒤 + 대문자/인용문이 시작되는 곳
  const parts = protectedText.split(/(?<=[.?!])\s+(?=[A-Z"“‘])/).map(s =>
    s.replace(/\[DOT\]/g, '.').trim()
  );

  const sentences = parts.filter(Boolean);
  
  console.log('분할된 문장들:', sentences);
  console.log('문장 개수:', sentences.length);
  
  return sentences;
};

// 문장의 단어 수를 세는 함수
export const countWordsInSentence = (sentence: string): number => {
  return sentence.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// 유효한 문장들을 필터링하는 함수
export const filterValidSentences = (sentences: string[]): { validSentences: string[], skippedSentences: string[] } => {
  const validSentences: string[] = [];
  const skippedSentences: string[] = [];
  
  sentences.forEach(sentence => {
    const wordCount = countWordsInSentence(sentence);
    if (wordCount >= 5) {
      validSentences.push(sentence);
    } else {
      skippedSentences.push(sentence);
    }
  });
  
  return { validSentences, skippedSentences };
};

// 빈칸 문제를 생성하는 AI 함수
export const generateBlankQuizWithAI = async (passage: string): Promise<BlankQuizData> => {
  // 문장 개수 확인
  const sentences = splitSentences(passage);
  const { validSentences, skippedSentences } = filterValidSentences(sentences);
  
  console.log('=== 문장 분할 디버깅 ===');
  console.log('원본 텍스트:', passage);
  console.log('분할된 문장들:', sentences);
  console.log('문장 분석 결과:', {
    전체문장수: sentences.length,
    유효문장수: validSentences.length,
    제외문장수: skippedSentences.length,
    제외된문장들: skippedSentences.map((s: string) => `${s.substring(0, 30)}... (${countWordsInSentence(s)}개 단어)`)
  });
  
  if (validSentences.length < 2) {
    throw new Error('유효한 문장이 2개 미만입니다. 더 긴 본문을 입력해주세요.');
  }
  
  // 문장 선택 로직 실행
  // AI 문장 선택 시도
  let selectedIndices: number[] = [];
  let selectedSentences: string[] = [];
  
  // AI 문장 선택 재활성화 (더 많은 빈칸 생성을 위해)
  try {
    const result = await selectSentencesForBlanksWithAI(validSentences);
    selectedIndices = result.selectedIndices;
    selectedSentences = result.selectedSentences;
    console.log('=== AI 문장 선택 성공 ===');
    console.log('AI 선택 결과:', { selectedIndices, selectedSentences });
  } catch (error) {
    console.error('=== AI 문장 선택 실패 (의도적) ===', error);
    console.log('로컬 로직으로 대체...');
    
    // 강제로 문장 선택 (로컬 로직)
    const blankCount = validSentences.length >= 10 ? 5 : 
                      validSentences.length >= 8 ? 4 : 
                      validSentences.length >= 6 ? 3 : 
                      validSentences.length >= 4 ? 3 : 
                      validSentences.length >= 2 ? 2 : 1;
    console.log('로컬 빈칸 개수:', blankCount);
    console.log('유효한 문장들:', validSentences);
    
    selectedIndices = [];
    selectedSentences = [];
    
    // 안전한 문장 선택 로직
    if (blankCount >= 1 && validSentences[0]) {
      selectedIndices.push(0);
      selectedSentences.push(validSentences[0]);
      console.log('로컬 1번째 문장 선택:', validSentences[0]);
    }
    
    if (blankCount >= 2) {
      // 두 번째 문장: 가능한 한 중간 지점 선택
      const secondIndex = Math.min(2, validSentences.length - 1);
      if (validSentences[secondIndex]) {
        selectedIndices.push(secondIndex);
        selectedSentences.push(validSentences[secondIndex]);
        console.log(`로컬 2번째 문장 선택 (인덱스 ${secondIndex}):`, validSentences[secondIndex]);
      }
    }
    
    if (blankCount >= 3) {
      // 세 번째 문장: 가능한 한 마지막에 가까운 지점 선택
      const thirdIndex = Math.min(4, validSentences.length - 1);
      if (validSentences[thirdIndex] && !selectedIndices.includes(thirdIndex)) {
        selectedIndices.push(thirdIndex);
        selectedSentences.push(validSentences[thirdIndex]);
        console.log(`로컬 3번째 문장 선택 (인덱스 ${thirdIndex}):`, validSentences[thirdIndex]);
      } else if (validSentences.length > 2) {
        // 대안: 마지막 문장 선택
        const lastIndex = validSentences.length - 1;
        if (!selectedIndices.includes(lastIndex)) {
          selectedIndices.push(lastIndex);
          selectedSentences.push(validSentences[lastIndex]);
          console.log(`로컬 3번째 문장 선택 (마지막 인덱스 ${lastIndex}):`, validSentences[lastIndex]);
        }
      }
    }
    
    if (blankCount >= 4) {
      // 네 번째 문장: 중간 지점 선택
      const fourthIndex = Math.min(6, validSentences.length - 1);
      if (validSentences[fourthIndex] && !selectedIndices.includes(fourthIndex)) {
        selectedIndices.push(fourthIndex);
        selectedSentences.push(validSentences[fourthIndex]);
        console.log(`로컬 4번째 문장 선택 (인덱스 ${fourthIndex}):`, validSentences[fourthIndex]);
      } else {
        // 대안: 사용 가능한 문장 중 선택
        for (let i = 0; i < validSentences.length; i++) {
          if (!selectedIndices.includes(i)) {
            selectedIndices.push(i);
            selectedSentences.push(validSentences[i]);
            console.log(`로컬 4번째 문장 선택 (대안 인덱스 ${i}):`, validSentences[i]);
            break;
          }
        }
      }
    }
    
    if (blankCount >= 5) {
      // 다섯 번째 문장: 마지막에 가까운 지점 선택
      const fifthIndex = Math.min(8, validSentences.length - 1);
      if (validSentences[fifthIndex] && !selectedIndices.includes(fifthIndex)) {
        selectedIndices.push(fifthIndex);
        selectedSentences.push(validSentences[fifthIndex]);
        console.log(`로컬 5번째 문장 선택 (인덱스 ${fifthIndex}):`, validSentences[fifthIndex]);
      } else {
        // 대안: 사용 가능한 문장 중 선택
        for (let i = validSentences.length - 1; i >= 0; i--) {
          if (!selectedIndices.includes(i)) {
            selectedIndices.push(i);
            selectedSentences.push(validSentences[i]);
            console.log(`로컬 5번째 문장 선택 (대안 인덱스 ${i}):`, validSentences[i]);
            break;
          }
        }
      }
    }
    
    console.log('로컬 선택 결과:', { selectedIndices, selectedSentences });
  }
  
  console.log('=== 문장 선택 디버깅 ===');
  console.log('선택된 인덱스:', selectedIndices);
  console.log('선택된 문장들:', selectedSentences);
  
  // 빈칸이 포함된 텍스트 생성
  let blankedText = passage;
  // 원본 전체 문장 배열 저장 (validSentences와 sentences 인덱스 매핑용)
  const originalSentences = splitSentences(passage);
  
  // 정렬된 문장 순서 저장용 변수
  let sortedSelectedSentences = selectedSentences;
  
  if (selectedSentences.length > 0) {
    // validSentences의 인덱스를 originalSentences(sentences)의 인덱스로 변환
    // validSentences는 sentences에서 필터링된 것이므로, 매핑이 필요함
    const validToOriginalIndexMap: number[] = [];
    let validIndex = 0;
    for (let i = 0; i < originalSentences.length; i++) {
      const wordCount = countWordsInSentence(originalSentences[i]);
      if (wordCount >= 5) {
        validToOriginalIndexMap[validIndex] = i;
        validIndex++;
      }
    }
    
    // selectedIndices와 selectedSentences를 원본 텍스트에서의 순서대로 정렬
    // 인덱스 기준으로 정렬하여 텍스트 앞쪽부터 A, B, C, D, E... 순서로 할당
    const sortedPairs = selectedIndices.map((idx, i) => ({
      validIndex: idx,
      originalIndex: validToOriginalIndexMap[idx],
      sentence: selectedSentences[i]
    })).sort((a, b) => a.originalIndex - b.originalIndex);
    
    console.log('정렬된 문장 순서:', sortedPairs.map((p, i) => ({
      알파벳: String.fromCharCode(65 + i),
      원본인덱스: p.originalIndex,
      문장일부: p.sentence.substring(0, 30) + '...'
    })));
    
    // 정렬된 순서로 문장과 인덱스를 재구성
    const sortedSelectedIndices = sortedPairs.map(p => p.validIndex);
    sortedSelectedSentences = sortedPairs.map(p => p.sentence);
    
    // 역순으로 처리하여 이전 교체가 이후 교체에 영향을 주지 않도록 함
    const reversedSentences = [...sortedSelectedSentences].reverse();
    const reversedIndices = [...sortedSelectedIndices].reverse();
    
    reversedSentences.forEach((sentence, reversedIndex) => {
      const originalIndex = sortedSelectedSentences.length - 1 - reversedIndex;
      const alphabetLabel = String.fromCharCode(65 + originalIndex); // A=65, B=66, C=67...
      
      if (sentence && sentence.trim().length > 0) {
        const sentenceLength = sentence.trim().length;
        const underscoreCount = Math.min(50, Math.max(1, Math.round(sentenceLength * 0.5))); // 선택된 문장의 글자수 * 0.5만큼 언더스코어 생성 (최대 50개)
        const blankText = `(${alphabetLabel}${'_'.repeat(underscoreCount)})`; // 공백 제거
        
        let replaced = false;
        
        // Method 1: Exact sentence matching
        const escapedSentence = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const exactRegex = new RegExp(escapedSentence, 'g');
        if (exactRegex.test(blankedText)) {
          blankedText = blankedText.replace(exactRegex, blankText);
          replaced = true;
        }
        
        // Method 2: Index-based replacement
        if (!replaced && reversedIndices[reversedIndex] !== undefined) {
          const validIndex = reversedIndices[reversedIndex];
          const originalSentenceIndex = validToOriginalIndexMap[validIndex];
          
          if (originalSentenceIndex !== undefined && originalSentenceIndex < originalSentences.length) {
            const originalSentence = originalSentences[originalSentenceIndex];
            if (originalSentence && blankedText.includes(originalSentence)) {
              const escapedOriginal = originalSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const originalRegex = new RegExp(escapedOriginal, 'g');
              if (originalRegex.test(blankedText)) {
                blankedText = blankedText.replace(originalRegex, blankText);
                replaced = true;
              }
            }
          }
        }
        
        // Method 3: Normalized matching
        if (!replaced) {
          const normalizedPassage = blankedText.replace(/\s+/g, ' ');
          const normalizedSentence = sentence.trim().replace(/\s+/g, ' ');
          if (normalizedPassage.includes(normalizedSentence)) {
            const normalizedIndex = normalizedPassage.indexOf(normalizedSentence);
            if (normalizedIndex !== -1) {
              const trimmedSentence = sentence.trim();
              const actualIndex = blankedText.indexOf(trimmedSentence);
              if (actualIndex !== -1) {
                const actualSentence = blankedText.substring(actualIndex, actualIndex + trimmedSentence.length);
                if (actualSentence) {
                  const escapedActual = actualSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const actualRegex = new RegExp(escapedActual, 'g');
                  if (actualRegex.test(blankedText)) {
                    blankedText = blankedText.replace(actualRegex, blankText);
                    replaced = true;
                  }
                }
              }
            }
          }
        }
        
        if (!replaced) {
          console.error(`선택된 문장 "${sentence.substring(0, 30)}..."을 원본 본문에서 찾을 수 없습니다.`);
        } else {
          console.log(`✅ 빈칸 ${originalIndex + 1} 생성 성공: (${alphabetLabel}${'_'.repeat(underscoreCount)})`);
        }
      }
    });
  } else {
    console.error('선택된 문장이 없어서 빈칸을 생성할 수 없습니다!');
  }
  
  console.log('빈칸 생성 결과:', {
    원본텍스트: passage.substring(0, 200) + '...',
    빈칸텍스트: blankedText.substring(0, 200) + '...',
    선택된문장수: sortedSelectedSentences.length,
    선택된문장들: sortedSelectedSentences
  });
  
  // 번역은 별도 함수로 처리
  console.log('번역 시작...');
  const translation = await translateToKorean(passage);
  
  const result: BlankQuizData = {
    blankedText,
    correctAnswers: sortedSelectedSentences,
    translation,
    userAnswers: [],
    isCorrect: null,
    selectedSentences: sortedSelectedSentences
  };
  
  console.log('최종 결과:', result);
  return result;
};

// 한국어로 번역하는 함수
export const translateToKorean = async (text: string, _apiKey?: string): Promise<string> => {
  try {
    const response = await callOpenAIAPI({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: `다음 영어 텍스트를 자연스러운 한국어로 번역해주세요:\n\n${text}` }],
      max_tokens: 2000,
      temperature: 0.3
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `API 호출 실패: ${response.status}`;
      
      // 401 에러인 경우 더 명확한 메시지 제공
      if (response.status === 401) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = `API 인증 실패: ${errorData.error.message}. API 키를 확인해주세요.`;
          }
        } catch (e) {
          // JSON 파싱 실패 시 기본 메시지 사용
          errorMessage = `API 인증 실패 (401). API 키를 확인해주세요.`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('API 응답 형식 오류');
    }
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ 번역 오류:', error);
    throw error;
  }
};

// AI를 사용한 문장 선택 로직
export const selectSentencesForBlanksWithAI = async (sentences: string[]): Promise<{ selectedIndices: number[], selectedSentences: string[] }> => {
  const sentenceCount = sentences.length;
  
  // 문장 수에 따른 빈칸 개수 결정 (개선된 로직)
  const blankCount = sentenceCount >= 10 ? 5 : 
                    sentenceCount >= 8 ? 4 : 
                    sentenceCount >= 6 ? 3 : 
                    sentenceCount >= 4 ? 3 : 
                    sentenceCount >= 2 ? 2 : 1;
  
  console.log(`=== AI 문장 선택 로직 시작 ===`);
  console.log(`전체 문장 수: ${sentenceCount}`);
  console.log(`빈칸 개수: ${blankCount}`);
  
  if (sentenceCount < blankCount) {
    throw new Error(`문장 수(${sentenceCount})가 필요한 빈칸 수(${blankCount})보다 적습니다.`);
  }
  
  // AI 프롬프트 생성 (개선된 버전)
  const prompt = `You are an English exam generator. Read the following ${sentenceCount} sentences.

Your task is to:
1. Select ${blankCount} important sentences for blank-fill questions.
2. These sentences should be replaced with blank lines: "(____________________A____________________)", "(____________________B____________________)", etc.
3. Return the selected sentence indices and the sentences themselves.

Rules:
- Select exactly ${blankCount} sentences.
- Choose sentences that are educationally valuable and contextually important.
- Do NOT select adjacent sentences (e.g., if sentences 1,2,3,4,5,6 exist, do not select 1&2, or 2&3, etc.).
- Prioritize sentences with clear meaning and appropriate length.
- Choose sentences that are not too complex structurally.

Output format (JSON only, no other text):
{
  "selectedIndices": [selected_sentence_indices],
  "selectedSentences": [selected_sentences]
}

Sentences:
${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

  try {
    const response = await callOpenAIAPI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3
    });
    
    const data = await response.json();
    console.log('=== AI 원본 응답 ===');
    console.log('AI 응답:', data.choices[0].message.content);
    
    const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('JSON 매칭 실패. AI 응답:', data.choices[0].message.content);
      throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    }
    
    console.log('추출된 JSON:', jsonMatch[0]);
    const result = JSON.parse(jsonMatch[0]);
    console.log('파싱된 결과:', result);
    
    // 검증
    if (!result.selectedIndices || !result.selectedSentences || 
        !Array.isArray(result.selectedIndices) || !Array.isArray(result.selectedSentences)) {
      throw new Error('AI 응답 형식이 올바르지 않습니다.');
    }
    
    if (result.selectedIndices.length !== blankCount) {
      throw new Error(`AI가 ${blankCount}개 문장을 선택하지 않았습니다.`);
    }
    
    // 인덱스 정렬
    result.selectedIndices.sort((a: number, b: number) => a - b);
    result.selectedSentences.sort((a: string, b: string) => {
      const indexA = result.selectedIndices.indexOf(sentences.indexOf(a));
      const indexB = result.selectedIndices.indexOf(sentences.indexOf(b));
      return indexA - indexB;
    });
    
    console.log(`=== AI 문장 선택 완료 ===`);
    console.log(`선택된 인덱스: [${result.selectedIndices.join(', ')}]`);
    console.log(`선택된 문장 수: ${result.selectedSentences.length}`);
    console.log(`선택된 문장들:`, result.selectedSentences);
    
    return result;
    
  } catch (error) {
    console.error('AI 문장 선택 실패, 로컬 로직으로 대체:', error);
    
    // AI 실패 시 로컬 로직으로 대체
    const selectedIndices: number[] = [];
    const selectedSentences: string[] = [];
    
    // 첫 번째 문장 선택 (인덱스 0)
    selectedIndices.push(0);
    selectedSentences.push(sentences[0]);
    
    // 두 번째 문장 선택 (인덱스 2)
    if (blankCount >= 2) {
      selectedIndices.push(2);
      selectedSentences.push(sentences[2]);
    }
    
    // 세 번째 문장 선택 (인덱스 4)
    if (blankCount >= 3) {
      selectedIndices.push(4);
      selectedSentences.push(sentences[4]);
    }
    
    return { selectedIndices, selectedSentences };
  }
};

// 빈칸 채우기 문장 문제 생성 함수
export const generateBlankFillSentenceQuizWithAI = async (passage: string): Promise<BlankFillSentenceData> => {
  // 문장 개수 확인
  const sentences = splitSentences(passage);
  const { validSentences, skippedSentences } = filterValidSentences(sentences);
  
  console.log('문장 분석 결과:', {
    전체문장수: sentences.length,
    유효문장수: validSentences.length,
    제외문장수: skippedSentences.length,
    제외된문장들: skippedSentences.map((s: string) => `${s.substring(0, 30)}... (${countWordsInSentence(s)}개 단어)`)
  });
  
  if (validSentences.length < 2) {
    throw new Error('유효한 문장이 2개 미만입니다. 더 긴 본문을 입력해주세요.');
  }
  
  // 문장 선택 로직 실행
  // AI 문장 선택 시도
  let selectedIndices: number[] = [];
  let selectedSentences: string[] = [];
  
  // AI 문장 선택 재활성화 (더 많은 빈칸 생성을 위해)
  try {
    const result = await selectSentencesForBlanksWithAI(validSentences);
    selectedIndices = result.selectedIndices;
    selectedSentences = result.selectedSentences;
    console.log('=== AI 문장 선택 성공 ===');
    console.log('AI 선택 결과:', { selectedIndices, selectedSentences });
  } catch (error) {
    console.error('=== AI 문장 선택 실패 (의도적) ===', error);
    console.log('로컬 로직으로 대체...');
    
    // 강제로 문장 선택 (로컬 로직)
    const blankCount = validSentences.length >= 10 ? 5 : 
                      validSentences.length >= 8 ? 4 : 
                      validSentences.length >= 6 ? 3 : 
                      validSentences.length >= 4 ? 3 : 
                      validSentences.length >= 2 ? 2 : 1;
    console.log('로컬 빈칸 개수:', blankCount);
    console.log('유효한 문장들:', validSentences);
    
    selectedIndices = [];
    selectedSentences = [];
    
    // 안전한 문장 선택 로직
    if (blankCount >= 1 && validSentences[0]) {
      selectedIndices.push(0);
      selectedSentences.push(validSentences[0]);
      console.log('로컬 1번째 문장 선택:', validSentences[0]);
    }
    
    if (blankCount >= 2) {
      // 두 번째 문장: 가능한 한 중간 지점 선택
      const secondIndex = Math.min(2, validSentences.length - 1);
      if (validSentences[secondIndex]) {
        selectedIndices.push(secondIndex);
        selectedSentences.push(validSentences[secondIndex]);
        console.log(`로컬 2번째 문장 선택 (인덱스 ${secondIndex}):`, validSentences[secondIndex]);
      }
    }
    
    if (blankCount >= 3) {
      // 세 번째 문장: 가능한 한 마지막에 가까운 지점 선택
      const thirdIndex = Math.min(4, validSentences.length - 1);
      if (validSentences[thirdIndex] && !selectedIndices.includes(thirdIndex)) {
        selectedIndices.push(thirdIndex);
        selectedSentences.push(validSentences[thirdIndex]);
        console.log(`로컬 3번째 문장 선택 (인덱스 ${thirdIndex}):`, validSentences[thirdIndex]);
      } else if (validSentences.length > 2) {
        // 대안: 마지막 문장 선택
        const lastIndex = validSentences.length - 1;
        if (!selectedIndices.includes(lastIndex)) {
          selectedIndices.push(lastIndex);
          selectedSentences.push(validSentences[lastIndex]);
          console.log(`로컬 3번째 문장 선택 (마지막 인덱스 ${lastIndex}):`, validSentences[lastIndex]);
        }
      }
    }
    
    if (blankCount >= 4) {
      // 네 번째 문장: 중간 지점 선택
      const fourthIndex = Math.min(6, validSentences.length - 1);
      if (validSentences[fourthIndex] && !selectedIndices.includes(fourthIndex)) {
        selectedIndices.push(fourthIndex);
        selectedSentences.push(validSentences[fourthIndex]);
        console.log(`로컬 4번째 문장 선택 (인덱스 ${fourthIndex}):`, validSentences[fourthIndex]);
      } else {
        // 대안: 사용 가능한 문장 중 선택
        for (let i = 0; i < validSentences.length; i++) {
          if (!selectedIndices.includes(i)) {
            selectedIndices.push(i);
            selectedSentences.push(validSentences[i]);
            console.log(`로컬 4번째 문장 선택 (대안 인덱스 ${i}):`, validSentences[i]);
            break;
          }
        }
      }
    }
    
    if (blankCount >= 5) {
      // 다섯 번째 문장: 마지막에 가까운 지점 선택
      const fifthIndex = Math.min(8, validSentences.length - 1);
      if (validSentences[fifthIndex] && !selectedIndices.includes(fifthIndex)) {
        selectedIndices.push(fifthIndex);
        selectedSentences.push(validSentences[fifthIndex]);
        console.log(`로컬 5번째 문장 선택 (인덱스 ${fifthIndex}):`, validSentences[fifthIndex]);
      } else {
        // 대안: 사용 가능한 문장 중 선택
        for (let i = validSentences.length - 1; i >= 0; i--) {
          if (!selectedIndices.includes(i)) {
            selectedIndices.push(i);
            selectedSentences.push(validSentences[i]);
            console.log(`로컬 5번째 문장 선택 (대안 인덱스 ${i}):`, validSentences[i]);
            break;
          }
        }
      }
    }
    
    console.log('로컬 선택 결과:', { selectedIndices, selectedSentences });
  }
  
  console.log('=== 문장 선택 디버깅 ===');
  console.log('선택된 인덱스:', selectedIndices);
  console.log('선택된 문장들:', selectedSentences);
  
  // 빈칸이 포함된 텍스트 생성
  let blankedText = passage;
  if (selectedSentences.length > 0) {
    selectedSentences.forEach((sentence, index) => {
      console.log(`빈칸 ${index + 1} 생성 시도:`, sentence);
      
      if (sentence && sentence.trim().length > 0) {
        // 문장을 빈칸으로 교체 (정확한 매칭을 위해 정규식 사용)
        const escapedSentence = sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedSentence, 'g');
        const beforeReplace = blankedText;
        // 패키지#01과 동일한 형식의 빈칸 생성 (언더스코어 30개)
        const blankText = `(______________________________)`;
        
        blankedText = blankedText.replace(regex, blankText);
        
        console.log(`빈칸 ${index + 1} 생성 결과:`, {
          원본문장: sentence,
          교체전: beforeReplace.substring(0, 100) + '...',
          교체후: blankedText.substring(0, 100) + '...',
          교체됨: beforeReplace !== blankedText
        });
      } else {
        console.warn(`빈칸 ${index + 1} 생성 실패: 빈 문장`);
      }
    });
  } else {
    console.error('선택된 문장이 없어서 빈칸을 생성할 수 없습니다!');
  }
  
  console.log('빈칸 생성 결과:', {
    원본텍스트: passage.substring(0, 200) + '...',
    빈칸텍스트: blankedText.substring(0, 200) + '...',
    선택된문장수: selectedSentences.length,
    선택된문장들: selectedSentences
  });
  
  // 번역은 별도 함수로 처리
  console.log('번역 시작...');
  const translation = await translateToKorean(passage);
  
  const result: BlankFillSentenceData = {
    blankedText,
    correctAnswers: selectedSentences,
    translation,
    userAnswers: [],
    isCorrect: null
  };
  
  console.log('최종 결과:', result);
  return result;
};

// 답안 텍스트 생성 함수
export const createAnswerText = (quiz: BlankQuizData): string => {
  return quiz.correctAnswers.map((answer, index) => `${index + 1}. ${answer}`).join('\n');
};

// 빈칸 개수를 세는 함수
export const countBlanks = (text: string): number => {
  // 20개 언더스코어 + 알파벳 + 20개 언더스코어 패턴 매칭
  const blankMatches = text.match(/\(_{20,}[A-Z]_{20,}\)/g);
  return blankMatches ? blankMatches.length : 0;
};