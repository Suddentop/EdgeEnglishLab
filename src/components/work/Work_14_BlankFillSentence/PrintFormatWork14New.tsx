import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
import {
  NormalizedQuizItem,
  PrintSection
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';
import { formatBlankedText } from '../Package_02_TwoStepQuiz/printNormalization';

interface BlankFillSentenceQuizWithId {
  id?: string;
  blankedText: string;
  correctAnswers: string[];
  translation: string;
  selectedSentences?: string[];
  userAnswers?: string[];
  isCorrect?: boolean | null;
}

interface PrintFormatWork14NewProps {
  quizzes: BlankFillSentenceQuizWithId[];
  isAnswerMode: boolean;
  headerOnly?: boolean; // 헤더만 표시할지 여부 (나의문제목록에서 불러온 경우)
  showDebugBorders?: boolean; // 디버그용 테두리 표시 여부 (나의문제목록에서 불러온 경우)
}

// [정밀 보정된 상수]
// 실제 인쇄 가능 높이: 19.3cm ≈ 730px (유형#13과 동일하게 설정)
const PAGE_HEIGHT_PX = 730; 

// 1. 영어 본문 (9.4pt, line-height 1.54)
// 자폭 약 7px 가정 -> 더 보수적으로 65자 가정
const CHARS_PER_LINE_ENG = 65; 
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
      
      return (totalLines * LINE_HEIGHT_ENG) + 50; // 28px -> 50px (여유 있게)
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

const PrintFormatWork14New: React.FC<PrintFormatWork14NewProps> = ({ quizzes, isAnswerMode, headerOnly = false, showDebugBorders = false }) => {
  console.log('🖨️ PrintFormatWork14New 렌더링:', { 
    isAnswerMode, 
    quizzesCount: quizzes.length,
    quizzes: quizzes.map((q, i) => ({
      index: i,
      hasBlankedText: !!q.blankedText,
      blankedTextLength: q.blankedText?.length || 0,
      blankedTextPreview: q.blankedText?.substring(0, 100),
      correctAnswersCount: q.correctAnswers?.length || 0,
      correctAnswers: q.correctAnswers,
      selectedSentencesCount: q.selectedSentences?.length || 0,
      selectedSentences: q.selectedSentences,
      hasTranslation: !!q.translation,
      translationPreview: q.translation?.substring(0, 100)
    }))
  });
  
  // Work_14 데이터를 NormalizedQuizItem으로 변환
  const normalizeWork14Quiz = (quiz: BlankFillSentenceQuizWithId, index: number): NormalizedQuizItem => {
    console.log(`📝 Quiz ${index + 1} normalizeWork14Quiz 시작:`, {
      hasBlankedText: !!quiz.blankedText,
      blankedTextLength: quiz.blankedText?.length || 0,
      correctAnswers: quiz.correctAnswers,
      selectedSentences: quiz.selectedSentences,
      hasTranslation: !!quiz.translation,
      translationLength: quiz.translation?.length || 0,
      isAnswerMode
    });
    const sections: PrintSection[] = [];
    const workTypeId = '14';

    // 1. 문제 타이틀
    sections.push({
      type: 'title',
      key: `title-${index}`,
      text: `문제 ${index + 1} : 문장 빈칸 채우기`,
      workTypeId
    });

    // 2. 문제 지시문
    sections.push({
      type: 'instruction',
      key: `instruction-${index}`,
      text: `문제 ${index + 1} : 다음 빈칸에 들어갈 문장을 직접 입력하시오.`,
      meta: { workTypeId }
    });

    // 3. 빈칸 본문 (정답 모드일 때는 정답 포함)
    let passageHtml = '';
    
    // correctAnswers가 없으면 selectedSentences 사용 (유형#14는 둘 다 사용 가능)
    const answers = quiz.correctAnswers || quiz.selectedSentences || [];
    
    if (isAnswerMode) {
      // 정답 모드: 빈칸에 정답 표시 (유형#13과 동일한 방식 사용)
      const formattedText = formatBlankedText(
        quiz.blankedText || '',
        answers
      );
      // formatBlankedText로 변환된 패턴: ( _ _ _ _ _ )
      const parts = formattedText.split(/(\([\s_]+\))/);
      let answerIndex = 0;
      
      // 정답에서 빈칸 패턴 제거하는 헬퍼 함수
      const cleanAnswer = (answer: string): string => {
        if (!answer) return answer || '정답 없음';
        let clean = answer;
        // 다양한 빈칸 패턴 제거
        clean = clean.replace(/\(\s*[A-Z]\s*_+\s*\)/g, '').trim();
        clean = clean.replace(/\(_+[A-Z]_+\)/g, '').trim();
        clean = clean.replace(/\(_+\)/g, '').trim();
        clean = clean.replace(/\(\s*[A-Z]?\s*_+\s*[A-Z]?\s*\)/g, '').trim();
        return clean || answer;
      };
      
      passageHtml = parts.map((part, i) => {
        // ( _ _ _ _ _ ) 패턴을 찾아서 정답으로 교체
        if (part.match(/^\([\s_]+\)$/)) {
          const answer = answers[answerIndex] || '정답 없음';
          const cleanedAnswer = cleanAnswer(answer);
          answerIndex++;
          return `(<span style="color: #1976d2; font-weight: bold;">${cleanedAnswer}</span>)`;
        }
        return part;
      }).join('');
    } else {
      // 문제 모드: 빈칸 포맷팅 적용 ( _ _ _ ... 형태로 변환)
      passageHtml = formatBlankedText(
        quiz.blankedText || '',
        answers
      );
    }
    
    // renderSectionNode가 이미 print-html-block 컨테이너를 추가하므로 외부 div 제거
    sections.push({
      type: 'html',
      key: `html-passage-${index}`,
      html: passageHtml
    });

    // 4. 정답 모드일 때 해석
    if (isAnswerMode) {
      if (quiz.translation) {
        sections.push({
          type: 'translation',
          key: `translation-${index}`,
          text: quiz.translation
        });
        console.log(`✅ Quiz ${index + 1} translation 섹션 추가됨 (길이: ${quiz.translation.length})`);
      } else {
        console.warn(`⚠️ Quiz ${index + 1} translation이 없음!`);
      }
    }

    console.log(`📋 Quiz ${index + 1} sections 최종:`, {
      sectionCount: sections.length,
      sectionTypes: sections.map(s => s.type),
      hasTranslation: sections.some(s => s.type === 'translation')
    });

    return {
      originalItem: quiz,
      workTypeId: workTypeId,
      sections: sections,
      chunkMeta: { chunkIndex: 0, totalChunks: 1 }
    };
  };

  // 1. 데이터 정규화
  const normalizedItems = quizzes.map((quiz, index) => normalizeWork14Quiz(quiz, index));

  // 2. 페이지 분배 (정밀 로직 적용) - 유형#13과 동일한 로직 사용
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
      // B: 없음 (유형#14는 주관식 문제이므로 4지선다 없음)
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
  
  console.log('📄 유형#14 페이지 분배 결과:', {
    normalizedItemsCount: normalizedItems.length,
    distributedPagesCount: distributedPages.length,
    distributedPages: distributedPages.map((page, pIdx) => ({
      pageIndex: pIdx,
      columnsCount: page.length,
      leftColumnItems: page[0]?.length || 0,
      rightColumnItems: page[1]?.length || 0,
      items: page.map((col, cIdx) => ({
        columnIndex: cIdx,
        itemsCount: col.length,
        sections: col.map((item, iIdx) => ({
          itemIndex: iIdx,
          sectionTypes: item.sections.map(s => s.type),
          hasTranslation: item.sections.some(s => s.type === 'translation')
        }))
      }))
    }))
  });

  // 3. 렌더링 헬퍼
  const renderNormalizedCard = (
    normalizedItem: NormalizedQuizItem,
    keyPrefix: string
  ): React.ReactNode => {
    return renderNormalizedCardNode(normalizedItem, keyPrefix, { isAnswerMode });
  };

  return (
    <div className={isAnswerMode ? "print-container-answer work14-print" : "print-container work14-print"}>
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
        .work14-print .print-column {
          padding: 0.1cm 0 0 0.5cm !important;
          margin: 0 !important;
        }
        .work14-print .print-question-title {
          padding-left: 0.2cm !important;
          margin-bottom: 0.25cm !important;
          padding-bottom: 0.15cm !important;
          margin-top: 0 !important;
        }
        .work14-print.print-container .print-column > .print-question-card:first-child .print-question-title,
        .work14-print.print-container-answer .print-column > .print-question-card:first-child .print-question-title {
          margin-top: 0.3cm !important;
        }
        .work14-print.print-container .print-column {
          gap: 0.3cm !important;
        }
        .work14-print .print-question-card {
          padding: 0.1cm 0 0 0 !important;
        }
        .work14-print .a4-landscape-page-content {
          padding: 0 !important;
        }
        .work14-print.print-container-answer .print-two-column-container > .print-column:nth-child(2),
        .work14-print.print-container .print-two-column-container > .print-column:nth-child(2) {
          padding-left: 0 !important;
          padding-right: 0.5cm !important;
        }
      `}</style>

      {distributedPages.map((pageColumns, pageIndex) => (
        <div key={`page-${pageIndex}`} className="a4-landscape-page-template page-break">
          <div className="a4-landscape-page-header">
            <PrintHeaderWork01 />
          </div>
          {!headerOnly && (
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
          )}
        </div>
      ))}
    </div>
  );
};

export default PrintFormatWork14New;

