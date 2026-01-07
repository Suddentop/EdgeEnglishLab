import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { sendPasswordReset } from '../../services/authService';
import { sendPasswordResetWithDiagnostics, checkFirebaseConfig } from '../../utils/emailDiagnostics';
import SEO from '../common/SEO';


const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 이메일 로그인을 위한 validation schema
  const validationSchema = Yup.object({
    email: Yup.string()
      .email('올바른 이메일 주소를 입력해주세요')
      .required('이메일을 입력해주세요'),
    password: Yup.string()
      .required('비밀번호를 입력해주세요')
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      rememberMe: false
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setError('');
        await login(values.email, values.password, values.rememberMe);
        navigate('/');
      } catch (err: any) {
        // 에러 메시지가 이미 상세하게 설정되어 있으면 그대로 사용
        if (err.message) {
          setError(err.message);
        } else if (err.code === 'auth/user-not-found') {
          setError('등록되지 않은 이메일 주소입니다.');
        } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.\n\n💡 관리자가 생성한 계정인 경우, 설정된 비밀번호를 정확히 입력해주세요.\n💡 비밀번호를 잊으셨다면 "비밀번호를 잊으셨나요?" 링크를 이용해주세요.');
        } else if (err.code === 'auth/too-many-requests') {
          setError('너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else if (err.code === 'auth/user-disabled') {
          setError('계정이 비활성화되었습니다. 관리자에게 문의해주세요.');
        } else {
          setError(`로그인에 실패했습니다. (오류 코드: ${err.code || '알 수 없음'})\n\n💡 이메일과 비밀번호를 확인해주세요.`);
        }
      }
    }
  });



  // 비밀번호 재설정 처리
  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      setResetMessage('이메일을 입력해주세요.');
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(resetEmail)) {
      setResetMessage('올바른 이메일 주소를 입력해주세요.');
      return;
    }

    try {
      setResetLoading(true);
      setResetMessage('');
      
      // Firebase 설정 확인
      checkFirebaseConfig();
      
      // 진단 정보와 함께 비밀번호 재설정 이메일 발송
      const result = await sendPasswordResetWithDiagnostics(resetEmail);
      
      if (result.success) {
        setResetMessage('비밀번호 재설정 이메일이 발송되었습니다.\n\n📧 이메일을 확인해주세요 (스팸 폴더도 확인해보세요)\n⏰ 이메일이 도착하지 않으면 몇 분 후 다시 시도해주세요\n🔄 이메일이 계속 도착하지 않으면 관리자에게 문의해주세요');
        setResetEmail('');
      } else {
        const diagnostics = result.diagnostics;
        setResetMessage(`❌ ${result.message}\n\n진단 정보:\n- 이메일 형식: ${diagnostics?.emailFormat ? '올바름' : '잘못됨'}\n- 이메일 등록: ${diagnostics?.emailExists ? '등록됨' : '등록되지 않음'}\n- 이메일 발송: ${diagnostics?.emailSent ? '성공' : '실패'}`);
      }
    } catch (error: any) {
      console.error('비밀번호 재설정 오류:', error);
      setResetMessage(`❌ ${error.message || '비밀번호 재설정 이메일 발송에 실패했습니다.'}\n\n브라우저 콘솔을 확인하여 자세한 오류 정보를 확인해주세요.`);
    } finally {
      setResetLoading(false);
    }
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setShowPasswordReset(false);
  };

  // 비밀번호 찾기 링크 클릭 핸들러
  const handleShowPasswordReset = () => {
    setShowPasswordReset(true);
  };

  return (
    <div className="login-container">
      <SEO 
        title="로그인" 
        description="엣지잉글리쉬랩에 로그인하여 AI 기반 영어 문제 생성 서비스를 이용하세요. 수능형 문제 제작을 지금 시작해보세요." 
      />
      <h2>로그인</h2>
      {error && (
        <div className="error-message" style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={formik.handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            {...formik.getFieldProps('email')}
            placeholder="이메일을 입력하세요"
            autoComplete="email"
          />
          <small style={{ color: '#666', fontSize: '0.85rem' }}>
            💡 가입 시 등록한 이메일 주소를 입력해주세요
          </small>
          {formik.touched.email && formik.errors.email && (
            <div className="error-message">{formik.errors.email}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">비밀번호</label>
          <div className="password-input-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...formik.getFieldProps('password')}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPassword ? '👁️' : '👁'}
            </button>
          </div>
          {formik.touched.password && formik.errors.password && (
            <div className="error-message">{formik.errors.password}</div>
          )}
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            checked={formik.values.rememberMe}
            onChange={formik.handleChange}
          />
          <label htmlFor="rememberMe" style={{ margin: 0 }}>
            자동 로그인 유지 (7일)
          </label>
        </div>

        <button type="submit" className="submit-button">
          로그인
        </button>
      </form>

      {/* 비밀번호 찾기 링크 */}
      <div className="password-reset-link">
        <button 
          type="button" 
          onClick={handleShowPasswordReset}
          className="link-button"
        >
          비밀번호를 잊으셨나요?
        </button>
      </div>

      {/* 비밀번호 재설정 모달 */}
      {showPasswordReset && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>비밀번호 찾기</h3>
              <button 
                className="modal-close" 
                onClick={handleCloseModal}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>가입 시 등록한 이메일 주소를 입력하시면 비밀번호 재설정 링크를 발송해드립니다.</p>
              <div className="form-group">
                <label>이메일</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="이메일을 입력하세요"
                  disabled={resetLoading}
                  required
                />
              </div>
              {resetMessage && (
                <div 
                  className={`message ${resetMessage.includes('발송되었습니다') ? 'success' : 'error'}`}
                  style={{ 
                    whiteSpace: 'pre-line',
                    lineHeight: '1.5',
                    padding: '10px',
                    borderRadius: '4px',
                    margin: '10px 0'
                  }}
                >
                  {resetMessage}
                </div>
              )}
              <div className="modal-actions">
                <button 
                  onClick={handlePasswordReset} 
                  className="btn-primary"
                  disabled={resetLoading}
                >
                  {resetLoading ? '발송 중...' : '재설정 이메일 발송'}
                </button>
                <button 
                  onClick={handleCloseModal} 
                  className="btn-secondary"
                  disabled={resetLoading}
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

export default Login; 