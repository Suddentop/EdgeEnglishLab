import { PrintSection, NormalizedQuizItem } from './printNormalization';

export interface ChunkMeta {
  chunkIndex: number;
  totalChunks: number;
  isSplitChunk: boolean;
  showInstruction: boolean;
  showOptions: boolean;
  showAnswer: boolean;
  showTranslation: boolean;
  [key: string]: any;
}

export const COLUMN_CONFIG = {
  HEIGHT: 21,
  HEADER_HEIGHT: 1.2,
  CONTENT_PADDING: 0.5,
  TITLE_HEIGHT: 1.0,
  INSTRUCTION_HEIGHT: 0.8,
  SENTENCE_FONT_SIZE: 0.3,
  LINE_HEIGHT: 1.4,
  CHAR_WIDTH: 0.22,
  COLUMN_WIDTH: 14.35,
  SENTENCE_MARGIN: 0.25,
  SENTENCE_PADDING: 0.3,
  AVAILABLE_HEIGHT_CM: 19.0,
  CARD_MARGIN_CM: 0.6,
  PARAGRAPH_LINE_HEIGHT: 0.32,
  OPTION_LINE_HEIGHT: 0.3,
  OPTION_TRANSLATION_LINE_HEIGHT: 0.28,
  ANSWER_LINE_HEIGHT: 0.5,
  TRANSLATION_LINE_HEIGHT: 0.3,
  LIST_ITEM_HEIGHT: 0.45,
  TABLE_ROW_HEIGHT: 0.6,
  TABLE_HEADER_HEIGHT: 0.6
};

export const getAvailableColumnHeight = () => {
  const totalFixedSpace = 1.5 + 0.5;
  const availableHeightPerColumn = 21 - totalFixedSpace;
  return availableHeightPerColumn;
};

export const calculateTextHeight = (
  text: string,
  fontSize: number = COLUMN_CONFIG.SENTENCE_FONT_SIZE
): number => {
  if (!text) return 0;
  
  // 실제 컬럼 너비에서 패딩 제외 (더 정확한 계산)
  // print-passage: padding 0.25cm, print-paragraph-item: padding 없음
  const effectiveWidth = COLUMN_CONFIG.COLUMN_WIDTH - 0.5; // 좌우 패딩 0.25cm씩
  
  // 줄바꿈이 있는 경우와 없는 경우를 구분하여 처리
  const hasLineBreaks = text.includes('\n');
  
  let totalLines = 0;
  
  if (hasLineBreaks) {
    // 줄바꿈이 있는 경우: 각 줄을 개별적으로 계산
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.trim().length === 0) {
        // 빈 줄은 최소 높이
        totalLines += 1;
      } else {
        // 각 줄의 너비를 고려하여 줄바꿈 계산
        const charsPerLine = Math.floor(effectiveWidth / COLUMN_CONFIG.CHAR_WIDTH);
        const lineCount = Math.ceil(line.length / charsPerLine);
        totalLines += Math.max(1, lineCount); // 최소 1줄
      }
    });
  } else {
    // 줄바꿈이 없는 경우: 단어 단위로 더 정확하게 계산
    // 영어의 경우 단어 단위로 줄바꿈이 일어나므로, 평균 단어 길이를 고려
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) {
      totalLines = 1;
    } else {
      const charsPerLine = Math.floor(effectiveWidth / COLUMN_CONFIG.CHAR_WIDTH);
      let currentLineLength = 0;
      
      words.forEach(word => {
        const wordLength = word.length + 1; // 단어 + 공백
        if (currentLineLength + wordLength > charsPerLine && currentLineLength > 0) {
          // 새 줄 시작
          totalLines++;
          currentLineLength = wordLength;
        } else {
          currentLineLength += wordLength;
        }
      });
      
      // 마지막 줄 추가
      if (currentLineLength > 0) {
        totalLines++;
      }
      
      // 최소 1줄 보장
      totalLines = Math.max(1, totalLines);
    }
  }
  
  // line-height: paragraph는 기본값(약 1.2), html은 1.4
  // 실제 렌더링보다 약간 작게 계산하여 공간이 충분할 때 같은 단에 배치되도록
  const lineHeight = fontSize === 0.32 ? 1.2 : 1.4; // 8.5pt는 1.2, 9pt는 1.4
  const lineHeightMultiplier = lineHeight * 0.92; // 8% 여유 (과대평가 방지)
  
  return totalLines * fontSize * lineHeightMultiplier;
};

export const calculateSentenceHeight = (sentence: string): number => {
  if (!sentence) return 0.4;
  const textHeight = calculateTextHeight(sentence);
  return textHeight + 0.3;
};

export const splitWork11SentencesByHeight = (sentences: string[]): string[][] => {
  const result: string[][] = [];
  const availableHeight = getAvailableColumnHeight();
  const contentAvailableHeight = availableHeight - 0.1;

  let currentChunk: string[] = [];
  let currentHeight = 0;

  sentences.forEach((sentence) => {
    const sentenceHeight = calculateSentenceHeight(sentence);
    if (currentHeight + sentenceHeight > contentAvailableHeight && currentChunk.length > 0) {
      result.push([...currentChunk]);
      currentChunk = [sentence];
      currentHeight = sentenceHeight;
    } else {
      currentChunk.push(sentence);
      currentHeight += sentenceHeight;
    }
  });

  if (currentChunk.length > 0) {
    result.push(currentChunk);
  }

  return result;
};

export const splitWork11SentencesByHeightWithKorean = (sentences: any[]): any[][] => {
  const result: any[][] = [];
  const availableHeight = getAvailableColumnHeight();
  const contentAvailableHeight = availableHeight - 2.0;

  let currentChunk: any[] = [];
  let currentHeight = 0;

  sentences.forEach((sentence) => {
    const englishText = sentence.english || sentence.text || sentence || '';
    const koreanText = sentence.korean || sentence.translation || '';
    const englishHeight = calculateSentenceHeight(englishText);
    const koreanHeight = calculateSentenceHeight(koreanText);
    const totalSentenceHeight = englishHeight + koreanHeight;

    if (currentHeight + totalSentenceHeight > contentAvailableHeight && currentChunk.length > 0) {
      result.push([...currentChunk]);
      currentChunk = [sentence];
      currentHeight = totalSentenceHeight;
    } else {
      currentChunk.push(sentence);
      currentHeight += totalSentenceHeight;
    }
  });

  if (currentChunk.length > 0) {
    result.push(currentChunk);
  }

  return result;
};

export const createChunkMeta = (
  baseMeta: any,
  chunkIndex: number,
  totalChunks: number
): ChunkMeta => ({
  ...(baseMeta || {}),
  chunkIndex,
  totalChunks,
  isSplitChunk: totalChunks > 1,
  showInstruction: chunkIndex === 0,
  showOptions: chunkIndex === totalChunks - 1,
  showAnswer: chunkIndex === totalChunks - 1,
  showTranslation: chunkIndex === totalChunks - 1
});

export const htmlToPlainText = (html: string | undefined): string => {
  if (!html) return '';
  // HTML 태그를 제거하되, <br/> 같은 줄바꿈 태그는 줄바꿈으로 유지
  // 줄바꿈 정보를 보존하여 높이 계산의 정확도를 높임
  let text = html
    .replace(/<br\s*\/?>/gi, '\n') // <br> 태그를 줄바꿈으로
    .replace(/<\/p>/gi, '\n') // </p> 태그를 줄바꿈으로
    .replace(/<\/div>/gi, '\n') // </div> 태그를 줄바꿈으로
    .replace(/<[^>]+>/g, '') // 나머지 태그는 제거 (공백으로 변환하지 않음)
    .replace(/[ \t]+/g, ' ') // 탭과 연속된 공백만 하나로 (줄바꿈은 유지)
    .replace(/\n[ \t]+/g, '\n') // 줄바꿈 후 공백 제거
    .replace(/[ \t]+\n/g, '\n') // 공백 후 줄바꿈 정리
    .replace(/\n{3,}/g, '\n\n') // 연속된 줄바꿈은 최대 2개로
    .trim();
  return text;
};

