import { callOpenAI, translateToKorean } from './common';

// 이미지를 텍스트로 변환하는 함수
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
  
  const response = await callOpenAI({
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

// 인접하지 않은 문장을 선택하는 헬퍼 함수
// 연이어서 나오는 두 문장이 선택되지 않도록 보장 (원본 문장 배열 기준으로 인덱스 차이가 최소 2 이상)
// 0번째-1번째, 1번째-2번째 등 인덱스 차이가 1인 문장은 절대 같이 선택되지 않음
// validSentences는 필터링된 배열이므로, 원본 sentences 배열의 인덱스를 기준으로 인접 여부를 확인해야 함
const selectNonAdjacentSentences = (
  validSentences: string[],
  blankCount: number,
  originalSentences: string[],
  validToOriginalIndexMap: number[]
): { selectedIndices: number[], selectedSentences: string[] } => {
  const selectedIndices: number[] = []; // validSentences 배열의 인덱스
  const selectedSentences: string[] = [];
  const totalValidSentences = validSentences.length;
  const totalOriginalSentences = originalSentences.length;
  
  if (totalValidSentences === 0 || blankCount === 0) {
    return { selectedIndices, selectedSentences };
  }
  
  // 빈칸 개수가 유효 문장 수보다 많거나 같으면 모든 문장 선택 (인접 체크 불가)
  if (blankCount >= totalValidSentences) {
    for (let i = 0; i < totalValidSentences; i++) {
      selectedIndices.push(i);
      selectedSentences.push(validSentences[i]);
    }
    return { selectedIndices, selectedSentences };
  }
  
  // 원본 문장 배열 기준으로 인접하지 않게 선택할 수 있는지 확인
  // 원본 문장 배열에서 최대 선택 가능한 개수 계산 (최소 간격 2 필요: 0, 2, 4, 6... 또는 1, 3, 5, 7...)
  const maxPossible = Math.ceil(totalOriginalSentences / 2);
  if (blankCount > maxPossible) {
    console.warn(`빈칸 개수(${blankCount})가 너무 많아 원본 기준으로 인접하지 않게 선택할 수 없습니다. 최대 ${maxPossible}개만 선택합니다.`);
    blankCount = Math.min(blankCount, maxPossible);
  }
  
  // 원본 인덱스 기준으로 선택할 문장 찾기
  const selectedOriginalIndices: number[] = [];
  
  // 사용 가능한 원본 인덱스 목록 (유효한 문장만)
  const availableOriginalIndices = validToOriginalIndexMap.slice();
  
  // 인접 체크 헬퍼 함수: 선택된 인덱스들과의 차이가 최소 2 이상인지 확인
  const isNonAdjacentToSelected = (originalIdx: number, selected: number[]): boolean => {
    return selected.every(selectedIdx => Math.abs(originalIdx - selectedIdx) >= 2);
  };
  
  console.log('인접하지 않은 문장 선택 로직 (원본 기준, 인덱스 차이 최소 2):', {
    원본문장수: totalOriginalSentences,
    유효문장수: totalValidSentences,
    빈칸개수: blankCount,
    사용가능한원본인덱스: availableOriginalIndices
  });
  
  // 첫 번째 문장: 첫 번째 유효 문장 선택
  if (availableOriginalIndices.length > 0) {
    const firstOriginalIndex = availableOriginalIndices[0];
    selectedOriginalIndices.push(firstOriginalIndex);
    selectedIndices.push(0);
    selectedSentences.push(validSentences[0]);
    console.log(`첫 번째 문장 선택 (원본 인덱스 ${firstOriginalIndex}):`, validSentences[0].substring(0, 50) + '...');
  }
  
  // 나머지 문장 선택: 원본 인덱스 기준으로 인접하지 않게 (차이 최소 2)
  for (let i = 1; i < blankCount; i++) {
    let found = false;
    
    // 사용 가능한 모든 원본 인덱스를 확인하여 인접하지 않은 것 찾기
    for (const originalIdx of availableOriginalIndices) {
      // 이미 선택된 인덱스는 제외
      if (selectedOriginalIndices.includes(originalIdx)) {
        continue;
      }
      
      // 선택된 모든 인덱스와의 차이가 최소 2 이상인지 확인
      if (isNonAdjacentToSelected(originalIdx, selectedOriginalIndices)) {
        const validIdx = validToOriginalIndexMap.indexOf(originalIdx);
        if (validIdx !== -1) {
          selectedOriginalIndices.push(originalIdx);
          selectedIndices.push(validIdx);
          selectedSentences.push(validSentences[validIdx]);
          console.log(`문장 ${i + 1} 선택 (원본 인덱스 ${originalIdx}, 유효 인덱스 ${validIdx}):`, validSentences[validIdx].substring(0, 50) + '...');
          found = true;
          break;
        }
      }
    }
    
    // 인접하지 않은 문장을 찾지 못한 경우
    if (!found) {
      console.warn(`⚠️ 인접하지 않은 문장 ${i + 1}을 찾을 수 없습니다. 최소 간격을 유지하며 선택합니다.`);
      // 최후의 수단: 마지막 선택 인덱스 + 2 이상인 것 중 선택
      const lastOriginalIndex = selectedOriginalIndices[selectedOriginalIndices.length - 1];
      for (let j = lastOriginalIndex + 2; j < totalOriginalSentences; j++) {
        if (!selectedOriginalIndices.includes(j)) {
          const validIdx = validToOriginalIndexMap.indexOf(j);
          if (validIdx !== -1) {
            selectedOriginalIndices.push(j);
            selectedIndices.push(validIdx);
            selectedSentences.push(validSentences[validIdx]);
            console.log(`대안 문장 ${i + 1} 선택 (원본 인덱스 ${j}, 유효 인덱스 ${validIdx}):`, validSentences[validIdx].substring(0, 50) + '...');
            found = true;
            break;
          }
        }
      }
      
      // 여전히 못 찾으면 에러
      if (!found) {
        console.error(`❌ 인접하지 않은 문장 ${i + 1}을 선택할 수 없습니다.`);
        break;
      }
    }
  }
  
  // 원본 인덱스 기준으로 정렬
  const sortedPairs = selectedIndices.map((idx, i) => ({
    validIndex: idx,
    originalIndex: validToOriginalIndexMap[idx],
    sentence: selectedSentences[i]
  })).sort((a, b) => a.originalIndex - b.originalIndex);
  
  const sortedIndices = sortedPairs.map(p => p.validIndex);
  const sortedSentences = sortedPairs.map(p => p.sentence);
  const sortedOriginalIndices = sortedPairs.map(p => p.originalIndex);
  
  // 최종 검증: 원본 인덱스 기준으로 인접 체크 (차이가 1인 경우가 있는지 확인)
  const isNonAdjacent = sortedOriginalIndices.every((idx, i) => 
    i === 0 || Math.abs(idx - sortedOriginalIndices[i - 1]) >= 2
  );
  
  // 인접한 쌍이 있는지 확인
  const adjacentPairs: number[][] = [];
  for (let i = 1; i < sortedOriginalIndices.length; i++) {
    const diff = Math.abs(sortedOriginalIndices[i] - sortedOriginalIndices[i - 1]);
    if (diff === 1) {
      adjacentPairs.push([sortedOriginalIndices[i - 1], sortedOriginalIndices[i]]);
    }
  }
  
  console.log('인접하지 않은 문장 선택 완료 (원본 기준):', {
    선택된유효인덱스: sortedIndices,
    선택된원본인덱스: sortedOriginalIndices,
    선택된문장수: sortedSentences.length,
    원본기준인접체크통과: isNonAdjacent,
    원본인덱스차이: sortedOriginalIndices.slice(1).map((idx, i) => idx - sortedOriginalIndices[i]),
    인접한쌍: adjacentPairs.length > 0 ? adjacentPairs : '없음'
  });
  
  if (!isNonAdjacent || adjacentPairs.length > 0) {
    console.error('❌ 인접한 문장이 선택되었습니다!', {
      인접한쌍: adjacentPairs,
      선택된원본인덱스: sortedOriginalIndices
    });
    throw new Error(`인접한 문장이 선택되었습니다: ${adjacentPairs.map(p => `${p[0]}-${p[1]}`).join(', ')}`);
  }
  
  return { 
    selectedIndices: sortedIndices, 
    selectedSentences: sortedSentences 
  };
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
  
  // 원본 전체 문장 배열 저장 (validSentences와 sentences 인덱스 매핑용)
  const originalSentences = splitSentences(passage);
  
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
    
    // AI가 선택한 결과를 원본 기준으로 검증 (인접하지 않은지 확인)
    const aiSelectedOriginalIndices = selectedIndices.map(idx => validToOriginalIndexMap[idx]).sort((a, b) => a - b);
    const isNonAdjacent = aiSelectedOriginalIndices.every((idx, i) => 
      i === 0 || Math.abs(idx - aiSelectedOriginalIndices[i - 1]) >= 2
    );
    
    if (!isNonAdjacent) {
      console.warn('⚠️ AI가 선택한 문장 중 일부가 원본 기준으로 인접합니다:', {
        유효인덱스: selectedIndices,
        원본인덱스: aiSelectedOriginalIndices,
        인덱스차이: aiSelectedOriginalIndices.slice(1).map((idx, i) => idx - aiSelectedOriginalIndices[i])
      });
      console.warn('로컬 로직으로 재선택합니다...');
      throw new Error('AI 선택 결과가 인접 문장을 포함함');
    } else {
      console.log('✅ AI 선택 결과 원본 기준 인접 체크 통과:', {
        유효인덱스: selectedIndices,
        원본인덱스: aiSelectedOriginalIndices,
        인덱스차이: aiSelectedOriginalIndices.slice(1).map((idx, i) => idx - aiSelectedOriginalIndices[i])
      });
    }
  } catch (error) {
    console.error('=== AI 문장 선택 실패 또는 인접 문장 포함 ===', error);
    console.log('로컬 로직으로 대체...');
    
    // 강제로 문장 선택 (로컬 로직) - 인접하지 않은 문장 선택 (원본 기준)
    // 원본 문장 수를 기준으로 빈칸 개수 결정 (인접하지 않게 선택 가능한 최대 개수)
    // 5개 문장: 최대 3개 (1-3-5) 또는 2개 (1-3, 1-4, 1-5, 2-4, 2-5)
    let blankCount: number;
    if (originalSentences.length >= 10) {
      blankCount = 5;
    } else if (originalSentences.length >= 8) {
      blankCount = 4;
    } else if (originalSentences.length >= 6) {
      blankCount = 3;
    } else if (originalSentences.length === 5) {
      // 5개 문장: 최대 3개 (1-3-5) 또는 2개만 선택
      blankCount = 3; // 1-3-5 패턴
    } else if (originalSentences.length >= 4) {
      blankCount = 2; // 4개 문장: 1-3 또는 2-4
    } else if (originalSentences.length >= 2) {
      blankCount = 1; // 2-3개 문장: 1개만 선택
    } else {
      blankCount = 1;
    }
    
    // 유효 문장 수가 빈칸 개수보다 적으면 조정
    if (blankCount > validSentences.length) {
      blankCount = validSentences.length;
    }
    
    console.log('로컬 빈칸 개수 결정:', {
      원본문장수: originalSentences.length,
      유효문장수: validSentences.length,
      결정된빈칸개수: blankCount
    });
    console.log('유효한 문장들:', validSentences);
    console.log('원본 문장 수:', originalSentences.length);
    console.log('매핑 정보:', validToOriginalIndexMap);
    
    // 인접하지 않은 문장 선택 로직 사용 (원본 기준)
    const localResult = selectNonAdjacentSentences(
      validSentences, 
      blankCount, 
      originalSentences, 
      validToOriginalIndexMap
    );
    selectedIndices = localResult.selectedIndices;
    selectedSentences = localResult.selectedSentences;
    
    console.log('로컬 선택 결과 (인접하지 않은 문장, 원본 기준):', { selectedIndices, selectedSentences });
  }
  
  console.log('=== 문장 선택 디버깅 ===');
  console.log('선택된 인덱스:', selectedIndices);
  console.log('선택된 문장들:', selectedSentences);
  
  // 빈칸이 포함된 텍스트 생성
  let blankedText = passage;
  
  // 정렬된 문장 순서 저장용 변수
  let sortedSelectedSentences = selectedSentences;
  
  if (selectedSentences.length > 0) {
    // validToOriginalIndexMap은 이미 위에서 선언되었으므로 재사용
    
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

// 한국어로 번역하는 함수 (common.ts에서 import하여 사용)
// export const translateToKorean = ... (제거됨)

// AI를 사용한 문장 선택 로직
export const selectSentencesForBlanksWithAI = async (sentences: string[]): Promise<{ selectedIndices: number[], selectedSentences: string[] }> => {
  const sentenceCount = sentences.length;
  
  // 문장 수에 따른 빈칸 개수 결정 (개선된 로직)
  // 5개 문장: 최대 3개 (1-3-5) 또는 2개만 선택
  // 원본 문장 수 기준으로 계산 (validSentences가 아닌 원본 기준)
  // 하지만 이 함수는 validSentences만 받으므로, 여기서는 validSentences 기준으로 계산
  // 실제 원본 기준 검증은 호출하는 쪽에서 수행
  const blankCount = sentenceCount >= 10 ? 5 : 
                    sentenceCount >= 8 ? 4 : 
                    sentenceCount >= 6 ? 3 : 
                    sentenceCount === 5 ? 3 : // 5개 문장: 최대 3개 (1-3-5)
                    sentenceCount >= 4 ? 2 : // 4개 문장: 2개 (1-3 또는 2-4)
                    sentenceCount >= 2 ? 1 : 1; // 2-3개 문장: 1개만
  
  console.log(`=== AI 문장 선택 로직 시작 ===`);
  console.log(`전체 문장 수: ${sentenceCount}`);
  console.log(`빈칸 개수: ${blankCount}`);
  
  if (sentenceCount < blankCount) {
    throw new Error(`문장 수(${sentenceCount})가 필요한 빈칸 수(${blankCount})보다 적습니다.`);
  }
  
  // AI 프롬프트 생성 (개선된 버전 - 수능 수준)
  const prompt = `You are an English exam generator for the Korean College Scholastic Ability Test (수능, CSAT) level. Read the following ${sentenceCount} sentences.

Your task is to:
1. Select ${blankCount} important sentences for blank-fill questions at the **Korean high school CSAT level**.
2. These sentences will be replaced with blank lines in the format "(A___)", "(B___)", etc., where the number of underscores is determined dynamically based on each sentence's length.
3. Return the selected sentence indices and the sentences themselves.

Rules:
- Select exactly ${blankCount} sentences.
- Choose sentences that are educationally valuable and contextually important at the **Korean CSAT level**.
- Prioritize sentences that require contextual understanding and inference skills typical of CSAT exams.
- Do NOT select adjacent sentences (e.g., if sentences 1,2,3,4,5,6 exist, do not select 1&2, or 2&3, etc.).
- Prioritize sentences with clear meaning and appropriate length that match CSAT difficulty.
- Choose sentences that are not too complex structurally but require analytical thinking.

Output format (JSON only, no other text):
{
  "selectedIndices": [selected_sentence_indices],
  "selectedSentences": [selected_sentences]
}

Sentences:
${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

  try {
    const response = await callOpenAI({
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
    
    // AI 실패 시 로컬 로직으로 대체 - 인접하지 않은 문장 선택
    // selectSentencesForBlanksWithAI는 validSentences만 받으므로, 
    // 여기서는 validSentences를 원본으로 간주하고 처리
    // (실제로는 generateBlankQuizWithAI에서 원본 기준으로 처리됨)
    const localResult = selectNonAdjacentSentences(
      sentences, 
      blankCount, 
      sentences, // 원본과 동일
      sentences.map((_, i) => i) // 매핑도 동일
    );
    return localResult;
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
    
    // 원본 전체 문장 배열 저장 (validSentences와 sentences 인덱스 매핑용)
    const originalSentences = splitSentences(passage);
    
    // validSentences의 인덱스를 originalSentences(sentences)의 인덱스로 변환
    const validToOriginalIndexMap: number[] = [];
    let validIndex = 0;
    for (let i = 0; i < originalSentences.length; i++) {
      const wordCount = countWordsInSentence(originalSentences[i]);
      if (wordCount >= 5) {
        validToOriginalIndexMap[validIndex] = i;
        validIndex++;
      }
    }
    
    // 강제로 문장 선택 (로컬 로직) - 인접하지 않은 문장 선택 (원본 기준)
    // 원본 문장 수를 기준으로 빈칸 개수 결정
    let blankCount: number;
    if (originalSentences.length >= 10) {
      blankCount = 5;
    } else if (originalSentences.length >= 8) {
      blankCount = 4;
    } else if (originalSentences.length >= 6) {
      blankCount = 3;
    } else if (originalSentences.length === 5) {
      // 5개 문장: 최대 3개 (1-3-5) 또는 2개만 선택
      blankCount = 3; // 1-3-5 패턴
    } else if (originalSentences.length >= 4) {
      blankCount = 2; // 4개 문장: 1-3 또는 2-4
    } else if (originalSentences.length >= 2) {
      blankCount = 1; // 2-3개 문장: 1개만 선택
    } else {
      blankCount = 1;
    }
    
    // 유효 문장 수가 빈칸 개수보다 적으면 조정
    if (blankCount > validSentences.length) {
      blankCount = validSentences.length;
    }
    
    console.log('로컬 빈칸 개수 결정:', {
      원본문장수: originalSentences.length,
      유효문장수: validSentences.length,
      결정된빈칸개수: blankCount
    });
    console.log('유효한 문장들:', validSentences);
    console.log('원본 문장 수:', originalSentences.length);
    console.log('매핑 정보:', validToOriginalIndexMap);
    
    // 인접하지 않은 문장 선택 로직 사용 (원본 기준)
    const localResult = selectNonAdjacentSentences(
      validSentences, 
      blankCount, 
      originalSentences, 
      validToOriginalIndexMap
    );
    selectedIndices = localResult.selectedIndices;
    selectedSentences = localResult.selectedSentences;
    
    console.log('로컬 선택 결과 (인접하지 않은 문장, 원본 기준):', { selectedIndices, selectedSentences });
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