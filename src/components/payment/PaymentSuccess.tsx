import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TossPaymentService } from '../../services/tossPaymentService';
import './PaymentSuccess.css';

const PaymentSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  useEffect(() => {
    const processPayment = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        // 토스페이먼츠가 리다이렉트할 때 전달하는 파라미터
        const paymentKey = searchParams.get('paymentKey');
        // orderId가 중복될 수 있으므로 마지막 값 사용
        const orderIdValues = searchParams.getAll('orderId');
        const orderId = orderIdValues.length > 0 ? orderIdValues[orderIdValues.length - 1] : null;
        const amount = searchParams.get('amount');

        if (!paymentKey || !orderId) {
          throw new Error('결제 정보가 올바르지 않습니다. paymentKey와 orderId가 필요합니다.');
        }

        // amount가 없으면 토스페이먼츠 API에서 결제 정보 조회
        let finalAmount = amount ? parseInt(amount) : 0;
        if (!finalAmount || finalAmount === 0) {
          try {
            const paymentInfo = await TossPaymentService.getPaymentInfo(paymentKey);
            finalAmount = paymentInfo.totalAmount || 0;
          } catch (error) {
            console.warn('결제 정보 조회 실패:', error);
            throw new Error('결제 금액을 확인할 수 없습니다.');
          }
        }

        // 토스페이먼츠 결제 승인
        const success = await TossPaymentService.confirmPayment(
          paymentKey,
          orderId,
          finalAmount
        );

        if (success) {
          setMessage({
            type: 'success',
            text: `${finalAmount.toLocaleString()}원 결제가 완료되어 ${finalAmount.toLocaleString()}포인트가 충전되었습니다.`
          });
          
          // 결제 정보 설정
          setPaymentInfo({
            paymentKey,
            orderId,
            amount: finalAmount
          });

          // 결제 성공 후 프로필 페이지로 이동할 때 내역 새로고침을 위한 딜레이
          console.log('✅ 결제 처리 완료, 프로필 페이지 새로고침 대기 중...');
        } else {
          throw new Error('결제 승인에 실패했습니다.');
        }

      } catch (error: any) {
        console.error('결제 처리 오류:', error);
        setMessage({ type: 'error', text: error.message || '결제 처리 중 오류가 발생했습니다.' });
      } finally {
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [location.search]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoToPoints = () => {
    // 결제 성공 파라미터와 함께 프로필 페이지로 이동
    navigate('/profile?payment=success');
  };

  if (isProcessing) {
    return (
      <div className="payment-success">
        <div className="payment-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>결제를 처리하고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-success">
      <div className="payment-container">
        <div className={`payment-result ${message?.type}`}>
          <div className="result-icon">
            {message?.type === 'success' ? '✅' : '❌'}
          </div>
          
          <h2 className="result-title">
            {message?.type === 'success' ? '결제가 완료되었습니다!' : '결제 처리 중 오류가 발생했습니다.'}
          </h2>
          
          <p className="result-message">
            {message?.text}
          </p>

          {paymentInfo && (
            <div className="payment-details">
              <h3>결제 상세 정보</h3>
              <div className="detail-item">
                <span className="label">주문번호:</span>
                <span className="value">{paymentInfo.orderId}</span>
              </div>
              <div className="detail-item">
                <span className="label">결제금액:</span>
                <span className="value">{paymentInfo.amount.toLocaleString()}원</span>
              </div>
              <div className="detail-item">
                <span className="label">충전 포인트:</span>
                <span className="value">{paymentInfo.amount.toLocaleString()}P</span>
              </div>
            </div>
          )}

          <div className="action-buttons">
            <button onClick={handleGoHome} className="btn-secondary">
              홈으로 이동
            </button>
            {message?.type === 'success' && (
              <button onClick={handleGoToPoints} className="btn-primary">
                포인트 확인
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
