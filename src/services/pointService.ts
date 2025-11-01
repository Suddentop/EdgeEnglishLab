import { doc, getDoc, updateDoc, setDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface WorkTypePoints {
  id: string;
  name: string;
  points: number;
  description: string;
}

export interface PointTransaction {
  id: string;
  userId: string;
  userName: string;
  userNickname: string;
  type: 'add' | 'subtract' | 'charge' | 'refund';
  amount: number;
  reason: string;
  timestamp: Date;
  adminId?: string;
  workTypeId?: string;
  workTypeName?: string;
}

// 유형별 포인트 설정 가져오기
export const getWorkTypePoints = async (): Promise<WorkTypePoints[]> => {
  try {
    const docRef = doc(db, 'settings', 'workTypePoints');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().points || [];
    } else {
      // 기본값 반환
      return [
        { id: '1', name: '유형#01', points: 10, description: '문장 순서 테스트' },
        { id: '2', name: '유형#02', points: 15, description: '독해 문제 생성' },
        { id: '3', name: '유형#03', points: 12, description: '어휘 단어 문제' },
        { id: '4', name: '유형#04', points: 18, description: '빈칸(구) 추론 문제' },
        { id: '5', name: '유형#05', points: 20, description: '빈칸(문장) 추론 문제' },
        { id: '6', name: '유형#06', points: 16, description: '문장 위치 추론 문제' },
        { id: '7', name: '유형#07', points: 22, description: '주요 아이디어 추론 문제' },
        { id: '8', name: '유형#08', points: 25, description: '제목 추론 문제' },
        { id: '9', name: '유형#09', points: 14, description: '문법 오류 문제' },
        { id: '10', name: '유형#10', points: 30, description: '복합 문법 오류 문제' },
        { id: '11', name: '유형#11', points: 18, description: '기사 순서 문제' },
        { id: '12', name: '유형#12', points: 20, description: '영어단어 문제' },
        { id: '13', name: '유형#13', points: 12, description: '빈칸 채우기 문제(단어-주관식)' },
        { id: '14', name: '유형#14', points: 15, description: '빈칸 채우기 문제(문장-주관식)' }
      ];
    }
  } catch (error) {
    console.error('유형별 포인트 설정 로드 오류:', error);
    throw error;
  }
};

// 유형별 포인트 설정 업데이트
export const updateWorkTypePoints = async (points: WorkTypePoints[]): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', 'workTypePoints');
    
    // 문서가 존재하는지 확인
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // 문서가 존재하면 업데이트
      await updateDoc(docRef, { points });
    } else {
      // 문서가 존재하지 않으면 새로 생성
      await setDoc(docRef, { points });
    }
  } catch (error) {
    console.error('유형별 포인트 설정 업데이트 오류:', error);
    throw error;
  }
};

// 사용자 포인트 차감
export const deductUserPoints = async (
  userId: string, 
  workTypeId: string, 
  workTypeName: string,
  userName: string,
  userNickname: string
): Promise<{ success: boolean; deductedPoints: number; remainingPoints: number; error?: string }> => {
  try {
    // 유형별 포인트 설정 가져오기
    const workTypePoints = await getWorkTypePoints();
    const workType = workTypePoints.find(wt => wt.id === workTypeId);
    
    if (!workType) {
      throw new Error('유형별 포인트 설정을 찾을 수 없습니다.');
    }
    
    const pointsToDeduct = workType.points;
    
    // 사용자 문서 참조
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }
    
    const userData = userSnap.data();
    const currentPoints = userData.points || 0;
    
    // 포인트 부족 확인
    if (currentPoints < pointsToDeduct) {
      return {
        success: false,
        deductedPoints: 0,
        remainingPoints: currentPoints,
        error: '포인트가 부족합니다.'
      };
    }
    
    // 포인트 차감
    await updateDoc(userRef, {
      points: increment(-pointsToDeduct)
    });
    
    // 포인트 거래 내역 기록
    const transaction: Omit<PointTransaction, 'id'> = {
      userId,
      userName,
      userNickname,
      type: 'subtract',
      amount: pointsToDeduct,
      reason: `${workTypeName} 문제 생성`,
      timestamp: new Date(),
      workTypeId,
      workTypeName
    };
    
    await addDoc(collection(db, 'pointTransactions'), transaction);
    
    return {
      success: true,
      deductedPoints: pointsToDeduct,
      remainingPoints: currentPoints - pointsToDeduct
    };
    
  } catch (error) {
    console.error('포인트 차감 오류:', error);
    throw error;
  }
};

