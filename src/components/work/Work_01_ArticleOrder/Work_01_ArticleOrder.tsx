import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { generateWork01Quiz, generateWork01ExamQuiz } from '../../../services/work01Service';
import { Quiz } from '../../../types/types';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import PrintFormatWork01New from './PrintFormatWork01New';
import './Work_01_ArticleOrder.css';
import '../../../styles/PrintFormat.css';
import { callOpenAI } from '../../../services/common';
import { processWithConcurrency } from '../../../utils/concurrency';

interface Work_01_ArticleOrderProps {
  onQuizGenerated?: (quiz: Quiz) => void;
}

type InputType = 'clipboard' | 'file' | 'text';

// 입력 아이템 인터페이스 정의
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

// OpenAI Vision API 호출 (프록시만 사용)
async function callOpenAIVisionAPI(imageBase64: string, prompt: string): Promise<string> {
  const proxyUrl = process.env.REACT_APP_API_PROXY_URL || '';
  
  if (!proxyUrl) {
    throw new Error('프록시 서버가 설정되지 않았습니다. REACT_APP_API_PROXY_URL 환경 변수를 설정해주세요.');
  }

  // base64 데이터를 직접 사용 (Firebase Storage 업로드 제거로 타임아웃 문제 해결)
  // OpenAI Vision API는 data URL 형식을 직접 지원합니다
  let imageUrl = imageBase64;
  
  // data URL이 아닌 경우에만 Firebase Storage 업로드 시도 (fallback)
  if (!imageBase64.startsWith('data:')) {
    try {
      // 이미 URL인 경우 그대로 사용
      imageUrl = imageBase64;
    } catch (error) {
      console.warn('⚠️ 이미지 URL 처리 실패, base64 직접 사용:', error);
    }
  }

  const proxyRequest = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: prompt },
          { type: 'image_url' as const, image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 2048
  };

  // 공통 헬퍼로 프록시 호출 (재시도 로직 포함)
  let lastError: Error | null = null;
  const maxRetries = 3;
  const retryDelay = 1000; // 1초

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await callOpenAI(proxyRequest);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error('OpenAI Vision API 호출 실패: ' + errText);
      }
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`⚠️ Vision API 호출 실패 (시도 ${attempt}/${maxRetries}):`, lastError.message);
      
      // 마지막 시도가 아니면 재시도
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }
    }
  }
  
  // 모든 재시도 실패
  throw lastError || new Error('OpenAI Vision API 호출 실패: 알 수 없는 오류');
}

const visionPrompt = `영어문제로 사용되는 본문이야.\n이 이미지의 내용을 수작업으로 정확히 읽고, 영어 본문만 추려내서 보여줘.\n글자는 인쇄글씨체 이외에 손글씨나 원, 밑줄 등 표시되어있는 것은 무시해. 본문중에 원문자 1, 2, 3... 등으로 표시된건 제거해줘. 원문자 제거후 줄을 바꾸거나 문단을 바꾸지말고, 전체가 한 문단으로 구성해줘. 영어 본문만, 아무런 설명이나 안내문 없이, 한 문단으로만 출력해줘.`;

// OpenAI Vision 결과에서 안내문 제거
function cleanOpenAIVisionResult(text: string): string {
  // "Sure! ..." 또는 "Here is ..." 등 안내문 제거
  return text.replace(/^(Sure!|Here is|Here are|Here's|Here's)[^\n:]*[:：]?\s*/i, '').trim();
}

