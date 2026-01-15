import React from 'react';
import PrintHeaderPackage01 from './PrintHeaderPackage01';
import { SentenceTranslationQuiz } from '../../../types/types';
import { Quiz } from '../../../types/types';
import { Work02QuizData } from '../../../services/work02Service';
import Work11DynamicPrintPages from '../Work_11_SentenceTranslation/Work11DynamicPrintPages';
import { formatBlankedText } from '../Package_02_TwoStepQuiz/printNormalization';

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
  quiz?: Quiz;
  translatedText?: string;
  printMode?: 'no-answer' | 'with-answer';
  packageQuiz?: any[];
  isAnswerMode?: boolean;
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
  printMode,
  packageQuiz,
  isAnswerMode
}) => {
  // packageQuiz가 있으면 Package#01 문제생성목록에서 불러온 데이터 처리
  if (packageQuiz && packageQuiz.length > 0) {
    console.log('🔍 Package#01 문제생성목록 데이터 처리:', {
      packageQuizLength: packageQuiz.length,
      isAnswerMode: isAnswerMode,
      packageQuiz: packageQuiz
    });
    
    // Package#01의 packageQuiz 데이터를 직접 렌더링 (재귀 호출 방지)
    return (
      <div 
        id={isAnswerMode ? "print-root-package01-answer" : "print-root-package01"}
        className="print-container"
      >
        {packageQuiz.map((quizItem, index) => {
          // 각 Work 유형별 렌더링 로직
          // Package#01의 경우 각 유형별로 workXXData 필드에 데이터가 저장됨
          // 유형#01만 quiz 필드 사용, 나머지는 workXXData 필드 사용
          // Firebase에서 불러온 데이터는 data 필드로 저장될 수 있으므로 확인 필요
          const normalizedWorkTypeId = quizItem.workTypeId?.toString().padStart(2, '0') || '';
          
          // data 필드가 있으면 workTypeId에 따라 적절한 필드명으로 변환
          if (quizItem.data && !quizItem.quiz && !quizItem[`work${normalizedWorkTypeId}Data`]) {
            if (normalizedWorkTypeId === '01') {
              quizItem.quiz = quizItem.data;
            } else {
              quizItem[`work${normalizedWorkTypeId}Data`] = quizItem.data;
            }
          }
          
          const quizData = quizItem.quiz || 
                          quizItem.work02Data || 
                          quizItem.work03Data || 
                          quizItem.work04Data || 
                          quizItem.work05Data || 
                          quizItem.work06Data || 
                          quizItem.work07Data || 
                          quizItem.work08Data || 
                          quizItem.work09Data || 
                          quizItem.work10Data || 
                          quizItem.work11Data || 
                          quizItem.work13Data || 
                          quizItem.work14Data ||
                          quizItem.data;
          
          // translatedText를 여러 소스에서 찾기 (보강)
          // 다양한 저장 키를 폭넓게 지원
  const computedTranslatedText =
                                (translatedText as any) ||
                                quizItem.translatedText ||
                                quizData?.translatedText ||
                                quizData?.translation ||
                                (quizData as any)?.koreanTranslation ||
                                (quizData as any)?.korean ||
                                (quizData as any)?.koreanText ||
                                (quizData as any)?.korTranslation ||
                                (quizData as any)?.koText ||
                                (quizData as any)?.korean_text ||
                                (quizData as any)?.passageTranslation ||
                                (quizData as any)?.korean_passage ||
                                quizItem.data?.translation || 
                                (quizItem.data as any)?.koreanTranslation ||
                                (quizItem.data as any)?.korean ||
                                (quizItem.data as any)?.koreanText ||
                                (quizItem.data as any)?.korTranslation ||
                                (quizItem.data as any)?.koText ||
                                (quizItem.data as any)?.korean_text ||
                                (quizItem.data as any)?.passageTranslation ||
                                (quizItem.data as any)?.korean_passage ||
                                '';
          
          console.log(`🔍 Package#01 아이템 ${index} 전체 구조:`, {
            quizItem: quizItem,
            workTypeId: quizItem.workTypeId,
            normalizedWorkTypeId: normalizedWorkTypeId,
            hasQuiz: !!quizItem.quiz,
            hasWork02Data: !!quizItem.work02Data,
            hasWork03Data: !!quizItem.work03Data,
            hasWork04Data: !!quizItem.work04Data,
            hasWork05Data: !!quizItem.work05Data,
            hasWork06Data: !!quizItem.work06Data,
            hasWork07Data: !!quizItem.work07Data,
            hasWork08Data: !!quizItem.work08Data,
            hasWork09Data: !!quizItem.work09Data,
            hasWork10Data: !!quizItem.work10Data,
            hasWork11Data: !!quizItem.work11Data,
            hasWork13Data: !!quizItem.work13Data,
            hasWork14Data: !!quizItem.work14Data,
            hasData: !!quizItem.data,
            dataKeys: quizItem.data ? Object.keys(quizItem.data) : [],
            allKeys: Object.keys(quizItem),
            translatedText: quizItem.translatedText,
            hasTranslatedText: !!quizItem.translatedText,
            quizDataTranslatedText: quizData?.translatedText,
            hasQuizDataTranslatedText: !!quizData?.translatedText,
            quizDataTranslation: quizData?.translation,
            hasQuizDataTranslation: !!quizData?.translation,
            dataTranslation: quizItem.data?.translation,
            hasDataTranslation: !!quizItem.data?.translation,
            finalTranslatedText: translatedText,
            hasFinalTranslatedText: !!translatedText,
            hasQuizData: !!quizData
          });
          
          if ((normalizedWorkTypeId === '01' || quizItem.workTypeId === '1' || quizItem.workTypeId === 1) && (quizItem.quiz || quizItem.data)) {
            // Work_01: 직접 렌더링 (재귀 호출 방지)
            const quiz01 = quizData;
            
            console.log('🔍 Work_01 렌더링 데이터 확인:', {
              quiz01: quiz01,
              hasShuffledParagraphs: !!quiz01.shuffledParagraphs,
              shuffledParagraphsLength: quiz01.shuffledParagraphs?.length || 0,
              shuffledParagraphs: quiz01.shuffledParagraphs,
              shuffledParagraphsLabels: quiz01.shuffledParagraphs?.map((p: any) => p.label) || [],
              hasChoices: !!quiz01.choices,
              choicesLength: quiz01.choices?.length || 0,
              choices: quiz01.choices,
              answerIndex: quiz01.answerIndex,
              isAnswerMode: isAnswerMode
            });
            
            // A 단락이 있는지 확인
            const hasParagraphA = quiz01.shuffledParagraphs?.some((p: any) => p.label === 'A');
            if (!hasParagraphA && quiz01.shuffledParagraphs && quiz01.shuffledParagraphs.length > 0) {
              console.warn('⚠️ Work_01: A 단락이 없습니다!', {
                availableLabels: quiz01.shuffledParagraphs.map((p: any) => p.label),
                totalCount: quiz01.shuffledParagraphs.length
              });
            }
            
            // 모의고사 형식 확인
            const isExamFormat = quiz01.format === 'exam';
            const instruction = isExamFormat 
              ? (quiz01.instruction || '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.')
              : '다음 단락들을 원래 순서대로 배열한 것을 고르세요.';
            const choiceSeparator = isExamFormat ? ' - ' : ' → ';
            
            return (
              <div key={`work-01-${index}`} className="only-print">
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderPackage01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="problem-instruction" data-work-type="01" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                      <span style={{fontWeight:'bold'}}>{instruction}</span>
                      <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#01</span>
                    </div>
                    
                    {/* 모의고사 형식: 고정된 첫 번째 단락을 박스 안에 표시 */}
                    {isExamFormat && quiz01.fixedParagraph && (
                      <div className="fixed-paragraph-box" style={{
                        border: '1px solid #000',
                        borderRadius: '8px',
                        padding: '0.6rem 1rem',
                        marginTop: '0',
                        marginBottom: '1.5rem',
                        backgroundColor: '#fff',
                        fontSize: '1rem',
                        lineHeight: '1.6',
                        color: '#333'
                      }}>
                        {quiz01.fixedParagraph}
                      </div>
                    )}
                    
                    {/* 나머지 3개 단락 - 모의고사 형식 */}
                    {quiz01.shuffledParagraphs && quiz01.shuffledParagraphs.length > 0 ? (
                      quiz01.shuffledParagraphs.map((paragraph: any, pIndex: number) => {
                        return (
                          <div key={`para-${pIndex}`} className="shuffled-paragraph" style={{marginTop:'0.1rem', fontSize:'0.9rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.4'}}>
                            <strong>({paragraph.label}) </strong>{paragraph.content}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{padding:'1rem', background:'#ffffff', borderRadius:'0', border:'1px solid #ffc107', color:'#856404'}}>
                        ⚠️ 영어본문 데이터가 없습니다.
                      </div>
                    )}
                    
                    {/* 4지선다 선택지 - 모의고사 형식 */}
                    {quiz01.choices && quiz01.choices.length > 0 ? (
                      <>
                        {quiz01.choices.map((choice: any, cIndex: number) => {
                          return (
                            <div key={`choice-${cIndex}`} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                              {['①', '②', '③', '④'][cIndex]} {Array.isArray(choice) ? choice.join(choiceSeparator) : choice}
                              {isAnswerMode && quiz01.answerIndex === cIndex && (
                                <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                              )}
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <div style={{marginTop:'1rem', padding:'1rem', background:'#ffffff', borderRadius:'0', border:'1px solid #ffc107', color:'#856404'}}>
                        ⚠️ 4지선다 선택지 데이터가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          } else if ((normalizedWorkTypeId === '02' || quizItem.workTypeId === '2' || quizItem.workTypeId === 2) && (quizItem.work02Data || quizItem.data)) {
              return (
                <div key={`work-02-wrapper-${index}`} data-work-type="02">
                  <PrintFormatPackage01Work02 
                    work02Data={quizItem.work02Data || quizItem.data}
                    translatedText={computedTranslatedText || ''}
                    printMode={isAnswerMode ? 'with-answer' : 'no-answer'}
                  />
                </div>
              );
            } else if ((normalizedWorkTypeId === '03' || quizItem.workTypeId === '3' || quizItem.workTypeId === 3) && (quizItem.work03Data || quizItem.data)) {
              const w3 = (quizItem.work03Data || quizItem.data) as any;
              console.log('🧩 Work03 인쇄 데이터 확인:', {
                keys: Object.keys(w3),
                sample: w3,
                hasTranslation: !!w3.translation,
                hasKorTrans: !!w3.koreanTranslation,
                hasKorean: !!w3.korean,
                hasKoreanText: !!w3.koreanText,
                hasKorTranslation: !!w3.korTranslation,
                hasKoText: !!w3.koText,
                hasKorean_text: !!w3.korean_text,
                hasPassageTranslation: !!w3.passageTranslation,
                hasKorean_passage: !!w3.korean_passage,
                usedTranslatedText: computedTranslatedText
              });
              return (
                <div key={`work-03-wrapper-${index}`} data-work-type="03">
                  <PrintFormatPackage01Work03 
                    work03Data={quizItem.work03Data || quizItem.data}
                    translatedText={computedTranslatedText}
                    printMode={isAnswerMode ? 'with-answer' : 'no-answer'}
                  />
                </div>
              );
            } else if ((normalizedWorkTypeId === '04' || quizItem.workTypeId === '4' || quizItem.workTypeId === 4) && (quizItem.work04Data || quizItem.data)) {
              return (
                <div key={`work-04-wrapper-${index}`} data-work-type="04">
                  <PrintFormatPackage01Work04 
                    work04Data={quizItem.work04Data || quizItem.data}
                    translatedText={computedTranslatedText || ''}
                    printMode={isAnswerMode ? 'with-answer' : 'no-answer'}
                  />
                </div>
              );
            } else if ((normalizedWorkTypeId === '05' || quizItem.workTypeId === '5' || quizItem.workTypeId === 5) && (quizItem.work05Data || quizItem.data)) {
              return (
                <div key={`work-05-wrapper-${index}`} data-work-type="05">
                  <PrintFormatPackage01Work05 
                    work05Data={quizItem.work05Data || quizItem.data}
                    translatedText={computedTranslatedText || ''}
                    printMode={isAnswerMode ? 'with-answer' : 'no-answer'}
                  />
                </div>
              );
            } else if ((normalizedWorkTypeId === '06' || quizItem.workTypeId === '6' || quizItem.workTypeId === 6) && (quizItem.work06Data || quizItem.data)) {
              return (
                <div key={`work-06-wrapper-${index}`} data-work-type="06">
                  <PrintFormatPackage01Work06 
                    work06Data={quizItem.work06Data || quizItem.data}
                    translatedText={computedTranslatedText || ''}
                    printMode={isAnswerMode ? 'with-answer' : 'no-answer'}
                  />
                </div>
              );
            } else if ((normalizedWorkTypeId === '07' || quizItem.workTypeId === '7' || quizItem.workTypeId === 7) && (quizItem.work07Data || quizItem.data)) {
              return (
                <div key={`work-07-wrapper-${index}`} data-work-type="07">
                  <PrintFormatPackage01Work07 
                    work07Data={quizItem.work07Data || quizItem.data}
                    translatedText={computedTranslatedText || ''}
                    printMode={isAnswerMode ? 'with-answer' : 'no-answer'}
                  />
                </div>
              );
            } else if ((normalizedWorkTypeId === '08' || quizItem.workTypeId === '8' || quizItem.workTypeId === 8) && (quizItem.work08Data || quizItem.data)) {
              return (
                <div key={`work-08-wrapper-${index}`} data-work-type="08">
                  <PrintFormatPackage01Work08 
                    work08Data={quizItem.work08Data || quizItem.data}
                    translatedText={computedTranslatedText || ''}
                    printMode={isAnswerMode ? 'with-answer' : 'no-answer'}
                  />
                </div>
              );
            } else if ((normalizedWorkTypeId === '09' || quizItem.workTypeId === '9' || quizItem.workTypeId === 9) && (quizItem.work09Data || quizItem.data)) {
              return (
                <div key={`work-09-wrapper-${index}`} data-work-type="09">
                  <PrintFormatPackage01Work09 
                    work09Data={quizItem.work09Data || quizItem.data}
                    translatedText={computedTranslatedText || ''}
                    printMode={isAnswerMode ? 'with-answer' : 'no-answer'}
                  />
                </div>
              );
            } else if ((normalizedWorkTypeId === '10' || quizItem.workTypeId === '10') && (quizItem.work10Data || quizItem.data)) {
              return (
                <div key={`work-10-wrapper-${index}`} data-work-type="10">
                  <PrintFormatPackage01Work10 
                    work10Data={quizItem.work10Data || quizItem.data}
                    translatedText={computedTranslatedText || ''}
                    printMode={isAnswerMode ? 'with-answer' : 'no-answer'}
                  />
                </div>
              );
            } else if ((normalizedWorkTypeId === '11' || quizItem.workTypeId === '11') && (quizItem.work11Data || quizItem.data)) {
              return (
                <div key={`work-11-wrapper-${index}`} data-work-type="11">
                  <PrintFormatPackage01Work11 
                    work11Data={quizItem.work11Data || quizItem.data}
                    printMode={isAnswerMode ? 'with-answer' : 'no-answer'}
                  />
                </div>
              );
            } else if ((normalizedWorkTypeId === '13' || quizItem.workTypeId === '13') && (quizItem.work13Data || quizItem.data)) {
              return (
                <div key={`work-13-wrapper-${index}`} data-work-type="13">
                  <PrintFormatPackage01Work13 
                    work13Data={quizItem.work13Data || quizItem.data}
                    printMode={isAnswerMode ? 'with-answer' : 'no-answer'}
                  />
                </div>
              );
            } else if ((normalizedWorkTypeId === '14' || quizItem.workTypeId === '14') && (quizItem.work14Data || quizItem.data)) {
              return (
                <div key={`work-14-wrapper-${index}`} data-work-type="14">
                  <PrintFormatPackage01Work14 
                    work14Data={quizItem.work14Data || quizItem.data}
                    printMode={isAnswerMode ? 'with-answer' : 'no-answer'}
                  />
                </div>
              );
            }
            
            // 매칭되지 않는 유형에 대한 경고 및 디버깅 정보
            console.warn(`⚠️ Package#01 렌더링 실패: 유형#${quizItem.workTypeId || 'unknown'}`, {
              index,
              workTypeId: quizItem.workTypeId,
              hasQuiz: !!quizItem.quiz,
              hasData: !!quizItem.data,
              hasWork02Data: !!quizItem.work02Data,
              hasWork03Data: !!quizItem.work03Data,
              hasWork04Data: !!quizItem.work04Data,
              hasWork05Data: !!quizItem.work05Data,
              hasWork06Data: !!quizItem.work06Data,
              hasWork07Data: !!quizItem.work07Data,
              hasWork08Data: !!quizItem.work08Data,
              hasWork09Data: !!quizItem.work09Data,
              hasWork10Data: !!quizItem.work10Data,
              hasWork11Data: !!quizItem.work11Data,
              hasWork13Data: !!quizItem.work13Data,
              hasWork14Data: !!quizItem.work14Data,
              quizData,
              allKeys: Object.keys(quizItem)
            });
            
            // 마지막에 null 반환 대신 빈 div 반환하여 디버깅 정보 표시
            return (
              <div key={`unknown-work-${index}`} style={{padding: '1rem', background: '#ffebee', border: '2px solid #f44336', margin: '1rem 0'}}>
                <strong>⚠️ 렌더링 실패: 유형#{quizItem.workTypeId || 'unknown'}</strong>
                <pre style={{fontSize: '0.8rem', marginTop: '0.5rem', overflow: 'auto'}}>
                  {JSON.stringify({workTypeId: quizItem.workTypeId, keys: Object.keys(quizItem)}, null, 2)}
                </pre>
              </div>
            );
          })}
        {/* 마지막 문제 다음 단에 본문해석 추가 (정답 모드일 때만) */}
        {isAnswerMode && packageQuiz.length > 0 && (() => {
          // 전체 본문 번역 찾기
          // 1. translatedText prop 우선 사용
          // 2. 첫 번째 아이템의 originalText를 번역한 전체 본문 번역 찾기
          // 3. 마지막 아이템의 translatedText 사용 (다른 유형의 경우)
          
          let lastTranslatedText = '';
          
          // translatedText prop이 있으면 우선 사용
          if (translatedText && translatedText.trim()) {
            lastTranslatedText = translatedText;
          } else {
            // 첫 번째 아이템에서 전체 본문 번역 찾기
            const firstItem = packageQuiz[0];
            const firstQuizData = firstItem.quiz || firstItem.data;
            
            // 첫 번째 아이템의 translatedText 확인 (전체 본문 번역일 가능성)
            const firstItemTranslatedText = 
              firstItem.translatedText ||
              firstQuizData?.translatedText ||
              '';
            
            // 유형#01만 선택한 경우, originalText를 번역한 전체 본문 번역이 필요
            // 다른 유형과 함께 선택한 경우, 마지막 아이템의 translation 사용
            const isOnlyWork01 = packageQuiz.length === 1 && 
              (firstItem.workTypeId === '01' || firstItem.workTypeId === '1' || firstItem.workTypeId === 1);
            
            if (isOnlyWork01) {
              // 유형#01만 선택한 경우: originalText를 번역한 전체 본문 번역 사용
              // firstItem.translatedText에 전체 본문 번역이 저장되어 있을 수 있음
              // 또는 originalText를 직접 번역해야 할 수도 있음
              // 우선 firstItem.translatedText 확인 (전체 본문 번역)
              if (firstItemTranslatedText && firstItemTranslatedText.trim()) {
                lastTranslatedText = firstItemTranslatedText;
              } else if (firstQuizData?.originalText) {
                // originalText가 있으면 번역된 전체 본문 번역을 찾거나
                // 다른 필드에서 전체 본문 번역 찾기
                lastTranslatedText = 
                  (firstQuizData as any)?.koreanTranslation ||
                  (firstQuizData as any)?.korean ||
                  (firstQuizData as any)?.koreanText ||
                  (firstQuizData as any)?.korTranslation ||
                  (firstQuizData as any)?.koText ||
                  (firstQuizData as any)?.korean_text ||
                  (firstQuizData as any)?.passageTranslation ||
                  (firstQuizData as any)?.korean_passage ||
                  '';
                // 여전히 없으면 firstItem.translatedText가 전체 본문 번역일 수 있음
                if (!lastTranslatedText || !lastTranslatedText.trim()) {
                  lastTranslatedText = firstItem.translatedText || '';
                }
              } else {
                // fallback: firstItem.translatedText 사용
                lastTranslatedText = firstItemTranslatedText || '';
              }
            } else {
              // 여러 유형 선택한 경우: 마지막 아이템의 translatedText 사용
              const lastItem = packageQuiz[packageQuiz.length - 1];
              const lastQuizData = lastItem.quiz || lastItem.data;
              lastTranslatedText = 
                lastItem.translatedText ||
                lastQuizData?.translatedText ||
                lastQuizData?.translation ||
                (lastQuizData as any)?.koreanTranslation ||
                (lastQuizData as any)?.korean ||
                (lastQuizData as any)?.koreanText ||
                (lastQuizData as any)?.korTranslation ||
                (lastQuizData as any)?.koText ||
                (lastQuizData as any)?.korean_text ||
                (lastQuizData as any)?.passageTranslation ||
                (lastQuizData as any)?.korean_passage ||
                '';
            }
          }
          
          // 모든 유형의 본문해석을 맨 마지막 페이지에 통합 표시
          if (lastTranslatedText && lastTranslatedText.trim()) {
            return (
              <div key="package01-last-translation" className="only-print">
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderPackage01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="print-translation-section" style={{
                      marginTop: '0.5rem',
                      padding: '1.5rem',
                      background: '#ffffff',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1.5px solid #666666'
                    }}>
                      <div className="print-translation-title" style={{
                        fontWeight: 800,
                        fontSize: '1.2rem',
                        color: '#000000',
                        marginBottom: '0.8rem'
                      }}>
                        본문해석 :
                      </div>
                      <div className="print-translation-content" style={{
                        fontSize: '1.2rem',
                        lineHeight: '1.7',
                        color: '#222',
                        fontFamily: 'inherit'
                      }}>
                        {lastTranslatedText}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
    );
  }

  // 기존 quiz prop을 사용하는 로직 (문제생성 후 페이지)
  if (!quiz) {
    return <div>문제 데이터가 없습니다.</div>;
  }

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

  // 모의고사 형식 확인
  const isExamFormat = quiz.format === 'exam';
  const instruction = isExamFormat 
    ? (quiz.instruction || '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.')
    : '다음 단락들을 원래 순서대로 배열한 것을 고르세요.';
  const choiceSeparator = isExamFormat ? ' - ' : ' → ';

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
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>{instruction}</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#01</span>
                </div>
                {/* 모의고사 형식: 고정된 첫 번째 단락을 박스 안에 표시 */}
                {isExamFormat && quiz.fixedParagraph && (
                  <div className="fixed-paragraph-box" style={{
                    border: '1px solid #000',
                    borderRadius: '8px',
                    padding: '0.6rem 1rem',
                    marginTop: '0',
                    marginBottom: '1.5rem',
                    backgroundColor: '#fff',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: '#333'
                  }}>
                    {quiz.fixedParagraph}
                  </div>
                )}
                {/* 나머지 3개 단락 - 모의고사 형식 */}
                {quiz.shuffledParagraphs.map((paragraph, index) => (
                  <div key={paragraph.id} className="shuffled-paragraph" style={{marginTop:'0.1rem', fontSize:'0.9rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.4'}}>
                    <strong>({paragraph.label}) </strong>{paragraph.content}
                  </div>
                ))}
              </div>
            </div>
            
            {/* 두 번째 페이지: 4지선다 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>{instruction}</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#01</span>
                </div>
                {/* 4지선다 선택지 */}
                {quiz.choices.map((choice, cIndex) => (
                  <div key={`choice-${cIndex}`} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                    {['①', '②', '③', '④'][cIndex]} {Array.isArray(choice) ? choice.join(choiceSeparator) : choice}
                  </div>
                ))}
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
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>{instruction}</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#01</span>
              </div>
              {/* 모의고사 형식: 고정된 첫 번째 단락을 박스 안에 표시 */}
              {isExamFormat && quiz.fixedParagraph && (
                <div className="fixed-paragraph-box" style={{
                  border: '1px solid #000',
                  borderRadius: '8px',
                  padding: '0.6rem 1rem',
                  marginTop: '0',
                  marginBottom: '1.5rem',
                  backgroundColor: '#fff',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  color: '#333'
                }}>
                  {quiz.fixedParagraph}
                </div>
              )}
              {/* 나머지 3개 단락 - 모의고사 형식 */}
              {quiz.shuffledParagraphs.map((paragraph, index) => (
                <div key={paragraph.id} className="shuffled-paragraph" style={{marginTop:'0.1rem', fontSize:'0.9rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.4'}}>
                  <strong>({paragraph.label}) </strong>{paragraph.content}
                </div>
              ))}
              {/* 4지선다 선택지 */}
              {quiz.choices.map((choice, cIndex) => (
                <div key={`choice-${cIndex}`} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                  {['①', '②', '③', '④'][cIndex]} {Array.isArray(choice) ? choice.join(choiceSeparator) : choice}
                </div>
              ))}
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
            {/* 1페이지: 고정 단락 + A, B, C 본문만 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>{instruction}</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#01</span>
                  </div>
                  {/* 모의고사 형식: 고정된 첫 번째 단락을 박스 안에 표시 */}
                  {isExamFormat && quiz.fixedParagraph && (
                    <div className="fixed-paragraph-box" style={{
                      border: '1px solid #000',
                      borderRadius: '8px',
                      padding: '0.6rem 1rem',
                      marginTop: '0',
                      marginBottom: '1.5rem',
                      backgroundColor: '#fff',
                      fontSize: '1rem',
                      lineHeight: '1.6',
                      color: '#333'
                    }}>
                      {quiz.fixedParagraph}
                    </div>
                  )}
                  {/* 나머지 3개 단락 - 모의고사 형식 */}
                  {quiz.shuffledParagraphs.map((paragraph, index) => (
                    <div key={paragraph.id} className="shuffled-paragraph" style={{marginTop:'0.1rem', fontSize:'0.9rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.4'}}>
                      <strong>({paragraph.label}) </strong>{paragraph.content}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2페이지: 4지선다 + 정답 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>{instruction}</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#01</span>
                  </div>
                  {/* 4지선다 선택지 */}
                  {quiz.choices.map((choice, cIndex) => (
                    <div key={`choice-${cIndex}`} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                      {['①', '②', '③', '④'][cIndex]} {Array.isArray(choice) ? choice.join(choiceSeparator) : choice}
                      {quiz.answerIndex === cIndex && (
                        <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                    </div>
                  ))}
                  
                  {/* 정답 표시 */}
                  {(() => {
                    const correctOrder = quiz.choices[quiz.answerIndex];
                    const answerText = correctOrder ? correctOrder.join(choiceSeparator) : '';
                    return (
                      <div style={{marginTop:'1rem', padding:'1rem', background:'#e3f2fd', borderRadius:'0', border:'2px solid #1976d2'}}>
                        <div style={{fontWeight:800, color:'#1976d2', fontSize:'1rem'}}>
                          정답 : {answerText}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* 전체 본문 해석 추가 */}
                  {translatedText && (
                    <div style={{marginTop:'1rem', padding:'0.8rem', background:'#f8f9fa', borderRadius:'6px', border:'1px solid #dee2e6'}}>
                      <div className="korean-translation" style={{fontSize:'0.5rem !important', lineHeight:'1.6', color:'#1976d2'}}>
                        {translatedText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </>
        ) : (
          // 2페이지 구성: 본문 글자수 2,000자 미만
          <>
            {/* 1페이지: 고정 단락 + 나머지 3개 단락 + 4지선다 + 정답 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>{instruction}</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#01</span>
                  </div>
                  {/* 모의고사 형식: 고정된 첫 번째 단락을 박스 안에 표시 */}
                  {isExamFormat && quiz.fixedParagraph && (
                    <div className="fixed-paragraph-box" style={{
                      border: '1px solid #000',
                      borderRadius: '8px',
                      padding: '0.6rem 1rem',
                      marginTop: '0',
                      marginBottom: '1.5rem',
                      backgroundColor: '#fff',
                      fontSize: '1rem',
                      lineHeight: '1.6',
                      color: '#333'
                    }}>
                      {quiz.fixedParagraph}
                    </div>
                  )}
                  {/* 나머지 3개 단락 - 모의고사 형식 */}
                  {quiz.shuffledParagraphs.map((paragraph, index) => (
                    <div key={paragraph.id} className="shuffled-paragraph" style={{marginTop:'0.1rem', fontSize:'0.9rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#222', lineHeight:'1.4'}}>
                      <strong>({paragraph.label}) </strong>{paragraph.content}
                    </div>
                  ))}
                  
                  {/* 4지선다 선택지 */}
                  {quiz.choices.map((choice, cIndex) => (
                    <div key={`choice-${cIndex}`} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                      {['①', '②', '③', '④'][cIndex]} {Array.isArray(choice) ? choice.join(choiceSeparator) : choice}
                      {quiz.answerIndex === cIndex && (
                        <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                    </div>
                  ))}
                  
                  {/* 정답 표시 */}
                  {(() => {
                    const correctOrder = quiz.choices[quiz.answerIndex];
                    const answerText = correctOrder ? correctOrder.join(choiceSeparator) : '';
                    return (
                      <div style={{marginTop:'1rem', padding:'1rem', background:'#e3f2fd', borderRadius:'0', border:'2px solid #1976d2'}}>
                        <div style={{fontWeight:800, color:'#1976d2', fontSize:'1rem'}}>
                          정답 : {answerText}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* 전체 본문 해석 추가 */}
                  {translatedText && (
                    <div style={{marginTop:'1rem', padding:'0.8rem', background:'#f8f9fa', borderRadius:'6px', border:'1px solid #dee2e6'}}>
                      <div className="korean-translation" style={{fontSize:'0.5rem !important', lineHeight:'1.6', color:'#1976d2'}}>
                        {translatedText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

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
      
      // 문장 내에서 해당 단어만 HTML 태그로 감싸기 (밑줄, 검정색, 진하게)
      const modifiedSentence = sentence.replace(regex, `<u><strong style="color: #000000;">$&</strong></u>`);
      result += modifiedSentence;
      
      currentPosition = sentenceEnd;
    }
    
    return result;
  };

  // Work_02용 페이지 분할 로직 (완전 동기 처리)
  const getWork02PageLayout = (work02Data: Work02QuizData) => {
    if (!work02Data) return { needsSecondPage: false, needsThirdPage: false, firstPageIncludesReplacements: true };

    // A4 페이지 설정
    const A4_CONFIG = {
      PAGE_WIDTH: 794,
      PAGE_HEIGHT: 1123,
      TOP_MARGIN: 25,
      BOTTOM_MARGIN: 25,
      LEFT_MARGIN: 20,
      RIGHT_MARGIN: 20,
      HEADER_HEIGHT: 100,
      FOOTER_HEIGHT: 20,
      CONTENT_WIDTH: 754,
      CONTENT_HEIGHT: 950,
    };

    // 텍스트 높이 계산 함수
    const calculateContainerHeight = (text: string, padding: number = 16, fontSize: number = 16, lineHeight: number = 1.7): number => {
      const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40;
      const charWidthPx = fontSize * 0.55;
      const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
      const lines = Math.ceil(text.length / charsPerLine);
      return (lines * fontSize * lineHeight) + padding;
    };

    // A: 문제 제목 + 영어 본문 높이 계산
    const problemTitleHeight = 30 + 11; // INSTRUCTION_HEIGHT + INSTRUCTION_MARGIN
    const englishPassageHeight = calculateContainerHeight(work02Data.modifiedText || '', 16, 14, 1.7);
    const A = problemTitleHeight + englishPassageHeight;
    
    // B: 교체된 단어들 테이블 높이 계산
    const tableTitleHeight = 30 + 11; // 제목 높이
    const tableRows = Math.ceil(work02Data.replacements.length / 2);
    const tableRowHeight = 30; // 각 행의 높이
    const tablePadding = 16; // 테이블 패딩
    const B = tableTitleHeight + (tableRows * tableRowHeight) + tablePadding;
    
    // C: 한글 해석 높이 계산
    const C = calculateContainerHeight(work02Data.translation || '', 16, 16, 1.7);
    
    console.log(`=== 패키지#01-유형#02 높이 계산 결과 ===`);
    console.log(`A (문제제목+영어본문): ${A.toFixed(2)}px`);
    console.log(`B (교체된단어들): ${B.toFixed(2)}px`);
    console.log(`C (한글해석): ${C.toFixed(2)}px`);
    console.log(`A+B+C 총합: ${(A + B + C).toFixed(2)}px`);
    
    const availableSpace = A4_CONFIG.CONTENT_HEIGHT; // 950px
    const totalHeight = A + B + C;
    const safetyMargin = 100; // 보수적 여백
    const effectiveAvailableHeight = availableSpace - safetyMargin; // 850px
    
    console.log(`=== 패키지#01-유형#02 페이지 분할 판단 ===`);
    console.log(`사용 가능한 공간: ${availableSpace}px`);
    console.log(`안전 여백: ${safetyMargin}px`);
    console.log(`실제 사용 가능: ${effectiveAvailableHeight}px`);
    console.log(`A+B+C 총 높이: ${totalHeight.toFixed(2)}px`);
    console.log(`  * A+B+C ≤ ${effectiveAvailableHeight}? ${totalHeight <= effectiveAvailableHeight} (${totalHeight.toFixed(2)} <= ${effectiveAvailableHeight})`);
    console.log(`  * A+B ≤ ${effectiveAvailableHeight}? ${(A + B).toFixed(2)} <= ${effectiveAvailableHeight} (${(A + B).toFixed(2)} <= ${effectiveAvailableHeight})`);
    
    let needsSecondPage = false;
    let needsThirdPage = false;
    let firstPageIncludesReplacements = true;
    
    if (totalHeight <= effectiveAvailableHeight) {
      // A+B+C ≤ 850px → 1페이지
      needsSecondPage = false;
      needsThirdPage = false;
      firstPageIncludesReplacements = true;
      console.log('✅ 패키지#01-유형#02 1페이지: A+B+C 모두 1페이지에 들어갑니다');
    } else if (A + B <= effectiveAvailableHeight) {
      // A+B+C > 850px, A+B ≤ 850px → 1페이지(A+B), 2페이지(C)
      needsSecondPage = true;
      needsThirdPage = false;
      firstPageIncludesReplacements = true;
      console.log('✅ 패키지#01-유형#02 2페이지: 1페이지(A+B), 2페이지(C)');
    } else if (A <= effectiveAvailableHeight && B + C <= effectiveAvailableHeight) {
      // A+B+C > 850px, A+B > 850px, A ≤ 850px, B+C ≤ 850px → 1페이지(A), 2페이지(B+C)
      needsSecondPage = true;
      needsThirdPage = false;
      firstPageIncludesReplacements = false;
      console.log('✅ 패키지#01-유형#02 2페이지: 1페이지(A), 2페이지(B+C)');
    } else {
      // A+B+C > 850px, A+B > 850px, A > 850px 또는 B+C > 850px → 1페이지(A), 2페이지(B), 3페이지(C)
      needsSecondPage = true;
      needsThirdPage = true;
      firstPageIncludesReplacements = false;
      console.log('✅ 패키지#01-유형#02 3페이지: 1페이지(A), 2페이지(B), 3페이지(C)');
    }
    
    console.log(`=== 패키지#01-유형#02 최종 페이지 분할 결과 ===`);
    console.log(`2페이지 필요: ${needsSecondPage}`);
    console.log(`3페이지 필요: ${needsThirdPage}`);
    console.log(`✅ 패키지#01-유형#02 상태 설정 완료`);
    
    return { needsSecondPage, needsThirdPage, firstPageIncludesReplacements };
  };

  // Work_02용 페이지 분할 로직 적용 (동기 처리)
  const work02PageLayout = getWork02PageLayout(work02Data);
  const needsAnswerSecondPage = work02PageLayout.needsSecondPage;
  const needsAnswerThirdPage = work02PageLayout.needsThirdPage;
  const firstPageIncludesReplacements = work02PageLayout.firstPageIncludesReplacements;

  // 인쇄용: 문제만
  if (printMode === 'no-answer') {
    return (
      <div className="only-print work-02-print">
        {/* 1페이지: 문제제목 + 본문만 (해석 제거) */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="problem-instruction" data-work-type="02" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>다음 본문을 읽고 해석하세요</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#02</span>
            </div>
            <div className="problem-passage" style={{marginTop:'0.1rem', fontSize:'1rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#000000', lineHeight:'1.4'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(work02Data.modifiedText, work02Data.replacements, false)}}>
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
        <div className="only-print print-answer-mode work-02-print">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 본문을 읽고 해석하세요</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#02</span>
              </div>
                <div className="problem-passage" style={{marginTop:'0.63rem', marginBottom:'0.8rem', fontSize:'0.9rem', padding:'1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#000000', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(work02Data.modifiedText, work02Data.replacements, false)}}>
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
                                      <div>
                                        <span className="original-word">{leftReplacement.original}</span>
                                        <br />
                                        <span className="original-meaning">({leftReplacement.originalMeaning})</span>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {leftReplacement && (
                                      <div>
                                        <span className="replacement-word">{leftReplacement.replacement}</span>
                                        <br />
                                        <span className="replacement-meaning">({leftReplacement.replacementMeaning})</span>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {rightReplacement && (
                                      <div>
                                        <span className="original-word">{rightReplacement.original}</span>
                                        <br />
                                        <span className="original-meaning">({rightReplacement.originalMeaning})</span>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {rightReplacement && (
                                      <div>
                                        <span className="replacement-word">{rightReplacement.replacement}</span>
                                        <br />
                                        <span className="replacement-meaning">({rightReplacement.replacementMeaning})</span>
                                      </div>
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
                {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
              </div>
            </div>
          </div>
      );
    } else if (needsAnswerSecondPage && !needsAnswerThirdPage) {
      // 2페이지 구성
      if (firstPageIncludesReplacements) {
        // 1페이지(A+B), 2페이지(C)
        return (
          <div className="only-print print-answer-mode work-02-print">
            {/* 1페이지: 문제제목 + 본문 + 교체된 단어들 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="problem-instruction" data-work-type="02" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 본문을 읽고 해석하세요</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#02</span>
              </div>
              <div className="problem-passage" style={{marginTop:'0.1rem', fontSize:'0.9rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', border:'1.5px solid #e3f2fd', fontFamily:'inherit', color:'#000000', lineHeight:'1.4'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(work02Data.modifiedText, work02Data.replacements, false)}}>
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
            {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
        </div>
      );
    } else {
        // 1페이지(A), 2페이지(B+C)
      return (
        <div className="only-print print-answer-mode work-02-print">
            {/* 1페이지: 문제제목 + 본문만 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="problem-instruction" data-work-type="02" style={{fontWeight:800, fontSize:'1rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 본문을 읽고 해석하세요</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#02</span>
              </div>
              <div className="problem-passage" style={{marginTop:'0.63rem', marginBottom:'0.8rem', fontSize:'0.9rem', padding:'1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#000000', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(work02Data.modifiedText, work02Data.replacements, false)}}>
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
                  {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
                </div>
              </div>
            </div>
          </div>
        );
      }
    } else {
      // 3페이지 구성: 1페이지(A), 2페이지(B), 3페이지(C)
      return (
        <div className="only-print print-answer-mode work-02-print">
          {/* 1페이지: 문제제목 + 본문만 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 본문을 읽고 해석하세요</span>
                </div>
                <div className="problem-passage" style={{marginTop:'0.63rem', marginBottom:'0.8rem', fontSize:'0.9rem', padding:'1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#000000', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(work02Data.modifiedText, work02Data.replacements, false)}}>
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
                                      <div>
                                        <span className="original-word">{leftReplacement.original}</span>
                                        <br />
                                        <span className="original-meaning">({leftReplacement.originalMeaning})</span>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {leftReplacement && (
                                      <div>
                                        <span className="replacement-word">{leftReplacement.replacement}</span>
                                        <br />
                                        <span className="replacement-meaning">({leftReplacement.replacementMeaning})</span>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {rightReplacement && (
                                      <div>
                                        <span className="original-word">{rightReplacement.original}</span>
                                        <br />
                                        <span className="original-meaning">({rightReplacement.originalMeaning})</span>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {rightReplacement && (
                                      <div>
                                        <span className="replacement-word">{rightReplacement.replacement}</span>
                                        <br />
                                        <span className="replacement-meaning">({rightReplacement.replacementMeaning})</span>
                                      </div>
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
          {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
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
            <div className="problem-instruction" data-work-type="03" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>다음 빈칸에 들어갈 가장 적절한 단어를 고르세요.</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#03</span>
            </div>
            <div className="problem-passage" style={{marginTop:'0.1rem', fontSize:'1rem', padding:'1rem', background:'#f7f8fc', borderRadius:'0', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
              {work03Data.blankedText}
            </div>
          </div>
            </div>

            {/* 두 번째 페이지: 객관식만 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 빈칸에 들어갈 가장 적절한 단어를 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#03</span>
                </div>
                {work03Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                    {['①', '②', '③', '④', '⑤'][index]} {option}
                  </div>
                ))}
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
              <div className="problem-instruction" data-work-type="03" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 빈칸에 들어갈 가장 적절한 단어를 고르세요.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#03</span>
              </div>
              <div className="problem-passage" style={{marginTop:'0.1rem', fontSize:'1rem', padding:'1rem', background:'#f7f8fc', borderRadius:'0', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work03Data.blankedText}
              </div>
              {work03Data.options.map((option, index) => (
                <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                  {['①', '②', '③', '④', '⑤'][index]} {option}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 인쇄용: 정답포함 (원래 유형#03과 동일한 페이지 분할 로직 적용)
  if (printMode === 'with-answer') {
    // A4 설정 (원래 유형#03과 동일)
    const A4_CONFIG = {
      CONTENT_WIDTH: 754,        // px (A4 너비 - 좌우 마진)
      CONTENT_HEIGHT: 1048,      // px (A4 높이 - 상하 마진)
      INSTRUCTION_HEIGHT: 40,    // px
      INSTRUCTION_MARGIN: 11,    // px
      TRANSLATION_HEADER_HEIGHT: 40,  // px
      TRANSLATION_HEADER_MARGIN: 11,  // px
      OPTIONS_HEADER_HEIGHT: 30,      // px
      OPTIONS_HEADER_MARGIN: 11,      // px
    };

    // 텍스트 높이 계산 함수 (원래 유형#03과 동일)
    const calculateContainerHeight = (text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number => {
      const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40; // px
      const hasKorean = /[가-힣]/.test(text);
      const charWidthPx = hasKorean ? fontSize * 0.7 : fontSize * 0.6;
      const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
      const lines = Math.ceil(text.length / charsPerLine);
      return (lines * fontSize * lineHeight) + padding; // px 단위로 반환
    };

    // 페이지 분할 계산 (원래 유형#03과 동일)
    const availableHeight = A4_CONFIG.CONTENT_HEIGHT; // 1048px
    
    // A. 문제 제목 컨테이너 + 영어 본문 컨테이너 높이
    const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT;
    const englishPassageHeight = calculateContainerHeight(work03Data.blankedText, 16, 16, 1.7); // 유형#09와 동일하게 수정
    const sectionAHeight = problemTitleHeight + englishPassageHeight;
    
    // B. 4지선다 선택항목 컨테이너 높이
    const optionsHeaderHeight = A4_CONFIG.OPTIONS_HEADER_HEIGHT;
    let optionsHeight = 0;
    work03Data.options.forEach(option => {
      optionsHeight += calculateContainerHeight(`${option} (정답)`, 11, 16, 1.3);
    });
    const sectionBHeight = optionsHeaderHeight + optionsHeight;
    
    // C. 본문해석 제목 컨테이너 + 한글 해석 컨테이너 높이
    const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT;
    const finalTranslatedText = translatedText || work03Data.translation || (work03Data as any)?.koreanTranslation || (work03Data as any)?.korean || (work03Data as any)?.koreanText || (work03Data as any)?.korTranslation || (work03Data as any)?.koText || (work03Data as any)?.korean_text || (work03Data as any)?.passageTranslation || (work03Data as any)?.korean_passage || (work03Data as any)?.translatedText || '';
    const translationHeight = calculateContainerHeight(finalTranslatedText, 32, 12.8, 1.7); // 유형#09와 동일하게 수정
    const sectionCHeight = translationHeaderHeight + translationHeight;
    
    // 안전 마진 적용
    const safetyMargin = 50;
    const effectiveAvailableHeight = availableHeight - safetyMargin;
    const totalHeight = sectionAHeight + sectionBHeight + sectionCHeight;

    // 페이지 분할 결정
    let pageLayoutInfo: {
      needsSecondPage: boolean;
      needsThirdPage: boolean;
      page1Content: string;
      page2Content: string;
      page3Content: string;
    };

    if (totalHeight <= effectiveAvailableHeight) {
      // A+B+C ≤ 998px → 1페이지에 A,B,C 모두 포함
      pageLayoutInfo = {
        needsSecondPage: false,
        needsThirdPage: false,
        page1Content: 'A+B+C',
        page2Content: '',
        page3Content: ''
      };
    } else if (sectionAHeight + sectionBHeight <= effectiveAvailableHeight) {
      // A+B+C > 998px, A+B ≤ 998px → 1페이지 A+B 포함, 2페이지에 C 포함
      pageLayoutInfo = {
        needsSecondPage: true,
        needsThirdPage: false,
        page1Content: 'A+B',
        page2Content: 'C',
        page3Content: ''
      };
    } else if (sectionAHeight <= effectiveAvailableHeight) {
      // A+B+C > 998px, A+B > 998px, A ≤ 998px → 1페이지에 A 포함, 2페이지에 B+C 포함
      pageLayoutInfo = {
        needsSecondPage: true,
        needsThirdPage: false,
        page1Content: 'A',
        page2Content: 'B+C',
        page3Content: ''
      };
    } else {
      // A+B+C > 998px, A+B > 998px, A > 998px → 1페이지에 A 포함, 2페이지에 B 포함, 3페이지에 C 포함
      pageLayoutInfo = {
        needsSecondPage: true,
        needsThirdPage: true,
        page1Content: 'A',
        page2Content: 'B',
        page3Content: 'C'
      };
    }

    return (
      <div className="only-print print-answer-mode">
        {/* 1페이지 */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            {/* A. 문제 제목 컨테이너 + 영어 본문 컨테이너 */}
            {(pageLayoutInfo.page1Content.includes('A') || pageLayoutInfo.page1Content === 'A') && (
              <>
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 빈칸에 들어갈 단어로 가장 적절한 것을 고르시오.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#03</span>
                </div>
                <div className="problem-passage package01-work03-passage" style={{marginTop:'0.1rem', marginBottom:'0.5rem', fontSize:'1rem', padding:'1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                  {work03Data.blankedText}
                </div>
              </>
            )}
            
            {/* B. 모든 4지선다 항목 표시 */}
            {(pageLayoutInfo.page1Content.includes('B') || pageLayoutInfo.page1Content === 'B') && (
              <>
                {work03Data.options.map((option: string, index: number) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                    {`①②③④⑤`[index] || `${index+1}.`} {option}
                    {work03Data.answerIndex === index && (
                      <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                    )}
                </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 2페이지 */}
        {pageLayoutInfo.needsSecondPage && (
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              {/* B. 모든 4지선다 항목 표시 */}
              {(pageLayoutInfo.page2Content.includes('B') || pageLayoutInfo.page2Content === 'B') && (
                <>
                  {work03Data.options.map((option: string, index: number) => (
                    <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                      {`①②③④⑤`[index] || `${index+1}.`} {option}
                      {work03Data.answerIndex === index && (
                        <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                  </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* 3페이지 */}
        {pageLayoutInfo.needsThirdPage && (
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              {/* C. 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
            </div>
          </div>
        )}
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
  // A4 페이지 설정
  const A4_CONFIG = {
    // 실제 A4 크기: 210mm × 297mm = 794px × 1123px (96 DPI)
    PAGE_WIDTH: 794,          // px (210mm * 3.78px/mm)
    PAGE_HEIGHT: 1123,        // px (297mm * 3.78px/mm)
    
    // 인쇄 여백 (실제 인쇄 시 표준 여백)
    TOP_MARGIN: 25,           // px (6.6mm)
    BOTTOM_MARGIN: 25,        // px (6.6mm)
    LEFT_MARGIN: 20,          // px (5.3mm)
    RIGHT_MARGIN: 20,         // px (5.3mm)
    
    // 헤더/푸터 영역
    HEADER_HEIGHT: 30,        // px (8mm)
    FOOTER_HEIGHT: 20,        // px (5.3mm)
    
    // 콘텐츠 영역 계산
    CONTENT_WIDTH: 754,       // px (794 - 20 - 20)
    CONTENT_HEIGHT: 1048,     // px (1123 - 25 - 25 - 30 - 20)
    
    // 섹션별 높이 설정
    INSTRUCTION_HEIGHT: 30,   // px
    INSTRUCTION_MARGIN: 11,   // px
    TRANSLATION_HEADER_HEIGHT: 30,  // px
    TRANSLATION_HEADER_MARGIN: 11,  // px
  };

  // 컨테이너 높이 계산 함수
  const calculateContainerHeight = (text: string, padding: number = 38, fontSize: number = 14.4, lineHeight: number = 1.7): number => {
    // 실제 A4 콘텐츠 너비 사용 (754px - 좌우 패딩 40px = 714px)
    const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40; // px
    const charWidthPx = fontSize * 0.55; // px 단위 문자 폭
    const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
    const lines = Math.ceil(text.length / charsPerLine);
    return (lines * fontSize * lineHeight) + padding; // px 단위로 반환
  };

  // 정답 모드 페이지 분할 계산
  const calculateAnswerPageLayout = () => {
    // A. 문제제목 + 본문 + 정답선택지 컨테이너 (간격 포함)
    const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN; // 41px
    const passageHeight = calculateContainerHeight(work04Data.blankedText, 16, 16, 1.7); // 유형#09와 동일하게 수정
    const passageMarginBottom = 0 * 16; // 0rem = 0px
    const answerOptionText = work04Data.options[work04Data.answerIndex];
    const answerOptionHeight = calculateContainerHeight(answerOptionText, 20, 14.4, 1.3);
    const answerOptionMarginBottom = 3.5 * 16; // 3.5rem = 56px
    const sectionAHeight = problemTitleHeight + passageHeight + passageMarginBottom + answerOptionHeight + answerOptionMarginBottom;

    // B. 본문해석 제목 + 한글해석 컨테이너
    const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT + (0 * 16); // 30px + 0px = 30px
    const finalTranslatedText = translatedText || '번역을 생성하는 중...';
    const translationHeight = calculateContainerHeight(finalTranslatedText, 32, 12.8, 1.7); // 유형#09와 동일하게 수정
    const sectionBHeight = translationHeaderHeight + translationHeight;

    // 이용 가능한 공간 계산 (실제 A4 크기 기준)
    const availableHeight = A4_CONFIG.CONTENT_HEIGHT; // 1048px
    const safetyMargin = 50; // px (실제 A4 기준 적절한 여백)
    const effectiveAvailableHeight = availableHeight - safetyMargin; // 998px

    const totalHeight = sectionAHeight + sectionBHeight;

    console.log('📊 패키지#01-유형#04 인쇄(정답) 페이지 분할 계산:', {
      sectionAHeight: sectionAHeight.toFixed(2) + 'px',
      sectionBHeight: sectionBHeight.toFixed(2) + 'px',
      totalHeight: totalHeight.toFixed(2) + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
      passageLength: work04Data.blankedText.length,
      translationLength: finalTranslatedText.length
    });

    // 페이지 분할 로직
    if (totalHeight <= effectiveAvailableHeight) {
      // 케이스 1: A+B ≤ 998px → 1페이지에 A, B 모두 포함
      return {
        needsSecondPage: false,
        page1Content: 'A+B',
        page2Content: null
      };
    } else {
      // 케이스 2: A+B > 998px → 1페이지에 A, 2페이지에 B
      return {
        needsSecondPage: true,
        page1Content: 'A',
        page2Content: 'B'
      };
    }
  };

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
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#04</span>
            </div>
            <div className="problem-passage" style={{marginTop:'0.1rem', fontSize:'1rem', padding:'1rem', background:'#f7f8fc', borderRadius:'0', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
              {work04Data.blankedText}
            </div>
          </div>
            </div>

            {/* 두 번째 페이지: 객관식만 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.</span>
                </div>
                {work04Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                    {['①', '②', '③', '④', '⑤'][index]} {option}
                  </div>
                ))}
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
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#04</span>
              </div>
              <div className="problem-passage" style={{marginTop:'0.1rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'0', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work04Data.blankedText}
              </div>
              {work04Data.options.map((option, index) => (
                <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                  {['①', '②', '③', '④', '⑤'][index]} {option}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 인쇄용: 정답포함
  if (printMode === 'with-answer') {
    const answerPageLayout = calculateAnswerPageLayout();

    if (answerPageLayout.needsSecondPage) {
      // 2페이지 분할: 1페이지에 문제+정답, 2페이지에 본문해석
      return (
        <div className="only-print print-answer-mode">
          {/* 1페이지: 문제 + 정답 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#04</span>
              </div>
              <div className="problem-passage package01-work04-passage" style={{marginTop:'0.1rem', marginBottom:'0.5rem', fontSize:'1rem !important', padding:'1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work04Data.blankedText}
              </div>
              {work04Data.options.map((option: string, index: number) => (
                <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', marginBottom: index === work04Data.options.length - 1 ? '3.5rem' : '0'}}>
                  {['①', '②', '③', '④', '⑤'][index]} {option}
                  {work04Data.answerIndex === index && (
                    <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                  )}
              </div>
              ))}
            </div>
          </div>
        </div>
      );
    } else {
      // 1페이지: 문제 + 정답 + 본문해석 모두 포함
      return (
        <div className="only-print print-answer-mode">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#04</span>
              </div>
              <div className="problem-passage package01-work04-passage" style={{marginTop:'0.1rem', marginBottom:'0.5rem', fontSize:'1rem', padding:'1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work04Data.blankedText}
              </div>
              {work04Data.options.map((option: string, index: number) => (
                <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', marginBottom: index === work04Data.options.length - 1 ? '1rem' : '0'}}>
                  {`①②③④⑤`[index] || `${index+1}.`} {option}
                  {work04Data.answerIndex === index && (
                    <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
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
  // A4 페이지 설정 (실제 인쇄 기준으로 조정)
  const A4_CONFIG = {
    PAGE_HEIGHT: 1123, // A4 페이지 높이 (px)
    HEADER_HEIGHT: 100,  // 헤더 높이 (여유있게)
    CONTENT_HEIGHT: 950, // 실제 콘텐츠 영역 높이 (여유있게)
    MARGIN_TOP: 20,
    MARGIN_BOTTOM: 20,
    MARGIN_BETWEEN_SECTIONS: 15
  };

  // 컨테이너 높이 계산 함수
  const calculateContainerHeight = (text: string, fontSize: number, lineHeight: number, padding: number = 16) => {
    if (!text) return 0;
    
    // 텍스트 길이 기반 라인 수 계산
    const charsPerLine = Math.floor(750 / (fontSize * 0.6)); // A4 너비 기준
    const lines = Math.ceil(text.length / charsPerLine);
    const lineHeightPx = fontSize * lineHeight;
    
    return Math.ceil(lines * lineHeightPx) + padding;
  };

  // 문제제목 컨테이너 높이
  const titleHeight = 50; // 고정 높이

  // 본문 컨테이너 높이
  const passageHeight = calculateContainerHeight(work05Data.blankedText, 14.4, 1.7, 16); // 0.9rem = 14.4px

  // 선택지 컨테이너 높이
  const optionsHeight = work05Data.options.reduce((total, option) => {
    return total + calculateContainerHeight(option, 14.4, 1.3, 8); // 각 선택지 높이
  }, 0) + (work05Data.options.length * 8); // 선택지 간 여백

  // 정답 표시 높이 (정답 모드에서만)
  const answerHeight = printMode === 'with-answer' ? 30 : 0;

  // 본문해석 컨테이너 높이 (정답 모드에서만)
  const translationHeight = printMode === 'with-answer' ? 
    calculateContainerHeight(translatedText || '', 16, 1.7, 16) : 0;

  // 전체 콘텐츠 높이 계산
  const totalContentHeight = titleHeight + passageHeight + optionsHeight + answerHeight + 
    (printMode === 'with-answer' ? translationHeight : 0) + 
    (A4_CONFIG.MARGIN_BETWEEN_SECTIONS * 4);

  // 페이지 분할 필요 여부 판단
  const needsSecondPage = totalContentHeight > A4_CONFIG.CONTENT_HEIGHT;

  console.log('🔍 Work05 동적 페이지분할 계산:', {
    titleHeight,
    passageHeight,
    optionsHeight,
    answerHeight,
    translationHeight,
    totalContentHeight,
    contentHeight: A4_CONFIG.CONTENT_HEIGHT,
    needsSecondPage,
    printMode
  });

  if (printMode === 'no-answer') {
    
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
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#05</span>
            </div>
            <div className="problem-passage" style={{marginTop:'0.1rem', fontSize:'1rem', padding:'1rem', background:'#f7f8fc', borderRadius:'0', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
              {work05Data.blankedText}
            </div>
          </div>
            </div>

            {/* 두 번째 페이지: 객관식만 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#05</span>
                </div>
                {work05Data.options.map((option, index) => (
                  <div key={index} className="option option-print" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                    {['①', '②', '③', '④', '⑤'][index]} {option}
                  </div>
                ))}
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
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#05</span>
              </div>
              <div className="problem-passage" style={{marginTop:'0.1rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'0', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work05Data.blankedText}
              </div>
              {work05Data.options.map((option, index) => (
                <div key={index} className="option option-print" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                  {['①', '②', '③', '④', '⑤'][index]} {option}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (printMode === 'with-answer') {
    // 정답 모드에서의 동적 페이지분할 로직
    const firstPageContentHeight = titleHeight + passageHeight + optionsHeight + answerHeight + 
      (A4_CONFIG.MARGIN_BETWEEN_SECTIONS * 3);
    
    // 전체 콘텐츠 높이 (본문해석 포함)
    const totalContentHeight = firstPageContentHeight + translationHeight + A4_CONFIG.MARGIN_BETWEEN_SECTIONS;
    
    // 1페이지에 모든 내용이 들어갈 수 있는지 확인
    const canFitInOnePage = totalContentHeight <= A4_CONFIG.CONTENT_HEIGHT;
    
    // 1페이지에 문제+정답만 들어갈 수 있는지 확인
    const needsAnswerSecondPage = firstPageContentHeight > A4_CONFIG.CONTENT_HEIGHT;
    
    console.log('🔍 Work05 정답 모드 페이지분할:', {
      firstPageContentHeight,
      translationHeight,
      totalContentHeight,
      contentHeight: A4_CONFIG.CONTENT_HEIGHT,
      canFitInOnePage,
      needsAnswerSecondPage,
      decision: canFitInOnePage ? '1페이지' : (needsAnswerSecondPage ? '3페이지' : '2페이지')
    });

    return (
      <div className="only-print print-answer-mode work-05-print">
        {canFitInOnePage ? (
          // 1페이지: 모든 내용 (문제+정답+본문해석)
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#05</span>
              </div>
              <div className="problem-passage package01-work05-passage" style={{marginTop:'0.1rem', marginBottom:'0.5rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'0', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work05Data.blankedText}
              </div>
                {work05Data.options.map((option, index) => (
                <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', marginBottom: index === work05Data.options.length - 1 ? '1rem' : '0', display:'block', width:'100%', clear:'both'}}>
                      {['①', '②', '③', '④', '⑤'][index]} {option}
                      {work05Data.answerIndex === index && (
                    <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                    {work05Data.optionTranslations && work05Data.optionTranslations[index] && (
                    <>
                      <br />
                      <span style={{fontSize:'0.85rem', color:'#666', marginLeft:'0', paddingLeft:'0', fontStyle:'italic', lineHeight:'1.2', display:'block'}}>
                        {work05Data.optionTranslations[index]}
                      </span>
                    </>
                    )}
                  </div>
                ))}
              {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
            </div>
          </div>
        ) : needsAnswerSecondPage ? (
          // 3페이지 분할: 문제+정답, 본문해석
          <>
            {/* 1페이지: 문제 + 정답 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#05</span>
                  </div>
                  <div className="problem-passage package01-work05-passage" style={{marginTop:'0.1rem', marginBottom:'0.5rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'0', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                    {work05Data.blankedText}
                  </div>
                    {work05Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', marginBottom: index === work05Data.options.length - 1 ? '1rem' : '0', display:'block', width:'100%', clear:'both'}}>
                          {['①', '②', '③', '④', '⑤'][index]} {option}
                          {work05Data.answerIndex === index && (
                      <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                          )}
                        {work05Data.optionTranslations && work05Data.optionTranslations[index] && (
                      <>
                        <br />
                        <span style={{fontSize:'0.85rem', color:'#666', marginLeft:'0', paddingLeft:'0', fontStyle:'italic', lineHeight:'1.2', display:'block'}}>
                            {work05Data.optionTranslations[index]}
                        </span>
                      </>
                        )}
                      </div>
                    ))}
              </div>
            </div>

            {/* 2페이지: 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
          </>
        ) : (
          // 2페이지: 문제+정답 (본문해석 제거)
          <>
            {/* 1페이지: 문제 + 정답 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#05</span>
                  </div>
                  <div className="problem-passage package01-work05-passage" style={{marginTop:'0.1rem', marginBottom:'0.5rem', fontSize:'0.9rem', padding:'1rem', background:'#f7f8fc', borderRadius:'0', border:'1.5px solid #e3e6f0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                    {work05Data.blankedText}
                  </div>
                    {work05Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', marginBottom: index === work05Data.options.length - 1 ? '1rem' : '0', display:'block', width:'100%', clear:'both'}}>
                          {['①', '②', '③', '④', '⑤'][index]} {option}
                          {work05Data.answerIndex === index && (
                      <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                          )}
                        {work05Data.optionTranslations && work05Data.optionTranslations[index] && (
                      <>
                        <br />
                        <span style={{fontSize:'0.85rem', color:'#666', marginLeft:'0', paddingLeft:'0', fontStyle:'italic', lineHeight:'1.2', display:'block'}}>
                            {work05Data.optionTranslations[index]}
                        </span>
                      </>
                        )}
                      </div>
                    ))}
              </div>
            </div>

            {/* 2페이지: 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
          </>
        )}
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
  // A4 페이지 설정 (원래 유형#06과 동일)
  const A4_CONFIG = {
    // 실제 A4 크기: 210mm × 297mm = 794px × 1123px (96 DPI)
    PAGE_WIDTH: 794,          // px (210mm * 3.78px/mm)
    PAGE_HEIGHT: 1123,        // px (297mm * 3.78px/mm)
    
    // 인쇄 여백 (실제 인쇄 시 표준 여백)
    TOP_MARGIN: 25,           // px (6.6mm)
    BOTTOM_MARGIN: 25,        // px (6.6mm)
    LEFT_MARGIN: 20,          // px (5.3mm)
    RIGHT_MARGIN: 20,         // px (5.3mm)
    
    // 헤더/푸터 영역
    HEADER_HEIGHT: 30,        // px (8mm)
    FOOTER_HEIGHT: 20,        // px (5.3mm)
    
    // 콘텐츠 영역 계산
    CONTENT_WIDTH: 754,       // px (794 - 20 - 20)
    CONTENT_HEIGHT: 1048,     // px (1123 - 25 - 25 - 30 - 20)
    
    // 섹션별 높이 설정
    INSTRUCTION_HEIGHT: 30,   // px
    INSTRUCTION_MARGIN: 11,   // px
    TRANSLATION_HEADER_HEIGHT: 30,  // px
    TRANSLATION_HEADER_MARGIN: 11,  // px
    ANSWER_HEADER_HEIGHT: 30,       // px
    ANSWER_HEADER_MARGIN: 11,       // px
  };

  // 컨테이너 높이 계산 함수 (원래 유형#06과 동일)
  const calculateContainerHeight = (text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number => {
    // 실제 A4 콘텐츠 너비 사용 (754px - 좌우 패딩 40px = 714px)
    const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40; // px
    const charWidthPx = fontSize * 0.55; // px 단위 문자 폭
    const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
    const lines = Math.ceil(text.length / charsPerLine);
    return (lines * fontSize * lineHeight) + padding; // px 단위로 반환
  };

  // 페이지 분할 계산 (원래 유형#06과 동일한 로직)
  const calculatePageLayout = () => {
    // A. 문제제목 + 주요문장 + 영어본문 + 정답 컨테이너
    const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN; // 41px
    const missingSentenceHeight = calculateContainerHeight(`주요 문장: ${work06Data.missingSentence}`, 38, 16, 1.7);
    const englishPassageHeight = calculateContainerHeight(work06Data.numberedPassage, 38, 16, 1.7);
    const answerText = `정답: ${`①②③④⑤`[work06Data.answerIndex] || work06Data.answerIndex+1}`;
    const answerHeight = calculateContainerHeight(answerText, 38, 16, 1.7);
    const sectionAHeight = problemTitleHeight + missingSentenceHeight + englishPassageHeight + answerHeight;

    // B. 본문해석 제목 + 한글해석 컨테이너
    const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT + A4_CONFIG.TRANSLATION_HEADER_MARGIN; // 41px
    const finalTranslatedText = work06Data.translation || translatedText || '본문 해석이 생성되지 않았습니다.';
    const translationHeight = calculateContainerHeight(finalTranslatedText, 38, 16, 1.7);
    const sectionBHeight = translationHeaderHeight + translationHeight;

    // 이용 가능한 공간 계산 (실제 A4 크기 기준)
    const availableHeight = A4_CONFIG.CONTENT_HEIGHT; // 1048px
    const safetyMargin = 50; // px (실제 A4 기준 적절한 여백)
    const effectiveAvailableHeight = availableHeight - safetyMargin; // 998px

    const totalHeight = sectionAHeight + sectionBHeight;

    console.log('📊 패키지#01-유형#06 페이지 분할 계산:', {
      sectionAHeight: sectionAHeight.toFixed(2) + 'px',
      sectionBHeight: sectionBHeight.toFixed(2) + 'px',
      totalHeight: totalHeight.toFixed(2) + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
      quizTextLength: work06Data.numberedPassage.length,
      translationTextLength: finalTranslatedText.length
    });

    // 실제 A4 크기 기준 검증
    console.log('🔍 패키지#01-유형#06 A4 크기 기준 계산:', {
      A4_SIZE: '210mm × 297mm = 794px × 1123px (96 DPI)',
      CONTENT_AREA: A4_CONFIG.CONTENT_WIDTH + 'px × ' + A4_CONFIG.CONTENT_HEIGHT + 'px',
      TOP_MARGIN: A4_CONFIG.TOP_MARGIN + 'px',
      BOTTOM_MARGIN: A4_CONFIG.BOTTOM_MARGIN + 'px',
      LEFT_MARGIN: A4_CONFIG.LEFT_MARGIN + 'px',
      RIGHT_MARGIN: A4_CONFIG.RIGHT_MARGIN + 'px',
      HEADER_HEIGHT: A4_CONFIG.HEADER_HEIGHT + 'px',
      FOOTER_HEIGHT: A4_CONFIG.FOOTER_HEIGHT + 'px',
      availableHeight: availableHeight + 'px',
      safetyMargin: safetyMargin + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight + 'px'
    });

    // 페이지 분할 로직 (유형#06 전용 2가지 케이스)
    if (totalHeight <= effectiveAvailableHeight) {
      // 케이스 1: A+B ≤ 998px → 1페이지에 A, B 모두 포함
      return {
        needsSecondPage: false,
        needsThirdPage: false,
        page1Content: 'A+B',
        page2Content: null,
        page3Content: null
      };
    } else {
      // 케이스 2: A+B > 998px → 1페이지에 A, 2페이지에 B
      return {
        needsSecondPage: true,
        needsThirdPage: false,
        page1Content: 'A',
        page2Content: 'B',
        page3Content: null
      };
    }
  };

  const pageLayoutInfo = calculatePageLayout();

  if (printMode === 'no-answer') {
    return (
      <div className="only-print work-06-print">
        {/* 1페이지: 모든 내용 (항상 1페이지만) */}
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="problem-instruction" data-work-type="06" style={{fontWeight:800, fontSize:'1rem !important', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#06</span>
            </div>
            <div className="missing-sentence-box" style={{border:'1px solid #222', borderRadius:'6px', background:'#ffffff', backgroundColor:'#ffffff', padding:'0.8em 1.2em', marginTop:'1rem', marginBottom:'1rem', marginLeft:'auto', marginRight:'auto', fontWeight:700, fontSize:'1rem !important', width:'98%'}}>
              <span style={{color:'#222'}}>주요 문장:</span> <span style={{color:'#000000'}}>{work06Data.missingSentence}</span>
            </div>
            <div style={{fontSize:'1rem !important', lineHeight:'1.7', margin:'0.3rem 0 0 0', background:'#ffffff', borderRadius:'0', padding:'1rem', fontFamily:'inherit', color:'#222', whiteSpace:'pre-line', border:'1.5px solid #ffffff'}}>
              {work06Data.numberedPassage}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (printMode === 'with-answer') {
    if (pageLayoutInfo.needsSecondPage) {
      // 2페이지 분할: 1페이지에 A, 2페이지에 B
      return (
        <div className="only-print print-answer-mode work-06-print">
          {/* 1페이지: 문제 + 정답 */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#06</span>
                </div>
                <div className="missing-sentence-box" style={{border:'2px solid #222', borderRadius:'6px', background:'#ffffff', backgroundColor:'#ffffff', padding:'0.8em 1.2em', marginTop:'1rem', marginBottom:'1rem', fontWeight:700, fontSize:'1rem !important'}}>
                  <span style={{color:'#222'}}>주요 문장:</span> <span style={{color:'#000000'}}>{work06Data.missingSentence}</span>
                </div>
                <div className="package01-work06-passage" style={{fontSize:'1rem !important', lineHeight:'1.7', margin:'0.3rem 0 0.3rem 0', background:'#ffffff', borderRadius:'0', padding:'1rem', fontFamily:'inherit', color:'#222', whiteSpace:'pre-line', border:'1.5px solid #e3e6f0'}}>
                  {work06Data.numberedPassage}
                </div>
                <div className="problem-answer package01-work06-answer" style={{marginTop:'0.3rem', marginBottom:'0.3rem', color:'#000', fontWeight:700, fontSize:'1rem !important', backgroundColor:'#f5f5f5', background:'#f5f5f5', padding:'0.5rem 1rem', borderRadius:'0'}}>
                  정답: {`①②③④⑤`[work06Data.answerIndex] || work06Data.answerIndex + 1}
                </div>
              </div>
            </div>
          </div>

          {/* 2페이지: 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
        </div>
      );
    } else {
      // 1페이지: 모든 내용 (A+B)
      return (
        <div className="only-print print-answer-mode work-06-print">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#06</span>
              </div>
                <div className="missing-sentence-box" style={{border:'2px solid #222', borderRadius:'6px', background:'#ffffff', backgroundColor:'#ffffff', padding:'0.8em 1.2em', marginTop:'1rem', marginBottom:'1rem', fontWeight:700, fontSize:'1rem !important'}}>
                  <span style={{color:'#222'}}>주요 문장:</span> <span style={{color:'#000000'}}>{work06Data.missingSentence}</span>
                </div>
              <div className="package01-work06-passage" style={{fontSize:'1rem !important', lineHeight:'1.7', margin:'0.3rem 0 0.3rem 0', background:'#ffffff', borderRadius:'0', padding:'1rem', fontFamily:'inherit', color:'#222', whiteSpace:'pre-line', border:'1.5px solid #e3e6f0'}}>
                {work06Data.numberedPassage}
              </div>
              <div className="problem-answer package01-work06-answer" style={{marginTop:'0.3rem', marginBottom:'0.3rem', color:'#000', fontWeight:700, fontSize:'1rem !important', backgroundColor:'#f5f5f5', background:'#f5f5f5', padding:'0.5rem 1rem', borderRadius:'0'}}>
                정답: {`①②③④⑤`[work06Data.answerIndex] || work06Data.answerIndex + 1}
              </div>
              {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
            </div>
          </div>
        </div>
      );
    }
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
    // A4 페이지 설정 (원래 유형#07과 동일)
    const A4_CONFIG = {
      PAGE_WIDTH: 794,          // px (210mm * 3.78px/mm)
      PAGE_HEIGHT: 1123,        // px (297mm * 3.78px/mm)
      TOP_MARGIN: 25,           // px (6.6mm)
      BOTTOM_MARGIN: 25,        // px (6.6mm)
      LEFT_MARGIN: 20,          // px (5.3mm)
      RIGHT_MARGIN: 20,         // px (5.3mm)
      HEADER_HEIGHT: 30,        // px (8mm)
      FOOTER_HEIGHT: 20,        // px (5.3mm)
      CONTENT_WIDTH: 754,       // px (794 - 20 - 20)
      CONTENT_HEIGHT: 1048,     // px (1123 - 25 - 25 - 30 - 20)
      INSTRUCTION_HEIGHT: 30,   // px
      INSTRUCTION_MARGIN: 11,   // px
    };

    // 텍스트 높이 계산 함수 (원래 유형#07과 동일)
    const calculateContainerHeight = (text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number => {
      const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40; // px
      const charWidthPx = fontSize * 0.55; // px 단위 문자 폭
      const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
      const lines = Math.ceil(text.length / charsPerLine);
      return (lines * fontSize * lineHeight) + padding; // px 단위로 반환
    };

    // 동적 페이지 분할 계산 (원래 유형#07과 동일한 로직)
    const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN; // 41px
    const englishPassageHeight = calculateContainerHeight(work07Data.passage, 38, 16, 1.7);
    let optionsHeight = 0;
    work07Data.options.forEach(option => {
      optionsHeight += calculateContainerHeight(option, 11, 16, 1.3);
    });
    
    const sectionAHeight = problemTitleHeight + englishPassageHeight;
    const sectionBHeight = optionsHeight;
    
    const availableHeight = A4_CONFIG.CONTENT_HEIGHT; // 1048px
    const safetyMargin = 50; // px
    const effectiveAvailableHeight = availableHeight - safetyMargin; // 998px
    const totalHeight = sectionAHeight + sectionBHeight;

    console.log('📊 패키지#01-유형#07 인쇄(문제) 페이지 분할 계산:', {
      sectionAHeight: sectionAHeight.toFixed(2) + 'px',
      sectionBHeight: sectionBHeight.toFixed(2) + 'px',
      totalHeight: totalHeight.toFixed(2) + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
      quizTextLength: work07Data.passage.length
    });

    const needsSecondPage = totalHeight > effectiveAvailableHeight;
    
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
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#07</span>
              </div>
                  <div className="problem-passage" style={{marginTop:'0.1rem', fontSize:'1rem'}}>
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
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#07</span>
                </div>
                {work07Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                    {['①', '②', '③', '④', '⑤'][index]} {option}
                  </div>
                ))}
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
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#07</span>
              </div>
              <div className="problem-passage" style={{marginTop:'0.1rem', fontSize:'1rem'}}>
                {work07Data.passage}
              </div>
              {work07Data.options.map((option, index) => (
                <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                  {['①', '②', '③', '④', '⑤'][index]} {option}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 인쇄용 문제 (정답 포함) - 본문해석 포함
  if (printMode === 'with-answer') {
    // A4 페이지 설정 (원래 유형#07과 동일)
    const A4_CONFIG = {
      PAGE_WIDTH: 794,          // px (210mm * 3.78px/mm)
      PAGE_HEIGHT: 1123,        // px (297mm * 3.78px/mm)
      TOP_MARGIN: 25,           // px (6.6mm)
      BOTTOM_MARGIN: 25,        // px (6.6mm)
      LEFT_MARGIN: 20,          // px (5.3mm)
      RIGHT_MARGIN: 20,         // px (5.3mm)
      HEADER_HEIGHT: 30,        // px (8mm)
      FOOTER_HEIGHT: 20,        // px (5.3mm)
      CONTENT_WIDTH: 754,       // px (794 - 20 - 20)
      CONTENT_HEIGHT: 1048,     // px (1123 - 25 - 25 - 30 - 20)
      INSTRUCTION_HEIGHT: 30,   // px
      INSTRUCTION_MARGIN: 11,   // px
      TRANSLATION_HEADER_HEIGHT: 30,  // px
      TRANSLATION_HEADER_MARGIN: 11,  // px
      OPTIONS_HEADER_HEIGHT: 30,      // px
      OPTIONS_HEADER_MARGIN: 11,      // px
    };

    // 텍스트 높이 계산 함수 (원래 유형#07과 동일)
    const calculateContainerHeight = (text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number => {
      const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40; // px
      const charWidthPx = fontSize * 0.55; // px 단위 문자 폭
      const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
      const lines = Math.ceil(text.length / charsPerLine);
      return (lines * fontSize * lineHeight) + padding; // px 단위로 반환
    };

    // 동적 페이지 분할 계산 (요청된 4가지 케이스 로직)
    // A. 문제 제목 + 영어 본문 컨테이너
    const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN; // 41px
    const englishPassageHeight = calculateContainerHeight(work07Data.passage, 38, 16, 1.7);
    const sectionAHeight = problemTitleHeight + englishPassageHeight;

    // B. 4지선다 선택항목 컨테이너
    const optionsHeaderHeight = A4_CONFIG.OPTIONS_HEADER_HEIGHT + A4_CONFIG.OPTIONS_HEADER_MARGIN; // 41px
    let optionsHeight = 0;
    work07Data.options.forEach(option => {
      optionsHeight += calculateContainerHeight(`${option} (정답)`, 11, 16, 1.3);
    });
    const sectionBHeight = optionsHeaderHeight + optionsHeight;

    // C. 본문해석 제목 + 한글 해석 컨테이너
    const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT + A4_CONFIG.TRANSLATION_HEADER_MARGIN; // 41px
    const translationHeight = calculateContainerHeight(translatedText || '번역을 생성하는 중...', 38, 16, 1.7);
    const sectionCHeight = translationHeaderHeight + translationHeight;
    
    const availableHeight = A4_CONFIG.CONTENT_HEIGHT; // 1048px
    const safetyMargin = 50; // px
    const effectiveAvailableHeight = availableHeight - safetyMargin; // 998px
    const totalHeight = sectionAHeight + sectionBHeight + sectionCHeight;

    console.log('📊 패키지#01-유형#07 인쇄(정답) 페이지 분할 계산:', {
      availableHeight: availableHeight.toFixed(2) + 'px',
      sectionAHeight: sectionAHeight.toFixed(2) + 'px',
      sectionBHeight: sectionBHeight.toFixed(2) + 'px',
      sectionCHeight: sectionCHeight.toFixed(2) + 'px',
      totalHeight: totalHeight.toFixed(2) + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
      quizTextLength: work07Data.passage.length,
      translationTextLength: (translatedText || '').length
    });

    // 페이지 분할 로직 (요청된 4가지 케이스)
    let pageLayoutInfo = {
      needsSecondPage: false,
      needsThirdPage: false,
      page1Content: '',
      page2Content: '',
      page3Content: ''
    };

    if (totalHeight <= effectiveAvailableHeight) {
      // 케이스 1: A+B+C ≤ 998px → 1페이지에 A, B, C 모두 포함
      pageLayoutInfo = {
        needsSecondPage: false,
        needsThirdPage: false,
        page1Content: 'A+B+C',
        page2Content: '',
        page3Content: ''
      };
    } else if (sectionAHeight + sectionBHeight <= effectiveAvailableHeight) {
      // 케이스 2: A+B+C > 998px, A+B ≤ 998px → 1페이지에 A+B 포함, 2페이지에 C 포함
      pageLayoutInfo = {
        needsSecondPage: true,
        needsThirdPage: false,
        page1Content: 'A+B',
        page2Content: 'C',
        page3Content: ''
      };
    } else if (sectionAHeight <= effectiveAvailableHeight) {
      // 케이스 3: A+B+C > 998px, A+B > 998px, A ≤ 998px → 1페이지에 A 포함, 2페이지에 B+C 포함
      pageLayoutInfo = {
        needsSecondPage: true,
        needsThirdPage: false,
        page1Content: 'A',
        page2Content: 'B+C',
        page3Content: ''
      };
    } else {
      // 케이스 4: A+B+C > 998px, A+B > 998px, A > 998px → 1페이지에 A 포함, 2페이지에 B 포함, 3페이지에 C 포함
      pageLayoutInfo = {
        needsSecondPage: true,
        needsThirdPage: true,
        page1Content: 'A',
        page2Content: 'B',
        page3Content: 'C'
      };
    }

    // 원래 유형#07과 동일한 스타일 정의
    const commonStyles = {
      instruction: {fontWeight:800, fontSize:'0.9rem !important', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'1.2rem', display:'block', width:'100%'},
      passage: {marginTop:'0.1rem', fontSize:'0.9rem', padding:'1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'},
      options: {margin:'1rem 0'},
      option: {fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', display:'block', width:'100%', clear:'both' as const},
      optionTranslation: {fontSize:'0.85rem', color:'#666', marginLeft:'0', paddingLeft:'0', fontStyle:'italic', lineHeight:'1.2', display:'block'},
      translation: {marginTop:'0.1rem', fontSize:'1rem !important', padding:'1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}
    };

    // 페이지 분할 로직에 따른 렌더링
    if (pageLayoutInfo.page1Content === 'A+B+C') {
      // 케이스 1: 1페이지에 A, B, C 모두 포함
      return (
        <div className="only-print work-07-print">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              {/* A. 문제 제목 + 영어 본문 */}
              <div className="problem-instruction" style={{...commonStyles.instruction, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span>다음 글의 주제로 가장 적절한 것을 고르시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#07</span>
              </div>
              <div style={commonStyles.passage}>
                {work07Data.passage}
              </div>

              {/* B. 4지선다 선택항목 */}
                {work07Data.options.map((opt, i) => (
                <div key={i} className="option" style={commonStyles.option}>
                      {`①②③④⑤`[i] || `${i+1}.`} {opt}
                      {work07Data.answerIndex === i && (
                    <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                  {work07Data.optionTranslations && work07Data.optionTranslations[i] && (
                    <>
                      <br />
                      <span style={commonStyles.optionTranslation}>
                        {work07Data.optionTranslations[i]}
                      </span>
                    </>
                  )}
                  </div>
                ))}

              {/* C. 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
            </div>
          </div>
        </div>
      );
    } else if (pageLayoutInfo.page1Content === 'A+B') {
      // 케이스 2: 1페이지에 A+B, 2페이지에 C
      return (
        <div className="only-print work-07-print">
          {/* 1페이지: A + B */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              {/* A. 문제 제목 + 영어 본문 */}
              <div className="problem-instruction" style={{...commonStyles.instruction, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span>다음 글의 주제로 가장 적절한 것을 고르시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#07</span>
              </div>
              <div style={commonStyles.passage}>
                {work07Data.passage}
              </div>

              {/* B. 4지선다 선택항목 */}
                {work07Data.options.map((opt, i) => (
                <div key={i} className="option" style={commonStyles.option}>
                      {`①②③④⑤`[i] || `${i+1}.`} {opt}
                      {work07Data.answerIndex === i && (
                    <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                  {work07Data.optionTranslations && work07Data.optionTranslations[i] && (
                    <>
                      <br />
                      <span style={commonStyles.optionTranslation}>
                        {work07Data.optionTranslations[i]}
                      </span>
                    </>
                  )}
                  </div>
                ))}
            </div>
          </div>

          {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
        </div>
      );
    } else if (pageLayoutInfo.page1Content === 'A') {
      if (pageLayoutInfo.page2Content === 'B+C') {
        // 케이스 3: 1페이지에 A, 2페이지에 B+C
        return (
          <div className="only-print work-07-print">
            {/* 1페이지: A */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{...commonStyles.instruction, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span>다음 글의 주제로 가장 적절한 것을 고르시오.</span>
                  </div>
                  <div style={commonStyles.passage}>
                    {work07Data.passage}
                  </div>
                </div>
              </div>
            </div>

            {/* 2페이지: B + C */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                {/* B. 4지선다 선택항목 */}
                  {work07Data.options.map((opt, i) => (
                  <div key={i} className="option" style={commonStyles.option}>
                        {`①②③④⑤`[i] || `${i+1}.`} {opt}
                        {work07Data.answerIndex === i && (
                      <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                        )}
                    {work07Data.optionTranslations && work07Data.optionTranslations[i] && (
                      <div style={commonStyles.optionTranslation}>
                        {work07Data.optionTranslations[i]}
                      </div>
                    )}
                    </div>
                  ))}

                {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
              </div>
            </div>
          </div>
        );
      } else {
        // 케이스 4: 1페이지에 A, 2페이지에 B, 3페이지에 C
        return (
          <div className="only-print work-07-print">
            {/* 1페이지: A */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{...commonStyles.instruction, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span>다음 글의 주제로 가장 적절한 것을 고르시오.</span>
                  </div>
                  <div style={commonStyles.passage}>
                    {work07Data.passage}
                  </div>
                </div>
              </div>
            </div>

            {/* 2페이지: B */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                  {work07Data.options.map((opt, i) => (
                  <div key={i} className="option" style={commonStyles.option}>
                        {`①②③④⑤`[i] || `${i+1}.`} {opt}
                        {work07Data.answerIndex === i && (
                      <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                        )}
                    {work07Data.optionTranslations && work07Data.optionTranslations[i] && (
                      <div style={commonStyles.optionTranslation}>
                        {work07Data.optionTranslations[i]}
                      </div>
                    )}
                    </div>
                  ))}
              </div>
            </div>

            {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
          </div>
        );
      }
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
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 본문에 가장 적합한 제목을 고르세요.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#08</span>
              </div>
                  <div className="problem-passage" style={{marginTop:'0.1rem', fontSize:'0.9rem'}}>
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
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', marginTop:'0.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 본문에 가장 적합한 제목을 고르세요.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#08</span>
                </div>
                {work08Data.options.map((option, index) => (
                  <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                    {['①', '②', '③', '④', '⑤'][index]} {option}
                  </div>
                ))}
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
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 글의 제목으로 가장 적절한 것을 고르시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#08</span>
              </div>
              <div style={{marginTop:'0.1rem', fontSize:'1rem !important', padding:'1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                {work08Data.passage}
              </div>
              {work08Data.options.map((option, index) => (
                <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                  {['①', '②', '③', '④', '⑤'][index]} {option}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 인쇄용 문제 (정답 포함) - 본문해석 포함
  if (printMode === 'with-answer') {
    // A4 페이지 설정 (유형#07과 동일)
    const A4_CONFIG = {
      PAGE_WIDTH: 794,          // px (210mm * 3.78px/mm)
      PAGE_HEIGHT: 1123,        // px (297mm * 3.78px/mm)
      TOP_MARGIN: 25,           // px (6.6mm)
      BOTTOM_MARGIN: 25,        // px (6.6mm)
      LEFT_MARGIN: 20,          // px (5.3mm)
      RIGHT_MARGIN: 20,         // px (5.3mm)
      HEADER_HEIGHT: 30,        // px (8mm)
      FOOTER_HEIGHT: 20,        // px (5.3mm)
      CONTENT_WIDTH: 754,       // px (794 - 20 - 20)
      CONTENT_HEIGHT: 1048,     // px (1123 - 25 - 25 - 30 - 20)
      INSTRUCTION_HEIGHT: 30,   // px
      INSTRUCTION_MARGIN: 11,   // px
      TRANSLATION_HEADER_HEIGHT: 30,  // px
      TRANSLATION_HEADER_MARGIN: 11,  // px
      OPTIONS_HEADER_HEIGHT: 30,      // px
      OPTIONS_HEADER_MARGIN: 11,      // px
    };

    // 텍스트 높이 계산 함수 (유형#07과 동일)
    const calculateContainerHeight = (text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number => {
      const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40; // px
      const charWidthPx = fontSize * 0.55; // px 단위 문자 폭
      const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
      const lines = Math.ceil(text.length / charsPerLine);
      return (lines * fontSize * lineHeight) + padding; // px 단위로 반환
    };

    // 동적 페이지 분할 계산 (유형#07과 동일한 4가지 케이스 로직)
    // A. 문제 제목 + 영어 본문 컨테이너
    const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN; // 41px
    const englishPassageHeight = calculateContainerHeight(work08Data.passage, 16, 16, 1.7); // 유형#09와 동일하게 수정
    const sectionAHeight = problemTitleHeight + englishPassageHeight;

    // B. 4지선다 선택항목 컨테이너
    const optionsHeaderHeight = A4_CONFIG.OPTIONS_HEADER_HEIGHT + A4_CONFIG.OPTIONS_HEADER_MARGIN; // 41px
    let optionsHeight = 0;
    work08Data.options.forEach(option => {
      optionsHeight += calculateContainerHeight(`${option} (정답)`, 11, 16, 1.3);
    });
    const sectionBHeight = optionsHeaderHeight + optionsHeight;

    // C. 본문해석 제목 + 한글 해석 컨테이너
    const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT + A4_CONFIG.TRANSLATION_HEADER_MARGIN; // 41px
    const translationHeight = calculateContainerHeight(translatedText || '번역을 생성하는 중...', 32, 12.8, 1.7); // 유형#09와 동일하게 수정
    const sectionCHeight = translationHeaderHeight + translationHeight;
    
    const availableHeight = A4_CONFIG.CONTENT_HEIGHT; // 1048px
    const safetyMargin = 100; // px (유형#09와 동일하게 보수적 여백)
    const effectiveAvailableHeight = availableHeight - safetyMargin; // 948px
    const totalHeight = sectionAHeight + sectionBHeight + sectionCHeight;

    console.log('📊 패키지#01-유형#08 인쇄(정답) 페이지 분할 계산:', {
      availableHeight: availableHeight.toFixed(2) + 'px',
      sectionAHeight: sectionAHeight.toFixed(2) + 'px',
      sectionBHeight: sectionBHeight.toFixed(2) + 'px',
      sectionCHeight: sectionCHeight.toFixed(2) + 'px',
      totalHeight: totalHeight.toFixed(2) + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
      passageLength: work08Data.passage.length,
      translationTextLength: (translatedText || '').length
    });

    // 페이지 분할 로직 (유형#07과 동일한 4가지 케이스)
    let pageLayoutInfo = {
      needsSecondPage: false,
      needsThirdPage: false,
      page1Content: '',
      page2Content: '',
      page3Content: ''
    };

    if (totalHeight <= effectiveAvailableHeight) {
      // 케이스 1: A+B+C ≤ 948px → 1페이지에 A, B, C 모두 포함
      pageLayoutInfo = {
        needsSecondPage: false,
        needsThirdPage: false,
        page1Content: 'A+B+C',
        page2Content: '',
        page3Content: ''
      };
    } else if (sectionAHeight + sectionBHeight <= effectiveAvailableHeight) {
      // 케이스 2: A+B+C > 998px, A+B ≤ 998px → 1페이지에 A+B 포함, 2페이지에 C 포함
      pageLayoutInfo = {
        needsSecondPage: true,
        needsThirdPage: false,
        page1Content: 'A+B',
        page2Content: 'C',
        page3Content: ''
      };
    } else if (sectionAHeight <= effectiveAvailableHeight) {
      // 케이스 3: A+B+C > 998px, A+B > 998px, A ≤ 998px → 1페이지에 A 포함, 2페이지에 B+C 포함
      pageLayoutInfo = {
        needsSecondPage: true,
        needsThirdPage: false,
        page1Content: 'A',
        page2Content: 'B+C',
        page3Content: ''
      };
    } else {
      // 케이스 4: A+B+C > 948px, A+B > 948px, A > 948px → 1페이지에 A 포함, 2페이지에 B 포함, 3페이지에 C 포함
      pageLayoutInfo = {
        needsSecondPage: true,
        needsThirdPage: true,
        page1Content: 'A',
        page2Content: 'B',
        page3Content: 'C'
      };
    }

    // 유형#02-07과 동일한 표준 스타일 정의
    const commonStyles = {
      instruction: {fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'},
      passage: {marginTop:'0.1rem', fontSize:'1rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.5'},
      options: {margin:'1rem 0'},
      option: {fontSize:'1rem', margin:'0.3rem 0', paddingLeft:'0.3rem', paddingRight:'0.3rem', paddingTop:'0.4rem', paddingBottom:'0.4rem', fontFamily:'inherit', color:'#222'},
      translation: {marginTop:'0.1rem', fontSize:'1rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.5'}
    };

    // 페이지 분할 로직에 따른 렌더링 (유형#07과 동일한 4가지 케이스)
    if (pageLayoutInfo.page1Content === 'A+B+C') {
      // 케이스 1: 1페이지에 A, B, C 모두 포함
      return (
        <div className="only-print work-08-print">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              {/* A. 문제 제목 + 영어 본문 */}
              <div className="problem-instruction" data-work-type="08" style={commonStyles.instruction}>
                <span>다음 글의 제목으로 가장 적절한 것을 고르시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#08</span>
              </div>
              <div style={commonStyles.passage}>
                {work08Data.passage}
              </div>

              {/* B. 모든 4지선다 항목 표시 */}
              {work08Data.options.map((option: string, index: number) => (
                <div key={index} className="option" style={commonStyles.option}>
                  {`①②③④⑤`[index] || `${index+1}.`} {option}
                  {work08Data.answerIndex === index && (
                    <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                  )}
                  </div>
              ))}

              {/* C. 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
            </div>
          </div>
        </div>
      );
    } else if (pageLayoutInfo.page1Content === 'A+B') {
      // 케이스 2: 1페이지에 A+B, 2페이지에 C
      return (
        <div className="only-print work-08-print">
          {/* 1페이지: A + B */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              {/* A. 문제 제목 + 영어 본문 */}
              <div className="problem-instruction" data-work-type="08" style={commonStyles.instruction}>
                <span>다음 글의 제목으로 가장 적절한 것을 고르시오.</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#08</span>
              </div>
              <div style={commonStyles.passage}>
                {work08Data.passage}
              </div>

              {/* B. 모든 4지선다 항목 표시 */}
              {work08Data.options.map((option: string, index: number) => (
                <div key={index} className="option" style={commonStyles.option}>
                  {`①②③④⑤`[index] || `${index+1}.`} {option}
                  {work08Data.answerIndex === index && (
                    <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                  )}
                  </div>
              ))}
            </div>
          </div>

          {/* 2페이지: C */}
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="problem-passage translation" style={commonStyles.translation}>
                {translatedText}
              </div>
            </div>
          </div>
        </div>
      );
    } else if (pageLayoutInfo.page1Content === 'A') {
      if (pageLayoutInfo.page2Content === 'B+C') {
        // 케이스 3: 1페이지에 A, 2페이지에 B+C
        return (
          <div className="only-print work-08-print">
            {/* 1페이지: A */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={commonStyles.instruction}>
                    <span>다음 글의 제목으로 가장 적절한 것을 고르시오.</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#08</span>
                  </div>
                  <div style={commonStyles.passage}>
                    {work08Data.passage}
                  </div>
                </div>
              </div>
            </div>

            {/* 2페이지: B + C */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  {/* B. 모든 4지선다 항목 표시 */}
                  {work08Data.options.map((option: string, index: number) => (
                    <div key={index} className="option" style={commonStyles.option}>
                      {`①②③④⑤`[index] || `${index+1}.`} {option}
                      {work08Data.answerIndex === index && (
                        <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                      </div>
                  ))}

                  {/* C. 본문해석 제목 + 한글 해석 */}
                  <div className="problem-passage translation" style={commonStyles.translation}>
                    {translatedText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        // 케이스 4: 1페이지에 A, 2페이지에 B, 3페이지에 C
        return (
          <div className="only-print work-08-print">
            {/* 1페이지: A */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={commonStyles.instruction}>
                    <span>다음 글의 제목으로 가장 적절한 것을 고르시오.</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#08</span>
                  </div>
                  <div style={commonStyles.passage}>
                    {work08Data.passage}
                  </div>
                </div>
              </div>
            </div>

            {/* 2페이지: B */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  {work08Data.options.map((option: string, index: number) => (
                    <div key={index} className="option" style={commonStyles.option}>
                      {`①②③④⑤`[index] || `${index+1}.`} {option}
                      {work08Data.answerIndex === index && (
                        <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                      </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3페이지: C */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="problem-passage translation" data-work-type="08" style={commonStyles.translation}>
                  {translatedText}
                </div>
              </div>
            </div>
          </div>
        );
      }
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

  // A4 페이지 설정 (원래 유형#09과 동일)
  const A4_CONFIG = {
    PAGE_WIDTH: 794,
    PAGE_HEIGHT: 1123,
    TOP_MARGIN: 25,
    BOTTOM_MARGIN: 25,
    LEFT_MARGIN: 20,
    RIGHT_MARGIN: 20,
    HEADER_HEIGHT: 30,
    FOOTER_HEIGHT: 20,
    CONTENT_WIDTH: 754,
    CONTENT_HEIGHT: 1048,
    INSTRUCTION_HEIGHT: 30,
    INSTRUCTION_MARGIN: 11,
    OPTIONS_HEADER_HEIGHT: 30,
    OPTIONS_HEADER_MARGIN: 11,
    TRANSLATION_HEADER_HEIGHT: 30,
    TRANSLATION_HEADER_MARGIN: 11,
  };

  // 텍스트 높이 계산 함수 (원래 유형#09과 동일)
  const calculateContainerHeight = (text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number => {
    const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40;
    const charWidthPx = fontSize * 0.55;
    const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
    const lines = Math.ceil(text.length / charsPerLine);
    return (lines * fontSize * lineHeight) + padding;
  };

  // 동적 페이지 분할 계산 (유형#02와 동일한 로직)
  const availableHeight = A4_CONFIG.CONTENT_HEIGHT;
  const safetyMargin = 100; // 보수적 여백
  const effectiveAvailableHeight = availableHeight - safetyMargin; // 850px

  // A. 문제 제목 + 영어 본문 컨테이너
  const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN;
  const englishPassageHeight = calculateContainerHeight(work09Data.passage, 16, 16, 1.7);
  const sectionAHeight = problemTitleHeight + englishPassageHeight;

  // B. 4지선다 선택항목 컨테이너 (정답 항목만)
  const answerOptionHeight = calculateContainerHeight(`${work09Data.options[work09Data.answerIndex]} (정답)`, 11, 16, 1.3);
  const wrongWordText = printMode === 'with-answer' && work09Data.original && work09Data.options && work09Data.answerIndex !== undefined 
    ? `( 어법상 틀린 단어 : ${work09Data.options[work09Data.answerIndex]} → ${work09Data.original} )`
    : '';
  const originalWordHeight = wrongWordText ? calculateContainerHeight(wrongWordText, 11, 16, 1.3) : 0;
  const sectionBHeight = answerOptionHeight + originalWordHeight;

  // C. 본문해석 제목 + 한글 해석 컨테이너
  const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT + A4_CONFIG.TRANSLATION_HEADER_MARGIN;
  const translationHeight = calculateContainerHeight(translatedText || '번역을 생성하는 중...', 32, 12.8, 1.7);
  const sectionCHeight = translationHeaderHeight + translationHeight;

  const totalHeight = sectionAHeight + sectionBHeight + sectionCHeight;

  console.log('📊 패키지#01-유형#09 동적 페이지 분할 계산:', {
    availableHeight: availableHeight.toFixed(2) + 'px',
    sectionAHeight: sectionAHeight.toFixed(2) + 'px',
    sectionBHeight: sectionBHeight.toFixed(2) + 'px',
    sectionCHeight: sectionCHeight.toFixed(2) + 'px',
    totalHeight: totalHeight.toFixed(2) + 'px',
    effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
    passageLength: work09Data.passage.length,
    translationTextLength: (translatedText || '').length
  });

  // 페이지 분할 로직 (원래 유형#09과 동일한 4가지 케이스)
  let pageLayoutInfo = {
    needsSecondPage: false,
    needsThirdPage: false,
    page1Content: '',
    page2Content: '',
    page3Content: ''
  };

  if (totalHeight <= effectiveAvailableHeight) {
    // 케이스 1: A+B+C ≤ 948px → 1페이지에 모든 내용
    pageLayoutInfo = { needsSecondPage: false, needsThirdPage: false, page1Content: 'A+B+C', page2Content: '', page3Content: '' };
  } else if (sectionAHeight + sectionBHeight <= effectiveAvailableHeight) {
    // 케이스 2: A+B ≤ 948px → 1페이지에 A+B, 2페이지에 C
    pageLayoutInfo = { needsSecondPage: true, needsThirdPage: false, page1Content: 'A+B', page2Content: 'C', page3Content: '' };
  } else if (sectionAHeight <= effectiveAvailableHeight) {
    // 케이스 3: A ≤ 948px → 1페이지에 A, 2페이지에 B+C
    pageLayoutInfo = { needsSecondPage: true, needsThirdPage: false, page1Content: 'A', page2Content: 'B+C', page3Content: '' };
  } else {
    // 케이스 4: A > 948px → 1페이지에 A, 2페이지에 B, 3페이지에 C
    pageLayoutInfo = { needsSecondPage: true, needsThirdPage: true, page1Content: 'A', page2Content: 'B', page3Content: 'C' };
  }

  const needsSecondPage = pageLayoutInfo.needsSecondPage;
  const needsThirdPage = pageLayoutInfo.needsThirdPage;

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
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#09</span>
            </div>
            <div style={{marginTop:'0.1rem', fontSize:'1rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', border:'1px solid #ffffff', fontFamily:'inherit', color:'#222', lineHeight:'1.5'}}>
              <span dangerouslySetInnerHTML={{__html: (work09Data.passage || '').replace(/\n/g, '<br/>')}} />
            </div>
          </div>
            </div>

            {/* 두 번째 페이지: 객관식 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#09</span>
                </div>
                {work09Data.options.map((opt, i) => (
                  <div key={i} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                    {['①', '②', '③', '④', '⑤'][i]} {opt}
                  </div>
                ))}
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
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#09</span>
              </div>
              <div style={{marginTop:'0.1rem', fontSize:'1rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', border:'1px solid #ffffff', fontFamily:'inherit', color:'#222', lineHeight:'1.5'}}>
                <span dangerouslySetInnerHTML={{__html: (work09Data.passage || '').replace(/\n/g, '<br/>')}} />
              </div>
              {work09Data.options.map((opt, i) => (
                <div key={i} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem'}}>
                  {['①', '②', '③', '④', '⑤'][i]} {opt}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (printMode === 'with-answer') {
    if (needsSecondPage) {
      // 2페이지로 분할 - 유형#02와 동일한 단순한 구조
      return (
        <>
          {/* 1페이지: 문제 + 정답 */}
          <div className="only-print work-09-print">
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#09</span>
                  </div>
                  <div style={{marginTop:'0.1rem', fontSize:'1rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', border:'1px solid #ffffff', fontFamily:'inherit', color:'#222', lineHeight:'1.5'}}>
                    <span dangerouslySetInnerHTML={{__html: (work09Data.passage || '').replace(/\n/g, '<br/>')}} />
                  </div>
                  {work09Data.options.map((opt: string, i: number) => (
                    <div key={i} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', marginBottom: i === work09Data.options.length - 1 ? '1rem' : '0'}}>
                      {`①②③④⑤`[i] || `${i+1}.`} {opt}
                      {work09Data.answerIndex === i && (
                      <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                    </div>
                  ))}
                  {printMode === 'with-answer' && work09Data.original && work09Data.options && work09Data.answerIndex !== undefined && (
                    <div style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', color:'#000', fontWeight:700}}>
                      ( 어법상 틀린 단어 : {work09Data.options[work09Data.answerIndex]} → {work09Data.original} )
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2페이지: 한글 해석 */}
          <div className="only-print work-09-print">
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="problem-passage translation" style={{marginTop:'0.1rem', fontSize:'1rem', padding:'1rem', background:'#F1F8E9', borderRadius:'0', border:'1.5px solid #c8e6c9', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                  {translatedText || '번역을 생성하는 중...'}
                </div>
              </div>
            </div>
          </div>
        </>
      );
    } else {
      // 1페이지에 모든 내용 포함
      return (
        <div className="only-print work-09-print">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              {/* A. 문제 제목 + 영어 본문 컨테이너 */}
              <div className="problem-instruction" data-work-type="09" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#09</span>
              </div>
              <div style={{marginTop:'0.1rem', fontSize:'1rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', border:'1px solid #ffffff', fontFamily:'inherit', color:'#222', lineHeight:'1.5'}}>
                <span dangerouslySetInnerHTML={{__html: (work09Data.passage || '').replace(/\n/g, '<br/>')}} />
              </div>

              {/* B. 모든 4지선다 항목 표시 */}
              {work09Data.options.map((opt: string, i: number) => (
                <div key={i} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', marginBottom: i === work09Data.options.length - 1 ? '1rem' : '0'}}>
                  {`①②③④⑤`[i] || `${i+1}.`} {opt}
                  {work09Data.answerIndex === i && (
                  <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                  )}
                </div>
              ))}
              {printMode === 'with-answer' && work09Data.original && work09Data.options && work09Data.answerIndex !== undefined && (
                <div style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', color:'#000', fontWeight:700}}>
                  ( 어법상 틀린 단어 : {work09Data.options[work09Data.answerIndex]} → {work09Data.original} )
                </div>
              )}

              {/* C. 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
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

  // A4 페이지 설정 (원래 유형#10과 동일)
  const A4_CONFIG = {
    PAGE_WIDTH: 794,
    PAGE_HEIGHT: 1123,
    TOP_MARGIN: 25,
    BOTTOM_MARGIN: 25,
    LEFT_MARGIN: 20,
    RIGHT_MARGIN: 20,
    HEADER_HEIGHT: 30,
    FOOTER_HEIGHT: 20,
    CONTENT_WIDTH: 754,
    CONTENT_HEIGHT: 1048,
    INSTRUCTION_HEIGHT: 30,
    INSTRUCTION_MARGIN: 11,
    OPTIONS_HEADER_HEIGHT: 30,
    OPTIONS_HEADER_MARGIN: 11,
    TRANSLATION_HEADER_HEIGHT: 30,
    TRANSLATION_HEADER_MARGIN: 11,
  };

  // 텍스트 높이 계산 함수 (원래 유형#10과 동일)
  const calculateContainerHeight = (text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number => {
    const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40;
    const charWidthPx = fontSize * 0.55;
    const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
    const lines = Math.ceil(text.length / charsPerLine);
    return (lines * fontSize * lineHeight) + padding;
  };

  // 동적 페이지 분할 계산 (유형#02와 동일한 로직)
  const availableHeight = A4_CONFIG.CONTENT_HEIGHT;
  const safetyMargin = 100; // 보수적 여백
  const effectiveAvailableHeight = availableHeight - safetyMargin; // 850px

  // A. 문제 제목 + 영어 본문 컨테이너
  const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN;
  const englishPassageHeight = calculateContainerHeight(work10Data.passage, 16, 16, 1.7);
  const sectionAHeight = problemTitleHeight + englishPassageHeight;

  // B. 5지선다 선택항목 컨테이너 (정답만)
  const answerOptionHeight = calculateContainerHeight(`${work10Data.options[work10Data.answerIndex]}개 (정답)`, 11, 16, 1.3);
  const sectionBHeight = answerOptionHeight;

  // C. 본문해석 제목 + 한글 해석 컨테이너
  const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT + A4_CONFIG.TRANSLATION_HEADER_MARGIN;
  const translationHeight = calculateContainerHeight(translatedText || '번역을 생성하는 중...', 32, 12.8, 1.7);
  const sectionCHeight = translationHeaderHeight + translationHeight;

  const totalHeight = sectionAHeight + sectionBHeight + sectionCHeight;

  console.log('📊 패키지#01-유형#10 동적 페이지 분할 계산:', {
    availableHeight: availableHeight.toFixed(2) + 'px',
    sectionAHeight: sectionAHeight.toFixed(2) + 'px',
    sectionBHeight: sectionBHeight.toFixed(2) + 'px',
    sectionCHeight: sectionCHeight.toFixed(2) + 'px',
    totalHeight: totalHeight.toFixed(2) + 'px',
    effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
    passageLength: work10Data.passage.length,
    translationTextLength: (translatedText || '').length
  });

  // 페이지 분할 로직 (원래 유형#10과 동일한 4가지 케이스)
  let pageLayoutInfo = {
    needsSecondPage: false,
    needsThirdPage: false,
    page1Content: '',
    page2Content: '',
    page3Content: ''
  };

  if (totalHeight <= effectiveAvailableHeight) {
    // 케이스 1: A+B+C ≤ 948px → 1페이지에 모든 내용
    pageLayoutInfo = { needsSecondPage: false, needsThirdPage: false, page1Content: 'A+B+C', page2Content: '', page3Content: '' };
  } else if (sectionAHeight + sectionBHeight <= effectiveAvailableHeight) {
    // 케이스 2: A+B ≤ 948px → 1페이지에 A+B, 2페이지에 C
    if (sectionCHeight <= effectiveAvailableHeight) {
      pageLayoutInfo = { needsSecondPage: true, needsThirdPage: false, page1Content: 'A+B', page2Content: 'C', page3Content: '' };
    } else {
      pageLayoutInfo = { needsSecondPage: true, needsThirdPage: true, page1Content: 'A+B', page2Content: 'C-part1', page3Content: 'C-part2' };
    }
  } else if (sectionAHeight <= effectiveAvailableHeight) {
    // 케이스 3: A ≤ 948px → 1페이지에 A, 2페이지에 B+C
    if (sectionBHeight + sectionCHeight <= effectiveAvailableHeight) {
      pageLayoutInfo = { needsSecondPage: true, needsThirdPage: false, page1Content: 'A', page2Content: 'B+C', page3Content: '' };
    } else {
      pageLayoutInfo = { needsSecondPage: true, needsThirdPage: true, page1Content: 'A', page2Content: 'B', page3Content: 'C' };
    }
  } else {
    // 케이스 4: A > 948px → 1페이지에 A, 2페이지에 B, 3페이지에 C
    pageLayoutInfo = { needsSecondPage: true, needsThirdPage: true, page1Content: 'A', page2Content: 'B', page3Content: 'C' };
  }

  const needsSecondPage = pageLayoutInfo.needsSecondPage;
  const needsThirdPage = pageLayoutInfo.needsThirdPage;

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
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#10</span>
                  </div>
                  <div style={{marginTop:'0.1rem', fontSize:'0.2rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.5'}}>
                    <span dangerouslySetInnerHTML={{__html: (work10Data.passage || '').replace(/\n/g, '<br/>')}} />
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
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#10</span>
                  </div>
                  <div style={{marginTop:'0.1rem', fontSize:'0.2rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.5'}}>
                    <span dangerouslySetInnerHTML={{__html: (work10Data.passage || '').replace(/\n/g, '<br/>')}} />
                  </div>
                  {work10Data.options.map((option, index) => (
                    <div key={index} className="option" style={{
                      fontSize: '0.8rem',
                      marginTop: '0.5rem',
                      paddingLeft: '0.3rem',
                      paddingRight: '0.3rem',
            fontFamily: 'inherit',
                      color: '#222'
                    }}>
                      {`①②③④⑤⑥⑦⑧⑨`[index] || `${index + 1}`} {option}개
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
              <div className="problem-instruction" data-work-type="10" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.8rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#10</span>
              </div>
              <div style={{marginTop:'0.1rem', fontSize:'0.2rem', padding:'1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(work10Data.passage).replace(/\n/g, '<br/>')}} />
              </div>
              {work10Data.options.map((option, index) => (
                <div key={index} className="option" style={{
                  fontSize: '0.8rem',
                  marginTop: '0.5rem',
                  paddingLeft: '0.3rem',
                  paddingRight: '0.3rem',
                  fontFamily: 'inherit',
                  color: '#222'
                }}>
                  {`①②③④⑤⑥`[index] || `${index + 1}`} {option}개
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  } else {
    // with-answer 모드 - 유형#09와 동일한 단순한 구조
    if (needsSecondPage) {
      // 2페이지로 분할 - 유형#09와 동일한 단순한 구조
      return (
        <>
          {/* 1페이지: 문제 + 정답 */}
          <div className="only-print work-10-print">
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?</span>
                  </div>
                  <div style={{marginTop:'0.1rem', fontSize:'0.2rem', padding:'0.5rem 1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.5'}}>
                    <span dangerouslySetInnerHTML={{__html: (work10Data.passage || '').replace(/\n/g, '<br/>')}} />
                  </div>
                  {work10Data.options.map((option, index) => (
                    <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', marginBottom: index === work10Data.options.length - 1 ? '1rem' : '0', display:'block', width:'100%', clear:'both' as const}}>
                      {`①②③④⑤⑥⑦⑧⑨`[index] || `${index + 1}`} {option}개
                      {printMode === 'with-answer' && work10Data.answerIndex === index && (
                        <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                  </div>
                  ))}
                  {printMode === 'with-answer' && work10Data.wrongIndexes && work10Data.wrongIndexes.length > 0 && (
                    <div style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', color:'#000', fontWeight:700}}>
                      ( 어법상 틀린 단어 : {work10Data.wrongIndexes.map(idx => 
                        `${'①②③④⑤⑥⑦⑧'[idx]}${work10Data.transformedWords[idx]} → ${work10Data.originalWords[idx]}`
                      ).join(', ')} )
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2페이지: 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
        </>
      );
    } else {
      // 1페이지에 모든 내용 포함
      return (
        <div className="only-print work-10-print">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
              <div className="problem-instruction" style={{fontWeight:800, fontSize:'0.9rem', background:'#f5f5f5', color:'#000', padding:'0.7rem 0.5rem', borderRadius:'0', marginBottom:'0.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?</span>
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#10</span>
              </div>
              <div style={{marginTop:'0.1rem', fontSize:'0.2rem', padding:'1rem', background:'#ffffff', borderRadius:'0', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(work10Data.passage).replace(/\n/g, '<br/>')}} />
              </div>
              {work10Data.options.map((option, index) => (
                <div key={index} className="option" style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', marginBottom: index === work10Data.options.length - 1 ? '1rem' : '0', display:'block', width:'100%', clear:'both' as const}}>
                  {`①②③④⑤⑥`[index] || `${index + 1}`} {option}개
                  {printMode === 'with-answer' && work10Data.answerIndex === index && (
                    <span className="print-answer-mark" style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                  )}
              </div>
              ))}
              {printMode === 'with-answer' && work10Data.wrongIndexes && work10Data.wrongIndexes.length > 0 && (
                <div style={{fontSize:'0.9rem', marginTop:'0.5rem', paddingLeft:'0.3rem', paddingRight:'0.3rem', color:'#000', fontWeight:700}}>
                  ( 어법상 틀린 단어 : {work10Data.wrongIndexes.map(idx => 
                    `${'①②③④⑤⑥⑦⑧'[idx]}${work10Data.transformedWords[idx]} → ${work10Data.originalWords[idx]}`
                  ).join(', ')} )
                </div>
              )}
              {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
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

  // A4 페이지 설정 (유형#02, #09와 동일)
  const A4_CONFIG = {
    PAGE_WIDTH: 794,
    PAGE_HEIGHT: 1123,
    TOP_MARGIN: 25,
    BOTTOM_MARGIN: 25,
    LEFT_MARGIN: 20,
    RIGHT_MARGIN: 20,
    HEADER_HEIGHT: 100,
    FOOTER_HEIGHT: 20,
    CONTENT_WIDTH: 754,
    CONTENT_HEIGHT: 950,
    INSTRUCTION_HEIGHT: 30,
    INSTRUCTION_MARGIN: 11,
    TRANSLATION_HEADER_HEIGHT: 30,
    TRANSLATION_HEADER_MARGIN: 11,
  };

  // 텍스트 높이 계산 함수 (유형#02, #09와 동일)
  const calculateContainerHeight = (text: string, padding: number = 16, fontSize: number = 16, lineHeight: number = 1.7): number => {
    const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40;
    const charWidthPx = fontSize * 0.55;
    const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
    const lines = Math.ceil(text.length / charsPerLine);
    return (lines * fontSize * lineHeight) + padding;
  };

  // 동적 페이지 분할 계산 (유형#02, #09와 동일한 로직)
  const availableHeight = A4_CONFIG.CONTENT_HEIGHT;
  const safetyMargin = 50; // 여백을 줄여서 더 많은 공간 활용
  const effectiveAvailableHeight = availableHeight - safetyMargin; // 900px

  // A. 문제 제목 + 빈칸 본문 컨테이너
  const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN;
  const blankedTextHeight = calculateContainerHeight(work13Data.blankedText || '', 16, 16, 1.7);
  const sectionAHeight = problemTitleHeight + blankedTextHeight;

  // B. 정답 포함 본문 컨테이너 (with-answer 모드에서만)
  const answerTextHeight = printMode === 'with-answer' ? 
    calculateContainerHeight(work13Data.blankedText || '', 16, 16, 1.7) : 0;

  // C. 본문해석 컨테이너 (with-answer 모드에서만) - 유형#14와 동일한 계산
  const translationHeight = printMode === 'with-answer' ? 
    calculateContainerHeight(work13Data.translation || '', 16, 16, 1.7) : 0; // 유형#14와 동일한 계산

  const totalHeight = sectionAHeight + answerTextHeight + translationHeight;

  console.log('📊 패키지#01-유형#13 동적 페이지 분할 계산:', {
    printMode,
    availableHeight: availableHeight.toFixed(2) + 'px',
    sectionAHeight: sectionAHeight.toFixed(2) + 'px',
    answerTextHeight: answerTextHeight.toFixed(2) + 'px',
    translationHeight: translationHeight.toFixed(2) + 'px',
    totalHeight: totalHeight.toFixed(2) + 'px',
    effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
    blankedTextLength: (work13Data.blankedText || '').length,
    translationLength: (work13Data.translation || '').length
  });

  // 페이지 분할 결정
  const needsSecondPage = totalHeight > effectiveAvailableHeight;
  const needsAnswerSecondPage = printMode === 'with-answer' && needsSecondPage;

  // 정답을 포함한 텍스트 생성 함수 (HTML 스타일 적용) - 유형#14와 동일
  const createTextWithAnswers = (blankedText: string, correctAnswers: string[]): string => {
    console.log('🔍 Work13 createTextWithAnswers:', {
      blankedText: blankedText?.substring(0, 200) + '...',
      correctAnswers,
      correctAnswersLength: correctAnswers?.length
    });
    
    let result = blankedText;
    let answerIndex = 0;
    
    // 정답이 단어인지 문장인지 판단하는 함수 (공백 포함 여부로 판단)
    const isSentence = (answer: string): boolean => {
      return answer.includes(' ') || answer.length > 20;
    };
    
    // 다양한 빈칸 패턴을 찾아서 정답으로 교체 (검정색, 진하게 스타일 적용)
    // 패턴 0: ( _ _ _ _ _ ) - formatBlankedText로 변환된 형태 (공백 포함)
    result = result.replace(/\([\s_]+\)/g, () => {
      if (answerIndex < correctAnswers.length) {
        const answer = correctAnswers[answerIndex++];
        const isSent = isSentence(answer);
        // 단어: ( 단어 ), 문장: ( 문장 ) - 모두 진하게 처리
        return `( <span style="color: #000000; font-size: 0.9rem; font-weight: bold;">${answer}</span> )`;
      }
      return '( _ _ _ _ _ )';
    });
    
    // 패턴 1: (_{20,}[A-Z]_{20,}) - A, B, C 형태
    result = result.replace(/\(_{20,}[A-Z]_{20,}\)/g, () => {
      if (answerIndex < correctAnswers.length) {
        const answer = correctAnswers[answerIndex++];
        const isSent = isSentence(answer);
        // 단어: ( 단어 ), 문장: ( 문장 ) - 모두 진하게 처리
        return `( <span style="color: #000000; font-size: 0.9rem; font-weight: bold;">${answer}</span> )`;
      }
      return '(____________________A____________________)';
    });
    
    // 패턴 2: (__________) - 일반적인 밑줄 패턴
    result = result.replace(/\(_{10,}\)/g, () => {
      if (answerIndex < correctAnswers.length) {
        const answer = correctAnswers[answerIndex++];
        const isSent = isSentence(answer);
        // 단어: ( 단어 ), 문장: ( 문장 ) - 모두 진하게 처리
        return `( <span style="color: #000000; font-size: 0.9rem; font-weight: bold;">${answer}</span> )`;
      }
      return '(__________)';
    });
    
    return result;
  };

  if (printMode === 'no-answer') {
    // 문제만 인쇄
    return (
      <div className="only-print work-13-print">
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="problem-instruction" data-work-type="13" style={{
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
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#13</span>
            </div>
            <div className="package01-work13-problem-text" style={{
              marginTop: '0.9rem', 
              fontSize: '1rem !important', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              fontFamily: 'inherit', 
              color: '#222', 
              lineHeight: '1.5', 
              border: '2px solid #e3e6f0'
            }}>
              {formatBlankedText(
                work13Data.blankedText || '',
                work13Data.correctAnswers || []
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (printMode === 'with-answer') {
    // 정답 포함 인쇄 - 동적 페이지 분할 적용
    if (needsAnswerSecondPage) {
      // 2페이지로 분할 - 인쇄(정답) 모드에서는 정답 페이지만 표시
      return (
        <>
          {/* 1페이지: 정답 + 본문해석 (문제 페이지 제거) */}
          <div className="only-print print-answer-mode work-13-print">
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                <div className="problem-instruction" data-work-type="13" style={{
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
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#13</span>
                </div>
                <div className="package01-work13-answer-text package01-work13-passage" style={{
                  marginTop: '0.9rem', 
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem !important', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '8px', 
                  fontFamily: 'inherit', 
                  color: '#222', 
                  lineHeight: '1.5', 
                  border: '2px solid #e3e6f0'
                }} dangerouslySetInnerHTML={{__html: createTextWithAnswers(
                  formatBlankedText(work13Data.blankedText || '', work13Data.correctAnswers || []),
                  work13Data.correctAnswers || []
                )}}>
                </div>
                {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
              </div>
            </div>
          </div>
        </>
      );
    } else {
      // 1페이지에 모든 내용 포함
      return (
        <div className="only-print work-13-print">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
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
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#13</span>
              </div>
              <div className="package01-work13-answer-text package01-work13-passage" style={{
                marginTop: '0.9rem', 
                marginBottom: '0.75rem',
                fontSize: '0.9rem !important', 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                fontFamily: 'inherit', 
                color: '#222', 
                lineHeight: '1.5', 
                border: '2px solid #e3e6f0'
              }}>
                {(() => {
                  const formattedText = formatBlankedText(
                    work13Data.blankedText || '',
                    work13Data.correctAnswers || []
                  );
                  // formatBlankedText로 변환된 패턴: ( _ _ _ _ _ )
                  const parts = formattedText.split(/(\([\s_]+\))/);
                  let answerIndex = 0;
                  // 정답이 단어인지 문장인지 판단하는 함수 (공백 포함 여부로 판단)
                  const isSentence = (answer: string): boolean => {
                    return answer.includes(' ') || answer.length > 20;
                  };
                  return parts.map((part, index) => {
                    // ( _ _ _ _ _ ) 패턴을 찾아서 정답으로 교체
                    if (part.match(/^\([\s_]+\)$/)) {
                      const answer = work13Data.correctAnswers?.[answerIndex] || '정답 없음';
                      answerIndex++;
                      const isSent = isSentence(answer);
                      // 단어: ( 단어 ), 문장: ( 문장 ) - 모두 진하게 처리
                      return (
                        <span key={index} style={{color: '#1976d2', fontWeight: 'bold'}}>
                          ( {answer} )
                        </span>
                      );
                    }
                    return part;
                  });
                })()}
              </div>
              {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
};

// Work_14 빈칸 채우기 문제 (문장-주관식) 인쇄 컴포넌트
const PrintFormatPackage01Work14: React.FC<{
  work14Data: BlankQuiz;
  printMode: 'no-answer' | 'with-answer';
}> = ({ work14Data, printMode }) => {
  if (!work14Data) return null;

  // A4 페이지 설정 (유형#02, #09, #13와 동일)
  const A4_CONFIG = {
    PAGE_WIDTH: 794,
    PAGE_HEIGHT: 1123,
    TOP_MARGIN: 25,
    BOTTOM_MARGIN: 25,
    LEFT_MARGIN: 20,
    RIGHT_MARGIN: 20,
    HEADER_HEIGHT: 100,
    FOOTER_HEIGHT: 20,
    CONTENT_WIDTH: 754,
    CONTENT_HEIGHT: 950,
    INSTRUCTION_HEIGHT: 30,
    INSTRUCTION_MARGIN: 11,
    TRANSLATION_HEADER_HEIGHT: 30,
    TRANSLATION_HEADER_MARGIN: 11,
  };

  // 텍스트 높이 계산 함수 (유형#02, #09, #13와 동일)
  const calculateContainerHeight = (text: string, padding: number = 16, fontSize: number = 16, lineHeight: number = 1.7): number => {
    const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40;
    const charWidthPx = fontSize * 0.55;
    const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
    const lines = Math.ceil(text.length / charsPerLine);
    return (lines * fontSize * lineHeight) + padding;
  };

  // 동적 페이지 분할 계산 (유형#02, #09, #13와 동일한 로직)
  const availableHeight = A4_CONFIG.CONTENT_HEIGHT;
  const safetyMargin = 50; // 여백을 줄여서 더 많은 공간 활용
  const effectiveAvailableHeight = availableHeight - safetyMargin; // 900px

  // A. 문제 제목 + 빈칸 본문 컨테이너
  const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN;
  const blankedTextHeight = calculateContainerHeight(work14Data.blankedText || '', 16, 16, 1.7);
  const sectionAHeight = problemTitleHeight + blankedTextHeight;

  // B. 정답 포함 본문 컨테이너 (with-answer 모드에서만)
  const answerTextHeight = printMode === 'with-answer' ? 
    calculateContainerHeight(work14Data.blankedText || '', 16, 16, 1.7) : 0;

  // C. 본문해석 컨테이너 (with-answer 모드에서만) - 유형#13과 동일한 계산
  const translationHeight = printMode === 'with-answer' ? 
    calculateContainerHeight(work14Data.translation || '', 16, 16, 1.7) : 0; // 유형#13과 동일한 계산

  const totalHeight = sectionAHeight + answerTextHeight + translationHeight;

  console.log('📊 패키지#01-유형#14 동적 페이지 분할 계산:', {
    printMode,
    availableHeight: availableHeight.toFixed(2) + 'px',
    sectionAHeight: sectionAHeight.toFixed(2) + 'px',
    answerTextHeight: answerTextHeight.toFixed(2) + 'px',
    translationHeight: translationHeight.toFixed(2) + 'px',
    totalHeight: totalHeight.toFixed(2) + 'px',
    effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
    blankedTextLength: (work14Data.blankedText || '').length,
    translationLength: (work14Data.translation || '').length
  });

  // 페이지 분할 결정
  const needsSecondPage = totalHeight > effectiveAvailableHeight;
  const needsAnswerSecondPage = printMode === 'with-answer' && needsSecondPage;

  // 정답을 포함한 텍스트 생성 함수 (HTML 스타일 적용)
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

  const createTextWithAnswers = (blankedText: string, correctAnswers: string[]): string => {
    console.log('🔍 Work14 createTextWithAnswers:', {
      blankedText: blankedText?.substring(0, 200) + '...',
      correctAnswers,
      correctAnswersLength: correctAnswers?.length
    });
    
    let result = blankedText;
    
    if (correctAnswers.length === 0) {
      return result;
    }
    
    let answerIndex = 0;
    
    // 패턴 0: ( _ _ _ _ _ ) - formatBlankedText로 변환된 형태 (공백 포함)
    const blankPattern0 = /\([\s_]+\)/g;
    result = result.replace(blankPattern0, (match: string) => {
      if (answerIndex < correctAnswers.length) {
        const answer = cleanAnswer(correctAnswers[answerIndex]);
        answerIndex++;
        return `(<span style="color: #000000; font-weight: bold;">${answer}</span>)`;
      }
      return match;
    });
    
    // 패턴 1: ( 공백 + 알파벳 + 공백 + 언더스코어들 + ) - 공백 있는 경우
    const blankPattern1 = /\( [A-Z] _+\)/g;
    result = result.replace(blankPattern1, (match: string) => {
      if (answerIndex < correctAnswers.length) {
        const answer = cleanAnswer(correctAnswers[answerIndex]);
        answerIndex++;
        return `(<span style="color: #000000; font-weight: bold;">${answer}</span>)`;
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
          return `(<span style="color: #000000; font-weight: bold;">${answer}</span>)`;
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
          return `(<span style="color: #000000; font-weight: bold;">${answer}</span>)`;
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
          return `(<span style="color: #000000; font-weight: bold;">${answer}</span>)`;
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
          return `(<span style="color: #000000; font-weight: bold;">${answer}</span>)`;
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
          return `(<span style="color: #000000; font-weight: bold;">${answer}</span>)`;
        }
        return match;
      });
    }
    
    return result;
  };

  if (printMode === 'no-answer') {
    // 문제만 인쇄
    const selectedSentences = work14Data.selectedSentences || work14Data.correctAnswers || [];
    
    return (
      <div className="only-print work-14-print">
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderPackage01 />
          </div>
          <div className="a4-page-content">
            <div className="problem-instruction" data-work-type="14" style={{
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
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#14</span>
            </div>
            <div className="package01-work14-problem-text" style={{
              marginTop: '0.9rem', 
              fontSize: '1rem !important', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              fontFamily: 'inherit', 
              color: '#222', 
              lineHeight: '1.5', 
              border: '2px solid #e3e6f0',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              overflow: 'hidden'
            }}>
              {(() => {
                // formatBlankedText로 변환: (_____) → ( _ _ _ _ _ )
                const formattedText = formatBlankedText(
                  work14Data.blankedText || '',
                  work14Data.correctAnswers || []
                );
                // 변환된 패턴: ( _ _ _ _ _ ) 에서 공백을 유지하면서 렌더링
                return formattedText;
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (printMode === 'with-answer') {
    // 정답 포함 인쇄 - 동적 페이지 분할 적용
    console.log('🔍 Work14 with-answer 모드:', {
      work14Data,
      correctAnswers: work14Data.correctAnswers,
      selectedSentences: work14Data.selectedSentences,
      blankedText: work14Data.blankedText?.substring(0, 200) + '...',
      needsAnswerSecondPage
    });
    
    if (needsAnswerSecondPage) {
      // 2페이지로 분할
      return (
        <>
          {/* 1페이지: 문제 + 정답 포함 본문 */}
          <div className="only-print print-answer-mode work-14-print">
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
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
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#14</span>
                  </div>
                  <div className="package01-work14-answer-text package01-work14-passage" style={{
                    marginTop: '0.9rem', 
                    marginBottom: '0.75rem',
                    fontSize: '0.8rem !important', 
                    padding: '0.5rem 1rem', 
                    borderRadius: '8px', 
                    fontFamily: 'inherit', 
                    color: '#222', 
                    lineHeight: '1.5', 
                    border: '2px solid #e3e6f0',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    overflow: 'hidden'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      const formattedBlankedText = formatBlankedText(
                        work14Data.blankedText || '',
                        work14Data.correctAnswers || work14Data.selectedSentences || []
                      );
                      return work14Data.correctAnswers ? 
                        createTextWithAnswers(formattedBlankedText, work14Data.correctAnswers) : 
                        work14Data.selectedSentences ? 
                          createTextWithAnswers(formattedBlankedText, work14Data.selectedSentences) : 
                          formattedBlankedText;
                    })()
                  }}
                  />
              </div>
            </div>
          </div>

          {/* 2페이지: 본문해석 */}
          <div className="only-print print-answer-mode work-14-print">
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderPackage01 />
              </div>
              <div className="a4-page-content">
                {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
              </div>
            </div>
          </div>
        </>
      );
    } else {
      // 1페이지에 모든 내용 포함
      return (
        <div className="only-print print-answer-mode work-14-print">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderPackage01 />
            </div>
            <div className="a4-page-content">
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
                <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#000'}}>유형#14</span>
              </div>
              <div className="package01-work14-answer-text package01-work14-passage" style={{
                marginTop: '0.9rem', 
                marginBottom: '0.75rem',
                fontSize: '0.8rem !important', 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                fontFamily: 'inherit', 
                color: '#222', 
                lineHeight: '1.5', 
                border: '2px solid #e3e6f0'
              }}
              dangerouslySetInnerHTML={{
                __html: (() => {
                  const formattedBlankedText = formatBlankedText(
                    work14Data.blankedText || '',
                    work14Data.correctAnswers || work14Data.selectedSentences || []
                  );
                  return work14Data.correctAnswers ? 
                    createTextWithAnswers(formattedBlankedText, work14Data.correctAnswers) : 
                    work14Data.selectedSentences ? 
                      createTextWithAnswers(formattedBlankedText, work14Data.selectedSentences) : 
                      formattedBlankedText;
                })()
              }}
              />
              {/* 본문해석은 제거됨 (맨 마지막 페이지에 통합 표시) */}
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
};

export default PrintFormatPackage01;
export { PrintFormatPackage01Work02, PrintFormatPackage01Work03, PrintFormatPackage01Work04, PrintFormatPackage01Work05, PrintFormatPackage01Work06, PrintFormatPackage01Work07, PrintFormatPackage01Work08, PrintFormatPackage01Work09, PrintFormatPackage01Work10, PrintFormatPackage01Work11, PrintFormatPackage01Work13, PrintFormatPackage01Work14 };
