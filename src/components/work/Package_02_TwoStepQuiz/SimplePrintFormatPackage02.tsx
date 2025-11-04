import React from 'react';
import PrintHeaderPackage02 from './PrintHeaderPackage02';
import './PrintFormatPackage02.css';

interface PrintFormatPackage02Props {
  packageQuiz: any[];
  isAnswerMode?: boolean;
}

const SimplePrintFormatPackage02: React.FC<PrintFormatPackage02Props> = ({ packageQuiz, isAnswerMode = false }) => {
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
    return packageQuiz.map((quizItem: any, index: number) => {
      // workTypeId 찾기 로직 개선 - 저장된 데이터에서 직접 가져오기
      let workTypeId = 'unknown';
      
      // 저장된 데이터 구조에 따라 workTypeId 찾기
      if (quizItem.workTypeId) {
        // 새로운 구조: workTypeId가 직접 포함됨
        workTypeId = quizItem.workTypeId;
      } else if (quizItem.quiz) {
        // 기존 구조: quiz 속성으로 판단
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
      } else if (quizItem.work13Data) {
        workTypeId = '13';
      } else if (quizItem.work14Data) {
        workTypeId = '14';
      }
      
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
            <div className="print-paragraphs">
              {quizItem.quiz.shuffledParagraphs?.map((para: any, pIndex: number) => (
                <div key={pIndex} className="print-paragraph">
                  <span className="print-paragraph-label">{para.label}</span>
                  <span className="print-paragraph-content">{para.content}</span>
                </div>
              ))}
            </div>
            <div className="print-choices">
              {isAnswerMode ? (
                <div className="print-choice">
                  <span className="print-choice-number">{['①', '②', '③', '④'][quizItem.quiz.answerIndex]}</span>
                  <span className="print-choice-content">{quizItem.quiz.choices?.[quizItem.quiz.answerIndex]?.join(' → ')}</span>
                  <span className="print-answer-mark">(정답)</span>
                </div>
              ) : (
                quizItem.quiz.choices?.map((choice: string[], cIndex: number) => (
                  <div key={cIndex} className="print-choice">
                    <span className="print-choice-number">{['①', '②', '③', '④'][cIndex]}</span>
                    <span className="print-choice-content">{choice.join(' → ')}</span>
                  </div>
                ))
              )}
            </div>
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
                __html: renderTextWithHighlight(quizItem.work02Data.modifiedText || '', quizItem.work02Data.replacements || [])
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
      
      // Work_03: 빈칸(단어) 찾기
      if (quizItem.work03Data) {
        return (
          <div key={`print-03-${index}`} className="print-question-card">
            <div className="print-question-title">
              <span>#03. 빈칸(단어) 찾기</span>
              <span className="print-question-type-badge">유형#03</span>
            </div>
            <div className="print-instruction">
              다음 빈칸에 들어갈 가장 적절한 단어를 고르세요
            </div>
            <div className="print-passage">
              {quizItem.work03Data.blankedText}
            </div>
            <div className="print-choices">
              {isAnswerMode ? (
                <div className="print-choice">
                  <span className="print-choice-number">{['①', '②', '③', '④', '⑤'][quizItem.work03Data.answerIndex]}</span>
                  <span className="print-choice-content">{quizItem.work03Data.options?.[quizItem.work03Data.answerIndex]}</span>
                  <span className="print-answer-mark">(정답)</span>
                </div>
              ) : (
                quizItem.work03Data.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="print-choice">
                    <span className="print-choice-number">{['①', '②', '③', '④', '⑤'][oIndex]}</span>
                    <span className="print-choice-content">{option}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }
      
      // Work_04: 빈칸(구) 찾기
      if (quizItem.work04Data) {
        return (
          <div key={`print-04-${index}`} className="print-question-card">
            <div className="print-question-title">
              <span>#04. 빈칸(구) 찾기</span>
              <span className="print-question-type-badge">유형#04</span>
            </div>
            <div className="print-instruction">
              다음 빈칸에 들어갈 가장 적절한 구를 고르세요
            </div>
            <div className="print-passage">
              {quizItem.work04Data.blankedText || ''}
            </div>
            <div className="print-choices">
              {isAnswerMode ? (
                <div className="print-choice">
                  <span className="print-choice-number">{['①', '②', '③', '④', '⑤'][quizItem.work04Data.answerIndex]}</span>
                  <span className="print-choice-content">{quizItem.work04Data.options?.[quizItem.work04Data.answerIndex]}</span>
                  <span className="print-answer-mark">(정답)</span>
                </div>
              ) : (
                quizItem.work04Data.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="print-choice">
                    <span className="print-choice-number">{['①', '②', '③', '④', '⑤'][oIndex]}</span>
                    <span className="print-choice-content">{option}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }
      
      // Work_05: 빈칸(문장) 찾기
      if (quizItem.work05Data) {
        return (
          <div key={`print-05-${index}`} className="print-question-card">
            <div className="print-question-title">
              <span>#05. 빈칸(문장) 찾기</span>
              <span className="print-question-type-badge">유형#05</span>
            </div>
            <div className="print-instruction">
              다음 빈칸에 들어갈 가장 적절한 문장을 고르세요
            </div>
            <div className="print-passage">
              {quizItem.work05Data.blankedText}
            </div>
            <div className="print-choices">
              {quizItem.work05Data.options?.map((option: string, oIndex: number) => (
                <div key={oIndex} className="print-choice">
                  <span className="print-choice-number">{['①', '②', '③', '④', '⑤'][oIndex]}</span>
                  <span className="print-choice-content">{option}</span>
                  {isAnswerMode && oIndex === quizItem.work05Data.answerIndex && (
                    <span className="print-answer-mark">(정답)</span>
                  )}
                </div>
              ))}
            </div>
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
              다음 영어본문에서 주요문장이 들어가야 할 가장 적합한 위치를 찾으세오.
            </div>
            <div className="print-missing-sentence">
              <strong>주요 문장:</strong> {quizItem.work06Data.missingSentence}
            </div>
            <div className="print-numbered-passage">
              {quizItem.work06Data.numberedPassage}
            </div>
            {isAnswerMode && (
              <div className="print-work06-answer">
                정답: {['①', '②', '③', '④', '⑤'][quizItem.work06Data.answerIndex]}
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
              다음 본문의 주제를 가장 잘 나타내는 것을 고르세요
            </div>
            <div className="print-passage">
              {quizItem.work07Data.passage}
            </div>
            <div className="print-choices">
              {isAnswerMode ? (
                <div className="print-choice">
                  <span className="print-choice-number">{['①', '②', '③', '④', '⑤'][quizItem.work07Data.answerIndex]}</span>
                  <span className="print-choice-content">{quizItem.work07Data.options?.[quizItem.work07Data.answerIndex]}</span>
                  <span className="print-answer-mark">(정답)</span>
                </div>
              ) : (
                quizItem.work07Data.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="print-choice">
                    <span className="print-choice-number">{['①', '②', '③', '④', '⑤'][oIndex]}</span>
                    <span className="print-choice-content">{option}</span>
                  </div>
                ))
              )}
            </div>
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
              다음 본문의 제목으로 가장 적절한 것을 고르세요
            </div>
            <div className="print-passage">
              {quizItem.work08Data.passage}
            </div>
            <div className="print-choices">
              {isAnswerMode ? (
                <div className="print-choice">
                  <span className="print-choice-number">{['①', '②', '③', '④', '⑤'][quizItem.work08Data.answerIndex]}</span>
                  <span className="print-choice-content">{quizItem.work08Data.options?.[quizItem.work08Data.answerIndex]}</span>
                  <span className="print-answer-mark">(정답)</span>
                </div>
              ) : (
                quizItem.work08Data.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="print-choice">
                    <span className="print-choice-number">{['①', '②', '③', '④', '⑤'][oIndex]}</span>
                    <span className="print-choice-content">{option}</span>
                  </div>
                ))
              )}
            </div>
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
              다음 영어 본문에 표시된 단어들 중에서 어법상 틀린 것을 고르시오.
            </div>
            <div 
              className="print-passage"
              dangerouslySetInnerHTML={{
                __html: (quizItem.work09Data.passage || '').replace(/\n/g, '<br/>')
              }}
            />
            <div className="print-choices">
              {isAnswerMode ? (
                <div className="print-choice">
                  <span className="print-choice-number">{['①', '②', '③', '④', '⑤'][quizItem.work09Data.answerIndex]}</span>
                  <span className="print-choice-content">{quizItem.work09Data.options?.[quizItem.work09Data.answerIndex]}</span>
                  <span className="print-answer-mark">(정답)</span>
                </div>
              ) : (
                quizItem.work09Data.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="print-choice">
                    <span className="print-choice-number">{['①', '②', '③', '④', '⑤'][oIndex]}</span>
                    <span className="print-choice-content">{option}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }
      
      // Work_10: 다중 어법 오류 찾기
      if (quizItem.work10Data) {
        return (
          <div key={`print-10-${index}`} className="print-question-card">
            <div className="print-question-title">
              <span>#10. 다중 어법 오류 찾기</span>
              <span className="print-question-type-badge">유형#10</span>
            </div>
            <div className="print-instruction">
              다음 영어 본문에 표시된 단어들 중에서 어법상 틀린 단어의 개수를 고르시오.
            </div>
            <div 
              className="print-passage"
              dangerouslySetInnerHTML={{
                __html: (quizItem.work10Data.passage || '').replace(/\n/g, '<br/>')
              }}
            />
            <div className="print-choices">
              {isAnswerMode ? (
                <div className="print-choice">
                  <span className="print-choice-number">{['①', '②', '③', '④', '⑤', '⑥'][quizItem.work10Data.answerIndex]}</span>
                  <span className="print-choice-content">{quizItem.work10Data.options?.[quizItem.work10Data.answerIndex]}개</span>
                  <span className="print-answer-mark">(정답)</span>
                </div>
              ) : (
                quizItem.work10Data.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="print-choice">
                    <span className="print-choice-number">{['①', '②', '③', '④', '⑤', '⑥'][oIndex]}</span>
                    <span className="print-choice-content">{option}개</span>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      }
      
      // Work_11: 본문 문장별 해석
      if (quizItem.work11Data) {
        console.log('Work_11 데이터 확인 (Simple):', {
          isAnswerMode,
          sentences: quizItem.work11Data.sentences,
          sentencesLength: quizItem.work11Data.sentences?.length
        });
        return (
          <div key={`print-11-${index}`} className="print-question-card">
            <div className="print-question-title">
              <span>#11. 본문 문장별 해석</span>
              <span className="print-question-type-badge">유형#11</span>
            </div>
            <div className="print-instruction">
              다음 문장들을 해석하세요
            </div>
            <div className="print-sentences">
              {quizItem.work11Data.sentences?.map((sentence: any, sIndex: number) => (
                <div key={sIndex} className="print-sentence">
                  <span className="print-sentence-number">({sIndex + 1})</span>
                  <span className="print-sentence-text">
                    {sentence.english}
                    {isAnswerMode && (
                      <div className="print-sentence-korean-inline">
                        {sentence.korean}
                      </div>
                    )}
                  </span>
                </div>
              ))}
            </div>
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
              <div className="print-choices">
                <div className="print-option-label">정답:</div>
                {quizItem.work13Data.correctAnswers?.map((answer: string, aIndex: number) => (
                  <div key={aIndex} className="print-choice">
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
              <div className="print-choices">
                <div className="print-option-label">정답:</div>
                {quizItem.work14Data.correctAnswers?.map((answer: string, aIndex: number) => (
                  <div key={aIndex} className="print-choice">
                    {aIndex + 1}. {answer}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      return null;
    });
  };

  return (
    <div 
      id={isAnswerMode ? "print-root-package02-answer" : "print-root-package02"}
      className={isAnswerMode ? "print-container-answer" : "print-container"}
    >
      <PrintHeaderPackage02 />
      <div className="a4-landscape-page-content">
        <div className="print-two-column-container">
          {renderQuizItems()}
        </div>
      </div>
    </div>
  );
};

export default SimplePrintFormatPackage02;