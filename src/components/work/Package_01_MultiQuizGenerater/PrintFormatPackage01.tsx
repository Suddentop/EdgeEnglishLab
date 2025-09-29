import React from 'react';
import PrintHeaderPackage01 from './PrintHeaderPackage01';
import { SentenceTranslationQuiz } from '../../../types/types';
import { Quiz } from '../../../types/types';
import { Work02QuizData } from '../../../services/work02Service';
import Work11DynamicPrintPages from '../Work_11_SentenceTranslation/Work11DynamicPrintPages';

interface WordReplacement {
  original: string;
  replacement: string;
  originalMeaning: string;
  replacementMeaning: string;
}

interface BlankFillItem {
  blankedText: string;
  correctAnswers: string[];
  translation: string;
  userAnswer: string;
  isCorrect: boolean | null;
  reasoning?: string;
}

interface PrintFormatPackage01Props {
  quiz: Quiz;
  translatedText: string;
  printMode: 'no-answer' | 'with-answer';
}

interface PrintFormatPackage01Work02Props {
  work02Data: Work02QuizData;
  translatedText: string;
  printMode: 'no-answer' | 'with-answer';
}

interface BlankQuiz {
  blankedText: string;
  options: string[];
  answerIndex: number;
  translation: string;
  optionTranslations?: string[]; // 유형#05용: 선택지별 한글 해석
  selectedSentences?: string[]; // 유형#14용: 선택된 문장들
  correctAnswers?: string[]; // 유형#14용: 정답 문장들
}

interface SentencePositionQuiz {
  missingSentence: string;
  numberedPassage: string;
  answerIndex: number; // 0~4 (①~⑤)
  translation: string;
}

interface MainIdeaQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation: string;
  optionTranslations: string[];
}

interface TitleQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation?: string;
}

interface GrammarQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  original: string; // 정답의 원래(정상) 단어/구
}

interface PrintFormatPackage01Work03Props {
  work03Data: BlankQuiz;
  translatedText: string;
  printMode: 'no-answer' | 'with-answer';
}

interface PrintFormatPackage01Work06Props {
  work06Data: SentencePositionQuiz;
  translatedText: string;
  printMode: 'no-answer' | 'with-answer';
}

interface PrintFormatPackage01Work07Props {
  work07Data: MainIdeaQuiz;
  translatedText: string;
  printMode: 'no-answer' | 'with-answer';
}

interface PrintFormatPackage01Work08Props {
  work08Data: TitleQuiz;
  translatedText: string;
  printMode: 'no-answer' | 'with-answer';
}

interface PrintFormatPackage01Work09Props {
  work09Data: GrammarQuiz;
  translatedText: string;
  printMode: 'no-answer' | 'with-answer';
}

interface MultiGrammarQuiz {
  passage: string; // 번호/밑줄 적용된 본문
  options: number[]; // [1,2,3,4,5]
  answerIndex: number; // 정답(틀린 단어 개수-1)
  translation: string;
  originalWords: string[];
  transformedWords: string[];
  wrongIndexes: number[];
}

interface PrintFormatPackage01Work10Props {
  work10Data: MultiGrammarQuiz;
  translatedText: string;
  printMode: 'no-answer' | 'with-answer';
}

