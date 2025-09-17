import { Paragraph, Quiz, AIParagraphResponse } from '../types/types';
import { divideParagraphsWithAI } from '../services/aiParagraphService';

// B, C, D의 가능한 모든 순열 생성
function getAllPermutations(arr: string[]): string[][] {
  if (arr.length === 1) return [arr];
  const result: string[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const perm of getAllPermutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// 객관식 선택지 4개 생성 (정답 포함)
function generateChoices(correct: string[], allPerms: string[][]): { choices: string[][], answerIndex: number } {
  // 정답을 포함한 4개 선택지 랜덤 추출
  const perms = allPerms.map(p => p.join('-'));
  const correctStr = correct.join('-');
  const otherPerms = perms.filter(p => p !== correctStr);
  // 랜덤하게 3개 선택
  const shuffled = otherPerms.sort(() => Math.random() - 0.5).slice(0, 3);
  const allChoices = [correctStr, ...shuffled];
  // 다시 섞어서 정답 위치 무작위화
  const finalChoices = allChoices.sort(() => Math.random() - 0.5);
  const answerIndex = finalChoices.indexOf(correctStr);
  // 문자열 배열로 변환
  return {
    choices: finalChoices.map(s => s.split('-')),
    answerIndex
  };
}

// 의미 단위로 4개 단락으로 나누는 함수 (AI 우선, 실패 시 규칙 기반)
export async function splitIntoParagraphs(text: string, useAI: boolean = false): Promise<string[]> {
  // AI 기반 분할 시도
  if (useAI) {
    try {
      const aiResult: AIParagraphResponse = await divideParagraphsWithAI(text);
      if (aiResult.success && aiResult.paragraphs && aiResult.paragraphs.length === 4) {
        console.log('✅ AI 기반 분할 성공');
        return aiResult.paragraphs;
      } else {
        console.log('⚠️ AI 분할 실패, 규칙 기반으로 폴백');
      }
    } catch (error) {
      console.error('❌ AI 분할 오류:', error);
    }
  }

  // 규칙 기반 분할 (개선된 로직)
  return splitIntoParagraphsWithRules(text);
}

// AI 기반 섞기 결과를 가져오는 함수 (새로 추가)
export async function getAIShuffledParagraphs(text: string): Promise<string[] | null> {
  try {
    const aiResult: AIParagraphResponse = await divideParagraphsWithAI(text);
    if (aiResult.success && aiResult.shuffledParagraphs && aiResult.shuffledParagraphs.length === 4) {
      console.log('✅ AI 기반 섞기 결과 사용');
      return aiResult.shuffledParagraphs;
    }
  } catch (error) {
    console.error('❌ AI 섞기 오류:', error);
  }
  return null;
}

// 규칙 기반 단락 분할 (개선된 로직)
function splitIntoParagraphsWithRules(text: string): string[] {
  console.log('📝 규칙 기반 단락 분할 시작...');
  
  // 1. 문장 단위로 정확하게 쪼개기 (마침표, 느낌표, 물음표 기준)
  const sentences = text
    .replace(/\n/g, ' ') // 줄바꿈을 공백으로 변환
    .replace(/\s+/g, ' ') // 여러 공백을 하나로 정리
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z])/) // 마침표/느낌표/물음표 뒤 + 공백 + 대문자로 시작하는 다음 문장
    .map(s => s.trim())
    .filter(s => s.length > 5); // 너무 짧은 문장 제거

  console.log('🔍 문장 분리 결과:', sentences.length, '개 문장');
  console.log('📄 각 문장:', sentences.map((s, i) => `${i+1}. ${s.substring(0, 50)}...`));

  // 2. 문장 수가 4개 미만이면 에러
  if (sentences.length < 4) {
    console.warn('⚠️ 문장 수가 부족합니다:', sentences.length, '개 (최소 4개 필요)');
    throw new Error(`본문을 4개의 의미있는 단락으로 나눌 수 없습니다. 더 긴 본문을 입력해주세요. (현재 ${sentences.length}개 문장)`);
  }

  // 3. 의미 단위로 4개 단락 분할
  const paragraphs: string[] = [];
  
  // 문장을 4개 단락으로 정확하게 분할
  const totalSentences = sentences.length;
  const baseSentencesPerParagraph = Math.floor(totalSentences / 4);
  const extraSentences = totalSentences % 4;
  
  console.log('📊 단락별 문장 수 계산:');
  console.log('- 총 문장 수:', totalSentences);
  console.log('- 기본 문장 수:', baseSentencesPerParagraph);
  console.log('- 추가 문장 수:', extraSentences);
  
  let sentenceIndex = 0;
  
  for (let i = 0; i < 4; i++) {
    // 앞쪽 단락에 추가 문장을 하나씩 더 배정
    const sentencesInThisParagraph = baseSentencesPerParagraph + (i < extraSentences ? 1 : 0);
    
    if (sentencesInThisParagraph > 0) {
      const paragraphSentences = sentences.slice(sentenceIndex, sentenceIndex + sentencesInThisParagraph);
      
      // 문장들을 하나로 합치고 마침표 정리
      const paragraph = paragraphSentences
        .map(s => s.trim())
        .join(' ')
        .replace(/\s+/g, ' ') // 여러 공백 정리
        .trim();
      
      paragraphs.push(paragraph);
      
      console.log(`📄 단락 ${i+1}: ${sentencesInThisParagraph}개 문장 - ${paragraph.substring(0, 80)}...`);
      
      sentenceIndex += sentencesInThisParagraph;
    }
  }

  console.log('✅ 규칙 기반 단락 분할 완료:', paragraphs.length, '개 단락');
  return paragraphs;
}

