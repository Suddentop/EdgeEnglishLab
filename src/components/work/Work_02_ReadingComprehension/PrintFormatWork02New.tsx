import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../Package_02_TwoStepQuiz/PrintFormatPackage02.css'; // 패키지#02 스타일 재사용
import {
  NormalizedQuizItem,
  PrintSection
} from '../Package_02_TwoStepQuiz/printNormalization';
import { renderNormalizedCardNode } from '../Package_02_TwoStepQuiz/printRenderers';

interface WordReplacement {
  original: string;
  replacement: string;
  originalMeaning: string;
  replacementMeaning: string;
  originalPosition?: number;
  replacedPosition?: number;
}

interface LayoutData {
  needsSecondPage: boolean;
  needsThirdPage: boolean;
  firstPageIncludesReplacements: boolean;
}

interface Work_02_ReadingComprehensionData {
  id?: string;
  title: string;
  originalText: string;
  modifiedText: string;
  replacements: WordReplacement[];
  translation: string;
  layout?: LayoutData;
}

interface PrintFormatWork02NewProps {
  quizzes: Work_02_ReadingComprehensionData[];
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
        // 교체된 단어 테이블 처리 (테이블 키로 확인)
        if (section.key && section.key.includes('replacements-table')) {
            // 테이블 헤더 + 행 높이
            // 테이블 마진 10px + 헤더 약 25px + 행당 약 25px
            // section.html 문자열 분석하여 행 개수 추정
            const rowCountMatch = section.html ? section.html.match(/<tr/g) : null;
            const rowCount = rowCountMatch ? rowCountMatch.length : 1; // 헤더 포함
            return 10 + (rowCount * 25);
        }

        // 일반 본문
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

const PrintFormatWork02New: React.FC<PrintFormatWork02NewProps> = ({ quizzes, isAnswerMode }) => {
  
  // 텍스트 하이라이팅 렌더링 헬퍼 (HTML 태그 포함)
  const getHighlightedText = (text: string, replacements: WordReplacement[]) => {
     if (!replacements || replacements.length === 0) return text;
     
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    let processedSentences: string[] = [];
    let currentPosition = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceStart = text.indexOf(sentence, currentPosition);
      if (sentenceStart === -1) { processedSentences.push(sentence); continue; }
      const sentenceEnd = sentenceStart + sentence.length;
      
      let replacement: WordReplacement | null = null;
      for (const rep of replacements) {
        // modifiedText 내의 replacement 단어를 찾아서 강조
        const targetWord = rep.replacement;
        
        if (sentence.toLowerCase().includes(targetWord.toLowerCase())) {
          const escapedWord = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
          if (regex.test(sentence)) {
            replacement = rep;
            break;
          }
        }
      }
      
      if (replacement) {
        const targetWord = replacement.replacement;
        const escapedWord = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
        // 밑줄 및 굵게
        processedSentences.push(sentence.replace(regex, `<u><strong>$&</strong></u>`));
      } else {
        processedSentences.push(sentence);
      }
      currentPosition = sentenceEnd;
    }
    return processedSentences.join(' ');
  };

  // 교체된 단어 테이블 HTML 생성
  const getReplacementsTableHtml = (replacements: WordReplacement[]) => {
      if (!replacements || replacements.length === 0) return '';
      
      const halfLength = Math.ceil(replacements.length / 2);
      // margin-top: 2px로 설정 (본문 마진이 0이므로 아주 살짝만 띄움)
      let html = '<table class="print-replacements-table" style="width:100%; border-collapse: collapse; font-size: 8.8pt; margin-bottom: 8px; margin-top: 2px;">';
      html += '<thead><tr style="background: #f5f5f5; border-bottom: 1px solid #ddd;">';
      html += '<th style="padding: 4px; border: 1px solid #ddd;">원래 단어</th>';
      html += '<th style="padding: 4px; border: 1px solid #ddd;">교체된 단어</th>';
      html += '<th style="padding: 4px; border: 1px solid #ddd;">원래 단어</th>';
      html += '<th style="padding: 4px; border: 1px solid #ddd;">교체된 단어</th>';
      html += '</tr></thead><tbody>';
      
      for(let i=0; i<halfLength; i++) {
          const left = replacements[i*2];
          const right = replacements[i*2+1];
          
          html += '<tr style="border-bottom: 1px solid #ddd;">';
          if(left) {
              html += `<td style="padding: 4px; border: 1px solid #ddd;">${left.original} <span style="font-size:0.8em; color:#666">(${left.originalMeaning})</span></td>`;
              html += `<td style="padding: 4px; border: 1px solid #ddd; color:#1976d2; font-weight:bold;">${left.replacement} <span style="font-size:0.8em; color:#666">(${left.replacementMeaning})</span></td>`;
          } else {
              html += '<td style="padding: 4px; border: 1px solid #ddd;"></td><td style="padding: 4px; border: 1px solid #ddd;"></td>';
          }
          
          if(right) {
              html += `<td style="padding: 4px; border: 1px solid #ddd;">${right.original} <span style="font-size:0.8em; color:#666">(${right.originalMeaning})</span></td>`;
              html += `<td style="padding: 4px; border: 1px solid #ddd; color:#1976d2; font-weight:bold;">${right.replacement} <span style="font-size:0.8em; color:#666">(${right.replacementMeaning})</span></td>`;
          } else {
              html += '<td style="padding: 4px; border: 1px solid #ddd;"></td><td style="padding: 4px; border: 1px solid #ddd;"></td>';
          }
          html += '</tr>';
      }
      html += '</tbody></table>';
      return html;
  };

