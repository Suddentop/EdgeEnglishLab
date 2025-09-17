import React from 'react';
import Modal from 'react-modal';
import './ScreenshotHelpModal.css';

interface ScreenshotHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ScreenshotHelpModal: React.FC<ScreenshotHelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="screenshot-help-modal"
      overlayClassName="screenshot-help-overlay"
      ariaHideApp={false}
    >
      <div className="screenshot-help-container">
        <div className="screenshot-help-header">
          <h2>📸 화면 캡처하는 방법</h2>
          <button 
            className="screenshot-help-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        
        <div className="screenshot-help-content">
          <div className="help-section">
            <h3>🎯 가장 쉬운 방법: 키보드 단축키</h3>
            <div className="method-card">
              <div className="method-title">
                <span className="keyboard-key">PrtScn</span> 키 (전체 화면 캡처)
              </div>
              <p>키보드에서 <strong>PrtScn</strong> 키를 찾아서 한 번 누르세요!</p>
              <ul>
                <li>💡 <strong>PrtScn</strong>은 보통 키보드 오른쪽 위쪽에 있어요</li>
                <li>💡 화면이 깜빡이면 캡처가 완료된 거예요</li>
                <li>💡 캡처된 이미지는 자동으로 복사되어 있어요</li>
              </ul>
            </div>
            
            <div className="method-card">
              <div className="method-title">
                <span className="keyboard-key">Win</span> + <span className="keyboard-key">Shift</span> + <span className="keyboard-key">S</span> (부분 캡처)
              </div>
              <p>세 개의 키를 동시에 누르면 원하는 부분만 캡처할 수 있어요!</p>
              <ul>
                <li>💡 <strong>Win</strong> 키 + <strong>Shift</strong> 키 + <strong>S</strong> 키를 동시에 누르세요</li>
                <li>💡 화면이 어두워지면 마우스로 원하는 부분을 드래그하세요</li>
                <li>💡 더 정확하게 캡처할 수 있어요</li>
              </ul>
            </div>
          </div>

          <div className="help-section">
            <h3>🖥️ 윈도우 캡처 도구 사용하기</h3>
            <div className="method-card">
              <div className="method-title">윈도우 캡처 도구 실행하기</div>
              <ol>
                <li>키보드에서 <strong>Win</strong> 키를 누르세요</li>
                <li>"캡처" 또는 "snipping"을 입력하세요</li>
                <li>"캡처 도구" 또는 "Snipping Tool"을 클릭하세요</li>
                <li>"새로 만들기" 버튼을 클릭하세요</li>
                <li>마우스로 원하는 부분을 드래그해서 캡처하세요</li>
                <li>캡처된 이미지를 복사하세요 (Ctrl+C)</li>
              </ol>
            </div>
          </div>

          <div className="help-section">
            <h3>📱 스마트폰으로 캡처하기</h3>
            <div className="method-card">
              <div className="method-title">아이폰 (iPhone)</div>
              <ul>
                <li>💡 <strong>전원 버튼</strong> + <strong>볼륨 업 버튼</strong>을 동시에 누르세요</li>
                <li>💡 화면이 깜빡이면 캡처 완료!</li>
                <li>💡 사진 앱에서 캡처된 이미지를 확인할 수 있어요</li>
              </ul>
            </div>
            
            <div className="method-card">
              <div className="method-title">안드로이드 (Android)</div>
              <ul>
                <li>💡 <strong>전원 버튼</strong> + <strong>볼륨 다운 버튼</strong>을 동시에 누르세요</li>
                <li>💡 또는 손바닥으로 화면을 가로로 스와이프하세요</li>
                <li>💡 갤러리 앱에서 캡처된 이미지를 확인할 수 있어요</li>
              </ul>
            </div>
          </div>

          <div className="help-section">
            <h3>🔄 캡처한 이미지 붙여넣기</h3>
            <div className="method-card">
              <div className="method-title">이미지를 문제에 붙여넣는 방법</div>
              <ol>
                <li>위의 방법 중 하나로 화면을 캡처하세요</li>
                <li>캡처된 이미지가 자동으로 복사됩니다</li>
                <li>문제 화면에서 <strong>"📸 캡처화면 붙여넣기"</strong> 버튼을 클릭하세요</li>
                <li>또는 키보드에서 <strong>Ctrl + V</strong>를 누르세요</li>
                <li>캡처한 이미지가 문제에 붙여넣어집니다!</li>
              </ol>
            </div>
          </div>

          <div className="help-section">
            <h3>💡 팁과 주의사항</h3>
            <div className="tips-card">
              <ul>
                <li>🎯 <strong>문제가 잘 보이도록</strong> 캡처하세요</li>
                <li>🎯 <strong>텍스트가 선명하게</strong> 보이도록 하세요</li>
                <li>🎯 <strong>불필요한 부분은 제외</strong>하고 문제만 캡처하세요</li>
                <li>🎯 <strong>밝기가 충분한</strong> 곳에서 캡처하세요</li>
                <li>🎯 캡처가 안 되면 <strong>다시 한 번 시도</strong>해보세요</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="screenshot-help-footer">
          <button 
            className="screenshot-help-ok-btn"
            onClick={onClose}
          >
            이해했어요! 👍
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ScreenshotHelpModal; 