import React from 'react';
import './PrintFormat16.css';
import { getCurrentPrintHeader } from '../../../utils/printHeader';

// 유형#12 전용 인쇄 헤더 컴포넌트
export const PrintHeaderWork16: React.FC = () => {
  const headerText = getCurrentPrintHeader();

  return (
    <div className="print-header-work16">
      <div className="print-header-text-work16">
        {headerText}
      </div>
    </div>
  );
};

// 유형#12 전용 A4 페이지 템플릿 컴포넌트
interface A4PageTemplateWork16Props {
  children: React.ReactNode;
  className?: string;
}

export const A4PageTemplateWork16: React.FC<A4PageTemplateWork16Props> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`a4-page-template-work16 ${className}`}>
    <div className="a4-page-header-work16">
      <PrintHeaderWork16 />
    </div>
    <div className="a4-page-content-work16">
      <div className="quiz-content-work16">
        {children}
      </div>
    </div>
  </div>
);

// 유형#12 전용 문제 지시문 컴포넌트
interface ProblemInstructionWork16Props {
  children: React.ReactNode;
  className?: string;
}

export const ProblemInstructionWork16: React.FC<ProblemInstructionWork16Props> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`problem-instruction-work16 ${className}`}>
    <span className="problem-instruction-text-work16">{children}</span>
    <span className="problem-type-label-work16">엣지잉글리쉬랩 | https://edgeenglish.net/</span>
  </div>
);

// 유형#12 전용 단어 퀴즈 컨테이너 컴포넌트
interface WordQuizContainerWork16Props {
  children: React.ReactNode;
  className?: string;
}

export const WordQuizContainerWork16: React.FC<WordQuizContainerWork16Props> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`word-quiz-container-work16 ${className}`}>
    {children}
  </div>
);

// 유형#12 전용 단어 문제 컴포넌트
interface WordQuestionWork16Props {
  question: string;
  options: string[];
  correctAnswer: string;
  answerIndex: number;
  questionNumber: number;
  showAnswer?: boolean;
}

export const WordQuestionWork16: React.FC<WordQuestionWork16Props> = ({
  question,
  options,
  correctAnswer,
  answerIndex,
  questionNumber,
  showAnswer = false
}) => (
  <div className="word-question-work16">
    <div className="word-question-text-work16">
      {questionNumber}. {question}
    </div>
    <div className="word-options-work16">
      {options.map((option, index) => (
        <div 
          key={index}
          className={`word-option-work16 ${showAnswer && index === answerIndex ? 'correct' : ''}`}
        >
          {String.fromCharCode(65 + index)}. {option}
        </div>
      ))}
    </div>
    {showAnswer && (
      <div className="word-answer-work16">
        정답: {String.fromCharCode(65 + answerIndex)}. {correctAnswer}
      </div>
    )}
  </div>
);

// 유형#12 전용 단어 목록 테이블 컴포넌트
interface WordListTableWork16Props {
  words: Array<{
    english: string;
    korean: string;
    partOfSpeech?: string; // 품사 정보 (예: "명사", "동사", "형용사", "부사" 등)
    difficulty?: 'easy' | 'medium' | 'hard';
  }>;
  showDifficulty?: boolean;
  showAnswers?: boolean;
  quizType?: 'english-to-korean' | 'korean-to-english';
}

