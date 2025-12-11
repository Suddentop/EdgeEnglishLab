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
      console.log('📋 문제생성목록 로드 시작:', {
        userId: userData.uid
      });
      
      // 먼저 모든 데이터 조회 시도 (6개월 제한 없이)
      // 인덱스 문제를 피하기 위해 includeAll을 먼저 시도
      let params: any = {
        limit: 1000,
        includeAll: true
      };
      
      let history = await getQuizHistory(userData.uid, params);
      
      console.log('📋 문제생성목록 로드 완료:', {
        totalCount: history.length,
        recentItems: history.slice(0, 5).map(item => ({
          date: item.createdAt,
          workTypeId: item.workTypeId,
          workTypeName: item.workTypeName
        }))
      });
      
      if (history.length === 0) {
        console.warn('⚠️ 문제생성목록이 비어있습니다. Firestore에서 데이터를 확인해주세요.');
      }
      
      setQuizHistory(history);
      setTotalPages(Math.ceil(history.length / itemsPerPage));
    } catch (error: any) {
      console.error('❌ 문제 생성 내역 로드 실패:', error);
      console.error('에러 상세:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      });
      
      // 모든 경우에 대해 단순 쿼리 재시도
      try {
        console.log('📋 단순 쿼리로 재시도');
        // orderBy 없이 최소한의 쿼리만 사용
        const params = {
          limit: 1000,
          includeAll: true
        };
        const history = await getQuizHistory(userData.uid, params);
        console.log('📋 재시도 성공:', history.length, '개 항목');
        setQuizHistory(history);
        setTotalPages(Math.ceil(history.length / itemsPerPage));
      } catch (retryError: any) {
        console.error('❌ 재시도 실패:', retryError);
        setQuizHistory([]);
        setTotalPages(1);
      }
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
      } else if (historyItem.workTypeId === '15') {
        // 유형#15 전용 표시 페이지로 이동 (원래 인쇄 페이지)
        navigate('/work-15-display', {
          state: {
            quizData: historyItem
          }
        });
      } else {
        // 단일 유형(01~14)도 패키지 표시 페이지를 재사용해 동일한 인쇄 버튼 동작 제공
        const numId = historyItem.workTypeId?.toString()?.padStart(2, '0');
        const isSingleWork = /^(01|02|03|04|05|06|07|08|09|10|11|12|13|14)$/.test(numId || '');

        if (isSingleWork) {
          // generatedData를 패키지 프린트 컴포넌트가 인식하는 구조로 변환
          let parsed: any = historyItem.generatedData;
          try {
            parsed = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
          } catch (e) {}

          const quizItem: any = {
            workTypeId: numId,
            workTypeName: historyItem.workTypeName,
          };

          // 선행 0을 보존해 work02Data, work03Data 형태로 맞춤
          const nestedKey = `work${numId}Data`;
          if (numId === '01') {
            // 유형#01은 여러 문제를 배열로 저장할 수 있음
            if (Array.isArray(parsed)) {
              // 배열인 경우: 각 항목을 quiz 필드로 변환하여 패키지 형태로 처리
              const quizzes = parsed.map((quiz, index) => ({
                workTypeId: '01',
                workTypeName: historyItem.workTypeName,
                quiz: quiz
              }));
              
              const wrapped = {
                ...historyItem,
                generatedData: {
                  isPackage: true,
                  quizzes: quizzes
                }
              } as any;

              navigate('/quiz-display', { state: { quizData: wrapped } });
              return;
            } else {
              // 단일 문제인 경우
              quizItem.quiz = parsed?.quiz || parsed;
            }
          } else if (numId === '02') {
            // 유형#02는 여러 문제를 배열로 저장할 수 있음
            if (Array.isArray(parsed)) {
              // 배열인 경우: 각 항목을 work02Data 필드로 변환하여 패키지 형태로 처리
              const quizzes = parsed.map((quiz, index) => ({
                workTypeId: '02',
                workTypeName: historyItem.workTypeName,
                work02Data: quiz
              }));
              
              const wrapped = {
                ...historyItem,
                generatedData: {
                  isPackage: true,
                  quizzes: quizzes
                }
              } as any;

              navigate('/quiz-display', { state: { quizData: wrapped } });
              return;
            } else {
              // 단일 문제인 경우
              // work02Data, work03Data ... work14Data 로 매핑
              // 저장된 구조가 { work10Data: {...} } 형태인 경우 추출
              if (parsed && typeof parsed === 'object' && parsed[nestedKey]) {
                quizItem[nestedKey] = parsed[nestedKey];
              } else {
                quizItem[nestedKey] = parsed;
              }

              // 유형별 데이터 정규화 (특히 #02)
              const d: any = quizItem[nestedKey] || {};
              // 저장이 { quiz: {...} } 로 된 케이스 흡수
              const quizInner = parsed?.quiz || parsed?.data?.quiz;
              const merged = { ...d, ...(quizInner || {}) };
              // modifiedText가 없으면 text/passage 중 존재하는 필드 사용
              if (!merged.modifiedText) {
                merged.modifiedText = merged.text || merged.passage || '';
              }
              if (!Array.isArray(merged.replacements)) {
                merged.replacements = merged.replacements || [];
              }
              quizItem[nestedKey] = merged;
            }
          } else if (numId === '03') {
            // 유형#03은 여러 문제를 배열로 저장할 수 있음
            if (Array.isArray(parsed)) {
              // 배열인 경우: 각 항목을 work03Data 필드로 변환하여 패키지 형태로 처리
              const quizzes = parsed.map((quiz, index) => ({
                workTypeId: '03',
                workTypeName: historyItem.workTypeName,
                work03Data: quiz
              }));
              
              const wrapped = {
                ...historyItem,
                generatedData: {
                  isPackage: true,
                  quizzes: quizzes
                }
              } as any;

              navigate('/quiz-display', { state: { quizData: wrapped } });
              return;
            } else {
              // 단일 문제인 경우
              // work02Data, work03Data ... work14Data 로 매핑
              // 저장된 구조가 { work10Data: {...} } 형태인 경우 추출
              if (parsed && typeof parsed === 'object' && parsed[nestedKey]) {
                quizItem[nestedKey] = parsed[nestedKey];
              } else {
                quizItem[nestedKey] = parsed;
              }

              // 유형별 데이터 정규화 (특히 #02)
              const d: any = quizItem[nestedKey] || {};
              // 저장이 { quiz: {...} } 로 된 케이스 흡수
              const quizInner = parsed?.quiz || parsed?.data?.quiz;
              const merged = { ...d, ...(quizInner || {}) };
              // modifiedText가 없으면 text/passage 중 존재하는 필드 사용
              if (!merged.modifiedText) {
                merged.modifiedText = merged.text || merged.passage || '';
              }
              if (!Array.isArray(merged.replacements)) {
                merged.replacements = merged.replacements || [];
              }
              quizItem[nestedKey] = merged;
            }
          } else if (numId === '04') {
            // 유형#04는 여러 문제를 배열로 저장할 수 있음
            if (Array.isArray(parsed)) {
              // 배열인 경우: 각 항목을 work04Data 필드로 변환하여 패키지 형태로 처리
              const quizzes = parsed.map((quiz, index) => ({
                workTypeId: '04',
                workTypeName: historyItem.workTypeName,
                work04Data: quiz
              }));
              
              const wrapped = {
                ...historyItem,
                generatedData: {
                  isPackage: true,
                  quizzes: quizzes
                }
              } as any;

              navigate('/quiz-display', { state: { quizData: wrapped } });
              return;
          } else {
              // 단일 문제인 경우
            // work02Data, work03Data ... work14Data 로 매핑
            // 저장된 구조가 { work10Data: {...} } 형태인 경우 추출
            if (parsed && typeof parsed === 'object' && parsed[nestedKey]) {
              quizItem[nestedKey] = parsed[nestedKey];
            } else {
              quizItem[nestedKey] = parsed;
            }

            // 유형별 데이터 정규화 (특히 #02)
              const d: any = quizItem[nestedKey] || {};
              // 저장이 { quiz: {...} } 로 된 케이스 흡수
              const quizInner = parsed?.quiz || parsed?.data?.quiz;
              const merged = { ...d, ...(quizInner || {}) };
              // modifiedText가 없으면 text/passage 중 존재하는 필드 사용
              if (!merged.modifiedText) {
                merged.modifiedText = merged.text || merged.passage || '';
              }
              if (!Array.isArray(merged.replacements)) {
                merged.replacements = merged.replacements || [];
              }
              quizItem[nestedKey] = merged;
            }
          } else if (numId === '05') {
            // 유형#05는 여러 문제를 배열로 저장할 수 있음
            if (Array.isArray(parsed)) {
              // 배열인 경우: 각 항목을 work05Data 필드로 변환하여 패키지 형태로 처리
              const quizzes = parsed.map((quiz, index) => ({
                workTypeId: '05',
                workTypeName: historyItem.workTypeName,
                work05Data: quiz
              }));
              
              const wrapped = {
                ...historyItem,
                generatedData: {
                  isPackage: true,
                  quizzes: quizzes
                }
              } as any;

              navigate('/quiz-display', { state: { quizData: wrapped } });
              return;
            } else {
              // 단일 문제인 경우
              // work02Data, work03Data ... work14Data 로 매핑
              // 저장된 구조가 { work10Data: {...} } 형태인 경우 추출
              if (parsed && typeof parsed === 'object' && parsed[nestedKey]) {
                quizItem[nestedKey] = parsed[nestedKey];
              } else {
                quizItem[nestedKey] = parsed;
              }

              // 유형별 데이터 정규화
              const d: any = quizItem[nestedKey] || {};
              // 저장이 { quiz: {...} } 로 된 케이스 흡수
              const quizInner = parsed?.quiz || parsed?.data?.quiz;
              const merged = { ...d, ...(quizInner || {}) };
              quizItem[nestedKey] = merged;
            }
          } else if (numId === '06') {
            // 유형#06은 여러 문제를 배열로 저장할 수 있음
            if (Array.isArray(parsed)) {
              // 배열인 경우: 각 항목을 work06Data 필드로 변환하여 패키지 형태로 처리
              const quizzes = parsed.map((quiz, index) => ({
                workTypeId: '06',
                workTypeName: historyItem.workTypeName,
                work06Data: quiz
              }));
              
              const wrapped = {
                ...historyItem,
                generatedData: {
                  isPackage: true,
                  quizzes: quizzes
                }
              } as any;

              navigate('/quiz-display', { state: { quizData: wrapped } });
              return;
            } else {
              // 단일 문제인 경우
              // work02Data, work03Data ... work14Data 로 매핑
              // 저장된 구조가 { work10Data: {...} } 형태인 경우 추출
              if (parsed && typeof parsed === 'object' && parsed[nestedKey]) {
                quizItem[nestedKey] = parsed[nestedKey];
              } else {
                quizItem[nestedKey] = parsed;
              }

              // 유형별 데이터 정규화
              const d: any = quizItem[nestedKey] || {};
              // 저장이 { quiz: {...} } 로 된 케이스 흡수
              const quizInner = parsed?.quiz || parsed?.data?.quiz;
              const merged = { ...d, ...(quizInner || {}) };
              quizItem[nestedKey] = merged;
            }
          } else {
            // work02Data, work03Data ... work14Data 로 매핑
            // 저장된 구조가 { work10Data: {...} } 형태인 경우 추출
            if (parsed && typeof parsed === 'object' && parsed[nestedKey]) {
              quizItem[nestedKey] = parsed[nestedKey];
            } else {
              quizItem[nestedKey] = parsed;
            }
          }
          // 번역 필드 추정치 적용 (여러 필드 후보 지원)
          const pdata = (quizItem[nestedKey] || quizItem.quiz || {}) as any;
          quizItem.translatedText =
            pdata.translation ||
            pdata.koreanTranslation ||
            pdata.korean ||
            pdata.koreanText ||
            pdata.korTranslation ||
            pdata.koText ||
            pdata.korean_text ||
            pdata.passageTranslation ||
            pdata.korean_passage ||
            pdata.translatedText ||
            parsed?.translation ||
            parsed?.koreanTranslation ||
            (parsed as any)?.korean ||
            (parsed as any)?.koreanText ||
            (parsed as any)?.korTranslation ||
            (parsed as any)?.koText ||
            (parsed as any)?.korean_text ||
            (parsed as any)?.passageTranslation ||
            (parsed as any)?.korean_passage ||
            parsed?.translatedText ||
            (historyItem as any)?.translation ||
            (historyItem as any)?.koreanTranslation ||
            (historyItem as any)?.korean ||
            (historyItem as any)?.koreanText ||
            (historyItem as any)?.korTranslation ||
            (historyItem as any)?.koText ||
            (historyItem as any)?.korean_text ||
            (historyItem as any)?.passageTranslation ||
            (historyItem as any)?.korean_passage ||
            (historyItem as any)?.translatedText ||
            (historyItem?.generatedData as any)?.translation ||
            (historyItem?.generatedData as any)?.koreanTranslation ||
            (historyItem?.generatedData as any)?.korean ||
            (historyItem?.generatedData as any)?.koreanText ||
            (historyItem?.generatedData as any)?.korTranslation ||
            (historyItem?.generatedData as any)?.koText ||
            (historyItem?.generatedData as any)?.korean_text ||
            (historyItem?.generatedData as any)?.passageTranslation ||
            (historyItem?.generatedData as any)?.korean_passage ||
            (historyItem?.generatedData as any)?.translatedText ||
            '';

          const wrapped = {
            ...historyItem,
            generatedData: {
              isPackage: true,
              quizzes: [quizItem]
            }
          } as any;

          navigate('/quiz-display', { state: { quizData: wrapped } });
          return;
        }
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
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
            생성된 모든 문제의 내역을 확인하고 다운로드할 수 있습니다.
          </p>
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
                  {(() => {
                    const { startPage, endPage, hasPrevGroup, hasNextGroup } = getPaginationGroup();
                    
                    return (
                      <>
                        {/* 이전 그룹 버튼 */}
                        {hasPrevGroup && (
                          <button
                            onClick={() => handlePageChange((Math.ceil(currentPage / 10) - 2) * 10 + 1)}
                            className="pagination-btn pagination-nav"
                            title="이전 10페이지"
                          >
                            &lt;&lt;
                          </button>
                        )}
                        
                        {/* 페이지 번호들 */}
                        {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        {/* 다음 그룹 버튼 */}
                        {hasNextGroup && (
                          <button
                            onClick={() => handlePageChange(Math.ceil(currentPage / 10) * 10 + 1)}
                            className="pagination-btn pagination-nav"
                            title="다음 10페이지"
                          >
                            &gt;&gt;
                          </button>
                        )}
                      </>
                    );
                  })()}
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
