import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import PrintFormatPackage02 from '../work/Package_02_TwoStepQuiz/PrintFormatPackage02';
import SimplePrintFormatPackage02 from '../work/Package_02_TwoStepQuiz/SimplePrintFormatPackage02';
import TestPrintFormat from '../work/Package_02_TwoStepQuiz/TestPrintFormat';
import SimpleQuizDisplay from './SimpleQuizDisplay';
import './QuizDisplayPage.css';

const QuizDisplayPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [packageQuiz, setPackageQuiz] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [workTypeId, setWorkTypeId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // URL 파라미터나 state에서 데이터 가져오기
    const state = location.state as any;
    
    if (state && state.quizData) {
      setPackageQuiz(state.quizData.generatedData?.quizzes || []);
      setInputText(state.quizData.inputText || '');
      setWorkTypeId(state.quizData.workTypeId || '');
      setLoading(false);
    } else {
      // 데이터가 없으면 목록으로 돌아가기
      navigate('/quiz-list');
    }
  }, [location, navigate]);

  // 인쇄(문제) 핸들러
  const handlePrintProblem = () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(문제) 시작');
    
    // 가로 페이지 스타일 동적 추가
    const style = document.createElement('style');
    style.id = 'print-style-package02';
    style.textContent = `
      @page {
        margin: 0;
        size: A4 landscape;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
      }
    `;
    document.head.appendChild(style);
    
    // 인쇄용 컨테이너 생성
    const printContainer = document.createElement('div');
    printContainer.id = 'print-root-package02';
    document.body.appendChild(printContainer);

    // 기존 화면 숨기기
    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    // React 18 방식으로 렌더링
    const root = ReactDOM.createRoot(printContainer);
    root.render(<SimplePrintFormatPackage02 packageQuiz={packageQuiz} />);

    // 렌더링 완료 후 인쇄
    setTimeout(() => {
      // 브라우저 인쇄
      window.print();

      // 인쇄 후 정리
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(printContainer);
        if (appRoot) {
          appRoot.style.display = 'block';
        }
        document.head.removeChild(style);
        console.log('✅ 인쇄(문제) 완료');
      }, 100);
    }, 500);
  };

  // 인쇄(정답) 핸들러
  const handlePrintAnswer = () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(정답) 시작');
    
    // A4 가로 페이지 스타일 동적 추가
    const style = document.createElement('style');
    style.id = 'print-style-package02-answer';
    style.textContent = `
      @page {
        margin: 0;
        size: A4 landscape;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        .print-container-answer {
          display: block !important;
          width: 29.7cm;
          min-height: 21cm;
          background: white;
          padding: 0;
          box-sizing: border-box;
        }
        .print-container-answer .a4-landscape-page-content {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
        }
        .print-container-answer .print-two-column-container {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 0.6cm !important;
          width: 100% !important;
          justify-content: space-between !important;
          height: 100% !important;
          flex-direction: row !important;
        }
        .print-container-answer .print-question-card {
          width: calc(50% - 0.3cm) !important;
          max-width: calc(50% - 0.3cm) !important;
          min-width: calc(50% - 0.3cm) !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          -webkit-column-break-inside: avoid !important;
          margin-bottom: 0.3cm !important;
          border: none !important;
          padding: 0.5cm !important;
          box-sizing: border-box !important;
          display: block !important;
          float: left !important;
        }
        .print-container-answer .print-question-card:nth-child(odd) {
          clear: left !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // 인쇄용 컨테이너 생성
    const printContainer = document.createElement('div');
    printContainer.id = 'print-root-package02-answer';
    document.body.appendChild(printContainer);

    // 기존 화면 숨기기
    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    // React 18 방식으로 렌더링 (정답 모드)
    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatPackage02 packageQuiz={packageQuiz} isAnswerMode={true} />);

    // 렌더링 완료 후 인쇄
    setTimeout(() => {
      // 브라우저 인쇄
      window.print();

      // 인쇄 후 정리
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(printContainer);
        if (appRoot) {
          appRoot.style.display = 'block';
        }
        document.head.removeChild(style);
        console.log('✅ 인쇄(정답) 완료');
      }, 100);
    }, 500);
  };

  // 목록보기 버튼
  const handleBackToList = () => {
    navigate('/quiz-list');
  };

  if (loading) {
    return (
      <div className="quiz-display-page">
        <div className="loading-container">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    );
  }


  return (
    <div className="quiz-display-page">
      {/* 헤더 */}
      <div className="quiz-display-header">
        <div className="header-left">
          <h1>문제 생성 결과</h1>
          <p>생성된 문제를 확인하고 인쇄할 수 있습니다.</p>
        </div>
        <div className="header-right">
          <button
            onClick={handleBackToList}
            className="back-btn"
          >
            목록보기
          </button>
          <button
            onClick={handlePrintProblem}
            className="print-btn problem-btn"
          >
            🖨️인쇄(문제)
          </button>
          <button
            onClick={handlePrintAnswer}
            className="print-btn answer-btn"
          >
            🖨️인쇄(정답)
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="quiz-display-content">
        {packageQuiz && packageQuiz.length > 0 ? (
          <SimpleQuizDisplay packageQuiz={packageQuiz} />
        ) : (
          <div className="no-content">
            <p>표시할 문제가 없습니다.</p>
            <p>packageQuiz: {JSON.stringify(packageQuiz)}</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default QuizDisplayPage;
