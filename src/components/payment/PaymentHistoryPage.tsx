import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentService } from '../../services/paymentService';
import { Payment } from '../../types/types';
import { PAYMENT_STATUS } from '../../utils/pointConstants';
import './PaymentHistoryPage.css';

const PaymentHistoryPage: React.FC = () => {
  const { userData } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // 결제 내역 로드
  const loadPaymentHistory = async () => {
    if (!userData?.uid) return;
    
    setLoading(true);
    try {
      console.log('💳 결제내역 로드 시작:', {
        userId: userData.uid
      });
      
      const paymentList = await PaymentService.getUserPayments(userData.uid);
      console.log('💳 결제내역 로드 완료:', {
        totalCount: paymentList.length,
        recentItems: paymentList.slice(0, 5).map(item => ({
          date: item.createdAt,
          amount: item.amount,
          status: item.status
        }))
      });
      
      setPayments(paymentList);
      setTotalPages(Math.ceil(paymentList.length / itemsPerPage));
    } catch (error) {
      console.error('❌ 결제 내역 로드 실패:', error);
      alert('결제 내역을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 페이지네이션 그룹 계산
  const getPaginationGroup = () => {
    const groupSize = 10; // 한 그룹에 표시할 페이지 수
    const currentGroup = Math.ceil(currentPage / groupSize);
    const startPage = (currentGroup - 1) * groupSize + 1;
    const endPage = Math.min(startPage + groupSize - 1, totalPages);
    
    return {
      startPage,
      endPage,
      hasPrevGroup: currentGroup > 1,
      hasNextGroup: currentGroup < Math.ceil(totalPages / groupSize)
    };
  };

  // 결제 상태 표시
  const getStatusText = (status: string) => {
    switch (status) {
      case PAYMENT_STATUS.COMPLETED: return '완료';
      case PAYMENT_STATUS.PENDING: return '대기중';
      case PAYMENT_STATUS.FAILED: return '실패';
      case PAYMENT_STATUS.REFUNDED: return '환불됨';
      default: return '알수없음';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case PAYMENT_STATUS.COMPLETED: return 'status-completed';
      case PAYMENT_STATUS.PENDING: return 'status-pending';
      case PAYMENT_STATUS.FAILED: return 'status-failed';
      case PAYMENT_STATUS.REFUNDED: return 'status-refunded';
      default: return '';
    }
  };

  // 결제 수단 표시
  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'card': return '카드결제';
      case 'bank_transfer': return '계좌이체';
      default: return method;
    }
  };

  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (userData?.uid) {
      loadPaymentHistory();
    }
  }, [userData?.uid]);

  // 현재 페이지의 데이터 계산
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = payments.slice(startIndex, endIndex);

  // 통계 계산
  const totalAmount = payments
    .filter(p => p.status === PAYMENT_STATUS.COMPLETED)
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPoints = payments
    .filter(p => p.status === PAYMENT_STATUS.COMPLETED)
    .reduce((sum, p) => sum + p.pointsEarned, 0);

  const paginationGroup = getPaginationGroup();

  return (
    <div className="payment-history-page">
      <div className="payment-history-container">
        <div className="table-header">
          <h2>결제 내역</h2>
        </div>

        <div className="payment-history-header">
          <div className="stats-section">
            <div className="stat-item">
              <span className="stat-label">총 결제 금액:</span>
              <span className="stat-value">{totalAmount.toLocaleString()}원</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">총 충전 포인트:</span>
              <span className="stat-value">{totalPoints.toLocaleString()}P</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">총 결제 건수:</span>
              <span className="stat-value">{payments.filter(p => p.status === PAYMENT_STATUS.COMPLETED).length}건</span>
            </div>
          </div>
          <button 
            onClick={() => {
              console.log('🔄 결제내역 새로고침 버튼 클릭');
              loadPaymentHistory();
            }} 
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? '새로고침 중...' : '새로고침'}
          </button>
        </div>

        {loading && payments.length === 0 ? (
          <div className="loading-container">
            <p>결제 내역을 불러오는 중...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="empty-container">
            <p>결제 내역이 없습니다.</p>
          </div>
        ) : (
          <>
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
                  {currentData.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.createdAt)}</td>
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
                        <span className={`status-badge ${getStatusClass(payment.status)}`}>
                          {getStatusText(payment.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(paginationGroup.startPage - 1)}
                  disabled={!paginationGroup.hasPrevGroup}
                  className="pagination-btn"
                >
                  «
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  ‹
                </button>
                {Array.from({ length: paginationGroup.endPage - paginationGroup.startPage + 1 }, (_, i) => {
                  const page = paginationGroup.startPage + i;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  ›
                </button>
                <button
                  onClick={() => handlePageChange(paginationGroup.endPage + 1)}
                  disabled={!paginationGroup.hasNextGroup}
                  className="pagination-btn"
                >
                  »
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentHistoryPage;


