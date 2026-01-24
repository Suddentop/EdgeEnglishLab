import React from 'react';
import PrintHeaderPackage02 from './PrintHeaderPackage02';
import './PrintFormatPackage02.css';
import {
  OPTION_LABELS,
  WORK_TYPE_LABELS,
  PrintSection,
  PrintOptionItem,
  NormalizedQuizItem,
  normalizeQuizItemForPrint,
  formatBlankedTextForWork13,
  formatBlankedText
} from './printNormalization';
import { renderNormalizedCardNode } from './printRenderers';
import {
  COLUMN_CONFIG,
  getAvailableColumnHeight,
  calculateTextHeight,
  calculateSentenceHeight,
  splitNormalizedItemByHeight,
  distributeNormalizedItemsToPages,
  estimateNormalizedItemHeight
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
    if (!text) return '';
    
    // 모든 교체된 단어를 본문에서 찾아 강조 (문장별 매칭이 아닌 전체 본문에서 찾기)
    let result = text;
    
    // 각 교체된 단어를 순서대로 찾아서 강조 (나중에 교체된 단어가 이전 교체된 단어를 포함할 수 있으므로 역순으로 처리)
    // 먼저 모든 교체된 단어를 정렬: 긴 단어를 먼저 처리하여 짧은 단어가 긴 단어의 일부를 교체하는 것을 방지
    const sortedReplacements = [...replacements].sort((a, b) => {
      const aLength = (a.replacement || '').length;
      const bLength = (b.replacement || '').length;
      return bLength - aLength; // 긴 단어 먼저
    });
    
    sortedReplacements.forEach((replacement) => {
      if (!replacement || !replacement.replacement) return;
      
        const word = replacement.replacement;
      // 단어 경계를 포함한 정규식 (대소문자 구분 없음)
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      
      // 글로벌 검색으로 모든 매칭 찾기
      const matches: Array<{ index: number; length: number; match: string }> = [];
      let match;
      while ((match = regex.exec(result)) !== null) {
        // 이미 <span> 태그로 감싸져 있는지 확인
        const beforeMatch = result.substring(Math.max(0, match.index - 50), match.index);
        const afterMatch = result.substring(match.index + match[0].length, Math.min(result.length, match.index + match[0].length + 50));
        const isAlreadyWrapped = beforeMatch.includes('<span class="print-word-highlight">') || 
                                  beforeMatch.includes(`<span class="print-word-highlight">${match[0]}`);
        
        if (!isAlreadyWrapped) {
          matches.push({
            index: match.index,
            length: match[0].length,
            match: match[0]
          });
        }
      }
      
      // 역순으로 교체 (인덱스가 변경되지 않도록)
      matches.reverse().forEach(({ index, match: matchedText }) => {
        const before = result.substring(0, index);
        const after = result.substring(index + matchedText.length);
        result = before + `<span class="print-word-highlight">${matchedText}</span>` + after;
      });
    });
    
    return result;
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
    if (process.env.NODE_ENV === 'development') {
    console.log('🖨️ 패키지#02 인쇄 페이지 렌더링 - 패키지#03과 동일한 로직:', packageQuiz.map((item, index) => 
      `${index + 1}. 유형#${item.workTypeId || 'unknown'}`
    ));
    }
    
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
        // 유형#13, #14의 경우 빈칸 표시 변환 후 높이 계산
        let blankedTextForHeight = data.blankedText || '';
        if ((quizItem.workTypeId === '13' || quizItem.workTypeId === '14') && Array.isArray(data?.correctAnswers)) {
          blankedTextForHeight = formatBlankedText(
            data.blankedText || '',
            data.correctAnswers
          );
        }
        estimatedHeight += calculateTextHeight(blankedTextForHeight, 0.32);
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
        sectionCount: normalized.sections.length,
        sectionTypes: normalized.sections.map(s => s.type),
        // 유형#06의 경우 정답 섹션 확인
        ...(normalized.workTypeId === '06' ? {
          hasAnswerSection: normalized.sections.some(s => s.type === 'answer'),
          answerSection: normalized.sections.find(s => s.type === 'answer'),
          allSections: normalized.sections.map((s, idx) => ({ 
            index: idx, 
            type: s.type, 
            key: s.key,
            ...(s.type === 'answer' ? { items: s.items } : {}),
            ...(s.type === 'paragraph' && s.meta?.variant === 'numbered-passage' ? { variant: 'numbered-passage' } : {})
          }))
        } : {})
      });
      return normalized;
    });

    const expandedNormalizedItems = normalizedItems.flatMap((item) =>
      splitNormalizedItemByHeight(item, { isPackage02: true })
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
    
    // 디버깅: 유형#01의 경우 페이지 상태 확인
    if (packageQuiz.some(item => item.workTypeId === '01' || (item.quiz && item.quiz.shuffledParagraphs))) {
      console.log('🔍 유형#01 페이지 상태 확인:', {
        totalPages: distributedPages.length,
        pages: distributedPages.map((page, idx) => ({
          pageIndex: idx + 1,
          leftColumnItems: page[0]?.length || 0,
          rightColumnItems: page[1]?.length || 0,
          isEmpty: (page[0]?.length || 0) === 0 && (page[1]?.length || 0) === 0
        }))
      });
    }

    // 패키지#02: 마지막 단에 본문해석 추가 (인쇄 정답 모드일 때만)
    // 모든 유형이 공유하는 하나의 영어본문의 해석을 맨 마지막 단에 추가
    let lastTranslation: string | null = null;
    if (isAnswerMode && packageQuiz.length > 0) {
      // 전체 해석을 찾기: 모든 유형이 공유하는 원본 영어본문의 해석
      // 유형#01의 경우 섞인 단락 A, B, C의 해석만 포함할 수 있으므로,
      // 다른 유형의 translatedText를 우선 사용 (전체 본문 해석)
      
      // 먼저 유형#01이 아닌 유형의 translatedText 확인 (전체 본문 해석)
      for (const quizItem of packageQuiz) {
        // 유형#01이 아닌 경우만 확인 (유형#01은 섞인 단락 해석만 포함할 수 있음)
        if (quizItem.workTypeId !== '01' && quizItem.translatedText && quizItem.translatedText.trim()) {
          lastTranslation = quizItem.translatedText;
          break; // 첫 번째로 찾은 전체 본문 해석 사용
        }
      }
      
      // 유형#01이 아닌 유형에서 전체 해석을 찾지 못한 경우
      // 유형#01을 포함하여 다시 확인 (유형#01의 경우 originalText의 전체 해석이 있을 수 있음)
      if (!lastTranslation) {
        for (const quizItem of packageQuiz) {
          // 유형#01의 경우 quiz.originalText의 전체 해석을 확인
          if (quizItem.workTypeId === '01' && quizItem.quiz) {
            const work01Quiz = quizItem.quiz;
            // originalText의 전체 해석 확인
            if (work01Quiz.originalTranslation && work01Quiz.originalTranslation.trim()) {
              lastTranslation = work01Quiz.originalTranslation;
              break;
            }
            // originalTranslation이 없으면 translation 확인 (전체 본문 해석일 수 있음)
            if (work01Quiz.translation && work01Quiz.translation.trim() && 
                !work01Quiz.translation.includes('[번역 실패')) {
              // 단락별 번역이 아닌 전체 본문 번역인지 확인
              // paragraphs가 있고 translation이 단락별 번역의 조합이 아닌 경우에만 사용
              const isParagraphTranslation = work01Quiz.paragraphs && 
                work01Quiz.paragraphs.some((p: any) => p.translation && 
                  work01Quiz.translation.includes(p.translation));
              
              if (!isParagraphTranslation) {
                lastTranslation = work01Quiz.translation;
                break;
              }
            }
          } else if (quizItem.translatedText && quizItem.translatedText.trim()) {
            // 다른 유형의 translatedText 확인
            lastTranslation = quizItem.translatedText;
            break;
          }
        }
      }
      
      // 여전히 전체 해석을 찾지 못한 경우, 첫 번째 유형의 translation 확인
      if (!lastTranslation) {
        const firstItem = packageQuiz[0];
        const translation = getTranslatedText(firstItem, firstItem.quiz || firstItem.data || {});
        if (translation && translation.trim()) {
          lastTranslation = translation;
        }
      }
    }

    // 마지막 유형 다음 단에 translation 섹션 추가
    // 마지막 유형이 있는 페이지의 다음 단(오른쪽 단)에 추가
    if (isAnswerMode && lastTranslation) {
      // 마지막 유형의 translation 섹션 생성
      const translationText = lastTranslation;
      const translationSection: PrintSection = {
        type: 'translation',
        key: 'translation-last-item',
        text: translationText
      };
      
      // translation 섹션을 포함하는 NormalizedQuizItem 생성
      const translationItem: NormalizedQuizItem = {
        workTypeId: 'all',
        sections: [translationSection],
        originalItem: null,
        chunkMeta: {}
      };
      
      // translation 섹션의 높이 계산
      const translationHeight = estimateNormalizedItemHeight(translationItem);
      const PAGE_HEIGHT = 21; // A4 가로 페이지 높이 (cm)
      const HEADER_HEIGHT = 1.2; // 헤더 높이 (cm)
      const CONTENT_BOTTOM_PADDING = 0.5; // 콘텐츠 하단 패딩 (cm)
      const availableHeight = PAGE_HEIGHT - HEADER_HEIGHT - CONTENT_BOTTOM_PADDING; // 19.3cm
      
      // 마지막 페이지 확인 및 다음 단 결정
      if (distributedPages.length > 0) {
        const lastPage = distributedPages[distributedPages.length - 1];
        // 마지막 유형이 오른쪽 단에 있는지 왼쪽 단에 있는지 확인
        const leftColumnHeight = lastPage[0].reduce((sum, item) => sum + estimateNormalizedItemHeight(item), 0);
        const rightColumnHeight = lastPage[1].reduce((sum, item) => sum + estimateNormalizedItemHeight(item), 0);
        
        // 마지막 유형이 있는 단 결정 (둘 다 있으면 오른쪽 단, 오른쪽 단만 있으면 오른쪽 단, 왼쪽 단만 있으면 왼쪽 단)
        let lastItemColumnIndex = 0;
        if (lastPage[1].length > 0) {
          // 오른쪽 단에 아이템이 있으면 마지막 유형은 오른쪽 단에 있음
          lastItemColumnIndex = 1;
        } else if (lastPage[0].length > 0) {
          // 왼쪽 단에만 아이템이 있으면 마지막 유형은 왼쪽 단에 있음
          lastItemColumnIndex = 0;
        }
        
        // 다음 단 결정: 마지막 유형이 왼쪽 단에 있으면 오른쪽 단, 오른쪽 단에 있으면 다음 페이지의 왼쪽 단
        let targetColumnIndex = lastItemColumnIndex === 0 ? 1 : 0; // 다음 단 (왼쪽이면 오른쪽, 오른쪽이면 왼쪽... 아니다, 오른쪽이면 다음 페이지의 왼쪽)
        let targetPage = lastPage;
        
        if (lastItemColumnIndex === 0) {
          // 마지막 유형이 왼쪽 단에 있으면 -> 오른쪽 단에 추가 시도
          targetColumnIndex = 1;
          targetPage = lastPage;
          
          // 오른쪽 단의 현재 높이 확인
          const rightColumnCurrentHeight = rightColumnHeight;
          
          // 오른쪽 단에 들어갈 수 있는지 확인
          if (rightColumnCurrentHeight + translationHeight <= availableHeight) {
            // 오른쪽 단에 추가
            targetPage[targetColumnIndex].push(translationItem);
            
            console.log('✅ 마지막 유형의 한글해석 섹션을 마지막 페이지의 오른쪽 단에 추가:', {
              pageIndex: distributedPages.length - 1,
              columnIndex: targetColumnIndex,
              lastItemColumn: lastItemColumnIndex,
              rightColumnHeight: rightColumnCurrentHeight.toFixed(2) + 'cm',
              translationHeight: translationHeight.toFixed(2) + 'cm',
              lastWorkTypeId: packageQuiz.length > 0 ? packageQuiz[packageQuiz.length - 1].workTypeId : 'unknown'
            });
          } else {
            // 오른쪽 단에 들어갈 수 없으면 -> 새 페이지 생성을 방지하기 위해 해석 생략
            // 사용자의 요청: "빈 페이지가 추가되고 있다" -> 불필요한 페이지 생성을 막아야 함
            // 특히 1페이지로 끝날 수 있는 상황에서 해석 때문에 2페이지가 되는 것을 방지
            
            console.log('🚫 공간 부족으로 마지막 한글해석 섹션 추가 생략 (새 페이지 방지):', {
              pageIndex: distributedPages.length - 1,
              rightColumnHeight: rightColumnCurrentHeight.toFixed(2) + 'cm',
              translationHeight: translationHeight.toFixed(2) + 'cm',
              availableHeight: availableHeight.toFixed(2) + 'cm',
              lastWorkTypeId: packageQuiz.length > 0 ? packageQuiz[packageQuiz.length - 1].workTypeId : 'unknown'
            });
          }
        } else {
          // 마지막 유형이 오른쪽 단에 있으면 -> 새 페이지 생성을 방지하기 위해 해석 생략
          // 사용자의 요청: "빈 페이지가 추가되고 있다" -> 불필요한 페이지 생성을 막아야 함
          
          console.log('🚫 마지막 유형이 오른쪽 단에 있어 한글해석 섹션 추가 생략 (새 페이지 방지):', {
            pageIndex: distributedPages.length - 1,
            lastItemColumn: lastItemColumnIndex,
            translationHeight: translationHeight.toFixed(2) + 'cm',
            lastWorkTypeId: packageQuiz.length > 0 ? packageQuiz[packageQuiz.length - 1].workTypeId : 'unknown'
          });
        }
      } else {
        // 페이지가 없으면 -> 해석 생략
        console.log('🚫 페이지가 없어 한글해석 섹션 추가 생략:', {
          lastWorkTypeId: packageQuiz.length > 0 ? packageQuiz[packageQuiz.length - 1].workTypeId : 'unknown'
        });
      }
    }

    // 빈 페이지 필터링 (양쪽 컬럼이 모두 비어있는 페이지 제거) - 강화된 버전
    const filteredPages = distributedPages.filter((pageColumns: NormalizedQuizItem[][], pageIndex: number) => {
      // 더 엄격한 체크: 배열이 존재하고, 각 컬럼이 존재하며, 각 컬럼에 실제 아이템이 있는지 확인
      const leftColumnItems = pageColumns[0] || [];
      const rightColumnItems = pageColumns[1] || [];
      const leftColumnEmpty = leftColumnItems.length === 0;
      const rightColumnEmpty = rightColumnItems.length === 0;
      const isEmpty = leftColumnEmpty && rightColumnEmpty;
      
      if (isEmpty) {
        console.warn(`⚠️ 빈 페이지 감지 및 제거: 페이지 ${pageIndex + 1}`, {
          leftColumnItems: leftColumnItems.length,
          rightColumnItems: rightColumnItems.length,
          pageColumns: pageColumns
        });
        return false; // 빈 페이지는 제거
      }
      
      // 추가 검증: 각 컬럼의 아이템이 실제로 섹션을 가지고 있는지 확인
      const leftHasContent = leftColumnItems.some(item => item.sections && item.sections.length > 0);
      const rightHasContent = rightColumnItems.some(item => item.sections && item.sections.length > 0);
      
      if (!leftHasContent && !rightHasContent) {
        console.warn(`⚠️ 빈 섹션 페이지 감지 및 제거: 페이지 ${pageIndex + 1}`, {
          leftColumnItems: leftColumnItems.length,
          rightColumnItems: rightColumnItems.length
        });
        return false; // 섹션이 없는 페이지도 제거
      }
      
      return true; // 유효한 페이지
    });
    
    console.log(`📄 페이지 필터링 결과: ${distributedPages.length}개 → ${filteredPages.length}개 (빈 페이지 ${distributedPages.length - filteredPages.length}개 제거)`);

    filteredPages.forEach((pageColumns: NormalizedQuizItem[][], pageIndex: number) => {
      // 빈 페이지 재확인 (이중 안전장치) - 더 엄격한 체크
      const leftColumnItems = pageColumns[0] || [];
      const rightColumnItems = pageColumns[1] || [];
      const leftColumnEmpty = leftColumnItems.length === 0;
      const rightColumnEmpty = rightColumnItems.length === 0;
      
      if (leftColumnEmpty && rightColumnEmpty) {
        console.warn(`⚠️ 렌더링 단계에서 빈 페이지 감지 및 건너뜀: 페이지 ${pageIndex + 1}`);
        return; // 빈 페이지는 렌더링하지 않음
      }
      
      // 추가 검증: 각 컬럼의 아이템이 실제로 섹션을 가지고 있는지 확인
      const leftHasContent = leftColumnItems.some(item => item.sections && item.sections.length > 0);
      const rightHasContent = rightColumnItems.some(item => item.sections && item.sections.length > 0);
      
      if (!leftHasContent && !rightHasContent) {
        console.warn(`⚠️ 렌더링 단계에서 빈 섹션 페이지 감지 및 건너뜀: 페이지 ${pageIndex + 1}`);
        return; // 섹션이 없는 페이지도 렌더링하지 않음
      }
      
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

      // 마지막 페이지인지 확인
      const isLastPage = pageIndex === filteredPages.length - 1;
      
      pages.push(
        <div
          key={`page-${pageIndex}`}
          id={`print-page-${pageIndex}`}
          className={`print-page a4-landscape-page-template ${isLastPage ? 'last-page' : ''}`}
          style={isLastPage ? { 
            pageBreakAfter: 'avoid',
            breakAfter: 'avoid',
            marginBottom: 0,
            paddingBottom: 0
          } : undefined}
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

