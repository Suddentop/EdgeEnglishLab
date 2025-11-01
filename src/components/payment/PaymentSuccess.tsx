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

  // HashRouter 사용 시, hash 없이 리다이렉트된 경우 자동으로 hash 추가
  useEffect(() => {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;
    
    // /payment/success 경로인데 hash가 없는 경우
    if (currentPath === '/payment/success' && !currentHash) {
      console.log('🔄 HashRouter 변환: hash 없는 URL을 hash 형식으로 변환');
      const newHash = `#/payment/success${currentSearch}`;
      window.history.replaceState(null, '', newHash);
      // 페이지 리로드 없이 해시 변경 후 컴포넌트가 다시 렌더링되도록
      window.location.hash = newHash;
    }
  }, []);

  useEffect(() => {
    const processPayment = async () => {
      try {
        // HashRouter 사용 시 URL 파라미터 파싱 (여러 소스에서 확인)
        const hash = location.hash || '';
        const search = location.search || '';
        const fullHref = window.location.href || '';
        
        console.log('🔍 전체 URL 정보:', {
          hash,
          search,
          pathname: location.pathname,
          fullHref,
          hashSearch: hash.includes('?') ? hash.split('?')[1] : null
        });
        
        // 1. hash에서 쿼리 파라미터 추출 (예: #/payment/success?paymentKey=xxx)
        let hashParams = '';
        if (hash.includes('?')) {
          hashParams = hash.split('?')[1];
        }
        
        // 2. 일반 search 파라미터 (hash 앞의 쿼리 파라미터)
        const searchParamsStr = search.replace(/^\?/, '');
        
        // 3. 전체 URL에서 직접 파싱 (hash 앞의 쿼리 파라미터)
        let urlParams = '';
        if (fullHref.includes('?')) {
          const urlPart = fullHref.split('?')[1];
          // hash 부분 제거 (hash 앞의 파라미터만)
          urlParams = urlPart.split('#')[0];
        }
        
        // hash 앞의 파라미터와 hash 뒤의 파라미터를 모두 병합
        // hash 앞의 파라미터가 우선 (토스페이먼츠가 여기에 주요 파라미터를 보냄)
        const baseParams = urlParams || searchParamsStr;
        const hashParamsOnly = hashParams;
        
        // 두 파라미터 세트를 병합 (baseParams가 우선, hashParams는 보조)
        const mergedParams = new URLSearchParams();
        
        // 먼저 hash 뒤의 파라미터 추가
        if (hashParamsOnly) {
          const hashSearchParams = new URLSearchParams(hashParamsOnly);
          hashSearchParams.forEach((value, key) => {
            mergedParams.set(key, value);
          });
        }
        
        // 그 다음 hash 앞의 파라미터 추가 (덮어쓰기 가능 - 우선순위 높음)
        if (baseParams) {
          const baseSearchParams = new URLSearchParams(baseParams);
          baseSearchParams.forEach((value, key) => {
            mergedParams.set(key, value);
          });
        }
        
        console.log('📝 파싱 과정:', {
          hashParams,
          searchParamsStr,
          urlParams,
          baseParams,
          mergedParamsString: mergedParams.toString()
        });
        
        const searchParams = mergedParams;
        
        // 토스페이먼츠가 리다이렉트할 때 전달하는 파라미터
        const paymentKey = searchParams.get('paymentKey');
        // orderId가 중복될 수 있으므로 마지막 값 사용
        const orderIdValues = searchParams.getAll('orderId');
        const orderId = orderIdValues.length > 0 ? orderIdValues[orderIdValues.length - 1] : null;
        const amount = searchParams.get('amount');

        console.log('📋 파싱된 결제 정보:', { 
          paymentKey, 
          orderId, 
          amount,
          orderIdValues: orderIdValues,
          allParams: Array.from(searchParams.entries())
        });

        if (!paymentKey || !orderId) {
          console.error('❌ 필수 파라미터 누락:', { 
            paymentKey: !!paymentKey, 
            orderId: !!orderId,
            paymentKeyValue: paymentKey,
            orderIdValue: orderId,
            mergedParamsString: mergedParams.toString(),
            baseParams,
            hashParamsOnly,
            fullHref
          });
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
        console.error('❌ 결제 처리 오류:', error);
        console.error('에러 상세:', {
          message: error.message,
          code: error.code,
          stack: error.stack,
          name: error.name
        });
        
        // 사용자 친화적인 에러 메시지
        let errorMessage = '결제 처리 중 오류가 발생했습니다.';
        if (error.message) {
          errorMessage = error.message;
        } else if (error.code === 'permission-denied') {
          errorMessage = '결제 정보에 접근할 수 없습니다. 권한을 확인해주세요.';
        } else if (error.code === 'not-found') {
          errorMessage = '결제 정보를 찾을 수 없습니다.';
        }
        
        setMessage({ type: 'error', text: errorMessage });
      } finally {
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [location.search, location.hash]);

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
