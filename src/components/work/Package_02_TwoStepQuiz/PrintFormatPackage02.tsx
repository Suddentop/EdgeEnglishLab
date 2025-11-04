import React from 'react';
import PrintHeaderPackage02 from './PrintHeaderPackage02';
import './PrintFormatPackage02.css';

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
    
    // 사용 가능한 단 높이 계산 (1단/2단 모두 19.0cm 사용)
    const getAvailableColumnHeight = () => {
      // A4 가로 (21cm x 29.7cm)
      // 헤더: 1.2cm + 패딩 0.3cm = 1.5cm
      // 콘텐츠 패딩: 0.5cm (하단만)
      const totalFixedSpace = 1.5 + 0.5; // 2.0cm
      
      // 1단/2단 모두 전체 페이지 높이 사용 (새 페이지로 넘어가므로)
      const availableHeightPerColumn = 21 - totalFixedSpace; // 19.0cm
      
      console.log(`📏 사용 가능한 단 높이 계산: ${availableHeightPerColumn.toFixed(2)}cm (1단/2단 모두 전체 높이 사용)`);
      
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
    
    // 문장 높이 계산 함수 (실제 렌더링에 맞게 정확한 계산)
    const calculateSentenceHeight = (sentence: string): number => {
      const textHeight = calculateTextHeight(sentence);
      // 실제 렌더링에서 문장 간 간격, 패딩, 마진을 정확히 반영
      return textHeight + 0.3; // 문장 간 간격 0.3cm 추가
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
    
    // 유형#11의 문장을 높이 기반으로 단별로 분할하는 함수
    const splitWork11SentencesByHeight = (sentences: string[]): string[][] => {
      const result: string[][] = [];
      const availableHeight = getAvailableColumnHeight();
      
      // 제목 + 지시문 + 카드 패딩/마진을 제외한 실제 콘텐츠 높이
      // 유형#11은 정답 모드에서 훨씬 더 많은 공간이 필요하므로 대폭 조정
      const contentAvailableHeight = availableHeight - 0.1; // 최소한의 여백만 제외
      
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
    
    // 유형#11의 문장을 한글 해석을 고려하여 높이 기반으로 단별로 분할하는 함수
    const splitWork11SentencesByHeightWithKorean = (sentences: any[]): any[][] => {
      const result: any[][] = [];
      const availableHeight = getAvailableColumnHeight();
      
      // 제목 + 지시문 + 카드 패딩/마진을 제외한 실제 콘텐츠 높이
      // 유형#11은 헤더(1.5cm) + 하단여백(0.5cm)을 제외한 정확한 높이로 계산
      const contentAvailableHeight = availableHeight - 2.0; // 19.0cm - 2.0cm = 17.0cm (헤더+하단여백 제외)
      
      console.log(`📏 유형#11 한글해석 고려 분할 시작 - 사용 가능 높이: ${availableHeight.toFixed(2)}cm, 콘텐츠 높이: ${contentAvailableHeight.toFixed(2)}cm, 문장 수: ${sentences.length}`);
      
      let currentChunk: any[] = [];
      let currentHeight = 0;
      let chunkNumber = 1;
      
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const englishText = sentence.english || sentence.text || sentence || '';
        const koreanText = sentence.korean || sentence.translation || '';
        const englishHeight = calculateSentenceHeight(englishText);
        const koreanHeight = calculateSentenceHeight(koreanText);
        const totalSentenceHeight = englishHeight + koreanHeight; // 한글 해석 높이를 정확히 계산
        
        console.log(`  문장 ${i + 1}: 영어 ${englishHeight.toFixed(2)}cm + 한글 ${koreanHeight.toFixed(2)}cm = 총 ${totalSentenceHeight.toFixed(2)}cm (누적: ${(currentHeight + totalSentenceHeight).toFixed(2)}cm)`);
        
        // 현재 청크에 추가했을 때 높이가 초과하는지 확인
        if (currentHeight + totalSentenceHeight > contentAvailableHeight && currentChunk.length > 0) {
          // 현재 청크를 결과에 추가하고 새 청크 시작
          console.log(`  ✂️ 청크 ${chunkNumber} 완료: ${currentChunk.length}개 문장, 총 ${currentHeight.toFixed(2)}cm`);
          result.push([...currentChunk]);
          currentChunk = [sentence];
          currentHeight = totalSentenceHeight;
          chunkNumber++;
        } else {
          // 현재 청크에 추가
          currentChunk.push(sentence);
          currentHeight += totalSentenceHeight;
        }
      }
      
      // 마지막 청크 처리
      if (currentChunk.length > 0) {
        console.log(`  ✂️ 청크 ${chunkNumber} 완료: ${currentChunk.length}개 문장, 총 ${currentHeight.toFixed(2)}cm`);
        result.push(currentChunk);
      }
      
      console.log(`✅ 유형#11 한글해석 고려 분할 완료: 총 ${result.length}개 청크 생성`);
      
      return result;
    };
    
    // 패키지 퀴즈를 단별로 분할 (높이 기반)
    const pages: JSX.Element[] = [];
    
    // 유형#11을 위한 특별한 페이지 분할 로직
    const distributedItems: any[][] = [];
    let currentPageItems: any[] = [];
    let currentColumnIndex = 0; // 현재 단 인덱스 (0: 좌측, 1: 우측)
    
    for (let i = 0; i < packageQuiz.length; i++) {
      const quizItem = packageQuiz[i];
      
      // 유형#11인 경우 문장을 높이 기반으로 분할
      if (quizItem.workTypeId === '11') {
        console.log(`🔍 유형#11 페이지 분할 처리 시작:`, quizItem);
        
        // 데이터 소스 결정
        const quizData = quizItem.quiz || quizItem.data;
        let work11Data = quizData?.work11Data || quizItem?.work11Data || quizData?.data?.work11Data;
        if (!work11Data && (quizData || quizItem)) {
          work11Data = quizData || quizItem;
        }
        
        if (work11Data && work11Data.sentences) {
          console.log(`📝 유형#11 문장 수: ${work11Data.sentences.length}`);
          
          // 정답 모드에서는 한글 해석을 고려하여 분할
          const sentenceChunks = isAnswerMode 
            ? splitWork11SentencesByHeightWithKorean(work11Data.sentences)
            : splitWork11SentencesByHeight(work11Data.sentences.map((s: any) => s.english || s.text || s || ''));
          
          console.log(`✂️ 유형#11 분할 결과: ${sentenceChunks.length}개 청크`);
          
          // 각 청크를 별도의 페이지 아이템으로 처리
          sentenceChunks.forEach((chunk, chunkIndex) => {
            const chunkItem = {
              ...quizItem,
              work11Data: {
                ...work11Data,
                sentences: chunk
              },
              chunkIndex: chunkIndex,
              totalChunks: sentenceChunks.length
            };
            
            currentPageItems.push(chunkItem);
            currentColumnIndex++;
            
            // 2개 단이 채워지면 새 페이지로 이동
            if (currentColumnIndex >= 2) {
              distributedItems.push([...currentPageItems]);
              currentPageItems = [];
              currentColumnIndex = 0;
            }
          });
        } else {
          console.warn(`⚠️ 유형#11 데이터 없음:`, { quizData, quizItem, work11Data });
          // 데이터가 없는 경우 빈 아이템으로 처리
          currentPageItems.push(quizItem);
          currentColumnIndex++;
          
          if (currentColumnIndex >= 2) {
            distributedItems.push([...currentPageItems]);
            currentPageItems = [];
            currentColumnIndex = 0;
          }
        }
      } else {
        // 다른 유형들은 기존 로직대로 처리
        currentPageItems.push(quizItem);
        currentColumnIndex++;
        
        // 2개 단이 채워지면 새 페이지로 이동
        if (currentColumnIndex >= 2) {
          distributedItems.push([...currentPageItems]);
          currentPageItems = [];
          currentColumnIndex = 0;
        }
      }
    }
    
    // 마지막 페이지 처리
    if (currentPageItems.length > 0) {
      distributedItems.push(currentPageItems);
    }
    
    console.log(`✅ 패키지#02 분할 완료: 총 ${distributedItems.length}개 페이지 생성`);
    
    // 원본 배열 순서 그대로 사용 (문제생성 후 화면과 동일)
    console.log(`📋 원본 순서 유지:`, packageQuiz.map((item, index) => {
      const workTypeId = item.workTypeId || 'unknown';
      return `${index + 1}. 유형#${workTypeId}`;
    }));
    
    // 패키지#03과 동일한 단순한 로직: 복잡한 높이 계산 없이 2개씩 페이지에 배치
    
    // 페이지 렌더링 - 패키지#03과 동일한 단순한 로직
    console.log(`📄 총 ${distributedItems.length}개 페이지 생성 중...`);
    
    distributedItems.forEach((pageItems: any[], pageIndex: number) => {
      console.log(`  📋 페이지 ${pageIndex + 1}: ${pageItems.length}개 아이템`);
      
      // 원본 순서 유지 (정렬하지 않음)
      const sortedPageItems = pageItems;
      
      pages.push(
        <div key={`page-${pageIndex}`} id={`print-page-${pageIndex}`} className="print-page a4-landscape-page-template">
          <div className="a4-landscape-page-header">
            <PrintHeaderPackage02 />
          </div>
          
          <div className="a4-landscape-page-content">
            <div className="print-two-column-container">
              {sortedPageItems.map((quizItem: any, index: number) => {
                // 그리드 위치 계산 (홀수는 왼쪽, 짝수는 오른쪽)
                const gridColumn = (index % 2) + 1;
                console.log(`🎯 렌더링: 유형#${quizItem.workTypeId || 'unknown'}, 인덱스: ${index}, 그리드 컬럼: ${gridColumn}`);
          console.log(`🔍 아이템 ${index} 렌더링:`, {
            quizItem: quizItem,
            hasQuiz: !!quizItem.quiz,
            hasData: !!quizItem.data,
            workTypeId: quizItem.workTypeId,
            isAnswerMode: isAnswerMode,
            dataKeys: quizItem.data ? Object.keys(quizItem.data) : [],
            quizKeys: quizItem.quiz ? Object.keys(quizItem.quiz) : [],
            allKeys: Object.keys(quizItem),
            hasWork02Data: !!quizItem?.work02Data,
            hasWork03Data: !!quizItem?.work03Data,
            hasWork04Data: !!quizItem?.work04Data,
            hasWork05Data: !!quizItem?.work05Data,
            hasWork06Data: !!quizItem?.work06Data,
            hasWork07Data: !!quizItem?.work07Data,
            hasWork08Data: !!quizItem?.work08Data,
            hasWork09Data: !!quizItem?.work09Data,
            hasWork10Data: !!quizItem?.work10Data,
            hasWork11Data: !!quizItem?.work11Data,
            hasWork13Data: !!quizItem?.work13Data,
            hasWork14Data: !!quizItem?.work14Data
          });
          
          // 데이터 소스 결정
          const quizData = quizItem.quiz || quizItem.data;
          
          // Work_01: 문단 순서 맞추기
          if (quizItem.workTypeId === '01' && quizData && (quizData.shuffledParagraphs || quizData.choices)) {
            return (
              <div key={`print-01-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#01. 문단 순서 맞추기</span>
                  <span className="print-question-type-badge">유형#01</span>
                </div>
                <div className="print-instruction">
                  다음 단락들을 원래 순서대로 배열한 것을 고르세요
                </div>
                <div className="print-shuffled-paragraphs">
                  {quizData.shuffledParagraphs?.map((para: any, pIndex: number) => (
                    <div key={pIndex} className="print-paragraph-item">
                      <strong>{para.label}:</strong> {para.content}
                    </div>
                  ))}
                </div>
                <div className="print-options">
                  {isAnswerMode ? (
                    <div className="print-option">
                      {['①', '②', '③', '④'][quizData.answerIndex]} {quizData.choices?.[quizData.answerIndex]?.join(' → ')}
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    quizData.choices?.map((choice: string[], cIndex: number) => (
                      <div key={cIndex} className="print-option">
                        {['①', '②', '③', '④'][cIndex]} {choice.join(' → ')}
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && getTranslatedText(quizItem, quizData) && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{getTranslatedText(quizItem, quizData)}</div>
                  </div>
                )}
              </div>
            );
          }

          // Work_02: 유사단어 독해
          if (quizItem.workTypeId === '02') {
            console.log('🖨️ 패키지#02 유형#02 렌더링:', { 
              workTypeId: quizItem.workTypeId, 
              hasWork02Data: !!quizData?.work02Data, 
              hasQuizItemWork02Data: !!quizItem?.work02Data,
              hasQuizData: !!quizData,
              hasQuizItem: !!quizItem,
              quizDataKeys: quizData ? Object.keys(quizData) : [],
              quizItemKeys: quizItem ? Object.keys(quizItem) : [],
              quizData: quizData,
              quizItem: quizItem
            });
            
            // 데이터 구조 확인 및 수정
            let work02Data = quizData?.work02Data || quizItem?.work02Data;
            
            // 만약 work02Data가 없지만 quizData나 quizItem에 데이터가 있다면
            if (!work02Data && (quizData || quizItem)) {
              // quizData나 quizItem 자체가 work02Data일 수 있음
              work02Data = quizData || quizItem;
              console.log('🔄 work02Data를 quizData/quizItem으로 대체:', work02Data);
            }
            
            if (!work02Data) {
              console.error('❌ 패키지#02 유형#02 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-02-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#02. 유사단어 독해</span>
                    <span className="print-question-type-badge">유형#02</span>
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              );
            }
            
            return (
              <div key={`print-02-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
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
                      work02Data?.modifiedText || '', 
                      work02Data?.replacements || []
                    )
                  }}
                />
                {isAnswerMode && (
                  <div className="print-replacements-table">
                    <table>
                      <thead>
                        <tr>
                          <th>원래 단어</th>
                          <th>교체 단어</th>
                          <th>의미</th>
                        </tr>
                      </thead>
                      <tbody>
                        {work02Data?.replacements?.map((rep: any, rIndex: number) => (
                          <tr key={rIndex}>
                            <td className="original-word">{rep.original}</td>
                            <td className="replacement-word">{rep.replacement}</td>
                            <td className="original-meaning">{rep.originalMeaning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          }

          // Work_03: 빈칸(단어) 문제
          if (quizItem.workTypeId === '03') {
            console.log('🖨️ 패키지#02 유형#03 렌더링:', { 
              workTypeId: quizItem.workTypeId, 
              hasWork03Data: !!quizData?.work03Data, 
              hasQuizItemWork03Data: !!quizItem?.work03Data,
              hasQuizData: !!quizData,
              hasQuizItem: !!quizItem,
              quizDataKeys: quizData ? Object.keys(quizData) : [],
              quizItemKeys: quizItem ? Object.keys(quizItem) : [],
              quizData: quizData,
              quizItem: quizItem
            });
            
            // 데이터 구조 확인 및 수정
            let work03Data = quizData?.work03Data || quizItem?.work03Data;
            
            // 만약 work03Data가 없지만 quizData나 quizItem에 데이터가 있다면
            if (!work03Data && (quizData || quizItem)) {
              // quizData나 quizItem 자체가 work03Data일 수 있음
              work03Data = quizData || quizItem;
              console.log('🔄 work03Data를 quizData/quizItem으로 대체:', work03Data);
            }
            
            if (!work03Data) {
              console.error('❌ 패키지#02 유형#03 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-03-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#03. 빈칸(단어) 문제</span>
                    <span className="print-question-type-badge">유형#03</span>
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              );
            }
            
            return (
              <div key={`print-03-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#03. 빈칸(단어) 문제</span>
                  <span className="print-question-type-badge">유형#03</span>
                </div>
                <div className="print-instruction">
                  다음 빈칸에 들어갈 가장 적절한 단어를 고르세요
                </div>
                <div className="print-passage">
                  {work03Data?.blankedText}
                </div>
                <div className="print-options">
                  {isAnswerMode ? (
                    <div className="print-option">
                      {['①', '②', '③', '④', '⑤'][work03Data?.answerIndex]} {work03Data?.options?.[work03Data?.answerIndex]}
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    work03Data?.options?.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="print-option">
                        {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && getTranslatedText(quizItem, work03Data) && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{getTranslatedText(quizItem, work03Data)}</div>
                  </div>
                )}
              </div>
            );
          }

          // Work_04: 빈칸(구) 문제
          if (quizItem.workTypeId === '04') {
            console.log('🖨️ 패키지#02 유형#04 렌더링:', { 
              workTypeId: quizItem.workTypeId, 
              hasWork04Data: !!quizData?.work04Data, 
              hasQuizItemWork04Data: !!quizItem?.work04Data,
              hasQuizData: !!quizData,
              hasQuizItem: !!quizItem,
              quizDataKeys: quizData ? Object.keys(quizData) : [],
              quizItemKeys: quizItem ? Object.keys(quizItem) : [],
              quizData: quizData,
              quizItem: quizItem
            });
            
            // 데이터 구조 확인 및 수정
            let work04Data = quizData?.work04Data || quizItem?.work04Data;
            
            // 만약 work04Data가 없지만 quizData나 quizItem에 데이터가 있다면
            if (!work04Data && (quizData || quizItem)) {
              // quizData나 quizItem 자체가 work04Data일 수 있음
              work04Data = quizData || quizItem;
              console.log('🔄 work04Data를 quizData/quizItem으로 대체:', work04Data);
            }
            
            if (!work04Data) {
              console.error('❌ 패키지#02 유형#04 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-04-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#04. 빈칸(구) 문제</span>
                    <span className="print-question-type-badge">유형#04</span>
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              );
            }
            
            return (
              <div key={`print-04-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#04. 빈칸(구) 문제</span>
                  <span className="print-question-type-badge">유형#04</span>
                </div>
                <div className="print-instruction">
                  다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오
                </div>
                <div className="print-passage">
                  {work04Data?.blankedText || ''}
                </div>
                <div className="print-options">
                  {isAnswerMode ? (
                    <div className="print-option">
                      {['①', '②', '③', '④', '⑤'][work04Data?.answerIndex]} {work04Data?.options?.[work04Data?.answerIndex]}
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    work04Data?.options?.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="print-option">
                        {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && getTranslatedText(quizItem, work04Data) && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{getTranslatedText(quizItem, work04Data)}</div>
                  </div>
                )}
              </div>
            );
          }

          // Work_05: 빈칸(문장) 문제
          if (quizItem.workTypeId === '05') {
            console.log('🖨️ 패키지#02 유형#05 렌더링:', { 
              workTypeId: quizItem.workTypeId, 
              hasWork05Data: !!quizData?.work05Data, 
              hasQuizItemWork05Data: !!quizItem?.work05Data,
              hasQuizData: !!quizData,
              hasQuizItem: !!quizItem,
              quizDataKeys: quizData ? Object.keys(quizData) : [],
              quizItemKeys: quizItem ? Object.keys(quizItem) : [],
              quizData: quizData,
              quizItem: quizItem
            });
            
            // 데이터 구조 확인 및 수정
            let work05Data = quizData?.work05Data || quizItem?.work05Data;
            
            // 만약 work05Data가 없지만 quizData나 quizItem에 데이터가 있다면
            if (!work05Data && (quizData || quizItem)) {
              // quizData나 quizItem 자체가 work05Data일 수 있음
              work05Data = quizData || quizItem;
              console.log('🔄 work05Data를 quizData/quizItem으로 대체:', work05Data);
            }
            
            if (!work05Data) {
              console.error('❌ 패키지#02 유형#05 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-05-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#05. 빈칸(문장) 문제</span>
                    <span className="print-question-type-badge">유형#05</span>
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              );
            }
            
            return (
              <div key={`print-05-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#05. 빈칸(문장) 문제</span>
                  <span className="print-question-type-badge">유형#05</span>
                </div>
                <div className="print-instruction">
                  다음 빈칸에 들어갈 가장 적절한 문장을 고르세요
                </div>
                <div className="print-passage">
                  {work05Data?.blankedText || ''}
                </div>
                <div className="print-options">
                  {isAnswerMode ? (
                    <div className="print-option">
                      {['①', '②', '③', '④', '⑤'][work05Data?.answerIndex]} {work05Data?.options?.[work05Data?.answerIndex]}
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    work05Data?.options?.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="print-option">
                        {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && getTranslatedText(quizItem, work05Data) && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{getTranslatedText(quizItem, work05Data)}</div>
                  </div>
                )}
              </div>
            );
          }

          // Work_06: 문장 위치 찾기
          if (quizItem.workTypeId === '06') {
            console.log('🖨️ 패키지#02 유형#06 렌더링:', { 
              workTypeId: quizItem.workTypeId, 
              hasWork06Data: !!quizData?.work06Data, 
              hasQuizItemWork06Data: !!quizItem?.work06Data,
              hasQuizData: !!quizData,
              hasQuizItem: !!quizItem,
              quizDataKeys: quizData ? Object.keys(quizData) : [],
              quizItemKeys: quizItem ? Object.keys(quizItem) : []
            });
            
            let work06Data = quizData?.work06Data || quizItem?.work06Data;
            if (!work06Data && (quizData || quizItem)) {
              work06Data = quizData || quizItem;
              console.log('🔄 work06Data를 quizData/quizItem으로 대체:', work06Data);
            }
            
            if (!work06Data) {
              console.error('❌ 패키지#02 유형#06 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-06-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#06. 문장 위치 찾기</span>
                    <span className="print-question-type-badge">유형#06</span>
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={`print-06-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#06. 문장 위치 찾기</span>
                  <span className="print-question-type-badge">유형#06</span>
                </div>
                <div className="print-instruction">
                  다음 영어본문에서 주요문장이 들어가야 할 가장 적합한 위치를 찾으세오.
                </div>
                <div className="print-missing-sentence">
                  주요 문장: {work06Data?.missingSentence || ''}
                </div>
                <div className="print-numbered-passage">
                  {work06Data?.numberedPassage || ''}
                </div>
                {isAnswerMode && (
                  <div className="print-work06-answer">
                    정답: {['①', '②', '③', '④', '⑤'][work06Data?.answerIndex]}
                  </div>
                )}
                {isAnswerMode && getTranslatedText(quizItem, work06Data) && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{getTranslatedText(quizItem, work06Data)}</div>
                  </div>
                )}
              </div>
            );
          }

          // Work_07: 주제 추론
          if (quizItem.workTypeId === '07') {
            console.log('🖨️ 패키지#02 유형#07 렌더링:', { workTypeId: quizItem.workTypeId });
            let work07Data = quizData?.work07Data || quizItem?.work07Data;
            if (!work07Data && (quizData || quizItem)) {
              work07Data = quizData || quizItem;
              console.log('🔄 work07Data를 quizData/quizItem으로 대체:', work07Data);
            }
            if (!work07Data) {
              console.error('❌ 패키지#02 유형#07 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-07-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#07. 주제 추론</span>
                    <span className="print-question-type-badge">유형#07</span>
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={`print-07-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#07. 주제 추론</span>
                  <span className="print-question-type-badge">유형#07</span>
                </div>
                <div className="print-instruction">
                  다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요
                </div>
                <div className="print-passage">
                  {work07Data?.passage || ''}
                </div>
                <div className="print-options">
                  {isAnswerMode ? (
                    <div className="print-option">
                      {['①', '②', '③', '④', '⑤'][work07Data?.answerIndex]} {work07Data?.options?.[work07Data?.answerIndex]}
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    work07Data?.options?.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="print-option">
                        {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && getTranslatedText(quizItem, work07Data) && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{getTranslatedText(quizItem, work07Data)}</div>
                  </div>
                )}
              </div>
            );
          }

          // Work_08: 제목 추론
          if (quizItem.workTypeId === '08') {
            console.log('🖨️ 패키지#02 유형#08 렌더링:', { workTypeId: quizItem.workTypeId });
            let work08Data = quizData?.work08Data || quizItem?.work08Data;
            if (!work08Data && (quizData || quizItem)) {
              work08Data = quizData || quizItem;
              console.log('🔄 work08Data를 quizData/quizItem으로 대체:', work08Data);
            }
            if (!work08Data) {
              console.error('❌ 패키지#02 유형#08 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-08-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#08. 제목 추론</span>
                    <span className="print-question-type-badge">유형#08</span>
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={`print-08-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#08. 제목 추론</span>
                  <span className="print-question-type-badge">유형#08</span>
                </div>
                <div className="print-instruction">
                  다음 본문에 가장 적합한 제목을 고르세요
                </div>
                <div className="print-passage">
                  {work08Data?.passage || ''}
                </div>
                <div className="print-options">
                  {isAnswerMode ? (
                    <div className="print-option">
                      {`①②③④⑤`[work08Data?.answerIndex]} {work08Data?.options?.[work08Data?.answerIndex]}
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    work08Data?.options?.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="print-option">
                        {`①②③④⑤`[optIndex]} {option}
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && getTranslatedText(quizItem, work08Data) && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{getTranslatedText(quizItem, work08Data)}</div>
                  </div>
                )}
              </div>
            );
          }

          // Work_09: 어법 오류 찾기
          if (quizItem.workTypeId === '09') {
            console.log('🖨️ 패키지#02 유형#09 렌더링:', { workTypeId: quizItem.workTypeId });
            let work09Data = quizData?.work09Data || quizItem?.work09Data;
            if (!work09Data && (quizData || quizItem)) {
              work09Data = quizData || quizItem;
              console.log('🔄 work09Data를 quizData/quizItem으로 대체:', work09Data);
            }
            if (!work09Data) {
              console.error('❌ 패키지#02 유형#09 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-09-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#09. 어법 오류 찾기</span>
                    <span className="print-question-type-badge">유형#09</span>
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={`print-09-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#09. 어법 오류 찾기</span>
                  <span className="print-question-type-badge">유형#09</span>
                </div>
                <div className="print-instruction">
                  다음 영어 본문에 표시된 단어들 중에서 어법상 틀린 것을 고르시오.
                </div>
                <div 
                  className="print-passage"
                  dangerouslySetInnerHTML={{
                    __html: (work09Data?.passage || '').replace(/\n/g, '<br/>')
                  }}
                />
                <div className="print-options">
                  {isAnswerMode ? (
                    <div className="print-option">
                      {['①', '②', '③', '④', '⑤'][work09Data?.answerIndex]} {work09Data?.options?.[work09Data?.answerIndex]}
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    work09Data?.options?.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="print-option">
                        {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && getTranslatedText(quizItem, work09Data) && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{getTranslatedText(quizItem, work09Data)}</div>
                  </div>
                )}
              </div>
            );
          }

          // Work_10: 다중 어법 오류
          if (quizItem.workTypeId === '10') {
            console.log('🖨️ 패키지#02 유형#10 렌더링:', { workTypeId: quizItem.workTypeId });
            let work10Data = quizData?.work10Data || quizItem?.work10Data;
            if (!work10Data && (quizData || quizItem)) {
              work10Data = quizData || quizItem;
              console.log('🔄 work10Data를 quizData/quizItem으로 대체:', work10Data);
            }
            if (!work10Data) {
              console.error('❌ 패키지#02 유형#10 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-10-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#10. 다중 어법 오류</span>
                    <span className="print-question-type-badge">유형#10</span>
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={`print-10-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#10. 다중 어법 오류</span>
                  <span className="print-question-type-badge">유형#10</span>
                </div>
                <div className="print-instruction">
                  다음 영어 본문에 표시된 단어들 중에서 어법상 틀린 단어의 개수를 고르시오.
                </div>
                <div 
                  className="print-passage"
                  dangerouslySetInnerHTML={{
                    __html: work10Data?.passage?.replace(/\n/g, '<br/>') || ''
                  }}
                />
                <div className="print-options">
                  {isAnswerMode ? (
                    <div className="print-option">
                      {['①', '②', '③', '④', '⑤', '⑥'][work10Data?.answerIndex]} {work10Data?.options?.[work10Data?.answerIndex]}개
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    work10Data?.options?.map((option: number, optIndex: number) => (
                      <div key={optIndex} className="print-option">
                        {['①', '②', '③', '④', '⑤', '⑥'][optIndex]} {option}개
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && getTranslatedText(quizItem, work10Data) && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{getTranslatedText(quizItem, work10Data)}</div>
                  </div>
                )}
              </div>
            );
          }

          // Work_12: 단어 학습
          if (quizItem.workTypeId === '12') {
            console.log('🖨️ 패키지#02 유형#12 렌더링:', { workTypeId: quizItem.workTypeId });
            let work12Data = quizData?.work12Data || quizItem?.work12Data;
            if (!work12Data && (quizData || quizItem)) {
              work12Data = quizData || quizItem;
              console.log('🔄 work12Data를 quizData/quizItem으로 대체:', work12Data);
            }
            if (!work12Data) {
              console.error('❌ 패키지#02 유형#12 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-12-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#12. 단어 학습</span>
                    <span className="print-question-type-badge">유형#12</span>
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={`print-12-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#12. 단어 학습</span>
                  <span className="print-question-type-badge">유형#12</span>
                </div>
                <div className="print-instruction">
                  다음 단어들의 의미를 학습하세요
                </div>
                <div className="print-passage">
                  {work12Data?.passage || ''}
                </div>
                {isAnswerMode && work12Data?.words && (
                  <div className="print-options">
                    <div className="print-option-label">단어 목록:</div>
                    {work12Data.words.map((word: any, wIndex: number) => (
                      <div key={wIndex} className="print-option">
                        <strong>{word.word}</strong>: {word.meaning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Work_11: 본문 문장별 해석
          if (quizItem.workTypeId === '11') {
            console.log('🖨️ 패키지#02 유형#11 렌더링:', { 
              workTypeId: quizItem.workTypeId,
              hasWork11Data: !!quizData?.work11Data,
              hasQuizItemWork11Data: !!quizItem?.work11Data,
              hasQuizData: !!quizData,
              hasQuizItem: !!quizItem,
              hasDataWork11Data: !!quizData?.data?.work11Data, // Firebase에서 불러온 데이터 구조 확인
              quizDataKeys: quizData ? Object.keys(quizData) : [],
              quizItemKeys: quizItem ? Object.keys(quizItem) : [],
              quizData: quizData,
              quizItem: quizItem
            });
            // Firebase에서 불러온 데이터 구조 처리 (data.work11Data)
            let work11Data = quizData?.work11Data || quizItem?.work11Data || quizData?.data?.work11Data;
            if (!work11Data && (quizData || quizItem)) {
              work11Data = quizData || quizItem;
              console.log('🔄 work11Data를 quizData/quizItem으로 대체:', work11Data);
            }
            if (!work11Data || !work11Data.sentences || work11Data.sentences.length === 0) {
              console.error('❌ 패키지#02 유형#11 데이터 없음:', { 
                quizData, 
                quizItem, 
                work11Data,
                hasSentences: work11Data?.sentences?.length || 0
              });
              return (
                <div key={`print-11-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#11. 본문 문장별 해석</span>
                    <span className="print-question-type-badge">유형#11</span>
                    {quizItem.chunkIndex !== undefined && (
                      <span className="print-chunk-info">
                        ({quizItem.chunkIndex + 1}/{quizItem.totalChunks})
                      </span>
                    )}
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                    <p>문장 수: {work11Data?.sentences?.length || 0}</p>
                  </div>
                </div>
              );
            }
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
              <div key={`print-11-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#11. 본문 문장별 해석</span>
                  <span className="print-question-type-badge">유형#11</span>
                  {quizItem.chunkIndex !== undefined && (
                    <span className="print-chunk-info">
                      ({quizItem.chunkIndex + 1}/{quizItem.totalChunks})
                    </span>
                  )}
                </div>
                <div className="print-instruction">
                  다음 본문을 문장별로 해석하세요
                </div>
                {work11Data?.sentences?.map((sentence: any, sIndex: number) => {
                  const globalSentenceNumber = getGlobalSentenceNumber(sIndex);
                  
                  // 다양한 데이터 구조 지원
                  const englishText = sentence.english || sentence.text || sentence || '';
                  const koreanText = sentence.korean || sentence.translation || '';
                  
                  console.log(`📝 문장 ${sIndex + 1} 렌더링:`, {
                    sentence: sentence,
                    englishText: englishText,
                    koreanText: koreanText,
                    globalSentenceNumber: globalSentenceNumber
                  });
                  
                  return (
                    <div key={sIndex} className="print-sentence-item">
                      <div className="print-sentence-english">
                        <span className="sentence-number">{String(globalSentenceNumber).padStart(2, '0')}. </span>
                        {englishText}
                        {isAnswerMode && koreanText && (
                          <div className="print-sentence-korean-inline">
                            {koreanText}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          // Work_13: 빈칸 채우기 (단어-주관식)
          if (quizItem.workTypeId === '13') {
            console.log('🖨️ 패키지#02 유형#13 렌더링:', { 
              workTypeId: quizItem.workTypeId,
              hasWork13Data: !!quizData?.work13Data,
              hasQuizItemWork13Data: !!quizItem?.work13Data,
              hasQuizData: !!quizData,
              hasQuizItem: !!quizItem,
              hasDataWork13Data: !!quizData?.data?.work13Data, // Firebase에서 불러온 데이터 구조 확인
              quizDataKeys: quizData ? Object.keys(quizData) : [],
              quizItemKeys: quizItem ? Object.keys(quizItem) : [],
              quizData: quizData,
              quizItem: quizItem
            });
            // Firebase에서 불러온 데이터 구조 처리 (data.work13Data)
            let work13Data = quizData?.work13Data || quizItem?.work13Data || quizData?.data?.work13Data;
            if (!work13Data && (quizData || quizItem)) {
              work13Data = quizData || quizItem;
              console.log('🔄 work13Data를 quizData/quizItem으로 대체:', work13Data);
            }
            if (!work13Data) {
              console.error('❌ 패키지#02 유형#13 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-13-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#13. 빈칸 채우기 (단어-주관식)</span>
                    <span className="print-question-type-badge">유형#13</span>
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={`print-13-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#13. 빈칸 채우기 (단어-주관식)</span>
                  <span className="print-question-type-badge">유형#13</span>
                </div>
                <div className="print-instruction">
                  다음 빈칸에 들어갈 적절한 단어를 쓰시오
                </div>
                <div className="print-passage">
                  {isAnswerMode ? (
                    // 정답 모드: 괄호 안에 정답 표시 (파란색 진하게)
                    <span dangerouslySetInnerHTML={{
                      __html: (() => {
                        const blankedText = work13Data?.blankedText || '';
                        const correctAnswers = work13Data?.correctAnswers || [];
                        let result = blankedText;
                        
                        // 각 빈칸을 정답으로 교체 (파란색 진하게 표시)
                        correctAnswers.forEach((answer: string, index: number) => {
                          const blankPattern = /\([^)]*\)/g;
                          let matchCount = 0;
                          result = result.replace(blankPattern, (match: string) => {
                            if (matchCount === index) {
                              matchCount++;
                              return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
                            }
                            matchCount++;
                            return match;
                          });
                        });
                        
                        return result;
                      })()
                    }} />
                  ) : (
                    // 문제 모드: 빈칸 그대로 표시
                    work13Data?.blankedText || ''
                  )}
                </div>
              </div>
            );
          }

          // Work_14: 빈칸 채우기 (문장-주관식)
          if (quizItem.workTypeId === '14') {
            console.log('🖨️ 패키지#02 유형#14 렌더링:', { 
              workTypeId: quizItem.workTypeId,
              hasWork14Data: !!quizData?.work14Data,
              hasQuizItemWork14Data: !!quizItem?.work14Data,
              hasQuizData: !!quizData,
              hasQuizItem: !!quizItem,
              hasDataWork14Data: !!quizData?.data?.work14Data, // Firebase에서 불러온 데이터 구조 확인
              quizDataKeys: quizData ? Object.keys(quizData) : [],
              quizItemKeys: quizItem ? Object.keys(quizItem) : [],
              quizData: quizData,
              quizItem: quizItem
            });
            // Firebase에서 불러온 데이터 구조 처리 (data.work14Data)
            let work14Data = quizData?.work14Data || quizItem?.work14Data || quizData?.data?.work14Data;
            if (!work14Data && (quizData || quizItem)) {
              work14Data = quizData || quizItem;
              console.log('🔄 work14Data를 quizData/quizItem으로 대체:', work14Data);
            }
            if (!work14Data) {
              console.error('❌ 패키지#02 유형#14 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-14-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                  <div className="print-question-title">
                    <span>#14. 빈칸 채우기 (문장-주관식)</span>
                    <span className="print-question-type-badge">유형#14</span>
                  </div>
                  <div className="print-question-content">
                    <p>데이터를 불러올 수 없습니다.</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={`print-14-${index}`} className="print-question-card" style={{ gridColumn: gridColumn }}>
                <div className="print-question-title">
                  <span>#14. 빈칸 채우기 (문장-주관식)</span>
                  <span className="print-question-type-badge">유형#14</span>
                </div>
                <div className="print-instruction">
                  다음 빈칸에 들어갈 적절한 문장을 쓰시오
                </div>
                <div className="print-passage" style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  overflow: 'hidden'
                }}>
                  {isAnswerMode ? (
                    // 정답 모드: 괄호 안에 정답 표시 (파란색 진하게)
                    <span dangerouslySetInnerHTML={{
                      __html: (() => {
                        // 정답 문장에서 빈칸 패턴 제거하는 헬퍼 함수
                        const cleanAnswer = (answer: string): string => {
                          if (!answer) return answer;
                          let clean = answer;
                          // 패턴 1: (____________________A____________________) 형식 (긴 언더스코어, 알파벳 앞뒤)
                          clean = clean.replace(/\(_{5,}[A-Z]_{5,}\)/g, '').trim();
                          // 패턴 2: (_+A_+) - 언더스코어 앞뒤 (짧은 경우)
                          clean = clean.replace(/\(_+[A-Z]_+\)/g, '').trim();
                          // 패턴 3: ( A _+ ) 또는 ( A_+ )
                          clean = clean.replace(/\(\s*[A-Z]\s*_+\s*\)/g, '').trim();
                          clean = clean.replace(/\(\s*[A-Z]_+\s*\)/g, '').trim();
                          // 패턴 4: (A_+) - 공백 없는 경우
                          clean = clean.replace(/\([A-Z]_+\)/g, '').trim();
                          // 패턴 5: ( _+ ) 일반 빈칸
                          clean = clean.replace(/\(_+\)/g, '').trim();
                          // 패턴 6: 공백 포함 모든 패턴
                          clean = clean.replace(/\(\s*[A-Z]?\s*_+\s*[A-Z]?\s*\)/g, '').trim();
                          // 패턴 7: 언더스코어가 3개 이상이고 알파벳이 포함된 모든 패턴
                          clean = clean.replace(/\([^)]*_{3,}[^)]*[A-Z][^)]*\)/g, '').trim();
                          clean = clean.replace(/\([^)]*[A-Z][^)]*_{3,}[^)]*\)/g, '').trim();
                          return clean;
                        };

                        const blankedText = work14Data?.blankedText || '';
                        const correctAnswers = work14Data?.correctAnswers || work14Data?.selectedSentences || [];
                        let result = blankedText;
                        
                        if (correctAnswers.length === 0) {
                          return result;
                        }
                        
                        let answerIndex = 0;
                        
                        // 패턴 1: ( 공백 + 알파벳 + 공백 + 언더스코어들 + ) - 공백 있는 경우
                        const blankPattern1 = /\( [A-Z] _+\)/g;
                        result = result.replace(blankPattern1, (match: string) => {
                          if (answerIndex < correctAnswers.length) {
                            const answer = cleanAnswer(correctAnswers[answerIndex]);
                            answerIndex++;
                            return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
                          }
                          return match;
                        });
                        
                        // 패턴 2: ( 공백 + 알파벳 + 언더스코어들 + ) - 알파벳과 언더스코어 사이 공백 없는 경우
                        if (answerIndex < correctAnswers.length) {
                          const blankPattern2 = /\( [A-Z]_+\)/g;
                          result = result.replace(blankPattern2, (match: string) => {
                            if (answerIndex < correctAnswers.length) {
                              const answer = cleanAnswer(correctAnswers[answerIndex]);
                              answerIndex++;
                              return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
                            }
                            return match;
                          });
                        }
                        
                        // 패턴 3: ( 알파벳 + 언더스코어들 + ) - (A_______) 형식 (공백 없음)
                        if (answerIndex < correctAnswers.length) {
                          const blankPattern3 = /\(([A-Z])([_]+)\)/g;
                          result = result.replace(blankPattern3, (match: string) => {
                            if (answerIndex < correctAnswers.length) {
                              const answer = cleanAnswer(correctAnswers[answerIndex]);
                              answerIndex++;
                              return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
                            }
                            return match;
                          });
                        }
                        
                        // 패턴 4: ( 언더스코어들 + 알파벳 + 언더스코어들 + ) - (___A___) 또는 (____________________A____________________) 형식
                        if (answerIndex < correctAnswers.length) {
                          const blankPattern4 = /\(_+[A-Z]_+\)/g;
                          result = result.replace(blankPattern4, (match: string) => {
                            if (answerIndex < correctAnswers.length) {
                              const answer = cleanAnswer(correctAnswers[answerIndex]);
                              answerIndex++;
                              return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
                            }
                            return match;
                          });
                        }
                        
                        // 패턴 5: ( 언더스코어들 + 알파벳 + 언더스코어들 + ) - (____________________A____________________) 형식 (긴 언더스코어)
                        if (answerIndex < correctAnswers.length) {
                          const blankPattern5 = /\(_{10,}[A-Z]_{10,}\)/g;
                          result = result.replace(blankPattern5, (match: string) => {
                            if (answerIndex < correctAnswers.length) {
                              const answer = cleanAnswer(correctAnswers[answerIndex]);
                              answerIndex++;
                              return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
                            }
                            return match;
                          });
                        }
                        
                        // 패턴 6: 모든 언더스코어 포함 빈칸 패턴 (어떤 형식이든 매칭) - 최종 fallback
                        if (answerIndex < correctAnswers.length) {
                          // 이미 정답으로 치환된 부분을 제외한 모든 언더스코어 포함 괄호 패턴 매칭
                          const generalPattern = /\([^)]*_[^)]*\)/g;
                          result = result.replace(generalPattern, (match: string) => {
                            // 이미 정답으로 치환된 부분은 건너뛰기
                            if (match.includes('<span') || match.includes('</span>')) {
                              return match;
                            }
                            // 일반 텍스트만 포함한 경우는 건너뛰기 (예: "(example)")
                            if (!match.includes('_')) {
                              return match;
                            }
                            if (answerIndex < correctAnswers.length) {
                              const answer = cleanAnswer(correctAnswers[answerIndex]);
                              answerIndex++;
                              return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
                            }
                            return match;
                          });
                        }
                        
                        return result;
                      })()
                    }} />
                  ) : (
                    // 문제 모드: 빈칸 그대로 표시 (빈칸 패턴에 nowrap 적용)
                    (() => {
                      const blankedText = work14Data?.blankedText || '';
                      // 빈칸 패턴을 찾아서 ( A 부분은 줄바꿈 방지, 언더스코어 부분은 줄바꿈 가능
                      // 패턴: ( A_______) 
                      const blankPattern = /\( ([A-Z])([_]+)\)/g;
                      const processedText = blankedText.replace(blankPattern, (match: string, alphabet: string, underscores: string) => {
                        return `<span style="white-space: nowrap;">( ${alphabet}</span>${underscores})`;
                      });
                      return <span dangerouslySetInnerHTML={{ __html: processedText }} />;
                    })()
                  )}
                </div>
                {isAnswerMode && getTranslatedText(quizItem, quizData) && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{getTranslatedText(quizItem, quizData)}</div>
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
    <div 
      id={isAnswerMode ? "print-root-package02-answer" : "print-root-package02"}
      className={isAnswerMode ? "print-container-answer" : "print-container"}
    >
      {renderQuizItems()}
    </div>
  );
};

export default PrintFormatPackage02;

