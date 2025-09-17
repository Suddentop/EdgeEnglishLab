import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { searchUsers, toggleUserStatus, User } from '../../services/adminService';
import { app } from '../../firebase/config';
import { getAuth } from 'firebase/auth';
import { formatPhoneNumber, formatPhoneInput } from '../../utils/textProcessor';
import './UserManagement.css';

const UserManagement: React.FC = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'name' | 'nickname' | 'phoneNumber'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    nickname: '',
    email: '',
    phoneNumber: '',
    role: 'user'
  });

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
      
      if (loadMore) {
        setUsers(prev => [...prev, ...result.users]);
      } else {
        setUsers(result.users);
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

  // 회원 삭제 (비활성화)
  const handleDeleteUser = async () => {
    if (!selectedUser || !userData) return;

    try {
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

      const result = await response.json();

      if (result.success) {
        setShowDeleteModal(false);
        loadUsers(); // 목록 새로고침
        alert('회원이 성공적으로 삭제되었습니다.');
      } else {
        alert(`회원 삭제에 실패했습니다: ${result.message}`);
      }
    } catch (error) {
      console.error('회원 삭제 오류:', error);
      alert('회원 삭제에 실패했습니다.');
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

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>회원관리</h2>
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
            {users.map((user) => (
              <tr key={user.uid} className={!user.isActive ? 'inactive-user' : ''}>
                <td>{user.name}</td>
                <td>{user.nickname}</td>
                <td>{formatPhoneNumber(user.phoneNumber || '') || '-'}</td>
                <td>{user.email}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
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
                      title="비밀번호 변경"
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

      {/* 비밀번호 재설정 모달 */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>비밀번호 재설정</h3>
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
    </div>
  );
};

export default UserManagement;
