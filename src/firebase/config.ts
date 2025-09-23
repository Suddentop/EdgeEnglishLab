import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// 환경 변수 확인 (개발 환경에서만)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Firebase 설정 로딩 중...');
  if (!process.env.REACT_APP_FIREBASE_API_KEY) {
    console.warn('⚠️ Firebase API Key가 설정되지 않았습니다.');
  }
  if (!process.env.REACT_APP_OPENAI_API_KEY) {
    console.warn('⚠️ OpenAI API Key가 설정되지 않았습니다.');
  }
}

const firebaseConfig = {
  // Firebase 콘솔에서 가져온 설정을 여기에 넣으세요
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Firebase 초기화
let app: any;
let auth: any;
let db: any;
let storage: any;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Firebase 초기화 완료');
  }
} catch (error: any) {
  console.error('❌ Firebase 초기화 실패:', error?.message || error);
  throw error;
}

export { auth, db, storage, app };

// 개발 환경에서 Firebase Functions 에뮬레이터 연결 (선택적)
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true') {
  try {
    const functions = getFunctions(app);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('Firebase Functions 에뮬레이터 연결됨');
  } catch (error) {
    console.warn('Firebase Functions 에뮬레이터 연결 실패:', error);
  }
} 