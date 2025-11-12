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
  const charsPerLine = Math.floor(
    (COLUMN_CONFIG.COLUMN_WIDTH - COLUMN_CONFIG.SENTENCE_PADDING * 2) /
      COLUMN_CONFIG.CHAR_WIDTH
  );
  const lines = Math.ceil(text.length / charsPerLine);
  return lines * fontSize * COLUMN_CONFIG.LINE_HEIGHT;
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
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

export const estimateSectionHeight = (section: PrintSection): number => {
  const basePadding = 0.2;
  switch (section.type) {
    case 'title':
      return COLUMN_CONFIG.TITLE_HEIGHT + basePadding;
    case 'instruction':
      return COLUMN_CONFIG.INSTRUCTION_HEIGHT + basePadding;
    case 'paragraph':
    case 'text':
      return calculateTextHeight(section.text || '', 0.32) + basePadding;
    case 'html':
      return calculateTextHeight(htmlToPlainText(section.html), 0.32) + basePadding;
    case 'options': {
      if (!section.options || section.options.length === 0) {
        return 0.6 + basePadding;
      }
      let total = 0;
      section.options.forEach((option) => {
        const optionText = option?.text || '';
        total += calculateTextHeight(optionText, 0.3) + 0.25;
        if (option?.translation) {
          total += calculateTextHeight(option.translation, 0.28) + 0.2;
        }
      });
      return total + basePadding;
    }
    case 'table': {
      const rowCount = (section.rows?.length || 0) + (section.headers ? 1 : 0);
      return rowCount * 0.6 + 0.4;
    }
    case 'answer': {
      const answerCount = section.items?.length || 1;
      return answerCount * 0.5 + 0.4;
    }
    case 'translation':
      return calculateTextHeight(section.text || '', 0.3) + 0.4;
    case 'list': {
      const itemCount = section.items?.length || 1;
      return itemCount * 0.45 + 0.3;
    }
    case 'spacer':
      return 0.3;
    default:
      return 0.5 + basePadding;
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
  const availableHeight = getAvailableColumnHeight();
  const titleSection = normalizedItem.sections.find((section) => section.type === 'title');
  const contentSections = normalizedItem.sections.filter((section) => section.type !== 'title');

  const chunkSectionsList: PrintSection[][] = [];

  const startNewChunk = (chunkIndex: number): { sections: PrintSection[]; height: number } => {
    const sections: PrintSection[] = [];
    let height = 0;
    if (titleSection) {
      const clonedTitle = cloneSectionForChunk(titleSection, chunkIndex, sections.length);
      sections.push(clonedTitle);
      height += estimateSectionHeight(clonedTitle);
    }
    return { sections, height };
  };

  let chunkIndex = 0;
  let { sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex);

  contentSections.forEach((section) => {
    if (section.type === 'instruction' && chunkSectionsList.length > 0) {
      return;
    }

    let clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
    let sectionHeight = estimateSectionHeight(clonedSection);

    const onlyTitlePresent =
      currentSections.length === 1 && currentSections[0]?.type === 'title';

    if (
      currentSections.length > 0 &&
      currentHeight + sectionHeight > availableHeight &&
      !onlyTitlePresent
    ) {
      chunkSectionsList.push(currentSections);
      chunkIndex++;
      ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex));

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
  return normalizedItem.sections.reduce(
    (sum, section) => sum + estimateSectionHeight(section),
    0
  );
};

export const distributeNormalizedItemsToPages = (
  normalizedItems: NormalizedQuizItem[]
): NormalizedQuizItem[][][] => {
  const pages: NormalizedQuizItem[][][] = [];
  const availableHeight = getAvailableColumnHeight();

  let currentPage: NormalizedQuizItem[][] = [[], []];
  let columnHeights: number[] = [0, 0];

  const startNewPage = () => {
    if (currentPage[0].length > 0 || currentPage[1].length > 0) {
      pages.push(currentPage);
    }
    currentPage = [[], []];
    columnHeights = [0, 0];
  };

  normalizedItems.forEach((item) => {
    const itemHeight = estimateNormalizedItemHeight(item);

    let targetColumn = columnHeights[0] <= columnHeights[1] ? 0 : 1;

    if (columnHeights[targetColumn] + itemHeight > availableHeight) {
      targetColumn = targetColumn === 0 ? 1 : 0;
    }

    if (columnHeights[targetColumn] + itemHeight > availableHeight) {
      startNewPage();
      targetColumn = 0;
    }

    currentPage[targetColumn].push(item);
    columnHeights[targetColumn] += itemHeight;
  });

  if (currentPage[0].length > 0 || currentPage[1].length > 0) {
    pages.push(currentPage);
  }

  return pages;
};

