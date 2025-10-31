import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import { translateToKorean } from '../../services/common';
import PrintFormatPackage02 from '../work/Package_02_TwoStepQuiz/PrintFormatPackage02';
import SimplePrintFormatPackage02 from '../work/Package_02_TwoStepQuiz/SimplePrintFormatPackage02';
import PrintFormatPackage03 from '../work/Package_03_ParagraphOrder/PrintFormatPackage03';
import PrintFormatPackage01 from '../work/Package_01_MultiQuizGenerater/PrintFormatPackage01';
import HistoryPrintWork12 from '../work/Work_12_WordStudy/HistoryPrintWork12';
import SimpleQuizDisplay from './SimpleQuizDisplay';
import './QuizDisplayPage.css';

const QuizDisplayPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [packageQuiz, setPackageQuiz] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [packageType, setPackageType] = useState(''); // P01, P02, P03 등
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // URL 파라미터나 state에서 데이터 가져오기
    const state = location.state as any;
    
    console.log('📋 QuizDisplayPage 데이터 로딩:', {
      hasState: !!state,
      hasQuizData: !!(state && state.quizData),
      quizData: state?.quizData,
      generatedData: state?.quizData?.generatedData,
      quizzes: state?.quizData?.generatedData?.quizzes
    });
    
    if (state && state.quizData) {
      const quizzes = state.quizData.generatedData?.quizzes || [];
      console.log('📦 패키지 퀴즈 데이터:', {
        quizzesLength: quizzes.length,
        quizzes: quizzes,
        workTypeId: state.quizData.workTypeId
      });
      
      // 첫 번째 퀴즈 아이템의 구조 확인
      if (quizzes.length > 0) {
        console.log('🔍 첫 번째 퀴즈 아이템 구조:', {
          firstQuiz: quizzes[0],
          hasQuiz: !!quizzes[0].quiz,
          workTypeId: quizzes[0].workTypeId,
          keys: Object.keys(quizzes[0])
        });
      }
      
      setPackageQuiz(quizzes);
      setInputText(state.quizData.inputText || '');
      setPackageType(state.quizData.workTypeId || ''); // P01, P02, P03 등
      setLoading(false);
    } else {
      // 데이터가 없으면 목록으로 돌아가기
      navigate('/quiz-list');
    }
  }, [location, navigate]);

  // 인쇄(문제) 핸들러
  const handlePrintProblem = () => {
    console.log('🖨️ 인쇄(문제) 시작 - 데이터 확인:', {
      packageQuiz: packageQuiz,
      packageQuizLength: packageQuiz?.length,
      packageType: packageType,
      inputText: inputText
    });
    
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }
    
    // 패키지/단일 유형에 따른 페이지 스타일 동적 추가
    const style = document.createElement('style');
    style.id = 'print-style-package';
    const isSingleWork = ((!
      packageType || !packageType.startsWith('P')
    ) && Array.isArray(packageQuiz) && packageQuiz.length === 1);
    
    // 단일 유형이면 세로, 패키지#01도 세로
    if (packageType === 'P01' || isSingleWork) {
      // Package#01: A4 세로
      style.textContent = `
        @page {
          margin: 0;
          size: A4 portrait;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
        }
      `;
    } else {
      // Package#02, #03: A4 가로
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
    }
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

    // React 18 방식으로 렌더링 (패키지/단일 유형에 따라)
    const root = ReactDOM.createRoot(printContainer);
    if (isSingleWork) {
      // 단일 유형: 유형에 따라 최적 포맷 선택
      const first = packageQuiz[0] || {};
      const typeId = first.workTypeId;
      // 번역 텍스트 계산 (전역 전달용 - 포맷 컴포넌트에서 우선 사용)
      const d: any = first.quiz || first.data || first[`work${first.workTypeId?.toString().padStart(2,'0')}Data`] || {};
      const globalTranslatedText =
        first.translatedText ||
        d.translation || d.koreanTranslation || d.korean || d.korTranslation || d.koText || d.korean_text || '';
      // 유형별 포맷 선택
      if (typeId === '12') {
        const data: any = first.work12Data || first.data?.work12Data || first.data || first;
        root.render(<HistoryPrintWork12 data={data} />);
      } else {
        root.render(<PrintFormatPackage01 packageQuiz={packageQuiz} translatedText={globalTranslatedText} />);
      }
    } else if (packageType === 'P01') {
      root.render(<PrintFormatPackage01 packageQuiz={packageQuiz} />);
    } else if (packageType === 'P02') {
      root.render(<PrintFormatPackage02 packageQuiz={packageQuiz} />);
    } else if (packageType === 'P03') {
      root.render(<PrintFormatPackage03 packageQuiz={packageQuiz} />);
    } else {
      root.render(<SimplePrintFormatPackage02 packageQuiz={packageQuiz} />);
    }

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
  const handlePrintAnswer = async () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(정답) 시작');
    
    // 패키지/단일 유형에 따른 페이지 스타일 동적 추가
    const style = document.createElement('style');
    style.id = 'print-style-package-answer';
    const isSingleWork = ((!
      packageType || !packageType.startsWith('P')
    ) && Array.isArray(packageQuiz) && packageQuiz.length === 1);
    
    if (packageType === 'P01' || isSingleWork) {
      // Package#01: A4 세로
      style.textContent = `
        @page {
          margin: 0;
          size: A4 portrait;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
        }
      `;
    } else {
      // Package#02, #03: A4 가로
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
        .print-container-answer .a4-landscape-page-template {
          display: block !important;
          width: 29.7cm !important;
          height: 21cm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          box-sizing: border-box !important;
          page-break-after: auto !important;
          break-after: auto !important;
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
          position: relative !important;
        }
        .print-container-answer .print-two-column-container::before {
          content: '' !important;
          position: absolute !important;
          top: 0 !important;
          left: 50% !important;
          width: 2px !important;
          height: 100% !important;
          background-color: #ddd !important;
          transform: translateX(-50%) !important;
          z-index: 1 !important;
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
    }
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

    // React 18 방식으로 렌더링 (정답 모드, 패키지/단일 유형에 따라)
    const root = ReactDOM.createRoot(printContainer);
    if (isSingleWork) {
      const first = packageQuiz[0] || {} as any;
      const typeId = first.workTypeId;
      // 전역 번역 텍스트 산출
      let globalTranslatedText = first.translatedText || '';
      if (!globalTranslatedText && typeId === '03') {
        const d: any = first.work03Data || first.data?.work03Data || first.data || {};
        const textToTranslate: string = d.blankedText || '';
        try {
          if (textToTranslate) {
            globalTranslatedText = await translateToKorean(textToTranslate);
          }
        } catch (e) {
          console.error('유형#03 번역 생성 실패:', e);
        }
      }
      if (typeId === '12') {
        const data: any = first.work12Data || first.data?.work12Data || first.data || first;
        root.render(<HistoryPrintWork12 data={data} isAnswerMode={true} />);
      } else {
        root.render(<PrintFormatPackage01 packageQuiz={packageQuiz} isAnswerMode={true} translatedText={globalTranslatedText} />);
      }
    } else if (packageType === 'P01') {
      root.render(<PrintFormatPackage01 packageQuiz={packageQuiz} isAnswerMode={true} />);
    } else if (packageType === 'P02') {
      root.render(<PrintFormatPackage02 packageQuiz={packageQuiz} isAnswerMode={true} />);
    } else if (packageType === 'P03') {
      root.render(<PrintFormatPackage03 packageQuiz={packageQuiz} isAnswerMode={true} />);
    } else {
      root.render(<PrintFormatPackage02 packageQuiz={packageQuiz} isAnswerMode={true} />);
    }

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
          <h1>
            {packageType === 'P01' ? '📦 패키지 퀴즈 #01 (여러 유형 생성)' :
             packageType === 'P02' ? '📦 패키지 퀴즈 #02 (2단계 문제)' :
             packageType === 'P03' ? '📦 패키지 퀴즈 #03 (본문 집중 문제)' :
             '문제 생성 결과'}
          </h1>
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
