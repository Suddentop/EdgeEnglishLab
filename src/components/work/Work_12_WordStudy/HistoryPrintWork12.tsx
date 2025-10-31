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
  return (
    <div className="only-print-work12">
      <A4PageTemplateWork12>
        <div className="print-content-work12">
          <ProblemInstructionWork12>
            다음 영어 단어의 한글 뜻을 고르시오.
          </ProblemInstructionWork12>
          <WordListTableWork12 words={words} showAnswers={isAnswerMode} quizType={'english-to-korean'} />
        </div>
      </A4PageTemplateWork12>
    </div>
  );
};

export default HistoryPrintWork12;


