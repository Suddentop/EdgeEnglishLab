import { auth, db } from '../firebase/config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { POINT_POLICY } from '../utils/pointConstants';
import { DEFAULT_PRINT_HEADER } from '../utils/printHeader';
import { markLoginSession } from '../utils/authSession';

// 사용자 데이터 타입 정의
interface UserData {
  uid: string;
  name: string;
  nickname: string;
  email: string;
  phoneNumber?: string;
  role?: string;
  isActive?: boolean;
  points?: number;
  totalPaidPoints?: number;
  usedPoints?: number;
  createdAt?: string;
}

/**
 * 이메일로 사용자 검색
 */
export const findUserByEmail = async (email: string): Promise<UserData | null> => {
  try {
    // Firestore에서 이메일로 사용자 검색
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return {
        uid: userDoc.id,
        ...userDoc.data()
      } as UserData;
    }
    return null;
  } catch (error) {
    console.error('사용자 검색 오류:', error);
    throw error;
  }
};

/**
 * 이메일로 로그인
 */
export const signInWithEmail = async (email: string, password: string, rememberMe: boolean = false) => {
  try {
    // 세션 단위 또는 자동 로그인(7일) 여부에 따라 퍼시스턴스 설정
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);

    // Firebase Auth 로그인 시도 (로그인 전에는 Firestore 접근 권한이 없으므로 먼저 시도)
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // 로그인 성공 후 잠금 상태 확인 및 실패 횟수 리셋
    try {
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const lockedUntil = data.lockedUntil;
        
        // 잠금 상태 확인 (로그인 성공했으므로 잠금이었다면 해제)
        if (lockedUntil) {
          const lockedUntilTime = lockedUntil.toMillis();
          const now = Date.now();
          
          // 잠금 시간이 지났거나 로그인 성공했으므로 잠금 해제
          await updateDoc(doc(db, 'users', userCredential.user.uid), {
            loginAttempts: 0,
            lockedUntil: null
          });
        } else {
          // 실패 횟수 리셋
          await updateDoc(doc(db, 'users', userCredential.user.uid), {
            loginAttempts: 0,
            lockedUntil: null
          });
        }
      }
    } catch (updateError) {
      // Firestore 업데이트 실패해도 로그인은 성공한 상태이므로 계속 진행
      console.warn('로그인 성공 후 실패 횟수 리셋 실패:', updateError);
    }

    // 로그인 시점 기록 (재인증/자동로그인 만료 체크용)
    markLoginSession(rememberMe);

    return userCredential;
  } catch (error: any) {
    console.error('로그인 오류:', error);
    console.error('오류 코드:', error.code);
    console.error('오류 메시지:', error.message);
    
    // 비밀번호 오류인 경우 Cloud Function을 통해 실패 횟수 추적
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      console.warn('비밀번호 오류 감지 - 이메일:', email);
      try {
        // Cloud Function을 통해 로그인 실패 횟수 추적 (권한 문제 없음)
        const response = await fetch('https://us-central1-edgeenglishlab.cloudfunctions.net/trackLoginFailure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.locked) {
            throw new Error(`계정이 잠겨 있습니다. ${result.remainingMinutes}분 후에 다시 시도해주세요.`);
          } else if (result.remainingAttempts !== undefined) {
            throw new Error(`비밀번호가 올바르지 않습니다. (남은 시도 횟수: ${result.remainingAttempts}회)`);
          }
        }
      } catch (trackError: any) {
        // Cloud Function 호출 실패 시 메시지가 있으면 사용
        if (trackError.message && (trackError.message.includes('잠겨') || trackError.message.includes('남은 시도'))) {
          throw trackError;
        }
        // CORS 오류나 네트워크 오류인 경우 기본 메시지만 표시
        if (trackError.message && (trackError.message.includes('CORS') || trackError.message.includes('Failed to fetch'))) {
          console.warn('로그인 실패 추적 Cloud Function 호출 실패 (배포 필요):', trackError);
          // 기본 에러 메시지 유지
        } else {
          console.warn('로그인 실패 추적 오류:', trackError);
        }
      }
    }
    
    throw error;
  }
};

