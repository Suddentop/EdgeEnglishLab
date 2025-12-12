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

interface PrintFormatWork04NewProps {
  quizzes: BlankQuiz[];
  isAnswerMode: boolean;
}

// [정밀 보정된 상수]
// 실제 인쇄 가능 높이: 19.3cm ≈ 730px
const PAGE_HEIGHT_PX = 730; 

// 1. 영어 본문 (9.4pt, line-height 1.54)
// 자폭 약 7px 가정 (510px / 7px ≈ 73자)
const CHARS_PER_LINE_ENG = 73; 
const LINE_HEIGHT_ENG = 20; // 19.3px -> 20px (안전 마진)

// 2. 한글 해석 (8.8pt, line-height 1.35)
// 자폭 약 11.7px 가정 (510px / 11.7px ≈ 43.5자)
const CHARS_PER_LINE_KOR = 43;
const LINE_HEIGHT_KOR = 16; // 15.8px -> 16px

// 3. 선택지 (9.35pt, line-height 1.3)
const CHARS_PER_LINE_OPTION = 75; // 영어 기준
const HEIGHT_PER_OPTION = 21; // 15.6px + 마진 4.5px ≈ 20.1px -> 21px

// 높이 계산 헬퍼 함수
const estimateSectionHeight = (section: PrintSection): number => {
  switch (section.type) {
    case 'title':
      // 폰트 11.3pt + 마진/패딩
      return 45; 
    case 'instruction':
      // 폰트 8.8pt + 패딩
      return 35;
    case 'html': {
      // 본문: 패딩 0.25cm * 2 + 마진 0.25cm ≈ 28px
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
      // 컨테이너 마진/패딩
      let totalOptionHeight = 15; 
      section.options?.forEach(opt => {
        const textLen = (opt.text || '').length + 5; // 번호 길이 포함
        const lines = Math.ceil(textLen / CHARS_PER_LINE_OPTION);
        const optionHeight = HEIGHT_PER_OPTION + ((lines - 1) * 18);
        totalOptionHeight += optionHeight;
      });
      return totalOptionHeight;
    }
    case 'translation': {
      // 제목 + 패딩 + 마진
      const textContent = section.text || '';
      const paragraphs = textContent.split('\n');
      let totalLines = 0;
      paragraphs.forEach(p => {
        if (p.trim().length > 0) {
           totalLines += Math.ceil(p.length / CHARS_PER_LINE_KOR);
        }
      });
      totalLines = Math.max(1, totalLines);

      return (totalLines * LINE_HEIGHT_KOR) + 40; // 제목영역 등 고려 40px
    }
    default:
      return 20;
  }
};

const PrintFormatWork04New: React.FC<PrintFormatWork04NewProps> = ({ quizzes, isAnswerMode }) => {
  
  // Work_04 데이터를 NormalizedQuizItem으로 변환
  const normalizeWork04Quiz = (quiz: BlankQuiz, index: number): NormalizedQuizItem => {
    const sections: PrintSection[] = [];
    const workTypeId = '04';

    // 1. 문제 타이틀
    sections.push({
      type: 'title',
      key: `title-${index}`,
      text: `문제 ${index + 1} : 빈칸(구) 추론`,
      workTypeId
    });

    // 2. 문제 지시문
    sections.push({
      type: 'instruction',
      key: `instruction-${index}`,
      text: '다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.',
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
  const normalizedItems = quizzes.map((quiz, index) => normalizeWork04Quiz(quiz, index));

  // 2. 페이지 분배 (커스텀 로직: 새로운 문제는 항상 새로운 단에 배치)
  const distributeItemsCustom = (items: NormalizedQuizItem[]) => {
    const pages: NormalizedQuizItem[][][] = [];
    let currentColumns: NormalizedQuizItem[][] = [[], []]; // [Left, Right]
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
      // 1. 아이템 높이 정밀 분석
      const mainSections = item.sections.filter(s => s.type !== 'translation');
      const transSections = item.sections.filter(s => s.type === 'translation');

      const mainHeight = mainSections.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const transHeight = transSections.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const totalHeight = mainHeight + transHeight;

      // 현재 단에 내용이 있으면 무조건 다음 단으로 이동
      if (currentColumns[currentColumnIndex].length > 0) {
        moveToNextColumn();
      }

      // 2. 분할 결정
      // 전체 높이가 페이지 높이(730px)를 초과하고, 본문+선택지는 페이지 높이보다 작은 경우
      if (isAnswerMode && transSections.length > 0 && totalHeight > PAGE_HEIGHT_PX && mainHeight < PAGE_HEIGHT_PX) {
        // 분할 처리
        
        // Item A: 본문 + 선택지
        const itemMain: NormalizedQuizItem = {
          ...item,
          sections: mainSections,
        };

        // Item B: 해석
        const itemTrans: NormalizedQuizItem = {
          originalItem: item.originalItem,
          workTypeId: item.workTypeId,
          sections: transSections,
          chunkMeta: { ...item.chunkMeta, isSplitPart: true }
        };

        // Item A를 현재 단에 배치
        addToCurrentColumn(itemMain);

        // Item B(해석)를 다음 단으로 이동하여 배치
        moveToNextColumn();
        addToCurrentColumn(itemTrans);
      } else {
        // 분할 불필요 (한 단에 모두 들어가거나, 본문 자체가 너무 커서 분할 의미가 없는 경우)
        addToCurrentColumn(item);
      }
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
    <div className={isAnswerMode ? "print-container-answer work04-print" : "print-container work04-print"}>
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

export default PrintFormatWork04New;
