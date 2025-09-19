/**
 * 유형#11 동적 페이지네이션 유틸리티
 * A4 템플릿에 컨테이너를 포함 가능한 공간을 정하고,
 * 전체 본문과 컨테이너 여백을 계산해서 1페이지에 몇개의 컨테이너를 넣을 지 정한 뒤,
 * 그 만큼의 컨테이너를 넣어 1페이지를 PDF페이지를 생성하고,
 * 다음 새로운 A4템플릿을 가지고 새로운 페이지를 만들어 포함가능한 공간을 계산하고,
 * 이전 페이지에 포함된 컨테이너들을 제외한 나머지 컨테이너들의 높이를 계산해서
 * 새 A4템플릿에 포함가능한 템플릿을 배치하여 PDF페이지를 생성하는 작업을 반복
 */

// A4 페이지 설정 상수
const A4_PAGE_CONFIG = {
  WIDTH: 21, // cm
  HEIGHT: 29.7, // cm
  MARGIN_TOP: 1, // cm
  MARGIN_BOTTOM: 1, // cm
  MARGIN_LEFT: 1, // cm
  MARGIN_RIGHT: 1, // cm
  HEADER_HEIGHT: 1.5, // cm
  CONTENT_AREA_HEIGHT: 26.2, // cm (29.7 - 1.5 - 1 - 1)
};

// 컨테이너 설정 상수
const CONTAINER_CONFIG = {
  PADDING: 0.5, // cm
  MARGIN_BOTTOM: 0.5, // cm
  MIN_HEIGHT: 2, // cm (최소 높이)
  FONT_SIZE: 0.4, // cm (1rem ≈ 0.4cm)
  LINE_HEIGHT: 1.5, // 배수
  CHAR_WIDTH_ENGLISH: 0.25, // cm (영어 문자 폭)
  CHAR_WIDTH_KOREAN: 0.4, // cm (한글 문자 폭)
};

// 문제 설명 영역 설정
const PROBLEM_INSTRUCTION_CONFIG = {
  HEIGHT: 2, // cm
  MARGIN_BOTTOM: 0.8, // cm
};

export interface SentenceData {
  sentence: string;
  translation: string;
  index: number;
}

export interface ContainerInfo {
  data: SentenceData;
  height: number; // cm 단위
  width: number; // cm 단위
}

export interface PageLayout {
  pageNumber: number;
  containers: ContainerInfo[];
  totalHeight: number; // cm 단위
  availableHeight: number; // cm 단위
  isFull: boolean;
}

export interface PaginationResult {
  pages: PageLayout[];
  totalPages: number;
  totalContainers: number;
  averageContainersPerPage: number;
}

/**
 * 텍스트 높이 계산 함수
 * @param text 텍스트 내용
 * @param isEnglish 영어인지 여부
 * @param maxWidth 최대 폭 (cm)
 * @returns 계산된 높이 (cm)
 */
function calculateTextHeight(
  text: string,
  isEnglish: boolean = true,
  maxWidth: number = A4_PAGE_CONFIG.WIDTH - A4_PAGE_CONFIG.MARGIN_LEFT - A4_PAGE_CONFIG.MARGIN_RIGHT - CONTAINER_CONFIG.PADDING * 2
): number {
  const charWidth = isEnglish ? CONTAINER_CONFIG.CHAR_WIDTH_ENGLISH : CONTAINER_CONFIG.CHAR_WIDTH_KOREAN;
  const lineHeight = CONTAINER_CONFIG.FONT_SIZE * CONTAINER_CONFIG.LINE_HEIGHT;
  
  // 한 줄당 들어갈 수 있는 문자 수 계산
  const charsPerLine = Math.floor(maxWidth / charWidth);
  
  // 필요한 줄 수 계산
  const lines = Math.ceil(text.length / charsPerLine);
  
  // 최소 1줄은 보장
  const finalLines = Math.max(1, lines);
  
  return finalLines * lineHeight;
}

/**
 * 개별 컨테이너의 높이 계산
 * @param sentenceData 문장 데이터
 * @param includeAnswer 정답 포함 여부
 * @returns 컨테이너 높이 (cm)
 */
