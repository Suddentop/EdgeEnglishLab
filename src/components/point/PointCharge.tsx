import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TossPaymentService } from '../../services/tossPaymentService';
import { getUserCurrentPoints } from '../../services/pointService';
import { POINT_POLICY } from '../../utils/pointConstants';
import './PointCharge.css';

const PointCharge: React.FC = () => {
  const { user } = useAuth();
  const [currentPoints, setCurrentPoints] = useState<number>(0);
  const [selectedAmount, setSelectedAmount] = useState<number>(10000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // 미리 정의된 충전 금액들 (만원 단위만)
  const predefinedAmounts = [10000, 20000, 30000, 50000, 100000];

  useEffect(() => {
    if (user) {
      loadUserPoints();
    }
  }, [user]);

  const loadUserPoints = async () => {
    try {
      const points = await getUserCurrentPoints(user!.uid);
      setCurrentPoints(points);
    } catch (error) {
      console.error('포인트 조회 오류:', error);
      setMessage({ type: 'error', text: '포인트 조회에 실패했습니다.' });
    }
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setShowCustomInput(false);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(value);
    
    if (value) {
      const amount = parseInt(value);
      if (amount >= POINT_POLICY.MINIMUM_PURCHASE_AMOUNT && amount % 10000 === 0) {
        setSelectedAmount(amount);
      }
    }
  };

  const handleCustomAmountFocus = () => {
    setShowCustomInput(true);
    setSelectedAmount(0);
  };

  const handlePayment = async () => {
    if (!user) {
      setMessage({ type: 'error', text: '로그인이 필요합니다.' });
      return;
    }

    if (selectedAmount === 0) {
      setMessage({ type: 'error', text: '충전할 금액을 선택해주세요.' });
      return;
    }

    // 결제 금액 유효성 검증
    if (selectedAmount < POINT_POLICY.MINIMUM_PURCHASE_AMOUNT || selectedAmount % 10000 !== 0) {
      setMessage({ type: 'error', text: '결제 금액은 만원 단위로 최소 1만원 이상이어야 합니다.' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // 토스페이먼츠 결제 요청 생성
      const { paymentId, pointsEarned, tossData } = await TossPaymentService.createPaymentRequest(
        user.uid,
        selectedAmount,
        user.displayName || '사용자',
        user.email || '',
        user.phoneNumber || ''
      );

      // 토스페이먼츠 결제 위젯 실행
      if (window.TossPayments) {
        const tossPayments = window.TossPayments('test_ck_your_client_key'); // 실제 클라이언트 키로 교체 필요
        
        await tossPayments.requestPayment('카드', {
          amount: selectedAmount,
          orderId: tossData.orderId,
          orderName: `EngQuiz 포인트 충전 (${selectedAmount.toLocaleString()}원)`,
          customerName: user.displayName || '사용자',
          customerEmail: user.email || '',
          successUrl: `${window.location.origin}/payment/success?paymentKey=${tossData.paymentKey}&orderId=${tossData.orderId}&amount=${selectedAmount}`,
          failUrl: `${window.location.origin}/payment/fail`
        });

        // 결제 성공 시 포인트 정보 새로고침
        await loadUserPoints();
        
        setMessage({
          type: 'success',
          text: `${selectedAmount.toLocaleString()}원 결제가 완료되어 ${pointsEarned.toLocaleString()}포인트가 충전되었습니다.`
        });
        
        // 입력 필드 초기화
        setSelectedAmount(10000);
        setCustomAmount('');
        setShowCustomInput(false);
      } else {
        // 토스페이먼츠 스크립트가 로드되지 않은 경우 시뮬레이션
        console.log('토스페이먼츠 스크립트가 로드되지 않았습니다. 시뮬레이션 모드로 진행합니다.');
        
        // 시뮬레이션: 결제 성공 처리
        setTimeout(async () => {
          await loadUserPoints();
          setMessage({
            type: 'success',
            text: `${selectedAmount.toLocaleString()}원 결제가 완료되어 ${pointsEarned.toLocaleString()}포인트가 충전되었습니다. (시뮬레이션)`
          });
          
          // 입력 필드 초기화
          setSelectedAmount(10000);
          setCustomAmount('');
          setShowCustomInput(false);
          setIsProcessing(false);
        }, 2000);
      }
    } catch (error: any) {
      console.error('결제 오류:', error);
      setMessage({ type: 'error', text: error.message || '결제에 실패했습니다.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + '원';
  };

  const formatPoints = (points: number) => {
    return points.toLocaleString() + 'P';
  };

  return (
    <div className="point-charge">
      <div className="point-charge-header">
        <h2>포인트 충전</h2>
        <p>현재 보유 포인트: <span className="current-points">{formatPoints(currentPoints)}</span></p>
      </div>

      <div className="point-charge-content">
        <div className="charge-amount-section">
          <h3>충전할 금액 선택</h3>
          <p className="charge-info">최소 1만원부터 만원 단위로만 결제 가능합니다</p>
          
          <div className="predefined-amounts">
            {predefinedAmounts.map((amount) => (
              <button
                key={amount}
                className={`amount-button ${selectedAmount === amount ? 'selected' : ''}`}
                onClick={() => handleAmountSelect(amount)}
                disabled={isProcessing}
              >
                <div className="amount">{formatCurrency(amount)}</div>
                <div className="points">+{formatPoints(amount)}</div>
              </button>
            ))}
          </div>

          <div className="custom-amount-section">
            <button
              className={`custom-amount-button ${showCustomInput ? 'active' : ''}`}
              onClick={handleCustomAmountFocus}
              disabled={isProcessing}
            >
              직접 입력
            </button>
            
            {showCustomInput && (
              <div className="custom-amount-input">
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="만원 단위로 입력 (예: 10000, 20000, 30000)"
                  disabled={isProcessing}
                />
                <span className="currency">원</span>
                {customAmount && (
                  <div className="custom-points">
                    +{formatPoints(parseInt(customAmount) || 0)}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedAmount > 0 && (
            <div className="selected-amount-info">
              <div className="amount-detail">
                <span>충전 금액:</span>
                <span className="amount-value">{formatCurrency(selectedAmount)}</span>
              </div>
              <div className="points-detail">
                <span>획득 포인트:</span>
                <span className="points-value">+{formatPoints(selectedAmount)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="payment-info">
          <h3>결제 정보</h3>
          <div className="info-item">
            <span>결제 방법:</span>
            <span>신용카드</span>
          </div>
          <div className="info-item">
            <span>최소 충전 금액:</span>
            <span>{formatCurrency(POINT_POLICY.MINIMUM_PURCHASE_AMOUNT)}</span>
          </div>
          <div className="info-item">
            <span>포인트 비율:</span>
            <span>1원 = 1포인트</span>
          </div>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <button
          className="charge-button"
          onClick={handlePayment}
          disabled={isProcessing || selectedAmount === 0}
        >
          {isProcessing ? '결제 처리 중...' : `${formatCurrency(selectedAmount)} 결제하기`}
        </button>

        <div className="charge-notice">
          <h4>안내사항</h4>
          <ul>
            <li>충전된 포인트는 문제 생성에 사용됩니다.</li>
            <li>문제 1건 생성당 200포인트가 차감됩니다.</li>
            <li>포인트는 환불되지 않습니다.</li>
            <li>결제 관련 문의는 고객센터로 연락해주세요.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PointCharge;
