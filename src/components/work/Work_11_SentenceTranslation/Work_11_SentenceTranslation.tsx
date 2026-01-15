import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserCurrentPoints, getWorkTypePoints, deductUserPoints, refundUserPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import PointDeductionModal from '../../modal/PointDeductionModal';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import PrintFormatWork11New from './PrintFormatWork11New';
import { extractTextFromImage, translateToKorean as translateToKoreanCommon } from '../../../services/common';
import './Work_11_SentenceTranslation.css';
import '../../../styles/PrintFormat.css';
import { processWithConcurrency } from '../../../utils/concurrency';

interface Work_11_SentenceTranslationProps {
  onQuizGenerated?: (quiz: any) => void; // Quiz 타입을 사용하지 않으므로 any로 변경
}

const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];
type PrintMode = 'none' | 'no-answer' | 'with-answer';

// 입력 아이템 인터페이스 (Work_10과 동일)
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

interface SentenceTranslationQuiz {
  sentences: string[];
  translations: string[];
  quizText: string;
}

interface SentenceTranslationQuizWithId extends SentenceTranslationQuiz {
  id?: string; // 다중 입력 처리를 위한 ID
}

// 파일 → base64 변환
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// OpenAI Vision API 호출 (공통 함수 래퍼)
async function callOpenAIVisionAPI(imageBase64: string, prompt: string, apiKey: string): Promise<string> {
  // 공통 헬퍼 함수 사용 (프록시 자동 지원)
  return await extractTextFromImage(imageBase64, prompt);
}

const visionPrompt = `영어문제로 사용되는 본문이야.\n이 이미지의 내용을 수작업으로 정확히 읽고, 영어 본문만 추려내서 보여줘.\n\n중요한 지침:\n1. 글자는 인쇄글씨체 이외에 손글씨나 원, 밑줄 등 표시되어있는 것은 무시해.\n2. 본문중에 원문자 ①, ②, ③... 등으로 표시된건 제거해줘.\n3. 구두점(마침표, 쉼표, 세미콜론, 콜론)을 매우 정확하게 인식해줘. 특히 마침표(.)와 쉼표(,)를 구분해서 정확히 추출해줘.\n4. 인용문의 시작과 끝을 정확히 인식하고, 인용부호("")를 올바르게 표시해줘.\n5. 문장의 끝은 마침표(.)로, 나열이나 연결은 쉼표(,)로 정확히 구분해줘.\n6. 원문자 제거후 줄을 바꾸거나 문단을 바꾸지말고, 전체가 한 문단으로 구성해줘.\n7. 영어 본문만, 아무런 설명이나 안내문 없이, 한 문단으로만 출력해줘.`;

