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
  // A4 가로: 21cm 높이 (정확한 페이지 높이)
  // 헤더: 1.2cm (a4-landscape-page-header height)
  // 콘텐츠 하단 패딩: 0.5cm (a4-landscape-page-content padding-bottom)
  // 실제 사용 가능한 높이: 21 - 1.2 - 0.5 = 19.3cm
  // 페이지 높이를 정확하게 계산하여 컨테이너가 페이지를 넘지 않도록 함
  const PAGE_HEIGHT = 21; // A4 가로 페이지 높이 (cm)
  const HEADER_HEIGHT = 1.2; // 헤더 높이 (cm)
  const CONTENT_BOTTOM_PADDING = 0.5; // 콘텐츠 하단 패딩 (cm)
  const totalFixedSpace = HEADER_HEIGHT + CONTENT_BOTTOM_PADDING;
  const availableHeightPerColumn = PAGE_HEIGHT - totalFixedSpace;
  return availableHeightPerColumn; // 19.3cm (정확한 계산)
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
  totalChunks: number,
  workTypeId?: string
): ChunkMeta => {
  // 유형#01의 경우: options가 첫 번째 청크에 있으므로 첫 번째 청크에서도 표시
  // 다른 유형의 경우: options는 마지막 청크에만 표시
  const shouldShowOptions = workTypeId === '01' 
    ? chunkIndex === 0  // 유형#01: 첫 번째 청크에 options 표시
    : chunkIndex === totalChunks - 1;  // 다른 유형: 마지막 청크에만 표시
  
  return {
    ...(baseMeta || {}),
    chunkIndex,
    totalChunks,
    isSplitChunk: totalChunks > 1,
    showInstruction: chunkIndex === 0,
    showOptions: shouldShowOptions,
    showAnswer: chunkIndex === totalChunks - 1,
    showTranslation: chunkIndex === totalChunks - 1
  };
};

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
      // 유형#06의 work06-info variant는 한 줄 텍스트 컨테이너
      const variant = section.meta?.variant;
      if (variant === 'work06-info') {
        // 한 줄 텍스트 컨테이너: font-size 9pt, padding 0.2cm, margin-top 0.3cm
        const textHeight = section.text ? calculateTextHeight(section.text, 0.32) * 1.25 : 0.32; // 한 줄 높이
        const padding = 0.2 * 2; // 상하 패딩
        const marginTop = 0.3; // 상단 마진
        return textHeight + padding + marginTop + baseMargin;
      }
      
      // 유형#10 인쇄(정답) 모드: "유형테스트" 텍스트 블록
      if (section.key?.includes('text-10-test-label')) {
        // 텍스트 블록: font-size 9.9pt, margin-top/bottom 0.2cm, padding 0.1cm
        const textHeight = section.text ? calculateTextHeight(section.text, 0.35) : 0.35; // 한 줄 높이
        const marginTop = 0.2; // 상단 마진
        const marginBottom = 0.2; // 하단 마진
        const padding = 0.1 * 2; // 상하 패딩
        return textHeight + marginTop + marginBottom + padding + baseMargin;
      }
      
      // 유형#11 정답 모드: 영어 문장과 한글 해석을 각각 따로 계산
      if (variant === 'sentence-with-translation') {
        const englishText = section.text || '';
        const koreanText = section.meta?.translation || '';
        const label = section.label || '';
        
        // 실제 CSS 기반 정확한 높이 계산 (정확도를 높이기 위해 여유 제거 또는 최소화)
        // .print-sentence-english: font-size: 8.5pt, line-height: 1.54 (1.4 * 1.1), margin-bottom: 0.1cm
        // calculateTextHeight는 기본적으로 line-height 1.2로 계산하므로 1.54로 조정
        // 정확도를 위해 여유를 최소화 (5% 마진만 적용)
        const englishHeight = calculateTextHeight(englishText, 0.32) * (1.54 / 1.2) * 0.95; // line-height 1.54 반영, 5% 마진
        
        // .print-sentence-korean-inline: font-size: 8pt, line-height: 1.35, margin-top: 0.1cm (또는 0.1rem)
        // calculateTextHeight는 기본적으로 line-height 1.2로 계산하므로 1.35로 조정
        // 정확도를 위해 여유를 최소화 (5% 마진만 적용)
        const koreanHeight = calculateTextHeight(koreanText, 0.28) * (1.35 / 1.2) * 0.95; // line-height 1.35 반영, 5% 마진
        
        // .print-sentence-item: margin-bottom: 0.25cm (문장 간 마진)
        // .print-sentence-english: margin-bottom: 0.1cm
        // .print-sentence-korean-inline: margin-top: 0.1cm (또는 0.1rem ≈ 0.03cm)
        const englishMarginBottom = 0.1; // 영어 문장 하단 마진
        const koreanMarginTop = 0.03; // 한글 해석 상단 마진 (0.1rem ≈ 0.03cm)
        const itemMarginBottom = 0.25; // 문장 아이템 하단 마진
        
        // 정확한 높이 계산 (여유 최소화)
        const totalHeight = englishHeight + koreanHeight + englishMarginBottom + koreanMarginTop + itemMarginBottom;
        
        // 디버깅: 유형#11 문장 높이 계산 (각 문장과 해석을 따로 계산)
        if (process.env.NODE_ENV === 'development') {
          console.log(`📏 유형#11 ${label || '문장'} 높이 계산 (영어/한글 따로):`, {
            label: label,
            englishText: englishText.substring(0, 80) + (englishText.length > 80 ? '...' : ''),
            koreanText: koreanText.substring(0, 80) + (koreanText.length > 80 ? '...' : ''),
            englishHeight: englishHeight.toFixed(3) + 'cm',
            koreanHeight: koreanHeight.toFixed(3) + 'cm',
            englishMarginBottom: englishMarginBottom.toFixed(2) + 'cm',
            koreanMarginTop: koreanMarginTop.toFixed(2) + 'cm',
            itemMarginBottom: itemMarginBottom.toFixed(2) + 'cm',
            totalHeight: totalHeight.toFixed(3) + 'cm',
            totalHeightWithBaseMargin: (totalHeight + baseMargin).toFixed(3) + 'cm'
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
      // 유형#01의 경우 높이 계산을 더 보수적으로 (과대평가 방지)
      const isWork01 = section.meta?.workTypeId === '01' || section.key?.includes('paragraph-01');
      const textHeight = calculateTextHeight(section.text || '', 0.32) * (isWork01 ? 0.85 : 0.9); // 유형#01은 15% 여유
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
      // 옵션 컨테이너 상단 여백 (CSS: margin-top: 0)
      // 유형#01의 경우 높이 계산을 더 보수적으로 (과대평가 방지)
      const isWork01 = section.meta?.workTypeId === '01' || section.key?.includes('options-01');
      // 옵션 컨테이너 패딩: CSS에서 padding: 0.25cm (상하좌우 모두 0.25cm)
      // 따라서 상하 패딩은 0.25cm * 2 = 0.5cm
      const optionsPadding = 0.25 * 2; // 상하 패딩 (0.5cm)
      let total = 0; // 옵션 텍스트 높이만 계산 (패딩은 나중에 추가)
      section.options.forEach((option, idx) => {
        const optionText = option?.text || '';
        // 옵션 높이 계산 (font-size: 8.5pt, line-height: 1.3)
        // calculateTextHeight는 line-height를 1.2로 계산하므로, 1.3으로 조정
        // 유형#01은 더 보수적으로 계산 (15% 여유)
        const optionHeight = calculateTextHeight(optionText, 0.3) * (1.3 / 1.2) * (isWork01 ? 0.85 : 0.9);
        // 첫 옵션은 여백 없음, 이후 옵션만 간격 추가 (CSS: margin-bottom: 0.12cm)
        const optionSpacing = idx === 0 ? 0 : 0.12; // 실제 CSS 값 사용
        total += optionHeight + optionSpacing;
        if (option?.translation) {
          // 번역 높이 (font-size: 8pt, line-height: 1.35)
          const translationHeight = calculateTextHeight(option.translation, 0.28) * (1.35 / 1.2) * (isWork01 ? 0.85 : 0.9);
          total += translationHeight + 0.04; // 번역 간격
        }
      });
      // 옵션 섹션의 하단 마진 (CSS: margin-bottom: 0.5cm) 포함
      // 총 높이 = 텍스트 높이 + 상하 패딩(0.5cm) + 하단 마진(0.5cm)
      const optionsTotalHeight = total + optionsPadding + 0.5 + baseMargin; // 패딩(0.5cm) + 하단 마진(0.5cm) 포함
      
      // 디버깅: 유형#01의 경우 options 섹션 높이 계산 확인
      if (process.env.NODE_ENV === 'development' && isWork01) {
        console.log('📏 유형#01 options 섹션 높이 계산:', {
          optionsCount: section.options?.length || 0,
          textHeight: total.toFixed(2) + 'cm',
          optionsPadding: optionsPadding.toFixed(2) + 'cm',
          marginBottom: '0.5cm',
          totalHeight: optionsTotalHeight.toFixed(2) + 'cm',
          baseMargin: baseMargin.toFixed(2) + 'cm'
        });
      }
      
      return optionsTotalHeight;
    }
    case 'table': {
      // 테이블 높이 계산 (유형#02의 경우 더 정확하게 계산)
      const rowCount = (section.rows?.length || 0) + (section.headers ? 1 : 0);
      // 테이블 행 높이: font-size 8pt, line-height 기본값(약 1.2), padding 0.1cm (th/td 상하)
      // 각 행의 상하 패딩(0.1cm * 2)과 텍스트 높이를 고려한 행 높이 계산
      // 행 높이를 보수적으로 계산하여 과대평가 방지 (유형#02의 경우 10% 여유 추가)
      const isWork02 = section.meta?.workTypeId === '02' || section.key?.includes('table-02');
      // 행 높이 계산: 행당 기본 높이 + 상하 패딩 (0.1cm * 2)
      // 유형#02는 행 높이를 10% 감소하여 과대평가 방지
      const baseRowHeight = isWork02 ? 0.45 * 0.9 : 0.45; // 유형#02는 10% 감소
      // 각 행은 상하 패딩(0.1cm * 2)이 포함되어 있으므로, 행 높이 계산 시 패딩은 이미 고려됨
      // 테이블 자체의 추가 여백을 줄임 (과대평가 방지)
      const tableExtraMargin = isWork02 ? 0.05 : 0.25; // 유형#02는 0.05cm만 (과대평가 방지)
      return rowCount * baseRowHeight + tableExtraMargin + baseMargin;
    }
    case 'answer': {
      const answerCount = section.items?.length || 1;
      return answerCount * 0.35 + 0.25 + baseMargin; // 정답 높이도 줄임
    }
    case 'translation': {
      // 한글해석 높이 계산 (font-size: 8pt, line-height: 1.35)
      // calculateTextHeight는 line-height를 1.2로 계산하므로, 1.35로 조정
      // 유형#01의 경우 높이 계산을 더 보수적으로 (과대평가 방지)
      const isWork01 = section.meta?.workTypeId === '01' || section.key?.includes('translation-01');
      const translationHeight = calculateTextHeight(section.text || '', 0.28) * (1.35 / 1.2) * (isWork01 ? 0.85 : 0.92);
      // translation 섹션의 상단 마진 (CSS: margin-top: 0.3cm) 포함
      // 여백을 정확히 반영하여 겹침 방지
      return translationHeight + 0.3 + baseMargin; // 상단 마진(0.3cm) 포함
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
  normalizedItem: NormalizedQuizItem,
  options?: { isPackage02?: boolean }
): NormalizedQuizItem[] => {
  // 단 높이 기준으로 계산: 영어단락 + 4지선다 + 한글해석이 하나의 단에 배치되어야 함
  // 유형#01의 경우: paragraph + answer + options + translation을 하나의 단에 배치
  // 단 높이 전체를 사용 가능한 높이로 계산 (카드 패딩/마진은 각 섹션 높이 계산에 포함됨)
  const PAGE_HEIGHT = 21; // A4 가로 페이지 높이 (cm)
  const HEADER_HEIGHT = 1.2; // 헤더 높이 (cm)
  const CONTENT_BOTTOM_PADDING = 0.5; // 콘텐츠 하단 패딩 (cm)
  const availableColumnHeight = PAGE_HEIGHT - HEADER_HEIGHT - CONTENT_BOTTOM_PADDING; // 19.3cm
  
  // 유형#01의 경우: 카드 패딩/마진을 빼지 않고 단 높이 전체를 기준으로 계산
  // (각 섹션의 높이 계산에 이미 마진/패딩이 포함되어 있음)
  const isWork01 = normalizedItem.workTypeId === '01';
  const titleSection = normalizedItem.sections.find((section) => section.type === 'title');
  const titleHeight = titleSection ? estimateSectionHeight(titleSection) : 0;
  
  // 유형#01: 단 높이에서 title 높이만 제외 (title은 각 청크에 포함됨)
  // 다른 유형: 카드 패딩/마진도 제외
  const cardPadding = 0.5 * 2; // 카드 상하 패딩 (실제 값)
  const cardMarginBottom = 0.3; // 카드 하단 마진 (실제 값)
  const availableHeight = isWork01 
    ? availableColumnHeight - titleHeight // 단 높이에서 title 높이만 제외
    : availableColumnHeight - cardPadding - cardMarginBottom; // 카드 패딩/마진 제외
  // 정답 섹션은 마지막 청크에만 포함되도록 분리 (정답 섹션은 원본에서 제거하고 나중에 추가)
  // 유형#13, #14의 경우 정답 섹션을 명시적으로 분리
  // 유형#01의 경우 정답 섹션을 contentSections에 포함 (options 다음에 나타나도록)
  const answerSections = normalizedItem.sections.filter((section) => section.type === 'answer');
  // 유형#01의 경우 정답 섹션을 contentSections에 포함 (나중에 translation 이후의 정답 섹션만 제거)
  const contentSections = normalizedItem.sections.filter(
    (section) => section.type !== 'title' && (isWork01 || section.type !== 'answer')
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
  
  // 디버깅: 유형#01의 경우 섹션 생성 확인 (4지선다 확인)
  if (process.env.NODE_ENV === 'development' && normalizedItem.workTypeId === '01') {
    console.log(`🔍 유형#01 섹션 확인:`, {
      workTypeId: normalizedItem.workTypeId,
      totalSections: normalizedItem.sections.length,
      allSectionTypes: normalizedItem.sections.map(s => s.type),
      contentSectionsCount: contentSections.length,
      contentSectionTypes: contentSections.map(s => s.type),
      hasOptions: contentSections.some(s => s.type === 'options'),
      optionsIndex: contentSections.findIndex(s => s.type === 'options'),
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
    const isTableSection = section.type === 'table';
    const isInstructionSection = section.type === 'instruction';
    const nextIsOptions = nextSection?.type === 'options';
    const nextIsTable = nextSection?.type === 'table';
    const nextIsTranslation = nextSection?.type === 'translation';
    const nextIsAnswer = nextSection?.type === 'answer';
    const nextNextIsTranslation = nextNextSection?.type === 'translation';
    const nextNextNextIsTranslation = contentSections[sectionIndex + 3]?.type === 'translation';
    const nextIsParagraphOrHtml = nextSection?.type === 'paragraph' || nextSection?.type === 'html';
    
    // 유형#13, #14의 경우: instruction 다음에 오는 paragraph/html과 함께 묶어야 함
    const isWork13Or14 = normalizedItem.workTypeId === '13' || normalizedItem.workTypeId === '14';
    
    // 유형#05, 07, 09, 10의 긴 본문 섹션인지 확인 (페이지 분할 로직에서 사용)
    const isLongPassageType = normalizedItem.workTypeId === '05' || normalizedItem.workTypeId === '07' || normalizedItem.workTypeId === '09' || normalizedItem.workTypeId === '10';
    const isLongPassageSection = isLongPassageType && (section.type === 'paragraph' || section.type === 'html');
    
    // 유형#05, #07, #09, #10의 경우 본문과 options를 함께 묶어야 함
    // 유형#05는 paragraph 타입으로 본문을 추가
    // 유형#07은 html 타입으로 본문을 추가하므로 html 타입도 체크
    const isWork05Passage = normalizedItem.workTypeId === '05' && section.type === 'paragraph';
    const isWork07Passage = normalizedItem.workTypeId === '07' && (section.type === 'paragraph' || section.type === 'html');
    const isWork09Passage = normalizedItem.workTypeId === '09' && section.type === 'html';
    const isWork10Passage = normalizedItem.workTypeId === '10' && section.type === 'html';
    const isWork05Options = normalizedItem.workTypeId === '05' && section.type === 'options';
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
    // 유형#01의 경우: paragraph 다음에 answer, options, translation이 올 수 있음
    let totalHeightForCheck = sectionHeight;
    const isWork01 = normalizedItem.workTypeId === '01';
    const isWork01Paragraph = isWork01 && isParagraphOrHtmlSection;
    // nextIsAnswer는 이미 위에서 선언됨 (601번째 줄)
    const nextNextIsOptions = nextNextSection?.type === 'options';
    // nextNextNextIsTranslation은 이미 위에서 선언됨 (591번째 줄)
    
    // 디버깅: 유형#01의 섹션 순서 확인
    if (process.env.NODE_ENV === 'development' && isWork01 && isParagraphOrHtmlSection) {
      console.log('🔍 유형#01 paragraph 섹션 확인:', {
        sectionIndex: sectionIndex,
        sectionType: section.type,
        nextSectionType: nextSection?.type,
        nextNextSectionType: nextNextSection?.type,
        nextNextNextSectionType: contentSections[sectionIndex + 3]?.type,
        isWork01Paragraph: isWork01Paragraph,
        nextIsAnswer: nextIsAnswer,
        nextNextIsOptions: nextNextIsOptions,
        nextNextNextIsTranslation: nextNextNextIsTranslation,
        willProcess: isWork01Paragraph && nextIsAnswer && nextNextIsOptions && nextNextNextIsTranslation
      });
    }
    
    // 유형#06의 경우: paragraph(numbered-passage) + answer를 먼저 체크 (다른 조건들보다 우선)
    const isWork06 = normalizedItem.workTypeId === '06';
    const isWork06NumberedPassage = isWork06 && section.type === 'paragraph' && section.meta?.variant === 'numbered-passage';
    
    if (isWork01Paragraph && nextIsAnswer && nextNextIsOptions && nextNextNextIsTranslation) {
      // 유형#01: paragraph + answer + options + translation
      const answerHeight = estimateSectionHeight(nextSection);
      const optionsHeight = estimateSectionHeight(nextNextSection);
      const translationHeight = estimateSectionHeight(contentSections[sectionIndex + 3]);
      totalHeightForCheck = sectionHeight + answerHeight + optionsHeight + translationHeight;
    } else if (isWork06NumberedPassage && nextIsAnswer) {
      // 유형#06: paragraph(numbered-passage) + answer (높이 계산에 포함)
      const answerHeight = estimateSectionHeight(nextSection);
      totalHeightForCheck = sectionHeight + answerHeight + 0.4; // answer margin-top 포함
    } else if (isParagraphOrHtmlSection && nextIsOptions && nextNextIsTranslation && !isWork05Passage && !isWork10Passage) {
      // 유형#05, #10은 이미 특별 처리되므로 제외
      const optionsHeight = estimateSectionHeight(nextSection);
      const translationHeight = estimateSectionHeight(nextNextSection);
      totalHeightForCheck = sectionHeight + optionsHeight + translationHeight;
    } else if (isParagraphOrHtmlSection && nextIsTable && nextNextIsTranslation) {
      // paragraph/html 다음에 table과 translation이 오는 경우 (유형#02 등)
      const tableHeight = estimateSectionHeight(nextSection);
      const translationHeight = estimateSectionHeight(nextNextSection);
      totalHeightForCheck = sectionHeight + tableHeight + translationHeight;
    } else if (isParagraphOrHtmlSection && nextIsTranslation && !nextIsOptions && !nextIsTable) {
      // paragraph/html 다음에 translation이 바로 오는 경우 (유형#13, #14 등)
      const translationHeight = estimateSectionHeight(nextSection);
      totalHeightForCheck = sectionHeight + translationHeight;
    } else if (isOptionsSection && nextIsTranslation) {
      // options 다음에 translation이 오는 경우
      const translationHeight = estimateSectionHeight(nextSection);
      totalHeightForCheck = sectionHeight + translationHeight;
    } else if (isTableSection && nextIsTranslation) {
      // table 다음에 translation이 오는 경우 (유형#02 등)
      const translationHeight = estimateSectionHeight(nextSection);
      totalHeightForCheck = sectionHeight + translationHeight;
    }

    // 유형#06의 경우: paragraph(numbered-passage) + answer를 먼저 처리 (유형#01보다 우선)
    // 핵심 원칙: paragraph 다음에 answer가 오면 함께 묶어서 처리하고, 단 높이를 넘으면 다음 단으로 이동
    if (isWork06NumberedPassage && nextIsAnswer) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 유형#06 특별 처리 실행:', {
          sectionIndex,
          sectionType: section.type,
          sectionVariant: section.meta?.variant,
          nextSectionType: nextSection?.type,
          nextIsAnswer: true,
          currentSectionsCount: currentSections.length
        });
      }
      const answerSection = nextSection;
      
      // 각 섹션의 높이 계산
      const answerHeight = estimateSectionHeight(answerSection);
      
      // 여백 계산 (CSS에서 실제 사용되는 여백)
      // paragraph(numbered-passage): margin-bottom 없음 (기본값 0)
      // answer: margin-top: 0.4cm (.print-answer-section CSS)
      const marginBetweenParagraphAndAnswer = 0.4; // answer의 margin-top(0.4cm)
      
      // 현재 높이에서 시작
      let accumulatedHeight = currentHeight;
      
      // 1. Paragraph(numbered-passage) 추가 (이미 계산됨)
      accumulatedHeight += sectionHeight;
      const heightAfterParagraph = accumulatedHeight;
      
      // 2. Answer 추가 가능한지 체크
      const heightAfterAnswer = accumulatedHeight + answerHeight + marginBetweenParagraphAndAnswer;
      const canAddAnswer = heightAfterAnswer <= availableHeight;
      
      // 디버깅: 유형#06 순차적 높이 체크
      if (process.env.NODE_ENV === 'development') {
        console.log('📏 유형#06 순차적 높이 체크:', {
          currentHeight: currentHeight.toFixed(2) + 'cm',
          paragraphHeight: sectionHeight.toFixed(2) + 'cm',
          answerHeight: answerHeight.toFixed(2) + 'cm',
          heightAfterParagraph: heightAfterParagraph.toFixed(2) + 'cm',
          heightAfterAnswer: heightAfterAnswer.toFixed(2) + 'cm',
          availableHeight: availableHeight.toFixed(2) + 'cm',
          canAddAnswer: canAddAnswer
        });
      }
      
      // 순차적으로 요소 추가
      // Paragraph(numbered-passage)는 무조건 추가
      currentSections.push(clonedSection);
      currentHeight = heightAfterParagraph;
      
      // Answer 추가 (가능한 경우)
      if (canAddAnswer) {
        // 같은 단에 추가 가능
        const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
        currentSections.push(clonedAnswerSection);
        currentHeight = heightAfterAnswer;
        
        // answer 섹션을 건너뛰기 (1개)
        sectionIndex += 1;
        continue;
      } else {
        // Answer는 다음 단으로 이동
        // 현재 청크 저장하고 새 청크 시작
        if (currentSections.length > 0) {
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
        }
        
        // Answer를 새 청크에 추가
        const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
        currentSections.push(clonedAnswerSection);
        currentHeight = estimateSectionHeight(clonedAnswerSection);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ 유형#06: answer를 다음 단으로 이동', {
            previousChunkIndex: chunkIndex - 1,
            newChunkIndex: chunkIndex
          });
        }
        
        // answer 섹션을 건너뛰기 (1개)
        sectionIndex += 1;
        continue;
      }
    }
    
    // 유형#01의 경우: paragraph + answer + options + translation을 순차적으로 처리
    // 핵심 원칙: 각 요소를 순차적으로 추가하면서 높이를 체크하고, 단 높이를 넘으면 다음 단으로 이동
    if (isWork01Paragraph && nextIsAnswer && nextNextIsOptions && nextNextNextIsTranslation) {
      const answerSection = nextSection;
      const optionsSection = nextNextSection;
      const translationSection = contentSections[sectionIndex + 3];
      
      // 각 섹션의 높이 계산
      const answerHeight = estimateSectionHeight(answerSection);
      const optionsHeight = estimateSectionHeight(optionsSection);
      const translationHeight = estimateSectionHeight(translationSection);
      
      // 여백 계산 (CSS에서 실제 사용되는 여백)
      const marginBetweenParagraphAndOptions = 0.3; // 마지막 paragraph의 margin-bottom
      const marginBetweenOptionsAndTranslation = 0.8; // options의 margin-bottom(0.5cm) + translation의 margin-top(0.3cm)
      
      // 현재 높이에서 시작
      let accumulatedHeight = currentHeight;
      
      // 1. Paragraph 추가 (이미 계산됨)
      accumulatedHeight += sectionHeight;
      const heightAfterParagraph = accumulatedHeight;
      
      // 2. Answer 추가 가능한지 체크
      const heightAfterAnswer = accumulatedHeight + answerHeight;
      const canAddAnswer = heightAfterAnswer <= availableHeight;
      
      // 3. Options 추가 가능한지 체크 (answer 포함 여백)
      const heightAfterOptions = heightAfterAnswer + optionsHeight + marginBetweenParagraphAndOptions;
      const canAddOptions = heightAfterOptions <= availableHeight;
      
      // 4. Translation 추가 가능한지 체크 (options 포함 여백)
      const heightAfterTranslation = heightAfterOptions + translationHeight + marginBetweenOptionsAndTranslation;
      const canAddTranslation = heightAfterTranslation <= availableHeight;
      
      // 디버깅: 유형#01 순차적 높이 체크
      if (process.env.NODE_ENV === 'development') {
        console.log('📏 유형#01 순차적 높이 체크:', {
          currentHeight: currentHeight.toFixed(2) + 'cm',
          paragraphHeight: sectionHeight.toFixed(2) + 'cm',
          answerHeight: answerHeight.toFixed(2) + 'cm',
          optionsHeight: optionsHeight.toFixed(2) + 'cm',
          translationHeight: translationHeight.toFixed(2) + 'cm',
          heightAfterParagraph: heightAfterParagraph.toFixed(2) + 'cm',
          heightAfterAnswer: heightAfterAnswer.toFixed(2) + 'cm',
          heightAfterOptions: heightAfterOptions.toFixed(2) + 'cm',
          heightAfterTranslation: heightAfterTranslation.toFixed(2) + 'cm',
          availableHeight: availableHeight.toFixed(2) + 'cm',
          canAddAnswer: canAddAnswer,
          canAddOptions: canAddOptions,
          canAddTranslation: canAddTranslation
        });
      }
      
      // 순차적으로 요소 추가
      // Paragraph는 무조건 추가
      currentSections.push(clonedSection);
      currentHeight = heightAfterParagraph;
      
      // Answer 추가 (가능한 경우)
      if (canAddAnswer) {
        const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
        currentSections.push(clonedAnswerSection);
        currentHeight = heightAfterAnswer;
        
        // Options 추가 (가능한 경우)
        if (canAddOptions) {
          const clonedOptionsSection = cloneSectionForChunk(optionsSection, chunkIndex, currentSections.length);
          currentSections.push(clonedOptionsSection);
          currentHeight = heightAfterOptions;
          
          // Translation 추가 가능한지 체크
          if (canAddTranslation) {
            // 모두 같은 단에 추가 가능
            const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
            currentSections.push(clonedTranslationSection);
            currentHeight = heightAfterTranslation;
            
            // 모든 섹션을 건너뛰기 (3개)
            sectionIndex += 3;
            continue;
          } else {
            // Translation은 다음 단으로 이동
            // 현재 청크 저장하고 새 청크 시작
            if (currentSections.length > 0) {
              chunkSectionsList.push(currentSections);
              chunkIndex++;
              ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
            }
            
            // Translation을 새 청크에 추가
            const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
            currentSections.push(clonedTranslationSection);
            currentHeight = estimateSectionHeight(clonedTranslationSection);
            
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ 유형#01: translation을 다음 단으로 이동 (options까지 포함)', {
                previousChunkIndex: chunkIndex - 1,
                newChunkIndex: chunkIndex,
                translationHeight: translationHeight.toFixed(2) + 'cm'
              });
            }
            
            sectionIndex += 3;
            continue;
          }
        } else {
          // Options는 다음 단으로 이동 (Answer까지 포함)
          // 현재 청크 저장하고 새 청크 시작
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          }
          
          // Options와 Translation을 새 청크에 추가
          const clonedOptionsSection = cloneSectionForChunk(optionsSection, chunkIndex, currentSections.length);
          currentSections.push(clonedOptionsSection);
          currentHeight += optionsHeight;
          
          // Translation도 같은 청크에 추가 가능한지 체크
          const translationHeightWithMargin = translationHeight + marginBetweenOptionsAndTranslation;
          if (currentHeight + translationHeightWithMargin <= availableHeight) {
            const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
            currentSections.push(clonedTranslationSection);
            currentHeight += translationHeightWithMargin;
          } else {
            // Translation은 또 다음 청크로
            if (currentSections.length > 0) {
              chunkSectionsList.push(currentSections);
              chunkIndex++;
              ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
            }
            const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
            currentSections.push(clonedTranslationSection);
            currentHeight = estimateSectionHeight(clonedTranslationSection);
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ 유형#01: options를 다음 단으로 이동', {
              previousChunkIndex: chunkIndex - 1,
              newChunkIndex: chunkIndex
            });
          }
          
          sectionIndex += 3;
          continue;
        }
      } else {
        // Answer도 다음 단으로 이동 (Paragraph만 현재 단에)
        // 현재 청크 저장하고 새 청크 시작
        if (currentSections.length > 0) {
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
        }
        
        // Answer, Options, Translation을 순차적으로 새 청크에 추가
        const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
        currentSections.push(clonedAnswerSection);
        currentHeight += answerHeight;
        
        const clonedOptionsSection = cloneSectionForChunk(optionsSection, chunkIndex, currentSections.length);
        currentSections.push(clonedOptionsSection);
        currentHeight += optionsHeight + marginBetweenParagraphAndOptions;
        
        // Translation 추가 가능한지 체크
        const translationHeightWithMargin = translationHeight + marginBetweenOptionsAndTranslation;
        if (currentHeight + translationHeightWithMargin <= availableHeight) {
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight += translationHeightWithMargin;
        } else {
          // Translation은 또 다음 청크로
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          }
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight = estimateSectionHeight(clonedTranslationSection);
        }
        
        console.log('✅ 유형#01: answer를 다음 단으로 이동', {
          previousChunkIndex: chunkIndex - 1,
          newChunkIndex: chunkIndex
        });
        
        sectionIndex += 3;
        continue;
      }
      // 4. paragraph도 들어갈 수 없으면 모두 다음 청크로 이동
      // 단, onlyTitlePresent인 경우에는 강제로 현재 청크에 추가 (빈 페이지 방지)
      if (onlyTitlePresent) {
        // 첫 청크에 title만 있는 경우: paragraph를 강제로 추가 (높이 초과해도)
        currentSections.push(clonedSection);
        currentHeight += sectionHeight;
        continue;
      }
      // paragraph를 다음 청크로 이동
      if (currentSections.length > 0) {
        chunkSectionsList.push(currentSections);
        chunkIndex++;
        ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
        
        clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
        sectionHeight = estimateSectionHeight(clonedSection);
        continue;
      }
    }
    
    // 유형#02의 경우: html + table + translation을 순차적으로 처리
    // 핵심 원칙: 각 요소를 순차적으로 추가하면서 높이를 체크하고, 단 높이를 넘으면 다음 단으로 이동
    const isWork02 = normalizedItem.workTypeId === '02';
    const isWork02Html = isWork02 && section.type === 'html';
    if (isWork02Html && nextIsTable && nextNextIsTranslation) {
      const tableSection = nextSection;
      const translationSection = nextNextSection;
      
      // 각 섹션의 높이 계산
      const tableHeight = estimateSectionHeight(tableSection);
      const translationHeight = estimateSectionHeight(translationSection);
      
      // 여백 계산 (CSS에서 실제 사용되는 여백)
      // HTML 본문: margin-bottom: 0.25cm (.print-passage CSS)
      // 테이블: margin-top: 0.4cm (.print-replacements-table CSS - 이제 table 요소 자체)
      // Translation: margin-top: 0.3cm (.print-translation-section CSS)
      // 컨테이너 div가 제거되어 테이블이 직접 배치됨
      const marginBetweenHtmlAndTable = 0.25 + 0.4; // HTML margin-bottom(0.25cm) + 테이블 margin-top(0.4cm) = 0.65cm
      const marginBetweenTableAndTranslation = 0.3; // translation margin-top(0.3cm)만 (테이블 margin-bottom 없음)
      
      // 현재 높이에서 시작
      let accumulatedHeight = currentHeight;
      
      // 1. HTML 본문 추가 (이미 계산됨)
      accumulatedHeight += sectionHeight;
      const heightAfterHtml = accumulatedHeight;
      
      // 2. Table 추가 가능한지 체크
      const heightAfterTable = accumulatedHeight + tableHeight + marginBetweenHtmlAndTable;
      const canAddTable = heightAfterTable <= availableHeight;
      
      // 3. Translation 추가 가능한지 체크 (table 포함 여백)
      const heightAfterTranslation = heightAfterTable + translationHeight + marginBetweenTableAndTranslation;
      const canAddTranslation = heightAfterTranslation <= availableHeight;
      
      // 디버깅: 유형#02 순차적 높이 체크
      if (process.env.NODE_ENV === 'development') {
        console.log('📏 유형#02 순차적 높이 체크:', {
          currentHeight: currentHeight.toFixed(2) + 'cm',
          htmlHeight: sectionHeight.toFixed(2) + 'cm',
          tableHeight: tableHeight.toFixed(2) + 'cm',
          translationHeight: translationHeight.toFixed(2) + 'cm',
          heightAfterHtml: heightAfterHtml.toFixed(2) + 'cm',
          heightAfterTable: heightAfterTable.toFixed(2) + 'cm',
          heightAfterTranslation: heightAfterTranslation.toFixed(2) + 'cm',
          availableHeight: availableHeight.toFixed(2) + 'cm',
          canAddTable: canAddTable,
          canAddTranslation: canAddTranslation
        });
      }
      
      // 순차적으로 요소 추가
      // HTML 본문은 무조건 추가
      currentSections.push(clonedSection);
      currentHeight = heightAfterHtml;
      
      // Table 추가 (가능한 경우)
      if (canAddTable) {
        const clonedTableSection = cloneSectionForChunk(tableSection, chunkIndex, currentSections.length);
        currentSections.push(clonedTableSection);
        currentHeight = heightAfterTable;
        
        // Translation 추가 가능한지 체크
        if (canAddTranslation) {
          // 모두 같은 단에 추가 가능
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight = heightAfterTranslation;
          
          // table과 translation 섹션을 건너뛰기 (2개)
          sectionIndex += 2;
          continue;
        } else {
          // Translation은 다음 단으로 이동
          // 현재 청크 저장하고 새 청크 시작
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          }
          
          // Translation을 새 청크에 추가
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight = estimateSectionHeight(clonedTranslationSection);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ 유형#02: translation을 다음 단으로 이동 (table까지 포함)', {
              previousChunkIndex: chunkIndex - 1,
              newChunkIndex: chunkIndex,
              translationHeight: translationHeight.toFixed(2) + 'cm'
            });
          }
          
          sectionIndex += 2;
          continue;
        }
      } else {
        // Table도 다음 단으로 이동 (HTML 본문만 현재 단에)
        // 현재 청크 저장하고 새 청크 시작
        if (currentSections.length > 0) {
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
        }
        
        // Table과 Translation을 순차적으로 새 청크에 추가
        // 새 청크에서는 HTML 본문이 없으므로 테이블의 margin-top만 필요 (테이블 0.4cm, 컨테이너 제거됨)
        const tableMarginTop = 0.4; // 테이블 margin-top (컨테이너 제거됨)
        const clonedTableSection = cloneSectionForChunk(tableSection, chunkIndex, currentSections.length);
        currentSections.push(clonedTableSection);
        currentHeight += tableHeight + tableMarginTop;
        
        // Translation 추가 가능한지 체크
        const translationHeightWithMargin = translationHeight + marginBetweenTableAndTranslation;
        if (currentHeight + translationHeightWithMargin <= availableHeight) {
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight += translationHeightWithMargin;
        } else {
          // Translation은 또 다음 청크로
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          }
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight = estimateSectionHeight(clonedTranslationSection);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ 유형#02: table을 다음 단으로 이동', {
            previousChunkIndex: chunkIndex - 1,
            newChunkIndex: chunkIndex
          });
        }
        
        sectionIndex += 2;
        continue;
      }
    }
    
    // 유형#05의 경우: paragraph + options + translation을 순차적으로 처리
    // 핵심 원칙: 각 요소를 순차적으로 추가하면서 높이를 체크하고, 단 높이를 넘으면 다음 단으로 이동
    const isWork05 = normalizedItem.workTypeId === '05';
    const isWork05Paragraph = isWork05 && section.type === 'paragraph';
    const nextIsOptionsForWork05 = isWork05 && nextSection?.type === 'options';
    const nextNextIsTranslationForWork05 = isWork05 && nextNextSection?.type === 'translation';
    if (isWork05Paragraph && nextIsOptionsForWork05 && nextNextIsTranslationForWork05) {
      const optionsSection = nextSection;
      const translationSection = nextNextSection;
      
      // 각 섹션의 높이 계산
      const optionsHeight = estimateSectionHeight(optionsSection);
      const translationHeight = estimateSectionHeight(translationSection);
      
      // 여백 계산 (CSS에서 실제 사용되는 여백)
      // Paragraph 본문: margin-bottom: 0.25cm (.print-paragraph-item CSS)
      // Options: margin-top: 0 (없음), margin-bottom: 0.5cm (.print-options CSS)
      // Translation: margin-top: 0.3cm (.print-translation-section CSS)
      const marginBetweenParagraphAndOptions = 0.25; // Paragraph margin-bottom(0.25cm)
      const marginBetweenOptionsAndTranslation = 0.5 + 0.3; // Options margin-bottom(0.5cm) + translation margin-top(0.3cm) = 0.8cm
      
      // 현재 높이에서 시작
      let accumulatedHeight = currentHeight;
      
      // 1. Paragraph 본문 추가 (이미 계산됨)
      accumulatedHeight += sectionHeight;
      const heightAfterParagraph = accumulatedHeight;
      
      // 2. Options 추가 가능한지 체크
      const heightAfterOptions = accumulatedHeight + optionsHeight + marginBetweenParagraphAndOptions;
      const canAddOptions = heightAfterOptions <= availableHeight;
      
      // 3. Translation 추가 가능한지 체크 (options 포함 여백)
      const heightAfterTranslation = heightAfterOptions + translationHeight + marginBetweenOptionsAndTranslation;
      const canAddTranslation = heightAfterTranslation <= availableHeight;
      
      // 디버깅: 유형#05 순차적 높이 체크
      if (process.env.NODE_ENV === 'development') {
        console.log('📏 유형#05 순차적 높이 체크:', {
          currentHeight: currentHeight.toFixed(2) + 'cm',
          paragraphHeight: sectionHeight.toFixed(2) + 'cm',
          optionsHeight: optionsHeight.toFixed(2) + 'cm',
          translationHeight: translationHeight.toFixed(2) + 'cm',
          heightAfterParagraph: heightAfterParagraph.toFixed(2) + 'cm',
          heightAfterOptions: heightAfterOptions.toFixed(2) + 'cm',
          heightAfterTranslation: heightAfterTranslation.toFixed(2) + 'cm',
          availableHeight: availableHeight.toFixed(2) + 'cm',
          canAddOptions: canAddOptions,
          canAddTranslation: canAddTranslation
        });
      }
      
      // 순차적으로 요소 추가
      // Paragraph 본문은 무조건 추가
      currentSections.push(clonedSection);
      currentHeight = heightAfterParagraph;
      
      // Options 추가 (가능한 경우)
      if (canAddOptions) {
        const clonedOptionsSection = cloneSectionForChunk(optionsSection, chunkIndex, currentSections.length);
        currentSections.push(clonedOptionsSection);
        currentHeight = heightAfterOptions;
        
        // Translation 추가 가능한지 체크
        if (canAddTranslation) {
          // 모두 같은 단에 추가 가능
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight = heightAfterTranslation;
          
          // options와 translation 섹션을 건너뛰기 (2개)
          sectionIndex += 2;
          continue;
        } else {
          // Translation은 다음 단으로 이동
          // 현재 청크 저장하고 새 청크 시작
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          }
          
          // Translation을 새 청크에 추가
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight = estimateSectionHeight(clonedTranslationSection);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ 유형#05: translation을 다음 단으로 이동 (options까지 포함)', {
              previousChunkIndex: chunkIndex - 1,
              newChunkIndex: chunkIndex,
              translationHeight: translationHeight.toFixed(2) + 'cm'
            });
          }
          
          sectionIndex += 2;
          continue;
        }
      } else {
        // Options도 다음 단으로 이동 (Paragraph 본문만 현재 단에)
        // 현재 청크 저장하고 새 청크 시작
        if (currentSections.length > 0) {
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
        }
        
        // Options와 Translation을 순차적으로 새 청크에 추가
        const optionsMarginTop = 0; // Options margin-top 없음
        const clonedOptionsSection = cloneSectionForChunk(optionsSection, chunkIndex, currentSections.length);
        currentSections.push(clonedOptionsSection);
        currentHeight += optionsHeight + optionsMarginTop;
        
        // Translation 추가 가능한지 체크
        const translationHeightWithMargin = translationHeight + marginBetweenOptionsAndTranslation;
        if (currentHeight + translationHeightWithMargin <= availableHeight) {
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight += translationHeightWithMargin;
        } else {
          // Translation은 또 다음 청크로
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          }
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight = estimateSectionHeight(clonedTranslationSection);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ 유형#05: options를 다음 단으로 이동', {
            previousChunkIndex: chunkIndex - 1,
            newChunkIndex: chunkIndex
          });
        }
        
        sectionIndex += 2;
        continue;
      }
    }
    
    // 유형#10의 경우: html + options + (text + answer)를 순차적으로 처리
    // 핵심 원칙: 각 요소를 순차적으로 추가하면서 높이를 체크하고, 단 높이를 넘으면 다음 단으로 이동
    const isWork10 = normalizedItem.workTypeId === '10';
    const isWork10Html = isWork10 && section.type === 'html';
    const nextIsOptionsForWork10 = isWork10 && nextSection?.type === 'options';
    const nextNextIsTextForWork10 = isWork10 && nextNextSection?.type === 'text' && nextNextSection?.key?.includes('text-10');
    const nextNextNextIsAnswerForWork10 = isWork10 && contentSections[sectionIndex + 3]?.type === 'answer';
    // 유형#10의 경우: html + options + (text + answer) 또는 html + options만 있는 경우
    if (isWork10Html && nextIsOptionsForWork10) {
      const optionsSection = nextSection;
      const textSection = nextNextIsTextForWork10 ? nextNextSection : null;
      const answerSection = nextNextNextIsAnswerForWork10 ? contentSections[sectionIndex + 3] : null;
      
      // 각 섹션의 높이 계산
      const optionsHeight = estimateSectionHeight(optionsSection);
      const textHeight = textSection ? estimateSectionHeight(textSection) : 0;
      const answerHeight = answerSection ? estimateSectionHeight(answerSection) : 0;
      
      // 여백 계산 (CSS에서 실제 사용되는 여백)
      // HTML 본문: margin-bottom: 0.15cm (.print-html-block CSS)
      // Options: margin-top: 0 (없음), margin-bottom: 0.5cm (.print-options CSS)
      // Text: margin-top: 0.1cm, margin-bottom: 0.2cm (.print-text-block-work10 CSS)
      // Answer: margin-top: 0 (없음)
      const marginBetweenHtmlAndOptions = 0.15; // HTML margin-bottom(0.15cm)
      const marginBetweenOptionsAndText = 0.5 + 0.1; // Options margin-bottom(0.5cm) + text margin-top(0.1cm) = 0.6cm
      const marginBetweenTextAndAnswer = 0.2; // text margin-bottom(0.2cm)
      
      // 현재 높이에서 시작
      let accumulatedHeight = currentHeight;
      
      // 1. HTML 본문 추가 (이미 계산됨)
      accumulatedHeight += sectionHeight;
      const heightAfterHtml = accumulatedHeight;
      
      // 2. Options 추가 가능한지 체크
      const heightAfterOptions = accumulatedHeight + optionsHeight + marginBetweenHtmlAndOptions;
      const canAddOptions = heightAfterOptions <= availableHeight;
      
      // 3. Text 추가 가능한지 체크 (options 포함 여백)
      const heightAfterText = textSection ? heightAfterOptions + textHeight + marginBetweenOptionsAndText : heightAfterOptions;
      const canAddText = textSection ? heightAfterText <= availableHeight : true;
      
      // 4. Answer 추가 가능한지 체크 (text 포함 여백)
      const heightAfterAnswer = answerSection && canAddText ? heightAfterText + answerHeight + marginBetweenTextAndAnswer : heightAfterText;
      const canAddAnswer = answerSection ? heightAfterAnswer <= availableHeight : true;
      
      // 디버깅: 유형#10 순차적 높이 체크
      if (process.env.NODE_ENV === 'development') {
        console.log('📏 유형#10 순차적 높이 체크:', {
          currentHeight: currentHeight.toFixed(2) + 'cm',
          htmlHeight: sectionHeight.toFixed(2) + 'cm',
          optionsHeight: optionsHeight.toFixed(2) + 'cm',
          textHeight: textHeight.toFixed(2) + 'cm',
          answerHeight: answerHeight.toFixed(2) + 'cm',
          heightAfterHtml: heightAfterHtml.toFixed(2) + 'cm',
          heightAfterOptions: heightAfterOptions.toFixed(2) + 'cm',
          heightAfterText: heightAfterText.toFixed(2) + 'cm',
          heightAfterAnswer: heightAfterAnswer.toFixed(2) + 'cm',
          availableHeight: availableHeight.toFixed(2) + 'cm',
          canAddOptions: canAddOptions,
          canAddText: canAddText,
          canAddAnswer: canAddAnswer
        });
      }
      
      // 순차적으로 요소 추가
      // HTML 본문이 너무 길어서 options를 같은 청크에 넣을 수 없는 경우
      // 본문만 현재 청크에 추가하고 options는 다음 청크로 이동
      // 본문 높이가 단 높이의 80%를 넘거나, 본문+options 높이가 단 높이를 넘으면 분리
      if (heightAfterHtml > availableHeight * 0.8 || heightAfterOptions > availableHeight) {
        // 본문이 단 높이의 80%를 넘거나 options를 넣을 수 없으면 본문만 현재 청크에 추가
        currentSections.push(clonedSection);
        currentHeight = heightAfterHtml;
        
        // 현재 청크를 저장하고 새 청크 시작
        chunkSectionsList.push(currentSections);
        chunkIndex++;
        ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
        
        // Options, Text, Answer를 순차적으로 새 청크에 추가
        const optionsMarginTop = 0;
        const clonedOptionsSection = cloneSectionForChunk(optionsSection, chunkIndex, currentSections.length);
        currentSections.push(clonedOptionsSection);
        currentHeight += optionsHeight + optionsMarginTop;
        
        if (textSection && currentHeight + textHeight + marginBetweenOptionsAndText <= availableHeight) {
          const clonedTextSection = cloneSectionForChunk(textSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTextSection);
          currentHeight += textHeight + marginBetweenOptionsAndText;
          
          if (answerSection && currentHeight + answerHeight + marginBetweenTextAndAnswer <= availableHeight) {
            const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
            currentSections.push(clonedAnswerSection);
            currentHeight += answerHeight + marginBetweenTextAndAnswer;
          } else if (answerSection) {
            // Answer는 또 다음 청크로
            if (currentSections.length > 0) {
              chunkSectionsList.push(currentSections);
              chunkIndex++;
              ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
            }
            const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
            currentSections.push(clonedAnswerSection);
            currentHeight = estimateSectionHeight(clonedAnswerSection);
          }
        } else if (textSection) {
          // Text도 들어갈 수 없으면
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          }
          const clonedTextSection = cloneSectionForChunk(textSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTextSection);
          currentHeight = estimateSectionHeight(clonedTextSection);
          
          if (answerSection && currentHeight + answerHeight + marginBetweenTextAndAnswer <= availableHeight) {
            const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
            currentSections.push(clonedAnswerSection);
            currentHeight += answerHeight + marginBetweenTextAndAnswer;
          } else if (answerSection) {
            // Answer는 또 다음 청크로
            if (currentSections.length > 0) {
              chunkSectionsList.push(currentSections);
              chunkIndex++;
              ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
            }
            const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
            currentSections.push(clonedAnswerSection);
            currentHeight = estimateSectionHeight(clonedAnswerSection);
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ 유형#10: 본문이 너무 길어서 options를 다음 단으로 이동', {
            previousChunkIndex: chunkIndex - 1,
            newChunkIndex: chunkIndex,
            htmlHeight: sectionHeight.toFixed(2) + 'cm',
            availableHeight: availableHeight.toFixed(2) + 'cm',
            heightAfterHtml: heightAfterHtml.toFixed(2) + 'cm'
          });
        }
        
        sectionIndex += 1 + (textSection ? 1 : 0) + (answerSection ? 1 : 0);
        continue;
      }
      
      // HTML 본문은 무조건 추가
      currentSections.push(clonedSection);
      currentHeight = heightAfterHtml;
      
      // Options 추가 (가능한 경우)
      if (canAddOptions) {
        const clonedOptionsSection = cloneSectionForChunk(optionsSection, chunkIndex, currentSections.length);
        currentSections.push(clonedOptionsSection);
        currentHeight = heightAfterOptions;
        
        // Text 추가 (있는 경우)
        if (textSection && canAddText) {
          const clonedTextSection = cloneSectionForChunk(textSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTextSection);
          currentHeight = heightAfterText;
          
          // Answer 추가 (있는 경우)
          if (answerSection && canAddAnswer) {
            const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
            currentSections.push(clonedAnswerSection);
            currentHeight = heightAfterAnswer;
            
            // options, text, answer 섹션을 건너뛰기
            sectionIndex += 1 + (textSection ? 1 : 0) + (answerSection ? 1 : 0);
            continue;
          } else if (answerSection) {
            // Answer는 다음 단으로 이동
            // 현재 청크 저장하고 새 청크 시작
            if (currentSections.length > 0) {
              chunkSectionsList.push(currentSections);
              chunkIndex++;
              ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
            }
            
            // Answer를 새 청크에 추가
            const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
            currentSections.push(clonedAnswerSection);
            currentHeight = estimateSectionHeight(clonedAnswerSection);
            
            sectionIndex += 1 + (textSection ? 1 : 0) + (answerSection ? 1 : 0);
            continue;
          } else {
            // text만 있고 answer가 없는 경우
            sectionIndex += 1 + (textSection ? 1 : 0);
            continue;
          }
        } else if (textSection) {
          // Text도 다음 단으로 이동
          // 현재 청크 저장하고 새 청크 시작
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          }
          
          // Text와 Answer를 순차적으로 새 청크에 추가
          const textMarginTop = 0.1;
          const clonedTextSection = cloneSectionForChunk(textSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTextSection);
          currentHeight += textHeight + textMarginTop;
          
          if (answerSection && currentHeight + answerHeight + marginBetweenTextAndAnswer <= availableHeight) {
            const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
            currentSections.push(clonedAnswerSection);
            currentHeight += answerHeight + marginBetweenTextAndAnswer;
          } else if (answerSection) {
            // Answer는 또 다음 청크로
            if (currentSections.length > 0) {
              chunkSectionsList.push(currentSections);
              chunkIndex++;
              ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
            }
            const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
            currentSections.push(clonedAnswerSection);
            currentHeight = estimateSectionHeight(clonedAnswerSection);
          }
          
          sectionIndex += 1 + (textSection ? 1 : 0) + (answerSection ? 1 : 0);
          continue;
        } else {
          // Options만 있고 text/answer가 없는 경우
          sectionIndex += 1;
          continue;
        }
      } else {
        // Options도 다음 단으로 이동 (HTML 본문만 현재 단에)
        // 현재 청크 저장하고 새 청크 시작
        if (currentSections.length > 0) {
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
        }
        
        // Options, Text, Answer를 순차적으로 새 청크에 추가
        const optionsMarginTop = 0;
        const clonedOptionsSection = cloneSectionForChunk(optionsSection, chunkIndex, currentSections.length);
        currentSections.push(clonedOptionsSection);
        currentHeight += optionsHeight + optionsMarginTop;
        
        if (textSection && currentHeight + textHeight + marginBetweenOptionsAndText <= availableHeight) {
          const clonedTextSection = cloneSectionForChunk(textSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTextSection);
          currentHeight += textHeight + marginBetweenOptionsAndText;
          
          if (answerSection && currentHeight + answerHeight + marginBetweenTextAndAnswer <= availableHeight) {
            const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
            currentSections.push(clonedAnswerSection);
            currentHeight += answerHeight + marginBetweenTextAndAnswer;
          } else if (answerSection) {
            // Answer는 또 다음 청크로
            if (currentSections.length > 0) {
              chunkSectionsList.push(currentSections);
              chunkIndex++;
              ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
            }
            const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
            currentSections.push(clonedAnswerSection);
            currentHeight = estimateSectionHeight(clonedAnswerSection);
          }
        } else if (textSection) {
          // Text도 들어갈 수 없으면
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          }
          const clonedTextSection = cloneSectionForChunk(textSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTextSection);
          currentHeight = estimateSectionHeight(clonedTextSection);
          
          if (answerSection && currentHeight + answerHeight + marginBetweenTextAndAnswer <= availableHeight) {
            const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
            currentSections.push(clonedAnswerSection);
            currentHeight += answerHeight + marginBetweenTextAndAnswer;
          } else if (answerSection) {
            // Answer는 또 다음 청크로
            if (currentSections.length > 0) {
              chunkSectionsList.push(currentSections);
              chunkIndex++;
              ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
            }
            const clonedAnswerSection = cloneSectionForChunk(answerSection, chunkIndex, currentSections.length);
            currentSections.push(clonedAnswerSection);
            currentHeight = estimateSectionHeight(clonedAnswerSection);
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ 유형#10: options를 다음 단으로 이동', {
            previousChunkIndex: chunkIndex - 1,
            newChunkIndex: chunkIndex
          });
        }
        
        sectionIndex += 1 + (textSection ? 1 : 0) + (answerSection ? 1 : 0);
        continue;
      }
    }
    
    // 유형#09의 경우: html + options + translation을 순차적으로 처리
    // 핵심 원칙: 각 요소를 순차적으로 추가하면서 높이를 체크하고, 단 높이를 넘으면 다음 단으로 이동
    const isWork09 = normalizedItem.workTypeId === '09';
    const isWork09Html = isWork09 && section.type === 'html';
    const nextIsOptionsForWork09 = isWork09 && nextSection?.type === 'options';
    const nextNextIsTranslationForWork09 = isWork09 && nextNextSection?.type === 'translation';
    if (isWork09Html && nextIsOptionsForWork09 && nextNextIsTranslationForWork09) {
      const optionsSection = nextSection;
      const translationSection = nextNextSection;
      
      // 각 섹션의 높이 계산
      const optionsHeight = estimateSectionHeight(optionsSection);
      const translationHeight = estimateSectionHeight(translationSection);
      
      // 여백 계산 (CSS에서 실제 사용되는 여백)
      // HTML 본문: margin-bottom: 0.15cm (.print-html-block CSS)
      // Options: margin-top: 0 (없음), margin-bottom: 0.5cm (.print-options CSS)
      // Translation: margin-top: 0.3cm (.print-translation-section CSS)
      const marginBetweenHtmlAndOptions = 0.15; // HTML margin-bottom(0.15cm)
      const marginBetweenOptionsAndTranslation = 0.5 + 0.3; // Options margin-bottom(0.5cm) + translation margin-top(0.3cm) = 0.8cm
      
      // 현재 높이에서 시작
      let accumulatedHeight = currentHeight;
      
      // 1. HTML 본문 추가 (이미 계산됨)
      accumulatedHeight += sectionHeight;
      const heightAfterHtml = accumulatedHeight;
      
      // 2. Options 추가 가능한지 체크
      const heightAfterOptions = accumulatedHeight + optionsHeight + marginBetweenHtmlAndOptions;
      const canAddOptions = heightAfterOptions <= availableHeight;
      
      // 3. Translation 추가 가능한지 체크 (options 포함 여백)
      const heightAfterTranslation = heightAfterOptions + translationHeight + marginBetweenOptionsAndTranslation;
      const canAddTranslation = heightAfterTranslation <= availableHeight;
      
      // 디버깅: 유형#09 순차적 높이 체크
      if (process.env.NODE_ENV === 'development') {
        console.log('📏 유형#09 순차적 높이 체크:', {
          currentHeight: currentHeight.toFixed(2) + 'cm',
          htmlHeight: sectionHeight.toFixed(2) + 'cm',
          optionsHeight: optionsHeight.toFixed(2) + 'cm',
          translationHeight: translationHeight.toFixed(2) + 'cm',
          heightAfterHtml: heightAfterHtml.toFixed(2) + 'cm',
          heightAfterOptions: heightAfterOptions.toFixed(2) + 'cm',
          heightAfterTranslation: heightAfterTranslation.toFixed(2) + 'cm',
          availableHeight: availableHeight.toFixed(2) + 'cm',
          canAddOptions: canAddOptions,
          canAddTranslation: canAddTranslation
        });
      }
      
      // 순차적으로 요소 추가
      // HTML 본문은 무조건 추가
      currentSections.push(clonedSection);
      currentHeight = heightAfterHtml;
      
      // Options 추가 (가능한 경우)
      if (canAddOptions) {
        const clonedOptionsSection = cloneSectionForChunk(optionsSection, chunkIndex, currentSections.length);
        currentSections.push(clonedOptionsSection);
        currentHeight = heightAfterOptions;
        
        // Translation 추가 가능한지 체크
        if (canAddTranslation) {
          // 모두 같은 단에 추가 가능
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight = heightAfterTranslation;
          
          // options와 translation 섹션을 건너뛰기 (2개)
          sectionIndex += 2;
          continue;
        } else {
          // Translation은 다음 단으로 이동
          // 현재 청크 저장하고 새 청크 시작
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          }
          
          // Translation을 새 청크에 추가
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight = estimateSectionHeight(clonedTranslationSection);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ 유형#09: translation을 다음 단으로 이동 (options까지 포함)', {
              previousChunkIndex: chunkIndex - 1,
              newChunkIndex: chunkIndex,
              translationHeight: translationHeight.toFixed(2) + 'cm'
            });
          }
          
          sectionIndex += 2;
          continue;
        }
      } else {
        // Options도 다음 단으로 이동 (HTML 본문만 현재 단에)
        // 현재 청크 저장하고 새 청크 시작
        if (currentSections.length > 0) {
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
        }
        
        // Options와 Translation을 순차적으로 새 청크에 추가
        const optionsMarginTop = 0; // Options margin-top 없음
        const clonedOptionsSection = cloneSectionForChunk(optionsSection, chunkIndex, currentSections.length);
        currentSections.push(clonedOptionsSection);
        currentHeight += optionsHeight + optionsMarginTop;
        
        // Translation 추가 가능한지 체크
        const translationHeightWithMargin = translationHeight + marginBetweenOptionsAndTranslation;
        if (currentHeight + translationHeightWithMargin <= availableHeight) {
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight += translationHeightWithMargin;
        } else {
          // Translation은 또 다음 청크로
          if (currentSections.length > 0) {
            chunkSectionsList.push(currentSections);
            chunkIndex++;
            ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
          }
          const clonedTranslationSection = cloneSectionForChunk(translationSection, chunkIndex, currentSections.length);
          currentSections.push(clonedTranslationSection);
          currentHeight = estimateSectionHeight(clonedTranslationSection);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ 유형#09: options를 다음 단으로 이동', {
            previousChunkIndex: chunkIndex - 1,
            newChunkIndex: chunkIndex
          });
        }
        
        sectionIndex += 2;
        continue;
      }
    }
    
    // paragraph/html + options + translation을 함께 묶어서 처리 (모든 유형에 동일하게 적용)
    // 단, 유형#05, #10의 경우 이미 특별 처리되었으므로 제외
    // 유형#10의 경우 options와 translation 사이에 answer가 있을 수 있음
    if (isParagraphOrHtmlSection && nextIsOptions && nextNextIsTranslation && !isWork05Passage && !isWork10Passage) {
      const optionsHeight = estimateSectionHeight(nextSection);
      const translationHeight = estimateSectionHeight(nextNextSection);
      const paragraphOnlyHeight = currentHeight + sectionHeight;
      const paragraphOptionsHeight = paragraphOnlyHeight + optionsHeight;
      const allThreeHeight = paragraphOptionsHeight + translationHeight;
      
      // 높이 계산에 더 큰 여유를 줘서 과대평가 방지 (15% 여유)
      // 실제로는 공간이 충분한데도 과대평가로 인해 다음 단으로 넘어가는 문제 해결
      const availableHeightWithMargin = availableHeight * 0.85;
      
      // 유형#07의 경우: paragraph/html + options는 함께 묶고, translation은 별도로 처리
      if (isWork07Passage && nextIsOptions && nextNextIsTranslation) {
        // 유형#07: 본문 + options + translation 높이 계산
        const optionsHeight = estimateSectionHeight(nextSection);
        const translationHeight = estimateSectionHeight(nextNextSection);
        const passageOptionsHeight = currentHeight + sectionHeight + optionsHeight;
        const allThreeHeight = passageOptionsHeight + translationHeight;
        
        // 높이 계산에 여유를 줘서 과대평가 방지 (15% 여유)
        const availableHeightWithMargin = availableHeight * 0.85;
        
        // 디버깅: 유형#07 페이지 분할 로직 확인
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 유형#07 페이지 분할 로직:', {
            workTypeId: normalizedItem.workTypeId,
            sectionType: section.type,
            nextSectionType: nextSection?.type,
            nextNextSectionType: nextNextSection?.type,
            currentHeight: currentHeight.toFixed(2) + 'cm',
            sectionHeight: sectionHeight.toFixed(2) + 'cm',
            optionsHeight: optionsHeight.toFixed(2) + 'cm',
            translationHeight: translationHeight.toFixed(2) + 'cm',
            passageOptionsHeight: passageOptionsHeight.toFixed(2) + 'cm',
            allThreeHeight: allThreeHeight.toFixed(2) + 'cm',
            availableHeight: availableHeight.toFixed(2) + 'cm',
            availableHeightWithMargin: availableHeightWithMargin.toFixed(2) + 'cm',
            canFitAllThree: allThreeHeight <= availableHeightWithMargin,
            canFitPassageOptions: passageOptionsHeight <= availableHeightWithMargin
          });
        }
        
        // 1. paragraph/html + options + translation이 모두 들어갈 수 있으면 모두 현재 청크에
        if (allThreeHeight <= availableHeightWithMargin) {
          // paragraph/html만 추가하고 options와 translation은 다음 반복에서 처리
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          continue;
        }
        
        // 2. paragraph/html + options만 들어갈 수 있으면 paragraph/html과 options는 현재 청크에, translation은 다음 청크로
        if (passageOptionsHeight <= availableHeightWithMargin) {
          // paragraph/html과 options를 모두 추가하고, options 섹션을 건너뛰기 위해 인덱스 증가
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          
          // options 섹션도 함께 추가
          const clonedOptionsSection = cloneSectionForChunk(nextSection, chunkIndex, currentSections.length);
          const optionsSectionHeight = estimateSectionHeight(clonedOptionsSection);
          currentSections.push(clonedOptionsSection);
          currentHeight += optionsSectionHeight;
          
          // options 섹션을 건너뛰기 위해 인덱스 증가 (translation은 다음 청크로)
          sectionIndex++;
          continue;
        }
        
        // 3. paragraph/html만 들어갈 수 있으면 paragraph/html은 현재 청크에, options와 translation은 다음 청크로
        if (currentHeight + sectionHeight <= availableHeightWithMargin) {
          // paragraph/html만 추가하고 options와 translation은 다음 반복에서 처리
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          continue;
        }
        
        // 4. paragraph/html도 들어갈 수 없으면 본문을 다음 청크로 이동
        // (아래 로직으로 처리)
      } else {
        // 유형#07이 아닌 경우 기존 로직 유지
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
        // 단, 유형#07의 경우: 본문과 options를 함께 묶으려고 시도
        if (isWork07Passage && nextIsOptions) {
          // 유형#07: 본문과 options를 함께 넣을 수 있으면 함께 묶기 (10% 여유)
          const optionsHeight = estimateSectionHeight(nextSection);
          const passageOptionsHeight = currentHeight + sectionHeight + optionsHeight;
          
          if (passageOptionsHeight <= availableHeight * 1.1) {
            // 유형#07: 본문과 options를 함께 현재 청크에 추가
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
        }
      }
      // paragraph만 들어갈 수 있으면 paragraph는 현재 청크에, options와 translation은 다음 청크로
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
        // 유형#07, #09의 경우: 본문과 options를 함께 묶으려고 시도
        // 단, 본문이 너무 길어서 options를 같은 청크에 넣을 수 없을 때는 분리
        // 유형#10은 이미 특별 처리되었으므로 제외
        if ((isWork07Passage || isWork09Passage) && nextIsOptions) {
          const optionsHeight = estimateSectionHeight(nextSection);
          const passageOptionsHeight = currentHeight + sectionHeight + optionsHeight;
          
          // 본문과 options를 함께 넣을 수 있으면 함께 묶기
          if (passageOptionsHeight <= availableHeight * 1.1) { // 10% 여유
            // 유형#07, #09: 본문과 options를 함께 현재 청크에 추가
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
    } else if (isParagraphOrHtmlSection && nextIsOptions && !nextIsTranslation && !isWork10Passage) {
      // paragraph/html + options만 있는 경우 (translation 없음, 문제 모드 등)
      // 유형#09 등에서 문제 모드일 때 html + options를 함께 묶어서 처리
      // 유형#10은 이미 특별 처리되었으므로 제외
      const optionsHeight = estimateSectionHeight(nextSection);
      const paragraphOnlyHeight = currentHeight + sectionHeight;
      const paragraphOptionsHeight = paragraphOnlyHeight + optionsHeight;
      
      // 높이 계산에 더 큰 여유를 줘서 과대평가 방지 (15% 여유)
      const availableHeightWithMargin = availableHeight * 0.85;
      
      // 유형#07, #09의 경우: 본문과 options를 함께 묶으려고 시도
      // 단, 본문이 너무 길어서 options를 같은 청크에 넣을 수 없을 때는 분리
      // 유형#10은 이미 특별 처리되었으므로 제외
      if (isWork07Passage || isWork09Passage) {
        const optionsHeight = estimateSectionHeight(nextSection);
        const passageOptionsHeight = currentHeight + sectionHeight + optionsHeight;
        
        // 본문과 options를 함께 넣을 수 있으면 함께 묶기
        if (passageOptionsHeight <= availableHeight * 1.1) { // 10% 여유
          // 유형#07, #09: 본문과 options를 함께 현재 청크에 추가
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
        // 유형#09의 경우: 본문이 길어서 options를 같은 청크에 넣을 수 없을 때
        // 본문은 현재 청크에, options는 다음 청크로 넘어가야 함
        // 유형#10은 이미 특별 처리되었으므로 제외
        if (isWork09Passage && nextIsOptions) {
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
      // options와 translation 사이의 여백을 고려하여 겹치지 않도록 처리
      const translationHeight = estimateSectionHeight(nextSection);
      // options의 margin-bottom(0.5cm) + translation의 margin-top(0.3cm) = 0.8cm
      const marginBetweenOptionsAndTranslation = 0.8;
      const optionsTranslationHeight = sectionHeight + translationHeight + marginBetweenOptionsAndTranslation;
      
      // 핵심 로직: 여백을 포함한 높이가 단 높이를 초과하거나 거의 가까우면 translation은 반드시 다음 단으로
      // 더 보수적으로: optionsTranslationHeight >= availableHeight * 0.98이면 translation을 다음 단으로 (2% 여유)
      const shouldMoveTranslationToNextColumn = 
        currentHeight + optionsTranslationHeight > availableHeight ||
        currentHeight + optionsTranslationHeight >= availableHeight * 0.98; // 98% 이상이면 다음 단으로
      
      // 디버깅: options + translation 높이 계산 확인 (항상 로그 출력)
      console.log('📏 options + translation 높이 계산:', {
        sectionType: section.type,
        nextSectionType: nextSection?.type,
        currentHeight: currentHeight.toFixed(2) + 'cm',
        optionsHeight: sectionHeight.toFixed(2) + 'cm',
        translationHeight: translationHeight.toFixed(2) + 'cm',
        marginBetweenOptionsAndTranslation: marginBetweenOptionsAndTranslation.toFixed(2) + 'cm',
        optionsTranslationHeight: optionsTranslationHeight.toFixed(2) + 'cm',
        availableHeight: availableHeight.toFixed(2) + 'cm',
        canFitBoth: (currentHeight + optionsTranslationHeight <= availableHeight),
        willMoveTranslationToNextColumn: (currentHeight + optionsTranslationHeight > availableHeight),
        shouldMoveTranslation: shouldMoveTranslationToNextColumn
      });
      
      if (shouldMoveTranslationToNextColumn) {
        // translation은 반드시 다음 단으로 이동
        // options만 들어갈 수 있는지 확인
        if (currentHeight + sectionHeight <= availableHeight) {
          // options만 추가하고 translation은 다음 반복에서 처리 (다음 단으로 이동)
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          continue;
        }
        // options도 단 높이를 초과하는 경우는 아래 로직으로 처리
      } else {
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
        totalHeightForCheck = sectionHeight + translationHeight;
      }
    } else if (isWork11SentenceSection) {
      // 유형#11 전용: 연속된 문장(paragraph) 섹션들을 효율적으로 배치
      // 각 문장과 해석의 높이를 정확히 계산하여 단 높이를 초과하지 않는 최대 개수의 문장을 한 번에 추가
      
      // 현재 문장부터 시작해서 연속된 문장들의 누적 높이를 계산
      let checkIndex = sectionIndex;
      let cumulativeHeight = currentHeight; // 현재까지의 높이
      const sentencesToAdd: { section: PrintSection; clonedSection: PrintSection; height: number; index: number }[] = [];
      
      // 현재 문장부터 연속된 문장들을 확인하여 단 높이를 초과하지 않는 최대 개수 구하기
      while (checkIndex < contentSections.length) {
        const checkSection = contentSections[checkIndex];
        const isCheckSentence = checkSection?.type === 'paragraph' && 
          (checkSection.meta?.variant === 'sentence' || checkSection.meta?.variant === 'sentence-with-translation');
        
        // 문장 섹션이 아니면 중단
        if (!isCheckSentence) {
          break;
        }
        
        // 현재 체크할 문장의 높이 계산
        const checkClonedSection = cloneSectionForChunk(checkSection, chunkIndex, currentSections.length + sentencesToAdd.length);
        const checkSentenceHeight = estimateSectionHeight(checkClonedSection);
        
        // 현재 문장과 해석, 사이 여백을 포함한 높이를 누적 계산
        const newCumulativeHeight = cumulativeHeight + checkSentenceHeight;
        
        // 단 높이를 초과하지 않으면 추가 목록에 포함
        // 정확도를 위해 약간의 마진을 두어 겹침 방지 (1% 마진)
        const heightMargin = availableHeight * 0.01; // 1% 마진
        const effectiveAvailableHeight = availableHeight - heightMargin;
        
        // 디버깅: 각 문장의 높이 계산 확인
        if (process.env.NODE_ENV === 'development') {
          const checkLabel = checkSection.label || `문장 ${checkIndex + 1}`;
          const checkEnglishText = checkSection.text || '';
          const checkKoreanText = checkSection.meta?.translation || '';
          console.log(`📏 유형#11 ${checkLabel} (인덱스 ${checkIndex}) 누적 높이 계산:`, {
            label: checkLabel,
            englishText: checkEnglishText.substring(0, 60) + (checkEnglishText.length > 60 ? '...' : ''),
            koreanText: checkKoreanText.substring(0, 60) + (checkKoreanText.length > 60 ? '...' : ''),
            sentenceHeight: checkSentenceHeight.toFixed(3) + 'cm',
            cumulativeHeight: cumulativeHeight.toFixed(3) + 'cm',
            newCumulativeHeight: newCumulativeHeight.toFixed(3) + 'cm',
            availableHeight: availableHeight.toFixed(3) + 'cm',
            heightMargin: heightMargin.toFixed(3) + 'cm',
            effectiveAvailableHeight: effectiveAvailableHeight.toFixed(3) + 'cm',
            canFit: (newCumulativeHeight <= effectiveAvailableHeight),
            overflow: (newCumulativeHeight > effectiveAvailableHeight ? (newCumulativeHeight - effectiveAvailableHeight).toFixed(3) + 'cm' : '0cm')
          });
        }
        
        if (newCumulativeHeight <= effectiveAvailableHeight) {
          sentencesToAdd.push({
            section: checkSection,
            clonedSection: checkClonedSection,
            height: checkSentenceHeight,
            index: checkIndex
          });
          cumulativeHeight = newCumulativeHeight;
          checkIndex++;
        } else {
          // 단 높이를 초과하면 중단
          // 이 문장부터는 다음 청크에서 처리되어야 함
          if (process.env.NODE_ENV === 'development') {
            const checkLabel = checkSection.label || `문장 ${checkIndex + 1}`;
            console.log(`⚠️ 유형#11 ${checkLabel} (인덱스 ${checkIndex}) 누적 높이 초과, 다음 청크에서 처리:`, {
              sentenceHeight: checkSentenceHeight.toFixed(3) + 'cm',
              cumulativeHeight: cumulativeHeight.toFixed(3) + 'cm',
              newCumulativeHeight: newCumulativeHeight.toFixed(3) + 'cm',
              availableHeight: availableHeight.toFixed(3) + 'cm',
              overflow: (newCumulativeHeight - availableHeight).toFixed(3) + 'cm',
              willMoveToNextChunk: true
            });
          }
          break;
        }
      }
      
      // 계산된 문장들을 실제로 추가
      if (sentencesToAdd.length > 0) {
        // 현재 문장부터 연속된 문장들을 한 번에 추가
        sentencesToAdd.forEach((item, idx) => {
          currentSections.push(item.clonedSection);
          currentHeight += item.height;
          
          if (process.env.NODE_ENV === 'development') {
            const itemLabel = item.section.label || `문장 ${item.index + 1}`;
            console.log(`✅ 유형#11 ${itemLabel} (인덱스 ${item.index}) 추가:`, {
              sentenceHeight: item.height.toFixed(3) + 'cm',
              currentHeight: currentHeight.toFixed(3) + 'cm',
              availableHeight: availableHeight.toFixed(3) + 'cm',
              remainingHeight: (availableHeight - currentHeight).toFixed(3) + 'cm',
              sequence: `${idx + 1}/${sentencesToAdd.length}`
            });
          }
        });
        
        // 처리된 문장들을 건너뛰기
        // 마지막으로 추가한 문장의 인덱스로 sectionIndex 설정
        const lastAddedIndex = sentencesToAdd[sentencesToAdd.length - 1].index;
        sectionIndex = lastAddedIndex;
        
        if (process.env.NODE_ENV === 'development') {
          const firstLabel = sentencesToAdd[0].section.label || `문장 ${sentencesToAdd[0].index + 1}`;
          const lastLabel = sentencesToAdd[sentencesToAdd.length - 1].section.label || `문장 ${lastAddedIndex + 1}`;
          console.log(`🔄 유형#11: ${sentencesToAdd.length}개 문장 (${firstLabel}~${lastLabel}) 처리 완료, 다음 반복에서 sectionIndex=${lastAddedIndex + 1} 처리`);
        }
        
        continue;
      } else {
        // 현재 문장 하나도 추가할 수 없는 경우
        // (첫 청크에 title만 있거나, 문장 하나의 높이가 단 높이를 초과하는 경우)
        if (onlyTitlePresent) {
          // 첫 청크에 title만 있는 경우: 문장을 강제로 추가 (빈 페이지 방지)
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`⚠️ 유형#11: 첫 청크에 문장 강제 추가 (높이 초과):`, {
              label: section.label || `문장 ${sectionIndex + 1}`,
              sectionHeight: sectionHeight.toFixed(3) + 'cm',
              currentHeight: currentHeight.toFixed(3) + 'cm',
              availableHeight: availableHeight.toFixed(3) + 'cm'
            });
          }
          continue;
        }
        
        // 현재 문장 하나도 추가할 수 없는 경우
        // 새 청크로 이동하여 처리
        const sentenceLabel = section.label || `문장 ${sectionIndex + 1}`;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 유형#11 ${sentenceLabel} 새 청크로 이동 (현재 청크에 공간 부족):`, {
            reason: '현재 청크에 공간 부족',
            sectionHeight: sectionHeight.toFixed(3) + 'cm',
            currentHeight: currentHeight.toFixed(3) + 'cm',
            availableHeight: availableHeight.toFixed(3) + 'cm',
            overflow: (currentHeight + sectionHeight - availableHeight).toFixed(3) + 'cm',
            chunkIndex: chunkIndex + 1
          });
        }
        
        // 현재 청크를 저장하고 새 청크로 이동
        if (currentSections.length > 0) {
          chunkSectionsList.push(currentSections);
          chunkIndex++;
          ({ sections: currentSections, height: currentHeight } = startNewChunk(chunkIndex, false));
        }
        
        // 새 청크에서도 현재 문장부터 연속된 문장들의 누적 높이를 다시 계산
        // (새 청크에서도 동일한 로직 적용)
        let newChunkCheckIndex = sectionIndex;
        let newChunkCumulativeHeight = currentHeight;
        const newChunkSentencesToAdd: { section: PrintSection; clonedSection: PrintSection; height: number; index: number }[] = [];
        
        while (newChunkCheckIndex < contentSections.length) {
          const newChunkCheckSection = contentSections[newChunkCheckIndex];
          const isNewChunkCheckSentence = newChunkCheckSection?.type === 'paragraph' && 
            (newChunkCheckSection.meta?.variant === 'sentence' || newChunkCheckSection.meta?.variant === 'sentence-with-translation');
          
          if (!isNewChunkCheckSentence) {
            break;
          }
          
          const newChunkCheckClonedSection = cloneSectionForChunk(newChunkCheckSection, chunkIndex, currentSections.length + newChunkSentencesToAdd.length);
          const newChunkCheckSentenceHeight = estimateSectionHeight(newChunkCheckClonedSection);
          const newChunkNewCumulativeHeight = newChunkCumulativeHeight + newChunkCheckSentenceHeight;
          
          // 정확도를 위해 약간의 마진을 두어 겹침 방지 (1% 마진)
          const newChunkHeightMargin = availableHeight * 0.01; // 1% 마진
          const newChunkEffectiveAvailableHeight = availableHeight - newChunkHeightMargin;
          
          if (newChunkNewCumulativeHeight <= newChunkEffectiveAvailableHeight) {
            newChunkSentencesToAdd.push({
              section: newChunkCheckSection,
              clonedSection: newChunkCheckClonedSection,
              height: newChunkCheckSentenceHeight,
              index: newChunkCheckIndex
            });
            newChunkCumulativeHeight = newChunkNewCumulativeHeight;
            newChunkCheckIndex++;
          } else {
            break;
          }
        }
        
        // 새 청크에 계산된 문장들 추가
        if (newChunkSentencesToAdd.length > 0) {
          newChunkSentencesToAdd.forEach((item) => {
            currentSections.push(item.clonedSection);
            currentHeight += item.height;
          });
          
          const lastAddedIndex = newChunkSentencesToAdd[newChunkSentencesToAdd.length - 1].index;
          sectionIndex = lastAddedIndex;
          
          if (process.env.NODE_ENV === 'development') {
            const firstLabel = newChunkSentencesToAdd[0].section.label || `문장 ${newChunkSentencesToAdd[0].index + 1}`;
            const lastLabel = newChunkSentencesToAdd[newChunkSentencesToAdd.length - 1].section.label || `문장 ${lastAddedIndex + 1}`;
            console.log(`🔄 유형#11: 새 청크에 ${newChunkSentencesToAdd.length}개 문장 (${firstLabel}~${lastLabel}) 추가, 다음 반복에서 sectionIndex=${lastAddedIndex + 1} 처리`);
          }
          
          continue;
        } else {
          // 새 청크에도 하나도 추가할 수 없으면 강제로 현재 문장만 추가 (높이 초과해도)
          clonedSection = cloneSectionForChunk(section, chunkIndex, currentSections.length);
          sectionHeight = estimateSectionHeight(clonedSection);
          currentSections.push(clonedSection);
          currentHeight += sectionHeight;
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`⚠️ 유형#11: 새 청크에 문장 강제 추가 (높이 초과):`, {
              label: sentenceLabel,
              sectionHeight: sectionHeight.toFixed(3) + 'cm',
              currentHeight: currentHeight.toFixed(3) + 'cm',
              availableHeight: availableHeight.toFixed(3) + 'cm'
            });
          }
          
          continue;
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
  
  // 유형#01의 경우: 정답 섹션이 이미 contentSections에 포함되어 있으므로 추가 작업 불필요

  const totalChunks = chunkSectionsList.length;

  const isPackage02 = options?.isPackage02 ?? false;

  return chunkSectionsList.map((sections, index) => {
    // 패키지#02 PDF 인쇄(정답) 페이지에서 정답 섹션 제거
    // 단, 유형#01의 경우 첫 번째 청크에서 options 다음, translation 이전에 있는 정답 섹션만 유지
    // 유형#06의 경우 정답 섹션을 유지 (유형#06은 정답이 본문 다음에 표시되어야 함)
    const isWork01 = normalizedItem.workTypeId === '01';
    const isWork06 = normalizedItem.workTypeId === '06';
    const isFirstChunk = index === 0;
    
    // 유형#01의 경우: 첫 번째 청크에서 options 다음, translation 이전에 있는 정답 섹션만 유지
    // 다른 위치(특히 translation 이후)에 있는 정답 섹션은 모두 제거 (페이지 하단의 빨간색 박스)
    // 유형#06의 경우: 모든 청크에서 정답 섹션 유지
    // 패키지#02의 경우: 유형#01의 translation 섹션을 제거 (맨 마지막 단에 통합 translation 추가)
    let filteredSections: PrintSection[] = [];
    if (isWork06) {
      // 유형#06의 경우 정답 섹션을 유지
      filteredSections = sections;
    } else if (isWork01 && isFirstChunk) {
      // 첫 번째 청크: options 다음, translation 이전에 있는 정답 섹션만 유지
      // 패키지#02의 경우: translation 섹션 제거
      let foundOptions = false;
      
      // 디버깅: 유형#01 첫 번째 청크의 섹션 확인
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 유형#01 첫 번째 청크 섹션 확인:', {
          sectionsCount: sections.length,
          sectionTypes: sections.map(s => s.type),
          hasOptions: sections.some(s => s.type === 'options'),
          optionsIndex: sections.findIndex(s => s.type === 'options'),
          isPackage02: isPackage02
        });
      }
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        if (section.type === 'options') {
          foundOptions = true;
          filteredSections.push(section);
        } else if (section.type === 'translation') {
          // 패키지#02의 경우: translation 섹션 제거 (맨 마지막 단에 통합 translation 추가)
          if (!isPackage02) {
          filteredSections.push(section);
          }
          // 패키지#02에서는 translation 섹션을 추가하지 않음
        } else if (section.type === 'answer') {
          // 정답 섹션: options 다음인 경우만 유지 (패키지#02에서는 translation이 없으므로)
          if (foundOptions) {
            filteredSections.push(section);
          }
        } else {
          // 다른 섹션들(paragraph, instruction 등)은 모두 유지
          filteredSections.push(section);
        }
      }
      
      // 디버깅: 유형#01 첫 번째 청크 필터링 후 확인
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 유형#01 첫 번째 청크 필터링 후:', {
          filteredSectionsCount: filteredSections.length,
          filteredSectionTypes: filteredSections.map(s => s.type),
          hasOptions: filteredSections.some(s => s.type === 'options'),
          optionsIndex: filteredSections.findIndex(s => s.type === 'options'),
          isPackage02: isPackage02
        });
      }
    } else {
      // 첫 번째 청크가 아닌 경우: 모든 정답 섹션 제거 (페이지 하단의 빨간색 박스)
      // 패키지#02의 경우: translation 섹션도 제거
      if (isPackage02) {
        filteredSections = sections.filter(section => section.type !== 'answer' && section.type !== 'translation');
      } else {
      filteredSections = sections.filter(section => section.type !== 'answer');
      }
    }
    
    const chunkMeta = createChunkMeta(normalizedItem.chunkMeta, index, totalChunks, normalizedItem.workTypeId);
    
    // 디버깅: 유형#13, #14의 경우 각 청크의 섹션 타입 확인
    if (process.env.NODE_ENV === 'development' && (normalizedItem.workTypeId === '13' || normalizedItem.workTypeId === '14')) {
      console.log(`🔍 유형#${normalizedItem.workTypeId} 청크 ${index + 1}/${totalChunks}:`, {
        sectionTypes: filteredSections.map(s => s.type),
        hasAnswerSection: filteredSections.some(s => s.type === 'answer')
      });
    }
    
    // 디버깅: 유형#06의 경우 각 청크의 섹션 타입 확인
    if (normalizedItem.workTypeId === '06') {
      console.log(`🔍 유형#06 청크 ${index + 1}/${totalChunks}:`, {
        beforeFiltering: {
          sectionCount: sections.length,
          sectionTypes: sections.map(s => s.type),
          hasAnswerSection: sections.some(s => s.type === 'answer'),
          answerSectionIndex: sections.findIndex(s => s.type === 'answer')
        },
        afterFiltering: {
          sectionCount: filteredSections.length,
          sectionTypes: filteredSections.map(s => s.type),
          hasAnswerSection: filteredSections.some(s => s.type === 'answer'),
          answerSection: filteredSections.find(s => s.type === 'answer'),
          answerSectionIndex: filteredSections.findIndex(s => s.type === 'answer')
        },
        showAnswer: (isWork01 && isFirstChunk) || isWork06,
        isFirstChunk: index === 0
      });
    }
    
    return {
      ...normalizedItem,
      sections: filteredSections,
      chunkMeta: {
        ...chunkMeta,
        // 유형#01의 경우 첫 번째 청크에만 정답 섹션을 표시
        // 유형#06의 경우 모든 청크에서 정답 섹션 표시
        showAnswer: (isWork01 && isFirstChunk) || isWork06 ? true : false,
        // problemIndex를 원본에서 전달 (유형#07용)
        problemIndex: normalizedItem.chunkMeta?.problemIndex
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
  // 단 높이 기준으로 계산: 영어단락 + 4지선다 + 한글해석이 하나의 단에 배치되어야 함
  const PAGE_HEIGHT = 21; // A4 가로 페이지 높이 (cm)
  const HEADER_HEIGHT = 1.2; // 헤더 높이 (cm)
  const CONTENT_BOTTOM_PADDING = 0.5; // 콘텐츠 하단 패딩 (cm)
  const availableHeight = PAGE_HEIGHT - HEADER_HEIGHT - CONTENT_BOTTOM_PADDING; // 19.3cm (단 높이)

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
  let lastProblemIndex: number | null = null; // 이전 아이템의 문제 번호 추적 (유형#07용)
  
  normalizedItems.forEach((item, itemIndex) => {
    const itemHeight = estimateNormalizedItemHeight(item);
    const currentWorkTypeId = item.workTypeId;
    const currentProblemIndex = item.chunkMeta?.problemIndex; // 문제 번호 추출
    
    // 같은 유형의 연속 청크인지 확인
    // 유형#07의 경우: 같은 문제 번호이고 분할된 청크인 경우만 같은 문제의 연속 청크로 인식
    const isSameTypeChunk = 
      itemIndex > 0 && 
      lastWorkTypeId === currentWorkTypeId &&
      item.chunkMeta?.isSplitChunk && // 분할된 청크인지 확인
      (currentWorkTypeId !== '07' || (currentProblemIndex !== undefined && lastProblemIndex === currentProblemIndex)); // 유형#07의 경우 문제 번호도 확인
    
    // 다른 유형이 시작되는 경우 또는 유형#07의 경우 다른 문제가 시작되는 경우
    const isNewType = lastWorkTypeId !== null && lastWorkTypeId !== currentWorkTypeId;
    const isNewProblem = 
      currentWorkTypeId === '07' && 
      currentProblemIndex !== undefined && 
      lastProblemIndex !== null && 
      lastProblemIndex !== currentProblemIndex;
    
    let targetColumn: number;
    
    if (isSameTypeChunk) {
      // 같은 유형의 연속 청크인 경우
      // 유형#05, #10의 경우: 본문과 options를 분리했으므로 다른 컬럼에 배치
      const isWork05Or10Chunk = currentWorkTypeId === '05' || currentWorkTypeId === '10';
      
      if (isWork05Or10Chunk) {
        // 유형#05, #10의 경우: 본문 청크와 options 청크를 분리했으므로
        // 이전 청크가 왼쪽 단에 있었으면 오른쪽 단에 배치
        // 이전 청크가 오른쪽 단에 있었으면 다음 페이지 왼쪽 단에 배치
        if (lastItemColumn === 0) {
          // 이전 청크가 왼쪽 단에 있었으면 오른쪽 단에 배치
          const heightMargin = availableHeight * 0.15; // 15% 여유 (과대평가 보정)
          const rightColumnAvailableSpace = availableHeight - columnHeights[1];
          
          if (rightColumnAvailableSpace > 0 && columnHeights[1] + itemHeight <= availableHeight + heightMargin) {
            targetColumn = 1; // 오른쪽 단에 배치
          } else {
            // 오른쪽 단에 정말 안 들어가면 새 페이지
            startNewPage();
            targetColumn = 0; // 새 페이지는 왼쪽 컬럼부터 시작
          }
        } else {
          // 이전 청크가 오른쪽 단에 있었으면 다음 페이지 왼쪽 단에 배치
          startNewPage();
          targetColumn = 0; // 새 페이지는 왼쪽 컬럼부터 시작
        }
      } else {
        // 다른 유형의 경우: 기존 로직 유지
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
          // 사용자가 지적한 대로 왼쪽 컬럼 하단 여백을 최대한 활용하기 위해 여유를 더 늘림
          const heightMargin = availableHeight * 0.2; // 20% 여유 (과대평가 보정) - 왼쪽 컬럼 여백 활용
          const leftColumnAvailableSpace = availableHeight - columnHeights[0];
          
          // 왼쪽 단에 공간이 있고, 아이템이 들어갈 수 있으면 왼쪽 단에 배치
          // 여유를 충분히 두어 실제로 들어갈 수 있는 경우를 모두 포함
          // 사용자가 지적한 대로 왼쪽 컬럼 하단 여백을 최대한 활용
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
      }
    } else if ((isNewType || isNewProblem) && lastItemColumn !== null) {
      // 다른 유형이 시작되는 경우 또는 유형#07의 경우 다른 문제가 시작되는 경우
      // 이전 유형/문제의 마지막 청크가 배치된 컬럼의 다음 컬럼에 배치
      // 이전 유형/문제가 왼쪽 단(0)에 있었으면 오른쪽 단(1)에 배치
      // 이전 유형/문제가 오른쪽 단(1)에 있었으면 다음 페이지 왼쪽 단(0)에 배치
      if (lastItemColumn === 0) {
        // 이전 유형/문제가 왼쪽 단에 있었으면 오른쪽 단에 배치
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
        // 이전 유형/문제가 오른쪽 단에 있었으면 다음 페이지 왼쪽 단에 배치
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
    if (currentProblemIndex !== undefined) {
      lastProblemIndex = currentProblemIndex; // 현재 아이템의 문제 번호 기록 (유형#07용)
    }
  });

  // 마지막 currentPage가 비어있지 않은 경우에만 추가
  if (currentPage[0].length > 0 || currentPage[1].length > 0) {
    pages.push(currentPage);
  }
  
  // 빈 페이지 필터링 (안전장치) - 더 엄격한 체크
  const finalPages = pages.filter((page, pageIndex) => {
    const leftColumnItems = page[0] || [];
    const rightColumnItems = page[1] || [];
    const leftColumnEmpty = leftColumnItems.length === 0;
    const rightColumnEmpty = rightColumnItems.length === 0;
    const isEmpty = leftColumnEmpty && rightColumnEmpty;
    
    if (isEmpty) {
      console.warn(`⚠️ distributeNormalizedItemsToPages: 빈 페이지 감지 및 제거 (페이지 ${pageIndex + 1})`, {
        leftColumnItems: leftColumnItems.length,
        rightColumnItems: rightColumnItems.length,
        page: page
      });
      return false;
    }
    
    // 추가 검증: 각 컬럼의 아이템이 실제로 섹션을 가지고 있는지 확인
    const leftHasContent = leftColumnItems.some(item => item.sections && item.sections.length > 0);
    const rightHasContent = rightColumnItems.some(item => item.sections && item.sections.length > 0);
    
    if (!leftHasContent && !rightHasContent) {
      console.warn(`⚠️ distributeNormalizedItemsToPages: 빈 섹션 페이지 감지 및 제거 (페이지 ${pageIndex + 1})`, {
        leftColumnItems: leftColumnItems.length,
        rightColumnItems: rightColumnItems.length
      });
      return false;
    }
    
    return true;
  });
  
  if (finalPages.length !== pages.length) {
    console.log(`📄 distributeNormalizedItemsToPages: 빈 페이지 필터링 결과: ${pages.length}개 → ${finalPages.length}개 (${pages.length - finalPages.length}개 제거)`);
  }
  
  // 디버깅: 유형#11의 경우 최종 페이지 상태 확인
  if (process.env.NODE_ENV === 'development' && normalizedItems.length > 0 && normalizedItems[0].workTypeId === '11') {
    console.log('🔍 유형#11 최종 페이지 상태:', {
      totalPages: finalPages.length,
      pages: finalPages.map((page, pageIdx) => ({
        pageIndex: pageIdx + 1,
        leftColumnItems: page[0].length,
        rightColumnItems: page[1].length,
        leftColumnSections: page[0].flatMap(item => item.sections.map(s => s.type)),
        rightColumnSections: page[1].flatMap(item => item.sections.map(s => s.type))
      }))
    });
  }

  return finalPages;
};



