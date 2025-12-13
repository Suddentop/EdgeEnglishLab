import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
import {
  NormalizedQuizItem,
  PrintSection
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';

interface SentenceTranslationQuiz {
  id?: string;
  sentences: string[];
  translations: string[];
  quizText: string;
}

interface PrintFormatWork11NewProps {
  quizzes: SentenceTranslationQuiz[];
  isAnswerMode: boolean;
}

// [정밀 보정된 상수]
// 실제 인쇄 가능 높이: 19.3cm ≈ 730px
const PAGE_HEIGHT_PX = 730; 

// 1. 영어 문장 (9.4pt, line-height 1.7)
// 실제 CSS: font-size: 9.4pt, line-height: 1.7
// 9.4pt × 1.7 ≈ 16pt ≈ 21.3px (96 DPI 기준)
// 실제 컨테이너 너비를 고려하여 더 정확하게 계산
const CHARS_PER_LINE_ENG = 72; // 실제 컨테이너 너비에 맞게 조정
const LINE_HEIGHT_ENG = 20; // line-height 1.7 × 9.4pt ≈ 20px (정확한 계산)

// 2. 한글 해석 (8.8pt, line-height 1.35)
const CHARS_PER_LINE_KOR = 43;
const LINE_HEIGHT_KOR = 16; // 15.8px -> 16px

// 3. 문장 항목 높이 (문장 번호 + 문장 텍스트 + 해석 공간)
const HEIGHT_PER_SENTENCE_ITEM = 50; // 기본 높이 (문장 + 해석 공간)
const SENTENCE_ITEM_MARGIN = 9; // 문장 항목 간 마진 (margin-bottom: 0.5rem ≈ 8px, 안전 마진 포함)
const TRANSLATION_SPACE_MARGIN_TOP = 6; // 해석 공간 위 마진 (margin-top: 0.3rem ≈ 4.8px, 안전 마진 포함)
const TRANSLATION_SPACE_HEIGHT = 25; // 해석 공간 높이 (height: 24px, 안전 마진 포함)
const SENTENCE_NUMBER_WIDTH = 25; // 문장 번호 영역 너비 (추정, 줄바꿈 계산에 사용)
const PARAGRAPH_BUFFER = 8; // 단락 높이 계산 시 안전 마진 (px) - 줄바꿈 오차 보정

// 높이 계산 헬퍼 함수
const estimateSectionHeight = (section: PrintSection): number => {
  switch (section.type) {
    case 'title':
      return 45; 
    case 'instruction':
      return 35;
    case 'html': {
      // 단락 단위 분할을 위한 플래그 확인
      if (section.meta?.isParagraph) {
        // 개별 문장 단락: 하나의 단락 높이만 계산
        const textContent = section.html ? section.html.replace(/<[^>]*>/g, '') : '';
        // 문장 번호 제거하여 문장 텍스트만 추출
        const sentenceMatch = textContent.match(/\d+\.\s(.+)/);
        if (sentenceMatch && sentenceMatch[1]) {
          const sentence = sentenceMatch[1].trim();
          
          // 정답 모드인지 확인 (해석이 포함되어 있는지)
          const hasTranslation = section.meta?.hasTranslation;
          
          // 문장 텍스트 줄 수 계산
          // 문장 번호는 인라인으로 표시되므로 첫 줄에 포함됨
          // 문장 번호 영역을 고려하여 사용 가능한 너비 계산
          // 문장 번호는 대략 3-4자 정도의 공간을 차지 (예: "1. " 또는 "10. ")
          const sentenceNumberChars = 3; // 문장 번호가 차지하는 문자 수 (추정)
          const availableCharsPerLine = CHARS_PER_LINE_ENG - sentenceNumberChars;
          
          // 문장 텍스트 줄 수 계산
          // 첫 줄은 문장 번호와 함께 표시되므로, 첫 줄의 남은 공간을 고려
          let engLines = 1; // 최소 1줄
          const remainingChars = sentence.length - availableCharsPerLine;
          if (remainingChars > 0) {
            // 첫 줄 이후 추가 줄 수
            engLines += Math.ceil(remainingChars / CHARS_PER_LINE_ENG);
          }
          
          // 높이 계산:
          // 1. 문장 텍스트 높이 (줄 수 × 줄 높이)
          const sentenceHeight = engLines * LINE_HEIGHT_ENG;
          
          if (hasTranslation) {
            // 정답 모드: 해석 높이 추가
            // 해석 텍스트 추출 (work11-sentence-translation div 내부의 : 다음 텍스트)
            // HTML 구조: <div class="work11-sentence-translation">: 해석텍스트</div>
            const translationDivMatch = section.html?.match(/work11-sentence-translation[^>]*>([^<]+)</);
            if (translationDivMatch && translationDivMatch[1]) {
              // ": 해석텍스트" 형식에서 해석 텍스트만 추출
              const translationWithColon = translationDivMatch[1].trim();
              const translationText = translationWithColon.replace(/^:\s*/, '').trim();
              
              if (translationText.length > 0) {
                // 해석 텍스트 줄 수 계산 (더 정확하게)
                // 해석은 padding-left: 0.3rem이 있으므로 실제 사용 가능한 너비를 고려
                // 0.3rem ≈ 4.8px, 대략 2-3자 정도
                // 하지만 ": "도 포함되므로 실제로는 더 많은 공간이 필요
                const translationPrefixChars = 2; // ": "가 차지하는 공간
                const translationPaddingChars = 2; // padding-left로 인한 문자 수 감소 (보수적으로 줄임)
                const availableCharsPerLineKor = CHARS_PER_LINE_KOR - translationPrefixChars - translationPaddingChars;
                const korLines = Math.max(1, Math.ceil(translationText.length / availableCharsPerLineKor));
                const translationHeight = korLines * LINE_HEIGHT_KOR;
                
                // 문장 높이 + 해석 위 마진 (margin-top: 0.3rem ≈ 4.8px, 반올림 5px) + 해석 높이 + 단락 간 여백 (margin-bottom: 0.5rem ≈ 8px)
                // 안전 마진 제거하여 공간을 최대한 활용
                return sentenceHeight + 5 + translationHeight + 8;
              }
            }
            // 해석이 없으면 문제 모드와 동일하게 처리
          }
          
          // 문제 모드: 해석 공간 높이 추가
          // 문장 높이 + 해석 공간 위 마진 + 해석 공간 높이 + 단락 간 여백
          return sentenceHeight + 5 + 24 + 8; // 실제 CSS 값에 가깝게 계산
        }
        return HEIGHT_PER_SENTENCE_ITEM + 8; // 기본값 + 여백
      }
      
      // 정답 모드: 모든 문장과 해석이 포함된 HTML
      const textContent = section.html ? section.html.replace(/<[^>]*>/g, '') : '';
      const hasTranslation = section.html?.includes('work11-sentence-translation');
      
      // 각 문장의 높이 계산
      let totalHeight = 0;
      const sentences = textContent.split(/\d+\.\s/).filter(s => s.trim().length > 0);
      sentences.forEach((sentence, index) => {
        // 영어 문장 높이
        const engLines = Math.ceil(sentence.trim().length / CHARS_PER_LINE_ENG);
        totalHeight += (engLines * LINE_HEIGHT_ENG);
        
        // 정답 모드일 때 해석 높이 추가
        if (hasTranslation) {
          // 해석 텍스트 추출 (: 다음 텍스트)
          const translationMatch = section.html?.match(new RegExp(`:\\s([^<]+)`));
          if (translationMatch && translationMatch[1]) {
            const translationText = translationMatch[1].trim();
            const korLines = Math.ceil(translationText.length / CHARS_PER_LINE_KOR);
            totalHeight += (korLines * LINE_HEIGHT_KOR) + 8; // 해석 높이 + 마진
          }
        } else {
          // 문제 모드: 해석 공간 높이 추가
          totalHeight += 24; // 해석 공간 높이
        }
        
        totalHeight += SENTENCE_ITEM_MARGIN; // 문장 항목 간 마진
      });
      
      return totalHeight + 20; // 컨테이너 패딩
    }
    case 'translation': {
      // 유형#11은 translation 섹션을 사용하지 않음 (문장과 함께 HTML로 렌더링)
      return 0;
    }
    case 'text':
      return 25;
    default:
      return 20;
  }
};

const PrintFormatWork11New: React.FC<PrintFormatWork11NewProps> = ({ quizzes, isAnswerMode }) => {
  
  // 단락 높이 계산 (각 문장 단락)
  const estimateParagraphHeight = (sentence: string, isAnswerMode: boolean, translation?: string): number => {
    // 영어 문장 높이
    const engLines = Math.ceil(sentence.length / CHARS_PER_LINE_ENG);
    let height = engLines * LINE_HEIGHT_ENG;
    
    if (isAnswerMode && translation) {
      // 정답 모드: 해석 높이 추가
      const korLines = Math.ceil(translation.length / CHARS_PER_LINE_KOR);
      height += (korLines * LINE_HEIGHT_KOR) + 8; // 해석 높이 + 마진
    } else {
      // 문제 모드: 해석 공간 높이 추가
      height += 24; // 해석 공간 높이
    }
    
    // 단락 간 여백 (margin-bottom: 0.5rem = 8px)
    height += SENTENCE_ITEM_MARGIN;
    
    return height;
  };

  // Work_11 데이터를 NormalizedQuizItem으로 변환
  const normalizeWork11Quiz = (quiz: SentenceTranslationQuiz, index: number): NormalizedQuizItem => {
    const sections: PrintSection[] = [];
    const workTypeId = '11';

    // 1. 문제 타이틀
    sections.push({
      type: 'title',
      key: `title-${index}`,
      text: `문제 ${index + 1} : 문장별 해석`,
      workTypeId
    });

    // 2. 문제 지시문
    sections.push({
      type: 'instruction',
      key: `instruction-${index}`,
      text: '다음 본문의 각 문장을 한국어로 해석하세요.',
      meta: { workTypeId }
    });

    // 3. 문장 목록 (문제 모드와 정답 모드 모두 각 문장을 개별 HTML 섹션으로 분리하여 단락 단위 분할 가능하게 함)
    quiz.sentences.forEach((sentence, i) => {
      if (isAnswerMode && quiz.translations && quiz.translations[i]) {
        // 정답 모드: 문장과 해석을 함께 표시 (단락 단위 분할을 위해 개별 섹션으로)
        const sentenceHtml = `<div class="work11-sentence-item work11-sentence-with-translation" style="margin-bottom: 0.5rem;">
          <div class="work11-sentence-english">
            <span class="work11-sentence-number">${i + 1}.</span>
            <span class="work11-sentence-text">${sentence}</span>
          </div>
          <div class="work11-sentence-translation" style="margin-top: 0.3rem; color: #1976d2; font-size: 8.8pt; line-height: 1.35;">
            : ${quiz.translations[i]}
          </div>
        </div>`;
        
        sections.push({
          type: 'html',
          key: `html-sentence-${index}-${i}`,
          html: sentenceHtml,
          meta: { 
            workTypeId,
            sentenceIndex: i,
            isParagraph: true, // 단락 단위 분할을 위한 플래그
            hasTranslation: true // 해석 포함 플래그
          }
        });
      } else {
        // 문제 모드: 문장만 표시 (해석 공간)
        const sentenceHtml = `<div class="work11-sentence-item" style="margin-bottom: 0.5rem;">
          <span class="work11-sentence-number">${i + 1}.</span>
          <span class="work11-sentence-text">${sentence}</span>
          <div class="work11-translation-space" style="margin-top: 0.3rem; height: 24px; border-bottom: 1px dashed #ccc;"></div>
        </div>`;
        
        sections.push({
          type: 'html',
          key: `html-sentence-${index}-${i}`,
          html: sentenceHtml,
          meta: { 
            workTypeId,
            sentenceIndex: i,
            isParagraph: true // 단락 단위 분할을 위한 플래그
          }
        });
      }
    });

    return {
      originalItem: quiz,
      workTypeId: workTypeId,
      sections: sections,
      chunkMeta: { chunkIndex: 0, totalChunks: 1 }
    };
  };

  // 페이지 분할 로직 (A/B/C Split) - 유형#08과 동일한 구조
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
      // 현재 단에 내용이 있으면 무조건 다음 단으로 이동 (새로운 문제는 항상 새 단에서 시작)
      if (currentColumns[currentColumnIndex].length > 0) {
        moveToNextColumn();
      }

      // 문제 모드와 정답 모드 모두: 단락 단위 분할 로직 적용
      {
        // 헤더 섹션 (title + instruction)
        const headerSections = item.sections.filter(s => s.type === 'title' || s.type === 'instruction');
        const headerHeight = headerSections.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
        
        // 문장 단락 섹션들 (html 타입이면서 isParagraph 플래그가 있는 것들)
        const paragraphSections = item.sections.filter(s => s.type === 'html' && s.meta?.isParagraph);
        
        // 현재 단의 사용 가능한 높이 계산 (현재 단에 이미 배치된 아이템들의 높이 합계)
        const currentColumnUsedHeight = currentColumns[currentColumnIndex].reduce((sum, colItem) => {
          return sum + colItem.sections.reduce((s, sec) => s + estimateSectionHeight(sec), 0);
        }, 0);
        const availableHeight = PAGE_HEIGHT_PX - currentColumnUsedHeight;
        
        // 헤더를 먼저 배치할 수 있는지 확인
        if (headerHeight > availableHeight) {
          // 헤더도 현재 단에 들어갈 수 없으면 다음 단으로 이동
          moveToNextColumn();
        }
        
        // 헤더를 현재 단에 배치
        const itemWithHeader: NormalizedQuizItem = {
          ...item,
          sections: headerSections
        };
        addToCurrentColumn(itemWithHeader);
        
        // 헤더 배치 후 사용 가능한 높이 재계산
        // 컨테이너 패딩 최소화 (실제로는 거의 없음)
        const CONTAINER_PADDING = 1; // 컨테이너 상하 패딩 (최소화)
        const SAFETY_BUFFER = 1; // 최소 안전 마진 (높이 계산 오차만 보정)
        const availableHeightAfterHeader = PAGE_HEIGHT_PX - headerHeight - CONTAINER_PADDING - SAFETY_BUFFER;
        
        // 각 단락의 높이를 미리 계산
        const paragraphHeights = paragraphSections.map(section => estimateSectionHeight(section));
        
        // 누적 높이를 계산하여 단 높이를 초과하지 않는 최대 단락 수 찾기
        // 더 정확하게 계산하여 공간을 최대한 활용 (99.5%까지 사용 가능)
        const heightLimitRatio = 0.995; // 0.5% 여유 공간만 확보
        let cumulativeHeight = 0;
        let maxParagraphsInFirstColumn = 0;
        
        for (let i = 0; i < paragraphHeights.length; i++) {
          const nextCumulativeHeight = cumulativeHeight + paragraphHeights[i];
          // 사용 가능한 높이의 제한 비율 이내로 제한
          if (nextCumulativeHeight <= availableHeightAfterHeader * heightLimitRatio) {
            cumulativeHeight = nextCumulativeHeight;
            maxParagraphsInFirstColumn = i + 1;
          } else {
            // 다음 단락을 추가하면 단 높이를 초과하므로 중단
            break;
          }
        }
        
        // 첫 번째 단에 배치할 단락들
        const firstColumnParagraphs = paragraphSections.slice(0, maxParagraphsInFirstColumn);
        // 두 번째 단에 배치할 단락들
        const secondColumnParagraphs = paragraphSections.slice(maxParagraphsInFirstColumn);
        
        // 첫 번째 단에 단락들 배치
        if (firstColumnParagraphs.length > 0) {
          const firstColumnItem: NormalizedQuizItem = {
            ...item,
            sections: [...headerSections, ...firstColumnParagraphs],
            chunkMeta: { ...item.chunkMeta, isSplitPart: secondColumnParagraphs.length > 0 }
          };
          // 기존 헤더 아이템을 제거하고 단락 아이템으로 교체
          currentColumns[currentColumnIndex].pop(); // 헤더 제거
          currentColumns[currentColumnIndex].push(firstColumnItem); // 헤더+단락 추가
        }
        
        // 두 번째 단 이후의 단락들을 재귀적으로 분할하여 배치
        let remainingParagraphs = secondColumnParagraphs;
        
        while (remainingParagraphs.length > 0) {
          // 다음 단으로 이동
          moveToNextColumn();
          
          // 현재 단의 사용 가능한 높이 계산
          const currentColumnUsedHeight = currentColumns[currentColumnIndex].reduce((sum, colItem) => {
            return sum + colItem.sections.reduce((s, sec) => s + estimateSectionHeight(sec), 0);
          }, 0);
          const availableHeight = PAGE_HEIGHT_PX - currentColumnUsedHeight - CONTAINER_PADDING - SAFETY_BUFFER;
          
          // 남은 단락들의 높이를 계산
          const remainingParagraphHeights = remainingParagraphs.map(section => estimateSectionHeight(section));
          
          // 현재 단에 배치할 수 있는 최대 단락 수 찾기
          // 더 정확하게 계산하여 공간을 최대한 활용 (99.5%까지 사용 가능)
          const heightLimitRatio = 0.995; // 0.5% 여유 공간만 확보
          let cumulativeHeight = 0;
          let maxParagraphsInCurrentColumn = 0;
          
          for (let i = 0; i < remainingParagraphHeights.length; i++) {
            const nextCumulativeHeight = cumulativeHeight + remainingParagraphHeights[i];
            // 사용 가능한 높이의 제한 비율 이내로 제한
            if (nextCumulativeHeight <= availableHeight * heightLimitRatio) {
              cumulativeHeight = nextCumulativeHeight;
              maxParagraphsInCurrentColumn = i + 1;
            } else {
              // 다음 단락을 추가하면 단 높이를 초과하므로 중단
              break;
            }
          }
          
          // 현재 단에 배치할 단락들
          const currentColumnParagraphs = remainingParagraphs.slice(0, maxParagraphsInCurrentColumn);
          // 다음 단에 배치할 단락들
          remainingParagraphs = remainingParagraphs.slice(maxParagraphsInCurrentColumn);
          
          // 현재 단에 단락들 배치
          if (currentColumnParagraphs.length > 0) {
            const currentColumnItem: NormalizedQuizItem = {
              ...item,
              sections: currentColumnParagraphs, // 헤더 제외, 단락만 포함
              chunkMeta: { ...item.chunkMeta, isSplitPart: remainingParagraphs.length > 0 }
            };
            addToCurrentColumn(currentColumnItem);
          }
          
          // 더 이상 배치할 단락이 없으면 종료
          if (remainingParagraphs.length === 0) {
            break;
          }
        }
      }
    });

    if (currentColumns[0].length > 0 || currentColumns[1].length > 0) {
      pages.push(currentColumns);
    }

    return pages;
  };

  const normalizedItems = quizzes.map((quiz, index) => normalizeWork11Quiz(quiz, index));
  const distributedPages = distributeItemsCustom(normalizedItems);

  // 렌더링 헬퍼
  const renderNormalizedCard = (
    normalizedItem: NormalizedQuizItem,
    keyPrefix: string
  ): React.ReactNode => {
    return renderNormalizedCardNode(normalizedItem, keyPrefix, { isAnswerMode });
  };

  return (
    <div className={isAnswerMode ? "print-container-answer work11-print" : "print-container work11-print"}>
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
        /* 문제 제목 패딩 설정 - 인쇄(문제)와 인쇄(정답) 동일 */
        .work11-print .print-question-title {
          padding-left: 0.2cm !important;
          margin-bottom: 0.25cm !important;
          padding-bottom: 0.15cm !important;
          margin-top: 0 !important;
        }
        /* 첫 번째 카드의 제목: 헤더와의 간격 확보 - 인쇄(문제)와 인쇄(정답) 동일 */
        .work11-print.print-container .print-column > .print-question-card:first-child .print-question-title,
        .work11-print.print-container-answer .print-column > .print-question-card:first-child .print-question-title {
          margin-top: 0.3cm !important;
        }
        /* 인쇄(정답) 모드: 각 단 컨테이너 내부 여백 설정 */
        .work11-print.print-container-answer .print-column {
          margin: 0 !important;
          gap: 0.3cm !important;
        }
        /* 인쇄(정답) 모드: 왼쪽 단 (첫 번째 단) 패딩 설정 */
        .work11-print.print-container-answer .print-two-column-container > .print-column:nth-child(1) {
          padding: 0.1cm 0 0 0.5cm !important;
        }
        /* 인쇄(정답) 모드: 오른쪽 단 (두 번째 단) 패딩 설정 - 왼쪽 패딩 제거, 오른쪽 패딩 추가 */
        .work11-print.print-container-answer .print-two-column-container > .print-column:nth-child(2) {
          padding: 0.1cm 0.5cm 0 0 !important;
        }
        .work11-print.print-container-answer .print-question-card {
          padding: 0.1cm 0 0 0 !important;
          margin: 0 !important;
        }
        /* 인쇄(문제) 모드: 인쇄(정답) 모드와 동일한 여백 적용 */
        .work11-print.print-container .print-column {
          padding: 0.1cm 0 0 0.5cm !important;
          margin: 0 !important;
          gap: 0.3cm !important;
        }
        .work11-print.print-container .print-question-card {
          padding: 0.1cm 0 0 0 !important;
          margin: 0 !important;
        }
        /* 페이지 콘텐츠 패딩 제거 */
        .work11-print .a4-landscape-page-content {
          padding: 0 !important;
        }
        .work11-print .work11-sentences-container {
          margin: 0.5rem 0;
        }
        .work11-print .work11-sentence-item {
          margin-bottom: 0.5rem;
          line-height: 1.7;
          font-size: 9.4pt;
        }
        .work11-print .work11-sentence-number {
          font-weight: 600;
          margin-right: 0.3rem;
        }
        .work11-print .work11-sentence-text {
          font-family: 'Times New Roman', serif;
        }
        .work11-print .work11-sentence-english {
          margin-bottom: 0.2rem;
        }
        .work11-print .work11-sentence-translation {
          margin-top: 0.3rem;
          color: #1976d2;
          font-size: 8.8pt;
          line-height: 1.35;
          padding-left: 0.3rem;
        }
        .work11-print .work11-translation-space {
          margin-top: 0.3rem;
          height: 24px;
          border-bottom: 1px dashed #ccc;
        }
        .work11-print.print-container-answer .work11-translation-space {
          display: none;
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

export default PrintFormatWork11New;

