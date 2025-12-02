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

    distributedPages.forEach((pageColumns: NormalizedQuizItem[][], pageIndex: number) => {
      pages.push(
        <div
          key={`page-${pageIndex}`}
          className="print-page a4-landscape-page-template"
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

