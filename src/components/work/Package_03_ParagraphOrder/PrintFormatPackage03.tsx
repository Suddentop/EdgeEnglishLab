import React from 'react';
import PrintHeaderPackage03 from './PrintHeaderPackage03';
import './PrintFormatPackage03.css';

interface PackageQuizItem {
  workTypeId?: string;
  quiz?: any;
  data?: any;
  work01Data?: any;
  work02Data?: any;
  work07Data?: any;
  work08Data?: any;
  work13Data?: any;
  work14Data?: any;
  translatedText?: string;
}

interface PrintFormatPackage03Props {
  packageQuiz: PackageQuizItem[];
  isAnswerMode?: boolean;
}

const PrintFormatPackage03: React.FC<PrintFormatPackage03Props> = ({ packageQuiz, isAnswerMode = false }) => {
  console.log('🔍 PrintFormatPackage03 렌더링:', { 
    isAnswerMode, 
    packageQuizLength: packageQuiz.length,
    packageQuiz: packageQuiz,
    firstItem: packageQuiz[0],
    firstItemKeys: packageQuiz[0] ? Object.keys(packageQuiz[0]) : []
  });
  
  // 본문에서 교체된 단어에 밑줄 표시 - Work_02 전용
  const renderTextWithHighlight = (text: string, replacements: any[]) => {
    if (!replacements || replacements.length === 0) return text;
    if (!text) return '';
    
    let result = text;
    
    // 모든 교체된 단어를 본문에서 찾아 강조 (문장별 매칭이 아닌 전체 본문에서 찾기)
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

  // 페이지 분할 로직: 2단 레이아웃에 맞는 동적 페이지 분할
  const renderQuizItems = (): JSX.Element[] => {
    const pages: JSX.Element[] = [];
    const itemsPerPage = 2; // 페이지당 최대 2개 문제 유형
    
    // 패키지 퀴즈를 단별로 분할 (문제/정답 모드 동일)
    const distributedItems: PackageQuizItem[][] = [];
    let currentPageItems: PackageQuizItem[] = [];
    let currentColumnIndex = 0; // 현재 단 인덱스 (0: 좌측, 1: 우측)
    
    for (let i = 0; i < packageQuiz.length; i++) {
      const quizItem = packageQuiz[i];
      
      // 데이터 소스 결정 - Package#03은 workXXData 구조 사용
      let quizData: any;
      if (quizItem.workTypeId === '01') {
        quizData = quizItem.work01Data || quizItem.quiz || quizItem.data;
      } else if (quizItem.workTypeId === '02') {
        quizData = quizItem.work02Data || quizItem.data;
      } else if (quizItem.workTypeId === '07') {
        quizData = quizItem.work07Data || quizItem.data;
      } else if (quizItem.workTypeId === '08') {
        quizData = quizItem.work08Data || quizItem.data;
      } else if (quizItem.workTypeId === '13') {
        quizData = quizItem.work13Data || quizItem.data;
      } else if (quizItem.workTypeId === '14') {
        quizData = quizItem.work14Data || quizItem.data;
      } else {
        quizData = quizItem.work01Data || quizItem.work02Data || quizItem.work07Data || quizItem.work08Data || quizItem.work13Data || quizItem.work14Data || quizItem.quiz || quizItem.data;
      }
      
      console.log(`🔍 Package#03 아이템 ${i} 분석:`, {
        quizItem: quizItem,
        workTypeId: quizItem.workTypeId,
        quizData: quizData,
        hasQuizData: !!quizData,
        quizDataKeys: quizData ? Object.keys(quizData) : [],
        hasWork01Data: !!quizItem.work01Data,
        hasWork02Data: !!quizItem.work02Data,
        hasWork07Data: !!quizItem.work07Data,
        hasWork08Data: !!quizItem.work08Data,
        hasWork13Data: !!quizItem.work13Data,
        hasWork14Data: !!quizItem.work14Data,
        keys: Object.keys(quizItem)
      });
      
      // 모든 유형을 동일한 방식으로 처리 (문제/정답 모드 구분 없음)
      currentPageItems.push(quizItem);
      currentColumnIndex++;
      
      // 2개 단이 채워지면 새 페이지로 이동
      if (currentColumnIndex >= 2) {
        distributedItems.push([...currentPageItems]);
        currentPageItems = [];
        currentColumnIndex = 0;
      }
    }
    
    // 마지막 페이지 처리
    if (currentPageItems.length > 0) {
      distributedItems.push(currentPageItems);
    }
    
    // 마지막 유형의 translation 수집 (인쇄 정답 모드일 때만)
    // 유형#01의 경우 각 문제마다 이미 translation이 포함되어 있으므로 마지막에 전체 translation을 추가하지 않음
    const hasWork01 = packageQuiz.some(item => item.workTypeId === '01');
    
    let lastTranslation: string | null = null;
    if (isAnswerMode && packageQuiz.length > 0 && !hasWork01) {
      const lastQuizItem = packageQuiz[packageQuiz.length - 1];
      let lastQuizData: any;
      if (lastQuizItem.workTypeId === '01') {
        lastQuizData = lastQuizItem.work01Data || lastQuizItem.quiz || lastQuizItem.data;
      } else if (lastQuizItem.workTypeId === '02') {
        lastQuizData = lastQuizItem.work02Data || lastQuizItem.data;
      } else if (lastQuizItem.workTypeId === '07') {
        lastQuizData = lastQuizItem.work07Data || lastQuizItem.data;
      } else if (lastQuizItem.workTypeId === '08') {
        lastQuizData = lastQuizItem.work08Data || lastQuizItem.data;
      } else if (lastQuizItem.workTypeId === '13') {
        lastQuizData = lastQuizItem.work13Data || lastQuizItem.data;
      } else if (lastQuizItem.workTypeId === '14') {
        lastQuizData = lastQuizItem.work14Data || lastQuizItem.data;
      } else {
        lastQuizData = lastQuizItem.work01Data || lastQuizItem.work02Data || lastQuizItem.work07Data || lastQuizItem.work08Data || lastQuizItem.work13Data || lastQuizItem.work14Data || lastQuizItem.quiz || lastQuizItem.data;
      }
      
      const translation = lastQuizItem.translatedText || lastQuizData?.translation;
      if (translation && translation.trim()) {
        lastTranslation = translation;
      }
    }
    
    // 마지막 유형 다음 단에 translation 섹션 추가
    // 유형#01의 경우 각 문제마다 이미 translation이 포함되어 있으므로 추가하지 않음
    if (isAnswerMode && lastTranslation && !hasWork01 && distributedItems.length > 0) {
      const lastPage = distributedItems[distributedItems.length - 1];
      const lastPageItemCount = lastPage.length;
      
      // 마지막 유형이 왼쪽 단(첫 번째 아이템)에 있으면 오른쪽 단에 추가
      // 마지막 유형이 오른쪽 단(두 번째 아이템)에 있으면 다음 페이지의 왼쪽 단에 추가
      if (lastPageItemCount === 1) {
        // 마지막 유형이 왼쪽 단에 있음 -> 오른쪽 단에 본문해석 추가
        const translationItem: PackageQuizItem = {
          workTypeId: 'translation',
          translatedText: lastTranslation
        } as PackageQuizItem;
        lastPage.push(translationItem);
      } else {
        // 마지막 유형이 오른쪽 단에 있음 -> 다음 페이지의 왼쪽 단에 본문해석 추가
        const translationItem: PackageQuizItem = {
          workTypeId: 'translation',
          translatedText: lastTranslation
        } as PackageQuizItem;
        distributedItems.push([translationItem]);
      }
    }
    
    // 페이지 렌더링
    distributedItems.forEach((pageItems: PackageQuizItem[], pageIndex: number) => {
      pages.push(
        <div key={`page-${pageIndex}`} className="a4-landscape-page-template">
          <div className="a4-landscape-page-header">
            <PrintHeaderPackage03 />
          </div>
          
          <div className="a4-landscape-page-content">
            <div className="print-two-column-container">
              {pageItems.map((quizItem: PackageQuizItem, index: number) => {
                // 마지막 페이지에 아이템이 하나만 있고, 현재 아이템이 마지막인 경우 빈 div 추가
                const isLastPage = pageIndex === distributedItems.length - 1;
                const isSingleItemOnLastPage = isLastPage && pageItems.length === 1;
                const isLastItem = index === pageItems.length - 1;
                // 데이터 소스 결정
                let quizData: any;
                if (quizItem.workTypeId === '01') {
                  quizData = quizItem.work01Data || quizItem.quiz || quizItem.data;
                } else if (quizItem.workTypeId === '02') {
                  quizData = quizItem.work02Data || quizItem.data;
                } else if (quizItem.workTypeId === '07') {
                  quizData = quizItem.work07Data || quizItem.data;
                } else if (quizItem.workTypeId === '08') {
                  quizData = quizItem.work08Data || quizItem.data;
                } else if (quizItem.workTypeId === '13') {
                  quizData = quizItem.work13Data || quizItem.data;
                } else if (quizItem.workTypeId === '14') {
                  quizData = quizItem.work14Data || quizItem.data;
                } else {
                  quizData = quizItem.work01Data || quizItem.work02Data || quizItem.work07Data || quizItem.work08Data || quizItem.work13Data || quizItem.work14Data || quizItem.quiz || quizItem.data;
                }
                
                console.log(`🔍 Package#03 렌더링 아이템 ${index}:`, {
                  workTypeId: quizItem.workTypeId,
                  quizData: quizData,
                  hasQuizData: !!quizData
                });
                
          // Work_01: 문단 순서 맞추기
          if (quizItem.workTypeId === '01' && quizData && quizData.shuffledParagraphs) {
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
                  {quizData.shuffledParagraphs?.map((para: any, pIndex: number) => (
                    <div key={pIndex} className="print-paragraph-item">
                      <strong>{para.label}:</strong> {para.content}
                    </div>
                  ))}
                </div>
                <div className="print-options">
                  {quizData.choices?.map((choice: string[], cIndex: number) => (
                    <div key={cIndex} className="print-option">
                      {['①', '②', '③', '④'][cIndex]} {choice.join(' → ')}
                      {isAnswerMode && cIndex === quizData.answerIndex && (
                        <span className="print-answer-mark">(정답)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Work_02: 유사단어 독해
          if (quizItem.workTypeId === '02') {
            console.log('🖨️ 패키지#03 유형#02 렌더링:', { 
              workTypeId: quizItem.workTypeId, 
              hasQuizData: !!quizData,
              hasModifiedText: !!quizData?.modifiedText,
              hasReplacements: !!quizData?.replacements,
              quizData: quizData,
              quizItem: quizItem
            });
            
            if (!quizData || (!quizData.modifiedText && !quizData.replacements)) {
              console.error('❌ 패키지#03 유형#02 데이터 없음:', { quizData, quizItem });
              return (
                <div key={`print-02-${index}`} className="print-question-card">
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
                      quizData.modifiedText || '', 
                      quizData.replacements || []
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
                        {quizData.replacements?.map((rep: any, rIndex: number) => (
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

          // Work_07: 주제 추론
          if (quizItem.workTypeId === '07' && quizData && quizData.passage) {
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
                  {quizData.passage}
                </div>
                <div className="print-options">
                  {quizData.options?.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                      {isAnswerMode && optIndex === quizData.answerIndex && (
                        <span className="print-answer-mark">(정답)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Work_08: 제목 추론
          if (quizItem.workTypeId === '08' && quizData && quizData.passage) {
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
                  {quizData.passage}
                </div>
                <div className="print-options">
                  {quizData.options?.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {`①②③④⑤`[optIndex]} {option}
                      {isAnswerMode && optIndex === quizData.answerIndex && (
                        <span className="print-answer-mark">(정답)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Work_13: 빈칸 채우기 (단어-주관식)
          if (quizItem.workTypeId === '13' && quizData && quizData.blankedText) {
            console.log('🔍 Work_13 데이터 확인:', {
              blankedText: quizData.blankedText,
              hasBlankedText: !!quizData.blankedText,
              blankedTextLength: quizData.blankedText?.length,
              containsUnderscore: quizData.blankedText?.includes('_'),
              containsBlank: quizData.blankedText?.includes('(______)'),
              correctAnswers: quizData.correctAnswers,
              isAnswerMode: isAnswerMode
            });
            
            // 정답 모드일 때 빈칸을 정답으로 채우기
            const fillBlanksWithAnswers = (text: string, answers: string[]): string => {
              console.log('🔧 유형#13 빈칸 채우기:', { text, answers });
              if (!answers || answers.length === 0) {
                console.log('❌ 유형#13 정답 없음');
                return text;
              }
              
              let result = text;
              let answerIndex = 0;
              
              // 다양한 빈칸 패턴을 정답으로 교체
              // ( ), (  ), (___), (____) 등 다양한 패턴 지원
              result = result.replace(/\(\s*_*\s*\)/g, () => {
                if (answerIndex < answers.length) {
                  const answer = answers[answerIndex];
                  console.log(`✅ 유형#13 정답 ${answerIndex + 1}: ${answer}`);
                  answerIndex++;
                  return `( <span class="print-blank-filled-answer">${answer}</span> )`;
                }
                return '( )';
              });
              
              console.log('🔧 유형#13 최종 텍스트:', result);
              return result;
            };
            
            // correctAnswers가 없으면 selectedSentences 사용
            const answers = quizData.correctAnswers || quizData.selectedSentences || [];
            
            // 문제 모드에서 빈칸을 원래 단어 길이만큼의 "_"로 표시하고 " _ "로 변경
            const formatBlanksForProblem = (text: string, correctAnswers: string[]): string => {
              if (!text || !correctAnswers || correctAnswers.length === 0) {
                return text;
              }
              
              let result = text;
              let answerIndex = 0;
              
              // 다양한 빈칸 패턴을 찾아서 원래 단어 길이만큼의 "_"로 교체
              // ( ), (  ), (___), (____), (_______________) 등 다양한 패턴 지원
              result = result.replace(/\([^)]*_+[^)]*\)/g, () => {
                if (answerIndex < correctAnswers.length) {
                  const answer = correctAnswers[answerIndex];
                  const answerLength = answer.length;
                  // 원래 단어 길이만큼의 "_"를 생성하고, 각 "_"를 " _ "로 변경
                  const formattedUnderscores = ' _ '.repeat(answerLength).trim();
                  answerIndex++;
                  return `( <span class="print-blank">${formattedUnderscores}</span> )`;
                }
                return '( )';
              });
              
              return result;
            };
            
            const displayText = isAnswerMode 
              ? fillBlanksWithAnswers(quizData.blankedText, answers)
              : formatBlanksForProblem(quizData.blankedText || '', answers);
            
            return (
              <div key={`print-13-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#13. 빈칸 채우기 (단어-주관식)</span>
                  <span className="print-question-type-badge">유형#13</span>
                </div>
                <div className="print-instruction">
                  다음 빈칸에 들어갈 적절한 단어를 쓰시오
                </div>
                <div 
                  className={`print-passage ${isAnswerMode ? 'print-passage-work13-answer' : ''}`}
                  dangerouslySetInnerHTML={{ __html: displayText }}
                />
              </div>
            );
          }

          // Work_14: 빈칸 채우기 (문장-주관식)
          if (quizItem.workTypeId === '14' && quizData && quizData.blankedText) {
            console.log('🔍 Work_14 데이터 확인:', {
              blankedText: quizData.blankedText,
              hasBlankedText: !!quizData.blankedText,
              blankedTextLength: quizData.blankedText?.length,
              containsUnderscore: quizData.blankedText?.includes('_'),
              containsBlank: quizData.blankedText?.includes('(______)'),
              correctAnswers: quizData.correctAnswers,
              isAnswerMode: isAnswerMode
            });
            
            // 정답 모드일 때 빈칸을 정답으로 채우기
            const fillBlanksWithAnswers = (text: string, answers: string[]): string => {
              console.log('🔧 유형#14 빈칸 채우기:', { text, answers });
              if (!answers || answers.length === 0) {
                console.log('❌ 유형#14 정답 없음');
                return text;
              }
              
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
              
              let result = text;
              let answerIndex = 0;
              
              // 패턴 1: ( 공백 + 알파벳 + 공백 + 언더스코어들 + ) - 공백 있는 경우
              const blankPattern1 = /\( [A-Z] _+\)/g;
              result = result.replace(blankPattern1, (match: string) => {
                if (answerIndex < answers.length) {
                  const answer = cleanAnswer(answers[answerIndex]);
                  console.log(`✅ 유형#14 정답 ${answerIndex + 1}: ${answer}`);
                  answerIndex++;
                  return `( <span style="color: #1976d2; font-weight: bold;">${answer}</span> )`;
                }
                return match;
              });
              
              // 패턴 2: ( 공백 + 알파벳 + 언더스코어들 + ) - 알파벳과 언더스코어 사이 공백 없는 경우
              if (answerIndex < answers.length) {
                const blankPattern2 = /\( [A-Z]_+\)/g;
                result = result.replace(blankPattern2, (match: string) => {
                  if (answerIndex < answers.length) {
                    const answer = cleanAnswer(answers[answerIndex]);
                    console.log(`✅ 유형#14 정답 ${answerIndex + 1}: ${answer}`);
                    answerIndex++;
                    return `( <span style="color: #1976d2; font-weight: bold;">${answer}</span> )`;
                  }
                  return match;
                });
              }
              
              // 패턴 3: ( 알파벳 + 언더스코어들 + ) - (A_______) 형식 (공백 없음)
              if (answerIndex < answers.length) {
                const blankPattern3 = /\(([A-Z])([_]+)\)/g;
                result = result.replace(blankPattern3, (match: string) => {
                  if (answerIndex < answers.length) {
                    const answer = cleanAnswer(answers[answerIndex]);
                    console.log(`✅ 유형#14 정답 ${answerIndex + 1}: ${answer}`);
                    answerIndex++;
                    return `( <span style="color: #1976d2; font-weight: bold;">${answer}</span> )`;
                  }
                  return match;
                });
              }
              
              // 패턴 4: ( 언더스코어들 + 알파벳 + 언더스코어들 + ) - (___A___) 또는 (____________________A____________________) 형식
              if (answerIndex < answers.length) {
                const blankPattern4 = /\(_+[A-Z]_+\)/g;
                result = result.replace(blankPattern4, (match: string) => {
                  if (answerIndex < answers.length) {
                    const answer = cleanAnswer(answers[answerIndex]);
                    console.log(`✅ 유형#14 정답 ${answerIndex + 1}: ${answer}`);
                    answerIndex++;
                    return `( <span style="color: #1976d2; font-weight: bold;">${answer}</span> )`;
                  }
                  return match;
                });
              }
              
              // 패턴 5: ( 언더스코어들 + 알파벳 + 언더스코어들 + ) - (____________________A____________________) 형식 (긴 언더스코어)
              if (answerIndex < answers.length) {
                const blankPattern5 = /\(_{10,}[A-Z]_{10,}\)/g;
                result = result.replace(blankPattern5, (match: string) => {
                  if (answerIndex < answers.length) {
                    const answer = cleanAnswer(answers[answerIndex]);
                    console.log(`✅ 유형#14 정답 ${answerIndex + 1}: ${answer}`);
                    answerIndex++;
                    return `( <span style="color: #1976d2; font-weight: bold;">${answer}</span> )`;
                  }
                  return match;
                });
              }
              
              // 패턴 6: 모든 언더스코어 포함 빈칸 패턴 (어떤 형식이든 매칭) - 최종 fallback
              if (answerIndex < answers.length) {
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
                  if (answerIndex < answers.length) {
                    const answer = cleanAnswer(answers[answerIndex]);
                    console.log(`✅ 유형#14 정답 ${answerIndex + 1}: ${answer}`);
                    answerIndex++;
                    return `( <span style="color: #1976d2; font-weight: bold;">${answer}</span> )`;
                  }
                  return match;
                });
              }
              
              console.log('🔧 유형#14 최종 텍스트:', result);
              return result;
            };
            
            // correctAnswers가 없으면 selectedSentences 사용
            const answers = quizData.correctAnswers || quizData.selectedSentences || [];
            
            // 문제 모드에서 빈칸을 원래 문장 길이만큼의 "_"로 표시하고 " _ "로 변경, 알파벳 제거
            const formatBlanksForProblem = (text: string, selectedSentences: string[]): string => {
              if (!text || !selectedSentences || selectedSentences.length === 0) {
                return text;
              }
              
              let result = text;
              let sentenceIndex = 0;
              
              // 다양한 빈칸 패턴을 찾아서 원래 문장 길이만큼의 "_"로 교체하고 알파벳 제거
              // 패턴 1: ( 공백 + A + 공백 + 언더스코어들 + ) - 공백 있는 경우
              result = result.replace(/\(\s*([A-Z])\s*_+/g, (match: string, alphabet: string) => {
                if (sentenceIndex < selectedSentences.length) {
                  const sentence = selectedSentences[sentenceIndex];
                  const sentenceLength = sentence ? sentence.trim().length : 10; // 기본값 10
                  // 원래 문장 길이만큼의 "_"를 생성하고, 각 "_"를 " _ "로 변경
                  const formattedUnderscores = ' _ '.repeat(sentenceLength).trim();
                  sentenceIndex++;
                  return `( ${formattedUnderscores}`;
                }
                return '( _ ';
              });
              
              // 패턴 2: ( 공백 + A + 언더스코어들 + ) - 알파벳과 언더스코어 사이 공백 없는 경우
              result = result.replace(/\(\s*([A-Z])_+/g, (match: string, alphabet: string) => {
                if (sentenceIndex < selectedSentences.length) {
                  const sentence = selectedSentences[sentenceIndex];
                  const sentenceLength = sentence ? sentence.trim().length : 10;
                  const formattedUnderscores = ' _ '.repeat(sentenceLength).trim();
                  sentenceIndex++;
                  return `( ${formattedUnderscores}`;
                }
                return '( _ ';
              });
              
              // 패턴 3: ( A + 언더스코어들 + ) - (A_______) 형식 (공백 없음)
              result = result.replace(/\(([A-Z])([_]+)\)/g, (match: string, alphabet: string, underscores: string) => {
                if (sentenceIndex < selectedSentences.length) {
                  const sentence = selectedSentences[sentenceIndex];
                  const sentenceLength = sentence ? sentence.trim().length : 10;
                  const formattedUnderscores = ' _ '.repeat(sentenceLength).trim();
                  sentenceIndex++;
                  return `( ${formattedUnderscores} )`;
                }
                return '( _ )';
              });
              
              // 패턴 4: ( 언더스코어들 + A + 언더스코어들 + ) - (___A___) 형식
              result = result.replace(/\(_+([A-Z])_+/g, (match: string, alphabet: string) => {
                if (sentenceIndex < selectedSentences.length) {
                  const sentence = selectedSentences[sentenceIndex];
                  const sentenceLength = sentence ? sentence.trim().length : 10;
                  const formattedUnderscores = ' _ '.repeat(sentenceLength).trim();
                  sentenceIndex++;
                  return `( ${formattedUnderscores}`;
                }
                return '( _ ';
              });
              
              // 패턴 5: ( 언더스코어들 + A + 언더스코어들 + ) - (____________________A____________________) 형식 (긴 언더스코어)
              result = result.replace(/\(_{10,}([A-Z])_{10,}\)/g, (match: string, alphabet: string) => {
                if (sentenceIndex < selectedSentences.length) {
                  const sentence = selectedSentences[sentenceIndex];
                  const sentenceLength = sentence ? sentence.trim().length : 10;
                  const formattedUnderscores = ' _ '.repeat(sentenceLength).trim();
                  sentenceIndex++;
                  return `( ${formattedUnderscores} )`;
                }
                return '( _ )';
              });
              
              // 패턴 6: 모든 언더스코어 포함 빈칸 패턴 (어떤 형식이든 매칭) - 최종 fallback
              result = result.replace(/\([^)]*_[^)]*\)/g, (match: string) => {
                // 이미 처리된 패턴은 건너뛰기 (알파벳이 없는 경우)
                if (!match.match(/[A-Z]/)) {
                  return match;
                }
                if (sentenceIndex < selectedSentences.length) {
                  const sentence = selectedSentences[sentenceIndex];
                  const sentenceLength = sentence ? sentence.trim().length : 10;
                  const formattedUnderscores = ' _ '.repeat(sentenceLength).trim();
                  sentenceIndex++;
                  return `( ${formattedUnderscores} )`;
                }
                return match;
              });
              
              return result;
            };
            
            let displayText = isAnswerMode 
              ? fillBlanksWithAnswers(quizData.blankedText, answers)
              : formatBlanksForProblem(quizData.blankedText || '', answers);
            
            const selectedSentences = quizData?.selectedSentences || quizData?.correctAnswers || [];
            
            return (
              <div key={`print-14-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#14. 빈칸 채우기 (문장-주관식)</span>
                  <span className="print-question-type-badge">유형#14</span>
                </div>
                <div className="print-instruction">
                  다음 빈칸에 들어갈 적절한 문장을 쓰시오
                </div>
                <div 
                  className={`print-passage ${isAnswerMode ? 'print-passage-work14-answer' : ''}`}
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    overflow: 'hidden'
                  }}
                  dangerouslySetInnerHTML={{ __html: displayText }}
                />
              </div>
            );
          }

          // Translation 섹션 (마지막 유형 다음 단에 표시)
          if (quizItem.workTypeId === 'translation' && quizItem.translatedText) {
            return (
              <div key={`print-translation-${index}`} className="print-question-card">
                <div className="print-translation-section">
                  <div className="print-translation-title">본문해석 :</div>
                  <div className="print-translation-content">{quizItem.translatedText}</div>
                </div>
              </div>
            );
          }

                return null;
              })}
              {/* 마지막 페이지에 아이템이 하나만 있을 때 빈 div 추가하여 2단 레이아웃 유지 */}
              {pageIndex === distributedItems.length - 1 && pageItems.length === 1 && pageItems[0]?.workTypeId !== 'translation' && (
                <div className="print-question-card" style={{ visibility: 'hidden', height: 0, padding: 0, margin: 0, border: 'none' }}></div>
              )}
            </div>
          </div>
        </div>
      );
    });
    
    return pages;
  };

  return (
    <div 
      id={isAnswerMode ? "print-root-package03-answer" : "print-root-package03"}
      className={isAnswerMode ? "print-container-answer" : "print-container"}
    >
      {renderQuizItems()}
    </div>
  );
};

export default PrintFormatPackage03;
