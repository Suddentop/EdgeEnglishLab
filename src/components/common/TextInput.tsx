import React, { useRef } from 'react';

interface TextInputProps {
  text: string;
  onTextChange: (text: string) => void;
  onCreateQuiz: () => void;
  isLoading: boolean;
}

const TextInput: React.FC<TextInputProps> = ({
  text,
  onTextChange,
  onCreateQuiz,
  isLoading
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(e.target.value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  };

  return (
    <div className="text-input-container">
      <h2>영어 본문 직접 붙여넣기</h2>
      <div className="input-section">
        <label htmlFor="text-input">
          영어 본문을 직접 붙여넣어 주세요. 본문은 4개의 의미있는 단락으로 나뉩니다.
        </label>
        <textarea
          id="text-input"
          ref={textAreaRef}
          value={text}
          onChange={handleChange}
          placeholder="영어 본문을 여기에 직접 붙여넣어 주세요..."
          rows={10}
          className="text-area"
          style={{overflow: 'hidden', resize: 'none'}}
        />
        <div className="button-container">
          <button
            onClick={onCreateQuiz}
            disabled={!text.trim() || isLoading}
            className="create-button"
          >
            {isLoading ? '문제 생성 중...' : '문제 생성하기'}
          </button>
        </div>
      </div>
      
      <div className="instructions">
        <h3>사용 방법:</h3>
        <ul>
          <li>영어 본문을 입력하세요 (최소 4개의 문장 이상 권장)</li>
          <li>본문은 자동으로 4개의 의미있는 단락으로 나뉩니다</li>
          <li>첫 번째 단락은 (A)로 고정됩니다</li>
          <li>나머지 3개 단락은 (B), (C), (D)로 섞여서 제시됩니다</li>
          <li>학생은 원래 순서대로 단락을 배열해야 합니다</li>
        </ul>
      </div>
    </div>
  );
};

export default TextInput; 