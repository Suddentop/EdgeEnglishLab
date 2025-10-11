import React, { useState, useRef, ChangeEvent } from 'react';
import ReactDOM from 'react-dom/client';
import './Package_02_TwoStepQuiz.css';
import { generateWork01Quiz } from '../../../services/work01Service';
import { Quiz } from '../../../types/types';
import { generateWork02Quiz, Work02QuizData } from '../../../services/work02Service';
import PrintFormatPackage02 from './PrintFormatPackage02';
import { generateWork03Quiz } from '../../../services/work03Service';
import { generateWork04Quiz } from '../../../services/work04Service';
import { generateWork05Quiz } from '../../../services/work05Service';
import { generateWork06Quiz } from '../../../services/work06Service';
import { generateWork07Quiz } from '../../../services/work07Service';
import { generateWork08Quiz } from '../../../services/work08Service';
import { generateWork09Quiz } from '../../../services/work09Service';
import { generateWork10Quiz } from '../../../services/work10Service';
import { generateWork11Quiz } from '../../../services/work11Service';
import { generateWork12Quiz } from '../../../services/work12Service';
import { generateBlankFillQuizWithAI } from '../../../services/work13Service';
import { generateBlankQuizWithAI } from '../../../services/work14Service';
import { translateToKorean } from '../../../services/common';

// 인터페이스 정의
interface BlankQuizWithTranslation {
  blankedText: string;
  options: string[];
  answerIndex: number;
  translation: string;
  optionTranslations?: string[];
  selectedSentences?: string[];
  correctAnswers?: string[];
  userAnswer?: string;
  isCorrect?: boolean | null;
  reasoning?: string;
}

interface SentencePositionQuiz {
  missingSentence: string;
  numberedPassage: string;
  answerIndex: number;
  translation: string;
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
  answerTranslation?: string;
}

interface GrammarQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  original: string;
}

interface MultiGrammarQuiz {
  passage: string;
  options: number[];
  answerIndex: number;
  translation: string;
  originalWords: string[];
  transformedWords: string[];
  wrongIndexes: number[];
}

interface SentenceTranslationQuiz {
  sentences: {
    english: string;
    korean: string;
  }[];
}

interface WordLearningQuiz {
  words: {
    english: string;
    korean: string;
    example?: string;
  }[];
}

interface BlankFillItem {
  blankedText: string;
  correctAnswers: string[];
  translation: string;
  userAnswer: string;
  isCorrect: boolean | null;
  reasoning?: string;
}

interface PackageQuizItem {
  workType: string;
  workTypeId: string;
  quiz?: Quiz;
  work02Data?: Work02QuizData;
  work03Data?: BlankQuizWithTranslation;
  work04Data?: BlankQuizWithTranslation;
  work05Data?: BlankQuizWithTranslation;
  work06Data?: SentencePositionQuiz;
  work07Data?: MainIdeaQuiz;
  work08Data?: TitleQuiz;
  work09Data?: GrammarQuiz;
  work10Data?: MultiGrammarQuiz;
  work11Data?: SentenceTranslationQuiz;
  work12Data?: WordLearningQuiz;
  work13Data?: BlankFillItem;
  work14Data?: BlankQuizWithTranslation;
  translatedText: string;
}

