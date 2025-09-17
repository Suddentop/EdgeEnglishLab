import React, { useState, useRef, useEffect } from 'react';
import { createQuiz } from '../../../utils/textProcessor';
import { Quiz } from '../../../types/types';
import { isAIServiceAvailable } from '../../../services/aiParagraphService';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../Work_02_ReadingComprehension/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { useAuth } from '../../../contexts/AuthContext';
import PrintHeader from '../../common/PrintHeader';
import './Work_01_SentenceOrderTest.css';
import '../../../styles/PrintFormat.css';

interface Work_01_SentenceOrderTestProps {
  onQuizGenerated: (quiz: Quiz) => void;
}

type InputType = 'clipboard' | 'file' | 'text';
type PrintMode = 'none' | 'no-answer' | 'with-answer';

// 파일 → base64 변환
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// OpenAI Vision API 호출
async function callOpenAIVisionAPI(imageBase64: string, prompt: string, apiKey: string): Promise<string> {
  console.log('OpenAI Vision API Key:', apiKey); // 디버깅용
  if (!apiKey) throw new Error('API Key가 비어 있습니다. .env 파일과 개발 서버 재시작을 확인하세요.');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }
      ],
      max_tokens: 2048
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    console.error('OpenAI Vision API 응답:', errText);
    throw new Error('OpenAI Vision API 호출 실패: ' + errText);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

const visionPrompt = `영어문제로 사용되는 본문이야.\n이 이미지의 내용을 수작업으로 정확히 읽고, 영어 본문만 추려내서 보여줘.\n글자는 인쇄글씨체 이외에 손글씨나 원, 밑줄 등 표시되어있는 것은 무시해. 본문중에 원문자 1, 2, 3... 등으로 표시된건 제거해줘. 원문자 제거후 줄을 바꾸거나 문단을 바꾸지말고, 전체가 한 문단으로 구성해줘. 영어 본문만, 아무런 설명이나 안내문 없이, 한 문단으로만 출력해줘.`;

// OpenAI Vision 결과에서 안내문 제거
function cleanOpenAIVisionResult(text: string): string {
  // "Sure! ..." 또는 "Here is ..." 등 안내문 제거
  return text.replace(/^(Sure!|Here is|Here are|Here's|Here's)[^\n:]*[:：]?\s*/i, '').trim();
}

