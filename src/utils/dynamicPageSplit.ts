// 동적 페이지 분할을 위한 유틸리티 함수들
// 유형#11과 패키지#01-유형#11에서 공통으로 사용

export interface SentenceData {
  sentence: string;
  translation?: string;
}

export interface PageSplitConfig {
  includeTranslation: boolean; // 해석 포함 여부 (정답 모드)
  pageHeight?: number; // 커스텀 페이지 높이 (기본값 사용 시 생략)
}

/**
 * A4 페이지 크기 및 여백 상수
 */
export const PAGE_CONSTANTS = {
  // 96dpi 기준 A4 크기
  A4_HEIGHT_PX: 1122,
  A4_WIDTH_PX: 794,
  
  // CSS에서 정의된 여백들 (px 변환)
  PAGE_MARGIN_CM: 1, // @page margin: 1cm
  PAGE_MARGIN_PX: 37.8, // 1cm = 37.8px (96dpi)
  
  // 헤더 관련 크기
  HEADER_MARGIN_TOP_PX: 37.8, // margin: 1cm 0 1.2rem 0
  HEADER_MARGIN_BOTTOM_PX: 19.2, // 1.2rem = 19.2px (16px 기준)
  HEADER_PADDING_PX: 25.6, // padding: 0.8rem 1.4rem (상하 0.8rem * 2)
  
  // 첫 페이지 추가 패딩
  FIRST_PAGE_PADDING_PX: 18.9, // padding-top: 0.5cm
  
  // 문제 지시문 높이 (problem-instruction)
  INSTRUCTION_HEIGHT_PX: 60, // 대략적인 높이 (font-size + padding + margin)
} as const;

/**
 * 실제 사용 가능한 페이지 높이 계산
 */
export function getUsablePageHeight(): number {
  const {
    A4_HEIGHT_PX,
    PAGE_MARGIN_PX,
    HEADER_MARGIN_TOP_PX,
    HEADER_MARGIN_BOTTOM_PX,
    HEADER_PADDING_PX,
    FIRST_PAGE_PADDING_PX,
    INSTRUCTION_HEIGHT_PX
  } = PAGE_CONSTANTS;
  
  const totalMargins = PAGE_MARGIN_PX * 2; // 상하 여백
  const headerTotalHeight = HEADER_MARGIN_TOP_PX + HEADER_MARGIN_BOTTOM_PX + HEADER_PADDING_PX;
  
  return A4_HEIGHT_PX - totalMargins - headerTotalHeight - FIRST_PAGE_PADDING_PX - INSTRUCTION_HEIGHT_PX;
}

/**
 * 문장 컨테이너의 높이 계산
 * CSS 스타일을 기반으로 정확한 높이 산출
 */
export function calculateSentenceContainerHeight(
  sentence: string, 
  translation: string | undefined, 
  includeTranslation: boolean
): number {
  // CSS에서 정의된 스타일 기반 계산
  const CONTAINER_PADDING = 16; // padding: 0.3rem 1.2rem (상하 0.3rem * 2 = 9.6px ≈ 10px)
  const CONTAINER_MARGIN_BOTTOM = 16; // margin-bottom: 1rem
  const BORDER_WIDTH = 1.5; // border: 1.5px
  
  // 문장 부분 높이 계산
  const SENTENCE_LINE_HEIGHT = 20; // line-height 기준
  const SENTENCE_FONT_SIZE = 16; // 기본 폰트 크기
  
  // 영어 문장의 예상 줄 수 계산 (한 줄당 약 70-80자 가정)
  const CHARS_PER_LINE = 75;
  const sentenceLines = Math.ceil(sentence.length / CHARS_PER_LINE);
  const sentenceHeight = sentenceLines * SENTENCE_LINE_HEIGHT;
  
  // 문장 번호 부분 높이 (sentence-header)
  const SENTENCE_NUMBER_HEIGHT = 24; // margin-bottom: 0.5rem 포함
  
  let totalHeight = CONTAINER_PADDING + SENTENCE_NUMBER_HEIGHT + sentenceHeight + CONTAINER_MARGIN_BOTTOM + BORDER_WIDTH;
  
  // 해석이 포함되는 경우 (정답 모드)
  if (includeTranslation && translation) {
    const TRANSLATION_MARGIN_TOP = 8; // margin-top: 0.5rem
    const TRANSLATION_LINE_HEIGHT = 20;
    
    // 한글 해석의 예상 줄 수 계산 (한 줄당 약 40-50자 가정)
    const KOREAN_CHARS_PER_LINE = 45;
    const translationLines = Math.ceil(translation.length / KOREAN_CHARS_PER_LINE);
    const translationHeight = translationLines * TRANSLATION_LINE_HEIGHT;
    
    totalHeight += TRANSLATION_MARGIN_TOP + translationHeight;
  }
  
  return totalHeight;
}

