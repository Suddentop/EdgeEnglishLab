import React, { useState, useEffect } from 'react';
import { Quiz } from '../../types/types';
import PrintHeader from '../common/PrintHeader';
import '../../styles/PrintFormat.css';

interface QuizDisplayProps {
  quiz: Quiz;
  onBack: () => void;
}

type PrintMode = 'none' | 'no-answer' | 'with-answer';

const QuizDisplay: React.FC<QuizDisplayProps> = ({ quiz, onBack }) => {
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('none');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChoiceSelect = (idx: number) => {
    setSelectedChoice(idx);
    setShowResult(true);
  };

  const handlePrintNoAnswer = () => {
    // 인쇄 전에 브라우저 기본 헤더/푸터 숨기기
    const style = document.createElement('style');
    style.id = 'print-style';
    style.textContent = `
      @page {
        margin: 0;
        size: A4;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
    document.head.appendChild(style);
    
    setPrintMode('no-answer');
    setTimeout(() => {
      window.print();
      // 인쇄 후 스타일 제거
      setTimeout(() => {
        const printStyle = document.getElementById('print-style');
        if (printStyle) {
          printStyle.remove();
        }
        setPrintMode('none');
      }, 1000);
    }, 100);
  };

  const handlePrintWithAnswer = () => {
    // 인쇄 전에 브라우저 기본 헤더/푸터 숨기기
    const style = document.createElement('style');
    style.id = 'print-style';
    style.textContent = `
      @page {
        margin: 0;
        size: A4;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
    document.head.appendChild(style);
    
    setPrintMode('with-answer');
    setTimeout(() => {
      window.print();
      // 인쇄 후 스타일 제거
      setTimeout(() => {
        const printStyle = document.getElementById('print-style');
        if (printStyle) {
          printStyle.remove();
        }
        setPrintMode('none');
      }, 1000);
    }, 100);
  };

  return (
    <div>
      {/* 화면용 */}
      <div className="quiz-display no-print">
        <div className="quiz-header">
          <h2 className="no-print">순서 맞추기 문제</h2>
          <div className="quiz-header-buttons no-print">
            <button onClick={onBack} className="reset-button">
              새 문제 만들기
            </button>
            <button onClick={handlePrintNoAnswer} className="print-button styled-print" style={{width: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em', whiteSpace: 'nowrap'}}>
              <span className="print-icon" aria-hidden>🖨️</span>
              <span>인쇄 (문제)</span>
            </button>
            <button onClick={handlePrintWithAnswer} className="print-button styled-print" style={{width: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5em', whiteSpace: 'nowrap'}}>
              <span className="print-icon" aria-hidden>🖨️</span>
              <span>인쇄 (<span style={{color: '#FFD600'}}>정답</span>)</span>
            </button>
          </div>
        </div>
        <div className="original-text no-print">
          <h3>원본 본문:</h3>
          <div className="text-content">
            {quiz.originalText}
          </div>
        </div>
        <div className="quiz-section">
          <h3>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</h3>
          <div className="paragraphs-container">
            {quiz.shuffledParagraphs.map((paragraph) => (
              <div key={paragraph.id} className="paragraph-item">
                <div className="paragraph-label">({paragraph.label})</div>
                <div className="paragraph-content">{paragraph.content}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="choices-section">
          <h3>객관식 보기</h3>
          <ul className="choices-list">
            {quiz.choices.map((choice, idx) => (
              <li key={idx} className={`choice-item ${selectedChoice === idx ? 'selected' : ''} ${showResult && idx === quiz.answerIndex ? 'correct' : ''}`}>
                <button
                  className="choice-button"
                  onClick={() => handleChoiceSelect(idx)}
                  disabled={showResult}
                >
                  {['①','②','③','④'][idx]}&nbsp;
                  (A)
                  {choice.map(label => `→ (${label})`).join('')}
                </button>
              </li>
            ))}
          </ul>
          {showResult && (
            <div className={`result ${selectedChoice === quiz.answerIndex ? 'correct' : 'incorrect'} no-print`}>
              <h3>{selectedChoice === quiz.answerIndex ? '정답입니다! 🎉' : '틀렸습니다. 다시 시도해보세요.'}</h3>
              <div className="correct-answer">
                <h4>정답:</h4>
                <span className="answer-item">
                  {['①','②','③','④'][quiz.answerIndex]} (A)
                  {quiz.choices[quiz.answerIndex].map(label => `→ (${label})`).join('')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 인쇄용: 문제만 */}
      {printMode === 'no-answer' && (
        <div className="only-print">
          <PrintHeader />
          <div className="quiz-print-body">

            <div className="quiz-section">
              <h3>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</h3>
              <div className="paragraphs-container">
                {quiz.shuffledParagraphs.map((paragraph) => (
                  <div key={paragraph.id} className="paragraph-item">
                    <div className="paragraph-label">({paragraph.label})</div>
                    <div className="paragraph-content">{paragraph.content}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="choices-section">
              <h3>객관식 보기</h3>
              <ul className="choices-list">
                {quiz.choices.map((choice, idx) => (
                  <li key={idx} className="choice-item">
                    <span className="choice-button" style={{pointerEvents:'none'}}>
                      {['①','②','③','④'][idx]}&nbsp;
                      (A)
                      {choice.map(label => `→ (${label})`).join('')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {/* 푸터 */}
            <div className="print-footer" style={{marginTop: '3rem', fontSize: '0.8rem', color: '#444', textAlign: 'center'}}>
              이 문서 및 시험지는 Edge English Lab에서 생성되었으며, 모든 저작권은 Edge English Lab에 귀속됩니다.
            </div>
          </div>
        </div>
      )}
      {/* 인쇄용: 정답포함 */}
      {printMode === 'with-answer' && (
        <div className="only-print">
          <PrintHeader />
          <div className="quiz-print-body">

            <div className="quiz-section">
              <h3>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</h3>
              <div className="paragraphs-container">
                {quiz.shuffledParagraphs.map((paragraph) => (
                  <div key={paragraph.id} className="paragraph-item">
                    <div className="paragraph-label">({paragraph.label})</div>
                    <div className="paragraph-content">{paragraph.content}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="choices-section">
              <h3>객관식 보기</h3>
              <ul className="choices-list">
                {quiz.choices.map((choice, idx) => (
                  <li key={idx} className="choice-item">
                    <span className="choice-button" style={{pointerEvents:'none'}}>
                      {['①','②','③','④'][idx]}&nbsp;
                      (A)
                      {choice.map(label => `→ (${label})`).join('')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="print-answer-section">
              <div style={{fontSize: '1.05rem', fontWeight: 700, textAlign: 'right', marginTop: '2rem'}}>
                <span style={{color: '#2d3a60'}}>정답:</span> {['①','②','③','④'][quiz.answerIndex]}
              </div>
            </div>
            {/* 푸터 */}
            <div className="print-footer" style={{marginTop: '3rem', fontSize: '0.8rem', color: '#444', textAlign: 'center'}}>
              이 문서 및 시험지는 Edge English Lab에서 생성되었으며, 모든 저작권은 Edge English Lab에 귀속됩니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizDisplay; 