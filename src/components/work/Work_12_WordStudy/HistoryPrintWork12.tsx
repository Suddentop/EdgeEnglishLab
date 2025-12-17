import React from 'react';
import {
  PrintHeaderWork12,
  A4PageTemplateWork12,
  ProblemInstructionWork12,
  WordListTableWork12
} from './PrintFormat12';
import './PrintFormat12.css';

interface WordItem { english: string; korean: string; }
interface Work12Data {
  words?: WordItem[];
  questions?: { question: string; options: string[]; answerIndex: number }[];
  quizType?: 'english-to-korean' | 'korean-to-english';
  totalQuestions?: number;
}

interface HistoryPrintWork12Props {
  data: Work12Data;
  isAnswerMode?: boolean;
}

const HistoryPrintWork12: React.FC<HistoryPrintWork12Props> = ({ data, isAnswerMode = false }) => {
  const words: WordItem[] = Array.isArray(data?.words) ? data.words : [];
  const quizType: 'english-to-korean' | 'korean-to-english' =
    data.quizType === 'korean-to-english' ? 'korean-to-english' : 'english-to-korean';

  const instructionText =
    quizType === 'english-to-korean'
      ? '다음 영어 단어의 한글 뜻을 채워 넣으세요'
      : '다음 한글 뜻에 해당하는 영어 단어를 채워 넣으세요';

  if (process.env.NODE_ENV === 'development') {
    console.log('🖨️ [Work12] HistoryPrintWork12 렌더링', {
      isAnswerMode,
      wordsCount: words.length,
      quizType,
      sampleWords: words.slice(0, 3)
    });
  }
  return (
    <div className="only-print-work12">
      <A4PageTemplateWork12>
        <div className="print-content-work12">
          <ProblemInstructionWork12>
            {instructionText}
          </ProblemInstructionWork12>
          <WordListTableWork12
            words={words}
            showAnswers={isAnswerMode}
            quizType={quizType}
          />
        </div>
      </A4PageTemplateWork12>
    </div>
  );
};

export default HistoryPrintWork12;


