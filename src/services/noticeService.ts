import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Notice {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt?: Date;
  isImportant?: boolean; // 중요 공지 여부
}

// 공지사항 목록 조회 (로그인 없이도 조회 가능)
export const getNotices = async (): Promise<Notice[]> => {
  try {
    // orderBy 없이 전체 컬렉션 조회 (권한 문제 방지)
    // 로그인 없이도 조회 가능하도록 orderBy를 사용하지 않고 클라이언트에서 정렬
    const q = query(collection(db, 'notices'));
    const querySnapshot = await getDocs(q);
    const notices: Notice[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notices.push({
        id: doc.id,
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        isImportant: data.isImportant || false
      });
    });
    
    // 클라이언트 측에서 날짜순 정렬 (최신순)
    notices.sort((a, b) => {
      const dateA = a.createdAt.getTime();
      const dateB = b.createdAt.getTime();
      return dateB - dateA; // 내림차순
    });
    
    return notices;
  } catch (error: any) {
    console.error('공지사항 조회 실패:', error);
    // 권한 오류나 기타 오류 발생 시에도 빈 배열을 반환하여 페이지가 정상적으로 표시되도록 함
    // 로그인 없이도 이용안내 페이지의 다른 탭(이용안내, 이용약관 등)은 정상적으로 볼 수 있어야 함
    return [];
  }
};

// 공지사항 등록
export const createNotice = async (
  title: string,
  content: string,
  authorId: string,
  authorName: string,
  isImportant: boolean = false
): Promise<string> => {
  try {
    const noticeData = {
      title: title.trim(),
      content: content.trim(),
      authorId,
      authorName,
      isImportant,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'notices'), noticeData);
    return docRef.id;
  } catch (error) {
    console.error('공지사항 등록 실패:', error);
    throw error;
  }
};

// 공지사항 수정
export const updateNotice = async (
  noticeId: string,
  title: string,
  content: string,
  isImportant: boolean = false
): Promise<void> => {
  try {
    const docRef = doc(db, 'notices', noticeId);
    await updateDoc(docRef, {
      title: title.trim(),
      content: content.trim(),
      isImportant,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('공지사항 수정 실패:', error);
    throw error;
  }
};

// 공지사항 삭제
export const deleteNotice = async (noticeId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'notices', noticeId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('공지사항 삭제 실패:', error);
    throw error;
  }
};

