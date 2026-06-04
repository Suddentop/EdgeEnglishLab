import React, { useMemo } from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';

interface Work11DynamicPrintPagesProps {
  sentences: string[];
  translations: string[];
  includeAnswer: boolean;
  printMode: 'no-answer' | 'with-answer';
  customHeader?: React.ReactNode;
  /** 패키지#01 연속 인쇄: 21cm 고정 대신 100% (오른쪽 잘림 방지) */
  fluidLayout?: boolean;
}

// A4 페이지 설정 (실제 A4 크기 기준, px 단위)
const A4_CONFIG = {
  PAGE_WIDTH: 794,          // px (210mm * 3.78px/mm)
  PAGE_HEIGHT: 1123,        // px (297mm * 3.78px/mm)
  TOP_MARGIN: 25,           // px (6.6mm)
  BOTTOM_MARGIN: 25,        // px (6.6mm)
  LEFT_MARGIN: 20,          // px (5.3mm)
  RIGHT_MARGIN: 20,         // px (5.3mm)
  HEADER_HEIGHT: 30,        // px (8mm)
  CONTENT_WIDTH: 754,       // px (794 - 20 - 20)
  CONTENT_HEIGHT: 1048,     // px (1123 - 25 - 25 - 30)
};

// 텍스트 높이 계산 함수 (더 정교한 계산)
const calculateContainerHeight = (text: string, padding: number = 0, fontSize: number = 16, lineHeight: number = 1.2): number => {
  if (!text || text.trim().length === 0) {
    return padding;
  }
  
  // a4-page-content의 padding: 0 1cm 1cm 1cm = 좌우 37.8px (1cm = 37.8px)
  // 컨테이너 내부 padding: 0.3rem 1rem = 좌우 16px (1rem = 16px)
  // 실제 사용 가능한 너비 = CONTENT_WIDTH - 좌우 패딩 (37.8px * 2) - 컨테이너 내부 패딩 (16px * 2)
  const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - (37.8 * 2) - (16 * 2); // 약 638px
  
  // 문자 폭 계산 (영문/숫자: 0.5 * fontSize, 한글: 0.95 * fontSize, 평균: 0.6 * fontSize)
  const charWidthPx = fontSize * 0.6;
  const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
  
  // 줄 수 계산 (최소 1줄)
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  
  // 실제 높이 = 줄 수 * 줄 높이 + 패딩
  return (lines * fontSize * lineHeight) + padding;
};

// 각 문장 컨테이너 높이 계산 (더 정교한 계산)
const calculateSentenceContainerHeight = (
  sentence: string, 
  translation: string, 
  includeAnswer: boolean,
  sentenceIndex: number
): number => {
  // 문장 번호 텍스트 (예: "1. ", "10. ", "100. ")
  const indexText = `${sentenceIndex + 1}. `;
  const sentenceText = `${indexText}${sentence}`;
  
  // 문장 텍스트 높이 (fontSize: 1rem = 16px, lineHeight: 1.2)
  const sentenceHeight = calculateContainerHeight(sentenceText, 0, 16, 1.2);
  
  // 문장 하단 마진 (marginBottom: 0.2rem = 3.2px)
  const sentenceMarginBottom = 0.2 * 16; // 3.2px
  
  // 컨테이너 내부 패딩 (padding: 0.3rem 1rem 0.2rem 1rem)
  const containerPaddingTop = 0.3 * 16; // 4.8px
  const containerPaddingBottom = 0.2 * 16; // 3.2px
  
  // 해석 영역 높이
  // 인쇄(문제)와 인쇄(정답) 페이지의 페이지 분할은 독립적으로 계산되어야 함
  // 인쇄(문제)에는 한글 해석이 없기 때문에 각 문제의 높이가 인쇄(정답)과 다름
  let translationHeight = 0;
  if (includeAnswer) {
    // 인쇄(정답) 모드: 실제 해석 텍스트 높이를 계산
    // fontSize: 0.8rem = 12.8px, lineHeight: 1.2
    translationHeight = calculateContainerHeight(translation, 0, 12.8, 1.2);
    // marginTop: 0.1rem (1.6px) + paddingBottom: 0.2rem (3.2px)
    translationHeight += (0.1 * 16) + (0.2 * 16); // 4.8px
  } else {
    // 인쇄(문제) 모드: 해석 영역이 표시되지 않으므로 최소 높이만 사용
    // CSS @media print에서 .work11-dynamic-page-template .work11-print-problem-sentence > div:last-child
    // height: 1rem !important (16px)로 오버라이드됨
    // 실제 렌더링: height: 1rem (16px) + marginTop: 0.3rem (4.8px) = 20.8px
    // 인쇄(문제) 모드에서는 CSS에서 오버라이드된 실제 높이를 사용
    // 하지만 실제로는 더 작을 수 있으므로 약간 보수적으로 계산
    translationHeight = 16 + (0.3 * 16); // 20.8px (1rem + 0.3rem)
  }
  
  // 컨테이너 하단 마진
  // CSS에서 실제 적용되는 마진: margin-bottom: 1.5rem (인쇄 모드)
  // 인라인 스타일: marginBottom: '0.5rem' (8px)
  // 하지만 CSS @media print에서 .work11-dynamic-page-template .work11-print-problem-sentence,
  // .work11-dynamic-page-template .work11-print-answer-sentence에 margin-bottom: 1.5rem이 적용됨
  // 인쇄(문제) 모드에서는 실제 렌더링과의 차이를 고려하여 약간 줄임
  const containerMarginBottom = includeAnswer 
    ? 1.5 * 16  // 인쇄(정답): 24px (CSS에서 실제 적용되는 값)
    : 1.2 * 16; // 인쇄(문제): 19.2px (실제로는 약간 작을 수 있음)
  
  // 총 높이 계산
  // 실제 렌더링과의 차이를 보정하기 위해 약간의 여유를 둠
  const totalHeight = sentenceHeight + sentenceMarginBottom + containerPaddingTop + containerPaddingBottom + translationHeight + containerMarginBottom;
  
  // 계산 오차 보정 제거: 실제 렌더링과 계산의 차이가 과대평가되고 있으므로
  // 오차 보정 없이 실제 계산값을 그대로 사용
  // (안전 마진이 이미 페이지 레벨에서 적용되므로 컨테이너 레벨에서는 불필요)
  return totalHeight;
};

