import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { PaymentService } from '../../services/paymentService';
import { Payment } from '../../types/types';
import { PAYMENT_STATUS, POINT_POLICY } from '../../utils/pointConstants';
import { formatPhoneNumber } from '../../utils/textProcessor';
import { DEFAULT_PRINT_HEADER } from '../../utils/printHeader';
import { deductPointsForPrintHeaderChange } from '../../services/pointService';
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
  // 문제지 헤더 변경 관련 상태 (모달 열림 여부 포함)
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);
  const [headerText, setHeaderText] = useState('');
  const [headerMessage, setHeaderMessage] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // 결제 내역 관련 상태
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentCurrentPage, setPaymentCurrentPage] = useState(1);
  const paymentItemsPerPage = 5;

  useEffect(() => {
    if (userData) {
      setEditForm({
        name: userData.name || '',
        nickname: userData.nickname || '',
        phoneNumber: userData.phoneNumber || ''
      });
      // 프로필 로딩 시 현재 헤더 텍스트도 초기화
      const initialHeader = (userData as any).printHeader || DEFAULT_PRINT_HEADER;
      setHeaderText(initialHeader);
    }
  }, [userData]);

  // 결제 내역 로드 함수
  const loadPaymentHistory = async () => {
    if (!userData?.uid) return;
    
    setPaymentLoading(true);
    try {
      console.log('📋 결제 내역 로드 시작:', { userId: userData.uid });
      const paymentList = await PaymentService.getUserPayments(userData.uid, 50);
      console.log('📋 로드된 결제 내역:', { count: paymentList.length, payments: paymentList });
      setPayments(paymentList);
    } catch (error: any) {
      console.error('❌ 결제 내역 로드 실패:', error);
      console.error('에러 상세:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  // 결제 내역 자동 로드
  useEffect(() => {
    loadPaymentHistory();
  }, [userData?.uid]);

  // 결제 성공 페이지에서 돌아올 때 내역 새로고침
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 페이지 포커스 - 결제 내역 새로고침');
      loadPaymentHistory();
    };

    window.addEventListener('focus', handleFocus);
    
    // 결제 성공 URL 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      console.log('✅ 결제 성공 감지 - 내역 새로고침');
      setTimeout(() => {
        loadPaymentHistory();
      }, 1000);
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [userData?.uid]);

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

        // 현재 비밀번호로 재인증
        try {
          const credential = EmailAuthProvider.credential(
            currentUser.email || '',
            passwordForm.currentPassword
          );
          await reauthenticateWithCredential(currentUser, credential);
        } catch (reauthError: any) {
          console.error('재인증 오류:', reauthError);
          if (reauthError.code === 'auth/wrong-password') {
            setMessage('현재 비밀번호가 올바르지 않습니다.');
            setLoading(false);
            return;
          } else if (reauthError.code === 'auth/user-mismatch') {
            setMessage('사용자 정보가 일치하지 않습니다. 다시 로그인해주세요.');
            setLoading(false);
            return;
          } else if (reauthError.code === 'auth/invalid-credential') {
            setMessage('인증 정보가 올바르지 않습니다. 현재 비밀번호를 확인해주세요.');
            setLoading(false);
            return;
          }
          throw reauthError;
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

  // 문제지 헤더 변경 시작
  const handleStartHeaderEdit = () => {
    const currentHeader = (userData as any)?.printHeader || DEFAULT_PRINT_HEADER;
    setHeaderText(currentHeader);
    setHeaderMessage('');
    setIsHeaderEditing(true);
  };

  const handleCancelHeaderEdit = () => {
    const currentHeader = (userData as any)?.printHeader || DEFAULT_PRINT_HEADER;
    setHeaderText(currentHeader);
    setHeaderMessage('');
    setIsHeaderEditing(false);
  };

  // 문제지 헤더 저장 + 포인트 차감
  const handleSaveHeaderChange = async () => {
    if (!currentUser || !userData) return;

    const trimmed = headerText.trim();
    if (!trimmed) {
      setHeaderMessage('헤더 문구를 입력해주세요.');
      return;
    }
    if (trimmed.length > 80) {
      setHeaderMessage('헤더 문구는 80자 이내로 입력해주세요.');
      return;
    }

    const cost = POINT_POLICY.HEADER_CHANGE_COST;

    setLoading(true);
    setHeaderMessage('');
    try {
      // 1) 포인트 차감
      const result = await deductPointsForPrintHeaderChange(
        userData.uid,
        userData.name || '사용자',
        userData.nickname || '사용자'
      );

      if (!result.success) {
        setHeaderMessage(result.error || '포인트 차감에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 2) 사용자 프로필에 헤더 문자열 저장
      await updateUserProfile({ printHeader: trimmed } as any);

      setHeaderMessage(
        `문제지 헤더가 변경되었고 ${cost.toLocaleString()}P가 차감되었습니다. (잔여 포인트: ${result.remainingPoints.toLocaleString()}P)`
      );
      setIsHeaderEditing(false);
    } catch (error) {
      console.error('문제지 헤더 변경 오류:', error);
      setHeaderMessage('문제지 헤더 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 결제 관련 유틸리티 함수
  const formatPaymentDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case PAYMENT_STATUS.COMPLETED: return '완료';
      case PAYMENT_STATUS.PENDING: return '대기중';
      case PAYMENT_STATUS.FAILED: return '실패';
      case PAYMENT_STATUS.REFUNDED: return '환불됨';
      default: return '알수없음';
    }
  };

  const getPaymentStatusClass = (status: string) => {
    switch (status) {
      case PAYMENT_STATUS.COMPLETED: return 'status-success';
      case PAYMENT_STATUS.PENDING: return 'status-partial';
      case PAYMENT_STATUS.FAILED: return 'status-failed';
      case PAYMENT_STATUS.REFUNDED: return 'status-refunded';
      default: return 'status-unknown';
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'card': return '카드결제';
      case 'bank_transfer': return '계좌이체';
      default: return method;
    }
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
                <label>이름 :</label>
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
                <label>닉네임 :</label>
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
                <label>이메일 (로그인 ID) :</label>
                <span className="info-value">{userData.email || '미설정'}</span>
              </div>

              <div className="info-row">
                <label>전화번호 :</label>
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
                  <span className="info-value">{userData.phoneNumber ? formatPhoneNumber(userData.phoneNumber) : '미설정'}</span>
                )}
              </div>

              <div className="info-row">
                <label>가입일 :</label>
                <span className="info-value">
                  {userData.createdAt ? (() => {
                    try {
                      const date = new Date(userData.createdAt);
                      if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('ko-KR');
                      }
                      return '미설정';
                    } catch (e) {
                      return '미설정';
                    }
                  })() : '미설정'}
                </span>
              </div>

              <div className="info-row">
                <label>잔여 포인트 :</label>
                <span className="info-value points">
                  {(userData.points || 0).toLocaleString()}P
                </span>
              </div>

              {/* 문제지 헤더 행: 값 + 오른쪽 버튼 (모달 트리거 전용) */}
              <div className="info-row header-row">
                <label>문제지 헤더 :</label>
                <div className="header-value-container">
                  <span className="info-value">
                    {(userData as any).printHeader || DEFAULT_PRINT_HEADER}
                  </span>
                </div>
                <div className="info-actions-inline">
                  <button
                    onClick={handleStartHeaderEdit}
                    className="btn-secondary header-edit-btn"
                    disabled={loading}
                  >
                    문제지 헤더변경
                  </button>
                </div>
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

      {/* 문제지 헤더 변경 모달 */}
      {isHeaderEditing && (
        <div className="header-modal-overlay">
          <div className="header-modal">
            <div className="header-modal-header">
              <h2>문제지 헤더 변경</h2>
              <button
                className="header-modal-close"
                onClick={handleCancelHeaderEdit}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div className="header-modal-body">
              <div className="header-modal-current">
                <span className="header-modal-label">현재 헤더</span>
                <span className="header-modal-value">
                  {(userData as any).printHeader || DEFAULT_PRINT_HEADER}
                </span>
              </div>
              <div className="header-modal-input-group">
                <label htmlFor="headerText">새 헤더 문구</label>
                <input
                  id="headerText"
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  className="header-modal-input"
                  placeholder="예) 홍길동 선생님 전용 영어 문제지"
                />
              </div>
              <div className="header-description">
                기본값은 "{DEFAULT_PRINT_HEADER}" 이며, 헤더를 변경할 때마다{' '}
                {POINT_POLICY.HEADER_CHANGE_COST.toLocaleString()}P가 차감됩니다.
              </div>
              {headerMessage && (
                <div className={`message ${headerMessage.includes('차감되었습니다') ? 'success' : 'error'}`}>
                  {headerMessage}
                </div>
              )}
            </div>
            <div className="header-modal-actions">
              <button
                onClick={handleSaveHeaderChange}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? '변경 중...' : `헤더 변경 (−${POINT_POLICY.HEADER_CHANGE_COST.toLocaleString()}P)`}
              </button>
              <button
                onClick={handleCancelHeaderEdit}
                className="btn-secondary"
                disabled={loading}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 결제 내역 컨테이너 - 별도 컨테이너 */}
      <div className="payment-history-container">
        <div className="payment-history-header">
          <h1>결제 내역</h1>
        </div>

        <div className={`payment-history-content ${payments.length === 0 && !paymentLoading ? 'empty-state' : ''}`}>
          {paymentLoading ? (
            <div className="loading">결제 내역을 불러오는 중...</div>
          ) : payments.length === 0 ? (
            <div className="no-data">결제 내역이 없습니다.</div>
          ) : (
            <>
              {/* 통계 정보 */}
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">총 결제 금액</span>
                  <span className="stat-value">
                    {payments
                      .filter(p => p.status === PAYMENT_STATUS.COMPLETED)
                      .reduce((sum, p) => sum + p.amount, 0)
                      .toLocaleString()}원
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">총 충전 포인트</span>
                  <span className="stat-value">
                    {payments
                      .filter(p => p.status === PAYMENT_STATUS.COMPLETED)
                      .reduce((sum, p) => sum + p.pointsEarned, 0)
                      .toLocaleString()}P
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">총 결제 건수</span>
                  <span className="stat-value">
                    {payments.filter(p => p.status === PAYMENT_STATUS.COMPLETED).length}건
                  </span>
                </div>
              </div>

              {/* 결제 내역 테이블 */}
              <div className="payment-history-table">
                <table>
                  <thead>
                    <tr>
                      <th>결제일시</th>
                      <th>결제금액</th>
                      <th>충전포인트</th>
                      <th>결제수단</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments
                      .slice(
                        (paymentCurrentPage - 1) * paymentItemsPerPage,
                        paymentCurrentPage * paymentItemsPerPage
                      )
                      .map((payment) => (
                        <tr key={payment.id}>
                          <td>{formatPaymentDate(payment.createdAt)}</td>
                          <td>{payment.amount.toLocaleString()}원</td>
                          <td>{payment.pointsEarned.toLocaleString()}P</td>
                          <td>
                            {payment.paymentMethod === 'card' && payment.cardInfo ? (
                              <span className="card-info">
                                {payment.cardInfo.brand} •••• {payment.cardInfo.last4}
                              </span>
                            ) : (
                              getPaymentMethodText(payment.paymentMethod)
                            )}
                          </td>
                          <td>
                            <span className={`status-badge ${getPaymentStatusClass(payment.status)}`}>
                              {getPaymentStatusText(payment.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {Math.ceil(payments.length / paymentItemsPerPage) > 1 && (
                <div className="payment-pagination">
                  <button
                    onClick={() => setPaymentCurrentPage(p => Math.max(1, p - 1))}
                    disabled={paymentCurrentPage === 1}
                    className="pagination-btn"
                  >
                    이전
                  </button>
                  <span className="pagination-info">
                    {paymentCurrentPage} / {Math.ceil(payments.length / paymentItemsPerPage)}
                  </span>
                  <button
                    onClick={() => setPaymentCurrentPage(p => Math.min(Math.ceil(payments.length / paymentItemsPerPage), p + 1))}
                    disabled={paymentCurrentPage >= Math.ceil(payments.length / paymentItemsPerPage)}
                    className="pagination-btn"
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