export const estimateSectionHeight = (section: PrintSection): number => {
  const baseMargin = 0.05; // 섹션 간 마진 (과대평가 방지를 위해 더 줄임)
  
  switch (section.type) {
    case 'title':
      return COLUMN_CONFIG.TITLE_HEIGHT + baseMargin;
    case 'instruction':
      return COLUMN_CONFIG.INSTRUCTION_HEIGHT + baseMargin;
    case 'paragraph':
    case 'text': {
      // 유형#11 정답 모드: 영어 문장과 한글 해석을 함께 계산
      const variant = section.meta?.variant;
      if (variant === 'sentence-with-translation') {
        const englishText = section.text || '';
        const koreanText = section.meta?.translation || '';
        
        // 실제 CSS 기반 정확한 높이 계산 (보수적으로 계산하여 과대평가 방지)
        // .print-sentence-english: font-size: 8.5pt, line-height: 1.4, margin-bottom: 0.1cm
        // calculateTextHeight는 기본적으로 line-height 1.2로 계산하므로 1.4로 조정하되, 10% 여유를 둠
        const englishHeight = calculateTextHeight(englishText, 0.32) * (1.4 / 1.2) * 0.9; // line-height 1.4 반영, 10% 여유
        
        // .print-sentence-korean-inline: font-size: 8pt, line-height: 1.35, margin-top: 0.1cm (또는 0.1rem)
        // calculateTextHeight는 기본적으로 line-height 1.2로 계산하므로 1.35로 조정하되, 10% 여유를 둠
        const koreanHeight = calculateTextHeight(koreanText, 0.28) * (1.35 / 1.2) * 0.9; // line-height 1.35 반영, 10% 여유
        
        // .print-sentence-item: margin-bottom: 0.25cm (문장 간 마진)
        // .print-sentence-english: margin-bottom: 0.1cm
        // .print-sentence-korean-inline: margin-top: 0.1cm (또는 0.1rem ≈ 0.03cm)
        const englishMarginBottom = 0.1; // 영어 문장 하단 마진
        const koreanMarginTop = 0.03; // 한글 해석 상단 마진 (0.1rem ≈ 0.03cm)
        const itemMarginBottom = 0.25; // 문장 아이템 하단 마진
        
        // 높이를 보수적으로 계산 (과대평가 방지)
        const totalHeight = englishHeight + koreanHeight + englishMarginBottom + koreanMarginTop + itemMarginBottom;
        
        // 디버깅: 유형#11 높이 계산 확인
        if (process.env.NODE_ENV === 'development') {
          console.log('📏 유형#11 문장 높이 계산:', {
            englishText: englishText.substring(0, 50) + '...',
            koreanText: koreanText.substring(0, 50) + '...',
            englishHeight: englishHeight.toFixed(2),
            koreanHeight: koreanHeight.toFixed(2),
            totalHeight: totalHeight.toFixed(2)
          });
        }
        
        return totalHeight + baseMargin;
      }
      // 유형#11 문제 모드: 영어 문장만 표시 (sentence variant)
      if (variant === 'sentence') {
        const englishText = section.text || '';
        const label = section.label || '';
        
        // 실제 CSS 구조:
        // .print-sentence-item (margin-bottom: 0.25cm, padding-bottom: 0.15cm)
        //   └─ .print-sentence-english (padding: 0 0.15cm 0.15cm 0.15cm, margin-bottom: 0.1cm)
        
        // 텍스트 높이 계산: 더 정확하게 계산하기 위해 여유를 줄임
        // calculateTextHeight는 기본적으로 line-height 1.2로 계산하므로 1.4로 조정
        // 실제 렌더링과의 차이를 줄이기 위해 여유를 제거 (0% 여유)
        // label(문장 번호)는 인라인으로 표시되므로 별도 높이 불필요
        const fullText = label ? `${label}${englishText}` : englishText;
        const englishTextHeight = calculateTextHeight(fullText, 0.32) * (1.4 / 1.2); // line-height 1.4 반영, 여유 없음
        
        // .print-sentence-english 내부 패딩 (상하 패딩)
        // padding: 0 0.15cm 0.15cm 0.15cm → 상단 0, 하단 0.15cm
        const englishPaddingBottom = 0.15; // .print-sentence-english padding-bottom
        
        // .print-sentence-english 하단 마진
        const englishMarginBottom = 0.1; // .print-sentence-english margin-bottom
        
        // .print-sentence-item 하단 패딩 (print-sentence-english 밖의 공간)
        const itemPaddingBottom = 0.15; // .print-sentence-item padding-bottom
        
        // .print-sentence-item 하단 마진 (문장 간 간격)
        const itemMarginBottom = 0.25; // .print-sentence-item margin-bottom
        
        // 실제 높이 = 텍스트 높이 + 내부 패딩 + 내부 마진 + 외부 패딩 + 외부 마진
        // 주의: padding과 margin은 누적되지만, 실제로는 겹치지 않음
        const totalHeight = englishTextHeight + englishPaddingBottom + englishMarginBottom + itemPaddingBottom + itemMarginBottom;
        
        // 추가 보정: 실제 렌더링과의 차이를 보정하기 위해 8% 감소 (과대평가 방지)
        // 높이 계산이 실제보다 크게 나오는 경우가 많으므로 보정 필요
        const adjustedHeight = totalHeight * 0.92;
        
        // 디버깅: 유형#11 문제 모드 높이 계산 확인
        if (process.env.NODE_ENV === 'development') {
          console.log('📏 유형#11 문제 모드 문장 높이 계산:', {
            label: label,
            englishText: englishText.substring(0, 50) + '...',
            englishTextHeight: englishTextHeight.toFixed(3) + 'cm',
            englishPaddingBottom: englishPaddingBottom.toFixed(2) + 'cm',
            englishMarginBottom: englishMarginBottom.toFixed(2) + 'cm',
            itemPaddingBottom: itemPaddingBottom.toFixed(2) + 'cm',
            itemMarginBottom: itemMarginBottom.toFixed(2) + 'cm',
            totalHeight: totalHeight.toFixed(3) + 'cm',
            adjustedHeight: adjustedHeight.toFixed(3) + 'cm',
            baseMargin: baseMargin.toFixed(3) + 'cm',
            finalHeight: (adjustedHeight + baseMargin).toFixed(3) + 'cm'
          });
        }
        
        return adjustedHeight + baseMargin;
      }
      // paragraph 높이 계산 (font-size: 8.5pt, line-height: 1.2~1.4)
      // print-paragraph-item CSS: font-size: 8.5pt, line-height: 기본값(약 1.2), padding 없음
      const textHeight = calculateTextHeight(section.text || '', 0.32) * 0.9; // 10% 여유
      // paragraph는 padding이 없지만, margin-bottom이 있을 수 있음
      // 유형#06의 numbered-passage variant는 margin-top이 추가됨 (0.4cm)
      const additionalMargin = variant === 'numbered-passage' ? 0.4 : 0;
      // 본문은 마진을 최소화하여 정확한 높이 계산
      return textHeight + baseMargin + additionalMargin;
    }
    case 'html': {
      // HTML 본문 (font-size: 9pt, line-height: 1.4, padding: 0.25cm)
      // print-passage CSS: font-size: 9pt, line-height: 1.4, padding: 0.25cm, margin-bottom: 0.25cm
      const plainText = htmlToPlainText(section.html);
      // HTML 본문은 9pt (0.32cm)이지만, 실제로는 9pt = 0.317cm 정도
      // calculateTextHeight는 line-height를 1.2로 계산하므로, 1.4로 조정
      const htmlHeight = calculateTextHeight(plainText, 0.32) * (1.4 / 1.2) * 0.92; // 8% 여유
      // HTML 본문의 padding (상하 0.25cm씩)과 margin-bottom (0.25cm) 추가
      const htmlPadding = 0.25 * 2; // 상하 패딩
      const htmlMarginBottom = 0.25; // 하단 마진
      return htmlHeight + htmlPadding + htmlMarginBottom + baseMargin;
    }
    case 'options': {
      if (!section.options || section.options.length === 0) {
        return 0.35 + baseMargin;
      }
      // 옵션 컨테이너 상단 여백 (CSS: margin-top: 0.25cm)
      let total = 0.15; // 실제보다 더 작게 조정
      section.options.forEach((option, idx) => {
        const optionText = option?.text || '';
        // 옵션 높이 계산 (font-size: 8.5pt, line-height: 1.3)
        // calculateTextHeight는 line-height를 1.2로 계산하므로, 1.3으로 조정
        // 높이 계산을 더 보수적으로 (10% 여유)
        const optionHeight = calculateTextHeight(optionText, 0.3) * (1.3 / 1.2) * 0.9; // 10% 여유
        // 첫 옵션은 여백 없음, 이후 옵션만 간격 추가 (CSS: margin-bottom: 0.12cm)
        const optionSpacing = idx === 0 ? 0 : 0.06; // 실제보다 더 작게
        total += optionHeight + optionSpacing;
        if (option?.translation) {
          // 번역 높이 (font-size: 8pt, line-height: 1.35)
          const translationHeight = calculateTextHeight(option.translation, 0.28) * (1.35 / 1.2) * 0.9; // 10% 여유
          total += translationHeight + 0.04; // 번역 간격도 더 줄임
        }
      });
      // 옵션 섹션의 하단 마진을 최소화
      return total + baseMargin;
    }
    case 'table': {
      const rowCount = (section.rows?.length || 0) + (section.headers ? 1 : 0);
      return rowCount * 0.45 + 0.25 + baseMargin; // 테이블 행 높이도 약간 줄임
    }
    case 'answer': {
      const answerCount = section.items?.length || 1;
      return answerCount * 0.35 + 0.25 + baseMargin; // 정답 높이도 줄임
    }
    case 'translation': {
      // 한글해석 높이 계산 (font-size: 8pt, line-height: 1.35)
      // calculateTextHeight는 line-height를 1.2로 계산하므로, 1.35로 조정
      const translationHeight = calculateTextHeight(section.text || '', 0.28) * (1.35 / 1.2) * 0.92; // 8% 여유
      // translation 섹션의 상단 마진과 하단 마진을 최소화 (CSS: margin-top: 0.2cm, padding-top: 0.1cm)
      return translationHeight + 0.15 + baseMargin; // 상단 마진과 패딩을 줄임
    }
    case 'list': {
      const itemCount = section.items?.length || 1;
      return itemCount * 0.35 + 0.2 + baseMargin; // 리스트 아이템 높이도 줄임
    }
    case 'spacer':
      return 0.15; // 스페이서도 줄임
    default:
      return 0.35 + baseMargin;
  }
};

