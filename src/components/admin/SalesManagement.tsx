import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './SalesManagement.css';

interface SalesData {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  category: string;
}

const SalesManagement: React.FC = () => {
  const { userData } = useAuth();
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  // 초기 데이터 로드
  useEffect(() => {
    loadSalesData();
  }, [selectedPeriod]);

  // 매출 데이터 로드 (임시 데이터)
  const loadSalesData = async () => {
    setLoading(true);
    try {
      // 실제 구현에서는 Firebase에서 데이터를 가져옵니다
      const mockData: SalesData[] = [
        {
          id: '1',
          date: '2025-01-15',
          amount: 50000,
          description: '포인트 충전',
          type: 'income',
          category: '포인트'
        },
        {
          id: '2',
          date: '2025-01-14',
          amount: 30000,
          description: '포인트 충전',
          type: 'income',
          category: '포인트'
        },
        {
          id: '3',
          date: '2025-01-13',
          amount: 15000,
          description: '서버 유지보수',
          type: 'expense',
          category: '운영비'
        }
      ];
      
      setSalesData(mockData);
      
      // 총 수입과 지출 계산
      const income = mockData.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
      const expense = mockData.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
      
      setTotalIncome(income);
      setTotalExpense(expense);
    } catch (error) {
      console.error('매출 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 금액 포맷팅
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  return (
    <div className="sales-management">
      <div className="sales-header">
        <h2>💰 매출관리</h2>
        <div className="period-selector">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="period-select"
          >
            <option value="daily">일별</option>
            <option value="weekly">주별</option>
            <option value="monthly">월별</option>
            <option value="yearly">년별</option>
          </select>
        </div>
      </div>

      <div className="sales-summary">
        <div className="summary-card income">
          <h3>총 수입</h3>
          <p className="amount">{formatAmount(totalIncome)}</p>
        </div>
        <div className="summary-card expense">
          <h3>총 지출</h3>
          <p className="amount">{formatAmount(totalExpense)}</p>
        </div>
        <div className="summary-card profit">
          <h3>순이익</h3>
          <p className="amount">{formatAmount(totalIncome - totalExpense)}</p>
        </div>
      </div>

      <div className="sales-table-container">
        <div className="table-header">
          <h3>매출 상세 내역</h3>
          <button className="add-sales-btn">+ 새 매출 기록</button>
        </div>
        
        <table className="sales-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>구분</th>
              <th>카테고리</th>
              <th>설명</th>
              <th>금액</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {salesData.map((item) => (
              <tr key={item.id} className={item.type}>
                <td>{formatDate(item.date)}</td>
                <td>
                  <span className={`type-badge ${item.type}`}>
                    {item.type === 'income' ? '수입' : '지출'}
                  </span>
                </td>
                <td>{item.category}</td>
                <td>{item.description}</td>
                <td className={`amount ${item.type}`}>
                  {item.type === 'income' ? '+' : '-'}{formatAmount(item.amount)}
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="action-btn edit" title="수정">✏️</button>
                    <button className="action-btn delete" title="삭제">🗑️</button>
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

        {salesData.length === 0 && !loading && (
          <div className="no-data">
            <p>매출 데이터가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesManagement;
