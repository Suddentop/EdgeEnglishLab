import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css'; // 패키지#02 스타일 재사용
import { Quiz } from '../../../types/types';
import {
  NormalizedQuizItem,
  normalizeQuizItemForPrint
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';
import {
  splitNormalizedItemByHeight,
  distributeNormalizedItemsToPages
} from '../Package_02_TwoStepQuiz/printLayoutUtils';

interface PrintFormatWork01NewProps {
  quizzes: Quiz[];
  isAnswerMode?: boolean;
}

const PrintFormatWork01New: React.FC<PrintFormatWork01NewProps> = ({ quizzes, isAnswerMode = false }) => {
  // Work_01 퀴즈 데이터를 Package_02 형식으로 변환
  const packageQuiz = quizzes.map(quiz => ({
    workTypeId: '01',
    quiz: quiz,
    data: quiz // 호환성을 위해 data 필드에도 할당
  }));

  console.log('🖨️ PrintFormatWork01New 렌더링:', {
    quizCount: quizzes.length,
    isAnswerMode: isAnswerMode
  });
  
  // 본문에서 교체된 단어에 밑줄 표시 (Work_01에서는 사용되지 않지만 타입 호환성을 위해 유지)
  const renderTextWithHighlight = (text: string, replacements: any[]) => text;

  const cleanOptionText = (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (isAnswerMode) {
      return str.replace(/\(정답\)/g, '').replace(/\s{2,}/g, ' ').trim();
    }
    return str;
  };

  // 번역 텍스트 추출 헬퍼
  const getTranslatedText = (quizItem: any, quizData: any): string => {
    return (
      quizData?.translation ||
      quizData?.translatedText ||
      ''
    );
  };

  // 2단 레이아웃으로 퀴즈 아이템 렌더링
  const renderQuizItems = () => {
    // 패키지 퀴즈를 단별로 분할 (높이 기반)
    const pages: JSX.Element[] = [];

    const normalizedItems = packageQuiz.map((item, index) => {
      const normalized = normalizeQuizItemForPrint(item, {
        isAnswerMode,
        cleanOptionText,
        renderTextWithHighlight,
        getTranslatedText
      });
      return normalized;
    });

    const expandedNormalizedItems = normalizedItems.flatMap((item) =>
      splitNormalizedItemByHeight(item)
    );

    const renderNormalizedCard = (
      normalizedItem: NormalizedQuizItem,
      keyPrefix: string
    ): React.ReactNode => {
      return renderNormalizedCardNode(normalizedItem, keyPrefix, { isAnswerMode });
    };
 
    const distributedPages = distributeNormalizedItemsToPages(expandedNormalizedItems);
    console.log(`📄 PrintFormatWork01New: 총 ${distributedPages.length}개 페이지 생성 중...`);

    // 빈 페이지 필터링 (양쪽 컬럼이 모두 비어있는 페이지 제거)
    const filteredPages = distributedPages.filter((pageColumns: NormalizedQuizItem[][], pageIndex: number) => {
      const leftColumnItems = pageColumns[0] || [];
      const rightColumnItems = pageColumns[1] || [];
      const leftColumnEmpty = leftColumnItems.length === 0;
      const rightColumnEmpty = rightColumnItems.length === 0;
      const isEmpty = leftColumnEmpty && rightColumnEmpty;
      
      if (isEmpty) {
        console.warn(`⚠️ PrintFormatWork01New: 빈 페이지 감지 및 제거: 페이지 ${pageIndex + 1}`, {
          leftColumnItems: leftColumnItems.length,
          rightColumnItems: rightColumnItems.length
        });
        return false;
      }
      
      // 추가 검증: 각 컬럼의 아이템이 실제로 섹션을 가지고 있는지 확인
      const leftHasContent = leftColumnItems.some(item => item.sections && item.sections.length > 0);
      const rightHasContent = rightColumnItems.some(item => item.sections && item.sections.length > 0);
      
      if (!leftHasContent && !rightHasContent) {
        console.warn(`⚠️ PrintFormatWork01New: 빈 섹션 페이지 감지 및 제거: 페이지 ${pageIndex + 1}`);
        return false;
      }
      
      return true;
    });
    
    console.log(`📄 PrintFormatWork01New: 페이지 필터링 결과: ${distributedPages.length}개 → ${filteredPages.length}개 (빈 페이지 ${distributedPages.length - filteredPages.length}개 제거)`);

    filteredPages.forEach((pageColumns: NormalizedQuizItem[][], pageIndex: number) => {
      // 빈 페이지 재확인 (이중 안전장치)
      const leftColumnItems = pageColumns[0] || [];
      const rightColumnItems = pageColumns[1] || [];
      const leftColumnEmpty = leftColumnItems.length === 0;
      const rightColumnEmpty = rightColumnItems.length === 0;
      
      if (leftColumnEmpty && rightColumnEmpty) {
        console.warn(`⚠️ PrintFormatWork01New: 렌더링 단계에서 빈 페이지 감지 및 건너뜀: 페이지 ${pageIndex + 1}`);
        return;
      }
      
      // 추가 검증: 각 컬럼의 아이템이 실제로 섹션을 가지고 있는지 확인
      const leftHasContent = leftColumnItems.some(item => item.sections && item.sections.length > 0);
      const rightHasContent = rightColumnItems.some(item => item.sections && item.sections.length > 0);
      
      if (!leftHasContent && !rightHasContent) {
        console.warn(`⚠️ PrintFormatWork01New: 렌더링 단계에서 빈 섹션 페이지 감지 및 건너뜀: 페이지 ${pageIndex + 1}`);
        return;
      }

      // 마지막 페이지인지 확인
      const isLastPage = pageIndex === filteredPages.length - 1;

      pages.push(
        <div
          key={`page-${pageIndex}`}
          id={`print-page-${pageIndex}`}
          className={`print-page a4-landscape-page-template ${isLastPage ? 'last-page' : ''}`}
          style={isLastPage ? { 
            pageBreakAfter: 'avoid',
            breakAfter: 'avoid',
            marginBottom: 0,
            paddingBottom: 0
          } : undefined}
        >
          <div className="a4-landscape-page-header">
            <PrintHeaderWork01 />
          </div>

          <div className="a4-landscape-page-content">
            <div className="print-two-column-container">
              {pageColumns.map((columnItems, columnIndex) => (
                <div
                  key={`page-${pageIndex}-column-${columnIndex}`}
                  className="print-column"
                >
                  {columnItems.map((normalizedItem, itemIndex) =>
                    renderNormalizedCard(
                      normalizedItem,
                      `page-${pageIndex}-column-${columnIndex}-item-${itemIndex}`
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    });
    
    return pages;
  };

  return (
    <div 
      id={isAnswerMode ? "print-root-work01-new-answer" : "print-root-work01-new"}
      className={isAnswerMode ? "print-container-answer work01-new-print" : "print-container work01-new-print"}
    >
      {renderQuizItems()}
    </div>
  );
};

export default PrintFormatWork01New;