export const cloneSectionForChunk = (
  section: PrintSection,
  chunkIndex: number,
  sequenceIndex: number
): PrintSection => ({
  ...section,
  key: `${section.key}-chunk-${chunkIndex}-${sequenceIndex}`
});

export const splitNormalizedItemByHeight = (
  normalizedItem: NormalizedQuizItem
): NormalizedQuizItem[] => {
  // CSS: padding: 0.5cm, margin-bottom: 0.3cm
  // 높이 계산을 보수적으로 하기 위해 약간 줄여서 계산
  const cardPadding = 0.5 * 2 * 0.95; // 카드 상하 패딩 (5% 여유)
  const cardMarginBottom = 0.3 * 0.9; // 카드 하단 마진 (10% 여유)
  const availableHeight = getAvailableColumnHeight() - cardPadding - cardMarginBottom;
  const titleSection = normalizedItem.sections.find((section) => section.type === 'title');
  // 정답 섹션은 마지막 청크에만 포함되도록 분리 (정답 섹션은 원본에서 제거하고 나중에 추가)
  // 유형#13, #14의 경우 정답 섹션을 명시적으로 분리
  const answerSections = normalizedItem.sections.filter((section) => section.type === 'answer');
  const contentSections = normalizedItem.sections.filter(
    (section) => section.type !== 'title' && section.type !== 'answer'
  );
  
  // 정답 섹션이 이미 contentSections에 포함되어 있는지 확인 (중복 방지)
  const hasAnswerInContent = contentSections.some(s => s.type === 'answer');
  
  // 디버깅: 유형#10, #11, #13의 경우 섹션 생성 확인 (빈 페이지 방지)
  if (process.env.NODE_ENV === 'development' && (normalizedItem.workTypeId === '10' || normalizedItem.workTypeId === '11' || normalizedItem.workTypeId === '13')) {
    console.log(`🔍 유형#${normalizedItem.workTypeId} 섹션 확인:`, {
      workTypeId: normalizedItem.workTypeId,
      totalSections: normalizedItem.sections.length,
      allSectionTypes: normalizedItem.sections.map(s => s.type),
      contentSectionsCount: contentSections.length,
      contentSectionTypes: contentSections.map(s => s.type),
      answerSectionsCount: answerSections.length,
      hasTitle: !!titleSection
    });
  }
  
  // 디버깅: 유형#13, #14의 정답 섹션 확인
  if (process.env.NODE_ENV === 'development' && (normalizedItem.workTypeId === '13' || normalizedItem.workTypeId === '14')) {
    console.log('🔍 유형#13/14 정답 섹션 확인:', {
      workTypeId: normalizedItem.workTypeId,
      answerSectionsCount: answerSections.length,
      answerSectionsKeys: answerSections.map(s => s.key),
      hasAnswerInContent,
      allSectionTypes: normalizedItem.sections.map(s => s.type)
    });
  }
  
  // 빈 섹션 배열 방지: contentSections가 비어있으면 경고
  if (contentSections.length === 0) {
    console.error(`❌ 유형#${normalizedItem.workTypeId}: contentSections가 비어있습니다!`, {
      workTypeId: normalizedItem.workTypeId,
      allSections: normalizedItem.sections,
      allSectionTypes: normalizedItem.sections.map(s => s.type)
    });
  }

  const chunkSectionsList: PrintSection[][] = [];

  const startNewChunk = (chunkIndex: number, includeTitle: boolean): { sections: PrintSection[]; height: number } => {
    const sections: PrintSection[] = [];
    let height = 0;
    // 유형제목은 첫 청크에만 포함
    if (includeTitle && titleSection) {
      const clonedTitle = cloneSectionForChunk(titleSection, chunkIndex, sections.length);
      sections.push(clonedTitle);
      height += estimateSectionHeight(clonedTitle);
    }
    return { sections, height };
  };

  let chunkIndex = 0;
  let { sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, true); // 첫 청크는 제목 포함
  let answerSectionsAdded = false; // 정답 섹션이 이미 추가되었는지 추적

  // 디버깅: 유형#11의 경우 첫 청크 시작 상태 확인
  if (process.env.NODE_ENV === 'development' && normalizedItem.workTypeId === '11') {
    console.log('🔍 유형#11 첫 청크 시작:', {
      workTypeId: normalizedItem.workTypeId,
      titleSection: !!titleSection,
      contentSectionsCount: contentSections.length,
      contentSectionTypes: contentSections.map(s => s.type),
      currentSectionsCount: currentSections.length,
      currentHeight: currentHeight,
      availableHeight: availableHeight
    });
  }

  // forEach 대신 for 루프를 사용하여 인덱스를 조작할 수 있도록 함
  for (let sectionIndex = 0; sectionIndex < contentSections.length; sectionIndex++) {
    const section = contentSections[sectionIndex];
    
    // instruction은 첫 청크에만 포함
    if (section.type === 'instruction' && chunkSectionsList.length > 0) {
      continue;
    }

    let clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
    let sectionHeight = estimateSectionHeight(clonedSection);

    const onlyTitlePresent =
      currentSections.length === 1 && currentSections[0]?.type === 'title';
    
    // 디버깅: 유형#11의 경우 각 섹션 처리 상태 확인
    if (process.env.NODE_ENV === 'development' && normalizedItem.workTypeId === '11' && sectionIndex < 3) {
      console.log(`🔍 유형#11 섹션 ${sectionIndex + 1} 처리:`, {
        sectionType: section.type,
        sectionHeight: sectionHeight,
        currentHeight: currentHeight,
        totalHeight: currentHeight + sectionHeight,
        availableHeight: availableHeight,
        onlyTitlePresent: onlyTitlePresent,
        currentSectionsCount: currentSections.length
      });
    }

    // 모든 유형에 동일하게 적용: paragraph/html 다음에 options와 translation이 오면 함께 묶어서 처리
    // nextSection을 먼저 정의해야 함 (다른 변수들이 이를 참조함)
    const nextSection = contentSections[sectionIndex + 1];
    const nextNextSection = contentSections[sectionIndex + 2];
    
    const isParagraphOrHtmlSection = section.type === 'paragraph' || section.type === 'html';
    const isOptionsSection = section.type === 'options';
    const isInstructionSection = section.type === 'instruction';
    const nextIsOptions = nextSection?.type === 'options';
    const nextIsTranslation = nextSection?.type === 'translation';
    const nextNextIsTranslation = nextNextSection?.type === 'translation';
    const nextIsParagraphOrHtml = nextSection?.type === 'paragraph' || nextSection?.type === 'html';
    
    // 유형#13, #14의 경우: instruction 다음에 오는 paragraph/html과 함께 묶어야 함
    const isWork13Or14 = normalizedItem.workTypeId === '13' || normalizedItem.workTypeId === '14';
    
    // 유형#07, 09, 10의 긴 본문 섹션인지 확인 (페이지 분할 로직에서 사용)
    const isLongPassageType = normalizedItem.workTypeId === '07' || normalizedItem.workTypeId === '09' || normalizedItem.workTypeId === '10';
    const isLongPassageSection = isLongPassageType && (section.type === 'paragraph' || section.type === 'html');
    
    // 유형#09, #10의 경우 본문(html)과 options를 함께 묶어야 함
    const isWork09Passage = normalizedItem.workTypeId === '09' && section.type === 'html';
    const isWork10Passage = normalizedItem.workTypeId === '10' && section.type === 'html';
    const isWork09Options = normalizedItem.workTypeId === '09' && section.type === 'options';
    const isWork10Options = normalizedItem.workTypeId === '10' && section.type === 'options';
    
    // 유형#11의 문장 섹션인지 확인 (sentence 또는 sentence-with-translation variant)
    const isWork11SentenceSection = normalizedItem.workTypeId === '11' && 
      section.type === 'paragraph' && 
      (section.meta?.variant === 'sentence' || section.meta?.variant === 'sentence-with-translation');
    // 유형#11의 다음 문장 섹션인지 확인
    const nextIsWork11Sentence = normalizedItem.workTypeId === '11' && 
      nextSection?.type === 'paragraph' && 
      (nextSection.meta?.variant === 'sentence' || nextSection.meta?.variant === 'sentence-with-translation');
    
    // paragraph/html 다음에 options와 translation이 오는 경우, 모두 함께 고려
    let totalHeightForCheck = sectionHeight;
    if (isParagraphOrHtmlSection && nextIsOptions && nextNextIsTranslation) {
      const optionsHeight = estimateSectionHeight(nextSection);
      const translationHeight = estimateSectionHeight(nextNextSection);
      totalHeightForCheck = sectionHeight + optionsHeight + translationHeight;
    } else if (isParagraphOrHtmlSection && nextIsTranslation && !nextIsOptions) {
      // paragraph/html 다음에 translation이 바로 오는 경우 (유형#13, #14 등)
      const translationHeight = estimateSectionHeight(nextSection);
      totalHeightForCheck = sectionHeight + translationHeight;
    } else if (isOptionsSection && nextIsTranslation) {
      // options 다음에 translation이 오는 경우
      const translationHeight = estimateSectionHeight(nextSection);
      totalHeightForCheck = sectionHeight + translationHeight;
    }

    // paragraph/html + options + translation을 함께 묶어서 처리 (모든 유형에 동일하게 적용)
    // 단, 유형#10의 경우 options와 translation 사이에 answer가 있을 수 있음
    if (isParagraphOrHtmlSection && nextIsOptions && nextNextIsTranslation) {
      const optionsHeight = estimateSectionHeight(nextSection);
      const translationHeight = estimateSectionHeight(nextNextSection);
      const paragraphOnlyHeight = currentHeight + sectionHeight;
      const paragraphOptionsHeight = paragraphOnlyHeight + optionsHeight;
      const allThreeHeight = paragraphOptionsHeight + translationHeight;
      
      // 높이 계산에 더 큰 여유를 줘서 과대평가 방지 (15% 여유)
      // 실제로는 공간이 충분한데도 과대평가로 인해 다음 단으로 넘어가는 문제 해결
      const availableHeightWithMargin = availableHeight * 0.85;
      
      // 유형#10의 경우: 본문이 길면 본문만 현재 청크에, options/answer/translation은 다음 청크로
      // (translation은 options/answer 뒤에 오므로 본문과 함께 묶이면 안 됨)
      if (isWork10Passage) {
        // 본문만 현재 청크에 추가
        if (paragraphOnlyHeight <= availableHeightWithMargin) {
          // 본문만 추가하고 options/answer/translation은 다음 청크로
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          continue;
        } else {
          // 본문도 들어갈 수 없으면 본문을 다음 청크로 이동
          // 단, onlyTitlePresent인 경우에는 강제로 현재 청크에 추가 (빈 페이지 방지)
          if (onlyTitlePresent) {
            currentSections.push(clonedSection);
            currentHeight += sectionHeight;
            continue;
          }
          // 본문을 다음 청크로 이동
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
            
            clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
            sectionHeight = estimateSectionHeight(clonedSection);
            continue;
          }
        }
      }
      
      // 1. paragraph + options + translation이 모두 들어갈 수 있으면 모두 현재 청크에
      if (allThreeHeight <= availableHeightWithMargin) {
        // paragraph만 추가하고 options와 translation은 다음 반복에서 처리
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        continue;
      }
      // 2. paragraph + options만 들어갈 수 있으면 paragraph와 options는 현재 청크에, translation은 다음 청크로
      if (paragraphOptionsHeight <= availableHeightWithMargin) {
        // paragraph와 options를 모두 추가하고, options 섹션을 건너뛰기 위해 인덱스 증가
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        
        // options 섹션도 함께 추가
        const clonedOptionsSection = cloneSectionForChunk(nextSection, chunkIndex, currentSections.length);
        const optionsSectionHeight = estimateSectionHeight(clonedOptionsSection);
        currentSections.push(clonedOptionsSection);
        currentHeight += optionsSectionHeight;
        
        // options 섹션을 건너뛰기 위해 인덱스 증가
        sectionIndex++;
        continue;
      }
      // 3. paragraph만 들어갈 수 있으면 paragraph는 현재 청크에, options와 translation은 다음 청크로
      if (paragraphOnlyHeight <= availableHeightWithMargin) {
        // paragraph만 추가하고 options와 translation은 다음 반복에서 처리
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        continue;
      }
      // 4. paragraph도 들어갈 수 없으면 본문을 다음 청크로 이동
      // 단, onlyTitlePresent인 경우에는 강제로 현재 청크에 추가 (빈 페이지 방지)
      if (onlyTitlePresent) {
        // 첫 청크에 title만 있는 경우: paragraph를 강제로 추가 (높이 초과해도)
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        continue;
      }
      // 유형#07, 09, 10의 경우: 본문이 너무 길면 여러 청크로 분할
      if (
        currentSections.length > 0
      ) {
        // 유형#09, #10의 경우: 본문과 options를 함께 묶으려고 시도
        // 단, 본문이 너무 길어서 options를 같은 청크에 넣을 수 없을 때는 분리
        if ((isWork09Passage || isWork10Passage) && nextIsOptions) {
          const optionsHeight = estimateSectionHeight(nextSection);
          const passageOptionsHeight = currentHeight + sectionHeight + optionsHeight;
          
          // 본문과 options를 함께 넣을 수 있으면 함께 묶기
          if (passageOptionsHeight <= availableHeight * 1.1) { // 10% 여유
            // 유형#10: 본문과 options를 함께 현재 청크에 추가
            currentSections.push(clonedSection);
            currentHeight += sectionHeight;
            
            // options 섹션도 함께 추가
            const clonedOptionsSection = cloneSectionForChunk(nextSection, chunkIndex, currentSections.length);
            const optionsSectionHeight = estimateSectionHeight(clonedOptionsSection);
            currentSections.push(clonedOptionsSection);
            currentHeight += optionsSectionHeight;
            
            // options 섹션을 건너뛰기 위해 인덱스 증가
            sectionIndex++;
            continue;
          } else {
            // 본문이 너무 길어서 options를 같은 청크에 넣을 수 없음
            // 본문은 현재 청크에, options는 다음 청크로 넘어가도록 처리
            // (아래 isLongPassageSection 로직에서 처리됨)
          }
        }
        
        // 유형#07, 09, 10의 긴 본문인 경우: 본문을 현재 청크에 배치 (높이 초과해도)
        // 본문이 너무 길면 여러 청크에 걸쳐 표시되도록 함
        if (isLongPassageSection) {
          // 현재 청크에 본문 추가 (높이 초과해도 본문 전체를 추가)
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          
          // 현재 청크를 저장하고 새 청크 시작
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          
          // 본문 섹션은 이미 추가되었으므로, 다음 반복으로 넘어감
          // 다음 반복에서 options 섹션 처리
          continue;
        } else {
          // 일반적인 경우: 현재 청크를 저장하고 새 청크로 이동
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));

          clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
          sectionHeight = estimateSectionHeight(clonedSection);
          totalHeightForCheck = sectionHeight + optionsHeight + translationHeight;
          
          // 다음 반복에서 처리하도록 continue
          continue;
        }
      } else {
        // paragraph + options + translation이 모두 들어갈 수 없는 경우에도 일반 처리로 넘어가도록
        // (onlyTitlePresent인 경우 등)
      }
    } else if (isParagraphOrHtmlSection && nextIsOptions && !nextIsTranslation) {
      // paragraph/html + options만 있는 경우 (translation 없음, 문제 모드 등)
      // 유형#09, #10 등에서 문제 모드일 때 html + options를 함께 묶어서 처리
      const optionsHeight = estimateSectionHeight(nextSection);
      const paragraphOnlyHeight = currentHeight + sectionHeight;
      const paragraphOptionsHeight = paragraphOnlyHeight + optionsHeight;
      
      // 높이 계산에 더 큰 여유를 줘서 과대평가 방지 (15% 여유)
      const availableHeightWithMargin = availableHeight * 0.85;
      
      // 유형#09, #10의 경우: 본문과 options를 함께 묶으려고 시도
      // 단, 본문이 너무 길어서 options를 같은 청크에 넣을 수 없을 때는 분리
      if (isWork09Passage || isWork10Passage) {
        const optionsHeight = estimateSectionHeight(nextSection);
        const passageOptionsHeight = currentHeight + sectionHeight + optionsHeight;
        
        // 본문과 options를 함께 넣을 수 있으면 함께 묶기
        if (passageOptionsHeight <= availableHeight * 1.1) { // 10% 여유
          // 유형#10: 본문과 options를 함께 현재 청크에 추가
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          
          // options 섹션도 함께 추가
          const clonedOptionsSection = cloneSectionForChunk(nextSection, chunkIndex, currentSections.length);
          const optionsSectionHeight = estimateSectionHeight(clonedOptionsSection);
          currentSections.push(clonedOptionsSection);
          currentHeight += optionsSectionHeight;
          
          // options 섹션을 건너뛰기 위해 인덱스 증가
          sectionIndex++;
          continue;
        } else {
          // 본문이 너무 길어서 options를 같은 청크에 넣을 수 없음
          // 본문은 현재 청크에, options는 다음 청크로 넘어가도록 처리
          // (아래 isLongPassageSection 로직에서 처리됨)
        }
      }
      
      // 1. paragraph + options가 모두 들어갈 수 있으면 모두 현재 청크에
      if (paragraphOptionsHeight <= availableHeightWithMargin) {
        // paragraph와 options를 모두 추가하고, options 섹션을 건너뛰기 위해 인덱스 증가
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        
        // options 섹션도 함께 추가
        const clonedOptionsSection = cloneSectionForChunk(nextSection, chunkIndex, currentSections.length);
        const optionsSectionHeight = estimateSectionHeight(clonedOptionsSection);
        currentSections.push(clonedOptionsSection);
        currentHeight += optionsSectionHeight;
        
        // options 섹션을 건너뛰기 위해 인덱스 증가
        sectionIndex++;
        continue;
      }
      // 2. paragraph만 들어갈 수 있으면 paragraph는 현재 청크에, options는 다음 청크로
      if (paragraphOnlyHeight <= availableHeightWithMargin) {
        // paragraph만 추가하고 options는 다음 반복에서 처리
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        continue;
      }
      // 3. paragraph도 들어갈 수 없으면 본문을 다음 청크로 이동
      // 단, onlyTitlePresent인 경우에는 강제로 현재 청크에 추가 (빈 페이지 방지)
      if (onlyTitlePresent) {
        // 첫 청크에 title만 있는 경우: paragraph를 강제로 추가 (높이 초과해도)
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        continue;
      }
      // 유형#09, 10의 경우: 본문이 너무 길면 여러 청크로 분할
      if (
        currentSections.length > 0
      ) {
        // 유형#09, #10의 경우: 본문이 길어서 options를 같은 청크에 넣을 수 없을 때
        // 본문은 현재 청크에, options는 다음 청크로 넘어가야 함
        if ((isWork09Passage || isWork10Passage) && nextIsOptions) {
          // 본문을 현재 청크에 추가
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          
          // 현재 청크를 저장하고 새 청크 시작
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          
          // 다음 반복에서 options 섹션을 새 청크에 처리하도록 continue
          // options는 다음 청크(새 청크)로 넘어감
          continue;
        }
        
        // 유형#09, 10의 긴 본문인 경우: 본문을 현재 청크에 배치 (높이 초과해도)
        // 본문이 너무 길면 여러 청크에 걸쳐 표시되도록 함
        if (isLongPassageSection) {
          // 현재 청크에 본문 추가 (높이 초과해도 본문 전체를 추가)
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          
          // 현재 청크를 저장하고 새 청크 시작
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          
          // 본문 섹션은 이미 추가되었으므로, 다음 반복으로 넘어감
          // 다음 반복에서 options 섹션 처리
          continue;
        } else {
          // 일반적인 경우: 현재 청크를 저장하고 새 청크로 이동
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));

          clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
          sectionHeight = estimateSectionHeight(clonedSection);
          totalHeightForCheck = sectionHeight + optionsHeight;
          
          // 다음 반복에서 처리하도록 continue
          continue;
        }
      }
    } else if (isParagraphOrHtmlSection && nextIsTranslation && !nextIsOptions) {
      // paragraph/html + translation을 함께 묶어서 처리 (유형#13, #14 등, 모든 유형에 동일하게 적용)
      const translationHeight = estimateSectionHeight(nextSection);
      const paragraphOnlyHeight = currentHeight + sectionHeight;
      const paragraphTranslationHeight = paragraphOnlyHeight + translationHeight;
      
      // 높이 계산에 더 큰 여유를 줘서 과대평가 방지 (15% 여유)
      const availableHeightWithMargin = availableHeight * 0.85;
      
      // 1. paragraph + translation이 모두 들어갈 수 있으면 모두 현재 청크에
      if (paragraphTranslationHeight <= availableHeightWithMargin) {
        // paragraph만 추가하고 translation은 다음 반복에서 처리
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        continue;
      }
      // 2. paragraph만 들어갈 수 있으면 paragraph는 현재 청크에, translation은 다음 청크로
      if (paragraphOnlyHeight <= availableHeightWithMargin) {
        // paragraph만 추가하고 translation은 다음 반복에서 처리
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        continue;
      }
      // 3. paragraph도 들어갈 수 없으면 모두 다음 청크로 이동
      // 단, onlyTitlePresent인 경우에는 강제로 현재 청크에 추가 (빈 페이지 방지)
      if (onlyTitlePresent) {
        // 첫 청크에 title만 있는 경우: paragraph를 강제로 추가 (높이 초과해도)
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        continue;
      }
      if (
        currentSections.length > 0
      ) {
        chunkSectionsList.push(currentSections);
        chunkIndex++;
        ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false)); // 새 청크는 제목 제외

        clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
        sectionHeight = estimateSectionHeight(clonedSection);
        totalHeightForCheck = sectionHeight + translationHeight;
      }
    } else if (isOptionsSection && nextIsTranslation) {
      // options 다음 translation이 오는 경우 (모든 유형에 동일하게 적용)
      // 둘 다 들어갈 수 있으면 둘 다 현재 청크에, 둘 다 들어갈 수 없으면 둘 다 다음 청크로
      if (currentHeight + totalHeightForCheck <= availableHeight) {
        // 둘 다 현재 청크에 추가 가능 - options만 추가하고 translation은 다음 반복에서 처리
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        continue;
      }
      // 둘 다 들어갈 수 없으면 둘 다 다음 청크로 이동
      if (
        currentSections.length > 0 &&
        !onlyTitlePresent
      ) {
        chunkSectionsList.push(currentSections);
        chunkIndex++;
        ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false)); // 새 청크는 제목 제외

        clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
        sectionHeight = estimateSectionHeight(clonedSection);
        const translationHeight = estimateSectionHeight(nextSection);
        totalHeightForCheck = sectionHeight + translationHeight;
      }
    } else if (isWork11SentenceSection) {
      // 유형#11 전용: 연속된 문장(paragraph) 섹션들을 효율적으로 배치
      // 각 문장은 하나의 단위로 취급되며, 하나의 문장이 페이지를 넘기면 안 됨
      // 여러 문장을 한 페이지에 배치할 수 있을 때는 가능한 한 많이 배치
      
      // 각 문장의 높이를 독립적으로 계산
      const sentenceLabel = section.label || `문장 ${sectionIndex + 1}`;
      
      // 디버깅: 각 문장의 높이 계산 확인
      if (process.env.NODE_ENV === 'development') {
        console.log(`📏 유형#11 ${sentenceLabel} 높이 계산:`, {
          sentenceText: (section.text || '').substring(0, 50) + '...',
          sectionHeight: sectionHeight.toFixed(2) + 'cm',
          currentHeight: currentHeight.toFixed(2) + 'cm',
          availableHeight: availableHeight.toFixed(2) + 'cm',
          canFit: (currentHeight + sectionHeight <= availableHeight)
        });
      }
      
      // 현재 문장을 추가할 수 있는지 확인
      // 높이 계산의 과대평가를 보정하기 위해 여유를 둠 (10% 여유)
      // 실제 렌더링 높이가 계산 높이보다 작을 수 있으므로 충분한 여유 필요
      const heightTolerance = availableHeight * 0.1; // 10% 여유
      const effectiveAvailableHeight = availableHeight + heightTolerance;
      
      if (currentHeight + sectionHeight <= effectiveAvailableHeight) {
        // 현재 청크에 추가 가능: 문장 추가
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        
        // 디버깅: 유형#11 문장 추가 확인
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ 유형#11 문장 ${sectionIndex + 1} 추가:`, {
            sectionHeight: sectionHeight.toFixed(2),
            currentHeight: currentHeight.toFixed(2),
            availableHeight: availableHeight.toFixed(2),
            remainingHeight: (availableHeight - currentHeight).toFixed(2)
          });
        }
        
        // 다음 섹션이 유형#11의 문장이 아니면 여기서 종료
        if (!nextIsWork11Sentence) {
          continue;
        }
        
        // 다음 문장도 확인하여 가능한 한 많이 배치
        let nextSentenceIndex = sectionIndex + 1;
        while (nextSentenceIndex < contentSections.length) {
          const nextSentenceSection = contentSections[nextSentenceIndex];
          const isNextSentence = nextSentenceSection?.type === 'paragraph' && 
            (nextSentenceSection.meta?.variant === 'sentence' || nextSentenceSection.meta?.variant === 'sentence-with-translation');
          
          if (!isNextSentence) {
            break;
          }
          
          const clonedNextSentence = cloneSectionForChunk(nextSentenceSection, chunkIndex, currentSections.length);
          const nextSentenceHeight = estimateSectionHeight(clonedNextSentence);
          
          // 다음 문장을 추가할 수 있으면 추가 (여유 포함)
          if (currentHeight + nextSentenceHeight <= effectiveAvailableHeight) {
            currentSections.push(clonedNextSentence);
            currentHeight += nextSentenceHeight;
            
            // 디버깅: 유형#11 연속 문장 추가 확인
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ 유형#11 문장 ${nextSentenceIndex + 1} 연속 추가:`, {
                sectionHeight: nextSentenceHeight.toFixed(2),
                currentHeight: currentHeight.toFixed(2),
                availableHeight: availableHeight.toFixed(2),
                remainingHeight: (availableHeight - currentHeight).toFixed(2)
              });
            }
            
            nextSentenceIndex++;
          } else {
            // 다음 문장을 추가할 수 없으면 중단
            break;
          }
        }
        
        // 처리된 문장들을 건너뛰기
        if (nextSentenceIndex > sectionIndex + 1) {
          sectionIndex = nextSentenceIndex - 1; // 다음 반복에서 처리하도록 (증가될 예정이므로 -1)
        }
        
        continue;
      } else {
        // 현재 문장을 추가할 수 없는 경우
        if (onlyTitlePresent) {
          // 첫 청크에 title만 있는 경우: 문장을 강제로 추가 (빈 페이지 방지)
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`⚠️ 유형#11: 첫 청크에 문장 강제 추가 (높이 초과):`, {
              sectionHeight: sectionHeight.toFixed(2),
              currentHeight: currentHeight.toFixed(2),
              availableHeight: availableHeight.toFixed(2)
            });
          }
          continue;
        } else {
          // 현재 문장을 추가할 수 없어서 새 청크로 분할
          // 디버깅: 문장 분할 확인
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔄 유형#11 ${sentenceLabel} 분할:`, {
              reason: '현재 청크에 공간 부족',
              sectionHeight: sectionHeight.toFixed(2) + 'cm',
              currentHeight: currentHeight.toFixed(2) + 'cm',
              availableHeight: availableHeight.toFixed(2) + 'cm',
              overflow: (currentHeight + sectionHeight - availableHeight).toFixed(2) + 'cm',
              chunkIndex: chunkIndex + 1
            });
          }
          
          // 현재 청크를 저장하고 새 청크로 이동
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
            
            // 새 청크에 현재 문장 추가
            clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
            sectionHeight = estimateSectionHeight(clonedSection);
            
            // 새 청크에 문장을 추가할 수 있는지 확인 (여유 포함)
            if (currentHeight + sectionHeight <= effectiveAvailableHeight) {
              // 새 청크에 추가 가능: 문장 추가
              currentSections.push(clonedSection);
              currentHeight += sectionHeight;
              
              // 다음 문장들도 확인하여 가능한 한 많이 배치
              let nextSentenceIndex = sectionIndex + 1;
              while (nextSentenceIndex < contentSections.length) {
                const nextSentenceSection = contentSections[nextSentenceIndex];
                const isNextSentence = nextSentenceSection?.type === 'paragraph' && 
                  (nextSentenceSection.meta?.variant === 'sentence' || nextSentenceSection.meta?.variant === 'sentence-with-translation');
                
                if (!isNextSentence) {
                  break;
                }
                
                const clonedNextSentence = cloneSectionForChunk(nextSentenceSection, chunkIndex, currentSections.length);
                const nextSentenceHeight = estimateSectionHeight(clonedNextSentence);
                
                // 다음 문장을 추가할 수 있으면 추가 (여유 포함)
                if (currentHeight + nextSentenceHeight <= effectiveAvailableHeight) {
                  currentSections.push(clonedNextSentence);
                  currentHeight += nextSentenceHeight;
                  
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`✅ 유형#11 새 청크: 문장 ${nextSentenceIndex + 1} 연속 추가:`, {
                      sectionHeight: nextSentenceHeight.toFixed(2),
                      currentHeight: currentHeight.toFixed(2),
                      availableHeight: availableHeight.toFixed(2)
                    });
                  }
                  
                  nextSentenceIndex++;
                } else {
                  break;
                }
              }
              
              // 처리된 문장들을 건너뛰기
              if (nextSentenceIndex > sectionIndex + 1) {
                sectionIndex = nextSentenceIndex - 1; // 다음 반복에서 처리하도록 (증가될 예정이므로 -1)
              }
            } else {
              // 새 청크에도 추가할 수 없으면 강제로 추가 (높이 초과해도)
              currentSections.push(clonedSection);
              currentHeight += sectionHeight;
              
              if (process.env.NODE_ENV === 'development') {
                console.log(`⚠️ 유형#11: 새 청크에 문장 강제 추가 (높이 초과):`, {
                  sectionHeight: sectionHeight.toFixed(2),
                  currentHeight: currentHeight.toFixed(2),
                  availableHeight: availableHeight.toFixed(2)
                });
              }
            }
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔄 유형#11: 새 청크로 이동 - 문장 ${sectionIndex + 1}:`, {
                sectionHeight: sectionHeight.toFixed(2),
                currentHeight: currentHeight.toFixed(2),
                availableHeight: availableHeight.toFixed(2)
              });
            }
            
            // 유형#11 문장은 이미 처리되었으므로 continue
            continue;
          }
        }
      }
    } else if (isWork13Or14 && isInstructionSection && nextIsParagraphOrHtml) {
      // 유형#13, #14의 경우: instruction과 paragraph/html을 함께 묶어야 함
      const nextParagraphHeight = estimateSectionHeight(nextSection);
      const instructionParagraphHeight = currentHeight + sectionHeight + nextParagraphHeight;
      
      // 높이 계산에 여유를 둠 (15% 여유)
      const availableHeightWithMargin = availableHeight * 1.15;
      
      // instruction과 paragraph/html을 함께 넣을 수 있으면 함께 묶기
      if (instructionParagraphHeight <= availableHeightWithMargin) {
        // instruction 추가
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        
        // 다음 반복에서 paragraph/html 처리
        continue;
      } else {
        // instruction과 paragraph/html을 함께 넣을 수 없으면
        // instruction은 현재 청크에, paragraph/html은 다음 청크로
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        continue;
      }
    } else if (isWork13Or14 && isParagraphOrHtmlSection) {
      // 유형#13, #14의 경우: paragraph/html 섹션 처리 시 이전 섹션이 instruction인지 확인
      const prevSection = sectionIndex > 0 ? contentSections[sectionIndex - 1] : null;
      const prevIsInstruction = prevSection?.type === 'instruction';
      
      // 이전 섹션이 instruction이고, 현재 청크에 instruction이 포함되어 있으면 함께 묶기
      if (prevIsInstruction && currentSections.length > 0) {
        const lastSection = currentSections[currentSections.length - 1];
        const lastIsInstruction = lastSection?.type === 'instruction';
        
        if (lastIsInstruction) {
          // instruction과 paragraph/html을 함께 넣을 수 있는지 확인
          const instructionParagraphHeight = currentHeight + sectionHeight;
          const availableHeightWithMargin = availableHeight * 1.15;
          
          if (instructionParagraphHeight <= availableHeightWithMargin) {
            // instruction과 paragraph/html을 함께 현재 청크에 추가
            currentSections.push(clonedSection);
            currentHeight += sectionHeight;
            continue;
          }
        }
      }
      
      // instruction과 함께 묶을 수 없거나 이전 섹션이 instruction이 아니면 일반 처리
      // (아래 else 블록으로 계속)
    } else {
      // 일반적인 경우: 높이 초과 시 새 청크 시작 (유형제목은 포함하지 않음)
      // 단, 첫 청크에 title만 있는 경우(onlyTitlePresent)에는 강제로 현재 섹션을 추가
      if (
        currentSections.length > 0 &&
        currentHeight + sectionHeight > availableHeight &&
        !onlyTitlePresent
      ) {
        // 유형#07, 09, 10의 긴 본문인 경우: 본문을 현재 청크에 배치 (높이 초과해도)
        // 본문이 너무 길면 여러 청크에 걸쳐 표시되도록 함
        if (isLongPassageSection) {
          // 현재 청크에 본문 추가 (높이 초과해도 본문 전체를 추가)
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          
          // 현재 청크를 저장하고 새 청크 시작
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          
          // 본문 섹션은 이미 추가되었으므로, 다음 반복으로 넘어감
          // 다음 반복에서 options 섹션 처리
          continue;
        } else {
          // 일반적인 경우: 새 청크로 이동
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false)); // 새 청크는 제목 제외

          if (section.type === 'instruction') {
            continue;
          }

          clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
          sectionHeight = estimateSectionHeight(clonedSection);
        }
      } else if (onlyTitlePresent) {
        // 첫 청크에 title만 있는 경우: 현재 섹션을 강제로 추가 (높이 초과해도)
        // 이렇게 하면 첫 페이지에 최소한 title + instruction 또는 title + 첫 문장이 포함됨
        // 모든 유형에 적용 (빈 페이지 방지)
        if (process.env.NODE_ENV === 'development') {
          console.log(`⚠️ 유형#${normalizedItem.workTypeId}: 첫 청크에 title만 있어서 강제로 섹션 추가:`, {
            sectionType: section.type,
            sectionHeight: sectionHeight,
            totalHeight: currentHeight + sectionHeight,
            availableHeight: availableHeight
          });
        }
      }
    }

    // 일반적인 경우: 섹션을 현재 청크에 추가
    // (isLongPassageSection인 경우는 이미 위에서 처리됨)
    // (isWork11SentenceSection인 경우도 이미 위에서 처리됨)
    // onlyTitlePresent인 경우에는 무조건 추가 (빈 페이지 방지)
    if (isWork11SentenceSection) {
      // 유형#11 문장 섹션은 이미 위에서 처리되었으므로 여기서는 처리하지 않음
      // (continue로 이미 넘어갔거나, 새 청크로 이동했음)
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ 유형#11: 문장 섹션이 일반적인 경우에서 처리되고 있습니다!`, {
          sectionIndex: sectionIndex + 1,
          sectionType: section.type,
          variant: section.meta?.variant
        });
      }
    } else if (!isLongPassageSection || currentSections.length === 0 || onlyTitlePresent) {
      currentSections.push(clonedSection);
      currentHeight += sectionHeight;
    } else if (isLongPassageSection && onlyTitlePresent) {
      // 긴 본문 섹션이지만 title만 있는 경우: 강제로 추가 (빈 페이지 방지)
      currentSections.push(clonedSection);
      currentHeight += sectionHeight;
    }
  }
  
  // 모든 유형에 대해: 첫 청크에 최소한 하나의 content 섹션이 포함되도록 보장 (빈 페이지 방지)
  // 특히 유형#10, #11, #13의 빈 페이지 문제 해결
  if (chunkSectionsList.length === 0 && currentSections.length > 0) {
    // 첫 청크가 아직 추가되지 않았고, 현재 섹션에 title만 있는 경우
    const hasOnlyTitle = currentSections.length === 1 && currentSections[0]?.type === 'title';
    
    if (hasOnlyTitle && contentSections.length > 0) {
      // 첫 번째 content 섹션(instruction, paragraph, html 등)을 강제로 추가
      const firstContentSection = contentSections.find(s => 
        s.type === 'instruction' || 
        s.type === 'paragraph' || 
        s.type === 'html' ||
        s.type === 'options'
      );
      if (firstContentSection) {
        const clonedSection = cloneSectionForChunk(firstContentSection, chunkIndex, currentSections.length);
        currentSections.push(clonedSection);
        currentHeight += estimateSectionHeight(clonedSection);
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ 유형#${normalizedItem.workTypeId}: 첫 청크에 첫 섹션 강제 추가:`, {
            sectionType: firstContentSection.type,
            currentSectionsCount: currentSections.length
          });
        }
      } else if (contentSections.length > 0) {
        // content 섹션이 있지만 조건에 맞는 섹션이 없는 경우, 첫 번째 섹션을 추가
        const firstSection = contentSections[0];
        if (firstSection) {
          const clonedSection = cloneSectionForChunk(firstSection, chunkIndex, currentSections.length);
          currentSections.push(clonedSection);
          currentHeight += estimateSectionHeight(clonedSection);
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ 유형#${normalizedItem.workTypeId}: 첫 청크에 첫 번째 섹션 강제 추가 (조건 불일치):`, {
              sectionType: firstSection.type,
              currentSectionsCount: currentSections.length
            });
          }
        }
      }
    } else if (hasOnlyTitle && contentSections.length === 0) {
      // contentSections가 비어있는 경우: 정규화 단계에 문제가 있을 수 있음
      console.error(`❌ 유형#${normalizedItem.workTypeId}: contentSections가 비어있어서 빈 페이지가 생성될 수 있습니다!`, {
        workTypeId: normalizedItem.workTypeId,
        currentSections: currentSections.map(s => s.type),
        allSections: normalizedItem.sections.map(s => ({ type: s.type, key: s.key }))
      });
    }
  }
  
  // 현재 청크가 비어있지 않으면 추가 (title만 있어도 추가)
  // 하지만 title만 있는 경우는 위에서 처리했으므로, 이 경우는 최소한 하나의 content 섹션이 있어야 함
  if (currentSections.length > 0) {
    // title만 있는 경우가 아니거나, 위에서 content 섹션이 추가된 경우에만 추가
    const hasContentSection = currentSections.some(s => s.type !== 'title');
    if (hasContentSection || currentSections.length > 1) {
      chunkSectionsList.push(currentSections);
    } else {
      // title만 있는 경우: content 섹션을 다시 시도
      if (contentSections.length > 0) {
        const firstContentSection = contentSections[0];
        if (firstContentSection) {
          const clonedSection = cloneSectionForChunk(firstContentSection, chunkIndex, currentSections.length);
          currentSections.push(clonedSection);
          chunkSectionsList.push(currentSections);
          console.error(`⚠️ 유형#${normalizedItem.workTypeId}: 마지막 시도로 첫 섹션 추가:`, {
            sectionType: firstContentSection.type
          });
        }
      }
    }
  } else if (contentSections.length > 0) {
    // currentSections가 비어있지만 contentSections가 있는 경우 (이론적으로는 발생하지 않아야 함)
    // 첫 번째 content 섹션을 포함하는 새 청크 생성
    const firstContentSection = contentSections[0];
    if (firstContentSection) {
      const newChunk = startNewChunk(chunkIndex, true);
      const clonedSection = cloneSectionForChunk(firstContentSection, chunkIndex, newChunk.sections.length);
      newChunk.sections.push(clonedSection);
      chunkSectionsList.push(newChunk.sections);
      console.error(`⚠️ 유형#${normalizedItem.workTypeId}: 예상치 못한 상황 - 새 청크 강제 생성`, {
        sectionType: firstContentSection.type
      });
    }
  }
  
  // 디버깅: 유형#11의 경우 최종 청크 상태 확인
  if (process.env.NODE_ENV === 'development' && normalizedItem.workTypeId === '11') {
    console.log('🔍 유형#11 최종 청크 상태:', {
      totalChunks: chunkSectionsList.length,
      chunks: chunkSectionsList.map((chunk, idx) => ({
        chunkIndex: idx + 1,
        sectionCount: chunk.length,
        sectionTypes: chunk.map(s => s.type),
        totalHeight: chunk.reduce((sum, s) => sum + estimateSectionHeight(s), 0)
      }))
    });
  }
  
  // 패키지#02 PDF 인쇄(정답) 페이지에서 정답 섹션 제거
  // 모든 섹션 처리 후, 실제 마지막 청크에 정답 섹션 추가
  // 정답 섹션이 이미 contentSections에 포함되어 있지 않은 경우에만 추가
  // if (!hasAnswerInContent && answerSections.length > 0 && !answerSectionsAdded && chunkSectionsList.length > 0) {
  //   // 실제 마지막 청크에 정답 섹션 추가
  //   const lastChunk = chunkSectionsList[chunkSectionsList.length - 1];
  //   const lastChunkIndex = chunkSectionsList.length - 1;
  //   
  //   answerSections.forEach((answerSection) => {
  //     const clonedAnswerSection = cloneSectionForChunk(
  //       answerSection,
  //       lastChunkIndex,
  //       lastChunk.length
  //     );
  //     lastChunk.push(clonedAnswerSection);
  //     answerSectionsAdded = true;
  //   });
  // }

  const totalChunks = chunkSectionsList.length;

  return chunkSectionsList.map((sections, index) => {
    // 패키지#02 PDF 인쇄(정답) 페이지에서 정답 섹션 제거
    // 모든 청크에서 정답 섹션을 완전히 제거
    const filteredSections = sections.filter(section => {
      // 정답 섹션은 모든 청크에서 제거
      if (section.type === 'answer') {
        return false;
      }
      return true;
    });
    
    const chunkMeta = createChunkMeta(normalizedItem.chunkMeta, index, totalChunks);
    
    // 디버깅: 유형#13, #14의 경우 각 청크의 섹션 타입 확인
    if (process.env.NODE_ENV === 'development' && (normalizedItem.workTypeId === '13' || normalizedItem.workTypeId === '14')) {
      console.log(`🔍 유형#${normalizedItem.workTypeId} 청크 ${index + 1}/${totalChunks}:`, {
        sectionTypes: filteredSections.map(s => s.type),
        hasAnswerSection: filteredSections.some(s => s.type === 'answer')
      });
    }
    
    return {
      ...normalizedItem,
      sections: filteredSections,
      chunkMeta: {
        ...chunkMeta,
        // 패키지#02 PDF 인쇄(정답) 페이지에서 정답 섹션 제거
        showAnswer: false
      }
    };
  });
};

