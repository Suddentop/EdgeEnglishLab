import React from 'react';
import PrintHeaderPackage02 from './PrintHeaderPackage02';
import './PrintFormatPackage02.css';

interface PrintFormatPackage02Props {
  packageQuiz: any[];
  isAnswerMode?: boolean;
}

const PrintFormatPackage02: React.FC<PrintFormatPackage02Props> = ({ packageQuiz, isAnswerMode = false }) => {
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

  // 페이지 분할 로직: 2단 레이아웃에 맞는 동적 페이지 분할
  const renderQuizItems = () => {
    const pages: JSX.Element[] = [];
    
    // A4 가로 페이지 2단 레이아웃 설정 (cm 단위)
    const COLUMN_CONFIG = {
      HEIGHT: 21, // A4 가로 페이지 세로 길이
      HEADER_HEIGHT: 1.2, // 헤더 높이
      CONTENT_PADDING: 0.5, // 콘텐츠 상하 패딩
      TITLE_HEIGHT: 1.0, // 문제 제목 높이
      INSTRUCTION_HEIGHT: 0.8, // 지시문 높이
      SENTENCE_FONT_SIZE: 0.3, // 8.5pt ≈ 0.3cm
      LINE_HEIGHT: 1.4,
      CHAR_WIDTH: 0.22, // 영어 문자 평균 폭 (cm)
      COLUMN_WIDTH: 14.35, // 단 너비 (29.7 / 2 - 여백)
      SENTENCE_MARGIN: 0.25, // 문장 간 마진
      SENTENCE_PADDING: 0.3, // 문장 패딩
    };
    
    // 사용 가능한 단 높이 계산 (실제 렌더링 결과에 맞게 대폭 조정)
    const getAvailableColumnHeight = () => {
      // A4 가로 (21cm x 29.7cm)
      // 실제 CSS 값 기반으로 더 정확한 계산
      // 헤더: 1.2cm + 패딩 0.3cm = 1.5cm
      // 콘텐츠 패딩: 0.5cm (하단만)
      const totalFixedSpace = 1.5 + 0.5; // 2.0cm
      
      // 2단 컨테이너에 사용 가능한 높이
      const heightForTwoColumns = 21 - 2.0; // 19.0cm
      
      // 한 단에 사용 가능한 높이 (실제로는 훨씬 더 효율적으로 활용 가능)
      // 이미지를 보면 각 단이 매우 적게 사용되고 있으므로 더 큰 값을 사용
      const availableHeightPerColumn = (heightForTwoColumns / 2) + 2.0; // 2.0cm 추가 여유 공간
      // 19.0cm / 2 + 2.0cm = 11.5cm
      
      console.log(`📏 사용 가능한 단 높이 계산: ${availableHeightPerColumn.toFixed(2)}cm (대폭 조정)`);
      
      return availableHeightPerColumn;
    };
    
    // 텍스트 높이 계산 함수
    const calculateTextHeight = (text: string, fontSize: number = COLUMN_CONFIG.SENTENCE_FONT_SIZE): number => {
      const charsPerLine = Math.floor(
        (COLUMN_CONFIG.COLUMN_WIDTH - COLUMN_CONFIG.SENTENCE_PADDING * 2) / COLUMN_CONFIG.CHAR_WIDTH
      );
      const lines = Math.ceil(text.length / charsPerLine);
      const textHeight = lines * fontSize * COLUMN_CONFIG.LINE_HEIGHT;
      return textHeight;
    };
    
    // 문장 높이 계산 함수 (실제 렌더링에 맞게 대폭 축소)
    const calculateSentenceHeight = (sentence: string): number => {
      const textHeight = calculateTextHeight(sentence);
      // 실제 렌더링에서는 문장 간 간격이 훨씬 작으므로 대폭 축소
      return textHeight + 0.1; // 0.1cm만 추가 (기존 0.8cm에서 대폭 축소)
    };
    
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
      if (quizItem.quiz) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        // 문단들
        quizItem.quiz.shuffledParagraphs?.forEach((para: any) => {
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
      if (quizItem.work02Data) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += calculateTextHeight(quizItem.work02Data.modifiedText || '', 0.32);
        // 정답 섹션 (정답 모드일 때 - 교체 단어 테이블)
        if (isAnswerMode) {
          const replacementCount = quizItem.work02Data.replacements?.length || 0;
          estimatedHeight += answerSectionBaseHeight + (replacementCount * 0.4); // 테이블 행당 0.4cm
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_03~05: 빈칸 문제
      if (quizItem.work03Data || quizItem.work04Data || quizItem.work05Data) {
        const data = quizItem.work03Data || quizItem.work04Data || quizItem.work05Data;
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
      if (quizItem.work06Data) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += calculateTextHeight(quizItem.work06Data.missingSentence || '', 0.28);
        estimatedHeight += calculateTextHeight(quizItem.work06Data.numberedPassage || '', 0.3);
        estimatedHeight += 0.6; // 선택지
        // 정답 섹션 (정답 모드일 때)
        if (isAnswerMode) {
          estimatedHeight += answerSectionBaseHeight + 0.3; // 정답 1줄
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_07, 08: 주제/제목 추론
      if (quizItem.work07Data || quizItem.work08Data) {
        const data = quizItem.work07Data || quizItem.work08Data;
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
      if (quizItem.work09Data) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += calculateTextHeight(quizItem.work09Data.passage || '', 0.32);
        estimatedHeight += 1.0; // 선택지
        // 정답 섹션 (정답 모드일 때)
        if (isAnswerMode) {
          estimatedHeight += answerSectionBaseHeight + 0.3; // 정답 1줄
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_10: 다중 어법 오류
      if (quizItem.work10Data) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += calculateTextHeight(quizItem.work10Data.passage || '', 0.32);
        estimatedHeight += 0.6; // 선택지
        // 정답 섹션 (정답 모드일 때)
        if (isAnswerMode) {
          estimatedHeight += answerSectionBaseHeight + 0.3; // 정답 1줄
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_11: 문장별 해석 (개별 문장 높이)
      if (quizItem.work11Data) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        if (quizItem.work11Data.sentences) {
          quizItem.work11Data.sentences.forEach((s: any) => {
            const sentence = typeof s === 'string' ? s : s.english;
            estimatedHeight += calculateSentenceHeight(sentence);
          });
        }
        // 정답 섹션 (정답 모드일 때 - 문장별 해석)
        if (isAnswerMode && quizItem.work11Data.sentences) {
          estimatedHeight += answerSectionBaseHeight;
          quizItem.work11Data.sentences.forEach((s: any) => {
            const korean = s.korean || '';
            estimatedHeight += calculateSentenceHeight(korean); // 한글 해석 높이
          });
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_12: 단어 학습
      if (quizItem.work12Data) {
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += (quizItem.work12Data.words?.length || 0) * 0.6;
        // 정답 섹션 (정답 모드일 때 - 단어별 뜻)
        if (isAnswerMode) {
          const wordCount = quizItem.work12Data.words?.length || 0;
          estimatedHeight += answerSectionBaseHeight + (wordCount * 0.3); // 단어당 0.3cm
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // Work_13, 14: 빈칸 채우기
      if (quizItem.work13Data || quizItem.work14Data) {
        const data = quizItem.work13Data || quizItem.work14Data;
        estimatedHeight += COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
        estimatedHeight += calculateTextHeight(data.blankedText || '', 0.32);
        // 정답 섹션 (정답 모드일 때 - 빈칸 정답들)
        if (isAnswerMode) {
          const answerCount = data.correctAnswers?.length || 0;
          estimatedHeight += answerSectionBaseHeight + (answerCount * 0.3); // 정답당 0.3cm
        }
        return estimatedHeight + cardFixedHeight;
      }
      
      // 기본값: 단 높이의 절반 + 카드 패딩/마진
      return (availableHeight * 0.5) + cardFixedHeight;
    };
    
    // 유형#11의 문장을 높이 기반으로 단별로 분할하는 함수
    const splitWork11SentencesByHeight = (sentences: string[]): string[][] => {
      const result: string[][] = [];
      const availableHeight = getAvailableColumnHeight();
      
      // 제목 + 지시문 + 카드 패딩/마진을 제외한 실제 콘텐츠 높이
      // 실제 렌더링에 맞게 대폭 조정
      const contentAvailableHeight = availableHeight - 0.5 - 0.4 - 0.4 - 0.1; // 대폭 축소된 계산
      
      console.log(`📏 유형#11 분할 시작 - 사용 가능 높이: ${availableHeight.toFixed(2)}cm, 콘텐츠 높이: ${contentAvailableHeight.toFixed(2)}cm, 문장 수: ${sentences.length}`);
      
      let currentChunk: string[] = [];
      let currentHeight = 0;
      let chunkNumber = 1;
      
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const sentenceHeight = calculateSentenceHeight(sentence);
        
        console.log(`  문장 ${i + 1}: ${sentenceHeight.toFixed(2)}cm (누적: ${(currentHeight + sentenceHeight).toFixed(2)}cm)`);
        
        // 현재 청크에 추가했을 때 높이가 초과하는지 확인 (콘텐츠 높이 기준)
        if (currentHeight + sentenceHeight > contentAvailableHeight && currentChunk.length > 0) {
          // 현재 청크를 결과에 추가하고 새 청크 시작
          console.log(`  ✂️ 청크 ${chunkNumber} 완료: ${currentChunk.length}개 문장, 총 ${currentHeight.toFixed(2)}cm`);
          result.push([...currentChunk]);
          currentChunk = [sentence];
          currentHeight = sentenceHeight;
          chunkNumber++;
        } else {
          // 현재 청크에 추가
          currentChunk.push(sentence);
          currentHeight += sentenceHeight;
        }
      }
      
      // 마지막 청크 추가
      if (currentChunk.length > 0) {
        console.log(`  ✂️ 청크 ${chunkNumber} 완료: ${currentChunk.length}개 문장, 총 ${currentHeight.toFixed(2)}cm`);
        result.push(currentChunk);
      }
      
      console.log(`✅ 유형#11 분할 완료: 총 ${result.length}개 청크 생성`);
      
      return result;
    };
    
    // 패키지 퀴즈를 단별로 분할 (높이 기반)
    const distributedItems: any[][] = [];
    let currentPageItems: any[] = [];
    let currentColumnIndex = 0; // 현재 단 인덱스 (0: 좌측, 1: 우측)
    let currentColumnHeight = 0; // 현재 단의 누적 높이
    const availableHeight = getAvailableColumnHeight();
    
    console.log(`🚀 패키지 분할 시작 - 총 ${packageQuiz.length}개 아이템, 사용 가능 높이: ${availableHeight.toFixed(2)}cm`);
    
    for (let i = 0; i < packageQuiz.length; i++) {
      const quizItem = packageQuiz[i];
      // workTypeId 찾기 로직 개선
      let workTypeId = 'unknown';
      if (quizItem.quiz) {
        workTypeId = '01';
      } else if (quizItem.work02Data) {
        workTypeId = '02';
      } else if (quizItem.work03Data) {
        workTypeId = '03';
      } else if (quizItem.work04Data) {
        workTypeId = '04';
      } else if (quizItem.work05Data) {
        workTypeId = '05';
      } else if (quizItem.work06Data) {
        workTypeId = '06';
      } else if (quizItem.work07Data) {
        workTypeId = '07';
      } else if (quizItem.work08Data) {
        workTypeId = '08';
      } else if (quizItem.work09Data) {
        workTypeId = '09';
      } else if (quizItem.work10Data) {
        workTypeId = '10';
      } else if (quizItem.work11Data) {
        workTypeId = '11';
      } else if (quizItem.work12Data) {
        workTypeId = '12';
      } else if (quizItem.work13Data) {
        workTypeId = '13';
      } else if (quizItem.work14Data) {
        workTypeId = '14';
      }
      
      console.log(`📦 아이템 ${i + 1}/${packageQuiz.length}: 유형#${workTypeId} 처리 중...`);
      
      // 유형#11인 경우 문장을 단별로 분할
      if (quizItem.work11Data && quizItem.work11Data.sentences) {
        // work11Data.sentences가 { english: string }[] 형식인지 확인
        const sentencesArray = Array.isArray(quizItem.work11Data.sentences) 
          ? quizItem.work11Data.sentences.map((s: any) => typeof s === 'string' ? s : s.english)
          : [];
        
        console.log(`🔢 유형#11 처리 중 - 총 ${sentencesArray.length}개 문장`);
        const sentenceChunks = splitWork11SentencesByHeight(sentencesArray);
        
        sentenceChunks.forEach((chunk, chunkIndex) => {
          const work11Item: any = {
            ...quizItem,
            work11Data: {
              ...quizItem.work11Data,
              sentences: chunk.map((sentence: string) => ({ english: sentence }))
            }
          };
          
          // 청크의 높이 계산 (제목 + 지시문 + 문장들 + 카드 패딩/마진)
          let chunkHeight = COLUMN_CONFIG.TITLE_HEIGHT + COLUMN_CONFIG.INSTRUCTION_HEIGHT;
          chunk.forEach((sentence: string) => {
            chunkHeight += calculateSentenceHeight(sentence);
          });
          chunkHeight += (0.2 * 2) + 0.1; // 카드 패딩 + 마진 (대폭 축소)
          
          console.log(`  📄 청크 ${chunkIndex + 1}/${sentenceChunks.length} → 높이: ${chunkHeight.toFixed(2)}cm, 현재 단 높이: ${currentColumnHeight.toFixed(2)}cm, 단 인덱스: ${currentColumnIndex}`);
          
          // 현재 단에 추가했을 때 높이가 초과하는지 확인
          if (currentColumnHeight + chunkHeight > availableHeight && currentPageItems.length > 0) {
            // 현재 단이 가득 찼으므로 다음 단으로 이동
            console.log(`  ⏭️ 단 ${currentColumnIndex + 1} 가득참 → 단 ${currentColumnIndex + 2}로 이동`);
            currentColumnIndex++;
            currentColumnHeight = chunkHeight;
            
            // 2개 단이 채워지면 새 페이지로 이동
            if (currentColumnIndex >= 2) {
              console.log(`  📄 페이지 ${distributedItems.length + 1} 완료 (2단 채움) → 새 페이지로 이동`);
              distributedItems.push([...currentPageItems]);
              currentPageItems = [work11Item];
              currentColumnIndex = 0;
              currentColumnHeight = chunkHeight;
            } else {
              currentPageItems.push(work11Item);
            }
          } else {
            // 현재 단에 추가 가능
            console.log(`  ✅ 단 ${currentColumnIndex + 1}에 추가`);
            currentPageItems.push(work11Item);
            currentColumnHeight += chunkHeight;
          }
        });
      } else {
        // 다른 유형들: 높이 기반 분할
        const itemHeight = estimateQuizItemHeight(quizItem);
        
        console.log(`  📏 유형#${workTypeId} 높이: ${itemHeight.toFixed(2)}cm, 현재 단 높이: ${currentColumnHeight.toFixed(2)}cm, 단 인덱스: ${currentColumnIndex}`);
        
        // 현재 단에 추가했을 때 높이가 초과하는지 확인
        if (currentColumnHeight + itemHeight > availableHeight && currentPageItems.length > 0) {
          // 현재 단이 가득 찼으므로 다음 단으로 이동
          console.log(`  ⏭️ 단 ${currentColumnIndex + 1} 가득참 → 단 ${currentColumnIndex + 2}로 이동`);
          currentColumnIndex++;
          currentColumnHeight = itemHeight;
          
          // 2개 단이 채워지면 새 페이지로 이동
          if (currentColumnIndex >= 2) {
            console.log(`  📄 페이지 ${distributedItems.length + 1} 완료 (2단 채움) → 새 페이지로 이동`);
            distributedItems.push([...currentPageItems]);
            currentPageItems = [quizItem];
            currentColumnIndex = 0;
            currentColumnHeight = itemHeight;
          } else {
            currentPageItems.push(quizItem);
          }
        } else {
          // 현재 단에 추가 가능
          console.log(`  ✅ 단 ${currentColumnIndex + 1}에 추가`);
          currentPageItems.push(quizItem);
          currentColumnHeight += itemHeight;
        }
      }
    }
    
    // 마지막 페이지 처리
    if (currentPageItems.length > 0) {
      console.log(`📄 마지막 페이지 추가: ${currentPageItems.length}개 아이템`);
      distributedItems.push(currentPageItems);
    }
    
    console.log(`✅ 패키지 분할 완료: 총 ${distributedItems.length}개 페이지 생성`);
    
    // 페이지 렌더링
    console.log(`📄 총 ${distributedItems.length}개 페이지 생성 중...`);
    
    distributedItems.forEach((pageItems: any[], pageIndex: number) => {
      console.log(`  📋 페이지 ${pageIndex + 1}: ${pageItems.length}개 아이템`);
      
      pages.push(
        <div key={`page-${pageIndex}`} className="a4-landscape-page-template">
          <div className="a4-landscape-page-header">
            <PrintHeaderPackage02 />
          </div>
          
          <div className="a4-landscape-page-content">
            <div className="print-two-column-container">
              {pageItems.map((quizItem: any, index: number) => {
          // Work_01: 문단 순서 맞추기
          if (quizItem.quiz) {
            return (
              <div key={`print-01-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#01. 문단 순서 맞추기</span>
                  <span className="print-question-type-badge">유형#01</span>
                </div>
                <div className="print-instruction">
                  다음 단락들을 원래 순서대로 배열한 것을 고르세요
                </div>
                <div className="print-shuffled-paragraphs">
                  {quizItem.quiz.shuffledParagraphs?.map((para: any, pIndex: number) => (
                    <div key={pIndex} className="print-paragraph-item">
                      <strong>{para.label}:</strong> {para.content}
                    </div>
                  ))}
                </div>
                <div className="print-options">
                  {quizItem.quiz.choices?.map((choice: string[], cIndex: number) => (
                    <div key={cIndex} className="print-option">
                      {['①', '②', '③', '④'][cIndex]} {choice.join(' → ')}
                    </div>
                  ))}
                </div>
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">정답:</div>
                    <div className="print-answer-content">
                      {['①', '②', '③', '④'][quizItem.quiz.answerIndex]} {quizItem.quiz.choices?.[quizItem.quiz.answerIndex]?.join(' → ')}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_02: 유사단어 독해
          if (quizItem.work02Data) {
            return (
              <div key={`print-02-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#02. 유사단어 독해</span>
                  <span className="print-question-type-badge">유형#02</span>
                </div>
                <div className="print-instruction">
                  다음 본문을 읽고 해석하세요
                </div>
                <div 
                  className="print-passage"
                  dangerouslySetInnerHTML={{
                    __html: renderTextWithHighlight(
                      quizItem.work02Data.modifiedText || '', 
                      quizItem.work02Data.replacements || []
                    )
                  }}
                />
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">교체된 단어들:</div>
                    <div className="print-replacements-table">
                      <table>
                        <thead>
                          <tr>
                            <th>원래 단어</th>
                            <th>교체된 단어</th>
                            <th>원래 의미</th>
                            <th>교체된 의미</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quizItem.work02Data.replacements?.map((replacement: any, rIndex: number) => (
                            <tr key={rIndex}>
                              <td className="original-word">{replacement.original}</td>
                              <td className="replacement-word">{replacement.replacement}</td>
                              <td className="original-meaning">{replacement.originalMeaning}</td>
                              <td className="replacement-meaning">{replacement.replacementMeaning}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_03: 빈칸(단어) 문제
          if (quizItem.work03Data) {
            return (
              <div key={`print-03-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#03. 빈칸(단어) 문제</span>
                  <span className="print-question-type-badge">유형#03</span>
                </div>
                <div className="print-instruction">
                  다음 빈칸에 들어갈 가장 적절한 단어를 고르세요
                </div>
                <div className="print-passage">
                  {quizItem.work03Data.blankedText}
                </div>
                <div className="print-options">
                  {quizItem.work03Data.options?.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                    </div>
                  ))}
                </div>
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">정답:</div>
                    <div className="print-answer-content">
                      {['①', '②', '③', '④', '⑤'][quizItem.work03Data.answerIndex]} {quizItem.work03Data.options?.[quizItem.work03Data.answerIndex]}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_04: 빈칸(구) 문제
          if (quizItem.work04Data) {
            return (
              <div key={`print-04-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#04. 빈칸(구) 문제</span>
                  <span className="print-question-type-badge">유형#04</span>
                </div>
                <div className="print-instruction">
                  다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오
                </div>
                <div className="print-passage">
                  {quizItem.work04Data.blankedText}
                </div>
                <div className="print-options">
                  {quizItem.work04Data.options?.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                    </div>
                  ))}
                </div>
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">정답:</div>
                    <div className="print-answer-content">
                      {['①', '②', '③', '④', '⑤'][quizItem.work04Data.answerIndex]} {quizItem.work04Data.options?.[quizItem.work04Data.answerIndex]}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_05: 빈칸(문장) 문제
          if (quizItem.work05Data) {
            return (
              <div key={`print-05-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#05. 빈칸(문장) 문제</span>
                  <span className="print-question-type-badge">유형#05</span>
                </div>
                <div className="print-instruction">
                  다음 빈칸에 들어갈 가장 적절한 문장을 고르세요
                </div>
                <div className="print-passage">
                  {quizItem.work05Data.blankedText}
                </div>
                <div className="print-options">
                  {quizItem.work05Data.options?.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                    </div>
                  ))}
                </div>
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">정답:</div>
                    <div className="print-answer-content">
                      {['①', '②', '③', '④', '⑤'][quizItem.work05Data.answerIndex]} {quizItem.work05Data.options?.[quizItem.work05Data.answerIndex]}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_06: 문장 위치 찾기
          if (quizItem.work06Data) {
            return (
              <div key={`print-06-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#06. 문장 위치 찾기</span>
                  <span className="print-question-type-badge">유형#06</span>
                </div>
                <div className="print-instruction">
                  아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오
                </div>
                <div className="print-missing-sentence">
                  주요 문장: {quizItem.work06Data.missingSentence}
                </div>
                <div className="print-numbered-passage">
                  {quizItem.work06Data.numberedPassage}
                </div>
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">정답:</div>
                    <div className="print-answer-content">
                      {['①', '②', '③', '④', '⑤'][quizItem.work06Data.answerIndex]}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_07: 주제 추론
          if (quizItem.work07Data) {
            return (
              <div key={`print-07-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#07. 주제 추론</span>
                  <span className="print-question-type-badge">유형#07</span>
                </div>
                <div className="print-instruction">
                  다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요
                </div>
                <div className="print-passage">
                  {quizItem.work07Data.passage}
                </div>
                <div className="print-options">
                  {quizItem.work07Data.options?.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                    </div>
                  ))}
                </div>
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">정답:</div>
                    <div className="print-answer-content">
                      {['①', '②', '③', '④', '⑤'][quizItem.work07Data.answerIndex]} {quizItem.work07Data.options?.[quizItem.work07Data.answerIndex]}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_08: 제목 추론
          if (quizItem.work08Data) {
            return (
              <div key={`print-08-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#08. 제목 추론</span>
                  <span className="print-question-type-badge">유형#08</span>
                </div>
                <div className="print-instruction">
                  다음 본문에 가장 적합한 제목을 고르세요
                </div>
                <div className="print-passage">
                  {quizItem.work08Data.passage}
                </div>
                <div className="print-options">
                  {quizItem.work08Data.options?.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {`①②③④⑤`[optIndex]} {option}
                    </div>
                  ))}
                </div>
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">정답:</div>
                    <div className="print-answer-content">
                      {`①②③④⑤`[quizItem.work08Data.answerIndex]} {quizItem.work08Data.options?.[quizItem.work08Data.answerIndex]}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_09: 어법 오류 찾기
          if (quizItem.work09Data) {
            return (
              <div key={`print-09-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#09. 어법 오류 찾기</span>
                  <span className="print-question-type-badge">유형#09</span>
                </div>
                <div className="print-instruction">
                  다음 글의 밑줄 친 부분 중, 어법상 틀린 것을 고르시오
                </div>
                <div className="print-passage">
                  {quizItem.work09Data.passage}
                </div>
                <div className="print-options">
                  {quizItem.work09Data.options?.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                    </div>
                  ))}
                </div>
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">정답:</div>
                    <div className="print-answer-content">
                      {['①', '②', '③', '④', '⑤'][quizItem.work09Data.answerIndex]} {quizItem.work09Data.options?.[quizItem.work09Data.answerIndex]}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_10: 다중 어법 오류
          if (quizItem.work10Data) {
            return (
              <div key={`print-10-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#10. 다중 어법 오류</span>
                  <span className="print-question-type-badge">유형#10</span>
                </div>
                <div className="print-instruction">
                  다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?
                </div>
                <div 
                  className="print-passage"
                  dangerouslySetInnerHTML={{
                    __html: quizItem.work10Data.passage.replace(/\n/g, '<br/>')
                  }}
                />
                <div className="print-options">
                  {quizItem.work10Data.options?.map((option: number, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {optIndex + 1}. {option}개
                    </div>
                  ))}
                </div>
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">정답:</div>
                    <div className="print-answer-content">
                      {quizItem.work10Data.answerIndex + 1}. {quizItem.work10Data.options?.[quizItem.work10Data.answerIndex]}개
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_11: 본문 문장별 해석
          if (quizItem.work11Data) {
            // 전역 문장 번호 계산 (이전 페이지들의 문장 수 고려)
            const getGlobalSentenceNumber = (localIndex: number) => {
              let globalNumber = localIndex + 1;
              
              // 현재 페이지 이전의 모든 문장 수 계산
              for (let p = 0; p < pageIndex; p++) {
                const prevPageItems = distributedItems[p];
                prevPageItems.forEach((prevItem: any) => {
                  if (prevItem.work11Data && prevItem.work11Data.sentences) {
                    globalNumber += prevItem.work11Data.sentences.length;
                  }
                });
              }
              
              // 현재 페이지에서 현재 문장 이전의 문장 수 계산
              for (let i = 0; i < index; i++) {
                const prevItem = pageItems[i];
                if (prevItem.work11Data && prevItem.work11Data.sentences) {
                  globalNumber += prevItem.work11Data.sentences.length;
                }
              }
              
              return globalNumber;
            };
            
            return (
              <div key={`print-11-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#11. 본문 문장별 해석</span>
                  <span className="print-question-type-badge">유형#11</span>
                </div>
                <div className="print-instruction">
                  다음 본문을 문장별로 해석하세요
                </div>
                {quizItem.work11Data.sentences.map((sentence: any, sIndex: number) => {
                  const globalSentenceNumber = getGlobalSentenceNumber(sIndex);
                  return (
                    <div key={sIndex} className="print-sentence-item">
                      <div className="print-sentence-english">
                        <span className="sentence-number">{String(globalSentenceNumber).padStart(2, '0')}. </span>
                        {sentence.english}
                      </div>
                    </div>
                  );
                })}
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">해석:</div>
                    <div className="print-answer-content">
                      {quizItem.work11Data.sentences.map((sentence: any, sIndex: number) => {
                        const globalSentenceNumber = getGlobalSentenceNumber(sIndex);
                        return (
                          <div key={sIndex} className="print-sentence-translation">
                            <span className="sentence-number">{String(globalSentenceNumber).padStart(2, '0')}. </span>
                            {sentence.korean}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_12: 단어 학습
          if (quizItem.work12Data) {
            return (
              <div key={`print-12-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#12. 단어 학습</span>
                  <span className="print-question-type-badge">유형#12</span>
                </div>
                <div className="print-instruction">
                  다음 단어들의 뜻을 학습하세요
                </div>
                {quizItem.work12Data.words?.map((word: any, wIndex: number) => (
                  <div key={wIndex} className="print-word-item">
                    <div className="print-word-english">{wIndex + 1}. {word.english}</div>
                  </div>
                ))}
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">뜻:</div>
                    <div className="print-answer-content">
                      {quizItem.work12Data.words?.map((word: any, wIndex: number) => (
                        <div key={wIndex} className="print-word-translation">
                          {wIndex + 1}. {word.english} - {word.korean}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_13: 빈칸 채우기 (단어-주관식)
          if (quizItem.work13Data) {
            return (
              <div key={`print-13-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#13. 빈칸 채우기 (단어-주관식)</span>
                  <span className="print-question-type-badge">유형#13</span>
                </div>
                <div className="print-instruction">
                  다음 빈칸에 들어갈 적절한 단어를 쓰시오
                </div>
                <div className="print-passage">
                  {quizItem.work13Data.blankedText}
                </div>
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">정답:</div>
                    <div className="print-answer-content">
                      {quizItem.work13Data.correctAnswers?.map((answer: string, aIndex: number) => (
                        <div key={aIndex} className="print-blank-answer">
                          {aIndex + 1}. {answer}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_14: 빈칸 채우기 (문장-주관식)
          if (quizItem.work14Data) {
            return (
              <div key={`print-14-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#14. 빈칸 채우기 (문장-주관식)</span>
                  <span className="print-question-type-badge">유형#14</span>
                </div>
                <div className="print-instruction">
                  다음 빈칸에 들어갈 적절한 문장을 쓰시오
                </div>
                <div className="print-passage">
                  {quizItem.work14Data.blankedText}
                </div>
                {isAnswerMode && (
                  <div className="print-answer-section">
                    <div className="print-answer-label">정답:</div>
                    <div className="print-answer-content">
                      {quizItem.work14Data.correctAnswers?.map((answer: string, aIndex: number) => (
                        <div key={aIndex} className="print-blank-answer">
                          {aIndex + 1}. {answer}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return null;
              })}
            </div>
          </div>
        </div>
      );
    });
    
    return pages;
  };

  return (
    <div className="print-container">
      {renderQuizItems()}
    </div>
  );
};

export default PrintFormatPackage02;