  // Work_02 데이터를 NormalizedQuizItem으로 변환
  const normalizeWork02Quiz = (quiz: Work_02_ReadingComprehensionData, index: number): NormalizedQuizItem => {
    const sections: PrintSection[] = [];
    const workTypeId = '02';

    // 1. 문제 타이틀
    sections.push({
      type: 'title',
      key: `title-${index}`,
      text: `문제 ${index + 1} : 유사단어 독해`,
      workTypeId
    });

    // 2. 문제 지시문
    sections.push({
      type: 'instruction',
      key: `instruction-${index}`,
      text: '다음 본문을 읽고 해석하세요',
      meta: { workTypeId }
    });

    // 3. 영어 본문 (modifiedText)
    const highlightedText = getHighlightedText(quiz.modifiedText, quiz.replacements);
    sections.push({
      type: 'html',
      key: `html-passage-${index}`,
      html: highlightedText
    });

    // 4. 정답 모드일 때 추가 정보 (교체 단어 + 해석)
    if (isAnswerMode) {
        // 교체된 단어들 (HTML 테이블)
        if (quiz.replacements && quiz.replacements.length > 0) {
            // "📌 교체된 단어들" 라벨 제거
            sections.push({
                type: 'html',
                key: `html-replacements-table-${index}`,
                html: getReplacementsTableHtml(quiz.replacements)
            });
        }

        // 해석
        // 회색 배경 "본문 해석" 라벨 제거 (표준 translation 섹션이 라벨 포함)
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
      chunkMeta: { chunkIndex: 0, totalChunks: 1 } // 기본값 설정
    };
  };

  // 1. 데이터 정규화
  const normalizedItems = quizzes.map((quiz, index) => normalizeWork02Quiz(quiz, index));

  // 3. 페이지 분배 (커스텀 로직: 새로운 문제는 항상 새로운 단에 배치)
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
      const mainSections = item.sections.filter(s => s.type !== 'translation');
      const transSections = item.sections.filter(s => s.type === 'translation');

      const mainHeight = mainSections.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const transHeight = transSections.reduce((sum, s) => sum + estimateSectionHeight(s), 0);
      const totalHeight = mainHeight + transHeight;

      // 현재 단에 내용이 있으면 무조건 다음 단으로 이동 (새로운 문제는 항상 새 단에서 시작)
      if (currentColumns[currentColumnIndex].length > 0) {
        moveToNextColumn();
      }

      // 2. 분할 결정
      // 전체 높이가 페이지 높이(730px)를 초과하고, 본문+테이블(main)은 페이지 높이보다 작은 경우
      if (isAnswerMode && transSections.length > 0 && totalHeight > PAGE_HEIGHT_PX && mainHeight < PAGE_HEIGHT_PX) {
        // 분할 처리
        
        // Item A: 본문 + 테이블
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

        // Item A를 현재 단에 배치
        addToCurrentColumn(itemMain);

        // Item B(해석)를 다음 단으로 이동하여 배치
        moveToNextColumn();
        addToCurrentColumn(itemTrans);
      } else {
        // 분할 불필요 (한 단에 모두 들어가거나, 본문 자체가 너무 커서 분할 의미가 없는 경우)
        addToCurrentColumn(item);
      }
    });

    if (currentColumns[0].length > 0 || currentColumns[1].length > 0) {
      pages.push(currentColumns);
    }

    return pages;
  };

  const distributedPages = distributeItemsCustom(normalizedItems);

  // 4. 렌더링 헬퍼
  const renderNormalizedCard = (
    normalizedItem: NormalizedQuizItem,
    keyPrefix: string
  ): React.ReactNode => {
    return renderNormalizedCardNode(normalizedItem, keyPrefix, { isAnswerMode });
  };

  return (
    <div className={isAnswerMode ? "print-container-answer work02-print" : "print-container work02-print"}>
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
                /* PrintFormatPackage02.css의 스타일 보장 */
                .print-two-column-container {
                    display: flex !important;
                    height: 19.3cm !important;
                    overflow: hidden !important;
                }
                .print-column {
                    height: 19.3cm !important;
                    overflow: hidden !important;
                }
                
                /* Work_02 본문 하단 여백 제거 (간격 줄이기 핵심) */
                .work02-print .print-passage {
                    margin-bottom: 0 !important;
                    padding-bottom: 0 !important;
                }
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

export default PrintFormatWork02New;