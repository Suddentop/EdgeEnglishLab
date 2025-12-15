import React, { useState, useRef, ChangeEvent, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import './Work_14_BlankFillSentence.css';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  generateBlankQuizWithAI, 
  imageToTextWithOpenAIVision, 
  countBlanks, 
  createAnswerText,
  type BlankQuizData 
} from '../../../services/work14Service';
import { translateToKorean, extractTextFromImage } from '../../../services/common';
import { formatBlankedText } from '../Package_02_TwoStepQuiz/printNormalization';
import PrintFormatWork14New from './PrintFormatWork14New';
import '../../../styles/PrintFormat.css';

interface VocabularyItem {
  word: string;
  definition: string;
  sentence: string;
  options?: string[];
  type: 'fill-blank' | 'multiple-choice' | 'definition';
}

interface Work_14_FillSentenceData {
  title: string;
  items: VocabularyItem[];
}

// 입력 방식 타입
const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];

type PrintMode = 'none' | 'no-answer' | 'with-answer';

// 입력 아이템 인터페이스 (Work_08과 동일)
type InputType = 'clipboard' | 'file' | 'text';

interface InputItem {
  id: string;
  inputType: InputType;
  text: string;
  pastedImageUrl: string | null;
  isExpanded: boolean;
  isExtracting: boolean;
  error: string;
  imageFile: File | null;
}

// A4 페이지 높이 계산 상수 (유형#13과 동일)
const A4_CONFIG = {
  PAGE_HEIGHT: 29.7, // cm
  HEADER_HEIGHT: 0.5, // cm (헤더 높이 - 더 작게 조정)
  CONTENT_MARGIN: 1.0, // cm (상하 여백 - 더 작게 조정)
  INSTRUCTION_HEIGHT: 0.8, // cm (문제 설명 컨테이너 - 더 작게 조정)
  INSTRUCTION_MARGIN: 0.3, // cm (문제 설명 하단 마진)
  TRANSLATION_HEADER_HEIGHT: 0.8, // cm (본문 해석 헤더 - 더 작게 조정)
  TRANSLATION_HEADER_MARGIN: 0.3, // cm (본문 해석 헤더 하단 마진)
};

// 텍스트 높이 계산 함수 (유형#13과 동일)
function calculateTextHeight(text: string, fontSize: number = 16, lineHeight: number = 1.7, maxWidth: number = 20): number {
  if (!text || text.length === 0) return 0;
  
  const charWidth = 0.25; // cm (더 작게 조정하여 더 많은 글자가 한 줄에 들어가도록)
  const charsPerLine = Math.floor(maxWidth / charWidth);
  const lines = Math.ceil(text.length / charsPerLine);
  const lineHeightCm = (fontSize * lineHeight) / 37.8; // px를 cm로 변환
  
  return lines * lineHeightCm;
}

// 컨테이너 높이 계산 함수 (유형#13과 동일)
function calculateContainerHeight(text: string, padding: number = 1, fontSize: number = 16): number {
  if (!text || text.length === 0) return 0.3; // 빈 텍스트의 경우 최소 높이 더 작게
  
  const textHeight = calculateTextHeight(text, fontSize, 1.7);
  const paddingCm = (padding * 16) / 37.8 / 2; // 패딩을 더 작게 계산
  return textHeight + paddingCm;
}

