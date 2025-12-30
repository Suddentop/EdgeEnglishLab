import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../services/adminService';
import './PointManagement.css';

interface PointTransaction {
  id: string;
  userId: string;
  userName: string;
  userNickname: string;
  type: 'add' | 'subtract' | 'charge';
  amount: number;
  reason: string;
  timestamp: Date;
  adminId: string;
}

interface WorkTypePoints {
  id: string;
  name: string;
  points: number;
  description: string;
}

const PointManagement: React.FC = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [workTypePoints, setWorkTypePoints] = useState<WorkTypePoints[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pointAction, setPointAction] = useState<'add' | 'subtract'>('add');
  const [pointAmount, setPointAmount] = useState('');
  const [pointReason, setPointReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'points' | 'workTypes'>('users');
  
  // 거래 내역 검색 및 페이지네이션 상태
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const [transactionSearchType, setTransactionSearchType] = useState<'userName' | 'userNickname' | 'reason' | 'all'>('all');
  const [transactionPage, setTransactionPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [transactionsPerPage] = useState(20);
  
  // 디바운싱을 위한 타이머
  const [updateTimer, setUpdateTimer] = useState<NodeJS.Timeout | null>(null);

  // 초기 데이터 로드
  useEffect(() => {
    loadUsers();
    loadTransactions();
    loadWorkTypePoints();
  }, []);

  // 모든 사용자 로드 (Firebase에서 실제 데이터)
  const loadUsers = async () => {
    try {
      setLoading(true);
      const { searchUsers } = await import('../../services/adminService');
      const { users: usersData } = await searchUsers({ limit: 100 }); // 최대 100명까지 로드
      setUsers(usersData);
    } catch (error) {
      console.error('사용자 목록 로드 오류:', error);
      // 에러 발생 시 기본 데이터 표시
      const mockUsers: User[] = [
        {
          uid: '1',
          name: '민경호',
          nickname: '스피디볼',
          email: 'speedyball@naver.com',
          phoneNumber: '01080616536',
          role: 'user',
          isActive: true,
          points: 10000,
          createdAt: '2025-08-10'
        },
        {
          uid: '2',
          name: '김동연',
          nickname: '재제이',
          email: 'pretyeon@naver.com',
          phoneNumber: '01020816536',
          role: 'admin',
          isActive: true,
          points: 0,
          createdAt: '2025-07-20'
        },
        {
          uid: '3',
          name: '민경호',
          nickname: 'Sudden',
          email: 'suddenbiz@naver.com',
          phoneNumber: '01020745158',
          role: 'admin',
          isActive: true,
          points: 10000,
          createdAt: '2025-07-19'
        }
      ];
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  // 유형별 포인트 설정 로드 (Firebase에서)
  const loadWorkTypePoints = async () => {
    try {
      const { getWorkTypePoints } = await import('../../services/pointService');
      const points = await getWorkTypePoints();
      
      // 유형#11, 유형#12, 유형#13, ETC#01가 누락된 경우 추가
      let updatedPoints = [...points];
      const hasType11 = updatedPoints.some(wt => wt.id === '11');
      const hasType12 = updatedPoints.some(wt => wt.id === '12');
      const hasType13 = updatedPoints.some(wt => wt.id === '13');
      const hasType15 = updatedPoints.some(wt => wt.id === '15');
      
      if (!hasType11) {
        console.log('유형#11이 누락되어 자동으로 추가합니다.');
        updatedPoints.push({
          id: '11',
          name: '유형#11',
          points: 18,
          description: '기사 순서 문제'
        });
      } else {
        console.log('유형#11이 이미 존재합니다:', updatedPoints.find(wt => wt.id === '11'));
      }
      
      if (!hasType12) {
        console.log('유형#12가 누락되어 자동으로 추가합니다.');
        updatedPoints.push({
          id: '12',
          name: '유형#12',
          points: 20,
          description: '영어단어 문제'
        });
      } else {
        console.log('유형#12가 이미 존재합니다:', updatedPoints.find(wt => wt.id === '12'));
      }
      
      if (!hasType13) {
        console.log('유형#13이 누락되어 자동으로 추가합니다.');
        updatedPoints.push({
          id: '13',
          name: '유형#13',
          points: 12,
          description: '빈칸 채우기 문제(단어-주관식)'
        });
      } else {
        console.log('유형#13이 이미 존재합니다:', updatedPoints.find(wt => wt.id === '13'));
      }

      if (!hasType15) {
        console.log('ETC#01가 누락되어 자동으로 추가합니다.');
        updatedPoints.push({
          id: '15',
          name: 'ETC#01',
          points: 18,
          description: '본문 해석 및 추출'
        });
      } else {
        console.log('ETC#01가 이미 존재합니다:', updatedPoints.find(wt => wt.id === '15'));
      }
      
      // Firebase에 업데이트된 데이터 저장 (유형#11, 유형#12, 유형#13 추가 또는 유형#07 설명 업데이트)
      const needsUpdate = !hasType11 || !hasType12 || !hasType13 || !hasType15 || 
        updatedPoints.find(wt => wt.id === '7')?.description !== '주제 추론 문제 생성';
      
      if (needsUpdate) {
        try {
          const { updateWorkTypePoints: updateFirebase } = await import('../../services/pointService');
          await updateFirebase(updatedPoints);
          console.log('Firebase에 데이터가 성공적으로 업데이트되었습니다.');
        } catch (updateError) {
          console.warn('Firebase 업데이트 실패:', updateError);
        }
      }
      
      // 유형#07 설명 업데이트 (기존 데이터와 동기화)
      updatedPoints = updatedPoints.map(wt => 
        wt.id === '7' ? { ...wt, description: '주제 추론 문제 생성' } : wt
      );
      
      // 로컬 상태에 설정
      setWorkTypePoints(updatedPoints);
      console.log('최종 workTypePoints:', updatedPoints);
      
    } catch (error) {
      console.error('유형별 포인트 설정 로드 오류:', error);
      // 에러 시 기본값 사용
      const defaultPoints: WorkTypePoints[] = [
        { id: '1', name: '유형#01', points: 10, description: '문장 순서 테스트' },
        { id: '2', name: '유형#02', points: 15, description: '독해 문제 생성' },
        { id: '3', name: '유형#03', points: 12, description: '어휘 단어 문제' },
        { id: '4', name: '유형#04', points: 18, description: '빈칸(구) 추론 문제' },
        { id: '5', name: '유형#05', points: 20, description: '빈칸(문장) 추론 문제' },
        { id: '6', name: '유형#06', points: 16, description: '문장 위치 추론 문제' },
        { id: '7', name: '유형#07', points: 22, description: '주제 추론 문제 생성' },
        { id: '8', name: '유형#08', points: 25, description: '제목 추론 문제' },
        { id: '9', name: '유형#09', points: 14, description: '문법 오류 문제' },
        { id: '10', name: '유형#10', points: 30, description: '복합 문법 오류 문제' },
        { id: '11', name: '유형#11', points: 18, description: '기사 순서 문제' },
        { id: '12', name: '유형#12', points: 20, description: '영어단어 문제' }
      ];
      setWorkTypePoints(defaultPoints);
      console.log('에러로 인해 기본값 사용:', defaultPoints);
    }
  };

  // 유형별 포인트 설정 업데이트
  const updateWorkTypePoints = async (id: string, points: number) => {
    try {
      // 업데이트된 전체 배열 생성
      const updatedWorkTypePoints = workTypePoints.map(workType => 
        workType.id === id ? { ...workType, points } : workType
      );
      
      // Firebase에 저장 (업데이트된 배열 전달)
      const { updateWorkTypePoints: updateFirebase } = await import('../../services/pointService');
      await updateFirebase(updatedWorkTypePoints);
      
      // Firebase 저장 성공 후 로컬 상태 업데이트
      setWorkTypePoints(updatedWorkTypePoints);
      
      setMessage({ type: 'success', text: '포인트 설정이 업데이트되었습니다.' });
    } catch (error) {
      console.error('포인트 설정 업데이트 오류:', error);
      setMessage({ type: 'error', text: '포인트 설정 업데이트에 실패했습니다.' });
      
      // 에러 시 원래 값으로 복구
      setWorkTypePoints(prev => 
        prev.map(workType => 
          workType.id === id ? { ...workType, points: workType.points } : workType
        )
      );
    }
  };

  // 포인트 거래 내역 로드 (Firebase에서)
  const loadTransactions = async (isNewSearch: boolean = false) => {
    try {
      const { collection, query, orderBy, limit, getDocs, where, startAfter, getCountFromServer } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');
      
      // 검색 조건이 있는 경우 먼저 전체 개수를 확인
      let baseQuery = query(collection(db, 'pointTransactions'), orderBy('timestamp', 'desc'));
      
      if (transactionSearchTerm && transactionSearchTerm.trim()) {
        if (transactionSearchType === 'userName') {
          baseQuery = query(baseQuery, where('userName', '>=', transactionSearchTerm), where('userName', '<=', transactionSearchTerm + '\uf8ff'));
        } else if (transactionSearchType === 'userNickname') {
          baseQuery = query(baseQuery, where('userNickname', '>=', transactionSearchTerm), where('userNickname', '<=', transactionSearchTerm + '\uf8ff'));
        } else if (transactionSearchType === 'reason') {
          baseQuery = query(baseQuery, where('reason', '>=', transactionSearchTerm), where('reason', '<=', transactionSearchTerm + '\uf8ff'));
        }
      }

      // 전체 개수 확인
      const countSnapshot = await getCountFromServer(baseQuery);
      const total = countSnapshot.data().count;
      setTotalTransactions(total);
      setTotalPages(Math.ceil(total / transactionsPerPage));

      // 페이지네이션을 위한 쿼리
      let pageQuery = query(baseQuery, limit(transactionsPerPage));
      
      // 페이지가 1보다 큰 경우 startAfter 사용
      if (transactionPage > 1) {
        // 이전 페이지의 마지막 문서를 찾기 위해 임시로 이전 페이지 데이터 로드
        const tempQuery = query(baseQuery, limit((transactionPage - 1) * transactionsPerPage));
        const tempSnapshot = await getDocs(tempQuery);
        if (tempSnapshot.docs.length > 0) {
          const lastDoc = tempSnapshot.docs[tempSnapshot.docs.length - 1];
          pageQuery = query(baseQuery, startAfter(lastDoc), limit(transactionsPerPage));
        }
      }

      const querySnapshot = await getDocs(pageQuery);
      const transactionsData: PointTransaction[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactionsData.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userNickname: data.userNickname,
          type: data.type,
          amount: data.amount,
          reason: data.reason,
          timestamp: data.timestamp?.toDate() || new Date(),
          adminId: data.adminId
        });
      });

      setTransactions(transactionsData);
    } catch (error) {
      console.error('거래 내역 로드 오류:', error);
      // 에러 발생 시 기본 데이터 표시
      const mockTransactions: PointTransaction[] = [
        {
          id: '1',
          userId: '1',
          userName: '민경호',
          userNickname: '스피디볼',
          type: 'add',
          amount: 10000,
          reason: '초기 포인트 지급',
          timestamp: new Date('2025-01-15'),
          adminId: 'admin1'
        },
        {
          id: '2',
          userId: '2',
          userName: '김동연',
          userNickname: '재제이',
          type: 'add',
          amount: 5000,
          reason: '이벤트 보상',
          timestamp: new Date('2025-01-14'),
          adminId: 'admin1'
        }
      ];
      setTransactions(mockTransactions);
      setTotalTransactions(2);
      setTotalPages(1);
    }
  };

  // 거래 내역 검색
  const handleTransactionSearch = () => {
    loadTransactions(true);
  };

  // 거래 내역 검색 초기화
  const resetTransactionSearch = () => {
    setTransactionSearchTerm('');
    setTransactionSearchType('all');
    setTransactionPage(1);
    loadTransactions(true);
  };

  // 특정 페이지로 이동
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== transactionPage) {
      setTransactionPage(page);
      loadTransactions(false);
    }
  };

  // 이전 페이지로 이동
  const goToPreviousPage = () => {
    if (transactionPage > 1) {
      goToPage(transactionPage - 1);
    }
  };

  // 다음 페이지로 이동
  const goToNextPage = () => {
    if (transactionPage < totalPages) {
      goToPage(transactionPage + 1);
    }
  };

  // 페이지 번호 배열 생성 (최대 5개씩 표시)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, transactionPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  // 검색어 변경 시 자동 검색 (디바운싱)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (transactionSearchTerm.trim()) {
        handleTransactionSearch();
      } else if (transactionSearchTerm === '') {
        resetTransactionSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [transactionSearchTerm, transactionSearchType]);

  // 전화번호 포맷팅
  const formatPhoneNumber = (phoneNumber?: string): string => {
    if (!phoneNumber) return '-';
    if (phoneNumber.length === 11) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7)}`;
    }
    return phoneNumber;
  };

  // 포인트 포맷팅 (1,000 단위 쉼표 삽입)
  const formatPoints = (points: number): string => {
    return points.toLocaleString() + 'P';
  };

  // 포인트 수정 모달 열기
  const openPointModal = (user: User) => {
    setSelectedUser(user);
    setPointAction('add');
    setPointAmount('');
    setPointReason('');
    setIsModalOpen(true);
  };

  // 포인트 수정 처리
  const handlePointModification = async () => {
    if (!selectedUser || !pointAmount || !pointReason) {
      setMessage({ type: 'error', text: '모든 필드를 입력해주세요.' });
      return;
    }

    const amount = parseInt(pointAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: '유효한 포인트 금액을 입력해주세요.' });
      return;
    }

    try {
      setLoading(true);
      
      // Firebase에 거래 내역 저장
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../firebase/config');
      
      const newTransaction: PointTransaction = {
        id: Date.now().toString(),
        userId: selectedUser.uid,
        userName: selectedUser.name,
        userNickname: selectedUser.nickname,
        type: pointAction,
        amount: amount,
        reason: pointReason,
        timestamp: new Date(),
        adminId: userData?.uid || 'unknown'
      };

      // Firestore에 거래 내역 저장
      await addDoc(collection(db, 'pointTransactions'), {
        userId: selectedUser.uid,
        userName: selectedUser.name,
        userNickname: selectedUser.nickname,
        type: pointAction,
        amount: amount,
        reason: pointReason,
        timestamp: serverTimestamp(),
        adminId: userData?.uid || 'unknown'
      });

      // 사용자 포인트 업데이트 (Firebase)
      const { updateDoc, doc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', selectedUser.uid);
      
      const newPoints = pointAction === 'add' 
        ? (selectedUser.points || 0) + amount 
        : Math.max(0, (selectedUser.points || 0) - amount);
      
      await updateDoc(userRef, {
        points: newPoints,
        updatedAt: serverTimestamp()
      });

      // 로컬 상태 업데이트
      setTransactions(prev => [newTransaction, ...prev]);
      setUsers(prev => prev.map(user => 
        user.uid === selectedUser.uid 
          ? { ...user, points: newPoints }
          : user
      ));

      setMessage({ type: 'success', text: '포인트가 성공적으로 수정되었습니다.' });
      setIsModalOpen(false);
      
      // 3초 후 메시지 제거
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('포인트 수정 오류:', error);
      setMessage({ type: 'error', text: '포인트 수정에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 모달 닫기
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setPointAmount('');
    setPointReason('');
  };

  return (
    <div className="point-management">
      <div className="point-header">
        <h2>🎯 포인트관리</h2>
        <div className="point-stats">
          <div className="stat-item">
            <span className="stat-label">총 회원</span>
            <span className="stat-value">{users.length}명</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">총 포인트</span>
            <span className="stat-value">{users.reduce((sum, user) => sum + (user.points || 0), 0).toLocaleString()}P</span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="point-management-tabs">
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 사용자 포인트
        </button>
        <button 
          className={`tab-btn ${activeTab === 'points' ? 'active' : ''}`}
          onClick={() => setActiveTab('points')}
        >
          💰 포인트 거래 내역
        </button>
        <button 
          className={`tab-btn ${activeTab === 'workTypes' ? 'active' : ''}`}
          onClick={() => setActiveTab('workTypes')}
        >
          ⚙️ 유형별 포인트 설정
        </button>
      </div>

      <div className="point-content">
        {activeTab === 'users' && (
          <div className="user-points-section">
            <h3>👥 회원 포인트 현황</h3>
          <div className="user-points-table">
            <table className="point-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>닉네임</th>
                  <th>전화번호</th>
                  <th>이메일</th>
                  <th>잔여포인트</th>
                  <th>누적충전</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid}>
                    <td>{user.name}</td>
                    <td>{user.nickname}</td>
                    <td>{formatPhoneNumber(user.phoneNumber)}</td>
                    <td>{user.email}</td>
                    <td className="current-points">{formatPoints(user.points || 0)}</td>
                    <td className="total-paid">{formatPoints(0)}</td>
                    <td>
                      <button 
                        onClick={() => openPointModal(user)}
                        className="modify-button"
                      >
                        포인트 수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {activeTab === 'points' && (
          <div className="transactions-section">
            <h3>📋 포인트 거래 내역</h3>
            
            {/* 검색 기능 */}
            <div className="search-section">
              <div className="search-inputs">
                <select 
                  value={transactionSearchType} 
                  onChange={(e) => setTransactionSearchType(e.target.value as any)}
                  className="search-type-select"
                >
                  <option value="all">전체</option>
                  <option value="userName">사용자명</option>
                  <option value="userNickname">닉네임</option>
                  <option value="reason">사유</option>
                </select>
                <input
                  type="text"
                  value={transactionSearchTerm}
                  onChange={(e) => setTransactionSearchTerm(e.target.value)}
                  placeholder="검색어를 입력하세요"
                  className="search-input"
                />
                <button 
                  onClick={handleTransactionSearch}
                  className="search-button"
                  disabled={!transactionSearchTerm.trim()}
                >
                  검색
                </button>
                <button 
                  onClick={resetTransactionSearch}
                  className="reset-button"
                >
                  초기화
                </button>
              </div>
            </div>

            <div className="transactions-table">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>사용자</th>
                    <th>구분</th>
                    <th>금액</th>
                    <th>포인트</th>
                    <th>사유</th>
                    <th>처리자</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.timestamp.toLocaleDateString()}</td>
                      <td>{transaction.userName} ({transaction.userNickname})</td>
                      <td>
                        <span className={`transaction-type ${transaction.type}`}>
                          {transaction.type === 'add' ? '지급' : 
                           transaction.type === 'subtract' ? '차감' : '충전'}
                        </span>
                      </td>
                      <td className={`amount ${transaction.type}`}>
                        {transaction.type === 'subtract' ? '-' : '+'}{transaction.amount.toLocaleString()}
                      </td>
                      <td className={`points ${transaction.type}`}>
                        {transaction.type === 'subtract' ? '-' : '+'}{formatPoints(transaction.amount)}
                      </td>
                      <td>{transaction.reason}</td>
                      <td>관리자</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="pagination-section">
                  <div className="pagination-info">
                    <span>총 {totalTransactions}건 중 {(transactionPage - 1) * transactionsPerPage + 1}~{Math.min(transactionPage * transactionsPerPage, totalTransactions)}건</span>
                  </div>
                  <div className="pagination-controls">
                    <button 
                      onClick={goToPreviousPage}
                      className="prev-page-button"
                      disabled={transactionPage === 1}
                    >
                      이전
                    </button>
                    {getPageNumbers().map((page) => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`page-number-button ${page === transactionPage ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    ))}
                    <button 
                      onClick={goToNextPage}
                      className="next-page-button"
                      disabled={transactionPage === totalPages}
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}
              
              {transactions.length === 0 && (
                <div className="no-data">
                  <p>검색 결과가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'workTypes' && (
          <div className="work-types-section">
            <h3>⚙️ 유형별 포인트 설정</h3>
            <p className="section-description">
              각 유형별로 문제 생성 시 차감될 포인트를 설정할 수 있습니다.
            </p>
            
            <div className="work-types-table">
              <table className="point-table">
                <thead>
                  <tr>
                    <th>유형</th>
                    <th>설명</th>
                    <th>현재 포인트</th>
                    <th>설정</th>
                  </tr>
                </thead>
                <tbody>
                  {workTypePoints.map((workType) => (
                    <tr key={workType.id}>
                      <td className="work-type-name">{workType.name}</td>
                      <td className="work-type-description">{workType.description}</td>
                      <td className="current-points">{workType.points}P</td>
                      <td>
                        <div className="point-input-group">
                          <input
                            type="number"
                            value={workType.points}
                            onChange={(e) => {
                              const newPoints = parseInt(e.target.value) || 0;
                              if (newPoints >= 0) {
                                // 즉시 로컬 상태 업데이트
                                setWorkTypePoints(prev => 
                                  prev.map(wt => 
                                    wt.id === workType.id ? { ...wt, points: newPoints } : wt
                                  )
                                );
                                
                                // 이전 타이머가 있으면 취소
                                if (updateTimer) {
                                  clearTimeout(updateTimer);
                                }
                                
                                // 1초 후 Firebase 업데이트 (디바운싱)
                                const timer = setTimeout(() => {
                                  updateWorkTypePoints(workType.id, newPoints);
                                }, 1000);
                                
                                setUpdateTimer(timer);
                              }
                            }}
                            min="0"
                            className="point-input"
                          />
                          <span className="point-unit">P</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 포인트 수정 모달 */}
      {isModalOpen && selectedUser && (
        <div className="point-modal-overlay" onClick={closeModal}>
          <div className="point-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>포인트 수정 - {selectedUser.name} ({selectedUser.nickname})</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>잔여 포인트</label>
                <input 
                  type="text" 
                  value={`${selectedUser.points || 0}P`} 
                  disabled 
                  className="current-points-display"
                />
              </div>
              <div className="form-group">
                <label>포인트 작업</label>
                <select 
                  value={pointAction} 
                  onChange={(e) => setPointAction(e.target.value as 'add' | 'subtract')}
                  className="point-action-select"
                >
                  <option value="add">포인트 지급</option>
                  <option value="subtract">포인트 차감</option>
                </select>
              </div>
              <div className="form-group">
                <label>포인트 금액</label>
                <input 
                  type="number" 
                  value={pointAmount} 
                  onChange={(e) => setPointAmount(e.target.value)}
                  placeholder="포인트 금액을 입력하세요"
                  className="point-amount-input"
                />
              </div>
              <div className="form-group">
                <label>사유</label>
                <input 
                  type="text" 
                  value={pointReason} 
                  onChange={(e) => setPointReason(e.target.value)}
                  placeholder="포인트 수정 사유를 입력하세요"
                  className="point-reason-input"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={closeModal} className="btn-secondary">취소</button>
              <button onClick={handlePointModification} className="btn-primary">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointManagement;