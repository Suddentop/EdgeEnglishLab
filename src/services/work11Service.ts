/**
 * Work_11 (본문 문장별 해석) 문제 생성 로직
 * 원본: src/components/work/Work_11_SentenceTranslation/Work_11_SentenceTranslation.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI, translateToKorean } from './common';

/**
 * 문장별 해석 문제 타입 정의
 */
export interface SentenceTranslationQuiz {
  sentences: string[];
  translations: string[];
  quizText: string;
}

/**
 * 유형#11: 본문 문장별 해석 문제 생성
 * @param englishText - 영어 본문
 * @returns 문장별 해석 문제 데이터
 */
export async function generateWork11Quiz(englishText: string): Promise<SentenceTranslationQuiz> {
  console.log('🔍 Work_11 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', englishText.length);

  try {
    console.log('📝 문장별 해석 문제 생성 시작');
    
    // 영어 텍스트를 문장 단위로 분리 (약어 보호)
    let processedText = englishText;
    
    // 일반적인 약어들을 임시로 보호 (마침표를 특수 문자로 치환)
    const abbreviations = [
      'e.g.', 'i.e.', 'etc.', 'vs.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.',
      'U.S.', 'U.K.', 'U.S.A.', 'Ph.D.', 'B.A.', 'M.A.', 'Inc.', 'Corp.',
      'Ltd.', 'Co.', 'St.', 'Ave.', 'Blvd.', 'Rd.', 'Jr.', 'Sr.',
      'A.D.', 'B.C.', 'C.E.', 'B.C.E.'
    ];
    
    // 약어의 마침표를 임시 문자로 치환
    abbreviations.forEach(abbr => {
      const regex = new RegExp(abbr.replace('.', '\\.'), 'gi');
      processedText = processedText.replace(regex, abbr.replace(/\./g, '§§§'));
    });
    
    // 숫자 패턴 보호 (예: 1.5, 2.3, 10.25 등)
    processedText = processedText.replace(/\b\d+\.\d+\b/g, (match) => {
      return match.replace(/\./g, '§§§');
    });
    
    // 인용문을 고려한 문장 분리 (원본 Work_11과 동일한 로직)
    const sentences: string[] = [];
    let currentSentence = '';
    let inQuotes = false;
    let quoteCount = 0;
    
    for (let i = 0; i < processedText.length; i++) {
      const char = processedText[i];
      const nextChar = processedText[i + 1];
      
      if (char === '"') {
        quoteCount++;
        inQuotes = quoteCount % 2 === 1; // 홀수면 인용문 시작, 짝수면 인용문 끝
        currentSentence += char;
      } else if (/[.!?]/.test(char)) {
        currentSentence += char;
        
        // 인용문 밖에서 마침표/느낌표/물음표를 만나면 문장 분리
        if (!inQuotes) {
          if (currentSentence.trim().length > 0) {
            sentences.push(currentSentence.trim());
          }
          currentSentence = '';
        } else {
          // 인용문 안에서 마침표를 만난 경우, 다음 문자가 따옴표인지 확인
          if (nextChar === '"') {
            // 마침표 다음에 따옴표가 오면 인용문이 끝나는 것
            // 따옴표까지 포함해서 현재 문장에 추가하고 문장 분리
            currentSentence += nextChar;
            i++; // 따옴표 문자를 건너뛰기
            
            if (currentSentence.trim().length > 0) {
              sentences.push(currentSentence.trim());
            }
            currentSentence = '';
            inQuotes = false; // 인용문 상태 초기화
          }
        }
      } else {
        currentSentence += char;
      }
    }
    
    // 마지막 문장 처리
    if (currentSentence.trim().length > 0) {
      sentences.push(currentSentence.trim());
    }
    
    // 임시 문자를 다시 마침표로 복원
    sentences.forEach((sentence, index) => {
      sentences[index] = sentence.replace(/§§§/g, '.');
    });
    
    console.log(`📊 총 ${sentences.length}개 문장으로 분리됨`);
    
    // 각 문장을 번역
    const translations: string[] = [];
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      console.log(`🔄 문장 ${i + 1}/${sentences.length} 번역 중...`);
      
      try {
        const translation = await translateToKorean(sentence);
        translations.push(translation);
      } catch (error) {
        console.error(`문장 ${i + 1} 번역 실패:`, error);
        translations.push(`번역 실패: ${sentence}`);
      }
    }
    
    // 퀴즈 텍스트 생성 (문장 번호와 함께)
    let quizText = '';
    sentences.forEach((sentence, index) => {
      quizText += `(${index + 1}) ${sentence}\n`;
    });
    
    const result: SentenceTranslationQuiz = {
      sentences,
      translations,
      quizText: quizText.trim()
    };
    
    console.log('✅ Work_11 문제 생성 완료:', result);
    return result;

  } catch (error) {
    console.error('❌ Work_11 문제 생성 실패:', error);
    throw error;
  }
}
