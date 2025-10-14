import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './Package_02_TwoStepQuiz.css';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { savePackageQuizHistory } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
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
import { generateBlankFillQuizWithAI } from '../../../services/work13Service';
import { generateBlankQuizWithAI } from '../../../services/work14Service';
import { translateToKorean } from '../../../services/common';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import PrintHeaderPackage02 from './PrintHeaderPackage02';

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
  work13Data?: BlankFillItem;
  work14Data?: BlankQuizWithTranslation;
  translatedText: string;
}

const Package_02_TwoStepQuiz: React.FC = () => {
  const { userData, loading } = useAuth();
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
        result += sentence.replace(regex, `<span class="print-word-highlight">${word}</span>`) + ' ';
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

  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);

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
        } catch (historyError) {
          console.error('📝 내역 저장 실패:', historyError);
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
  const handlePrintProblem = async () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(문제) 시작');
    
    // 가로 페이지 스타일 동적 추가
    const style = document.createElement('style');
    style.id = 'print-style-package02';
    style.textContent = `
      @page {
        margin: 0;
        size: A4 landscape;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
      }
    `;
    document.head.appendChild(style);
    
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

    // 렌더링 완료 후 인쇄 및 PDF 생성
    setTimeout(async () => {
      // PDF 생성 및 Firebase Storage 업로드
      try {
        const { generateAndUploadPDF } = await import('../../../services/pdfService');
        const { updateQuizHistoryFile } = await import('../../../services/quizHistoryService');
        
        const element = document.getElementById('print-root-package02');
        if (element) {
          const result = await generateAndUploadPDF(
            element as HTMLElement,
            userData?.uid || '',
            `package02_problem_${Date.now()}`,
            '패키지#02_문제',
            { isAnswerMode: false, orientation: 'landscape' }
          );
          
          // 패키지 내역에 파일 URL 저장 (가장 최근 패키지 내역 찾기)
          if (userData?.uid) {
            const { getQuizHistory } = await import('../../../services/quizHistoryService');
            const history = await getQuizHistory(userData.uid, { limit: 10 });
            const packageHistory = history.find(h => h.workTypeId === 'P02');
            
            if (packageHistory) {
              await updateQuizHistoryFile(packageHistory.id, result.url, result.fileName, 'problem');
              console.log('📁 패키지#02 문제 PDF 저장 완료:', result.fileName);
            }
          }
        }
      } catch (error) {
        console.error('❌ PDF 저장 실패:', error);
      }

      // 브라우저 인쇄
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

  const handlePrintAnswer = async () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(정답) 시작');
    
    // A4 가로 페이지 스타일 동적 추가
    const style = document.createElement('style');
    style.id = 'print-style-package02-answer';
    style.textContent = `
      @page {
        margin: 0;
        size: A4 landscape;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        .print-container-answer {
          display: block !important;
          width: 29.7cm;
          min-height: 21cm;
          background: white;
          padding: 0;
          box-sizing: border-box;
        }
        .no-print {
          display: none !important;
        }
      }
      @media screen {
        .print-container-answer {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    // 인쇄용 컨테이너 생성
    const printContainer = document.createElement('div');
    printContainer.id = 'print-root-package02-answer';
    printContainer.className = 'print-container-answer print-answer-mode';
    document.body.appendChild(printContainer);

    // 기존 화면 숨기기
    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    // Work_02 데이터 추출 제거 (교체된 단어 테이블 완전 제거)
    
    // React 18 방식으로 렌더링 - 원래 유형과 동일한 스타일
    const root = ReactDOM.createRoot(printContainer);

    root.render(
      <div className="only-print print-answer-mode">
        {packageQuiz.map((quizItem, index) => {
          // Work_01: 문단 순서 맞추기
          if (quizItem.workTypeId === '01' && quizItem.quiz) {
            return (
              <div key={`answer-01-${index}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#01. 문단 순서 맞추기</span>
                      <span className="print-question-type-badge">유형#01</span>
                    </div>
                    <div className="print-instruction">
                      다음 단락들을 원래 순서대로 배열한 것을 고르세요
                    </div>
                    <div className="print-shuffled-paragraphs">
                      {quizItem.quiz.shuffledParagraphs.map((paragraph: any, pIndex: number) => (
                        <div key={paragraph.id} className="print-paragraph-item">
                          <strong>{paragraph.label}:</strong> {paragraph.content}
                        </div>
                      ))}
                    </div>
                    <div className="print-options">
                      <div className="print-option">
                        {['①', '②', '③', '④'][quizItem.quiz?.answerIndex || 0]} {quizItem.quiz.choices?.[quizItem.quiz?.answerIndex || 0]?.join(' → ')}
                        <span className="print-answer-label">
                          (정답)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Work_02: 유사단어 독해 (교체된 단어 테이블 제외)
          if (quizItem.workTypeId === '02' && quizItem.work02Data) {
            return (
              <div key={`answer-02-${index}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#02. 유사단어 독해</span>
                      <span className="print-question-type-badge">유형#02</span>
                    </div>
                    <div className="print-instruction">
                      다음 본문을 읽고 해석하세요
                    </div>
                    <div 
                      className="print-passage"
                      dangerouslySetInnerHTML={{
                        __html: renderTextWithHighlight(
                          quizItem.work02Data.modifiedText || '', 
                          quizItem.work02Data.replacements || []
                        )
                      }}
                    />
                    {/* 교체된 단어 테이블은 마지막에 별도 페이지로 표시 */}
                  </div>
                </div>
              </div>
            );
          }

          // Work_03: 빈칸(단어) 문제
          if (quizItem.workTypeId === '03' && quizItem.work03Data) {
            return (
              <div key={`answer-03-${index}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#03. 빈칸(단어) 문제</span>
                      <span className="print-question-type-badge">유형#03</span>
                    </div>
                    <div className="print-instruction">
                      다음 빈칸에 들어갈 가장 적절한 단어를 고르세요
                    </div>
                    <div className="print-passage">
                      {quizItem.work03Data.blankedText}
                    </div>
                    <div className="print-options">
                      <div className="print-option">
                        {['①', '②', '③', '④', '⑤'][quizItem.work03Data?.answerIndex || 0]} {quizItem.work03Data.options?.[quizItem.work03Data?.answerIndex || 0]}
                        <span className="print-answer-label">
                          (정답)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Work_04: 빈칸(구) 문제
          if (quizItem.workTypeId === '04' && quizItem.work04Data) {
            return (
              <div key={`answer-04-${index}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#04. 빈칸(구) 문제</span>
                      <span className="print-question-type-badge">유형#04</span>
                    </div>
                    <div className="print-instruction">
                      다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오
                    </div>
                    <div className="print-passage">
                      {quizItem.work04Data.blankedText}
                    </div>
                    <div className="print-options">
                      <div className="print-option">
                        {['①', '②', '③', '④', '⑤'][quizItem.work04Data?.answerIndex || 0]} {quizItem.work04Data.options?.[quizItem.work04Data?.answerIndex || 0]}
                        <span className="print-answer-label">
                          (정답)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Work_05: 빈칸(문장) 문제
          if (quizItem.workTypeId === '05' && quizItem.work05Data) {
            return (
              <div key={`answer-05-${index}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#05. 빈칸(문장) 문제</span>
                      <span className="print-question-type-badge">유형#05</span>
                    </div>
                    <div className="print-instruction">
                      다음 빈칸에 들어갈 가장 적절한 문장을 고르세요
                    </div>
                    <div className="print-passage">
                      {quizItem.work05Data.blankedText}
                    </div>
                    <div className="print-options">
                      <div className="print-option">
                        {['①', '②', '③', '④', '⑤'][quizItem.work05Data?.answerIndex || 0]} {quizItem.work05Data.options?.[quizItem.work05Data?.answerIndex || 0]}
                        <span className="print-answer-label">
                          (정답)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Work_06: 문장 위치 찾기
          if (quizItem.workTypeId === '06' && quizItem.work06Data) {
            return (
              <div key={`answer-06-${index}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#06. 문장 위치 찾기</span>
                      <span className="print-question-type-badge">유형#06</span>
                    </div>
                    <div className="print-instruction">
                      아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오
                    </div>
                    <div className="work06-main-sentence">
                      주요 문장: {quizItem.work06Data.missingSentence}
                    </div>
                    <div className="print-passage">
                      {quizItem.work06Data.numberedPassage}
                    </div>
                    <div className="work06-answer-section">
                      <div className="work06-answer-text">
                        정답 : {['①', '②', '③', '④', '⑤'][quizItem.work06Data.answerIndex || 0]}번
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Work_07: 주제 추론
          if (quizItem.workTypeId === '07' && quizItem.work07Data) {
            return (
              <div key={`answer-07-${index}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#07. 주제 추론</span>
                      <span className="print-question-type-badge">유형#07</span>
                    </div>
                    <div className="print-instruction">
                      다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요
                    </div>
                    <div className="print-passage">
                      {quizItem.work07Data.passage}
                    </div>
                    <div className="print-options">
                      <div className="print-option">
                        {['①', '②', '③', '④', '⑤'][quizItem.work07Data?.answerIndex || 0]} {quizItem.work07Data.options?.[quizItem.work07Data?.answerIndex || 0]}
                        <span className="print-answer-label">
                          (정답)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Work_08: 제목 추론
          if (quizItem.workTypeId === '08' && quizItem.work08Data) {
            return (
              <div key={`answer-08-${index}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#08. 제목 추론</span>
                      <span className="print-question-type-badge">유형#08</span>
                    </div>
                    <div className="print-instruction">
                      다음 본문에 가장 적합한 제목을 고르세요
                    </div>
                    <div className="print-passage">
                      {quizItem.work08Data.passage}
                    </div>
                    <div className="print-options">
                      <div className="print-option">
                        {`①②③④⑤`[quizItem.work08Data?.answerIndex || 0]} {quizItem.work08Data.options?.[quizItem.work08Data?.answerIndex || 0]}
                        <span className="print-answer-label">
                          (정답)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Work_09: 어법 오류 찾기
          if (quizItem.workTypeId === '09' && quizItem.work09Data) {
            return (
              <div key={`answer-09-${index}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#09. 어법 오류 찾기</span>
                      <span className="print-question-type-badge">유형#09</span>
                    </div>
                    <div className="print-instruction">
                      다음 글의 밑줄 친 부분 중, 어법상 틀린 것을 고르시오
                    </div>
                    <div className="print-passage">
                      {quizItem.work09Data.passage}
                    </div>
                    <div className="print-options">
                      <div className="print-option">
                        {['①', '②', '③', '④', '⑤'][quizItem.work09Data?.answerIndex || 0]} {quizItem.work09Data.options?.[quizItem.work09Data?.answerIndex || 0]}
                        <span className="print-answer-label">
                          (정답)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Work_10: 다중 어법 오류
          if (quizItem.workTypeId === '10' && quizItem.work10Data) {
            return (
              <div key={`answer-10-${index}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#10. 다중 어법 오류</span>
                      <span className="print-question-type-badge">유형#10</span>
                    </div>
                    <div className="print-instruction">
                      다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?
                    </div>
                    <div className="print-passage" style={{
                      marginTop: '0.6rem', 
                      marginBottom: '0.7rem', 
                      fontSize: '9pt',
                      paddingLeft: '0.8rem',
                      paddingRight: '0.8rem',
                      paddingTop: '0.4rem',
                      paddingBottom: '0.2rem'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: quizItem.work10Data.passage.replace(/\n/g, '<br/>')
                    }}
                    />
                    <div className="print-options">
                      <div className="print-option">
                        {['①', '②', '③', '④', '⑤', '⑥'][quizItem.work10Data?.answerIndex || 0]} {quizItem.work10Data.options?.[quizItem.work10Data?.answerIndex || 0]}개
                        <span className="print-answer-label">
                          (정답)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Work_11: 본문 문장별 해석 (동적 페이지 분할)
          if (quizItem.workTypeId === '11' && quizItem.work11Data) {
            // 페이지 분할을 위한 높이 계산 (A4 가로형)
            const A4_CONTENT_HEIGHT = 17; // cm (A4 가로형: 21cm 높이 - 헤더/여백)
            const INSTRUCTION_HEIGHT = 2; // cm (문제 설명 높이 축소)
            const CONTAINER_BASE_HEIGHT = 1.8; // cm (기본 컨테이너 높이 축소)
            const CHAR_HEIGHT_PER_LINE = 0.4; // cm (텍스트 한 줄 높이 축소)
            
            // 각 문장 컨테이너의 예상 높이 계산
            const containerHeights = quizItem.work11Data.sentences.map((sentence: any) => {
              const englishLines = Math.ceil(sentence.english.length / 80);
              const koreanLines = Math.ceil(sentence.korean.length / 60);
              return CONTAINER_BASE_HEIGHT + (englishLines * CHAR_HEIGHT_PER_LINE) + (koreanLines * 0.4);
            });
            
            // 페이지별로 컨테이너 분배
            const pages: number[][] = [];
            let currentPage: number[] = [];
            let currentPageHeight = INSTRUCTION_HEIGHT;
            
            containerHeights.forEach((height, idx) => {
              if (currentPageHeight + height > A4_CONTENT_HEIGHT && currentPage.length > 0) {
                // 현재 페이지가 가득 차면 새 페이지 시작
                pages.push(currentPage);
                currentPage = [idx];
                currentPageHeight = INSTRUCTION_HEIGHT + height;
              } else {
                // 현재 페이지에 추가
                currentPage.push(idx);
                currentPageHeight += height;
              }
            });
            
            // 마지막 페이지 추가
            if (currentPage.length > 0) {
              pages.push(currentPage);
            }
            
            // 각 페이지 렌더링
            return pages.map((pageIndices, pageIdx) => (
              <div key={`answer-11-page-${pageIdx}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#11. 문장별 해석</span>
                      <span className="print-question-type-badge">유형#11</span>
                    </div>
                    <div className="print-instruction">
                      {pageIdx === 0 
                        ? '다음 본문을 문장별로 해석하세요'
                        : `번역할 문장들 (계속) - ${pageIdx + 1}페이지`
                      }
                    </div>
                    {pageIndices.map((sIndex: number) => {
                      const sentence = quizItem.work11Data?.sentences[sIndex];
                      if (!sentence) return null;
                      return (
                        <div key={sIndex} className="work11-print-answer-sentence" style={{
                          marginBottom: '0.7rem',
                          padding: '0.4rem 0.8rem 0 0.8rem',
                          borderRadius: '6px',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <div style={{ 
                            fontSize: '8.5pt',
                            lineHeight: '1.5',
                            color: '#000',
                            marginBottom: '0.3rem'
                          }}>
                            <span style={{fontWeight: 'bold', color: '#333'}}>
                              {sIndex + 1}. 
                            </span>
                            {sentence.english}
                          </div>
                          <div style={{
                            fontSize: '7.5pt',
                            lineHeight: '1.3',
                            color: '#1976d2',
                            fontWeight: '500',
                            marginTop: '0.2rem',
                            paddingBottom: '0.4rem'
                          }}>
                            {sentence.korean}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ));
          }

          // Work_13: 빈칸 채우기 (단어-주관식)
          if (quizItem.workTypeId === '13' && quizItem.work13Data) {
            return (
              <div key={`answer-13-${index}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#13. 빈칸 채우기 (단어)</span>
                      <span className="print-question-type-badge">유형#13</span>
                    </div>
                    <div className="print-instruction">
                      다음 빈칸에 들어갈 적절한 단어를 쓰시오
                    </div>
                    <div className="print-passage" style={{
                      marginTop: '0.6rem', 
                      marginBottom: '0.7rem', 
                      fontSize: '9pt',
                      paddingLeft: '0.8rem',
                      paddingRight: '0.8rem',
                      paddingTop: '0.4rem',
                      paddingBottom: '0.2rem'
                    }}>
                      {quizItem.work13Data.blankedText}
                    </div>
                    <div className="work13-answer-section">
                      <div className="work13-answer-text">
                        <div className="work13-answer-label">
                          정답:
                        </div>
                        <div className="work13-answer-content">
                          {quizItem.work13Data.correctAnswers?.map((answer: string, aIndex: number) => (
                            <div key={aIndex} className="work13-answer-item">
                              {aIndex + 1}. {answer}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Work_14: 빈칸 채우기 (문장-주관식)
          if (quizItem.workTypeId === '14' && quizItem.work14Data) {
            return (
              <div key={`answer-14-${index}`} className="a4-landscape-page-template">
                <div className="a4-landscape-page-header">
                  <PrintHeaderPackage02 />
                </div>
                <div className="a4-landscape-page-content">
                  <div className="quiz-content">
                    <div className="print-question-title">
                      <span>#14. 빈칸 채우기 (문장)</span>
                      <span className="print-question-type-badge">유형#14</span>
                    </div>
                    <div className="print-instruction">
                      다음 빈칸에 들어갈 적절한 문장을 쓰시오
                    </div>
                    <div className="print-passage" style={{
                      marginTop: '0.6rem', 
                      marginBottom: '0.7rem', 
                      fontSize: '9pt',
                      paddingLeft: '0.8rem',
                      paddingRight: '0.8rem',
                      paddingTop: '0.4rem',
                      paddingBottom: '0.2rem'
                    }}>
                      {quizItem.work14Data.blankedText}
                    </div>
                    <div className="work14-answer-section">
                      <div className="work14-answer-text">
                        <div className="work14-answer-label">
                          정답:
                        </div>
                        <div className="work14-answer-content">
                          {quizItem.work14Data.correctAnswers?.map((answer: string, aIndex: number) => (
                            <div key={aIndex} className="work14-answer-item">
                              {aIndex + 1}. {answer}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
        
        {/* 교체된 단어 테이블 완전 제거 */}
      </div>
    );

    // 렌더링 완료 후 인쇄 및 PDF 생성
    setTimeout(async () => {
      // PDF 생성 및 Firebase Storage 업로드
      try {
        const { generateAndUploadPDF } = await import('../../../services/pdfService');
        const { updateQuizHistoryFile } = await import('../../../services/quizHistoryService');
        
        const element = document.getElementById('print-root-package02-answer');
        if (element) {
          const result = await generateAndUploadPDF(
            element as HTMLElement,
            userData?.uid || '',
            `package02_answer_${Date.now()}`,
            '패키지#02_정답',
            { isAnswerMode: true, orientation: 'landscape' }
          );
          
          // 패키지 내역에 파일 URL 저장 (가장 최근 패키지 내역 찾기)
          if (userData?.uid) {
            const { getQuizHistory } = await import('../../../services/quizHistoryService');
            const history = await getQuizHistory(userData.uid, { limit: 10 });
            const packageHistory = history.find(h => h.workTypeId === 'P02');
            
            if (packageHistory) {
              await updateQuizHistoryFile(packageHistory.id, result.url, result.fileName, 'answer');
              console.log('📁 패키지#02 정답 PDF 저장 완료:', result.fileName);
            }
          }
        }
      } catch (error) {
        console.error('❌ PDF 저장 실패:', error);
      }

      // 브라우저 인쇄
      window.print();

      // 인쇄 후 정리
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(printContainer);
        if (appRoot) {
          appRoot.style.display = 'block';
        }

        // 동적으로 추가한 스타일 제거
        const styleElement = document.getElementById('print-style-package02-answer');
        if (styleElement && styleElement.parentNode) {
          styleElement.parentNode.removeChild(styleElement);
        }

        console.log('✅ 인쇄(정답) 완료');
      }, 100);
    }, 500);
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
                fontSize: '11pt',
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
                fontSize: '11pt',
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
                fontSize: '11pt',
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

          // Work_01 (문단 순서 맞추기) 표시
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

                <div 
                  style={{
                  background: '#FFF3CD',
                  padding: '1.2rem',
                  borderRadius: '8px',
                  border: '1.5px solid #ffeaa7',
                  marginBottom: '1.5rem',
                  fontSize: '1.08rem',
                  lineHeight: '1.7'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderTextWithHighlight(
                      quizItem.work02Data.modifiedText || '', 
                      quizItem.work02Data.replacements || []
                    )
                  }}
                />

                {/* 교체된 단어 테이블은 인쇄(정답) 페이지에서만 표시 */}

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
                      fontSize: '11pt',
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
                  fontSize: '11pt',
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
                      fontSize: '11pt',
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
                        {['①', '②', '③', '④', '⑤', '⑥'][optionIndex]}
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
                      fontSize: '9pt',
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
                    fontSize: '11pt',
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
                    fontSize: '11pt',
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
