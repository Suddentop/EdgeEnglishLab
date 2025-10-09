import React, { useState, useRef, ChangeEvent } from 'react';
import './Package_02_TwoStepQuiz.css';

const Package_02_TwoStepQuiz: React.FC = () => {
  const [inputMode, setInputMode] = useState<'capture' | 'image' | 'text'>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<Record<string, boolean>>({
    '01': true,
    '02': true,
    '03': true,
    '04': true,
    '05': true,
    '06': true,
    '07': true,
    '08': true,
    '09': true,
    '10': true,
    '11': true,
    '12': true,
    '13': true,
    '14': true
  });

  const WORK_TYPES = [
    { id: '01', name: '문단 순서 맞추기' },
    { id: '02', name: '유사단어 독해' },
    { id: '03', name: '빈칸(단어) 찾기' },
    { id: '04', name: '빈칸(구) 찾기' },
    { id: '05', name: '빈칸(문장) 찾기' },
    { id: '06', name: '문장 위치 찾기' },
    { id: '07', name: '주제 추론' },
    { id: '08', name: '제목 추론' },
    { id: '09', name: '어법 오류 찾기' },
    { id: '10', name: '다중 어법 오류 찾기' },
    { id: '11', name: '본문 문장별 해석' },
    { id: '12', name: '단어 학습' },
    { id: '13', name: '빈칸 채우기 (단어-주관식)' },
    { id: '14', name: '빈칸 채우기 (문장-주관식)' }
  ];

  const handleInputModeChange = (mode: 'capture' | 'image' | 'text') => {
    setInputMode(mode);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleWorkTypeToggle = (typeId: string) => {
    setSelectedWorkTypes(prev => ({
      ...prev,
      [typeId]: !prev[typeId]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedWorkTypes).every(selected => selected);
    const newState: Record<string, boolean> = {};
    Object.keys(selectedWorkTypes).forEach(key => {
      newState[key] = !allSelected;
    });
    setSelectedWorkTypes(newState);
  };

  // 이미지 파일 선택 핸들러
  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // TODO: 이미지에서 텍스트 추출 기능 구현
    }
  };

  // 붙여넣기(클립보드) 이미지 처리
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    console.log('📋 붙여넣기 이벤트 발생:', { inputMode, clipboardItems: e.clipboardData.items.length });
    
    if (inputMode !== 'capture') {
      console.log('❌ 캡처 모드가 아님:', inputMode);
      return;
    }
    
    const items = e.clipboardData.items;
    console.log('📋 클립보드 아이템 수:', items.length);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`📋 아이템 ${i}:`, { type: item.type, kind: item.kind });
      
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          console.log('📸 이미지 파일 발견:', { size: blob.size, type: blob.type });
          setIsExtractingText(true);
          
          try {
            // TODO: OpenAI Vision API를 사용한 텍스트 추출 구현
            // const extractedText = await extractTextFromImage(blob);
            // setInputText(extractedText);
            console.log('✅ 텍스트 추출 완료 (구현 예정)');
          } catch (error) {
            console.error('❌ 텍스트 추출 실패:', error);
            alert('이미지에서 텍스트를 추출하는데 실패했습니다.');
          } finally {
            setIsExtractingText(false);
          }
        }
        break;
      }
    }
  };

  const handleGenerateQuiz = () => {
    // TODO: 구현 예정
    alert('패키지 퀴즈 A4용지 2단 생성 기능은 구현 예정입니다.');
  };

  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>📦 패키지 퀴즈 (A4용지 2단)</h2>
        <p>하나의 영어 본문으로 필요한 유형들을 A4용지 2단으로 구성해서 생성합니다.</p>
      </div>
      <div className="input-type-section">
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'capture'}
            onChange={() => handleInputModeChange('capture')}
          />
          📸 캡처화면 붙여넣기
        </label>
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'image'}
            onChange={() => handleInputModeChange('image')}
          />
          🖼️ 이미지 파일 첨부
        </label>
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'text'}
            onChange={() => handleInputModeChange('text')}
          />
          ✍️ 영어 본문 직접 붙여넣기
        </label>
      </div>

      {inputMode === 'capture' && (
        <div>
          <div
            className={`input-guide${isPasteFocused ? ' paste-focused' : ''}`}
            tabIndex={0}
            onClick={() => setIsPasteFocused(true)}
            onFocus={() => setIsPasteFocused(true)}
            onBlur={() => setIsPasteFocused(false)}
            onPaste={handlePaste}
          >
            <div className="drop-icon">📋</div>
            <div className="drop-text">Ctrl+V로 캡처한 이미지를 붙여넣으세요</div>
            <div className="drop-desc">스크린샷이나 사진을 클립보드에 복사한 후 여기에 붙여넣기 하세요</div>
            <div style={{fontSize: '0.9rem', color: '#666', marginTop: '0.5rem'}}>
              💡 <b>팁:</b> 화면 캡처 후 Ctrl+V로 붙여넣기
            </div>
            {isExtractingText && (
              <div style={{color:'#6a5acd', fontWeight:600, marginTop:'0.7rem'}}>
                OpenAI Vision 처리 중...
              </div>
            )}
          </div>
          {/* 캡처 모드에서도 텍스트가 추출되면 글자수 표시 */}
          {inputText && (
            <div className="text-info" style={{marginTop: '0.5rem'}}>
              <span>글자 수: {inputText.length}자</span>
            </div>
          )}
        </div>
      )}

      {inputMode === 'image' && (
        <div>
          <div className="file-upload-row">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              id="fileInput"
              style={{ display: 'none' }}
            />
            <label htmlFor="fileInput" className="file-upload-btn">
              📁 파일 선택
            </label>
            <div className="file-upload-status">
              {imageFile ? imageFile.name : '선택된 파일이 없습니다'}
            </div>
          </div>
          {/* 이미지 모드에서도 텍스트가 추출되면 글자수 표시 */}
          {inputText && (
            <div className="text-info" style={{marginTop: '0.5rem'}}>
              <span>글자 수: {inputText.length}자</span>
            </div>
          )}
        </div>
      )}

      {inputMode === 'text' && (
        <div className="input-section">
          <div className="input-label-row">
            <label htmlFor="textInput" className="input-label">
              영어 본문 직접 붙여넣기: (2,000자 미만 권장)
            </label>
            {inputText.length < 100 && (
              <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
            )}
          </div>
          <textarea
            id="textInput"
            ref={textAreaRef}
            value={inputText}
            onChange={handleTextChange}
            placeholder="영어 본문을 직접 붙여넣어 주세요. 최소 100자 이상 권장합니다."
            className="text-input"
            rows={8}
          />
          <div className="text-info">
            <span>글자 수: {inputText.length}자</span>
          </div>
        </div>
      )}

      <div className="work-types-selection">
        <div className="work-types-header">
          <h3>생성할 문제 유형 선택</h3>
          <button 
            type="button" 
            className="select-all-button"
            onClick={handleSelectAll}
          >
            {Object.values(selectedWorkTypes).every(selected => selected) ? '전체 해제' : '전체 선택'}
          </button>
        </div>
        <div className="work-types-grid">
          {WORK_TYPES.map(type => (
            <label key={type.id} className="work-type-checkbox">
              <input
                type="checkbox"
                checked={selectedWorkTypes[type.id] || false}
                onChange={() => handleWorkTypeToggle(type.id)}
              />
              <div className="checkbox-label">
                <span className="work-type-id">#{type.id}</span>
                <span className="work-type-name">{type.name}</span>
                <span className="work-type-points">(200P)</span>
              </div>
            </label>
          ))}
        </div>
      </div>
      
      <button
        type="button"
        className="generate-button"
        onClick={handleGenerateQuiz}
      >
        패키지 퀴즈 (A4용지 2단) 생성
      </button>
    </div>
  );
};

export default Package_02_TwoStepQuiz;
