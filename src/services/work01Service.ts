/**
 * Work_01 (문단 순서 맞추기) 문제 생성 로직
 * 원본: src/utils/textProcessor.ts의 createQuiz 함수
 * 
 * 이 파일은 원본 utils/textProcessor.ts에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { Paragraph, Quiz, AIParagraphResponse } from '../types/types';
import { divideParagraphsWithAI } from './aiParagraphService';
import { callOpenAI, addVarietyToPrompt, getProblemGenerationTemperature } from './common';

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

// 모의고사 형식용: A, B, C의 가능한 모든 순열 생성 (A-B-C 제외)
function getExamPermutations(): string[][] {
  const arr = ['A', 'B', 'C'];
  const allPerms = getAllPermutations(arr);
  // A-B-C 순서 제외
  return allPerms.filter(perm => perm.join('-') !== 'A-B-C');
}

// 객관식 선택지 4개 생성 (정답 포함)
function generateChoices(correct: string[], allPerms: string[][]): { choices: string[][], answerIndex: number } {
  // 금지된 순서: A-B-C-D, A-B-D-C
  const forbiddenOrders = ['A-B-C-D', 'A-B-D-C'];
  
  // 정답 문자열 생성
  const correctStr = correct.join('-');
  
  // 정답이 금지된 순서인지 확인
  if (forbiddenOrders.includes(correctStr)) {
    throw new Error('정답이 금지된 순서(A-B-C-D 또는 A-B-D-C)입니다. 단락을 다시 섞어주세요.');
  }
  
  // 모든 순열을 문자열로 변환
  const perms = allPerms.map(p => p.join('-'));
  
  // 정답과 금지된 순서를 제외한 나머지 순열 필터링
  const validPerms = perms.filter(p => {
    const isCorrect = p === correctStr;
    const isForbidden = forbiddenOrders.includes(p);
    return !isCorrect && !isForbidden;
  });
  
  // 유효한 순열이 최소 3개 이상인지 확인 (정답 1개 + 오답 3개 = 4개 선택지)
  if (validPerms.length < 3) {
    throw new Error('선택지를 생성할 수 없습니다. 금지된 순서를 제외한 후 충분한 순열이 없습니다.');
  }
  
  // 랜덤하게 3개 오답 선택
  const shuffled = validPerms.sort(() => Math.random() - 0.5).slice(0, 3);
  
  // 정답과 오답 3개를 합쳐서 4개 선택지 생성
  const allChoices = [correctStr, ...shuffled];
  
  // 선택지 위치 무작위화
  const finalChoices = allChoices.sort(() => Math.random() - 0.5);
  const answerIndex = finalChoices.indexOf(correctStr);
  
  // 최종 확인: 금지된 순서가 포함되어 있지 않은지 재확인
  const hasForbiddenOrder = finalChoices.some(choice => forbiddenOrders.includes(choice));
  if (hasForbiddenOrder) {
    console.error('❌ 최종 선택지에 금지된 순서가 포함되어 있습니다:', finalChoices);
    throw new Error('선택지 생성 중 오류가 발생했습니다. 금지된 순서가 포함되었습니다.');
  }
  
  // 문자열 배열로 변환하여 반환
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

  // 규칙 기반 분할 (문장 개수 기준)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  console.log('📝 총 문장 수:', sentences.length);

  if (sentences.length < 4) {
    throw new Error('본문이 너무 짧습니다. 최소 4개 문장이 필요합니다.');
  }

  const sentencesPerParagraph = Math.floor(sentences.length / 4);
  const remainder = sentences.length % 4;
  
  const paragraphs: string[] = [];
  let sentenceIndex = 0;
  
  for (let i = 0; i < 4; i++) {
    const currentSentences = sentencesPerParagraph + (i < remainder ? 1 : 0);
    const paragraphSentences = sentences.slice(sentenceIndex, sentenceIndex + currentSentences);
    paragraphs.push(paragraphSentences.join('. ').trim() + '.');
    sentenceIndex += currentSentences;
  }

  console.log('✅ 규칙 기반 분할 완료:', paragraphs.length, '개 단락');
  return paragraphs;
}

// 개선된 섞기 로직 (원본과 최대한 다르게)
function shuffleParagraphs(paragraphs: Paragraph[]): Paragraph[] {
  const shuffled = [...paragraphs];
  let attempts = 0;
  const maxAttempts = 50;
  
  do {
    // Fisher-Yates 셔플
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    attempts++;
    
    // 원본과 충분히 다른지 확인 (원래 위치에 있는 단락이 2개 이하)
    const correctPositions = shuffled.filter((p, i) => p.originalOrder === paragraphs[i].originalOrder).length;
    if (correctPositions <= 2) {
      break;
    }
  } while (attempts < maxAttempts);
  
  console.log(`🔄 섞기 완료 (${attempts}번 시도)`);
  return shuffled;
}

// AI 기반 섞기 함수
async function getAIShuffledParagraphs(text: string): Promise<string[] | null> {
  try {
    const prompt = `아래 영어 본문을 **대한민국 고등학교 교육과정 수학능력평가(수능) 수준**의 문장 순서 맞추기 문제를 만들기 위해 4개의 의미있는 단락으로 나누고, 각 단락을 원본과 다른 순서로 재배치해주세요.

요구사항:
1. 본문을 4개의 의미있는 단락으로 나누기 (수능 수준의 텍스트 구조 이해 필요)
2. 각 단락의 내용은 원본과 동일하게 유지
3. 단락 순서를 원본과 다르게 재배치 (논리적 흐름을 평가할 수 있는 수준)
4. 각 단락을 개행으로 구분하여 출력
5. 수능에서 출제될 수 있는 수준의 논리적 연결 관계를 가진 단락 구성

영어 본문:
${text}`;

    // 다양성 추가
    const enhancedPrompt = addVarietyToPrompt(prompt);
    const temperature = getProblemGenerationTemperature(0.7);

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: enhancedPrompt }],
      max_tokens: 1500,
      temperature: temperature
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // 개행으로 분할하고 빈 줄 제거
    const paragraphs = content.split('\n').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
    
    if (paragraphs.length === 4) {
      console.log('✅ AI 섞기 성공');
      return paragraphs;
    } else {
      console.log('⚠️ AI 섞기 결과가 4개 단락이 아님:', paragraphs.length);
      return null;
    }
  } catch (error) {
    console.error('❌ AI 섞기 오류:', error);
    return null;
  }
}

// 단락별 한글 번역 생성 함수
async function translateParagraph(paragraphContent: string): Promise<string> {
  try {
    const prompt = `다음 영어 단락을 정확하고 자연스러운 한국어로 번역해주세요. 문맥과 의미를 정확히 전달하도록 번역해주세요.

영어 단락:
${paragraphContent}

번역 시 주의사항:
- 원문의 의미를 정확히 전달
- 자연스러운 한국어 표현 사용
- 전문 용어는 적절히 번역
- 번역문만 출력 (추가 설명 없이)`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `API 오류: ${response.status}`;
      
      // 401 에러인 경우 더 명확한 메시지 제공
      if (response.status === 401) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = `API 인증 실패: ${errorData.error.message}`;
          }
        } catch (e) {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        console.error('❌ 단락 번역 인증 오류:', errorMessage);
        console.error('💡 API 키를 확인해주세요. 번역 없이 진행합니다.');
      } else {
        console.error('❌ 단락 번역 오류:', errorMessage);
      }
      
      // 번역 실패 시 원문 반환 (문제 생성은 계속 진행)
      return `[번역 실패: ${errorMessage}] ${paragraphContent}`;
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ 단락 번역 응답 형식 오류');
      return `[번역 실패: 응답 형식 오류] ${paragraphContent}`;
    }
    
    const translation = data.choices[0].message.content.trim();
    console.log('✅ 단락 번역 완료');
    return translation;
  } catch (error: any) {
    console.error('❌ 단락 번역 오류:', error);
    // 번역 실패 시에도 문제 생성은 계속되도록 원문 반환
    return `[번역 실패: ${error.message || '알 수 없는 오류'}] ${paragraphContent}`;
  }
}

/**
 * Work_01: 문단 순서 맞추기 문제 생성 (모의고사 형식)
 * @param text - 영어 본문
 * @param useAI - AI 사용 여부
 * @returns 생성된 퀴즈 데이터
 */