// 단락을 섞는 함수 (더 강화된 섞기 로직)
export function shuffleParagraphs(paragraphs: Paragraph[]): Paragraph[] {
  let attempts = 0;
  const maxAttempts = 200; // 시도 횟수 증가
  
  while (attempts < maxAttempts) {
    const shuffled = [...paragraphs];
    
    // 더 적극적인 섞기: 최소 4번은 섞기
    for (let i = 0; i < 4; i++) {
      const idx1 = Math.floor(Math.random() * shuffled.length);
      const idx2 = Math.floor(Math.random() * shuffled.length);
      if (idx1 !== idx2) {
        [shuffled[idx1], shuffled[idx2]] = [shuffled[idx2], shuffled[idx1]];
      }
    }
    
    // 섞기 조건 검증: 최소 3개가 원래 위치에 있으면 안됨
    if (isValidShuffle(shuffled)) {
      console.log(`✅ ${attempts + 1}번째 시도로 유효한 섞기 결과 발견`);
      return shuffled;
    }
    
    attempts++;
  }
  
  // 최대 시도 횟수 초과 시 강제 섞기 반환
  console.warn('⚠️ 섞기 조건을 만족하는 결과를 찾지 못했습니다. 강제 섞기를 사용합니다.');
  return forceShuffle(paragraphs);
}

// 강제 섞기 함수 (새로 추가)
function forceShuffle(paragraphs: Paragraph[]): Paragraph[] {
  const shuffled = [...paragraphs];
  
  // 모든 단락을 완전히 섞기
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // 만약 여전히 너무 많은 단락이 원래 위치에 있다면 추가 섞기
  let correctPositions = 0;
  for (let i = 0; i < shuffled.length; i++) {
    if (shuffled[i].originalOrder === i) {
      correctPositions++;
    }
  }
  
  if (correctPositions > 2) {
    // 추가로 2번 더 섞기
    for (let i = 0; i < 2; i++) {
      const idx1 = Math.floor(Math.random() * shuffled.length);
      const idx2 = Math.floor(Math.random() * shuffled.length);
      if (idx1 !== idx2) {
        [shuffled[idx1], shuffled[idx2]] = [shuffled[idx2], shuffled[idx1]];
      }
    }
  }
  
  return shuffled;
}

// 섞기 결과가 유효한지 검증하는 함수 (수정된 로직)
function isValidShuffle(shuffled: Paragraph[]): boolean {
  let correctPositions = 0;
  
  for (let i = 0; i < shuffled.length; i++) {
    if (shuffled[i].originalOrder === i) {
      correctPositions++;
    }
  }
  
  // 섞기 품질 기준:
  // - 4개 모두 원래 위치: 너무 쉬움 (불량)
  // - 3개 원래 위치: 너무 쉬움 (불량)  
  // - 2개 원래 위치: 적당함 (양호)
  // - 1개 원래 위치: 좋음 (우수)
  // - 0개 원래 위치: 완벽함 (우수)
  return correctPositions <= 2;
}

