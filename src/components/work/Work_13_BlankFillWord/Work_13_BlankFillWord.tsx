import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
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
// import '../../../styles/PrintFormat.css'; // 독립적인 CSS로 변경

// 인터페이스는 work13AIService.ts에서 import

// 입력 방식 타입
const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];

type PrintMode = 'none' | 'no-answer' | 'with-answer';

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
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<BlankFillItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  // 동적 페이지 분할 계산
  const shouldSplit = quiz ? shouldSplitPage(quiz) : false;
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
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
    if (quiz) {
      window.scrollTo(0, 0);
      
      // 페이지 분할은 동적 계산 함수 shouldSplitPage()에서 처리
    }
  }, [quiz]);

  // 입력 방식 변경
  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setQuiz(null);
    setUserAnswer('');
    setIsAnswerChecked(false);
  };

  // 이미지 파일 업로드
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      // OCR → textarea에 자동 입력
      setIsExtractingText(true);
      try {
        const ocrText = await imageToTextWithOpenAIVision(file);
        setInputText(ocrText);
        setTimeout(() => {
          if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
          }
        }, 0);
      } catch (err) {
        alert('OCR 처리 중 오류가 발생했습니다.');
      } finally {
        setIsExtractingText(false);
      }
    }
  };

  // 붙여넣기(클립보드) 이미지 처리
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (inputMode !== 'capture') return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setImageFile(file);
          setImagePreview(URL.createObjectURL(file));
          setIsExtractingText(true);
      try {
        const ocrText = await imageToTextWithOpenAIVision(file);
            setInputText(ocrText);
            setTimeout(() => {
              if (textAreaRef.current) {
                textAreaRef.current.style.height = 'auto';
                textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
              }
            }, 0);
          } catch (err) {
            alert('OCR 처리 중 오류가 발생했습니다.');
          } finally {
        setIsExtractingText(false);
      }
        }
        e.preventDefault();
        return;
      }
    }
    e.preventDefault();
  };

  // 본문 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  };

  // 주관식 답안 입력 핸들러
  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserAnswer(e.target.value);
    setIsAnswerChecked(false);
  };

  // 답안 확인 핸들러
  const handleCheckAnswer = () => {
    if (!quiz || !userAnswer.trim()) return;
    
    const isCorrect = quiz.correctAnswers?.some(answer => 
      userAnswer.trim().toLowerCase() === answer.toLowerCase()
    ) || false;
    setIsAnswerChecked(true);
    
    // quiz 상태 업데이트
    setQuiz(prev => prev ? {
      ...prev,
      userAnswer: userAnswer.trim(),
      isCorrect: isCorrect
    } : null);
  };

  // 본문에서 이미 ()로 묶인 단어나 구 추출
  const excludedWords: string[] = [];
  const bracketRegex = /\(([^)]+)\)/g;
  let match;
  while ((match = bracketRegex.exec(inputText)) !== null) {
    excludedWords.push(match[1].trim());
  }


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
    const workType = workTypePoints.find(wt => wt.id === '13'); // 유형#13
    if (!workType) {
      alert('포인트 설정을 불러올 수 없습니다.');
      return;
    }

    const requiredPoints = workType.points;
    if (userCurrentPoints < requiredPoints) {
      alert(`포인트가 부족합니다. 현재 ${userCurrentPoints.toLocaleString()}P, 필요 ${requiredPoints.toLocaleString()}P`);
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

    let passage = '';
    setIsLoading(true);
    setQuiz(null);
    setUserAnswer('');
    setIsAnswerChecked(false);
    let deductedPoints = 0;
    
    try {
      // 포인트 차감
      const workType = workTypePoints.find(wt => wt.id === '13');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const deductionResult = await deductUserPoints(
        userData.uid,
        '13',
        workType.name,
        userData.name || '사용자',
        userData.nickname || '사용자'
      );

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
      }

      deductedPoints = deductionResult.deductedPoints;
      setUserCurrentPoints(deductionResult.remainingPoints);

      // 문제 생성 로직
      if (inputMode === 'text') {
        if (!inputText.trim()) throw new Error('영어 본문을 입력해주세요.');
        passage = inputText.trim();
      } else if (inputMode === 'image' && imageFile) {
        passage = await imageToTextWithOpenAIVision(imageFile);
      } else if (inputMode === 'capture') {
        // 캡처 이미지에서 추출된 텍스트가 수정되었을 수 있으므로 inputText 사용
        if (!inputText.trim()) throw new Error('영어 본문을 입력해주세요.');
        passage = inputText.trim();
      } else {
        throw new Error('이미지를 첨부해주세요.');
      }
      if (!passage.trim()) throw new Error('추출된 텍스트가 없습니다.');
      
      const quizData = await generateBlankFillQuizWithAI(passage);
      console.log('생성된 퀴즈 데이터:', quizData);
      console.log('quizData.translation:', quizData.translation);
      setQuiz(quizData);

      // 문제 생성 내역 저장
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          const workTypePoint = workTypePoints.find(wt => wt.id === '13');
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '13',
            workTypeName: getWorkTypeName('13'),
            points: workTypePoint?.points || 0,
            inputText: passage,
            quizData: quizData,
            status: 'success'
          });
          console.log('✅ Work_13 내역 저장 완료');
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
        setIsExtractingText(false);
      }
  };

  // 인쇄 핸들러 - 브라우저 기본 헤더/푸터 숨기기
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

  // 리셋
  const resetQuiz = () => {
    setQuiz(null);
    setUserAnswer('');
    setIsAnswerChecked(false);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setIsPasteFocused(false);
    setIsLoading(false);
    setIsExtractingText(false);
    setPrintMode('none');
    setShowPointModal(false);
    setPointsToDeduct(0);
    // 화면을 최상단으로 스크롤
    window.scrollTo(0, 0);
  };  // 문제 풀이/출력 화면
  if (quiz) {
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
                transition: 'all 0.3s ease'
              }}>새 문제 만들기</button>
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
          <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.18rem', background:'#222', color:'#fff', padding:'0.7rem 1.2rem', borderRadius:'8px', marginBottom:'0', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>다음 빈칸에 들어갈 단어를 직접 입력하시오.</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#13</span>
            </div>
          <div className="problem-text" style={{fontSize:'1.08rem', lineHeight:1.7, margin:'1.2rem 0', borderRadius:'8px', padding:'1.2rem', fontFamily:'inherit'}}>
              {quiz.blankedText}
            </div>

            {/* 정답 표시 */}
            {isAnswerChecked && (
              <div className="problem-answer no-print" style={{marginTop:'1.2rem', color:'#1976d2', fontWeight:700}}>
                {quiz.isCorrect ? (
                  <span style={{color: '#1976d2'}}>✅ 정답입니다! 정답: {quiz.correctAnswers?.join(', ') || '정답 없음'}</span>
                ) : (
                  <span style={{color: '#e74c3c'}}>❌ 틀렸습니다. 정답: <span className="correct-answer">{quiz.correctAnswers?.join(', ') || '정답 없음'}</span></span>
                )}
              </div>
            )}
        </div>

        {/* 인쇄용: 문제만 */}
        {printMode === 'no-answer' && (
          <div className="only-print">
            {shouldSplit ? (
              // 1페이지 구성: 문제제목 + 본문 (본문 2000자 이상)
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                      <span>다음 빈칸에 들어갈 단어를 직접 입력하시오.</span>
                      <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#13</span>
                    </div>
                    <div className="work13-print-problem-text" style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                      {quiz.blankedText}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // 1페이지 구성: 문제제목 + 본문 (본문 2000자 미만)
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0', display:'block', width:'100%'}}>
                      다음 빈칸에 들어갈 단어를 직접 입력하시오.
                    </div>
                    <div className="work13-print-problem-text" style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                      {quiz.blankedText}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}        {/* 인쇄용: 정답포함 */}
        {printMode === 'with-answer' && quiz && (
          <div className="only-print print-answer-mode">
            {shouldSplit ? (
              // 2페이지 구성: 문제제목 + 본문(정답포함), 본문해석 (본문 2000자 이상)
              <>
                {/* 1페이지: 문제제목 + 본문(정답포함) */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                        <span>다음 빈칸에 들어갈 단어를 직접 입력하시오.</span>
                        <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#13</span>
                      </div>
                        <div className="work13-print-answer-text" style={{marginTop:'0.9rem', marginBottom:'0', fontSize:'1rem !important', padding:'1rem', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                          {(() => {
                            const text = quiz.blankedText;
                            const parts = text.split(/(\(_{15}\))/);
                            let answerIndex = 0;
                            return parts.map((part, index) => {
                              if (part === '(_______________)') {
                                const answer = quiz.correctAnswers?.[answerIndex] || '정답 없음';
                                answerIndex++;
                                return (
                                  <span key={index} style={{color: '#1976d2', fontWeight: 'bold'}}>
                                    ({answer})
                                  </span>
                                );
                              }
                              return part;
                            });
                          })()}
                        </div>
                    </div>
                  </div>
                </div>

                {/* 2페이지: 본문 해석 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                        본문 해석
                      </div>
                      <div className="work13-print-translation korean-translation" style={{fontSize:'0.5rem !important', padding:'1rem', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7', marginTop:'0'}}>
                        {quiz.translation}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // 1페이지 구성: 문제제목 + 본문(정답포함) + 본문해석 (본문 2000자 미만)
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                      <span>다음 빈칸에 들어갈 단어를 직접 입력하시오.</span>
                      <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#13</span>
                    </div>
                      <div className="work13-print-answer-text" style={{marginTop:'0.9rem', marginBottom:'1.5rem', fontSize:'1rem !important', padding:'1rem', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        {(() => {
                          const text = quiz.blankedText;
                          const parts = text.split(/(\(_{15}\))/);
                          let answerIndex = 0;
                          return parts.map((part, index) => {
                            if (part === '(_______________)') {
                              const answer = quiz.correctAnswers?.[answerIndex] || '정답 없음';
                              answerIndex++;
                              return (
                                <span key={index} style={{color: '#1976d2', fontWeight: 'bold'}}>
                                  ({answer})
                                </span>
                              );
                            }
                            return part;
                          });
                        })()}
                      </div>
                    <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginTop:'0', marginBottom:'3rem', display:'block', width:'100%'}}>
                      본문 해석
                    </div>
                    <div className="work13-print-translation" style={{fontSize:'1rem !important', padding:'1rem', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7', marginTop:'1rem'}}>
                      {quiz.translation}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }  // 입력/옵션/버튼 UI
  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>[유형#13] 빈칸 채우기 문제 (단어-주관식) 생성</h2>
        <p>영어 본문에서 문장별로 의미있는 단어를 빈칸으로 바꾸고, 주관식으로 답을 채우는 문제를 생성합니다.</p>
      </div>
      <div className="input-type-section">
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'capture'}
            onChange={() => handleInputModeChange('capture')}
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
            name="inputMode"
            checked={inputMode === 'image'}
            onChange={() => handleInputModeChange('image')}
          />
          <span>🖼️ 이미지 파일 첨부</span>
        </label>
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'text'}
            onChange={() => handleInputModeChange('text')}
          />
          <span>✍️ 영어 본문 직접 붙여넣기</span>
        </label>
      </div>
      {inputMode === 'capture' && (
        <div
          className={`input-guide${isPasteFocused ? ' paste-focused' : ''}`}
          tabIndex={0}
          onClick={() => setIsPasteFocused(true)}
          onFocus={() => setIsPasteFocused(true)}
          onBlur={() => setIsPasteFocused(false)}
        >
          <div className="drop-icon">📋</div>
          <div className="drop-text">여기에 이미지를 붙여넣으세요</div>
          <div className="drop-desc">클릭 또는 Tab 후 <b>Ctrl+V</b>로 캡처 이미지를 붙여넣을 수 있습니다.</div>
          {imagePreview && (
            <div className="preview-row">
              <img src={imagePreview} alt="캡처 미리보기" className="preview-img" />
            </div>
          )}
          {(isLoading || isExtractingText) && (
            <div style={{color:'#6a5acd', fontWeight:600, marginTop:'0.7rem'}}>
              OpenAI Vision 처리 중...
            </div>
          )}
        </div>
      )}
      {inputMode === 'image' && (
        <div className="input-guide">
          <div className="file-upload-row">
            <label htmlFor="blank-fill-image" className="file-upload-btn">
              파일 선택
              <input
                id="blank-fill-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </label>
            <span className="file-upload-status">
              {imageFile ? imageFile.name : '선택된 파일 없음'}
            </span>
            {imagePreview && (
              <img src={imagePreview} alt="업로드 미리보기" className="preview-img" />
            )}
            {(isLoading || isExtractingText) && (
              <div className="loading-text">
                OpenAI Vision 처리 중...
              </div>
            )}
          </div>
        </div>
      )}
      <div className="input-section">
        <div className="input-label-row">
          <label htmlFor="blank-fill-text" className="input-label">
            영어 본문 직접 붙여넣기:
          </label>
          {inputText.length < 100 && (
            <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
          )}
        </div>
        <textarea
          id="blank-fill-text"
          ref={textAreaRef}
          value={inputText}
          onChange={handleInputChange}
          placeholder="영어 본문을 직접 붙여넣어 주세요. 최소 100자 이상 권장합니다."
          className="text-input"
          rows={8}
          style={{overflow: 'hidden', resize: 'none'}}
          disabled={inputMode === 'image' && !inputText}
        />
        <div className="text-info">
          <span>글자 수: {inputText.length}자</span>
        </div>
      </div>
      
      <button
        onClick={handleGenerateQuiz}
        disabled={isLoading || !inputText.trim()}
        className="generate-button"
      >
        빈칸 채우기 문제 생성하기
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
        workTypeName="빈칸 채우기 문제 생성"
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