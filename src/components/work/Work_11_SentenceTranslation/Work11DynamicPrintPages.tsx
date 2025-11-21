import React, { useMemo } from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';

interface Work11DynamicPrintPagesProps {
  sentences: string[];
  translations: string[];
  includeAnswer: boolean;
  printMode: 'no-answer' | 'with-answer';
  customHeader?: React.ReactNode;
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

// 텍스트 높이 계산 함수
const calculateContainerHeight = (text: string, padding: number = 0, fontSize: number = 16, lineHeight: number = 1.2): number => {
  const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40; // 좌우 패딩 고려
  const charWidthPx = fontSize * 0.55; // 한글/영문 평균 문자 폭
  const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
  const lines = Math.ceil(text.length / charsPerLine);
  return (lines * fontSize * lineHeight) + padding;
};

// 각 문장 컨테이너 높이 계산
const calculateSentenceContainerHeight = (
  sentence: string, 
  translation: string, 
  includeAnswer: boolean
): number => {
  // 문장 번호 + 문장 텍스트 높이 (fontSize: 1rem = 16px, lineHeight: 1.2)
  // 문장 번호는 약 3~4자 정도 공간을 차지하므로 "1. " 을 포함해서 계산
  const sentenceText = `${1}. ${sentence}`;
  const sentenceHeight = calculateContainerHeight(sentenceText, 0, 16, 1.2);
  
  // 문장 하단 마진 (marginBottom: 0.2rem)
  const sentenceMarginBottom = 0.2 * 16; // 3.2px
  
  // 컨테이너 내부 패딩 (padding: 0.3rem 1rem 0.2rem 1rem = 위 4.8px, 아래 3.2px)
  const containerPaddingTop = 0.3 * 16; // 4.8px
  const containerPaddingBottom = 0.2 * 16; // 3.2px
  
  // 해석 영역 높이
  let translationHeight = 0;
  if (includeAnswer) {
    // 정답 포함: fontSize: 0.8rem = 12.8px, lineHeight: 1.2
    translationHeight = calculateContainerHeight(translation, 0, 12.8, 1.2);
    // marginTop: 0.1rem + paddingBottom: 0.2rem
    translationHeight += 0.1 * 16 + 0.2 * 16; // 1.6px + 3.2px = 4.8px
  } else {
    // 정답 없음: height: 24px (고정), marginTop: 0.3rem
    translationHeight = 24 + (0.3 * 16); // 24px + 4.8px = 28.8px
  }
  
  // 컨테이너 하단 마진 (marginBottom: 0.5rem)
  const containerMarginBottom = 0.5 * 16; // 8px
  
  const totalHeight = sentenceHeight + sentenceMarginBottom + containerPaddingTop + containerPaddingBottom + translationHeight + containerMarginBottom;
  
  return totalHeight;
};

const Work11DynamicPrintPages: React.FC<Work11DynamicPrintPagesProps> = ({
  sentences,
  translations,
  includeAnswer,
  printMode,
  customHeader
}) => {
  console.log('🖨️ Work11DynamicPrintPages 렌더링:', {
    sentencesCount: sentences.length,
    translationsCount: translations.length,
    includeAnswer,
    printMode
  });

  // 동적 페이지 분할 계산
  const pageBreakIndices = useMemo(() => {
    if (sentences.length === 0) return [0];
    
    // 문제 제목 높이 계산
    // fontSize: 1rem = 16px, lineHeight: 1.2, padding: 0.7rem = 11.2px (위아래)
    // 실제 높이는 텍스트 높이 + padding
    const instructionText = "다음 본문의 각 문장을 한국어로 해석하세요.";
    const instructionTextHeight = calculateContainerHeight(instructionText, 0, 16, 1.2);
    const instructionPadding = 0.7 * 16 * 2; // 위아래 패딩 (0.7rem)
    const instructionMarginBottom = 1.2 * 16; // marginBottom: 1.2rem
    const instructionHeight = instructionTextHeight + instructionPadding + instructionMarginBottom;
    
    // 페이지 상단 여백 (marginTop: 0.9rem)
    const topMargin = 0.9 * 16; // 14.4px
    
    // 사용 가능한 높이 (A4 콘텐츠 높이 - 제목 - 상단 여백 - 안전 마진)
    const safetyMargin = 50; // px
    const availableHeight = A4_CONFIG.CONTENT_HEIGHT - instructionHeight - topMargin - safetyMargin;
    
    console.log('📏 페이지 분할 계산:', {
      availableHeight: `${availableHeight}px`,
      instructionHeight: `${instructionHeight}px`,
      topMargin: `${topMargin}px`,
      safetyMargin: `${safetyMargin}px`
    });
    
    const breaks: number[] = [0]; // 첫 페이지는 항상 0번 인덱스부터 시작
    let currentPageHeight = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const translation = translations[i] || '';
      
      // 현재 문장 컨테이너 높이 계산
      const containerHeight = calculateSentenceContainerHeight(sentence, translation, includeAnswer);
      
      // 현재 페이지에 추가했을 때 높이 초과 여부 확인
      if (currentPageHeight + containerHeight > availableHeight && currentPageHeight > 0) {
        // 현재 페이지가 가득 찼으므로 다음 페이지로
        breaks.push(i);
        currentPageHeight = containerHeight;
        console.log(`📄 페이지 분할: ${i}번 문장부터 새 페이지 시작 (누적 높이: ${currentPageHeight.toFixed(2)}px)`);
      } else {
        // 현재 페이지에 추가
        currentPageHeight += containerHeight;
      }
    }
    
    console.log(`📚 총 ${breaks.length}페이지 생성 (분할 인덱스: [${breaks.join(', ')}])`);
    
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
      flexDirection: 'column'
    };

    if (includeAnswer) {
      containerStyle.backgroundColor = '#F1F8E9';
      containerStyle.border = '1px solid #e3f2fd';
    } else {
      containerStyle.backgroundColor = '#FFF3CD';
      containerStyle.border = '1px solid #e3f2fd';
    }

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
          marginBottom: '0.2rem'
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
            color: '#1976d2',
            fontWeight: '500',
            marginTop: '0.1rem',
            paddingBottom: '0.2rem'
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
          width: '21cm',
          height: '29.7cm',
          margin: '0',
          padding: '0',
          background: 'white',
          boxSizing: 'border-box',
          pageBreakInside: 'avoid',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          border: 'none'
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
          flex: 1,
          padding: '0 1cm 1cm 1cm',
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
          
          <div style={{ marginTop: '0.9rem' }}>
            {pageSentences.map((sentence, index) => 
              renderContainer(sentence, pageTranslations[index], startIndex + index, pageIndex + 1)
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="work11-dynamic-print-container">
      {Array.from({ length: totalPages }, (_, index) => 
        renderPage(index)
      )}
    </div>
  );
};

export default Work11DynamicPrintPages;