export function calculateContainerHeight(
  sentenceData: SentenceData,
  includeAnswer: boolean = false
): number {
  const { sentence, translation } = sentenceData;
  
  if (includeAnswer) {
    // 정답 모드: 한글 해석 문장 하단에 여백 추가
    let totalHeight = CONTAINER_CONFIG.PADDING + CONTAINER_CONFIG.MARGIN_BOTTOM;
    
    // 문장 번호와 문장 내용 높이
    const sentenceText = `${sentenceData.index + 1}. ${sentence}`;
    const sentenceHeight = calculateTextHeight(sentenceText, true);
    totalHeight += sentenceHeight;
    
    // 문장과 해석 사이 간격
    totalHeight += CONTAINER_CONFIG.FONT_SIZE * 0.5; // 0.5배 간격
    
    // 해석 내용 높이
    const translationText = `해석: ${translation}`;
    const translationHeight = calculateTextHeight(translationText, false);
    totalHeight += translationHeight;
    
    // 한글 해석 문장 하단 여백 추가 (0.5rem ≈ 0.3cm)
    totalHeight += CONTAINER_CONFIG.FONT_SIZE * 0.3; // 하단 여백 추가
    
    return Math.max(totalHeight, CONTAINER_CONFIG.MIN_HEIGHT);
  } else {
    // 문제 모드: 영어 문장 아래 한 줄 정도의 공간만 남기기
    let totalHeight = CONTAINER_CONFIG.PADDING + CONTAINER_CONFIG.MARGIN_BOTTOM;
    
    // 문장 번호와 문장 내용 높이
    const sentenceText = `${sentenceData.index + 1}. ${sentence}`;
    const sentenceHeight = calculateTextHeight(sentenceText, true);
    totalHeight += sentenceHeight;
    
    // 문장과 해석 사이 간격 (최소화)
    totalHeight += CONTAINER_CONFIG.FONT_SIZE * 0.3; // 0.3배 간격으로 최소화
    
    // 해석 공간을 한 줄 높이로 최소화
    totalHeight += CONTAINER_CONFIG.FONT_SIZE * 1.0; // 한 줄 정도의 공간만
    
    return Math.max(totalHeight, CONTAINER_CONFIG.MIN_HEIGHT);
  }
}

/**
 * A4 페이지의 사용 가능한 높이 계산
 * @param pageNumber 페이지 번호 (1부터 시작)
 * @returns 사용 가능한 높이 (cm)
 */
function calculateAvailableHeight(pageNumber: number): number {
  // 실제 렌더링 구조에 맞춘 정확한 높이 계산
  const A4_HEIGHT = 29.7; // A4 페이지 전체 높이
  const HEADER_HEIGHT = 1.5; // 헤더 높이
  const INSTRUCTION_HEIGHT = 1.0; // 검은색 컨테이너(문제 설명) 실제 높이
  const BOTTOM_MARGIN = 1.0; // 하단 마진
  
  // 사용 가능한 높이 = 전체 높이 - 헤더 - 문제 설명 - 하단 마진
  const availableHeight = A4_HEIGHT - HEADER_HEIGHT - INSTRUCTION_HEIGHT - BOTTOM_MARGIN;
  
  console.log(`📏 페이지 ${pageNumber} 사용 가능 높이 계산:`, {
    A4_HEIGHT,
    HEADER_HEIGHT,
    INSTRUCTION_HEIGHT,
    BOTTOM_MARGIN,
    availableHeight: availableHeight.toFixed(2) + 'cm'
  });
  
  return availableHeight;
}

/**
 * 컨테이너 정보 생성
 * @param sentences 문장 배열
 * @param translations 번역 배열
 * @param includeAnswer 정답 포함 여부
 * @returns 컨테이너 정보 배열
 */