// 동적 페이지 분할 여부 계산 함수 (유형#13과 동일)
function shouldSplitPage(quiz: BlankQuizData): boolean {
  if (!quiz) return false;
  
  // A4페이지의 헤더를 제외한 배치 가능한 공간 계산
  const availableHeight = A4_CONFIG.PAGE_HEIGHT - A4_CONFIG.HEADER_HEIGHT - A4_CONFIG.CONTENT_MARGIN;
  
  // 문제 설명 컨테이너 높이
  const instructionHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN;
  
  // 본문 컨테이너 높이 (16px 기준)
  const passageHeight = calculateContainerHeight(quiz.blankedText, 1, 16);
  
  // 본문 해석 제목 컨테이너 높이
  const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT + A4_CONFIG.TRANSLATION_HEADER_MARGIN;
  
  // 한글 번역 컨테이너 높이 (0.875rem = 14px 기준)
  const translationHeight = calculateContainerHeight(quiz.translation || '', 1, 14);
  
  // 모든 컨테이너의 총 높이 계산
  const totalHeight = instructionHeight + passageHeight + translationHeaderHeight + translationHeight;
  
  // 여유 공간 설정 (보수적인 안전 마진)
  const safetyMargin = 3.0; // cm (실제 여유 공간에 맞게 조정)
  const shouldSplit = totalHeight > (availableHeight - safetyMargin);
  
  console.log('📏 유형#14 동적 페이지 분할 계산:', {
    availableHeight: availableHeight.toFixed(2) + 'cm',
    instructionHeight: instructionHeight.toFixed(2) + 'cm',
    passageHeight: passageHeight.toFixed(2) + 'cm',
    translationHeaderHeight: translationHeaderHeight.toFixed(2) + 'cm',
    translationHeight: translationHeight.toFixed(2) + 'cm',
    totalHeight: totalHeight.toFixed(2) + 'cm',
    safetyMargin: safetyMargin.toFixed(2) + 'cm',
    effectiveAvailableHeight: (availableHeight - safetyMargin).toFixed(2) + 'cm',
    shouldSplit
  });
  
  return shouldSplit;
}

// BlankQuizData는 work14AIService에서 import

