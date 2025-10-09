import React, { useState } from 'react';
import './Package_02_TwoStepQuiz.css';

const Package_02_TwoStepQuiz: React.FC = () => {
  const [inputMethod, setInputMethod] = useState<'screenshot' | 'image' | 'text'>('text');
  const [englishText, setEnglishText] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({
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

  const workTypes = [
    { id: '01', name: '문단 순서 맞추기', points: 200 },
    { id: '02', name: '독해 문제', points: 200 },
    { id: '03', name: '빈칸(단어) 문제', points: 200 },
    { id: '04', name: '빈칸(구) 문제', points: 200 },
    { id: '05', name: '빈칸(문장) 문제', points: 200 },
    { id: '06', name: '문장 위치 찾기', points: 200 },
    { id: '07', name: '주제 추론', points: 200 },
    { id: '08', name: '제목 추론', points: 200 },
    { id: '09', name: '어법 오류 문제', points: 200 },
    { id: '10', name: '다중 어법 오류 문제', points: 200 },
    { id: '11', name: '본문 문장별 해석', points: 200 },
    { id: '12', name: '빈칸 채우기 문제 (단어-주관식)', points: 200 },
    { id: '13', name: '빈칸 채우기 문제 (문장-주관식)', points: 200 },
    { id: '14', name: '빈칸 채우기 문제 (문장-주관식)', points: 200 }
  ];

  const handleInputMethodChange = (method: 'screenshot' | 'image' | 'text') => {
    setInputMethod(method);
  };

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev => ({
      ...prev,
      [typeId]: !prev[typeId]
    }));
  };

  const handleDeselectAll = () => {
    setSelectedTypes(prev => {
      const newState: Record<string, boolean> = {};
      Object.keys(prev).forEach(key => {
        newState[key] = false;
      });
      return newState;
    });
  };

  const handleGenerateQuiz = () => {
    // TODO: 구현 예정
    alert('패키지 퀴즈 2단 생성 기능은 구현 예정입니다.');
  };

  const getSelectedCount = () => {
    return Object.values(selectedTypes).filter(Boolean).length;
  };

  return (
    <div className="package-02-container">
      <div className="package-02-header">
        <h1>📦 패키지 퀴즈 (2단)</h1>
        <p>하나의 영어 본문으로 유형#01부터 #14까지 모든 유형의 문제를 두 단계로 생성합니다.</p>
      </div>

      {/* 입력 방법 선택 */}
      <div className="input-method-section">
        <div className="input-method-options">
          <label className={`input-method-option ${inputMethod === 'screenshot' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="inputMethod"
              value="screenshot"
              checked={inputMethod === 'screenshot'}
              onChange={() => handleInputMethodChange('screenshot')}
            />
            <span className="option-icon">🖥️▶️</span>
            <span className="option-text">캡처화면 붙여넣기</span>
            <span className="help-icon">❓</span>
          </label>

          <label className={`input-method-option ${inputMethod === 'image' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="inputMethod"
              value="image"
              checked={inputMethod === 'image'}
              onChange={() => handleInputMethodChange('image')}
            />
            <span className="option-icon">🖼️</span>
            <span className="option-text">이미지 파일 첨부</span>
          </label>

          <label className={`input-method-option ${inputMethod === 'text' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="inputMethod"
              value="text"
              checked={inputMethod === 'text'}
              onChange={() => handleInputMethodChange('text')}
            />
            <span className="option-icon">✍️</span>
            <span className="option-text">영어 본문 직접 붙여넣기</span>
          </label>
        </div>
      </div>

      {/* 영어 본문 입력 */}
      {inputMethod === 'text' && (
        <div className="text-input-section">
          <div className="section-header">
            <h3>영어 본문 직접 붙여넣기: (2,000자 미만 권장)</h3>
            <div className="warning-box">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
            </div>
          </div>
          <textarea
            value={englishText}
            onChange={(e) => setEnglishText(e.target.value)}
            placeholder="영어 본문을 직접 붙여넣어 주세요. 최소 100자 이상 권장합니다."
            className="english-textarea"
          />
          <div className="character-count">
            글자 수: {englishText.length}자
          </div>
        </div>
      )}

      {/* 문제 유형 선택 */}
      <div className="problem-type-section">
        <div className="section-header">
          <h3>생성할 문제 유형 선택</h3>
          <button 
            className="deselect-all-btn"
            onClick={handleDeselectAll}
          >
            전체 해제
          </button>
        </div>
        <div className="problem-types-grid">
          {workTypes.map(type => (
            <label key={type.id} className="problem-type-item">
              <input
                type="checkbox"
                checked={selectedTypes[type.id]}
                onChange={() => handleTypeToggle(type.id)}
              />
              <span className="type-number">#{type.id}</span>
              <span className="type-name">{type.name}</span>
              <span className="type-points">({type.points}P)</span>
            </label>
          ))}
        </div>
      </div>

      {/* 생성 버튼 */}
      <div className="generate-section">
        <button 
          className="generate-btn"
          onClick={handleGenerateQuiz}
          disabled={getSelectedCount() === 0}
        >
          패키지 퀴즈 (2단) 생성
        </button>
      </div>
    </div>
  );
};

export default Package_02_TwoStepQuiz;
