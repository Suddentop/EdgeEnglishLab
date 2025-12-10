import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
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
  const packageQuiz = quizzes.map(quiz => ({
    workTypeId: '01',
    quiz: quiz,
    data: quiz
  }));

  console.log('🖨️ PrintFormatWork01New 렌더링:', {
    quizCount: quizzes.length,
    isAnswerMode: isAnswerMode
  });
  
  const renderTextWithHighlight = (text: string, replacements: any[]) => text;

  const cleanOptionText = (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (isAnswerMode) {
      return str.replace(/\(정답\)/g, '').replace(/\s{2,}/g, ' ').trim();
    }
    return str;
  };

  const getTranslatedText = (quizItem: any, quizData: any): string => {
    return (
      quizData?.translation ||
      quizData?.translatedText ||
      ''
    );
  };

  const renderQuizItems = () => {
    const pages: JSX.Element[] = [];

    const normalizedItems = packageQuiz.map((item, index) => {
      const normalized = normalizeQuizItemForPrint(item, {
        isAnswerMode,
        cleanOptionText,
        renderTextWithHighlight,
        getTranslatedText
      });
      
      const titleSection = normalized.sections.find(s => s.type === 'title');
      if (titleSection) {
        titleSection.text = `문제 ${index + 1} : 문단 순서 맞추기`;
      }
      
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
      const leftColumnItems = pageColumns[0] || [];
      const rightColumnItems = pageColumns[1] || [];
      const leftColumnEmpty = leftColumnItems.length === 0;
      const rightColumnEmpty = rightColumnItems.length === 0;
      
      if (leftColumnEmpty && rightColumnEmpty) {
        console.warn(`⚠️ PrintFormatWork01New: 렌더링 단계에서 빈 페이지 감지 및 건너뜀: 페이지 ${pageIndex + 1}`);
        return;
      }
      
      const leftHasContent = leftColumnItems.some(item => item.sections && item.sections.length > 0);
      const rightHasContent = rightColumnItems.some(item => item.sections && item.sections.length > 0);
      
      if (!leftHasContent && !rightHasContent) {
        console.warn(`⚠️ PrintFormatWork01New: 렌더링 단계에서 빈 섹션 페이지 감지 및 건너뜀: 페이지 ${pageIndex + 1}`);
        return;
      }

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

