import React from 'react';
import './PrintFormat15.css';
import { getCurrentPrintHeader } from '../../../utils/printHeader';

// 유형#15 전용 인쇄 헤더 컴포넌트
export const PrintHeaderWork15: React.FC = () => {
  const headerText = getCurrentPrintHeader();

  return (
    <div className="print-header-work15">
      <div className="print-header-text-work15">
        {headerText}
      </div>
    </div>
  );
};

// 유형#15 전용 A4 가로형 페이지 템플릿 컴포넌트
interface A4PageTemplateWork15Props {
  children: React.ReactNode;
  className?: string;
}

export const A4PageTemplateWork15: React.FC<A4PageTemplateWork15Props> = ({ 
  children, 
  className = '' 
}) => {
  const finalClassName = `a4-landscape-page-template-work15 ${className}`.trim();
  return (
    <div className={finalClassName}>
      <div className="a4-landscape-page-header-work15">
        <PrintHeaderWork15 />
      </div>
      <div className="a4-landscape-page-content-work15">
        <div className="quiz-content-work15">
          {children}
        </div>
      </div>
    </div>
  );
};

// 유형#15 전용 문제 지시문 컴포넌트
interface ProblemInstructionWork15Props {
  children: React.ReactNode;
  className?: string;
}

export const ProblemInstructionWork15: React.FC<ProblemInstructionWork15Props> = ({
  children,
  className = ''
}) => (
  <div className={`problem-instruction-work15 ${className}`}>
    <span className="problem-instruction-text-work15">{children}</span>
    <span className="problem-type-label-work15">유형#15</span>
  </div>
);

// 유형#15 전용 단어 목록 테이블 컴포넌트
interface WordListTableWork15Props {
  words: Array<{
    english: string;
    korean: string;
    partOfSpeech?: string; // 품사 (n., v., adj., adv. 등)
  }>;
  showAnswers?: boolean;
  quizType?: 'english-to-korean' | 'korean-to-english';
  instructionText?: string;
}

export const WordListTableWork15: React.FC<WordListTableWork15Props> = ({
  words,
  showAnswers = false,
  quizType = 'english-to-korean',
  instructionText = '다음 영어 단어의 한글 뜻을 고르시오.'
}) => {
  // 단어를 2단으로 나누기 (각 단에 20개씩)
  const wordsPerColumn = 20;
  const leftWords = words.slice(0, wordsPerColumn);
  const rightWords = words.slice(wordsPerColumn, wordsPerColumn * 2);

  // 오른쪽 단에 단어가 있는지 확인 (명확한 체크)
  const hasRightWords = Array.isArray(rightWords) && rightWords.length > 0;

  const renderTable = (wordList: typeof words, columnIndex: number): React.ReactElement | null => {
    // 단어가 없으면 테이블을 렌더링하지 않음
    if (!Array.isArray(wordList) || wordList.length === 0) {
      return null;
    }

    // 각 단의 번호는 1부터 시작 (단별로 독립적)
    return (
      <table className="word-list-table-work15">
        <thead>
          <tr>
            <th>No.</th>
            <th>{quizType === 'english-to-korean' ? '영어 단어' : '한국어'}</th>
            <th>{quizType === 'english-to-korean' ? '한글 뜻' : '영어'}</th>
          </tr>
        </thead>
        <tbody>
          {wordList.map((word, index) => {
            const answerText = showAnswers
              ? (quizType === 'english-to-korean' ? word.korean : word.english)
              : '';
            // 정답 모드이고 품사가 있을 때 품사 약자를 앞에 추가
            // 품사가 없거나 빈 문자열인 경우는 제외
            const partOfSpeech = word.partOfSpeech?.trim();
            const hasPartOfSpeech = partOfSpeech && partOfSpeech.length > 0;
            const displayAnswer = showAnswers && hasPartOfSpeech && quizType === 'english-to-korean'
              ? `${partOfSpeech} ${answerText}`
              : answerText;
            
            return (
              <tr key={`col-${columnIndex}-${index}`}>
                <td>{index + 1}</td>
                <td>{quizType === 'english-to-korean' ? word.english : word.korean}</td>
                <td className={showAnswers ? 'answer-cell' : ''}>
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
    <div className="word-list-container-work15">
      <div className="word-list-column-work15">
        {Array.isArray(leftWords) && leftWords.length > 0 && (
          <>
            <ProblemInstructionWork15>
              {instructionText}
            </ProblemInstructionWork15>
            {renderTable(leftWords, 0)}
          </>
        )}
      </div>
      {hasRightWords && (
        <div className="word-list-column-work15">
          <ProblemInstructionWork15>
            {instructionText}
          </ProblemInstructionWork15>
          {renderTable(rightWords, 1)}
        </div>
      )}
    </div>
  );
};

// 유형#15 전용 인쇄 모드 타입
export type PrintModeWork15 = 'none' | 'no-answer' | 'with-answer';

// 유형#15 전용 단어 아이템 타입
export interface WordItemWork15 {
  english: string;
  korean: string;
  partOfSpeech?: string; // 품사 (n., v., adj., adv. 등)
}

// 유형#15 전용 단어 문제 타입
export interface WordQuestionWork15Type {
  question: string;
  options: string[];
  answerIndex: number;
  correctAnswer: string;
  wordItem: WordItemWork15;
}

// 유형#15 전용 단어 퀴즈 타입
export interface WordQuizWork15Type {
  words: WordItemWork15[];
  quizType: 'english-to-korean' | 'korean-to-english';
  questions: WordQuestionWork15Type[];
  totalQuestions: number;
  passage?: string;
}

