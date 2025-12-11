import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
import {
  NormalizedQuizItem,
  PrintSection,
  OPTION_LABELS
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';
import {
  splitNormalizedItemByHeight,
  distributeNormalizedItemsToPages
} from '../Package_02_TwoStepQuiz/printLayoutUtils';

interface BlankQuiz {
  id?: string;
  blankedText: string;
  options: string[];
  answerIndex: number;
  optionTranslations?: string[];
  translation?: string;
}

interface PrintFormatWork05NewProps {
  quizzes: BlankQuiz[];
  isAnswerMode: boolean;
}

const PrintFormatWork05New: React.FC<PrintFormatWork05NewProps> = ({ quizzes, isAnswerMode }) => {

  // Work_05 데이터를 NormalizedQuizItem으로 변환
  const normalizeWork05Quiz = (quiz: BlankQuiz, index: number): NormalizedQuizItem => {
    const sections: PrintSection[] = [];
    const workTypeId = '05';

    // 1. 문제 타이틀
    sections.push({
      type: 'title',
      key: `title-${index}`,
      text: `문제 ${index + 1} : 빈칸(문장) 추론`,
      workTypeId
    });

    // 2. 문제 지시문
    sections.push({
      type: 'instruction',
      key: `instruction-${index}`,
      text: '다음 빈칸에 들어갈 문장(sentence)으로 가장 적절한 것을 고르시오.',
      meta: { workTypeId }
    });

    // 3. 영어 본문 (blankedText) - 정답 문장 단어 수 × 5만큼 밑줄로 빈칸 생성, 최대 30자로 제한
    const answer = quiz.options[quiz.answerIndex] || '';
    const wordCount = answer.trim().split(/\s+/).length;
    const blankLength = Math.max(answer.length, wordCount * 5);
    const maxBlankLength = 30;
    const blankStr = '(' + '_'.repeat(Math.min(blankLength, maxBlankLength)) + ')';
    // 괄호 안에 어떤 내용이 있든 첫 번째만 밑줄로 치환
    const displayBlankedText = quiz.blankedText.replace(/\([^)]*\)/, blankStr);
    
    const blankedTextHtml = `<div class="print-passage print-passage-work01-11">${displayBlankedText}</div>`;
    sections.push({
      type: 'html',
      key: `html-passage-${index}`,
      html: blankedTextHtml
    });

    // 4. 선택지 - options 타입 사용 (세로 배치 보장)
    const options = quiz.options.map((opt, i) => ({
      label: OPTION_LABELS[i] || `${i+1}.`,
      text: opt,
      isCorrect: isAnswerMode && i === quiz.answerIndex,
      translation: isAnswerMode && quiz.optionTranslations && quiz.optionTranslations[i] ? quiz.optionTranslations[i] : undefined
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
  const normalizedItems = quizzes.map((quiz, index) => normalizeWork05Quiz(quiz, index));

  // 2. 높이 기반 분할 (긴 문제는 자동으로 나뉨)
  const expandedNormalizedItems = normalizedItems.flatMap((item) =>
    splitNormalizedItemByHeight(item)
  );

  // 3. 페이지 분배 (높이 기반 분할된 아이템들을 페이지에 배치)
  const distributedPages = distributeNormalizedItemsToPages(expandedNormalizedItems);

  // 3. 렌더링 헬퍼
  const renderNormalizedCard = (
    normalizedItem: NormalizedQuizItem,
    keyPrefix: string
  ): React.ReactNode => {
    return renderNormalizedCardNode(normalizedItem, keyPrefix, { isAnswerMode });
  };

  return (
    <div className={isAnswerMode ? "print-container-answer work05-print" : "print-container work05-print"}>
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
        /* 유형#05 인쇄(정답) 모드 여백 80% 감소 */
        .work05-print.print-container-answer .print-passage {
          margin-bottom: 0.025cm !important; /* 기존 0.05cm의 50% 추가 감소 */
        }
        .work05-print.print-container-answer .print-options {
          margin-top: 0 !important;
          margin-bottom: 0.1cm !important; /* 기존 0.5cm의 20% */
        }
        .work05-print.print-container-answer .print-translation-section {
          margin-top: 0.06cm !important; /* 기존 0.3cm의 20% */
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

export default PrintFormatWork05New;

