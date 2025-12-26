import React from 'react';
import {
  PrintHeaderWork16,
  A4PageTemplateWork16,
  ProblemInstructionWork16,
  WordListTableWork16,
  WordQuizWork16Type
} from './PrintFormat16';
import './PrintFormat16.css';

interface WordItem { 
  english: string; 
  korean: string;
  partOfSpeech?: string; // 품사 (n., v., adj., adv. 등)
}

interface Work16Data {
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

interface HistoryPrintWork16Props {
  data: Work16Data | WordQuizWork16Type;
  isAnswerMode?: boolean;
}

const HistoryPrintWork16: React.FC<HistoryPrintWork16Props> = ({ data, isAnswerMode = false }) => {
  // 여러 퀴즈가 있는 경우 (본문별로 분리)
  const dataAsWork16 = data as Work16Data;
  const hasMultipleQuizzes = Array.isArray(dataAsWork16?.quizzes) && dataAsWork16.quizzes!.length > 0;
  
  const quizType: 'english-to-korean' | 'korean-to-english' =
    data.quizType === 'korean-to-english' ? 'korean-to-english' : 'english-to-korean';

  const instructionText =
    quizType === 'english-to-korean'
      ? '다음 영어 단어의 한글 뜻을 고르시오.'
      : '다음 한글 뜻에 해당하는 영어 단어를 고르시오.';

  if (process.env.NODE_ENV === 'development') {
    const sampleWords = hasMultipleQuizzes && dataAsWork16.quizzes!.length > 0
      ? dataAsWork16.quizzes![0].words?.slice(0, 3) || []
      : Array.isArray(data?.words) ? data.words.slice(0, 3) : [];
    
    console.log('🖨️ [Work16] HistoryPrintWork16 렌더링', {
      isAnswerMode,
      hasMultipleQuizzes,
      quizzesCount: hasMultipleQuizzes ? dataAsWork16.quizzes!.length : 0,
      dataKeys: Object.keys(data || {}),
      hasQuizzes: 'quizzes' in data,
      quizzesData: hasMultipleQuizzes ? dataAsWork16.quizzes!.map((q: any) => ({ 
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
    console.log('🖨️ [Work16] 여러 퀴즈 처리 시작:', {
      originalQuizzesCount: dataAsWork16.quizzes!.length,
      originalQuizzes: dataAsWork16.quizzes!.map((q: any) => ({
        hasWords: Array.isArray(q.words),
        wordsCount: q.words?.length || 0,
        wordsType: Array.isArray(q.words) ? 'array' : typeof q.words,
        keys: Object.keys(q || {})
      }))
    });
    
    const quizzes = dataAsWork16.quizzes!.filter((q: any) => {
      const hasWords = Array.isArray(q.words) && q.words.length > 0;
      if (!hasWords) {
        console.warn('🖨️ [Work16] 퀴즈 필터링됨 (단어 없음):', {
          hasWordsArray: Array.isArray(q.words),
          wordsLength: q.words?.length || 0,
          quizKeys: Object.keys(q || {})
        });
      }
      return hasWords;
    });
    
    console.log('🖨️ [Work16] 필터링 후 퀴즈 수:', {
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
      console.warn('🖨️ [Work16] 유효한 단어가 있는 퀴즈가 없습니다.', {
        originalQuizzesCount: dataAsWork16.quizzes!.length,
        originalQuizzesData: dataAsWork16.quizzes!
      });
      return (
        <div className="only-print-work16">
          <A4PageTemplateWork16>
            <div className="print-content-work16">
              <ProblemInstructionWork16>
                {instructionText}
              </ProblemInstructionWork16>
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                단어가 없습니다.
              </div>
            </div>
          </A4PageTemplateWork16>
        </div>
      );
    }
    
    // 각 퀴즈를 페이지에 배치 (한 페이지에 2개의 퀴즈, 각 단에 하나씩)
    const quizzesPerPage = 2;
    const pages: typeof quizzes[] = [];
    
    for (let i = 0; i < quizzes.length; i += quizzesPerPage) {
      pages.push(quizzes.slice(i, i + quizzesPerPage));
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
        <table className="word-list-table-work16">
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
                console.log(`🖨️ [Work16] 단어 ${index + 1} 품사 정보:`, {
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

    return (
      <div className="only-print-work16">
        {pages.map((pageQuizzes, pageIndex) => (
          <A4PageTemplateWork16 key={pageIndex}>
            <div className="print-content-work16">
              <div className="word-list-container-work16">
                {/* 왼쪽 단: 첫 번째 퀴즈 */}
                <div className="word-list-column-work16">
                  {pageQuizzes[0] && pageQuizzes[0].words && pageQuizzes[0].words.length > 0 && (
                    <>
                      <ProblemInstructionWork16>
                        {instructionText}
                      </ProblemInstructionWork16>
                      {renderSingleQuizTable(
                        pageQuizzes[0].words,
                        pageQuizzes[0].quizType || quizType
                      )}
                    </>
                  )}
                </div>
                {/* 오른쪽 단: 두 번째 퀴즈 */}
                {pageQuizzes[1] && pageQuizzes[1].words && pageQuizzes[1].words.length > 0 && (
                  <div className="word-list-column-work16">
                    <ProblemInstructionWork16>
                      {instructionText}
                    </ProblemInstructionWork16>
                    {renderSingleQuizTable(
                      pageQuizzes[1].words,
                      pageQuizzes[1].quizType || quizType
                    )}
                  </div>
                )}
              </div>
            </div>
          </A4PageTemplateWork16>
        ))}
      </div>
    );
  }

  // 단일 퀴즈인 경우: 기존 로직 유지 (하위 호환성)
  // 하지만 quizzes 배열이 있고 단일 항목인 경우도 처리
  let words: WordItem[] = [];
  
  if (hasMultipleQuizzes && dataAsWork16.quizzes!.length === 1) {
    // 단일 퀴즈지만 quizzes 배열로 전달된 경우
    words = Array.isArray(dataAsWork16.quizzes![0]?.words) ? dataAsWork16.quizzes![0].words : [];
  } else {
    // 기존 방식: data.words 사용
    words = Array.isArray(data?.words) ? data.words : [];
  }

  if (!words || words.length === 0) {
    console.warn('🖨️ [Work16] 단어가 없습니다. 빈 페이지를 표시합니다.', {
      hasMultipleQuizzes,
      hasQuizzes: 'quizzes' in data,
      quizzesLength: hasMultipleQuizzes ? dataAsWork16.quizzes!.length : 0,
      hasWords: 'words' in data,
      wordsLength: Array.isArray(data?.words) ? data.words.length : 0
    });
    return (
      <div className="only-print-work16">
        <A4PageTemplateWork16>
          <div className="print-content-work16">
            <ProblemInstructionWork16>
              {instructionText}
            </ProblemInstructionWork16>
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              단어가 없습니다.
            </div>
          </div>
        </A4PageTemplateWork16>
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
    <div className="only-print-work16">
      {pages.map((pageWords, pageIndex) => (
        <A4PageTemplateWork16 key={pageIndex}>
          <div className="print-content-work16">
            <WordListTableWork16
              words={pageWords}
              showAnswers={isAnswerMode}
              quizType={quizType}
              instructionText={pageIndex === 0 ? instructionText : `${instructionText} (계속 - ${pageIndex + 1}페이지)`}
            />
          </div>
        </A4PageTemplateWork16>
      ))}
    </div>
  );
};

export default HistoryPrintWork16;