const Work_14_FillSentence: React.FC = () => {
  const { userData, loading } = useAuth();
  
  // 상태 관리: 여러 아이템 지원
  const [items, setItems] = useState<InputItem[]>([
    { id: '1', inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '', imageFile: null }
  ]);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  
  const [quizzes, setQuizzes] = useState<BlankQuizData[]>([]);
  const [selectedQuizzes, setSelectedQuizzes] = useState<{[key: string]: number | null}>({});
  const [userAnswers, setUserAnswers] = useState<{[key: string]: string[]}>({}); // 주관식 답안들 (각 퀴즈별)
  
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // 정답 문장에서 빈칸 패턴 제거하는 헬퍼 함수
  const cleanAnswer = (answer: string): string => {
    if (!answer) return answer;
    let clean = answer;
    // 다양한 빈칸 패턴 제거
    clean = clean.replace(/\(\s*[A-Z]\s*_+\s*\)/g, '').trim();
    clean = clean.replace(/\(_+[A-Z]_+\)/g, '').trim();
    clean = clean.replace(/\(_+\)/g, '').trim();
    clean = clean.replace(/\(\s*[A-Z]?\s*_+\s*[A-Z]?\s*\)/g, '').trim();
    return clean;
  };

  // 정답을 포함한 텍스트 생성 함수 (HTML 스타일 적용)
  const createTextWithAnswers = (blankedText: string, correctAnswers: string[]): string => {
    let result = blankedText;
    
    if (correctAnswers.length === 0) {
      return result;
    }
    
    let answerIndex = 0;
    
    // 패턴 0: ( _ _ _ _ _ ) - formatBlankedText로 변환된 형태 (공백 포함)
    const blankPattern0 = /\([\s_]+\)/g;
    result = result.replace(blankPattern0, (match: string) => {
      if (answerIndex < correctAnswers.length) {
        const answer = cleanAnswer(correctAnswers[answerIndex]);
        answerIndex++;
        return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
      }
      return match;
    });
    
    // 패턴 1: ( 공백 + 알파벳 + 공백 + 언더스코어들 + ) - 공백 있는 경우
    const blankPattern1 = /\( [A-Z] _+\)/g;
    result = result.replace(blankPattern1, (match: string) => {
      if (answerIndex < correctAnswers.length) {
        const answer = cleanAnswer(correctAnswers[answerIndex]);
        answerIndex++;
        return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
      }
      return match;
    });
    
    // 패턴 2: ( 공백 + 알파벳 + 언더스코어들 + ) - 알파벳과 언더스코어 사이 공백 없는 경우
    if (answerIndex < correctAnswers.length) {
      const blankPattern2 = /\( [A-Z]_+\)/g;
      result = result.replace(blankPattern2, (match: string) => {
        if (answerIndex < correctAnswers.length) {
          const answer = cleanAnswer(correctAnswers[answerIndex]);
          answerIndex++;
          return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
        }
        return match;
      });
    }
    
    // 패턴 3: ( 알파벳 + 언더스코어들 + ) - (A_______) 형식 (공백 없음)
    if (answerIndex < correctAnswers.length) {
      const blankPattern3 = /\(([A-Z])([_]+)\)/g;
      result = result.replace(blankPattern3, (match: string) => {
        if (answerIndex < correctAnswers.length) {
          const answer = cleanAnswer(correctAnswers[answerIndex]);
          answerIndex++;
          return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
        }
        return match;
      });
    }
    
    // 패턴 4: ( 언더스코어들 + 알파벳 + 언더스코어들 + ) - (___A___) 또는 (____________________A____________________) 형식
    if (answerIndex < correctAnswers.length) {
      const blankPattern4 = /\(_+[A-Z]_+\)/g;
      result = result.replace(blankPattern4, (match: string) => {
        if (answerIndex < correctAnswers.length) {
          const answer = cleanAnswer(correctAnswers[answerIndex]);
          answerIndex++;
          return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
        }
        return match;
      });
    }
    
    // 패턴 5: ( 언더스코어들 + 알파벳 + 언더스코어들 + ) - (____________________A____________________) 형식 (긴 언더스코어)
    if (answerIndex < correctAnswers.length) {
      const blankPattern5 = /\(_{10,}[A-Z]_{10,}\)/g;
      result = result.replace(blankPattern5, (match: string) => {
        if (answerIndex < correctAnswers.length) {
          const answer = cleanAnswer(correctAnswers[answerIndex]);
          answerIndex++;
          return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
        }
        return match;
      });
    }
    
    // 패턴 6: 모든 언더스코어 포함 빈칸 패턴 (어떤 형식이든 매칭) - 최종 fallback
    if (answerIndex < correctAnswers.length) {
      // 이미 정답으로 치환된 부분을 제외한 모든 언더스코어 포함 괄호 패턴 매칭
      const generalPattern = /\([^)]*_[^)]*\)/g;
      result = result.replace(generalPattern, (match: string) => {
        // 이미 정답으로 치환된 부분은 건너뛰기
        if (match.includes('<span') || match.includes('</span>')) {
          return match;
        }
        // 일반 텍스트만 포함한 경우는 건너뛰기 (예: "(example)")
        if (!match.includes('_')) {
          return match;
        }
        if (answerIndex < correctAnswers.length) {
          const answer = cleanAnswer(correctAnswers[answerIndex]);
          answerIndex++;
          return `(<span style="color: #1976d2; font-weight: bold;">${answer}</span>)`;
        }
        return match;
      });
    }
    
    return result;
  };
  
  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);

  // 포인트 관련 초기화
  useEffect(() => {
    const initializePoints = async () => {
      try {
        const points = await getWorkTypePoints();
        setWorkTypePoints(points);
        
        // 유형#14의 포인트 설정
        const workType14Points = points.find(wt => wt.id === '14')?.points || 0;
        setPointsToDeduct(workType14Points);
        
        // 로딩이 완료되고 userData가 있을 때만 포인트 조회
        if (!loading && userData && userData.uid) {
          const currentPoints = await getUserCurrentPoints(userData.uid);
          setUserCurrentPoints(currentPoints);
        }
      } catch (error) {
        console.error('포인트 초기화 오류:', error);
      }
    };
    
    // 로딩이 완료된 후에만 포인트 초기화
    if (!loading) {
      initializePoints();
    }
  }, [userData?.uid, loading]);

  // 첫 번째 아이템의 inputType과 inputMode 동기화
  useEffect(() => {
    if (items.length > 0) {
      const firstItem = items[0];
      const modeMap: { [key in InputType]: InputMode } = {
        'clipboard': 'capture',
        'file': 'image',
        'text': 'text'
      };
      if (modeMap[firstItem.inputType] !== inputMode) {
        setInputMode(modeMap[firstItem.inputType]);
      }
    }
  }, [items]);

  // 컴포넌트 마운트 시 스크롤 최상단
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 문제 생성 후 스크롤 최상단
  useEffect(() => {
    if (quizzes.length > 0) {
      window.scrollTo(0, 0);
    }
  }, [quizzes]);

  // 아이템 관리 함수들
  const addItem = () => {
    const newItem: InputItem = {
      id: Date.now().toString(),
      inputType: 'text', 
      text: '',
      pastedImageUrl: null,
      isExpanded: true,
      isExtracting: false,
      error: '',
      imageFile: null
    };
    setItems(prev => prev.map(item => ({ ...item, isExpanded: false })).concat(newItem));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      setItems([{ id: Date.now().toString(), inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '', imageFile: null }]);
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<InputItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const toggleExpand = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isExpanded: !item.isExpanded } : item));
  };

  // 파일 → base64 변환
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // 이미지 -> 텍스트 (개별 아이템용)
  const handleImageToText = async (id: string, image: File | Blob) => {
    updateItem(id, { isExtracting: true, error: '' });
    
    try {
      let previewUrl = null;
      if (image instanceof Blob) {
        previewUrl = URL.createObjectURL(image);
        updateItem(id, { pastedImageUrl: previewUrl });
      }
      
      const imageBase64 = await fileToBase64(image as File);
      const ocrText = await extractTextFromImage(imageBase64);
      
      updateItem(id, { 
        text: ocrText,
        isExtracting: false,
        imageFile: image instanceof File ? image : null
      });
    } catch (err: any) {
      updateItem(id, { 
        error: '이미지 텍스트 추출 실패: ' + (err?.message || err),
        isExtracting: false
      });
    }
  };

  // 입력 방식 변경
  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    if (items.length > 0) {
      const firstItem = items[0];
      const inputTypeMap: { [key in InputMode]: InputType } = {
        'capture': 'clipboard',
        'image': 'file',
        'text': 'text'
      };
      updateItem(firstItem.id, { inputType: inputTypeMap[mode] });
    }
  };

  // imageToTextWithOpenAIVision은 work14AIService에서 import

  // 문제 생성 (포인트 차감 포함)
  const handleGenerateQuiz = async () => {
    console.log('로그인 상태 확인:', { userData, uid: userData?.uid, loading });
    
    // 로딩 중이면 대기
    if (loading) {
      alert('로그인 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    
    // 로그인 상태 확인 (더 안전한 방법)
    if (!userData || !userData.uid) {
      console.error('로그인 상태 오류:', { userData, loading });
      alert('로그인이 필요합니다. 다시 로그인해주세요.');
      return;
    }

    // 포인트 차감 확인
    const workType = workTypePoints.find(wt => wt.id === '14'); // 유형#14
    if (!workType) {
      alert('포인트 설정을 불러올 수 없습니다.');
      return;
    }

    const validItems = items.filter(item => item.text.trim().length >= 10);
    
    if (validItems.length === 0) {
      alert('문제 생성을 위해 최소 하나의 본문을 입력해주세요.');
      return;
    }

    const requiredPoints = workType.points * validItems.length;
    if (userCurrentPoints < requiredPoints) {
      alert(`포인트가 부족합니다. 현재 ${userCurrentPoints.toLocaleString()}P, 필요 ${requiredPoints.toLocaleString()}P (${workType.points.toLocaleString()}P × ${validItems.length}개)`);
      return;
    }

    // 포인트 차감 모달 표시
    setPointsToDeduct(requiredPoints);
    setShowPointModal(true);
  };

  // 포인트 차감 확인 후 실제 문제 생성 실행
  const handlePointDeductionConfirm = () => {
    setShowPointModal(false);
    executeQuizGeneration();
  };

  // 실제 문제 생성 실행
  const executeQuizGeneration = async () => {
    if (!userData?.uid) return;

    const validItems = items.filter(item => item.text.trim().length >= 10);
    if (validItems.length === 0) return;

    setIsLoading(true);
    setQuizzes([]);
    setSelectedQuizzes({});
    setUserAnswers({});
    let deductedPoints = 0;
    
    try {
      const workType = workTypePoints.find(wt => wt.id === '14');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const requiredPoints = workType.points * validItems.length;
      const deductionResult = await deductUserPoints(
        userData.uid,
        '14',
        workType.name,
        userData.name || '사용자',
        userData.nickname || '사용자',
        requiredPoints
      );

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
      }

      deductedPoints = deductionResult.deductedPoints;
      setUserCurrentPoints(deductionResult.remainingPoints);

      const generatedQuizzes: BlankQuizData[] = [];
      
      for (const item of validItems) {
        let passage = '';
        
        if (item.inputType === 'text') {
          passage = item.text.trim();
        } else if (item.inputType === 'file' && item.imageFile) {
          passage = await imageToTextWithOpenAIVision(item.imageFile);
        } else if (item.inputType === 'clipboard') {
          passage = item.text.trim();
        }
        
        if (!passage.trim()) {
          console.warn(`아이템 ${item.id}의 텍스트가 비어있습니다.`);
          continue;
        }

        try {
          const quizData = await generateBlankQuizWithAI(passage);
          const quizDataWithId: BlankQuizData & { id: string } = { 
            ...quizData, 
            id: item.id
          };
          generatedQuizzes.push(quizDataWithId);
          
          // 주관식 답안 초기화 (실제 빈칸 개수만큼)
          const blankCount = countBlanks(quizData.blankedText);
          setUserAnswers(prev => ({
            ...prev,
            [item.id]: new Array(blankCount).fill('')
          }));
        } catch (itemError: any) {
          console.error(`아이템 ${item.id} 처리 중 오류:`, itemError);
          alert(`본문 "${passage.substring(0, 50)}..." 처리 중 오류가 발생했습니다: ${itemError.message}`);
        }
      }

      if (generatedQuizzes.length === 0) {
        throw new Error('생성된 문제가 없습니다.');
      }

      setQuizzes(generatedQuizzes);

      // 문제 생성 내역 저장 (배열로)
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          // requiredPoints 사용 (여러 문제 생성 시 총 포인트: workType.points * validItems.length)
          // deductedPoints는 포인트 서비스에서 반환되는 값이지만, requiredPoints가 더 정확함
          console.log('💾 Work_14 내역 저장 시작:', {
            userId: userData.uid,
            workTypeId: '14',
            quizzesCount: generatedQuizzes.length,
            deductedPoints: deductedPoints,
            requiredPoints: requiredPoints,
            validItemsCount: validItems.length,
            workTypePoints: workType.points
          });
          
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '14',
            workTypeName: getWorkTypeName('14'),
            points: requiredPoints, // 실제 차감된 포인트 (workType.points * validItems.length)
            inputText: validItems.map(item => item.text.trim()).join('\n\n---\n\n'),
            quizData: generatedQuizzes,
            status: 'success'
          });
          console.log('✅ Work_14 내역 저장 완료 (차감 포인트:', requiredPoints, ')');
        } catch (historyError: any) {
          console.error('❌ Work_14 내역 저장 실패:', historyError);
          // 저장 실패는 사용자에게 알리지 않음 (문제 생성은 성공했으므로)
          // 하지만 개발자 콘솔에서는 확인 가능하도록 로그 유지
        }
      } else {
        console.warn('⚠️ Work_14 내역 저장 스킵:', {
          hasUserId: !!userData?.uid,
          hasWorkTypePoints: workTypePoints.length > 0,
          userData: userData,
          workTypePointsLength: workTypePoints.length
        });
      }
      
    } catch (err: any) {
      console.error('문장 빈칸 문제 생성 오류:', err);
      
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '문장 빈칸 문제 생성',
            userData.name || '사용자',
            userData.nickname || '사용자',
            '문제 생성 실패로 인한 포인트 환불'
          );
          setUserCurrentPoints(prev => prev + deductedPoints);
        } catch (refundError) {
          console.error('포인트 환불 오류:', refundError);
        }
      }
      
      alert(err.message || '문제 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setIsExtractingText(false);
    }
  };

  // 인쇄 핸들러
  const handlePrintNoAnswer = () => {
    triggerPrint('no-answer');
  };
  
  const handlePrintWithAnswer = () => {
    triggerPrint('with-answer');
  };

  const triggerPrint = (mode: PrintMode) => {
    if (quizzes.length === 0) return;
    
    console.log('🖨️ 인쇄 시작:', mode);
    
    const styleId = 'print-style-work14-landscape';
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @page {
        size: A4 landscape !important;
        margin: 0 !important;
      }
      @media print {
        html, body {
          width: 29.7cm !important;
          height: 21cm !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #root {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    const printContainer = document.createElement('div');
    printContainer.id = mode === 'with-answer' ? 'print-root-work14-new-answer' : 'print-root-work14-new';
    document.body.appendChild(printContainer);

    const appRoot = document.getElementById('root');
    if (!appRoot) return;

    // PrintFormatWork14New 컴포넌트를 동적으로 렌더링
    const root = ReactDOM.createRoot(printContainer);
    
    // quizzes를 PrintFormatWork14New에 맞는 형식으로 변환
    const formattedQuizzes = quizzes.map((quiz, index) => ({
      id: (quiz as any).id || `quiz-${index}`,
      blankedText: quiz.blankedText || '',
      correctAnswers: quiz.correctAnswers || [],
      translation: quiz.translation || '',
      selectedSentences: quiz.selectedSentences || []
    }));
    
    root.render(<PrintFormatWork14New quizzes={formattedQuizzes} isAnswerMode={mode === 'with-answer'} />);
    
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        const printStyle = document.getElementById(styleId);
        if (printStyle) printStyle.remove();
        if (printContainer.parentNode) {
          printContainer.parentNode.removeChild(printContainer);
        }
        root.unmount();
      }, 1000);
    }, 100);
  };
  // 주관식 답안 입력 핸들러
  const handleAnswerChange = (quizId: string, index: number, value: string) => {
    setUserAnswers(prev => {
      const quizAnswers = prev[quizId] || [];
      const newAnswers = [...quizAnswers];
      newAnswers[index] = value;
      return { ...prev, [quizId]: newAnswers };
    });
  };

  // 리셋
  const resetQuiz = () => {
    setQuizzes([]);
    setSelectedQuizzes({});
    setUserAnswers({});
    setItems([{ id: Date.now().toString(), inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '', imageFile: null }]);
    setIsLoading(false);
    setIsExtractingText(false);
  };

  // 문제 풀이/출력 화면
  if (quizzes.length > 0) {
    
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#14. 문장 빈칸 채우기 문제</h2>
            <div className="quiz-header-buttons no-print">
              <button onClick={resetQuiz} className="reset-button" style={{
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
                background: 'linear-gradient(135deg, #bef264 0%, #a3e635 100%)',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(190, 242, 100, 0.25)',
                transition: 'all 0.3s ease'
              }}>새문제</button>
              <button onClick={handlePrintNoAnswer} className="print-button styled-print" style={{
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
                transition: 'all 0.3s ease'
              }}>
                <span className="print-icon" aria-hidden>🖨️</span>
                <span>인쇄 (문제)</span>
              </button>
              <button onClick={handlePrintWithAnswer} className="print-button styled-print" style={{
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
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                boxShadow: '0 4px 6px rgba(240, 147, 251, 0.25)'
              }}>
                <span className="print-icon" aria-hidden>🖨️</span>
                <span>인쇄 (<span style={{color: '#FFD600'}}>정답</span>)</span>
              </button>
            </div>
          </div>
          
          {quizzes.map((quiz, idx) => {
            const quizId = (quiz as any).id || `quiz-${idx}`;
            const displayBlankedText = formatBlankedText(quiz.blankedText || '', quiz.correctAnswers || []);
            const blankCount = countBlanks(quiz.blankedText);
            const quizAnswers = userAnswers[quizId] || [];
            
            return (
              <div key={quizId} style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: '#1976d2' }}>문제 {idx + 1}</h3>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#eee', fontSize: '0.8rem', color: '#666' }}>유형#14</span>
                </div>
                
                <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.18rem', background:'#222', color:'#fff', padding:'0.7rem 1.2rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span>다음 빈칸에 들어갈 문장을 직접 입력하시오.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#14</span>
                </div>
                <div  style={{fontSize:'1.08rem', lineHeight:1.7, margin:'1.2rem 0', background:'#FFF3CD', borderRadius:'8px', padding:'1.2rem', fontFamily:'inherit', whiteSpace:'pre-wrap', wordWrap:'break-word', overflowWrap:'break-word', overflow:'hidden'}}>
                  <div dangerouslySetInnerHTML={{ __html: displayBlankedText }} />
                </div>
                <div className="problem-answers" style={{margin:'1.2rem 0'}}>
                  {Array.from({ length: blankCount }, (_, i) => (
                    <div key={i} style={{margin:'1rem 0', padding:'1rem', background:'#f8f9fa', borderRadius:'8px', border:'1px solid #e9ecef'}}>
                      <div style={{fontSize:'1rem', fontWeight:'600', marginBottom:'0.5rem', color:'#495057'}}>
                        빈칸 {String.fromCharCode(65 + i)}번 답안 (문장):
                      </div>
                      <textarea
                        value={quizAnswers[i] || ''}
                        onChange={(e) => handleAnswerChange(quizId, i, e.target.value)}
                        placeholder="여기에 문장을 입력하세요..."
                        style={{
                          width: '100%',
                          minHeight: '120px',
                          padding: '0.75rem',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          fontSize: '1rem',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  ))}
                </div>
                
                {/* 정답 문장들 표시 */}
                {quiz.selectedSentences && quiz.selectedSentences.length > 0 && (
                  <div style={{
                    marginTop: '1.2rem',
                    color: '#1976d2',
                    fontWeight: 700
                  }}>
                    <div style={{color: '#1976d2', marginBottom: '0.5rem'}}>
                      정답 문장들:
                    </div>
                    {quiz.selectedSentences.map((sentence: string, sentenceIdx: number) => {
                      const alphabetLabel = String.fromCharCode(65 + sentenceIdx);
                      let cleanSentence = sentence || '';
                      cleanSentence = cleanSentence.replace(/\(\s*[A-Z]\s*_+\s*\)/g, '').trim();
                      cleanSentence = cleanSentence.replace(/\(_+[A-Z]_+\)/g, '').trim();
                      cleanSentence = cleanSentence.replace(/\(_+\)/g, '').trim();
                      cleanSentence = cleanSentence.replace(/\(\s*[A-Z]?\s*_+\s*[A-Z]?\s*\)/g, '').trim();
                      
                      return (
                        <div key={sentenceIdx} style={{
                          marginBottom: '0.3rem',
                          padding: '0.5rem',
                          backgroundColor: '#E3F2FD',
                          borderRadius: '4px',
                          fontSize: '0.95rem',
                          lineHeight: 1.4
                        }}>
                          {alphabetLabel}. {cleanSentence || sentence}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 본문 해석 */}
                {quiz.translation && (
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
                      {quiz.translation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* 인쇄 영역 - PrintFormatWork14New에서 동적으로 처리하므로 여기서는 제거 */}
      </div>
    );
  }

  // 입력/옵션/버튼 UI
  return (
    <div className="quiz-generator">
      <div className="generator-header">
        <h2>[유형#14] 문장 빈칸 채우기 문제 (주관식) 생성</h2>
        <p>영어 본문에서 2~3개의 문장을 빈칸으로 바꾸고, 빈칸에 원래 문장을 채우는 주관식 문제를 생성합니다.<br />시험대비 효과적인 본문 암기를 위한 문제 생성을 위한 툴입니다.</p>
      </div>
      
      <div className="input-items-list">
        {items.map((item, index) => (
          <div key={item.id} className={`input-item ${item.isExpanded ? 'expanded' : ''}`}>
            <div className="input-item-header" onClick={() => toggleExpand(item.id)}>
              <div className="input-item-title">
                <span>#{index + 1}</span>
                <span className={`input-item-status ${item.text.length > 0 ? 'has-text' : ''}`}>
                  {item.text.length > 0 ? `텍스트 ${item.text.length}자` : '입력 대기'}
                </span>
              </div>
              <div className="input-item-controls">
                <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} title="삭제">🗑️</button>
                <span className="expand-icon">{item.isExpanded ? '🔼' : '🔽'}</span>
              </div>
            </div>

            {item.isExpanded && (
              <div className="input-item-content">
                <div className="input-type-section" style={{ marginBottom: '15px' }}>
                  <label>
                    <input
                      type="radio"
                      checked={item.inputType === 'clipboard'} 
                      onChange={() => updateItem(item.id, { inputType: 'clipboard', error: '' })} 
                    />
                    <span>📸 캡처화면 붙여넣기</span>
                    <button
                      type="button"
                      className="screenshot-help-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowHelpModal(true);
                      }}
                      title="화면 캡처 방법 보기"
                    >
                      ?
                    </button>
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={item.inputType === 'file'} 
                      onChange={() => updateItem(item.id, { inputType: 'file', error: '' })} 
                    />
                    <span>🖼️ 이미지 파일 첨부</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={item.inputType === 'text'} 
                      onChange={() => updateItem(item.id, { inputType: 'text', error: '' })} 
                    />
                    <span>✍️ 직접 붙여넣기</span>
                  </label>
                </div>
                   
                {item.inputType === 'clipboard' && (
                  <div
                    className="input-guide" 
                    tabIndex={0}
                    onPaste={async (e) => {
                      const clipItems = e.clipboardData.items;
                      for (let i = 0; i < clipItems.length; i++) {
                        if (clipItems[i].type.indexOf('image') !== -1) {
                          const file = clipItems[i].getAsFile();
                          if (file) {
                            await handleImageToText(item.id, file);
                            e.preventDefault();
                            return;
                          }
                        }
                      }
                    }} 
                    style={{ minHeight: '120px' }}
                  >
                    <div className="drop-icon">📋</div>
                    <div className="drop-text">여기에 이미지를 붙여넣으세요 (Ctrl+V)</div>
                    {item.pastedImageUrl && (
                      <div className="preview-row">
                        <img src={item.pastedImageUrl} alt="Preview" className="preview-img" />
                      </div>
                    )}
                    {item.isExtracting && (
                      <div className="loading-text">텍스트 추출 중...</div>
                    )}
                  </div>
                )}
                
                {item.inputType === 'file' && (
                  <div className="input-guide" style={{ minHeight: '80px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageToText(item.id, file);
                        }
                        e.target.value = '';
                      }} 
                      disabled={item.isExtracting} 
                    />
                    {item.isExtracting && (
                      <span className="loading-text">추출 중...</span>
                    )}
                  </div>
                )}

                <textarea
                  value={item.text}
                  onChange={(e) => updateItem(item.id, { text: e.target.value })}
                  placeholder="영어 본문이 여기에 표시됩니다. 직접 입력하거나 수정할 수 있습니다."
                  className="text-input"
                  rows={6}
                  style={{ marginTop: '10px', width: '100%' }}
                />
                {item.error && (
                  <div className="error-message">❌ {item.error}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <button onClick={addItem} className="add-item-button">➕ 본문 추가하기</button>
      
      <button
        onClick={handleGenerateQuiz}
        disabled={isLoading || items.filter(i => i.text.length >= 10).length === 0}
        className="generate-button"
        style={{ marginTop: '20px' }}
      >
        {items.filter(i => i.text.length >= 10).length > 1 
          ? `📋 ${items.filter(i => i.text.length >= 10).length}개 문제 일괄 생성` 
          : '📋 문장 빈칸 문제 생성'}
      </button>

      {/* 화면 중앙 모래시계 로딩 스피너 */}
      {(isLoading || isExtractingText) && (
        <div className="centered-hourglass-overlay">
          <div className="centered-hourglass-content">
            <span className="centered-hourglass-spinner">⏳</span>
            <div className="loading-text">
              {isExtractingText ? '📄 텍스트 추출 중...' : '📋 문제 생성 중...'}
            </div>
          </div>
        </div>
      )}
      
      {/* 포인트 차감 확인 모달 */}
      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={handlePointDeductionConfirm}
        workTypeName={items.filter(i => i.text.length >= 10).length > 1 
          ? `문장 빈칸 문제 ${items.filter(i => i.text.length >= 10).length}개 생성`
          : '문장 빈칸 문제 생성'}
        pointsToDeduct={pointsToDeduct}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - pointsToDeduct}
      />
      
      {/* 화면 캡처 도움말 모달 */}
      <ScreenshotHelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)} 
      />
    </div>
  );
};

export default Work_14_FillSentence; 