// 문제 생성 함수 (AI 옵션 추가)
export async function createQuiz(text: string, useAI: boolean = false): Promise<Quiz> {
  const paragraphTexts = await splitIntoParagraphs(text, useAI);
  
  if (paragraphTexts.length < 4) {
    throw new Error('본문을 4개의 의미있는 단락으로 나눌 수 없습니다. 더 긴 본문을 입력해주세요.');
  }

  console.log('📝 단락 분할 결과:', paragraphTexts.length, '개 단락');
  console.log('🔍 각 단락 길이:', paragraphTexts.map(p => p.length));

  // 1. 4개 단락을 모두 섞기 (AI 우선, 실패 시 개선된 섞기 로직 사용)
  const allParagraphs = paragraphTexts.map((content, idx) => ({
    id: `paragraph-${idx}`,
    content: content.trim(),
    originalOrder: idx, // 원본 순서 (0, 1, 2, 3)
    label: '', // 임시
  }));
  
  let shuffledParagraphs: Paragraph[];
  
  if (useAI) {
    // AI 기반 섞기 시도
    console.log('🤖 AI 기반 섞기 시도...');
    const aiShuffledTexts = await getAIShuffledParagraphs(text);
    if (aiShuffledTexts) {
      // AI가 섞인 텍스트를 기반으로 섞인 단락 객체 생성
      console.log('✅ AI 섞기 결과 적용:', aiShuffledTexts.length, '개 단락');
      
      // AI가 섞인 순서대로 단락들을 재배치
      shuffledParagraphs = aiShuffledTexts.map((content, idx) => {
        // 원본 단락에서 해당 내용을 찾아 originalOrder 설정
        const originalIndex = paragraphTexts.findIndex(p => p.trim() === content.trim());
        if (originalIndex === -1) {
          console.warn('⚠️ AI가 생성한 단락을 원본에서 찾을 수 없음:', content.substring(0, 50));
          // 폴백: 원본 순서 사용
          return allParagraphs[idx];
        }
        return {
          id: `paragraph-${originalIndex}`,
          content: content.trim(),
          originalOrder: originalIndex,
          label: '', // 임시
        };
      });
      
      console.log('🤖 AI 섞기 완료 - 섞인 순서:', shuffledParagraphs.map(p => p.originalOrder));
    } else {
      console.log('⚠️ AI 섞기 실패, 개선된 섞기 로직 사용');
      shuffledParagraphs = shuffleParagraphs(allParagraphs);
    }
  } else {
    // 규칙 기반 분할 시 개선된 섞기 로직 사용
    console.log('🔄 규칙 기반 섞기 시작...');
    shuffledParagraphs = shuffleParagraphs(allParagraphs);
  }
  
  // 섞기 결과 검증
  const originalOrder = allParagraphs.map(p => p.originalOrder);
  const shuffledOrder = shuffledParagraphs.map(p => p.originalOrder);
  let correctPositions = 0;
  
  for (let i = 0; i < shuffledOrder.length; i++) {
    if (shuffledOrder[i] === i) {
      correctPositions++;
    }
  }
  
  console.log('📊 섞기 결과 분석:');
  console.log('- 원래 순서:', originalOrder);
  console.log('- 섞인 순서:', shuffledOrder);
  console.log('- 원래 위치에 있는 단락 수:', correctPositions);
  console.log('- 섞기 품질:', correctPositions <= 2 ? '✅ 양호' : '⚠️ 개선 필요');
  
  // 2. 섞인 순서대로 A, B, C, D 라벨 부여 (사용자 요구사항)
  const labels = ['A', 'B', 'C', 'D'];
  const labeledShuffled = shuffledParagraphs.map((p, i) => ({ ...p, label: labels[i] }));
  
  // 3. 원본 순서대로 라벨링된 단락 (정답 확인용)
  // 섞인 순서에서 각 단락의 원본 순서를 찾아서 정답 순서 생성
  const correctOrder = [];
  for (let i = 0; i < 4; i++) {
    // 원본 순서 i에 해당하는 단락을 섞인 순서에서 찾기
    const foundParagraph = labeledShuffled.find(p => p.originalOrder === i);
    if (foundParagraph) {
      correctOrder.push(foundParagraph.label);
    }
  }
  
  console.log('🎯 정답 순서 생성:');
  console.log('- 섞인 순서 (라벨):', labeledShuffled.map(p => p.label));
  console.log('- 원본 순서 (라벨):', correctOrder);
  
  // 4. 4지선다 선택지 생성 (그 중 하나는 원본문 순서와 동일)
  const allPerms = getAllPermutations(['A', 'B', 'C', 'D']);
  const { choices, answerIndex } = generateChoices(correctOrder, allPerms);

  return {
    id: `quiz-${Date.now()}`, // 고유 ID 생성
    originalText: text,
    paragraphs: labeledShuffled, // 섞인 순서대로 라벨링된 단락들
    shuffledParagraphs: labeledShuffled, // 섞인 순서대로 라벨링된 단락들
    correctOrder, // 원본 순서대로 라벨링된 순서 (정답)
    choices, // 4지선다 선택지들
    answerIndex, // 정답 인덱스
  };
}

// 정답 확인 함수
export function checkAnswer(quiz: Quiz, userOrder: string[]): boolean {
  return JSON.stringify(quiz.correctOrder) === JSON.stringify(userOrder);
}

// 전화번호 포맷팅 함수
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // 숫자만 추출
  const numbers = phoneNumber.replace(/\D/g, '');
  
  // 11자리인 경우 (010-0000-0000)
  if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  }
  
  // 10자리인 경우 (02-000-0000)
  if (numbers.length === 10) {
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  
  // 그 외의 경우는 원본 반환
  return phoneNumber;
}

// 전화번호 입력 시 자동 포맷팅 함수
export function formatPhoneInput(value: string): string {
  // 숫자만 추출
  const numbers = value.replace(/\D/g, '');
  
  // 11자리 제한
  const limitedNumbers = numbers.slice(0, 11);
  
  // 포맷팅 적용
  if (limitedNumbers.length <= 3) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 7) {
    return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3)}`;
  } else {
    return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3, 7)}-${limitedNumbers.slice(7)}`;
  }
} 