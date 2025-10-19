import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from 'firebase/auth';
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

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
