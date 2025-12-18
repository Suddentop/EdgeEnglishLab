import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
import {
  NormalizedQuizItem,
  PrintSection
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';

interface TitleQuiz {
  id?: string;
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation?: string;
  optionTranslations?: string[];
}

interface PrintFormatWork08NewProps {
  quizzes: TitleQuiz[];
  isAnswerMode: boolean;
}

// [정밀 보정된 상수]
// 실제 인쇄 가능 높이: 19.3cm ≈ 730px
const PAGE_HEIGHT_PX = 730; 

// 1. 영어 본문 (9.4pt, line-height 1.54)
// 자폭 약 6.25px 가정 (512px / 6.25px ≈ 82자)
const CHARS_PER_LINE_ENG = 82; // 73 -> 82 (줄 수 과대평가 방지)
const LINE_HEIGHT_ENG = 20; // 19.3px -> 20px (안전 마진)

// 2. 한글 해석 (8.8pt, line-height 1.35)
// 자폭 약 11px 가정 (512px / 11px ≈ 46자)
const CHARS_PER_LINE_KOR = 48; // 43 -> 48 (줄 수 과대평가 방지)
const LINE_HEIGHT_KOR = 16; // 15.8px -> 16px

// 3. 선택지 (9.35pt, line-height 1.3)
const CHARS_PER_LINE_OPTION = 85; // 75 -> 85 (줄 수 과대평가 방지)
const HEIGHT_PER_OPTION = 20; // 21 -> 20 (정확한 높이)

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
      // 줄바꿈 문자(\n)가 있으면 그것도 줄 수에 포함
      const paragraphs = textContent.split('\n');
      let totalLines = 0;
      paragraphs.forEach(p => {
        if (p.trim().length > 0) {
           totalLines += Math.ceil(p.length / CHARS_PER_LINE_ENG);
        }
      });
      // 최소 1줄 보장
      totalLines = Math.max(1, totalLines);
      
      return (totalLines * LINE_HEIGHT_ENG) + 30; // 28px -> 30px
    }
    case 'options': {
      // 컨테이너 마진/패딩
      let totalOptionHeight = 10; // 15 -> 10 (여백 축소 가정)
      section.options?.forEach(opt => {
        // 옵션 텍스트 길이 + 번호 (약 5자)
        const textLen = (opt.text || '').length + 5; 
        let lines = Math.ceil(textLen / CHARS_PER_LINE_OPTION);
        
        // 옵션 해석이 있으면 추가 높이 계산 (줄 수에 합산)
        if (opt.translation) {
          const transLen = opt.translation.length;
          const transLines = Math.ceil(transLen / CHARS_PER_LINE_KOR);
          // 해석은 약간 작은 폰트일 수 있으나 안전하게 계산
          lines += transLines; 
        }
        
        // 기본 1줄일 때 HEIGHT_PER_OPTION, 줄바꿈 되면 줄당 높이 추가
        // 줄당 16px 추가 (18 -> 16, 더 정확한 계산)
        const optionHeight = HEIGHT_PER_OPTION + ((lines - 1) * 16);
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
    case 'text':
      // 정답 텍스트 등 (Work_06)
      return 25;
    default:
      return 20;
  }
};

const PrintFormatWork08New: React.FC<PrintFormatWork08NewProps> = ({ quizzes, isAnswerMode }) => {
  
  // Work_08 데이터를 NormalizedQuizItem으로 변환
  const normalizeWork08Quiz = (quiz: TitleQuiz, index: number): NormalizedQuizItem => {
    const sections: PrintSection[] = [];
    const workTypeId = '08';

    // 1. 문제 타이틀
    sections.push({
      type: 'title',
      key: `title-${index}`,
      text: `문제 ${index + 1} : 제목 추론`,
      workTypeId
    });

    // 2. 문제 지시문
    sections.push({
      type: 'instruction',
      key: `instruction-${index}`,
      text: '다음 글의 제목으로 가장 적절한 것을 고르시오.',
      meta: { workTypeId }
    });

    // 3. 영어 본문 (passage) - print-passage 클래스를 사용하여 박스 스타일 적용
    // Work_04와 동일하게 print-passage-work01-11 클래스 사용 (스타일 공유)
    const passageHtml = `<div class="print-passage print-passage-work01-11">${quiz.passage}</div>`;
    sections.push({
      type: 'html',
      key: `html-passage-${index}`,
      html: passageHtml
    });

    // 4. 선택지 - options 타입 사용 (세로 배치 보장)
    // 정답 모드일 때 각 선택지에 해석 추가
    const options = quiz.options.map((opt, i) => ({
      label: ['①', '②', '③', '④', '⑤'][i] || `${i+1}.`,
      text: opt,
      isCorrect: isAnswerMode && Number(quiz.answerIndex) === i,
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
  const normalizedItems = quizzes.map((quiz, index) => normalizeWork08Quiz(quiz, index));

  // 2. 페이지 분배 (정밀 로직 적용)
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
    <div className={isAnswerMode ? "print-container-answer work08-print" : "print-container work08-print"}>
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
        /* 유형#08 인쇄(정답) 모드: 영어본문과 4지선다 사이 여백 50% 감소 */
        .work08-print.print-container-answer .print-passage {
          margin-bottom: 0.125cm !important; /* 기존 0.25cm의 50% */
        }
        /* 유형#08 인쇄(정답) 모드: 4지선다와 본문해석 사이 여백 50% 감소 */
        .work08-print.print-container-answer .print-options {
          margin-bottom: 0.25cm !important; /* 기존 0.5cm의 50% */
        }
        .work08-print.print-container-answer .print-translation-section {
          margin-top: 0.15cm !important; /* 기존 0.3cm의 50% */
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

export default PrintFormatWork08New;
