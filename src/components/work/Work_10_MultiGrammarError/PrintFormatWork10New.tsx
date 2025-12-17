import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css';
import {
  NormalizedQuizItem,
  PrintSection
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';
import { MultiGrammarQuiz } from '../../../services/work10Service';

interface MultiGrammarQuizWithId extends MultiGrammarQuiz {
  id?: string;
}

interface PrintFormatWork10NewProps {
  quizzes: MultiGrammarQuizWithId[];
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

// 3. 선택지 (9.35pt, line-height 1.3)
const CHARS_PER_LINE_OPTION = 75; // 영어 기준
const HEIGHT_PER_OPTION = 21; // 15.6px + 마진 4.5px ≈ 20.1px -> 21px

// 섹션 높이 계산 상세 정보 반환 (디버깅용)
const getSectionHeightDetails = (section: PrintSection, calculatedHeight: number): any => {
  switch (section.type) {
    case 'html': {
      const textContent = section.html ? section.html.replace(/<[^>]*>/g, '') : '';
      const paragraphs = textContent.split('\n');
      let totalLines = 0;
      paragraphs.forEach(p => {
        if (p.trim().length > 0) {
           totalLines += Math.ceil(p.length / CHARS_PER_LINE_ENG);
        }
      });
      totalLines = Math.max(1, totalLines);
      return {
        textLength: textContent.length,
        paragraphs: paragraphs.length,
        estimatedLines: totalLines,
        lineHeight: LINE_HEIGHT_ENG,
        basePadding: 30,
        calculation: `${totalLines}줄 × ${LINE_HEIGHT_ENG}px + 30px = ${calculatedHeight}px`
      };
    }
    case 'options': {
      const optionDetails = section.options?.map(opt => {
        const textLen = (opt.text || '').length + 5;
        const lines = Math.ceil(textLen / CHARS_PER_LINE_OPTION);
        const optionHeight = HEIGHT_PER_OPTION + ((lines - 1) * 18);
        return {
          text: opt.text?.substring(0, 30) + '...',
          textLength: textLen,
          lines,
          height: optionHeight
        };
      }) || [];
      return {
        optionCount: section.options?.length || 0,
        baseHeight: 15,
        options: optionDetails,
        calculation: `15px + ${optionDetails.map(o => `${o.height}px`).join(' + ')} = ${calculatedHeight}px`
      };
    }
    case 'translation': {
      const textContent = section.text || '';
      const paragraphs = textContent.split('\n');
      let totalLines = 0;
      paragraphs.forEach(p => {
        if (p.trim().length > 0) {
           totalLines += Math.ceil(p.length / CHARS_PER_LINE_KOR);
        }
      });
      totalLines = Math.max(1, totalLines);
      return {
        textLength: textContent.length,
        paragraphs: paragraphs.length,
        estimatedLines: totalLines,
        lineHeight: LINE_HEIGHT_KOR,
        basePadding: 40,
        calculation: `${totalLines}줄 × ${LINE_HEIGHT_KOR}px + 40px = ${calculatedHeight}px`
      };
    }
    case 'text': {
      const textContent = section.text || '';
      const textLength = textContent.length;
      const lines = Math.max(1, Math.ceil(textLength / 75));
      return {
        textLength,
        estimatedLines: lines,
        lineHeight: 18,
        basePadding: 10,
        calculation: `${lines}줄 × 18px + 10px = ${calculatedHeight}px`
      };
    }
    default:
      return { fixed: calculatedHeight };
  }
};

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
      // 본문: 패딩 0.25cm * 2 + 마진 0.25cm ≈ 28px
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
    case 'options': {
      // 컨테이너 마진/패딩
      let totalOptionHeight = 15; 
      section.options?.forEach(opt => {
        const textLen = (opt.text || '').length + 5; // 번호 길이 포함
        // 옵션 텍스트가 길어서 줄바꿈 되는 경우 고려
        const lines = Math.ceil(textLen / CHARS_PER_LINE_OPTION);
        // 기본 1줄일 때 HEIGHT_PER_OPTION, 줄바꿈 되면 줄당 높이 추가
        const optionHeight = HEIGHT_PER_OPTION + ((lines - 1) * 18);
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

      return (totalLines * LINE_HEIGHT_KOR) + 40; // 제목영역 등 고려 40px
    }
    case 'text': {
      // 정답 텍스트 등 - 텍스트 길이에 따라 높이 계산
      const textContent = section.text || '';
      const textLength = textContent.length;
      // 텍스트가 길면 줄바꿈 고려 (한 줄당 약 75자, 줄당 18px)
      const lines = Math.max(1, Math.ceil(textLength / 75));
      return (lines * 18) + 10; // 기본 패딩/마진 10px
    }
    default:
      return 20;
  }
};

const PrintFormatWork10New: React.FC<PrintFormatWork10NewProps> = ({ quizzes, isAnswerMode }) => {
  // 디버깅: 전달받은 quizzes 데이터 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('🖨️ PrintFormatWork10New 렌더링:', {
      isAnswerMode,
      quizzesCount: quizzes.length,
      quizzes: quizzes.map((q, i) => ({
        index: i + 1,
        hasTranslation: !!q.translation,
        translationLength: q.translation?.length || 0,
        translationPreview: q.translation?.substring(0, 50) || '없음',
        quizKeys: Object.keys(q)
      }))
    });
  }
  
  // Work_10 데이터를 NormalizedQuizItem으로 변환
  const normalizeWork10Quiz = (quiz: MultiGrammarQuizWithId, index: number): NormalizedQuizItem => {
    const sections: PrintSection[] = [];
    const workTypeId = '10';

    // 1. 문제 타이틀
    sections.push({
      type: 'title',
      key: `title-${index}`,
      text: `문제 ${index + 1} : 다중 어법 오류 찾기`,
      workTypeId
    });

    // 2. 문제 지시문
    sections.push({
      type: 'instruction',
      key: `instruction-${index}`,
      text: '다음 글의 밑줄 친 부분 중, 어법상 틀린 단어가 총 몇 개인지 고르시오.',
      meta: { workTypeId }
    });

    // 3. 영어 본문 (numberedPassage) - HTML 형식
    // renderSectionNode에서 자동으로 print-html-block 클래스를 추가하므로 외부 div 제거
    sections.push({
      type: 'html',
      key: `html-passage-${index}`,
      html: quiz.numberedPassage
    });

    // 4. 선택지 - options 타입 사용 (세로 배치 보장)
    // Work_10의 options는 number[] (예: [3,4,5,6,7,8])
    // 정답 모드일 때는 정답 항목만 표시
    if (isAnswerMode) {
      // 정답 모드: 정답 항목만 표시
      const answerIndex = Number(quiz.answerIndex);
      const answerOption = quiz.options[answerIndex];
      const answerLabel = ['①', '②', '③', '④', '⑤', '⑥'][answerIndex] || `${answerIndex + 1}.`;
      
      sections.push({
        type: 'options',
        key: `options-${index}`,
        options: [{
          label: answerLabel,
          text: `${answerOption}개`,
          isCorrect: true
        }]
      });
      
      // 틀린 단어 정보 추가
      if (quiz.wrongIndexes && quiz.wrongIndexes.length > 0 && 
          quiz.transformedWords && quiz.originalWords) {
        const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
        const wrongWordsInfo = quiz.wrongIndexes.map(idx => {
          const circleNum = circleNumbers[idx] || `${idx + 1}.`;
          return `${circleNum}${quiz.transformedWords[idx]} → ${quiz.originalWords[idx]}`;
        }).join(', ');
        
        sections.push({
          type: 'text',
          key: `wrong-words-${index}`,
          text: `틀린단어/원래단어 : ${wrongWordsInfo}`,
          meta: { 
            workTypeId,
            compactSpacing: true // 간격 줄이기 플래그
          }
        });
      }
    } else {
      // 문제 모드: 모든 선택지 표시
      const options = quiz.options.map((opt, i) => ({
        label: ['①', '②', '③', '④', '⑤', '⑥'][i] || `${i+1}.`,
        text: `${opt}개`,
        isCorrect: false
      }));
      
      sections.push({
        type: 'options',
        key: `options-${index}`,
        options: options
      });
    }

    // 5. 정답 모드일 때 해석 (항상 추가)
    if (isAnswerMode) {
      const translationText = quiz.translation || '';
      
      // translation이 없거나 빈 문자열인 경우 디버깅
      if (!translationText || translationText.trim() === '') {
        console.warn(`⚠️ Work_10 문제 ${index + 1}: translation이 없습니다.`, {
          quizId: quiz.id,
          hasTranslation: !!quiz.translation,
          translationValue: quiz.translation,
          translationType: typeof quiz.translation,
          quizKeys: Object.keys(quiz),
          fullQuiz: quiz
        });
      }
      
      // translation 섹션은 항상 추가 (빈 값이어도 레이블은 표시)
      sections.push({
        type: 'translation',
        key: `translation-${index}`,
        text: translationText.trim() || '번역이 제공되지 않았습니다.'
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Work_10 문제 ${index + 1}: translation 섹션 추가됨`, {
          hasText: !!translationText,
          textLength: translationText.length,
          sectionKey: `translation-${index}`
        });
      }
    }

    return {
      originalItem: quiz,
      workTypeId: workTypeId,
      sections: sections,
      chunkMeta: { chunkIndex: 0, totalChunks: 1 }
    };
  };

  // 1. 데이터 정규화
  const normalizedItems = quizzes.map((quiz, index) => normalizeWork10Quiz(quiz, index));
  
  // 디버깅: 정규화 후 translation 섹션 확인
  if (process.env.NODE_ENV === 'development') {
    normalizedItems.forEach((item, index) => {
      const transSections = item.sections.filter(s => s.type === 'translation');
      console.log(`📋 Work_10 문제 ${index + 1} 정규화 후:`, {
        totalSections: item.sections.length,
        translationSections: transSections.length,
        translationTexts: transSections.map(s => ({
          key: s.key,
          textLength: s.text?.length || 0,
          textPreview: s.text?.substring(0, 50) || '없음'
        }))
      });
    });
  }

  // 2. 페이지 분배 (정밀 로직 적용 - 높이 기반 분배)
  const distributeItemsCustom = (items: NormalizedQuizItem[]) => {
    const pages: NormalizedQuizItem[][][] = [];
    let currentColumns: NormalizedQuizItem[][] = [[], []]; // [Left, Right]
    let currentColumnHeights: number[] = [0, 0]; // 각 단의 누적 높이 추적
    let currentColumnIndex = 0;

    // 현재 단의 누적 높이 계산 (실제 계산)
    const getCurrentColumnHeight = (): number => {
      return currentColumns[currentColumnIndex].reduce((sum, item) => {
        return sum + item.sections.reduce((itemSum, section) => {
          return itemSum + estimateSectionHeight(section);
        }, 0);
      }, 0);
    };

    const moveToNextColumn = () => {
      // 현재 단 높이 업데이트
      currentColumnHeights[currentColumnIndex] = getCurrentColumnHeight();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 단 이동: ${currentColumnIndex === 0 ? '왼쪽' : '오른쪽'} → ${currentColumnIndex === 0 ? '오른쪽' : '새 페이지'}, 현재 페이지 수: ${pages.length}`);
      }
      
      currentColumnIndex++;
      if (currentColumnIndex > 1) {
        // 새 페이지 생성
        pages.push([...currentColumns.map(col => [...col])]); // 깊은 복사
        if (process.env.NODE_ENV === 'development') {
          console.log(`📄 새 페이지 생성 완료 (페이지 ${pages.length}), 이전 페이지 내용:`, {
            leftColumnItems: currentColumns[0].length,
            rightColumnItems: currentColumns[1].length
          });
        }
        currentColumns = [[], []];
        currentColumnHeights = [0, 0];
        currentColumnIndex = 0;
      }
    };

    const addToCurrentColumn = (item: NormalizedQuizItem) => {
      currentColumns[currentColumnIndex].push(item);
      // 높이 업데이트
      const itemHeight = item.sections.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      currentColumnHeights[currentColumnIndex] += itemHeight;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`➕ 아이템 추가: ${currentColumnIndex === 0 ? '왼쪽' : '오른쪽'} 단, 아이템 높이: ${itemHeight}px, 누적 높이: ${currentColumnHeights[currentColumnIndex]}px`);
      }
    };

    items.forEach((item, itemIndex) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔄 ========== 아이템 ${itemIndex + 1}/${items.length} 처리 시작 ==========`);
      }
      
      // 1. 아이템 높이 정밀 분석
      const mainSections = item.sections.filter(s => s.type !== 'translation');
      const transSections = item.sections.filter(s => s.type === 'translation');

      const mainHeight = mainSections.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const transHeight = transSections.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const totalHeight = mainHeight + transHeight;

      // 현재 단의 누적 높이 확인 (실제 계산된 값 사용)
      const currentHeight = getCurrentColumnHeight();
      const wouldExceedHeight = currentHeight + totalHeight > PAGE_HEIGHT_PX;

      if (process.env.NODE_ENV === 'development') {
        // 각 섹션별 상세 높이 계산 로그
        const sectionHeights = item.sections.map(s => {
          const height = estimateSectionHeight(s);
          return {
            type: s.type,
            key: s.key,
            height,
            details: getSectionHeightDetails(s, height)
          };
        });
        
        console.log(`📏 아이템 ${itemIndex + 1} 높이 분석:`, {
          currentColumn: currentColumnIndex === 0 ? '왼쪽' : '오른쪽',
          currentPage: pages.length + 1,
          currentHeight,
          mainHeight,
          transHeight,
          totalHeight,
          wouldExceedHeight,
          pageHeightLimit: PAGE_HEIGHT_PX,
          currentColumnItems: currentColumns[currentColumnIndex].length,
          sectionCount: item.sections.length,
          sectionHeights: sectionHeights,
          mainSections: mainSections.map(s => ({ type: s.type, key: s.key, height: estimateSectionHeight(s) })),
          transSections: transSections.map(s => ({ type: s.type, key: s.key, height: estimateSectionHeight(s) }))
        });
      }

      // 🔥 핵심 수정: 현재 단에 내용이 있으면 무조건 다음 단으로 이동 (각 문제를 독립적으로 처리)
      if (currentColumns[currentColumnIndex].length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`➡️ 다음 단으로 이동 (현재 단에 문제가 있음): 각 문제는 독립적으로 처리`);
        }
        moveToNextColumn();
      }

      // 2. 분할 결정
      // 전체 높이가 페이지 높이(730px)를 초과하고, 본문+선택지는 페이지 높이보다 작은 경우에만 분할
      if (isAnswerMode && transSections.length > 0 && totalHeight > PAGE_HEIGHT_PX && mainHeight < PAGE_HEIGHT_PX) {
        // 분할 처리
        if (process.env.NODE_ENV === 'development') {
          console.log(`✂️ 아이템 ${itemIndex + 1} 분할 처리: 본문(${mainHeight}px) + 번역(${transHeight}px)`);
        }
        
        // Item A: 본문 + 선택지
        const itemMain: NormalizedQuizItem = {
          ...item,
          sections: mainSections,
        };

        // Item B: 해석
        const itemTrans: NormalizedQuizItem = {
          originalItem: item.originalItem,
          workTypeId: item.workTypeId,
          sections: transSections,
          chunkMeta: { ...item.chunkMeta, isSplitPart: true }
        };

        // Item A를 현재 단에 배치 (높이 확인)
        const currentHeightForMain = getCurrentColumnHeight();
        if (currentHeightForMain + mainHeight > PAGE_HEIGHT_PX && currentColumns[currentColumnIndex].length > 0) {
          moveToNextColumn();
        }
        addToCurrentColumn(itemMain);

        // Item B(해석)를 다음 단으로 이동하여 배치
        moveToNextColumn();
        addToCurrentColumn(itemTrans);
      } else {
        // 분할 불필요 (한 단에 모두 들어가거나, 본문 자체가 너무 커서 분할 의미가 없는 경우)
        // 높이 확인 후 현재 단에 추가
        const currentHeightForItem = getCurrentColumnHeight();
        if (currentHeightForItem + totalHeight > PAGE_HEIGHT_PX && currentColumns[currentColumnIndex].length > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`➡️ 다음 단으로 이동 (분할 없음, 높이 초과): 현재 ${currentHeightForItem}px + 새 아이템 ${totalHeight}px > ${PAGE_HEIGHT_PX}px`);
          }
          moveToNextColumn();
        }
        addToCurrentColumn(item);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ 아이템 ${itemIndex + 1} 처리 완료. 현재 페이지 수: ${pages.length}, 현재 단: ${currentColumnIndex === 0 ? '왼쪽' : '오른쪽'}`);
      }
    });

    // 마지막 페이지 추가 (남은 내용이 있으면)
    if (currentColumns[0].length > 0 || currentColumns[1].length > 0) {
      pages.push([...currentColumns.map(col => [...col])]); // 깊은 복사
      if (process.env.NODE_ENV === 'development') {
        console.log(`📄 마지막 페이지 추가 완료 (총 ${pages.length}개 페이지)`, {
          leftColumnItems: currentColumns[0].length,
          rightColumnItems: currentColumns[1].length
        });
      }
    }

    // 디버깅: 페이지 분배 후 전체 요약
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n📊 ========== 페이지 분배 완료 ==========`);
      console.log(`총 ${items.length}개 아이템 → ${pages.length}개 페이지 생성`);
      
      pages.forEach((pageColumns, pageIndex) => {
        console.log(`\n📄 페이지 ${pageIndex + 1}:`);
        pageColumns.forEach((column, colIndex) => {
          console.log(`  ${colIndex === 0 ? '왼쪽' : '오른쪽'} 단: ${column.length}개 아이템`);
          column.forEach((item, itemIndex) => {
            const transSections = item.sections.filter(s => s.type === 'translation');
            const itemHeight = item.sections.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
            console.log(`    - 아이템 ${itemIndex + 1}: ${item.sections.length}개 섹션, 높이 ${itemHeight}px`, {
              sectionTypes: item.sections.map(s => s.type),
              hasTranslation: transSections.length > 0
            });
          });
        });
      });
    }

    return pages;
  };

  const distributedPages = distributeItemsCustom(normalizedItems).filter((pageColumns) => {
    // 빈 페이지 제거: 양쪽 단 모두 비어있는 페이지는 제외
    const hasContent = (pageColumns[0]?.length || 0) > 0 || (pageColumns[1]?.length || 0) > 0;
    if (!hasContent && process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ 빈 페이지 감지 및 제거`);
    }
    return hasContent;
  });

  // 디버깅: 분배된 페이지 확인
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n🎨 렌더링 시작: ${distributedPages.length}개 페이지 준비됨`);
    console.log(`📦 distributedPages 타입: ${Array.isArray(distributedPages) ? 'Array' : typeof distributedPages}`);
    console.log(`📦 distributedPages 길이: ${distributedPages.length}`);
    distributedPages.forEach((pageColumns, pageIndex) => {
      console.log(`  페이지 ${pageIndex + 1}: 왼쪽 ${pageColumns[0]?.length || 0}개, 오른쪽 ${pageColumns[1]?.length || 0}개 아이템`);
      console.log(`    - 왼쪽 아이템 키:`, pageColumns[0]?.map((item, idx) => item.sections[0]?.key || `item-${idx}`) || []);
      console.log(`    - 오른쪽 아이템 키:`, pageColumns[1]?.map((item, idx) => item.sections[0]?.key || `item-${idx}`) || []);
    });
    
    // 실제 렌더링될 페이지 수 확인
    console.log(`\n🔍 렌더링 전 최종 확인:`);
    console.log(`  - normalizedItems 수: ${normalizedItems.length}`);
    console.log(`  - distributedPages 수: ${distributedPages.length}`);
    console.log(`  - 각 페이지의 아이템 수:`, distributedPages.map((page, idx) => ({
      page: idx + 1,
      left: page[0]?.length || 0,
      right: page[1]?.length || 0,
      total: (page[0]?.length || 0) + (page[1]?.length || 0)
    })));
  }

  // 3. 렌더링 헬퍼
  const renderNormalizedCard = (
    normalizedItem: NormalizedQuizItem,
    keyPrefix: string
  ): React.ReactNode => {
    return renderNormalizedCardNode(normalizedItem, keyPrefix, { isAnswerMode });
  };

  return (
    <div className={isAnswerMode ? "print-container-answer work10-print" : "print-container work10-print"}>
      {/* 가로 모드 강제 스타일 */}
      <style>{`
        @page {
          size: A4 landscape !important;
          margin: 0 !important;
        }
        @media print {
          html, body {
            width: 29.7cm !important;
            height: auto !important; /* 여러 페이지를 위해 auto로 변경 */
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important; /* 모든 페이지 표시 */
          }
          .work10-print {
            width: 29.7cm !important;
            max-width: 29.7cm !important;
            height: auto !important; /* 내용에 맞게 높이 조절 */
            min-height: 0 !important;
            overflow: visible !important;
          }
          .a4-landscape-page-template {
            width: 29.7cm !important;
            max-width: 29.7cm !important; /* 가로폭 제한 */
            height: 21cm !important;
            max-height: 21cm !important;
            min-height: 20cm !important; /* 테스트: 최소 높이 20cm */
            /* page-break-after는 마지막 페이지가 아닐 때만 적용 */
            page-break-after: always !important;
            break-after: page !important;
            overflow: visible !important; /* 모든 콘텐츠 표시 */
            box-sizing: border-box !important;
            display: block !important; /* 페이지가 블록으로 표시되도록 */
            position: relative !important;
            margin: 0 !important; /* 마진 제거로 가로폭 정확히 29.7cm 유지 */
            padding: 0 !important; /* 패딩 제거 */
          }
          /* 마지막 페이지는 페이지 브레이크 없음 */
          .a4-landscape-page-template:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          /* 빈 페이지 방지: 내용이 없는 페이지는 숨김 */
          .a4-landscape-page-template:empty {
            display: none !important;
            page-break-after: auto !important;
            break-after: auto !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .a4-landscape-page-content {
            height: 19.3cm !important;
            max-height: 19.3cm !important;
            overflow: visible !important; /* 모든 콘텐츠 표시 */
            box-sizing: border-box !important;
          }
          .print-two-column-container {
            display: flex !important;
            height: 19.3cm !important;
            max-height: 19.3cm !important;
            overflow: visible !important; /* 모든 콘텐츠 표시 */
            box-sizing: border-box !important;
          }
          .print-column {
            height: 19.3cm !important;
            max-height: 19.3cm !important;
            overflow: visible !important; /* 모든 콘텐츠 표시 */
            box-sizing: border-box !important;
          }
        }
        /* Work 10 Specific Styles (Work_09와 동일한 패딩 설정) */
        /* 문제 제목 패딩 설정 - 인쇄(문제)와 인쇄(정답) 동일 */
        .work10-print .print-question-title {
            padding-left: 0.2cm !important;
            margin-bottom: 0.25cm !important;
            padding-bottom: 0.15cm !important;
            margin-top: 0 !important;
        }
        /* 첫 번째 카드의 제목: 헤더와의 간격 확보 - 인쇄(문제)와 인쇄(정답) 동일 */
        .work10-print.print-container .print-column > .print-question-card:first-child .print-question-title,
        .work10-print.print-container-answer .print-column > .print-question-card:first-child .print-question-title {
            margin-top: 0.3cm !important;
        }
        .work10-print .print-passage {
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
        }
        .work10-print .print-html-block {
            padding-left: 0.2cm !important;
            padding-right: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
        }
        .work10-print .print-options {
            padding-left: 0.2cm !important;
            padding-right: 0 !important;
            margin-bottom: 0.1cm !important; /* 80% 감소: 0.5cm → 0.1cm (선택지와 텍스트 블록 사이 여백) */
        }
        .work10-print .print-option {
            padding-left: 0 !important;
        }
        /* 선택지 다음에 오는 텍스트 블록 여백 80% 감소 */
        .work10-print .print-options + .print-text-block,
        .work10-print .print-options ~ .print-text-block {
            margin-top: 0.01cm !important; /* 80% 감소: 0.05cm → 0.01cm */
        }
        /* 인쇄(정답) 모드: 각 단 컨테이너 내부 여백 설정 (Work_09와 동일) */
        .work10-print.print-container-answer .print-column {
            padding: 0.1cm 0 0 0.5cm !important;
            margin: 0 !important;
        }
        /* 오른쪽 단: 왼쪽 패딩 제거, 오른쪽 패딩 추가 */
        .work10-print.print-container-answer .print-column:last-child,
        .work10-print.print-container-answer .print-column-right {
            padding: 0.1cm 0.5cm 0 0 !important;
            margin: 0 !important;
        }
        .work10-print.print-container-answer .print-question-card {
            padding: 0.1cm 0 0 0 !important;
            margin: 0 !important;
        }
        /* 인쇄(문제) 모드: 인쇄(정답) 모드와 동일한 여백 적용 */
        .work10-print.print-container .print-column {
            padding: 0.1cm 0 0 0.5cm !important;
            margin: 0 !important;
        }
        /* 오른쪽 단: 왼쪽 패딩 제거, 오른쪽 패딩 추가 */
        .work10-print.print-container .print-column:last-child,
        .work10-print.print-container .print-column-right {
            padding: 0.1cm 0.5cm 0 0 !important;
            margin: 0 !important;
        }
        .work10-print.print-container .print-question-card {
            padding: 0.1cm 0 0 0 !important;
            margin: 0 !important;
        }
        /* 페이지 콘텐츠 패딩 제거 */
        .work10-print .a4-landscape-page-content {
            padding: 0 !important;
        }
        
        .work10-print {
            box-sizing: border-box !important;
            /* A4 가로 폭(29.7cm)보다 약간 작게 설정하여 페이지를 넘지 않도록 함 */
            width: 28cm !important;
            max-width: 28cm !important;
            height: auto !important; /* 내용에 맞게 높이 자동 조절 */
            min-height: 0 !important; /* 내용에 맞게 자동 조절 */
            max-height: none !important; /* 화면 모드에서는 제한 없음 */
            overflow: visible !important;
        }
        @media screen {
          .work10-print {
            overflow-y: visible !important; /* 모든 페이지 표시 */
          }
        }
        .work10-print .a4-landscape-page-template {
            margin: 0 !important; /* 마진 제거 (가로폭 정확히 유지) */
            margin-bottom: 0.5cm !important; /* 페이지 간 간격만 하단에 적용 (화면 모드) */
            box-sizing: border-box !important;
            /* 빨간 컨테이너(28cm)보다 조금 더 작게 설정해 페이지 안에 여유를 둠 */
            width: 27.6cm !important;
            max-width: 27.6cm !important; /* 가로폭 제한 */
            height: auto !important; /* 화면 모드: 내용에 맞게 높이 자동 조절 */
            min-height: 0 !important; /* 내용에 맞게 자동 조절 */
            max-height: 21cm !important; /* 최대 높이 21cm (페이지 높이 초과 방지) */
            overflow: visible !important; /* 화면 모드에서도 모든 콘텐츠 표시 */
            display: block !important;
            position: relative !important;
        }
        @media print {
          .work10-print {
            /* 인쇄 시에는 최상위 컨테이너는 페이지 전체(여러 페이지)를 감싸므로
               페이지 높이 기준 디버깅에는 불필요한 테두리를 제거한다. */
            border: none !important;
            width: 28cm !important;
            max-width: 28cm !important;
            height: auto !important; /* 여러 페이지를 위한 자동 높이 */
            min-height: 0 !important;
            margin: 0 auto !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .work10-print .a4-landscape-page-template {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important; /* 모든 마진 제거 (가로폭 정확히 유지) */
            padding: 0 !important; /* 패딩 제거 */
            /* 실제 인쇄 영역보다 약간 작게 설정하여 우측이 잘리지 않도록 함 */
            width: 27.6cm !important;
            max-width: 27.6cm !important; /* 가로폭 제한 */
            /* 파란색 테두리(border 2px * 2 = 4px)를 포함해도
               실제 페이지 높이(21cm)를 넘지 않도록 높이를 21cm - 4px 로 설정 */
            height: calc(21cm - 4px) !important;
            max-height: calc(21cm - 4px) !important;
            min-height: 0 !important;
            overflow: hidden !important; /* 인쇄 모드에서는 넘치는 내용 숨김 */
            box-sizing: border-box !important;
          }
          .work10-print .a4-landscape-page-content {
            height: 19.3cm !important; /* 인쇄 모드에서는 정확히 19.3cm */
            max-height: 19.3cm !important;
            overflow: hidden !important; /* 인쇄 모드에서는 넘치는 내용 숨김 */
          }
          .work10-print .print-two-column-container {
            height: 19.3cm !important; /* 인쇄 모드에서는 정확히 19.3cm */
            max-height: 19.3cm !important;
            overflow: hidden !important; /* 인쇄 모드에서는 넘치는 내용 숨김 */
          }
          .work10-print .print-column {
            height: 19.3cm !important; /* 인쇄 모드에서는 정확히 19.3cm */
            max-height: 19.3cm !important;
            overflow: hidden !important; /* 인쇄 모드에서는 넘치는 내용 숨김 */
          }
          .work10-print .a4-landscape-page-template:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          /* 빈 페이지 방지: 내용이 없는 페이지는 숨김 */
          .work10-print .a4-landscape-page-template:empty {
            display: none !important;
            page-break-after: auto !important;
            break-after: auto !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
        .work10-print .a4-landscape-page-content {
            /* 가로폭이 페이지를 넘지 않도록 좌우 마진 제거 */
            margin: 0 !important;
            box-sizing: border-box !important;
            width: 100% !important; /* 파란 페이지 템플릿 안에서 전체 폭 사용 */
            height: auto !important; /* 내용에 맞게 높이 자동 조절 */
            min-height: 0 !important;
            max-height: 19.3cm !important; /* 최대 높이 19.3cm (페이지 높이 초과 방지) */
            overflow: visible !important; /* 화면 모드에서도 모든 콘텐츠 표시 */
        }
        .work10-print .print-two-column-container {
            /* 가로폭이 페이지를 넘지 않도록 좌우 마진 제거 */
            margin: 0 !important;
            box-sizing: border-box !important;
            width: 100% !important; /* 초록색 영역 안에서 전체 폭 사용 */
            height: auto !important; /* 내용에 맞게 높이 자동 조절 */
            min-height: 0 !important;
            max-height: 19.3cm !important; /* 최대 높이 19.3cm (페이지 높이 초과 방지) */
            overflow: visible !important; /* 화면 모드에서도 모든 콘텐츠 표시 */
        }
        .work10-print .print-column {
            /* 컬럼끼리의 가로폭 합이 100%를 넘지 않도록 마진 제거 */
            margin: 0 !important;
            box-sizing: border-box !important;
            height: auto !important; /* 내용에 맞게 높이 자동 조절 */
            min-height: 0 !important;
            max-height: 19.3cm !important; /* 최대 높이 19.3cm (페이지 높이 초과 방지) */
            overflow: visible !important; /* 화면 모드에서도 모든 콘텐츠 표시 */
        }
        .work10-print .print-question-card {
            margin: 2px !important;
        }
        .work10-print .print-question-title {
        }
        .work10-print .print-html-block {
        }
        .work10-print .print-options {
        }
        .work10-print .print-text-block {
        }
        .work10-print .print-translation-section {
            margin-top: 0.06cm !important; /* 80% 감소: 0.3cm → 0.06cm (텍스트 블록과 번역 섹션 사이 여백) */
        }
        /* 텍스트 블록 다음에 오는 번역 섹션 여백 80% 감소 */
        .work10-print .print-text-block-work10 + .print-translation-section,
        .work10-print .print-text-block-work10 ~ .print-translation-section {
            margin-top: 0.06cm !important; /* 80% 감소: 0.3cm → 0.06cm */
        }
        /* 텍스트 블록의 하단 여백도 80% 감소 (유형#10의 틀린 단어 정보) */
        .work10-print .print-text-block-work10 {
            margin-bottom: 0.02cm !important; /* 80% 감소: 0.1cm → 0.02cm */
        }
      `}</style>

      {distributedPages.map((pageColumns, pageIndex) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🎨 페이지 ${pageIndex + 1}/${distributedPages.length} 렌더링 중:`, {
            leftColumnItems: pageColumns[0]?.length || 0,
            rightColumnItems: pageColumns[1]?.length || 0,
            totalPages: distributedPages.length,
            leftColumnItemKeys: pageColumns[0]?.map((item, idx) => `아이템 ${idx + 1}`) || [],
            rightColumnItemKeys: pageColumns[1]?.map((item, idx) => `아이템 ${idx + 1}`) || []
          });
        }
        
        const leftItems = pageColumns[0] || [];
        const rightItems = pageColumns[1] || [];
        
        // 빈 페이지 체크: 양쪽 단 모두 비어있으면 렌더링하지 않음
        const hasContent = (leftItems.length > 0 || rightItems.length > 0);
        
        if (!hasContent) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`⚠️ 페이지 ${pageIndex + 1}는 비어있어서 렌더링하지 않습니다.`);
          }
          return null;
        }
        
        return (
          <div key={`page-${pageIndex}`} className="a4-landscape-page-template page-break" data-page-index={pageIndex}>
            <div className="a4-landscape-page-header">
              <PrintHeaderWork01 />
            </div>
            <div className="a4-landscape-page-content">
              <div className="print-two-column-container">
                {/* 왼쪽 단 */}
                <div 
                  key={`page-${pageIndex}-col-0`} 
                  className="print-column"
                  data-column-index="0"
                >
                  {leftItems.map((item, itemIndex) => {
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`  📝 페이지 ${pageIndex + 1} 왼쪽 단 아이템 ${itemIndex + 1} 렌더링`);
                    }
                    return renderNormalizedCard(item, `p${pageIndex}-c0-i${itemIndex}`);
                  })}
                </div>
                {/* 오른쪽 단 */}
                <div 
                  key={`page-${pageIndex}-col-1`} 
                  className="print-column print-column-right"
                  data-column-index="1"
                >
                  {rightItems.map((item, itemIndex) => {
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`  📝 페이지 ${pageIndex + 1} 오른쪽 단 아이템 ${itemIndex + 1} 렌더링`);
                    }
                    return renderNormalizedCard(item, `p${pageIndex}-c1-i${itemIndex}`);
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* 디버깅: 렌더링 완료 후 DOM 확인 */}
      {process.env.NODE_ENV === 'development' && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              setTimeout(() => {
                const pages = document.querySelectorAll('.a4-landscape-page-template');
                console.log('\\n🔍 DOM 확인: 실제 렌더링된 페이지 수:', pages.length);
                pages.forEach((page, idx) => {
                  const leftItems = page.querySelectorAll('[data-column-index="0"] .print-question-card');
                  const rightItems = page.querySelectorAll('[data-column-index="1"] .print-question-card');
                  console.log(\`  페이지 \${idx + 1}: 왼쪽 \${leftItems.length}개, 오른쪽 \${rightItems.length}개 아이템\`);
                });
              }, 100);
            `
          }}
        />
      )}
    </div>
  );
};

export default PrintFormatWork10New;

