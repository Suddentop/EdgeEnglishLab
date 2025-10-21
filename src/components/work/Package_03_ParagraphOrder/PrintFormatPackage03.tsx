import React from 'react';
import PrintHeaderPackage03 from './PrintHeaderPackage03';
import './PrintFormatPackage03.css';

interface PackageQuizItem {
  work01Data?: any;
  work02Data?: any;
  work07Data?: any;
  work08Data?: any;
  work11Data?: any;
  work13Data?: any;
  work14Data?: any;
  translatedText?: string;
}

interface PrintFormatPackage03Props {
  packageQuiz: PackageQuizItem[];
  isAnswerMode?: boolean;
}

const PrintFormatPackage03: React.FC<PrintFormatPackage03Props> = ({ packageQuiz, isAnswerMode = false }) => {
  console.log('🔍 PrintFormatPackage03 렌더링:', { isAnswerMode, packageQuizLength: packageQuiz.length });
  
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
    
    // 유형#11의 문장을 단별로 분할하는 함수
    const splitWork11Sentences = (sentences: any[], translations: string[], maxSentencesPerColumn: number = 8): { sentences: any[], translations: string[] }[] => {
      const result: { sentences: any[], translations: string[] }[] = [];
      for (let i = 0; i < sentences.length; i += maxSentencesPerColumn) {
        result.push({
          sentences: sentences.slice(i, i + maxSentencesPerColumn),
          translations: translations.slice(i, i + maxSentencesPerColumn)
        });
      }
      return result;
    };
    
    // 패키지 퀴즈를 단별로 분할
    const distributedItems: PackageQuizItem[][] = [];
    let currentPageItems: PackageQuizItem[] = [];
    let currentColumnIndex = 0; // 현재 단 인덱스 (0: 좌측, 1: 우측)
    
    for (let i = 0; i < packageQuiz.length; i++) {
      const quizItem = packageQuiz[i];
      
      // 유형#11인 경우 문장을 단별로 분할
      if (quizItem.work11Data && quizItem.work11Data.sentences) {
        const chunks = splitWork11Sentences(
          quizItem.work11Data.sentences, 
          quizItem.work11Data.translations || []
        );
        
        chunks.forEach((chunk, chunkIndex) => {
          const work11Item: PackageQuizItem = {
            ...quizItem,
            work11Data: {
              ...quizItem.work11Data,
              sentences: chunk.sentences,
              translations: chunk.translations
            }
          };
          
          currentPageItems.push(work11Item);
          currentColumnIndex++;
          
          // 2개 단이 채워지면 새 페이지로 이동
          if (currentColumnIndex >= 2) {
            distributedItems.push([...currentPageItems]);
            currentPageItems = [];
            currentColumnIndex = 0;
          }
        });
      } else {
        // 다른 유형들은 기존대로 처리
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
          // Work_01: 문단 순서 맞추기
          if (quizItem.work01Data) {
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
                  {quizItem.work01Data.shuffledParagraphs?.map((para: any, pIndex: number) => (
                    <div key={pIndex} className="print-paragraph-item">
                      <strong>{para.label}:</strong> {para.content}
                    </div>
                  ))}
                </div>
                <div className="print-options">
                  {isAnswerMode ? (
                    <div className="print-option">
                      {['①', '②', '③', '④'][quizItem.work01Data.answerIndex]} {quizItem.work01Data.choices?.[quizItem.work01Data.answerIndex]?.join(' → ')}
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    quizItem.work01Data.choices?.map((choice: string[], cIndex: number) => (
                      <div key={cIndex} className="print-option">
                        {['①', '②', '③', '④'][cIndex]} {choice.join(' → ')}
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && quizItem.translatedText && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{quizItem.translatedText}</div>
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
                        {quizItem.work02Data.replacements?.map((rep: any, rIndex: number) => (
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
                  {isAnswerMode ? (
                    <div className="print-option">
                      {['①', '②', '③', '④', '⑤'][quizItem.work07Data.answerIndex]} {quizItem.work07Data.options?.[quizItem.work07Data.answerIndex]}
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    quizItem.work07Data.options?.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="print-option">
                        {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && quizItem.translatedText && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{quizItem.translatedText}</div>
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
                  {isAnswerMode ? (
                    <div className="print-option">
                      {`①②③④⑤`[quizItem.work08Data.answerIndex]} {quizItem.work08Data.options?.[quizItem.work08Data.answerIndex]}
                      <span className="print-answer-mark">(정답)</span>
                    </div>
                  ) : (
                    quizItem.work08Data.options?.map((option: string, optIndex: number) => (
                      <div key={optIndex} className="print-option">
                        {`①②③④⑤`[optIndex]} {option}
                      </div>
                    ))
                  )}
                </div>
                {isAnswerMode && quizItem.translatedText && (
                  <div className="print-translation-section">
                    <div className="print-translation-title">본문해석 :</div>
                    <div className="print-translation-content">{quizItem.translatedText}</div>
                  </div>
                )}
              </div>
            );
          }

          // Work_11: 본문 문장별 해석
          if (quizItem.work11Data) {
            console.log('🔍 Work_11 렌더링:', { isAnswerMode, sentencesCount: quizItem.work11Data.sentences?.length });
            
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
                {quizItem.work11Data.sentences?.map((sentence: string, sIndex: number) => {
                  const globalSentenceNumber = getGlobalSentenceNumber(sIndex);
                  console.log(`🔍 문장 ${globalSentenceNumber}:`, { 
                    isAnswerMode, 
                    sentence, 
                    translation: quizItem.work11Data.translations?.[sIndex]
                  });
                  return (
                    <div key={sIndex} className="print-sentence-item">
                      <div className="print-sentence-english">
                        <span className="sentence-number">{String(globalSentenceNumber).padStart(2, '0')}. </span>
                        {sentence}
                        {isAnswerMode && quizItem.work11Data.translations && quizItem.work11Data.translations[sIndex] && (
                          <div className="print-sentence-korean-inline">
                            {quizItem.work11Data.translations[sIndex]}
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
                  <div className="print-options">
                    <div className="print-option-label">정답:</div>
                    {quizItem.work13Data.correctAnswers?.map((answer: string, aIndex: number) => (
                      <div key={aIndex} className="print-option">
                        {aIndex + 1}. {answer}
                      </div>
                    ))}
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
                  <div className="print-options">
                    <div className="print-option-label">정답:</div>
                    {quizItem.work14Data.correctAnswers?.map((answer: string, aIndex: number) => (
                      <div key={aIndex} className="print-option">
                        {aIndex + 1}. {answer}
                      </div>
                    ))}
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
      id={isAnswerMode ? "print-root-package03-answer" : "print-root-package03"}
      className={isAnswerMode ? "print-container-answer" : "print-container"}
    >
      {renderQuizItems()}
    </div>
  );
};

export default PrintFormatPackage03;
