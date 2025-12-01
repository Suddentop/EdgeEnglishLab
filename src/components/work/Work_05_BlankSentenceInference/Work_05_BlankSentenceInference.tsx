import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import './Work_05_BlankSentenceInference.css';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../../../styles/PrintFormat.css';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import { generateWork05Quiz, type BlankQuiz } from '../../../services/work05Service';
import { extractTextFromImage } from '../../../services/common';

// A4 페이지 설정 상수 (실제 A4 크기 기준, px 단위)
const A4_CONFIG = {
  // 실제 A4 크기: 210mm × 297mm = 794px × 1123px (96 DPI)
  PAGE_WIDTH: 794,          // px (210mm * 3.78px/mm)
  PAGE_HEIGHT: 1123,        // px (297mm * 3.78px/mm)
  
  // 인쇄 여백 (실제 인쇄 시 표준 여백)
  TOP_MARGIN: 25,           // px (6.6mm)
  BOTTOM_MARGIN: 25,        // px (6.6mm)
  LEFT_MARGIN: 20,          // px (5.3mm)
  RIGHT_MARGIN: 20,         // px (5.3mm)
  
  // 헤더/푸터 영역
  HEADER_HEIGHT: 30,        // px (8mm)
  FOOTER_HEIGHT: 20,        // px (5.3mm)
  
  // 콘텐츠 영역 계산
  CONTENT_WIDTH: 754,       // px (794 - 20 - 20)
  CONTENT_HEIGHT: 1048,     // px (1123 - 25 - 25 - 30 - 20)
  
  // 섹션별 높이 설정
  INSTRUCTION_HEIGHT: 30,   // px
  INSTRUCTION_MARGIN: 11,   // px
  TRANSLATION_HEADER_HEIGHT: 30,  // px
  TRANSLATION_HEADER_MARGIN: 11,  // px
  OPTIONS_HEADER_HEIGHT: 30,      // px
  OPTIONS_HEADER_MARGIN: 11,      // px
};

// 텍스트 높이 계산 함수 (실제 A4 크기 기준, px 단위)
function calculateContainerHeight(text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number {
  // 실제 A4 콘텐츠 너비 사용 (754px - 좌우 패딩 40px = 714px)
  const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40; // px
  const charWidthPx = fontSize * 0.55; // px 단위 문자 폭
  const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
  const lines = Math.ceil(text.length / charsPerLine);
  return (lines * fontSize * lineHeight) + padding; // px 단위로 반환
}

const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];
type PrintMode = 'none' | 'no-answer' | 'with-answer';

// BlankQuiz 타입은 work05Service에서 import

