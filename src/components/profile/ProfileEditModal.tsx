import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { needsReauthentication, markReauthenticated } from '../../utils/authSession';
import './ProfileEditModal.css';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userData, updateUserProfile, refreshUserData } = useAuth();
  
  // 디버깅 로그
  console.log('ProfileEditModal 렌더링:', { isOpen, currentUser, userData });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


  const formik = useFormik({
    initialValues: {
      name: '',
      nickname: '',
      phoneNumber: '',
      email: '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .required('이름을 입력해주세요'),
      nickname: Yup.string()
        .required('닉네임을 입력해주세요')
        .min(2, '닉네임은 최소 2자 이상이어야 합니다'),
      phoneNumber: Yup.string()
        .required('전화번호를 입력해주세요')
        .matches(/^[0-9]{10,11}$/, '올바른 전화번호 형식이 아닙니다'),
      email: Yup.string()
        .email('올바른 이메일 형식이 아닙니다')
        .required('이메일을 입력해주세요'),
      currentPassword: Yup.string(),
      newPassword: Yup.string(),
      confirmNewPassword: Yup.string()
    }),
    onSubmit: async (values) => {
      try {
        setError('');
        setSuccess('');

        // 비밀번호 변경 validation (비밀번호 필드에 값이 있는 경우에만)
        const hasPasswordFields = values.currentPassword || values.newPassword || values.confirmNewPassword;
        const isPhoneChanged =
          values.phoneNumber &&
          userData &&
          values.phoneNumber !== userData.phoneNumber;

        // 전화번호 변경 또는 비밀번호 변경이 있고, 마지막 로그인/재인증 후 30분 이상이면 재인증 요구
        if ((isPhoneChanged || hasPasswordFields) && needsReauthentication()) {
          if (!values.currentPassword) {
            setError('보안을 위해 현재 비밀번호를 입력해주세요.');
            return;
          }
          if (!currentUser) {
            throw new Error('로그인이 필요합니다');
          }

          try {
            const credential = EmailAuthProvider.credential(
              currentUser.email || '',
              values.currentPassword
            );
            await reauthenticateWithCredential(currentUser, credential);
            markReauthenticated();
          } catch (reauthError: any) {
            console.error('재인증 오류:', reauthError);
            if (reauthError.code === 'auth/wrong-password') {
              throw new Error('현재 비밀번호가 올바르지 않습니다.');
            } else if (reauthError.code === 'auth/user-mismatch') {
              throw new Error('사용자 정보가 일치하지 않습니다. 다시 로그인해주세요.');
            } else if (reauthError.code === 'auth/invalid-credential') {
              throw new Error('인증 정보가 올바르지 않습니다. 현재 비밀번호를 확인해주세요.');
            }
            throw reauthError;
          }
        }
        
        if (hasPasswordFields) {
          if (!values.newPassword) {
            setError('새 비밀번호를 입력해주세요');
            return;
          }
          
          // 비밀번호 복잡도 검증
          const password = values.newPassword;
          const hasLetter = /[a-zA-Z]/.test(password);
          const hasNumber = /[0-9]/.test(password);
          const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
          const isLongEnough = password.length >= 8;
          
          if (!isLongEnough) {
            setError('비밀번호는 최소 8자 이상이어야 합니다');
            return;
          }
          if (!hasLetter) {
            setError('비밀번호는 영문자를 포함해야 합니다');
            return;
          }
          if (!hasNumber) {
            setError('비밀번호는 숫자를 포함해야 합니다');
            return;
          }
          if (!hasSpecialChar) {
            setError('비밀번호는 특수문자를 포함해야 합니다');
            return;
          }
          
          if (values.newPassword !== values.confirmNewPassword) {
            setError('새 비밀번호가 일치하지 않습니다');
            return;
          }
        }

        // 기본 정보 업데이트
        await updateUserProfile({
          name: values.name,
          nickname: values.nickname,
          phoneNumber: values.phoneNumber
        });

        // 비밀번호 변경 (비밀번호 필드에 값이 있는 경우)
        if (hasPasswordFields && values.newPassword) {
          // 위에서 재인증이 이미 수행되었으므로 여기서는 비밀번호만 변경
          if (!currentUser) {
            throw new Error('로그인이 필요합니다');
          }

          // Firebase Auth의 updatePassword 사용
          await updatePassword(currentUser, values.newPassword);
          setSuccess('프로필 정보와 비밀번호가 성공적으로 업데이트되었습니다.');
        } else {
          setSuccess('프로필 정보가 성공적으로 업데이트되었습니다.');
        }

        // 성공 메시지 표시 후 모달 닫기
        setTimeout(() => {
          onClose();
          formik.setFieldValue('currentPassword', '');
          formik.setFieldValue('newPassword', '');
          formik.setFieldValue('confirmNewPassword', '');
        }, 2000);

      } catch (err) {
        console.error('프로필 업데이트 에러:', err);
        if (err instanceof Error) {
          setError(`업데이트 오류: ${err.message}`);
        } else {
          setError('업데이트 중 오류가 발생했습니다');
        }
      }
    }
  });

  // userData가 변경될 때마다 폼 초기값 업데이트
  useEffect(() => {
    console.log('ProfileEditModal - userData 변경:', userData);
    console.log('ProfileEditModal - currentUser:', currentUser);
    
    if (userData) {
      console.log('ProfileEditModal - userData로 폼 설정:', {
        name: userData.name,
        nickname: userData.nickname,
        phoneNumber: userData.phoneNumber,
        email: userData.email
      });
      
      formik.setValues({
        ...formik.values,
        name: userData.name || '',
        nickname: userData.nickname || '',
        phoneNumber: userData.phoneNumber || '',
        email: userData.email || ''
      });
    } else if (currentUser) {
      console.log('ProfileEditModal - currentUser로 기본값 설정');
      // userData가 없지만 로그인된 경우 기본값 설정
      formik.setValues({
        ...formik.values,
        name: '',
        nickname: '',
        phoneNumber: currentUser.phoneNumber || '',
        email: currentUser.email || ''
      });
    }
  }, [userData, currentUser, isOpen]);

  // 모달이 열릴 때마다 사용자 데이터 새로고침
  useEffect(() => {
    if (isOpen && currentUser) {
      // AuthContext의 refreshUserData 함수 호출
      const refreshData = async () => {
        try {
          await refreshUserData();
          console.log('모달 열림 - 사용자 데이터 새로고침 완료');
        } catch (error) {
          console.error('사용자 데이터 새로고침 오류:', error);
        }
      };
      refreshData();
    }
  }, [isOpen, currentUser, refreshUserData]);

  // 로그인하지 않은 경우 모달을 렌더링하지 않음
  if (!currentUser) return null;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="profile-edit-modal"
      overlayClassName="auth-modal-overlay"
      ariaHideApp={false}
    >
      <div className="profile-edit-container">
        <div className="profile-edit-header">
          <h2>내 정보 수정</h2>
          <button 
            className="profile-edit-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        
        {error && <div className="profile-error-message">{error}</div>}
        {success && <div className="profile-success-message">{success}</div>}
        
        <form onSubmit={formik.handleSubmit} className="profile-edit-form">
          <div className="profile-form-row">
            <div className="profile-form-group">
              <label htmlFor="name">이름</label>
              <input
                id="name"
                type="text"
                className="profile-input"
                {...formik.getFieldProps('name')}
                placeholder="이름을 입력하세요"
              />
              {formik.touched.name && formik.errors.name && (
                <div className="profile-error-text">{formik.errors.name}</div>
              )}
            </div>

            <div className="profile-form-group">
              <label htmlFor="nickname">닉네임</label>
              <input
                id="nickname"
                type="text"
                className="profile-input"
                {...formik.getFieldProps('nickname')}
                placeholder="닉네임을 입력하세요"
              />
              {formik.touched.nickname && formik.errors.nickname && (
                <div className="profile-error-text">{formik.errors.nickname}</div>
              )}
            </div>
          </div>

          <div className="profile-form-row">
            <div className="profile-form-group">
              <label htmlFor="email">이메일 (로그인 ID)</label>
              <input
                id="email"
                type="email"
                className="profile-input profile-input-disabled"
                {...formik.getFieldProps('email')}
                placeholder="이메일을 입력하세요"
                disabled
              />
              {formik.touched.email && formik.errors.email && (
                <div className="profile-error-text">{formik.errors.email}</div>
              )}
            </div>

            <div className="profile-form-group">
              <label htmlFor="phoneNumber">전화번호</label>
              <input
                id="phoneNumber"
                type="tel"
                className="profile-input"
                {...formik.getFieldProps('phoneNumber')}
                placeholder="'-' 없이 입력해주세요"
              />
              {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                <div className="profile-error-text">{formik.errors.phoneNumber}</div>
              )}
            </div>
          </div>

          {/* 비밀번호 변경 섹션 */}
          <div className="profile-password-section">
            <div className="profile-password-header">
              <h3>비밀번호 변경</h3>
              <div className="password-optional-text">
                *비밀번호를 변경하지 않으려면 비워두세요
              </div>
            </div>
            
            <div className="profile-password-form">
              <div className="profile-form-row">
                <div className="profile-form-group">
                  <label htmlFor="currentPassword">현재 비밀번호</label>
                  <input
                    id="currentPassword"
                    type="password"
                    className="profile-input"
                    {...formik.getFieldProps('currentPassword')}
                    placeholder="비밀번호 변경시에만 입력하세요"
                  />
                  {formik.touched.currentPassword && formik.errors.currentPassword && (
                    <div className="profile-error-text">{formik.errors.currentPassword}</div>
                  )}
                </div>
              </div>
              
              <div className="profile-form-row">
                <div className="profile-form-group">
                  <label htmlFor="newPassword">새 비밀번호</label>
                  <input
                    id="newPassword"
                    type="password"
                    className="profile-input"
                    {...formik.getFieldProps('newPassword')}
                    placeholder="새 비밀번호를 입력하세요"
                  />
                  <div className="password-requirement-text">
                    *비밀번호는 8자 이상이며, 특수문자, 문자, 숫자를 포함해야 합니다.
                  </div>
                  {formik.touched.newPassword && formik.errors.newPassword && (
                    <div className="profile-error-text">{formik.errors.newPassword}</div>
                  )}
                </div>

                <div className="profile-form-group">
                  <label htmlFor="confirmNewPassword">새 비밀번호 확인</label>
                  <input
                    id="confirmNewPassword"
                    type="password"
                    className="profile-input"
                    {...formik.getFieldProps('confirmNewPassword')}
                    placeholder="새 비밀번호를 다시 입력하세요"
                  />
                  {formik.touched.confirmNewPassword && formik.errors.confirmNewPassword && (
                    <div className="profile-error-text">{formik.errors.confirmNewPassword}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="profile-form-actions">
            <button 
              type="button"
              className="profile-cancel-btn"
              onClick={onClose}
            >
              취소
            </button>
            <button 
              type="submit" 
              className="profile-save-btn"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ProfileEditModal; 