export async function generateWork01ExamQuiz(text: string, useAI: boolean = false): Promise<Quiz> {
  console.log('🔍 Work_01 모의고사 형식 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', text.length);
  console.log('🤖 AI 사용 여부:', useAI);

  try {
    const paragraphTexts = await splitIntoParagraphs(text, useAI);
    
    if (paragraphTexts.length < 4) {
      throw new Error('본문을 4개의 의미있는 단락으로 나눌 수 없습니다. 더 긴 본문을 입력해주세요.');
    }

    console.log('📝 단락 분할 결과:', paragraphTexts.length, '개 단락');
    console.log('🔍 각 단락 길이:', paragraphTexts.map(p => p.length));

    // 첫 번째 단락은 고정
    const fixedParagraph = paragraphTexts[0].trim();
    const remainingParagraphs = paragraphTexts.slice(1, 4); // 나머지 3개 단락

    console.log('📌 고정된 첫 번째 단락:', fixedParagraph.substring(0, 50) + '...');
    console.log('📝 나머지 3개 단락:', remainingParagraphs.map(p => p.substring(0, 30) + '...'));

    // 나머지 3개 단락을 객체로 변환
    const remainingParagraphObjects = remainingParagraphs.map((content, idx) => ({
      id: `paragraph-${idx + 1}`,
      content: content.trim(),
      originalOrder: idx, // 원본에서의 순서 (1, 2, 3)
      label: '', // 임시
    }));

    // 나머지 3개 단락 섞기
    type RemainingParagraph = { id: string; content: string; originalOrder: number; label: string; };
    let shuffledRemaining: RemainingParagraph[];
    let reshuffleAttempts = 0;
    const maxReshuffleAttempts = 10;
    const forbiddenOrder = 'A-B-C';

    // 정답 순서가 A-B-C가 되지 않도록 재섞기
    do {
      // 모의고사 형식용 간단한 섞기 함수
      const shuffled = [...remainingParagraphObjects];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      shuffledRemaining = shuffled;
      
      // 라벨 부여 (A, B, C)
      const labels = ['A', 'B', 'C'];
      const labeledShuffled = shuffledRemaining.map((p, i) => ({ ...p, label: labels[i] }));
      
      // 정답 순서 계산 (원본 순서대로)
      const correctOrder: string[] = [];
      for (let i = 0; i < 3; i++) {
        const foundParagraph = labeledShuffled.find(p => p.originalOrder === i);
        if (foundParagraph) {
          correctOrder.push(foundParagraph.label);
        }
      }
      
      const correctOrderStr = correctOrder.join('-');
      
      // 정답이 A-B-C인지 확인
      if (correctOrderStr === forbiddenOrder) {
        console.log(`⚠️ 정답 순서 "${correctOrderStr}"가 금지된 순서입니다. 다시 섞는 중... (시도 ${reshuffleAttempts + 1}/${maxReshuffleAttempts})`);
        reshuffleAttempts++;
        
        if (reshuffleAttempts >= maxReshuffleAttempts) {
          throw new Error('금지된 순서를 피하여 문제를 생성할 수 없습니다. 본문을 다시 입력하거나 다른 본문을 사용해주세요.');
        }
      } else {
        // 금지된 순서가 아니면 루프 종료
        break;
      }
    } while (reshuffleAttempts < maxReshuffleAttempts);

    // 최종 라벨 부여
    const labels = ['A', 'B', 'C'];
    const labeledShuffled = shuffledRemaining.map((p, i) => ({ ...p, label: labels[i] }));

    // 정답 순서 계산 (원본 순서대로)
    const correctOrder: string[] = [];
    for (let i = 0; i < 3; i++) {
      const foundParagraph = labeledShuffled.find(p => p.originalOrder === i);
      if (foundParagraph) {
        correctOrder.push(foundParagraph.label);
      }
    }

    console.log('🎯 정답 순서 생성:', correctOrder.join('-'));

    // 각 단락별 한글 번역 생성
    console.log('🌐 각 단락별 번역 생성 시작...');
    const [fixedTranslation, ...remainingTranslations] = await Promise.all([
      translateParagraph(fixedParagraph),
      ...labeledShuffled.map(paragraph => translateParagraph(paragraph.content))
    ]);

    const translatedParagraphs = labeledShuffled.map((paragraph, idx) => ({
      ...paragraph,
      translation: remainingTranslations[idx]
    }));

    console.log('✅ 모든 단락 번역 완료');

    // 선택지 생성 (A-B-C 제외)
    const allPerms = getExamPermutations();
    const correctStr = correctOrder.join('-');
    
    // 정답과 금지된 순서를 제외한 나머지 순열 필터링
    const validPerms = allPerms.map(p => p.join('-')).filter(p => p !== correctStr);
    
    if (validPerms.length < 3) {
      throw new Error('선택지를 생성할 수 없습니다. 충분한 순열이 없습니다.');
    }
    
    // 랜덤하게 3개 오답 선택
    const shuffled = validPerms.sort(() => Math.random() - 0.5).slice(0, 3);
    const allChoices = [correctStr, ...shuffled];
    
    // 선택지 위치 무작위화
    const finalChoices = allChoices.sort(() => Math.random() - 0.5);
    const answerIndex = finalChoices.indexOf(correctStr);
    const choices = finalChoices.map(s => s.split('-'));

    // 정답 순서대로 번역 생성
    const correctOrderTranslations = correctOrder
      .map(paragraphLabel => {
        const paragraph = translatedParagraphs.find(p => p.label === paragraphLabel);
        const translation = paragraph?.translation || '';
        if (translation && !translation.includes('[번역 실패')) {
          return translation;
        }
        return null;
      })
      .filter((t): t is string => t !== null && t.length > 0);
    
    const paragraphTranslations = correctOrderTranslations.length > 0
      ? correctOrderTranslations.join('\n\n')
      : '';

    const result: Quiz = {
      id: `quiz-${Date.now()}`,
      originalText: text,
      shuffledParagraphs: translatedParagraphs,
      choices,
      answerIndex,
      correctOrder,
      translation: paragraphTranslations,
      format: 'exam', // 모의고사 형식
      fixedParagraph: fixedParagraph,
      fixedParagraphTranslation: fixedTranslation,
      instruction: '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.'
    };

    console.log('✅ Work_01 모의고사 형식 문제 생성 완료:', result);
    return result;
  } catch (error) {
    console.error('❌ Work_01 모의고사 형식 문제 생성 실패:', error);
    throw error;
  }
}