const Work_01_SentenceOrderTest: React.FC<Work_01_SentenceOrderTestProps> = ({ onQuizGenerated }) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [inputType, setInputType] = useState<InputType>('text');
  const [tooltip, setTooltip] = useState('');
  const [pastedImageUrl, setPastedImageUrl] = useState<string | null>(null);
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const aiAvailable = isAIServiceAvailable();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [showScreenshotHelp, setShowScreenshotHelp] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  
  // 포인트 관련 상태
  const { userData, loading } = useAuth();
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<number>(0);

  // 포인트 초기화
  useEffect(() => {
    const initializePoints = async () => {
      if (!loading && userData) {
        try {
          const [workTypePointsData, userPoints] = await Promise.all([
            getWorkTypePoints(),
            getUserCurrentPoints(userData.uid)
          ]);
          
          const currentWorkTypePoints = workTypePointsData.find(wt => wt.id === '1')?.points || 0;
          setWorkTypePoints(currentWorkTypePoints);
          setPointsToDeduct(currentWorkTypePoints);
          setUserCurrentPoints(userPoints);
        } catch (error) {
          console.error('포인트 초기화 오류:', error);
        }
      }
    };

    initializePoints();
  }, [userData, loading]);

  // Vision API로 이미지에서 영어 본문 추출
  const handleImageToText = async (image: File | Blob) => {
    setIsVisionLoading(true);
    setIsLoading(true);
    setTooltip('');
    setError('');
    try {
      if (image instanceof Blob) {
        setPastedImageUrl(URL.createObjectURL(image));
      }
      const imageBase64 = await fileToBase64(image as File);
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
      const resultText = await callOpenAIVisionAPI(imageBase64, visionPrompt, apiKey);
      setText(cleanOpenAIVisionResult(resultText));
      setPastedImageUrl(null);
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.style.height = 'auto';
          textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
        }
      }, 0);
    } catch (err: any) {
      setError('OpenAI Vision API 호출 실패: ' + (err?.message || err));
      setPastedImageUrl(null);
    } finally {
      setIsVisionLoading(false);
      setIsLoading(false);
    }
  };

  // 붙여넣기(클립보드) 이미지 처리
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (inputType !== 'clipboard') return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageToText(file);
        }
        e.preventDefault();
        return;
      }
    }
    setTooltip('캡처 이미지가 감지되지 않았습니다. 이미지를 붙여넣어 주세요.');
    e.preventDefault();
  };

  // 파일 업로드 이미지 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setTooltip('이미지 파일만 첨부 가능합니다.');
      return;
    }
    handleImageToText(file);
  };

  // 입력방식 변경 시 상태 초기화
  const handleInputTypeChange = (type: InputType) => {
    setInputType(type);
    setTooltip('');
    setError('');
    setText('');
    if (type === 'file' && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  };

  const handleGenerateQuiz = async () => {
    if (!text.trim()) {
      setError('영어 본문을 입력해 주세요.');
      return;
    }

    // 로그인 및 포인트 확인
    if (loading) {
      setError('로그인 정보를 확인 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (!userData || !userData.uid) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (userCurrentPoints < pointsToDeduct) {
      setError(`포인트가 부족합니다. 현재 ${userCurrentPoints}포인트, 필요 ${pointsToDeduct}포인트`);
      return;
    }

    // 포인트 차감 확인 모달 표시
    setShowPointModal(true);
  };

  // 포인트 차감 확인 후 문제 생성 실행
  const handlePointDeductionConfirm = async () => {
    setShowPointModal(false);
    setIsLoading(true);
    setError('');

    try {
      // 포인트 차감
      const deductionResult = await deductUserPoints(
        userData!.uid, 
        '1', 
        '문장 순서 테스트',
        userData!.displayName || '사용자',
        userData!.nickname || '사용자'
      );
      
      if (deductionResult.success) {
        setUserCurrentPoints(deductionResult.remainingPoints);
        
        // 문제 생성
        const quiz = await createQuiz(text, useAI);
        setQuiz(quiz);
        onQuizGenerated(quiz);
      } else {
        throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
      }
    } catch (err) {
      // 오류 발생 시 포인트 환불
      try {
        await refundUserPoints(
          userData!.uid, 
          pointsToDeduct,
          '문장 순서 테스트',
          userData!.displayName || '사용자',
          userData!.nickname || '사용자'
        );
        // 환불 후 현재 포인트 다시 가져오기
        const updatedPoints = await getUserCurrentPoints(userData!.uid);
        setUserCurrentPoints(updatedPoints);
      } catch (refundError) {
        console.error('포인트 환불 실패:', refundError);
      }
      setError(err instanceof Error ? err.message : '문제 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 인쇄 함수들
  const handlePrintNoAnswer = () => {
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
    setPrintMode('none');
    setText('');
    setPastedImageUrl(null);
    setIsPasteFocused(false);
  };

  // 문제가 생성된 경우 문제 표시
  if (quiz) {
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">문장 순서 테스트 문제</h2>
            <div className="quiz-header-buttons no-print">
              <button onClick={resetQuiz} className="reset-button">새 문제 만들기</button>
              <button onClick={handlePrintNoAnswer} className="print-button styled-print">
                🖨️ 인쇄 (문제)
              </button>
              <button onClick={handlePrintWithAnswer} className="print-button styled-print">
                🖨️ 인쇄 (정답)
              </button>
            </div>
          </div>
          <div className="quiz-content">
            <div className="problem-instruction">
              문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요
            </div>
            <div className="problem-passage">
              {quiz.originalText}
            </div>
            <div className="problem-options">
              {quiz.choices.map((choice, index) => (
                <div key={index} className="option">
                  {['①', '②', '③', '④', '⑤'][index]} {choice.join(' → ')}
                </div>
              ))}
            </div>
            <div className="screen-answer-footer" style={{color: '#1976d2', fontWeight: 700, fontSize: '1.1rem', textAlign: 'center', marginTop: '2rem', padding: '0.8rem', backgroundColor: '#f0f7ff', borderRadius: '8px', border: '2px solid #1976d2'}}>
              정답: {['①', '②', '③', '④', '⑤'][quiz.answerIndex]}
            </div>
          </div>
        </div>

        {/* 인쇄용 문제 (정답 없음) */}
        {printMode === 'no-answer' && (
          <div className="only-print">
            <div style={{ marginTop: '1cm' }}>
              <PrintHeader />
            </div>
            <div className="quiz-print-body">

              <div className="quiz-content">
                <div className="problem-instruction">
                  문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요
                </div>
                <div className="problem-passage">
                  {quiz.originalText}
                </div>
                <div className="problem-options">
                  {quiz.choices.map((choice, index) => (
                    <React.Fragment key={index}>
                      <div className="option">
                        {['①', '②', '③', '④', '⑤'][index]} {choice.join(' → ')}
                      </div>
                      {index < 4 && (
                        <hr className="option-separator" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="print-footer" style={{marginTop: '3rem', fontSize: '0.8rem', color: '#444', textAlign: 'center'}}>
                이 문서 및 시험지는 Edge English Lab에서 생성되었으며, 모든 저작권은 Edge English Lab에 귀속됩니다.
              </div>
            </div>
          </div>
        )}

        {/* 인쇄용 문제 (정답 포함) */}
        {printMode === 'with-answer' && (
          <div className="only-print work-01-print">
            <div className="print-header-margin" style={{marginTop: '1cm'}}>
              <PrintHeader />
            </div>
            <div className="quiz-print-body">

              <div className="quiz-content">
                <div className="problem-instruction">
                  문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요
                </div>
                <div className="problem-passage">
                  {quiz.originalText}
                </div>
                <div className="problem-options">
                  {quiz.choices.map((choice, index) => (
                    <React.Fragment key={index}>
                      <div className="option option-print">
                        {['①', '②', '③', '④', '⑤'][index]} {choice.join(' → ')}
                      </div>
                      {index < quiz.choices.length - 1 && (
                        <div className="choice-separator" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <hr style={{
                  border: 'none',
                  borderTop: '3px solid #000', 
                  marginTop: '1.5rem', 
                  marginBottom: '1rem',
                  width: '100%',
                  height: '3px',
                  backgroundColor: '#000',
                  display: 'block'
                }} />
                <div className="problem-answer" style={{marginTop:'0.5rem', color:'#1976d2', fontWeight:700}}>
                  정답: {['①', '②', '③', '④', '⑤'][quiz.answerIndex]}
                </div>
              </div>
              <div className="print-footer" style={{marginTop: '3rem', fontSize: '0.8rem', color: '#444', textAlign: 'center'}}>
                이 문서 및 시험지는 Edge English Lab에서 생성되었으며, 모든 저작권은 Edge English Lab에 귀속됩니다.
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>[유형#01] 문맥에 맞게 배열하기</h2>
        <p>영어 본문을 문맥에 맞게 분할하여 배열하는 문제를 생성합니다.</p>
      </div>
      {/* 입력 방식 선택 */}
      <div className="input-type-section">
        <label>
          <input
            type="radio"
            name="inputType"
            checked={inputType === 'clipboard'}
            onChange={() => handleInputTypeChange('clipboard')}
          />
          📸 캡처화면 붙여넣기
          <button
            type="button"
            className="screenshot-help-btn"
            onClick={(e) => {
              e.preventDefault();
              setShowScreenshotHelp(true);
            }}
            title="화면 캡처 방법 보기"
          >
            ?
          </button>
        </label>
        <label>
          <input
            type="radio"
            name="inputType"
            checked={inputType === 'file'}
            onChange={() => handleInputTypeChange('file')}
          />
          🖼️ 이미지 파일 첨부
        </label>
        <label>
          <input
            type="radio"
            name="inputType"
            checked={inputType === 'text'}
            onChange={() => handleInputTypeChange('text')}
          />
          ✍️ 영어 본문 직접 붙여넣기
        </label>
      </div>

      {/* 입력 방식별 안내 및 입력 UI */}
      {inputType === 'clipboard' && (
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
          {pastedImageUrl && (
            <div className="preview-row">
              <img src={pastedImageUrl} alt="붙여넣은 이미지 미리보기" className="preview-img" />
              {isVisionLoading && <span className="loading-text">OpenAI Vision 처리 중...</span>}
            </div>
          )}
          {isVisionLoading && !pastedImageUrl && (
            <div className="loading-text">OpenAI Vision 처리 중...</div>
          )}
          {tooltip && <div className="error-text">{tooltip}</div>}
        </div>
      )}
      {inputType === 'file' && (
        <div className="input-guide">
          <div className="file-upload-row">
            <label htmlFor="file-upload" className="file-upload-btn">
              파일 선택
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isLoading}
                style={{ display: 'none' }}
              />
            </label>
            <span className="file-upload-status">
              {fileInputRef.current && fileInputRef.current.files && fileInputRef.current.files.length > 0
                ? fileInputRef.current.files[0].name
                : '선택된 파일 없음'}
            </span>
          </div>
        </div>
      )}
      {/* OCR/입력 결과 textarea */}
      <div className="input-section">
        <div className="input-label-row">
          <label htmlFor="text-input" className="input-label">
            영어 본문 직접 붙여넣기:
          </label>
          {text.length < 100 && (
            <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
          )}
        </div>
        <textarea
          id="text-input"
          ref={textAreaRef}
          value={text}
          onChange={handleTextChange}
          placeholder="영어 본문을 직접 붙여넣어 주세요. 최소 100자 이상 권장합니다."
          className="text-input"
          rows={8}
          style={{overflow: 'hidden', resize: 'none'}}
          disabled={inputType !== 'text'}
        />
        <div className="text-info">
          <span>글자 수: {text.length}자</span>
        </div>
        {tooltip && <div className="tooltip">{tooltip}</div>}
        {isVisionLoading && <div style={{color:'#6a5acd', fontWeight:600, marginTop:'0.5rem'}}>OpenAI Vision 처리 중...</div>}
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* 분할 방식 선택 (문제 생성 버튼 위로 이동) */}
      <div className="ai-option-section">
        <div className="option-group">
          <label className="option-label">
            <input
              type="radio"
              name="splitMethod"
              checked={!useAI}
              onChange={() => setUseAI(false)}
            />
            <span className="option-text">📋 규칙 기반 분할 (기본)</span>
          </label>
          <p className="option-description">전환어와 문장 수를 기준으로 단락을 분할합니다.</p>
        </div>
        <div className="option-group">
          <label className="option-label">
            <input
              type="radio"
              name="splitMethod"
              checked={useAI}
              onChange={() => setUseAI(true)}
              disabled={!aiAvailable}
            />
            <span className="option-text">🤖 AI 기반 의미 분할 (고급)</span>
          </label>
          <p className="option-description">
            {aiAvailable
              ? 'OpenAI GPT-4가 의미와 주제를 분석하여 자연스럽게 단락을 분할합니다.'
              : 'AI 서비스가 현재 이용할 수 없습니다. 규칙 기반 분할을 사용해주세요.'}
          </p>
          {!aiAvailable && (
            <div className="service-unavailable">⚠️ AI 기능이 일시적으로 이용할 수 없습니다.</div>
          )}
        </div>
      </div>

      {/* 포인트 컨테이너 */}
      <div className="points-container" style={{border: '1px solid #000'}}>
        <div className="points-info">
          <span className="points-text">포인트</span>
          <div className="points-details">
            <span className="current-points-display">현재 보유: {userCurrentPoints.toLocaleString()}포인트</span>
            <span className="deduction-info">차감: {pointsToDeduct.toLocaleString()}포인트</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerateQuiz}
        disabled={isLoading || !text.trim()}
        className="generate-button"
      >
        {isLoading ? (
          <>
            <span className="loading-spinner"></span>
            {useAI ? '🤖 AI 분석 중...' : '📋 문제 생성 중...'}
          </>
        ) : (
          <>
            {useAI ? '🤖 AI로 문제 생성' : '📋 문제 생성'}
          </>
        )}
      </button>
      
      {/* 화면 캡처 도움말 모달 */}
      <ScreenshotHelpModal
        isOpen={showScreenshotHelp}
        onClose={() => setShowScreenshotHelp(false)}
      />

      {/* 포인트 차감 확인 모달 */}
      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={handlePointDeductionConfirm}
        pointsToDeduct={pointsToDeduct}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - pointsToDeduct}
        workTypeName="문장 순서 테스트"
      />
    </div>
  );
};

export default Work_01_SentenceOrderTest; 