const Work_01_ArticleOrder: React.FC<Work_01_ArticleOrderProps> = ({ onQuizGenerated }) => {
  // 상태 관리
  const [items, setItems] = useState<InputItem[]>([
    { id: '1', inputType: 'clipboard', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]); // 생성된 퀴즈 배열
  // 항상 규칙 기반 분할 사용 (AI 기반 분할 옵션 제거)
  const [showScreenshotHelp, setShowScreenshotHelp] = useState(false);
  const [quizFormat, setQuizFormat] = useState<'normal' | 'exam'>('exam'); // 문제 형식: 일반 또는 모의고사 (기본값: 모의고사 형식)
  

  // 포인트 관련 상태
  const { userData, loading } = useAuth();
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);

  // 포인트 초기화
  useEffect(() => {
    const initializePoints = async () => {
      if (!loading && userData) {
        try {
          const [workTypePointsData, userPoints] = await Promise.all([
            getWorkTypePoints(),
            getUserCurrentPoints(userData.uid)
          ]);
          
          setWorkTypePoints(workTypePointsData);
          const workType = workTypePointsData.find((wt: any) => wt.id === '1');
          if (workType) {
            setPointsToDeduct(workType.points);
          }
          setUserCurrentPoints(userPoints);
        } catch (error) {
          console.error('포인트 초기화 오류:', error);
        }
      }
    };
    if (!loading) {
      initializePoints();
    }
  }, [loading, userData]);

  // 아이템 관리 함수들
  const addItem = () => {
    const newItem: InputItem = {
      id: Date.now().toString(),
      inputType: 'clipboard',
      text: '',
      pastedImageUrl: null,
      isExpanded: true,
      isExtracting: false,
      error: ''
    };
    // 기존 아이템들은 접고 새 아이템 추가
    setItems(prev => prev.map(item => ({ ...item, isExpanded: false })).concat(newItem));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      // 마지막 하나는 삭제 대신 초기화
      setItems([{ id: Date.now().toString(), inputType: 'clipboard', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }]);
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

  // Vision API 핸들러 (개별 아이템용)
  const handleImageToText = async (id: string, image: File | Blob) => {
    updateItem(id, { isExtracting: true, error: '' });
    
    try {
      let previewUrl = null;
      if (image instanceof Blob) {
        previewUrl = URL.createObjectURL(image);
        updateItem(id, { pastedImageUrl: previewUrl });
      }
      
      const imageBase64 = await fileToBase64(image as File);
      const resultText = await callOpenAIVisionAPI(imageBase64, visionPrompt);
      
      updateItem(id, { 
        text: cleanOpenAIVisionResult(resultText),
        pastedImageUrl: null, // 추출 후 이미지 제거 (선택사항)
        isExtracting: false 
      });
    } catch (err: any) {
      updateItem(id, { 
        error: 'OpenAI Vision API 호출 실패: ' + (err?.message || err),
        isExtracting: false,
        pastedImageUrl: null
      });
    }
  };

  // 이벤트 핸들러들 (Wrapper)
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

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      updateItem(id, { error: '이미지 파일만 첨부 가능합니다.' });
      return;
    }
    handleImageToText(id, file);
    // 파일 인풋 초기화
    e.target.value = '';
  };

  // 문제 생성 핸들러
  const handleGenerateQuiz = async () => {
    // 유효한 텍스트가 있는 아이템만 필터링
    const validItems = items.filter(item => item.text.trim().length >= 10);
    
    if (validItems.length === 0) {
      alert('문제 생성을 위해 최소 하나의 본문을 입력해주세요.');
      return;
    }

    // 로그인 및 포인트 확인
    if (loading) return;
    if (!userData || !userData.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    const totalPoints = pointsToDeduct * validItems.length;
    if (userCurrentPoints < totalPoints) {
      alert(`포인트가 부족합니다. 현재 ${userCurrentPoints.toLocaleString()}포인트, 필요 ${totalPoints.toLocaleString()}포인트 (${validItems.length}문제)`);
      return;
    }

    setShowPointModal(true);
  };

  const handlePointDeductionConfirm = async () => {
    setShowPointModal(false);
    setIsLoading(true);
    setQuizzes([]); // 기존 퀴즈 초기화

    const validItems = items.filter(item => item.text.trim().length >= 10);
    const generatedQuizzes: Quiz[] = [];
    let successCount = 0;
    let failCount = 0;

    try {
      // 포인트 차감
      const totalPoints = pointsToDeduct * validItems.length;
      const deductionResult = await deductUserPoints(
        userData!.uid, 
        '1',
        `문장 순서 맞추기 (${validItems.length}문제)`,
        userData!.displayName || '사용자',
        userData!.nickname || '사용자',
        totalPoints // 총 포인트 전달
      );
      
      if (deductionResult.success) {
        setUserCurrentPoints(deductionResult.remainingPoints);
        
        const allInputTexts: string[] = [];
        const results = await processWithConcurrency(validItems, 3, async (item) => {
          try {
            console.log(`🔍 문제 생성 시작 (ID: ${item.id})... 형식: ${quizFormat}`);
            // 형식에 따라 다른 함수 호출
            const quiz = quizFormat === 'exam' 
              ? await generateWork01ExamQuiz(item.text, false) 
              : await generateWork01Quiz(item.text, false);
            return { quiz, input: item.text };
          } catch (err) {
            console.error(`❌ 문제 생성 실패 (ID: ${item.id}):`, err);
            return null;
          }
        });

        results.forEach(res => {
          if (!res) {
            failCount++;
            return;
          }
          generatedQuizzes.push(res.quiz);
          allInputTexts.push(res.input);
          successCount++;
        });

        setQuizzes(generatedQuizzes);
        
        // 모든 문제를 하나의 내역으로 저장 (나의문제생성 목록에 추가)
        if (generatedQuizzes.length > 0 && userData!.uid) {
          try {
            const combinedInputText = allInputTexts.join('\n\n---\n\n');
            await saveQuizWithPDF({
              userId: userData!.uid,
              userName: userData!.name || '사용자',
              userNickname: userData!.nickname || '사용자',
              workTypeId: '01',
              workTypeName: `${getWorkTypeName('01')} (${generatedQuizzes.length}문제)`,
              points: totalPoints,
              inputText: combinedInputText,
              quizData: generatedQuizzes, // 여러 문제를 배열로 저장
              status: 'success'
            });
            console.log(`✅ 유형#01 내역 저장 완료 (${generatedQuizzes.length}문제)`);
          } catch (historyError) {
            console.error('❌ 유형#01 내역 저장 실패:', historyError);
          }
        }
        
        if (failCount > 0) {
          alert(`${validItems.length}건 중 ${successCount}건 성공, ${failCount}건 실패했습니다.`);
          // 실패분에 대한 포인트 환불 로직이 필요하다면 여기에 추가
        }
        
      } else {
        alert('포인트 차감 실패: ' + deductionResult.error);
      }
    } catch (err) {
      console.error('처리 중 오류:', err);
      alert('오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      // 스크롤 상단 이동
      window.scrollTo(0, 0);
    }
  };

  // 인쇄 핸들러 (Package_02 방식 적용)
  const triggerPrint = (mode: 'no-answer' | 'with-answer') => {
    if (quizzes.length === 0) return;
    
    console.log('🖨️ 인쇄 시작:', mode);
    
    // 가로 페이지 스타일 동적 추가
    const styleId = mode === 'with-answer' ? 'print-style-work01-answer' : 'print-style-work01';
    const style = document.createElement('style');
    style.id = styleId;
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
    printContainer.id = mode === 'with-answer' ? 'print-root-work01-new-answer' : 'print-root-work01-new';
    document.body.appendChild(printContainer);

    // 기존 화면 숨기기
    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    // React 18 방식으로 렌더링
    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatWork01New quizzes={quizzes} isAnswerMode={mode === 'with-answer'} />);

    const activatePrintContainer = () => {
      const inner = printContainer.querySelector('.print-container, .print-container-answer');
      if (inner) {
        inner.classList.add('pdf-generation-active');
      } else {
        requestAnimationFrame(activatePrintContainer);
      }
    };
    activatePrintContainer();

    // 렌더링 완료 후 인쇄
    setTimeout(() => {
      window.print();
      
      // 인쇄 후 정리
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

  // 리셋
  const resetAll = () => {
    setQuizzes([]);
    setItems([{ id: Date.now().toString(), inputType: 'clipboard', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }]);
  };

  // 퀴즈 생성 완료 화면
  if (quizzes.length > 0) {
    return (
      <div className="quiz-display">
        <div className="quiz-header no-print">
          <h2>#01. 문장 순서 맞추기 (총 {quizzes.length}문제)</h2>
          <div className="quiz-header-buttons">
            <button 
              onClick={resetAll} 
              style={{
                width: '130px',
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
            <button 
              onClick={() => triggerPrint('no-answer')} 
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
              onClick={() => triggerPrint('with-answer')} 
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
          </div>
        </div>

        <div className="quiz-content no-print">
          <div style={{ padding: '1rem', background: '#f0f7ff', borderRadius: '8px', marginBottom: '2rem', borderLeft: '4px solid #1976d2' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1976d2' }}>
              총 {quizzes.length}개의 문제가 생성되었습니다.
            </h3>
          </div>
          
          {/* 생성된 문제 상세 리스트 */}
          <div className="generated-quizzes-list">
            {quizzes.map((quiz, idx) => (
              <div key={quiz.id || idx} className="quiz-item-card" style={{ 
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
                    문제 {idx + 1} : 문단 순서 맞추기
                  </h3>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: '#666',
                    fontWeight: '500'
                  }}>
                    유형#01
                  </span>
                </div>

                <div className="problem-instruction" style={{
                  fontWeight: 500, 
                  fontSize: '0.95rem', 
                  background: '#f5f5f5', 
                  color: '#000', 
                  padding: '0.6rem 1rem', 
                  borderRadius: '0', 
                  marginBottom: quiz.format === 'exam' ? '1.5rem' : '1rem',
                  textAlign: 'center',
                  borderTop: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  {quiz.instruction || (quiz.format === 'exam' ? '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.' : '문제 : 다음 단락들을 의미에 맞게 가장 적절히 배열한 것을 고르세요.')}
                </div>
                
                {quiz.format === 'exam' && quiz.fixedParagraph ? (
                  <>
                    {/* 모의고사 형식: 고정된 첫 번째 단락을 박스 안에 표시 */}
                    <div className="fixed-paragraph-box" style={{
                      border: '1px solid #000',
                      borderRadius: '8px',
                      padding: '0.6rem 1rem',
                      marginTop: '1rem',
                      marginBottom: '1.5rem',
                      backgroundColor: '#fff',
                      fontSize: '1rem',
                      lineHeight: '1.6',
                      color: '#333'
                    }}>
                      {quiz.fixedParagraph}
                    </div>
                    
                    {/* 나머지 3개 단락 */}
                    <div className="problem-passage work01-passage" style={{ 
                      marginBottom: '1.5rem',
                      backgroundColor: '#ffffff',
                      background: '#ffffff',
                      border: '1px solid transparent'
                    }}>
                      {quiz.shuffledParagraphs.map((paragraph) => (
                        <div key={paragraph.id} className="shuffled-paragraph work01-paragraph" style={{ 
                          padding: '0.5rem 0', 
                          fontSize: '1rem', 
                          color: '#333',
                          lineHeight: '1.6',
                          marginBottom: '0.5rem',
                          border: '1px solid transparent',
                          backgroundColor: '#ffffff',
                          background: '#ffffff'
                        }}>
                          <strong>({paragraph.label}) </strong>{paragraph.content}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  /* 일반 형식: 기존 레이아웃 */
                  <div className="problem-passage work01-passage" style={{ 
                    marginBottom: '1.5rem',
                    backgroundColor: '#ffffff',
                    background: '#ffffff',
                    border: '1px solid transparent'
                  }}>
                    {quiz.shuffledParagraphs.map((paragraph) => (
                      <div key={paragraph.id} className="shuffled-paragraph work01-paragraph" style={{ 
                        padding: '0.5rem 0', 
                        fontSize: '1rem', 
                        color: '#333',
                        lineHeight: '1.6',
                        marginBottom: '0.5rem',
                        border: '1px solid transparent',
                        backgroundColor: '#ffffff',
                        background: '#ffffff'
                      }}>
                        <strong>({paragraph.label}) </strong>{paragraph.content}
                      </div>
                    ))}
                  </div>
                )}

                <div className="problem-options work01-options" style={{ 
                  marginTop: '1rem',
                  backgroundColor: '#ffffff',
                  background: '#ffffff',
                  border: '1px solid transparent'
                }}>
                  {quiz.choices.map((choice, cIdx) => (
                    <div key={cIdx} className="option work01-option" style={{ 
                      backgroundColor: '#ffffff',
                      background: '#ffffff',
                      border: '1px solid transparent',
                      borderRadius: '0',
                      padding: '0.5rem 1rem',
                      marginBottom: '0.5rem',
                      fontSize: '1rem',
                      lineHeight: '1.5',
                      color: '#333'
                    }}>
                      {['①', '②', '③', '④', '⑤'][cIdx]} {quiz.format === 'exam' ? choice.join(' - ') : choice.join(' → ')}
                      {cIdx === quiz.answerIndex && <span style={{ marginLeft: '10px', color: '#1976d2', fontWeight: 'bold', fontSize: '0.9rem' }}>(정답)</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="quiz-generator no-print">
      <div className="generator-header">
        <h2>메뉴#01. 문단 순서 맞추기</h2>
        <p>여러 개의 본문을 입력하여 한 번에 여러 문제를 생성할 수 있습니다.</p>
      </div>

      {/* 문제 형식 선택 */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '1rem', 
        background: '#f8f9fa', 
        borderRadius: '8px', 
        border: '1px solid #dee2e6',
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}>
        <span style={{ 
          fontSize: '1rem', 
          fontWeight: '600', 
          color: '#333' 
        }}>
          문제 형식 :
        </span>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="quizFormat"
              value="exam"
              checked={quizFormat === 'exam'}
              onChange={(e) => setQuizFormat(e.target.value as 'normal' | 'exam')}
            />
            <span>모의고사 형식</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="quizFormat"
              value="normal"
              checked={quizFormat === 'normal'}
              onChange={(e) => setQuizFormat(e.target.value as 'normal' | 'exam')}
            />
            <span>일반 문제 형식</span>
          </label>
        </div>
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
                <button 
                  className="icon-btn delete" 
                  onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                  title="삭제"
                >
                  🗑️
                </button>
                <span className="expand-icon">{item.isExpanded ? '🔼' : '🔽'}</span>
              </div>
            </div>

            {item.isExpanded && (
              <div className="input-item-content">
                {/* 입력 방식 선택 */}
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

                {/* 입력 UI */}
                {item.inputType === 'clipboard' && (
                  <div
                    className="input-guide"
                    tabIndex={0}
                    onPaste={(e) => handlePaste(item.id, e)}
                    style={{ minHeight: '120px' }}
                  >
                    <div className="drop-icon">📋</div>
                    <div className="drop-text">여기에 이미지를 붙여넣으세요 (Ctrl+V)</div>
                    {item.pastedImageUrl && (
                      <div className="preview-row">
                        <img src={item.pastedImageUrl} alt="Preview" className="preview-img" />
                      </div>
                    )}
                    {item.isExtracting && <div className="loading-text">텍스트 추출 중...</div>}
                  </div>
                )}

                {item.inputType === 'file' && (
                  <div className="input-guide" style={{ minHeight: '80px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(item.id, e)}
                      disabled={item.isExtracting}
                    />
                    {item.isExtracting && <span className="loading-text">추출 중...</span>}
                  </div>
                )}

                <textarea
                  value={item.text}
                  onChange={(e) => updateItem(item.id, { text: e.target.value })}
                  placeholder="추출된 영어 본문이 여기에 표시됩니다. 

캡처이미지 붙여넣기를 한 경우 '텍스트 추출 중...'이 완료된 후 '본문 추가하기'를 누르시거나 '일괄생성' 버튼을 눌러주세요.

직접 본문을 입력하거나 추출된 텍스트를 수정할 수 있습니다."
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

      <button onClick={addItem} className="add-item-button">
        ➕ 본문 추가하기
      </button>


      <button
        onClick={handleGenerateQuiz}
        disabled={isLoading}
        className="generate-button"
        style={{ marginTop: '20px' }}
      >
        {items.length > 1 
          ? `📋 ${items.filter(i => i.text.length > 0).length}개 문제 일괄 생성` 
          : '📋 문제 생성'}
      </button>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="centered-hourglass-overlay">
          <div className="centered-hourglass-content">
            <span className="centered-hourglass-spinner">⏳</span>
            <div className="loading-text">
              문제를 생성하고 있습니다...<br/>
              잠시만 기다려주세요.
            </div>
          </div>
        </div>
      )}

      <ScreenshotHelpModal
        isOpen={showScreenshotHelp}
        onClose={() => setShowScreenshotHelp(false)}
      />

      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={handlePointDeductionConfirm}
        pointsToDeduct={pointsToDeduct * items.filter(i => i.text.length >= 10).length}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - (pointsToDeduct * items.filter(i => i.text.length >= 10).length)}
        workTypeName={`문장 순서 맞추기 (${items.filter(i => i.text.length >= 10).length}문제)`}
      />
    </div>
  );
};

export default Work_01_ArticleOrder;
