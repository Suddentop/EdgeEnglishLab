import { auth } from '../firebase/config';
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

/**
 * 이메일 주소가 Firebase Auth에 등록되어 있는지 확인
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    return signInMethods.length > 0;
  } catch (error) {
    console.error('이메일 존재 확인 오류:', error);
    return false;
  }
};

// 반환 타입 정의
interface PasswordResetResult {
  success: boolean;
  message: string;
  diagnostics?: {
    emailFormat: boolean;
    emailExists: boolean;
    emailSent: boolean;
  };
  resetLink?: string;
}

/**
 * 비밀번호 재설정 이메일 발송 (진단 정보 포함)
 */
export const sendPasswordResetWithDiagnostics = async (email: string): Promise<PasswordResetResult> => {
  try {
    console.log('=== 비밀번호 재설정 진단 시작 ===');
    console.log('대상 이메일:', email);
    
    // 1. 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      throw new Error('올바른 이메일 주소를 입력해주세요.');
    }
    
    // 이메일 기반 비밀번호 재설정 처리
    console.log('이메일 기반 비밀번호 재설정 처리');
    
    // 2. 이메일이 Firebase Auth에 등록되어 있는지 확인
    console.log('이메일 등록 상태 확인 중...');
    const emailExists = await checkEmailExists(email);
    console.log('이메일 등록 상태:', emailExists ? '등록됨' : '등록되지 않음');
    
    if (!emailExists) {
      throw new Error('등록되지 않은 이메일 주소입니다.');
    }
    
    // 3. 비밀번호 재설정 이메일 발송
    console.log('비밀번호 재설정 이메일 발송 중...');
    await sendPasswordResetEmail(auth, email);
    console.log('비밀번호 재설정 이메일 발송 완료');
    
    console.log('=== 비밀번호 재설정 진단 완료 ===');
    return {
      success: true,
      message: '비밀번호 재설정 이메일이 발송되었습니다.',
      diagnostics: {
        emailExists: true,
        emailFormat: true,
        emailSent: true
      }
    };
    
  } catch (error: any) {
    console.error('비밀번호 재설정 진단 오류:', error);
    
    return {
      success: false,
      message: error.message || '이메일 발송에 실패했습니다.',
      diagnostics: {
        emailExists: false,
        emailFormat: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        emailSent: false
      }
    };
  }
};

/**
 * Firebase 프로젝트 설정 확인
 */
export const checkFirebaseConfig = () => {
  const config = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  };
  
  console.log('=== Firebase 설정 확인 ===');
  // console.log('API Key:', config.apiKey ? '설정됨' : '설정되지 않음'); // 보안상 제거됨
  console.log('Auth Domain:', config.authDomain);
  console.log('Project ID:', config.projectId);
  console.log('Storage Bucket:', config.storageBucket);
  console.log('Messaging Sender ID:', config.messagingSenderId);
  console.log('App ID:', config.appId);
  
  return config;
};
