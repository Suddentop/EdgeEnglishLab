import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './Work_08_TitleInference.css';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../../../styles/PrintFormat.css';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { extractTextFromImage, callOpenAI, translateToKorean } from '../../../services/common';
import { generateWork08Quiz } from '../../../services/work08Service';
import { useAuth } from '../../../contexts/AuthContext';
import PrintFormatWork08New from './PrintFormatWork08New';
import { processWithConcurrency } from '../../../utils/concurrency';

const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];
type PrintMode = 'none' | 'no-answer' | 'with-answer';

// 입력 아이템 인터페이스 (Work_03/07과 동일)
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

interface TitleQuiz {
  id?: string; // 다중 입력 처리를 위한 ID
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation?: string;
  optionTranslations?: string[];
}

// A4 페이지 설정 (실제 A4 크기 기준, px 단위)
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

const Work_08_TitleInference: React.FC = () => {
  const { userData, loading } = useAuth();
  
  // 상태 관리: 여러 아이템 지원
  const [items, setItems] = useState<InputItem[]>([
    { id: '1', inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '', imageFile: null }
  ]);
  const [inputMode, setInputMode] = useState<InputMode>('text');

  const [quizzes, setQuizzes] = useState<TitleQuiz[]>([]);
  
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

  // 텍스트 높이 계산 함수
  const calculateContainerHeight = (text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number => {
    const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40; // px
    const charWidthPx = fontSize * 0.55; // px 단위 문자 폭
    const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
    const lines = Math.ceil(text.length / charsPerLine);
    return (lines * fontSize * lineHeight) + padding; // px 단위로 반환
  };

  // 포인트 관련 초기화
  useEffect(() => {
    const initializePoints = async () => {
      try {
        const points = await getWorkTypePoints();
        setWorkTypePoints(points);
        
        // 유형#08의 포인트 설정
        const workType8Points = points.find(wt => wt.id === '8')?.points || 0;
        setPointsToDeduct(workType8Points);
        
        // 로딩이 완료되고 userData가 있을 때만 포인트 조회
        if (!loading && userData && userData.uid) {
          const currentPoints = await getUserCurrentPoints(userData.uid);
          setUserCurrentPoints(currentPoints);
        }
      } catch (error) {
        console.error('포인트 초기화 오류:', error);
      }
    };
    
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
      // 기존 Work_08 로직에 따라 common service 대신 직접 호출하거나 common의 extractTextFromImage 사용
      // 여기서는 common의 extractTextFromImage를 사용
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

  // imageToTextWithOpenAIVision - 파일 업로드 시 사용
  async function imageToTextWithOpenAIVision(imageFile: File): Promise<string> {
    const base64 = await fileToBase64(imageFile);
    return await extractTextFromImage(base64);
  }

  // 본문 → 제목 추론 문제 생성 (AI) - work08Service 사용
  // 이 함수는 호환성을 위해 유지하지만, 실제로는 generateWork08Quiz를 사용합니다.
  async function generateTitleQuizWithAI(passage: string, previouslySelectedTitles?: string[]): Promise<TitleQuiz> {
    // work08Service의 generateWork08Quiz 함수 사용
    return await generateWork08Quiz(passage, previouslySelectedTitles);
  }
  
  // 기존 로컬 함수는 제거하고 서비스 함수 사용
  async function generateTitleQuizWithAI_OLD(passage: string): Promise<TitleQuiz> {
    const prompt = `아래 영어 본문을 읽고, 글의 주제의식에 가장 적합한 제목(title) 1개를 선정해.

요구사항:
1. 정답 제목(문장/구) + 오답(비슷한 길이의 제목 4개, 의미는 다름) 총 5개를 생성
2. 정답의 위치는 1~5번 중 랜덤
3. 본문 해석도 함께 제공
4. 각 옵션(1번~5번)에 대한 한글 해석을 반드시 제공

아래 JSON 형식으로 정확히 응답해줘:

{
  "passage": "영어 본문 내용",
  "options": ["첫번째 옵션 제목", "두번째 옵션 제목", "세번째 옵션 제목", "네번째 옵션 제목", "다섯번째 옵션 제목"],
  "answerIndex": 2,
  "translation": "본문의 한글 해석",
  "answerTranslation": "정답 제목의 한글 해석",
  "optionTranslations": ["첫번째 옵션의 한글 해석", "두번째 옵션의 한글 해석", "세번째 옵션의 한글 해석", "네번째 옵션의 한글 해석", "다섯번째 옵션의 한글 해석"]
}

본문:
${passage}

중요: optionTranslations 배열에는 반드시 5개의 한글 해석이 순서대로 들어가야 합니다. 각 옵션의 제목을 한국어로 자연스럽게 번역해주세요.`;
    
    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7
    });
    const data = await response.json();
    const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
    }
    if (!result.passage || !result.options || typeof result.answerIndex !== 'number' || !result.translation) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    // answerTranslation이 없으면 빈 문자열로 보완
    if (!('answerTranslation' in result) || result.answerTranslation == null) {
      result.answerTranslation = '';
    }
    // optionTranslations이 없으면 빈 배열로 보완
    if (!('optionTranslations' in result) || !Array.isArray(result.optionTranslations)) {
      result.optionTranslations = [];
    }
    
    // optionTranslations 배열의 길이가 options 배열과 다르면 보완
    if (result.optionTranslations.length !== result.options.length) {
      const missingTranslations = result.options.length - result.optionTranslations.length;
      for (let i = 0; i < missingTranslations; i++) {
        result.optionTranslations.push('해석 생성 중 오류 발생');
      }
    }
    
    return result;
  }

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

    const workType = workTypePoints.find(wt => wt.id === '8'); // 유형#08
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
    let deductedPoints = 0;
    
    try {
      const workType = workTypePoints.find(wt => wt.id === '8');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const requiredPoints = workType.points * validItems.length;
      const deductionResult = await deductUserPoints(
        userData.uid,
        '8',
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

      // 동일한 본문별로 그룹화하여 이전 선택 추적
      const passageGroups = new Map<string, { items: typeof validItems, selectedTitles: string[] }>();
      
      // 먼저 모든 아이템의 본문 추출
      const itemsWithPassage = await Promise.all(validItems.map(async (item) => {
        let passage = '';
        if (item.inputType === 'text') {
          passage = item.text.trim();
        } else if (item.inputType === 'file' && item.imageFile) {
          passage = await imageToTextWithOpenAIVision(item.imageFile);
        } else if (item.inputType === 'clipboard') {
          passage = item.text.trim();
        }
        return { item, passage };
      }));

      itemsWithPassage.forEach(({ item, passage }) => {
        if (passage.trim()) {
          if (!passageGroups.has(passage)) {
            passageGroups.set(passage, { items: [], selectedTitles: [] });
          }
          passageGroups.get(passage)!.items.push(item);
        }
      });

      const generatedQuizzes: TitleQuiz[] = [];

      // 각 본문 그룹별로 순차 처리 (동일 본문 내에서 이전 선택 추적)
      for (const [passage, group] of Array.from(passageGroups.entries())) {
        console.log(`📝 본문 그룹 처리 시작: "${passage.substring(0, 50)}..." (${group.items.length}개 아이템)`);
        
        // 동일 본문 내에서는 순차 처리
        for (let i = 0; i < group.items.length; i++) {
          const item = group.items[i];
          
          try {
            console.log(`  🔄 아이템 ${i + 1}/${group.items.length} 처리 중...`);
            console.log(`  📌 이전 선택 제목: ${group.selectedTitles.length > 0 ? group.selectedTitles.map(t => t.substring(0, 50) + '...').join(', ') : '없음'}`);
            
            // 이전 선택 제목을 포함하여 문제 생성
            const quizData = await generateTitleQuizWithAI(passage, group.selectedTitles);
            
            const quizDataWithId: TitleQuiz = { 
              ...quizData, 
              id: item.id
            };
            
            // 생성된 문제의 정답 제목(options[answerIndex])을 이전 선택 목록에 추가
            const selectedTitle = quizData.options[quizData.answerIndex];
            group.selectedTitles.push(selectedTitle);
            console.log(`  ✅ 정답 제목 "${selectedTitle.substring(0, 50)}${selectedTitle.length > 50 ? '...' : ''}" 선택됨 (이제 제외 목록에 추가됨)`);
            
            generatedQuizzes.push(quizDataWithId);
          } catch (itemError: any) {
            console.error(`아이템 ${item.id} 처리 중 오류:`, itemError);
            alert(`본문 "${passage.substring(0, 50)}..." 처리 중 오류가 발생했습니다: ${itemError.message}`);
          }
        }
      }

      if (generatedQuizzes.length === 0) {
        throw new Error('생성된 문제가 없습니다.');
      }

      setQuizzes(generatedQuizzes);

      // 문제 생성 내역 저장 (배열로)
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          const workType = workTypePoints.find(wt => wt.id === '8');
          const requiredPoints = workType ? workType.points * validItems.length : 0;
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '08',
            workTypeName: getWorkTypeName('08'),
            points: requiredPoints, // 실제 차감된 포인트 (workType.points * validItems.length)
            inputText: validItems.map(item => item.text.trim()).join('\n\n---\n\n'),
            quizData: generatedQuizzes,
            status: 'success'
          });
          console.log('✅ Work_08 내역 저장 완료');
        } catch (historyError) {
          console.error('❌ Work_08 내역 저장 실패:', historyError);
        }
      }
      
    } catch (err: any) {
      console.error('제목 추론 문제 생성 오류:', err);
      
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '제목 추론 문제 생성',
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
    
    const styleId = 'print-style-work08-landscape';
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
    printContainer.id = mode === 'with-answer' ? 'print-root-work08-new-answer' : 'print-root-work08-new';
    document.body.appendChild(printContainer);

    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatWork08New quizzes={quizzes} isAnswerMode={mode === 'with-answer'} />);

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

  const resetQuiz = () => {
    setQuizzes([]);
    setItems([{ id: Date.now().toString(), inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '', imageFile: null }]);
    setIsPasteFocused(false);
    setIsLoading(false);
    setIsExtractingText(false);
  };

  // 컴포넌트 마운트 및 퀴즈 생성 시 스크롤
  useEffect(() => {
    if (quizzes.length > 0) {
      window.scrollTo(0, 0);
    }
  }, [quizzes]);

  // --- 메인 렌더링 ---

  if (quizzes.length > 0) {
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#08. 제목 추론 문제</h2>
            <div className="quiz-header-buttons no-print">
              <button onClick={resetQuiz} className="reset-button" style={{
                width: '160px', height: '48px', padding: '0.75rem 1rem', fontSize: '1rem', fontWeight: '600',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '8px',
                background: 'linear-gradient(135deg, #bef264 0%, #a3e635 100%)', color: 'white', cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(190, 242, 100, 0.25)', transition: 'all 0.3s ease'
              }}>새문제</button>
              <button onClick={handlePrintNoAnswer} className="print-button styled-print" style={{
                width: '160px', height: '48px', padding: '0.75rem 1rem', fontSize: '1rem', fontWeight: '600',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}>
                <span className="print-icon" aria-hidden>🖨️</span>
                <span>인쇄 (문제)</span>
              </button>
              <button onClick={handlePrintWithAnswer} className="print-button styled-print" style={{
                width: '160px', height: '48px', padding: '0.75rem 1rem', fontSize: '1rem', fontWeight: '600',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '8px',
                transition: 'all 0.3s ease', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white',
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
                  <div className="quiz-item-header work08-header" style={{ 
                    marginBottom: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '0.5rem'
                  }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                      문제 {idx + 1} : 제목 추론
                    </h3>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      유형#08
                    </span>
                  </div>

                  <div className="problem-instruction work08-instruction" style={{
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
                    다음 글의 제목으로 가장 적절한 것을 고르시오.
                  </div>
                  
                  <div className="problem-passage work08-passage" style={{
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
                    {quiz.passage}
                  </div>
                  
                  <div className="problem-options work08-options" style={{
                    margin: '0 0 0.75rem 0',
                    backgroundColor: '#ffffff',
                    background: '#ffffff',
                    border: '1px solid transparent',
                    padding: '0'
                  }}>
                    {quiz.options.map((opt, i) => (
                      <div key={i} className="option work08-option" style={{
                        display: 'block',
                        fontSize: '1rem',
                        margin: '0.5rem 0',
                        padding: '0 1rem',
                        fontFamily: 'inherit',
                        backgroundColor: '#ffffff',
                        background: '#ffffff',
                        border: '1px solid transparent',
                        borderRadius: '0',
                        color: '#333'
                      }}>
                        {`①②③④⑤`[i] || `${i+1}.`} {opt}{i === quiz.answerIndex ? <span style={{ color: '#0066cc', fontWeight: 'bold' }}> (정답)</span> : ''}
                      </div>
                    ))}
                  </div>

                  {quiz.translation && (
                    <div className="translation-section" style={{ marginTop: '1rem' }}>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석:</h3>
                      <div className="translation-content work08-translation" style={{
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
        {/* 인쇄 영역 - PrintFormatWork08New에서 동적으로 처리하므로 여기서는 제거 */}
      </div>
    );
  }

  return (
    <div className="quiz-generator">
      <div className="generator-header">
        <h2>메뉴#08. 제목 추론 문제 생성</h2>
        <p>영어 본문의 주제의식에 맞는 제목을 AI가 추론해 5지선다 객관식 문제로 출제합니다.</p>
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
          : '📋 제목 추론 문제 생성'}
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
        workTypeName={`제목 추론 문제 생성 (${items.filter(i => i.text.length >= 10).length}문제)`}
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

export default Work_08_TitleInference; 