/**
 * 이메일로 회원가입
 */
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  userData: {
    name: string;
    nickname: string;
    phoneNumber?: string;
    role?: string;
  }
) => {
  try {
    // Firebase Auth로 회원가입
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Firestore에 사용자 정보 저장
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name: userData.name,
      nickname: userData.nickname,
      email: email,
      phoneNumber: userData.phoneNumber || '',
      role: userData.role || 'user',
      isActive: true,
      points: POINT_POLICY.DEFAULT_SIGNUP_POINTS, // 신규 회원가입 시 기본 포인트 자동 부여
      totalPaidPoints: 0,
      usedPoints: 0,
      createdAt: new Date().toISOString(),
      // 문제지 인쇄/저장 헤더 기본값
      printHeader: DEFAULT_PRINT_HEADER
    });
    
    return userCredential;
  } catch (error) {
    console.error('회원가입 오류:', error);
    throw error;
  }
};

/**
 * 현재 사용자의 Firestore 정보 가져오기
 */
export const getCurrentUserData = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // createdAt이 Timestamp 객체인 경우 ISO 문자열로 변환
      if (userData.createdAt) {
        // Firestore Timestamp 객체인지 확인
        if (userData.createdAt.toDate && typeof userData.createdAt.toDate === 'function') {
          userData.createdAt = userData.createdAt.toDate().toISOString();
        } else if (userData.createdAt.seconds) {
          // Timestamp 객체의 seconds 속성이 있는 경우
          const timestamp = userData.createdAt as any;
          userData.createdAt = new Date(timestamp.seconds * 1000).toISOString();
        }
        // 이미 문자열이거나 다른 형식인 경우 그대로 유지
      }
      
      // 로컬 스토리지에 사용자 정보 캐싱
      localStorage.setItem(`userData_${uid}`, JSON.stringify(userData));
      
      return userData;
    }
    return null;
  } catch (error) {
    console.error('사용자 정보 가져오기 오류:', error);
    
    // 오프라인 모드일 때 로컬 스토리지에서 캐시된 데이터 사용
    if (error instanceof Error && error.message.includes('unavailable')) {
      const cachedData = localStorage.getItem(`userData_${uid}`);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          return parsedData;
        } catch (parseError) {
          console.error('캐시된 데이터 파싱 오류:', parseError);
        }
      }
    }
    
    throw error;
  }
};

/**
 * 사용자 정보 업데이트
 */
export const updateUserData = async (uid: string, userData: {
  name?: string;
  nickname?: string;
  email?: string;
  role?: string;
  phoneNumber?: string;
  // 문제지 인쇄/저장 헤더 커스텀 문자열
  printHeader?: string;
}) => {
  try {
    await setDoc(doc(db, 'users', uid), userData, { merge: true });
  } catch (error) {
    console.error('사용자 정보 업데이트 오류:', error);
    throw error;
  }
};

/**
 * 비밀번호 재설정 이메일 발송
 */
export const sendPasswordReset = async (email: string) => {
  try {
    console.log('비밀번호 재설정 이메일 발송 시도:', email);
    
    // 비밀번호 재설정 이메일 발송
    await sendPasswordResetEmail(auth, email);
    
    // 비밀번호 재설정 이메일 발송 시 로그인 실패 횟수 리셋 (Cloud Function을 통해 처리)
    try {
      await fetch('https://us-central1-edgeenglishlab.cloudfunctions.net/resetLoginAttempts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        })
      });
    } catch (resetError) {
      // 실패해도 이메일 발송은 성공했으므로 계속 진행
      console.warn('로그인 실패 횟수 리셋 실패:', resetError);
    }
    
    console.log('비밀번호 재설정 이메일 발송 완료:', email);
    return true;
  } catch (error: any) {
    console.error('비밀번호 재설정 이메일 발송 오류:', error);
    
    // 더 자세한 오류 정보 제공
    if (error.code === 'auth/user-not-found') {
      throw new Error('등록되지 않은 이메일 주소입니다.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('올바르지 않은 이메일 형식입니다.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.');
    } else {
      throw new Error(`이메일 발송에 실패했습니다: ${error.message}`);
    }
  }
};

/**
 * 로그아웃
 */
export const logout = () => {
  return signOut(auth);
};
