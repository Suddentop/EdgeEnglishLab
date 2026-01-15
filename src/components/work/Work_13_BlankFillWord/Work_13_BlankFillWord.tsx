import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './Work_13_BlankFillWord.css';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import { splitSentences, countWordsInSentence, filterValidSentences } from '../../../services/work14Service';
import { 
  BlankFillItem, 
  Work_13_BlankFillWordData, 
  imageToTextWithOpenAIVision, 
  translateToKorean, 
  generateBlankFillQuizWithAI 
} from '../../../services/work13Service';
import { extractTextFromImage } from '../../../services/common';
import PrintFormatWork13New from './PrintFormatWork13New';
import { formatBlankedText } from '../Package_02_TwoStepQuiz/printNormalization';
// import '../../../styles/PrintFormat.css'; // 독립적인 CSS로 변경
import { processWithConcurrency } from '../../../utils/concurrency';

// 인터페이스는 work13AIService.ts에서 import

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

// 퀴즈 인터페이스 확장 (ID 추가)
interface BlankFillQuizWithId extends BlankFillItem {
  id?: string; // 다중 입력 처리를 위한 ID
}

// A4 페이지 높이 계산 상수 (더 관대하게 조정)
const A4_CONFIG = {
  PAGE_HEIGHT: 29.7, // cm
  HEADER_HEIGHT: 0.5, // cm (헤더 높이 - 더 작게 조정)
  CONTENT_MARGIN: 1.0, // cm (상하 여백 - 더 작게 조정)
  INSTRUCTION_HEIGHT: 0.8, // cm (문제 설명 컨테이너 - 더 작게 조정)
  INSTRUCTION_MARGIN: 0.3, // cm (문제 설명 하단 마진)
  TRANSLATION_HEADER_HEIGHT: 0.8, // cm (본문 해석 헤더 - 더 작게 조정)
  TRANSLATION_HEADER_MARGIN: 0.3, // cm (본문 해석 헤더 하단 마진)
};

// 텍스트 높이 계산 함수 (더 보수적으로 수정)
function calculateTextHeight(text: string, fontSize: number = 16, lineHeight: number = 1.7, maxWidth: number = 20): number {
  if (!text || text.length === 0) return 0;
  
  const charWidth = 0.25; // cm (더 작게 조정하여 더 많은 글자가 한 줄에 들어가도록)
  const charsPerLine = Math.floor(maxWidth / charWidth);
  const lines = Math.ceil(text.length / charsPerLine);
  const lineHeightCm = (fontSize * lineHeight) / 37.8; // px를 cm로 변환
  
  return lines * lineHeightCm;
}

// 컨테이너 높이 계산 함수 (더 보수적으로 수정)
function calculateContainerHeight(text: string, padding: number = 1, fontSize: number = 16): number {
  if (!text || text.length === 0) return 0.3; // 빈 텍스트의 경우 최소 높이 더 작게
  
  const textHeight = calculateTextHeight(text, fontSize, 1.7);
  const paddingCm = (padding * 16) / 37.8 / 2; // 패딩을 더 작게 계산
  return textHeight + paddingCm;
}

