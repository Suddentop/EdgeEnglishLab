import React from 'react';
import PrintHeaderPackage02 from './PrintHeaderPackage02';
import './PrintFormatPackage02.css';
import { normalizeQuizItemForPrint } from './printNormalization';
import { renderNormalizedCardNode } from './printRenderers';

interface PrintFormatPackage02Props {
  packageQuiz: any[];
  isAnswerMode?: boolean;
}

const SimplePrintFormatPackage02: React.FC<PrintFormatPackage02Props> = ({ packageQuiz, isAnswerMode = false }) => {
  // 본문에서 교체된 단어에 밑줄 표시 - Work_02 전용
  const renderTextWithHighlight = (text: string, replacements: any[]) => {
    if (!replacements || replacements.length === 0) return text;
    
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    let result = '';
    
    sentences.forEach((sentence, index) => {
      const replacement = replacements[index];
      if (replacement) {
        const word = replacement.replacement;
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result += sentence.replace(regex, `<span class="print-word-highlight">${word}</span>`) + ' ';
      } else {
        result += sentence + ' ';
      }
    });
    
    return result.trim();
  };

  const cleanOptionText = (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (isAnswerMode) {
      return str.replace(/\(정답\)/g, '').replace(/\s{2,}/g, ' ').trim();
    }
    return str;
  };

  const getTranslatedText = (quizItem: any, quizData: any): string => {
    const d = quizData || {};
    const work14Translation =
      quizItem?.work14Data?.translation ||
      d?.work14Data?.translation ||
      quizData?.work14Data?.translation;

    return (
      work14Translation ||
      quizItem?.translatedText ||
      d?.translatedText ||
      d?.translation ||
      d?.koreanTranslation ||
      d?.korean ||
      d?.korTranslation ||
      d?.koText ||
      d?.korean_text ||
      ''
    );
  };
 
  // 2단 레이아웃으로 퀴즈 아이템 렌더링
  const renderQuizItems = () => {
    const helpers = {
      isAnswerMode,
      cleanOptionText,
      renderTextWithHighlight,
      getTranslatedText
    };

    return packageQuiz.map((quizItem: any, index: number) =>
      renderNormalizedCardNode(
        normalizeQuizItemForPrint(quizItem, helpers),
        `simple-${index}`,
        { isAnswerMode }
      )
    );
  };

  const quizCards = renderQuizItems().filter(Boolean);
  const columns = [0, 1].map((columnIndex) =>
    quizCards.filter((_, cardIndex) => cardIndex % 2 === columnIndex)
  );

  return (
    <div 
      id={isAnswerMode ? "print-root-package02-answer" : "print-root-package02"}
      className={isAnswerMode ? "print-container-answer" : "print-container"}
    >
      <PrintHeaderPackage02 />
      <div className="a4-landscape-page-content">
        <div className="print-two-column-container">
          {columns.map((columnCards, columnIndex) => (
            <div key={`simple-column-${columnIndex}`} className="print-column">
              {columnCards}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimplePrintFormatPackage02;