const PrintFormatPackage01: React.FC<PrintFormatPackage01Props> = ({
  quiz,
  translatedText,
  printMode
}) => {
  // 본문 글자 수 기반 페이지 분할 결정
  const getContentLength = () => {
    const totalContentLength = quiz.shuffledParagraphs.reduce((total, paragraph) => {
      return total + paragraph.content.length;
    }, 0);
    return totalContentLength >= 2000;
  };

  // 정답 페이지용 글자 수 기반 페이지 분할 결정
  const getAnswerContentLength = () => {
    const correctOrder = quiz.choices[quiz.answerIndex];
    const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
      ? quiz.shuffledParagraphs 
      : (quiz.paragraphs || []);
    
    const totalContentLength = correctOrder.reduce((total, paragraphLabel) => {
      const paragraph = availableParagraphs.find(p => p.label === paragraphLabel);
      if (paragraph && paragraph.content) {
        return total + paragraph.content.length;
      }
      return total;
    }, 0);
    
    return totalContentLength >= 2000;
  };


  const needsSecondPage = getContentLength();
  const needsAnswerThirdPage = getAnswerContentLength();

  // 인쇄용 문제 (정답 없음)
  if (printMode === 'no-answer') {
    return (
      <div className="only-print">
        {needsSecondPage ? (
          // 2페이지 분할: 문제제목+본문, 4지선다
          <>
            {/* 첫 번째 페이지: 문제제목 + 본문 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#01</span>
                  </div>
                    {quiz.shuffledParagraphs.map((paragraph, index) => (
                    <div key={paragraph.id} className="shuffled-paragraph" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        <strong>{paragraph.label}:</strong> {paragraph.content}
                      </div>
                    ))}
                </div>
              </div>
            </div>
            
            {/* 두 번째 페이지: D단락 + 4지선다 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#01</span>
                  </div>
                  {quiz.shuffledParagraphs.slice(3).map((paragraph, index) => (
                    <div key={paragraph.id} className="shuffled-paragraph" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                      <strong>{paragraph.label}:</strong> {paragraph.content}
                    </div>
                  ))}
                    {quiz.choices.map((choice, index) => (
                    <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                        {['①', '②', '③', '④'][index]} {choice.join(' → ')}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          // 1페이지: 모든 내용 포함
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#01</span>
                </div>
                  {quiz.shuffledParagraphs.map((paragraph, index) => (
                  <div key={paragraph.id} className="shuffled-paragraph" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                      <strong>{paragraph.label}:</strong> {paragraph.content}
                    </div>
                  ))}
                  {quiz.choices.map((choice, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                      {['①', '②', '③', '④'][index]} {choice.join(' → ')}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 인쇄용 문제 (정답 포함) - 본문해석 포함
  if (printMode === 'with-answer') {
    return (
      <div className="only-print work-01-print">
        {needsAnswerThirdPage ? (
          // 3페이지 구성: 본문 글자수 2,000자 이상
          <>
            {/* 1페이지: A, B, C 본문만 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#01</span>
                  </div>
                    {(() => {
                      const correctOrder = quiz.choices[quiz.answerIndex];
                      const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
                        ? quiz.shuffledParagraphs 
                        : (quiz.paragraphs || []);
                      
                      return correctOrder.slice(0, 3).map((paragraphLabel, index) => {
                        const paragraph = availableParagraphs.find(p => p.label === paragraphLabel);
                        if (!paragraph || !paragraph.content) return null;
                        
                        return (
                        <div key={paragraph.id} className="shuffled-paragraph" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                            <strong>{paragraph.label}:</strong> {paragraph.content}
                          </div>
                        );
                      });
                    })()}
                </div>
              </div>
            </div>

            {/* 2페이지: D 본문 + 4지선다 + 정답 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                    {(() => {
                      const correctOrder = quiz.choices[quiz.answerIndex];
                      const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
                        ? quiz.shuffledParagraphs 
                        : (quiz.paragraphs || []);
                      
                      const lastParagraphLabel = correctOrder[3];
                      const paragraph = availableParagraphs.find(p => p.label === lastParagraphLabel);
                      
                      if (!paragraph || !paragraph.content) return null;
                      
                      return (
                      <div key={paragraph.id} className="shuffled-paragraph" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                          <strong>{paragraph.label}:</strong> {paragraph.content}
                        </div>
                      );
                    })()}
                  <div className="option option-print" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                      <span style={{color: '#000000', fontWeight: 'bold'}}>{['①', '②', '③', '④'][quiz.answerIndex]} {quiz.choices[quiz.answerIndex].join(' → ')}</span>&nbsp;<span style={{color: '#1976d2', fontWeight: 'bold'}}>(정답)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3페이지: 본문 해석 - 글자 수에 따라 분할 */}
            {needsAnswerThirdPage ? (
              // 3페이지 분할: A,B,C+해석, D+해석
              <>
                {/* 3-1페이지: A, B, C + 해석 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderPackage01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight: '800', fontSize: '1rem', background: '#222', color: '#fff', padding: '0.7rem 0.5rem', borderRadius: '8px', marginBottom: '1.2rem', marginTop: '0.5rem', display: 'block', width:'100%'}}>
                        본문 해석
                      </div>
                      
                      {(() => {
                        const correctOrder = quiz.choices[quiz.answerIndex];
                        const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
                          ? quiz.shuffledParagraphs 
                          : (quiz.paragraphs || []);
                        
                        return correctOrder.slice(0, 3).map((paragraphLabel, index) => {
                          const paragraph = availableParagraphs.find(p => p.label === paragraphLabel);
                          
                          if (!paragraph || !paragraph.content) return null;
                          
                          return (
                            <div key={paragraphLabel} className="paragraph-simple" style={{marginBottom: '1.5rem'}}>
                              <div style={{marginBottom: '0.5rem', fontSize: '1rem', paddingLeft: '0.6rem', paddingRight: '0.6rem'}}>
                                <strong style={{fontSize: '1rem', color: '#333'}}>{paragraph.label}:</strong> {paragraph.content}
                              </div>
                              <div style={{
                                width: '100%',
                                minHeight: '60px',
                                border: '1px solid #ccc',
                                backgroundColor: '#F1F8E9',
                                marginTop: '0.5rem',
                                padding: '0.6rem',
                                fontSize: '1rem',
                                lineHeight: '1.4',
                                color: '#333'
                              }}>
                                {translatedText ? (
                                  (() => {
                                    const totalLength = translatedText.length;
                                    const partLength = Math.floor(totalLength / 4);
                                    const startIndex = index * partLength;
                                    const endIndex = index === 2 ? (index + 1) * partLength : (index + 1) * partLength;
                                    return translatedText.substring(startIndex, endIndex).trim();
                                  })()
                                ) : (
                                  '번역 중...'
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* 3-2페이지: D + 해석 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderPackage01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight: '800', fontSize: '1rem', background: '#222', color: '#fff', padding: '0.7rem 0.5rem', borderRadius: '8px', marginBottom: '1.2rem', marginTop: '0.5rem', display: 'block', width:'100%'}}>
                        본문 해석 (계속)
                      </div>
                      
                      {(() => {
                        const correctOrder = quiz.choices[quiz.answerIndex];
                        const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
                          ? quiz.shuffledParagraphs 
                          : (quiz.paragraphs || []);
                        
                        const lastParagraphLabel = correctOrder[3];
                        const paragraph = availableParagraphs.find(p => p.label === lastParagraphLabel);
                        
                        if (!paragraph || !paragraph.content) return null;
                        
                        return (
                          <div className="paragraph-simple" style={{marginBottom: '1.5rem'}}>
                            <div style={{marginBottom: '0.5rem', fontSize: '1rem', paddingLeft: '0.6rem', paddingRight: '0.6rem'}}>
                              <strong style={{fontSize: '1rem', color: '#333'}}>{paragraph.label}:</strong> {paragraph.content}
                            </div>
                            <div style={{
                              width: '100%',
                              minHeight: '60px',
                              border: '1px solid #ccc',
                              backgroundColor: '#F1F8E9',
                              marginTop: '0.5rem',
                              padding: '0.6rem',
                              fontSize: '1rem',
                              lineHeight: '1.4',
                              color: '#333'
                            }}>
                              {translatedText ? (
                                (() => {
                                  const totalLength = translatedText.length;
                                  const partLength = Math.floor(totalLength / 4);
                                  const startIndex = 3 * partLength;
                                  const endIndex = totalLength;
                                  return translatedText.substring(startIndex, endIndex).trim();
                                })()
                              ) : (
                                '번역 중...'
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // 3페이지: 모든 해석 내용
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderPackage01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    <div className="problem-instruction" style={{fontWeight: '800', fontSize: '1rem', background: '#222', color: '#fff', padding: '0.7rem 0.5rem', borderRadius: '8px', marginBottom: '1.2rem', marginTop: '0.5rem', display: 'block', width:'100%'}}>
                      본문 해석
                    </div>
                    
                    {(() => {
                      const correctOrder = quiz.choices[quiz.answerIndex];
                      const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
                        ? quiz.shuffledParagraphs 
                        : (quiz.paragraphs || []);
                      
                      return correctOrder.map((paragraphLabel, index) => {
                        const paragraph = availableParagraphs.find(p => p.label === paragraphLabel);
                        
                        if (!paragraph || !paragraph.content) return null;
                        
                        return (
                          <div key={paragraphLabel} className="paragraph-simple" style={{marginBottom: '1.5rem'}}>
                            <div style={{marginBottom: '0.5rem', fontSize: '1rem', paddingLeft: '0.6rem', paddingRight: '0.6rem'}}>
                              <strong style={{fontSize: '1rem', color: '#333'}}>{paragraph.label}:</strong> {paragraph.content}
                            </div>
                            <div style={{
                              width: '100%',
                              minHeight: '60px',
                              border: '1px solid #ccc',
                              backgroundColor: '#F1F8E9',
                              marginTop: '0.5rem',
                              padding: '0.6rem',
                              fontSize: '1rem',
                              lineHeight: '1.4',
                              color: '#333'
                            }}>
                              {translatedText ? (
                                (() => {
                                  const totalLength = translatedText.length;
                                  const partLength = Math.floor(totalLength / 4);
                                  const startIndex = index * partLength;
                                  const endIndex = index === 3 ? totalLength : (index + 1) * partLength;
                                  return translatedText.substring(startIndex, endIndex).trim();
                                })()
                              ) : (
                                '번역 중...'
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          // 2페이지 구성: 본문 글자수 2,000자 미만
          <>
            {/* 1페이지: A, B, C, D 본문 + 4지선다 + 정답 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#01</span>
                  </div>
                    {quiz.shuffledParagraphs.map((paragraph, index) => (
                    <div key={paragraph.id} className="shuffled-paragraph" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        <strong>{paragraph.label}:</strong> {paragraph.content}
                      </div>
                    ))}
                  <div className="option option-print" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                      <span style={{color: '#000000', fontWeight: 'bold'}}>{['①', '②', '③', '④'][quiz.answerIndex]} {quiz.choices[quiz.answerIndex].join(' → ')}</span>&nbsp;<span style={{color: '#1976d2', fontWeight: 'bold'}}>(정답)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2페이지: 본문 해석 - 글자 수에 따라 분할 */}
            {needsAnswerThirdPage ? (
              // 2페이지 분할: A,B,C+해석, D+해석
              <>
                {/* 2-1페이지: A, B, C + 해석 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderPackage01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight: '800', fontSize: '1rem', background: '#222', color: '#fff', padding: '0.7rem 0.5rem', borderRadius: '8px', marginBottom: '1.2rem', marginTop: '0.5rem', display: 'block', width:'100%'}}>
                        본문 해석
                      </div>
                      
                      {(() => {
                        const correctOrder = quiz.choices[quiz.answerIndex];
                        const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
                          ? quiz.shuffledParagraphs 
                          : (quiz.paragraphs || []);
                        
                        return correctOrder.slice(0, 3).map((paragraphLabel, index) => {
                          const paragraph = availableParagraphs.find(p => p.label === paragraphLabel);
                          
                          if (!paragraph || !paragraph.content) return null;
                          
                          return (
                            <div key={paragraphLabel} className="paragraph-simple" style={{marginBottom: '1.5rem'}}>
                              <div style={{marginBottom: '0.5rem', fontSize: '1rem', paddingLeft: '0.6rem', paddingRight: '0.6rem'}}>
                                <strong style={{fontSize: '1rem', color: '#333'}}>{paragraph.label}:</strong> {paragraph.content}
                              </div>
                              <div style={{
                                width: '100%',
                                minHeight: '60px',
                                border: '1px solid #ccc',
                                backgroundColor: '#F1F8E9',
                                marginTop: '0.5rem',
                                padding: '0.6rem',
                                fontSize: '1rem',
                                lineHeight: '1.4',
                                color: '#333'
                              }}>
                                {translatedText ? (
                                  (() => {
                                    const totalLength = translatedText.length;
                                    const partLength = Math.floor(totalLength / 4);
                                    const startIndex = index * partLength;
                                    const endIndex = index === 2 ? (index + 1) * partLength : (index + 1) * partLength;
                                    return translatedText.substring(startIndex, endIndex).trim();
                                  })()
                                ) : (
                                  '번역 중...'
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* 2-2페이지: D + 해석 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderPackage01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight: '800', fontSize: '1rem', background: '#222', color: '#fff', padding: '0.7rem 0.5rem', borderRadius: '8px', marginBottom: '1.2rem', marginTop: '0.5rem', display: 'block', width:'100%'}}>
                        본문 해석 (계속)
                      </div>
                      
                      {(() => {
                        const correctOrder = quiz.choices[quiz.answerIndex];
                        const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
                          ? quiz.shuffledParagraphs 
                          : (quiz.paragraphs || []);
                        
                        const lastParagraphLabel = correctOrder[3];
                        const paragraph = availableParagraphs.find(p => p.label === lastParagraphLabel);
                        
                        if (!paragraph || !paragraph.content) return null;
                        
                        return (
                          <div className="paragraph-simple" style={{marginBottom: '1.5rem'}}>
                            <div style={{marginBottom: '0.5rem', fontSize: '1rem', paddingLeft: '0.6rem', paddingRight: '0.6rem'}}>
                              <strong style={{fontSize: '1rem', color: '#333'}}>{paragraph.label}:</strong> {paragraph.content}
                            </div>
                            <div style={{
                              width: '100%',
                              minHeight: '60px',
                              border: '1px solid #ccc',
                              backgroundColor: '#F1F8E9',
                              marginTop: '0.5rem',
                              padding: '0.6rem',
                              fontSize: '1rem',
                              lineHeight: '1.4',
                              color: '#333'
                            }}>
                              {translatedText ? (
                                (() => {
                                  const totalLength = translatedText.length;
                                  const partLength = Math.floor(totalLength / 4);
                                  const startIndex = 3 * partLength;
                                  const endIndex = totalLength;
                                  return translatedText.substring(startIndex, endIndex).trim();
                                })()
                              ) : (
                                '번역 중...'
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // 1페이지: 모든 해석 내용
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderPackage01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    <div className="problem-instruction" style={{fontWeight: '800', fontSize: '1rem', background: '#222', color: '#fff', padding: '0.7rem 0.5rem', borderRadius: '8px', marginBottom: '1.2rem', marginTop: '0.5rem', display: 'block', width:'100%'}}>
                      본문 해석
                    </div>
                    
                    {(() => {
                      const correctOrder = quiz.choices[quiz.answerIndex];
                      const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
                        ? quiz.shuffledParagraphs 
                        : (quiz.paragraphs || []);
                      
                      return correctOrder.map((paragraphLabel, index) => {
                        const paragraph = availableParagraphs.find(p => p.label === paragraphLabel);
                        
                        if (!paragraph || !paragraph.content) return null;
                        
                        return (
                          <div key={paragraphLabel} className="paragraph-simple" style={{marginBottom: '1.5rem'}}>
                            <div style={{marginBottom: '0.5rem', fontSize: '1rem', paddingLeft: '0.6rem', paddingRight: '0.6rem'}}>
                              <strong style={{fontSize: '1rem', color: '#333'}}>{paragraph.label}:</strong> {paragraph.content}
                            </div>
                            <div style={{
                              width: '100%',
                              minHeight: '60px',
                              border: '1px solid #ccc',
                              backgroundColor: '#F1F8E9',
                              marginTop: '0.5rem',
                              padding: '0.6rem',
                              fontSize: '1rem',
                              lineHeight: '1.4',
                              color: '#333'
                            }}>
                              {translatedText ? (
                                (() => {
                                  const totalLength = translatedText.length;
                                  const partLength = Math.floor(totalLength / 4);
                                  const startIndex = index * partLength;
                                  const endIndex = index === 3 ? totalLength : (index + 1) * partLength;
                                  return translatedText.substring(startIndex, endIndex).trim();
                                })()
                              ) : (
                                '번역 중...'
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return null;
};

// Work_02용 인쇄 컴포넌트
const PrintFormatPackage01Work02: React.FC<PrintFormatPackage01Work02Props> = ({
  work02Data,
  translatedText,
  printMode
}) => {
  // 인쇄용 텍스트 렌더링 - Work_02와 동일한 함수
  const renderPrintTextWithUnderlines = (text: string, replacements: WordReplacement[], isOriginal: boolean = true) => {
    if (!replacements || replacements.length === 0) return text;
    
    // 문장 분리 (원본 본문과 동일한 방식)
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    let result = '';
    let currentPosition = 0;
    
    // 각 문장별로 처리
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const replacement = replacements[i];
      
      if (!replacement) {
        // 교체 정보가 없는 문장은 그대로 추가
        result += sentence;
        currentPosition += sentence.length;
        continue;
      }
      
      // 현재 문장의 시작 위치 찾기
      const sentenceStart = text.indexOf(sentence, currentPosition);
      if (sentenceStart === -1) {
        result += sentence;
        currentPosition += sentence.length;
        continue;
      }
      
      const sentenceEnd = sentenceStart + sentence.length;
      
      // 현재 문장 내에서만 선택된 단어 찾기
      const wordToHighlight = isOriginal ? replacement.original : replacement.replacement;
      const escapedWord = wordToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      
      // 문장 내에서 해당 단어만 HTML 태그로 감싸기 (밑줄, 파란색, 진하게)
      const modifiedSentence = sentence.replace(regex, `<u><strong style="color: #1976d2;">$&</strong></u>`);
      result += modifiedSentence;
      
      currentPosition = sentenceEnd;
    }
    
    return result;
  };

  // Work_02용 페이지 분할 로직 (원래 유형#02와 동일)
  const getWork02PageLayout = (work02Data: Work02QuizData) => {
    if (!work02Data) return { needsSecondPage: false, needsThirdPage: false, firstPageIncludesReplacements: true };

    // 임시 컨테이너 생성하여 실제 높이 측정
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: 100%;
      max-width: 100%;
      font-family: 'Noto Sans KR', 'IBM Plex Sans KR', Arial, sans-serif;
      visibility: hidden;
      pointer-events: none;
    `;
    document.body.appendChild(tempContainer);

    // A: 문제 제목 + 영어 본문 높이 측정
    const problemTitle = document.createElement('div');
    problemTitle.style.cssText = `
      font-weight: 800;
      font-size: 0.9rem;
      background: #222;
      color: #fff;
      padding: 0.7rem 0.5rem;
      border-radius: 8px;
      margin-bottom: 0.8rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
    `;
    problemTitle.innerHTML = '<span>문제: 다음 본문을 읽고 해석하세요</span><span style="font-size:0.9rem; font-weight:700; color:#FFD700;">유형#02</span>';
    
    const englishPassage = document.createElement('div');
    englishPassage.style.cssText = `
      margin-top: 0.9rem;
      font-size: 0.9rem;
      padding: 1rem;
      background: #FFF3CD;
      border-radius: 8px;
      border: 1.5px solid #e3f2fd;
      font-family: inherit;
      color: #222;
      line-height: 1.7;
      box-sizing: border-box;
      word-wrap: break-word;
      width: 100%;
      max-width: 100%;
      overflow-wrap: break-word;
      white-space: normal;
      margin: 0;
    `;
    englishPassage.textContent = work02Data.modifiedText || '';
    
    tempContainer.appendChild(problemTitle);
    tempContainer.appendChild(englishPassage);
    
    const firstPageHeight = problemTitle.scrollHeight + englishPassage.scrollHeight + 20; // 20px 여백

    // B: 교체된 단어들 제목 + 테이블 높이 측정
    const replacementsTitle = document.createElement('div');
    replacementsTitle.style.cssText = `
      font-weight: 800;
      font-size: 0.9rem;
      background: #222;
      color: #fff;
      padding: 0.7rem 0.5rem;
      border-radius: 8px;
      margin-bottom: 0rem;
      display: block;
      width: 100%;
      box-sizing: border-box;
    `;
    replacementsTitle.textContent = '교체된 단어들';
    
    const replacementsTable = document.createElement('div');
    replacementsTable.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 1rem;
      table-layout: fixed;
      box-sizing: border-box;
    `;
    
    // 테이블 HTML 생성 (간단한 버전)
    let tableHTML = '<table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #ddd;">';
    tableHTML += '<thead><tr><th>원래 단어</th><th>교체된 단어</th><th>원래 단어</th><th>교체된 단어</th></tr></thead><tbody>';
    
    const halfLength = Math.ceil(work02Data.replacements.length / 2);
    for (let i = 0; i < halfLength; i++) {
      const leftReplacement = work02Data.replacements[i * 2];
      const rightReplacement = work02Data.replacements[i * 2 + 1];
      
      tableHTML += '<tr>';
      tableHTML += `<td>${leftReplacement ? `${leftReplacement.original} (${leftReplacement.originalMeaning})` : ''}</td>`;
      tableHTML += `<td>${leftReplacement ? `${leftReplacement.replacement} (${leftReplacement.replacementMeaning})` : ''}</td>`;
      tableHTML += `<td>${rightReplacement ? `${rightReplacement.original} (${rightReplacement.originalMeaning})` : ''}</td>`;
      tableHTML += `<td>${rightReplacement ? `${rightReplacement.replacement} (${rightReplacement.replacementMeaning})` : ''}</td>`;
      tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table>';
    replacementsTable.innerHTML = tableHTML;
    
    tempContainer.appendChild(replacementsTitle);
    tempContainer.appendChild(replacementsTable);
    
    const replacementsHeight = replacementsTitle.scrollHeight + replacementsTable.scrollHeight + 20; // 20px 여백

    // C: 한글 해석 높이 측정
    const koreanTranslation = document.createElement('div');
    koreanTranslation.style.cssText = `
      font-size: 16px;
      padding: 16px;
      background: #F1F8E9;
      border-radius: 8px;
      font-family: inherit;
      color: #222;
      line-height: 1.7;
      box-sizing: border-box;
      word-wrap: break-word;
      width: 100%;
      max-width: 100%;
      overflow-wrap: break-word;
      white-space: normal;
      margin: 0;
    `;
    koreanTranslation.textContent = work02Data.translation || '번역을 생성하는 중...';
    
    tempContainer.appendChild(koreanTranslation);
    
    const koreanTranslationHeight = koreanTranslation.scrollHeight + 20; // 20px 여백

    // 임시 컨테이너 제거
    document.body.removeChild(tempContainer);
    
    // 페이지 분할 로직 결정 (원래 유형#02와 동일)
    const A = firstPageHeight;        // 문제 제목 + 영어 본문
    const B = replacementsHeight;     // 교체된 단어들 제목 + 테이블
    const C = koreanTranslationHeight; // 한글 해석
    const availableSpace = 950; // 950px
    
    const totalHeight = A + B + C;
    
    let needsSecondPage = false;
    let needsThirdPage = false;
    let firstPageIncludesReplacements = true;
    
    if (totalHeight <= availableSpace) {
      // A+B+C ≤ 950 → 1페이지
      needsSecondPage = false;
      needsThirdPage = false;
      firstPageIncludesReplacements = true;
    } else if (A + B <= availableSpace) {
      // A+B+C > 950, A+B ≤ 950 → 1페이지(A+B), 2페이지(C)
      needsSecondPage = true;
      needsThirdPage = false;
      firstPageIncludesReplacements = true;
    } else if (A <= availableSpace && B + C <= availableSpace) {
      // A+B+C > 950, A+B > 950, A ≤ 950, B+C ≤ 950 → 1페이지(A), 2페이지(B+C)
      needsSecondPage = true;
      needsThirdPage = false;
      firstPageIncludesReplacements = false;
    } else {
      // A+B+C > 950, A+B > 950, A > 950 또는 B+C > 950 → 1페이지(A), 2페이지(B), 3페이지(C)
      needsSecondPage = true;
      needsThirdPage = true;
      firstPageIncludesReplacements = false;
    }
    
    return { needsSecondPage, needsThirdPage, firstPageIncludesReplacements };
  };

  // Work_02용 페이지 분할 로직 적용
  const work02PageLayout = getWork02PageLayout(work02Data);
  const needsAnswerSecondPage = work02PageLayout.needsSecondPage;
  const needsAnswerThirdPage = work02PageLayout.needsThirdPage;
  const firstPageIncludesReplacements = work02PageLayout.firstPageIncludesReplacements;

  // 인쇄용: 문제만
  if (printMode === 'no-answer') {
    return (
      <div className="only-print">
        {/* 1페이지: 문제제목 + 본문만 (해석 제거) */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>문제: 다음 본문을 읽고 해석하세요</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#02</span>
              </div>
              <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(work02Data.modifiedText, work02Data.replacements, false)}}>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 인쇄용: 정답포함 (원래 유형#02와 동일한 페이지 분할 로직)
  if (printMode === 'with-answer') {
    if (!needsAnswerSecondPage) {
      // 1페이지: A+B+C 모두 1페이지에 들어감
      return (
        <div className="only-print print-answer-mode">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>문제: 다음 본문을 읽고 해석하세요</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#02</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(work02Data.modifiedText, work02Data.replacements, false)}}>
                </div>
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0rem', display:'block', width:'100%'}}>
                  교체된 단어들
              </div>
                {work02Data.replacements && work02Data.replacements.length > 0 ? (
                  <div style={{marginTop:'0rem'}}>
                    {(() => {
                      const totalReplacements = work02Data.replacements.length;
                      const halfLength = Math.ceil(totalReplacements / 2);

                      return (
                        <table className="replacements-table">
                          <thead>
                            <tr>
                              <th>원래 단어</th>
                              <th>교체된 단어</th>
                              <th>원래 단어</th>
                              <th>교체된 단어</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: halfLength }, (_, rowIndex) => {
                              const leftReplacement = work02Data.replacements[rowIndex * 2];
                              const rightReplacement = work02Data.replacements[rowIndex * 2 + 1];
                              
                              return (
                                <tr key={rowIndex}>
                                  <td>
                                    {leftReplacement && (
                                      <>
                                        <span className="original-word">{leftReplacement.original}</span>
                                        <span className="original-meaning"> ({leftReplacement.originalMeaning})</span>
                                      </>
                                    )}
                                  </td>
                                  <td>
                                    {leftReplacement && (
                                      <>
                                        <span className="replacement-word">{leftReplacement.replacement}</span>
                                        <span className="replacement-meaning"> ({leftReplacement.replacementMeaning})</span>
                                      </>
                                    )}
                                  </td>
                                  <td>
                                    {rightReplacement && (
                                      <>
                                        <span className="original-word">{rightReplacement.original}</span>
                                        <span className="original-meaning"> ({rightReplacement.originalMeaning})</span>
                                      </>
                                    )}
                                  </td>
                                  <td>
                                    {rightReplacement && (
                                      <>
                                        <span className="replacement-word">{rightReplacement.replacement}</span>
                                        <span className="replacement-meaning"> ({rightReplacement.replacementMeaning})</span>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
            </div>
                ) : (
                  <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                    교체된 단어가 없습니다.
          </div>
                )}
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%', marginTop:'1.5rem'}}>
                  본문 해석
                </div>
                <div className="problem-passage translation" style={{marginTop:'0.63rem', fontSize:'1rem !important', padding:'1rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                  {work02Data.translation || '번역을 생성하는 중...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (needsAnswerSecondPage && !needsAnswerThirdPage) {
      // 2페이지 구성
      if (firstPageIncludesReplacements) {
        // 1페이지(A+B), 2페이지(C)
        return (
          <div className="only-print print-answer-mode">
            {/* 1페이지: 문제제목 + 본문 + 교체된 단어들 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>문제: 다음 본문을 읽고 해석하세요</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#02</span>
                  </div>
                  <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(work02Data.modifiedText, work02Data.replacements, false)}}>
                  </div>
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0rem', display:'block', width:'100%'}}>
                  교체된 단어들
                </div>
                {work02Data.replacements && work02Data.replacements.length > 0 ? (
                    <div style={{marginTop:'0rem'}}>
                      {(() => {
                        const totalReplacements = work02Data.replacements.length;
                        const halfLength = Math.ceil(totalReplacements / 2);

                        return (
                    <table className="replacements-table">
                      <thead>
                        <tr>
                          <th>원래 단어</th>
                          <th>교체된 단어</th>
                          <th>원래 단어</th>
                          <th>교체된 단어</th>
                        </tr>
                      </thead>
                      <tbody>
                              {Array.from({ length: halfLength }, (_, rowIndex) => {
                                const leftReplacement = work02Data.replacements[rowIndex * 2];
                                const rightReplacement = work02Data.replacements[rowIndex * 2 + 1];
                                
                                return (
                          <tr key={rowIndex}>
                            <td>
                                      {leftReplacement && (
                                <>
                                          <span className="original-word">{leftReplacement.original}</span>
                                          <span className="original-meaning"> ({leftReplacement.originalMeaning})</span>
                                </>
                              )}
                            </td>
                            <td>
                                      {leftReplacement && (
                                <>
                                          <span className="replacement-word">{leftReplacement.replacement}</span>
                                          <span className="replacement-meaning"> ({leftReplacement.replacementMeaning})</span>
                                </>
                              )}
                            </td>
                            <td>
                                      {rightReplacement && (
                                <>
                                          <span className="original-word">{rightReplacement.original}</span>
                                          <span className="original-meaning"> ({rightReplacement.originalMeaning})</span>
                                </>
                              )}
                            </td>
                            <td>
                                      {rightReplacement && (
                                <>
                                          <span className="replacement-word">{rightReplacement.replacement}</span>
                                          <span className="replacement-meaning"> ({rightReplacement.replacementMeaning})</span>
                                </>
                              )}
                            </td>
                          </tr>
                                );
                              })}
                      </tbody>
                    </table>
                        );
                      })()}
                  </div>
                ) : (
                  <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                    교체된 단어가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

            {/* 2페이지: 본문 해석 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%'}}>
                  본문 해석
                </div>
                  <div className="problem-passage translation" style={{marginTop:'0.63rem', fontSize:'1rem !important', padding:'1rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                    {work02Data.translation || '번역을 생성하는 중...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
        // 1페이지(A), 2페이지(B+C)
      return (
        <div className="only-print print-answer-mode">
            {/* 1페이지: 문제제목 + 본문만 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>문제: 다음 본문을 읽고 해석하세요</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#02</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(work02Data.modifiedText, work02Data.replacements, false)}}>
                </div>
                </div>
              </div>
            </div>

            {/* 2페이지: 교체된 단어들 + 본문 해석 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0rem', display:'block', width:'100%'}}>
                  교체된 단어들
                </div>
                {work02Data.replacements && work02Data.replacements.length > 0 ? (
                    <div style={{marginTop:'0rem'}}>
                      {(() => {
                        const totalReplacements = work02Data.replacements.length;
                        const halfLength = Math.ceil(totalReplacements / 2);

                        return (
                    <table className="replacements-table">
                      <thead>
                        <tr>
                          <th>원래 단어</th>
                          <th>교체된 단어</th>
                          <th>원래 단어</th>
                          <th>교체된 단어</th>
                        </tr>
                      </thead>
                      <tbody>
                              {Array.from({ length: halfLength }, (_, rowIndex) => {
                                const leftReplacement = work02Data.replacements[rowIndex * 2];
                                const rightReplacement = work02Data.replacements[rowIndex * 2 + 1];
                                
                                return (
                          <tr key={rowIndex}>
                            <td>
                                      {leftReplacement && (
                                <>
                                          <span className="original-word">{leftReplacement.original}</span>
                                          <span className="original-meaning"> ({leftReplacement.originalMeaning})</span>
                                </>
                              )}
                            </td>
                            <td>
                                      {leftReplacement && (
                                <>
                                          <span className="replacement-word">{leftReplacement.replacement}</span>
                                          <span className="replacement-meaning"> ({leftReplacement.replacementMeaning})</span>
                                </>
                              )}
                            </td>
                            <td>
                                      {rightReplacement && (
                                <>
                                          <span className="original-word">{rightReplacement.original}</span>
                                          <span className="original-meaning"> ({rightReplacement.originalMeaning})</span>
                                </>
                              )}
                            </td>
                            <td>
                                      {rightReplacement && (
                                <>
                                          <span className="replacement-word">{rightReplacement.replacement}</span>
                                          <span className="replacement-meaning"> ({rightReplacement.replacementMeaning})</span>
                                </>
                              )}
                            </td>
                          </tr>
                                );
                              })}
                      </tbody>
                    </table>
                        );
                      })()}
                  </div>
                ) : (
                  <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                    교체된 단어가 없습니다.
                  </div>
                )}
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%', marginTop:'1.5rem'}}>
                    본문 해석
                  </div>
                  <div className="problem-passage translation" style={{marginTop:'0.63rem', fontSize:'1rem !important', padding:'1rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                    {work02Data.translation || '번역을 생성하는 중...'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
    } else {
      // 3페이지 구성: 1페이지(A), 2페이지(B), 3페이지(C)
      return (
        <div className="only-print print-answer-mode">
          {/* 1페이지: 문제제목 + 본문만 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>문제: 다음 본문을 읽고 해석하세요</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#02</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(work02Data.modifiedText, work02Data.replacements, false)}}>
                </div>
              </div>
            </div>
          </div>

          {/* 2페이지: 교체된 단어들 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0rem', display:'block', width:'100%'}}>
                  교체된 단어들
                </div>
                {work02Data.replacements && work02Data.replacements.length > 0 ? (
                  <div style={{marginTop:'0rem'}}>
                    {(() => {
                      const totalReplacements = work02Data.replacements.length;
                      const halfLength = Math.ceil(totalReplacements / 2);

                      return (
                        <table className="replacements-table">
                          <thead>
                            <tr>
                              <th>원래 단어</th>
                              <th>교체된 단어</th>
                              <th>원래 단어</th>
                              <th>교체된 단어</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: halfLength }, (_, rowIndex) => {
                              const leftReplacement = work02Data.replacements[rowIndex * 2];
                              const rightReplacement = work02Data.replacements[rowIndex * 2 + 1];
                              
                              return (
                                <tr key={rowIndex}>
                                  <td>
                                    {leftReplacement && (
                                      <>
                                        <span className="original-word">{leftReplacement.original}</span>
                                        <span className="original-meaning"> ({leftReplacement.originalMeaning})</span>
                                      </>
                                    )}
                                  </td>
                                  <td>
                                    {leftReplacement && (
                                      <>
                                        <span className="replacement-word">{leftReplacement.replacement}</span>
                                        <span className="replacement-meaning"> ({leftReplacement.replacementMeaning})</span>
                                      </>
                                    )}
                                  </td>
                                  <td>
                                    {rightReplacement && (
                                      <>
                                        <span className="original-word">{rightReplacement.original}</span>
                                        <span className="original-meaning"> ({rightReplacement.originalMeaning})</span>
                                      </>
                                    )}
                                  </td>
                                  <td>
                                    {rightReplacement && (
                                      <>
                                        <span className="replacement-word">{rightReplacement.replacement}</span>
                                        <span className="replacement-meaning"> ({rightReplacement.replacementMeaning})</span>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                    교체된 단어가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3페이지: 본문 해석 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%'}}>
                  본문 해석
                </div>
                <div className="problem-passage translation" style={{marginTop:'0.63rem', fontSize:'1rem !important', padding:'1rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                  {work02Data.translation || '번역을 생성하는 중...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
};

// Work_03용 인쇄 컴포넌트
const PrintFormatPackage01Work03: React.FC<PrintFormatPackage01Work03Props> = ({
  work03Data,
  translatedText,
  printMode
}) => {
  // 인쇄용: 문제만
  if (printMode === 'no-answer') {
    const needsSecondPage = work03Data.blankedText.length >= 2000;
    
    return (
      <div className="only-print">
        {needsSecondPage ? (
          // 2페이지 분할: 문제제목+본문, 객관식
          <>
            {/* 첫 번째 페이지: 문제제목 + 본문 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 빈칸에 들어갈 가장 적절한 단어를 고르세요.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#03</span>
              </div>
                  <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'8px', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work03Data.blankedText}
              </div>
                </div>
              </div>
            </div>

            {/* 두 번째 페이지: 객관식만 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>다음 빈칸에 들어갈 가장 적절한 단어를 고르세요.</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#03</span>
                  </div>
                {work03Data.options.map((option, index) => (
                    <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                    {['①', '②', '③', '④', '⑤'][index]} {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>
        ) : (
          // 1페이지: 모든 내용
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
        </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 빈칸에 들어갈 가장 적절한 단어를 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#03</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'8px', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                  {work03Data.blankedText}
                </div>
                {work03Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                    {['①', '②', '③', '④', '⑤'][index]} {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 인쇄용: 정답포함
  if (printMode === 'with-answer') {
    return (
      <div className="only-print print-answer-mode">
        {/* 1페이지: 문제 + 정답 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 빈칸에 들어갈 가장 적절한 단어를 고르세요.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#03</span>
              </div>
              <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'8px', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work03Data.blankedText}
              </div>
              <div className="option option-print" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                  {['①', '②', '③', '④', '⑤'][work03Data.answerIndex]} {work03Data.options[work03Data.answerIndex]}
              </div>
              <div className="answer-section" style={{textAlign: 'left', color: '#1976d2', fontWeight: 700, fontSize: '1rem', margin: '0', padding: '0'}}>
                정답: {['①', '②', '③', '④', '⑤'][work03Data.answerIndex]}
              </div>
            </div>
          </div>
        </div>

        {/* 2페이지: 본문 해석 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%'}}>
                본문 해석
              </div>
              <div className="problem-passage translation" style={{marginTop:'0.9rem', fontSize:'1rem', padding:'1rem', background:'#F1F8E9', borderRadius:'8px', border:'1.5px solid #c8e6c9', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {translatedText || '번역을 생성하는 중...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Work_04용 인쇄 컴포넌트
interface PrintFormatPackage01Work04Props {
  work04Data: BlankQuiz;
  translatedText: string;
  printMode: 'no-answer' | 'with-answer';
}

const PrintFormatPackage01Work04: React.FC<PrintFormatPackage01Work04Props> = ({
  work04Data,
  translatedText,
  printMode
}) => {
  // 인쇄용: 문제만
  if (printMode === 'no-answer') {
    const needsSecondPage = work04Data.blankedText.length >= 2000;
    
    return (
      <div className="only-print">
        {needsSecondPage ? (
          // 2페이지 분할: 문제제목+본문, 객관식
          <>
            {/* 첫 번째 페이지: 문제제목 + 본문 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>문제: 다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#04</span>
              </div>
                  <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'8px', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work04Data.blankedText}
              </div>
                </div>
              </div>
            </div>

            {/* 두 번째 페이지: 객관식만 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>문제: 다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#04</span>
                  </div>
                {work04Data.options.map((option, index) => (
                    <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                    {['①', '②', '③', '④', '⑤'][index]} {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>
        ) : (
          // 1페이지: 모든 내용
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
        </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>문제: 다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#04</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'8px', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                  {work04Data.blankedText}
                </div>
                {work04Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                    {['①', '②', '③', '④', '⑤'][index]} {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 인쇄용: 정답포함
  if (printMode === 'with-answer') {
    return (
      <div className="only-print print-answer-mode">
        {/* 1페이지: 문제 + 정답 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>문제: 다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#04</span>
              </div>
              <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'8px', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work04Data.blankedText}
              </div>
              <div className="option option-print" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                  {['①', '②', '③', '④', '⑤'][work04Data.answerIndex]} {work04Data.options[work04Data.answerIndex]}
              </div>
              <div className="answer-section" style={{textAlign: 'left', color: '#1976d2', fontWeight: 700, fontSize: '1rem', margin: '0', padding: '0'}}>
                정답: {['①', '②', '③', '④', '⑤'][work04Data.answerIndex]}
              </div>
            </div>
          </div>
        </div>

        {/* 2페이지: 본문 해석 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%'}}>
                본문 해석
              </div>
              <div className="problem-passage translation" style={{marginTop:'0.9rem', fontSize:'1rem', padding:'1rem', background:'#F1F8E9', borderRadius:'8px', border:'1.5px solid #c8e6c9', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {translatedText || '번역을 생성하는 중...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Work_05 (빈칸 문장 문제) 인쇄 컴포넌트
interface PrintFormatPackage01Work05Props {
  work05Data: BlankQuiz;
  translatedText: string;
  printMode: 'no-answer' | 'with-answer';
}

const PrintFormatPackage01Work05: React.FC<PrintFormatPackage01Work05Props> = ({ work05Data, translatedText, printMode }) => {
  if (printMode === 'no-answer') {
    const needsSecondPage = work05Data.blankedText.length >= 2000;
    
    return (
      <div className="only-print work-05-print">
        {needsSecondPage ? (
          // 2페이지 분할: 문제제목+본문, 객관식
          <>
            {/* 첫 번째 페이지: 문제제목 + 본문 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>문제: 다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#05</span>
              </div>
                  <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'8px', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work05Data.blankedText}
              </div>
                </div>
              </div>
            </div>

            {/* 두 번째 페이지: 객관식만 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>문제: 다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#05</span>
                  </div>
                {work05Data.options.map((option, index) => (
                    <div key={index} className="option option-print" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                    {['①', '②', '③', '④', '⑤'][index]} {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>
        ) : (
          // 1페이지: 모든 내용
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
        </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>문제: 다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#05</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'8px', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                  {work05Data.blankedText}
                </div>
                {work05Data.options.map((option, index) => (
                  <div key={index} className="option option-print" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                    {['①', '②', '③', '④', '⑤'][index]} {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (printMode === 'with-answer') {
    return (
      <div className="only-print work-05-print">
        {/* 1페이지: 문제 + 정답 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>문제: 다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#05</span>
              </div>
              <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'8px', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work05Data.blankedText}
              </div>
              <div className="problem-options" style={{margin:'1rem 0'}}>
                {work05Data.options.map((option, index) => (
                  <div key={index} style={{margin:'0.8rem 0', fontFamily:'inherit'}}>
                    <div className="option-english" style={{fontSize:'0.9rem', color:'#222', lineHeight:'1.3', margin:'0', padding:'0'}}>
                      {['①', '②', '③', '④', '⑤'][index]} {option}
                      {work05Data.answerIndex === index && (
                        <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                    </div>
                    {work05Data.optionTranslations && work05Data.optionTranslations[index] && (
                      <div className="option-translation" style={{fontSize:'0.8rem', color:'#666', marginTop:'0.2rem', marginLeft:'1rem', fontStyle:'italic', lineHeight:'1.2', padding:'0'}}>
                        {work05Data.optionTranslations[index]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2페이지: 본문 해석 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction work05-print-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginTop:'1.2rem', marginBottom:'0.8rem', display:'block', width:'100%'}}>
                본문 해석
              </div>
              <div className="problem-passage translation work05-print-translation" style={{marginTop:'0.9rem', fontSize:'1rem', padding:'1rem', background:'#F1F8E9', borderRadius:'8px', border:'1.5px solid #c8e6c9', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {translatedText || '번역을 생성하는 중...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Work_06 (문장 위치 찾기) 인쇄용 컴포넌트
const PrintFormatPackage01Work06: React.FC<PrintFormatPackage01Work06Props> = ({
  work06Data,
  translatedText,
  printMode
}) => {
  if (printMode === 'no-answer') {
    return (
      <div className="only-print work-06-print">
        {/* 1페이지: 모든 내용 (항상 1페이지만) */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>문제: 아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#06</span>
              </div>
              <div className="missing-sentence-box" style={{border:'2px solid #222', borderRadius:'6px', background:'#f7f8fc', padding:'0.8em 1.2em', marginTop:'1rem', marginBottom:'1rem', fontWeight:700, fontSize:'0.9rem'}}>
                <span style={{color:'#222'}}>주요 문장:</span> <span style={{color:'#6a5acd'}}>{work06Data.missingSentence}</span>
              </div>
              <div style={{fontSize:'1rem', lineHeight:'1.7', margin:'0.3rem 0', background:'#FFF3CD', border:'1.5px solid #e3e6f0', borderRadius:'8px', padding:'1rem', fontFamily:'inherit', color:'#222', whiteSpace:'pre-line'}}>
                {work06Data.numberedPassage}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (printMode === 'with-answer') {
    return (
      <div className="only-print work-06-print">
        {/* 1페이지: 문제 + 정답 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>문제: 아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#06</span>
              </div>
              <div className="missing-sentence-box" style={{border:'2px solid #222', borderRadius:'6px', background:'#f7f8fc', padding:'0.8em 1.2em', marginTop:'1rem', marginBottom:'1rem', fontWeight:700, fontSize:'0.9rem'}}>
                <span style={{color:'#222'}}>주요 문장:</span> <span style={{color:'#6a5acd'}}>{work06Data.missingSentence}</span>
              </div>
              <div style={{fontSize:'1rem', lineHeight:'1.7', margin:'0.3rem 0', background:'#FFF3CD', border:'1.5px solid #e3e6f0', borderRadius:'8px', padding:'1rem', fontFamily:'inherit', color:'#222', whiteSpace:'pre-line'}}>
                {work06Data.numberedPassage}
              </div>
              <div className="problem-answer" style={{marginTop:'1.2rem', color:'#1976d2', fontWeight:700, fontSize:'0.9rem'}}>
                정답: {`①②③④⑤`[work06Data.answerIndex] || work06Data.answerIndex + 1}
              </div>
            </div>
          </div>
        </div>

        {/* 2페이지: 본문 해석 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%'}}>
                본문 해석
              </div>
              <div className="problem-passage translation" style={{marginTop:'0.9rem', fontSize:'1rem', padding:'1rem', background:'#F1F8E9', borderRadius:'8px', border:'1.5px solid #c8e6c9', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {translatedText || '번역을 생성하는 중...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Work_07 인쇄용 컴포넌트
const PrintFormatPackage01Work07: React.FC<PrintFormatPackage01Work07Props> = ({
  work07Data,
  translatedText,
  printMode
}) => {
  console.log('🖨️ PrintFormatPackage01Work07 렌더링:', {
    printMode,
    hasWork07Data: !!work07Data,
    hasTranslatedText: !!translatedText,
    work07DataKeys: work07Data ? Object.keys(work07Data) : null,
    work07DataContent: work07Data ? {
      passage: work07Data.passage?.substring(0, 100) + '...',
      optionsCount: work07Data.options?.length,
      answerIndex: work07Data.answerIndex
    } : null
  });

  if (!work07Data) {
    console.error('❌ work07Data가 없습니다!');
    return <div>Work_07 데이터가 없습니다.</div>;
  }

  if (!work07Data.passage) {
    console.error('❌ work07Data.passage가 없습니다!');
    return <div>Work_07 passage가 없습니다.</div>;
  }

  if (!work07Data.options || work07Data.options.length === 0) {
    console.error('❌ work07Data.options가 없습니다!');
    return <div>Work_07 options가 없습니다.</div>;
  }

  // 인쇄용 문제 (정답 없음)
  if (printMode === 'no-answer') {
    const needsSecondPage = work07Data.passage.length >= 2000;
    
    return (
      <div className="only-print work-07-print">
        {needsSecondPage ? (
          // 2페이지 분할: 문제제목+본문, 객관식
          <>
            {/* 첫 번째 페이지: 문제제목 + 본문 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>문제: 다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
              </div>
                  <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem'}}>
                {work07Data.passage}
              </div>
                </div>
              </div>
            </div>

            {/* 두 번째 페이지: 객관식만 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>문제: 다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요.</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
                  </div>
                {work07Data.options.map((option, index) => (
                    <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                    {String.fromCharCode(65 + index)}. {option}
                </div>
                ))}
              </div>
            </div>
          </div>
          </>
        ) : (
          // 1페이지: 모든 내용
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
        </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>문제: 다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem'}}>
                  {work07Data.passage}
                </div>
                {work07Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                    {String.fromCharCode(65 + index)}. {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 인쇄용 문제 (정답 포함) - 본문해석 포함
  if (printMode === 'with-answer') {
    // 2페이지 분할 여부 결정: 본문 + 객관식 + 해석의 총 길이가 길어서 한 페이지에 넣을 수 없을 때 분할
    const getContentLength = () => {
      const passageLength = work07Data.passage ? work07Data.passage.length : 0;
      const optionsLength = work07Data.options ? work07Data.options.reduce((total, option) => total + option.length, 0) : 0;
      const translationLength = translatedText ? translatedText.length : 0;
      return passageLength + optionsLength + translationLength;
    };

    const needsSecondPage = getContentLength() >= 4000;

    if (needsSecondPage) {
      // 2페이지 구성: 1페이지(문제+정답), 2페이지(해석)
      return (
        <div className="only-print work-07-print">
          {/* 1페이지: 문제 + 정답 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.5rem 0.4rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.3rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>문제: 다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.6rem', fontSize:'0.9rem'}}>
                  {work07Data.passage}
                </div>
                {work07Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.3rem', paddingLeft:'0.4rem', paddingRight:'0.4rem'}}>
                    {String.fromCharCode(65 + index)}. {option}{index === work07Data.answerIndex ? ' (정답)' : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2페이지: 본문 해석 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight: '800', fontSize: '1rem', background: '#222', color: '#fff', padding: '0.7rem 0.5rem', borderRadius: '8px', marginBottom: '1.2rem', marginTop: '0.5rem', display: 'block', width:'100%'}}>
                  본문 해석
                </div>
                <div className="translation-content" style={{fontSize:'0.9rem', lineHeight:'1.6', padding:'1rem', border:'1px solid #ddd', borderRadius:'8px', backgroundColor:'#f1f8e9', marginTop:'1.5rem'}}>
                  {translatedText}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // 1페이지: 모든 내용 포함
      return (
        <div className="only-print work-07-print">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.5rem 0.4rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.3rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>문제: 다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.6rem', fontSize:'0.9rem'}}>
                  {work07Data.passage}
                </div>
                  {work07Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.3rem', paddingLeft:'0.4rem', paddingRight:'0.4rem'}}>
                      {String.fromCharCode(65 + index)}. {option}{index === work07Data.answerIndex ? ' (정답)' : ''}
                    </div>
                  ))}
                <div className="translation-section" style={{marginTop:'0.8rem'}}>
                  <div className="problem-instruction" style={{fontWeight: '800', fontSize: '0.9rem', background: '#222', color: '#fff', padding: '0.5rem 0.4rem', borderRadius: '8px', marginBottom: '0.6rem', display: 'block', width:'100%'}}>
                    본문 해석
                  </div>
                  <div className="translation-content" style={{fontSize:'0.9rem', lineHeight:'1.5', padding:'0.8rem', border:'1px solid #ddd', borderRadius:'8px', backgroundColor:'#F1F8E9'}}>
                    {translatedText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
};

// Work_08 인쇄용 컴포넌트
const PrintFormatPackage01Work08: React.FC<PrintFormatPackage01Work08Props> = ({
  work08Data,
  translatedText,
  printMode
}) => {
  console.log('🖨️ PrintFormatPackage01Work08 렌더링:', {
    printMode,
    hasWork08Data: !!work08Data,
    hasTranslatedText: !!translatedText,
    work08DataKeys: work08Data ? Object.keys(work08Data) : null,
    work08DataContent: work08Data ? {
      passage: work08Data.passage?.substring(0, 100) + '...',
      optionsCount: work08Data.options?.length,
      answerIndex: work08Data.answerIndex
    } : null
  });

  if (!work08Data) {
    console.error('❌ work08Data가 없습니다!');
    return <div>Work_08 데이터가 없습니다.</div>;
  }

  if (!work08Data.passage) {
    console.error('❌ work08Data.passage가 없습니다!');
    return <div>Work_08 passage가 없습니다.</div>;
  }

  if (!work08Data.options || work08Data.options.length === 0) {
    console.error('❌ work08Data.options가 없습니다!');
    return <div>Work_08 options가 없습니다.</div>;
  }

  // 인쇄용 문제 (정답 없음)
  if (printMode === 'no-answer') {
    const needsSecondPage = work08Data.passage.length >= 2000;
    
    return (
      <div className="only-print work-08-print">
        {needsSecondPage ? (
          // 2페이지 분할: 문제제목+본문, 객관식
          <>
            {/* 첫 번째 페이지: 문제제목 + 본문 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>문제: 다음 본문에 가장 적합한 제목을 고르세요.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#08</span>
              </div>
                  <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem'}}>
                {work08Data.passage}
              </div>
                </div>
              </div>
            </div>

            {/* 두 번째 페이지: 객관식만 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>문제: 다음 본문에 가장 적합한 제목을 고르세요.</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#08</span>
                  </div>
                {work08Data.options.map((option, index) => (
                    <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                    {String.fromCharCode(65 + index)}. {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>
        ) : (
          // 1페이지: 모든 내용
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
        </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>문제: 다음 본문에 가장 적합한 제목을 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#08</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem'}}>
                  {work08Data.passage}
                </div>
                {work08Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                    {String.fromCharCode(65 + index)}. {option}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 인쇄용 문제 (정답 포함) - 본문해석 포함
  if (printMode === 'with-answer') {
    // 2페이지 분할 여부 결정: 본문 + 정답 + 해석의 총 길이가 2000자 이상이면 분할
    const getContentLength = () => {
      const passageLength = work08Data.passage ? work08Data.passage.length : 0;
      const optionsLength = work08Data.options ? work08Data.options.reduce((total, option) => total + option.length, 0) : 0;
      const translationLength = translatedText ? translatedText.length : 0;
      return passageLength + optionsLength + translationLength;
    };

    const needsSecondPage = getContentLength() >= 2000;

    if (needsSecondPage) {
      // 2페이지 구성: 1페이지(문제+정답), 2페이지(해석)
      return (
        <div className="only-print work-08-print">
          {/* 1페이지: 문제 + 정답 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>문제: 다음 본문에 가장 적합한 제목을 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#08</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem'}}>
                  {work08Data.passage}
                </div>
                {work08Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                    {String.fromCharCode(65 + index)}. {option}
                  </div>
                ))}
                <div className="answer-section" style={{textAlign: 'left', color: '#1976d2', fontWeight: 700, fontSize: '1rem', margin: '1rem 0', padding: '0'}}>
                  정답: {String.fromCharCode(65 + work08Data.answerIndex)}. {work08Data.options[work08Data.answerIndex]}
                </div>
              </div>
            </div>
          </div>

          {/* 2페이지: 본문 해석 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight: '800', fontSize: '1rem', background: '#222', color: '#fff', padding: '0.7rem 0.5rem', borderRadius: '8px', marginBottom: '1.2rem', marginTop: '0.5rem', display: 'block', width:'100%'}}>
                  본문 해석
                </div>
                <div className="translation-content" style={{fontSize:'0.9rem', lineHeight:'1.6', padding:'1rem', border:'1px solid #ddd', borderRadius:'8px', backgroundColor:'#f1f8e9', marginTop:'1.5rem'}}>
                  {translatedText}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // 1페이지: 모든 내용 포함
      return (
        <div className="only-print work-08-print">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>문제: 다음 본문에 가장 적합한 제목을 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#08</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.9rem'}}>
                  {work08Data.passage}
                </div>
                {work08Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem'}}>
                    {String.fromCharCode(65 + index)}. {option}
                  </div>
                ))}
                <div className="answer-section" style={{textAlign: 'left', color: '#1976d2', fontWeight: 700, fontSize: '1rem', margin: '1rem 0', padding: '0'}}>
                  정답: {String.fromCharCode(65 + work08Data.answerIndex)}. {work08Data.options[work08Data.answerIndex]}
                </div>
                <div className="translation-section" style={{marginTop:'1.5rem'}}>
                  <div className="problem-instruction" style={{fontWeight: '800', fontSize: '1rem', background: '#222', color: '#fff', padding: '0.7rem 0.5rem', borderRadius: '8px', marginBottom: '1.2rem', display: 'block', width:'100%'}}>
                    본문 해석
                  </div>
                  <div className="translation-content" style={{fontSize:'0.9rem', lineHeight:'1.6', padding:'1rem', border:'1px solid #ddd', borderRadius:'8px', backgroundColor:'#F1F8E9'}}>
                    {translatedText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
};

// Work_09 (어법 변형 문제) 인쇄용 컴포넌트
const PrintFormatPackage01Work09: React.FC<PrintFormatPackage01Work09Props> = ({
  work09Data,
  translatedText,
  printMode
}) => {
  console.log('🖨️ PrintFormatPackage01Work09 렌더링:', {
    hasWork09Data: !!work09Data,
    printMode,
    work09Data: work09Data,
    translatedText: translatedText
  });

  if (!work09Data) {
    console.error('❌ Work_09 데이터가 없습니다:', { work09Data });
    return null;
  }

  if (!work09Data.passage) {
    console.error('❌ Work_09 passage가 없습니다:', { work09Data });
    return null;
  }

  if (!work09Data.options) {
    console.error('❌ Work_09 options가 없습니다:', { work09Data });
    return null;
  }

  const convertMarkdownUnderlineToU = (text: string): string => {
    return text.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
  };

  const answerNumber = `①②③④⑤`[work09Data.answerIndex] || `${work09Data.answerIndex + 1}`;

  // 유형#09는 항상 2페이지 구성으로 강제 (문제+정답, 해석)
  const needsSecondPage = true;

  if (printMode === 'no-answer') {
    const needsSecondPage = work09Data.passage.length >= 2000;
    
    return (
      <div className="only-print work-09-print">
        {needsSecondPage ? (
          // 2페이지 분할: 문제제목+본문, 객관식
          <>
            {/* 첫 번째 페이지: 문제제목 + 본문 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#09</span>
              </div>
                  <div style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(work09Data.passage).replace(/\n/g, '<br/>')}} />
              </div>
                </div>
              </div>
            </div>

            {/* 두 번째 페이지: 객관식 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#09</span>
                  </div>
                {work09Data.options.map((opt, i) => (
                    <div key={i} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem', fontFamily:'inherit', color:'#222'}}>
                    {`①②③④⑤`[i] || `${i+1}.`} {opt}
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>
        ) : (
          // 1페이지: 모든 내용
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
        </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#09</span>
                </div>
                <div style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                  <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(work09Data.passage).replace(/\n/g, '<br/>')}} />
                </div>
                {work09Data.options.map((opt, i) => (
                  <div key={i} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem', fontFamily:'inherit', color:'#222'}}>
                    {`①②③④⑤`[i] || `${i+1}.`} {opt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (printMode === 'with-answer') {
    if (needsSecondPage) {
      // 2페이지 구성: 문제+정답, 본문해석
      return (
        <div className="only-print work-09-print">
          {/* 1페이지: 문제 + 정답 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#09</span>
                </div>
                <div style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                  <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(work09Data.passage).replace(/\n/g, '<br/>')}} />
                </div>
                  {work09Data.options.map((opt, i) => (
                  <div key={i} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.6rem', paddingRight:'0.6rem', fontFamily:'inherit', color:'#222'}}>
                      {`①②③④⑤`[i] || `${i+1}.`} {opt}
                      {work09Data.answerIndex === i && (
                        <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                    </div>
                  ))}
                <div className="problem-answer" style={{marginTop:'1.2rem', color:'#1976d2', fontWeight:700, fontSize:'0.9rem'}}>
                  정답: {answerNumber} {work09Data.options[work09Data.answerIndex]} (정상 단어/구: {work09Data.original})
              </div>
            </div>
          </div>
        </div>

        {/* 2페이지: 본문 해석 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%'}}>
                본문 해석
              </div>
              <div className="problem-passage translation" style={{marginTop:'0.9rem', fontSize:'1rem', padding:'1rem', background:'#F1F8E9', borderRadius:'8px', border:'1.5px solid #c8e6c9', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {translatedText || '번역을 생성하는 중...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
    }
  }

  return null;
};

// Work_10 다중 어법 오류 문제 인쇄 컴포넌트
const PrintFormatPackage01Work10: React.FC<PrintFormatPackage01Work10Props> = ({
  work10Data,
  translatedText,
  printMode
}) => {
  const convertMarkdownUnderlineToU = (text: string): string => {
    return text.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
  };

  const getContentLength = (): number => {
    const passageLength = work10Data.passage.length;
    const translationLength = translatedText.length;
    return passageLength + translationLength;
  };

  const needsSecondPage = getContentLength() > 2000;

  if (printMode === 'no-answer') {
    const needsSecondPage = work10Data.passage.length >= 2000;
    
    return (
      <div className="only-print work-10-print">
        {needsSecondPage ? (
          // 2페이지 분할: 문제제목+본문, 객관식
          <>
            {/* 첫 번째 페이지: 문제제목 + 본문 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
        <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#10</span>
                  </div>
                  <div style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                    <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(work10Data.passage).replace(/\n/g, '<br/>')}} />
                  </div>
                </div>
              </div>
          </div>

            {/* 두 번째 페이지: 객관식 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#10</span>
                  </div>
                  <div style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                    <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(work10Data.passage).replace(/\n/g, '<br/>')}} />
                  </div>
                  {work10Data.options.map((option, index) => (
                    <div key={index} className="option" style={{
                      fontSize: '1rem',
                      marginTop: '0.5rem',
                      paddingLeft: '0.6rem',
                      paddingRight: '0.6rem',
            fontFamily: 'inherit',
                      color: '#222'
                    }}>
                      {`①②③④⑤`[index] || `${index + 1}`} {option}개
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          // 1페이지: 모든 내용
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#10</span>
                </div>
                <div style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
            <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(work10Data.passage).replace(/\n/g, '<br/>')}} />
          </div>
            {work10Data.options.map((option, index) => (
                  <div key={index} className="option" style={{
                    fontSize: '1rem',
                    marginTop: '0.5rem',
                    paddingLeft: '0.6rem',
                    paddingRight: '0.6rem',
                    fontFamily: 'inherit',
                    color: '#222'
                  }}>
                    {`①②③④⑤`[index] || `${index + 1}`} {option}개
              </div>
            ))}
          </div>
        </div>
          </div>
        )}
      </div>
    );
  } else {
    // with-answer 모드 - 항상 2페이지 구성으로 강제
    const needsSecondPage = true;
    
    if (needsSecondPage) {
      return (
        <div className="only-print work-10-print">
          {/* 첫 번째 페이지: 문제 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
            <PrintHeaderPackage01 />
              </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#10</span>
                </div>
                <div style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#FFF3CD', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(work10Data.passage).replace(/\n/g, '<br/>')}} />
              </div>
                {work10Data.options.map((option, index) => (
                  <div key={index} className="option" style={{
                    fontSize: '1rem',
                    marginTop: '0.5rem',
                    paddingLeft: '0.6rem',
                    paddingRight: '0.6rem',
                    fontFamily: 'inherit',
                    color: '#222'
                  }}>
                    {`①②③④⑤`[index] || `${index + 1}`} {option}개
                  </div>
                ))}
                <div className="problem-answer" style={{marginTop:'1.2rem', color:'#1976d2', fontWeight:700, fontSize:'0.9rem'}}>
                  정답: {`①②③④⑤`[work10Data.answerIndex] || `${work10Data.answerIndex + 1}`} {work10Data.options[work10Data.answerIndex]} (어법상 틀린 단어: {work10Data.wrongIndexes.map(index => 
                    `${'①②③④⑤⑥⑦⑧'[index]}${work10Data.transformedWords[index]} → ${work10Data.originalWords[index]}`
                  ).join(', ')})
                </div>
              </div>
            </div>
          </div>

          {/* 두 번째 페이지: 번역 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
            <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="translation-section" style={{marginTop:'0.5rem', pageBreakBefore:'auto', pageBreakInside:'avoid'}}>
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%'}}>
                본문 해석
              </div>
                  <div className="problem-passage translation" style={{marginTop:'0.9rem', fontSize:'0.9rem', padding:'1rem', background:'#F1F8E9', borderRadius:'8px', border:'1.5px solid #c8e6c9', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {translatedText || '번역을 생성하는 중...'}
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
      );
    }
  }
  
  return null;
};

// Work_11 문장 번역 문제 인쇄 컴포넌트 - 새로운 동적 페이지네이션 사용
const PrintFormatPackage01Work11: React.FC<{
  work11Data: SentenceTranslationQuiz;
  printMode: 'no-answer' | 'with-answer';
}> = ({ work11Data, printMode }) => {
  if (!work11Data) return null;

  return (
    <div className="only-print work-11-print">
      <Work11DynamicPrintPages
        sentences={work11Data.sentences}
        translations={work11Data.translations}
        includeAnswer={printMode === 'with-answer'}
        printMode={printMode}
        customHeader={<PrintHeaderPackage01 />}
      />
    </div>
  );
};

// Work_13 빈칸 채우기 문제 (단어-주관식) 인쇄 컴포넌트
const PrintFormatPackage01Work13: React.FC<{
  work13Data: BlankFillItem;
  printMode: 'no-answer' | 'with-answer';
}> = ({ work13Data, printMode }) => {
  if (!work13Data) return null;

  // 본문이 긴 경우 2페이지로 분할하는 로직
  const needsSecondPage = work13Data.blankedText && work13Data.blankedText.length >= 2000;

  if (printMode === 'no-answer') {
    // 문제만 인쇄
    return (
      <div className="only-print work-13-print">
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{
                fontWeight: 800, 
                fontSize: '0.9rem', 
                background: '#222', 
                color: '#fff', 
                padding: '0.7rem 0.5rem', 
                borderRadius: '8px', 
                marginBottom: '1.2rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                width: '100%'
              }}>
                <span>다음 빈칸에 들어갈 단어를 직접 입력하시오.</span>
                <span style={{fontSize: '0.9rem', fontWeight: '700', color: '#FFD700'}}>유형#13</span>
              </div>
              <div className="package01-work13-problem-text" style={{
                marginTop: '0.9rem', 
                fontSize: '1rem !important', 
                padding: '1rem', 
                borderRadius: '8px', 
                fontFamily: 'inherit', 
                color: '#222', 
                lineHeight: '1.7', 
                border: '2px solid #e3e6f0'
              }}>
                {work13Data.blankedText}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (printMode === 'with-answer') {
    // 정답 포함 인쇄
    return (
      <div className="only-print work-13-print">
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{
                fontWeight: 800, 
                fontSize: '0.9rem', 
                background: '#222', 
                color: '#fff', 
                padding: '0.7rem 0.5rem', 
                borderRadius: '8px', 
                marginBottom: '1.2rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                width: '100%'
              }}>
                <span>다음 빈칸에 들어갈 단어를 직접 입력하시오.</span>
                <span style={{fontSize: '0.9rem', fontWeight: '700', color: '#FFD700'}}>유형#13</span>
              </div>
              <div className="package01-work13-answer-text" style={{
                marginTop: '0.9rem', 
                marginBottom: '1.5rem',
                fontSize: '1rem !important', 
                padding: '1rem', 
                borderRadius: '8px', 
                fontFamily: 'inherit', 
                color: '#222', 
                lineHeight: '1.7', 
                border: '2px solid #e3e6f0'
              }}>
                {(() => {
                  const text = work13Data.blankedText;
                  const parts = text.split(/(\(_{15}\))/);
                  let answerIndex = 0;
                  return parts.map((part, index) => {
                    if (part === '(_______________)') {
                      const answer = work13Data.correctAnswers?.[answerIndex] || '정답 없음';
                      answerIndex++;
                      return (
                        <span key={index} style={{color: '#1976d2', fontWeight: 'bold'}}>
                          ({answer})
                        </span>
                      );
                    }
                    return part;
                  });
                })()}
              </div>
              <div className="problem-instruction" style={{
                fontWeight: 800, 
                fontSize: '0.9rem', 
                background: '#222', 
                color: '#fff', 
                padding: '0.7rem 0.5rem', 
                borderRadius: '8px', 
                marginTop: '2.5rem', 
                marginBottom: '1rem', 
                display: 'block', 
                width: '100%'
              }}>
                본문 해석
              </div>
              <div className="package01-work13-translation" style={{
                fontSize: '1rem !important', 
                padding: '1rem', 
                borderRadius: '8px', 
                fontFamily: 'inherit', 
                color: '#222', 
                lineHeight: '1.7', 
                border: '2px solid #e3e6f0', 
                marginTop: '1rem'
              }}>
                {work13Data.translation}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Work_14 빈칸 채우기 문제 (문장-주관식) 인쇄 컴포넌트
const PrintFormatPackage01Work14: React.FC<{
  work14Data: BlankQuiz;
  printMode: 'no-answer' | 'with-answer';
}> = ({ work14Data, printMode }) => {
  if (!work14Data) return null;

  // 정답을 포함한 텍스트 생성 함수 (HTML 스타일 적용)
  const createTextWithAnswers = (blankedText: string, correctAnswers: string[]): string => {
    let result = blankedText;
    let answerIndex = 0;
    
    // A, B, C 형태의 빈칸 패턴을 찾아서 정답으로 교체 (파란색, 진하게 스타일 적용)
    result = result.replace(/\(_{20,}[A-Z]_{20,}\)/g, () => {
      if (answerIndex < correctAnswers.length) {
        const answer = correctAnswers[answerIndex++];
        return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
      }
      return '(____________________A____________________)';
    });
    
    return result;
  };

  if (printMode === 'no-answer') {
    // 문제만 인쇄
    return (
      <div className="only-print work-14-print">
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{
                fontWeight: 800, 
                fontSize: '0.9rem', 
                background: '#222', 
                color: '#fff', 
                padding: '0.7rem 0.5rem', 
                borderRadius: '8px', 
                marginBottom: '1.2rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                width: '100%'
              }}>
                <span>다음 빈칸에 들어갈 문장을 직접 입력하시오.</span>
                <span style={{fontSize: '0.9rem', fontWeight: '700', color: '#FFD700'}}>유형#14</span>
              </div>
              <div className="package01-work14-problem-text" style={{
                marginTop: '0.9rem', 
                fontSize: '1rem !important', 
                padding: '1rem', 
                borderRadius: '8px', 
                fontFamily: 'inherit', 
                color: '#222', 
                lineHeight: '1.7', 
                border: '2px solid #e3e6f0'
              }}>
                {work14Data.blankedText}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (printMode === 'with-answer') {
    // 정답 포함 인쇄
    return (
      <div className="only-print work-14-print">
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{
                fontWeight: 800, 
                fontSize: '0.9rem', 
                background: '#222', 
                color: '#fff', 
                padding: '0.7rem 0.5rem', 
                borderRadius: '8px', 
                marginBottom: '1.2rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                width: '100%'
              }}>
                <span>다음 빈칸에 들어갈 문장을 직접 입력하시오.</span>
                <span style={{fontSize: '0.9rem', fontWeight: '700', color: '#FFD700'}}>유형#14</span>
              </div>
              <div className="package01-work14-answer-text" style={{
                marginTop: '0.9rem', 
                marginBottom: '1.5rem',
                fontSize: '1rem !important', 
                padding: '1rem', 
                borderRadius: '8px', 
                fontFamily: 'inherit', 
                color: '#222', 
                lineHeight: '1.7', 
                border: '2px solid #e3e6f0'
              }}
              dangerouslySetInnerHTML={{
                __html: work14Data.correctAnswers ? 
                  createTextWithAnswers(work14Data.blankedText, work14Data.correctAnswers) : 
                  work14Data.selectedSentences ? 
                    createTextWithAnswers(work14Data.blankedText, work14Data.selectedSentences) : 
                    work14Data.blankedText
              }}
              />
              <div className="problem-instruction" style={{
                fontWeight: 800, 
                fontSize: '0.9rem', 
                background: '#222', 
                color: '#fff', 
                padding: '0.7rem 0.5rem', 
                borderRadius: '8px', 
                marginTop: '1.5rem', 
                marginBottom: '1rem', 
                display: 'block', 
                width: '100%'
              }}>
                본문 해석
              </div>
              <div className="package01-work14-translation" style={{
                fontSize: '1rem !important', 
                padding: '1rem', 
                borderRadius: '8px', 
                fontFamily: 'inherit', 
                color: '#222', 
                lineHeight: '1.7', 
                border: '2px solid #e3e6f0', 
                marginTop: '1rem'
              }}>
                {work14Data.translation}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PrintFormatPackage01;
export { PrintFormatPackage01Work02, PrintFormatPackage01Work03, PrintFormatPackage01Work04, PrintFormatPackage01Work05, PrintFormatPackage01Work06, PrintFormatPackage01Work07, PrintFormatPackage01Work08, PrintFormatPackage01Work09, PrintFormatPackage01Work10, PrintFormatPackage01Work11, PrintFormatPackage01Work13, PrintFormatPackage01Work14 };
