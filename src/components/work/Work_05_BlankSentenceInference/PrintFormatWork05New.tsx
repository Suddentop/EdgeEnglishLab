import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
import {
  NormalizedQuizItem,
  PrintSection,
  OPTION_LABELS
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';

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

// [정밀 보정된 상수]
// 실제 인쇄 가능 높이: 19.3cm ≈ 730px
const PAGE_HEIGHT_PX = 730; 

// 1. 영어 본문 (9.4pt, line-height 1.54)
// 자폭 약 6.25px 가정 (512px / 6.25px ≈ 82자)
const CHARS_PER_LINE_ENG = 82; // 73 -> 82 (줄 수 과대평가 방지)
const LINE_HEIGHT_ENG = 20; // 19.3px -> 20px (안전 마진)

// 2. 한글 해석 (8.8pt, line-height 1.35)
// 자폭 약 11px 가정 (512px / 11px ≈ 46자)
const CHARS_PER_LINE_KOR = 48; // 45 -> 48
const LINE_HEIGHT_KOR = 16; 

// 3. 선택지 (9.35pt, line-height 1.3)
const CHARS_PER_LINE_OPTION = 85; // 80 -> 85
const HEIGHT_PER_OPTION = 20;

// 높이 계산 헬퍼 함수
const estimateSectionHeight = (section: PrintSection): number => {
  switch (section.type) {
    case 'title':
      // 폰트 11.3pt + 마진/패딩
      return 35; // 45 -> 35 (실제 약 30px)
    case 'instruction':
      // 폰트 8.8pt + 패딩
      return 35; // 실제 약 36px
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
      let totalOptionHeight = 10; // 15 -> 10 (여백 축소 가정)
      section.options?.forEach(opt => {
        // 옵션 텍스트 길이 + 번호 (약 5자)
        const textLen = (opt.text || '').length + 5; 
        let lines = Math.ceil(textLen / CHARS_PER_LINE_OPTION);
        
        // 옵션 해석이 있으면 추가 높이 계산
        if (opt.translation) {
            const transLen = opt.translation.length;
            const transLines = Math.ceil(transLen / CHARS_PER_LINE_KOR);
            // 해석은 약간 작은 폰트일 수 있으나 안전하게 계산
            lines += transLines; 
        }
        
        // 기본 1줄일 때 HEIGHT_PER_OPTION, 줄바꿈 되면 줄당 높이 추가
        // 줄당 16px 추가 (18 -> 16)
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

      // 제목영역 등 고려 40px
      return (totalLines * LINE_HEIGHT_KOR) + 40; 
    }
    default:
      return 20;
  }
};

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
      // 컴포넌트별 섹션 분리
      // A: Header (Title, Instruction) + Body (HTML)
      const contentSections = item.sections.filter(s => s.type !== 'translation' && s.type !== 'options');
      // B: Options
      const optionsSections = item.sections.filter(s => s.type === 'options');
      // C: Translation
      const transSections = item.sections.filter(s => s.type === 'translation');

      // 높이 계산 (여유 버퍼 0px)
      const buffer = 0; // 5 -> 0 (최대한 타이트하게 계산)
      const heightA = contentSections.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const heightB = optionsSections.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const heightC = transSections.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      
      const heightTotal = heightA + heightB + heightC + buffer;
      const heightAB = heightA + heightB + buffer;

      // 현재 단에 내용이 있으면 무조건 다음 단으로 이동 (새로운 문제는 항상 새 단에서 시작)
      if (currentColumns[currentColumnIndex].length > 0) {
        moveToNextColumn();
      }

      // 분할 로직 적용
      if (isAnswerMode) {
        if (heightTotal <= PAGE_HEIGHT_PX) {
            // Case 1: A+B+C <= 높이 -> 모두 한 단에 배치
            addToCurrentColumn(item);
        } else {
            if (heightAB <= PAGE_HEIGHT_PX) {
                // Case 2: A+B+C > 높이 && A+B <= 높이 -> C만 다음 단으로
                const itemAB: NormalizedQuizItem = {
                    ...item,
                    sections: [...contentSections, ...optionsSections]
                };
                const itemC: NormalizedQuizItem = {
                    originalItem: item.originalItem,
                    workTypeId: item.workTypeId,
                    sections: transSections,
                    chunkMeta: { ...item.chunkMeta, isSplitPart: true }
                };
                
                addToCurrentColumn(itemAB);
                moveToNextColumn();
                addToCurrentColumn(itemC);
            } else {
                // Case 3: A+B > 높이 -> A는 현재 단, B+C는 다음 단
                // (만약 A 자체도 높다면 어쩔 수 없이 넘치거나 짤림, 하지만 시작은 현재 단)
                const itemA: NormalizedQuizItem = {
                    ...item,
                    sections: contentSections
                };
                const itemBC: NormalizedQuizItem = {
                    originalItem: item.originalItem,
                    workTypeId: item.workTypeId,
                    sections: [...optionsSections, ...transSections],
                    chunkMeta: { ...item.chunkMeta, isSplitPart: true }
                };

                addToCurrentColumn(itemA);
                moveToNextColumn();
                addToCurrentColumn(itemBC);
            }
        }
      } else {
        // 문제 모드일 때 (보통 A+B만 존재)
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
