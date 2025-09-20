import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import { 
  paginateSentences, 
  optimizePageLayout, 
  validatePaginationResult,
  type PaginationResult,
  type ContainerInfo
} from '../../../utils/work11DynamicPagination';

interface Work11DynamicPrintPagesProps {
  sentences: string[];
  translations: string[];
  includeAnswer: boolean;
  printMode: 'no-answer' | 'with-answer';
  customHeader?: React.ReactNode; // 패키지#01용 커스텀 헤더
}

/**
 * 유형#11 동적 인쇄 페이지 컴포넌트
 * 새로운 동적 페이지네이션 로직을 사용하여 A4 페이지를 생성합니다.
 */
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

  // 동적 페이지네이션 수행
  const paginationResult = paginateSentences(sentences, translations, includeAnswer);
  
  // 페이지 레이아웃 최적화
  const optimizedResult = optimizePageLayout(paginationResult);
  
  // 결과 검증
  const validation = validatePaginationResult(optimizedResult);
  
  if (!validation.isValid) {
    console.error('❌ 페이지네이션 검증 실패:', validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ 페이지네이션 경고:', validation.warnings);
  }

  console.log('📊 최종 페이지네이션 결과:', {
    totalPages: optimizedResult.totalPages,
    totalContainers: optimizedResult.totalContainers,
    averageContainersPerPage: optimizedResult.averageContainersPerPage,
    validation: {
      isValid: validation.isValid,
      errors: validation.errors.length,
      warnings: validation.warnings.length
    }
  });

  /**
   * 개별 컨테이너 렌더링
   */
  const renderContainer = (container: ContainerInfo, pageNumber: number) => {
    const { data } = container;
    const { sentence, translation, index } = data;
    
    // 영어 문장 아래 한 줄 정도의 공간만 남기기
    const lineHeightPx = 24; // 한 줄 높이 (대략 1.5rem)
    const marginTopPx = 0.3 * 16; // 0.3rem = 4.8px
    
    // 해석 공간을 한 줄 높이로 최소화
    const translationSpaceHeightPx = lineHeightPx;
    
    const containerStyle: React.CSSProperties = {
      marginBottom: '1rem',
      padding: '0.5rem 1rem 0 1rem', // 하단 패딩 제거
      borderRadius: '8px',
      pageBreakInside: 'avoid',
      breakInside: 'avoid',
      // 컨테이너 높이를 자동으로 조정 (영어 문장 길이에 따라)
      display: 'flex',
      flexDirection: 'column'
    };

    // 정답 포함 여부에 따른 배경색 설정
    if (includeAnswer) {
      containerStyle.backgroundColor = '#F1F8E9'; // 연한 녹색
      containerStyle.border = '1px solid #e3f2fd'; // 기본 테두리
    } else {
      containerStyle.backgroundColor = '#FFF3CD'; // 연한 노란색
      containerStyle.border = '1px solid #e3f2fd'; // 기본 테두리
    }

    return (
      <div 
        key={`page-${pageNumber}-container-${index}`}
        className={includeAnswer ? "work11-print-answer-sentence" : "work11-print-problem-sentence"}
        style={containerStyle}
      >
        {/* 문장 번호와 내용 */}
        <div style={{
          fontSize: '1rem',
          lineHeight: '1.6',
          color: '#000',
          marginBottom: '0.5rem'
        }}>
          <span style={{fontWeight: 'bold', color: '#333'}}>
            {index + 1}. 
          </span>
          {sentence}
        </div>
        
        {/* 해석 부분 */}
        {includeAnswer ? (
          <div style={{
            fontSize: '1rem',
            lineHeight: '1.6',
            color: '#1976d2',
            fontWeight: '500',
            marginTop: '0.3rem',
            paddingBottom: '0.5rem', // 한글 해석 문장 하단에 여백 추가
            border: 'none !important', // 모든 테두리 제거
            borderTop: 'none !important',
            borderBottom: 'none !important',
            borderLeft: 'none !important',
            borderRight: 'none !important'
          }}>
            <span style={{fontWeight: 'bold', color: '#1976d2'}}>
              해석: 
            </span>
            {translation}
          </div>
        ) : (
          <div style={{
            height: `${translationSpaceHeightPx}px`,
            marginTop: '0.3rem'
          }}>
            {/* 해석 공간 - 일관된 여백을 위해 동적 높이 적용 */}
          </div>
        )}
      </div>
    );
  };

  /**
   * 개별 페이지 렌더링
   */
  const renderPage = (pageLayout: any, pageIndex: number) => {
    const { pageNumber, containers, totalHeight, availableHeight, isFull } = pageLayout;
    
    console.log(`📄 페이지 ${pageNumber} 렌더링:`, {
      containersCount: containers.length,
      totalHeight: totalHeight.toFixed(2) + 'cm',
      availableHeight: availableHeight.toFixed(2) + 'cm',
      utilization: ((totalHeight / availableHeight) * 100).toFixed(1) + '%',
      isFull,
      remainingSpace: (availableHeight - totalHeight).toFixed(2) + 'cm'
    });

    return (
      <div 
        key={`dynamic-page-${pageNumber}`}
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
          border: 'none' // 테두리 제거
        }}
      >
        {/* 헤더 영역 */}
        <div className="a4-page-header" style={{
          width: '100%',
          height: '1.5cm',
          flexShrink: 0,
          padding: '0.5cm 0.3cm 0 0.3cm',
          boxSizing: 'border-box'
        }}>
          {customHeader || <PrintHeaderWork01 />}
        </div>

        
        {/* 내용 영역 */}
        <div className="a4-page-content" style={{
          width: '100%',
          flex: 1,
          padding: '0 1cm 1cm 1cm',
          boxSizing: 'border-box',
          overflow: 'visible'
        }}>
          {/* 문제 설명 */}
          <div className="problem-instruction" style={{
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
              {pageNumber === 1 
                ? "다음 본문의 각 문장을 한국어로 해석하세요."
                : `번역할 문장들 (계속) - ${pageNumber}페이지`
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
          
          {/* 컨테이너들 */}
          <div style={{ marginTop: '0.9rem' }}>
            {containers.map((container: ContainerInfo) => 
              renderContainer(container, pageNumber)
            )}
          </div>
          
          {/* 페이지 정보 (디버깅용 - 인쇄시 숨김) */}
          <div style={{
            position: 'absolute',
            bottom: '0.5cm',
            right: '1cm',
            fontSize: '0.7rem',
            color: '#999',
            background: 'rgba(255,255,255,0.8)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            display: 'none' // 인쇄시 숨김
          }}>
            페이지 {pageNumber} | 컨테이너 {containers.length}개 | 
            사용률 {((totalHeight / availableHeight) * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    );
  };

  // 모든 페이지 렌더링
  return (
    <div className="work11-dynamic-print-container">
      {optimizedResult.pages.map((pageLayout: any, index: number) => 
        renderPage(pageLayout, index)
      )}
    </div>
  );
};

export default Work11DynamicPrintPages;
