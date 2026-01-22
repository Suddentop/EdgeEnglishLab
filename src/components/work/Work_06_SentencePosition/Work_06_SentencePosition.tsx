import React, { useState, ChangeEvent, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './Work_06_SentencePosition.css';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { extractTextFromImage } from '../../../services/common';
import { useAuth } from '../../../contexts/AuthContext';
import { generateWork06Quiz, type SentencePositionQuiz } from '../../../services/work06Service';
import PrintFormatWork06New from './PrintFormatWork06New';
import { processWithConcurrency } from '../../../utils/concurrency';

// 입력 아이템 인터페이스 (Work_05와 동일)
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

const Work_06_SentencePosition: React.FC = () => {
  const { userData, loading } = useAuth();
  
  // 상태 관리: 여러 아이템 지원
  const [items, setItems] = useState<InputItem[]>([
    { id: '1', inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }
  ]);
  
  const [quizzes, setQuizzes] = useState<(SentencePositionQuiz & { id?: string })[]>([]);
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

  // 이미지 → 텍스트 (개별 아이템용)
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
        console.log('포인트 설정 로드 결과:', points);
        
        if (Array.isArray(points) && points.length > 0) {
          setWorkTypePoints(points);
          
          // 유형#06의 포인트 설정
          const workType6Points = points.find(wt => wt.id === '6')?.points || 16; // 기본값 16
          setPointsToDeduct(workType6Points);
          console.log('유형#06 포인트 설정:', workType6Points);
        } else {
          console.warn('포인트 설정이 비어있거나 배열이 아닙니다. 기본값을 사용합니다.');
          // 기본 포인트 설정
          const defaultPoints = [
            { id: '6', name: '유형#06', points: 16, description: '문장 위치 추론 문제' }
          ];
          setWorkTypePoints(defaultPoints);
          setPointsToDeduct(16); // Work_06 기본값
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
          { id: '6', name: '유형#06', points: 16, description: '문장 위치 추론 문제' }
        ];
        setWorkTypePoints(defaultPoints);
        setPointsToDeduct(16);
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
    const workType = workTypePoints.find(wt => wt.id === '6');
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
      const workType = workTypePoints.find(wt => wt.id === '6');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const requiredPoints = workType.points * validItems.length;
      const deductionResult = await deductUserPoints(
        userData.uid,
        '6',
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
      const passageGroups = new Map<string, { items: typeof validItems, selectedSentences: string[] }>();
      
      validItems.forEach(item => {
        const passage = item.text.trim();
        if (!passageGroups.has(passage)) {
          passageGroups.set(passage, { items: [], selectedSentences: [] });
        }
        passageGroups.get(passage)!.items.push(item);
      });

      const generatedQuizzes: (SentencePositionQuiz & { id?: string })[] = [];

      // 각 본문 그룹별로 순차 처리 (동일 본문 내에서 이전 선택 추적)
      for (const [passage, group] of Array.from(passageGroups.entries())) {
        console.log(`📝 본문 그룹 처리 시작: "${passage.substring(0, 50)}..." (${group.items.length}개 아이템)`);
        
        // 동일 본문 내에서는 순차 처리
        for (let i = 0; i < group.items.length; i++) {
          const item = group.items[i];
          
          try {
            console.log(`  🔄 아이템 ${i + 1}/${group.items.length} 처리 중...`);
            console.log(`  📌 이전 선택 문장: ${group.selectedSentences.length > 0 ? group.selectedSentences.map(s => s.substring(0, 50) + '...').join(', ') : '없음'}`);
            
            // 이전 선택 문장을 포함하여 문제 생성
            const quizData = await generateWork06Quiz(passage, group.selectedSentences);
            
            const quizDataWithId: SentencePositionQuiz & { id?: string } = { 
              ...quizData, 
              id: item.id
            };
            
            // 생성된 문제의 정답 문장(missingSentence)을 이전 선택 목록에 추가
            const selectedSentence = quizData.missingSentence;
            group.selectedSentences.push(selectedSentence);
            console.log(`  ✅ 정답 문장 "${selectedSentence.substring(0, 50)}${selectedSentence.length > 50 ? '...' : ''}" 선택됨 (이제 제외 목록에 추가됨)`);
            
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

      // 문제 생성 이력 저장 (여러 퀴즈를 배열로 저장)
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          const workType = workTypePoints.find(wt => wt.id === '6');
          const requiredPoints = workType ? workType.points * validItems.length : 0;
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '06',
            workTypeName: getWorkTypeName('06'),
            points: requiredPoints, // 실제 차감된 포인트 (workType.points * validItems.length)
            inputText: validItems.map(item => item.text.trim()).join('\n\n---\n\n'),
            quizData: generatedQuizzes, // 배열로 저장
            status: 'success'
          });
          console.log('✅ Work_06 이력 저장 완료', generatedQuizzes.length, '개 문제');
        } catch (historyError) {
          console.error('❌ Work_06 이력 저장 실패:', historyError);
        }
      }
      
    } catch (err: any) {
      console.error('문장 위치 문제 생성 오류:', err);
      
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '문장 위치 문제 생성',
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
    setItems([{ id: Date.now().toString(), inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }]);
  };

  // 인쇄 핸들러 (Work_05 방식 적용)
  const triggerPrint = (mode: 'no-answer' | 'with-answer') => {
    if (quizzes.length === 0) return;
    
    console.log('🖨️ 인쇄 시작:', mode);
    
    const styleId = 'print-style-work06-landscape';
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
    printContainer.id = mode === 'with-answer' ? 'print-root-work06-new-answer' : 'print-root-work06-new';
    document.body.appendChild(printContainer);

    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatWork06New quizzes={quizzes} isAnswerMode={mode === 'with-answer'} />);

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

  // 문제 생성 후 표시 UI
  if (quizzes.length > 0) {
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#06. 문장 위치 찾기 문제 (총 {quizzes.length}문제)</h2>
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
              
              return (
                <div key={quizId} className="quiz-item-card" style={{ 
                  marginBottom: '2rem', 
                  padding: '1.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0'
                }}>
                  <div className="quiz-item-header work06-header" style={{ 
                    marginBottom: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '0.5rem'
                  }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                      문제 {idx + 1} : 문장 위치 찾기
                    </h3>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      유형#06
                    </span>
                  </div>

                  <div className="problem-instruction work06-instruction" style={{
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
                    글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳을 고르시오.
                  </div>

                  <div className="missing-sentence-box work06-missing-sentence" style={{
                    border: '2px solid #222',
                    borderRadius: '6px',
                    background: '#ffffff',
                    backgroundColor: '#ffffff',
                    padding: '0.8em 1.2em',
                    marginTop: '0.5rem',
                    marginBottom: '1.5rem',
                    fontWeight: 700,
                    fontSize: '1rem'
                  }}>
                    <span style={{ color: '#222' }}>주요 문장 :  </span><span style={{ color: '#000' }}>{quiz.missingSentence}</span>
                  </div>
                  
                  <div className="problem-passage work06-passage" style={{
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    margin: '0 0 1.5rem 0',
                    background: '#ffffff',
                    backgroundColor: '#ffffff',
                    border: '1px solid transparent',
                    padding: '1rem',
                    fontFamily: 'inherit',
                    color: '#333',
                    whiteSpace: 'pre-line'
                  }}>
                    {quiz.numberedPassage}
                  </div>

                  {quiz.translation && (
                    <div className="translation-section" style={{ marginTop: '2rem' }}>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석:</h3>
                      <div className="translation-content work06-translation" style={{
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
      </div>
    );
  }

  // 입력/옵션/버튼 UI
  return (
    <div className="quiz-generator">
      <div className="generator-header">
        <h2>메뉴#06. 문장 위치 찾기 문제 생성</h2>
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
        {items.filter(i => i.text.length >= 10).length > 1 ? `📋 ${items.filter(i => i.text.length >= 10).length}개 문제 일괄 생성` : '📋 문장 위치 찾기 문제 생성'}
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
        workTypeName={`문장 위치 찾기 문제 생성 (${items.filter(i => i.text.length >= 10).length}문제)`}
        pointsToDeduct={pointsToDeduct}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - pointsToDeduct}
      />
    </div>
  );
};

export default Work_06_SentencePosition;