export const WordListTableWork16: React.FC<WordListTableWork16Props> = ({
  words,
  showDifficulty = false,
  showAnswers = false,
  quizType = 'english-to-korean'
}) => {
  // 단어를 2단으로 나누기 (좌/우 테이블)
  const midPoint = Math.ceil(words.length / 2);
  const leftWords = words.slice(0, midPoint);
  const rightWords = words.slice(midPoint);

  // 한글뜻 열의 폰트 크기를 자동으로 조정하는 함수
  const adjustFontSize = (cell: HTMLElement) => {
    const minFontSize = 7; // 최소 폰트 크기 (pt)
    const maxFontSize = 10; // 최대 폰트 크기 (pt)
    let fontSize = maxFontSize;
    
    // 임시로 최대 폰트 크기 설정하여 측정
    cell.style.fontSize = `${maxFontSize}pt`;
    cell.style.whiteSpace = 'nowrap';
    
    // 텍스트가 넘치는지 확인
    while (cell.scrollWidth > cell.clientWidth && fontSize > minFontSize) {
      fontSize -= 0.5; // 0.5pt씩 줄임
      cell.style.fontSize = `${fontSize}pt`;
    }
    
    // 최소 크기까지 줄였는데도 넘치면 최소 크기로 고정
    if (cell.scrollWidth > cell.clientWidth && fontSize <= minFontSize) {
      cell.style.fontSize = `${minFontSize}pt`;
    }
  };

  // 렌더링 후 폰트 크기 조정
  React.useEffect(() => {
    // 인쇄 미리보기나 실제 렌더링 후 실행되도록 약간의 지연
    const timer = setTimeout(() => {
      const koreanCells = document.querySelectorAll('.word-list-table-work16 td:nth-child(3)');
      koreanCells.forEach((cell) => {
        if (cell instanceof HTMLElement) {
          adjustFontSize(cell);
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [words, showAnswers, quizType]);

  const renderTable = (wordList: typeof words, startIndex: number) => (
    <table className="word-list-table-work16">
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
            <td className={`korean-meaning-cell ${showAnswers ? 'answer-cell' : ''}`}>
              {showAnswers
                ? (() => {
                    const answer = quizType === 'english-to-korean' ? word.korean : word.english;
                    // 품사 정보가 있으면 한글 뜻 앞에 영어 약어 형식으로 표시 (예: "n. 관리자")
                    if (quizType === 'english-to-korean' && word.partOfSpeech) {
                      // 품사가 이미 "n.", "v." 형식이면 그대로 사용, 아니면 변환
                      const pos = word.partOfSpeech.trim();
                      // 한국어 품사명을 영어 약어로 변환 (기존 데이터 호환성)
                      const posMap: { [key: string]: string } = {
                        '명사': 'n.',
                        '동사': 'v.',
                        '형용사': 'adj.',
                        '부사': 'adv.',
                        '전치사': 'prep.',
                        '접속사': 'conj.',
                        '대명사': 'pron.',
                        '감탄사': 'interj.'
                      };
                      const normalizedPos = posMap[pos] || (pos.endsWith('.') ? pos : `${pos}.`);
                      return `${normalizedPos} ${answer}`;
                    }
                    return answer;
                  })()
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
    <div className="word-list-container-work16">
      <div className="word-list-column-work16">
        {renderTable(leftWords, 0)}
      </div>
      <div className="word-list-column-work16">
        {renderTable(rightWords, midPoint)}
      </div>
    </div>
  );
};

// 유형#16 전용 체험용 안내 컴포넌트
export const PreviewNoticeWork16: React.FC = () => (
  <div className="preview-notice-work16">
    <div>ⓘ 이 단어문제 생성해보기(무료 체험)는 체험용입니다.</div>
  </div>
);

// 유형#12 전용 인쇄 푸터 컴포넌트
export const PrintFooterWork16: React.FC = () => (
  <div className="print-footer-work16">
    이 문서 및 시험지는 Edge English Lab에서 생성되었으며, 모든 저작권은 Edge English Lab에 귀속됩니다.
  </div>
);

// 유형#12 전용 인쇄 컨테이너 컴포넌트
interface PrintContainerWork16Props {
  children: React.ReactNode;
  mode: 'no-answer' | 'with-answer';
  className?: string;
}

export const PrintContainerWork16: React.FC<PrintContainerWork16Props> = ({ 
  children, 
  mode,
  className = '' 
}) => (
  <div className={`only-print-work16 ${mode === 'with-answer' ? 'print-answer-mode-work16' : ''} ${className}`}>
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
export type PrintModeWork16 = 'none' | 'no-answer' | 'with-answer';

// 유형#12 전용 단어 아이템 타입
export interface WordItemWork16 {
  english: string;
  korean: string;
  partOfSpeech?: string; // 품사 정보 (예: "명사", "동사", "형용사", "부사" 등)
  difficulty?: 'easy' | 'medium' | 'hard';
}

// 유형#12 전용 단어 문제 타입
export interface WordQuestionWork16Type {
  question: string;
  options: string[];
  answerIndex: number;
  correctAnswer: string;
  wordItem: WordItemWork16;
}

// 유형#12 전용 단어 퀴즈 타입
export interface WordQuizWork16Type {
  words: WordItemWork16[];
  quizType: 'english-to-korean' | 'korean-to-english';
  questions: WordQuestionWork16Type[];
  totalQuestions: number;
}
