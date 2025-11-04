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
                  {isAnswerMode ? (
                    <div className="print-option">
                      {['①', '②', '③', '④', '⑤'][quizData.answerIndex]} {quizData.options?.[quizData.answerIndex]}
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    quizData.options?.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="print-option">
                        {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && (quizItem.translatedText || quizData.translation) && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{quizItem.translatedText || quizData.translation}</div>
                  </div>
                )}
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
                  {isAnswerMode ? (
                    <div className="print-option">
                      {`①②③④⑤`[quizData.answerIndex]} {quizData.options?.[quizData.answerIndex]}
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    quizData.options?.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="print-option">
                        {`①②③④⑤`[optIndex]} {option}
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && (quizItem.translatedText || quizData.translation) && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{quizItem.translatedText || quizData.translation}</div>
                  </div>
                )}
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
            
            const displayText = isAnswerMode 
              ? fillBlanksWithAnswers(quizData.blankedText, answers)
              : quizData.blankedText?.replace(/\(______\)/g, '<span class="print-blank">(______)</span>') || '';
            
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
                  className="print-passage"
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
                  return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
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
                    return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
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
                    return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
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
                    return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
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
                    return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
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
                    return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
                  }
                  return match;
                });
              }
              
              console.log('🔧 유형#14 최종 텍스트:', result);
              return result;
            };
            
            // correctAnswers가 없으면 selectedSentences 사용
            const answers = quizData.correctAnswers || quizData.selectedSentences || [];
            
            let displayText = isAnswerMode 
              ? fillBlanksWithAnswers(quizData.blankedText, answers)
              : quizData.blankedText?.replace(/\(______\)/g, '<span class="print-blank">(______)</span>') || '';
            
            // 문제 모드일 때 빈칸 패턴에 nowrap 스타일 적용 (( A 부분만 줄바꿈 방지)
            if (!isAnswerMode) {
              // 패턴: ( A_______) 
              const blankPattern = /\( ([A-Z])([_]+)\)/g;
              displayText = displayText.replace(blankPattern, (match: string, alphabet: string, underscores: string) => {
                return `<span style="white-space: nowrap;">( ${alphabet}</span>${underscores})`;
              });
            }
            
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
                  className="print-passage"
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
      id={isAnswerMode ? "print-root-package03-answer" : "print-root-package03"}
      className={isAnswerMode ? "print-container-answer" : "print-container"}
    >
      {renderQuizItems()}
    </div>
  );
};

export default PrintFormatPackage03;
