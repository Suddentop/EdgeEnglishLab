import React from 'react';
import {
  PrintHeaderWork15,
  A4PageTemplateWork15,
  ProblemInstructionWork15,
  WordListTableWork15,
  WordQuizWork15Type
} from './PrintFormat15';
import './PrintFormat15.css';

interface WordItem { 
  english: string; 
  korean: string;
  partOfSpeech?: string; // 품사 (n., v., adj., adv. 등)
}

interface Work15Data {
  words?: WordItem[];
  questions?: any[];
  quizType?: 'english-to-korean' | 'korean-to-english';
  totalQuestions?: number;
  passage?: string;
  quizzes?: Array<{
    words: WordItem[];
    quizType?: 'english-to-korean' | 'korean-to-english';
    totalQuestions?: number;
    passage?: string;
  }>;
}

interface HistoryPrintWork15Props {
  data: Work15Data | WordQuizWork15Type;
  isAnswerMode?: boolean;
}

const HistoryPrintWork15: React.FC<HistoryPrintWork15Props> = ({ data, isAnswerMode = false }) => {
  // 여러 퀴즈가 있는 경우 (본문별로 분리)
  const dataAsWork15 = data as Work15Data;
  const hasMultipleQuizzes = Array.isArray(dataAsWork15?.quizzes) && dataAsWork15.quizzes!.length > 0;
  
  const quizType: 'english-to-korean' | 'korean-to-english' =
    data.quizType === 'korean-to-english' ? 'korean-to-english' : 'english-to-korean';

  const instructionText =
    quizType === 'english-to-korean'
      ? '다음 영어 단어의 한글 뜻을 고르시오.'
      : '다음 한글 뜻에 해당하는 영어 단어를 고르시오.';

  if (process.env.NODE_ENV === 'development') {
      const sampleWords = hasMultipleQuizzes && dataAsWork15.quizzes!.length > 0
      ? dataAsWork15.quizzes![0].words?.slice(0, 3) || []
      : Array.isArray(data?.words) ? data.words.slice(0, 3) : [];
    
    console.log('🖨️ [Work15] HistoryPrintWork15 렌더링', {
      isAnswerMode,
      hasMultipleQuizzes,
      quizzesCount: hasMultipleQuizzes ? dataAsWork15.quizzes!.length : 0,
      dataKeys: Object.keys(data || {}),
      hasQuizzes: 'quizzes' in data,
      quizzesData: hasMultipleQuizzes ? dataAsWork15.quizzes!.map((q: any) => ({ 
        wordsCount: q.words?.length || 0,
        hasWords: Array.isArray(q.words) && q.words.length > 0,
        wordsWithPartOfSpeech: q.words?.filter((w: any) => w.partOfSpeech && w.partOfSpeech.trim().length > 0).length || 0
      })) : null,
      wordsCount: Array.isArray(data?.words) ? data.words.length : 0,
      sampleWords: sampleWords.map((w: any) => ({
        english: w.english,
        korean: w.korean,
        partOfSpeech: w.partOfSpeech,
        hasPartOfSpeech: !!(w.partOfSpeech && w.partOfSpeech.trim().length > 0)
      }))
    });
  }

  // 여러 퀴즈가 있는 경우: 각 퀴즈를 독립적으로 처리
  if (hasMultipleQuizzes) {
    console.log('🖨️ [Work15] 여러 퀴즈 처리 시작:', {
      originalQuizzesCount: dataAsWork15.quizzes!.length,
      originalQuizzes: dataAsWork15.quizzes!.map((q: any) => ({
        hasWords: Array.isArray(q.words),
        wordsCount: q.words?.length || 0,
        wordsType: Array.isArray(q.words) ? 'array' : typeof q.words,
        keys: Object.keys(q || {})
      }))
    });
    
    const quizzes = dataAsWork15.quizzes!.filter((q: any) => {
      const hasWords = Array.isArray(q.words) && q.words.length > 0;
      if (!hasWords) {
        console.warn('🖨️ [Work15] 퀴즈 필터링됨 (단어 없음):', {
          hasWordsArray: Array.isArray(q.words),
          wordsLength: q.words?.length || 0,
          quizKeys: Object.keys(q || {})
        });
      }
      return hasWords;
    });
    
    console.log('🖨️ [Work15] 필터링 후 퀴즈 수:', {
      filteredCount: quizzes.length,
      filteredQuizzes: quizzes.map((q: any) => ({
        wordsCount: q.words?.length || 0,
        sampleWords: q.words?.slice(0, 3).map((w: any) => ({
          english: w.english,
          korean: w.korean,
          partOfSpeech: w.partOfSpeech
        }))
      }))
    });
    
    if (quizzes.length === 0) {
      console.warn('🖨️ [Work15] 유효한 단어가 있는 퀴즈가 없습니다.', {
        originalQuizzesCount: dataAsWork15.quizzes!.length,
        originalQuizzesData: dataAsWork15.quizzes!
      });
      return (
        <div className="only-print-work15">
          <A4PageTemplateWork15>
            <div className="print-content-work15">
              <ProblemInstructionWork15>
                {instructionText}
              </ProblemInstructionWork15>
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                단어가 없습니다.
              </div>
            </div>
          </A4PageTemplateWork15>
        </div>
      );
    }
    
    // 각 퀴즈를 페이지에 배치 (한 페이지에 2개의 퀴즈, 각 단에 하나씩)
    const quizzesPerPage = 2;
    const pages: typeof quizzes[] = [];
    
    // 디버깅: 퀴즈 데이터 확인
    console.log('🖨️ [Work15] 페이지 생성 전 퀴즈 확인:', {
      totalQuizzes: quizzes.length,
      quizzes: quizzes.map((q: any, idx: number) => ({
        index: idx,
        wordsCount: q.words?.length || 0,
        hasWords: Array.isArray(q.words) && q.words.length > 0,
        words: q.words?.slice(0, 3).map((w: any) => w.english) || []
      }))
    });
    
    for (let i = 0; i < quizzes.length; i += quizzesPerPage) {
      const pageQuizzes = quizzes.slice(i, i + quizzesPerPage);
      // 빈 배열이 아닌 경우에만 추가
      if (pageQuizzes.length > 0) {
        pages.push(pageQuizzes);
        console.log(`🖨️ [Work15] 페이지 ${pages.length - 1} 생성:`, {
          startIndex: i,
          endIndex: i + pageQuizzes.length,
          quizzesCount: pageQuizzes.length,
          quizzes: pageQuizzes.map((q: any) => ({
            wordsCount: q.words?.length || 0,
            hasWords: Array.isArray(q.words) && q.words.length > 0
          }))
        });
      }
    }
    
    console.log('🖨️ [Work15] 전체 페이지 정보:', {
      totalQuizzes: quizzes.length,
      totalPages: pages.length,
      expectedPages: Math.ceil(quizzes.length / quizzesPerPage),
      pages: pages.map((p, idx) => ({
        pageIndex: idx,
        quizzesCount: p.length,
        quizzes: p.map((q: any) => ({
          wordsCount: q.words?.length || 0,
          hasWords: Array.isArray(q.words) && q.words.length > 0
        }))
      }))
    });
    
    // 페이지가 예상보다 적으면 경고
    const expectedPages = Math.ceil(quizzes.length / quizzesPerPage);
    if (pages.length !== expectedPages) {
      console.error(`🖨️ [Work15] 페이지 수 불일치! 예상: ${expectedPages}, 실제: ${pages.length}`);
    }

    // 단일 퀴즈 테이블 렌더링 함수 (각 단별로 독립적 번호)
    const renderSingleQuizTable = (
      quizWords: WordItem[],
      quizTypeForQuiz: 'english-to-korean' | 'korean-to-english'
    ) => {
      if (!quizWords || quizWords.length === 0) {
        return null;
      }

      return (
        <table className="word-list-table-work15">
          <thead>
            <tr>
              <th>No.</th>
              <th>{quizTypeForQuiz === 'english-to-korean' ? '영어 단어' : '한국어'}</th>
              <th>{quizTypeForQuiz === 'english-to-korean' ? '한글 뜻' : '영어'}</th>
            </tr>
          </thead>
          <tbody>
            {quizWords.map((word, index) => {
              const answerText = isAnswerMode
                ? (quizTypeForQuiz === 'english-to-korean' ? word.korean : word.english)
                : '';
              // 정답 모드이고 품사가 있을 때 품사 약자를 앞에 추가
              // 품사가 없거나 빈 문자열인 경우는 제외
              const partOfSpeech = word.partOfSpeech?.trim();
              const hasPartOfSpeech = partOfSpeech && partOfSpeech.length > 0;
              
              // 디버깅: 품사 정보 확인
              if (process.env.NODE_ENV === 'development' && isAnswerMode && index < 3) {
                console.log(`🖨️ [Work15] 단어 ${index + 1} 품사 정보:`, {
                  english: word.english,
                  partOfSpeech: word.partOfSpeech,
                  hasPartOfSpeech,
                  displayAnswer: hasPartOfSpeech && quizTypeForQuiz === 'english-to-korean'
                    ? `${partOfSpeech} ${answerText}`
                    : answerText
                });
              }
              
              const displayAnswer = isAnswerMode && hasPartOfSpeech && quizTypeForQuiz === 'english-to-korean'
                ? `${partOfSpeech} ${answerText}`
                : answerText;
              
              return (
                <tr key={`word-${index}`}>
                  <td>{index + 1}</td>
                  <td>{quizTypeForQuiz === 'english-to-korean' ? word.english : word.korean}</td>
                  <td className={isAnswerMode ? 'answer-cell' : ''}>
                    {displayAnswer}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    };

    // 렌더링 전 최종 확인
    console.log('🖨️ [Work15] 렌더링 시작:', {
      totalPages: pages.length,
      pages: pages.map((p, idx) => ({
        pageIndex: idx,
        quizzesCount: p.length,
        quiz1Words: p[0]?.words?.length || 0,
        quiz2Words: p[1]?.words?.length || 0
      }))
    });
    
    return (
      <div className="only-print-work15">
        {pages.map((pageQuizzes, pageIndex) => {
          // 안전하게 퀴즈 데이터 확인
          const leftQuiz = pageQuizzes[0];
          const rightQuiz = pageQuizzes[1];
          const hasLeftQuiz = leftQuiz && Array.isArray(leftQuiz.words) && leftQuiz.words.length > 0;
          const hasRightQuiz = rightQuiz && Array.isArray(rightQuiz.words) && rightQuiz.words.length > 0;
          
          console.log(`🖨️ [Work15] 페이지 ${pageIndex} 렌더링:`, {
            pageIndex,
            pageQuizzesCount: pageQuizzes.length,
            hasLeftQuiz,
            hasRightQuiz,
            leftQuizWordsCount: hasLeftQuiz ? leftQuiz.words.length : 0,
            rightQuizWordsCount: hasRightQuiz ? rightQuiz.words.length : 0,
            leftQuizExists: !!leftQuiz,
            rightQuizExists: !!rightQuiz
          });
          
          // 페이지에 퀴즈가 하나도 없으면 빈 페이지라도 렌더링 (디버깅용)
          if (!hasLeftQuiz && !hasRightQuiz) {
            console.warn(`🖨️ [Work15] 페이지 ${pageIndex}에 유효한 퀴즈가 없습니다.`, {
              leftQuiz: leftQuiz ? { hasWords: Array.isArray(leftQuiz.words), wordsLength: leftQuiz.words?.length } : null,
              rightQuiz: rightQuiz ? { hasWords: Array.isArray(rightQuiz.words), wordsLength: rightQuiz.words?.length } : null
            });
            // 빈 페이지도 렌더링하여 문제 확인
            return (
              <A4PageTemplateWork15 key={pageIndex}>
                <div className="print-content-work15">
                  <div className="word-list-container-work15">
                    <div className="word-list-column-work15">
                      <div style={{ padding: '2rem', color: '#666', textAlign: 'center' }}>
                        페이지 {pageIndex + 1}: 퀴즈 데이터 없음
                      </div>
                    </div>
                  </div>
                </div>
              </A4PageTemplateWork15>
            );
          }
          
          // 홀수개인 경우 마지막 페이지 처리: 왼쪽 단에만 배치
          const isLastPageWithSingleQuiz = !hasRightQuiz && hasLeftQuiz;
          
          return (
            <A4PageTemplateWork15 
              key={`work15-page-${pageIndex}`}
              className={`work15-page-${pageIndex} ${isLastPageWithSingleQuiz ? 'single-quiz-page' : ''}`}
            >
              <div className="print-content-work15">
                <div className={`word-list-container-work15 ${isLastPageWithSingleQuiz ? 'single-quiz-container' : ''}`}>
                  {/* 왼쪽 단: 첫 번째 퀴즈 카드 */}
                  <div className={`word-list-column-work15 ${isLastPageWithSingleQuiz ? 'single-quiz-column' : ''}`}>
                    {hasLeftQuiz && (
                      <div className="quiz-card-work15">
                        <ProblemInstructionWork15>
                          문제 {pageIndex * 2 + 1}. {instructionText}
                        </ProblemInstructionWork15>
                        {renderSingleQuizTable(
                          leftQuiz.words,
                          leftQuiz.quizType || quizType
                        )}
                      </div>
                    )}
                  </div>
                  {/* 오른쪽 단: 두 번째 퀴즈 카드 (있을 때만 표시) */}
                  {hasRightQuiz && (
                    <div className="word-list-column-work15">
                      <div className="quiz-card-work15">
                        <ProblemInstructionWork15>
                          문제 {pageIndex * 2 + 2}. {instructionText}
                        </ProblemInstructionWork15>
                        {renderSingleQuizTable(
                          rightQuiz.words,
                          rightQuiz.quizType || quizType
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </A4PageTemplateWork15>
          );
        })}
      </div>
    );
  }

  // 단일 퀴즈인 경우: 기존 로직 유지 (하위 호환성)
  // 하지만 quizzes 배열이 있고 단일 항목인 경우도 처리
  let words: WordItem[] = [];
  
  if (hasMultipleQuizzes && dataAsWork15.quizzes!.length === 1) {
    // 단일 퀴즈지만 quizzes 배열로 전달된 경우
    words = Array.isArray(dataAsWork15.quizzes![0]?.words) ? dataAsWork15.quizzes![0].words : [];
  } else {
    // 기존 방식: data.words 사용
    words = Array.isArray(data?.words) ? data.words : [];
  }

  if (!words || words.length === 0) {
    console.warn('🖨️ [Work15] 단어가 없습니다. 빈 페이지를 표시합니다.', {
      hasMultipleQuizzes,
      hasQuizzes: 'quizzes' in data,
      quizzesLength: hasMultipleQuizzes ? dataAsWork15.quizzes!.length : 0,
      hasWords: 'words' in data,
      wordsLength: Array.isArray(data?.words) ? data.words.length : 0
    });
    return (
      <div className="only-print-work15">
        <A4PageTemplateWork15>
          <div className="print-content-work15">
            <ProblemInstructionWork15>
              {instructionText}
            </ProblemInstructionWork15>
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              단어가 없습니다.
            </div>
          </div>
        </A4PageTemplateWork15>
      </div>
    );
  }

  // 단어를 페이지별로 분할 (한 페이지에 40개, 각 단에 20개씩)
  const wordsPerPage = 40;
  const pages: WordItem[][] = [];
  
  for (let i = 0; i < words.length; i += wordsPerPage) {
    pages.push(words.slice(i, i + wordsPerPage));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <div className="only-print-work15">
      {pages.map((pageWords, pageIndex) => (
        <A4PageTemplateWork15 key={pageIndex}>
          <div className="print-content-work15">
            <WordListTableWork15
              words={pageWords}
              showAnswers={isAnswerMode}
              quizType={quizType}
              instructionText={pageIndex === 0 ? instructionText : `${instructionText} (계속 - ${pageIndex + 1}페이지)`}
            />
          </div>
        </A4PageTemplateWork15>
      ))}
    </div>
  );
};

export default HistoryPrintWork15;

