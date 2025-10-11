import React, { useState, useRef, ChangeEvent } from 'react';
import ReactDOM from 'react-dom/client';
import './Package_03_ParagraphOrder.css';
import { generateWork01Quiz } from '../../../services/work01Service';
import { Quiz } from '../../../types/types';
import { generateWork02Quiz, Work02QuizData } from '../../../services/work02Service';
import PrintFormatPackage03 from './PrintFormatPackage03';
import { generateWork07Quiz } from '../../../services/work07Service';
import { generateWork08Quiz } from '../../../services/work08Service';
import { generateWork11Quiz } from '../../../services/work11Service';
import { generateBlankFillQuizWithAI, BlankFillItem as Work13BlankFillItem } from '../../../services/work13Service';
import { generateBlankQuizWithAI, BlankQuizData } from '../../../services/work14Service';
import { translateToKorean } from '../../../services/common';

// 인터페이스 정의
interface SentenceTranslationQuiz {
  sentences: string[];
  translations: string[];
  quizText: string;
}

interface MainIdeaQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation: string;
  optionTranslations: string[];
}

interface TitleQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation: string;
  optionTranslations: string[];
}



interface PackageQuizItem {
  work01Data?: Quiz;
  work02Data?: Work02QuizData;
  work07Data?: MainIdeaQuiz;
  work08Data?: TitleQuiz;
  work11Data?: SentenceTranslationQuiz;
  work13Data?: Work13BlankFillItem;
  work14Data?: BlankQuizData;
  translatedText?: string;
}

