import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
import { Quiz } from '../../../types/types';
import {
  NormalizedQuizItem,
  normalizeQuizItemForPrint,
  PrintSection
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';

interface PrintFormatWork01NewProps {
  quizzes: Quiz[];
  isAnswerMode?: boolean;
}

// [정밀 보정된 상수]
// 실제 인쇄 가능 높이: 19.3cm ≈ 730px
const PAGE_HEIGHT_PX = 730; 

// 1. 영어 본문/단락 (9.4pt, line-height 1.54)
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
    case 'paragraph': {
      // 단락: 패딩 + 마진
      const textContent = section.text || '';
      const paragraphs = textContent.split('\n');
      let totalLines = 0;
      paragraphs.forEach(p => {
        if (p.trim().length > 0) {
           totalLines += Math.ceil(p.length / CHARS_PER_LINE_ENG);
        }
      });
      totalLines = Math.max(1, totalLines);
      // 라벨((A), (B) 등)이 있으면 한 줄 정도 추가 공간 고려하거나 포함됨
      // Work_01 단락은 박스 안에 들어감. 패딩 고려.
      return (totalLines * LINE_HEIGHT_ENG) + 20; 
    }
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
    case 'answer':
      // 정답 섹션 (Work_01은 보통 options 안에 정답 표시가 있지만 별도 섹션일 수도 있음)
      return 25;
    default:
      return 20;
  }
};

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

  // 1. 데이터 정규화
  const normalizedItems = packageQuiz.map((item, index) => {
    const normalized = normalizeQuizItemForPrint(item, {
      isAnswerMode,
      cleanOptionText,
      renderTextWithHighlight,
      getTranslatedText
    });
    
    // 타이틀 수정
    const titleSection = normalized.sections.find(s => s.type === 'title');
    if (titleSection) {
      titleSection.text = `문제 ${index + 1} : 문단 순서 맞추기`;
    }
    
    return normalized;
  });

  // 2. 페이지 분배 (Work_07/08과 동일한 로직 적용)
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

      // 현재 단에 내용이 있으면 무조건 다음 단으로 이동 (새로운 문제는 항상 새 단에서 시작)
      if (currentColumns[currentColumnIndex].length > 0) {
        moveToNextColumn();
      }

      // 2. 분할 결정
      // 전체 높이가 페이지 높이(730px)를 초과하고, 본문+선택지는 페이지 높이보다 작은 경우에만 분할
      // 단, 정답 모드일 때만 적용
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

  const renderNormalizedCard = (
    normalizedItem: NormalizedQuizItem,
    keyPrefix: string
  ): React.ReactNode => {
    return renderNormalizedCardNode(normalizedItem, keyPrefix, { isAnswerMode });
  };

  return (
    <div 
      id={isAnswerMode ? "print-root-work01-new-answer" : "print-root-work01-new"}
      className={isAnswerMode ? "print-container-answer work01-new-print" : "print-container work01-new-print"}
    >
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
        <div 
          key={`page-${pageIndex}`} 
          className="a4-landscape-page-template page-break"
        >
          <div className="a4-landscape-page-header">
            <PrintHeaderWork01 />
          </div>
          <div className="a4-landscape-page-content">
            <div className="print-two-column-container">
              {pageColumns.map((columnItems, columnIndex) => (
                <div 
                  key={`page-${pageIndex}-col-${columnIndex}`} 
                  className="print-column"
                >
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

export default PrintFormatWork01New;