// 동적 페이지 분할 여부 계산 함수
function shouldSplitPage(quiz: BlankFillItem): boolean {
  if (!quiz) return false;
  
  // A4페이지의 헤더를 제외한 배치 가능한 공간 계산
  const availableHeight = A4_CONFIG.PAGE_HEIGHT - A4_CONFIG.HEADER_HEIGHT - A4_CONFIG.CONTENT_MARGIN;
  
  // 문제 설명 컨테이너 높이
  const instructionHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN;
  
  // 본문 컨테이너 높이 (16px 기준)
  const passageHeight = calculateContainerHeight(quiz.blankedText, 1, 16);
  
  // 본문 해석 제목 컨테이너 높이
  const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT + A4_CONFIG.TRANSLATION_HEADER_MARGIN;
  
  // 한글 번역 컨테이너 높이 (16px 기준, 나중에 14px로 조정 가능)
  const translationHeight = calculateContainerHeight(quiz.translation || '', 1, 16);
  
  // 모든 컨테이너의 총 높이 계산
  const totalHeight = instructionHeight + passageHeight + translationHeaderHeight + translationHeight;
  
  // 여유 공간 설정 (보수적인 안전 마진)
  const safetyMargin = 3.0; // cm (실제 여유 공간에 맞게 조정)
  const shouldSplit = totalHeight > (availableHeight - safetyMargin);
  
  console.log('📏 유형#13 동적 페이지 분할 계산:', {
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


const Work_13_BlankFillWord: React.FC = () => {
  const { userData, loading } = useAuth();
  
  // 상태 관리: 여러 아이템 지원
  const [items, setItems] = useState<InputItem[]>([
    { id: '1', inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '', imageFile: null }
  ]);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  
  const [quizzes, setQuizzes] = useState<BlankFillQuizWithId[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: string}>({});
  const [isAnswerChecked, setIsAnswerChecked] = useState<{[key: string]: boolean}>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
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
        
        // 유형#13의 포인트 설정 (유형#03과 동일하게 설정)
        const workType13Points = points.find(wt => wt.id === '13')?.points || 0;
        setPointsToDeduct(workType13Points);
        
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
      
      const base64 = await fileToBase64(image as File);
      const ocrText = await extractTextFromImage(base64);
      
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

  // imageToTextWithOpenAIVision - 파일 업로드 시 사용
  async function imageToTextWithOpenAIVision(imageFile: File): Promise<string> {
    const base64 = await fileToBase64(imageFile);
    return await extractTextFromImage(base64);
  }

  // 주관식 답안 입력 핸들러 (다중 퀴즈 지원)
  const handleAnswerChange = (quizId: string, answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [quizId]: answer }));
    setIsAnswerChecked(prev => ({ ...prev, [quizId]: false }));
  };

  // 답안 확인 핸들러 (다중 퀴즈 지원)
  const handleCheckAnswer = (quizId: string) => {
    const quiz = quizzes.find(q => q.id === quizId);
    const userAnswer = selectedAnswers[quizId];
    
    if (!quiz || !userAnswer?.trim()) return;
    
    const isCorrect = quiz.correctAnswers?.some(answer => 
      userAnswer.trim().toLowerCase() === answer.toLowerCase()
    ) || false;
    
    setIsAnswerChecked(prev => ({ ...prev, [quizId]: true }));
    
    // quiz 상태 업데이트
    setQuizzes(prev => prev.map(q => 
      q.id === quizId 
        ? { ...q, userAnswer: userAnswer.trim(), isCorrect: isCorrect }
        : q
    ));
  };

  // 문제 생성 (포인트 차감 포함)
  const handleGenerateQuiz = async () => {
    if (loading) {
      alert('로그인 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    
    if (!userData || !userData.uid) {
      alert('로그인이 필요합니다. 다시 로그인해주세요.');
      return;
    }

    const validItems = items.filter(item => item.text.trim().length >= 10);
    
    if (validItems.length === 0) {
      alert('문제 생성을 위해 최소 하나의 본문을 입력해주세요.');
      return;
    }

    const workType = workTypePoints.find(wt => wt.id === '13'); // 유형#13
    if (!workType) {
      alert('포인트 설정을 불러올 수 없습니다.');
      return;
    }

    const requiredPoints = workType.points * validItems.length;
    if (userCurrentPoints < requiredPoints) {
      alert(`포인트가 부족합니다. 현재 ${userCurrentPoints.toLocaleString()}P, 필요 ${requiredPoints.toLocaleString()}P (${workType.points.toLocaleString()}P × ${validItems.length}개)`);
      return;
    }

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
    setSelectedAnswers({});
    setIsAnswerChecked({});
    let deductedPoints = 0;
    
    try {
      // 포인트 차감
      const workType = workTypePoints.find(wt => wt.id === '13');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const requiredPoints = workType.points * validItems.length;
      const deductionResult = await deductUserPoints(
        userData.uid,
        '13',
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

      const generatedQuizzes = await processWithConcurrency(validItems, 3, async (item) => {
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
          return null;
        }

        try {
          const quizData = await generateBlankFillQuizWithAI(passage);
          const quizDataWithId: BlankFillQuizWithId = { 
            ...quizData, 
            id: item.id
          };
          return quizDataWithId;
        } catch (itemError: any) {
          console.error(`아이템 ${item.id} 처리 중 오류:`, itemError);
          alert(`본문 "${passage.substring(0, 50)}..." 처리 중 오류가 발생했습니다: ${itemError.message}`);
          return null;
        }
      });

      if (generatedQuizzes.length === 0) {
        throw new Error('생성된 문제가 없습니다.');
      }

      setQuizzes(generatedQuizzes);

      // 문제 생성 내역 저장 (배열로)
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          // requiredPoints 사용 (여러 문제 생성 시 총 포인트: workType.points * validItems.length)
          // deductedPoints는 포인트 서비스에서 반환되는 값이지만, requiredPoints가 더 정확함
          console.log('💾 Work_13 내역 저장 시작:', {
            userId: userData.uid,
            workTypeId: '13',
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
            workTypeId: '13',
            workTypeName: getWorkTypeName('13'),
            points: requiredPoints, // 실제 차감된 포인트 (workType.points * validItems.length)
            inputText: validItems.map(item => item.text.trim()).join('\n\n---\n\n'),
            quizData: generatedQuizzes,
            status: 'success'
          });
          console.log('✅ Work_13 내역 저장 완료 (차감 포인트:', requiredPoints, ')');
        } catch (historyError) {
          console.error('❌ Work_13 내역 저장 실패:', historyError);
        }
      }
      
    } catch (err: any) {
      console.error('빈칸 채우기 문제 생성 오류:', err);
      
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '빈칸 채우기 문제 생성',
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

  const handlePrintNoAnswer = () => {
    triggerPrint('no-answer');
  };
  
  const handlePrintWithAnswer = () => {
    triggerPrint('with-answer');
  };

  const triggerPrint = (mode: PrintMode) => {
    if (quizzes.length === 0) return;
    
    console.log('🖨️ 인쇄 시작:', mode);
    
    const styleId = 'print-style-work13-landscape';
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
    printContainer.id = mode === 'with-answer' ? 'print-root-work13-new-answer' : 'print-root-work13-new';
    document.body.appendChild(printContainer);

    const appRoot = document.getElementById('root');
    if (!appRoot) return;

    // PrintFormatWork13New 컴포넌트를 동적으로 렌더링
    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatWork13New quizzes={quizzes} isAnswerMode={mode === 'with-answer'} />);
    
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        const printStyle = document.getElementById(styleId);
        if (printStyle) printStyle.remove();
        if (printContainer.parentNode) {
          printContainer.parentNode.removeChild(printContainer);
        }
        setPrintMode('none');
      }, 1000);
    }, 100);
  };

  // 리셋
  const resetQuiz = () => {
    setQuizzes([]);
    setSelectedAnswers({});
    setIsAnswerChecked({});
    setItems([{ id: Date.now().toString(), inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '', imageFile: null }]);
    setIsPasteFocused(false);
    setIsLoading(false);
    setIsExtractingText(false);
    setPrintMode('none');
    setShowPointModal(false);
    setPointsToDeduct(0);
    // 화면을 최상단으로 스크롤
    window.scrollTo(0, 0);
  };  // 문제 풀이/출력 화면
  if (quizzes.length > 0) {
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#13. 빈칸 채우기 문제 (단어-주관식)</h2>
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
          
          <div className="quiz-content no-print">
            <div style={{ padding: '1rem', background: '#f0f7ff', borderRadius: '8px', marginBottom: '2rem', borderLeft: '4px solid #1976d2' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1976d2' }}>총 {quizzes.length}개의 문제가 생성되었습니다.</h3>
            </div>

            {quizzes.map((quiz, idx) => {
              const quizId = quiz.id || `quiz-${idx}`;
              
              return (
                <div key={quizId} className="quiz-item-card" style={{ 
                  marginBottom: '2rem', 
                  padding: '1.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0'
                }}>
                  <div className="quiz-item-header work13-header" style={{ 
                    marginBottom: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '0.5rem'
                  }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                      문제 {idx + 1} : 빈칸(단어) 채우기
                    </h3>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      유형#13
                    </span>
                  </div>

                  <div className="problem-instruction work13-instruction" style={{
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
                  
                  <div className="problem-passage work13-passage" style={{
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
                      quiz.blankedText || '',
                      quiz.correctAnswers || []
                    ) }} />
                  </div>

                  {/* 정답 표시 */}
                  <div className="problem-answer no-print" style={{marginTop:'1.2rem', color:'#1976d2', fontWeight:700}}>
                    <span style={{color: '#1976d2'}}>정답 : {quiz.correctAnswers?.join(', ') || '정답 없음'}</span>
                  </div>

                  {quiz.translation && (
                    <div className="translation-section" style={{ marginTop: '2rem' }}>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석:</h3>
                      <div className="translation-content work13-translation" style={{
                        background: '#F5F5F5',
                        backgroundColor: '#F5F5F5',
                        padding: '1rem',
                        borderRadius: '0',
                        fontSize: '1rem',
                        lineHeight: 1.7,
                        color: '#333',
                        border: '1px solid transparent'
                      }}>
                        {quiz.translation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 인쇄 영역 - PrintFormatWork13New에서 동적으로 처리하므로 여기서는 제거 */}
      </div>
    );
  }

  return (
    <div className="quiz-generator">
      <div className="generator-header">
        <h2>메뉴#14. 분문 단어 빈칸 채우기 (단어-주관식)</h2>
        <p>영어 본문에서 문장별로 의미있는 단어를 빈칸으로 바꾸고, 주관식으로 답을 채우는 문제를 생성합니다.</p>
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
                      <div className="loading-text">텍스트 추출 중...</div>
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
          : '📋 빈칸 채우기 문제 생성'}
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
        workTypeName={`빈칸 채우기 문제 생성 (${items.filter(i => i.text.length >= 10).length}문제)`}
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

export default Work_13_BlankFillWord;