/**
 * 동적 페이지 분할 알고리즘
 * 문장들을 페이지 높이에 맞게 최적으로 분할
 */
export function calculateOptimalPageSplit(
  sentences: SentenceData[],
  config: PageSplitConfig = { includeTranslation: false }
): number[][] {
  const usableHeight = config.pageHeight || getUsablePageHeight();
  const pages: number[][] = [];
  let currentPage: number[] = [];
  let currentHeight = 0;
  
  console.log('📏 페이지 분할 시작:', {
    totalSentences: sentences.length,
    usableHeight,
    includeTranslation: config.includeTranslation
  });
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const containerHeight = calculateSentenceContainerHeight(
      sentence.sentence,
      sentence.translation,
      config.includeTranslation
    );
    
    // 현재 페이지에 추가할 수 있는지 확인
    // 안전 여백 10% 고려
    const safetyMargin = usableHeight * 0.1;
    const availableHeight = usableHeight - safetyMargin;
    
    if (currentHeight + containerHeight <= availableHeight) {
      // 현재 페이지에 추가
      currentPage.push(i);
      currentHeight += containerHeight;
      
      console.log(`📄 문장 ${i + 1} → 페이지 ${pages.length + 1} (높이: ${containerHeight}px, 누적: ${currentHeight}px)`);
    } else {
      // 새 페이지 시작
      if (currentPage.length > 0) {
        pages.push([...currentPage]);
        console.log(`✅ 페이지 ${pages.length} 완료: ${currentPage.length}개 문장, 총 높이: ${currentHeight}px`);
      }
      
      currentPage = [i];
      currentHeight = containerHeight;
      
      console.log(`🆕 새 페이지 ${pages.length + 1} 시작: 문장 ${i + 1} (높이: ${containerHeight}px)`);
    }
  }
  
  // 마지막 페이지 추가
  if (currentPage.length > 0) {
    pages.push(currentPage);
    console.log(`✅ 마지막 페이지 ${pages.length} 완료: ${currentPage.length}개 문장, 총 높이: ${currentHeight}px`);
  }
  
  console.log('🎯 페이지 분할 완료:', {
    totalPages: pages.length,
    distribution: pages.map((page, idx) => `페이지${idx + 1}: ${page.length}개 문장`)
  });
  
  return pages;
}

/**
 * 페이지 분할 최적화
 * 마지막 페이지가 너무 적은 문장을 가질 경우 이전 페이지와 병합 시도
 */
export function optimizePageSplit(pages: number[][], sentences: SentenceData[], config: PageSplitConfig): number[][] {
  if (pages.length <= 1) return pages;
  
  const usableHeight = config.pageHeight || getUsablePageHeight();
  const optimizedPages = [...pages];
  
  // 마지막 페이지가 1-2개 문장만 있는 경우
  const lastPage = optimizedPages[optimizedPages.length - 1];
  const secondLastPage = optimizedPages[optimizedPages.length - 2];
  
  if (lastPage.length <= 2 && secondLastPage) {
    // 이전 페이지와 병합 가능한지 확인
    const combinedHeight = [...secondLastPage, ...lastPage].reduce((total, index) => {
      return total + calculateSentenceContainerHeight(
        sentences[index].sentence,
        sentences[index].translation,
        config.includeTranslation
      );
    }, 0);
    
    const safetyMargin = usableHeight * 0.1;
    if (combinedHeight <= usableHeight - safetyMargin) {
      console.log('🔄 페이지 병합:', `페이지${optimizedPages.length - 1}과 페이지${optimizedPages.length} 병합`);
      optimizedPages[optimizedPages.length - 2] = [...secondLastPage, ...lastPage];
      optimizedPages.pop();
    }
  }
  
  return optimizedPages;
}

/**
 * 메인 함수: 문장 데이터를 받아 최적화된 페이지 분할 반환
 */
export function splitSentencesIntoPages(
  sentences: SentenceData[],
  config: PageSplitConfig = { includeTranslation: false }
): number[][] {
  const initialSplit = calculateOptimalPageSplit(sentences, config);
  return optimizePageSplit(initialSplit, sentences, config);
}
