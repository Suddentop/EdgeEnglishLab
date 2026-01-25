import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import './Package_02_TwoStepQuiz.css';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { savePackageQuizHistory } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import { generateWork01ExamQuiz } from '../../../services/work01Service';
import { Quiz } from '../../../types/types';
import { generateWork02Quiz, Work02QuizData } from '../../../services/work02Service';
import PrintFormatPackage02 from './PrintFormatPackage02';
import SimplePrintFormatPackage02 from './SimplePrintFormatPackage02';
import { generateWork03Quiz } from '../../../services/work03Service';
import { generateWork04Quiz } from '../../../services/work04Service';
import { generateWork05Quiz } from '../../../services/work05Service';
import { generateWork06Quiz } from '../../../services/work06Service';
import { generateWork07Quiz } from '../../../services/work07Service';
import { generateWork08Quiz } from '../../../services/work08Service';
import { generateWork09Quiz } from '../../../services/work09Service';
import { generateWork10Quiz, MultiGrammarQuiz } from '../../../services/work10Service';
import { generateWork11Quiz } from '../../../services/work11Service';
import { generateBlankFillQuizWithAI } from '../../../services/work13Service';
import { generateBlankQuizWithAI, imageToTextWithOpenAIVision } from '../../../services/work14Service';
import { translateToKorean } from '../../../services/common';
import { formatBlankedTextForWork13, formatBlankedText } from './printNormalization';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import PrintHeaderPackage02 from './PrintHeaderPackage02';
import '../shared/PrintControls.css';
import FileFormatSelector from '../shared/FileFormatSelector';
import { FileFormat, generateAndUploadFile } from '../../../services/pdfService';

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

// MultiGrammarQuiz는 work10Service에서 import하여 사용

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
  work13Data?: BlankFillItem;
  work14Data?: BlankQuizWithTranslation;
  translatedText: string;
}

