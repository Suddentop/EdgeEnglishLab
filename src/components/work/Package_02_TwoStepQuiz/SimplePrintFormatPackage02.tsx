import React from 'react';
import PrintHeaderPackage02 from './PrintHeaderPackage02';
import './PrintFormatPackage02.css';

interface SimplePrintFormatPackage02Props {
  packageQuiz: any[];
  isAnswerMode?: boolean;
}

const SimplePrintFormatPackage02: React.FC<SimplePrintFormatPackage02Props> = ({ packageQuiz, isAnswerMode = false }) => {
  console.log('🎯 SimplePrintFormatPackage02 렌더링:', { packageQuiz, isAnswerMode });
  console.log('🔍 isAnswerMode 값:', isAnswerMode);
  
  if (!packageQuiz || packageQuiz.length === 0) {
    console.log('❌ packageQuiz가 비어있음');
    return <div>표시할 문제가 없습니다.</div>;
  }
  
  console.log('✅ packageQuiz 데이터:', packageQuiz);

  // 정답 모드용 2단 스타일 헬퍼 함수
  const getAnswerModeCardStyle = () => {
    return isAnswerMode ? {
      width: 'calc(50% - 0.3cm)',
      maxWidth: 'calc(50% - 0.3cm)',
      minWidth: 'calc(50% - 0.3cm)',
      breakInside: 'avoid' as const,
      pageBreakInside: 'avoid' as const,
      WebkitColumnBreakInside: 'avoid' as const,
      marginBottom: '0.3cm',
      border: 'none',
      padding: '0.5cm',
      boxSizing: 'border-box' as const,
      display: 'block',
      float: 'left' as const
    } : {};
  };

  return (
    <div 
      id={isAnswerMode ? "print-root-package02-answer" : "print-root-package02"}
      className={isAnswerMode ? "print-container-answer" : "print-container"}
    >
      <div className="print-page a4-landscape-page-template">
        <div className="a4-landscape-page-header">
          <PrintHeaderPackage02 />
        </div>
        
        <div className="a4-landscape-page-content">
          <div 
            className="print-two-column-container"
            style={isAnswerMode ? {
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.6cm',
              width: '100%',
              justifyContent: 'space-between',
              height: '100%',
              flexDirection: 'row'
            } : {}}
          >
            {packageQuiz.map((quizItem: any, index: number) => {
              console.log(`🔍 퀴즈 아이템 ${index + 1}:`, {
                workTypeId: quizItem.workTypeId,
                workTypeName: quizItem.workTypeName,
                data: quizItem.data,
                dataKeys: quizItem.data ? Object.keys(quizItem.data) : 'no data'
              });
              
              // Work_01: 문단 순서 맞추기
              if (quizItem.workTypeId === '01') {
                const quizData = quizItem.data?.quiz || quizItem.data;
                return (
                  <div 
                    key={`print-01-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
                    <div className="print-question-title">
                      <span>#01. 문단 순서 맞추기</span>
                      <span className="print-question-type-badge">유형#01</span>
                    </div>
                    <div className="print-instruction">
                      다음 단락들을 원래 순서대로 배열한 것을 고르세요
                    </div>
                    <div className="print-shuffled-paragraphs">
                      {quizData?.shuffledParagraphs?.map((para: any, pIndex: number) => (
                        <div key={pIndex} className="print-paragraph-item">
                          <strong>{para.label}:</strong> {para.content}
                        </div>
                      ))}
                    </div>
                    <div className="print-options">
                      {quizData?.choices?.map((choice: string[], cIndex: number) => (
                        <div key={cIndex} className="print-option">
                          {['①', '②', '③', '④'][cIndex]} {choice.join(' → ')}
                        </div>
                      ))}
                    </div>
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          {['①', '②', '③', '④'][quizData?.answerIndex]} {quizData?.choices?.[quizData?.answerIndex]?.join(' → ')}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Work_02: 유사단어 독해
              if (quizItem.workTypeId === '02') {
                const work02Data = quizItem.data?.work02Data || quizItem.data;
                return (
                  <div 
                    key={`print-02-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
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
                        __html: work02Data?.modifiedText?.replace(/\*\*(.*?)\*\*/g, '<span class="print-word-highlight">$1</span>') || '' 
                      }}
                    />
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          <div className="print-replacements">
                            {work02Data?.replacements?.map((rep: any, rIndex: number) => (
                              <div key={rIndex} className="print-replacement">
                                {rep.original} → {rep.replacement}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Work_03: 빈칸(단어) 찾기
              if (quizItem.workTypeId === '03') {
                const work03Data = quizItem.data?.work03Data || quizItem.data;
                return (
                  <div 
                    key={`print-03-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
                    <div className="print-question-title">
                      <span>#03. 빈칸(단어) 찾기</span>
                      <span className="print-question-type-badge">유형#03</span>
                    </div>
                    <div className="print-instruction">
                      다음 빈칸에 들어갈 가장 적절한 단어를 고르세요
                    </div>
                    <div className="print-passage">
                      {work03Data?.blankedText}
                    </div>
                    <div className="print-options">
                      {work03Data?.options?.map((option: string, oIndex: number) => (
                        <div key={oIndex} className="print-option">
                          {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                        </div>
                      ))}
                    </div>
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          {['①', '②', '③', '④', '⑤'][work03Data?.answerIndex]} {work03Data?.options?.[work03Data?.answerIndex]}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Work_04: 빈칸(구) 찾기
              if (quizItem.workTypeId === '04') {
                const work04Data = quizItem.data?.work04Data || quizItem.data;
                return (
                  <div 
                    key={`print-04-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
                    <div className="print-question-title">
                      <span>#04. 빈칸(구) 찾기</span>
                      <span className="print-question-type-badge">유형#04</span>
                    </div>
                    <div className="print-instruction">
                      다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오
                    </div>
                    <div className="print-passage">
                      {work04Data?.blankedText}
                    </div>
                    <div className="print-options">
                      {work04Data?.options?.map((option: string, oIndex: number) => (
                        <div key={oIndex} className="print-option">
                          {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                        </div>
                      ))}
                    </div>
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          {['①', '②', '③', '④', '⑤'][work04Data?.answerIndex]} {work04Data?.options?.[work04Data?.answerIndex]}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Work_05: 빈칸(문장) 찾기
              if (quizItem.workTypeId === '05') {
                const work05Data = quizItem.data?.work05Data || quizItem.data;
                return (
                  <div 
                    key={`print-05-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
                    <div className="print-question-title">
                      <span>#05. 빈칸(문장) 찾기</span>
                      <span className="print-question-type-badge">유형#05</span>
                    </div>
                    <div className="print-instruction">
                      다음 빈칸에 들어갈 문장으로 가장 적절한 것을 고르시오
                    </div>
                    <div className="print-passage">
                      {work05Data?.blankedText}
                    </div>
                    <div className="print-options">
                      {work05Data?.options?.map((option: string, oIndex: number) => (
                        <div key={oIndex} className="print-option">
                          {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                        </div>
                      ))}
                    </div>
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          {['①', '②', '③', '④', '⑤'][work05Data?.answerIndex]} {work05Data?.options?.[work05Data?.answerIndex]}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Work_06: 문장 위치 찾기
              if (quizItem.workTypeId === '06') {
                const work06Data = quizItem.data?.work06Data || quizItem.data;
                return (
                  <div 
                    key={`print-06-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
                    <div className="print-question-title">
                      <span>#06. 문장 위치 찾기</span>
                      <span className="print-question-type-badge">유형#06</span>
                    </div>
                    <div className="print-instruction">
                      다음 문장이 들어갈 가장 적절한 위치를 고르세요
                    </div>
                    <div className="print-passage">
                      <strong>주요 문장:</strong> {work06Data?.missingSentence}
                    </div>
                    <div className="print-passage">
                      <strong>본문:</strong><br />
                      {work06Data?.numberedPassage}
                    </div>
                    <div className="print-options">
                      {work06Data?.options?.map((option: string, oIndex: number) => (
                        <div key={oIndex} className="print-option">
                          {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                        </div>
                      ))}
                    </div>
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          {['①', '②', '③', '④', '⑤'][work06Data?.answerIndex]} {work06Data?.options?.[work06Data?.answerIndex]}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Work_07: 주제 추론
              if (quizItem.workTypeId === '07') {
                const work07Data = quizItem.data?.work07Data || quizItem.data;
                return (
                  <div 
                    key={`print-07-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
                    <div className="print-question-title">
                      <span>#07. 주제 추론</span>
                      <span className="print-question-type-badge">유형#07</span>
                    </div>
                    <div className="print-instruction">
                      다음 글의 주제로 가장 적절한 것을 고르세요
                    </div>
                    <div className="print-passage">
                      {work07Data?.passage}
                    </div>
                    <div className="print-options">
                      {work07Data?.options?.map((option: string, oIndex: number) => (
                        <div key={oIndex} className="print-option">
                          {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                        </div>
                      ))}
                    </div>
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          {['①', '②', '③', '④', '⑤'][work07Data?.answerIndex]} {work07Data?.options?.[work07Data?.answerIndex]}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Work_08: 제목 추론
              if (quizItem.workTypeId === '08') {
                const work08Data = quizItem.data?.work08Data || quizItem.data;
                return (
                  <div 
                    key={`print-08-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
                    <div className="print-question-title">
                      <span>#08. 제목 추론</span>
                      <span className="print-question-type-badge">유형#08</span>
                    </div>
                    <div className="print-instruction">
                      다음 글의 제목으로 가장 적절한 것을 고르세요
                    </div>
                    <div className="print-passage">
                      {work08Data?.passage}
                    </div>
                    <div className="print-options">
                      {work08Data?.options?.map((option: string, oIndex: number) => (
                        <div key={oIndex} className="print-option">
                          {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                        </div>
                      ))}
                    </div>
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          {['①', '②', '③', '④', '⑤'][work08Data?.answerIndex]} {work08Data?.options?.[work08Data?.answerIndex]}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Work_09: 어법 오류 찾기
              if (quizItem.workTypeId === '09') {
                const work09Data = quizItem.data?.work09Data || quizItem.data;
                return (
                  <div 
                    key={`print-09-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
                    <div className="print-question-title">
                      <span>#09. 어법 오류 찾기</span>
                      <span className="print-question-type-badge">유형#09</span>
                    </div>
                    <div className="print-instruction">
                      다음 글에서 어법상 어색한 부분을 찾아 고르세요
                    </div>
                    <div className="print-passage">
                      {work09Data?.passage}
                    </div>
                    <div className="print-options">
                      {work09Data?.options?.map((option: string, oIndex: number) => (
                        <div key={oIndex} className="print-option">
                          {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                        </div>
                      ))}
                    </div>
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          {['①', '②', '③', '④', '⑤'][work09Data?.answerIndex]} {work09Data?.options?.[work09Data?.answerIndex]}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Work_10: 다중 어법 오류 찾기
              if (quizItem.workTypeId === '10') {
                const work10Data = quizItem.data?.work10Data || quizItem.data;
                return (
                  <div 
                    key={`print-10-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
                    <div className="print-question-title">
                      <span>#10. 다중 어법 오류 찾기</span>
                      <span className="print-question-type-badge">유형#10</span>
                    </div>
                    <div className="print-instruction">
                      다음 글에서 어법상 어색한 부분을 모두 찾아 고르세요
                    </div>
                    <div className="print-passage">
                      {work10Data?.passage}
                    </div>
                    <div className="print-options">
                      {work10Data?.options?.map((option: string, oIndex: number) => (
                        <div key={oIndex} className="print-option">
                          {['①', '②', '③', '④', '⑤', '⑥'][oIndex]} {option}
                        </div>
                      ))}
                    </div>
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          {work10Data?.correctAnswers?.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Work_11: 본문 문장별 해석
              if (quizItem.workTypeId === '11') {
                const work11Data = quizItem.data?.work11Data || quizItem.data;
                return (
                  <div 
                    key={`print-11-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
                    <div className="print-question-title">
                      <span>#11. 본문 문장별 해석</span>
                      <span className="print-question-type-badge">유형#11</span>
                    </div>
                    <div className="print-instruction">
                      다음 문장들의 해석을 고르세요
                    </div>
                    <div className="print-passage">
                      {work11Data?.sentences?.map((sentence: any, sIndex: number) => (
                        <div key={sIndex} style={{ marginBottom: '10px' }}>
                          <strong>{sIndex + 1}.</strong> {typeof sentence === 'string' ? sentence : sentence.english}
                        </div>
                      ))}
                    </div>
                    <div className="print-options">
                      {work11Data?.options?.map((option: string, oIndex: number) => (
                        <div key={oIndex} className="print-option">
                          {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                        </div>
                      ))}
                    </div>
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          {work11Data?.correctAnswers?.map((answer: string, aIndex: number) => (
                            <div key={aIndex}>
                              {aIndex + 1}. {answer}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Work_13: 빈칸 채우기 (단어-주관식)
              if (quizItem.workTypeId === '13') {
                const work13Data = quizItem.data?.work13Data || quizItem.data;
                return (
                  <div 
                    key={`print-13-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
                    <div className="print-question-title">
                      <span>#13. 빈칸 채우기 (단어-주관식)</span>
                      <span className="print-question-type-badge">유형#13</span>
                    </div>
                    <div className="print-instruction">
                      다음 빈칸에 들어갈 적절한 단어를 쓰시오
                    </div>
                    <div className="print-passage">
                      {work13Data?.blankedText}
                    </div>
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          {work13Data?.correctAnswers?.map((answer: string, aIndex: number) => (
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
              if (quizItem.workTypeId === '14') {
                const work14Data = quizItem.data?.work14Data || quizItem.data;
                
                // 기존 데이터 형식을 새로운 형식으로 변환
                const convertBlankedText = (text: string) => {
                  if (!text) return text;
                  
                  // ( A ), ( B ), ( C ) 형식을 (______________________________) 형식으로 변환
                  return text.replace(/\(\s*[A-E]\s*\)/g, '(______________________________)');
                };
                
                const convertedBlankedText = convertBlankedText(work14Data?.blankedText);
                
                return (
                  <div 
                    key={`print-14-${index}`} 
                    className="print-question-card"
                    style={getAnswerModeCardStyle()}
                  >
                    <div className="print-question-title">
                      <span>#14. 빈칸 채우기 (문장-주관식)</span>
                      <span className="print-question-type-badge">유형#14</span>
                    </div>
                    <div className="print-instruction">
                      다음 빈칸에 들어갈 적절한 문장을 쓰시오
                    </div>
                    <div className="print-passage">
                      {convertedBlankedText}
                    </div>
                    {isAnswerMode && (
                      <div className="print-answer-section">
                        <div className="print-answer-label">정답:</div>
                        <div className="print-answer-content">
                          {work14Data?.correctAnswers?.map((answer: string, aIndex: number) => (
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

              return (
                <div key={`print-unknown-${index}`} className="print-question-card">
                  <div className="print-question-title">
                    <span>알 수 없는 유형 ({quizItem.workTypeId})</span>
                    <span className="print-question-type-badge">유형#{quizItem.workTypeId}</span>
                  </div>
                  <div className="print-instruction">
                    데이터 구조를 확인해주세요.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplePrintFormatPackage02;
