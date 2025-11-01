import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TossPaymentService } from '../../services/tossPaymentService';
import { getUserCurrentPoints } from '../../services/pointService';
import { POINT_POLICY } from '../../utils/pointConstants';
import './PointCharge.css';

const PointCharge: React.FC = () => {
  const { user } = useAuth();
  const [currentPoints, setCurrentPoints] = useState<number>(0);
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  // 미리 정의된 충전 금액들 (1회 최대 10만원)
  const predefinedAmounts = [1000, 5000, 10000, 20000, 50000, 100000];

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
    
    // 최대값 제한 (10만원)
    if (value) {
      const amount = parseInt(value);
      if (amount > 100000) {
        setMessage({ type: 'error', text: '1회 최대 충전 금액은 10만원입니다.' });
        setCustomAmount('100000');
        setSelectedAmount(100000);
        return;
      }
    }
    
    setCustomAmount(value);
    
    if (value) {
      const amount = parseInt(value);
      // 최소 금액 이상, 최대 금액 이하이면 selectedAmount도 업데이트
      if (amount >= POINT_POLICY.MINIMUM_PURCHASE_AMOUNT && amount <= 100000) {
        setSelectedAmount(amount);
        setMessage(null); // 유효한 입력이면 에러 메시지 제거
      } else if (amount < POINT_POLICY.MINIMUM_PURCHASE_AMOUNT) {
        // 최소 금액 미만이면 selectedAmount는 0으로 유지
        setSelectedAmount(0);
      } else if (amount > 100000) {
        // 최대 금액 초과는 이미 위에서 처리됨
        setSelectedAmount(0);
      }
    } else {
      setSelectedAmount(0);
      setMessage(null);
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

    // 직접 입력 중이면 customAmount를, 아니면 selectedAmount를 사용
    const paymentAmount = showCustomInput && customAmount 
      ? parseInt(customAmount) || 0 
      : selectedAmount;

    if (paymentAmount === 0) {
      setMessage({ type: 'error', text: '충전할 금액을 선택해주세요.' });
      return;
    }

    // 결제 금액 유효성 검증
    if (paymentAmount < POINT_POLICY.MINIMUM_PURCHASE_AMOUNT) {
      setMessage({ type: 'error', text: `결제 금액은 최소 ${POINT_POLICY.MINIMUM_PURCHASE_AMOUNT.toLocaleString()}원 이상이어야 합니다.` });
      return;
    }

    // 최대 충전 금액 제한 (1회 10만원)
    if (paymentAmount > 100000) {
      setMessage({ type: 'error', text: '1회 최대 충전 금액은 10만원입니다.' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // 토스페이먼츠 결제 요청 생성
      const { paymentId, pointsEarned, tossData } = await TossPaymentService.createPaymentRequest(
        user.uid,
        paymentAmount,
        user.displayName || '사용자',
        user.email || '',
        user.phoneNumber || ''
      );

      // 토스페이먼츠 결제 위젯 실행
      if (window.TossPayments) {
        const clientKey = process.env.REACT_APP_TOSS_CLIENT_KEY || 'test_ck_your_client_key';
        
        if (!clientKey || clientKey === 'test_ck_your_client_key') {
          setMessage({ 
            type: 'error', 
            text: '토스페이먼츠 클라이언트 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.' 
          });
          setIsProcessing(false);
          return;
        }
        
        const tossPayments = window.TossPayments(clientKey);
        
        // 결제 수단 선택 (가이드에 따라 카드, 가상계좌, 계좌이체 등 지원)
        // HashRouter 사용 시 URL 형식: #/payment/success
        // 주의: successUrl에 paymentKey를 포함하지 않음 (토스페이먼츠가 자동으로 추가함)
        await tossPayments.requestPayment('카드', {
          amount: paymentAmount,
          orderId: tossData.orderId,
          orderName: `EngQuiz 포인트 충전 (${paymentAmount.toLocaleString()}원)`,
          customerName: user.displayName || '사용자',
          customerEmail: user.email || '',
          successUrl: `${window.location.origin}/#/payment/success?orderId=${tossData.orderId}&amount=${paymentAmount}`,
          failUrl: `${window.location.origin}/#/payment/fail`
        });

        // 결제 성공 시 포인트 정보 새로고침
        await loadUserPoints();
        
        setMessage({
          type: 'success',
          text: `${paymentAmount.toLocaleString()}원 결제가 완료되어 ${pointsEarned.toLocaleString()}포인트가 충전되었습니다.`
        });
        
        // 입력 필드 초기화
        setSelectedAmount(1000);
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
            text: `${paymentAmount.toLocaleString()}원 결제가 완료되어 ${pointsEarned.toLocaleString()}포인트가 충전되었습니다. (시뮬레이션)`
          });
          
          // 입력 필드 초기화
          setSelectedAmount(1000);
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
          <p className="charge-info">최소 {POINT_POLICY.MINIMUM_PURCHASE_AMOUNT.toLocaleString()}원부터 결제 가능하며, 1회 최대 충전 금액은 10만원입니다</p>
          
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
                  placeholder="충전할 금액을 입력하세요 (최소 1,000원, 최대 100,000원)"
                  disabled={isProcessing}
                />
              </div>
            )}
          </div>

          {(() => {
            // 직접 입력 중이면 customAmount를, 아니면 selectedAmount를 사용
            const displayAmount = showCustomInput && customAmount 
              ? parseInt(customAmount) || 0 
              : selectedAmount;
            
            return displayAmount > 0 ? (
              <div className="selected-amount-info">
                <div className="amount-detail">
                  <span>충전 금액:</span>
                  <span className="amount-value">{formatCurrency(displayAmount)}</span>
                </div>
                <div className="points-detail">
                  <span>획득 포인트:</span>
                  <span className="points-value">+{formatPoints(displayAmount)}</span>
                </div>
              </div>
            ) : null;
          })()}
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
            <span>최대 충전 금액:</span>
            <span>100,000원 (1회)</span>
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
          disabled={isProcessing || (showCustomInput && customAmount ? (parseInt(customAmount) || 0) === 0 : selectedAmount === 0)}
        >
          {isProcessing ? '결제 처리 중...' : (() => {
            const displayAmount = showCustomInput && customAmount 
              ? parseInt(customAmount) || 0 
              : selectedAmount;
            return `${formatCurrency(displayAmount)} 결제하기`;
          })()}
        </button>

        <div className="charge-notice">
          <h4>안내사항</h4>
          <ul>
            <li>충전된 포인트는 문제 생성에 사용됩니다.</li>
            <li>문제 유형에 따라 포인트가 다르게 차감됩니다. 각 문제 유형별 포인트는 문제 생성 시 확인할 수 있습니다.</li>
            <li>1회 최대 충전 금액은 10만원입니다.</li>
            <li>충전된 포인트의 이용기간과 환불가능기간은 결제시점으로부터 1년 이내로 제한됩니다.</li>
            <li>포인트 환불은 결제가 되었던 수단으로만 가능하며, 자세한 환불 정책은 이용안내 페이지를 참고해주세요.</li>
            <li>충전된 포인트는 사용자간 양도가 불가합니다.</li>
            <li>결제 관련 문의는 Feedback 메뉴를 통해 문의해주세요.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PointCharge;