const Package_03_ParagraphOrder: React.FC = () => {
  // 입력 모드 상태
  const [inputMode, setInputMode] = useState<'capture' | 'image' | 'text'>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // 문제 생성 후 화면 관련 상태
  const [showQuizDisplay, setShowQuizDisplay] = useState(false);
  const [packageQuiz, setPackageQuiz] = useState<PackageQuizItem[]>([]);
  const [translatedText, setTranslatedText] = useState('');

  // 선택된 문제 유형 상태 (체크박스) - 기본값: 01, 02 선택
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<{[key: string]: boolean}>({
    '01': true,
    '02': true,
    '11': false,
    '13': false,
    '14': false
  });

  // 선택된 문제 유형 상태 (라디오 버튼) - 기본값: 07 선택
  const [selectedRadioType, setSelectedRadioType] = useState<string>('07');

  // 교체된 단어에 밑줄 표시하는 함수
  const renderTextWithUnderlines = (text: string, replacements: any[], isOriginal: boolean = true) => {
    if (!replacements || replacements.length === 0) return text;
    
    // 문장 분리 (원본 본문과 동일한 방식)
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    let resultElements: (string | JSX.Element)[] = [];
    let elementIndex = 0;
    let currentPosition = 0;
    
    // 각 문장별로 처리
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const replacement = replacements[i];
      
      if (!replacement) {
        // 교체 정보가 없는 문장은 그대로 추가
        resultElements.push(sentence);
        currentPosition += sentence.length;
        continue;
      }
      
      // 현재 문장의 시작 위치 찾기
      const sentenceStart = text.indexOf(sentence, currentPosition);
      if (sentenceStart === -1) {
        resultElements.push(sentence);
        currentPosition += sentence.length;
        continue;
      }
      
      const sentenceEnd = sentenceStart + sentence.length;
      
      // 현재 문장 내에서만 선택된 단어 찾기
      const wordToHighlight = isOriginal ? replacement.original : replacement.replacement;
      const escapedWord = wordToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      
      let sentenceElements: (string | JSX.Element)[] = [];
      let lastIndex = 0;
      let match;
      
      // 문장 내에서 해당 단어 찾기
      while ((match = regex.exec(sentence)) !== null) {
        // 이전 위치부터 현재 단어 시작까지의 텍스트
        if (match.index > lastIndex) {
          sentenceElements.push(sentence.slice(lastIndex, match.index));
        }
        
        // 밑줄 표시된 단어
        sentenceElements.push(
          <span key={elementIndex++} style={{textDecoration: 'underline', fontWeight: 'bold', color: '#2d5aa0'}}>
            {match[0]}
          </span>
        );
        
        lastIndex = regex.lastIndex;
      }
      
      // 문장의 나머지 부분
      if (lastIndex < sentence.length) {
        sentenceElements.push(sentence.slice(lastIndex));
      }
      
      // 문장 요소들을 결과에 추가
      sentenceElements.forEach(element => {
        resultElements.push(element);
      });
      
      currentPosition = sentenceEnd;
      
      // 마지막 문장이 아니면 공백 추가
      if (i < sentences.length - 1) {
        resultElements.push(' ');
      }
    }
    
    return <>{resultElements}</>;
  };

  // 입력 모드 변경 핸들러
  const handleInputModeChange = (mode: 'capture' | 'image' | 'text') => {
    setInputMode(mode);
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  // 이미지 파일 선택 핸들러
  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // TODO: 이미지에서 텍스트 추출 기능 구현
    }
  };

  // 붙여넣기(클립보드) 이미지 처리
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    console.log('📋 붙여넣기 이벤트 발생:', { inputMode, clipboardItems: e.clipboardData.items.length });
    
    if (inputMode !== 'capture') {
      console.log('❌ 캡처 모드가 아님:', inputMode);
      return;
    }
    
    const items = e.clipboardData.items;
    console.log('📋 클립보드 아이템 수:', items.length);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`📋 아이템 ${i}:`, { type: item.type, kind: item.kind });
      
      if (item.type.indexOf('image') !== -1) {
        console.log('📸 이미지 파일 발견, 처리 시작...');
        const file = item.getAsFile();
        if (file) {
          setImageFile(file);
          setIsExtractingText(true);
          
          try {
            // TODO: 이미지에서 텍스트 추출 기능 구현
            console.log('📸 이미지 텍스트 추출 완료');
          } catch (error) {
            console.error('❌ 이미지 텍스트 추출 실패:', error);
          } finally {
            setIsExtractingText(false);
          }
        }
        break;
      }
    }
  };

  // 체크박스 토글 핸들러
  const handleWorkTypeToggle = (typeId: string) => {
    setSelectedWorkTypes(prev => ({
      ...prev,
      [typeId]: !prev[typeId]
    }));
  };

  // 라디오 버튼 변경 핸들러 (07과 08 중 하나만 선택)
  const handleRadioTypeChange = (typeId: string) => {
    setSelectedRadioType(typeId);
  };

  // 새문제 만들기 핸들러 - 이전 선택 상태 유지
  const handleNewProblem = () => {
    setShowQuizDisplay(false);
    setPackageQuiz([]);
    setTranslatedText('');
    setInputText('');
    setImageFile(null);
    // 선택된 유형들은 유지됨 (상태 초기화하지 않음)
  };

  // 문제 생성 함수
  const generateSingleWorkTypeQuiz = async (inputText: string, typeId: string): Promise<PackageQuizItem> => {
    const quizItem: PackageQuizItem = {};

    try {
      switch (typeId) {
        case '01': {
          const quiz = await generateWork01Quiz(inputText);
          quizItem.work01Data = quiz;
          quizItem.translatedText = quiz.translation;
          break;
        }
        case '02': {
          const quiz = await generateWork02Quiz(inputText);
          quizItem.work02Data = quiz;
          quizItem.translatedText = quiz.translation;
          break;
        }
        case '07': {
          const quiz = await generateWork07Quiz(inputText);
          quizItem.work07Data = quiz;
          quizItem.translatedText = quiz.translation;
          break;
        }
        case '08': {
          const quiz = await generateWork08Quiz(inputText);
          quizItem.work08Data = quiz;
          quizItem.translatedText = quiz.translation;
          break;
        }
        case '11': {
          const quiz = await generateWork11Quiz(inputText);
          quizItem.work11Data = quiz;
          quizItem.translatedText = quiz.translations.join(' ');
          break;
        }
        case '13': {
          const quiz = await generateBlankFillQuizWithAI(inputText);
          quizItem.work13Data = quiz;
          quizItem.translatedText = quiz.translation;
          break;
        }
        case '14': {
          const quiz = await generateBlankQuizWithAI(inputText);
          quizItem.work14Data = quiz;
          quizItem.translatedText = quiz.translation;
          break;
        }
      }
    } catch (error) {
      console.error(`유형 ${typeId} 문제 생성 실패:`, error);
    }

    return quizItem;
  };

  // 패키지 퀴즈 생성 함수
  const generatePackageQuiz = async (inputText: string) => {
    setIsLoading(true);
    setShowQuizDisplay(false);

    try {
      // 선택된 유형들 수집
      const selectedTypes: string[] = [];
      
      // 체크박스로 선택된 유형들
      Object.entries(selectedWorkTypes).forEach(([typeId, isSelected]) => {
        if (isSelected) {
          selectedTypes.push(typeId);
        }
      });

      // 라디오 버튼으로 선택된 유형
      if (selectedRadioType) {
        selectedTypes.push(selectedRadioType);
      }

      if (selectedTypes.length === 0) {
        alert('최소 하나의 문제 유형을 선택해주세요.');
        setIsLoading(false);
        return;
      }

      console.log('선택된 유형들:', selectedTypes);

      // 병렬로 문제 생성
      const quizPromises = selectedTypes.map(typeId => 
        generateSingleWorkTypeQuiz(inputText, typeId)
      );

      const quizResults = await Promise.all(quizPromises);
      
      // 문제 순서 정렬: 01 → 07/08 → 02 → 11 → 13 → 14
      const typeOrder = ['01', '07', '08', '02', '11', '13', '14'];
      const sortedQuizResults = quizResults.sort((a, b) => {
        const getTypeId = (item: PackageQuizItem): string => {
          if (item.work01Data) return '01';
          if (item.work02Data) return '02';
          if (item.work07Data) return '07';
          if (item.work08Data) return '08';
          if (item.work11Data) return '11';
          if (item.work13Data) return '13';
          if (item.work14Data) return '14';
          return '99';
        };
        
        const typeA = getTypeId(a);
        const typeB = getTypeId(b);
        
        return typeOrder.indexOf(typeA) - typeOrder.indexOf(typeB);
      });
      
      setPackageQuiz(sortedQuizResults);

      // 전체 번역 생성
      const fullTranslation = await translateToKorean(inputText);
      setTranslatedText(fullTranslation);

      setShowQuizDisplay(true);
      console.log('패키지 퀴즈 생성 완료:', quizResults);

    } catch (error) {
      console.error('패키지 퀴즈 생성 실패:', error);
      alert('문제 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 문제 생성 핸들러
  const handleGenerateQuiz = () => {
    if (!inputText.trim()) {
      alert('영어 본문을 입력해주세요.');
      return;
    }

    generatePackageQuiz(inputText);
  };


  // 인쇄 핸들러 - 가로 A4 페이지
  const handlePrintProblem = () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(문제) 시작 - 가로 A4 페이지');
    
    const style = document.createElement('style');
    style.id = 'print-style-package03';
    style.textContent = `
      @page {
        margin: 0;
        size: A4 landscape;
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
        .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    const printContainer = document.createElement('div');
    printContainer.id = 'print-root-package03';
    document.body.appendChild(printContainer);

    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatPackage03 packageQuiz={packageQuiz} />);

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        root.unmount();
        document.body.removeChild(printContainer);
        
        const styleElement = document.getElementById('print-style-package03');
        if (styleElement) {
          document.head.removeChild(styleElement);
        }

        if (appRoot) {
          appRoot.style.display = 'block';
        }

        console.log('✅ 인쇄(문제) 완료 - 가로 A4 페이지');
      }, 100);
    }, 500);
  };

  // 인쇄(정답) 핸들러 - 가로 A4 페이지
  const handlePrintAnswer = () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(정답) 시작 - 가로 A4 페이지');
    
    const style = document.createElement('style');
    style.id = 'print-style-package03-answer';
    style.textContent = `
      @page {
        margin: 0;
        size: A4 landscape;
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
        .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    const printContainer = document.createElement('div');
    printContainer.id = 'print-root-package03-answer';
    document.body.appendChild(printContainer);

    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatPackage03 packageQuiz={packageQuiz} isAnswerMode={true} />);

    setTimeout(() => {
      window.print();

      setTimeout(() => {
        root.unmount();
        document.body.removeChild(printContainer);
        
        const styleElement = document.getElementById('print-style-package03-answer');
        if (styleElement) {
          document.head.removeChild(styleElement);
        }

        if (appRoot) {
          appRoot.style.display = 'block';
        }

        console.log('✅ 인쇄(정답) 완료 - 가로 A4 페이지');
      }, 100);
    }, 500);
  };

  // 문제 생성 후 화면
  if (showQuizDisplay) {
    return (
      <React.Fragment>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">📦 패키지 퀴즈 결과 - 문단 순서</h2>
            <div className="quiz-header-buttons no-print">
              <button 
                type="button" 
                className="new-problem-btn"
                onClick={handleNewProblem}
                style={{
                  width: '160px',
                  height: '48px',
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)'
                }}
              >
                새 문제 만들기
              </button>
              
              <button 
                type="button" 
                className="print-problem-btn"
                onClick={handlePrintProblem}
                style={{
                  width: '160px',
                  height: '48px',
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)'
                }}
              >
                인쇄 (문제)
              </button>
              
              <button 
                type="button" 
                className="print-answer-btn"
                onClick={handlePrintAnswer}
                style={{
                  width: '160px',
                  height: '48px',
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  color: 'white',
                  boxShadow: '0 4px 6px rgba(40, 167, 69, 0.25)'
                }}
              >
                인쇄 (정답)
              </button>
            </div>
          </div>

          {/* 생성된 퀴즈들 표시 */}
          <div className="quiz-items-container">
            {packageQuiz.map((quizItem, index) => (
              <div key={index} className="quiz-item">
                {/* Work_01 */}
                {quizItem.work01Data && (
                  <div key={`work-01-${index}`} className="work-section" style={{
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <div className="work-header">
                      <h3 style={{
                        fontSize: '1.3rem',
                        fontWeight: '700',
                        color: '#000',
                        margin: '0 0 1rem 0',
                        padding: '0'
                      }}>#01. 문장 순서 맞추기</h3>
                    </div>
                    
                    {/* 문제 지시문 */}
                    <div className="problem-instruction work-01-problem-instruction" style={{
                      fontWeight: '800',
                      fontSize: '1.18rem',
                      background: '#222',
                      color: '#fff',
                      padding: '0.7rem 1.2rem',
                      borderRadius: '8px',
                      marginBottom: '1.2rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      <span>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</span>
                      <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#01</span>
                    </div>

                    {/* 섞인 단락들 */}
                    <div className="problem-passage">
                      {quizItem.work01Data.shuffledParagraphs?.map((paragraph) => (
                        <div key={paragraph.id} className="shuffled-paragraph">
                          <strong>{paragraph.label}:</strong> {paragraph.content}
                        </div>
                      ))}
                    </div>

                    {/* 선택지 */}
                    <div className="problem-options">
                      {quizItem.work01Data.choices?.map((choice: string[], cIndex: number) => (
                        <div key={cIndex} className="option">
                          {['①', '②', '③', '④'][cIndex]} {choice.join(' → ')}
                        </div>
                      ))}
                    </div>

                    {/* 정답 표시 */}
                    <div className="screen-answer-footer" style={{
                      color: '#1976d2', 
                      fontWeight: 700, 
                      fontSize: '1.1rem', 
                      textAlign: 'center', 
                      marginTop: '2rem', 
                      padding: '0.8rem', 
                      backgroundColor: '#f0f7ff', 
                      borderRadius: '8px', 
                      border: '2px solid #1976d2'
                    }}>
                      <span>{['①', '②', '③', '④'][quizItem.work01Data.answerIndex || 0]} {quizItem.work01Data.choices?.[quizItem.work01Data.answerIndex || 0]?.join(' → ')}</span> <span>(정답)</span>
                    </div>
                  </div>
                )}

                {/* Work_02 */}
                {quizItem.work02Data && (
                  <div key={`work-02-${index}`} className="work-section" style={{
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <div className="work-header">
                      <h3 style={{
                        fontSize: '1.3rem',
                        fontWeight: '700',
                        color: '#000',
                        margin: '0 0 1rem 0',
                        padding: '0'
                      }}>#02. 독해 문제</h3>
                    </div>

                    {/* 문제 제목 */}
                    <div className="problem-instruction work-02-problem-instruction" style={{fontWeight: '800', fontSize: '1.18rem', background: '#222', color: '#fff', padding: '0.7rem 1.2rem', borderRadius: '8px', marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                      <span>문제: 다음 본문을 읽고 해석하세요</span>
                      <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#02</span>
                    </div>

                    {/* 원본 본문 보기 */}
                    <h4>원본 본문:</h4>
                    <div className="text-content no-print" style={{padding: '1.2rem', marginBottom: '1.5rem', border: '1.5px solid #e3e6f0', borderRadius: '8px'}}>
                      {renderTextWithUnderlines(quizItem.work02Data.originalText || '', quizItem.work02Data.replacements || [], true)}
                    </div>

                    {/* 변경된 본문 (문제) */}
                    <h4>다음 본문을 읽고 해석하세요.</h4>
                    <div className="text-content no-print" style={{background: '#fff3cd', padding: '1.2rem', borderRadius: '8px', border: '1.5px solid #ffeaa7', marginBottom: '1.5rem'}}>
                      {renderTextWithUnderlines(quizItem.work02Data.modifiedText || '', quizItem.work02Data.replacements || [], false)}
                    </div>
                        
                    {/* 교체된 단어 목록 (하나의 4열 테이블) */}
                    <h4>교체된 단어들:</h4>
                    {quizItem.work02Data?.replacements && quizItem.work02Data.replacements.length > 0 ? (
                      <table className="replacements-table no-print">
                        <thead>
                          <tr>
                            <th>원래 단어</th>
                            <th>교체된 단어</th>
                            <th>원래 단어</th>
                            <th>교체된 단어</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: Math.ceil((quizItem.work02Data?.replacements.length || 0) / 2) }, (_, rowIndex) => (
                            <tr key={rowIndex}>
                              <td>
                                {quizItem.work02Data?.replacements[rowIndex * 2] && (
                                  <>
                                    <span className="original-word">{quizItem.work02Data.replacements[rowIndex * 2].original}</span>
                                    <span className="original-meaning">({quizItem.work02Data.replacements[rowIndex * 2].originalMeaning})</span>
                                  </>
                                )}
                              </td>
                              <td>
                                {quizItem.work02Data?.replacements[rowIndex * 2] && (
                                  <>
                                    <span className="replacement-word">{quizItem.work02Data.replacements[rowIndex * 2].replacement}</span>
                                    <span className="replacement-meaning">({quizItem.work02Data.replacements[rowIndex * 2].replacementMeaning})</span>
                                  </>
                                )}
                              </td>
                              <td>
                                {quizItem.work02Data?.replacements[rowIndex * 2 + 1] && (
                                  <>
                                    <span className="original-word">{quizItem.work02Data.replacements[rowIndex * 2 + 1].original}</span>
                                    <span className="original-meaning">({quizItem.work02Data.replacements[rowIndex * 2 + 1].originalMeaning})</span>
                                  </>
                                )}
                              </td>
                              <td>
                                {quizItem.work02Data?.replacements[rowIndex * 2 + 1] && (
                                  <>
                                    <span className="replacement-word">{quizItem.work02Data.replacements[rowIndex * 2 + 1].replacement}</span>
                                    <span className="replacement-meaning">({quizItem.work02Data.replacements[rowIndex * 2 + 1].replacementMeaning})</span>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="no-print" style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                        교체된 단어가 없습니다.
                      </div>
                    )}

                    {/* 번역 */}
                    <div className="translation-section no-print">
                      <h4>본문 해석:</h4>
                      <div className="translation-content" style={{background: '#f1f8e9', padding: '1.2rem', borderRadius: '8px', border: '1.5px solid #c8e6c9'}}>
                        {quizItem.translatedText}
                      </div>
                    </div>
                  </div>
                )}

                {/* Work_07 */}
                {quizItem.work07Data && (
                  <div key={`work-07-${index}`} className="work-section" style={{
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    {/* 문제 유형 제목 */}
                    <h3 style={{
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: '#000',
                      margin: '0 0 1rem 0',
                      padding: '0'
                    }}>
                      #07. 주제 추론 문제
                    </h3>

                    {/* 문제 제목 */}
                    <div className="work-07-title" style={{
                      fontWeight: '800',
                      fontSize: '1.18rem',
                      background: '#222',
                      color: '#fff',
                      padding: '0.7rem 1.2rem',
                      borderRadius: '8px',
                      marginBottom: '1.2rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      <span>문제: 다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요.</span>
                      <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
                    </div>

                    {/* 본문 */}
                    <div className="work-07-passage" style={{
                      background: '#FFF3CD',
                      border: '1.5px solid #e3e6f0',
                      borderRadius: '8px',
                      padding: '1.2rem',
                      marginBottom: '1.5rem',
                      fontSize: '1.1rem',
                      lineHeight: '1.7',
                      fontFamily: 'inherit'
                    }}>
                      {quizItem.work07Data.passage}
                    </div>

                    {/* 선택지 */}
                    <div className="problem-options work-07-problem-options" style={{
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem'
                    }}>
                      {quizItem.work07Data.options.map((option, optionIndex) => (
                        <label key={optionIndex} className="option" style={{
                          display: 'block',
                          background: '#fff',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          padding: '0.8rem 1rem',
                          marginBottom: '0.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '1rem',
                          lineHeight: '1.5'
                        }}>
                          <div style={{display: 'flex', alignItems: 'flex-start'}}>
                            <input
                              type="radio"
                              name={`work-07-${index}`}
                              value={optionIndex}
                              style={{ marginRight: '0.5rem', marginTop: '0.1rem' }}
                            />
                            <div>
                              <div style={{fontWeight: '500'}}>
                                {String.fromCharCode(65 + optionIndex)}. {option}
                              </div>
                              {quizItem.work07Data?.optionTranslations && quizItem.work07Data?.optionTranslations[optionIndex] && (
                                <div style={{fontSize:'0.85rem', color:'#666', marginTop:'0.3rem'}}>
                                  {quizItem.work07Data?.optionTranslations[optionIndex]}
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* 정답 표시 */}
                    <div className="work-07-answer" style={{
                      background: '#e8f5e8',
                      border: '2px solid #4caf50',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      color: '#1976d2',
                      fontWeight: '700',
                      fontSize: '1.1rem'
                    }}>
                      정답: {quizItem.work07Data.options[quizItem.work07Data.answerIndex]}
                    </div>
                    
                    {/* 번역 */}
                    <div className="translation-section no-print">
                      <h4>본문 해석:</h4>
                      <div className="work-07-translation" style={{background: '#f1f8e9', padding: '1.2rem', borderRadius: '8px', border: '1.5px solid #c8e6c9'}}>
                        {quizItem.translatedText}
                      </div>
                    </div>
                  </div>
                )}

                {/* Work_08 */}
                {quizItem.work08Data && (
                  <div key={`work-08-${index}`} className="work-section" style={{
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    {/* 문제 유형 제목 */}
                    <div className="work-08-title" style={{
                      marginBottom: '0.8rem',
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: '#000'
                    }}>
                      #08. 제목 추론 문제
                    </div>

                    {/* 문제 지시사항 */}
                    <div className="work-08-missing-sentence" style={{
                      background: '#000',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '0.8rem 1.2rem',
                      marginBottom: '0.8rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>문제: 다음 본문에 가장 적합한 제목을 고르세요.</span>
                      <span style={{fontSize: '0.9rem', color: '#FFD700'}}>유형#08</span>
                    </div>

                    {/* 본문 */}
                    <div className="work-08-passage" style={{
                      background: '#FFF3CD',
                      border: '1px solid #dee2e6',
                      borderRadius: '8px',
                      padding: '1.2rem',
                      marginBottom: '1.5rem',
                      fontSize: '1rem',
                      lineHeight: '1.6',
                      color: '#212529'
                    }}>
                      {quizItem.work08Data.passage}
                    </div>

                    {/* 선택지 */}
                    <div className="work-08-options" style={{marginBottom: '1.5rem'}}>
                      {quizItem.work08Data.options.map((option, optionIndex) => (
                        <div key={optionIndex} style={{
                          padding: '0.8rem',
                          marginBottom: '0.5rem',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          backgroundColor: '#fff',
                          fontSize: '1rem',
                          lineHeight: '1.5'
                        }}>
                          {`①②③④⑤`[optionIndex] || `${optionIndex+1}.`} {option}
                        </div>
                      ))}
                    </div>

                    {/* 정답 */}
                    <div className="work-08-answer" style={{
                      background: '#e8f5e8',
                      border: '2px solid #4caf50',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      color: '#1976d2',
                      fontWeight: '700',
                      fontSize: '1.1rem'
                    }}>
                      정답: {`①②③④⑤`[quizItem.work08Data.answerIndex] || `${quizItem.work08Data.answerIndex+1}.`} {quizItem.work08Data.options[quizItem.work08Data.answerIndex]}
                    </div>

                    {/* 번역 */}
                    <div className="translation-section no-print">
                      <h4>본문 해석:</h4>
                      <div className="work-08-translation" style={{background: '#f1f8e9', padding: '1.2rem', borderRadius: '8px', border: '1.5px solid #c8e6c9'}}>
                        {quizItem.translatedText}
                      </div>
                    </div>
                  </div>
                )}

                {/* Work_11 */}
                {quizItem.work11Data && (
                  <div key={`work-11-${index}`} className="work-section" style={{
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    {/* 문제 유형 제목 */}
                    <div className="work-11-header" style={{
                      marginBottom: '0.8rem',
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: '#000'
                    }}>
                      #11. 본문 문장별 해석 문제
                    </div>

                    {/* 문제 지시사항 */}
                    <div className="work-11-title" style={{
                      background: '#000',
                      color: '#fff',
                      padding: '0.7rem 1.2rem',
                      borderRadius: '8px',
                      marginBottom: '0.6rem',
                      fontSize: '1.13rem',
                      fontWeight: '800',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      <span>다음 본문의 각 문장을 한국어로 해석하세요.</span>
                      <span style={{fontSize: '0.9rem', fontWeight: '700', color: '#FFD700'}}>유형#11</span>
                    </div>

                    {/* 문장별 해석 문제 */}
                    <div className="work-11-content" style={{
                      margin: '1.2rem 0'
                    }}>
                      {quizItem.work11Data?.sentences.map((sentence, sentenceIndex) => (
                        <div key={sentenceIndex} className="sentence-item" style={{
                          background: '#FFF3CD',
                          borderRadius: '8px',
                          padding: '0.3rem 1.2rem',
                          border: '1.5px solid #e3e6f0',
                          marginBottom: '1rem',
                          fontFamily: 'inherit',
                          transition: 'border-color 0.2s',
                          boxShadow: '0 1px 4px rgba(44,62,80,0.04)'
                        }}>
                          <div className="sentence-header" style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '0.5rem',
                            marginBottom: '0.5rem'
                          }}>
                            <span className="sentence-number" style={{
                              fontWeight: '700',
                              color: '#6a5acd',
                              fontSize: '1.08rem',
                              flexShrink: 0,
                              verticalAlign: 'baseline',
                              lineHeight: 1
                            }}>{sentenceIndex + 1}.</span>
                            <span className="sentence-content" style={{
                              fontSize: '1.05rem',
                              lineHeight: '1.2',
                              color: '#232946',
                              fontFamily: 'Noto Sans KR, Segoe UI, Apple SD Gothic Neo, Arial, sans-serif',
                              flex: 1,
                              verticalAlign: 'baseline'
                            }}>{sentence}</span>
                          </div>
                          <div className="translation-container" style={{
                            marginBottom: '0.3rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <span className="translation-label" style={{
                              fontWeight: '600',
                              color: '#4a5568',
                              fontFamily: 'Noto Sans KR, Segoe UI, Apple SD Gothic Neo, Arial, sans-serif',
                              whiteSpace: 'nowrap'
                            }}>해석:</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 정답 표시 */}
                    <div className="work-11-answer" style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      backgroundColor: '#e8f5e8',
                      borderRadius: '8px',
                      border: '2px solid #4caf50'
                    }}>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: '#1976d2',
                        marginBottom: '1rem'
                      }}>
                        정답
                      </div>
                      {quizItem.work11Data?.sentences.map((sentence, sentenceIndex) => (
                        <div key={sentenceIndex} style={{
                          marginBottom: '1rem',
                          padding: '0.8rem',
                          backgroundColor: '#F1F8E9',
                          borderRadius: '6px',
                          border: '1px solid #c8e6c9'
                        }}>
                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            color: '#1976d2',
                            marginBottom: '0.3rem'
                          }}>
                            {sentenceIndex + 1}. {sentence}
                          </div>
                          <div style={{
                            fontSize: '0.95rem',
                            color: '#333',
                            lineHeight: 1.5
                          }}>
                            {quizItem.work11Data?.translations[sentenceIndex]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work_13 */}
                {quizItem.work13Data && (
                  <div key={`work-13-${index}`} className="work-section" style={{
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    {/* 문제 유형 제목 */}
                    <div className="work-13-header" style={{
                      marginBottom: '0.8rem',
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: '#000',
                      textAlign: 'left'
                    }}>
                      #13. 빈칸 채우기 문제 (단어-주관식)
                    </div>

                    {/* 문제 지시사항 */}
                    <div className="work-13-title" style={{
                      background: '#222',
                      color: '#fff',
                      padding: '0.7rem 1.2rem',
                      borderRadius: '8px',
                      marginBottom: '1.2rem',
                      fontSize: '1.13rem',
                      fontWeight: '800',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>다음 빈칸에 들어갈 단어를 직접 입력하시오.</span>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        color: '#FFD700'
                      }}>
                        유형#13
                      </span>
                    </div>

                    {/* 빈칸 본문 */}
                    <div style={{
                      fontSize: '1.08rem',
                      lineHeight: 1.7,
                      margin: '1.2rem 0',
                      background: '#FFF3CD',
                      borderRadius: '8px',
                      padding: '1.2rem',
                      fontFamily: 'inherit',
                      border: '2px solid #e3e6f0'
                    }}>
                      {quizItem.work13Data.blankedText}
                    </div>

                    {/* 정답 표시 */}
                    <div style={{
                      marginTop: '1.2rem',
                      color: '#1976d2',
                      fontWeight: 700
                    }}>
                      <span style={{color: '#1976d2'}}>
                        정답: {quizItem.work13Data.correctAnswers?.join(', ') || '정답 없음'}
                      </span>
                    </div>

                    {/* 한국어 번역 */}
                    <div style={{
                      marginTop: '1.2rem',
                      padding: '1rem',
                      backgroundColor: '#F1F8E9',
                      borderRadius: '8px',
                      border: '2px solid #e3e6f0'
                    }}>
                      <div style={{
                        fontWeight: '700',
                        marginBottom: '0.5rem',
                        color: '#000'
                      }}>
                        본문 해석:
                      </div>
                      <div style={{
                        fontSize: '1rem',
                        lineHeight: 1.6,
                        color: '#333'
                      }}>
                        {quizItem.work13Data.translation}
                      </div>
                    </div>
                  </div>
                )}

                {/* Work_14 */}
                {quizItem.work14Data && (
                  <div key={`work-14-${index}`} className="work-section" style={{
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    {/* 문제 유형 제목 */}
                    <div className="work-14-header" style={{
                      marginBottom: '0.8rem',
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: '#000'
                    }}>
                      #14. 빈칸 채우기 문제 (문장-주관식)
                    </div>

                    {/* 문제 지시사항 */}
                    <div className="work-14-title" style={{
                      background: '#222',
                      color: '#fff',
                      padding: '0.7rem 1.2rem',
                      borderRadius: '8px',
                      marginBottom: '1.2rem',
                      fontSize: '1.13rem',
                      fontWeight: '800',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>다음 빈칸에 들어갈 문장을 직접 입력하시오.</span>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        color: '#FFD700'
                      }}>
                        유형#14
                      </span>
                    </div>

                    {/* 빈칸 본문 */}
                    <div style={{
                      fontSize: '1.08rem',
                      lineHeight: 1.7,
                      margin: '1.2rem 0',
                      background: '#FFF3CD',
                      borderRadius: '8px',
                      padding: '1.2rem',
                      fontFamily: 'inherit',
                      border: '2px solid #e3e6f0'
                    }}>
                      {quizItem.work14Data.blankedText}
                    </div>

                    {/* 정답 표시 */}
                    <div style={{
                      marginTop: '1.2rem',
                      color: '#1976d2',
                      fontWeight: 700
                    }}>
                      <div style={{color: '#1976d2', marginBottom: '0.5rem'}}>
                        정답 문장들:
                      </div>
                      {quizItem.work14Data.selectedSentences?.map((sentence, idx) => (
                        <div key={idx} style={{
                          marginBottom: '0.3rem',
                          padding: '0.5rem',
                          backgroundColor: '#E3F2FD',
                          borderRadius: '4px',
                          fontSize: '0.95rem',
                          lineHeight: 1.4
                        }}>
                          {idx + 1}. {sentence}
                        </div>
                      ))}
                    </div>

                    {/* 한국어 번역 */}
                    <div style={{
                      marginTop: '1.2rem',
                      padding: '1rem',
                      backgroundColor: '#F1F8E9',
                      borderRadius: '8px',
                      border: '2px solid #e3e6f0'
                    }}>
                      <div style={{
                        fontWeight: '700',
                        marginBottom: '0.5rem',
                        color: '#000'
                      }}>
                        본문 해석:
                      </div>
                      <div style={{
                        fontSize: '1rem',
                        lineHeight: 1.6,
                        color: '#333'
                      }}>
                        {quizItem.work14Data.translation}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </React.Fragment>
    );
  }

  // 문제 생성 전 화면
  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>📦 패키지 퀴즈 #03 - 문단 순서</h2>
        <p>하나의 영어 본문으로 여러 유형의 문제를 한번에 생성합니다.</p>
      </div>
      
      <div className="input-type-section">
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'capture'}
            onChange={() => handleInputModeChange('capture')}
          />
          📸 캡처화면 붙여넣기
        </label>
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'image'}
            onChange={() => handleInputModeChange('image')}
          />
          🖼️ 이미지 파일 첨부
        </label>
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'text'}
            onChange={() => handleInputModeChange('text')}
          />
          ✍️ 영어 본문 직접 붙여넣기
        </label>
      </div>

      {inputMode === 'capture' && (
        <div>
          <div
            className={`input-guide${isPasteFocused ? ' paste-focused' : ''}`}
            tabIndex={0}
            onClick={() => setIsPasteFocused(true)}
            onFocus={() => setIsPasteFocused(true)}
            onBlur={() => setIsPasteFocused(false)}
            onPaste={handlePaste}
          >
            <div className="drop-icon">📋</div>
            <div className="drop-text">Ctrl+V로 캡처한 이미지를 붙여넣으세요</div>
            <div className="drop-desc">스크린샷이나 사진을 클립보드에 복사한 후 여기에 붙여넣기 하세요</div>
            <div style={{fontSize: '0.9rem', color: '#666', marginTop: '0.5rem'}}>
              💡 <b>팁:</b> 화면 캡처 후 Ctrl+V로 붙여넣기
            </div>
            {isExtractingText && (
              <div style={{color:'#6a5acd', fontWeight:600, marginTop:'0.7rem'}}>
                OpenAI Vision 처리 중...
              </div>
            )}
          </div>
          {inputText && (
            <div className="text-info" style={{marginTop: '0.5rem'}}>
              <span>글자 수: {inputText.length}자</span>
            </div>
          )}
        </div>
      )}

      {inputMode === 'image' && (
        <div>
          <div className="file-upload-row">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              id="fileInput"
              style={{ display: 'none' }}
            />
            <label htmlFor="fileInput" className="file-upload-btn">
              📁 파일 선택
            </label>
            <div className="file-upload-status">
              {imageFile ? imageFile.name : '선택된 파일이 없습니다'}
            </div>
          </div>
          {inputText && (
            <div className="text-info" style={{marginTop: '0.5rem'}}>
              <span>글자 수: {inputText.length}자</span>
            </div>
          )}
        </div>
      )}

      {inputMode === 'text' && (
        <div className="input-section">
          <div className="input-label-row">
            <label htmlFor="textInput" className="input-label">
              영어 본문 직접 붙여넣기: (2,000자 미만 권장)
            </label>
            {inputText.length < 100 && (
              <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
            )}
          </div>
          <textarea
            id="textInput"
            ref={textAreaRef}
            value={inputText}
            onChange={handleTextChange}
            placeholder="영어 본문을 직접 붙여넣어 주세요. 최소 100자 이상 권장합니다."
            className="text-input"
            rows={8}
          />
          <div className="text-info">
            <span>글자 수: {inputText.length}자</span>
          </div>
        </div>
      )}

      <div className="work-types-selection">
        <div className="work-types-header">
          <h3>생성할 문제 유형 선택</h3>
        </div>
        
        <div className="work-types-table">
          
          <div className="table-row">
            <div className="cell type-cell">01</div>
            <div className="cell title-cell">문단 순서 맞추기</div>
            <div className="cell select-cell">
              <input
                type="checkbox"
                checked={selectedWorkTypes['01']}
                onChange={() => handleWorkTypeToggle('01')}
              />
            </div>
          </div>
          
          <div className="table-row">
            <div className="cell type-cell">02</div>
            <div className="cell title-cell">유사단어 독해</div>
            <div className="cell select-cell">
              <input
                type="checkbox"
                checked={selectedWorkTypes['02']}
                onChange={() => handleWorkTypeToggle('02')}
              />
            </div>
          </div>
          
          <div className="table-row-group">
            <div className={`table-row ${selectedRadioType === '07' ? 'selected' : ''}`}>
              <div className="cell type-cell">07</div>
              <div className="cell title-cell">주제 추론</div>
              <div className="cell select-cell">
                <input
                  type="radio"
                  name="radioType"
                  checked={selectedRadioType === '07'}
                  onChange={() => handleRadioTypeChange('07')}
                />
              </div>
            </div>
            
            <div className={`table-row ${selectedRadioType === '08' ? 'selected' : ''}`}>
              <div className="cell type-cell">08</div>
              <div className="cell title-cell">제목 추론</div>
              <div className="cell select-cell">
                <input
                  type="radio"
                  name="radioType"
                  checked={selectedRadioType === '08'}
                  onChange={() => handleRadioTypeChange('08')}
                />
              </div>
            </div>
          </div>
          
          <div className="table-row">
            <div className="cell type-cell">11</div>
            <div className="cell title-cell">본문 문장별 해석</div>
            <div className="cell select-cell">
              <input
                type="checkbox"
                checked={selectedWorkTypes['11']}
                onChange={() => handleWorkTypeToggle('11')}
              />
            </div>
          </div>
          
          <div className="table-row">
            <div className="cell type-cell">13</div>
            <div className="cell title-cell">빈칸 채우기 (단어-주관식)</div>
            <div className="cell select-cell">
              <input
                type="checkbox"
                checked={selectedWorkTypes['13']}
                onChange={() => handleWorkTypeToggle('13')}
              />
            </div>
          </div>
          
          <div className="table-row">
            <div className="cell type-cell">14</div>
            <div className="cell title-cell">빈칸 채우기 (문장-주관식)</div>
            <div className="cell select-cell">
              <input
                type="checkbox"
                checked={selectedWorkTypes['14']}
                onChange={() => handleWorkTypeToggle('14')}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="generate-button"
        onClick={handleGenerateQuiz}
        disabled={isLoading}
      >
        {isLoading ? '생성 중...' : '문제 생성'}
      </button>
    </div>
  );
};

export default Package_03_ParagraphOrder;