/**
 * Work_01: 문단 순서 맞추기 문제 생성 (일반 형식)
 * @param text - 영어 본문
 * @param useAI - AI 사용 여부
 * @returns 생성된 퀴즈 데이터
 */
export async function generateWork01Quiz(text: string, useAI: boolean = false): Promise<Quiz> {
  console.log('🔍 Work_01 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', text.length);
  console.log('🤖 AI 사용 여부:', useAI);

  try {
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
    
    // 금지된 순서 확인 및 재섞기 로직
    let labeledShuffled = shuffledParagraphs.map((p, i) => ({ ...p, label: labels[i] }));
    let correctOrder = [];
    let reshuffleAttempts = 0;
    const maxReshuffleAttempts = 10;
    const forbiddenOrders = ['A-B-C-D', 'A-B-D-C'];
    
    // 정답 순서가 금지된 순서인지 확인하고, 금지된 순서면 다시 섞기
    do {
      // 정답 순서 계산 (라벨 부여 후)
      correctOrder = [];
      for (let i = 0; i < 4; i++) {
        const foundParagraph = labeledShuffled.find(p => p.originalOrder === i);
        if (foundParagraph) {
          correctOrder.push(foundParagraph.label);
        }
      }
      
      const correctOrderStr = correctOrder.join('-');
      
      // 정답 순서가 금지된 순서인지 확인
      if (forbiddenOrders.includes(correctOrderStr)) {
        console.log(`⚠️ 정답 순서 "${correctOrderStr}"가 금지된 순서입니다. 다시 섞는 중... (시도 ${reshuffleAttempts + 1}/${maxReshuffleAttempts})`);
        
        // 다시 섞기
        shuffledParagraphs = shuffleParagraphs(allParagraphs);
        labeledShuffled = shuffledParagraphs.map((p, i) => ({ ...p, label: labels[i] }));
        reshuffleAttempts++;
        
        if (reshuffleAttempts >= maxReshuffleAttempts) {
          throw new Error('금지된 순서를 피하여 문제를 생성할 수 없습니다. 본문을 다시 입력하거나 다른 본문을 사용해주세요.');
        }
      } else {
        // 금지된 순서가 아니면 루프 종료
        break;
      }
    } while (reshuffleAttempts < maxReshuffleAttempts);
    
    if (reshuffleAttempts > 0) {
      console.log(`✅ ${reshuffleAttempts}번 재섞기 후 유효한 정답 순서 생성: ${correctOrder.join('-')}`);
    }
    
    // 2-1. 각 단락별 한글 번역 생성
    console.log('🌐 각 단락별 번역 생성 시작...');
    const translatedParagraphs = await Promise.all(
      labeledShuffled.map(async (paragraph) => {
        const translation = await translateParagraph(paragraph.content);
        return { ...paragraph, translation };
      })
    );
    console.log('✅ 모든 단락 번역 완료');
    
    // 3. 원본 순서대로 라벨링된 단락 (정답 확인용) - 이미 위에서 계산됨
    console.log('🎯 정답 순서 생성:');
    console.log('- 섞인 순서 (라벨):', translatedParagraphs.map(p => p.label));
    console.log('- 원본 순서 (라벨):', correctOrder);
    
    // 4. 4지선다 선택지 생성 (그 중 하나는 원본문 순서와 동일)
    const allPerms = getAllPermutations(['A', 'B', 'C', 'D']);
    const { choices, answerIndex } = generateChoices(correctOrder, allPerms);

    // 5. 전체 본문 번역 생성 (기존 호환성을 위해)
    console.log('🌐 전체 본문 번역 생성 시작...');
    const fullTranslation = await translateParagraph(text);
    console.log('✅ 전체 본문 번역 완료');
    
    // 6. 정답 순서대로 번역을 \n\n으로 구분된 문자열로 생성 (Work_01과 동일한 방식)
    // 번역 실패 메시지를 필터링하고, 성공한 번역만 조합
    const correctOrderTranslations = correctOrder
      .map(paragraphLabel => {
        const paragraph = translatedParagraphs.find(p => p.label === paragraphLabel);
        const translation = paragraph?.translation || '';
        // 번역 실패 메시지가 포함된 경우 제외
        if (translation && !translation.includes('[번역 실패')) {
          return translation;
        }
        return null;
      })
      .filter((t): t is string => t !== null && t.length > 0);
    
    const paragraphTranslations = correctOrderTranslations.length > 0
      ? correctOrderTranslations.join('\n\n')
      : ''; // 모든 번역이 실패한 경우 빈 문자열
    console.log('✅ 정답 순서대로 단락별 번역 문자열 생성 완료:', {
      성공한_번역_수: correctOrderTranslations.length,
      전체_단락_수: correctOrder.length
    });

    const result: Quiz = {
      id: `quiz-${Date.now()}`, // 고유 ID 생성
      originalText: text,
      paragraphs: translatedParagraphs, // 섞인 순서대로 라벨링되고 번역된 단락들
      shuffledParagraphs: translatedParagraphs, // 섞인 순서대로 라벨링되고 번역된 단락들
      correctOrder, // 원본 순서대로 라벨링된 순서 (정답)
      choices, // 4지선다 선택지들
      answerIndex, // 정답 인덱스
      translation: paragraphTranslations, // 단락별 번역을 \n\n으로 구분된 문자열 (Work_01과 동일한 방식)
      format: 'normal', // 일반 형식
      instruction: '문제 : 다음 단락들을 의미에 맞게 가장 적절히 배열한 것을 고르세요.'
    };

    console.log('✅ Work_01 문제 생성 완료:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Work_01 문제 생성 실패:', error);
    throw error;
  }
}

// 정답 확인 함수
export function checkAnswer(quiz: Quiz, userOrder: string[]): boolean {
  return JSON.stringify(quiz.correctOrder) === JSON.stringify(userOrder);
}
