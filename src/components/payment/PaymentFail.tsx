import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PaymentFail.css';

const PaymentFail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRetryPayment = () => {
    navigate('/profile');
  };

  return (
    <div className="payment-fail">
      <div className="payment-container">
        <div className="payment-result error">
          <div className="result-icon">
            ❌
          </div>
          
          <h2 className="result-title">
            결제가 취소되었습니다
          </h2>
          
          <p className="result-message">
            결제 과정에서 오류가 발생하거나 사용자가 결제를 취소했습니다.<br/>
            다시 시도해 주세요.
          </p>

          <div className="action-buttons">
            <button onClick={handleGoHome} className="btn-secondary">
              홈으로 이동
            </button>
            <button onClick={handleRetryPayment} className="btn-primary">
              다시 결제하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFail;
