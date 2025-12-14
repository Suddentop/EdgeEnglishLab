import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
import {
  NormalizedQuizItem,
  PrintSection
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';
import { formatBlankedText } from '../Package_02_TwoStepQuiz/printNormalization';

interface BlankFillQuizWithId {
  id?: string;
  blankedText: string;
  correctAnswers: string[];
  translation: string;
  userAnswer?: string;
  isCorrect?: boolean | null;
}

interface PrintFormatWork13NewProps {
  quizzes: BlankFillQuizWithId[];
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
      // 빈칸 본문: 패딩 0.25cm * 2 + 마진 0.25cm ≈ 28px
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

const PrintFormatWork13New: React.FC<PrintFormatWork13NewProps> = ({ quizzes, isAnswerMode }) => {
  
  // Work_13 데이터를 NormalizedQuizItem으로 변환
  const normalizeWork13Quiz = (quiz: BlankFillQuizWithId, index: number): NormalizedQuizItem => {
    const sections: PrintSection[] = [];
    const workTypeId = '13';

    // 1. 문제 타이틀
    sections.push({
      type: 'title',
      key: `title-${index}`,
      text: `문제 ${index + 1} : 빈칸 채우기`,
      workTypeId
    });

    // 2. 문제 지시문
    sections.push({
      type: 'instruction',
      key: `instruction-${index}`,
      text: '다음 빈칸에 들어갈 단어를 직접 입력하시오.',
      meta: { workTypeId }
    });

    // 3. 빈칸 본문 (정답 모드일 때는 정답 포함)
    let passageHtml = '';
    if (isAnswerMode) {
      // 정답 모드: 빈칸에 정답 표시
      const formattedText = formatBlankedText(
        quiz.blankedText || '',
        quiz.correctAnswers || []
      );
      // formatBlankedText로 변환된 패턴: ( _ _ _ _ _ )
      const parts = formattedText.split(/(\([\s_]+\))/);
      let answerIndex = 0;
      passageHtml = parts.map((part, i) => {
        // ( _ _ _ _ _ ) 패턴을 찾아서 정답으로 교체
        if (part.match(/^\([\s_]+\)$/)) {
          const answer = quiz.correctAnswers?.[answerIndex] || '정답 없음';
          answerIndex++;
          return `<span style="color: #1976d2; font-weight: bold;">(${answer})</span>`;
        }
        return part;
      }).join('');
    } else {
      // 문제 모드: 빈칸 그대로 표시
      passageHtml = quiz.blankedText || '';
    }
    
    // renderSectionNode가 이미 print-html-block 컨테이너를 추가하므로 외부 div 제거
    sections.push({
      type: 'html',
      key: `html-passage-${index}`,
      html: passageHtml
    });

    // 4. 정답 모드일 때 해석
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
  const normalizedItems = quizzes.map((quiz, index) => normalizeWork13Quiz(quiz, index));

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
      // A: 문제 헤더 + 본문 (영어 지문)
      // B: 없음 (유형#13은 4지선다 없음)
      // C: 부가 정보 (본문 해석)
      const sectionA = item.sections.filter(s => s.type !== 'translation');
      const sectionC = item.sections.filter(s => s.type === 'translation');

      const heightA = sectionA.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const heightC = sectionC.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const totalHeight = heightA + heightC;

      // 현재 단에 내용이 있으면 무조건 다음 단으로 이동 (새로운 문제는 항상 새 단에서 시작)
      if (currentColumns[currentColumnIndex].length > 0) {
        moveToNextColumn();
      }

      // 2. 분할 결정 (3단계 분할 로직)
      // Case 1: A + C <= H → 모두 현재 단에 배치
      // Case 2: A + C > H 이고 A <= H → A는 현재 단, C는 다음 단으로 분리
      // Case 3: A > H → A는 현재 단, C는 다음 단으로 분리 (단, A가 너무 길면 어쩔 수 없이 잘림)
      if (isAnswerMode && sectionC.length > 0 && totalHeight > PAGE_HEIGHT_PX) {
        // 분할 처리
        
        // Item A: 본문
        const itemMain: NormalizedQuizItem = {
          ...item,
          sections: sectionA,
        };

        // Item C: 해석
        const itemTrans: NormalizedQuizItem = {
          originalItem: item.originalItem,
          workTypeId: item.workTypeId,
          sections: sectionC,
          chunkMeta: { ...item.chunkMeta, isSplitPart: true }
        };

        // Item A를 현재 단에 배치
        addToCurrentColumn(itemMain);

        // Item C(해석)를 다음 단으로 이동하여 배치
        moveToNextColumn();
        addToCurrentColumn(itemTrans);
      } else {
        // 분할 불필요 (한 단에 모두 들어가거나, 문제 모드인 경우)
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
    <div className={isAnswerMode ? "print-container-answer work13-print" : "print-container work13-print"}>
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
        .work13-print .print-column {
          padding: 0.1cm 0 0 0.5cm !important;
          margin: 0 !important;
        }
        .work13-print .print-question-title {
          padding-left: 0.2cm !important;
          margin-bottom: 0.25cm !important;
          padding-bottom: 0.15cm !important;
          margin-top: 0 !important;
        }
        .work13-print.print-container .print-column > .print-question-card:first-child .print-question-title,
        .work13-print.print-container-answer .print-column > .print-question-card:first-child .print-question-title {
          margin-top: 0.3cm !important;
        }
        .work13-print.print-container .print-column {
          gap: 0.3cm !important;
        }
        .work13-print .print-question-card {
          padding: 0.1cm 0 0 0 !important;
        }
        .work13-print .a4-landscape-page-content {
          padding: 0 !important;
        }
        .work13-print.print-container-answer .print-two-column-container > .print-column:nth-child(2),
        .work13-print.print-container .print-two-column-container > .print-column:nth-child(2) {
          padding-left: 0 !important;
          padding-right: 0.5cm !important;
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

export default PrintFormatWork13New;