const Package_02_TwoStepQuiz: React.FC = () => {
  const [inputMode, setInputMode] = useState<'capture' | 'image' | 'text'>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // 문제 생성 후 화면 관련 상태
  const [showQuizDisplay, setShowQuizDisplay] = useState(false);
  const [packageQuiz, setPackageQuiz] = useState<PackageQuizItem[] | null>(null);
  const [translatedText, setTranslatedText] = useState<string>('');
  
  // 진행 상황 추적
  const [progressInfo, setProgressInfo] = useState({
    completed: 0,
    total: 0,
    currentType: '',
    currentTypeId: ''
  });
  
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<Record<string, boolean>>({
    '01': true,
    '02': true,
    '03': true,
    '04': true,
    '05': true,
    '06': true,
    '07': true,
    '08': true,
    '09': true,
    '10': true,
    '11': true,
    '12': true,
    '13': true,
    '14': true
  });

  const WORK_TYPES = [
    { id: '01', name: '문단 순서 맞추기' },
    { id: '02', name: '유사단어 독해' },
    { id: '03', name: '빈칸(단어) 찾기' },
    { id: '04', name: '빈칸(구) 찾기' },
    { id: '05', name: '빈칸(문장) 찾기' },
    { id: '06', name: '문장 위치 찾기' },
    { id: '07', name: '주제 추론' },
    { id: '08', name: '제목 추론' },
    { id: '09', name: '어법 오류 찾기' },
    { id: '10', name: '다중 어법 오류 찾기' },
    { id: '11', name: '본문 문장별 해석' },
    { id: '12', name: '단어 학습' },
    { id: '13', name: '빈칸 채우기 (단어-주관식)' },
    { id: '14', name: '빈칸 채우기 (문장-주관식)' }
  ];

  const handleInputModeChange = (mode: 'capture' | 'image' | 'text') => {
    setInputMode(mode);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleWorkTypeToggle = (typeId: string) => {
    setSelectedWorkTypes(prev => ({
      ...prev,
      [typeId]: !prev[typeId]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedWorkTypes).every(selected => selected);
    const newState: Record<string, boolean> = {};
    Object.keys(selectedWorkTypes).forEach(key => {
      newState[key] = !allSelected;
    });
    setSelectedWorkTypes(newState);
  };

  // 본문에서 교체된 단어에 밑줄 표시 - Work_02 전용
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
        
        // 밑줄 표시된 단어 (파란색 진하게)
        sentenceElements.push(
          <span key={elementIndex++} style={{textDecoration: 'underline', fontWeight: 'bold', color: '#1976d2'}}>
            {match[0]}
          </span>
        );
        
        lastIndex = match.index + match[0].length;
      }
      
      // 마지막 부분
      if (lastIndex < sentence.length) {
        sentenceElements.push(sentence.slice(lastIndex));
      }
      
      // 문장 요소들을 결과에 추가
      resultElements.push(...sentenceElements);
      currentPosition = sentenceEnd;
    }
    
    return resultElements.length > 0 ? resultElements : text;
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
        const blob = item.getAsFile();
        if (blob) {
          console.log('📸 이미지 파일 발견:', { size: blob.size, type: blob.type });
          setIsExtractingText(true);
          
          try {
            // TODO: OpenAI Vision API를 사용한 텍스트 추출 구현
            // const extractedText = await extractTextFromImage(blob);
            // setInputText(extractedText);
            console.log('✅ 텍스트 추출 완료 (구현 예정)');
          } catch (error) {
            console.error('❌ 텍스트 추출 실패:', error);
            alert('이미지에서 텍스트를 추출하는데 실패했습니다.');
          } finally {
            setIsExtractingText(false);
          }
        }
        break;
      }
    }
  };

  // 개별 유형별 문제 생성 함수
  const generateSingleWorkTypeQuiz = async (
    workType: { id: string; name: string },
    inputText: string
  ): Promise<PackageQuizItem | null> => {
    try {
      console.log(`📝 유형#${workType.id} (${workType.name}) 생성 시작...`);
      
      let quizItem: PackageQuizItem = {
        workType: workType.name,
        workTypeId: workType.id,
        translatedText: ''
      };

      // 유형별 문제 생성
      switch (workType.id) {
        case '01': {
          const quiz = await generateWork01Quiz(inputText);
          quizItem.quiz = quiz;
          quizItem.translatedText = await translateToKorean(inputText);
          break;
        }
        case '02': {
          const quiz = await generateWork02Quiz(inputText);
          quizItem.work02Data = quiz;
          quizItem.translatedText = await translateToKorean(inputText);
          break;
        }
        case '03': {
          const quiz = await generateWork03Quiz(inputText);
          const translation = await translateToKorean(inputText);
          quizItem.work03Data = {
            ...quiz,
            translation
          };
          quizItem.translatedText = translation;
          break;
        }
        case '04': {
          const quiz = await generateWork04Quiz(inputText);
          const translation = await translateToKorean(inputText);
          quizItem.work04Data = {
            ...quiz,
            translation
          };
          quizItem.translatedText = translation;
          break;
        }
        case '05': {
          const quiz = await generateWork05Quiz(inputText);
          const translation = await translateToKorean(inputText);
          quizItem.work05Data = {
            ...quiz,
            translation
          };
          quizItem.translatedText = translation;
          break;
        }
        case '06': {
          const quiz = await generateWork06Quiz(inputText);
          quizItem.work06Data = quiz;
          // 주요 문장을 포함한 원본 전체 본문의 번역
          quizItem.translatedText = await translateToKorean(inputText);
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
        case '09': {
          const quiz = await generateWork09Quiz(inputText);
          quizItem.work09Data = quiz;
          quizItem.translatedText = quiz.translation;
          break;
        }
        case '10': {
          const quiz = await generateWork10Quiz(inputText);
          quizItem.work10Data = quiz;
          quizItem.translatedText = quiz.translation;
          break;
        }
        case '11': {
          const quiz = await generateWork11Quiz(inputText);
          // quiz.sentences와 quiz.translations를 하나의 배열로 합치기
          const sentencesWithTranslations = quiz.sentences.map((sentence, index) => ({
            english: sentence,
            korean: quiz.translations[index]
          }));
          quizItem.work11Data = {
            sentences: sentencesWithTranslations
          };
          quizItem.translatedText = quiz.translations.join(' ');
          break;
        }
        case '12': {
          const quiz = await generateWork12Quiz(inputText, 'english-to-korean');
          const wordsWithExample = quiz.words.map(word => ({
            english: word.english,
            korean: word.korean,
            example: undefined
          }));
          quizItem.work12Data = {
            words: wordsWithExample
          };
          quizItem.translatedText = await translateToKorean(inputText);
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
          quizItem.work14Data = {
            blankedText: quiz.blankedText,
            options: [],
            answerIndex: -1,
            translation: quiz.translation,
            selectedSentences: quiz.correctAnswers,
            correctAnswers: quiz.correctAnswers,
            userAnswer: '',
            isCorrect: null
          };
          quizItem.translatedText = quiz.translation;
          break;
        }
        default:
          console.warn(`⚠️ 알 수 없는 유형: ${workType.id}`);
          return null;
      }

      console.log(`✅ 유형#${workType.id} (${workType.name}) 생성 완료`);
      return quizItem;
      
    } catch (error) {
      console.error(`❌ 유형#${workType.id} (${workType.name}) 생성 실패:`, error);
      return null;
    }
  };

  // 패키지 퀴즈 생성 함수 (병렬 처리)
  const generatePackageQuiz = async (inputText: string): Promise<PackageQuizItem[]> => {
    console.log('📦 패키지 퀴즈 생성 시작 (병렬 처리)...');
    console.log('📝 입력 텍스트:', inputText.substring(0, 100) + '...');
    
    const selectedTypes = WORK_TYPES.filter(type => selectedWorkTypes[type.id]);
    
    // 진행 상황 초기화
    setProgressInfo({
      completed: 0,
      total: selectedTypes.length,
      currentType: '병렬 처리 중...',
      currentTypeId: ''
    });
    
    // 병렬로 모든 유형 생성
    const quizPromises = selectedTypes.map(async (workType) => {
      const result = await generateSingleWorkTypeQuiz(workType, inputText);
      
      // 각 유형이 완료될 때마다 진행 상황 업데이트
      setProgressInfo(prev => ({
        ...prev,
        completed: prev.completed + 1,
        currentType: result ? `${workType.name} 완료` : `${workType.name} 실패`,
        currentTypeId: workType.id
      }));
      
      return result;
    });
    
    // 모든 Promise가 완료될 때까지 대기
    const results = await Promise.all(quizPromises);
    
    // 성공한 결과만 필터링
    const generatedQuizzes = results.filter(quiz => quiz !== null) as PackageQuizItem[];
    
    // 완료 상태 업데이트
    setProgressInfo(prev => ({
      ...prev,
      completed: generatedQuizzes.length,
      currentType: '완료',
      currentTypeId: ''
    }));
    
    console.log(`📦 패키지 퀴즈 생성 완료: ${generatedQuizzes.length}/${selectedTypes.length} 유형 성공`);
    
    return generatedQuizzes;
  };

  // 문제 생성 핸들러
  const handleGenerateQuiz = async () => {
    // 입력 검증
    if (!inputText.trim()) {
      alert('영어 본문을 입력해주세요.');
      return;
    }

    // 선택된 유형 확인
    const selectedTypes = WORK_TYPES.filter(type => selectedWorkTypes[type.id]);
    if (selectedTypes.length === 0) {
      alert('생성할 문제 유형을 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setPackageQuiz(null);

    try {
      console.log('📦 패키지 퀴즈 (A4용지 2단) 생성 시작...');
      console.log('선택된 유형:', selectedTypes.map(t => `#${t.id} ${t.name}`).join(', '));

      // 병렬 문제 생성
      const generatedQuizzes = await generatePackageQuiz(inputText);

      if (generatedQuizzes.length === 0) {
        throw new Error('생성된 문제가 없습니다.');
      }

      // 생성된 퀴즈 설정
      setPackageQuiz(generatedQuizzes);
      
      // 화면 전환
      setShowQuizDisplay(true);
      
      console.log('✅ 패키지 퀴즈 생성 완료:', generatedQuizzes);
      alert(`🎉 ${generatedQuizzes.length}개 유형 문제 생성 완료!`);

    } catch (error) {
      console.error('❌ 문제 생성 실패:', error);
      alert(`문제 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 새 문제 만들기
  const handleNewProblem = () => {
    setShowQuizDisplay(false);
    setPackageQuiz(null);
    setTranslatedText('');
    setInputText('');
  };

  // 인쇄(문제) 핸들러
  const handlePrintProblem = () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(문제) 시작');
    
    // 인쇄용 컨테이너 생성
    const printContainer = document.createElement('div');
    printContainer.id = 'print-root-package02';
    document.body.appendChild(printContainer);

    // 기존 화면 숨기기
    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    // React 18 방식으로 렌더링
    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatPackage02 packageQuiz={packageQuiz} />);

    // 렌더링 완료 후 인쇄
    setTimeout(() => {
      window.print();

      // 인쇄 후 정리
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(printContainer);
        if (appRoot) {
          appRoot.style.display = 'block';
        }
        console.log('✅ 인쇄(문제) 완료');
      }, 100);
    }, 500);
  };

  const handlePrintAnswer = () => {
    alert('인쇄(정답) 기능은 곧 구현될 예정입니다.');
  };

  // 문제 생성 후 화면
  if (showQuizDisplay && packageQuiz) {
    return (
      <div className="quiz-generator">
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          marginTop: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '800',
            color: '#000',
            margin: '0'
          }}>📦 패키지 퀴즈 (A4용지 2단)</h2>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={handleNewProblem}
              style={{
                width: '160px',
                height: '48px',
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                background: '#e2e8f0',
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              새 문제 만들기
            </button>
            <button
              type="button"
              onClick={handlePrintProblem}
              style={{
                width: '160px',
                height: '48px',
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)'
              }}
            >
              🖨️ 인쇄 (문제)
            </button>
            <button
              type="button"
              onClick={handlePrintAnswer}
              style={{
                width: '160px',
                height: '48px',
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(240, 147, 251, 0.25)'
              }}
            >
              🖨️ 인쇄 (정답)
            </button>
          </div>
        </div>

        {/* 생성된 문제들 표시 */}
        {packageQuiz.map((quizItem, index) => {
          // Work_01 표시
          if (quizItem.workTypeId === '01' && quizItem.quiz) {
            return (
              <div key={`work-01-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#01. 문단 순서 맞추기</h3>
                
                <div style={{
                  fontWeight: '800',
                  fontSize: '1.18rem',
                  background: '#222',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '1.2rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#01</span>
                </div>

                <div style={{
                  background: '#FFF3CD',
                  border: '1.5px solid #e3e6f0',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  marginBottom: '1rem'
                }}>
                  {quizItem.quiz.shuffledParagraphs.map((paragraph: any, pIndex: number) => (
                    <div key={paragraph.id} style={{
                      marginBottom: '0.5rem',
                      padding: '0.8rem',
                      background: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #e9ecef'
                    }}>
                      <strong>{paragraph.label}:</strong> {paragraph.content}
                    </div>
                  ))}
                </div>

                <div style={{
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  {quizItem.quiz.choices.map((choice: string[], cIndex: number) => (
                    <div key={cIndex} style={{
                      padding: '0.8rem',
                      marginBottom: '0.5rem',
                      background: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #dee2e6'
                    }}>
                      {['①', '②', '③', '④'][cIndex]} {choice.join(' → ')}
                    </div>
                  ))}
                </div>

                <div style={{
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
                  정답: {['①', '②', '③', '④'][quizItem.quiz.answerIndex || 0]} {quizItem.quiz.choices[quizItem.quiz.answerIndex || 0].join(' → ')}
                </div>
              </div>
            );
          }

          // Work_02 표시
          if (quizItem.workTypeId === '02' && quizItem.work02Data) {
            return (
              <div key={`work-02-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#02. 유사단어 독해</h3>

                <div style={{
                  fontWeight: '800',
                  fontSize: '1.18rem',
                  background: '#222',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '1.2rem'
                }}>
                  문제: 다음 본문을 읽고 해석하세요
                </div>

                <div style={{
                  background: '#FFF3CD',
                  padding: '1.2rem',
                  borderRadius: '8px',
                  border: '1.5px solid #ffeaa7',
                  marginBottom: '1.5rem',
                  fontSize: '1.08rem',
                  lineHeight: '1.7'
                }}>
                  {renderTextWithUnderlines(quizItem.work02Data.modifiedText || '', quizItem.work02Data.replacements || [], false)}
                </div>

                {quizItem.work02Data.replacements && quizItem.work02Data.replacements.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4>교체된 단어들:</h4>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      background: 'white',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}>
                      <thead>
                        <tr>
                          <th style={{ background: '#f8f9fa', padding: '0.5rem', border: '1px solid #e2e8f0' }}>원래 단어</th>
                          <th style={{ background: '#f8f9fa', padding: '0.5rem', border: '1px solid #e2e8f0' }}>교체된 단어</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quizItem.work02Data.replacements.map((rep, repIndex) => (
                          <tr key={repIndex}>
                            <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>
                              {rep.original} ({rep.originalMeaning})
                            </td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}>
                              {rep.replacement} ({rep.replacementMeaning})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ marginTop: '1.5rem' }}>
                  <h4>본문 해석:</h4>
                  <div style={{
                    background: '#f1f8e9',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c8e6c9'
                  }}>
                    {quizItem.translatedText}
                  </div>
                </div>
              </div>
            );
          }

          // Work_03 (빈칸 단어 문제) 표시
          if (quizItem.workTypeId === '03' && quizItem.work03Data) {
            return (
              <div key={`work-03-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#03. 빈칸(단어) 문제</h3>
                
                <div style={{
                  fontWeight: '800',
                  fontSize: '1.18rem',
                  background: '#222',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '1.2rem'
                }}>
                  다음 빈칸에 들어갈 가장 적절한 단어를 고르세요.
                </div>

                <div style={{
                  background: '#FFF3CD',
                  border: '1.5px solid #e3e6f0',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  marginBottom: '1rem',
                  fontSize: '1.08rem',
                  lineHeight: '1.7'
                }}>
                  {quizItem.work03Data.blankedText}
                </div>

                <div style={{
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  {quizItem.work03Data.options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{
                      padding: '0.8rem 1rem',
                      margin: '0.5rem 0',
                      background: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #dee2e6'
                    }}>
                      {['①', '②', '③', '④', '⑤'][optionIndex]} {option}
                    </div>
                  ))}
                </div>

                <div style={{
                  background: '#e8f5e8',
                  border: '2px solid #4caf50',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  color: '#1976d2',
                  fontWeight: '700',
                  fontSize: '1.1rem'
                }}>
                  정답: {quizItem.work03Data.options[quizItem.work03Data.answerIndex]}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h4>본문 해석:</h4>
                  <div style={{
                    background: '#f1f8e9',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c8e6c9'
                  }}>
                    {quizItem.translatedText}
                  </div>
                </div>
              </div>
            );
          }

          // Work_04 (빈칸 구 문제) 표시
          if (quizItem.workTypeId === '04' && quizItem.work04Data) {
            return (
              <div key={`work-04-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#04. 빈칸(구) 문제</h3>

                <div style={{
                  fontWeight: '800',
                  fontSize: '1.18rem',
                  background: '#222',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '1.2rem'
                }}>
                  다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.
                </div>

                <div style={{
                  background: '#FFF3CD',
                  border: '1.5px solid #e3e6f0',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  marginBottom: '1rem'
                }}>
                  {quizItem.work04Data.blankedText}
                </div>

                <div style={{
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  {quizItem.work04Data.options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{
                      padding: '0.8rem 1rem',
                      margin: '0.5rem 0',
                      background: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #dee2e6'
                    }}>
                      {['①', '②', '③', '④', '⑤'][optionIndex]} {option}
                    </div>
                  ))}
                </div>

                <div style={{
                  background: '#e8f5e8',
                  border: '2px solid #4caf50',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  color: '#1976d2',
                  fontWeight: '700',
                  fontSize: '1.1rem'
                }}>
                  정답: {quizItem.work04Data.options[quizItem.work04Data.answerIndex]}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h4>본문 해석:</h4>
                  <div style={{
                    background: '#f1f8e9',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c8e6c9'
                  }}>
                    {quizItem.translatedText}
                  </div>
                </div>
              </div>
            );
          }

          // Work_05 (빈칸 문장 문제) 표시
          if (quizItem.workTypeId === '05' && quizItem.work05Data) {
            return (
              <div key={`work-05-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#05. 빈칸(문장) 문제</h3>

                <div style={{
                  fontWeight: '800',
                  fontSize: '1.18rem',
                  background: '#222',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '1.2rem'
                }}>
                  다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.
                </div>

                <div style={{
                  background: '#FFF3CD',
                  border: '1.5px solid #e3e6f0',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  marginBottom: '1.5rem'
                }}>
                  {quizItem.work05Data.blankedText}
                </div>

                <div style={{
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  {quizItem.work05Data.options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{
                      padding: '0.8rem 1rem',
                      marginBottom: '0.5rem',
                      background: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #dee2e6'
                    }}>
                      {['①', '②', '③', '④', '⑤'][optionIndex]} {option}
                    </div>
                  ))}
                </div>

                <div style={{
                  background: '#e8f5e8',
                  border: '2px solid #4caf50',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  color: '#1976d2',
                  fontWeight: '700',
                  fontSize: '1.1rem'
                }}>
                  정답: {quizItem.work05Data.options[quizItem.work05Data.answerIndex]}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h4>본문 해석:</h4>
                  <div style={{
                    background: '#f1f8e9',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c8e6c9'
                  }}>
                    {quizItem.translatedText}
                  </div>
                </div>
              </div>
            );
          }

          // Work_06 (문장 위치 찾기) 표시
          if (quizItem.workTypeId === '06' && quizItem.work06Data) {
            return (
              <div key={`work-06-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#06. 문장 위치 찾기</h3>

                <div style={{
                  fontWeight: 800,
                  fontSize: '1.18rem',
                  background: '#222',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '1.2rem'
                }}>
                  아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.
                </div>

                <div style={{
                  border: '2px solid #222',
                  borderRadius: '6px',
                  background: '#f7f8fc',
                  padding: '0.8rem 1.2rem',
                  marginBottom: '1rem',
                  fontWeight: 700
                }}>
                  <span style={{color: '#222'}}>주요 문장:</span>{' '}
                  <span style={{color: '#6a5acd'}}>{quizItem.work06Data.missingSentence}</span>
                </div>

                <div style={{
                  background: '#FFF3CD',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1.5px solid #e3e6f0',
                  whiteSpace: 'pre-line'
                }}>
                  {quizItem.work06Data.numberedPassage}
                </div>

                <div style={{
                  marginTop: '1rem',
                  color: '#1976d2',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  background: '#e8f5e8',
                  border: '2px solid #4caf50',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  정답: {`①②③④⑤`[quizItem.work06Data.answerIndex] || quizItem.work06Data.answerIndex + 1}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h4>본문 해석:</h4>
                  <div style={{
                    background: '#f1f8e9',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c8e6c9'
                  }}>
                    {quizItem.translatedText}
                  </div>
                </div>
              </div>
            );
          }

          // Work_07 (주제 추론) 표시
          if (quizItem.workTypeId === '07' && quizItem.work07Data) {
            return (
              <div key={`work-07-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#07. 주제 추론</h3>

                <div style={{
                  fontWeight: '800',
                  fontSize: '1.18rem',
                  background: '#222',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '1.2rem'
                }}>
                  다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요.
                </div>

                <div style={{
                  background: '#FFF3CD',
                  border: '1.5px solid #e3e6f0',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  marginBottom: '1.5rem',
                  fontSize: '1.1rem',
                  lineHeight: '1.7'
                }}>
                  {quizItem.work07Data.passage}
                </div>

                <div style={{
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  {quizItem.work07Data.options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{
                      padding: '0.8rem 1rem',
                      marginBottom: '0.5rem',
                      background: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #dee2e6',
                      fontSize: '1rem',
                      lineHeight: '1.5'
                    }}>
                      {['①', '②', '③', '④', '⑤'][optionIndex]} {option}
                      {quizItem.work07Data?.optionTranslations && quizItem.work07Data?.optionTranslations[optionIndex] && (
                        <div style={{fontSize:'0.85rem', color:'#666', marginTop:'0.3rem'}}>
                          {quizItem.work07Data?.optionTranslations[optionIndex]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{
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

                <div style={{ marginTop: '1.5rem' }}>
                  <h4>본문 해석:</h4>
                  <div style={{
                    background: '#f1f8e9',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c8e6c9'
                  }}>
                    {quizItem.translatedText}
                  </div>
                </div>
              </div>
            );
          }

          // Work_08 (제목 추론) 표시
          if (quizItem.workTypeId === '08' && quizItem.work08Data) {
            return (
              <div key={`work-08-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#08. 제목 추론</h3>

                <div style={{
                  background: '#000',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '0.8rem 1.2rem',
                  marginBottom: '0.8rem',
                  fontSize: '1.18rem',
                  fontWeight: '800'
                }}>
                  다음 본문에 가장 적합한 제목을 고르세요.
                </div>

                <div style={{
                  background: '#FFF3CD',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  marginBottom: '1.5rem',
                  fontSize: '1rem',
                  lineHeight: '1.6'
                }}>
                  {quizItem.work08Data.passage}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
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

                <div style={{
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

                <div style={{ marginTop: '1.5rem' }}>
                  <h4>본문 해석:</h4>
                  <div style={{
                    background: '#f1f8e9',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c8e6c9'
                  }}>
                    {quizItem.translatedText}
                  </div>
                </div>
              </div>
            );
          }

          // Work_09 (어법 오류) 표시
          if (quizItem.workTypeId === '09' && quizItem.work09Data) {
            return (
              <div key={`work-09-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#09. 어법 오류 찾기</h3>

                <div style={{
                  fontWeight: '800',
                  fontSize: '1.18rem',
                  background: '#222',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '1.2rem'
                }}>
                  다음 글의 밑줄 친 부분 중, 어법상 틀린 것을 고르시오.
                </div>

                <div style={{
                  background: '#FFF3CD',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  marginBottom: '1.5rem'
                }}>
                  {quizItem.work09Data.passage}
                </div>

                <div style={{
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  {quizItem.work09Data.options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{
                      padding: '0.8rem',
                      marginBottom: '0.5rem',
                      background: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #dee2e6'
                    }}>
                      {['①', '②', '③', '④', '⑤'][optionIndex]} {option}
                    </div>
                  ))}
                </div>

                <div style={{
                  background: '#e8f5e8',
                  border: '2px solid #4caf50',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  color: '#1976d2',
                  fontWeight: '700',
                  fontSize: '1.1rem'
                }}>
                  정답: {quizItem.work09Data.options[quizItem.work09Data.answerIndex]} → {quizItem.work09Data.original}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h4>본문 해석:</h4>
                  <div style={{
                    background: '#f1f8e9',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c8e6c9'
                  }}>
                    {quizItem.translatedText}
                  </div>
                </div>
              </div>
            );
          }

          // Work_10 (다중 어법 오류) 표시
          if (quizItem.workTypeId === '10' && quizItem.work10Data) {
            return (
              <div key={`work-10-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#10. 다중 어법 오류</h3>

                <div style={{
                  background: '#000',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '0.6rem',
                  fontSize: '1.18rem',
                  fontWeight: '800'
                }}>
                  다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?
                </div>

                <div style={{
                  background: '#FFF3CD',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  marginBottom: '1.5rem'
                }}>
                  <span dangerouslySetInnerHTML={{__html: quizItem.work10Data.passage.replace(/\n/g, '<br/>')}} />
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem',
                  marginBottom: '1.5rem'
                }}>
                  {quizItem.work10Data.options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{
                      padding: '0.8rem 1rem',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      fontSize: '1.05rem'
                    }}>
                      <span style={{ marginRight: '1rem', fontWeight: '700', color: '#333' }}>
                        {optionIndex + 1}.
                      </span>
                      <span style={{fontWeight: '600'}}>{option}개</span>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#e8f5e8',
                  borderRadius: '8px',
                  border: '2px solid #4caf50'
                }}>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#1976d2',
                    marginBottom: '0.5rem'
                  }}>
                    정답: {quizItem.work10Data.options[quizItem.work10Data.answerIndex]}개
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    color: '#666',
                    lineHeight: 1.5
                  }}>
                    어법상 틀린 단어: {quizItem.work10Data?.wrongIndexes.map(i => 
                      `${'①②③④⑤⑥⑦⑧'[i]}${quizItem.work10Data?.transformedWords[i]} → ${quizItem.work10Data?.originalWords[i]}`
                    ).join(', ')}
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h4>본문 해석:</h4>
                  <div style={{
                    background: '#f1f8e9',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c8e6c9'
                  }}>
                    {quizItem.translatedText}
                  </div>
                </div>
              </div>
            );
          }

          // Work_11 (문장별 해석) 표시
          if (quizItem.workTypeId === '11' && quizItem.work11Data) {
            return (
              <div key={`work-11-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#11. 본문 문장별 해석</h3>

                <div style={{
                  fontWeight: '800',
                  fontSize: '1.18rem',
                  background: '#222',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '1.2rem'
                }}>
                  다음 본문을 문장별로 해석하세요.
                </div>

                {quizItem.work11Data.sentences.map((sentence, sentenceIndex) => (
                  <div key={sentenceIndex} style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      color: '#666',
                      marginBottom: '0.5rem'
                    }}>
                      문장 {sentenceIndex + 1}
                    </div>
                    <div style={{
                      background: '#FFF3CD',
                      padding: '0.8rem',
                      borderRadius: '6px',
                      marginBottom: '0.5rem',
                      border: '1px solid #ffeaa7'
                    }}>
                      {sentence.english}
                    </div>
                    <div style={{
                      background: '#f1f8e9',
                      padding: '0.8rem',
                      borderRadius: '6px',
                      border: '1px solid #c8e6c9',
                      color: '#1976d2',
                      fontWeight: '600'
                    }}>
                      {sentence.korean}
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          // Work_12 (단어 학습) 표시
          if (quizItem.workTypeId === '12' && quizItem.work12Data) {
            return (
              <div key={`work-12-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#12. 단어 학습</h3>

                <div style={{
                  fontWeight: '800',
                  fontSize: '1.18rem',
                  background: '#222',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '1.2rem'
                }}>
                  다음 단어들의 뜻을 학습하세요.
                </div>

                {quizItem.work12Data.words.map((word, wordIndex) => (
                  <div key={wordIndex} style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      color: '#2d3748',
                      marginBottom: '0.5rem'
                    }}>
                      {wordIndex + 1}. {word.english}
                    </div>
                    <div style={{
                      fontSize: '0.95rem',
                      color: '#1976d2',
                      fontWeight: '600',
                      marginBottom: '0.5rem'
                    }}>
                      뜻: {word.korean}
                    </div>
                    {word.example && (
                      <div style={{
                        fontSize: '0.9rem',
                        color: '#666',
                        fontStyle: 'italic',
                        background: '#fff',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0'
                      }}>
                        예문: {word.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          }

          // Work_13 (빈칸 채우기 - 단어) 표시
          if (quizItem.workTypeId === '13' && quizItem.work13Data) {
            return (
              <div key={`work-13-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#13. 빈칸 채우기 (단어-주관식)</h3>

                <div style={{
                  fontWeight: '800',
                  fontSize: '1.18rem',
                  background: '#222',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '1.2rem'
                }}>
                  다음 빈칸에 들어갈 적절한 단어를 쓰시오.
                </div>

                <div style={{
                  background: '#FFF3CD',
                  border: '1.5px solid #e3e6f0',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  marginBottom: '1.5rem',
                  fontSize: '1.08rem',
                  lineHeight: '1.7'
                }}>
                  {quizItem.work13Data.blankedText}
                </div>

                <div style={{
                  background: '#e8f5e8',
                  border: '2px solid #4caf50',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#1976d2',
                    marginBottom: '0.5rem'
                  }}>
                    정답:
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    color: '#2d3748',
                    lineHeight: 1.6
                  }}>
                    {quizItem.work13Data.correctAnswers.map((answer, answerIndex) => (
                      <div key={answerIndex} style={{ marginBottom: '0.3rem' }}>
                        {answerIndex + 1}. {answer}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h4>본문 해석:</h4>
                  <div style={{
                    background: '#f1f8e9',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c8e6c9'
                  }}>
                    {quizItem.translatedText}
                  </div>
                </div>
              </div>
            );
          }

          // Work_14 (빈칸 채우기 - 문장) 표시
          if (quizItem.workTypeId === '14' && quizItem.work14Data) {
            return (
              <div key={`work-14-${index}`} style={{
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#000',
                  margin: '0 0 1rem 0'
                }}>#14. 빈칸 채우기 (문장-주관식)</h3>

                <div style={{
                  fontWeight: '800',
                  fontSize: '1.18rem',
                  background: '#222',
                  color: '#fff',
                  padding: '0.7rem 1.2rem',
                  borderRadius: '8px',
                  marginBottom: '1.2rem'
                }}>
                  다음 빈칸에 들어갈 적절한 문장을 쓰시오.
                </div>

                <div style={{
                  background: '#FFF3CD',
                  border: '1.5px solid #e3e6f0',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  marginBottom: '1.5rem',
                  fontSize: '1.08rem',
                  lineHeight: '1.7'
                }}>
                  {quizItem.work14Data.blankedText}
                </div>

                <div style={{
                  background: '#e8f5e8',
                  border: '2px solid #4caf50',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#1976d2',
                    marginBottom: '0.5rem'
                  }}>
                    정답 문장:
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    color: '#2d3748',
                    lineHeight: 1.6
                  }}>
                    {quizItem.work14Data.correctAnswers?.map((answer, answerIndex) => (
                      <div key={answerIndex} style={{
                        marginBottom: '0.8rem',
                        padding: '0.5rem',
                        background: '#fff',
                        borderRadius: '4px',
                        border: '1px solid #c8e6c9'
                      }}>
                        {answerIndex + 1}. {answer}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <h4>본문 해석:</h4>
                  <div style={{
                    background: '#f1f8e9',
                    padding: '1.2rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c8e6c9'
                  }}>
                    {quizItem.translatedText}
                  </div>
                </div>
              </div>
            );
          }
          
          return null;
        })}
      </div>
    );
  }

  // 문제 생성 전 화면
  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>📦 패키지 퀴즈 (A4용지 2단)</h2>
        <p>하나의 영어 본문으로 필요한 유형들을 A4용지 2단으로 구성해서 생성합니다.</p>
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
          <button 
            type="button" 
            className="select-all-button"
            onClick={handleSelectAll}
          >
            {Object.values(selectedWorkTypes).every(selected => selected) ? '전체 해제' : '전체 선택'}
          </button>
        </div>
        <div className="work-types-grid">
          {WORK_TYPES.map(type => (
            <label key={type.id} className="work-type-checkbox">
              <input
                type="checkbox"
                checked={selectedWorkTypes[type.id] || false}
                onChange={() => handleWorkTypeToggle(type.id)}
              />
              <div className="checkbox-label">
                <span className="work-type-id">#{type.id}</span>
                <span className="work-type-name">{type.name}</span>
                <span className="work-type-points">(200P)</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 로딩 상태 표시 */}
      {isLoading && (
        <div className="centered-hourglass-overlay">
          <div className="centered-hourglass-content">
            <div className="centered-hourglass-spinner">⏳</div>
            <div className="loading-text">
              {isExtractingText ? '📄 텍스트 추출 중...' : '📋 패키지 문제 생성 중...'}
            </div>
            {progressInfo.total > 0 && (
              <div className="progress-info">
                <div className="progress-text">
                  {progressInfo.completed} / {progressInfo.total} 유형 완료
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(progressInfo.completed / progressInfo.total) * 100}%` }}
                  />
                </div>
                <div className="current-type">
                  {progressInfo.currentType}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <button
        type="button"
        className="generate-button"
        onClick={handleGenerateQuiz}
        disabled={isLoading}
      >
        {isLoading ? '생성 중...' : '패키지 퀴즈 (A4용지 2단) 생성'}
      </button>
    </div>
  );
};

export default Package_02_TwoStepQuiz;
