import React from 'react';
import './PrintFormat12.css';

// 유형#12 전용 인쇄 헤더 컴포넌트
export const PrintHeaderWork12: React.FC = () => (
  <div className="print-header-work12">
    <div className="print-header-text-work12">
      EdgeEnglishLab | AI 영어 문제 생성 플랫폼
    </div>
  </div>
);

// 유형#12 전용 A4 페이지 템플릿 컴포넌트
interface A4PageTemplateWork12Props {
  children: React.ReactNode;
  className?: string;
}

export const A4PageTemplateWork12: React.FC<A4PageTemplateWork12Props> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`a4-page-template-work12 ${className}`}>
    <div className="a4-page-header-work12">
      <PrintHeaderWork12 />
    </div>
    <div className="a4-page-content-work12">
      <div className="quiz-content-work12">
        {children}
      </div>
    </div>
  </div>
);

// 유형#12 전용 문제 지시문 컴포넌트
interface ProblemInstructionWork12Props {
  children: React.ReactNode;
  className?: string;
}

export const ProblemInstructionWork12: React.FC<ProblemInstructionWork12Props> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`problem-instruction-work12 ${className}`}>
    {children}
  </div>
);

// 유형#12 전용 단어 퀴즈 컨테이너 컴포넌트
interface WordQuizContainerWork12Props {
  children: React.ReactNode;
  className?: string;
}

export const WordQuizContainerWork12: React.FC<WordQuizContainerWork12Props> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`word-quiz-container-work12 ${className}`}>
    {children}
  </div>
);

// 유형#12 전용 단어 문제 컴포넌트
interface WordQuestionWork12Props {
  question: string;
  options: string[];
  correctAnswer: string;
  answerIndex: number;
  questionNumber: number;
  showAnswer?: boolean;
}

export const WordQuestionWork12: React.FC<WordQuestionWork12Props> = ({
  question,
  options,
  correctAnswer,
  answerIndex,
  questionNumber,
  showAnswer = false
}) => (
  <div className="word-question-work12">
    <div className="word-question-text-work12">
      {questionNumber}. {question}
    </div>
    <div className="word-options-work12">
      {options.map((option, index) => (
        <div 
          key={index}
          className={`word-option-work12 ${showAnswer && index === answerIndex ? 'correct' : ''}`}
        >
          {String.fromCharCode(65 + index)}. {option}
        </div>
      ))}
    </div>
    {showAnswer && (
      <div className="word-answer-work12">
        정답: {String.fromCharCode(65 + answerIndex)}. {correctAnswer}
      </div>
    )}
  </div>
);

// 유형#12 전용 단어 목록 테이블 컴포넌트
interface WordListTableWork12Props {
  words: Array<{
    english: string;
    korean: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  }>;
  showDifficulty?: boolean;
  showAnswers?: boolean;
  quizType?: 'english-to-korean' | 'korean-to-english';
}

export const WordListTableWork12: React.FC<WordListTableWork12Props> = ({
  words,
  showDifficulty = false,
  showAnswers = false,
  quizType = 'english-to-korean'
}) => {
  // 단어를 2단으로 나누기
  const midPoint = Math.ceil(words.length / 2);
  const leftWords = words.slice(0, midPoint);
  const rightWords = words.slice(midPoint);

  const renderTable = (wordList: typeof words, startIndex: number) => (
    <table className="word-list-table-work12">
      <thead>
        <tr>
          <th>No.</th>
          <th>{quizType === 'english-to-korean' ? '영어 단어' : '한국어'}</th>
          <th>{quizType === 'english-to-korean' ? '한글 뜻' : '영어'}</th>
          {showDifficulty && <th>난이도</th>}
        </tr>
      </thead>
      <tbody>
        {wordList.map((word, index) => (
          <tr key={startIndex + index}>
            <td>{startIndex + index + 1}</td>
            <td>{quizType === 'english-to-korean' ? word.english : word.korean}</td>
            <td className={showAnswers ? 'answer-cell' : ''}>
              {showAnswers
                ? (quizType === 'english-to-korean' ? word.korean : word.english)
                : (word.korean.includes('_') || word.english.includes('_') ? '' : '')
              }
            </td>
            {showDifficulty && (
              <td>
                {word.difficulty === 'easy' && '쉬움'}
                {word.difficulty === 'medium' && '보통'}
                {word.difficulty === 'hard' && '어려움'}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="word-list-container-work12">
      <div className="word-list-column-work12">
        {renderTable(leftWords, 0)}
      </div>
      <div className="word-list-column-work12">
        {renderTable(rightWords, midPoint)}
      </div>
    </div>
  );
};

// 유형#12 전용 인쇄 푸터 컴포넌트
export const PrintFooterWork12: React.FC = () => (
  <div className="print-footer-work12">
    이 문서 및 시험지는 Edge English Lab에서 생성되었으며, 모든 저작권은 Edge English Lab에 귀속됩니다.
  </div>
);

// 유형#12 전용 인쇄 컨테이너 컴포넌트
interface PrintContainerWork12Props {
  children: React.ReactNode;
  mode: 'no-answer' | 'with-answer';
  className?: string;
}

export const PrintContainerWork12: React.FC<PrintContainerWork12Props> = ({ 
  children, 
  mode,
  className = '' 
}) => (
  <div className={`only-print-work12 ${mode === 'with-answer' ? 'print-answer-mode-work12' : ''} ${className}`}>
    {children}
  </div>
);

// 유형#12 전용 페이지 분할 유틸리티 함수
export const createPaginatedContent = (
  items: any[],
  itemsPerPage: number,
  renderPage: (items: any[], pageIndex: number) => React.ReactNode
): React.ReactNode[] => {
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const pages: React.ReactNode[] = [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const startIndex = pageIndex * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, items.length);
    const pageItems = items.slice(startIndex, endIndex);
    
    pages.push(renderPage(pageItems, pageIndex));
  }

  return pages;
};

// 유형#12 전용 페이지 제목 생성 함수
export const getPageTitle = (pageIndex: number, totalPages: number): string => {
  if (pageIndex === 0) {
    return "다음 영어 단어의 한글 뜻을 고르시오.                                                         유형#12";
  } else {
    return `단어 학습 문제 (계속) - ${pageIndex + 1}페이지                                               유형#12`;
  }
};

// 유형#12 전용 인쇄 모드 타입
export type PrintModeWork12 = 'none' | 'no-answer' | 'with-answer';

// 유형#12 전용 단어 아이템 타입
export interface WordItemWork12 {
  english: string;
  korean: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// 유형#12 전용 단어 문제 타입
export interface WordQuestionWork12Type {
  question: string;
  options: string[];
  answerIndex: number;
  correctAnswer: string;
  wordItem: WordItemWork12;
}

// 유형#12 전용 단어 퀴즈 타입
export interface WordQuizWork12Type {
  words: WordItemWork12[];
  quizType: 'english-to-korean' | 'korean-to-english';
  questions: WordQuestionWork12Type[];
  totalQuestions: number;
}
