import { collection, query, where, orderBy, limit, getDocs, addDoc, doc, getDoc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface QuizHistoryItem {
  id: string;
  userId: string;
  userName: string;
  userNickname: string;
  createdAt: Date;
  workTypeId: string;
  workTypeName: string;
  pointsDeducted: number;
  pointsRefunded: number;
  status: 'success' | 'partial' | 'failed' | 'refunded';
  inputText: string;
  generatedData: any; // 생성된 문제 데이터
  // 파일 정보 (문제/정답 구분)
  problemFileUrl?: string; // 문제 PDF 파일 URL
  problemFileName?: string; // 문제 PDF 파일명
  answerFileUrl?: string; // 정답 PDF 파일 URL
  answerFileName?: string; // 정답 PDF 파일명
  expiresAt: Date; // 파일 만료일 (6개월 후)
  // 패키지 정보 (패키지인 경우)
  isPackage?: boolean; // 패키지 여부
  packageWorkTypes?: string[]; // 패키지에 포함된 유형들
}

export interface QuizHistorySearchParams {
  startDate?: Date;
  endDate?: Date;
  workTypeId?: string;
  status?: string;
  limit?: number;
}

// 문제 생성 내역 저장
export const saveQuizHistory = async (
  userId: string,
  userName: string,
  userNickname: string,
  workTypeId: string,
  workTypeName: string,
  pointsDeducted: number,
  inputText: string,
  generatedData: any,
  status: 'success' | 'partial' | 'failed' | 'refunded' = 'success'
): Promise<string> => {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000); // 6개월 후 (약 180일)

    const historyData = {
      userId,
      userName,
      userNickname,
      createdAt: Timestamp.fromDate(now),
      workTypeId,
      workTypeName,
      pointsDeducted,
      pointsRefunded: 0,
      status,
      inputText,
      generatedData: JSON.stringify(generatedData), // 중첩 배열 문제 해결을 위해 JSON 문자열로 변환
      expiresAt: Timestamp.fromDate(expiresAt)
    };

    const docRef = await addDoc(collection(db, 'quizHistory'), historyData);
    return docRef.id;
  } catch (error) {
    console.error('문제 생성 내역 저장 실패:', error);
    throw error;
  }
};

// 문제 생성 내역 조회
export const getQuizHistory = async (
  userId: string,
  searchParams?: QuizHistorySearchParams
): Promise<QuizHistoryItem[]> => {
  try {
    // 6개월 이전 날짜 계산
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    let q = query(
      collection(db, 'quizHistory'),
      where('userId', '==', userId),
      where('createdAt', '>=', Timestamp.fromDate(sixMonthsAgo))
    );

    const querySnapshot = await getDocs(q);
    const history: QuizHistoryItem[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt.toDate();
      
      // 6개월 체크 (추가 안전장치)
      const sixMonthsAgoCheck = new Date();
      sixMonthsAgoCheck.setMonth(sixMonthsAgoCheck.getMonth() - 6);
      
      if (createdAt < sixMonthsAgoCheck) {
        return; // 6개월 이전 데이터는 제외
      }
      
      history.push({
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        userNickname: data.userNickname,
        createdAt: createdAt,
        workTypeId: data.workTypeId,
        workTypeName: data.workTypeName,
        pointsDeducted: data.pointsDeducted,
        pointsRefunded: data.pointsRefunded,
        status: data.status,
        inputText: data.inputText,
        generatedData: typeof data.generatedData === 'string' ? JSON.parse(data.generatedData) : data.generatedData,
        problemFileUrl: data.problemFileUrl,
        problemFileName: data.problemFileName,
        answerFileUrl: data.answerFileUrl,
        answerFileName: data.answerFileName,
        expiresAt: data.expiresAt.toDate(),
        isPackage: data.isPackage || false,
        packageWorkTypes: data.packageWorkTypes || []
      });
    });

    // 클라이언트 사이드에서 정렬 및 필터링
    let filteredHistory = history;
    
    // 날짜순 내림차순 정렬 (최신순)
    filteredHistory = filteredHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (searchParams?.workTypeId) {
      filteredHistory = filteredHistory.filter(item => item.workTypeId === searchParams.workTypeId);
    }
    
    if (searchParams?.status) {
      filteredHistory = filteredHistory.filter(item => item.status === searchParams.status);
    }
    
    if (searchParams?.startDate) {
      filteredHistory = filteredHistory.filter(item => item.createdAt >= searchParams.startDate!);
    }
    
    if (searchParams?.endDate) {
      filteredHistory = filteredHistory.filter(item => item.createdAt <= searchParams.endDate!);
    }
    
    // limit 적용 (정렬 후)
    if (searchParams?.limit) {
      filteredHistory = filteredHistory.slice(0, searchParams.limit);
    }

    return filteredHistory;
  } catch (error) {
    console.error('문제 생성 내역 조회 실패:', error);
    throw error;
  }
};

