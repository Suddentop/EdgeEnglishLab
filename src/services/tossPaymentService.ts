import { PaymentService } from './paymentService';
import { chargePoints } from './pointService';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { PAYMENT_STATUS } from '../utils/pointConstants';

// 토스페이먼츠 타입 정의
interface TossPaymentRequest {
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  customerEmail: string;
  customerMobilePhone: string;
  successUrl: string;
  failUrl: string;
}

interface TossPaymentResponse {
  success: boolean;
  paymentKey?: string;
  orderId?: string;
  totalAmount?: number;
  error?: string;
}

interface TossPaymentConfirmation {
  paymentKey: string;
  orderId: string;
  amount: number;
}

// 토스페이먼츠 서비스 클래스
export class TossPaymentService {
  private static readonly BASE_URL = 'https://api.tosspayments.com/v1';
  private static readonly CLIENT_KEY = process.env.REACT_APP_TOSS_CLIENT_KEY;
  private static readonly SECRET_KEY = process.env.REACT_APP_TOSS_SECRET_KEY;

  // 결제 요청 생성
  static async createPaymentRequest(
    userId: string,
    amount: number,
    userName: string,
    userEmail: string,
    userPhone: string
  ): Promise<{ paymentId: string; pointsEarned: number; tossData: any }> {
    try {
      // 결제 금액 검증
      if (amount < 1000) {
        throw new Error(`결제 금액은 최소 1,000원 이상이어야 합니다.`);
      }

      // 최대 충전 금액 제한 (1회 10만원) - 토스페이먼츠 요구사항
      if (amount > 100000) {
        throw new Error('1회 최대 충전 금액은 10만원입니다.');
      }

      // 포인트 계산 (1:1 비율)
      const pointsEarned = amount;

      // 토스페이먼츠 결제 요청 데이터 생성
      const orderId = `engquiz_${userId}_${Date.now()}`;
      
      // 결제 정보를 Firestore에 저장 (orderId를 포함하여 저장)
      const { paymentId, orderId: savedOrderId } = await PaymentService.createPaymentRequest(
        userId,
        amount,
        'card', // 토스페이먼츠는 카드결제
        orderId // orderId 전달
      );
      
      const tossRequestData: TossPaymentRequest = {
        amount: amount,
        orderId: savedOrderId,
        orderName: `EngQuiz 포인트 충전 (${amount.toLocaleString()}원)`,
        customerName: userName,
        customerEmail: userEmail,
        customerMobilePhone: userPhone,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`
      };

      // 토스페이먼츠 결제 요청 (실제로는 클라이언트에서 위젯을 통해 처리)
      const tossResponse = {
        success: true,
        paymentKey: `payment_key_${orderId}`,
        orderId: orderId,
        totalAmount: amount
      };

      return {
        paymentId,
        pointsEarned,
        tossData: {
          ...tossResponse,
          orderId: savedOrderId
        }
      };

    } catch (error) {
      console.error('토스페이먼츠 결제 요청 생성 오류:', error);
      throw new Error('결제 요청 생성에 실패했습니다.');
    }
  }

  // 결제 승인 처리
  static async confirmPayment(
    paymentKey: string,
    orderId: string,
    amount: number
  ): Promise<boolean> {
    try {
      console.log('🚀 결제 승인 처리 시작:', { paymentKey, orderId, amount });

      // 1. 토스페이먼츠 API로 결제 승인 요청
      const confirmResponse = await fetch(`${this.BASE_URL}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa((this.SECRET_KEY || '') + ':')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentKey: paymentKey,
          orderId: orderId,
          amount: amount
        })
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        console.error('❌ 토스페이먼츠 결제 승인 API 오류:', errorData);
        throw new Error(errorData.message || '결제 승인에 실패했습니다.');
      }

      const paymentResult = await confirmResponse.json();
      console.log('✅ 토스페이먼츠 결제 승인 성공:', paymentResult);

      // 2. Firestore에서 결제 정보 조회 (orderId로 검색)
      console.log('🔍 Firestore에서 결제 정보 조회:', { orderId });
      const paymentsRef = collection(db, 'payments');
      const q = query(paymentsRef, where('orderId', '==', orderId));
      const querySnapshot = await getDocs(q);

      console.log('📊 쿼리 결과:', { 
        size: querySnapshot.size, 
        empty: querySnapshot.empty,
        orderId 
      });

