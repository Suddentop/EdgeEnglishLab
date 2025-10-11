import React from 'react';
import PrintHeaderPackage02 from './PrintHeaderPackage02';
import './PrintFormatPackage02.css';

interface PrintFormatPackage02Props {
  packageQuiz: any[];
}

const PrintFormatPackage02: React.FC<PrintFormatPackage02Props> = ({ packageQuiz }) => {
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

  return (
    <div className="print-container">
      <PrintHeaderPackage02 />
      
      <div className="print-two-column-container">
        {packageQuiz.map((quizItem, index) => {
          // Work_01: 문단 순서 맞추기
          if (quizItem.workTypeId === '01' && quizItem.quiz) {
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
                  {quizItem.quiz.shuffledParagraphs.map((para: any, pIndex: number) => (
                    <div key={pIndex} className="print-paragraph-item">
                      <strong>{para.label}:</strong> {para.content}
                    </div>
                  ))}
                </div>
                <div className="print-options">
                  {quizItem.quiz.choices.map((choice: string[], cIndex: number) => (
                    <div key={cIndex} className="print-option">
                      {['①', '②', '③', '④'][cIndex]} {choice.join(' → ')}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Work_02: 유사단어 독해
          if (quizItem.workTypeId === '02' && quizItem.work02Data) {
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
                {quizItem.work02Data.replacements && quizItem.work02Data.replacements.length > 0 && (
                  <table className="print-replacements-table">
                    <thead>
                      <tr>
                        <th>원래 단어</th>
                        <th>교체된 단어</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizItem.work02Data.replacements.map((rep: any, repIndex: number) => (
                        <tr key={repIndex}>
                          <td>{rep.original} ({rep.originalMeaning})</td>
                          <td>{rep.replacement} ({rep.replacementMeaning})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          }

          // Work_03: 빈칸(단어) 문제
          if (quizItem.workTypeId === '03' && quizItem.work03Data) {
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
                  {quizItem.work03Data.options.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Work_04: 빈칸(구) 문제
          if (quizItem.workTypeId === '04' && quizItem.work04Data) {
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
                  {quizItem.work04Data.options.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Work_05: 빈칸(문장) 문제
          if (quizItem.workTypeId === '05' && quizItem.work05Data) {
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
                  {quizItem.work05Data.options.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Work_06: 문장 위치 찾기
          if (quizItem.workTypeId === '06' && quizItem.work06Data) {
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
              </div>
            );
          }

          // Work_07: 주제 추론
          if (quizItem.workTypeId === '07' && quizItem.work07Data) {
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
                  {quizItem.work07Data.options.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Work_08: 제목 추론
          if (quizItem.workTypeId === '08' && quizItem.work08Data) {
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
                  {quizItem.work08Data.options.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {`①②③④⑤`[optIndex]} {option}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Work_09: 어법 오류 찾기
          if (quizItem.workTypeId === '09' && quizItem.work09Data) {
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
                  {quizItem.work09Data.options.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {['①', '②', '③', '④', '⑤'][optIndex]} {option}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Work_10: 다중 어법 오류
          if (quizItem.workTypeId === '10' && quizItem.work10Data) {
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
                  {quizItem.work10Data.options.map((option: number, optIndex: number) => (
                    <div key={optIndex} className="print-option">
                      {optIndex + 1}. {option}개
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Work_11: 본문 문장별 해석
          if (quizItem.workTypeId === '11' && quizItem.work11Data) {
            return (
              <div key={`print-11-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#11. 본문 문장별 해석</span>
                  <span className="print-question-type-badge">유형#11</span>
                </div>
                <div className="print-instruction">
                  다음 본문을 문장별로 해석하세요
                </div>
                {quizItem.work11Data.sentences.map((sentence: any, sIndex: number) => (
                  <div key={sIndex} className="print-sentence-item">
                    <div className="print-sentence-label">문장 {sIndex + 1}</div>
                    <div className="print-sentence-english">{sentence.english}</div>
                  </div>
                ))}
              </div>
            );
          }

          // Work_12: 단어 학습
          if (quizItem.workTypeId === '12' && quizItem.work12Data) {
            return (
              <div key={`print-12-${index}`} className="print-question-card">
                <div className="print-question-title">
                  <span>#12. 단어 학습</span>
                  <span className="print-question-type-badge">유형#12</span>
                </div>
                <div className="print-instruction">
                  다음 단어들의 뜻을 학습하세요
                </div>
                {quizItem.work12Data.words.map((word: any, wIndex: number) => (
                  <div key={wIndex} className="print-word-item">
                    <div className="print-word-english">{wIndex + 1}. {word.english}</div>
                  </div>
                ))}
              </div>
            );
          }

          // Work_13: 빈칸 채우기 (단어-주관식)
          if (quizItem.workTypeId === '13' && quizItem.work13Data) {
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
              </div>
            );
          }

          // Work_14: 빈칸 채우기 (문장-주관식)
          if (quizItem.workTypeId === '14' && quizItem.work14Data) {
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
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

export default PrintFormatPackage02;

