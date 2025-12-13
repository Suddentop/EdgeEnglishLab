import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
import {
  NormalizedQuizItem,
  PrintSection
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';

interface GrammarQuiz {
  id?: string;
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  original: string;
}

interface PrintFormatWork09NewProps {
  quizzes: GrammarQuiz[];
  isAnswerMode: boolean;
}

// [정밀 보정된 상수]
const PAGE_HEIGHT_PX = 730; 

const CHARS_PER_LINE_ENG = 73; 
const LINE_HEIGHT_ENG = 20; 

const CHARS_PER_LINE_KOR = 43;
const LINE_HEIGHT_KOR = 16; 

const CHARS_PER_LINE_OPTION = 75;
const HEIGHT_PER_OPTION = 21; 

// 높이 계산 헬퍼 함수
const estimateSectionHeight = (section: PrintSection): number => {
  switch (section.type) {
    case 'title':
      return 45; 
    case 'instruction':
      return 35;
    case 'html': {
      const textContent = section.html ? section.html.replace(/<[^>]*>/g, '') : '';
      const paragraphs = textContent.split('\n');
      let totalLines = 0;
      paragraphs.forEach(p => {
        if (p.trim().length > 0) {
           totalLines += Math.ceil(p.length / CHARS_PER_LINE_ENG);
        }
      });
      totalLines = Math.max(1, totalLines);
      return (totalLines * LINE_HEIGHT_ENG) + 30; 
    }
    case 'options': {
      let totalOptionHeight = 15; 
      section.options?.forEach(opt => {
        const textLen = (opt.text || '').length + 5; 
        const lines = Math.ceil(textLen / CHARS_PER_LINE_OPTION);
        const optionHeight = HEIGHT_PER_OPTION + ((lines - 1) * 18);
        totalOptionHeight += optionHeight;
      });
      return totalOptionHeight;
    }
    case 'translation': {
      const textContent = section.text || '';
      const paragraphs = textContent.split('\n');
      let totalLines = 0;
      paragraphs.forEach(p => {
        if (p.trim().length > 0) {
           totalLines += Math.ceil(p.length / CHARS_PER_LINE_KOR);
        }
      });
      totalLines = Math.max(1, totalLines);
      return (totalLines * LINE_HEIGHT_KOR) + 40; 
    }
    case 'answer': // 정답 및 해설 영역
      return 40;
    default:
      return 20;
  }
};

const PrintFormatWork09New: React.FC<PrintFormatWork09NewProps> = ({ quizzes, isAnswerMode }) => {
  
  const normalizeWork09Quiz = (quiz: GrammarQuiz, index: number): NormalizedQuizItem => {
    const sections: PrintSection[] = [];
    const workTypeId = '09';

    // 1. 문제 타이틀
    sections.push({
      type: 'title',
      key: `title-${index}`,
      text: `문제 ${index + 1} : 어법 변형`,
      workTypeId
    });

    // 2. 문제 지시문
    sections.push({
      type: 'instruction',
      key: `instruction-${index}`,
      text: '다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?',
      meta: { workTypeId }
    });

    // 3. 영어 본문 (passage)
    // 마크다운 밑줄을 HTML 태그로 변환 (이미 HTML 형식이면 그대로 사용)
    let processedPassage = quiz.passage;
    if (!processedPassage.includes('<span class="grammar-error-highlight">')) {
         processedPassage = processedPassage
          .replace(/\*\*(.+?)\*\*/g, '<u>$1</u>')
          .replace(/__(.+?)__/g, '<u>$1</u>')
          .replace(/_(.+?)_/g, '<u>$1</u>');
    }
    
    // 줄바꿈 처리
    processedPassage = processedPassage.replace(/\n/g, '<br/>');

    // renderSectionNode에서 자동으로 print-html-block 클래스를 추가하므로 외부 div 제거
    sections.push({
      type: 'html',
      key: `html-passage-${index}`,
      html: processedPassage
    });

    // 4. 선택지
    const options = quiz.options.map((opt, i) => {
      // 정답 모드일 때만 정답/오답 정보 추가
      // (printRenderers에서 처리하도록 options에 isCorrect 설정됨)
      // 하지만 우리는 렌더링 시 "텍스트 뒤에" 정답 정보를 붙이고 싶음.
      // printRenderers.tsx 의 options 렌더링 로직을 수정하지 않고 여기서 처리하려면
      // text 자체에 정답 정보를 붙이는 것은 위험할 수 있음 (마크업이 꼬일 수 있음)
      // 따라서 printRenderers가 정답 마크를 표시하는 방식을 따르되,
      // Work_09의 경우 별도의 answer-info 섹션을 추가하지 않고 옵션 텍스트 자체를 수정하거나,
      // 또는 printRenderers가 Work_09에 대해 특수한 처리를 하도록 해야 함.
      //
      // 여기서는 정답 설명 텍스트를 별도의 'answer' 섹션으로 추가하지 않고,
      // 옵션 렌더링 이후에 바로 표시되도록 섹션을 구성함.
      return {
        label: ['①', '②', '③', '④', '⑤'][i] || `${i+1}.`,
        text: opt,
        isCorrect: isAnswerMode && Number(quiz.answerIndex) === i
      };
    });
    
    sections.push({
      type: 'options',
      key: `options-${index}`,
      options: options
    });

    // 5. 정답 모드일 때 해석 및 정답 표시
    if (isAnswerMode) {
      // 정답 설명 (옵션 바로 아래에 표시)
      // type: 'text'로 하여 단순 텍스트로 렌더링 (또는 html)
      sections.push({
        type: 'text',
        key: `answer-info-${index}`,
        text: `(정답: 원래/정상 단어 : ${quiz.original})`,
        meta: { 
          // 스타일링을 위한 메타데이터 (printRenderers에서 처리 필요할 수도 있음, 
          // 하지만 기본 text 타입은 단순 텍스트 div로 렌더링됨)
          className: 'work09-answer-info'
        }
      });

      if (quiz.translation) {
        sections.push({
          type: 'translation',
          key: `translation-${index}`,
          text: quiz.translation
        });
      }
    }

    return {
      originalItem: quiz,
      workTypeId: workTypeId,
      sections: sections,
      chunkMeta: { chunkIndex: 0, totalChunks: 1 }
    };
  };

  const normalizedItems = quizzes.map((quiz, index) => normalizeWork09Quiz(quiz, index));

  const distributeItemsCustom = (items: NormalizedQuizItem[]) => {
    const pages: NormalizedQuizItem[][][] = [];
    let currentColumns: NormalizedQuizItem[][] = [[], []]; 
    let currentColumnIndex = 0;

    const moveToNextColumn = () => {
      currentColumnIndex++;
      if (currentColumnIndex > 1) {
        pages.push(currentColumns);
        currentColumns = [[], []];
        currentColumnIndex = 0;
      }
    };

    const addToCurrentColumn = (item: NormalizedQuizItem) => {
      currentColumns[currentColumnIndex].push(item);
    };

    items.forEach((item) => {
      // 1. 아이템 높이 정밀 분석 (3단계 분할 로직 A/B/C)
      // A: Title + Instruction + Passage (HTML)
      // B: Options + Answer Info (Text)
      // C: Translation
      
      const sectionA = item.sections.filter(s => ['title', 'instruction', 'html'].includes(s.type));
      const sectionB = item.sections.filter(s => ['options', 'answer', 'text'].includes(s.type));
      const sectionC = item.sections.filter(s => ['translation'].includes(s.type));

      const heightA = sectionA.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const heightB = sectionB.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const heightC = sectionC.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      
      const totalHeight = heightA + heightB + heightC;

      // 현재 단에 내용이 있으면 무조건 다음 단으로 이동
      if (currentColumns[currentColumnIndex].length > 0) {
        moveToNextColumn();
      }

      // 2. 분할 결정 (A/B/C Split Logic)
      if (isAnswerMode && sectionC.length > 0) {
          if (totalHeight <= PAGE_HEIGHT_PX) {
              // Case 1: All fit
              addToCurrentColumn(item);
          } else if (heightA + heightB <= PAGE_HEIGHT_PX) {
              // Case 2: A+B fit, C moves to next
              const itemMain: NormalizedQuizItem = { ...item, sections: [...sectionA, ...sectionB] };
              const itemTrans: NormalizedQuizItem = { 
                  ...item, 
                  sections: sectionC, 
                  chunkMeta: { ...item.chunkMeta, isSplitPart: true } 
              };
              addToCurrentColumn(itemMain);
              moveToNextColumn();
              addToCurrentColumn(itemTrans);
          } else if (heightA <= PAGE_HEIGHT_PX) {
              // Case 3: A fits, B+C move to next
              const itemMain: NormalizedQuizItem = { ...item, sections: sectionA };
              const itemRest: NormalizedQuizItem = { 
                  ...item, 
                  sections: [...sectionB, ...sectionC], 
                  chunkMeta: { ...item.chunkMeta, isSplitPart: true } 
              };
              addToCurrentColumn(itemMain);
              moveToNextColumn();
              addToCurrentColumn(itemRest);
          } else {
               // A doesn't fit (fallback: put everything in one and let it overflow or split brutally)
               // For now, put A in current, B+C in next (A will overflow)
               const itemMain: NormalizedQuizItem = { ...item, sections: sectionA };
               const itemRest: NormalizedQuizItem = { 
                   ...item, 
                   sections: [...sectionB, ...sectionC], 
                   chunkMeta: { ...item.chunkMeta, isSplitPart: true } 
               };
               addToCurrentColumn(itemMain);
               moveToNextColumn();
               addToCurrentColumn(itemRest);
          }
      } else {
        // Not answer mode or no translation -> check basic fit
        // For Problem mode, typically A+B. If A+B > Height, we might need logic, but for now assume A+B fits or A is large.
        // Problem mode usually doesn't have C.
        addToCurrentColumn(item);
      }
    });

    if (currentColumns[0].length > 0 || currentColumns[1].length > 0) {
      pages.push(currentColumns);
    }

    return pages;
  };

  const distributedPages = distributeItemsCustom(normalizedItems);

  const renderNormalizedCard = (
    normalizedItem: NormalizedQuizItem,
    keyPrefix: string
  ): React.ReactNode => {
    return renderNormalizedCardNode(normalizedItem, keyPrefix, { isAnswerMode });
  };

  return (
    <div className={isAnswerMode ? "print-container-answer work09-print" : "print-container work09-print"}>
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
        /* Work 09 Specific Styles */
        .work09-print .grammar-error-highlight u {
            text-decoration: underline;
            text-underline-offset: 3px;
            font-weight: 500;
        }
        .work09-print .print-column .print-text-block {
             margin-top: 0.2cm;
             margin-bottom: 0.5cm;
             color: #1976d2 !important;
             font-weight: 700;
             font-size: 10pt;
        }
        /* 문제 제목 패딩 설정 - 인쇄(문제)와 인쇄(정답) 동일 */
        .work09-print .print-question-title {
             padding-left: 0.2cm !important;
             margin-bottom: 0.25cm !important;
             padding-bottom: 0.15cm !important;
             margin-top: 0 !important;
        }
        /* 첫 번째 카드의 제목: 헤더와의 간격 확보 - 인쇄(문제)와 인쇄(정답) 동일 */
        .work09-print.print-container .print-column > .print-question-card:first-child .print-question-title,
        .work09-print.print-container-answer .print-column > .print-question-card:first-child .print-question-title {
            margin-top: 0.3cm !important;
        }
        .work09-print .print-passage {
             padding-left: 0 !important;
             padding-right: 0 !important;
             padding-top: 0 !important;
             padding-bottom: 0 !important;
             margin-left: 0 !important;
             margin-right: 0 !important;
        }
        .work09-print .print-html-block {
             padding-left: 0.2cm !important;
             padding-right: 0 !important;
             margin-left: 0 !important;
             margin-right: 0 !important;
        }
        .work09-print .print-options {
             padding-left: 0.2cm !important;
             padding-right: 0 !important;
        }
        .work09-print .print-option {
             padding-left: 0 !important;
        }
        
        /* 인쇄(정답) 모드: 각 단 컨테이너 내부 여백 설정 */
        .work09-print.print-container-answer .print-column {
            padding: 0.1cm 0 0 0.5cm !important;
            margin: 0 !important;
            gap: 0.3cm !important;
        }
        .work09-print.print-container-answer .print-question-card {
            padding: 0.1cm 0 0 0 !important;
            margin: 0 !important;
        }
        /* 인쇄(문제) 모드: 인쇄(정답) 모드와 동일한 여백 적용 */
        .work09-print.print-container .print-column {
            padding: 0.1cm 0 0 0.5cm !important;
            margin: 0 !important;
            gap: 0.3cm !important;
        }
        .work09-print.print-container .print-question-card {
            padding: 0.1cm 0 0 0 !important;
            margin: 0 !important;
        }
        /* 페이지 콘텐츠 패딩 제거 */
        .work09-print .a4-landscape-page-content {
            padding: 0 !important;
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

export default PrintFormatWork09New;

