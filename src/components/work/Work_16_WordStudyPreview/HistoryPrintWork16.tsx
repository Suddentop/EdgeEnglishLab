import React from 'react';
import {
  PrintHeaderWork16,
  A4PageTemplateWork16,
  ProblemInstructionWork16,
  WordListTableWork16,
  PreviewNoticeWork16
} from './PrintFormat16';
import './PrintFormat16.css';

interface WordItem { 
  english: string; 
  korean: string; 
  partOfSpeech?: string; // 품사 정보 (예: "명사", "동사", "형용사", "부사" 등)
}
interface Work16Data {
  words?: WordItem[];
  questions?: { question: string; options: string[]; answerIndex: number }[];
  quizType?: 'english-to-korean' | 'korean-to-english';
  totalQuestions?: number;
}

interface HistoryPrintWork16Props {
  data: Work16Data;
  isAnswerMode?: boolean;
}

const HistoryPrintWork16: React.FC<HistoryPrintWork16Props> = ({ data, isAnswerMode = false }) => {
  const words: WordItem[] = Array.isArray(data?.words) ? data.words : [];
  const quizType: 'english-to-korean' | 'korean-to-english' =
    data.quizType === 'korean-to-english' ? 'korean-to-english' : 'english-to-korean';

  const instructionText =
    quizType === 'english-to-korean'
      ? '다음 영어 단어의 한글 뜻을 채워 넣으세요'
      : '다음 한글 뜻에 해당하는 영어 단어를 채워 넣으세요';

  if (process.env.NODE_ENV === 'development') {
    console.log('🖨️ [work16] HistoryPrintWork16 렌더링', {
      isAnswerMode,
      wordsCount: words.length,
      quizType,
      sampleWords: words.slice(0, 3).map(w => ({
        english: w.english,
        korean: w.korean,
        partOfSpeech: w.partOfSpeech,
        hasPartOfSpeech: !!w.partOfSpeech
      })),
      wordsWithPos: words.filter(w => w.partOfSpeech).length,
      wordsWithoutPos: words.filter(w => !w.partOfSpeech).length,
      dataKeys: data ? Object.keys(data) : [],
      hasWords: !!data?.words,
      wordsArrayLength: Array.isArray(data?.words) ? data.words.length : 0
    });
  }
  
  // 렌더링 후 DOM 상태 확인
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        const onlyPrintElement = document.querySelector('.only-print-work16');
        const pageTemplate = document.querySelector('.a4-page-template-work16');
        const wordTable = document.querySelector('.word-list-table-work16');
        
        if (onlyPrintElement) {
          const rect = onlyPrintElement.getBoundingClientRect();
          const computed = window.getComputedStyle(onlyPrintElement);
          console.log('🔍 [work16] 렌더링 후 DOM 상태:', {
            onlyPrintElement: {
              exists: !!onlyPrintElement,
              rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
              computed: {
                display: computed.display,
                visibility: computed.visibility,
                opacity: computed.opacity
              },
              innerHTML: onlyPrintElement.innerHTML.substring(0, 200)
            },
            pageTemplate: {
              exists: !!pageTemplate,
              rect: pageTemplate ? (() => {
                const r = pageTemplate.getBoundingClientRect();
                return { width: r.width, height: r.height, top: r.top, left: r.left };
              })() : null
            },
            wordTable: {
              exists: !!wordTable,
              rows: wordTable ? (wordTable as HTMLTableElement).rows.length : 0
            }
          });
        }
      }, 100);
    }
  }, [words, isAnswerMode]);
  return (
    <div className="only-print-work16">
      <A4PageTemplateWork16>
        <div className="print-content-work16">
          <ProblemInstructionWork16>
            {instructionText}
          </ProblemInstructionWork16>
          <WordListTableWork16
            words={words}
            showAnswers={isAnswerMode}
            quizType={quizType}
          />
          <PreviewNoticeWork16 />
        </div>
      </A4PageTemplateWork16>
    </div>
  );
};

export default HistoryPrintWork16;


