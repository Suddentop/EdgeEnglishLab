import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import './Package_03_ParagraphOrder.css';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { savePackageQuizHistory } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import { generateWork01ExamQuiz } from '../../../services/work01Service';
import { Quiz } from '../../../types/types';
import { generateWork02Quiz, Work02QuizData } from '../../../services/work02Service';
import PrintFormatPackage03 from './PrintFormatPackage03';
import { generateWork07Quiz } from '../../../services/work07Service';
import { generateWork08Quiz } from '../../../services/work08Service';
import { generateBlankFillQuizWithAI, BlankFillItem as Work13BlankFillItem } from '../../../services/work13Service';
import { generateBlankQuizWithAI, BlankQuizData, imageToTextWithOpenAIVision } from '../../../services/work14Service';
import { translateToKorean } from '../../../services/common';
import { FileFormat, generateAndUploadFile } from '../../../services/pdfService';
import { formatBlankedText } from '../Package_02_TwoStepQuiz/printNormalization';
import '../shared/PrintControls.css';
import FileFormatSelector from '../shared/FileFormatSelector';

const PACKAGE03_ITEMS_PER_PAGE = 2;

const getPackage03ExpectedPageCount = (itemCount: number) =>
  Math.max(1, Math.ceil(itemCount / PACKAGE03_ITEMS_PER_PAGE));

const isPackage03PrintDomReady = (container: HTMLElement, expectedPages: number) => {
  const pages = container.querySelectorAll('.a4-landscape-page-template');
  if (pages.length < expectedPages) return false;
  return Array.from(pages).every((page) => (page as HTMLElement).offsetHeight > 100);
};

// 인터페이스 정의
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
  workTypeId?: string;
  work01Data?: Quiz;
  work02Data?: Work02QuizData;
  work07Data?: MainIdeaQuiz;
  work08Data?: TitleQuiz;
  work13Data?: Work13BlankFillItem;
  work14Data?: BlankQuizData;
  translatedText?: string;
}

