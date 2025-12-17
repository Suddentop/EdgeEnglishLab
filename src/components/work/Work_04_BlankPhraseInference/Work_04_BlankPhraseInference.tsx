import React, { useState, ChangeEvent, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './Work_04_BlankPhraseInference.css';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../../../styles/PrintFormat.css';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { extractTextFromImage, callOpenAI } from '../../../services/common';
import { useAuth } from '../../../contexts/AuthContext';
import PrintFormatWork04New from './PrintFormatWork04New';
import { processWithConcurrency } from '../../../utils/concurrency';

// A4 페이지 설정 상수 (px 단위)
const A4_CONFIG = {
  PAGE_HEIGHT: 1123,        // px (29.7cm * 37.8px/cm)
  HEADER_HEIGHT: 19,        // px (0.5cm * 37.8px/cm)
  CONTENT_MARGIN: 38,       // px (1.0cm * 37.8px/cm)
  INSTRUCTION_HEIGHT: 30,   // px (0.8cm * 37.8px/cm)
  INSTRUCTION_MARGIN: 11,   // px (0.3cm * 37.8px/cm)
  TRANSLATION_HEADER_HEIGHT: 30,  // px (0.8cm * 37.8px/cm)
  TRANSLATION_HEADER_MARGIN: 11,  // px (0.3cm * 37.8px/cm)
  OPTIONS_HEADER_HEIGHT: 30,      // px (0.8cm * 37.8px/cm)
  OPTIONS_HEADER_MARGIN: 11,      // px (0.3cm * 37.8px/cm)
};

// 텍스트 높이 계산 함수 (px 단위)
function calculateContainerHeight(text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number {
  // A4 너비 21cm - 좌우 여백 3cm = 18cm = 680px
  const availableWidthPx = 680; // px
  const charWidthPx = fontSize * 0.55; // px 단위 문자 폭
  const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
  const lines = Math.ceil(text.length / charsPerLine);
  return (lines * fontSize * lineHeight) + padding; // px 단위로 반환
}

// 입력 아이템 인터페이스 (Work_03와 동일)
type InputType = 'clipboard' | 'file' | 'text';

interface InputItem {
  id: string;
  inputType: InputType;
  text: string;
  pastedImageUrl: string | null;
  isExpanded: boolean;
  isExtracting: boolean;
  error: string;
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

interface BlankQuiz {
  id?: string;
  blankedText: string;
  options: string[];
  answerIndex: number;
  translation?: string;
}

const Work_04_BlankPhraseInference: React.FC = () => {
  const { userData, loading } = useAuth();
  
  // 상태 관리: 여러 아이템 지원
  const [items, setItems] = useState<InputItem[]>([
    { id: '1', inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }
  ]);
  
  const [quizzes, setQuizzes] = useState<BlankQuiz[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: number | null}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);
  
  // 아이템 관리 함수들
  const addItem = () => {
    const newItem: InputItem = {
      id: Date.now().toString(),
      inputType: 'text', 
      text: '',
      pastedImageUrl: null,
      isExpanded: true,
      isExtracting: false,
      error: ''
    };
    setItems(prev => prev.map(item => ({ ...item, isExpanded: false })).concat(newItem));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      setItems([{ id: Date.now().toString(), inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }]);
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
      const resultText = await extractTextFromImage(imageBase64);
      
      updateItem(id, { 
        text: resultText,
        isExtracting: false 
      });
    } catch (err: any) {
      updateItem(id, { 
        error: '이미지 텍스트 추출 실패: ' + (err?.message || err),
        isExtracting: false
      });
    }
  };

  const handlePaste = (id: string, e: React.ClipboardEvent) => {
    const item = items.find(i => i.id === id);
    if (!item || item.inputType !== 'clipboard') return;

    const clipItems = e.clipboardData.items;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.indexOf('image') !== -1) {
        const file = clipItems[i].getAsFile();
        if (file) {
          handleImageToText(id, file);
          e.preventDefault();
          return;
        }
      }
    }
  };

  const handleFileChange = (id: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      updateItem(id, { error: '이미지 파일만 첨부 가능합니다.' });
      return;
    }
    handleImageToText(id, file);
    e.target.value = '';
  };

  // 포인트 관련 초기화
  useEffect(() => {
    const initializePoints = async () => {
      try {
        const points = await getWorkTypePoints();
        setWorkTypePoints(points);
        
        // 유형#04의 포인트 설정
        const workType4Points = points.find(wt => wt.id === '4')?.points || 0;
        setPointsToDeduct(workType4Points);
        
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

  // 영어본문 한글 번역 함수
  async function translateToKorean(englishText: string): Promise<string> {
    const prompt = `다음 영어 본문을 자연스러운 한국어로 번역해주세요. 번역만 출력하고 다른 설명은 하지 마세요.

영어 본문:
${englishText}`;
    
    // 공통 헬퍼 함수 사용 (프록시 자동 지원)
    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 호출 실패: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async function generateBlankQuizWithAI(passage: string): Promise<BlankQuiz> {
    // passage에서 이미 ()로 묶인 구 추출
    const excludedPhrases: string[] = [];
    const bracketRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = bracketRegex.exec(passage)) !== null) {
      excludedPhrases.push(match[1].trim());
    }
    const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 교육과정 수학능력평가(수능) 수준**의 빈칸 추론 문제를 만들어주세요. 글의 주제와 가장 밀접한, 의미 있는 구(phrase, 3~10단어 이내) 1개를 선정하되, **수능 수준의 문맥 추론이 필요한 학술적/문학적 구**를 선택하세요.\n1. 반드시 본문에 실제로 등장한 구(철자, 형태, 대소문자까지 동일)를 정답으로 선정해야 해. 변형, 대체, 동의어, 어형 변화 없이 본문에 있던 그대로 사용해야 해.\n2. 문제의 본문(빈칸 포함)은 반드시 사용자가 입력한 전체 본문과 완전히 동일해야 하며, 일부 문장만 추출하거나, 문장 순서를 바꾸거나, 본문을 요약/변형해서는 안 돼. 오직 정답 구만 ()로 치환해.\n3. 입력된 본문에 이미 ()로 묶인 단어나 구가 있다면, 그 부분은 절대 빈칸 처리 대상으로 삼지 마세요. 반드시 괄호 밖에 있는 구만 빈칸 후보로 선정하세요.\n4. 아래 구는 절대 빈칸 처리하지 마세요: ${excludedPhrases.length > 0 ? excludedPhrases.join(', ') : '없음'}\n5. 정답(구) + 오답(비슷한 길이의 구 4개, 의미는 다름) 총 5개를 생성해.\n6. 정답의 위치는 1~5번 중 랜덤.\n7. 본문 해석도 함께 제공.\n8. 아래 JSON 형식으로 응답:\n{\n  "options": ["...", ...],\n  "answerIndex": 2, // 0~4\n  "translation": "..."\n}\n주의: options의 정답(정답 인덱스에 해당하는 구)는 반드시 본문에 있던 구와 완전히 일치해야 하며, 변형/대체/동의어/어형 변화가 있으면 안 됨. 문제의 본문(빈칸 포함)은 반드시 입력한 전체 본문과 동일해야 함. 입력된 본문에 이미 ()로 묶인 부분은 빈칸 처리 대상에서 제외해야 함.\n본문:\n${passage}`;
    const { callOpenAI } = await import('../../../services/common');
    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
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
    // 정답 구가 본문에 실제로 존재하는지 검증
    if (!passage.includes(result.options[result.answerIndex])) {
      throw new Error('정답 구가 본문에 존재하지 않습니다. AI 응답 오류입니다.');
    }
    // blankedText를 프론트엔드에서 직접 생성 (괄호 split 방식, 괄호 안/밖 완벽 구분)
    function replaceFirstOutsideBrackets(text: string, phrase: string): string {
      let replaced = false;
      const tokens = text.split(/([()])/);
      let inBracket = false;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') { inBracket = true; continue; }
        if (tokens[i] === ')') { inBracket = false; continue; }
        if (!inBracket && !replaced) {
          const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          if (regex.test(tokens[i])) {
            tokens[i] = tokens[i].replace(regex, '(__________)');
            replaced = true;
          }
        }
      }
      let result = '';
      inBracket = false;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') { inBracket = true; result += '('; continue; }
        if (tokens[i] === ')') { inBracket = false; result += ')'; continue; }
        result += tokens[i];
      }
      return result;
    }
    const answer = result.options[result.answerIndex];
    const blankedText = replaceFirstOutsideBrackets(passage, answer);
    result.blankedText = blankedText;
    // 복원 검증
    const blankRestore = result.blankedText.replace(/\( *_{6,}\)/, answer);
    if (blankRestore.trim() !== passage.trim()) {
      throw new Error('빈칸 본문이 원본 본문과 일치하지 않습니다. AI 응답 오류입니다.');
    }
    if (!result.blankedText || !result.options || typeof result.answerIndex !== 'number' || !result.translation) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    return result;
  }

  // 문제 생성 (포인트 차감 포함)
  const handleGenerateQuiz = async () => {
    const validItems = items.filter(item => item.text.trim().length >= 10);
    
    if (validItems.length === 0) {
      alert('문제 생성을 위해 최소 하나의 본문을 입력해주세요.');
      return;
    }
    
    // 로딩 중이면 대기
    if (loading) {
      alert('로그인 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    
    // 로그인 상태 확인
    if (!userData || !userData.uid) {
      alert('로그인이 필요합니다. 다시 로그인해주세요.');
      return;
    }

    // 포인트 차감 확인
    const workType = workTypePoints.find(wt => wt.id === '4');
    if (!workType) {
      alert('포인트 설정을 불러올 수 없습니다.');
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
    let deductedPoints = 0;
    
    try {
      // 포인트 차감
      const workType = workTypePoints.find(wt => wt.id === '4');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const requiredPoints = workType.points * validItems.length;
      const deductionResult = await deductUserPoints(
        userData.uid,
        '4',
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
        const passage = item.text.trim();
        if (!passage) return null;

        try {
          const quizData = await generateBlankQuizWithAI(passage);
          const translation = await translateToKorean(passage);
          const quizDataWithTranslation: BlankQuiz = { 
            ...quizData, 
            translation,
            id: item.id
          };
          return quizDataWithTranslation;
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

      // 문제 생성 내역 저장 (여러 퀴즈를 배열로 저장)
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          const workTypePoint = workTypePoints.find(wt => wt.id === '4');
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '04',
            workTypeName: getWorkTypeName('04'),
            points: workTypePoint?.points || 0,
            inputText: validItems.map(item => item.text.trim()).join('\n\n---\n\n'),
            quizData: generatedQuizzes, // 배열로 저장
            status: 'success'
          });
          console.log('✅ Work_04 내역 저장 완료 (번역 포함)', generatedQuizzes.length, '개 문제');
        } catch (historyError) {
          console.error('❌ Work_04 내역 저장 실패:', historyError);
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
            '빈칸(구) 문제 생성',
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
      }
  };

  // 리셋
  const resetAll = () => {
    setQuizzes([]);
    setSelectedAnswers({});
    setItems([{ id: Date.now().toString(), inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }]);
  };

  // 인쇄 핸들러 (Work_03 방식 적용)
  const triggerPrint = (mode: 'no-answer' | 'with-answer') => {
    if (quizzes.length === 0) return;
    
    console.log('🖨️ 인쇄 시작:', mode);
    
    const styleId = 'print-style-work04-landscape';
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
    printContainer.id = mode === 'with-answer' ? 'print-root-work04-new-answer' : 'print-root-work04-new';
    document.body.appendChild(printContainer);

    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatWork04New quizzes={quizzes} isAnswerMode={mode === 'with-answer'} />);

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
        document.body.removeChild(printContainer);
        if (appRoot) {
          appRoot.style.display = 'block';
        }
        const styleElement = document.getElementById(styleId);
        if (styleElement) {
          document.head.removeChild(styleElement);
        }
        console.log('✅ 인쇄 완료');
    }, 100);
    }, 500);
  };

  // 퀴즈 결과 화면
  if (quizzes.length > 0) {
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#04. 빈칸(구) 추론 문제 (총 {quizzes.length}문제)</h2>
            <div className="quiz-header-buttons no-print">
              <button onClick={resetAll} className="reset-button" style={{
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
              <button onClick={() => triggerPrint('no-answer')} className="print-button" style={{
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
                marginRight: '10px'
              }}>🖨️ 인쇄 (문제)</button>
              <button onClick={() => triggerPrint('with-answer')} className="print-button" style={{
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
              }}>🖨️ 인쇄 (정답)</button>
            </div>
          </div>
          <div className="quiz-content no-print">
            <div style={{ padding: '1rem', background: '#f0f7ff', borderRadius: '8px', marginBottom: '2rem', borderLeft: '4px solid #1976d2' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1976d2' }}>총 {quizzes.length}개의 문제가 생성되었습니다.</h3>
            </div>

            {quizzes.map((quiz, idx) => {
              const quizId = quiz.id || `quiz-${idx}`;
              const displayBlankedText = quiz.blankedText;
              const selected = selectedAnswers[quizId] ?? null;
              
              return (
                <div key={quizId} className="quiz-item-card" style={{ marginBottom: '3rem', borderTop: '2px solid #eee', paddingTop: '2rem' }}>
                  <div className="quiz-item-header" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: '#1976d2' }}>문제 {idx + 1}</h3>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#eee', fontSize: '0.8rem', color: '#666' }}>유형#04</span>
                  </div>

            <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.18rem', background:'#222', color:'#fff', padding:'0.7rem 1.2rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#04</span>
            </div>
                  
                  <div style={{fontSize:'1.08rem', lineHeight:1.7, margin:'1.2rem 0', background:'#FFF3CD', borderRadius:'8px', padding:'1.2rem', fontFamily:'inherit'}}>
              {displayBlankedText}
            </div>
                  
                  <div className="problem-options" style={{margin:'1.2rem 0'}}>
              {quiz.options.map((opt, i) => (
                <label key={i} style={{display:'block', fontSize:'1.08rem', margin:'0.4rem 0', cursor:'pointer', fontWeight: selected === i ? 700 : 400, color: selected === i ? '#6a5acd' : '#222', fontFamily:'inherit'}}>
                  <input
                    type="radio"
                          name={`blank-quiz-${quizId}`}
                    checked={selected === i}
                          onChange={() => setSelectedAnswers({ ...selectedAnswers, [quizId]: i })}
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

                  {quiz.translation && (
                    <div className="translation-section" style={{marginTop:'2rem'}}>
                      <h3>본문 해석:</h3>
                      <div className="translation-content" style={{background: '#f1f8e9', padding: '1.2rem', borderRadius: '8px'}}>
                        {quiz.translation}
                </div>
              </div>
            )}
          </div>
              );
            })}
              </div>
                      </div>
        {/* 인쇄 기능은 추후 구현 예정 */}
                      </div>
    );
  }

  // 입력/옵션/버튼 UI
  return (
    <div className="quiz-generator">
      <div className="generator-header">
        <h2>[유형#04] 빈칸(구) 추론 문제 생성</h2>
        <p>여러 개의 본문을 입력하여 한 번에 여러 문제를 생성할 수 있습니다.</p>
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
                  <label><input type="radio" checked={item.inputType === 'clipboard'} onChange={() => updateItem(item.id, { inputType: 'clipboard', error: '' })} /><span>📸 캡처화면 붙여넣기</span></label>
                  <label><input type="radio" checked={item.inputType === 'file'} onChange={() => updateItem(item.id, { inputType: 'file', error: '' })} /><span>🖼️ 이미지 파일 첨부</span></label>
                  <label><input type="radio" checked={item.inputType === 'text'} onChange={() => updateItem(item.id, { inputType: 'text', error: '' })} /><span>✍️ 직접 붙여넣기</span></label>
                </div>
                   
                {item.inputType === 'clipboard' && (
                  <div className="input-guide" tabIndex={0} onPaste={(e) => handlePaste(item.id, e)} style={{ minHeight: '120px' }}>
          <div className="drop-icon">📋</div>
                    <div className="drop-text">여기에 이미지를 붙여넣으세요 (Ctrl+V)</div>
                    {item.pastedImageUrl && <div className="preview-row"><img src={item.pastedImageUrl} alt="Preview" className="preview-img" /></div>}
                    {item.isExtracting && <div className="loading-text">텍스트 추출 중...</div>}
            </div>
          )}
                {item.inputType === 'file' && (
                  <div className="input-guide" style={{ minHeight: '80px' }}>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(item.id, e)} disabled={item.isExtracting} />
                    {item.isExtracting && <span className="loading-text">추출 중...</span>}
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
                {item.error && <div className="error-message">❌ {item.error}</div>}
        </div>
            )}
          </div>
        ))}
      </div>
      
      <button onClick={addItem} className="add-item-button">➕ 본문 추가하기</button>
      
      <button onClick={handleGenerateQuiz} disabled={isLoading} className="generate-button" style={{ marginTop: '20px' }}>
        {items.filter(i => i.text.length >= 10).length > 1 ? `📋 ${items.filter(i => i.text.length >= 10).length}개 문제 일괄 생성` : '📋 빈칸(구) 문제 생성'}
      </button>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="centered-hourglass-overlay">
          <div className="centered-hourglass-content">
            <span className="centered-hourglass-spinner">⏳</span>
            <div className="loading-text">문제 생성 중...</div>
          </div>
        </div>
      )}
      
      <ScreenshotHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={handlePointDeductionConfirm}
        workTypeName={`빈칸(구) 문제 생성 (${items.filter(i => i.text.length >= 10).length}문제)`}
        pointsToDeduct={pointsToDeduct}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - pointsToDeduct}
      />
    </div>
  );
};

export default Work_04_BlankPhraseInference; 