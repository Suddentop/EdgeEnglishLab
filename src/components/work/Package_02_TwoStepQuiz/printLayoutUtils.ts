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
  const charsPerLine = Math.floor(effectiveWidth / COLUMN_CONFIG.CHAR_WIDTH);
  
  // 줄 수 계산
  const lines = Math.ceil(text.length / charsPerLine);
  
  // line-height: paragraph는 기본값(약 1.2), html은 1.4
  // 실제 렌더링보다 약간 작게 계산하여 공간이 충분할 때 같은 단에 배치되도록
  const lineHeight = fontSize === 0.32 ? 1.2 : 1.4; // 8.5pt는 1.2, 9pt는 1.4
  const lineHeightMultiplier = lineHeight * 0.92; // 8% 여유 (과대평가 방지)
  
  return lines * fontSize * lineHeightMultiplier;
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
  // HTML 태그를 제거하되, <br/> 같은 줄바꿈 태그는 공백으로 변환
  let text = html
    .replace(/<br\s*\/?>/gi, '\n') // <br> 태그를 줄바꿈으로
    .replace(/<\/p>/gi, '\n') // </p> 태그를 줄바꿈으로
    .replace(/<\/div>/gi, '\n') // </div> 태그를 줄바꿈으로
    .replace(/<[^>]+>/g, ' ') // 나머지 태그는 공백으로
    .replace(/\s+/g, ' ') // 연속된 공백을 하나로
    .trim();
  return text;
};

export const estimateSectionHeight = (section: PrintSection): number => {
  const baseMargin = 0.1; // 섹션 간 마진 (과대평가 방지를 위해 줄임)
  
  switch (section.type) {
    case 'title':
      return COLUMN_CONFIG.TITLE_HEIGHT + baseMargin;
    case 'instruction':
      return COLUMN_CONFIG.INSTRUCTION_HEIGHT + baseMargin;
    case 'paragraph':
    case 'text': {
      const textHeight = calculateTextHeight(section.text || '', 0.32);
      // 본문은 마진을 최소화하여 정확한 높이 계산
      return textHeight + baseMargin;
    }
    case 'html': {
      // HTML 본문 (font-size: 8.5pt, line-height: 1.4)
      // calculateTextHeight는 line-height를 1.2로 계산하므로, 1.4로 조정
      const htmlHeight = calculateTextHeight(htmlToPlainText(section.html), 0.32) * (1.4 / 1.2) * 0.92; // 8% 여유
      // HTML 본문도 마진을 최소화
      return htmlHeight + baseMargin;
    }
    case 'options': {
      if (!section.options || section.options.length === 0) {
        return 0.35 + baseMargin;
      }
      // 옵션 컨테이너 상단 여백 (CSS: margin-top: 0.25cm)
      let total = 0.2; // 실제보다 약간 작게
      section.options.forEach((option, idx) => {
        const optionText = option?.text || '';
        // 옵션 높이 계산 (font-size: 8.5pt, line-height: 1.3)
        // calculateTextHeight는 line-height를 1.2로 계산하므로, 1.3으로 조정
        const optionHeight = calculateTextHeight(optionText, 0.3) * (1.3 / 1.2) * 0.92; // 8% 여유
        // 첫 옵션은 여백 없음, 이후 옵션만 간격 추가 (CSS: margin-bottom: 0.12cm)
        const optionSpacing = idx === 0 ? 0 : 0.08; // 실제보다 약간 작게
        total += optionHeight + optionSpacing;
        if (option?.translation) {
          // 번역 높이 (font-size: 8pt, line-height: 1.35)
          const translationHeight = calculateTextHeight(option.translation, 0.28) * (1.35 / 1.2) * 0.92;
          total += translationHeight + 0.06; // 번역 간격도 줄임
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
    case 'translation':
      return calculateTextHeight(section.text || '', 0.3) + 0.25 + baseMargin;
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
  const contentSections = normalizedItem.sections.filter((section) => section.type !== 'title');

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

  contentSections.forEach((section) => {
    // instruction은 첫 청크에만 포함
    if (section.type === 'instruction' && chunkSectionsList.length > 0) {
      return;
    }

    let clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
    let sectionHeight = estimateSectionHeight(clonedSection);

    const onlyTitlePresent =
      currentSections.length === 1 && currentSections[0]?.type === 'title';

    // 높이 초과 시 새 청크 시작 (유형제목은 포함하지 않음)
    if (
      currentSections.length > 0 &&
      currentHeight + sectionHeight > availableHeight &&
      !onlyTitlePresent
    ) {
      chunkSectionsList.push(currentSections);
      chunkIndex++;
      ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false)); // 새 청크는 제목 제외

      if (section.type === 'instruction') {
        return;
      }

      clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
      sectionHeight = estimateSectionHeight(clonedSection);
    }

    currentSections.push(clonedSection);
    currentHeight += sectionHeight;
  });

  if (currentSections.length > 0) {
    chunkSectionsList.push(currentSections);
  }

  const totalChunks = chunkSectionsList.length;

  return chunkSectionsList.map((sections, index) => ({
    ...normalizedItem,
    sections,
    chunkMeta: createChunkMeta(normalizedItem.chunkMeta, index, totalChunks)
  }));
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

  let lastWorkTypeId: string | null = null; // 이전 아이템의 workTypeId 추적
  
  normalizedItems.forEach((item, itemIndex) => {
    const itemHeight = estimateNormalizedItemHeight(item);
    const currentWorkTypeId = item.workTypeId;
    
    // 이전 아이템이 오른쪽 단(1)에 있었고, 같은 유형의 연속 청크인 경우
    const isContinuationFromRightColumn = 
      lastItemColumn === 1 && 
      itemIndex > 0 && 
      lastWorkTypeId === currentWorkTypeId &&
      item.chunkMeta?.isSplitChunk; // 분할된 청크인지 확인
    
    let targetColumn: number;
    
    if (isContinuationFromRightColumn) {
      // 오른쪽 단에서 시작한 유형의 연속 청크는 다음 페이지 왼쪽 단부터 시작
      if (columnHeights[0] + itemHeight > availableHeight || 
          (currentPage[0].length === 0 && currentPage[1].length > 0)) {
        startNewPage();
      }
      targetColumn = 0; // 항상 왼쪽 단부터 시작
    } else {
      // 일반적인 경우: 두 컬럼 중 더 짧은 쪽 선택
      targetColumn = columnHeights[0] <= columnHeights[1] ? 0 : 1;

      // 선택한 컬럼에 들어갈 수 있는지 확인
      if (columnHeights[targetColumn] + itemHeight > availableHeight) {
        // 반대 컬럼 시도
        targetColumn = targetColumn === 0 ? 1 : 0;
      }

      // 반대 컬럼에도 안 들어가면 새 페이지
      if (columnHeights[targetColumn] + itemHeight > availableHeight) {
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

  return pages;
};

