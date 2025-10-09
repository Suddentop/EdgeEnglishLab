import { PaymentService } from './paymentService';
import { chargePoints } from './pointService';
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
      if (amount < 10000 || amount % 10000 !== 0) {
        throw new Error('결제 금액은 만원 단위로 최소 1만원 이상이어야 합니다.');
      }

      // 포인트 계산 (1:1 비율)
      const pointsEarned = amount;

      // 토스페이먼츠 결제 요청 데이터 생성
      const orderId = `engquiz_${userId}_${Date.now()}`;
      const tossRequestData: TossPaymentRequest = {
        amount: amount,
        orderId: orderId,
        orderName: `EngQuiz 포인트 충전 (${amount.toLocaleString()}원)`,
        customerName: userName,
        customerEmail: userEmail,
        customerMobilePhone: userPhone,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`
      };

      // 결제 정보를 Firestore에 저장
      const { paymentId } = await PaymentService.createPaymentRequest(
        userId,
        amount,
        'card' // 토스페이먼츠는 카드결제
      );

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
        tossData: tossResponse
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
      // 토스페이먼츠 결제 승인 (실제로는 서버에서 처리해야 함)
      console.log('결제 승인 처리:', { paymentKey, orderId, amount });

      // Firestore에서 결제 정보 조회
      const paymentRef = doc(db, 'payments', orderId);
      const paymentDoc = await getDoc(paymentRef);

      if (!paymentDoc.exists()) {
        throw new Error('결제 정보를 찾을 수 없습니다.');
      }

      const paymentData = paymentDoc.data();

      // 결제 상태를 완료로 업데이트
      await updateDoc(paymentRef, {
        status: PAYMENT_STATUS.COMPLETED,
        completedAt: serverTimestamp(),
        tossPaymentKey: paymentKey
      });

      // 사용자 정보 조회 및 포인트 충전
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
      }

      return true;

    } catch (error) {
      console.error('토스페이먼츠 결제 승인 오류:', error);
      throw new Error('결제 승인에 실패했습니다.');
    }
  }

  // 토스페이먼츠 API 호출
  private static async callTossAPI(endpoint: string, data: any): Promise<TossPaymentResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(this.SECRET_KEY + ':')}`,
          'Content-Type': 'application/json'
        },
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