      if (querySnapshot.empty) {
        // orderId로 찾지 못한 경우, 모든 결제를 확인해보기 (디버깅용)
        console.warn('⚠️ orderId로 결제 정보를 찾지 못함. 전체 결제 내역 확인 중...');
        const allPaymentsQuery = query(paymentsRef, limit(10));
        const allSnapshot = await getDocs(allPaymentsQuery);
        console.log('📋 최근 결제 내역 (최대 10개):');
        allSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('  -', {
            id: doc.id,
            orderId: data.orderId,
            userId: data.userId,
            status: data.status,
            amount: data.amount
          });
        });
        
        throw new Error(`결제 정보를 찾을 수 없습니다. (orderId: ${orderId})`);
      }

      const paymentDoc = querySnapshot.docs[0];
      const paymentData = paymentDoc.data();
      
      console.log('💳 찾은 결제 정보:', {
        id: paymentDoc.id,
        userId: paymentData.userId,
        amount: paymentData.amount,
        status: paymentData.status,
        orderId: paymentData.orderId
      });

      // 3. 이미 완료된 결제인지 확인 (중복 충전 방지)
      if (paymentData.status === PAYMENT_STATUS.COMPLETED) {
        console.log('✅ 이미 완료된 결제입니다. 포인트 충전을 건너뜁니다.');
        return true; // 이미 처리된 결제이므로 성공으로 반환
      }

      // 4. 결제 상태를 완료로 업데이트
      console.log('📝 결제 상태 업데이트 중...');
      await updateDoc(paymentDoc.ref, {
        status: PAYMENT_STATUS.COMPLETED,
        completedAt: serverTimestamp(),
        tossPaymentKey: paymentKey,
        tossPaymentData: paymentResult
      });
      console.log('✅ 결제 상태 업데이트 완료');

      // 5. 사용자 정보 조회 및 포인트 충전
      console.log('💰 포인트 충전 처리 중...', { userId: paymentData.userId, points: paymentData.pointsEarned });
      const userRef = doc(db, 'users', paymentData.userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        await chargePoints(
          paymentData.userId,
          paymentData.pointsEarned,
          orderId,
          userData.name,
          userData.nickname
        );
        console.log('✅ 포인트 충전 완료');
      } else {
        console.warn('⚠️ 사용자 정보를 찾을 수 없습니다:', paymentData.userId);
      }

      console.log('🎉 결제 승인 처리 완료');
      return true;

    } catch (error: any) {
      console.error('❌ 토스페이먼츠 결제 승인 오류:', error);
      console.error('에러 상세:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw new Error(error.message || '결제 승인에 실패했습니다.');
    }
  }

  // 토스페이먼츠 API 호출
  private static async callTossAPI(
    endpoint: string, 
    data: any, 
    testCode?: string
  ): Promise<TossPaymentResponse> {
    try {
      const headers: HeadersInit = {
        'Authorization': `Basic ${btoa((this.SECRET_KEY || '') + ':')}`,
        'Content-Type': 'application/json'
      };
      
      // 테스트 환경에서 에러 재현을 위한 테스트 헤더 추가
      // 가이드: TossPayments-Test-Code 헤더를 사용하여 특정 에러 시나리오 테스트 가능
      if (testCode && this.CLIENT_KEY?.startsWith('test_')) {
        headers['TossPayments-Test-Code'] = testCode;
      }
      
      const response = await fetch(`${this.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.message || 'API 호출에 실패했습니다.'
        };
      }

      return {
        success: true,
        ...result
      };

    } catch (error) {
      console.error('토스페이먼츠 API 호출 오류:', error);
      return {
        success: false,
        error: 'API 호출 중 오류가 발생했습니다.'
      };
    }
  }

  // 결제 취소
  static async cancelPayment(
    paymentKey: string,
    cancelReason: string,
    cancelAmount?: number
  ): Promise<boolean> {
    try {
      const cancelData = {
        cancelReason,
        cancelAmount: cancelAmount || undefined
      };

      const response = await fetch(`${this.BASE_URL}/payments/${paymentKey}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(this.SECRET_KEY + ':')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cancelData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '결제 취소에 실패했습니다.');
      }

      return true;

    } catch (error) {
      console.error('토스페이먼츠 결제 취소 오류:', error);
      throw new Error('결제 취소에 실패했습니다.');
    }
  }

  // 결제 정보 조회
  static async getPaymentInfo(paymentKey: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/payments/${paymentKey}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(this.SECRET_KEY + ':')}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '결제 정보 조회에 실패했습니다.');
      }

      return result;

    } catch (error) {
      console.error('토스페이먼츠 결제 정보 조회 오류:', error);
      throw new Error('결제 정보 조회에 실패했습니다.');
    }
  }
}
