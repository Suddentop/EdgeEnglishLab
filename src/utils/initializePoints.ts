import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface WorkTypePoints {
  id: string;
  name: string;
  points: number;
  description: string;
}

// 기본 포인트 설정
const defaultWorkTypePoints: WorkTypePoints[] = [
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
  { id: '13', name: '유형#13', points: 12, description: '빈칸 채우기 문제(단어-주관식)' }
];

// Firestore에 포인트 설정 초기화
export const initializeWorkTypePoints = async (): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', 'workTypePoints');
    await setDoc(docRef, { points: defaultWorkTypePoints });
    console.log('포인트 설정이 성공적으로 초기화되었습니다.');
  } catch (error) {
    console.error('포인트 설정 초기화 오류:', error);
    throw error;
  }
};

// 포인트 설정이 존재하는지 확인
export const checkWorkTypePointsExists = async (): Promise<boolean> => {
  try {
    const docRef = doc(db, 'settings', 'workTypePoints');
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('포인트 설정 확인 오류:', error);
    return false;
  }
};