const Work11DynamicPrintPages: React.FC<Work11DynamicPrintPagesProps> = ({
  sentences,
  translations,
  includeAnswer,
  printMode,
  customHeader,
  fluidLayout = false
}) => {
  console.log('🖨️ Work11DynamicPrintPages 렌더링:', {
    sentencesCount: sentences.length,
    translationsCount: translations.length,
    includeAnswer,
    printMode,
    mode: includeAnswer ? '인쇄(정답)' : '인쇄(문제)',
    note: '⚠️ 인쇄(문제)와 인쇄(정답)은 독립적으로 페이지 분할이 계산됩니다.'
  });

  // 동적 페이지 분할 계산 (더 정교한 로직)
  // ⚠️ 중요: 인쇄(문제)와 인쇄(정답) 페이지는 완전히 독립적으로 페이지 분할이 계산되어야 함
  // includeAnswer 값에 따라 각 문장 컨테이너의 높이가 달라지므로 페이지 분할 결과가 다름
  // 인쇄(문제)에는 한글 해석이 없어 각 문제의 높이가 더 작으므로, 더 많은 문제가 한 페이지에 배치될 수 있음
  // 인쇄(정답)에는 한글 해석이 포함되어 각 문제의 높이가 더 크므로, 더 적은 문제가 한 페이지에 배치될 수 있음
  // 따라서 인쇄(문제)에서 1~10번이 첫 페이지, 11~15번이 두 번째 페이지라면,
  // 인쇄(정답)에서는 1~8번이 첫 페이지, 9~15번이 두 번째 페이지처럼 다르게 분할될 수 있음
  const pageBreakIndices = useMemo(() => {
    // 독립성 보장: includeAnswer 값에 따라 완전히 다른 계산이 이루어짐
    console.log(`🔄 [${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'}] 페이지 분할 계산 시작 - 독립적 계산 보장`);
    if (sentences.length === 0) return [0];
    
    // 헤더 높이 계산 (a4-page-header: height: 1.5cm = 56.7px)
    const headerHeight = 56.7; // 1.5cm = 56.7px
    
    // a4-page-content의 padding: 0 1cm 1cm 1cm = 상하 37.8px
    const contentPaddingTop = 0; // 상단 패딩 없음
    const contentPaddingBottom = 37.8; // 하단 패딩 1cm
    
    // 첫 페이지 제목 높이 계산
    const firstPageInstructionText = "다음 본문의 각 문장을 한국어로 해석하세요.";
    const firstPageInstructionTextHeight = calculateContainerHeight(firstPageInstructionText, 0, 16, 1.2);
    const firstPageInstructionPadding = 0.7 * 16 * 2; // 위아래 패딩 (0.7rem * 2)
    const firstPageInstructionMarginBottom = 1.2 * 16; // marginBottom: 1.2rem
    const firstPageInstructionHeight = firstPageInstructionTextHeight + firstPageInstructionPadding + firstPageInstructionMarginBottom;
    
    // 후속 페이지 제목 높이 계산 (더 짧은 텍스트)
    const subsequentPageInstructionText = `번역할 문장들 (계속) - X페이지`;
    const subsequentPageInstructionTextHeight = calculateContainerHeight(subsequentPageInstructionText, 0, 16, 1.2);
    const subsequentPageInstructionHeight = subsequentPageInstructionTextHeight + firstPageInstructionPadding + firstPageInstructionMarginBottom;
    
    // 페이지 상단 여백 (marginTop: 0.9rem = 14.4px)
    const topMargin = 0.9 * 16; // 14.4px
    
    // 실제 사용 가능한 콘텐츠 높이 계산
    // A4 페이지 높이 (1123px) - 헤더 높이 - 콘텐츠 하단 패딩
    const actualContentHeight = A4_CONFIG.PAGE_HEIGHT - headerHeight - contentPaddingBottom;
    
    // PDF 생성 시 실제 사용 가능한 높이를 더 정확하게 계산
    // 콘솔 로그에서 확인: PDF 생성 시 요소 높이가 600px로 제한됨
    // 하지만 실제 인쇄 시에는 브라우저가 자동으로 페이지를 분할하므로
    // 계산된 높이를 신뢰하되, 더 보수적인 안전 마진 사용
    const effectiveContentHeight = actualContentHeight;
    
    // 안전 마진 조정 (문장이 잘리지 않도록 적절한 여유 확보)
    // 인쇄(문제) 모드에서는 해석이 없어 높이 계산이 더 정확하므로 안전 마진을 줄임
    // 인쇄(정답) 모드에서는 해석 텍스트 높이 계산 오차를 고려하여 더 큰 마진 사용
    const safetyMargin = includeAnswer ? 30 : 15; // px (인쇄(문제)는 더 작은 마진)
    
    // 첫 페이지 사용 가능한 높이
    const firstPageAvailableHeight = effectiveContentHeight - firstPageInstructionHeight - topMargin - safetyMargin;
    
    // 후속 페이지 사용 가능한 높이
    const subsequentPageAvailableHeight = effectiveContentHeight - subsequentPageInstructionHeight - topMargin - safetyMargin;
    
    console.log(`📏 [${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'}] 페이지 분할 계산 시작:`, {
      mode: includeAnswer ? '인쇄(정답)' : '인쇄(문제)',
      includeAnswer: includeAnswer,
      actualContentHeight: `${actualContentHeight.toFixed(2)}px`,
      effectiveContentHeight: `${effectiveContentHeight.toFixed(2)}px`,
      headerHeight: `${headerHeight}px`,
      firstPageInstructionHeight: `${firstPageInstructionHeight.toFixed(2)}px`,
      subsequentPageInstructionHeight: `${subsequentPageInstructionHeight.toFixed(2)}px`,
      firstPageAvailableHeight: `${firstPageAvailableHeight.toFixed(2)}px`,
      subsequentPageAvailableHeight: `${subsequentPageAvailableHeight.toFixed(2)}px`,
      topMargin: `${topMargin}px`,
      safetyMargin: `${safetyMargin}px`,
      note: includeAnswer 
        ? '인쇄(정답): 해석 포함으로 각 문장 높이가 더 큼 → 더 적은 문장이 한 페이지에 배치됨'
        : '인쇄(문제): 해석 없음으로 각 문장 높이가 더 작음 → 더 많은 문장이 한 페이지에 배치됨'
    });
    
    const breaks: number[] = [0]; // 첫 페이지는 항상 0번 인덱스부터 시작
    let currentPageHeight = 0;
    let isFirstPage = true;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const translation = translations[i] || '';
      
      // 현재 문장 컨테이너 높이 계산 (실제 인덱스 사용)
      // ⚠️ 중요: includeAnswer 값에 따라 높이가 달라지므로 인쇄(문제)와 인쇄(정답)의 페이지 분할이 독립적으로 계산됨
      // 인쇄(문제): 해석 영역이 최소 높이(20.8px)만 사용 → 전체 높이가 작음
      // 인쇄(정답): 해석 영역이 실제 텍스트 높이 사용 → 전체 높이가 큼
      const containerHeight = calculateSentenceContainerHeight(sentence, translation, includeAnswer, i);
      
      // 디버깅: 각 문장의 높이 차이 확인
      if (i < 3 || i === sentences.length - 1) {
        const problemHeight = calculateSentenceContainerHeight(sentence, translation, false, i);
        const answerHeight = calculateSentenceContainerHeight(sentence, translation, true, i);
        console.log(`📊 [${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'}] 문장 ${i + 1} 높이 비교:`, {
          currentMode: includeAnswer ? '인쇄(정답)' : '인쇄(문제)',
          currentHeight: `${containerHeight.toFixed(2)}px`,
          problemModeHeight: `${problemHeight.toFixed(2)}px`,
          answerModeHeight: `${answerHeight.toFixed(2)}px`,
          heightDifference: `${Math.abs(answerHeight - problemHeight).toFixed(2)}px`,
          note: includeAnswer 
            ? `인쇄(정답) 높이가 인쇄(문제)보다 ${(answerHeight - problemHeight).toFixed(2)}px 큼 → 페이지 분할이 다를 수 있음`
            : `인쇄(문제) 높이가 인쇄(정답)보다 ${(problemHeight - answerHeight).toFixed(2)}px 작음 → 페이지 분할이 다를 수 있음`
        });
      }
      
      // 현재 페이지의 사용 가능한 높이 결정
      const availableHeight = isFirstPage ? firstPageAvailableHeight : subsequentPageAvailableHeight;
      
      // 현재 페이지에 추가했을 때 높이 초과 여부 확인
      const remainingSpace = availableHeight - currentPageHeight;
      
      // 인쇄(문제) 모드에서는 계산 오차를 고려하여 약간의 여유를 두고 분할
      // 인쇄(정답) 모드에서는 해석 텍스트 높이 계산 오차가 클 수 있으므로 더 보수적으로 분할
      const threshold = includeAnswer ? 0 : 5; // 인쇄(문제)는 5px 여유를 두고 분할
      const wouldExceed = currentPageHeight + containerHeight > (availableHeight - threshold);
      
      // 페이지 분할 조건 (명확한 로직):
      // 1. 추가 시 높이를 초과하면 무조건 다음 페이지로 (단, 첫 페이지이고 현재 페이지가 비어있으면 예외)
      // 2. 단일 문장이 한 페이지를 초과하는 경우 (매우 긴 문장 처리)
      // 3. 그 외의 경우 현재 페이지에 추가
      
      // 추가 시 높이를 초과하고, 현재 페이지에 이미 내용이 있으면 무조건 다음 페이지로
      if (wouldExceed && currentPageHeight > 0) {
        breaks.push(i);
        currentPageHeight = containerHeight;
        isFirstPage = false; // 다음 페이지는 후속 페이지
        const overflow = (currentPageHeight + containerHeight) - (availableHeight - threshold);
        console.log(`📄 [${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'}] 페이지 분할: ${i}번 문장부터 새 페이지 시작 (누적 높이: ${currentPageHeight.toFixed(2)}px, 사용 가능: ${availableHeight.toFixed(2)}px, 남은 공간: ${remainingSpace.toFixed(2)}px, 문장 높이: ${containerHeight.toFixed(2)}px, 추가 시 초과: ${overflow.toFixed(2)}px, threshold: ${threshold}px)`);
      } else if (containerHeight > availableHeight && currentPageHeight > 0) {
        // 단일 문장이 한 페이지를 초과하는 경우 (매우 긴 문장 처리)
        // 현재 페이지에 이미 내용이 있으면 다음 페이지로 이동
        breaks.push(i);
        currentPageHeight = containerHeight;
        isFirstPage = false;
        console.warn(`⚠️ ${i}번 문장이 한 페이지를 초과하여 다음 페이지로 이동 (높이: ${containerHeight.toFixed(2)}px > 사용 가능: ${availableHeight.toFixed(2)}px)`);
      } else {
        // 현재 페이지에 추가
        currentPageHeight += containerHeight;
        
        // 단일 문장이 한 페이지를 초과하지만 첫 페이지인 경우 (강제로 포함)
        if (containerHeight > availableHeight && currentPageHeight === containerHeight) {
          console.warn(`⚠️ 경고: ${i}번 문장이 한 페이지를 초과하지만 첫 페이지이므로 포함 (높이: ${containerHeight.toFixed(2)}px > 사용 가능: ${availableHeight.toFixed(2)}px)`);
        } else {
          console.log(`✅ [${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'}] ${i}번 문장 추가 (높이: ${containerHeight.toFixed(2)}px, 누적: ${currentPageHeight.toFixed(2)}px/${availableHeight.toFixed(2)}px, 남은 공간: ${(availableHeight - currentPageHeight).toFixed(2)}px)`);
        }
      }
    }
    
    // 마지막 페이지가 제대로 생성되었는지 확인
    const lastBreakIndex = breaks[breaks.length - 1];
    if (lastBreakIndex >= sentences.length) {
      console.error(`❌ 오류: 마지막 분할 인덱스 ${lastBreakIndex}가 문장 수 ${sentences.length}를 초과합니다!`);
    }
    
    // 모든 문장이 포함되었는지 확인
    // breaks 배열의 마지막 값이 마지막 문장의 인덱스보다 작거나 같아야 함
    // 마지막 페이지는 breaks[마지막]부터 sentences.length까지 포함
    const lastPageStartIndex = breaks[breaks.length - 1];
    const lastPageEndIndex = sentences.length;
    const lastPageSentenceCount = lastPageEndIndex - lastPageStartIndex;
    
    console.log(`📚 [${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'}] 총 ${breaks.length}페이지 생성 (분할 인덱스: [${breaks.join(', ')}])`);
    console.log(`📊 [${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'}] 문장 처리 확인: 총 ${sentences.length}개 문장`);
    console.log(`📊 [${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'}] 마지막 페이지: ${lastPageStartIndex}~${lastPageEndIndex - 1}번 문장 (${lastPageSentenceCount}개)`);
    
    // ⚠️ 독립성 검증: 인쇄(문제)와 인쇄(정답)의 페이지 분할이 다를 수 있음을 명확히 표시
    console.log(`✅ [${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'}] 페이지 분할 계산 완료 - 이 결과는 ${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'} 모드에만 적용됨`);
    console.log(`ℹ️  참고: 인쇄(문제)와 인쇄(정답)은 서로 다른 페이지 분할 결과를 가질 수 있습니다.`);
    
    // 모든 문장이 포함되었는지 검증
    let totalCovered = 0;
    for (let i = 0; i < breaks.length; i++) {
      const start = breaks[i];
      const end = i < breaks.length - 1 ? breaks[i + 1] : sentences.length;
      totalCovered += (end - start);
      console.log(`  [${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'}] 페이지 ${i + 1}: ${start}~${end - 1}번 문장 (${end - start}개)`);
    }
    
    if (totalCovered !== sentences.length) {
      console.error(`❌ [${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'}] 오류: 문장이 누락되었습니다! 총 ${sentences.length}개 중 ${totalCovered}개만 포함됨`);
    } else {
      console.log(`✅ [${includeAnswer ? '인쇄(정답)' : '인쇄(문제)'}] 모든 문장이 포함되었습니다! (총 ${totalCovered}개)`);
    }
    
    return breaks;
  }, [sentences, translations, includeAnswer]);

  const totalPages = pageBreakIndices.length;

  const renderContainer = (sentence: string, translation: string, index: number, pageNumber: number) => {
    const containerStyle: React.CSSProperties = {
      marginBottom: '0.5rem',
      padding: '0.3rem 1rem 0.2rem 1rem',
      borderRadius: '8px',
      pageBreakInside: 'avoid',
      breakInside: 'avoid',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff'
    };

    return (
      <div 
        key={`page-${pageNumber}-container-${index}`}
        className={includeAnswer ? "work11-print-answer-sentence" : "work11-print-problem-sentence"}
        style={containerStyle}
      >
        <div style={{
          fontSize: '1rem',
          lineHeight: '1.2',
          color: '#000',
          marginBottom: '0.2rem',
          fontWeight: 300 // 한 단계 낮게 설정
        }}>
          <span style={{fontWeight: 'bold', color: '#333'}}>
            {index + 1}. 
          </span>
          {sentence}
        </div>
        
        {includeAnswer ? (
          <div style={{
            fontSize: '0.8rem',
            lineHeight: '1.2',
            color: '#000000',
            fontWeight: '500',
            marginTop: '0.1rem',
            paddingBottom: '0.2rem',
            paddingTop: '0.2rem',
            paddingLeft: '0.5rem',
            paddingRight: '0.5rem',
            backgroundColor: '#f5f5f5', // 연한 회색 하이라이트
            borderRadius: '4px'
          }}>
            {translation}
          </div>
        ) : (
          <div style={{
            height: '24px',
            marginTop: '0.3rem'
          }}>
          </div>
        )}
      </div>
    );
  };

  const renderPage = (pageIndex: number) => {
    const startIndex = pageBreakIndices[pageIndex];
    const endIndex = pageIndex < pageBreakIndices.length - 1 
      ? pageBreakIndices[pageIndex + 1] 
      : sentences.length;
    const pageSentences = sentences.slice(startIndex, endIndex);
    const pageTranslations = translations.slice(startIndex, endIndex);
    
    console.log(`📄 페이지 ${pageIndex + 1} 렌더링: ${startIndex}~${endIndex - 1}번 문장 (총 ${pageSentences.length}개)`);

    return (
      <div 
        key={`dynamic-page-${pageIndex + 1}`}
        className="a4-page-template work11-dynamic-page-template"
        style={{
          width: fluidLayout ? '100%' : '21cm',
          height: fluidLayout ? 'auto' : '29.7cm',
          maxWidth: fluidLayout ? '100%' : undefined,
          minHeight: fluidLayout ? 0 : undefined,
          margin: '0',
          padding: '0',
          background: 'white',
          boxSizing: 'border-box',
          pageBreakInside: fluidLayout ? 'auto' : 'avoid',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: fluidLayout ? 'visible' : undefined
        }}
      >
        <div className="a4-page-header" style={{
          width: '100%',
          height: '1.5cm',
          flexShrink: 0,
          padding: '0.5cm 0.3cm 0 0.3cm',
          boxSizing: 'border-box'
        }}>
          {customHeader || <PrintHeaderWork01 />}
        </div>

        <div className="a4-page-content" style={{
          width: '100%',
          flex: fluidLayout ? 'none' : 1,
          padding: fluidLayout ? '0.35cm 0 0.75cm 0' : '0 1cm 1cm 1cm',
          boxSizing: 'border-box',
          overflow: 'visible'
        }}>
          <div className="problem-instruction" data-work-type="11" style={{
            fontWeight: 800,
            fontSize: '1rem',
            background: '#222',
            color: '#fff',
            padding: '0.7rem 0.5rem',
            borderRadius: '8px',
            marginBottom: '1.2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%'
          }}>
            <span>
              {pageIndex === 0 
                ? "다음 본문의 각 문장을 한국어로 해석하세요."
                : `번역할 문장들 (계속) - ${pageIndex + 1}페이지`
              }
            </span>
            <span style={{
              fontSize: '0.9rem',
              fontWeight: '700',
              color: '#FFD700'
            }}>
              유형#11
            </span>
          </div>
          
          <div style={{ 
            marginTop: '0.9rem'
          }}>
            {pageSentences.map((sentence, index) => {
              const actualIndex = startIndex + index;
              const translation = pageTranslations[index] || translations[actualIndex] || '';
              console.log(`  📝 페이지 ${pageIndex + 1} - 문장 ${actualIndex + 1} 렌더링:`, {
                sentence: sentence.substring(0, 50) + '...',
                hasTranslation: !!translation,
                translationLength: translation.length
              });
              return renderContainer(sentence, translation, actualIndex, pageIndex + 1);
            })}
          </div>
        </div>
      </div>
    );
  };

  // 렌더링 전 최종 검증
  console.log('🔍 최종 렌더링 검증:', {
    totalPages,
    totalSentences: sentences.length,
    totalTranslations: translations.length,
    pageBreakIndices,
    includeAnswer
  });
  
  // 모든 문장이 포함되었는지 확인
  const allIndicesCovered = pageBreakIndices.every((breakIndex, idx) => {
    const nextBreak = idx < pageBreakIndices.length - 1 ? pageBreakIndices[idx + 1] : sentences.length;
    return breakIndex >= 0 && breakIndex < sentences.length && nextBreak <= sentences.length;
  });
  
  if (!allIndicesCovered) {
    console.error('❌ 오류: 페이지 분할 인덱스가 유효하지 않습니다!');
  }
  
  return (
    <div className="work11-dynamic-print-container">
      {Array.from({ length: totalPages }, (_, index) => {
        const page = renderPage(index);
        if (!page) {
          console.error(`❌ 페이지 ${index + 1} 렌더링 실패`);
        }
        return page;
      })}
    </div>
  );
};

export default Work11DynamicPrintPages;