// 포인트 환불 (문제 생성 실패 시)
export const refundUserPoints = async (
  userId: string,
  deductedPoints: number,
  workTypeName: string,
  userName: string,
  userNickname: string,
  reason: string = '문제 생성 실패로 인한 포인트 환불'
): Promise<void> => {
  try {
    // 사용자 포인트 복구
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points: increment(deductedPoints)
    });
    
    // 포인트 거래 내역 기록 (환불)
    const transaction: Omit<PointTransaction, 'id'> = {
      userId,
      userName,
      userNickname,
      type: 'refund',
      amount: deductedPoints,
      reason,
      timestamp: new Date(),
      workTypeName
    };
    
    await addDoc(collection(db, 'pointTransactions'), transaction);
    
  } catch (error) {
    console.error('포인트 환불 오류:', error);
    throw error;
  }
};

// 사용자 현재 포인트 조회
export const getUserCurrentPoints = async (userId: string): Promise<number> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data().points || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('사용자 포인트 조회 오류:', error);
    throw error;
  }
};

// 포인트 충전 (결제 완료 시)
export const chargePoints = async (
  userId: string,
  points: number,
  paymentId: string,
  userName: string,
  userNickname: string
): Promise<void> => {
  try {
    // 사용자 문서 참조
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }
    
    // 포인트 증가
    await updateDoc(userRef, {
      points: increment(points),
      updatedAt: serverTimestamp()
    });
    
    // 포인트 거래 내역 기록 (충전)
    // workTypeId와 workTypeName은 포인트 충전 시에는 필요 없으므로 제외
    const transaction: any = {
      userId,
      userName,
      userNickname,
      type: 'charge',
      amount: points,
      reason: `포인트 충전 (결제ID: ${paymentId})`,
      timestamp: new Date()
      // workTypeId와 workTypeName은 문제 생성 시에만 필요하므로 제외
    };
    
    await addDoc(collection(db, 'pointTransactions'), transaction);
    
  } catch (error) {
    console.error('포인트 충전 오류:', error);
    throw error;
  }
};

// 관리자 포인트 관리
export const adminManagePoints = async (
  adminId: string,
  targetUserId: string,
  action: 'add' | 'subtract',
  amount: number,
  reason: string
): Promise<void> => {
  try {
    // 사용자 정보 조회
    const userRef = doc(db, 'users', targetUserId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('대상 사용자를 찾을 수 없습니다.');
    }
    
    const userData = userSnap.data();
    const currentPoints = userData.points || 0;
    
    // 포인트 계산
    const newPoints = action === 'add' 
      ? currentPoints + amount 
      : Math.max(0, currentPoints - amount);
    
    // 포인트 업데이트
    await updateDoc(userRef, {
      points: newPoints,
      updatedAt: serverTimestamp()
    });
    
    // 포인트 거래 내역 기록
    const transaction: Omit<PointTransaction, 'id'> = {
      userId: targetUserId,
      userName: userData.name,
      userNickname: userData.nickname,
      type: action,
      amount: amount,
      reason: `관리자 ${action === 'add' ? '지급' : '차감'}: ${reason}`,
      timestamp: new Date(),
      workTypeId: undefined,
      workTypeName: undefined
    };
    
    await addDoc(collection(db, 'pointTransactions'), transaction);
    
  } catch (error) {
    console.error('관리자 포인트 관리 오류:', error);
    throw error;
  }
};
