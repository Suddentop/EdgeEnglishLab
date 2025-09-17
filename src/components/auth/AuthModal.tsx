import React from 'react';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onRequestClose }) => {
  const navigate = useNavigate();

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="auth-modal"
      overlayClassName="auth-modal-overlay"
    >
      <div className="auth-modal-content">
        <h2>로그인이 필요한 서비스입니다</h2>
        <p>해당 기능을 이용하기 위해서는 로그인이 필요합니다.</p>
        <div className="auth-modal-buttons">
          <button
            onClick={() => {
              onRequestClose();
              navigate('/login');
            }}
            className="login-button"
          >
            로그인
          </button>
          <button
            onClick={() => {
              onRequestClose();
              navigate('/signup');
            }}
            className="signup-button"
          >
            회원가입
          </button>
        </div>
        <button onClick={onRequestClose} className="close-button">
          닫기
        </button>
      </div>
    </Modal>
  );
};

export default AuthModal; 