const Package_02_TwoStepQuiz: React.FC = () => {
  const { userData, loading } = useAuth();
  const navigate = useNavigate();
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
  const [failedWorkTypes, setFailedWorkTypes] = useState<Array<{ id: string; name: string }>>([]);

  // Work_02 전용: 교체된 단어 강조 함수
  const renderTextWithHighlight = (text: string, replacements: any[]) => {
    if (!replacements || replacements.length === 0) return text;
    
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    let result = '';
    
    sentences.forEach((sentence, index) => {
      const replacement = replacements[index];
      if (replacement) {
        const word = replacement.replacement;
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        result += sentence.replace(regex, `<strong style="font-weight: bold;">${word}</strong>`) + ' ';
      } else {
        result += sentence + ' ';
      }
    });
    
    return result.trim();
  };

  // 진행 상황 추적
  const [progressInfo, setProgressInfo] = useState({
    completed: 0,
    total: 0,
    currentType: '',
    currentTypeId: ''
  });

  // 선택된 유형 상태 초기화 (sessionStorage에서 복원)
  const getInitialSelectedWorkTypes = (): Record<string, boolean> => {
    const saved = sessionStorage.getItem('package02_selectedWorkTypes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('저장된 선택 상태 복원 실패:', e);
      }
    }
    // 기본값
    return {
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
    };
  };

  const [selectedWorkTypes, setSelectedWorkTypes] = useState<Record<string, boolean>>(getInitialSelectedWorkTypes);

  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);
  const [fileFormat, setFileFormat] = useState<FileFormat>('pdf');

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
    { id: '13', name: '빈칸 채우기 (단어-주관식)' },
    { id: '14', name: '빈칸 채우기 (문장-주관식)' }
  ];

  // UI ID와 Firebase ID 매핑
  const UI_TO_FIREBASE_ID_MAP: { [key: string]: string } = {
    '01': '1',
    '02': '2', 
    '03': '3',
    '04': '4',
    '05': '5',
    '06': '6',
    '07': '7',
    '08': '8',
    '09': '9',
    '10': '10',
    '11': '11',
    '12': '12',
    '13': '13',
    '14': '14'
  };

  const handleInputModeChange = (mode: 'capture' | 'image' | 'text') => {
    setInputMode(mode);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleWorkTypeToggle = (typeId: string) => {
    setSelectedWorkTypes(prev => {
      const newState = {
        ...prev,
        [typeId]: !prev[typeId]
      };
      // sessionStorage에 저장
      sessionStorage.setItem('package02_selectedWorkTypes', JSON.stringify(newState));
      return newState;
    });
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedWorkTypes).every(selected => selected);
    const newState: Record<string, boolean> = {};
    Object.keys(selectedWorkTypes).forEach(key => {
      newState[key] = !allSelected;
    });
    // sessionStorage에 저장
    sessionStorage.setItem('package02_selectedWorkTypes', JSON.stringify(newState));
    setSelectedWorkTypes(newState);
  };

  // 포인트 관련 함수들
  useEffect(() => {
    const loadPointData = async () => {
      if (!userData?.uid) return;
      
      try {
        // 사용자 현재 포인트 조회
        const currentPoints = await getUserCurrentPoints(userData.uid);
        setUserCurrentPoints(currentPoints);
        
        // 유형별 포인트 설정 조회
        const workTypePointsData = await getWorkTypePoints();
        setWorkTypePoints(workTypePointsData);
      } catch (error) {
        console.error('포인트 데이터 로드 오류:', error);
      }
    };
    
    loadPointData();
  }, [userData?.uid]);


  // 선택된 유형들의 총 포인트 계산 함수
  const calculateTotalPoints = () => {
    const selectedTypes = WORK_TYPES.filter(type => selectedWorkTypes[type.id]);
    let totalPoints = 0;
    
    selectedTypes.forEach(type => {
      const firebaseId = UI_TO_FIREBASE_ID_MAP[type.id];
      const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId);
      if (workTypePoint) {
        totalPoints += workTypePoint.points;
      }
    });
    
    return totalPoints;
  };

  // 포인트 차감 확인 핸들러
  const handlePointDeductionConfirm = () => {
    setShowPointModal(false);
    executeQuizGeneration();
  };

  // 포인트 환불 처리 함수
  const handlePointRefund = async (deductedPoints: number, reason: string) => {
    if (deductedPoints > 0 && userData?.uid) {
      try {
        const selectedTypes = WORK_TYPES.filter(type => selectedWorkTypes[type.id]);
        await refundUserPoints(
          userData.uid,
          deductedPoints,
          `패키지 퀴즈 생성 (${selectedTypes.length}개 유형)`,
          userData.name || '사용자',
          userData.nickname || '사용자',
          reason
        );
        
        // 사용자 포인트 다시 조회
        const currentPoints = await getUserCurrentPoints(userData.uid);
        setUserCurrentPoints(currentPoints);
        
        console.log('💰 포인트 환불 완료:', deductedPoints);
        return true;
      } catch (refundError) {
        console.error('❌ 포인트 환불 실패:', refundError);
        return false;
      }
    }
    return true;
  };

  // 실제 문제 생성 실행
  const executeQuizGeneration = async () => {
    if (!userData?.uid) return;

    setIsLoading(true);
    setPackageQuiz(null);
    setFailedWorkTypes([]); // 실패한 유형 목록 초기화
    let deductedPoints = 0;
    let successfulTypes: string[] = [];
    
    try {
      // 선택된 유형들에 대해서만 포인트 차감
      const selectedTypes = WORK_TYPES.filter(type => selectedWorkTypes[type.id]);
      let remainingPoints = userCurrentPoints;
      
      for (const type of selectedTypes) {
        const firebaseId = UI_TO_FIREBASE_ID_MAP[type.id];
        console.log(`🔍 포인트 차감 대상: 유형#${type.id} -> Firebase ID: ${firebaseId}`);
        
        const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId);
        console.log(`🔍 찾은 포인트 설정:`, workTypePoint);
        
        if (workTypePoint) {
          console.log(`💰 포인트 차감: 유형#${type.id} (${type.name}) - ${workTypePoint.points}P`);
          
          const deductionResult = await deductUserPoints(
            userData.uid,
            firebaseId,
            type.name,
            userData.name || '사용자',
            userData.nickname || '사용자'
          );

          console.log(`💰 포인트 차감 결과:`, deductionResult);

          if (!deductionResult.success) {
            throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
          }

          deductedPoints += deductionResult.deductedPoints;
          remainingPoints = deductionResult.remainingPoints; // 마지막 차감 결과의 남은 포인트 사용
        } else {
          console.error(`❌ 유형#${type.id}의 포인트 설정을 찾을 수 없습니다.`);
          throw new Error(`유형#${type.id}의 포인트 설정을 찾을 수 없습니다.`);
        }
      }

      setUserCurrentPoints(remainingPoints);

      // 문제 생성 실행
      console.log('📦 패키지 퀴즈 생성 시작...');
      console.log('입력된 텍스트:', inputText);
      console.log('선택된 유형들:', selectedTypes.map(t => t.name));

      // 병렬 문제 생성
      const generatedQuizzes = await generatePackageQuiz(inputText);

      if (generatedQuizzes.length === 0) {
        throw new Error('생성된 문제가 없습니다.');
      }

      // 성공한 유형들 추적
      successfulTypes = generatedQuizzes.map(quiz => quiz.workTypeId);
      
      // 부분적 실패 확인: 일부 유형만 생성된 경우
      const failedTypes = selectedTypes.filter(type => !successfulTypes.includes(type.id));
      
      if (failedTypes.length > 0) {
        console.warn(`⚠️ 일부 유형 생성 실패: ${failedTypes.map(t => t.name).join(', ')}`);
        
        // 실패한 유형들을 상태에 저장
        setFailedWorkTypes(failedTypes);
        
        // 실패한 유형들의 포인트만 환불
        let refundAmount = 0;
        for (const failedType of failedTypes) {
          const firebaseId = UI_TO_FIREBASE_ID_MAP[failedType.id];
          const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId);
          if (workTypePoint) {
            refundAmount += workTypePoint.points;
          }
        }
        
        if (refundAmount > 0) {
          await handlePointRefund(
            refundAmount, 
            `일부 유형 생성 실패로 인한 포인트 환불 (${failedTypes.map(t => t.name).join(', ')})`
          );
        }
      }

      // 생성된 퀴즈 설정
      setPackageQuiz(generatedQuizzes);
      
      // 화면 전환
      setShowQuizDisplay(true);
      
      console.log('✅ 패키지 퀴즈 생성 완료:', generatedQuizzes);

      // 문제 생성 내역 저장
      if (userData?.uid) {
        try {
          console.log('📦 패키지#02 내역 저장 시작:', {
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            quizzesCount: generatedQuizzes.length,
            inputTextLength: inputText.length,
            workTypePointsCount: workTypePoints.length
          });
          
          await savePackageQuizHistory(
            userData.uid,
            userData.name || '사용자',
            userData.nickname || '사용자',
            generatedQuizzes,
            inputText,
            workTypePoints,
            UI_TO_FIREBASE_ID_MAP,
            'P02' // 패키지#02 식별자
          );
          
          console.log('✅ 패키지#02 내역 저장 완료');
        } catch (historyError) {
          console.error('❌ 패키지#02 내역 저장 실패:', historyError);
        }
      }

    } catch (error) {
      console.error('❌ 문제 생성 실패:', error);
      
      // 전체 실패 시 모든 차감된 포인트 환불
      await handlePointRefund(
        deductedPoints, 
        '문제 생성 실패로 인한 포인트 환불'
      );
      
      alert(`문제 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
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
          <span key={elementIndex++} className="print-word-highlight">
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
  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // OCR → textarea에 자동 입력
      setIsExtractingText(true);
      setIsLoading(true);
      try {
        const ocrText = await imageToTextWithOpenAIVision(file);
        console.log('📝 추출된 텍스트 길이:', ocrText.length);
        
        if (ocrText && ocrText.trim().length > 0) {
          setInputText(ocrText);
          // 이미지 파일 업로드 후에도 텍스트 모드로 전환
          setInputMode('text');
          setTimeout(() => {
            if (textAreaRef.current) {
              textAreaRef.current.style.height = 'auto';
              textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
              textAreaRef.current.focus();
            }
          }, 100);
        } else {
          console.warn('⚠️ 추출된 텍스트가 비어있음');
          alert('이미지에서 텍스트를 추출할 수 없습니다. 다른 이미지를 시도해주세요.');
        }
      } catch (err) {
        console.error('❌ 이미지 텍스트 추출 실패:', err);
        alert(`OCR 처리 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsExtractingText(false);
        setIsLoading(false);
      }
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
        console.log('✅ 이미지 발견!');
        const file = item.getAsFile();
        if (file) {
          console.log('✅ 파일 생성 성공:', { name: file.name, size: file.size, type: file.type });
          setImageFile(file);
          setIsExtractingText(true);
          setIsLoading(true);
          try {
            console.log('🔄 OCR 처리 시작...');
            console.log('📁 파일 정보:', { name: file.name, size: file.size, type: file.type });
            
            const ocrText = await imageToTextWithOpenAIVision(file);
            console.log('✅ OCR 처리 완료:', ocrText.substring(0, 100) + '...');
            console.log('📝 추출된 텍스트 길이:', ocrText.length);
            
            if (ocrText && ocrText.trim().length > 0) {
              console.log('🔄 setInputText 호출 전 - 현재 inputText:', inputText);
              console.log('🔄 setInputText 호출 전 - ocrText 길이:', ocrText.length);
              setInputText(ocrText);
              setInputMode('text'); // OCR 완료 후 텍스트 모드로 전환
              console.log('✅ setInputText 호출 완료 및 inputMode를 text로 변경');
              
              // 상태 업데이트 확인을 위한 setTimeout
              setTimeout(() => {
                console.log('🔄 setInputText 호출 후 - inputText 상태:', inputText);
                console.log('🔄 setInputText 호출 후 - inputText 길이:', inputText?.length || 0);
                console.log('🔄 현재 inputMode:', inputMode);
                if (textAreaRef.current) {
                  textAreaRef.current.style.height = 'auto';
                  textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
                  textAreaRef.current.focus();
                }
              }, 100);
            } else {
              console.warn('⚠️ 추출된 텍스트가 비어있음');
              alert('이미지에서 텍스트를 추출할 수 없습니다. 다른 이미지를 시도해주세요.');
            }
          } catch (err) {
            console.error('❌ OCR 처리 오류 상세:', err);
            console.error('❌ 오류 타입:', typeof err);
            console.error('❌ 오류 메시지:', err instanceof Error ? err.message : String(err));
            console.error('❌ 오류 스택:', err instanceof Error ? err.stack : 'No stack trace');
            alert(`OCR 처리 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`);
          } finally {
            setIsExtractingText(false);
            setIsLoading(false);
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
          // ✅ 모의고사 형식으로 생성 (원래 유형#01과 동일)
          const quiz = await generateWork01ExamQuiz(inputText);
          quizItem.quiz = quiz;
          
          // work01Service에서 생성된 번역을 우선 사용
          // 번역이 있고 실패 메시지가 포함되지 않은 경우
          if (quiz.translation && quiz.translation.trim() && !quiz.translation.includes('[번역 실패')) {
            quizItem.translatedText = quiz.translation;
          } else {
            // work01Service의 번역이 실패한 경우, 단락별 번역을 조합하여 사용
            if (quiz.paragraphs && quiz.paragraphs.length > 0) {
              const paragraphTranslations = quiz.paragraphs
                .map((p: any) => p.translation)
                .filter((t: string) => t && t.trim() && !t.includes('[번역 실패'))
                .join('\n\n');
              
              if (paragraphTranslations && paragraphTranslations.trim()) {
                quizItem.translatedText = paragraphTranslations;
              } else {
                // 모든 번역이 실패한 경우, 영어 원문을 표시하거나 빈 문자열
                // (문제는 생성되었지만 번역이 없는 상태)
                console.warn('⚠️ 유형#01 모든 번역 실패, 문제는 생성되었습니다.');
                quizItem.translatedText = ''; // 빈 문자열로 설정하여 UI에서 처리
              }
            } else {
              // paragraphs가 없는 경우 (이론적으로 발생하지 않아야 함)
              quizItem.translatedText = '';
            }
          }
          break;
        }

        case '02': {
          const quiz = await generateWork02Quiz(inputText);
          quizItem.work02Data = quiz;
          // 번역 실패 시에도 문제 생성은 계속 진행
          try {
            quizItem.translatedText = await translateToKorean(inputText);
          } catch (error: any) {
            console.warn('⚠️ 유형#02 번역 실패, 문제는 생성되었습니다:', error.message);
            quizItem.translatedText = '[번역 실패: API 인증 오류]';
          }
          break;
        }

        case '03': {
          const quiz = await generateWork03Quiz(inputText);
          // 번역 실패 시에도 문제 생성은 계속 진행
          let translation = '';
          try {
            translation = await translateToKorean(inputText);
          } catch (error: any) {
            console.warn('⚠️ 유형#03 번역 실패, 문제는 생성되었습니다:', error.message);
            translation = '[번역 실패: API 인증 오류]';
          }
          quizItem.work03Data = {
            ...quiz,
            translation
          };
          quizItem.translatedText = translation;
          break;
        }

        case '04': {
          const quiz = await generateWork04Quiz(inputText);
          // 번역 실패 시에도 문제 생성은 계속 진행
          let translation = '';
          try {
            translation = await translateToKorean(inputText);
          } catch (error: any) {
            console.warn('⚠️ 유형#04 번역 실패, 문제는 생성되었습니다:', error.message);
            translation = '[번역 실패: API 인증 오류]';
          }
          quizItem.work04Data = {
            ...quiz,
            translation
          };
          quizItem.translatedText = translation;
          break;
        }

        case '05': {
          const quiz = await generateWork05Quiz(inputText); // 패키지는 동일 본문으로 여러 번 생성하지 않으므로 이전 선택 없음
          // 번역 실패 시에도 문제 생성은 계속 진행
          let translation = '';
          try {
            translation = await translateToKorean(inputText);
          } catch (error: any) {
            console.warn('⚠️ 유형#05 번역 실패, 문제는 생성되었습니다:', error.message);
            translation = '[번역 실패: API 인증 오류]';
          }
          quizItem.work05Data = {
            ...quiz,
            translation,
            // optionTranslations가 있으면 포함
            optionTranslations: quiz.optionTranslations || undefined
          };
          quizItem.translatedText = translation;
          break;
        }

        case '06': {
          const quiz = await generateWork06Quiz(inputText); // 패키지는 동일 본문으로 여러 번 생성하지 않으므로 이전 선택 없음
          quizItem.work06Data = quiz;
          // 주요 문장을 포함한 원본 전체 본문의 번역
          // 번역 실패 시에도 문제 생성은 계속 진행
          try {
            quizItem.translatedText = await translateToKorean(inputText);
          } catch (error: any) {
            console.warn('⚠️ 유형#06 번역 실패, 문제는 생성되었습니다:', error.message);
            quizItem.translatedText = '[번역 실패: API 인증 오류]';
          }
          break;
        }

        case '07': {
          const quiz = await generateWork07Quiz(inputText); // 패키지는 동일 본문으로 여러 번 생성하지 않으므로 이전 선택 없음
          quizItem.work07Data = quiz;
          quizItem.translatedText = quiz.translation;
          break;
        }

        case '08': {
          const quiz = await generateWork08Quiz(inputText); // 패키지는 동일 본문으로 여러 번 생성하지 않으므로 이전 선택 없음
          quizItem.work08Data = quiz;
          quizItem.translatedText = quiz.translation;
          break;
        }

        case '09': {
          // ✅ 원래 유형#09와 동일한 로직 사용 (src/services/work09Service.ts의 generateWork09Quiz 함수)
          // ✅ src/services/workGrammarRules.ts의 금지목록이 자동 적용됨:
          //    - FORBIDDEN_TRANSFORMATIONS_PROMPT (프롬프트에 포함)
          //    - FORBIDDEN_EXAMPLES_PROMPT (프롬프트에 포함)
          //    - EXCLUDE_RULES_PROMPT (단어 선택 시 필터링)
          //    - validateTransformation() (코드 레벨 검증)
          // 패키지는 동일 본문으로 여러 번 생성하지 않으므로 previouslySelectedWords는 undefined
          const quiz = await generateWork09Quiz(inputText);
          quizItem.work09Data = quiz;
          quizItem.translatedText = quiz.translation;
          break;
        }

        case '10': {
          // ✅ 원래 유형#10과 동일한 로직 사용 (src/services/work10Service.ts의 generateWork10Quiz 함수)
          // ✅ src/services/workGrammarRules.ts의 금지목록이 자동 적용됨:
          //    - EXCLUDE_RULES_PROMPT (단어 선택 시 필터링)
          //    - validateTransformation() (코드 레벨 검증, work09Service.ts의 transformWord 함수 재사용)
          // 패키지는 동일 본문으로 여러 번 생성하지 않으므로 previouslySelectedWords는 undefined
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
            korean: quiz.translations[index] || ''
          }));
          
          quizItem.work11Data = {
            sentences: sentencesWithTranslations
          };
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
          console.log('✅ 패키지#02-유형#14 데이터 생성 완료:', {
            blankedText_길이: quiz.blankedText?.length,
            blankedText_일부: quiz.blankedText?.substring(0, 200),
            hasBlanks: quiz.blankedText?.includes('( A '),
            correctAnswers_개수: quiz.correctAnswers?.length,
            translation_길이: quiz.translation?.length
          });
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

    // 포인트 부족 확인
    const totalPoints = calculateTotalPoints();
    if (userCurrentPoints < totalPoints) {
      alert(`포인트가 부족합니다. 현재 보유 포인트: ${userCurrentPoints.toLocaleString()}P, 필요 포인트: ${totalPoints.toLocaleString()}P`);
      return;
    }

    // 포인트 차감 모달 표시
    setPointsToDeduct(totalPoints);
    setShowPointModal(true);
  };

  // 새 문제 만들기
  const handleNewProblem = () => {
    setShowQuizDisplay(false);
    setPackageQuiz(null);
    setTranslatedText('');
    setInputText('');
  };

  // 인쇄(문제) 핸들러
  // 블러 오버레이 생성 및 제거 헬퍼 함수 (메인 영역만)
  const showBlurOverlay = () => {
    // 기존 오버레이가 있으면 제거
    const existing = document.getElementById('print-blur-overlay');
    if (existing) {
      existing.remove();
    }
    
    // 메인 콘텐츠 영역 찾기 (문제 생성 후: quiz-display, 문제 생성 전: quiz-generator)
    const mainContent = document.querySelector('.quiz-display') || document.querySelector('.quiz-generator') || document.querySelector('.package-quiz-container');
    
    if (!mainContent) {
      console.warn('메인 콘텐츠 영역을 찾을 수 없습니다.');
      return null;
    }
    
    // 메인 영역의 위치와 크기 계산
    const rect = mainContent.getBoundingClientRect();
    
    const overlay = document.createElement('div');
    overlay.id = 'print-blur-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      background-color: rgba(255, 255, 255, 0.3);
      z-index: 999999;
      pointer-events: none;
      transition: opacity 0.3s ease;
      border-radius: 16px;
    `;
    document.body.appendChild(overlay);
    return overlay;
  };

  const removeBlurOverlay = () => {
    const overlay = document.getElementById('print-blur-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
      }, 300); // transition 시간과 맞춤
    }
  };

  const handlePrintProblem = async () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(문제) 시작');
    
    // 블러 오버레이 표시
    const blurOverlay = showBlurOverlay();
    
    // 가로 페이지 스타일 동적 추가
    const style = document.createElement('style');
    style.id = 'print-style-package02';
    style.textContent = `
      @page {
        margin: 0;
        size: 29.7cm 21cm;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 29.7cm !important;
          min-width: 29.7cm !important;
          height: auto !important; /* 21cm 고정 해제 -> 내용만큼 늘어나도록 변경 */
          overflow: visible !important; /* hidden 해제 -> 다중 페이지 인쇄 가능하도록 변경 */
        }
        /* #root와 그 자식들을 인쇄에서 제외 (공간 차지 방지) */
        body > *:not(#print-root-package02) {
          display: none !important;
        }
        body * {
          visibility: hidden;
        }
        .print-container, .print-container * {
          visibility: visible;
        }
        .print-container {
          display: block !important;
          position: relative !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: auto !important; /* 21cm 고정 해제 */
          min-width: 0 !important;
          max-width: 29.7cm !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
        }
        /* 단일 페이지: 빨간 컨테이너 높이 21cm 고정 + overflow hidden (2페이지 오버플로우 방지) */
        .print-container:has(> .a4-landscape-page-template.last-page:only-child) {
          height: 21cm !important;
          min-height: 21cm !important;
          max-height: 21cm !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // 인쇄용 컨테이너 생성
    const printContainer = document.createElement('div');
    printContainer.id = 'print-root-package02';
    document.body.appendChild(printContainer);

    // 기존 화면 숨기기 (JS로 숨기지 않음 - CSS로 처리)
    const appRoot = document.getElementById('root');
    // if (appRoot) {
    //   appRoot.style.display = 'none';
    // }

    // 디버깅을 위한 원본 데이터 보관
    (window as any).__PACKAGE02_LAST_PACKAGE_QUIZ__ = packageQuiz;
    console.log('패키지#02 원본 packageQuiz', packageQuiz);

    // React 18 방식으로 렌더링
    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatPackage02 packageQuiz={packageQuiz} />);

    const activatePrintContainer = () => {
      const inner = printContainer.querySelector('.print-container');
      if (inner) {
        inner.classList.add('pdf-generation-active');
      } else {
        requestAnimationFrame(activatePrintContainer);
      }
    };
    activatePrintContainer();

    const doCleanup = () => {
      try { root.unmount(); } catch (_) {}
      if (printContainer.parentNode) document.body.removeChild(printContainer);
      if (appRoot) appRoot.style.display = 'block';
      const styleEl = document.getElementById('print-style-package02');
      if (styleEl?.parentNode) styleEl.parentNode.removeChild(styleEl);
      console.log('✅ 인쇄(문제) 완료');
      window.onafterprint = null;
    };

    // 렌더링 완료 후 인쇄 및 파일 생성
    // 문제생성 직후 렌더링 지연을 방지하기 위해 폴링 메커니즘 사용
    let attempts = 0;
    const maxAttempts = 50; // 50ms * 50 = 2500ms (2.5초 최대 대기, 더 빠른 반응)
    let uploadPromise: Promise<void> | null = null; // window.onafterprint에서 접근 가능하도록 외부 스코프에 선언
    
    const checkRenderAndPrint = async () => {
      // 파일 생성 및 Firebase Storage 업로드 (백그라운드 처리)
      const uploadTask = async () => {
        try {
          const element = document.getElementById('print-root-package02');
          if (element && userData?.uid) {
            const { updateQuizHistoryFile } = await import('../../../services/quizHistoryService');
            
            const result = await generateAndUploadFile(
              element as HTMLElement,
              userData.uid,
              `package02_problem_${Date.now()}`,
              '패키지#02_문제',
              { isAnswerMode: false, orientation: 'landscape', fileFormat }
            );
            
            // 패키지 내역에 파일 URL 저장
            const { getQuizHistory } = await import('../../../services/quizHistoryService');
            const history = await getQuizHistory(userData.uid, { limit: 10 });
            const packageHistory = history.find(h => h.workTypeId === 'P02');
            
            if (packageHistory) {
              await updateQuizHistoryFile(packageHistory.id, result.url, result.fileName, 'problem');
               const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
              console.log(`📁 패키지#02 문제 ${formatName} 저장 완료:`, result.fileName);
            }
          }
        } catch (error) {
          console.error(`❌ 파일 저장 실패 (${fileFormat}):`, error);
        }
      };

      if (fileFormat === 'pdf') {
        // 마운트 포인트 내에서 last-page 찾기
        const lastPage = printContainer.querySelector('.a4-landscape-page-template.last-page') as HTMLElement;
        
        // 렌더링 완료 조건: 마지막 페이지가 존재하고 높이가 0보다 커야 함
        if (lastPage && lastPage.offsetHeight > 0) {
          // PDF: 인쇄 대화상자 닫힐 때 cleanup (afterprint). 그 전까지 DOM 유지해야 미리보기에 내용 표시됨.
          // 업로드 작업은 인쇄 후에 시작 (인쇄 속도에 영향 없도록)
          // requestAnimationFrame으로 즉시 처리 시작 (300ms 대기 제거)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // 업로드 작업 시작 (인쇄와 병렬 처리)
              uploadPromise = uploadTask();
            });
          });
          
          // 렌더링 완료 후 즉시 인쇄 처리 (requestAnimationFrame 사용)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
          // printContainer 상태 상세 로그
          const containerComputed = window.getComputedStyle(printContainer);
          const containerRect = printContainer.getBoundingClientRect();
          console.log(`[PKG02-PRINT] 📦 printContainer 상태:`, {
            id: printContainer.id,
            위치: `(${containerRect.left.toFixed(0)}px, ${containerRect.top.toFixed(0)}px)`,
            크기: `${containerRect.width.toFixed(0)}px × ${containerRect.height.toFixed(0)}px`,
            display: containerComputed.display,
            position: containerComputed.position,
            visibility: containerComputed.visibility,
            overflow: containerComputed.overflow,
            height: containerComputed.height,
            maxHeight: containerComputed.maxHeight,
            클래스: printContainer.className,
            자식수: printContainer.children.length
          });

          const lastPage = printContainer.querySelector('.a4-landscape-page-template.last-page') as HTMLElement;
          
          if (lastPage) {
            // lastPage 상태 상세 로그
            const pageComputed = window.getComputedStyle(lastPage);
            const pageRect = lastPage.getBoundingClientRect();
            const pageOffsetHeight = lastPage.offsetHeight;
            const pageScrollHeight = lastPage.scrollHeight;
            const pageClientHeight = lastPage.clientHeight;
            
            // 부모 요소 확인
            const parent = lastPage.parentElement;
            const parentComputed = parent ? window.getComputedStyle(parent) : null;
            const parentRect = parent ? parent.getBoundingClientRect() : null;
            
            console.log(`[PKG02-PRINT] 📄 lastPage 요소 상세 상태:`, {
              id: lastPage.id,
              클래스: lastPage.className,
              위치: `(${pageRect.left.toFixed(0)}px, ${pageRect.top.toFixed(0)}px)`,
              크기_getBoundingClientRect: `${pageRect.width.toFixed(2)}px × ${pageRect.height.toFixed(2)}px`,
              크기_offsetHeight: `${pageOffsetHeight.toFixed(2)}px (${(pageOffsetHeight / 37.8).toFixed(2)}cm)`,
              크기_scrollHeight: `${pageScrollHeight.toFixed(2)}px (${(pageScrollHeight / 37.8).toFixed(2)}cm)`,
              크기_clientHeight: `${pageClientHeight.toFixed(2)}px (${(pageClientHeight / 37.8).toFixed(2)}cm)`,
              CSS_height: pageComputed.height,
              CSS_maxHeight: pageComputed.maxHeight,
              CSS_minHeight: pageComputed.minHeight,
              CSS_overflow: pageComputed.overflow,
              CSS_pageBreakAfter: pageComputed.pageBreakAfter,
              CSS_breakAfter: pageComputed.breakAfter,
              CSS_display: pageComputed.display,
              CSS_position: pageComputed.position,
              CSS_boxSizing: pageComputed.boxSizing,
              인라인스타일_height: lastPage.style.height || '(없음)',
              인라인스타일_maxHeight: lastPage.style.maxHeight || '(없음)',
              인라인스타일_overflow: lastPage.style.overflow || '(없음)',
              부모요소: parent ? {
                tag: parent.tagName,
                id: parent.id,
                클래스: parent.className,
                크기: parentRect ? `${parentRect.width.toFixed(0)}px × ${parentRect.height.toFixed(0)}px` : 'N/A',
                overflow: parentComputed?.overflow || 'N/A'
              } : '없음'
            });

            // 자식 요소들 확인
            const pageHeader = lastPage.querySelector('.a4-landscape-page-header') as HTMLElement;
            const pageContent = lastPage.querySelector('.a4-landscape-page-content') as HTMLElement;
            const twoColumnContainer = lastPage.querySelector('.print-two-column-container') as HTMLElement;
            
            if (pageHeader) {
              const headerRect = pageHeader.getBoundingClientRect();
              const headerComputed = window.getComputedStyle(pageHeader);
              console.log(`[PKG02-PRINT]   ↳ 헤더(.a4-landscape-page-header):`, {
                높이: `${headerRect.height.toFixed(2)}px (${(headerRect.height / 37.8).toFixed(2)}cm)`,
                CSS_height: headerComputed.height,
                CSS_overflow: headerComputed.overflow
              });
            }
            
            if (pageContent) {
              const contentRect = pageContent.getBoundingClientRect();
              const contentComputed = window.getComputedStyle(pageContent);
              console.log(`[PKG02-PRINT]   ↳ 콘텐츠(.a4-landscape-page-content):`, {
                높이: `${contentRect.height.toFixed(2)}px (${(contentRect.height / 37.8).toFixed(2)}cm)`,
                CSS_height: contentComputed.height,
                CSS_flex: contentComputed.flex,
                CSS_overflow: contentComputed.overflow
              });
            }
            
            if (twoColumnContainer) {
              const containerRect = twoColumnContainer.getBoundingClientRect();
              const containerComputed = window.getComputedStyle(twoColumnContainer);
              console.log(`[PKG02-PRINT]   ↳ 2단컨테이너(.print-two-column-container):`, {
                높이: `${containerRect.height.toFixed(2)}px (${(containerRect.height / 37.8).toFixed(2)}cm)`,
                CSS_height: containerComputed.height,
                CSS_maxHeight: containerComputed.maxHeight,
                CSS_overflow: containerComputed.overflow
              });
            }

            // 총 높이 계산
            const headerHeight = pageHeader ? pageHeader.getBoundingClientRect().height : 0;
            const contentHeight = pageContent ? pageContent.getBoundingClientRect().height : 0;
            const containerHeight = twoColumnContainer ? twoColumnContainer.getBoundingClientRect().height : 0;
            const totalCalculatedHeight = headerHeight + (containerHeight || contentHeight);
            const totalCalculatedHeightCm = totalCalculatedHeight / 37.8;
            
            console.log(`[PKG02-PRINT] 📊 높이 합계 계산:`, {
              헤더높이: `${(headerHeight / 37.8).toFixed(2)}cm`,
              컨테이너높이: `${(containerHeight / 37.8).toFixed(2)}cm`,
              콘텐츠높이: `${(contentHeight / 37.8).toFixed(2)}cm`,
              계산된총높이: `${totalCalculatedHeightCm.toFixed(2)}cm`,
              A4가로높이: '21cm',
              초과여부: totalCalculatedHeightCm > 21 ? `⚠️ ${(totalCalculatedHeightCm - 21).toFixed(2)}cm 초과!` : '✅ 21cm 이하'
            });

            // ---------- 2페이지 원인 상세 로그 ----------
            const pxToCm = (px: number) => (px / 37.8);
            const parsePx = (s: string): number => (typeof s === 'string' && s.endsWith('px')) ? parseFloat(s) || 0 : 0;

            const redEl = printContainer.querySelector('.print-container') as HTMLElement | null;
            const redComputed = redEl ? window.getComputedStyle(redEl) : null;
            const redRect = redEl ? redEl.getBoundingClientRect() : null;

            const headerCssPx = pageHeader ? parsePx(window.getComputedStyle(pageHeader).height) : 0;
            const twoColCssPx = twoColumnContainer ? parsePx(window.getComputedStyle(twoColumnContainer).height) : 0;
            const contentPaddingBottom = pageContent ? parsePx(window.getComputedStyle(pageContent).paddingBottom) : 0;
            const cssBasedTotalPx = headerCssPx + twoColCssPx + contentPaddingBottom;
            const cssBasedTotalCm = pxToCm(cssBasedTotalPx);
            const a4HeightPx = 21 * 37.8;

            const onlyChild = lastPage?.parentElement?.children?.length === 1;
            const hasLastOnly = !!lastPage && !!lastPage.parentElement && onlyChild && lastPage.classList.contains('last-page');
            const singlePageSelectorMatch = hasLastOnly && lastPage!.parentElement!.querySelector('.a4-landscape-page-template.last-page:only-child') === lastPage;

            console.log(`[PKG02-PRINT] 🔴 빨간 테두리(.print-container) 상태:`, {
              찾음: !!redEl,
              width: redComputed?.width ?? 'N/A',
              height: redComputed?.height ?? 'N/A',
              minHeight: redComputed?.minHeight ?? 'N/A',
              maxHeight: redComputed?.maxHeight ?? 'N/A',
              overflow: redComputed?.overflow ?? 'N/A',
              getBoundingClientRect: redRect ? `${redRect.width.toFixed(1)}px × ${redRect.height.toFixed(1)}px` : 'N/A',
              A4기준: '29.7cm × 21cm',
              가로일치: redComputed?.width === '1122.52px' || (redRect && Math.abs(redRect.width - 29.7 * 37.8) < 5) ? '✅' : '❌',
              세로일치: redComputed?.height === '793.7px' || (redRect && Math.abs(redRect.height - 21 * 37.8) < 5) ? '✅' : '❌'
            });

            console.log(`[PKG02-PRINT] 📐 CSS 기반 높이 (px→cm):`, {
              헤더_CSS: `${headerCssPx.toFixed(1)}px → ${pxToCm(headerCssPx).toFixed(2)}cm`,
              '2단컨테이너_CSS': `${twoColCssPx.toFixed(1)}px → ${pxToCm(twoColCssPx).toFixed(2)}cm`,
              콘텐츠_paddingBottom: `${contentPaddingBottom.toFixed(1)}px`,
              합계: `${cssBasedTotalPx.toFixed(1)}px → ${cssBasedTotalCm.toFixed(2)}cm`,
              '21cm(px)': `${a4HeightPx.toFixed(0)}px`,
              '초과(px)': cssBasedTotalPx > a4HeightPx ? `⚠️ +${(cssBasedTotalPx - a4HeightPx).toFixed(0)}px` : '없음',
              '초과(cm)': cssBasedTotalCm > 21 ? `⚠️ +${(cssBasedTotalCm - 21).toFixed(2)}cm` : '없음'
            });

            console.log(`[PKG02-PRINT] 🧩 단일페이지 :has(> .last-page:only-child) 매칭:`, {
              lastPage부모자식수: lastPage?.parentElement?.children?.length ?? 'N/A',
              lastPage만유일자식: onlyChild,
              lastPage에lastPage클래스: !!lastPage?.classList.contains('last-page'),
              ':only-child 매칭': singlePageSelectorMatch,
              결론: singlePageSelectorMatch ? '✅ 단일페이지로 인식됨' : '❌ 단일페이지 미매칭 → 21cm 고정 적용 안 됐을 수 있음'
            });

            const reasons: string[] = [];
            if (cssBasedTotalCm > 21) reasons.push(`콘텐츠 CSS 높이 초과 (${cssBasedTotalCm.toFixed(2)}cm > 21cm)`);
            if (!singlePageSelectorMatch) reasons.push('단일페이지 선택자 미매칭으로 컨테이너 21cm 고정 미적용');
            if (redComputed && redComputed.overflow !== 'hidden') reasons.push('빨간 컨테이너 overflow ≠ hidden');
            if (redRect && redRect.height > a4HeightPx + 2) reasons.push(`빨간 테두리 실제 높이 ${(redRect.height / 37.8).toFixed(2)}cm > 21cm`);

            console.log(`[PKG02-PRINT] 🖨️ 2페이지 원인 추정:`, {
              가능원인: reasons.length ? reasons : ['측정 시점(스크린)과 인쇄(@media print) 스타일 불일치', 'getBoundingClientRect=0 등 측정 한계'],
              요약: reasons.length ? `⚠️ ${reasons.join('; ')}` : '인쇄 시 @media print 적용 여부·브라우저 페이지 나누기 동작 확인 필요'
            });

            // CSS에서 이미 21cm로 고정. 인라인 스타일 추가 보강 (디버그 테두리 제거 후 21cm)
            lastPage.style.height = '21cm';
            lastPage.style.maxHeight = '21cm';
            lastPage.style.minHeight = '21cm';
            lastPage.style.overflow = 'hidden';
            lastPage.style.pageBreakAfter = 'avoid';
            lastPage.style.breakAfter = 'avoid';
            lastPage.style.boxSizing = 'border-box';

            // 빨간 컨테이너(.print-container)도 21cm·overflow hidden 강제 (2페이지 오버플로우 방지)
            if (singlePageSelectorMatch && redEl) {
              redEl.style.height = '21cm';
              redEl.style.maxHeight = '21cm';
              redEl.style.minHeight = '21cm';
              redEl.style.overflow = 'hidden';
              redEl.style.boxSizing = 'border-box';
              // outline 대신 box-shadow 사용 (공간 차지 X, 내부 그림자)
              redEl.style.outline = 'none';
              // redEl.style.boxShadow = 'inset 0 0 0 3px #e00'; // 디버깅 테두리 제거

              
              console.log(`[PKG02-PRINT] ✅ 빨간 컨테이너(.print-container) 인라인 강제 적용:`, {
                height: redEl.style.height,
                maxHeight: redEl.style.maxHeight,
                overflow: redEl.style.overflow
              });
            }
            
            console.log(`[PKG02-PRINT] ✅ 마지막 페이지 CSS 강제 적용 완료:`, {
              height: lastPage.style.height,
              maxHeight: lastPage.style.maxHeight,
              minHeight: lastPage.style.minHeight,
              overflow: lastPage.style.overflow,
              pageBreakAfter: lastPage.style.pageBreakAfter,
              breakAfter: lastPage.style.breakAfter,
              boxSizing: lastPage.style.boxSizing
            });

            // 인라인 스타일 적용 후 렌더링 완료 대기 (브라우저가 스타일 적용을 완료할 시간 확보)
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // 한 번 더 확인 및 강제 적용
                if (singlePageSelectorMatch && redEl) {
                  const computed = window.getComputedStyle(redEl);
                  const rect = redEl.getBoundingClientRect();
                  const inlineHeight = redEl.style.height;
                  const inlineMaxHeight = redEl.style.maxHeight;
                  const inlineOverflow = redEl.style.overflow;
                  
                  console.log(`[PKG02-PRINT] 🔍 window.print() 직전 빨간 컨테이너 최종 상태:`, {
                    인라인_height: inlineHeight || '(없음)',
                    인라인_maxHeight: inlineMaxHeight || '(없음)',
                    인라인_overflow: inlineOverflow || '(없음)',
                    computed_height: computed.height,
                    computed_maxHeight: computed.maxHeight,
                    computed_minHeight: computed.minHeight,
                    computed_overflow: computed.overflow,
                    computed_boxSizing: computed.boxSizing,
                    computed_position: computed.position,
                    computed_display: computed.display,
                    getBoundingClientRect: `${rect.width.toFixed(1)}px × ${rect.height.toFixed(1)}px`,
                    getBoundingClientRect_cm: `${(rect.width / 37.8).toFixed(2)}cm × ${(rect.height / 37.8).toFixed(2)}cm`,
                    offsetHeight: `${redEl.offsetHeight}px (${(redEl.offsetHeight / 37.8).toFixed(2)}cm)`,
                    scrollHeight: `${redEl.scrollHeight}px (${(redEl.scrollHeight / 37.8).toFixed(2)}cm)`,
                    clientHeight: `${redEl.clientHeight}px (${(redEl.clientHeight / 37.8).toFixed(2)}cm)`,
                    A4기준: '29.7cm × 21cm',
                    높이초과여부: rect.height > 793.8 ? `⚠️ ${((rect.height - 793.8) / 37.8).toFixed(2)}cm 초과!` : '✅ 21cm 이하',
                    overflow적용여부: computed.overflow === 'hidden' ? '✅ hidden' : `❌ ${computed.overflow}`
                  });

                  if (computed.height !== '793.7px' && computed.height !== '21cm' && computed.height !== '793.698px') {
                    redEl.style.setProperty('height', '21cm', 'important');
                    redEl.style.setProperty('max-height', '21cm', 'important');
                    redEl.style.setProperty('overflow', 'hidden', 'important');
                    // redEl.style.setProperty('box-shadow', 'inset 0 0 0 3px #e00', 'important'); // 디버깅 테두리 제거
                    redEl.style.setProperty('outline', 'none', 'important');
                    console.log(`[PKG02-PRINT] 🔧 빨간 컨테이너 재강제 적용 (computed: ${computed.height} → 21cm)`);
                    
                    // 재강제 적용 후 다시 확인
                    const recomputed = window.getComputedStyle(redEl);
                    const rerect = redEl.getBoundingClientRect();
                    console.log(`[PKG02-PRINT] 🔍 재강제 적용 후 확인:`, {
                      computed_height: recomputed.height,
                      computed_overflow: recomputed.overflow,
                      getBoundingClientRect: `${rerect.width.toFixed(1)}px × ${rerect.height.toFixed(1)}px`,
                      높이초과여부: rerect.height > 793.8 ? `⚠️ ${((rerect.height - 793.8) / 37.8).toFixed(2)}cm 초과!` : '✅ 21cm 이하'
                    });
                  }
                }
                
                // window.print() 호출 직전 최종 확인
                if (redEl) {
                  const finalComputed = window.getComputedStyle(redEl);
                  const finalRect = redEl.getBoundingClientRect();
                  console.log(`[PKG02-PRINT] 🖨️ window.print() 호출 직전 최종 체크:`, {
                    computed_height: finalComputed.height,
                    computed_maxHeight: finalComputed.maxHeight,
                    computed_overflow: finalComputed.overflow,
                    getBoundingClientRect: `${finalRect.width.toFixed(1)}px × ${finalRect.height.toFixed(1)}px`,
                    높이초과여부: finalRect.height > 793.8 ? `⚠️ ${((finalRect.height - 793.8) / 37.8).toFixed(2)}cm 초과 → 2페이지 가능성!` : '✅ 21cm 이하',
                    overflow적용여부: finalComputed.overflow === 'hidden' ? '✅ hidden' : `❌ ${finalComputed.overflow} → 2페이지 가능성!`
                  });
                }
                
                window.onafterprint = async () => {
                  // 인쇄 미리보기 닫힌 후 실제 적용된 스타일 확인
                  if (redEl) {
                    const afterComputed = window.getComputedStyle(redEl);
                    const afterRect = redEl.getBoundingClientRect();
                    console.log(`[PKG02-PRINT] 📋 window.onafterprint - 인쇄 미리보기 후 상태:`, {
                      computed_height: afterComputed.height,
                      computed_maxHeight: afterComputed.maxHeight,
                      computed_overflow: afterComputed.overflow,
                      getBoundingClientRect: `${afterRect.width.toFixed(1)}px × ${afterRect.height.toFixed(1)}px`,
                      높이초과여부: afterRect.height > 793.8 ? `⚠️ ${((afterRect.height - 793.8) / 37.8).toFixed(2)}cm 초과!` : '✅ 21cm 이하',
                      '2페이지원인추정': afterRect.height > 793.8 || afterComputed.overflow !== 'hidden' 
                        ? '빨간 컨테이너 높이 초과 또는 overflow ≠ hidden' 
                        : '다른 원인 (브라우저 페이지 나누기 로직 등)'
                    });
                  }
                  // 업로드 완료 대기 후 cleanup
                  try {
                    if (uploadPromise) {
                      await uploadPromise;
                      console.log('✅ 파일 업로드 완료 확인');
                    }
                  } catch (e) {
                    console.error('❌ 파일 업로드 중 오류 발생:', e);
                  }
                  doCleanup();
                };
                // 미리보기 창이 열리기 직전 블러 오버레이 제거
                removeBlurOverlay();
                window.print();
              });
            });
          } else {
            console.warn(`[PKG02-PRINT] ⚠️ 마지막 페이지 요소를 찾을 수 없습니다.`, {
              printContainer_자식수: printContainer.children.length,
              printContainer_자식들: Array.from(printContainer.children).map(c => ({
                tag: c.tagName,
                id: c.id,
                클래스: c.className
              }))
            });
            window.onafterprint = doCleanup;
            // 미리보기 창이 열리기 직전 블러 오버레이 제거
            removeBlurOverlay();
            window.print();
          }
            });
          });
        } else {
          // 렌더링 미완료 - 재시도 (폴링 메커니즘)
          attempts++;
          if (attempts >= maxAttempts) {
            console.error('인쇄 렌더링 타임아웃 (문제모드)');
            window.onafterprint = doCleanup;
            // 미리보기 창이 열리기 직전 블러 오버레이 제거
            removeBlurOverlay();
            window.print(); // 타임아웃 시에도 인쇄 시도
          } else {
            setTimeout(checkRenderAndPrint, 50); // 50ms 후 재시도 (더 빠른 반응)
          }
        }
      } else {
        // DOC/HWP: 인쇄 대화상자 없음 → 곧바로 cleanup
        // DOC/HWP는 파일 생성이 완료되면 블러 오버레이 제거
        removeBlurOverlay();
        setTimeout(doCleanup, 100);
      }
    };

    // 폴링 시작 - requestAnimationFrame으로 즉시 시작 (더 빠른 반응)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        checkRenderAndPrint();
      });
    });
  };

  const handlePrintAnswer = async () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(정답) 시작');
    
    // 블러 오버레이 표시
    const blurOverlay = showBlurOverlay();
    
    // A4 가로 페이지 스타일 동적 추가
    const style = document.createElement('style');
    style.id = 'print-style-package02-answer';
    style.textContent = `
      @page {
        margin: 0;
        size: 29.7cm 21cm;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 29.7cm !important;
          min-width: 29.7cm !important;
          height: auto !important; /* 21cm 고정 해제 */
          overflow: visible !important; /* hidden 해제 */
        }
        /* #root와 그 자식들을 인쇄에서 제외 (공간 차지 방지) */
        body > *:not(#print-root-package02-answer) {
          display: none !important;
        }
        body * {
          visibility: hidden;
        }
        .print-container-answer, .print-container-answer * {
          visibility: visible;
        }
        .print-container-answer {
          display: block !important;
          position: relative !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: auto !important; /* 21cm 고정 해제 */
          min-width: 0 !important;
          max-width: 29.7cm !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
        }
        /* 단일 페이지: 빨간 컨테이너 높이 21cm 고정 + overflow hidden (2페이지 오버플로우 방지) */
        .print-container-answer:has(> .a4-landscape-page-template.last-page:only-child) {
          height: 21cm !important;
          min-height: 21cm !important;
          max-height: 21cm !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
        }
        .no-print {
          display: none !important;
        }
      }
      /* @media screen 스타일 제거: 인쇄(문제)처럼 화면에서 printContainer를 숨기고 메인 화면이 그대로 보이도록 함 */
    `;
    document.head.appendChild(style);
    
    // 인쇄용 컨테이너 생성 (문제 모드와 동일한 구조로 변경)
    const printContainer = document.createElement('div');
    printContainer.id = 'print-root-package02-answer';
    // 레이아웃 계산을 위해 명시적으로 너비 설정 (화면 밖으로 보내면 너비가 0이 됨)
    printContainer.style.width = '29.7cm';
    printContainer.style.minWidth = '29.7cm';
    printContainer.style.position = 'absolute';
    printContainer.style.left = '0';
    printContainer.style.top = '0';
    printContainer.style.visibility = 'hidden'; // 화면에 보이지 않지만 레이아웃은 계산됨
    document.body.appendChild(printContainer);

    // 기존 화면 숨기기
    const appRoot = document.getElementById('root');
    // if (appRoot) {
    //   appRoot.style.display = 'none';
    // }

    // React 18 방식으로 렌더링 - PrintFormatPackage02 컴포넌트 사용
    const root = ReactDOM.createRoot(printContainer);

    root.render(
      <PrintFormatPackage02 
        packageQuiz={packageQuiz} 
        isAnswerMode={true}
      />
    );

    const activateAnswerContainer = () => {
      const inner = printContainer.querySelector('.print-container-answer');
      if (inner) {
        inner.classList.add('pdf-generation-active');
      } else {
        requestAnimationFrame(activateAnswerContainer);
      }
    };
    activateAnswerContainer();

    const doCleanup = () => {
      try { root.unmount(); } catch (_) {}
      if (printContainer.parentNode) document.body.removeChild(printContainer);
      if (appRoot) appRoot.style.display = 'block';
      const styleEl = document.getElementById('print-style-package02-answer');
      if (styleEl?.parentNode) styleEl.parentNode.removeChild(styleEl);
      console.log('✅ 인쇄(정답) 완료');
      window.onafterprint = null;
    };

    // 렌더링 완료 후 인쇄 및 파일 생성
    // 인쇄(문제)와 동일하게 렌더링 완료를 폴링으로 확인 (고정 대기 시간 제거)
    let attempts = 0;
    const maxAttempts = 50; // 50ms * 50 = 2500ms (2.5초 최대 대기, 더 빠른 반응)
    let uploadPromise: Promise<void> | null = null; // window.onafterprint에서 접근 가능하도록 외부 스코프에 선언
    
    const checkRenderAndPrint = async () => {
      // 파일 생성 및 Firebase Storage 업로드 (백그라운드 처리)
      const uploadTask = async () => {
        try {
          const element = document.getElementById('print-root-package02-answer');
          if (element && userData?.uid) {
            const { updateQuizHistoryFile } = await import('../../../services/quizHistoryService');
            const result = await generateAndUploadFile(
              element as HTMLElement,
              userData.uid,
              `package02_answer_${Date.now()}`,
              '패키지#02_정답',
              { isAnswerMode: true, orientation: 'landscape', fileFormat }
            );
            try {
              const { getQuizHistory } = await import('../../../services/quizHistoryService');
              const history = await getQuizHistory(userData.uid, { limit: 10 });
              const packageHistory = history.find(h => h.workTypeId === 'P02');
              if (packageHistory) {
                await updateQuizHistoryFile(packageHistory.id, result.url, result.fileName, 'answer');
                const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
                console.log(`📁 패키지#02 정답 ${formatName} 저장 완료:`, result.fileName);
              }
            } catch (historyError: any) {
              if (historyError?.code === 'failed-precondition' || historyError?.message?.includes('index')) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('⚠️ 문제 내역 조회 중 인덱스 오류 (무시됨):', historyError?.message);
                }
                const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
                console.log(`📁 패키지#02 정답 ${formatName} 생성 완료 (내역 저장 스킵):`, result.fileName);
              } else {
                console.error('문제 내역 조회 실패:', historyError);
              }
            }
          }
        } catch (error) {
          console.error(`❌ 파일 저장 실패 (${fileFormat}):`, error);
        }
      };

      if (fileFormat === 'pdf') {
        // 마운트 포인트 내에서 last-page 찾기
        const lastPage = printContainer.querySelector('.a4-landscape-page-template.last-page') as HTMLElement;
        
        // 렌더링 완료 조건: 마지막 페이지가 존재하고 높이가 0보다 커야 함
        if (lastPage && lastPage.offsetHeight > 0) {
          // PDF: 인쇄 대화상자 닫힐 때 cleanup (afterprint). 그 전까지 DOM 유지해야 미리보기에 내용 표시됨.
          // 업로드 작업은 인쇄 후에 시작 (인쇄 속도에 영향 없도록)
          // requestAnimationFrame으로 즉시 처리 시작 (300ms 대기 제거)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // 업로드 작업 시작 (인쇄와 병렬 처리)
              uploadPromise = uploadTask();
            });
          });
          
          // 렌더링 완료 후 즉시 인쇄 처리 (requestAnimationFrame 사용)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
          // printContainer 상태 상세 로그
          const containerComputed = window.getComputedStyle(printContainer);
          const containerRect = printContainer.getBoundingClientRect();
          console.log(`[PKG02-PRINT] 📦 printContainer 상태 (정답모드):`, {
            id: printContainer.id,
            위치: `(${containerRect.left.toFixed(0)}px, ${containerRect.top.toFixed(0)}px)`,
            크기: `${containerRect.width.toFixed(0)}px × ${containerRect.height.toFixed(0)}px`,
            display: containerComputed.display,
            position: containerComputed.position,
            visibility: containerComputed.visibility,
            overflow: containerComputed.overflow,
            height: containerComputed.height,
            maxHeight: containerComputed.maxHeight,
            클래스: printContainer.className,
            자식수: printContainer.children.length
          });

          const lastPage = printContainer.querySelector('.a4-landscape-page-template.last-page') as HTMLElement;
          
          if (lastPage) {
            // lastPage 상태 상세 로그
            const pageComputed = window.getComputedStyle(lastPage);
            const pageRect = lastPage.getBoundingClientRect();
            const pageOffsetHeight = lastPage.offsetHeight;
            const pageScrollHeight = lastPage.scrollHeight;
            const pageClientHeight = lastPage.clientHeight;
            
            // 부모 요소 확인
            const parent = lastPage.parentElement;
            const parentComputed = parent ? window.getComputedStyle(parent) : null;
            const parentRect = parent ? parent.getBoundingClientRect() : null;
            
            console.log(`[PKG02-PRINT] 📄 lastPage 요소 상세 상태 (정답모드):`, {
              id: lastPage.id,
              클래스: lastPage.className,
              위치: `(${pageRect.left.toFixed(0)}px, ${pageRect.top.toFixed(0)}px)`,
              크기_getBoundingClientRect: `${pageRect.width.toFixed(2)}px × ${pageRect.height.toFixed(2)}px`,
              크기_offsetHeight: `${pageOffsetHeight.toFixed(2)}px (${(pageOffsetHeight / 37.8).toFixed(2)}cm)`,
              크기_scrollHeight: `${pageScrollHeight.toFixed(2)}px (${(pageScrollHeight / 37.8).toFixed(2)}cm)`,
              크기_clientHeight: `${pageClientHeight.toFixed(2)}px (${(pageClientHeight / 37.8).toFixed(2)}cm)`,
              CSS_height: pageComputed.height,
              CSS_maxHeight: pageComputed.maxHeight,
              CSS_minHeight: pageComputed.minHeight,
              CSS_overflow: pageComputed.overflow,
              CSS_pageBreakAfter: pageComputed.pageBreakAfter,
              CSS_breakAfter: pageComputed.breakAfter,
              CSS_display: pageComputed.display,
              CSS_position: pageComputed.position,
              CSS_boxSizing: pageComputed.boxSizing,
              인라인스타일_height: lastPage.style.height || '(없음)',
              인라인스타일_maxHeight: lastPage.style.maxHeight || '(없음)',
              인라인스타일_overflow: lastPage.style.overflow || '(없음)',
              부모요소: parent ? {
                tag: parent.tagName,
                id: parent.id,
                클래스: parent.className,
                크기: parentRect ? `${parentRect.width.toFixed(0)}px × ${parentRect.height.toFixed(0)}px` : 'N/A',
                overflow: parentComputed?.overflow || 'N/A'
              } : '없음'
            });

            // 자식 요소들 확인
            const pageHeader = lastPage.querySelector('.a4-landscape-page-header') as HTMLElement;
            const pageContent = lastPage.querySelector('.a4-landscape-page-content') as HTMLElement;
            const twoColumnContainer = lastPage.querySelector('.print-two-column-container') as HTMLElement;
            
            if (pageHeader) {
              const headerRect = pageHeader.getBoundingClientRect();
              const headerComputed = window.getComputedStyle(pageHeader);
              console.log(`[PKG02-PRINT]   ↳ 헤더(.a4-landscape-page-header):`, {
                높이: `${headerRect.height.toFixed(2)}px (${(headerRect.height / 37.8).toFixed(2)}cm)`,
                CSS_height: headerComputed.height,
                CSS_overflow: headerComputed.overflow
              });
            }
            
            if (pageContent) {
              const contentRect = pageContent.getBoundingClientRect();
              const contentComputed = window.getComputedStyle(pageContent);
              console.log(`[PKG02-PRINT]   ↳ 콘텐츠(.a4-landscape-page-content):`, {
                높이: `${contentRect.height.toFixed(2)}px (${(contentRect.height / 37.8).toFixed(2)}cm)`,
                CSS_height: contentComputed.height,
                CSS_flex: contentComputed.flex,
                CSS_overflow: contentComputed.overflow
              });
            }
            
            if (twoColumnContainer) {
              const containerRect = twoColumnContainer.getBoundingClientRect();
              const containerComputed = window.getComputedStyle(twoColumnContainer);
              console.log(`[PKG02-PRINT]   ↳ 2단컨테이너(.print-two-column-container):`, {
                높이: `${containerRect.height.toFixed(2)}px (${(containerRect.height / 37.8).toFixed(2)}cm)`,
                CSS_height: containerComputed.height,
                CSS_maxHeight: containerComputed.maxHeight,
                CSS_overflow: containerComputed.overflow
              });
            }

            // 총 높이 계산
            const headerHeight = pageHeader ? pageHeader.getBoundingClientRect().height : 0;
            const contentHeight = pageContent ? pageContent.getBoundingClientRect().height : 0;
            const containerHeight = twoColumnContainer ? twoColumnContainer.getBoundingClientRect().height : 0;
            const totalCalculatedHeight = headerHeight + (containerHeight || contentHeight);
            const totalCalculatedHeightCm = totalCalculatedHeight / 37.8;
            
            console.log(`[PKG02-PRINT] 📊 높이 합계 계산 (정답모드):`, {
              헤더높이: `${(headerHeight / 37.8).toFixed(2)}cm`,
              컨테이너높이: `${(containerHeight / 37.8).toFixed(2)}cm`,
              콘텐츠높이: `${(contentHeight / 37.8).toFixed(2)}cm`,
              계산된총높이: `${totalCalculatedHeightCm.toFixed(2)}cm`,
              A4가로높이: '21cm',
              초과여부: totalCalculatedHeightCm > 21 ? `⚠️ ${(totalCalculatedHeightCm - 21).toFixed(2)}cm 초과!` : '✅ 21cm 이하'
            });

            // ---------- 2페이지 원인 상세 로그 (정답모드) ----------
            const _pxToCm = (px: number) => (px / 37.8);
            const _parsePx = (s: string): number => (typeof s === 'string' && s.endsWith('px')) ? parseFloat(s) || 0 : 0;
            const _redEl = printContainer.querySelector('.print-container-answer') as HTMLElement | null;
            const _redComputed = _redEl ? window.getComputedStyle(_redEl) : null;
            const _redRect = _redEl ? _redEl.getBoundingClientRect() : null;
            const _headerCssPx = pageHeader ? _parsePx(window.getComputedStyle(pageHeader).height) : 0;
            const _twoColCssPx = twoColumnContainer ? _parsePx(window.getComputedStyle(twoColumnContainer).height) : 0;
            const _contentPadBottom = pageContent ? _parsePx(window.getComputedStyle(pageContent).paddingBottom) : 0;
            const _cssTotalPx = _headerCssPx + _twoColCssPx + _contentPadBottom;
            const _cssTotalCm = _pxToCm(_cssTotalPx);
            const _a4Px = 21 * 37.8;
            const _onlyChild = lastPage?.parentElement?.children?.length === 1;
            const _hasLastOnly = !!lastPage && !!lastPage.parentElement && _onlyChild && lastPage.classList.contains('last-page');
            const _singleMatch = _hasLastOnly && lastPage!.parentElement!.querySelector('.a4-landscape-page-template.last-page:only-child') === lastPage;
            console.log(`[PKG02-PRINT] 🔴 빨간 테두리(.print-container-answer) 상태:`, {
              찾음: !!_redEl,
              width: _redComputed?.width ?? 'N/A', height: _redComputed?.height ?? 'N/A',
              minHeight: _redComputed?.minHeight ?? 'N/A', maxHeight: _redComputed?.maxHeight ?? 'N/A',
              overflow: _redComputed?.overflow ?? 'N/A',
              getBoundingClientRect: _redRect ? `${_redRect.width.toFixed(1)}px × ${_redRect.height.toFixed(1)}px` : 'N/A',
              A4기준: '29.7cm × 21cm'
            });
            console.log(`[PKG02-PRINT] 📐 CSS 기반 높이 (정답모드):`, {
              헤더_CSS: `${_headerCssPx.toFixed(1)}px → ${_pxToCm(_headerCssPx).toFixed(2)}cm`,
              '2단컨테이너_CSS': `${_twoColCssPx.toFixed(1)}px → ${_pxToCm(_twoColCssPx).toFixed(2)}cm`,
              합계: `${_cssTotalPx.toFixed(1)}px → ${_cssTotalCm.toFixed(2)}cm`,
              '21cm(px)': `${_a4Px.toFixed(0)}px`,
              '초과(cm)': _cssTotalCm > 21 ? `⚠️ +${(_cssTotalCm - 21).toFixed(2)}cm` : '없음'
            });
            console.log(`[PKG02-PRINT] 🧩 단일페이지 :has 매칭 (정답):`, {
              lastPage만유일자식: _onlyChild,
              ':only-child 매칭': _singleMatch,
              결론: _singleMatch ? '✅ 단일페이지' : '❌ 단일페이지 미매칭'
            });
            const _reasons: string[] = [];
            if (_cssTotalCm > 21) _reasons.push(`콘텐츠 CSS 높이 초과 (${_cssTotalCm.toFixed(2)}cm > 21cm)`);
            if (!_singleMatch) _reasons.push('단일페이지 선택자 미매칭');
            if (_redRect && _redRect.height > _a4Px + 2) _reasons.push(`빨간 테두리 높이 ${(_redRect.height / 37.8).toFixed(2)}cm > 21cm`);
            console.log(`[PKG02-PRINT] 🖨️ 2페이지 원인 추정 (정답):`, {
              가능원인: _reasons.length ? _reasons : ['측정 시점 vs @media print 불일치'],
              요약: _reasons.length ? `⚠️ ${_reasons.join('; ')}` : '인쇄 시 @media print·페이지 나누기 확인 필요'
            });

            // CSS에서 이미 21cm로 고정했지만, 인라인 스타일로 추가 보강
            lastPage.style.height = '21cm';
            lastPage.style.maxHeight = '21cm';
            lastPage.style.minHeight = '21cm';
            lastPage.style.overflow = 'hidden';
            lastPage.style.pageBreakAfter = 'avoid';
            lastPage.style.breakAfter = 'avoid';
            lastPage.style.boxSizing = 'border-box';

            if (_singleMatch && _redEl) {
              _redEl.style.height = '21cm';
              _redEl.style.maxHeight = '21cm';
              _redEl.style.minHeight = '21cm';
              _redEl.style.overflow = 'hidden';
              _redEl.style.boxSizing = 'border-box';
              // outline 대신 box-shadow 사용
              _redEl.style.outline = 'none';
              // _redEl.style.boxShadow = 'inset 0 0 0 3px #e00'; // 디버깅 테두리 제거

              console.log(`[PKG02-PRINT] ✅ 빨간 컨테이너(.print-container-answer) 인라인 강제 적용`);
            }
            
            console.log(`[PKG02-PRINT] ✅ 마지막 페이지 CSS 강제 적용 완료 (정답모드):`, {
              height: lastPage.style.height,
              maxHeight: lastPage.style.maxHeight,
              minHeight: lastPage.style.minHeight,
              overflow: lastPage.style.overflow,
              pageBreakAfter: lastPage.style.pageBreakAfter,
              breakAfter: lastPage.style.breakAfter,
              boxSizing: lastPage.style.boxSizing
            });

            // 인라인 스타일 적용 후 렌더링 완료 대기 (브라우저가 스타일 적용을 완료할 시간 확보)
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // 한 번 더 확인 및 강제 적용
                if (_singleMatch && _redEl) {
                  const computed = window.getComputedStyle(_redEl);
                  const rect = _redEl.getBoundingClientRect();
                  const inlineHeight = _redEl.style.height;
                  const inlineMaxHeight = _redEl.style.maxHeight;
                  const inlineOverflow = _redEl.style.overflow;
                  
                  console.log(`[PKG02-PRINT] 🔍 window.print() 직전 빨간 컨테이너 최종 상태 (정답):`, {
                    인라인_height: inlineHeight || '(없음)',
                    인라인_maxHeight: inlineMaxHeight || '(없음)',
                    인라인_overflow: inlineOverflow || '(없음)',
                    computed_height: computed.height,
                    computed_maxHeight: computed.maxHeight,
                    computed_minHeight: computed.minHeight,
                    computed_overflow: computed.overflow,
                    computed_boxSizing: computed.boxSizing,
                    computed_position: computed.position,
                    computed_display: computed.display,
                    getBoundingClientRect: `${rect.width.toFixed(1)}px × ${rect.height.toFixed(1)}px`,
                    getBoundingClientRect_cm: `${(rect.width / 37.8).toFixed(2)}cm × ${(rect.height / 37.8).toFixed(2)}cm`,
                    offsetHeight: `${_redEl.offsetHeight}px (${(_redEl.offsetHeight / 37.8).toFixed(2)}cm)`,
                    scrollHeight: `${_redEl.scrollHeight}px (${(_redEl.scrollHeight / 37.8).toFixed(2)}cm)`,
                    clientHeight: `${_redEl.clientHeight}px (${(_redEl.clientHeight / 37.8).toFixed(2)}cm)`,
                    A4기준: '29.7cm × 21cm',
                    높이초과여부: rect.height > 793.8 ? `⚠️ ${((rect.height - 793.8) / 37.8).toFixed(2)}cm 초과!` : '✅ 21cm 이하',
                    overflow적용여부: computed.overflow === 'hidden' ? '✅ hidden' : `❌ ${computed.overflow}`
                  });

                  if (computed.height !== '793.7px' && computed.height !== '21cm' && computed.height !== '793.698px') {
                    _redEl.style.setProperty('height', '21cm', 'important');
                    _redEl.style.setProperty('max-height', '21cm', 'important');
                    _redEl.style.setProperty('overflow', 'hidden', 'important');
                    // _redEl.style.setProperty('box-shadow', 'inset 0 0 0 3px #e00', 'important'); // 디버깅 테두리 제거
                    _redEl.style.setProperty('outline', 'none', 'important');
                    console.log(`[PKG02-PRINT] 🔧 빨간 컨테이너 재강제 적용 (정답, computed: ${computed.height} → 21cm)`);
                    
                    // 재강제 적용 후 다시 확인
                    const recomputed = window.getComputedStyle(_redEl);
                    const rerect = _redEl.getBoundingClientRect();
                    console.log(`[PKG02-PRINT] 🔍 재강제 적용 후 확인 (정답):`, {
                      computed_height: recomputed.height,
                      computed_overflow: recomputed.overflow,
                      getBoundingClientRect: `${rerect.width.toFixed(1)}px × ${rerect.height.toFixed(1)}px`,
                      높이초과여부: rerect.height > 793.8 ? `⚠️ ${((rerect.height - 793.8) / 37.8).toFixed(2)}cm 초과!` : '✅ 21cm 이하'
                    });
                  }
                }
                
                // window.print() 호출 직전 최종 확인
                if (_redEl) {
                  const finalComputed = window.getComputedStyle(_redEl);
                  const finalRect = _redEl.getBoundingClientRect();
                  console.log(`[PKG02-PRINT] 🖨️ window.print() 호출 직전 최종 체크 (정답):`, {
                    computed_height: finalComputed.height,
                    computed_maxHeight: finalComputed.maxHeight,
                    computed_overflow: finalComputed.overflow,
                    getBoundingClientRect: `${finalRect.width.toFixed(1)}px × ${finalRect.height.toFixed(1)}px`,
                    높이초과여부: finalRect.height > 793.8 ? `⚠️ ${((finalRect.height - 793.8) / 37.8).toFixed(2)}cm 초과 → 2페이지 가능성!` : '✅ 21cm 이하',
                    overflow적용여부: finalComputed.overflow === 'hidden' ? '✅ hidden' : `❌ ${finalComputed.overflow} → 2페이지 가능성!`
                  });
                }
                
                window.onafterprint = async () => {
                  // 인쇄 미리보기 닫힌 후 실제 적용된 스타일 확인
                  if (_redEl) {
                    const afterComputed = window.getComputedStyle(_redEl);
                    const afterRect = _redEl.getBoundingClientRect();
                    console.log(`[PKG02-PRINT] 📋 window.onafterprint - 인쇄 미리보기 후 상태 (정답):`, {
                      computed_height: afterComputed.height,
                      computed_maxHeight: afterComputed.maxHeight,
                      computed_overflow: afterComputed.overflow,
                      getBoundingClientRect: `${afterRect.width.toFixed(1)}px × ${afterRect.height.toFixed(1)}px`,
                      높이초과여부: afterRect.height > 793.8 ? `⚠️ ${((afterRect.height - 793.8) / 37.8).toFixed(2)}cm 초과!` : '✅ 21cm 이하',
                      '2페이지원인추정': afterRect.height > 793.8 || afterComputed.overflow !== 'hidden' 
                        ? '빨간 컨테이너 높이 초과 또는 overflow ≠ hidden' 
                        : '다른 원인 (브라우저 페이지 나누기 로직 등)'
                    });
                  }
                  // 업로드 완료 대기 후 cleanup (인쇄(문제)와 동일)
                  try {
                    if (uploadPromise) {
                      await uploadPromise;
                      console.log('✅ 파일 업로드 완료 확인 (정답)');
                    }
                  } catch (e) {
                    console.error('❌ 파일 업로드 중 오류 발생 (정답):', e);
                  }
                  doCleanup();
                };
                // 미리보기 창이 열리기 직전 블러 오버레이 제거
                removeBlurOverlay();
                window.print();
              });
            });
          } else {
            console.warn(`[PKG02-PRINT] ⚠️ 마지막 페이지 요소를 찾을 수 없습니다. (정답모드)`, {
              printContainer_자식수: printContainer.children.length,
              printContainer_자식들: Array.from(printContainer.children).map(c => ({
                tag: c.tagName,
                id: c.id,
                클래스: c.className
              }))
            });
            window.onafterprint = doCleanup;
            // 미리보기 창이 열리기 직전 블러 오버레이 제거
            removeBlurOverlay();
            window.print();
          }
            });
          });
        } else {
          // 렌더링 미완료 - 재시도 (인쇄(문제)와 동일한 폴링 메커니즘)
          attempts++;
          if (attempts >= maxAttempts) {
            console.error('인쇄 렌더링 타임아웃 (정답모드)');
            window.onafterprint = doCleanup;
            // 미리보기 창이 열리기 직전 블러 오버레이 제거
            removeBlurOverlay();
            window.print(); // 타임아웃 시에도 인쇄 시도
          } else {
            setTimeout(checkRenderAndPrint, 50); // 50ms 후 재시도 (더 빠른 반응)
          }
        }
      } else {
        // DOC/HWP: 인쇄 대화상자 없음 → 곧바로 cleanup
        // DOC/HWP는 파일 생성이 완료되면 블러 오버레이 제거
        removeBlurOverlay();
        setTimeout(doCleanup, 100);
      }
    };

    // 폴링 시작 - requestAnimationFrame으로 즉시 시작 (더 빠른 반응)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        checkRenderAndPrint();
      });
    });
  };

  // 문제 생성 후 화면
  if (showQuizDisplay && packageQuiz) {
    return (
      <React.Fragment>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', width: '100%' }}>
              <div style={{ flex: '1' }}>
                <h2 style={{
                  fontFamily: "'Noto Sans KR', 'Segoe UI', 'Apple SD Gothic Neo', Arial, sans-serif",
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: '#000000',
                  margin: '0',
                  letterSpacing: '-1px'
                }}>📦 패키지 퀴즈 #02 (2단 출력)</h2>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleNewProblem}
                style={{
                  width: '120px',
                  height: '48px',
                  padding: '0.75rem 1rem',
                  fontSize: '11pt',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #bef264 0%, #a3e635 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(190, 242, 100, 0.25)'
                }}
              >
                새문제
              </button>
              
              {/* 파일 형식 선택 */}
              <FileFormatSelector
                value={fileFormat}
                onChange={setFileFormat}
              />
              
               {fileFormat === 'pdf' ? (
                 <>
                   <button
                     type="button"
                     onClick={handlePrintProblem}
                     style={{
                       width: '130px',
                       height: '48px',
                       padding: '0.75rem 1rem',
                       fontSize: '11pt',
                       fontWeight: '600',
                       border: 'none',
                       borderRadius: '8px',
                       background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                       color: 'white',
                       cursor: 'pointer',
                       boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '0.5rem'
                     }}
                   >
                     🖨️ 인쇄 (문제)
                   </button>
                   <button
                     type="button"
                     onClick={handlePrintAnswer}
                     style={{
                       width: '130px',
                       height: '48px',
                       padding: '0.75rem 1rem',
                       fontSize: '11pt',
                       fontWeight: '600',
                       border: 'none',
                       borderRadius: '8px',
                       background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                       color: 'white',
                       cursor: 'pointer',
                       boxShadow: '0 4px 6px rgba(240, 147, 251, 0.25)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '0.5rem'
                     }}
                   >
                     🖨️ 인쇄 (정답)
                   </button>
                 </>
               ) : (
                 <>
                   <button
                     type="button"
                     onClick={handlePrintProblem}
                     style={{
                       width: '130px',
                       height: '48px',
                       padding: '0.75rem 1rem',
                       fontSize: '11pt',
                       fontWeight: '600',
                       border: 'none',
                       borderRadius: '8px',
                       background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
                       color: 'white',
                       cursor: 'pointer',
                       boxShadow: '0 4px 6px rgba(14, 165, 233, 0.25)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '0.5rem'
                     }}
                   >
                     💾 저장 (문제)
                   </button>
                   <button
                     type="button"
                     onClick={handlePrintAnswer}
                     style={{
                       width: '130px',
                       height: '48px',
                       padding: '0.75rem 1rem',
                       fontSize: '11pt',
                       fontWeight: '600',
                       border: 'none',
                       borderRadius: '8px',
                       background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                       color: 'white',
                       cursor: 'pointer',
                       boxShadow: '0 4px 6px rgba(16, 185, 129, 0.25)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '0.5rem'
                     }}
                   >
                     💾 저장 (정답)
                   </button>
                 </>
               )}
              </div>
            </div>
          </div>

        {/* 실패한 유형 알림 */}
        {failedWorkTypes.length > 0 && (
          <div style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#ffffff',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <strong style={{
                fontFamily: "'Noto Sans KR', sans-serif",
                fontSize: '1rem',
                color: '#856404'
              }}>
                일부 유형 생성 실패
              </strong>
            </div>
            <div style={{
              fontFamily: "'Noto Sans KR', sans-serif",
              fontSize: '0.9rem',
              color: '#856404',
              marginLeft: '1.7rem'
            }}>
              다음 유형의 문제 생성에 실패했습니다: <strong>{failedWorkTypes.map(t => t.name).join(', ')}</strong>
              <br />
              <span style={{ fontSize: '0.85rem', color: '#856404', opacity: 0.8 }}>
                실패한 유형의 포인트는 환불되었습니다.
              </span>
            </div>
          </div>
        )}

          {/* 생성된 모든 유형의 문제들을 순서대로 표시 */}
          {packageQuiz.map((quizItem, index) => {
            // Work_01 (문장 순서 맞추기) 표시
            if (quizItem.workTypeId === '01' && quizItem.quiz) {
              return (
                <div key={`work-01-${index}`} className="quiz-item-card" style={{ 
                  marginBottom: '2rem', 
                  padding: '1.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0'
                }}>
                  <div className="quiz-item-header package01-work01-header" style={{ 
                    marginBottom: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '0.5rem'
                  }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                      문제 {index + 1} : 문단 순서 맞추기
                    </h3>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      유형#01
                    </span>
                  </div>
                  
                  {/* 문제 지시문 - 모의고사 형식 */}
                  <div className="problem-instruction package01-work01-instruction" style={{
                    fontWeight: 500, 
                    fontSize: '0.95rem', 
                    background: '#f5f5f5', 
                    color: '#000', 
                    padding: '0.6rem 1rem', 
                    borderRadius: '0', 
                    marginBottom: '1.5rem',
                    textAlign: 'left',
                    borderTop: '1px solid #e0e0e0',
                    borderBottom: '1px solid #e0e0e0'
                  }}>
                    {quizItem.quiz.format === 'exam' && quizItem.quiz.instruction 
                      ? quizItem.quiz.instruction 
                      : '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.'}
                  </div>

                  {/* 모의고사 형식: 고정된 첫 번째 단락을 박스 안에 표시 */}
                  {quizItem.quiz.format === 'exam' && quizItem.quiz.fixedParagraph && (
                    <div className="fixed-paragraph-box" style={{
                      border: '1px solid #000',
                      borderRadius: '8px',
                      padding: '0.6rem 1rem',
                      marginTop: '1rem',
                      marginBottom: '0',
                      marginLeft: '0',
                      marginRight: '0',
                      width: '100%',
                      backgroundColor: '#fff',
                      fontSize: '1rem !important',
                      lineHeight: '1.6',
                      color: '#333',
                      fontFamily: 'inherit'
                    }}>
                      <div className="fixed-paragraph-content" style={{ fontSize: '1.1rem', lineHeight: '1.6', fontFamily: 'inherit', color: '#333' }}>
                        {quizItem.quiz.fixedParagraph}
                      </div>
                    </div>
                  )}

                  {/* 나머지 3개 단락 - 모의고사 형식 */}
                  <div className="problem-passage package01-work01-passage" style={{
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    margin: '0 0 0 0',
                    background: '#ffffff',
                    backgroundColor: '#ffffff',
                    border: '1px solid transparent',
                    padding: '0.5rem',
                    fontFamily: 'inherit',
                    color: '#333'
                  }}>
                    {quizItem.quiz.shuffledParagraphs.map((paragraph: any, pIndex: number) => (
                      <div key={paragraph.id} className="shuffled-paragraph" style={{ 
                        marginBottom: pIndex < (quizItem.quiz?.shuffledParagraphs?.length || 0) - 1 ? '-0.4rem' : '0',
                        padding: '0',
                        fontSize: '1rem',
                        color: '#333',
                        lineHeight: '1.3',
                        fontFamily: 'inherit'
                      }}>
                        <strong>({paragraph.label}) </strong>{paragraph.content}
                      </div>
                    ))}
                  </div>

                  {/* 선택지 - 모의고사 형식 */}
                  <div className="problem-options package01-work01-options" style={{
                    margin: '0 0 0.75rem 0',
                    marginTop: '0',
                    paddingTop: '0',
                    paddingBottom: '0',
                    backgroundColor: '#ffffff',
                    background: '#ffffff',
                    border: '1px solid transparent'
                  }}>
                    {quizItem.quiz.choices.map((choice: string[], cIndex: number) => (
                      <div key={cIndex} className="option" style={{
                        display: 'block',
                        fontSize: '1rem',
                        margin: '0.25rem 0',
                        padding: '0.25rem 0.5rem',
                        fontFamily: 'inherit',
                        backgroundColor: '#ffffff',
                        background: '#ffffff',
                        border: '1px solid transparent',
                        borderRadius: '0',
                        color: '#333',
                        cursor: 'default',
                        textDecoration: 'none'
                      }}>
                        {`①②③④⑤`[cIndex] || `${cIndex+1}.`} {quizItem.quiz?.format === 'exam' ? choice.join(' - ') : choice.join(' → ')}
                        {quizItem.quiz?.answerIndex === cIndex && (
                          <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // Work_02 (독해 문제) 표시
            if (quizItem.workTypeId === '02' && quizItem.work02Data) {
              return (
                <div key={`work-02-${index}`} className="quiz-item-card" style={{ 
                  marginBottom: '2rem', 
                  padding: '1.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0'
                }}>
                  <div className="quiz-item-header package01-work02-header" style={{ 
                    marginBottom: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '0.5rem'
                  }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                      문제 {index + 1} : 유사단어 독해
                    </h3>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      유형#02
                    </span>
                  </div>
                  
                  {/* 문제 지시문 - 모의고사 형식 */}
                  <div className="problem-instruction package01-work02-instruction" style={{
                    fontWeight: 500, 
                    fontSize: '0.95rem', 
                    background: '#f5f5f5', 
                    color: '#000', 
                    padding: '0.6rem 1rem', 
                    borderRadius: '0', 
                    marginBottom: '1.5rem',
                    textAlign: 'left',
                    borderTop: '1px solid #e0e0e0',
                    borderBottom: '1px solid #e0e0e0'
                  }}>
                    다음 본문을 읽고 해석하세요
                  </div>

                  {/* 본문 */}
                  <div className="problem-passage package01-work01-passage" style={{
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    margin: '0 0 0 0',
                    background: '#ffffff',
                    backgroundColor: '#ffffff',
                    border: '1px solid transparent',
                    padding: '1rem',
                    fontFamily: 'inherit',
                    color: '#333'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderTextWithHighlight(
                      quizItem.work02Data.modifiedText || '', 
                      quizItem.work02Data.replacements || []
                    )
                  }}
                  />

                  {/* 교체된 단어 목록 (하나의 4열 테이블) */}
                  <h4>교체된 단어들:</h4>
                  {quizItem.work02Data?.replacements && quizItem.work02Data.replacements.length > 0 ? (
                    <table className="replacements-table work02-replacements-table no-print" style={{
                      borderCollapse: 'collapse',
                      width: '100%',
                      border: '1px solid #666',
                      backgroundColor: '#ffffff'
                    }}>
                      <thead>
                        <tr>
                          <th style={{ width: '25%' }}>원래 단어</th>
                          <th style={{ width: '25%' }}>교체된 단어</th>
                          <th style={{ width: '25%' }}>원래 단어</th>
                          <th style={{ width: '25%' }}>교체된 단어</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: Math.ceil((quizItem.work02Data?.replacements.length || 0) / 2) }, (_, rowIndex) => (
                          <tr key={rowIndex}>
                            <td style={{ width: '25%' }}>
                              {quizItem.work02Data?.replacements[rowIndex * 2]?.original || ''}
                              {quizItem.work02Data?.replacements[rowIndex * 2]?.originalMeaning && <span className="original-meaning"> ({quizItem.work02Data.replacements[rowIndex * 2].originalMeaning})</span>}
                            </td>
                            <td style={{ width: '25%', backgroundColor: '#f5f5f5' }}>
                              {quizItem.work02Data?.replacements[rowIndex * 2]?.replacement || ''}
                              {quizItem.work02Data?.replacements[rowIndex * 2]?.replacementMeaning && <span className="replacement-meaning"> ({quizItem.work02Data.replacements[rowIndex * 2].replacementMeaning})</span>}
                            </td>
                            <td style={{ width: '25%' }}>
                              {quizItem.work02Data?.replacements[rowIndex * 2 + 1]?.original || ''}
                              {quizItem.work02Data?.replacements[rowIndex * 2 + 1]?.originalMeaning && <span className="original-meaning"> ({quizItem.work02Data.replacements[rowIndex * 2 + 1].originalMeaning})</span>}
                            </td>
                            <td style={{ width: '25%', backgroundColor: '#f5f5f5' }}>
                              {quizItem.work02Data?.replacements[rowIndex * 2 + 1]?.replacement || ''}
                              {quizItem.work02Data?.replacements[rowIndex * 2 + 1]?.replacementMeaning && <span className="replacement-meaning"> ({quizItem.work02Data.replacements[rowIndex * 2 + 1].replacementMeaning})</span>}
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
                  {quizItem.translatedText && (
                    <div className="translation-section" style={{ marginTop: '2rem' }}>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 : </h3>
                      <div className="translation-content package01-work02-translation" style={{
                        background: '#F5F5F5',
                        backgroundColor: '#F5F5F5',
                        padding: '1rem',
                        borderRadius: '0',
                        fontSize: '1rem',
                        lineHeight: 1.7,
                        color: '#333',
                        border: '1px solid transparent'
                      }}>
                        {quizItem.translatedText}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // Work_03 (빈칸 단어 문제) 표시
            if (quizItem.workTypeId === '03' && quizItem.work03Data) {
              return (
                <div key={`work-03-${index}`} className="quiz-item-card" style={{ 
                  marginBottom: '2rem', 
                  padding: '1.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0'
                }}>
                  <div className="quiz-item-header package01-work03-header" style={{ 
                    marginBottom: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '0.5rem'
                  }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                      문제 {index + 1} : 빈칸(단어) 문제
                    </h3>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      유형#03
                    </span>
                  </div>
                  
                  {/* 문제 지시문 - 모의고사 형식 */}
                  <div className="problem-instruction package01-work03-instruction" style={{
                    fontWeight: 500, 
                    fontSize: '0.95rem', 
                    background: '#f5f5f5', 
                    color: '#000', 
                    padding: '0.6rem 1rem', 
                    borderRadius: '0', 
                    marginBottom: '1.5rem',
                    textAlign: 'left',
                    borderTop: '1px solid #e0e0e0',
                    borderBottom: '1px solid #e0e0e0'
                  }}>
                    다음 빈칸에 들어갈 가장 적절한 단어를 고르세요.
                  </div>

                  {/* 본문 */}
                  <div className="problem-passage package01-work03-passage" style={{
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    margin: '0 0 0 0',
                    background: '#ffffff',
                    backgroundColor: '#ffffff',
                    border: '1px solid transparent',
                    padding: '1rem',
                    fontFamily: 'inherit',
                    color: '#333'
                  }}>
                    {quizItem.work03Data.blankedText}
                  </div>

                  {/* 선택지 */}
                  <div className="problem-options package01-work03-options" style={{
                    margin: '0 0 1.5rem 0',
                    marginTop: '0',
                    paddingTop: '0',
                    paddingBottom: '0',
                    backgroundColor: '#ffffff',
                    background: '#ffffff',
                    border: '1px solid transparent'
                  }}>
                    {quizItem.work03Data.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="option" style={{
                        display: 'block',
                        fontSize: '1rem',
                        margin: '0.5rem 0',
                        padding: '0.1rem 1rem',
                        fontFamily: 'inherit',
                        backgroundColor: '#ffffff',
                        background: '#ffffff',
                        border: '1px solid transparent',
                        borderRadius: '0',
                        color: '#333',
                        cursor: 'default',
                        textDecoration: 'none',
                        pointerEvents: 'none',
                        userSelect: 'none'
                      }}>
                        {`①②③④⑤`[optionIndex] || `${optionIndex+1}.`} {option}
                        {quizItem.work03Data?.answerIndex === optionIndex && (
                          <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 본문 해석 */}
                  <div className="problem-passage package01-work03-translation" style={{
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    margin: '1.5rem 0 0 0',
                    background: '#F5F5F5',
                    backgroundColor: '#F5F5F5',
                    border: '1px solid transparent',
                    padding: '1rem',
                    fontFamily: 'inherit',
                    color: '#333'
                  }}>
                    <strong>본문 해석 : </strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                </div>
              );
            }

          // Work_04 (빈칸 구 문제) 표시
          if (quizItem.workTypeId === '04' && quizItem.work04Data) {
            return (
              <div key={`work-04-${index}`} className="quiz-item-card" style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '0'
              }}>
                <div className="quiz-item-header package01-work04-header" style={{ 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '0.5rem'
                }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                    문제 {index + 1} : 빈칸(구) 추론
                  </h3>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    유형#04
                  </span>
                </div>

                {/* 문제 제목 */}
                <div className="problem-instruction package01-work04-instruction" style={{
                  fontWeight: 500, 
                  fontSize: '0.95rem', 
                  background: '#f5f5f5', 
                  color: '#000', 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0', 
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  borderTop: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.
                </div>

                {/* 문제 본문 */}
                <div className="problem-passage package01-work04-passage" style={{
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  margin: '0 0 0 0',
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid transparent',
                  padding: '1rem',
                  fontFamily: 'inherit',
                  color: '#333'
                }}>
                  {quizItem.work04Data.blankedText}
                </div>

                {/* 선택지 */}
                <div className="problem-options package01-work04-options" style={{
                  margin: '0 0 0 0',
                  paddingTop: '0',
                  paddingBottom: '0',
                  backgroundColor: '#ffffff',
                  background: '#ffffff',
                  border: '1px solid transparent'
                }}>
                  {quizItem.work04Data.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="option" style={{
                      display: 'block',
                      fontSize: '1rem',
                      margin: '0.5rem 0',
                      padding: '0.1rem 1rem',
                      fontFamily: 'inherit',
                      backgroundColor: '#ffffff',
                      background: '#ffffff',
                      border: '1px solid transparent',
                      borderRadius: '0',
                      color: '#333',
                      cursor: 'default',
                      textDecoration: 'none',
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}>
                      {`①②③④⑤`[optionIndex] || `${optionIndex+1}.`} {option}
                      {quizItem.work04Data && quizItem.work04Data.answerIndex === optionIndex && (
                        <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 번역 */}
                {quizItem.translatedText && (
                  <div className="translation-section" style={{ marginTop: '0' }}>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 : </h3>
                    <div className="translation-content package01-work04-translation" style={{
                      background: '#FFFFFF',
                      backgroundColor: '#FFFFFF',
                      padding: '1rem',
                      borderRadius: '0',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: '#333',
                      border: '1px solid transparent'
                    }}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_05 (빈칸 문장 문제) 표시
          if (quizItem.workTypeId === '05' && quizItem.work05Data) {
            return (
              <div key={`work-05-${index}`} className="quiz-item-card" style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '0'
              }}>
                <div className="quiz-item-header package01-work05-header" style={{ 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '0.5rem'
                }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                    문제 {index + 1} : 빈칸(문장) 추론
                  </h3>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    유형#05
                  </span>
                </div>

                {/* 문제 제목 */}
                <div className="problem-instruction package01-work05-instruction" style={{
                  fontWeight: 500, 
                  fontSize: '0.95rem', 
                  background: '#f5f5f5', 
                  color: '#000', 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0', 
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  borderTop: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.
                </div>

                <div className="problem-passage package01-work05-passage" style={{
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  margin: '0 0 0.75rem 0',
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid transparent',
                  padding: '1rem',
                  fontFamily: 'inherit',
                  color: '#333'
                }}>
                  {quizItem.work05Data.blankedText}
                </div>

                <div style={{
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ffffff',
                  borderRadius: '8px',
                  padding: '0 1rem',
                  paddingTop: '0',
                  paddingBottom: '0',
                  marginBottom: '1rem'
                }}>
                  {quizItem.work05Data.options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{
                      padding: '0.16rem 1rem',
                      marginBottom: '0',
                      background: '#ffffff',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #ffffff'
                    }}>
                      {['①', '②', '③', '④', '⑤'][optionIndex]} {option}
                      {quizItem.work05Data && quizItem.work05Data.answerIndex === optionIndex && (
                        <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 번역 */}
                {quizItem.translatedText && (
                  <div className="translation-section" style={{ marginTop: '0' }}>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 : </h3>
                    <div className="translation-content package01-work05-translation" style={{
                      background: '#FFFFFF',
                      backgroundColor: '#FFFFFF',
                      padding: '1rem',
                      borderRadius: '0',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: '#333',
                      border: '1px solid transparent'
                    }}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_06 (문장 위치 찾기) 표시
          if (quizItem.workTypeId === '06' && quizItem.work06Data) {
            return (
              <div key={`work-06-${index}`} className="quiz-item-card" style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '0'
              }}>
                <div className="quiz-item-header package01-work06-header" style={{ 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '0.5rem'
                }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                    문제 {index + 1} : 문장 위치 찾기
                  </h3>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    유형#06
                  </span>
                </div>

                {/* 문제 제목 */}
                <div className="problem-instruction package01-work06-instruction" style={{
                  fontWeight: 500, 
                  fontSize: '0.95rem', 
                  background: '#f5f5f5', 
                  color: '#000', 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0', 
                  marginBottom: '3rem',
                  textAlign: 'left',
                  borderTop: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  다음 영어본문에서 주요문장이 들어가야 할 가장 적합한 위치를 찾으세요.
                </div>

                <div style={{
                  border: '2px solid #222',
                  borderRadius: '6px',
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  padding: '0.8rem 1.2rem',
                  marginTop: '1rem',
                  marginBottom: '1rem',
                  fontWeight: 700
                }}>
                  <span style={{color: '#222'}}>주요 문장 : </span>
                  <span style={{color: '#000000'}}>{quizItem.work06Data.missingSentence}</span>
                </div>

                <div className="problem-passage package01-work06-passage" style={{
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  margin: '0 0 0 0',
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid transparent',
                  padding: '1rem',
                  fontFamily: 'inherit',
                  color: '#333',
                  whiteSpace: 'pre-line'
                }}>
                  {quizItem.work06Data.numberedPassage}
                </div>

                <div style={{
                  marginTop: '1rem',
                  color: '#1976d2',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ffffff',
                  borderRadius: '8px',
                  padding: '0 1rem',
                  paddingTop: '0',
                  paddingBottom: '0'
                }}>
                  정답 : {`①②③④⑤`[quizItem.work06Data.answerIndex] || quizItem.work06Data.answerIndex + 1}
                </div>

                {/* 번역 */}
                {quizItem.translatedText && (
                  <div className="translation-section" style={{ marginTop: '0' }}>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 : </h3>
                    <div className="translation-content package01-work06-translation" style={{
                      background: '#FFFFFF',
                      backgroundColor: '#FFFFFF',
                      padding: '1rem',
                      borderRadius: '0',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: '#333',
                      border: '1px solid transparent'
                    }}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_07 (주제 추론) 표시
          if (quizItem.workTypeId === '07' && quizItem.work07Data) {
            return (
              <div key={`work-07-${index}`} className="quiz-item-card" style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '0'
              }}>
                <div className="quiz-item-header package01-work07-header" style={{ 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '0.5rem'
                }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                    문제 {index + 1} : 주제 추론
                  </h3>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    유형#07
                  </span>
                </div>

                {/* 문제 제목 */}
                <div className="problem-instruction package01-work07-instruction" style={{
                  fontWeight: 500, 
                  fontSize: '0.95rem', 
                  background: '#f5f5f5', 
                  color: '#000', 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0', 
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  borderTop: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요.
                </div>

                <div style={{
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ffffff',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  marginBottom: '0',
                  fontSize: '1.1rem',
                  lineHeight: '1.7'
                }}>
                  {quizItem.work07Data.passage}
                </div>

                <div style={{
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ffffff',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  marginTop: '0'
                }}>
                  {quizItem.work07Data.options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{
                      padding: '0 1rem',
                      paddingTop: '0',
                      paddingBottom: '0',
                      marginBottom: '0.5rem',
                      background: '#ffffff',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #ffffff',
                      fontSize: '1.1rem',
                      lineHeight: '1.5'
                    }}>
                      {['①', '②', '③', '④', '⑤'][optionIndex]} {option}
                      {quizItem.work07Data && quizItem.work07Data.answerIndex === optionIndex && (
                        <span style={{color:'#1976d2', fontWeight:800, marginLeft:8, fontSize:'0.9rem'}}> (정답)</span>
                      )}
                      {quizItem.work07Data?.optionTranslations && quizItem.work07Data?.optionTranslations[optionIndex] && (
                        <div style={{fontSize:'0.85rem', color:'#666', marginTop:'0.3rem', paddingLeft:'1.0rem'}}>
                          {quizItem.work07Data?.optionTranslations[optionIndex]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 번역 */}
                {quizItem.translatedText && (
                  <div className="translation-section" style={{ marginTop: '0' }}>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 : </h3>
                    <div className="translation-content package01-work07-translation" style={{
                      background: '#FFFFFF',
                      backgroundColor: '#FFFFFF',
                      padding: '1rem',
                      borderRadius: '0',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: '#333',
                      border: '1px solid transparent'
                    }}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_08 (제목 추론) 표시
          if (quizItem.workTypeId === '08' && quizItem.work08Data) {
            return (
              <div key={`work-08-${index}`} className="quiz-item-card" style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '0'
              }}>
                <div className="quiz-item-header package01-work08-header" style={{ 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '0.5rem'
                }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                    문제 {index + 1} : 제목 추론
                  </h3>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    유형#08
                  </span>
                </div>

                {/* 문제 제목 */}
                <div className="problem-instruction package01-work08-instruction" style={{
                  fontWeight: 500, 
                  fontSize: '0.95rem', 
                  background: '#f5f5f5', 
                  color: '#000', 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0', 
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  borderTop: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  다음 본문에 가장 적합한 제목을 고르세요.
                </div>

                <div style={{
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ffffff',
                  borderRadius: '8px',
                  padding: '1.2rem',
                  marginBottom: '0',
                  fontSize: '1.1rem',
                  lineHeight: '1.7'
                }}>
                  {quizItem.work08Data.passage}
                </div>

                <div style={{
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ffffff',
                  borderRadius: '8px',
                  padding: '0 1rem',
                  paddingTop: '0',
                  paddingBottom: '0',
                  marginBottom: '1rem',
                  marginTop: '0'
                }}>
                  {quizItem.work08Data.options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{
                      padding: '0.16rem 1rem',
                      marginBottom: '0',
                      background: '#ffffff',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #ffffff',
                      fontSize: '1.1rem',
                      lineHeight: '1.5'
                    }}>
                      {`①②③④⑤`[optionIndex] || `${optionIndex+1}.`} {option}
                      {quizItem.work08Data && quizItem.work08Data.answerIndex === optionIndex && (
                        <span style={{color:'#1976d2', fontWeight:800, marginLeft:8, fontSize:'0.9rem'}}> (정답)</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 번역 */}
                {quizItem.translatedText && (
                  <div className="translation-section" style={{ marginTop: '0' }}>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 : </h3>
                    <div className="translation-content package01-work08-translation" style={{
                      background: '#FFFFFF',
                      backgroundColor: '#FFFFFF',
                      padding: '1rem',
                      borderRadius: '0',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: '#333',
                      border: '1px solid transparent'
                    }}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Work_09 (어법 오류) 표시
          if (quizItem.workTypeId === '09' && quizItem.work09Data) {
            return (
              <div key={`work-09-${index}`} className="quiz-item-card" style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '0'
              }}>
                <div className="quiz-item-header package01-work09-header" style={{ 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '0.5rem'
                }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                    문제 {index + 1} : 어법 오류 찾기
                  </h3>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    유형#09
                  </span>
                </div>

                {/* 문제 제목 */}
                <div className="problem-instruction package01-work09-instruction" style={{
                  fontWeight: 500, 
                  fontSize: '0.95rem', 
                  background: '#f5f5f5', 
                  color: '#000', 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0', 
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  borderTop: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  다음 영어 본문에 표시된 단어들 중에서 어법상 틀린 것을 고르시오.
                </div>

                <div 
                  className="problem-passage package01-work09-passage"
                  style={{
                    background: '#ffffff',
                    backgroundColor: '#ffffff',
                    border: '1px solid #ffffff',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    marginBottom: '0',
                    fontSize: '1.1rem',
                    lineHeight: '1.7'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: (quizItem.work09Data.passage || '').replace(/\n/g, '<br/>')
                  }}
                />

                <div className="problem-options package01-work09-options" style={{
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ffffff',
                  borderRadius: '8px',
                  padding: '0 1rem',
                  paddingTop: '0',
                  paddingBottom: '0',
                  marginBottom: '1rem',
                  marginTop: '0'
                }}>
                  {quizItem.work09Data.options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{
                      padding: '0.16rem 1rem',
                      marginBottom: '0',
                      background: '#ffffff',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #ffffff',
                      fontSize: '1.1rem',
                      lineHeight: '1.5',
                      cursor: 'default',
                      textDecoration: 'none',
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}>
                      {['①', '②', '③', '④', '⑤'][optionIndex]} {option}
                      {quizItem.work09Data && quizItem.work09Data.answerIndex === optionIndex && (
                        <span style={{color:'#1976d2', fontWeight:800, marginLeft:8, fontSize:'0.9rem'}}> (정답)</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 번역 */}
                {quizItem.translatedText && (
                  <div className="translation-section" style={{ marginTop: '0' }}>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 : </h3>
                    <div className="translation-content package01-work09-translation" style={{
                      background: '#FFFFFF',
                      backgroundColor: '#FFFFFF',
                      padding: '1rem',
                      borderRadius: '0',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: '#333',
                      border: '1px solid transparent'
                    }}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                )}
              </div>
            );
          }



          // Work_10 (다중 어법 오류) 표시
          if (quizItem.workTypeId === '10' && quizItem.work10Data) {
            return (
              <div key={`work-10-${index}`} className="quiz-item-card" style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '0'
              }}>
                <div className="quiz-item-header package01-work10-header" style={{ 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '0.5rem'
                }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                    문제 {index + 1} : 다중 어법 오류
                  </h3>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    유형#10
                  </span>
                </div>

                {/* 문제 제목 */}
                <div className="problem-instruction package01-work10-instruction" style={{
                  fontWeight: 500, 
                  fontSize: '0.95rem', 
                  background: '#f5f5f5', 
                  color: '#000', 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0', 
                  marginBottom: '0',
                  textAlign: 'left',
                  borderTop: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  다음 영어 본문에 표시된 단어들 중에서 어법상 틀린 단어의 개수를 고르시오.
                </div>

                <div 
                  className="problem-passage package01-work10-passage"
                  style={{
                    background: '#ffffff',
                    backgroundColor: '#ffffff',
                    border: '1px solid #ffffff',
                    borderRadius: '8px',
                    padding: '0 1.2rem 1.2rem 1.2rem',
                    paddingTop: '0',
                    marginBottom: '0',
                    fontSize: '1.1rem',
                    lineHeight: '1.7'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: quizItem.work10Data.numberedPassage || quizItem.work10Data.passage || ''
                  }}
                />

                <div className="problem-options package01-work10-options" style={{
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ffffff',
                  borderRadius: '8px',
                  padding: '0 1rem',
                  paddingTop: '0',
                  paddingBottom: '0',
                  marginBottom: '1rem',
                  marginTop: '0'
                }}>
                  {quizItem.work10Data.options.map((option, optionIndex) => (
                    <div key={optionIndex} style={{
                      padding: '0.16rem 1rem',
                      marginBottom: '0',
                      background: '#ffffff',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #ffffff',
                      fontSize: '1.1rem',
                      lineHeight: '1.5',
                      cursor: 'default',
                      textDecoration: 'none',
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}>
                      {['①', '②', '③', '④', '⑤', '⑥'][optionIndex]} {option}개
                      {quizItem.work10Data && quizItem.work10Data.answerIndex === optionIndex && (
                        <span style={{color:'#1976d2', fontWeight:800, marginLeft:8, fontSize:'0.9rem'}}> (정답)</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 번역 */}
                {quizItem.translatedText && (
                  <div className="translation-section" style={{ marginTop: '0' }}>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 : </h3>
                    <div className="translation-content package01-work10-translation" style={{
                      background: '#FFFFFF',
                      backgroundColor: '#FFFFFF',
                      padding: '1rem',
                      borderRadius: '0',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: '#333',
                      border: '1px solid transparent'
                    }}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                )}
              </div>
            );
          }



          // Work_11 (문장별 해석) 표시
          if (quizItem.workTypeId === '11' && quizItem.work11Data) {
            // 패키지#02의 데이터 구조: sentences는 {english, korean}[] 형태
            const sentences = Array.isArray(quizItem.work11Data.sentences) 
              ? quizItem.work11Data.sentences.map((s: any) => typeof s === 'string' ? s : (s.english || s))
              : [];
            const translations = Array.isArray(quizItem.work11Data.sentences)
              ? quizItem.work11Data.sentences.map((s: any) => (typeof s === 'object' && s.korean) ? s.korean : '')
              : [];

            return (
              <div key={`work-11-${index}`} className="quiz-item-card" style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '0'
              }}>
                <div className="quiz-item-header package01-work11-header" style={{ 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '0.5rem'
                }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                    문제 {index + 1} : 문장별 해석
                  </h3>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    유형#11
                  </span>
                </div>

                {/* 문제 지시사항 */}
                <div className="problem-instruction package01-work11-instruction" style={{
                  fontWeight: 500, 
                  fontSize: '0.95rem', 
                  background: '#f5f5f5', 
                  color: '#000', 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0', 
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  borderTop: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  다음 본문의 각 문장을 한국어로 해석하시오.
                </div>

                {/* 문장별 해석 문제 */}
                <div className="sentences-container package01-work11-sentences-container" style={{
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  margin: '0 0 1.5rem 0',
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid transparent',
                  padding: '1rem',
                  fontFamily: 'inherit',
                  color: '#333'
                }}>
                  {sentences.map((sentence, sentenceIndex) => (
                    <div key={sentenceIndex} className="sentence-item package01-work11-sentence-item" style={{
                      background: '#ffffff',
                      backgroundColor: '#ffffff',
                      borderRadius: '0',
                      padding: '0.3rem 1.2rem',
                      border: '1px solid transparent',
                      marginBottom: '1rem',
                      fontFamily: 'inherit',
                      boxShadow: 'none'
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
                          fontSize: '1rem',
                          lineHeight: '1.7',
                          color: '#333',
                          fontFamily: 'inherit',
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
                <div className="work-11-answer package01-work11-answer" style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#ffffff',
                  background: '#ffffff',
                  borderRadius: '0',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#1976d2',
                    marginBottom: '1rem'
                  }}>
                    정답
                  </div>
                  {sentences.map((sentence, sentenceIndex) => (
                    <div key={sentenceIndex} className="package01-work11-answer-item" style={{
                      marginBottom: '1rem',
                      padding: '0.8rem',
                      backgroundColor: '#ffffff',
                      background: '#ffffff',
                      borderRadius: '0',
                      border: '1px solid transparent'
                    }}>
                      <div className="package01-work11-answer-sentence" style={{
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#000000',
                        marginBottom: '0.3rem'
                      }}>
                        {sentenceIndex + 1}. {sentence}
                      </div>
                      <div style={{
                        fontSize: '0.95rem',
                        color: '#333',
                        lineHeight: 1.5
                      }}>
                        {translations[sentenceIndex] || ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }



          // Work_13 (빈칸 채우기 - 단어) 표시
          if (quizItem.workTypeId === '13' && quizItem.work13Data) {
            return (
              <div key={`work-13-${index}`} className="quiz-item-card" style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '0'
              }}>
                <div className="quiz-item-header package01-work13-header" style={{ 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '0.5rem'
                }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                    문제 {index + 1} : 빈칸(단어) 채우기
                  </h3>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    유형#13
                  </span>
                </div>

                {/* 문제 지시사항 */}
                <div className="problem-instruction package01-work13-instruction" style={{
                  fontWeight: 500, 
                  fontSize: '0.95rem', 
                  background: '#f5f5f5', 
                  color: '#000', 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0', 
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  borderTop: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  다음 빈칸에 들어갈 단어를 직접 입력하시오.
                </div>

                {/* 빈칸 본문 */}
                <div className="problem-passage package01-work13-passage" style={{
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  margin: '0 0 1.5rem 0',
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid transparent',
                  padding: '1rem',
                  fontFamily: 'inherit',
                  color: '#333'
                }}>
                  <div dangerouslySetInnerHTML={{ __html: formatBlankedText(
                    quizItem.work13Data.blankedText || '',
                    quizItem.work13Data.correctAnswers || []
                  ) }} />
                </div>

                {/* 정답 표시 */}
                <div className="no-print package01-work13-answer" style={{
                  marginTop: '1.2rem',
                  color: '#000000',
                  fontWeight: 700
                }}>
                  <span style={{color: '#000000'}}>
                    정답 : {quizItem.work13Data.correctAnswers?.join(', ') || '정답 없음'}
                  </span>
                </div>

                {/* 한국어 번역 */}
                {(quizItem.work13Data.translation || quizItem.translatedText) && (
                  <div className="translation-section" style={{ marginTop: '2rem' }}>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 : </h3>
                    <div className="translation-content package01-work13-translation" style={{
                      background: '#F5F5F5',
                      backgroundColor: '#F5F5F5',
                      padding: '1rem',
                      borderRadius: '0',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: '#333',
                      border: '1px solid transparent'
                    }}>
                      {quizItem.work13Data.translation || quizItem.translatedText}
                    </div>
                  </div>
                )}
              </div>
            );
          }



          // Work_14 (빈칸 채우기 - 문장) 표시
          if (quizItem.workTypeId === '14' && quizItem.work14Data) {
            // 패키지#02에서는 correctAnswers를 사용하지만, 패키지#01과 동일한 구조를 위해 selectedSentences 또는 correctAnswers 사용
            const answerSentences = quizItem.work14Data.selectedSentences || quizItem.work14Data.correctAnswers || [];

            return (
              <div key={`work-14-${index}`} className="quiz-item-card" style={{ 
                marginBottom: '2rem', 
                padding: '1.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '0'
              }}>
                <div className="quiz-item-header package01-work14-header" style={{ 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '0.5rem'
                }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                    문제 {index + 1} : 빈칸(문장) 채우기
                  </h3>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    유형#14
                  </span>
                </div>

                {/* 문제 지시사항 */}
                <div className="problem-instruction package01-work14-instruction" style={{
                  fontWeight: 500, 
                  fontSize: '0.95rem', 
                  background: '#f5f5f5', 
                  color: '#000', 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0', 
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  borderTop: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  다음 빈칸에 들어갈 문장을 직접 입력하시오.
                </div>

                {/* 빈칸 본문 */}
                <div className="problem-passage package01-work14-passage" style={{
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  margin: '0 0 1.5rem 0',
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  border: '1px solid transparent',
                  padding: '1rem',
                  fontFamily: 'inherit',
                  color: '#333'
                }}>
                  <div dangerouslySetInnerHTML={{ __html: formatBlankedText(
                    quizItem.work14Data.blankedText || '',
                    quizItem.work14Data.correctAnswers || []
                  ) }} />
                </div>

                {/* 정답 표시 */}
                {answerSentences.length > 0 && (
                  <div className="no-print package01-work14-answer" style={{
                    marginTop: '1.2rem',
                    color: '#000000',
                    fontWeight: 700
                  }}>
                    <div style={{color: '#000000', marginBottom: '0.5rem'}}>
                      정답 문장들 : 
                    </div>
                    {answerSentences.map((sentence, idx) => {
                      const alphabetLabel = String.fromCharCode(65 + idx); // A=65, B=66, C=67...
                      // 정답 문장에서 빈칸 형식 제거
                      let cleanSentence = sentence || '';
                      if (cleanSentence) {
                        // 패턴 1: (____________________A____________________) 형식 (긴 언더스코어, 알파벳 앞뒤)
                        cleanSentence = cleanSentence.replace(/\(_{5,}[A-Z]_{5,}\)/g, '').trim();
                        // 패턴 2: (_+A_+) - 언더스코어 앞뒤 (짧은 경우)
                        cleanSentence = cleanSentence.replace(/\(_+[A-Z]_+\)/g, '').trim();
                        // 패턴 3: ( A _+ ) 또는 ( A_+ )
                        cleanSentence = cleanSentence.replace(/\(\s*[A-Z]\s*_+\s*\)/g, '').trim();
                        cleanSentence = cleanSentence.replace(/\(\s*[A-Z]_+\s*\)/g, '').trim();
                        // 패턴 4: (A_+) - 공백 없는 경우
                        cleanSentence = cleanSentence.replace(/\([A-Z]_+\)/g, '').trim();
                        // 패턴 5: ( _+ ) 일반 빈칸
                        cleanSentence = cleanSentence.replace(/\(_+\)/g, '').trim();
                        // 패턴 6: 공백 포함 모든 패턴
                        cleanSentence = cleanSentence.replace(/\(\s*[A-Z]?\s*_+\s*[A-Z]?\s*\)/g, '').trim();
                        // 패턴 7: 언더스코어가 3개 이상이고 알파벳이 포함된 모든 패턴
                        cleanSentence = cleanSentence.replace(/\([^)]*_{3,}[^)]*[A-Z][^)]*\)/g, '').trim();
                        cleanSentence = cleanSentence.replace(/\([^)]*[A-Z][^)]*_{3,}[^)]*\)/g, '').trim();
                      }
                      
                      return (
                        <div key={idx} className="package01-work14-answer-item" style={{
                          marginBottom: '0.3rem',
                          padding: '0.5rem',
                          backgroundColor: '#f5f5f5',
                          background: '#f5f5f5',
                          borderRadius: '0',
                          fontSize: '0.95rem',
                          lineHeight: 1.4,
                          color: '#000000'
                        }}>
                          {alphabetLabel}. {cleanSentence || sentence}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 한국어 번역 */}
                {(quizItem.work14Data.translation || quizItem.translatedText) && (
                  <div className="translation-section" style={{ marginTop: '2rem' }}>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 : </h3>
                    <div className="translation-content package01-work14-translation" style={{
                      background: '#F5F5F5',
                      backgroundColor: '#F5F5F5',
                      padding: '1rem',
                      borderRadius: '0',
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      color: '#333',
                      border: '1px solid transparent'
                    }}>
                      {quizItem.work14Data.translation || quizItem.translatedText}
                    </div>
                  </div>
                )}
              </div>
            );
          }
          
          return null;
        })}
        </div>
      </React.Fragment>
    );
  }

  // 문제 생성 전 화면
  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>📦 패키지 퀴즈 #02 (2단 출력)</h2>
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
              영어 본문 직접 붙여넣기: (1,500자 미만 권장)
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
      {(isLoading || isExtractingText) && (
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

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
      <button
        type="button"
        onClick={handleGenerateQuiz}
        disabled={isLoading}
          style={{
            padding: '0.75rem 3.75rem',
            fontSize: '1.18rem',
            fontWeight: '700',
            border: 'none',
            borderRadius: '10px',
            background: 'linear-gradient(90deg, #4a90e2 0%, #6a5acd 100%)',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(44,62,80,0.08)',
            transition: 'all 0.2s ease',
            minWidth: '270px',
            height: '48px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(90deg, #6a5acd 0%, #4a90e2 100%)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(90deg, #4a90e2 0%, #6a5acd 100%)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isLoading ? '생성 중...' : '문제 생성'}
      </button>
      </div>

      {/* 포인트 차감 확인 모달 */}
      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={handlePointDeductionConfirm}
        workTypeName={`패키지 퀴즈 생성 (${Object.values(selectedWorkTypes).filter(selected => selected).length}개 유형)`}
        pointsToDeduct={pointsToDeduct}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - pointsToDeduct}
      />
    </div>
  );
};

export default Package_02_TwoStepQuiz;
