import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
import {
  NormalizedQuizItem,
  PrintSection
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderSectionNode } from '../Package_02_TwoStepQuiz/printRenderers';
import {
  splitNormalizedItemByHeight,
  distributeNormalizedItemsToPages
} from '../Package_02_TwoStepQuiz/printLayoutUtils';

interface SentencePositionQuiz {
  id?: string;
  missingSentence: string;
  numberedPassage: string;
  answerIndex: number; // 0~4 (①~⑤)
  translation?: string;
}

interface PrintFormatWork06NewProps {
  quizzes: SentencePositionQuiz[];
  isAnswerMode: boolean;
}

const PrintFormatWork06New: React.FC<PrintFormatWork06NewProps> = ({ quizzes, isAnswerMode }) => {

  // Work_06 데이터를 NormalizedQuizItem으로 변환
  const normalizeWork06Quiz = (quiz: SentencePositionQuiz, index: number): NormalizedQuizItem => {
    const sections: PrintSection[] = [];
    const workTypeId = '06';

    // 1. 문제 타이틀
    sections.push({
      type: 'title',
      key: `title-${index}`,
      text: `문제 ${index + 1} : 문장 위치 찾기`,
      workTypeId
    });

    // 2. 문제 지시문
    sections.push({
      type: 'instruction',
      key: `instruction-${index}`,
      text: '다음 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.',
      meta: { workTypeId }
    });

    // 3. 주요 문장 (missingSentence) - 하단 간격 최소화 (글자 크기는 CSS 기본 규칙 사용, 왼쪽 들여쓰기 제거)
    // 정답 모드에서는 주요 문장을 별도로 표시하지 않고 본문에 통합하므로 렌더링하지 않음
    if (!isAnswerMode) {
      const missingSentenceHtml = `<div class="print-passage print-passage-work01-11 work06-missing-sentence" style="border-radius: 6px; background: #f7f8fc; padding: 0.8em 0 !important; padding-top: 0.8em !important; padding-bottom: 0.8em !important; padding-left: 0 !important; padding-right: 0 !important; margin-bottom: 0 !important; margin-left: 0 !important; font-weight: 700; box-sizing: border-box;">
        <span style="color: #222;">주요 문장:</span> <span style="color: #6a5acd;">${quiz.missingSentence}</span>
      </div>`;
      sections.push({
        type: 'html',
        key: `html-missing-sentence-${index}`,
        html: missingSentenceHtml
      });
    }

    // 4. 번호가 매겨진 본문 (numberedPassage) - 컨테이너 없이 배치, 상단 간격 최소화, 내부 상하 여백 완전 제거, 크기 자동 조정 (글자 크기는 CSS 기본 규칙 사용)
    // 텍스트 앞뒤 공백 제거하고 span으로 감싸서 line-height 여백 제거
    let passageContent = quiz.numberedPassage.trim();

    // 정답 모드일 경우: 번호(①~⑤)를 그대로 유지하고, 정답 위치의 번호 뒤에 주요 문장 삽입
    if (isAnswerMode) {
      const markers = ['①', '②', '③', '④', '⑤'];
      const targetMarker = markers[quiz.answerIndex];
      // 정답 문장 강조 (파란색 + 굵게)
      // 마커 뒤에 한 칸 띄우고 문장 삽입
      const replacement = `${targetMarker} <span style="color: #1976d2; font-weight: 700;">${quiz.missingSentence}</span>`;

      if (passageContent.includes(targetMarker)) {
        // ①~⑤ 마커가 있는 경우 해당 마커 뒤에 문장 추가 (마커 유지)
        passageContent = passageContent.replace(targetMarker, replacement);
      } else {
        // (1)~(5) 형식 마커 폴백 확인
        const targetParen = `(${quiz.answerIndex + 1})`;
        if (passageContent.includes(targetParen)) {
          const parenReplacement = `${targetParen} <span style="color: #1976d2; font-weight: 700;">${quiz.missingSentence}</span>`;
          passageContent = passageContent.replace(targetParen, parenReplacement);
        }
      }
      
      // 마커 유지 및 문장 삽입
    }

    const numberedPassageHtml = `<div class="print-passage print-passage-work01-11 work06-numbered-passage" style="line-height: 0 !important; margin: 0 0 0.15rem 0 !important; padding: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; padding-left: 0 !important; padding-right: 0 !important; font-family: inherit; white-space: pre-line; box-sizing: border-box; display: block; width: auto !important; height: auto !important; min-width: 0 !important; max-width: 100% !important; min-height: 0 !important; max-height: none !important; vertical-align: top !important; overflow: visible !important;"><span style="line-height: 1.7 !important; display: block !important; margin: 0 !important; padding: 0 !important; vertical-align: top !important;">${passageContent}</span></div>`;
    sections.push({
      type: 'html',
      key: `html-numbered-passage-${index}`,
      html: numberedPassageHtml
    });

    // 5. 정답 모드일 때 해석 (4지선다 제거됨)
    if (isAnswerMode && quiz.translation) {
      sections.push({
        type: 'translation',
        key: `translation-${index}`,
        text: quiz.translation
        // 정답이 본문에 통합되었으므로 별도의 정답 표시는 하지 않음
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
  const normalizedItems = quizzes.map((quiz, index) => normalizeWork06Quiz(quiz, index));

  // 2. 높이 기반 분할 (긴 문제는 자동으로 나뉨)
  const expandedNormalizedItems = normalizedItems.flatMap((item) =>
    splitNormalizedItemByHeight(item)
  );

  // 3. 페이지 분배 (높이 기반 분할된 아이템들을 페이지에 배치)
  const distributedPages = distributeNormalizedItemsToPages(expandedNormalizedItems);

  // 4. 렌더링 헬퍼 - 카드 컨테이너 없이 직접 섹션들을 렌더링
  const renderNormalizedCard = (
    normalizedItem: NormalizedQuizItem,
    keyPrefix: string
  ): React.ReactNode => {
    // 카드 컨테이너 제거, 섹션들을 직접 렌더링
    return (
      <React.Fragment key={`fragment-${keyPrefix}`}>
        {normalizedItem.sections.map((section, sectionIndex) =>
          renderSectionNode(normalizedItem, section, sectionIndex, keyPrefix, { isAnswerMode })
        )}
      </React.Fragment>
    );
  };

  return (
    <div className={isAnswerMode ? "print-container-answer work06-print" : "print-container work06-print"}>
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
        /* 유형#06 주요 문장과 영어 본문 사이 간격 제거 및 왼쪽 들여쓰기 제거 (카드 컨테이너 제거됨) */
        .work06-print .print-column .work06-missing-sentence,
        .work06-print .work06-missing-sentence {
          margin-bottom: 0 !important;
          margin-left: 0 !important;
          padding-left: 0 !important;
        }
        /* 주요문장 컨테이너의 .print-passage 기본 padding 오버라이드 */
        .work06-print .print-column .work06-missing-sentence.print-passage,
        .work06-print .work06-missing-sentence.print-passage {
          margin-left: 0 !important;
          padding-left: 0 !important;
        }
        .work06-print .print-column .work06-numbered-passage,
        .work06-print .work06-numbered-passage {
          margin-top: 0 !important;
          margin-bottom: 0.15rem !important; /* 기존 0.3rem의 50% (원래 1.2rem의 12.5%) */
        }
        /* .print-passage 기본 마진 오버라이드 */
        .work06-print .print-column .work06-missing-sentence.print-passage,
        .work06-print .work06-missing-sentence.print-passage {
          margin-bottom: 0 !important;
        }
        .work06-print .print-column .work06-numbered-passage.print-passage,
        .work06-print .work06-numbered-passage.print-passage {
          margin-top: 0 !important;
          margin-bottom: 0.15rem !important; /* 기존 0.3rem의 50% (원래 1.2rem의 12.5%) */
          margin-left: 0 !important;
          padding: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          width: auto !important;
          height: auto !important;
          min-width: 0 !important;
          max-width: 100% !important;
          min-height: 0 !important;
          max-height: none !important;
        }
        .work06-print .print-column .work06-numbered-passage,
        .work06-print .work06-numbered-passage {
          padding: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          width: auto !important;
          height: auto !important;
          min-width: 0 !important;
          max-width: 100% !important;
          min-height: 0 !important;
          max-height: none !important;
        }
        /* 영어본문 첫 줄과 상단 테두리 사이 여백 완전 제거 (카드 컨테이너 제거됨) */
        .work06-print .print-column .work06-numbered-passage::before,
        .work06-print .work06-numbered-passage::before,
        .work06-print .print-column .work06-numbered-passage::after,
        .work06-print .work06-numbered-passage::after {
          content: none !important;
          display: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .work06-print .print-column .work06-numbered-passage > *:first-child,
        .work06-print .work06-numbered-passage > *:first-child {
          margin-top: 0 !important;
          padding-top: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        /* line-height로 인한 상단 여백 제거 - 모든 여백 완전 제거 */
        .work06-print .print-column .work06-numbered-passage,
        .work06-print .work06-numbered-passage {
          text-indent: 0 !important;
          vertical-align: top !important;
          overflow: visible !important;
          margin-top: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          border-spacing: 0 !important;
          border-collapse: collapse !important;
          /* line-height로 인한 첫 줄 위 여백 제거 - 컨테이너의 line-height를 0으로 */
          line-height: 0 !important;
          display: block !important;
        }
        /* 내부 span에 line-height 적용 - 텍스트 내용에만 (글자 크기는 CSS 기본 규칙 사용) */
        .work06-print .print-column .work06-numbered-passage > span,
        .work06-print .work06-numbered-passage > span {
          line-height: 1.7 !important;
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          vertical-align: top !important;
        }
        /* .print-passage-work01-11 클래스의 line-height 오버라이드 - 첫 줄 여백 제거 (글자 크기는 CSS 기본 규칙 사용) */
        .work06-print .print-column .work06-numbered-passage.print-passage-work01-11,
        .work06-print .work06-numbered-passage.print-passage-work01-11 {
          line-height: 1.7 !important;
          padding: 0 !important;
          margin: 0 0 0.15rem 0 !important; /* 기존 0.3rem의 50% (원래 1.2rem의 12.5%) */
        }
        /* 첫 줄의 상단 여백 제거 - line-height로 인한 여백 보정 */
        .work06-print .print-column .work06-numbered-passage::first-line,
        .work06-print .work06-numbered-passage::first-line {
          line-height: 1.7 !important;
          margin-top: 0 !important;
          padding-top: 0 !important;
          vertical-align: top !important;
        }
        /* 텍스트 노드 자체의 여백 제거 */
        .work06-print .print-column .work06-numbered-passage:first-child,
        .work06-print .work06-numbered-passage:first-child {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
        /* 모든 자식 요소의 여백 제거 */
        .work06-print .print-column .work06-numbered-passage *,
        .work06-print .work06-numbered-passage * {
          margin-top: 0 !important;
          padding-top: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        /* 유형#06 각 컨테이너 사이 여백 추가 50% 감소 (보라색 컨테이너 상단 제외) */
        .work06-print .print-column .print-question-title,
        .work06-print .print-question-title {
          margin-bottom: 0.03125cm !important; /* 기존 0.0625cm의 50% (원래 0.25cm의 12.5%) */
          padding-bottom: 0.01875cm !important; /* 기존 0.0375cm의 50% (원래 0.15cm의 12.5%) */
        }
        /* 유형#06 첫 번째 타이틀(보라색 컨테이너)과 헤더 하단 사이 여백 증가 (변경 없음) */
        .work06-print .print-column > .print-question-title:first-child,
        .work06-print .print-column > *:first-child.print-question-title {
          margin-top: 0.5cm !important; /* 헤더와의 간격 확보 */
        }
        /* 문제 모드에서도 첫 번째 타이틀 여백 증가 (변경 없음) */
        .work06-print.print-container .print-column > .print-question-title:first-child,
        .work06-print.print-container .print-column > *:first-child.print-question-title {
          margin-top: 0.5cm !important;
        }
        /* 정답 모드에서도 첫 번째 타이틀 여백 증가 (변경 없음) */
        .work06-print.print-container-answer .print-column > .print-question-title:first-child,
        .work06-print.print-container-answer .print-column > *:first-child.print-question-title,
        .work06-print .print-answer-mode .print-column > .print-question-title:first-child,
        .work06-print .print-answer-mode .print-column > *:first-child.print-question-title {
          margin-top: 0.5cm !important;
        }
        .work06-print .print-column .print-instruction,
        .work06-print .print-instruction {
          margin-bottom: 0.03125cm !important; /* 기존 0.0625cm의 50% (원래 0.25cm의 12.5%) */
        }
        .work06-print .print-column .print-translation-section,
        .work06-print .print-translation-section {
          margin-top: 0.0375cm !important; /* 기존 0.075cm의 50% (원래 0.3cm의 12.5%) */
        }
        /* 문제 모드에서도 타이틀과 지시문 여백 추가 50% 감소 */
        .work06-print.print-container .print-column .print-question-title,
        .work06-print.print-container .print-question-title {
          margin-bottom: 0.03125cm !important;
          padding-bottom: 0.01875cm !important;
        }
        .work06-print.print-container .print-column .print-instruction,
        .work06-print.print-container .print-instruction {
          margin-bottom: 0.03125cm !important;
        }
        /* 정답 모드에서도 타이틀과 지시문 여백 추가 50% 감소 */
        .work06-print.print-container-answer .print-column .print-question-title,
        .work06-print.print-container-answer .print-question-title,
        .work06-print .print-answer-mode .print-column .print-question-title,
        .work06-print .print-answer-mode .print-question-title {
          margin-bottom: 0.03125cm !important;
          padding-bottom: 0.01875cm !important;
        }
        .work06-print.print-container-answer .print-column .print-instruction,
        .work06-print.print-container-answer .print-instruction,
        .work06-print .print-answer-mode .print-column .print-instruction,
        .work06-print .print-answer-mode .print-instruction {
          margin-bottom: 0.03125cm !important;
        }
        .work06-print.print-container-answer .print-column .print-translation-section,
        .work06-print.print-container-answer .print-translation-section,
        .work06-print .print-answer-mode .print-column .print-translation-section,
        .work06-print .print-answer-mode .print-translation-section {
          margin-top: 0.0375cm !important; /* 기존 0.075cm의 50% (원래 0.3cm의 12.5%) */
        }
        /* 첫 번째 타이틀 다음 요소는 여백 제거 (첫 번째 타이틀의 margin-top은 유지) */
        .work06-print .print-column > .print-question-title:first-child + * {
          margin-top: 0 !important;
        }
        /* 각 문제(fragment) 사이 여백 제거 또는 최소화 (단, 첫 번째 타이틀의 margin-top은 유지) */
        .work06-print .print-column > *:not(:first-child):not(.print-question-title) {
          margin-top: 0 !important;
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

export default PrintFormatWork06New;