const Work_05_BlankSentenceInference: React.FC = () => {
  const { userData, loading } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<BlankQuiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const [needsSecondPage, setNeedsSecondPage] = useState(false);
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
        console.log('포인트 설정 로드 결과:', points);
        
        if (Array.isArray(points) && points.length > 0) {
          setWorkTypePoints(points);
          
          // 유형#05의 포인트 설정
          const workType5Points = points.find(wt => wt.id === '5')?.points || 20; // 기본값 20
          setPointsToDeduct(workType5Points);
          console.log('유형#05 포인트 설정:', workType5Points);
        } else {
          console.warn('포인트 설정이 비어있거나 배열이 아닙니다. 기본값을 사용합니다.');
          // 기본 포인트 설정
          const defaultPoints = [
            { id: '1', name: '유형#01', points: 10, description: '문장 순서 테스트' },
            { id: '2', name: '유형#02', points: 15, description: '독해 문제 생성' },
            { id: '3', name: '유형#03', points: 12, description: '어휘 단어 문제' },
            { id: '4', name: '유형#04', points: 18, description: '빈칸(구) 추론 문제' },
            { id: '5', name: '유형#05', points: 20, description: '빈칸(문장) 추론 문제' },
            { id: '6', name: '유형#06', points: 16, description: '문장 위치 추론 문제' },
            { id: '7', name: '유형#07', points: 22, description: '주요 아이디어 추론 문제' },
            { id: '8', name: '유형#08', points: 25, description: '제목 추론 문제' },
            { id: '9', name: '유형#09', points: 14, description: '문법 오류 문제' },
            { id: '10', name: '유형#10', points: 30, description: '복합 문법 오류 문제' },
            { id: '11', name: '유형#11', points: 18, description: '기사 순서 문제' },
            { id: '12', name: '유형#12', points: 20, description: '영어단어 문제' },
            { id: '13', name: '유형#13', points: 12, description: '빈칸 채우기 문제(단어-주관식)' },
            { id: '14', name: '유형#14', points: 15, description: '빈칸 채우기 문제(문장-주관식)' }
          ];
          setWorkTypePoints(defaultPoints);
          setPointsToDeduct(20); // 유형#05 기본값
        }
        
        // 로딩이 완료되고 userData가 있을 때만 포인트 조회
        if (!loading && userData && userData.uid) {
          const currentPoints = await getUserCurrentPoints(userData.uid);
          setUserCurrentPoints(currentPoints);
        }
      } catch (error) {
        console.error('포인트 초기화 오류:', error);
        // 에러 발생 시 기본값 설정
        const defaultPoints = [
          { id: '5', name: '유형#05', points: 20, description: '빈칸(문장) 추론 문제' }
        ];
        setWorkTypePoints(defaultPoints);
        setPointsToDeduct(20);
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
    }
  }, [quiz]);

  // 페이지 분할 관련 상태
  const [pageLayoutInfo, setPageLayoutInfo] = useState({
    needsSecondPage: false,
    needsThirdPage: false,
    page1Content: '',
    page2Content: '',
    page3Content: ''
  });

  // 페이지 분할 계산 함수 (실제 A4 크기 기준)
  const calculatePageLayout = () => {
    if (!quiz || !quiz.translation) return;

    // 실제 A4 콘텐츠 영역 높이 사용
    const availableHeight = A4_CONFIG.CONTENT_HEIGHT; // 1048px
    
    // A. 문제 제목 컨테이너 + 영어 본문 컨테이너 높이
    const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN;
    const englishPassageHeight = calculateContainerHeight(quiz.blankedText, 38, 16, 1.7);
    const sectionAHeight = problemTitleHeight + englishPassageHeight;
    
    // B. 4지선다 선택항목 컨테이너 높이 (해석 포함)
    const optionsHeaderHeight = A4_CONFIG.OPTIONS_HEADER_HEIGHT + A4_CONFIG.OPTIONS_HEADER_MARGIN;
    let optionsHeight = 0;
    quiz.options.forEach((option, i) => {
      optionsHeight += calculateContainerHeight(`${option} (정답)`, 11, 16, 1.3);
      // 선택지 해석 높이 추가
      if (quiz.optionTranslations && quiz.optionTranslations[i]) {
        optionsHeight += calculateContainerHeight(quiz.optionTranslations[i], 11, 16, 1.3);
      }
    });
    // 테두리와 패딩 추가 (2px 테두리 + 16px 패딩 상하)
    const containerBorderPadding = 4 + 32; // 2px 테두리 * 2 + 16px 패딩 * 2
    const sectionBHeight = optionsHeaderHeight + optionsHeight + containerBorderPadding;
    
    // C. 본문해석 제목 컨테이너 + 한글 해석 컨테이너 높이
    const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT + A4_CONFIG.TRANSLATION_HEADER_MARGIN;
    const translationHeight = calculateContainerHeight(quiz.translation, 19, 16, 1.7); // 패딩 38px → 19px (50% 감소)
    const sectionCHeight = translationHeaderHeight + translationHeight;
    
    // 여유 공간 설정 (실제 A4 기준 적절한 안전 마진)
    const safetyMargin = 50; // px (실제 A4 기준 적절한 여백)
    const effectiveAvailableHeight = availableHeight - safetyMargin; // 1048 - 50 = 998px
    
    console.log('📏 유형#05 동적 페이지 분할 계산:', {
      availableHeight: availableHeight.toFixed(2) + 'px',
      sectionAHeight: sectionAHeight.toFixed(2) + 'px',
      sectionBHeight: sectionBHeight.toFixed(2) + 'px',
      sectionCHeight: sectionCHeight.toFixed(2) + 'px',
      totalHeight: (sectionAHeight + sectionBHeight + sectionCHeight).toFixed(2) + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
      quizTextLength: quiz.blankedText.length,
      translationTextLength: quiz.translation.length
    });
    
    // 실제 A4 크기 기준 검증
    console.log('🔍 실제 A4 크기 기준 계산:', {
      A4_SIZE: '210mm × 297mm = 794px × 1123px (96 DPI)',
      CONTENT_AREA: A4_CONFIG.CONTENT_WIDTH + 'px × ' + A4_CONFIG.CONTENT_HEIGHT + 'px',
      TOP_MARGIN: A4_CONFIG.TOP_MARGIN + 'px',
      BOTTOM_MARGIN: A4_CONFIG.BOTTOM_MARGIN + 'px',
      LEFT_MARGIN: A4_CONFIG.LEFT_MARGIN + 'px',
      RIGHT_MARGIN: A4_CONFIG.RIGHT_MARGIN + 'px',
      HEADER_HEIGHT: A4_CONFIG.HEADER_HEIGHT + 'px',
      FOOTER_HEIGHT: A4_CONFIG.FOOTER_HEIGHT + 'px',
      availableHeight: availableHeight + 'px',
      safetyMargin: safetyMargin + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight + 'px'
    });
    
    // 페이지 분할 로직
    const totalHeight = sectionAHeight + sectionBHeight + sectionCHeight;
    
    if (totalHeight <= effectiveAvailableHeight) {
      // A+B+C ≤ 990 → 1페이지에 A,B,C 모두 포함
    setPageLayoutInfo({
        needsSecondPage: false,
        needsThirdPage: false,
        page1Content: 'A+B+C',
        page2Content: '',
        page3Content: ''
      });
    } else if (sectionAHeight + sectionBHeight <= effectiveAvailableHeight) {
      // A+B+C > 990, A+B ≤ 990 → 1페이지 A+B 포함, 2페이지에 C 포함
      if (sectionCHeight <= effectiveAvailableHeight) {
        // C가 한 페이지에 들어갈 수 있음
        setPageLayoutInfo({
          needsSecondPage: true,
          needsThirdPage: false,
          page1Content: 'A+B',
          page2Content: 'C',
          page3Content: ''
        });
      } else {
        // C가 한 페이지에 들어가지 않음 → 2페이지에 C 일부, 3페이지에 C 나머지
        setPageLayoutInfo({
          needsSecondPage: true,
          needsThirdPage: true,
          page1Content: 'A+B',
          page2Content: 'C-part1',
          page3Content: 'C-part2'
        });
      }
    } else if (sectionAHeight <= effectiveAvailableHeight) {
      // A+B+C > 990, A+B > 990, A ≤ 990 → 1페이지에 A포함, 2페이지에 B+C포함
      if (sectionBHeight + sectionCHeight <= effectiveAvailableHeight) {
        // B+C가 한 페이지에 들어갈 수 있음
        setPageLayoutInfo({
          needsSecondPage: true,
          needsThirdPage: false,
          page1Content: 'A',
          page2Content: 'B+C',
          page3Content: ''
        });
      } else {
        // B+C가 한 페이지에 들어가지 않음 → 2페이지에 B, 3페이지에 C
        setPageLayoutInfo({
          needsSecondPage: true,
          needsThirdPage: true,
          page1Content: 'A',
          page2Content: 'B',
          page3Content: 'C'
        });
      }
    } else {
      // A+B+C > 990, A+B > 990, A > 990 → 1페이지에 A포함, B+C > 990 → 2페이지에 B포함 그리고 3페이지에 C포함
      setPageLayoutInfo({
        needsSecondPage: true,
        needsThirdPage: true,
        page1Content: 'A',
        page2Content: 'B',
        page3Content: 'C'
      });
    }
  };

  // 퀴즈와 번역이 생성되면 페이지 분할 계산
  useEffect(() => {
    if (quiz && quiz.translation) {
      calculatePageLayout();
    }
  }, [quiz]);

  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setQuiz(null);
    setSelected(null);
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      // OCR → textarea에 자동 입력
      setIsExtractingText(true);
      try {
        // File 객체를 base64 문자열로 변환
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            const ocrText = await extractTextFromImage(base64);
            setInputText(ocrText);
            setTimeout(() => {
              if (textAreaRef.current) {
                textAreaRef.current.style.height = 'auto';
                textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
              }
            }, 0);
          } catch (e) {
            console.error('OCR Error', e);
            alert('OCR 처리 중 오류가 발생했습니다.');
          } finally {
            setIsExtractingText(false);
          }
        };
      } catch (err) {
        alert('OCR 처리 중 오류가 발생했습니다.');
        setIsExtractingText(false);
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    // 텍스트 모드나 이미지 파일 업로드 모드일 때는 기본 동작 허용 (텍스트 붙여넣기)
    if (inputMode !== 'capture') {
      return;
    }
    
    // 캡처 모드일 때만 이미지 처리
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setImageFile(file);
          setImagePreview(URL.createObjectURL(file));
          setIsExtractingText(true);
      try {
        // File 객체를 base64로 변환
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            const ocrText = await extractTextFromImage(base64);
            setInputText(ocrText);
            setTimeout(() => {
              if (textAreaRef.current) {
                textAreaRef.current.style.height = 'auto';
                textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
              }
            }, 0);
          } catch (e) {
             alert('OCR 처리 중 오류가 발생했습니다.');
          } finally {
             setIsExtractingText(false);
          }
        };
      } catch (err) {
        alert('OCR 처리 중 오류가 발생했습니다.');
        setIsExtractingText(false);
      }
        }
        e.preventDefault();
        return;
      }
    }
    // 이미지를 찾지 못했을 때는 기본 동작 허용 (텍스트 붙여넣기 가능)
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  };

  /*
  // imageToTextWithOpenAIVision 및 translateToKorean 제거됨 (common.ts 사용)
  */

  // generateBlankQuizWithAI 함수는 work05Service.ts의 generateWork05Quiz로 대체됨
  // 이 함수는 더 이상 사용되지 않으며, 모든 로직이 work05Service.ts에 통합됨

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
    const workType = workTypePoints.find(wt => wt.id === '5'); // 유형#05
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
    setSelected(null);
    let deductedPoints = 0;
    
    try {
      // 포인트 차감
      const workType = workTypePoints.find(wt => wt.id === '5');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const deductionResult = await deductUserPoints(
        userData.uid,
        '5',
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
        // 이미지를 base64로 변환 후 전달
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            passage = await extractTextFromImage(base64);
            // 여기서 바로 setQuiz나 executeQuizGeneration 호출해야 하는데...
            // executeQuizGeneration은 async 함수이고 여기서 await 못함.
            // 구조상 문제가 좀 있네요.
            // 사실 executeQuizGeneration 안에서 imageToTextWithOpenAIVision를 호출하고 있었음.
            // 여기서는 passage만 설정하면 되는데, 비동기라...
            // 위에서 passage = await ... 했으므로 여기서는 동기적으로 처리됨?
            // 아, imageToTextWithOpenAIVision는 Promise<string> 반환.
            // extractTextFromImage도 Promise<string> 반환.
            // 그래서 await extractTextFromImage(base64) 하면 됨.
            // 하지만 extractTextFromImage는 base64 string을 받음.
            // imageToTextWithOpenAIVision은 File을 받았음.
            // 그래서 변환 과정이 필요함.
          } catch (e) {
             console.error(e);
          }
        };
        // 이렇게 하면 안됨. await가 안 먹힘.
        
        // Promise로 감싸기
        const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        const base64 = await fileToBase64(imageFile);
        passage = await extractTextFromImage(base64);
        
      } else if (inputMode === 'capture') {
        // 캡처 이미지에서 추출된 텍스트가 수정되었을 수 있으므로 inputText 사용
        if (!inputText.trim()) throw new Error('영어 본문을 입력해주세요.');
        passage = inputText.trim();
      } else {
        throw new Error('이미지를 첨부해주세요.');
      }
      if (!passage.trim()) throw new Error('추출된 텍스트가 없습니다.');
      
      // work05Service의 개선된 함수 사용
      const quizData = await generateWork05Quiz(passage);
      setQuiz(quizData);

      // 문제 생성 내역 저장
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          const workTypePoint = workTypePoints.find(wt => wt.id === '5');
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '05',
            workTypeName: getWorkTypeName('05'),
            points: workTypePoint?.points || 0,
            inputText: passage,
            quizData: quizData,
            status: 'success'
          });
          console.log('✅ Work_05 내역 저장 완료');
        } catch (historyError) {
          console.error('❌ Work_05 내역 저장 실패:', historyError);
        }
      }
      
    } catch (err: any) {
      console.error('빈칸 문제 생성 오류:', err);
      
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '빈칸(문장) 문제 생성',
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
  const resetQuiz = () => {
    setQuiz(null);
    setSelected(null);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setIsPasteFocused(false);
    setIsLoading(false);
    setIsExtractingText(false);
  };


  if (quiz) {
    // 정답 문장 단어 수 × 5만큼 밑줄로 빈칸 생성, 최대 30자로 제한
    const answer = quiz.options[quiz.answerIndex] || '';
    const wordCount = answer.trim().split(/\s+/).length;
    const blankLength = Math.max(answer.length, wordCount * 5);
    const maxBlankLength = 30;
    const blankStr = '(' + '_'.repeat(Math.min(blankLength, maxBlankLength)) + ')';
    // 괄호 안에 어떤 내용이 있든 첫 번째만 밑줄로 치환
    const displayBlankedText = quiz.blankedText.replace(/\([^)]*\)/, blankStr);
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#05. 빈칸(문장) 추론 문제</h2>
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
          <div className="quiz-section">
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.18rem', background:'#222', color:'#fff', padding:'0.7rem 1.2rem', borderRadius:'8px', marginBottom:'1.2rem', display:'inline-block'}}>
              다음 빈칸에 들어갈 문장(sentence)으로 가장 적절한 것을 고르시오.
            </div>
            <div className="problem-passage" style={{fontSize:'1.08rem', lineHeight:1.7, margin:'1.2rem 0', background:'#f7f8fc', borderRadius:'8px', padding:'1.2rem', fontFamily:'inherit'}}>
              {displayBlankedText}
            </div>
            <div className="problem-options" style={{margin:'1.2rem 0'}}>
              {quiz.options.map((opt, i) => (
                <label key={i} style={{display:'block', fontSize:'1.08rem', margin:'0.8rem 0', cursor:'pointer', fontWeight: selected === i ? 700 : 400, color: selected === i ? '#6a5acd' : '#222', fontFamily:'inherit'}}>
                  <input
                    type="radio"
                    name="blank-quiz"
                    checked={selected === i}
                    onChange={() => setSelected(i)}
                    style={{marginRight:'0.7rem'}}
                  />
                  {`①②③④⑤`[i] || `${i+1}.`} {opt}
                  {selected !== null && quiz.answerIndex === i && (
                    <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}>(정답)</span>
                  )}
                </label>
              ))}
            </div>
            {selected !== null && (
              <div className="problem-answer no-print" style={{marginTop:'1.2rem', color:'#1976d2', fontWeight:700}}>
                정답: {`①②③④⑤`[quiz.answerIndex] || quiz.answerIndex+1} {quiz.options[quiz.answerIndex]}
              </div>
            )}
          </div>
        </div>
        {printMode === 'no-answer' && (
          <div className="only-print">
            {/* 인쇄(문제): 항상 1페이지에 모든 내용 표시 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderWork01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                    다음 빈칸에 들어갈 문장(sentence)으로 가장 적절한 것을 고르시오.
                  </div>
                  <div className={inputText.length >= 1700 ? 'work05-long-text' : ''} style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                    {displayBlankedText}
                  </div>
                  <div className="problem-options" style={{margin:'1rem 0'}}>
                    {quiz.options.map((opt, i) => (
                      <div key={i} style={{fontSize:'1rem !important', margin:'0.8rem 0', fontFamily:'inherit', color:'#222'}}>
                        {`①②③④⑤`[i] || `${i+1}.`} {opt}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* 인쇄용: 정답포함 - 동적 페이지 분할 */}
        {printMode === 'with-answer' && quiz && (
          <div className="only-print print-answer-mode">
            {/* 1페이지 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderWork01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  {/* A. 문제 제목 컨테이너 + 영어 본문 컨테이너 */}
                  {(pageLayoutInfo.page1Content.includes('A') || pageLayoutInfo.page1Content === 'A') && (
                    <>
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                        <span>다음 빈칸에 들어갈 문장(sentence)으로 가장 적절한 것을 고르시오.</span>
                        <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#05</span>
                      </div>
                      <div className="work05-print-answer-passage" style={{marginTop:'0.9rem', marginBottom:'1.5rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        {displayBlankedText}
                      </div>
                    </>
                  )}
                  
                  {/* B. 4지선다 선택항목 컨테이너 (해석 포함) */}
                  {(pageLayoutInfo.page1Content.includes('B') || pageLayoutInfo.page1Content === 'B') && (
                    <div className="work05-options-container" style={{border:'2px solid #ddd', borderRadius:'8px', padding:'1rem', marginBottom:'1rem', background:'#f9f9f9'}}>
                      <div className="work05-problem-options" style={{marginTop:'0', marginBottom:'0'}}>
                        {quiz.options.map((opt, i) => (
                          <div key={i} style={{fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'}}>
                            <div className="option-english">
                              {`①②③④⑤`[i] || `${i+1}.`} {opt}
                              {quiz.answerIndex === i && (
                                <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}>(정답)</span>
                              )}
                            </div>
                            {quiz.optionTranslations && quiz.optionTranslations[i] && (
                              <div className="option-translation" style={{fontSize:'0.9rem', color:'#666', marginTop:'0.2rem'}}>
                                {quiz.optionTranslations[i]}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* C. 본문해석 제목 컨테이너 + 한글 해석 컨테이너 */}
                  {(pageLayoutInfo.page1Content.includes('C') || pageLayoutInfo.page1Content === 'C') && (
                    <>
                      <div className="problem-instruction-copy" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', border:'2px solid #333', marginTop:'1.2rem', marginBottom:'1.2rem', display:'flex', justifyContent:'flex-start', alignItems:'center', width:'100%', boxSizing:'border-box', marginLeft:'0', marginRight:'0'}}>
                        <span>본문 해석</span>
                      </div>
                      <div className="work05-print-answer-translation korean-translation" style={{fontSize:'0.5rem !important', lineHeight:'1.7', padding:'0.5rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', marginBottom:'1.2rem'}}>
                        {quiz.translation ? (
                          pageLayoutInfo.page1Content === 'C-part1' ? 
                            quiz.translation.substring(0, Math.floor(quiz.translation.length / 2)) : 
                            quiz.translation
                        ) : '번역이 생성되지 않았습니다.'}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 2페이지 */}
            {pageLayoutInfo.needsSecondPage && (
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    {/* B. 4지선다 선택항목 컨테이너 (해석 포함) */}
                    {(pageLayoutInfo.page2Content.includes('B') || pageLayoutInfo.page2Content === 'B') && (
                      <div className="work05-options-container" style={{border:'2px solid #ddd', borderRadius:'8px', padding:'1rem', marginBottom:'1rem', background:'#f9f9f9'}}>
                        <div className="work05-problem-options" style={{marginTop:'0', marginBottom:'0'}}>
                          {quiz.options.map((opt, i) => (
                            <div key={i} style={{fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'}}>
                              <div className="option-english">
                                {`①②③④⑤`[i] || `${i+1}.`} {opt}
                                {quiz.answerIndex === i && (
                                  <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}>(정답)</span>
                                )}
                              </div>
                              {quiz.optionTranslations && quiz.optionTranslations[i] && (
                                <div className="option-translation" style={{fontSize:'0.9rem', color:'#666', marginTop:'0.2rem'}}>
                                  {quiz.optionTranslations[i]}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* C. 본문해석 제목 컨테이너 + 한글 해석 컨테이너 */}
                    {(pageLayoutInfo.page2Content.includes('C') || pageLayoutInfo.page2Content === 'C') && (
                      <>
                        <div className="problem-instruction-copy" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', border:'2px solid #333', marginTop:'1.2rem', marginBottom:'1.2rem', display:'flex', justifyContent:'flex-start', alignItems:'center', width:'100%', boxSizing:'border-box', marginLeft:'0', marginRight:'0'}}>
                          <span>본문 해석</span>
                        </div>
                        <div className="work05-print-answer-translation" style={{fontSize:'1rem', lineHeight:'1.7', padding:'0.5rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', marginBottom:'1.2rem'}}>
                          {quiz.translation ? (
                            pageLayoutInfo.page2Content === 'C-part1' ? 
                              quiz.translation.substring(0, Math.floor(quiz.translation.length / 2)) : 
                              quiz.translation
                          ) : '번역이 생성되지 않았습니다.'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3페이지 */}
            {pageLayoutInfo.needsThirdPage && (
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    {/* C. 본문해석 제목 컨테이너 + 한글 해석 컨테이너 */}
                    {(pageLayoutInfo.page3Content.includes('C') || pageLayoutInfo.page3Content === 'C') && (
                      <>
                        <div className="problem-instruction-copy" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', border:'2px solid #333', marginTop:'1.2rem', marginBottom:'1.2rem', display:'flex', justifyContent:'flex-start', alignItems:'center', width:'100%', boxSizing:'border-box', marginLeft:'0', marginRight:'0'}}>
                          <span>본문 해석</span>
                        </div>
                        <div className="work05-print-answer-translation" style={{fontSize:'1rem', lineHeight:'1.7', padding:'0.5rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', marginBottom:'1.2rem'}}>
                          {quiz.translation ? (
                            pageLayoutInfo.page3Content === 'C-part2' ? 
                              quiz.translation.substring(Math.floor(quiz.translation.length / 2)) : 
                              quiz.translation
                          ) : '번역이 생성되지 않았습니다.'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>[유형#05] 빈칸(문장) 추론 문제 생성</h2>
        <p>영어 본문에서 가장 중요한 문장(sentence)을 빈칸으로 바꾸고, 객관식 5지선다 문제를 생성합니다.</p>
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
            <label htmlFor="blank-quiz-image" className="file-upload-btn">
              파일 선택
              <input
                id="blank-quiz-image"
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
          <label htmlFor="blank-quiz-text" className="input-label">
            영어 본문 직접 붙여넣기: (2,000자 미만 권장)
          </label>
          {inputText.length < 100 && (
            <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
          )}
        </div>
        <textarea
          id="blank-quiz-text"
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
        빈칸(문장) 문제 생성하기
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
        workTypeName="빈칸(문장) 문제 생성"
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

export default Work_05_BlankSentenceInference; 