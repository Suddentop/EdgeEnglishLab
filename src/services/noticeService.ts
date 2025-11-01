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

// 공지사항 목록 조회
export const getNotices = async (): Promise<Notice[]> => {
  try {
    const q = query(
      collection(db, 'notices'),
      orderBy('createdAt', 'desc')
    );
    
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
    
    return notices;
  } catch (error) {
    console.error('공지사항 조회 실패:', error);
    throw error;
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

