import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// 🔍 상세한 환경 변수 진단 로그
console.log('=== 🔍 Firebase 설정 진단 시작 ===');
console.log('📁 현재 NODE_ENV:', process.env.NODE_ENV);
console.log('📁 현재 REACT_APP_OPENAI_API_KEY:', process.env.REACT_APP_OPENAI_API_KEY ? '✅ 있음' : '❌ 없음');
console.log('📁 현재 REACT_APP_FIREBASE_API_KEY:', process.env.REACT_APP_FIREBASE_API_KEY ? '✅ 있음' : '❌ 없음');
console.log('📁 현재 REACT_APP_FIREBASE_AUTH_DOMAIN:', process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? '✅ 있음' : '❌ 없음');
console.log('📁 현재 REACT_APP_FIREBASE_PROJECT_ID:', process.env.REACT_APP_FIREBASE_PROJECT_ID ? '✅ 있음' : '❌ 없음');
console.log('📁 현재 REACT_APP_FIREBASE_STORAGE_BUCKET:', process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ? '✅ 있음' : '❌ 없음');
console.log('📁 현재 REACT_APP_FIREBASE_MESSAGING_SENDER_ID:', process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ? '✅ 있음' : '❌ 없음');
console.log('📁 현재 REACT_APP_FIREBASE_APP_ID:', process.env.REACT_APP_FIREBASE_APP_ID ? '✅ 있음' : '❌ 없음');

// 환경 변수 값들 상세 출력 (보안을 위해 일부만)
if (process.env.REACT_APP_FIREBASE_API_KEY) {
  console.log('🔑 Firebase API Key (처음 10자):', process.env.REACT_APP_FIREBASE_API_KEY.substring(0, 10) + '...');
} else {
  console.log('❌ Firebase API Key가 없습니다!');
}

if (process.env.REACT_APP_OPENAI_API_KEY) {
  console.log('🤖 OpenAI API Key (처음 10자):', process.env.REACT_APP_OPENAI_API_KEY.substring(0, 10) + '...');
} else {
  console.log('❌ OpenAI API Key가 없습니다!');
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

console.log('=== 🔧 Firebase 설정 객체 ===');
console.log('📋 firebaseConfig:', firebaseConfig);

// Firebase 초기화 시도
console.log('=== 🚀 Firebase 초기화 시작 ===');
let app: any;
let auth: any;
let db: any;
let storage: any;

try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase 앱 초기화 성공!');
  
  console.log('=== 🔐 Firebase Auth 초기화 ===');
  auth = getAuth(app);
  console.log('✅ Firebase Auth 초기화 성공!');
  
  console.log('=== 🗄️ Firebase Firestore 초기화 ===');
  db = getFirestore(app);
  console.log('✅ Firebase Firestore 초기화 성공!');
  
  console.log('=== 📁 Firebase Storage 초기화 ===');
  storage = getStorage(app);
  console.log('✅ Firebase Storage 초기화 성공!');
  
  console.log('=== 🎉 모든 Firebase 서비스 초기화 완료! ===');
} catch (error: any) {
  console.error('❌ Firebase 초기화 실패:', error);
  console.error('❌ 에러 상세:', error?.message || '알 수 없는 오류');
  console.error('❌ 에러 스택:', error?.stack || '스택 정보 없음');
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