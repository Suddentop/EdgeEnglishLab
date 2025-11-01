import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Payment } from '../types/types';
import { PAYMENT_STATUS, POINT_POLICY } from '../utils/pointConstants';
import { chargePoints, adminManagePoints } from './pointService';

// 결제 서비스 클래스
export class PaymentService {
  
  // 결제 요청 생성 (카드결제 시뮬레이션)
  static async createPaymentRequest(
    userId: string,
    amount: number,
    paymentMethod: 'card' | 'bank_transfer' = 'card',
    orderId?: string // 토스페이먼츠 orderId (선택사항)
  ): Promise<{ paymentId: string; pointsEarned: number; orderId: string }> {
    try {
      // 최소 결제 금액 검증
      if (amount < POINT_POLICY.MINIMUM_PURCHASE_AMOUNT) {
        throw new Error(`최소 결제 금액은 ${POINT_POLICY.MINIMUM_PURCHASE_AMOUNT.toLocaleString()}원입니다.`);
      }

      // 획득 포인트 계산 (1:1 비율)
      const pointsEarned = amount * POINT_POLICY.POINTS_PER_WON;

      // 결제 정보 생성
      // orderId가 제공되지 않으면 생성
      const finalOrderId = orderId || `engquiz_${userId}_${Date.now()}`;
      
      const paymentData = {
        userId,
        amount,
        pointsEarned,
        paymentMethod,
        orderId: finalOrderId, // orderId를 필드로 저장 (나중에 조회하기 위해)
        status: PAYMENT_STATUS.PENDING,
        createdAt: serverTimestamp(),
        cardInfo: paymentMethod === 'card' ? {
          last4: this.generateRandomLast4(),
          brand: this.generateRandomBrand()
        } : undefined
      };

      const paymentRef = await addDoc(collection(db, 'payments'), paymentData);
      
      return {
        paymentId: paymentRef.id,
        pointsEarned,
        orderId: finalOrderId
      };
    } catch (error) {
      console.error('결제 요청 생성 오류:', error);
      throw new Error('결제 요청 생성에 실패했습니다.');
    }
  }

  // 카드결제 처리 (시뮬레이션)
  static async processCardPayment(paymentId: string): Promise<boolean> {
    try {
      // 실제 환경에서는 여기에 실제 결제 게이트웨이 연동 코드가 들어갑니다
      // 현재는 시뮬레이션으로 성공 처리
      
      // 결제 정보 조회
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (!paymentDoc.exists()) {
        throw new Error('결제 정보를 찾을 수 없습니다.');
      }

      const paymentData = paymentDoc.data();
      
      // 이미 완료된 결제인지 확인 (중복 충전 방지)
      if (paymentData.status === PAYMENT_STATUS.COMPLETED) {
        console.log('이미 완료된 결제입니다. 포인트 충전을 건너뜁니다.');
        return true; // 이미 처리된 결제이므로 성공으로 반환
      }

      // 결제 상태를 완료로 업데이트
      await updateDoc(paymentRef, {
        status: PAYMENT_STATUS.COMPLETED,
        completedAt: serverTimestamp()
      });
      
      // 사용자 정보 조회
      const userRef = doc(db, 'users', paymentData.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // 포인트 충전 처리
        await chargePoints(
          paymentData.userId,
          paymentData.pointsEarned,
          paymentId,
          userData.name,
          userData.nickname
        );
      }

      return true;
    } catch (error) {
      console.error('카드결제 처리 오류:', error);
      
      // 결제 실패 시 상태 업데이트
      try {
        const paymentRef = doc(db, 'payments', paymentId);
        await updateDoc(paymentRef, {
          status: PAYMENT_STATUS.FAILED,
          updatedAt: serverTimestamp()
        });
      } catch (updateError) {
        console.error('결제 실패 상태 업데이트 오류:', updateError);
      }
      
      throw new Error('카드결제 처리에 실패했습니다.');
    }
  }

