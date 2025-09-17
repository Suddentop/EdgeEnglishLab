import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { signInWithEmail, signUpWithEmail, logout, getCurrentUserData, updateUserData } from '../services/authService';

// 🔍 AuthContext 진단 로그
console.log('=== 🔐 AuthContext 로딩 시작 ===');
console.log('📁 Firebase auth 객체:', auth ? '✅ 있음' : '❌ 없음');
console.log('📁 Firebase db 객체:', db ? '✅ 있음' : '❌ 없음');

interface AuthContextType {
  currentUser: User | null;
  user: User | null;  // user 속성 추가
  userData: any | null;
  loading: boolean;
  signup: (email: string, password: string, userData: UserData) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (userData: Partial<UserData>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

interface UserData {
  name: string;
  nickname: string;
  phoneNumber: string;
  role?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const signup = async (email: string, password: string, userData: UserData) => {
    await signUpWithEmail(email, password, userData);
  };

  const login = async (email: string, password: string) => {
    await signInWithEmail(email, password);
  };

  const handleLogout = () => {
    return logout();
  };

  const updateUserProfile = async (userData: Partial<UserData>) => {
    if (!currentUser) throw new Error('로그인이 필요합니다');
    await updateUserData(currentUser.uid, userData);
    await refreshUserData();
  };

  const refreshUserData = async () => {
    if (!currentUser) {
      setUserData(null);
      return;
    }
    
    try {
      const data = await getCurrentUserData(currentUser.uid);
      const userDataWithUid = {
        uid: currentUser.uid,
        ...data
      };
      setUserData(userDataWithUid);
    } catch (error) {
      console.error('사용자 정보 새로고침 오류:', error);
      // 오프라인 모드일 때 기본 사용자 정보 설정
      if (error instanceof Error && error.message.includes('unavailable')) {
        const userDataWithUid = {
          uid: currentUser.uid,
          name: '사용자',
          nickname: '사용자',
          email: currentUser.email || '',
          role: 'user'
        };
        setUserData(userDataWithUid);
      }
    }
  };

  useEffect(() => {
    console.log('=== 🔐 AuthProvider useEffect 시작 ===');
    console.log('📁 Firebase auth 객체 상태:', auth ? '✅ 정상' : '❌ 오류');
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log('=== 🔄 인증 상태 변경 감지 ===');
      console.log('📁 사용자 상태:', user ? '✅ 로그인됨' : '❌ 로그아웃됨');
      if (user) {
        console.log('📁 사용자 UID:', user.uid);
        console.log('📁 사용자 이메일:', user.email);
      }
      
      try {
        setCurrentUser(user);
        if (user) {
          try {
            // 사용자 정보 로드
            const data = await getCurrentUserData(user.uid);
            setUserData({
              uid: user.uid,  // uid 추가
              ...(data || {
                name: '사용자',
                nickname: '사용자', 
                email: user.email || '',
                role: 'user'
              })
            });
            
            // 사용자 문서 실시간 구독으로 role 등 변경 즉시 반영
            const userRef = doc(db, 'users', user.uid);
            const unsubscribeUser = onSnapshot(userRef, (snapshot) => {
              if (snapshot.exists()) {
                setUserData({
                  uid: user.uid,  // uid 추가
                  ...snapshot.data()
                });
              }
            }, (error) => {
              console.warn('사용자 문서 구독 오류:', error);
            });
            // 컴포넌트 언마운트 시 구독 해제는 cleanup에서 처리
          } catch (error: any) {
            console.error('❌ 사용자 데이터 로드 실패:', error);
            console.error('❌ 에러 상세:', error?.message || '알 수 없는 오류');
            console.error('❌ 에러 스택:', error?.stack || '스택 정보 없음');
            // 기본 사용자 정보 설정
            setUserData({
              uid: user.uid,  // uid 추가
              name: '사용자',
              nickname: '사용자',
              email: user.email || '',
              role: 'user'
            });
          }
        } else {
          console.log('📁 사용자가 없음 - userData를 null로 설정');
          setUserData(null);
        }
      } catch (error: any) {
        console.error('❌ 인증 상태 변경 처리 오류:', error);
        console.error('❌ 에러 상세:', error?.message || '알 수 없는 오류');
        console.error('❌ 에러 스택:', error?.stack || '스택 정보 없음');
        setUserData(null);
      } finally {
        console.log('📁 로딩 완료 - loading을 false로 설정');
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const value = {
    currentUser,
    user: currentUser,  // user를 currentUser와 동일하게 설정
    userData,
    loading,
    signup,
    login,
    logout: handleLogout,
    updateUserProfile,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px' 
        }}>
          로딩 중...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}; 