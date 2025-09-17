import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';

/**
 * 사용자 인터페이스
 */
export interface User {
  uid: string;
  name: string;
  nickname: string;
  email: string;
  phoneNumber?: string;
  role: string;
  createdAt: string;
  isActive: boolean;
  points?: number;
  totalPaidPoints?: number;
  usedPoints?: number;
}

/**
 * 회원 검색 옵션
 */
export interface UserSearchOptions {
  searchTerm?: string;
  searchType?: 'name' | 'nickname' | 'phoneNumber' | 'all';
  role?: string;
  isActive?: boolean;
  limit?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
}

/**
 * 회원 검색
 */
export const searchUsers = async (options: UserSearchOptions = {}): Promise<{
  users: User[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> => {
  try {
    const { 
      searchTerm, 
      searchType = 'all', 
      role, 
      isActive, 
      limit: limitCount = 20,
      lastDoc 
    } = options;

    let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(limitCount));

    // 검색 조건 추가
    if (searchTerm && searchTerm.trim()) {
      if (searchType === 'name') {
        q = query(q, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
      } else if (searchType === 'nickname') {
        q = query(q, where('nickname', '>=', searchTerm), where('nickname', '<=', searchTerm + '\uf8ff'));
      } else if (searchType === 'phoneNumber') {
        q = query(q, where('phoneNumber', '==', searchTerm));
      }
      // 'all'인 경우 클라이언트에서 필터링
    }

    if (role) {
      q = query(q, where('role', '==', role));
    }

    if (isActive !== undefined) {
      q = query(q, where('isActive', '==', isActive));
    }

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const users: User[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        name: data.name || '',
        nickname: data.nickname || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || undefined,
        role: data.role || 'user',
        createdAt: data.createdAt || '',
        isActive: data.isActive !== false, // 기본값 true
        points: data.points || 0,
        totalPaidPoints: data.totalPaidPoints || 0,
        usedPoints: data.usedPoints || 0
      });
    });

    // 'all' 검색인 경우 클라이언트에서 추가 필터링
    let filteredUsers = users;
    if (searchTerm && searchType === 'all') {
      const term = searchTerm.toLowerCase();
      filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(term) ||
        user.nickname.toLowerCase().includes(term) ||
        (user.phoneNumber && user.phoneNumber.includes(term)) ||
        user.email.toLowerCase().includes(term)
      );
    }

    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    const hasMore = querySnapshot.docs.length === limitCount;

    return {
      users: filteredUsers,
      lastDoc: lastVisible || null,
      hasMore
    };
  } catch (error) {
    console.error('회원 검색 오류:', error);
    throw error;
  }
};

/**
 * 회원 정보 업데이트
 */
export const updateUser = async (uid: string, userData: Partial<User>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('회원 정보 업데이트 오류:', error);
    throw error;
  }
};

/**
 * 회원 삭제 (실제 삭제 대신 비활성화)
 */
export const deleteUser = async (uid: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isActive: false,
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('회원 삭제 오류:', error);
    throw error;
  }
};

/**
 * 회원 활성화/비활성화 토글
 */
export const toggleUserStatus = async (uid: string, isActive: boolean): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isActive,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('회원 상태 변경 오류:', error);
    throw error;
  }
};

/**
 * 포인트 수정
 */
export const updateUserPoints = async (
  uid: string, 
  points: number, 
  reason: string,
  adminUid: string
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', uid)));
    
    if (userDoc.empty) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const currentData = userDoc.docs[0].data();
    const currentPoints = currentData.points || 0;
    const newPoints = currentPoints + points;

    await updateDoc(userRef, {
      points: newPoints,
      updatedAt: new Date().toISOString()
    });

    // 포인트 변경 이력 기록
    await setDoc(doc(collection(db, 'pointHistory')), {
      userId: uid,
      adminId: adminUid,
      changeAmount: points,
      previousPoints: currentPoints,
      newPoints: newPoints,
      reason,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('포인트 수정 오류:', error);
    throw error;
  }
};

/**
 * 포인트 사용 금지/허용 토글
 */
export const togglePointUsage = async (uid: string, pointUsageDisabled: boolean): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      pointUsageDisabled,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('포인트 사용 설정 변경 오류:', error);
    throw error;
  }
};