  // 결제 취소/환불 처리
  static async cancelPayment(paymentId: string, reason: string): Promise<void> {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (!paymentDoc.exists()) {
        throw new Error('결제 정보를 찾을 수 없습니다.');
      }

      const paymentData = paymentDoc.data();
      
      // 완료된 결제만 취소 가능
      if (paymentData.status !== PAYMENT_STATUS.COMPLETED) {
        throw new Error('완료된 결제만 취소할 수 있습니다.');
      }

      // 환불 처리 (실제 환경에서는 결제 게이트웨이 환불 API 호출)
      await updateDoc(paymentRef, {
        status: PAYMENT_STATUS.REFUNDED,
        updatedAt: serverTimestamp()
      });

      // 포인트 차감 (환불)
      await adminManagePoints(
        'system', // 시스템 관리자
        paymentData.userId,
        'subtract',
        paymentData.pointsEarned,
        `결제 취소: ${reason}`
      );

    } catch (error) {
      console.error('결제 취소 오류:', error);
      throw new Error('결제 취소에 실패했습니다.');
    }
  }

  // 결제 정보 조회
  static async getPaymentById(paymentId: string): Promise<Payment | null> {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (!paymentDoc.exists()) {
        return null;
      }

      const data = paymentDoc.data();
      return {
        id: paymentDoc.id,
        userId: data.userId,
        amount: data.amount,
        pointsEarned: data.pointsEarned,
        paymentMethod: data.paymentMethod,
        status: data.status,
        cardInfo: data.cardInfo,
        createdAt: data.createdAt.toDate(),
        completedAt: data.completedAt?.toDate()
      };
    } catch (error) {
      console.error('결제 정보 조회 오류:', error);
      throw new Error('결제 정보 조회에 실패했습니다.');
    }
  }

  // 사용자별 결제 내역 조회
  static async getUserPayments(
    userId: string,
    limitCount?: number
  ): Promise<Payment[]> {
    try {
      console.log('🔍 결제 내역 조회 시작:', { userId, limitCount });
      
      const constraints: any[] = [
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      ];

      // limit이 지정된 경우 쿼리에 적용
      if (limitCount) {
        // Firestore의 limit은 최대 1000개까지 가능
        const maxLimit = Math.min(limitCount, 1000);
        constraints.push(limit(maxLimit));
      }

      const q = query(collection(db, 'payments'), ...constraints);
      const querySnapshot = await getDocs(q);
      
      console.log('📊 쿼리 결과:', { 
        size: querySnapshot.size, 
        empty: querySnapshot.empty,
        userId 
      });
      
      const payments: Payment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('💳 결제 데이터:', { 
          id: doc.id, 
          orderId: data.orderId,
          status: data.status,
          amount: data.amount,
          createdAt: data.createdAt 
        });
        
        payments.push({
          id: doc.id,
          userId: data.userId,
          amount: data.amount,
          pointsEarned: data.pointsEarned,
          paymentMethod: data.paymentMethod,
          status: data.status,
          cardInfo: data.cardInfo,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate()
        });
      });

      console.log('✅ 결제 내역 조회 완료:', { count: payments.length });
      return payments;
    } catch (error: any) {
      console.error('❌ 결제 내역 조회 오류:', error);
      console.error('에러 상세:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // 인덱스 오류인 경우 createdAt 없이 조회 시도
      if (error.code === 'failed-precondition') {
        console.warn('⚠️ 인덱스 오류 감지, createdAt 없이 재시도...');
        try {
          const q = query(
            collection(db, 'payments'),
            where('userId', '==', userId),
            limit(limitCount || 50)
          );
          const querySnapshot = await getDocs(q);
          const payments: Payment[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            payments.push({
              id: doc.id,
              userId: data.userId,
              amount: data.amount,
              pointsEarned: data.pointsEarned,
              paymentMethod: data.paymentMethod,
              status: data.status,
              cardInfo: data.cardInfo,
              createdAt: data.createdAt?.toDate() || new Date(),
              completedAt: data.completedAt?.toDate()
            });
          });
          
          // 클라이언트에서 정렬
          payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          console.log('✅ 인덱스 없이 조회 성공:', { count: payments.length });
          return payments;
        } catch (retryError) {
          console.error('❌ 재시도 실패:', retryError);
        }
      }
      
      throw new Error('결제 내역 조회에 실패했습니다.');
    }
  }

  // 사용자별 결제 통계
  static async getUserPaymentStats(userId: string): Promise<{
    totalPayments: number;
    totalAmount: number;
    totalPointsEarned: number;
    successfulPayments: number;
    failedPayments: number;
  }> {
    try {
      // PointService.getPayments 대신 임시로 빈 통계 반환
      // const { payments } = await PointService.getPayments(userId, 1000);
      
      // 임시 구현 - 실제로는 Firestore에서 결제 데이터를 조회해야 함
      return {
        totalPayments: 0,
        totalAmount: 0,
        totalPointsEarned: 0,
        successfulPayments: 0,
        failedPayments: 0
      };
    } catch (error) {
      console.error('결제 통계 조회 오류:', error);
      throw new Error('결제 통계 조회에 실패했습니다.');
    }
  }

  // 관리자용 전체 결제 통계
  static async getAdminPaymentStats(): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    totalPointsIssued: number;
    averageTransactionAmount: number;
    monthlyStats: Array<{
      month: string;
      revenue: number;
      transactions: number;
      pointsIssued: number;
    }>;
  }> {
    try {
      // 실제 구현에서는 Firestore 집계 쿼리나 별도 통계 컬렉션을 사용합니다
      // 현재는 기본 구조만 제공
      
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        totalPointsIssued: 0,
        averageTransactionAmount: 0,
        monthlyStats: []
      };
    } catch (error) {
      console.error('관리자 결제 통계 조회 오류:', error);
      throw new Error('결제 통계 조회에 실패했습니다.');
    }
  }

  // 유틸리티 메서드들
  private static generateRandomLast4(): string {
    return Math.floor(Math.random() * 9000 + 1000).toString();
  }

  private static generateRandomBrand(): string {
    const brands = ['VISA', 'MASTERCARD', 'AMEX', 'JCB'];
    return brands[Math.floor(Math.random() * brands.length)];
  }

  // 결제 금액 유효성 검증
  static validatePaymentAmount(amount: number): { isValid: boolean; message?: string } {
    if (amount < POINT_POLICY.MINIMUM_PURCHASE_AMOUNT) {
      return {
        isValid: false,
        message: `최소 결제 금액은 ${POINT_POLICY.MINIMUM_PURCHASE_AMOUNT.toLocaleString()}원입니다.`
      };
    }

    if (amount > 100000) { // 1회 최대 10만원 제한 (토스페이먼츠 요구사항)
      return {
        isValid: false,
        message: '1회 최대 충전 금액은 10만원입니다.'
      };
    }

    return { isValid: true };
  }
}
