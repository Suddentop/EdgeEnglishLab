import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getQuizHistory, QuizHistoryItem } from '../../services/quizHistoryService';
import './QuizListPage.css';

const QuizListPage: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // 문제 생성 내역 로드
  const loadQuizHistory = async () => {
    if (!userData?.uid) return;
    
    setLoading(true);
    try {
      // 최근 30일로 확장하여 더 많은 데이터 가져오기
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const params = {
        startDate: thirtyDaysAgo,
        limit: 200 // 더 많은 데이터 가져오기
      };
      
      console.log('📋 문제생성목록 로드 시작:', {
        userId: userData.uid,
        startDate: thirtyDaysAgo,
        limit: 200
      });
      
      const history = await getQuizHistory(userData.uid, params);
      console.log('📋 문제생성목록 로드 완료:', {
        totalCount: history.length,
        recentItems: history.slice(0, 5).map(item => ({
          date: item.createdAt,
          workTypeId: item.workTypeId,
          workTypeName: item.workTypeName
        }))
      });
      
      setQuizHistory(history);
      setTotalPages(Math.ceil(history.length / itemsPerPage));
    } catch (error) {
      console.error('❌ 문제 생성 내역 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 문제 불러오기 (새 페이지로 이동)
  const handleLoadQuiz = (historyItem: QuizHistoryItem) => {
    try {
      // 패키지 퀴즈인지 확인
      if (historyItem.workTypeId.startsWith('P') && historyItem.generatedData?.isPackage) {
        // 새 페이지로 이동하면서 데이터 전달
        navigate('/quiz-display', {
          state: {
            quizData: historyItem
          }
        });
      } else {
        alert('패키지 퀴즈만 불러올 수 있습니다.');
      }
    } catch (error) {
      console.error('문제 불러오기 실패:', error);
      alert('문제 불러오기에 실패했습니다.');
    }
  };


  // 유형명 표시
  const getDisplayWorkTypeName = (workTypeId: string, workTypeName: string) => {
    if (workTypeId.startsWith('P')) {
      const packageNumber = workTypeId.replace('P', '');
      return `패키지#${packageNumber}`;
    }
    return workTypeName;
  };

  // 상태 표시
  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return '성공';
      case 'partial': return '부분성공';
      case 'failed': return '실패';
      case 'refunded': return '환불됨';
      default: return '알수없음';
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (userData?.uid) {
      loadQuizHistory();
    }
  }, [userData?.uid]);

  // 현재 페이지의 데이터 계산
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = quizHistory.slice(startIndex, endIndex);

  return (
    <div className="quiz-list-page">
      <div className="quiz-list-container">
        <div className="table-header">
          <h2>나의 문제 생성 목록</h2>
        </div>

        <div className="quiz-list-header">
          <h1>문제 생성 목록</h1>
          <button 
            onClick={() => {
              console.log('🔄 문제생성목록 새로고침 버튼 클릭');
              loadQuizHistory();
            }} 
            className="refresh-btn"
            disabled={loading}
          >
            {loading ? '새로고침 중...' : '새로고침'}
          </button>
        </div>

        <div className="quiz-list-table">
          
          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : quizHistory.length === 0 ? (
            <div className="no-data">문제 생성 내역이 없습니다.</div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>유형번호</th>
                    <th>유형명</th>
                    <th>차감</th>
                    <th>성공/실패</th>
                    <th>환불</th>
                    <th>불러오기</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((item) => (
                    <tr key={item.id}>
                      <td>{item.createdAt.toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      }).replace(/(\d{4})\. (\d{2})\. (\d{2})\. (\d{2}:\d{2})/, '$1-$2-$3 $4')}</td>
                      <td>{item.workTypeId}</td>
                      <td className="type-name">{getDisplayWorkTypeName(item.workTypeId, item.workTypeName)}</td>
                      <td className="deduction">-{item.pointsDeducted.toLocaleString()}</td>
                      <td>
                        <span className={`status ${item.status}`}>
                          {getStatusText(item.status)}
                        </span>
                      </td>
                      <td className="refund">
                        {item.pointsRefunded > 0 ? `+${item.pointsRefunded.toLocaleString()}` : ''}
                      </td>
                      <td>
                        <button
                          onClick={() => handleLoadQuiz(item)}
                          className="load-btn"
                          title="문제 불러오기"
                        >
                          🔄
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="pagination">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizListPage;