// 특정 내역 조회
export const getQuizHistoryItem = async (historyId: string): Promise<QuizHistoryItem | null> => {
  try {
    const docRef = doc(db, 'quizHistory', historyId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        userName: data.userName,
        userNickname: data.userNickname,
        createdAt: data.createdAt.toDate(),
        workTypeId: data.workTypeId,
        workTypeName: data.workTypeName,
        pointsDeducted: data.pointsDeducted,
        pointsRefunded: data.pointsRefunded,
        status: data.status,
        inputText: data.inputText,
        generatedData: typeof data.generatedData === 'string' ? JSON.parse(data.generatedData) : data.generatedData,
        problemFileUrl: data.problemFileUrl,
        problemFileName: data.problemFileName,
        answerFileUrl: data.answerFileUrl,
        answerFileName: data.answerFileName,
        expiresAt: data.expiresAt.toDate(),
        isPackage: data.isPackage || false,
        packageWorkTypes: data.packageWorkTypes || []
      };
    }

    return null;
  } catch (error) {
    console.error('문제 생성 내역 상세 조회 실패:', error);
    throw error;
  }
};

// 환불 내역 업데이트
export const updateQuizHistoryRefund = async (
  historyId: string,
  pointsRefunded: number
): Promise<void> => {
  try {
    const docRef = doc(db, 'quizHistory', historyId);
    await updateDoc(docRef, {
      pointsRefunded,
      status: 'refunded',
      refundedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('환불 내역 업데이트 실패:', error);
    throw error;
  }
};

// 파일 URL 업데이트 (문제/정답 구분)
export const updateQuizHistoryFile = async (
  historyId: string,
  fileUrl: string,
  fileName: string,
  fileType: 'problem' | 'answer'
): Promise<void> => {
  try {
    const docRef = doc(db, 'quizHistory', historyId);
    const updateData = fileType === 'problem' 
      ? { problemFileUrl: fileUrl, problemFileName: fileName }
      : { answerFileUrl: fileUrl, answerFileName: fileName };
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('파일 URL 업데이트 실패:', error);
    throw error;
  }
};

// 만료된 내역 정리 (6개월 후 자동 삭제)
export const cleanupExpiredHistory = async (): Promise<void> => {
  try {
    const now = new Date();
    // expiresAt이 지났거나, createdAt이 6개월 이전인 데이터 삭제
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // 두 가지 조건으로 삭제: expiresAt이 지났거나, createdAt이 6개월 이전
    const q1 = query(
      collection(db, 'quizHistory'),
      where('expiresAt', '<=', Timestamp.fromDate(now))
    );
    
    const q2 = query(
      collection(db, 'quizHistory'),
      where('createdAt', '<', Timestamp.fromDate(sixMonthsAgo))
    );

    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);

    // 중복 제거를 위한 Set 사용
    const docIdsToDelete = new Set<string>();
    snapshot1.docs.forEach(doc => docIdsToDelete.add(doc.id));
    snapshot2.docs.forEach(doc => docIdsToDelete.add(doc.id));

    const deletePromises = Array.from(docIdsToDelete).map(id => {
      const docRef = doc(db, 'quizHistory', id);
      return deleteDoc(docRef);
    });

    await Promise.all(deletePromises);
    console.log(`만료된 내역 ${deletePromises.length}개 정리 완료 (6개월 제한)`);
  } catch (error) {
    console.error('만료된 내역 정리 실패:', error);
    throw error;
  }
};

// 통계 정보 조회
export const getQuizHistoryStats = async (userId: string) => {
  try {
    const history = await getQuizHistory(userId);
    
    const stats = {
      totalGenerated: history.length,
      totalPointsSpent: history.reduce((sum, item) => sum + item.pointsDeducted, 0),
      totalPointsRefunded: history.reduce((sum, item) => sum + item.pointsRefunded, 0),
      successCount: history.filter(item => item.status === 'success').length,
      partialCount: history.filter(item => item.status === 'partial').length,
      failedCount: history.filter(item => item.status === 'failed').length,
      refundedCount: history.filter(item => item.status === 'refunded').length,
      workTypeStats: {} as Record<string, number>
    };

    // 유형별 통계
    history.forEach(item => {
      stats.workTypeStats[item.workTypeId] = (stats.workTypeStats[item.workTypeId] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('통계 정보 조회 실패:', error);
    throw error;
  }
};

// 사용자 내역 일괄 삭제 (임시 관리용)
export const deleteAllQuizHistoryForUser = async (userId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, 'quizHistory'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    return snapshot.size;
  } catch (error) {
    console.error('사용자 내역 일괄 삭제 실패:', error);
    throw error;
  }
};