const Package_03_ParagraphOrder: React.FC = () => {
  const { userData, loading } = useAuth();
  const navigate = useNavigate();
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

  // 선택된 문제 유형 상태 초기화 (체크박스) - sessionStorage에서 복원
  const getInitialSelectedWorkTypes = (): {[key: string]: boolean} => {
    const saved = sessionStorage.getItem('package03_selectedWorkTypes');
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
      '13': false,
      '14': false
    };
  };

  const [selectedWorkTypes, setSelectedWorkTypes] = useState<{[key: string]: boolean}>(getInitialSelectedWorkTypes);

  // 선택된 문제 유형 상태 초기화 (라디오 버튼) - sessionStorage에서 복원
  const getInitialSelectedRadioType = (): string => {
    const saved = sessionStorage.getItem('package03_selectedRadioType');
    return saved || '07';
  };

  const [selectedRadioType, setSelectedRadioType] = useState<string>(getInitialSelectedRadioType);

  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [fileFormat, setFileFormat] = useState<FileFormat>('pdf');
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);

  // 로딩 진행 상황 상태
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });

  // UI ID와 Firebase ID 매핑
  const UI_TO_FIREBASE_ID_MAP: { [key: string]: string } = {
    '01': '1',
    '02': '2', 
    '07': '7',
    '08': '8',
    '13': '13',
    '14': '14'
  };

  // 교체된 단어에 밑줄 표시하는 함수
  // 본문에서 교체된 단어에 하이라이트 표시 - 패키지#01과 동일한 함수
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
    setInputText('');
    setImageFile(null);
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  // 이미지 파일 선택 핸들러
  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // OCR → textarea에 자동 입력
      setIsExtractingText(true);
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
              
              // textarea 높이 자동 조정 및 포커스
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
            console.error('❌ OCR 처리 오류 상세:', err);
            console.error('❌ 오류 타입:', typeof err);
            console.error('❌ 오류 메시지:', err instanceof Error ? err.message : String(err));
            console.error('❌ 오류 스택:', err instanceof Error ? err.stack : 'No stack trace');
            alert(`OCR 처리 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`);
          } finally {
            setIsExtractingText(false);
          }
        } else {
          console.error('❌ 파일 생성 실패');
        }
        // 이미지를 찾았으므로 기본 동작(텍스트 붙여넣기) 막기
        e.preventDefault();
        return;
      }
    }
    
    // 이미지를 찾지 못했을 때는 기본 동작 허용 (텍스트 붙여넣기 가능)
  };

  // 체크박스 토글 핸들러
  const handleWorkTypeToggle = (typeId: string) => {
    setSelectedWorkTypes(prev => {
      const newState = {
        ...prev,
        [typeId]: !prev[typeId]
      };
      // sessionStorage에 저장
      sessionStorage.setItem('package03_selectedWorkTypes', JSON.stringify(newState));
      return newState;
    });
  };

  // 라디오 버튼 변경 핸들러 (07과 08 중 하나만 선택)
  const handleRadioTypeChange = (typeId: string) => {
    setSelectedRadioType(typeId);
    // sessionStorage에 저장
    sessionStorage.setItem('package03_selectedRadioType', typeId);
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
    const selectedTypes = Object.keys(selectedWorkTypes).filter(typeId => selectedWorkTypes[typeId]);
    const radioType = selectedRadioType;
    let totalPoints = 0;
    
    // 체크박스로 선택된 유형들
    selectedTypes.forEach(typeId => {
      const firebaseId = UI_TO_FIREBASE_ID_MAP[typeId];
      const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId);
      if (workTypePoint) {
        totalPoints += workTypePoint.points;
      }
    });
    
    // 라디오 버튼으로 선택된 유형
    const firebaseId = UI_TO_FIREBASE_ID_MAP[radioType];
    const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId);
    if (workTypePoint) {
      totalPoints += workTypePoint.points;
    }
    
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
        const selectedTypes = Object.keys(selectedWorkTypes).filter(typeId => selectedWorkTypes[typeId]);
        await refundUserPoints(
          userData.uid,
          deductedPoints,
          `패키지 퀴즈 생성 (${selectedTypes.length + 1}개 유형)`,
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
  const generateSingleWorkTypeQuiz = async (inputText: string, typeId: string, currentIndex: number, totalCount: number): Promise<PackageQuizItem> => {
    const quizItem: PackageQuizItem = {
      workTypeId: typeId
    };

    try {
      console.log(`📝 유형#${typeId} 문제 생성 시작... (${currentIndex + 1}/${totalCount})`);
      
      switch (typeId) {
        case '01': {
          const quiz = await generateWork01ExamQuiz(inputText, false);
          quizItem.work01Data = quiz;
          // 유형#01의 경우, quiz.translation은 A, B, C 단락의 번역만 포함
          // 전체 본문 번역은 originalText를 번역해야 함
          // originalText를 번역한 전체 본문 번역 생성
          if (quiz.originalText) {
            try {
              quizItem.translatedText = await translateToKorean(quiz.originalText);
              console.log('✅ 유형#01 전체 본문 번역 완료');
            } catch (error) {
              console.error('❌ 전체 본문 번역 실패:', error);
              // fallback: quiz.translation 사용 (A, B, C 단락 번역)
              quizItem.translatedText = quiz.translation || '';
            }
          } else {
            // originalText가 없으면 quiz.translation 사용
            quizItem.translatedText = quiz.translation || '';
          }
          console.log(`✅ 유형#${typeId} 문제 생성 완료 (${currentIndex + 1}/${totalCount})`);
          break;
        }
        case '02': {
          const quiz = await generateWork02Quiz(inputText);
          quizItem.work02Data = quiz;
          quizItem.translatedText = quiz.translation;
          console.log(`✅ 유형#${typeId} 문제 생성 완료 (${currentIndex + 1}/${totalCount})`);
          break;
        }
        case '07': {
          const quiz = await generateWork07Quiz(inputText); // 패키지는 동일 본문으로 여러 번 생성하지 않으므로 이전 선택 없음
          quizItem.work07Data = quiz;
          quizItem.translatedText = quiz.translation;
          console.log(`✅ 유형#${typeId} 문제 생성 완료 (${currentIndex + 1}/${totalCount})`);
          break;
        }
        case '08': {
          const quiz = await generateWork08Quiz(inputText); // 패키지는 동일 본문으로 여러 번 생성하지 않으므로 이전 선택 없음
          quizItem.work08Data = quiz;
          quizItem.translatedText = quiz.translation;
          console.log(`✅ 유형#${typeId} 문제 생성 완료 (${currentIndex + 1}/${totalCount})`);
          break;
        }
        case '13': {
          const quiz = await generateBlankFillQuizWithAI(inputText);
          quizItem.work13Data = quiz;
          quizItem.translatedText = quiz.translation;
          console.log(`✅ 유형#${typeId} 문제 생성 완료 (${currentIndex + 1}/${totalCount})`);
          break;
        }
        case '14': {
          const quiz = await generateBlankQuizWithAI(inputText);
          console.log('✅ 패키지#03-유형#14 데이터 생성 완료:', {
            blankedText_길이: quiz.blankedText?.length,
            blankedText_일부: quiz.blankedText?.substring(0, 200),
            hasBlanks: quiz.blankedText?.includes('( A '),
            hasUnderscores: quiz.blankedText?.includes('_'),
            correctAnswers_개수: quiz.correctAnswers?.length,
            translation_길이: quiz.translation?.length
          });
          quizItem.work14Data = quiz;
          quizItem.translatedText = quiz.translation;
          console.log(`✅ 유형#${typeId} 문제 생성 완료 (${currentIndex + 1}/${totalCount})`);
          break;
        }
      }
    } catch (error) {
      console.error(`❌ 유형#${typeId} 문제 생성 실패 (${currentIndex + 1}/${totalCount}):`, error);
    }

    return quizItem;
  };

  // 패키지 퀴즈 생성 함수
  // 실제 문제 생성 실행
  const executeQuizGeneration = async () => {
    if (!userData?.uid) return;

    setIsLoading(true);
    setShowQuizDisplay(false);
    let deductedPoints = 0;
    let successfulTypes: string[] = [];

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

      // 포인트 차감
      let remainingPoints = userCurrentPoints;
      
      for (const typeId of selectedTypes) {
        const firebaseId = UI_TO_FIREBASE_ID_MAP[typeId];
        console.log(`🔍 포인트 차감 대상: 유형#${typeId} -> Firebase ID: ${firebaseId}`);
        
        const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId);
        console.log(`🔍 찾은 포인트 설정:`, workTypePoint);
        
        if (workTypePoint) {
          console.log(`💰 포인트 차감: 유형#${typeId} - ${workTypePoint.points}P`);
          
          const deductionResult = await deductUserPoints(
            userData.uid,
            firebaseId,
            `유형#${typeId}`,
            userData.name || '사용자',
            userData.nickname || '사용자'
          );

          console.log(`💰 포인트 차감 결과:`, deductionResult);

          if (!deductionResult.success) {
            throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
          }

          deductedPoints += deductionResult.deductedPoints;
          remainingPoints = deductionResult.remainingPoints;
        } else {
          console.error(`❌ 유형#${typeId}의 포인트 설정을 찾을 수 없습니다.`);
          throw new Error(`유형#${typeId}의 포인트 설정을 찾을 수 없습니다.`);
        }
      }

      setUserCurrentPoints(remainingPoints);

      // 병렬로 문제 생성
      console.log('📦 패키지 퀴즈 생성 시작 (병렬 처리)...');
      console.log('📝 입력 텍스트:', inputText.substring(0, 100) + '...');
      console.log('📊 선택된 유형 수:', selectedTypes.length);
      
      const startTime = performance.now();
      
      // 진행 상황 초기화
      setLoadingProgress({ current: 0, total: selectedTypes.length });
      
      // 병렬로 모든 유형 생성 (실시간 진행 상황 업데이트)
      const quizPromises = selectedTypes.map(async (typeId, index) => {
        const result = await generateSingleWorkTypeQuiz(inputText, typeId, index, selectedTypes.length);
        
        // 각 유형이 완료될 때마다 진행 상황 업데이트
        setLoadingProgress(prev => ({
          ...prev,
          current: prev.current + 1
        }));
        
        return result;
      });

      const quizResults = await Promise.all(quizPromises);
      
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      console.log(`📦 패키지 퀴즈 생성 완료: ${duration.toFixed(2)}초 소요`);
      console.log('📊 생성된 퀴즈 수:', quizResults.length);
      
      // 성공한 유형들 추적
      successfulTypes = quizResults.map((item, index) => {
        if (item.work01Data) return '01';
        if (item.work02Data) return '02';
        if (item.work07Data) return '07';
        if (item.work08Data) return '08';
        if (item.work13Data) return '13';
        if (item.work14Data) return '14';
        return selectedTypes[index];
      }).filter(typeId => typeId !== null);
      
      // 부분적 실패 확인: 일부 유형만 생성된 경우
      const failedTypes = selectedTypes.filter(typeId => !successfulTypes.includes(typeId));
      
      if (failedTypes.length > 0) {
        console.warn(`⚠️ 일부 유형 생성 실패: ${failedTypes.join(', ')}`);
        
        // 실패한 유형들의 포인트만 환불
        let refundAmount = 0;
        for (const failedType of failedTypes) {
          const firebaseId = UI_TO_FIREBASE_ID_MAP[failedType];
          const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId);
          if (workTypePoint) {
            refundAmount += workTypePoint.points;
          }
        }
        
        if (refundAmount > 0) {
          await handlePointRefund(
            refundAmount, 
            `일부 유형 생성 실패로 인한 포인트 환불 (${failedTypes.join(', ')})`
          );
        }
      }
      
      // 문제 순서 정렬: 01 → 07/08 → 02 → 13 → 14
      const typeOrder = ['01', '07', '08', '02', '13', '14'];
      const sortedQuizResults = quizResults.sort((a, b) => {
        const getTypeId = (item: PackageQuizItem): string => {
          if (item.work01Data) return '01';
          if (item.work02Data) return '02';
          if (item.work07Data) return '07';
          if (item.work08Data) return '08';
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

      // 문제 생성 내역 저장
      if (userData?.uid && sortedQuizResults.length > 0) {
        try {
          // sortedQuizResults를 generatedQuizzes 형태로 변환
          const quizzesWithId = sortedQuizResults.map((quiz, index) => {
            let workTypeId = '01';
            if (quiz.work01Data) workTypeId = '01';
            else if (quiz.work02Data) workTypeId = '02';
            else if (quiz.work07Data) workTypeId = '07';
            else if (quiz.work08Data) workTypeId = '08';
            else if (quiz.work13Data) workTypeId = '13';
            else if (quiz.work14Data) workTypeId = '14';
            
            return { ...quiz, workTypeId };
          });
          
          console.log('📦 패키지#03 내역 저장 시작:', {
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            quizzesCount: quizzesWithId.length,
            inputTextLength: inputText.length,
            workTypePointsCount: workTypePoints.length
          });
          
          await savePackageQuizHistory(
            userData.uid,
            userData.name || '사용자',
            userData.nickname || '사용자',
            quizzesWithId,
            inputText,
            workTypePoints,
            UI_TO_FIREBASE_ID_MAP,
            'P03' // 패키지#03 식별자
          );
          
          console.log('✅ 패키지#03 내역 저장 완료');
        } catch (historyError) {
          console.error('❌ 패키지#03 내역 저장 실패:', historyError);
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

  // 문제 생성 핸들러
  const handleGenerateQuiz = () => {
    if (!inputText.trim()) {
      alert('영어 본문을 입력해주세요.');
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

  // 인쇄 핸들러 - 가로 A4 페이지
  const handlePrintProblem = async () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(문제) 시작');
    
    // 블러 오버레이 표시
    const blurOverlay = showBlurOverlay();

    console.log('🖨️ 인쇄(문제) 시작 - 가로 A4 페이지');
    
    const style = document.createElement('style');
    style.id = 'print-style-package03';
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
          height: auto !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        /* #root와 그 자식들을 인쇄에서 제외 (공간 차지 방지) */
        body > *:not(#print-root-package03) {
          display: none !important;
        }
        .print-container {
          display: block !important;
          position: relative !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: auto !important;
          min-width: 0 !important;
          max-width: 29.7cm !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
          page-break-inside: auto !important;
          break-inside: auto !important;
        }
        /* 단일 페이지: 높이 21cm 고정 + overflow hidden (2페이지 오버플로우 방지) */
        .print-container:has(> .a4-landscape-page-template.last-page:only-child) {
          height: 21cm !important;
          min-height: 21cm !important;
          max-height: 21cm !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
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
    printContainer.style.width = '29.7cm';
    printContainer.style.minWidth = '29.7cm';
    printContainer.style.position = 'absolute';
    printContainer.style.left = '0';
    printContainer.style.top = '0';
    printContainer.style.visibility = 'hidden';
    document.body.appendChild(printContainer);

    const appRoot = document.getElementById('root');
    const expectedPages = getPackage03ExpectedPageCount(packageQuiz.length);

    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatPackage03 packageQuiz={packageQuiz} />);

    let attempts = 0;
    const maxAttempts = 50;
    let uploadPromise: Promise<void> | null = null;

    const doCleanup = async () => {
      try {
        if (uploadPromise) await uploadPromise;
      } catch (e) {
        console.error('❌ 파일 업로드 중 오류 발생:', e);
      }
      root.unmount();
      if (printContainer.parentNode) {
        document.body.removeChild(printContainer);
      }
      const styleElement = document.getElementById('print-style-package03');
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
      if (appRoot) {
        appRoot.style.display = 'block';
      }
      window.onafterprint = null;
      console.log('✅ 인쇄(문제) 완료 - 가로 A4 페이지');
    };

    const uploadTask = async () => {
      const element = document.getElementById('print-root-package03');
      if (!element || !userData?.uid) return;
      const { updateQuizHistoryFile, getQuizHistory } = await import('../../../services/quizHistoryService');
      const result = await generateAndUploadFile(
        element as HTMLElement,
        userData.uid,
        `package03_problem_${Date.now()}`,
        '패키지#03_문제',
        { isAnswerMode: false, orientation: 'landscape', fileFormat }
      );
      const history = await getQuizHistory(userData.uid, { limit: 10 });
      const packageHistory = history.find((h) => h.workTypeId === 'P03');
      if (packageHistory) {
        await updateQuizHistoryFile(packageHistory.id, result.url, result.fileName, 'problem');
        const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
        console.log(`📁 패키지#03 문제 ${formatName} 저장 완료:`, result.fileName);
      }
    };

    const checkRenderAndPrint = () => {
      if (isPackage03PrintDomReady(printContainer, expectedPages)) {
        if (fileFormat === 'pdf') {
          uploadPromise = uploadTask().catch((error) => {
            console.error(`❌ 파일 저장 실패 (${fileFormat}):`, error);
          });
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              removeBlurOverlay();
              window.onafterprint = () => {
                void doCleanup();
              };
              window.print();
            });
          });
        } else {
          removeBlurOverlay();
          uploadTask()
            .catch((error) => console.error(`❌ 파일 저장 실패 (${fileFormat}):`, error))
            .finally(() => {
              void doCleanup();
            });
        }
        return;
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        console.error('인쇄 렌더링 타임아웃 (문제)');
        if (fileFormat === 'pdf') {
          uploadPromise = uploadTask().catch((error) => {
            console.error(`❌ 파일 저장 실패 (${fileFormat}):`, error);
          });
          removeBlurOverlay();
          window.onafterprint = () => {
            void doCleanup();
          };
          window.print();
        } else {
          removeBlurOverlay();
          void doCleanup();
        }
        return;
      }
      setTimeout(checkRenderAndPrint, 50);
    };

    setTimeout(checkRenderAndPrint, 100);
  };

  // 인쇄(정답) 핸들러 - 가로 A4 페이지
  const handlePrintAnswer = async () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(정답) 시작 - 가로 A4 페이지');
    
    // 블러 오버레이 표시
    const blurOverlay = showBlurOverlay();
    
    // 폰트 미리 로드
    const fontPreload = document.createElement('link');
    fontPreload.rel = 'preload';
    fontPreload.href = 'https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Regular.woff2';
    fontPreload.as = 'font';
    fontPreload.type = 'font/woff2';
    fontPreload.crossOrigin = 'anonymous';
    document.head.appendChild(fontPreload);
    
    const style = document.createElement('style');
    style.id = 'print-style-package03-answer';
    style.textContent = `
      @font-face {
        font-family: 'Noto Sans KR';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url('https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Regular.woff2') format('woff2'),
             url('https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Regular.woff') format('woff'),
             url('https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Regular.otf') format('opentype');
      }
      @font-face {
        font-family: 'Noto Sans KR';
        font-style: normal;
        font-weight: 700;
        font-display: swap;
        src: url('https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Bold.woff2') format('woff2'),
             url('https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Bold.woff') format('woff'),
             url('https://fonts.gstatic.com/ea/notosanskr/v2/NotoSansKR-Bold.otf') format('opentype');
      }
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
          height: auto !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Roboto', sans-serif !important;
        }
        /* #root와 그 자식들을 인쇄에서 제외 (공간 차지 방지) */
        body > *:not(#print-root-package03-answer) {
          display: none !important;
        }
        .print-container-answer {
          display: block !important;
          position: relative !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: auto !important;
          min-width: 0 !important;
          max-width: 29.7cm !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
          page-break-inside: auto !important;
          break-inside: auto !important;
        }
        /* 단일 페이지: 높이 21cm 고정 + overflow hidden (2페이지 오버플로우 방지) */
        .print-container-answer:has(> .a4-landscape-page-template.last-page:only-child) {
          height: 21cm !important;
          min-height: 21cm !important;
          max-height: 21cm !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Roboto', sans-serif !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    const printContainer = document.createElement('div');
    printContainer.id = 'print-root-package03-answer';
    // 레이아웃 계산을 위해 명시적으로 너비 설정 (화면 밖으로 보내면 너비가 0이 됨)
    printContainer.style.width = '29.7cm';
    printContainer.style.minWidth = '29.7cm';
    printContainer.style.position = 'absolute';
    printContainer.style.left = '0';
    printContainer.style.top = '0';
    printContainer.style.visibility = 'hidden'; // 화면에 보이지 않지만 레이아웃은 계산됨
    document.body.appendChild(printContainer);

    const appRoot = document.getElementById('root');
    // if (appRoot) {
    //   appRoot.style.display = 'none';
    // }

    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatPackage03 packageQuiz={packageQuiz} isAnswerMode={true} />);

    const expectedPages = getPackage03ExpectedPageCount(packageQuiz.length);

    // 렌더링 완료 후 인쇄 및 파일 생성
    let attempts = 0;
    const maxAttempts = 50;
    let uploadPromise: Promise<void> | null = null;
    
    const checkRenderAndPrint = async () => {
      // 파일 생성 및 Firebase Storage 업로드 (백그라운드 처리)
      const uploadTask = async () => {
        try {
          const element = document.getElementById('print-root-package03-answer');
          if (element && userData?.uid) {
            const { updateQuizHistoryFile } = await import('../../../services/quizHistoryService');
            
            const result = await generateAndUploadFile(
              element as HTMLElement,
              userData.uid,
              `package03_answer_${Date.now()}`,
              '패키지#03_정답',
              { isAnswerMode: true, orientation: 'landscape', fileFormat }
            );
            
            // 패키지 내역에 파일 URL 저장
            const { getQuizHistory } = await import('../../../services/quizHistoryService');
            const history = await getQuizHistory(userData.uid, { limit: 10 });
            const packageHistory = history.find(h => h.workTypeId === 'P03');
            
            if (packageHistory) {
              await updateQuizHistoryFile(packageHistory.id, result.url, result.fileName, 'answer');
               const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
              console.log(`📁 패키지#03 정답 ${formatName} 저장 완료:`, result.fileName);
            }
          }
        } catch (error) {
          console.error(`❌ 파일 저장 실패 (${fileFormat}):`, error);
        }
      };

      if (fileFormat === 'pdf') {
        if (isPackage03PrintDomReady(printContainer, expectedPages)) {
          // PDF: 인쇄 대화상자 닫힐 때 cleanup (afterprint). 그 전까지 DOM 유지해야 미리보기에 내용 표시됨.
          // 업로드 작업은 인쇄 후에 시작 (인쇄 속도에 영향 없도록)
          // requestAnimationFrame으로 즉시 처리 시작
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // 업로드 작업 시작 (인쇄와 병렬 처리)
              uploadPromise = uploadTask();
            });
          });
          
          // 렌더링 완료 후 즉시 인쇄 처리 (requestAnimationFrame 사용)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // 미리보기 창이 열리기 직전 블러 오버레이 제거
              removeBlurOverlay();
              window.print();
            });
          });
          // window.onafterprint에서 cleanup 처리
          const doCleanup = async () => {
            // 업로드 완료 대기 후 cleanup
            try {
              if (uploadPromise) {
                await uploadPromise;
                console.log('✅ 파일 업로드 완료 확인 (정답)');
              }
            } catch (e) {
              console.error('❌ 파일 업로드 중 오류 발생 (정답):', e);
            }
            
            root.unmount();
            document.body.removeChild(printContainer);
            
            const styleElement = document.getElementById('print-style-package03-answer');
            if (styleElement) {
              document.head.removeChild(styleElement);
            }
            
            const fontPreloadElement = document.querySelector('link[href*="NotoSansKR-Regular.woff2"]');
            if (fontPreloadElement) {
              document.head.removeChild(fontPreloadElement);
            }

            if (appRoot) {
              appRoot.style.display = 'block';
            }

            console.log('✅ 인쇄(정답) 완료 - 가로 A4 페이지');
            window.onafterprint = null;
          };

          window.onafterprint = doCleanup;
        } else {
          // 렌더링 미완료 - 재시도 (폴링 메커니즘)
          attempts++;
          if (attempts >= maxAttempts) {
            console.error('인쇄 렌더링 타임아웃 (정답모드)');
            // 타임아웃 시에도 인쇄 시도
            const doCleanup = async () => {
              try {
                if (uploadPromise) {
                  await uploadPromise;
                }
              } catch (e) {
                console.error('❌ 파일 업로드 중 오류 발생 (정답):', e);
              }
              
              root.unmount();
              document.body.removeChild(printContainer);
              
              const styleElement = document.getElementById('print-style-package03-answer');
              if (styleElement) {
                document.head.removeChild(styleElement);
              }
              
              const fontPreloadElement = document.querySelector('link[href*="NotoSansKR-Regular.woff2"]');
              if (fontPreloadElement) {
                document.head.removeChild(fontPreloadElement);
              }

              if (appRoot) {
                appRoot.style.display = 'block';
              }

              console.log('✅ 인쇄(정답) 완료 - 가로 A4 페이지');
              window.onafterprint = null;
            };
            
            window.onafterprint = doCleanup;
            removeBlurOverlay();
            window.print();
          } else {
            setTimeout(checkRenderAndPrint, 50); // 50ms 후 재시도 (더 빠른 반응)
          }
        }
      } else {
        // DOC/HWP: 인쇄 대화상자 없음 → 곧바로 cleanup
        // DOC/HWP는 파일 생성이 완료되면 블러 오버레이 제거
        removeBlurOverlay();
        setTimeout(async () => {
          await uploadTask();
          root.unmount();
          document.body.removeChild(printContainer);
          
          const styleElement = document.getElementById('print-style-package03-answer');
          if (styleElement) {
            document.head.removeChild(styleElement);
          }
          
          const fontPreloadElement = document.querySelector('link[href*="NotoSansKR-Regular.woff2"]');
          if (fontPreloadElement) {
            document.head.removeChild(fontPreloadElement);
          }

          if (appRoot) {
            appRoot.style.display = 'block';
          }

          console.log('✅ 인쇄(정답) 완료 - 가로 A4 페이지');
        }, 100);
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
  if (showQuizDisplay) {
    return (
      <React.Fragment>
        <div className="quiz-display no-print">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            marginTop: '0.1rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid #d1d5db'
          }}>
            <h2 style={{
              fontFamily: "'Noto Sans KR', 'Segoe UI', 'Apple SD Gothic Neo', Arial, sans-serif",
              fontSize: '2rem',
              fontWeight: '800',
              color: '#000000',
              margin: '0',
              letterSpacing: '-1px'
            }}>📦 패키지 퀴즈 #03 (본문 집중 문제)</h2>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
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
                     boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)'
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
                     boxShadow: '0 4px 6px rgba(240, 147, 251, 0.25)'
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
                     boxShadow: '0 4px 6px rgba(14, 165, 233, 0.25)'
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
                     boxShadow: '0 4px 6px rgba(16, 185, 129, 0.25)'
                   }}
                 >
                   💾 저장 (정답)
                 </button>
               </>
             )}
            </div>
          </div>

          {/* 생성된 퀴즈들 표시 */}
          <div className="quiz-items-container" style={{ marginTop: '2rem' }}>
            {packageQuiz.map((quizItem, index) => (
              <React.Fragment key={`quiz-item-${index}`}>
                {/* Work_01 */}
                {quizItem.work01Data && (
                  <div key={`work-01-${index}`} className="quiz-item-card" style={{ 
                    marginBottom: '2rem', 
                    padding: '1.5rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '0'
                  }}>
                    <div className="quiz-item-header package03-work01-header" style={{ 
                      marginBottom: '1rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #e0e0e0',
                      paddingBottom: '0.5rem'
                    }}>
                      <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                        문제 {index + 1} : 문장 순서 맞추기
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
                    <div className="problem-instruction package03-work01-instruction" style={{
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
                      {quizItem.work01Data?.format === 'exam' && quizItem.work01Data?.instruction 
                        ? quizItem.work01Data.instruction 
                        : '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.'}
                    </div>

                    {/* 문제 본문 컨테이너 */}
                    <div className="problem-body-container package03-work01-body-container" style={{
                      padding: '0',
                      margin: '0',
                      marginLeft: '0'
                    }}>
                      {/* 모의고사 형식: 고정된 첫 번째 단락을 박스 안에 표시 */}
                      {quizItem.work01Data?.format === 'exam' && quizItem.work01Data?.fixedParagraph && (
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
                          <div className="fixed-paragraph-content" style={{ 
                            fontSize: '1rem', 
                            lineHeight: '1.6', 
                            fontFamily: 'inherit', 
                            color: '#333'
                          }}>
                            {quizItem.work01Data.fixedParagraph}
                          </div>
                        </div>
                      )}

                      {/* 섞인 단락들 */}
                      <div className="problem-passage package03-work01-passage" style={{
                        fontSize: '1rem',
                        lineHeight: 1.7,
                        margin: '0 0 0 0',
                        background: '#ffffff',
                        backgroundColor: '#ffffff',
                        paddingTop: '0.5rem',
                        paddingBottom: '0.5rem',
                        paddingLeft: '0',
                        paddingRight: '0.5rem',
                        fontFamily: 'inherit',
                        color: '#333',
                        marginLeft: '0'
                      }}>
                        {quizItem.work01Data?.shuffledParagraphs?.map((paragraph, pIndex) => (
                          <div key={paragraph.id} className="shuffled-paragraph" style={{ 
                            marginBottom: pIndex < (quizItem.work01Data?.shuffledParagraphs?.length || 0) - 1 ? '-0.4rem' : '0',
                            padding: '0',
                            paddingLeft: '0',
                            paddingRight: '0',
                            fontSize: '1rem',
                            color: '#333',
                            lineHeight: '1.3',
                            fontFamily: 'inherit',
                            background: 'transparent',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '0'
                          }}>
                            <strong>({paragraph.label}) </strong>{paragraph.content}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 선택지 - 모의고사 형식 */}
                    <div className="problem-options package03-work01-options" style={{
                      margin: '0 0 0.75rem 0',
                      marginTop: '0',
                      paddingTop: '0',
                      paddingBottom: '0',
                      paddingLeft: '0',
                      paddingRight: '0',
                      backgroundColor: '#ffffff',
                      background: '#ffffff',
                      border: '1px solid #ffffff'
                    }}>
                      {quizItem.work01Data.choices?.map((choice: string[], cIndex: number) => (
                        <div key={cIndex} className="option" style={{
                          display: 'block',
                          fontSize: '1.1rem',
                          margin: '0.25rem 0',
                          padding: '0.25rem 1rem',
                          fontFamily: 'inherit',
                          backgroundColor: '#ffffff',
                          background: '#ffffff',
                          borderRadius: '0',
                          color: '#333',
                          cursor: 'default',
                          textDecoration: 'none',
                          border: '1px solid #ffffff'
                        }}>
                          {['①', '②', '③', '④'][cIndex]} {choice.join(' - ')}
                          {quizItem.work01Data?.answerIndex === cIndex && (
                            <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work_02 */}
                {quizItem.work02Data && (
                  <div key={`work-02-${index}`} className="quiz-item-card" style={{ 
                    marginBottom: '2rem', 
                    padding: '1.5rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '0'
                  }}>
                    <div className="quiz-item-header package03-work02-header" style={{ 
                      marginBottom: '1rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #e0e0e0',
                      paddingBottom: '0.5rem'
                    }}>
                      <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                        문제 {index + 1} : 독해
                      </h3>
                      <span style={{ 
                        fontSize: '0.9rem', 
                        color: '#666',
                        fontWeight: '500'
                      }}>
                        유형#02
                      </span>
                    </div>

                    {/* 문제 제목 */}
                    <div className="problem-instruction package03-work02-instruction" style={{
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
                      다음 본문을 읽고 해석하시오.
                    </div>

                    {/* 변경된 본문 (문제) */}
                    <div className="problem-passage package03-work02-passage" style={{
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
                    <div style={{ paddingLeft: '1rem', paddingRight: '1rem' }}>
                      <h4 className="no-print">교체된 단어들:</h4>
                      {quizItem.work02Data?.replacements && quizItem.work02Data.replacements.length > 0 ? (
                        <table className="replacements-table work02-replacements-table no-print" style={{
                          borderCollapse: 'collapse',
                          width: '100%',
                          border: '1px solid #666',
                          backgroundColor: '#ffffff'
                        }}>
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
                    </div>

                    {/* 번역 */}
                    {quizItem.translatedText && (
                      <div className="translation-section" style={{ marginTop: '2rem' }}>
                        <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 :</h3>
                        <div className="translation-content package03-work02-translation" style={{
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
                )}

                {/* Work_07 */}
                {quizItem.work07Data && (
                  <div key={`work-07-${index}`} className="quiz-item-card" style={{ 
                    marginBottom: '2rem', 
                    padding: '1.5rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '0'
                  }}>
                    <div className="quiz-item-header package03-work07-header" style={{ 
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
                    <div className="problem-instruction package03-work07-instruction" style={{
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
                      다음 본문의 주제를 가장 잘 나타내는 문장을 고르시오.
                    </div>

                    {/* 본문 */}
                    <div className="problem-passage package03-work07-passage" style={{
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      margin: '0 0 0.3rem 0',
                      background: '#ffffff',
                      backgroundColor: '#ffffff',
                      border: '1px solid transparent',
                      padding: '1rem',
                      fontFamily: 'inherit',
                      color: '#333'
                    }}>
                      {quizItem.work07Data.passage}
                    </div>

                    {/* 선택지 */}
                    <div className="problem-options package03-work07-options" style={{
                      margin: '0 0 0.3rem 0',
                      paddingTop: '0',
                      paddingBottom: '0',
                      paddingLeft: '0',
                      paddingRight: '0',
                      backgroundColor: '#ffffff',
                      background: '#ffffff',
                      border: '1px solid transparent'
                    }}>
                      {quizItem.work07Data.options.map((option, optionIndex) => {
                        // option이 한글인지 영어인지 판단 (한글 문자가 포함되어 있으면 한글로 간주)
                        const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(option);
                        // optionTranslations가 영어인지 판단 (한글이 아니면 영어로 간주)
                        const translation = quizItem.work07Data?.optionTranslations?.[optionIndex];
                        const isTranslationEnglish = translation && !/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(translation);
                        
                        // option이 한글이고 translation이 영어인 경우, 서로 바꿔서 표시
                        const englishSentence = (isKorean && isTranslationEnglish) ? translation : option;
                        const koreanTranslation = (isKorean && isTranslationEnglish) ? option : translation;
                        
                        return (
                          <div key={optionIndex} className="option" style={{
                            display: 'block',
                            fontSize: '1.1rem',
                            margin: '0',
                            marginBottom: '0',
                            padding: '0.5rem 1rem',
                            fontFamily: 'inherit',
                            backgroundColor: '#ffffff',
                            background: '#ffffff',
                            border: '1px solid transparent',
                            borderRadius: '0',
                            color: '#333'
                          }}>
                            <div>
                              <div style={{fontWeight: '500'}}>
                                {`①②③④⑤`[optionIndex] || `${optionIndex+1}.`} {englishSentence}
                                {quizItem.work07Data?.answerIndex === optionIndex && (
                                  <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                                )}
                              </div>
                              {koreanTranslation && (
                                <div style={{fontSize:'0.85rem', color:'#666', marginTop:'0.3rem', paddingLeft:'1.0rem'}}>
                                  {koreanTranslation}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 번역 */}
                    {quizItem.translatedText && (
                      <div className="translation-section" style={{ marginTop: '0.4rem' }}>
                        <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 :</h3>
                        <div className="translation-content package03-work07-translation" style={{
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
                )}

                {/* Work_08 */}
                {quizItem.work08Data && (
                  <div key={`work-08-${index}`} className="quiz-item-card" style={{ 
                    marginBottom: '2rem', 
                    padding: '1.5rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '0'
                  }}>
                    <div className="quiz-item-header package03-work08-header" style={{ 
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

                    {/* 문제 지시사항 */}
                    <div className="problem-instruction package03-work08-instruction" style={{
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
                      다음 본문에 가장 적합한 제목을 고르시오.
                    </div>

                    {/* 본문 */}
                    <div className="problem-passage package03-work08-passage" style={{
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      margin: '0 0 0.3rem 0',
                      background: '#ffffff',
                      backgroundColor: '#ffffff',
                      border: '1px solid transparent',
                      padding: '1rem',
                      fontFamily: 'inherit',
                      color: '#333'
                    }}>
                      {quizItem.work08Data.passage}
                    </div>

                    {/* 선택지 */}
                    <div className="problem-options package03-work08-options" style={{
                      margin: '0 0 0.3rem 0',
                      paddingTop: '0',
                      paddingBottom: '0',
                      paddingLeft: '0',
                      paddingRight: '0',
                      backgroundColor: '#ffffff',
                      background: '#ffffff',
                      border: '1px solid transparent'
                    }}>
                      {quizItem.work08Data.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="option" style={{
                          display: 'block',
                          fontSize: '1.1rem',
                          margin: '0',
                          marginBottom: '0',
                          padding: '0.25rem 1rem',
                          fontFamily: 'inherit',
                          backgroundColor: '#ffffff',
                          background: '#ffffff',
                          border: '1px solid transparent',
                          borderRadius: '0',
                          color: '#333'
                        }}>
                          {`①②③④⑤`[optionIndex] || `${optionIndex+1}.`} {option}
                          {quizItem.work08Data?.answerIndex === optionIndex && (
                            <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답)</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 번역 */}
                    {quizItem.translatedText && (
                      <div className="translation-section" style={{ marginTop: '0.4rem' }}>
                        <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 :</h3>
                        <div className="translation-content package03-work08-translation" style={{
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
                )}

                {/* Work_13 */}
                {quizItem.work13Data && (
                  <div key={`work-13-${index}`} className="quiz-item-card" style={{ 
                    marginBottom: '2rem', 
                    padding: '1.5rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '0'
                  }}>
                    <div className="quiz-item-header package03-work13-header" style={{ 
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
                    <div className="problem-instruction package03-work13-instruction" style={{
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
                    <div className="problem-passage package03-work13-passage" style={{
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      margin: '0 0 0.3rem 0',
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
                    <div className="no-print package03-work13-answer" style={{
                      marginTop: '0.24rem',
                      color: '#000000',
                      fontWeight: 700,
                      paddingLeft: '1rem',
                      backgroundColor: '#f5f5f5',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px'
                    }}>
                      <span style={{color: '#000000'}}>
                        정답 : {quizItem.work13Data.correctAnswers?.join(', ') || '정답 없음'}
                      </span>
                    </div>

                    {/* 한국어 번역 */}
                    {quizItem.work13Data.translation && (
                      <div className="translation-section" style={{ marginTop: '2rem' }}>
                        <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 :</h3>
                        <div className="translation-content package03-work13-translation" style={{
                          background: '#F5F5F5',
                          backgroundColor: '#F5F5F5',
                          padding: '1rem',
                          borderRadius: '0',
                          fontSize: '1rem',
                          lineHeight: 1.7,
                          color: '#333',
                          border: '1px solid transparent'
                        }}>
                          {quizItem.work13Data.translation}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Work_14 */}
                {quizItem.work14Data && (
                  <div key={`work-14-${index}`} className="quiz-item-card" style={{ 
                    marginBottom: '2rem', 
                    padding: '1.5rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '0'
                  }}>
                    <div className="quiz-item-header package03-work14-header" style={{ 
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
                    <div className="problem-instruction package03-work14-instruction" style={{
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
                    <div className="problem-passage package03-work14-passage" style={{
                      fontSize: '1rem',
                      lineHeight: 1.7,
                      margin: '0 0 0.3rem 0',
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
                    {quizItem.work14Data.selectedSentences && (
                      <div className="no-print package03-work14-answer" style={{
                        marginTop: '0.24rem',
                        color: '#000000',
                        fontWeight: 700
                      }}>
                        <div style={{color: '#000000', marginBottom: '0.5rem'}}>
                          정답 문장들 :
                        </div>
                        {quizItem.work14Data.selectedSentences.map((sentence, idx) => {
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
                            <div key={idx} className="package03-work14-answer-item" style={{
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
                    {quizItem.work14Data.translation && (
                      <div className="translation-section" style={{ marginTop: '2rem' }}>
                        <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석 :</h3>
                        <div className="translation-content package03-work14-translation" style={{
                          background: '#F5F5F5',
                          backgroundColor: '#F5F5F5',
                          padding: '1rem',
                          borderRadius: '0',
                          fontSize: '1rem',
                          lineHeight: 1.7,
                          color: '#333',
                          border: '1px solid transparent'
                        }}>
                          {quizItem.work14Data.translation}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h2>📦 패키지 퀴즈 #03 (본문 집중 문제)</h2>
            <p>하나의 영어 본문으로 여러 유형의 문제를 한번에 생성합니다.</p>
          </div>
        </div>
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
              </div>
          {/* 캡처 모드에서도 텍스트가 추출되면 글자수 표시 */}
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

      {/* 포인트 차감 확인 모달 */}
      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={handlePointDeductionConfirm}
        workTypeName={`패키지 퀴즈 생성 (${Object.values(selectedWorkTypes).filter(selected => selected).length + 1}개 유형)`}
        pointsToDeduct={pointsToDeduct}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - pointsToDeduct}
      />

      {/* 모래시계 로딩 모달 */}
      {(isLoading || isExtractingText) && (
        <div className="centered-hourglass-overlay">
          <div className="centered-hourglass-content">
            <div className="centered-hourglass-spinner">⏳</div>
            <div className="loading-text">
              {isExtractingText ? '📄 텍스트 추출 중...' : '📋 패키지 문제 생성 중...'}
            </div>
            {isLoading && loadingProgress.total > 0 && (
              <div className="loading-progress">
                ({loadingProgress.current}/{loadingProgress.total})
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Package_03_ParagraphOrder;