export function createContainerInfos(
  sentences: string[],
  translations: string[],
  includeAnswer: boolean = false
): ContainerInfo[] {
  return sentences.map((sentence, index) => {
    const sentenceData: SentenceData = {
      sentence,
      translation: translations[index] || '',
      index
    };
    
    const height = calculateContainerHeight(sentenceData, includeAnswer);
    
    return {
      data: sentenceData,
      height,
      width: A4_PAGE_CONFIG.WIDTH - A4_PAGE_CONFIG.MARGIN_LEFT - A4_PAGE_CONFIG.MARGIN_RIGHT - CONTAINER_CONFIG.PADDING * 2
    };
  });
}

/**
 * 동적 페이지네이션 수행
 * @param containerInfos 컨테이너 정보 배열
 * @param includeAnswer 정답 포함 여부
 * @returns 페이지네이션 결과
 */
export function performDynamicPagination(
  containerInfos: ContainerInfo[],
  includeAnswer: boolean = false
): PaginationResult {
  const pages: PageLayout[] = [];
  let remainingContainers = [...containerInfos];
  let pageNumber = 1;
  
  console.log('🚀 동적 페이지네이션 시작:', {
    totalContainers: containerInfos.length,
    includeAnswer,
    availableHeightPerPage: calculateAvailableHeight(1)
  });
  
  while (remainingContainers.length > 0) {
    const availableHeight = calculateAvailableHeight(pageNumber);
    const pageContainers: ContainerInfo[] = [];
    let currentHeight = 0;
    
    console.log(`📄 페이지 ${pageNumber} 생성 중:`, {
      availableHeight,
      remainingContainers: remainingContainers.length
    });
    
    // 현재 페이지에 들어갈 수 있는 컨테이너들 선택
    for (let i = 0; i < remainingContainers.length; i++) {
      const container = remainingContainers[i];
      
      // 다음 컨테이너를 추가했을 때 페이지 높이를 초과하는지 확인
      // 안전 마진 없이 정확한 높이로만 판단 (더 효율적인 페이지 활용)
      if (currentHeight + container.height <= availableHeight) {
        pageContainers.push(container);
        currentHeight += container.height;
        
        console.log(`  ✅ 컨테이너 ${container.data.index + 1} 추가:`, {
          containerHeight: container.height,
          currentPageHeight: currentHeight,
          availableHeight,
          remaining: availableHeight - currentHeight
        });
      } else {
        console.log(`  ❌ 컨테이너 ${container.data.index + 1} 제외:`, {
          containerHeight: container.height,
          currentPageHeight: currentHeight,
          wouldExceedBy: (currentHeight + container.height) - availableHeight
        });
        break;
      }
    }
    
    // 페이지가 비어있지 않은 경우에만 추가
    if (pageContainers.length > 0) {
      const pageLayout: PageLayout = {
        pageNumber,
        containers: pageContainers,
        totalHeight: currentHeight,
        availableHeight,
        isFull: currentHeight >= availableHeight * 0.85 // 85% 이상 사용시 풀페이지로 간주 (완화)
      };
      
      pages.push(pageLayout);
      
      // 사용된 컨테이너들을 남은 목록에서 제거
      remainingContainers = remainingContainers.slice(pageContainers.length);
      
      console.log(`✅ 페이지 ${pageNumber} 완성:`, {
        containersCount: pageContainers.length,
        totalHeight: currentHeight,
        isFull: pageLayout.isFull,
        remainingContainers: remainingContainers.length
      });
      
      pageNumber++;
    } else {
      // 페이지에 컨테이너가 하나도 들어가지 않는 경우 (높이 부족)
      console.warn(`⚠️ 페이지 ${pageNumber}에 컨테이너를 배치할 수 없음. 남은 컨테이너를 강제로 배치합니다.`);
      
      const forcedContainer = remainingContainers[0];
      const pageLayout: PageLayout = {
        pageNumber,
        containers: [forcedContainer],
        totalHeight: forcedContainer.height,
        availableHeight,
        isFull: true
      };
      
      pages.push(pageLayout);
      remainingContainers = remainingContainers.slice(1);
      pageNumber++;
    }
  }
  
  const result: PaginationResult = {
    pages,
    totalPages: pages.length,
    totalContainers: containerInfos.length,
    averageContainersPerPage: containerInfos.length / pages.length
  };
  
  console.log('🎉 동적 페이지네이션 완료:', {
    totalPages: result.totalPages,
    totalContainers: result.totalContainers,
    averageContainersPerPage: result.averageContainersPerPage,
    pageDistribution: pages.map(p => `페이지${p.pageNumber}: ${p.containers.length}개 컨테이너 (${p.totalHeight.toFixed(2)}cm)`)
  });
  
  return result;
}

