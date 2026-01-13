import React from 'react';
import './CaptureMethodTooltip.css';

interface CaptureMethodTooltipProps {
  onConfirm: () => void;
}

const CaptureMethodTooltip: React.FC<CaptureMethodTooltipProps> = ({ onConfirm }) => {
  return (
    <div className="capture-method-tooltip-overlay" onClick={onConfirm}>
      <div className="capture-method-tooltip-container" onClick={(e) => e.stopPropagation()}>
        <div className="capture-method-tooltip-header">
          <h3>📸 준비한 이미지를 캡처해주세요</h3>
        </div>
        
        <div className="capture-method-tooltip-content">
          <div className="capture-method-section">
            <h4>캡처방법 1)</h4>
            <ol>
              <li>키보드에서 <strong>"왼쪽윈도우키 + 왼쪽 Shift키 + s"</strong>를 누르세요</li>
              <li>화면캡처 표시가 나오면 마우스로 원하는 영역을 선택하세요</li>
            </ol>
          </div>

          <div className="capture-method-section">
            <h4>캡처방법 2)</h4>
            <ol>
              <li>윈도우 <strong>"캡처도구"</strong>를 실행하세요</li>
              <li>화면캡처 표시가 나오면 마우스로 원하는 영역을 선택하세요</li>
            </ol>
          </div>
        </div>

        <div className="capture-method-tooltip-footer">
          <button 
            className="capture-method-confirm-btn"
            onClick={onConfirm}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaptureMethodTooltip;
