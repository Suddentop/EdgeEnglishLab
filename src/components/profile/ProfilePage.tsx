import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from 'firebase/auth';
import { getQuizHistory, getQuizHistoryStats, QuizHistoryItem, QuizHistorySearchParams } from '../../services/quizHistoryService';
import { downloadFile } from '../../services/fileService';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { currentUser, userData, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    nickname: '',
    phoneNumber: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState('');

  // 문제 생성 내역 관련 상태
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (userData) {
      setEditForm({
        name: userData.name || '',
        nickname: userData.nickname || '',
        phoneNumber: userData.phoneNumber || ''
      });
    }
  }, [userData]);

  const handleEdit = () => {
    setIsEditing(true);
    setShowPasswordSection(true);
    setMessage('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      name: userData?.name || '',
      nickname: userData?.nickname || '',
      phoneNumber: userData?.phoneNumber || ''
    });
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    setShowPasswordSection(false);
    setMessage('');
  };

  const handleSave = async () => {
    if (!currentUser || !userData) return;

    setLoading(true);
    try {
      // 기본 정보 업데이트
      await updateUserProfile(editForm);
      
      // 비밀번호 변경 (비밀번호 필드에 값이 있는 경우)
      const hasPasswordFields = passwordForm.currentPassword || passwordForm.newPassword || passwordForm.confirmNewPassword;
      
      if (hasPasswordFields) {
        // 비밀번호 유효성 검사
        if (!passwordForm.currentPassword) {
          setMessage('현재 비밀번호를 입력해주세요.');
          setLoading(false);
          return;
        }
        if (!passwordForm.newPassword) {
          setMessage('새 비밀번호를 입력해주세요.');
          setLoading(false);
          return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
          setMessage('새 비밀번호가 일치하지 않습니다.');
          setLoading(false);
          return;
        }

        // 비밀번호 복잡도 검증
        const password = passwordForm.newPassword;
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        const isLongEnough = password.length >= 8;

        if (!isLongEnough) {
          setMessage('비밀번호는 최소 8자 이상이어야 합니다.');
          setLoading(false);
          return;
        }
        if (!hasLetter) {
          setMessage('비밀번호는 영문자를 포함해야 합니다.');
          setLoading(false);
          return;
        }
        if (!hasNumber) {
          setMessage('비밀번호는 숫자를 포함해야 합니다.');
          setLoading(false);
          return;
        }
        if (!hasSpecialChar) {
          setMessage('비밀번호는 특수문자를 포함해야 합니다.');
          setLoading(false);
          return;
        }

        // Firebase Auth의 updatePassword 사용
        await updatePassword(currentUser, passwordForm.newPassword);
        setMessage('프로필 정보와 비밀번호가 성공적으로 수정되었습니다.');
      } else {
        setMessage('프로필이 성공적으로 수정되었습니다.');
      }
      
      // 폼 초기화
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
      setShowPasswordSection(false);
      setIsEditing(false);
    } catch (error) {
      console.error('프로필 수정 오류:', error);
      if (error instanceof Error) {
        if (error.message.includes('requires-recent-login')) {
          setMessage('보안을 위해 다시 로그인한 후 비밀번호를 변경해주세요.');
        } else {
          setMessage(`수정 실패: ${error.message}`);
        }
      } else {
        setMessage('프로필 수정에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 문제 생성 내역 로드
  const loadQuizHistory = async () => {
    if (!userData?.uid) return;
    
    setHistoryLoading(true);
    try {
      // 기본적으로 최근 1주일 데이터를 로드
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const params = {
        startDate: oneWeekAgo,
        limit: 50 // 더 많은 데이터를 가져오도록 증가
      };
      
      const history = await getQuizHistory(userData.uid, params);
      
      console.log('📊 로드된 내역:', {
        totalCount: history.length,
        workTypeIds: history.map(h => h.workTypeId),
        workTypeNames: history.map(h => h.workTypeName),
        packageEntries: history.filter(h => h.workTypeId.startsWith('P'))
      });
      
      setQuizHistory(history);
      
      // 총 페이지 수 계산 (임시로 10개씩 나누어 계산)
      setTotalPages(Math.ceil(history.length / itemsPerPage));
    } catch (error) {
      console.error('문제 생성 내역 로드 실패:', error);
      setMessage('문제 생성 내역을 불러오는데 실패했습니다.');
      setQuizHistory([]); // 에러 시 빈 배열로 설정
    } finally {
      setHistoryLoading(false);
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 파일 다운로드 (문제/정답 구분)
  const handleDownload = async (historyItem: QuizHistoryItem, fileType: 'problem' | 'answer') => {
    const fileUrl = fileType === 'problem' ? historyItem.problemFileUrl : historyItem.answerFileUrl;
    const fileName = fileType === 'problem' ? historyItem.problemFileName : historyItem.answerFileName;
    
    if (!fileUrl) {
      alert(`${fileType === 'problem' ? '문제' : '정답'} 파일이 없습니다.`);
      return;
    }

    try {
      await downloadFile(fileUrl, fileName || `quiz_${historyItem.id}_${fileType}.pdf`);
    } catch (error) {
      console.error('파일 다운로드 실패:', error);
      alert('파일 다운로드에 실패했습니다.');
    }
  };

  // 컴포넌트 마운트 시 자동으로 최근 1주일 데이터 로드
  useEffect(() => {
    if (userData?.uid) {
      loadQuizHistory();
    }
  }, [userData?.uid, currentPage]);

  // 상태별 스타일 클래스
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'success': return 'status-success';
      case 'partial': return 'status-partial';
      case 'failed': return 'status-failed';
      case 'refunded': return 'status-refunded';
      default: return 'status-unknown';
    }
  };

  // 상태별 한글 표시
  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return '성공';
      case 'partial': return '부분성공';
      case 'failed': return '실패';
      case 'refunded': return '환불됨';
      default: return '알수없음';
    }
  };

  // 패키지 유형명 표시
  const getDisplayWorkTypeName = (workTypeId: string, workTypeName: string) => {
    if (workTypeId.startsWith('P')) {
      const packageNumber = workTypeId.replace('P', '');
      return `패키지#${packageNumber}`;
    }
    return workTypeName;
  };

  // 파일 만료 여부 확인
  const isFileExpired = (expiresAt: Date) => {
    return new Date() > expiresAt;
  };




  if (!currentUser || !userData) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <h2>로그인이 필요합니다</h2>
          <p>프로필을 보려면 로그인이 필요합니다.</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            로그인 하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
                 <div className="profile-header">
           <h1>내 정보</h1>
         </div>

        <div className="profile-content">
          <div className="profile-section">
            <h2>기본 정보</h2>
            <div className="profile-info">
              <div className="info-row">
                <label>이름:</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className="info-value">{userData.name || '미설정'}</span>
                )}
              </div>

              <div className="info-row">
                <label>닉네임:</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="nickname"
                    value={editForm.nickname}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className="info-value">{userData.nickname || '미설정'}</span>
                )}
              </div>

              <div className="info-row">
                <label>이메일 (로그인 ID):</label>
                <span className="info-value">{userData.email || '미설정'}</span>
              </div>

              <div className="info-row">
                <label>전화번호:</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={editForm.phoneNumber}
                    onChange={handleInputChange}
                    className="edit-input"
                    placeholder="'-' 없이 입력해주세요"
                  />
                ) : (
                  <span className="info-value">{userData.phoneNumber || '미설정'}</span>
                )}
              </div>

              <div className="info-row">
                <label>가입일:</label>
                <span className="info-value">
                  {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : '미설정'}
                </span>
              </div>

                                           <div className="info-row">
                <label>잔여 포인트 :</label>
                <span className="info-value points">
                  {(userData.points || 0).toLocaleString()}P
                </span>
              </div>

              
            </div>
          </div>

          {/* 비밀번호 변경 섹션 */}
          {isEditing && (
            <div className="profile-section">
              <h2>비밀번호 변경</h2>
              <div className="password-section">
                <div className="password-form">
                  <div className="form-group">
                    <label htmlFor="currentPassword">현재 비밀번호</label>
                    <input
                      id="currentPassword"
                      type="password"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordInputChange}
                      className="edit-input"
                      placeholder="현재 비밀번호를 입력하세요"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPassword">새 비밀번호</label>
                    <input
                      id="newPassword"
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordInputChange}
                      className="edit-input"
                      placeholder="새 비밀번호를 입력하세요"
                    />
                    <div className="password-requirement">
                      * 비밀번호는 8자 이상이며, 영문자, 숫자, 특수문자를 포함해야 합니다.
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmNewPassword">새 비밀번호 확인</label>
                    <input
                      id="confirmNewPassword"
                      type="password"
                      name="confirmNewPassword"
                      value={passwordForm.confirmNewPassword}
                      onChange={handlePasswordInputChange}
                      className="edit-input"
                      placeholder="새 비밀번호를 다시 입력하세요"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className={`message ${message.includes('성공') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}


          <div className="profile-actions">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSave} 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? '저장 중...' : '저장'}
                </button>
                <button onClick={handleCancel} className="btn-secondary">
                  취소
                </button>
              </>
            ) : (
              <button onClick={handleEdit} className="btn-primary">
                정보 수정
              </button>
            )}
          </div>

          {/* 문제 생성 내역 섹션 */}
          <div className="profile-section">
            <h2>문제 생성 내역</h2>
            
            <div className="quiz-history-table">
              {historyLoading ? (
                <div className="loading">로딩 중...</div>
              ) : quizHistory.length === 0 ? (
                <div className="no-data">문제 생성 내역이 없습니다.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>유형번호</th>
                      <th>유형명</th>
                      <th>차감</th>
                      <th>성공/실패</th>
                      <th>환불</th>
                      <th>인쇄(문제)</th>
                      <th>인쇄(정답)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizHistory.map((item) => (
                      <tr key={item.id}>
                        <td>{item.createdAt.toLocaleDateString()}</td>
                        <td>{item.workTypeId}</td>
                        <td>{getDisplayWorkTypeName(item.workTypeId, item.workTypeName)}</td>
                        <td className="deduction">-{item.pointsDeducted.toLocaleString()}</td>
                        <td>
                          <span className={`status ${getStatusClass(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                        </td>
                        <td className="refund">
                          {item.pointsRefunded > 0 ? `+${item.pointsRefunded.toLocaleString()}` : ''}
                        </td>
                        <td>
                          {item.problemFileUrl ? (
                            <button
                              onClick={() => handleDownload(item, 'problem')}
                              disabled={isFileExpired(item.expiresAt)}
                              className="download-btn"
                              title={
                                isFileExpired(item.expiresAt) 
                                  ? '파일이 만료되었습니다 (7일 초과)' 
                                  : '문제 PDF 다운로드'
                              }
                            >
                              📄
                            </button>
                          ) : (
                            <span className="no-file">-</span>
                          )}
                        </td>
                        <td>
                          {item.answerFileUrl ? (
                            <button
                              onClick={() => handleDownload(item, 'answer')}
                              disabled={isFileExpired(item.expiresAt)}
                              className="download-btn"
                              title={
                                isFileExpired(item.expiresAt) 
                                  ? '파일이 만료되었습니다 (7일 초과)' 
                                  : '정답 PDF 다운로드'
                              }
                            >
                              📄
                            </button>
                          ) : (
                            <span className="no-file">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              {/* 페이지네이션 */}
              {quizHistory.length > 0 && totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    이전
                  </button>
                  <span className="pagination-info">
                    {currentPage} / {totalPages} 페이지
                  </span>
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    다음
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