export const estimateNormalizedItemHeight = (normalizedItem: NormalizedQuizItem): number => {
  // CSS: padding: 0.5cm, margin-bottom: 0.3cm
  // 높이 계산을 보수적으로 하기 위해 약간 줄여서 계산
  const cardPadding = 0.5 * 2 * 0.95; // 카드 상하 패딩 (5% 여유)
  const cardMarginBottom = 0.3 * 0.9; // 카드 하단 마진 (10% 여유)
  const sectionsHeight = normalizedItem.sections.reduce(
    (sum, section) => sum + estimateSectionHeight(section),
    0
  );
  return sectionsHeight + cardPadding + cardMarginBottom;
};

export const distributeNormalizedItemsToPages = (
  normalizedItems: NormalizedQuizItem[]
): NormalizedQuizItem[][][] => {
  const pages: NormalizedQuizItem[][][] = [];
  const availableHeight = getAvailableColumnHeight();

  let currentPage: NormalizedQuizItem[][] = [[], []];
  let columnHeights: number[] = [0, 0];
  let lastItemColumn: number | null = null; // 이전 아이템이 배치된 컬럼 추적

  const startNewPage = () => {
    if (currentPage[0].length > 0 || currentPage[1].length > 0) {
      pages.push(currentPage);
    }
    currentPage = [[], []];
    columnHeights = [0, 0];
    lastItemColumn = null; // 새 페이지 시작 시 초기화
  };
  
  // 디버깅: 유형#11의 경우 첫 페이지 배치 전 상태 확인
  if (process.env.NODE_ENV === 'development' && normalizedItems.length > 0 && normalizedItems[0].workTypeId === '11') {
    console.log('🔍 유형#11 페이지 배치 시작:', {
      totalItems: normalizedItems.length,
      items: normalizedItems.map((item, idx) => ({
        index: idx,
        workTypeId: item.workTypeId,
        sectionCount: item.sections.length,
        sectionTypes: item.sections.map(s => s.type),
        height: estimateNormalizedItemHeight(item),
        chunkMeta: item.chunkMeta
      }))
    });
  }

  let lastWorkTypeId: string | null = null; // 이전 아이템의 workTypeId 추적
  
  normalizedItems.forEach((item, itemIndex) => {
    const itemHeight = estimateNormalizedItemHeight(item);
    const currentWorkTypeId = item.workTypeId;
    
    // 같은 유형의 연속 청크인지 확인
    const isSameTypeChunk = 
      itemIndex > 0 && 
      lastWorkTypeId === currentWorkTypeId &&
      item.chunkMeta?.isSplitChunk; // 분할된 청크인지 확인
    
    // 다른 유형이 시작되는 경우
    const isNewType = lastWorkTypeId !== null && lastWorkTypeId !== currentWorkTypeId;
    
    let targetColumn: number;
    
    if (isSameTypeChunk) {
      // 같은 유형의 연속 청크인 경우
      // 이전 청크가 오른쪽 단(1)에 있었으면 다음 페이지 왼쪽 단부터 시작
      if (lastItemColumn === 1) {
        if (columnHeights[0] + itemHeight > availableHeight || 
            (currentPage[0].length === 0 && currentPage[1].length > 0)) {
          startNewPage();
        }
        targetColumn = 0; // 항상 왼쪽 단부터 시작
      } else {
        // 이전 청크가 왼쪽 단에 있었으면 같은 단에 계속 배치 시도
        // 같은 유형의 연속 청크는 왼쪽 단에 공간이 있으면 왼쪽 단에 계속 배치
        // 높이 계산에 여유를 두어 과대평가로 인한 오른쪽 단 이동 방지
        const heightMargin = availableHeight * 0.15; // 15% 여유 (과대평가 보정)
        const leftColumnAvailableSpace = availableHeight - columnHeights[0];
        
        // 왼쪽 단에 공간이 있고, 아이템이 들어갈 수 있으면 왼쪽 단에 배치
        // 여유를 충분히 두어 실제로 들어갈 수 있는 경우를 모두 포함
        if (leftColumnAvailableSpace > 0 && columnHeights[0] + itemHeight <= availableHeight + heightMargin) {
          targetColumn = 0; // 왼쪽 단에 배치 (여유를 두고 배치)
        } else if (columnHeights[1] + itemHeight <= availableHeight + heightMargin) {
          // 왼쪽 단에 정말 안 들어가면 오른쪽 단 시도
          targetColumn = 1; // 오른쪽 단에 배치
        } else {
          // 둘 다 안 들어가면 새 페이지
          startNewPage();
          targetColumn = 0; // 새 페이지는 왼쪽 컬럼부터 시작
        }
      }
    } else if (isNewType && lastItemColumn !== null) {
      // 다른 유형이 시작되는 경우: 이전 유형의 마지막 청크가 배치된 컬럼의 다음 컬럼에 배치
      // 이전 유형이 왼쪽 단(0)에 있었으면 오른쪽 단(1)에 배치
      // 이전 유형이 오른쪽 단(1)에 있었으면 다음 페이지 왼쪽 단(0)에 배치
      if (lastItemColumn === 0) {
        // 이전 유형이 왼쪽 단에 있었으면 오른쪽 단에 배치
        // 높이 계산의 과대평가를 보정하기 위해 여유를 둠 (15% 여유)
        const heightMargin = availableHeight * 0.15; // 15% 여유 (과대평가 보정)
        const rightColumnAvailableSpace = availableHeight - columnHeights[1];
        
        // 오른쪽 단에 공간이 있고, 아이템이 들어갈 수 있으면 오른쪽 단에 배치
        // 여유를 충분히 두어 실제로 들어갈 수 있는 경우를 모두 포함
        if (rightColumnAvailableSpace > 0 && columnHeights[1] + itemHeight <= availableHeight + heightMargin) {
          targetColumn = 1; // 오른쪽 단에 배치 (여유를 두고 배치)
        } else {
          // 오른쪽 단에 정말 안 들어가면 새 페이지
          startNewPage();
          targetColumn = 0; // 새 페이지는 왼쪽 컬럼부터 시작
        }
      } else {
        // 이전 유형이 오른쪽 단에 있었으면 다음 페이지 왼쪽 단에 배치
        startNewPage();
        targetColumn = 0; // 새 페이지는 왼쪽 컬럼부터 시작
      }
    } else {
      // 첫 번째 아이템이거나 일반적인 경우: 순서대로 배치 (왼쪽 단 > 오른쪽 단 > 다음 페이지 왼쪽 단)
      // 왼쪽 단에 들어갈 수 있는지 확인
      if (columnHeights[0] + itemHeight <= availableHeight) {
        targetColumn = 0; // 왼쪽 단에 배치
      } else if (columnHeights[1] + itemHeight <= availableHeight) {
        // 왼쪽 단에 안 들어가면 오른쪽 단 시도
        targetColumn = 1; // 오른쪽 단에 배치
      } else {
        // 둘 다 안 들어가면 새 페이지
        startNewPage();
        targetColumn = 0; // 새 페이지는 왼쪽 컬럼부터 시작
      }
    }

    currentPage[targetColumn].push(item);
    columnHeights[targetColumn] += itemHeight;
    lastItemColumn = targetColumn; // 현재 아이템이 배치된 컬럼 기록
    lastWorkTypeId = currentWorkTypeId; // 현재 아이템의 workTypeId 기록
  });

  if (currentPage[0].length > 0 || currentPage[1].length > 0) {
    pages.push(currentPage);
  }
  
  // 디버깅: 유형#11의 경우 최종 페이지 상태 확인
  if (process.env.NODE_ENV === 'development' && normalizedItems.length > 0 && normalizedItems[0].workTypeId === '11') {
    console.log('🔍 유형#11 최종 페이지 상태:', {
      totalPages: pages.length,
      pages: pages.map((page, pageIdx) => ({
        pageIndex: pageIdx + 1,
        leftColumnItems: page[0].length,
        rightColumnItems: page[1].length,
        leftColumnSections: page[0].flatMap(item => item.sections.map(s => s.type)),
        rightColumnSections: page[1].flatMap(item => item.sections.map(s => s.type))
      }))
    });
  }

  return pages;
};

