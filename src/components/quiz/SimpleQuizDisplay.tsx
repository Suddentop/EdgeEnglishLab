import React from 'react';

interface SimpleQuizDisplayProps {
  packageQuiz: any[];
  isAnswerMode?: boolean;
}

const SimpleQuizDisplay: React.FC<SimpleQuizDisplayProps> = ({ packageQuiz, isAnswerMode = false }) => {
  if (!packageQuiz || packageQuiz.length === 0) {
    return <div>표시할 문제가 없습니다.</div>;
  }

  return (
    <div className="simple-quiz-display">
      {packageQuiz.map((quizItem: any, index: number) => {
        console.log(`🔍 퀴즈 아이템 ${index + 1} 상세:`, {
          workTypeId: quizItem.workTypeId,
          workTypeName: quizItem.workTypeName,
          dataKeys: quizItem.data ? Object.keys(quizItem.data) : 'no data',
          data: quizItem.data
        });
        
        // Work_01: 문단 순서 맞추기
        if (quizItem.workTypeId === '01') {
          const quizData = quizItem.quiz || quizItem.data?.quiz || quizItem.data;
          return (
            <div key={`quiz-01-${index}`} className="quiz-item">
              <h3>#01. 문단 순서 맞추기</h3>
              <div className="instruction">다음 단락들을 원래 순서대로 배열한 것을 고르세요</div>
              <div className="paragraphs">
                {quizData?.shuffledParagraphs?.map((para: any, pIndex: number) => (
                  <div key={pIndex} className="paragraph-item">
                    <strong>{para.label}:</strong> {para.content}
                  </div>
                ))}
              </div>
              <div className="options">
                {quizData?.choices?.map((choice: string[], cIndex: number) => (
                  <div key={cIndex} className="option">
                    {['①', '②', '③', '④'][cIndex]} {choice.join(' → ')}
                  </div>
                ))}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong> {['①', '②', '③', '④'][quizData?.answerIndex]} {quizData?.choices?.[quizData?.answerIndex]?.join(' → ')}
                </div>
              )}
            </div>
          );
        }

        // Work_12: 단어 학습 문제
        if (quizItem.workTypeId === '12') {
          const work12Data = quizItem.work12Data || quizItem.data?.work12Data || quizItem.data;
          const words: any[] = Array.isArray(work12Data?.words) ? work12Data.words : [];
          const half = Math.ceil(words.length / 2);
          const left = words.slice(0, half);
          const right = words.slice(half);
          return (
            <div key={`quiz-12-${index}`} className="quiz-item">
              <h3>#12. 단어 학습 문제</h3>
              <div className="instruction">다음 영어 단어의 한글 뜻을 고르시오.</div>
              <div style={{ border: '1px solid #e3e6f0', borderRadius: 8, padding: '0.8rem', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[left, right].map((col, ci) => (
                    <table key={ci} style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 60, padding: '6px 8px', border: '1px solid #e3e6f0', background: '#f7f8fc' }}>No.</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #e3e6f0', background: '#f7f8fc' }}>영어 단어</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #e3e6f0', background: '#f7f8fc' }}>한글 뜻</th>
                        </tr>
                      </thead>
                      <tbody>
                        {col.map((w: any, wi: number) => (
                          <tr key={wi}>
                            <td style={{ textAlign: 'center', border: '1px solid #e3e6f0', padding: '6px 8px' }}>{ci === 0 ? wi + 1 : half + wi + 1}</td>
                            <td style={{ border: '1px solid #e3e6f0', padding: '6px 8px' }}>{w.english}</td>
                            <td style={{ border: '1px solid #e3e6f0', padding: '6px 8px' }}></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        // Work_02: 유사단어 독해
        if (quizItem.workTypeId === '02') {
          const work02Data = (quizItem.work02Data || quizItem.quiz || quizItem.data?.work02Data || quizItem.data?.quiz || quizItem.data) as any;
          let baseText = work02Data?.modifiedText || work02Data?.modifiedHtml || work02Data?.html || work02Data?.text || work02Data?.passage || work02Data?.content || work02Data?.originalText || work02Data?.questionText || work02Data?.body || '';
          
          // 교체된 단어를 진하게 표시
          const replacements = work02Data?.replacements || [];
          if (replacements.length > 0 && typeof baseText === 'string') {
            replacements.forEach((rep: any) => {
              if (rep.replacement) {
                // 교체된 단어를 찾아서 진하게 표시 (단어 경계 고려)
                const escapedWord = rep.replacement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
                baseText = baseText.replace(regex, '<strong>$&</strong>');
              }
            });
          }
          
          const normalizedHtml = (typeof baseText === 'string' ? baseText : '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br />');
          return (
            <div key={`quiz-02-${index}`} className="quiz-item">
              <h3>#02. 유사단어 독해</h3>
              <div className="instruction">다음 본문을 읽고 해석하세요</div>
              <div className="passage">
                {normalizedHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: normalizedHtml }} />
                ) : (
                  <div>{String(baseText || '').trim() || '본문 데이터가 없습니다.'}</div>
                )}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong>
                  <div className="replacements">
                    {(work02Data?.replacements || [])?.map((rep: any, rIndex: number) => (
                      <div key={rIndex} className="replacement">
                        {rep.original} → {rep.replacement}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }

        // Work_03: 빈칸(단어) 찾기
        if (quizItem.workTypeId === '03') {
          const work03Data = quizItem.work03Data || quizItem.data?.work03Data || quizItem.data;
          return (
            <div key={`quiz-03-${index}`} className="quiz-item">
              <h3>#03. 빈칸(단어) 찾기</h3>
              <div className="instruction">다음 빈칸에 들어갈 가장 적절한 단어를 고르세요</div>
              <div className="passage">
                {work03Data?.blankedText}
              </div>
              <div className="options">
                {work03Data?.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="option">
                    {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                  </div>
                ))}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong> {['①', '②', '③', '④', '⑤'][work03Data?.answerIndex]} {work03Data?.options?.[work03Data?.answerIndex]}
                </div>
              )}
            </div>
          );
        }

        // Work_04: 빈칸(구) 찾기
        if (quizItem.workTypeId === '04') {
          const work04Data = quizItem.work04Data || quizItem.data?.work04Data || quizItem.data;
          return (
            <div key={`quiz-04-${index}`} className="quiz-item">
              <h3>#04. 빈칸(구) 찾기</h3>
              <div className="instruction">다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오</div>
              <div className="passage">
                {work04Data?.blankedText}
              </div>
              <div className="options">
                {work04Data?.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="option">
                    {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                  </div>
                ))}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong> {['①', '②', '③', '④', '⑤'][work04Data?.answerIndex]} {work04Data?.options?.[work04Data?.answerIndex]}
                </div>
              )}
            </div>
          );
        }

        // Work_05: 빈칸(문장) 찾기
        if (quizItem.workTypeId === '05') {
          const work05Data = quizItem.work05Data || quizItem.data?.work05Data || quizItem.data;
          return (
            <div key={`quiz-05-${index}`} className="quiz-item">
              <h3>#05. 빈칸(문장) 찾기</h3>
              <div className="instruction">다음 빈칸에 들어갈 문장으로 가장 적절한 것을 고르시오</div>
              <div className="passage">
                {work05Data?.blankedText}
              </div>
              <div className="options">
                {work05Data?.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="option">
                    {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                  </div>
                ))}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong> {['①', '②', '③', '④', '⑤'][work05Data?.answerIndex]} {work05Data?.options?.[work05Data?.answerIndex]}
                </div>
              )}
            </div>
          );
        }

        // Work_06: 문장 위치 찾기
        if (quizItem.workTypeId === '06') {
          const work06Data = quizItem.work06Data || quizItem.data?.work06Data || quizItem.data;
          return (
            <div key={`quiz-06-${index}`} className="quiz-item">
              <h3>#06. 문장 위치 찾기</h3>
              <div className="instruction">다음 문장이 들어갈 가장 적절한 위치를 고르세요</div>
              <div className="passage">
                <strong>주요 문장:</strong> {work06Data?.missingSentence}
              </div>
              <div className="passage">
                <strong>본문:</strong><br />
                {work06Data?.numberedPassage}
              </div>
              <div className="options">
                {work06Data?.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="option">
                    {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                  </div>
                ))}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong> {['①', '②', '③', '④', '⑤'][work06Data?.answerIndex]} {work06Data?.options?.[work06Data?.answerIndex]}
                </div>
              )}
            </div>
          );
        }

        // Work_07: 주제 추론
        if (quizItem.workTypeId === '07') {
          const work07Data = quizItem.work07Data || quizItem.data?.work07Data || quizItem.data;
          return (
            <div key={`quiz-07-${index}`} className="quiz-item">
              <h3>#07. 주제 추론</h3>
              <div className="instruction">다음 글의 주제로 가장 적절한 것을 고르세요</div>
              <div className="passage">
                {work07Data?.passage}
              </div>
              <div className="options">
                {work07Data?.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="option">
                    {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                  </div>
                ))}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong> {['①', '②', '③', '④', '⑤'][work07Data?.answerIndex]} {work07Data?.options?.[work07Data?.answerIndex]}
                </div>
              )}
            </div>
          );
        }

        // Work_08: 제목 추론
        if (quizItem.workTypeId === '08') {
          const work08Data = quizItem.work08Data || quizItem.data?.work08Data || quizItem.data;
          return (
            <div key={`quiz-08-${index}`} className="quiz-item">
              <h3>#08. 제목 추론</h3>
              <div className="instruction">다음 글의 제목으로 가장 적절한 것을 고르세요</div>
              <div className="passage">
                {work08Data?.passage}
              </div>
              <div className="options">
                {work08Data?.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="option">
                    {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                  </div>
                ))}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong> {['①', '②', '③', '④', '⑤'][work08Data?.answerIndex]} {work08Data?.options?.[work08Data?.answerIndex]}
                </div>
              )}
            </div>
          );
        }

        // Work_09: 어법 오류 찾기
        if (quizItem.workTypeId === '09') {
          const work09Data = quizItem.work09Data || quizItem.data?.work09Data || quizItem.data;
          return (
            <div key={`quiz-09-${index}`} className="quiz-item">
              <h3>#09. 어법 오류 찾기</h3>
              <div className="instruction">다음 글에서 어법상 어색한 부분을 찾아 고르세요</div>
              <div className="passage">
                {work09Data?.passage}
              </div>
              <div className="options">
                {work09Data?.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="option">
                    {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                  </div>
                ))}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong> {['①', '②', '③', '④', '⑤'][work09Data?.answerIndex]} {work09Data?.options?.[work09Data?.answerIndex]}
                </div>
              )}
            </div>
          );
        }

        // Work_10: 다중 어법 오류 찾기
        if (quizItem.workTypeId === '10') {
          const work10Data = quizItem.work10Data || quizItem.data?.work10Data || quizItem.data;
          return (
            <div key={`quiz-10-${index}`} className="quiz-item">
              <h3>#10. 다중 어법 오류 찾기</h3>
              <div className="instruction">다음 글에서 어법상 어색한 부분을 모두 찾아 고르세요</div>
              <div className="passage">
                {work10Data?.passage}
              </div>
              <div className="options">
                {work10Data?.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="option">
                    {['①', '②', '③', '④', '⑤', '⑥'][oIndex]} {option}
                  </div>
                ))}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong> {work10Data?.correctAnswers?.join(', ')}
                </div>
              )}
            </div>
          );
        }

        // Work_11: 본문 문장별 해석
        if (quizItem.workTypeId === '11') {
          const work11Data = quizItem.work11Data || quizItem.data?.work11Data || quizItem.data;
          return (
            <div key={`quiz-11-${index}`} className="quiz-item">
              <h3>#11. 본문 문장별 해석</h3>
              <div className="instruction">다음 문장들의 해석을 고르세요</div>
              <div className="passage">
                {work11Data?.sentences?.map((sentence: any, sIndex: number) => (
                  <div key={sIndex} style={{ marginBottom: '10px' }}>
                    <strong>{sIndex + 1}.</strong> {typeof sentence === 'string' ? sentence : sentence.english}
                  </div>
                ))}
              </div>
              <div className="options">
                {work11Data?.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="option">
                    {['①', '②', '③', '④', '⑤'][oIndex]} {option}
                  </div>
                ))}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong>
                  {work11Data?.correctAnswers?.map((answer: string, aIndex: number) => (
                    <div key={aIndex}>
                      {aIndex + 1}. {answer}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // Work_13: 빈칸 채우기 (단어-주관식)
        if (quizItem.workTypeId === '13') {
          const work13Data = quizItem.work13Data || quizItem.data?.work13Data || quizItem.data;
          return (
            <div key={`quiz-13-${index}`} className="quiz-item">
              <h3>#13. 빈칸 채우기 (단어-주관식)</h3>
              <div className="instruction">다음 빈칸에 들어갈 적절한 단어를 쓰시오</div>
              <div className="passage">
                {work13Data?.blankedText}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong>
                  {work13Data?.correctAnswers?.map((answer: string, aIndex: number) => (
                    <div key={aIndex}>
                      {aIndex + 1}. {answer}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // Work_14: 빈칸 채우기 (문장-주관식)
        if (quizItem.workTypeId === '14') {
          const work14Data = quizItem.work14Data || quizItem.data?.work14Data || quizItem.data;
          
          // 기존 데이터 형식을 새로운 형식으로 변환
          const convertBlankedText = (text: string) => {
            if (!text) return text;
            
            // ( A ), ( B ), ( C ) 형식을 (______________________________) 형식으로 변환
            return text.replace(/\(\s*[A-E]\s*\)/g, '(______________________________)');
          };
          
          const convertedBlankedText = convertBlankedText(work14Data?.blankedText);
          
          return (
            <div key={`quiz-14-${index}`} className="quiz-item">
              <h3>#14. 빈칸 채우기 (문장-주관식)</h3>
              <div className="instruction">다음 빈칸에 들어갈 적절한 문장을 쓰시오</div>
              <div className="passage">
                {convertedBlankedText}
              </div>
              {isAnswerMode && (
                <div className="answer">
                  <strong>정답:</strong>
                  {work14Data?.correctAnswers?.map((answer: string, aIndex: number) => (
                    <div key={aIndex}>
                      {aIndex + 1}. {answer}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={`quiz-unknown-${index}`} className="quiz-item">
            <h3>알 수 없는 유형 ({quizItem.workTypeId})</h3>
            <p>데이터 구조를 확인해주세요.</p>
          </div>
        );
      })}
    </div>
  );
};

export default SimpleQuizDisplay;