/**
 * 문장 배열로부터 직접 페이지네이션 수행 (편의 함수)
 * @param sentences 문장 배열
 * @param translations 번역 배열
 * @param includeAnswer 정답 포함 여부
 * @returns 페이지네이션 결과
 */
export function paginateSentences(
  sentences: string[],
  translations: string[],
  includeAnswer: boolean = false
): PaginationResult {
  const containerInfos = createContainerInfos(sentences, translations, includeAnswer);
  return performDynamicPagination(containerInfos, includeAnswer);
}

/**
 * 페이지 레이아웃 최적화 (빈 공간 최소화)
 * @param paginationResult 페이지네이션 결과
 * @returns 최적화된 페이지네이션 결과
 */
export function optimizePageLayout(paginationResult: PaginationResult): PaginationResult {
  const { pages } = paginationResult;
  const optimizedPages: PageLayout[] = [];
  
  console.log('🔧 페이지 레이아웃 최적화 시작');
  
  for (let i = 0; i < pages.length; i++) {
    const currentPage = pages[i];
    const nextPage = pages[i + 1];
    
    // 다음 페이지가 있고, 현재 페이지에 여유 공간이 있는 경우
    if (nextPage && nextPage.containers.length > 0) {
      const availableSpace = currentPage.availableHeight - currentPage.totalHeight;
      const nextContainer = nextPage.containers[0];
      
      // 다음 페이지의 첫 번째 컨테이너가 현재 페이지에 들어갈 수 있는지 확인
      if (availableSpace >= nextContainer.height) {
        console.log(`🔄 페이지 ${currentPage.pageNumber}에 컨테이너 ${nextContainer.data.index + 1} 이동`);
        
        // 컨테이너 이동
        currentPage.containers.push(nextContainer);
        currentPage.totalHeight += nextContainer.height;
        currentPage.isFull = currentPage.totalHeight >= currentPage.availableHeight * 0.95;
        
        nextPage.containers.shift();
        nextPage.totalHeight -= nextContainer.height;
      }
    }
    
    optimizedPages.push(currentPage);
  }
  
  const result: PaginationResult = {
    pages: optimizedPages,
    totalPages: optimizedPages.length,
    totalContainers: paginationResult.totalContainers,
    averageContainersPerPage: paginationResult.totalContainers / optimizedPages.length
  };
  
  console.log('✅ 페이지 레이아웃 최적화 완료');
  
  return result;
}

/**
 * 페이지네이션 결과 검증
 * @param result 페이지네이션 결과
 * @returns 검증 결과
 */
export function validatePaginationResult(result: PaginationResult): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 모든 컨테이너가 포함되었는지 확인
  const totalContainersInPages = result.pages.reduce((sum, page) => sum + page.containers.length, 0);
  if (totalContainersInPages !== result.totalContainers) {
    errors.push(`컨테이너 수 불일치: 페이지 합계 ${totalContainersInPages}, 전체 ${result.totalContainers}`);
  }
  
  // 각 페이지의 높이가 초과되지 않았는지 확인
  result.pages.forEach((page, index) => {
    if (page.totalHeight > page.availableHeight) {
      errors.push(`페이지 ${page.pageNumber} 높이 초과: ${page.totalHeight.toFixed(2)}cm > ${page.availableHeight.toFixed(2)}cm`);
    }
    
    // 빈 페이지 경고
    if (page.containers.length === 0) {
      warnings.push(`페이지 ${page.pageNumber}이 비어있음`);
    }
    
    // 페이지 활용도가 너무 낮은 경우 경고
    const utilization = page.totalHeight / page.availableHeight;
    if (utilization < 0.3) {
      warnings.push(`페이지 ${page.pageNumber} 활용도 낮음: ${(utilization * 100).toFixed(1)}%`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
