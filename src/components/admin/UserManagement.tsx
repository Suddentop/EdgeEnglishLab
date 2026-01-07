import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { searchUsers, toggleUserStatus, User, createUserByAdmin, CreateUserData, batchCreateUsersByAdmin } from '../../services/adminService';
import { app } from '../../firebase/config';
import { getAuth } from 'firebase/auth';
import { formatPhoneNumber, formatPhoneInput } from '../../utils/textProcessor';
import './UserManagement.css';

const UserManagement: React.FC = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletedUserIds, setDeletedUserIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'name' | 'nickname' | 'phoneNumber'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPasswordDirectModal, setShowPasswordDirectModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchCreateModal, setShowBatchCreateModal] = useState(false);
  const [batchCreateText, setBatchCreateText] = useState('');
  const [batchCreateError, setBatchCreateError] = useState('');
  const [batchCreateResults, setBatchCreateResults] = useState<{
    success: Array<{ email: string; userId: string; name: string }>;
    failed: Array<{ email: string; reason: string }>;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    nickname: '',
    email: '',
    phoneNumber: '',
    role: 'user'
  });
  const [createForm, setCreateForm] = useState<CreateUserData & { confirmPassword: string }>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    nickname: '',
    phoneNumber: '',
    role: 'user'
  });
  const [createError, setCreateError] = useState('');

  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // 초기 데이터 로드
  useEffect(() => {
    loadUsers();
  }, []);

  // 회원 목록 로드
  const loadUsers = async (loadMore = false) => {
    try {
      setLoading(true);
      const options = {
        searchTerm: searchTerm.trim() || undefined,
        searchType,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        limit: 20,
        lastDoc: loadMore ? lastDoc : undefined
      };

      const result = await searchUsers(options);
      
      // 삭제된 사용자 필터링
      const filteredUsers = result.users.filter(user => !deletedUserIds.has(user.uid));
      
      if (loadMore) {
        setUsers(prev => {
          // 기존 목록에서도 삭제된 사용자 제거 후 새 데이터 추가
          const existingFiltered = prev.filter(user => !deletedUserIds.has(user.uid));
          return [...existingFiltered, ...filteredUsers];
        });
      } else {
        // 새로고침 시 완전히 교체
        setUsers(filteredUsers);
      }
      
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('회원 목록 로드 오류:', error);
      alert('회원 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 검색 실행
  const handleSearch = () => {
    setLastDoc(null);
    loadUsers();
  };

  // 더 많은 데이터 로드
  const loadMore = () => {
    if (hasMore && !loading) {
      loadUsers(true);
    }
  };

  // 회원 선택
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      phoneNumber: formatPhoneNumber(user.phoneNumber || ''),
      role: user.role
    });
    setShowEditModal(true);
  };

  // 회원 정보 수정
  const handleEditUser = async () => {
    if (!selectedUser || !userData) return;

    try {
      // Cloud Function을 사용하여 사용자 정보 업데이트
      const response = await fetch('https://us-central1-edgeenglishlab.cloudfunctions.net/updateUserByAdmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.uid,
          adminUid: userData.uid,
          userData: editForm
        })
      });

      const result = await response.json();

      if (result.success) {
        setShowEditModal(false);
        loadUsers(); // 목록 새로고침
        alert('회원 정보가 성공적으로 수정되었습니다.');
      } else {
        alert(`회원 정보 수정에 실패했습니다: ${result.message}`);
      }
    } catch (error) {
      console.error('회원 정보 수정 오류:', error);
      alert('회원 정보 수정에 실패했습니다.');
    }
  };

  // 회원 삭제
  const handleDeleteUser = async () => {
    if (!selectedUser || !userData) return;

    try {
      setLoading(true);
      console.log('회원 삭제 시작:', selectedUser.uid, selectedUser.name);
      
      // Cloud Function을 사용하여 사용자 삭제
      const response = await fetch('https://us-central1-edgeenglishlab.cloudfunctions.net/deleteUserByAdmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.uid,
          adminUid: userData.uid
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('삭제 응답:', result);

      if (result.success) {
        const deletedUserId = selectedUser.uid;
        setShowDeleteModal(false);
        setSelectedUser(null);
        
        // 삭제된 사용자 ID를 Set에 추가 (향후 필터링용)
        setDeletedUserIds(prev => {
          const newSet = new Set(prev);
          newSet.add(deletedUserId);
          return newSet;
        });
        
        // 목록에서 삭제된 사용자 즉시 제거
        setUsers(prevUsers => prevUsers.filter(user => user.uid !== deletedUserId));
        
        // 페이지네이션 상태 리셋
        setLastDoc(null);
        setHasMore(false);
        
        alert('회원이 성공적으로 삭제되었습니다.');
        
        // 즉시 목록 새로고침 (비동기로 실행하되 await 하지 않음)
        loadUsers(false).catch(err => {
          console.error('목록 새로고침 오류:', err);
        });
      } else {
        console.error('삭제 실패:', result.message);
        alert(`회원 삭제에 실패했습니다: ${result.message}`);
      }
    } catch (error) {
      console.error('회원 삭제 오류:', error);
      alert(`회원 삭제에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  // 회원 상태 토글
  const handleToggleStatus = async (user: User) => {
    try {
      await toggleUserStatus(user.uid, !user.isActive);
      loadUsers(); // 목록 새로고침
      alert(`회원이 ${user.isActive ? '비활성화' : '활성화'}되었습니다.`);
    } catch (error) {
      console.error('회원 상태 변경 오류:', error);
      alert('회원 상태 변경에 실패했습니다.');
    }
  };

  // 회원 등록
  const handleCreateUser = async () => {
    if (!userData) return;

    // 유효성 검사
    if (!createForm.email || !createForm.password || !createForm.name || !createForm.nickname) {
      setCreateError('이메일, 비밀번호, 이름, 닉네임은 필수 입력 항목입니다.');
      return;
    }

    if (createForm.password.length < 8) {
      setCreateError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createForm.email)) {
      setCreateError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    try {
      setCreateError('');
      setLoading(true);

      const userDataToCreate: CreateUserData = {
        email: createForm.email,
        password: createForm.password,
        name: createForm.name,
        nickname: createForm.nickname,
        phoneNumber: createForm.phoneNumber || undefined,
        role: createForm.role || 'user'
      };

      const result = await createUserByAdmin(userData.uid, userDataToCreate);

      if (result.success) {
        setShowCreateModal(false);
        setCreateForm({
          email: '',
          password: '',
          confirmPassword: '',
          name: '',
          nickname: '',
          phoneNumber: '',
          role: 'user'
        });
        setCreateError('');
        loadUsers(); // 목록 새로고침
        alert('회원이 성공적으로 등록되었습니다.');
      } else {
        setCreateError(result.message || '회원 등록에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('회원 등록 오류:', error);
      let errorMessage = '회원 등록에 실패했습니다.';
      
      if (error.message.includes('이미 존재하는 이메일')) {
        errorMessage = '이미 존재하는 이메일입니다.';
      } else if (error.message.includes('유효하지 않은 이메일')) {
        errorMessage = '유효하지 않은 이메일 형식입니다.';
      } else if (error.message.includes('비밀번호가 너무 약')) {
        errorMessage = '비밀번호가 너무 약합니다. 영문, 숫자, 특수문자를 포함해주세요.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setCreateError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 비밀번호 재설정 이메일 발송
  const handlePasswordChange = async () => {
    if (!selectedUser) {
      alert('사용자를 선택해주세요.');
      return;
    }

    try {
      // 현재 사용자 인증 상태 확인
      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        alert('로그인이 필요합니다. 다시 로그인해주세요.');
        return;
      }

      // 관리자 권한 확인
      if (userData?.role !== 'admin') {
        alert('관리자 권한이 필요합니다.');
        return;
      }

      console.log('비밀번호 재설정 이메일 발송 시작...');
      console.log('대상 사용자 이메일:', selectedUser.email);
      
      // 이메일 주소 유효성 확인
      if (!selectedUser.email || !selectedUser.email.includes('@')) {
        alert('유효한 이메일 주소가 없어 비밀번호 재설정 이메일을 발송할 수 없습니다.');
        return;
      }
      
      // Firebase 직접 비밀번호 재설정 이메일 발송
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, selectedUser.email);
      
      console.log('비밀번호 재설정 이메일 발송 완료');
      
      setShowPasswordModal(false);
      alert(`${selectedUser.name} 회원에게 비밀번호 재설정 이메일이 발송되었습니다.\n\n📧 이메일을 확인해주세요 (스팸 폴더도 확인해보세요)\n⏰ 이메일이 도착하지 않으면 몇 분 후 다시 시도해주세요`);
      
    } catch (error: any) {
      console.error('비밀번호 변경 오류:', error);
      let errorMessage = '비밀번호 변경에 실패했습니다.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = '사용자를 찾을 수 없습니다.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '유효하지 않은 이메일 주소입니다.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
      }
      
      alert(errorMessage);
    }
  };

  // 일괄 사용자 생성
  const handleBatchCreate = async () => {
    if (!userData) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!batchCreateText.trim()) {
      setBatchCreateError('사용자 목록을 입력해주세요.');
      return;
    }

    try {
      setBatchCreateError('');
      setBatchCreateResults(null);
      setLoading(true);

      // CSV 형식 파싱
      const lines = batchCreateText.trim().split('\n');
      if (lines.length < 2) {
        setBatchCreateError('헤더와 최소 1명의 사용자 정보가 필요합니다.');
        setLoading(false);
        return;
      }

      // 헤더 제거 (첫 번째 줄)
      const dataLines = lines.slice(1);
      const users: CreateUserData[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 4) {
          setBatchCreateError(`${i + 2}번째 줄: 형식이 올바르지 않습니다. (이메일,비밀번호,이름,닉네임)`);
          setLoading(false);
          return;
        }

        const [email, password, name, nickname] = parts;

        // 기본 유효성 검사
        if (!email || !password || !name || !nickname) {
          setBatchCreateError(`${i + 2}번째 줄: 모든 필드가 필요합니다.`);
          setLoading(false);
          return;
        }

        // 이메일 형식 검사
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setBatchCreateError(`${i + 2}번째 줄: 올바른 이메일 형식이 아닙니다.`);
          setLoading(false);
          return;
        }

        // 비밀번호 길이 검사
        if (password.length < 8) {
          setBatchCreateError(`${i + 2}번째 줄: 비밀번호는 최소 8자 이상이어야 합니다.`);
          setLoading(false);
          return;
        }

        users.push({
          email,
          password,
          name,
          nickname,
          role: 'user'
        });
      }

      if (users.length === 0) {
        setBatchCreateError('생성할 사용자가 없습니다.');
        setLoading(false);
        return;
      }

      if (users.length > 100) {
        setBatchCreateError('한 번에 최대 100명까지 생성할 수 있습니다.');
        setLoading(false);
        return;
      }

      // 일괄 생성 API 호출
      const result = await batchCreateUsersByAdmin(userData.uid, users);

      setBatchCreateResults(result.results);
      loadUsers(); // 목록 새로고침

      if (result.results.failed.length === 0) {
        alert(`모든 사용자(${result.results.success.length}명)가 성공적으로 생성되었습니다.`);
      } else {
        // 결과는 모달에 표시됨
      }
    } catch (error: any) {
      console.error('일괄 생성 오류:', error);
      setBatchCreateError(error.message || '일괄 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 관리자가 직접 비밀번호 변경
  const handlePasswordDirectChange = async () => {
    if (!selectedUser || !userData) {
      alert('사용자를 선택해주세요.');
      return;
    }

    // 유효성 검사
    if (!newPassword || !confirmPassword) {
      setPasswordError('새 비밀번호와 비밀번호 확인을 모두 입력해주세요.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setPasswordError('');
      setLoading(true);

      // Cloud Function을 사용하여 비밀번호 직접 변경
      const response = await fetch('https://us-central1-edgeenglishlab.cloudfunctions.net/changeUserPasswordByAdmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: selectedUser.uid,
          newPassword: newPassword,
          adminUid: userData.uid
        })
      });

      const result = await response.json();

      if (result.success) {
        setShowPasswordDirectModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        alert(`${selectedUser.name} 회원의 비밀번호가 성공적으로 변경되었습니다.`);
      } else {
        setPasswordError(result.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('비밀번호 직접 변경 오류:', error);
      setPasswordError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>회원관리</h2>
        <div className="header-actions">
          <button 
            onClick={() => {
              setCreateForm({
                email: '',
                password: '',
                confirmPassword: '',
                name: '',
                nickname: '',
                phoneNumber: '',
                role: 'user'
              });
              setCreateError('');
              setShowCreateModal(true);
            }}
            className="btn-primary"
            style={{ marginRight: '10px' }}
          >
            ➕ 회원 등록
          </button>
          <button 
            onClick={() => {
              setBatchCreateText('');
              setBatchCreateError('');
              setBatchCreateResults(null);
              setShowBatchCreateModal(true);
            }}
            className="btn-primary"
            style={{ marginRight: '10px' }}
          >
            📋 일괄 생성
          </button>
        </div>
        <div className="search-controls">
          <select 
            value={searchType} 
            onChange={(e) => setSearchType(e.target.value as any)}
            className="search-type-select"
          >
            <option value="all">전체</option>
            <option value="name">이름</option>
            <option value="nickname">닉네임</option>
            <option value="phoneNumber">전화번호</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="status-filter-select"
            title="상태 필터"
          >
            <option value="all">전체상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
          <input
            type="text"
            placeholder="검색어를 입력하세요..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="search-button">
            검색
          </button>
        </div>
      </div>

      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>닉네임</th>
              <th>전화번호</th>
              <th>이메일</th>
              <th className="join-date-header">가입일</th>
              <th className="status-header">상태</th>
              <th>역할</th>
              <th>포인트</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {users
              .filter(user => !deletedUserIds.has(user.uid))
              .map((user) => (
              <tr key={user.uid} className={!user.isActive ? 'inactive-user' : ''}>
                <td>{user.name}</td>
                <td>{user.nickname}</td>
                <td>{formatPhoneNumber(user.phoneNumber || '') || '-'}</td>
                <td>{user.email}</td>
                <td>
                  {user.createdAt ? (() => {
                    try {
                      const date = new Date(user.createdAt);
                      if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('ko-KR');
                      }
                      return '-';
                    } catch (e) {
                      return '-';
                    }
                  })() : '-'}
                </td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? '활성' : '비활성'}
                  </span>
                </td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role === 'admin' ? '관리자' : '일반'}
                  </span>
                </td>
                <td>{(user.points || 0).toLocaleString()}P</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => handleUserSelect(user)}
                      className="action-btn edit"
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(user)}
                      className="action-btn toggle"
                      title={user.isActive ? '비활성화' : '활성화'}
                    >
                      {user.isActive ? '⏸️' : '▶️'}
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedUser(user);
                        setShowPasswordModal(true);
                      }}
                      className="action-btn password"
                      title="비밀번호 재설정 이메일 발송"
                    >
                      📧
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedUser(user);
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordError('');
                        setShowPasswordDirectModal(true);
                      }}
                      className="action-btn password"
                      title="비밀번호 직접 변경"
                    >
                      🔒
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeleteModal(true);
                      }}
                      className="action-btn delete"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="loading">
            <p>로딩 중...</p>
          </div>
        )}

        {hasMore && (
          <button onClick={loadMore} className="load-more-btn" disabled={loading}>
            더 보기
          </button>
        )}
      </div>

      {/* 회원 정보 수정 모달 */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>회원 정보 수정</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>이름</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>닉네임</label>
                <input
                  type="text"
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({...editForm, nickname: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>이메일</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>전화번호</label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({...editForm, phoneNumber: formatPhoneInput(e.target.value)})}
                  placeholder="010-0000-0000 (선택사항)"
                />
              </div>
              <div className="form-group">
                <label>역할</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                >
                  <option value="user">일반</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
              <div className="modal-actions">
                <button onClick={handleEditUser} className="btn-primary">수정</button>
                <button onClick={() => setShowEditModal(false)} className="btn-secondary">취소</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 회원 삭제 확인 모달 */}
      {showDeleteModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>회원 삭제 확인</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>정말로 <strong>{selectedUser.name}</strong> 회원을 삭제하시겠습니까?</p>
              <p className="warning">이 작업은 되돌릴 수 없습니다.</p>
              <div className="modal-actions">
                <button onClick={handleDeleteUser} className="btn-danger">삭제</button>
                <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">취소</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 재설정 이메일 발송 모달 */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>비밀번호 재설정 이메일 발송</h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>{selectedUser.name}</strong> 회원에게 비밀번호 재설정 이메일을 발송합니다.</p>
              <div className="password-reset-info">
                <p>• 사용자의 이메일 주소로 비밀번호 재설정 링크가 발송됩니다.</p>
                <p>• 사용자가 링크를 클릭하여 새로운 비밀번호를 설정할 수 있습니다.</p>
                <p>• 이메일 주소: <strong>{selectedUser.email}</strong></p>
              </div>
              <div className="modal-actions">
                <button onClick={handlePasswordChange} className="btn-primary">이메일 발송</button>
                <button onClick={() => setShowPasswordModal(false)} className="btn-secondary">취소</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 관리자 비밀번호 직접 변경 모달 */}
      {showPasswordDirectModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordDirectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>비밀번호 직접 변경</h3>
              <button className="modal-close" onClick={() => setShowPasswordDirectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>{selectedUser.name}</strong> 회원의 비밀번호를 직접 변경합니다.</p>
              {passwordError && (
                <div className="error-message" style={{ 
                  color: '#d32f2f', 
                  backgroundColor: '#ffebee', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  marginBottom: '15px' 
                }}>
                  {passwordError}
                </div>
              )}
              <div className="form-group">
                <label>새 비밀번호 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="최소 8자 이상"
                  disabled={loading}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  영문, 숫자, 특수문자를 포함해주세요
                </small>
              </div>
              <div className="form-group">
                <label>비밀번호 확인 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="비밀번호를 다시 입력하세요"
                  disabled={loading}
                />
              </div>
              <div className="modal-actions">
                <button 
                  onClick={handlePasswordDirectChange} 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? '변경 중...' : '비밀번호 변경'}
                </button>
                <button 
                  onClick={() => {
                    setShowPasswordDirectModal(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }} 
                  className="btn-secondary"
                  disabled={loading}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 생성 모달 */}
      {showBatchCreateModal && (
        <div className="modal-overlay" onClick={() => setShowBatchCreateModal(false)}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>일괄 사용자 생성</h3>
              <button className="modal-close" onClick={() => setShowBatchCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '15px' }}>
                <p style={{ marginBottom: '10px', color: '#666' }}>
                  CSV 형식으로 사용자 정보를 입력하세요. (헤더 포함)
                </p>
                <div style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  marginBottom: '10px'
                }}>
                  <strong>형식:</strong> 이메일,비밀번호,이름,닉네임<br/>
                  <strong>예시:</strong><br/>
                  edgeuser01@naver.com,@testpw00,테스트유저 #01,edgeuser01<br/>
                  edgeuser02@naver.com,@testpw00,테스트유저 #02,edgeuser02
                </div>
              </div>

              {batchCreateError && (
                <div className="error-message" style={{ 
                  color: '#d32f2f', 
                  backgroundColor: '#ffebee', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  marginBottom: '15px' 
                }}>
                  {batchCreateError}
                </div>
              )}

              <div className="form-group">
                <label>사용자 목록 (CSV 형식)</label>
                <textarea
                  value={batchCreateText}
                  onChange={(e) => {
                    setBatchCreateText(e.target.value);
                    setBatchCreateError('');
                    setBatchCreateResults(null);
                  }}
                  placeholder="이메일,비밀번호,이름,닉네임&#10;edgeuser01@naver.com,@testpw00,테스트유저 #01,edgeuser01&#10;edgeuser02@naver.com,@testpw00,테스트유저 #02,edgeuser02"
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    resize: 'vertical'
                  }}
                  disabled={loading}
                />
              </div>

              {batchCreateResults && (
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ marginBottom: '10px' }}>
                    생성 결과: ✅ 성공 {batchCreateResults.success.length}명 / ❌ 실패 {batchCreateResults.failed.length}명
                  </h4>
                  
                  {batchCreateResults.success.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                      <strong style={{ color: '#2e7d32' }}>✅ 성공한 사용자:</strong>
                      <div style={{ 
                        maxHeight: '150px', 
                        overflow: 'auto', 
                        backgroundColor: '#f1f8f4', 
                        padding: '10px', 
                        borderRadius: '4px',
                        marginTop: '5px',
                        fontSize: '12px'
                      }}>
                        {batchCreateResults.success.map((user, index) => (
                          <div key={index} style={{ marginBottom: '5px' }}>
                            {user.email} ({user.name})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {batchCreateResults.failed.length > 0 && (
                    <div>
                      <strong style={{ color: '#d32f2f' }}>❌ 실패한 사용자:</strong>
                      <div style={{ 
                        maxHeight: '150px', 
                        overflow: 'auto', 
                        backgroundColor: '#ffebee', 
                        padding: '10px', 
                        borderRadius: '4px',
                        marginTop: '5px',
                        fontSize: '12px'
                      }}>
                        {batchCreateResults.failed.map((user, index) => (
                          <div key={index} style={{ marginBottom: '5px' }}>
                            {user.email}: {user.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button 
                  onClick={handleBatchCreate} 
                  className="btn-primary"
                  disabled={loading || !batchCreateText.trim()}
                >
                  {loading ? '생성 중...' : '일괄 생성'}
                </button>
                <button 
                  onClick={() => {
                    setShowBatchCreateModal(false);
                    setBatchCreateText('');
                    setBatchCreateError('');
                    setBatchCreateResults(null);
                  }} 
                  className="btn-secondary"
                  disabled={loading}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 회원 등록 모달 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>회원 등록</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {createError && (
                <div className="error-message" style={{ 
                  color: '#d32f2f', 
                  backgroundColor: '#ffebee', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  marginBottom: '15px' 
                }}>
                  {createError}
                </div>
              )}
              <div className="form-group">
                <label>이메일 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                  placeholder="example@email.com"
                />
              </div>
              <div className="form-group">
                <label>비밀번호 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                  placeholder="최소 8자 이상"
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  영문, 숫자, 특수문자를 포함해주세요
                </small>
              </div>
              <div className="form-group">
                <label>비밀번호 확인 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm({...createForm, confirmPassword: e.target.value})}
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>
              <div className="form-group">
                <label>이름 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  placeholder="실명"
                />
              </div>
              <div className="form-group">
                <label>닉네임 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  value={createForm.nickname}
                  onChange={(e) => setCreateForm({...createForm, nickname: e.target.value})}
                  placeholder="닉네임"
                />
              </div>
              <div className="form-group">
                <label>전화번호</label>
                <input
                  type="tel"
                  value={createForm.phoneNumber}
                  onChange={(e) => setCreateForm({...createForm, phoneNumber: formatPhoneInput(e.target.value)})}
                  placeholder="010-0000-0000 (선택사항)"
                />
              </div>
              <div className="form-group">
                <label>역할</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                >
                  <option value="user">일반</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
              <div className="modal-actions">
                <button 
                  onClick={handleCreateUser} 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? '등록 중...' : '등록'}
                </button>
                <button 
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError('');
                  }} 
                  className="btn-secondary"
                  disabled={loading}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
