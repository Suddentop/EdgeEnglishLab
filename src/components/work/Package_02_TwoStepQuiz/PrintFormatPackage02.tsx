import React from 'react';
import PrintHeaderPackage02 from './PrintHeaderPackage02';
import './PrintFormatPackage02.css';
import {
  OPTION_LABELS,
  WORK_TYPE_LABELS,
  PrintSection,
  PrintOptionItem,
  NormalizedQuizItem,
  normalizeQuizItemForPrint
} from './printNormalization';
import { renderNormalizedCardNode } from './printRenderers';
import {
  COLUMN_CONFIG,
  getAvailableColumnHeight,
  calculateTextHeight,
  calculateSentenceHeight,
  splitNormalizedItemByHeight,
  distributeNormalizedItemsToPages
} from './printLayoutUtils';

interface PrintFormatPackage02Props {
  packageQuiz: any[];
  isAnswerMode?: boolean;
}

const PrintFormatPackage02: React.FC<PrintFormatPackage02Props> = ({ packageQuiz, isAnswerMode = false }) => {
  console.log('🖨️ PrintFormatPackage02 렌더링:', {
    packageQuiz: packageQuiz,
    packageQuizLength: packageQuiz?.length,
    isAnswerMode: isAnswerMode
  });
  
  // 본문에서 교체된 단어에 밑줄 표시 - Work_02 전용
  const renderTextWithHighlight = (text: string, replacements: any[]) => {
    if (!replacements || replacements.length === 0) return text;
    
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    let result = '';
    
    sentences.forEach((sentence, index) => {
      const replacement = replacements[index];
      if (replacement) {
        const word = replacement.replacement;
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result += sentence.replace(regex, `<span class="print-word-highlight">${word}</span>`) + ' ';
      } else {
        result += sentence + ' ';
      }
    });
    
    return result.trim();
  };

  const cleanOptionText = (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (isAnswerMode) {
      return str.replace(/\(정답\)/g, '').replace(/\s{2,}/g, ' ').trim();
    }
    return str;
  };

  const createTitleSection = (workTypeId: string, chunkMeta?: any): PrintSection => {
    const label = WORK_TYPE_LABELS[workTypeId] || `유형#${workTypeId}`;
    return {
      type: 'title',
      key: `title-${workTypeId}`,
      text: `#${workTypeId}. ${label}`,
      workTypeId,
      chunkMeta
    };
  };

  const createInstructionSection = (workTypeId: string, defaultText: string, chunkMeta?: any): PrintSection | null => {
    if (chunkMeta && chunkMeta.showInstruction === false) {
      return null;
    }
    return {
      type: 'instruction',
      key: `instruction-${workTypeId}`,
      text: defaultText,
      meta: { workTypeId }
    };
  };

  // 2단 레이아웃으로 퀴즈 아이템 렌더링
  const renderQuizItems = () => {
    // 번역 텍스트 공통 추출 (히스토리 불러오기 시 누락 보정)
    const getTranslatedText = (quizItem: any, quizData: any): string => {
      const d = quizData || {};
      // work14Data의 translation도 확인
      const work14Translation = 
        quizItem?.work14Data?.translation || 
        d?.work14Data?.translation ||
        quizData?.work14Data?.translation;
      
      return (
        work14Translation ||
        quizItem?.translatedText ||
        d?.translatedText ||
        d?.translation ||
        d?.koreanTranslation ||
        d?.korean ||
        d?.korTranslation ||
        d?.koText ||
        d?.korean_text ||
        ''
      );
    };
    // 패키지#03과 동일한 단순한 로직으로 퀴즈 아이템 렌더링
    console.log('🖨️ 패키지#02 인쇄 페이지 렌더링 - 패키지#03과 동일한 로직:', packageQuiz.map((item, index) => 
      `${index + 1}. 유형#${item.workTypeId || 'unknown'}`
    ));
    
    // 퀴즈 항목의 예상 높이 계산 (문제 카드 패딩과 마진 포함)
    const estimateQuizItemHeight = (quizItem: any): number => {
      const availableHeight = getAvailableColumnHeight();
      let estimatedHeight = 0;
      
      // 문제 카드 자체의 패딩과 마진 (실제 렌더링에 맞게 대폭 축소)
      // 이미지를 보면 실제로는 훨씬 작은 공간을 사용하고 있음
      const cardPadding = 0.2 * 2; // 상하 패딩 0.2cm씩 (실제보다 훨씬 작게)
      const cardMarginBottom = 0.1; // 하단 마진 0.1cm (실제보다 훨씬 작게)
      const cardFixedHeight = cardPadding + cardMarginBottom;
      
      // 정답 섹션 기본 높이 (정답 모드일 때)
      const answerSectionBaseHeight = isAnswerMode ? 0.8 : 0; // 패딩, 마진, 라벨
      
      // Work_01: 문단 순서
      const quizData = quizItem.quiz || quizItem.data;
      if (quizData && (quizData.shuffledParagraphs || quizData.choices)) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        // 문단들
        quizData.shuffledParagraphs?.forEach((para: any) => {
          estimatedHeight += calculateTextHeight(para.content, 0.3);
        });
        // 선택지
        estimatedHeight += 0.8; // 4개 선택지
        // 정답 섹션 (정답 모드일 때)
        if (isAnswerMode) {
          estimatedHeight += answerSectionBaseHeight + 0.3; // 정답 1줄
        }
        return estimatedHeight + cardFixedHeight; // 카드 패딩과 마진 포함
      }
      
      // Work_02: 유사단어 독해
      if (quizItem?.work02Data) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += calculateTextHeight(quizItem?.work02Data?.modifiedText || '', 0.32);
        // 정답 섹션 (정답 모드일 때 - 교체 단어 테이블)
        if (isAnswerMode) {
          const replacementCount = quizItem?.work02Data?.replacements?.length || 0;
          estimatedHeight += answerSectionBaseHeight + (replacementCount * 0.4); // 테이블 행당 0.4cm
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_03~05: 빈칸 문제
      if (quizItem?.work03Data || quizItem?.work04Data || quizItem?.work05Data) {
        const data = quizItem?.work03Data || quizItem?.work04Data || quizItem?.work05Data;
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += calculateTextHeight(data.blankedText || '', 0.32);
        estimatedHeight += 0.8; // 선택지
        // 정답 섹션 (정답 모드일 때)
        if (isAnswerMode) {
          estimatedHeight += answerSectionBaseHeight + 0.3; // 정답 1줄
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_06: 문장 위치 찾기
      if (quizItem?.work06Data) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += calculateTextHeight(quizItem?.work06Data?.missingSentence || '', 0.28);
        estimatedHeight += calculateTextHeight(quizItem?.work06Data?.numberedPassage || '', 0.3);
        estimatedHeight += 0.6; // 선택지
        // 정답 섹션 (정답 모드일 때)
        if (isAnswerMode) {
          estimatedHeight += answerSectionBaseHeight + 0.3; // 정답 1줄
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_07, 08: 주제/제목 추론
      if (quizItem?.work07Data || quizItem?.work08Data) {
        const data = quizItem?.work07Data || quizItem?.work08Data;
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += calculateTextHeight(data.passage || '', 0.32);
        estimatedHeight += 1.0; // 선택지
        // 정답 섹션 (정답 모드일 때)
        if (isAnswerMode) {
          estimatedHeight += answerSectionBaseHeight + 0.3; // 정답 1줄
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_09: 어법 오류
      if (quizItem?.work09Data) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += calculateTextHeight(quizItem?.work09Data?.passage || '', 0.32);
        estimatedHeight += 1.0; // 선택지
        // 정답 섹션 (정답 모드일 때)
        if (isAnswerMode) {
          estimatedHeight += answerSectionBaseHeight + 0.3; // 정답 1줄
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_10: 다중 어법 오류
      if (quizItem?.work10Data) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += calculateTextHeight(quizItem?.work10Data?.passage || '', 0.32);
        estimatedHeight += 0.6; // 선택지
        // 정답 섹션 (정답 모드일 때)
        if (isAnswerMode) {
          estimatedHeight += answerSectionBaseHeight + 0.3; // 정답 1줄
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_11: 문장별 해석 (개별 문장 높이)
      // Firebase에서 불러온 데이터 구조 처리 (data.work11Data)
      let work11Data = quizItem?.work11Data || quizData?.work11Data || quizData?.data?.work11Data;
      
      console.log('🔍 Work_11 높이 계산 - 데이터 구조 디버깅:', {
        quizItem: quizItem,
        quizData: quizData,
        hasQuizItemWork11Data: !!quizItem?.work11Data,
        hasQuizDataWork11Data: !!quizData?.work11Data,
        hasQuizDataDataWork11Data: !!quizData?.data?.work11Data,
        work11Data: work11Data,
        sentencesCount: work11Data?.sentences?.length || 0
      });
      
      // 렌더링과 동일한 데이터 대체 로직 적용
      if (!work11Data && (quizData || quizItem)) {
        work11Data = quizData || quizItem;
        console.log('🔄 Work_11 높이 계산에서 work11Data 대체:', work11Data);
      }
      if (work11Data) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        if (work11Data?.sentences) {
          work11Data?.sentences?.forEach((s: any) => {
            const sentence = typeof s === 'string' ? s : s.english;
            estimatedHeight += calculateSentenceHeight(sentence);
            // 정답 모드일 때 한글 해석 높이를 효율적으로 계산
            if (isAnswerMode) {
              const korean = s.korean || '';
              if (korean) {
                estimatedHeight += calculateSentenceHeight(korean) * 0.6; // 한글 해석 높이를 60%로 축소
              }
            }
          });
        }
        // 정답 모드에서는 효율적인 높이 계산 사용 (6-7개 문장을 1단에 배치)
        if (isAnswerMode) {
          estimatedHeight *= 0.8; // 높이를 20% 축소하여 더 많은 문장을 1단에 배치
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_13, 14: 빈칸 채우기
      // Firebase에서 불러온 데이터 구조 처리 (data.work13Data, data.work14Data)
      let work13Data = quizItem?.work13Data || quizData?.work13Data || quizData?.data?.work13Data;
      let work14Data = quizItem?.work14Data || quizData?.work14Data || quizData?.data?.work14Data;
      
      // 렌더링과 동일한 데이터 대체 로직 적용
      if (!work13Data && !work14Data && (quizData || quizItem)) {
        const fallbackData = quizData || quizItem;
        work13Data = fallbackData;
        work14Data = fallbackData;
        console.log('🔄 Work_13/14 높이 계산에서 데이터 대체:', fallbackData);
      }
      
      if (work13Data || work14Data) {
        const data = work13Data || work14Data;
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += calculateTextHeight(data.blankedText || '', 0.32);
        // 정답 섹션 (정답 모드일 때 - 빈칸 정답들)
        if (isAnswerMode) {
          const answerCount = data.correctAnswers?.length || 0;
          // 정답 개수에 따라 높이 조정 (정답 모드에서는 더 많은 높이 필요)
          const maxAnswers = Math.min(answerCount, 10); // 최대 10개 정답까지 높이 계산
          estimatedHeight += answerSectionBaseHeight + (maxAnswers * 0.8); // 정답당 0.8cm로 대폭 증가
        }
        // 정답 모드에서는 전체 높이를 2배로 증가
        if (isAnswerMode) {
          estimatedHeight *= 2.0;
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // 기본값: 단 높이의 절반 + 카드 패딩/마진
      return (availableHeight * 0.5) + cardFixedHeight;
    };
    
    // 패키지 퀴즈를 단별로 분할 (높이 기반)
    const pages: JSX.Element[] = [];

    const normalizedItems = packageQuiz.map((item, index) => {
      const normalized = normalizeQuizItemForPrint(item, {
        isAnswerMode,
        cleanOptionText,
        renderTextWithHighlight,
        getTranslatedText
      });
      console.log('🧱 정규화된 섹션', {
        index,
        workTypeId: normalized.workTypeId,
        sectionCount: normalized.sections.length
      });
      return normalized;
    });

    const expandedNormalizedItems = normalizedItems.flatMap((item) =>
      splitNormalizedItemByHeight(item)
    );
    console.log('🧮 분할된 카드 수:', expandedNormalizedItems.length);

    const renderNormalizedCard = (
      normalizedItem: NormalizedQuizItem,
      keyPrefix: string
    ): React.ReactNode => {
      return renderNormalizedCardNode(normalizedItem, keyPrefix, { isAnswerMode });
    };
 
    const distributedPages = distributeNormalizedItemsToPages(expandedNormalizedItems);
    console.log(`📄 총 ${distributedPages.length}개 페이지 생성 중...`);

    distributedPages.forEach((pageColumns: NormalizedQuizItem[][], pageIndex: number) => {
      console.log(
        `📦 페이지 ${pageIndex + 1} 컬럼별 카드 수:`,
        pageColumns.map((columnItems) => columnItems.length)
      );
      pageColumns.forEach((columnItems, columnIndex) => {
        if (columnItems[0]) {
          console.log(
            `  ↳ 컬럼 ${columnIndex + 1} 첫 카드 섹션 타입들:`,
            columnItems[0].sections.map((section) => section.type)
          );
        }
      });

      pages.push(
        <div
          key={`page-${pageIndex}`}
          id={`print-page-${pageIndex}`}
          className="print-page a4-landscape-page-template"
        >
          <div className="a4-landscape-page-header">
            <PrintHeaderPackage02 />
          </div>

          <div className="a4-landscape-page-content">
            <div className="print-two-column-container">
              {pageColumns.map((columnItems, columnIndex) => (
                <div
                  key={`page-${pageIndex}-column-${columnIndex}`}
                  className="print-column"
                >
                  {columnItems.map((normalizedItem, itemIndex) =>
                    renderNormalizedCard(
                      normalizedItem,
                      `page-${pageIndex}-column-${columnIndex}-item-${itemIndex}`
                    )
                  )}
                </div>
              ))}
                  </div>
          </div>
        </div>
      );
    });
    
    return pages;
  };

  return (
    <div 
      id={isAnswerMode ? "print-root-package02-answer" : "print-root-package02"}
      className={isAnswerMode ? "print-container-answer" : "print-container"}
    >
      {renderQuizItems()}
    </div>
  );
};

export default PrintFormatPackage02;