// OpenAI Vision 결과에서 안내문 제거 및 구두점 정리
function cleanOpenAIVisionResult(text: string): string {
  // "Sure! ..." 또는 "Here is ..." 등 안내문 제거
  let cleaned = text.replace(/^(Sure!|Here is|Here are|Here's|Here's)[^\n:]*[:：]?\s*/i, '').trim();
  
  // 구두점 정리: 인용문 내의 구두점 오류 수정
  // "wrote," → "wrote." (인용문 시작 전 마침표)
  cleaned = cleaned.replace(/wrote,(\s*")/g, 'wrote.$1');
  
  // 기타 일반적인 구두점 오류 수정
  // 문장 끝에 쉼표가 있는 경우 마침표로 변경 (단, 나열이나 연결이 아닌 경우)
  cleaned = cleaned.replace(/([a-z])(,)(\s*)([A-Z])/g, (match, p1, p2, p3, p4) => {
    // 인용문 내부가 아닌 경우에만 마침표로 변경
    const beforeQuote = cleaned.substring(0, cleaned.indexOf(match));
    const quoteCount = (beforeQuote.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) { // 인용문 외부
      return p1 + '.' + p3 + p4;
    }
    return match; // 인용문 내부는 그대로 유지
  });
  
  return cleaned;
}

// OpenAI API를 사용하여 영어를 한글로 번역 (공통 함수 사용)
async function translateToKorean(englishText: string, apiKey: string): Promise<string> {
  // 공통 헬퍼 함수 사용 (프록시 자동 지원)
  return await translateToKoreanCommon(englishText);
}

// 문장별 해석 문제 생성
async function generateSentenceTranslationQuiz(englishText: string): Promise<{
  sentences: string[];
  translations: string[];
  quizText: string;
}> {
  try {
    console.log('📝 문장별 해석 문제 생성 시작');
    
    // 영어 텍스트를 문장 단위로 분리 (약어 보호)
    let processedText = englishText;
    
    // 일반적인 약어들을 임시로 보호 (마침표를 특수 문자로 치환)
    const abbreviations = [
      'e.g.', 'i.e.', 'etc.', 'vs.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.',
      'U.S.', 'U.K.', 'U.S.A.', 'Ph.D.', 'B.A.', 'M.A.', 'Inc.', 'Corp.',
      'Ltd.', 'Co.', 'St.', 'Ave.', 'Blvd.', 'Rd.', 'Jr.', 'Sr.',
      'A.D.', 'B.C.', 'C.E.', 'B.C.E.'
    ];
    
    // 약어의 마침표를 임시 문자로 치환
    abbreviations.forEach(abbr => {
      const regex = new RegExp(abbr.replace('.', '\\.'), 'gi');
      processedText = processedText.replace(regex, abbr.replace(/\./g, '§§§'));
    });
    
    // 숫자 패턴 보호 (예: 1.5, 2.3, 10.25 등)
    processedText = processedText.replace(/\b\d+\.\d+\b/g, (match) => {
      return match.replace(/\./g, '§§§');
    });
    
    // 인용문을 고려한 문장 분리
    const sentences: string[] = [];
    let currentSentence = '';
    let inQuotes = false;
    let quoteCount = 0;
    
    for (let i = 0; i < processedText.length; i++) {
      const char = processedText[i];
      const nextChar = processedText[i + 1];
      
      if (char === '"') {
        quoteCount++;
        inQuotes = quoteCount % 2 === 1; // 홀수면 인용문 시작, 짝수면 인용문 끝
        currentSentence += char;
        } else if (/[.!?]/.test(char)) {
          currentSentence += char;
          
          // 인용문 밖에서 마침표/느낌표/물음표를 만나면 문장 분리
          if (!inQuotes) {
            if (currentSentence.trim().length > 0) {
              sentences.push(currentSentence.trim());
            }
            currentSentence = '';
          } else {
            // 인용문 안에서 마침표를 만난 경우, 다음 문자가 따옴표인지 확인
            if (nextChar === '"') {
              // 마침표 다음에 따옴표가 오면 인용문이 끝나는 것
              // 따옴표까지 포함해서 현재 문장에 추가하고 문장 분리
              currentSentence += nextChar;
              i++; // 따옴표 문자를 건너뛰기
              
              if (currentSentence.trim().length > 0) {
                sentences.push(currentSentence.trim());
              }
              currentSentence = '';
              inQuotes = false; // 인용문 상태 초기화
            }
          }
        } else {
        currentSentence += char;
      }
    }
    
    // 마지막 문장 처리
    if (currentSentence.trim().length > 0) {
      sentences.push(currentSentence.trim());
    }
    
    // 문장 정리 및 마침표 추가
    const finalSentences = sentences
      .filter(s => s.length > 0)
      .map(s => {
        // 임시 문자를 다시 마침표로 복원
        const restored = s.replace(/§§§/g, '.');
        // 문장 끝에 마침표가 없으면 추가
        return restored + (restored.endsWith('.') || restored.endsWith('!') || restored.endsWith('?') ? '' : '.');
      });
    
    console.log('📝 분리된 문장 수:', finalSentences.length);
    
    // 각 문장을 한국어로 번역
    const translations: string[] = [];
    for (let i = 0; i < finalSentences.length; i++) {
      const sentence = finalSentences[i];
      if (sentence.trim().length > 0) {
        try {
          const translation = await translateToKorean(sentence, '');
          translations.push(translation);
          console.log(`📝 문장 ${i + 1} 번역 완료:`, translation.substring(0, 30) + '...');
        } catch (error) {
          console.error(`문장 ${i + 1} 번역 실패:`, error);
          translations.push(`[번역 실패: ${sentence}]`);
        }
      }
    }
    
    // 퀴즈 텍스트 생성
    let quizText = '본문 문장별 해석\n\n';
    finalSentences.forEach((sentence, index) => {
      if (sentence.trim().length > 0) {
        quizText += `${index + 1}. ${sentence}\n`;
        quizText += `   해석: _________________________________________________\n\n`;
      }
    });
    
    return { sentences: finalSentences, translations, quizText };
  } catch (error) {
    console.error('문장별 해석 문제 생성 오류:', error);
    throw error;
  }
}

const Work_11_SentenceTranslation: React.FC<Work_11_SentenceTranslationProps> = ({ onQuizGenerated }) => {
  const { userData, loading } = useAuth();
  
  // 상태 관리: 여러 아이템 지원
  const [items, setItems] = useState<InputItem[]>([
    { id: '1', inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '', imageFile: null }
  ]);
  const [inputMode, setInputMode] = useState<InputMode>('text');
  
  const [quizzes, setQuizzes] = useState<SentenceTranslationQuizWithId[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
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
        
        // 유형#11의 포인트 설정
        const workType11Points = points.find(wt => wt.id === '11')?.points || 0;
        setPointsToDeduct(workType11Points);
        
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

  // 컴포넌트 마운트 및 퀴즈 생성 시 스크롤
  useEffect(() => {
    if (quizzes.length > 0) {
      window.scrollTo(0, 0);
    }
  }, [quizzes]);

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
      const base64 = await fileToBase64(image as File);
      const extractedText = await callOpenAIVisionAPI(base64, visionPrompt, '');
      const cleanedText = cleanOpenAIVisionResult(extractedText);
      
      updateItem(id, { 
        text: cleanedText,
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
    const extractedText = await callOpenAIVisionAPI(base64, visionPrompt, '');
    return cleanOpenAIVisionResult(extractedText);
  }

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

    const workType = workTypePoints.find(wt => wt.id === '11'); // 유형#11
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

  const handlePointDeductionConfirm = () => {
    setShowPointModal(false);
    executeQuizGeneration();
  };

  const executeQuizGeneration = async () => {
    if (!userData?.uid) return;

    const validItems = items.filter(item => item.text.trim().length >= 10);
    if (validItems.length === 0) return;

    setIsLoading(true);
    setQuizzes([]);
    setIsExtractingText(false);
    let deductedPoints = 0;
    
    try {
      // 포인트 차감
      const workType = workTypePoints.find(wt => wt.id === '11');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const requiredPoints = workType.points * validItems.length;
      const deductionResult = await deductUserPoints(
        userData.uid,
        '11',
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
          const quizData = await generateSentenceTranslationQuiz(passage);
          const quizDataWithId: SentenceTranslationQuizWithId = { 
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
          const workType = workTypePoints.find(wt => wt.id === '11');
          const requiredPoints = workType ? workType.points * validItems.length : 0;
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '11',
            workTypeName: getWorkTypeName('11'),
            points: requiredPoints, // 실제 차감된 포인트 (workType.points * validItems.length)
            inputText: validItems.map(item => item.text.trim()).join('\n\n---\n\n'),
            quizData: generatedQuizzes,
            status: 'success'
          });
          console.log('✅ Work_11 내역 저장 완료');
        } catch (historyError) {
          console.error('❌ Work_11 내역 저장 실패:', historyError);
        }
      }
      
    } catch (err: any) {
      console.error('문장별 해석 문제 생성 오류:', err);
      
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '본문 문장별 해석 문제 생성',
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
      setIsLoading(false);
    }
  };

  const triggerPrint = (mode: PrintMode) => {
    if (quizzes.length === 0) return;
    
    console.log('🖨️ 인쇄 시작:', mode);
    
    const styleId = 'print-style-work11-landscape';
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
    printContainer.id = mode === 'with-answer' ? 'print-root-work11-new-answer' : 'print-root-work11-new';
    document.body.appendChild(printContainer);

    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatWork11New quizzes={quizzes} isAnswerMode={mode === 'with-answer'} />);

    const activatePrintContainer = () => {
      const inner = printContainer.querySelector('.print-container, .print-container-answer');
      if (inner) {
        inner.classList.add('pdf-generation-active');
      } else {
        requestAnimationFrame(activatePrintContainer);
      }
    };
    activatePrintContainer();

    setTimeout(() => {
      window.print();
      
      setTimeout(() => {
        root.unmount();
        if (printContainer.parentNode) {
          printContainer.parentNode.removeChild(printContainer);
        }
        if (appRoot) {
          appRoot.style.display = '';
        }
        const styleEl = document.getElementById(styleId);
        if (styleEl) {
          styleEl.remove();
        }
        console.log('✅ 인쇄 완료');
      }, 100);
    }, 500);
  };

  const handlePrintNoAnswer = () => {
    triggerPrint('no-answer');
  };
  
  const handlePrintWithAnswer = () => {
    triggerPrint('with-answer');
  };

  const resetQuiz = () => {
    setQuizzes([]);
    setItems([{ id: Date.now().toString(), inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '', imageFile: null }]);
    setIsLoading(false);
    setIsExtractingText(false);
  };

  if (quizzes.length > 0) {
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#11. 본문 문장별 해석 문제</h2>
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
                🖨️ 인쇄 (문제)
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
                🖨️ 인쇄 (정답)
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
                  <div className="quiz-item-header" style={{ 
                    marginBottom: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '0.5rem'
                  }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                      문제 {idx + 1} : 문장별 해석
                    </h3>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      유형#11
                    </span>
                  </div>

                  <div className="problem-instruction work11-instruction" style={{
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
                    다음 본문의 각 문장을 한국어로 해석하세요.
                  </div>
                  
                  <div className="sentences-container work11-sentences-container" style={{
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
                    {quiz.sentences.map((sentence, index) => (
                      <div key={index} className="sentence-item work11-sentence-item" style={{
                        background: '#ffffff',
                        backgroundColor: '#ffffff',
                        border: '1px solid transparent',
                        borderRadius: '0',
                        padding: '0.5rem 0',
                        marginBottom: '1rem',
                        fontFamily: 'inherit',
                        boxShadow: 'none'
                      }}>
                        <div className="sentence-header">
                          <span className="sentence-number">{index + 1}.</span>
                          <span className="sentence-content" style={{ color: '#333' }}>{sentence}</span>
                        </div>
                        <div className="translation-container">
                          <span className="translation-label">해석:</span>
                          <div className="translation-answer" style={{marginTop:'0.5rem', color:'#333', fontWeight:400}}>
                            {quiz.translations[index]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* 인쇄 영역 - Work11DynamicPrintPages로 처리 */}
      </div>
    );
  }

  return (
    <div className="quiz-generator">
      <div className="generator-header">
        <h2>메뉴#11. 본문 문장별 해석 문제 생성</h2>
        <p>영어 본문을 입력하면 각 문장별로 해석을 작성할 수 있는 문제를 생성합니다.</p>
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
          : '📋 본문 문장별 해석 문제 생성'}
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
        workTypeName={`본문 문장별 해석 문제 생성 (${items.filter(i => i.text.length >= 10).length}문제)`}
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

export default Work_11_SentenceTranslation; 