import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
import {
  NormalizedQuizItem,
  PrintSection
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';

interface BlankQuiz {
  id?: string;
  blankedText: string;
  options: string[];
  answerIndex: number;
  translation?: string;
}

interface PrintFormatWork03NewProps {
  quizzes: BlankQuiz[];
  isAnswerMode: boolean;
}

const PrintFormatWork03New: React.FC<PrintFormatWork03NewProps> = ({ quizzes, isAnswerMode }) => {
  
  // Work_03 데이터를 NormalizedQuizItem으로 변환
  const normalizeWork03Quiz = (quiz: BlankQuiz, index: number): NormalizedQuizItem => {
    const sections: PrintSection[] = [];
    const workTypeId = '03';

    // 1. 문제 타이틀
    sections.push({
      type: 'title',
      key: `title-${index}`,
      text: `문제 ${index + 1} : 빈칸(단어) 추론`,
      workTypeId
    });

    // 2. 문제 지시문
    sections.push({
      type: 'instruction',
      key: `instruction-${index}`,
      text: '다음 빈칸에 들어갈 단어로 가장 적절한 것을 고르시오.',
      meta: { workTypeId }
    });

    // 3. 영어 본문 (blankedText) - print-passage 클래스를 사용하여 박스 스타일 적용
    const blankedTextHtml = `<div class="print-passage print-passage-work01-11">${quiz.blankedText}</div>`;
    sections.push({
      type: 'html',
      key: `html-passage-${index}`,
      html: blankedTextHtml
    });

    // 4. 선택지 - options 타입 사용 (세로 배치 보장)
    const options = quiz.options.map((opt, i) => ({
      label: ['①', '②', '③', '④', '⑤'][i] || `${i+1}.`,
      text: opt,
      isCorrect: isAnswerMode && i === quiz.answerIndex
    }));
    
    sections.push({
      type: 'options',
      key: `options-${index}`,
      options: options
    });

    // 5. 정답 모드일 때 해석
    if (isAnswerMode && quiz.translation) {
      sections.push({
        type: 'translation',
        key: `translation-${index}`,
        text: quiz.translation
      });
    }

    return {
      originalItem: quiz,
      workTypeId: workTypeId,
      sections: sections,
      chunkMeta: { chunkIndex: 0, totalChunks: 1 }
    };
  };

  // 1. 데이터 정규화
  const normalizedItems = quizzes.map((quiz, index) => normalizeWork03Quiz(quiz, index));

  // 2. 페이지 분배 (커스텀 로직: 새로운 문제는 항상 새로운 단에 배치)
  const distributeItemsCustom = (items: NormalizedQuizItem[]) => {
    const pages: NormalizedQuizItem[][][] = [];
    let currentColumns: NormalizedQuizItem[][] = [[], []]; // [Left, Right]
    let currentColumnIndex = 0;

    items.forEach((item) => {
      // 현재 단에 내용이 있으면 무조건 다음 단으로 이동
      if (currentColumns[currentColumnIndex].length > 0) {
        currentColumnIndex++;
        if (currentColumnIndex > 1) {
          pages.push(currentColumns);
          currentColumns = [[], []];
          currentColumnIndex = 0;
        }
      }
      currentColumns[currentColumnIndex].push(item);
    });

    if (currentColumns[0].length > 0 || currentColumns[1].length > 0) {
      pages.push(currentColumns);
    }

    return pages;
  };

  const distributedPages = distributeItemsCustom(normalizedItems);

  // 3. 렌더링 헬퍼
  const renderNormalizedCard = (
    normalizedItem: NormalizedQuizItem,
    keyPrefix: string
  ): React.ReactNode => {
    return renderNormalizedCardNode(normalizedItem, keyPrefix, { isAnswerMode });
  };

  return (
    <div className={isAnswerMode ? "print-container-answer work03-print" : "print-container work03-print"}>
      {/* 가로 모드 강제 스타일 */}
      <style>{`
        @page {
          size: A4 landscape !important;
          margin: 0 !important;
        }
        @media print {
          html, body {
            width: 29.7cm !important;
            height: 21cm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .a4-landscape-page-template {
            width: 29.7cm !important;
            height: 21cm !important;
            page-break-after: always;
            break-after: page;
          }
          .a4-landscape-page-template:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .print-two-column-container {
            display: flex !important;
            height: 19.3cm !important;
            overflow: hidden !important;
          }
          .print-column {
            height: 19.3cm !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {distributedPages.map((pageColumns, pageIndex) => (
        <div key={`page-${pageIndex}`} className="a4-landscape-page-template page-break">
          <div className="a4-landscape-page-header">
            <PrintHeaderWork01 />
          </div>
          <div className="a4-landscape-page-content">
            <div className="print-two-column-container">
              {pageColumns.map((columnItems, columnIndex) => (
                <div key={`page-${pageIndex}-col-${columnIndex}`} className="print-column">
                  {columnItems.map((item, itemIndex) => 
                    renderNormalizedCard(item, `p${pageIndex}-c${columnIndex}-i${itemIndex}`)
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PrintFormatWork03New;

