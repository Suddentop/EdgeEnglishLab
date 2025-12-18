import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
import {
  NormalizedQuizItem,
  PrintSection
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';

interface MainIdeaQuiz {
  id?: string;
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation: string;
  optionTranslations: string[];
}

interface PrintFormatWork07NewProps {
  quizzes: MainIdeaQuiz[];
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

const PrintFormatWork07New: React.FC<PrintFormatWork07NewProps> = ({ quizzes, isAnswerMode }) => {
  
  // Work_07 데이터를 NormalizedQuizItem으로 변환
  const normalizeWork07Quiz = (quiz: MainIdeaQuiz, index: number): NormalizedQuizItem => {
    const sections: PrintSection[] = [];
    const workTypeId = '07';

    // 1. 문제 타이틀
    sections.push({
      type: 'title',
      key: `title-${index}`,
      text: `문제 ${index + 1} : 주제 추론`,
      workTypeId
    });

    // 2. 문제 지시문
    sections.push({
      type: 'instruction',
      key: `instruction-${index}`,
      text: '다음 글의 주제로 가장 적절한 것을 고르시오.',
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
  const normalizedItems = quizzes.map((quiz, index) => normalizeWork07Quiz(quiz, index));

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
      // 1. 아이템 높이 정밀 분석 (3단계 분할 로직 A/B/C)
      // A: 문제 헤더 + 본문 (title, instruction, html)
      // B: 핵심 질문/선택지 (options)
      // C: 부가 정보 (translation)
      
      const sectionA = item.sections.filter(s => ['title', 'instruction', 'html'].includes(s.type));
      const sectionB = item.sections.filter(s => ['options'].includes(s.type));
      const sectionC = item.sections.filter(s => ['translation'].includes(s.type));

      const heightA = sectionA.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const heightB = sectionB.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const heightC = sectionC.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      
      const buffer = 0; // 5 -> 0 (최대한 타이트하게 계산, 과대평가 방지)
      const heightTotal = heightA + heightB + heightC + buffer;
      const heightAB = heightA + heightB + buffer;

      // 현재 단에 내용이 있으면 무조건 다음 단으로 이동 (새로운 문제는 항상 새 단에서 시작)
      if (currentColumns[currentColumnIndex].length > 0) {
        moveToNextColumn();
      }

      // 2. 분할 결정 (A/B/C Split Logic)
      if (isAnswerMode && sectionC.length > 0) {
        // 정답 모드일 때만 분할 로직 적용
        if (heightTotal <= PAGE_HEIGHT_PX) {
          // Case 1: A + B + C <= H → 모두 현재 단에 배치
          addToCurrentColumn(item);
        } else {
          if (heightAB <= PAGE_HEIGHT_PX) {
            // Case 2: A + B + C > H 이고 A + B <= H → A + B는 현재 단, C는 다음 단으로 분리
            const itemAB: NormalizedQuizItem = {
              ...item,
              sections: [...sectionA, ...sectionB]
            };
            const itemC: NormalizedQuizItem = {
              originalItem: item.originalItem,
              workTypeId: item.workTypeId,
              sections: sectionC,
              chunkMeta: { ...item.chunkMeta, isSplitPart: true }
            };

            // Item A+B를 현재 단에 배치
            addToCurrentColumn(itemAB);

            // Item C(해석)를 다음 단으로 이동하여 배치
            moveToNextColumn();
            addToCurrentColumn(itemC);
          } else {
            // Case 3: A + B > H → A는 현재 단, B + C는 다음 단으로 분리
            // (만약 A 자체도 높다면 어쩔 수 없이 넘치거나 짤림, 하지만 시작은 현재 단)
            const itemA: NormalizedQuizItem = {
              ...item,
              sections: sectionA
            };
            const itemBC: NormalizedQuizItem = {
              originalItem: item.originalItem,
              workTypeId: item.workTypeId,
              sections: [...sectionB, ...sectionC],
              chunkMeta: { ...item.chunkMeta, isSplitPart: true }
            };

            // Item A를 현재 단에 배치
            addToCurrentColumn(itemA);

            // Item B+C를 다음 단으로 이동하여 배치
            moveToNextColumn();
            addToCurrentColumn(itemBC);
          }
        }
      } else {
        // 문제 모드이거나 해석이 없는 경우: 분할 없이 그대로 배치
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
    <div className={isAnswerMode ? "print-container-answer work07-print" : "print-container work07-print"}>
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
        /* 유형#07 인쇄(정답) 모드: 영어본문과 4지선다 사이 여백 50% 감소 */
        .work07-print.print-container-answer .print-passage {
          margin-bottom: 0.125cm !important; /* 기존 0.25cm의 50% */
        }
        /* 유형#07 인쇄(정답) 모드: 4지선다와 본문해석 사이 여백 50% 감소 */
        .work07-print.print-container-answer .print-options {
          margin-bottom: 0.25cm !important; /* 기존 0.5cm의 50% */
        }
        .work07-print.print-container-answer .print-translation-section {
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

export default PrintFormatWork07New;
