import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import FileFormatSelector from '../shared/FileFormatSelector';
import { FileFormat, generateAndUploadFile } from '../../../services/pdfService';
import { useAuth } from '../../../contexts/AuthContext';
import { getQuizHistory, updateQuizHistoryFile } from '../../../services/quizHistoryService';
import '../../../styles/PrintFormat.css';
import '../../quiz/QuizDisplayPage.css';

interface Etc01Data {
  englishText: string;
  koreanTranslation: string;
  problemType?: string;
  analysis?: string;
}

const Etc_01_Display: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [data, setData] = useState<Etc01Data | null>(null);
  const [fileFormat, setFileFormat] = useState<FileFormat>('pdf');

  useEffect(() => {
    const state = location.state as any;
    const generated = state?.quizData?.generatedData;
    try {
      const parsed: Etc01Data = typeof generated === 'string' ? JSON.parse(generated) : generated;
      setData(parsed || null);
    } catch (e) {
      console.error('ETC#01 내역 파싱 실패:', e);
      setData(null);
    }
  }, [location.state]);

  const handlePrint = async () => {
    if (!data) {
      alert('저장할 내용이 없습니다.');
      return;
    }

    if (!currentUser?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    console.log('🖨️ [Etc01 Display] 인쇄(저장) 핸들러 시작');
    
    // 기존 스타일 제거
    const existingStyle = document.getElementById('print-style-etc01-display');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // A4 세로 페이지 스타일 동적 추가
    const style = document.createElement('style');
    style.id = 'print-style-etc01-display';
    style.textContent = `
      @page {
        margin: 0;
        size: A4 portrait;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 21cm !important;
          height: 29.7cm !important;
          overflow: visible !important;
        }
        body > *:not(#print-root-etc01-display) {
          display: none !important;
        }
        #root {
          display: none !important;
        }
        #print-root-etc01-display {
          display: block !important;
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          width: 21cm !important;
          max-width: 21cm !important;
          height: auto !important;
          max-height: 29.7cm !important;
          background: white !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 999999 !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        #print-root-etc01-display * {
          visibility: visible !important;
          opacity: 1 !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }
        #print-root-etc01-display .a4-page-template {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          max-width: 21cm !important;
          height: auto !important;
          max-height: 29.7cm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          page-break-after: auto !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        #print-root-etc01-display .a4-page-header {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: 5cm !important;
          border: none !important;
          border-bottom: none !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        #print-root-etc01-display .print-header-work01 {
          border: none !important;
          border-bottom: none !important;
        }
        #print-root-etc01-display .print-header-text-work01 {
          border: none !important;
          border-bottom: none !important;
        }
        #print-root-etc01-display .a4-page-content {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: 24.7cm !important;
          padding-top: 0 !important;
          padding-left: 1cm !important;
          padding-right: 1cm !important;
          padding-bottom: 1cm !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        #print-root-etc01-display .problem-instruction {
          margin-top: 0 !important;
          box-sizing: border-box !important;
        }
        #print-root-etc01-display .print-content-section {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: 100% !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        #print-root-etc01-display .print-section-title,
        #print-root-etc01-display .print-text-content {
          max-width: 100% !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
      }
      @media screen {
        #print-root-etc01-display {
          display: none !important;
          visibility: hidden !important;
          position: absolute !important;
          left: -9999px !important;
          top: -9999px !important;
          opacity: 0 !important;
          z-index: -1 !important;
          width: 21cm !important;
          max-width: 21cm !important;
          background: white !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // 인쇄용 컨테이너 생성
    const printContainer = document.createElement('div');
    printContainer.id = 'print-root-etc01-display';
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '21cm';
    printContainer.style.background = 'white';
    printContainer.style.zIndex = '9999';
    printContainer.style.visibility = 'hidden';
    document.body.appendChild(printContainer);
    
    // React 렌더링
    const root = ReactDOM.createRoot(printContainer);
    root.render(
      <div className="a4-page-template">
        <div className="a4-page-header">
          <PrintHeaderWork01 />
        </div>
        <div className="a4-page-content">
          <div className="quiz-content">
            <div className="problem-instruction" style={{
              fontWeight: 800,
              fontSize: '1rem',
              background: '#222',
              color: '#fff',
              padding: '0.7rem 0.5rem',
              borderRadius: '8px',
              marginBottom: '1.2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%'
            }}>
              <span>영어 본문 추출 결과 및 한글해석</span>
              <span style={{fontSize: '0.9rem', fontWeight: 700, color: '#FFD700'}}>ETC#01</span>
            </div>

            <div className="print-content-section">
              <div className="print-section-title" style={{
                fontSize: '14pt',
                fontWeight: 'bold',
                marginBottom: '8pt',
                color: '#2d3a60',
                borderBottom: '2px solid #6a5acd',
                paddingBottom: '4pt'
              }}>
                📖 영어 본문
              </div>
              <div className="print-text-content" style={{
                fontSize: '11pt',
                lineHeight: '1.6',
                textAlign: 'justify',
                marginBottom: '12pt',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {data.englishText}
              </div>
            </div>

            <div className="print-divider" style={{ borderTop: '1px solid #ddd', margin: '15pt 0' }}></div>

            <div className="print-content-section">
              <div className="print-section-title" style={{
                fontSize: '14pt',
                fontWeight: 'bold',
                marginBottom: '8pt',
                color: '#2d3a60',
                borderBottom: '2px solid #6a5acd',
                paddingBottom: '4pt'
              }}>
                🇰🇷 한글 해석
              </div>
              <div className="print-text-content korean" style={{
                fontSize: '11pt',
                lineHeight: '1.6',
                textAlign: 'justify',
                marginBottom: '12pt',
                color: '#1976d2',
                fontWeight: '500',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {data.koreanTranslation}
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    // 렌더링 완료 대기 및 파일 생성
    const waitForRender = async (maxAttempts = 10): Promise<HTMLElement | null> => {
      for (let i = 0; i < maxAttempts; i++) {
        const element = document.getElementById('print-root-etc01-display');
        if (element) {
          const templateElement = element.querySelector('.a4-page-template');
          const hasContent = templateElement && templateElement.children.length > 0;
          if (hasContent) {
            return element;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return document.getElementById('print-root-etc01-display');
    };

    setTimeout(async () => {
      try {
        const element = await waitForRender();
        if (!element) {
          console.error('❌ [Etc01 Display] 인쇄 컨테이너를 찾을 수 없습니다.');
          root.unmount();
          if (document.body.contains(printContainer)) {
            document.body.removeChild(printContainer);
          }
          const styleElement = document.getElementById('print-style-etc01-display');
          if (styleElement) {
            styleElement.remove();
          }
          return;
        }

        // 파일 생성 및 Firebase Storage 업로드
        const result = await generateAndUploadFile(
          element as HTMLElement,
          currentUser.uid,
          `etc01_display_${Date.now()}`,
          'ETC#01_정답',
          { isAnswerMode: true, orientation: 'portrait', fileFormat }
        );
        
        console.log('✅ [Etc01 Display] 파일 생성 완료:', result);
        
        // 문제 내역에 파일 URL 저장
        const history = await getQuizHistory(currentUser.uid, { limit: 10 });
        const etc01History = history.find(h => h.workTypeId === '15');
        
        if (etc01History) {
          await updateQuizHistoryFile(etc01History.id, result.url, result.fileName, 'answer');
          const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
          console.log(`📁 [Etc01 Display] ETC#01 정답 ${formatName} 저장 완료:`, result.fileName);
        }
      } catch (error) {
        console.error(`❌ [Etc01 Display] 파일 저장 실패 (${fileFormat}):`, error);
        alert(`파일 저장 중 오류가 발생했습니다: ${error}`);
      }

      // PDF인 경우에만 브라우저 인쇄
      if (fileFormat === 'pdf') {
        const printElement = document.getElementById('print-root-etc01-display');
        if (printElement) {
          printElement.style.display = 'block';
          printElement.style.position = 'absolute';
          printElement.style.left = '0';
          printElement.style.top = '0';
          printElement.style.width = '21cm';
          printElement.style.background = 'white';
          printElement.style.zIndex = '999999';
          printElement.style.visibility = 'visible';
          printElement.style.opacity = '1';
        }
        
    setTimeout(() => {
      window.print();
          
          if (printElement) {
            printElement.style.left = '-9999px';
            printElement.style.visibility = 'hidden';
            printElement.style.display = 'none';
          }
        }, 100);
      }
      
      // 정리
      setTimeout(() => {
        root.unmount();
        if (document.body.contains(printContainer)) {
          document.body.removeChild(printContainer);
        }
        const styleElement = document.getElementById('print-style-etc01-display');
        if (styleElement && document.head.contains(styleElement)) {
          document.head.removeChild(styleElement);
        }
      }, fileFormat === 'pdf' ? 2000 : 100);
      }, 200);
  };

  if (!data) {
    return (
      <div style={{ padding: '1rem' }}>
        <p>내역을 불러오지 못했습니다.</p>
        <button onClick={() => {
          const state = location.state as any;
          const returnPage = state?.returnPage;
          const filterUserId = state?.filterUserId;
          navigate('/quiz-list', {
            state: {
              ...(returnPage && { returnPage }),
              ...(filterUserId && { filterUserId })
            }
          });
        }}>목록으로</button>
      </div>
    );
  }

  return (
    <div className="quiz-display-page">
      {/* 헤더 */}
      <div className="quiz-display-header">
        <div className="header-left">
          <h1>📦 본문 해석 및 추출 (ETC#01)</h1>
        </div>
        <div className="header-right">
          <button
            onClick={() => {
              const state = location.state as any;
              const returnPage = state?.returnPage;
              const filterUserId = state?.filterUserId;
              navigate('/quiz-list', {
                state: {
                  ...(returnPage && { returnPage }),
                  ...(filterUserId && { filterUserId })
                }
              });
            }}
            className="back-btn"
          >
            목록보기
          </button>
          
          {/* 파일 형식 선택 */}
          <FileFormatSelector
            value={fileFormat}
            onChange={setFileFormat}
          />
          
          <button
            onClick={handlePrint}
            className="print-btn problem-btn"
          >
            {fileFormat === 'pdf' ? '🖨️인쇄(저장)' : '💾저장'}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="quiz-display-content">
        <div className="etc-01-text-section" style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <h3 style={{ color: '#1976d2', margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 600 }}>📖 영어 본문</h3>
          <div className="etc-01-text-content" style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, lineHeight: 1.8, whiteSpace: 'pre-wrap', borderLeft: '4px solid #1976d2', fontSize: '1rem' }}>
            {data.englishText}
          </div>
        </div>

        <div className="etc-01-text-section" style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#1976d2', margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 600 }}>🇰🇷 한글 해석</h3>
          <div className="etc-01-text-content korean" style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, lineHeight: 1.8, whiteSpace: 'pre-wrap', borderLeft: '4px solid #1976d2', color: '#1976d2', fontWeight: 500, fontSize: '1rem' }}>
            {data.koreanTranslation}
          </div>
        </div>
      </div>

      {/* 인쇄 페이지 */}
      <div className="only-print">
        <div className="a4-page-template">
          <div className="a4-page-header">
            <PrintHeaderWork01 />
          </div>
          <div className="a4-page-content">
            <div className="quiz-content">
              <div className="problem-instruction" style={{
                fontWeight: 800,
                fontSize: '1rem',
                background: '#222',
                color: '#fff',
                padding: '0.7rem 0.5rem',
                borderRadius: '8px',
                marginBottom: '1.2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%'
              }}>
                <span>영어 본문 추출 결과 및 한글해석</span>
                <span style={{fontSize: '0.9rem', fontWeight: 700, color: '#FFD700'}}>ETC#01</span>
              </div>

              <div className="print-content-section">
                <div className="print-section-title" style={{
                  fontSize: '14pt',
                  fontWeight: 'bold',
                  marginBottom: '8pt',
                  color: '#2d3a60',
                  borderBottom: '2px solid #6a5acd',
                  paddingBottom: '4pt'
                }}>
                  📖 영어 본문
                </div>
                <div className="print-text-content" style={{
                  fontSize: '11pt',
                  lineHeight: '1.6',
                  textAlign: 'justify',
                  marginBottom: '12pt'
                }}>
                  {data.englishText}
                </div>
              </div>

              <div className="print-divider" style={{ borderTop: '1px solid #ddd', margin: '15pt 0' }}></div>

              <div className="print-content-section">
                <div className="print-section-title" style={{
                  fontSize: '14pt',
                  fontWeight: 'bold',
                  marginBottom: '8pt',
                  color: '#2d3a60',
                  borderBottom: '2px solid #6a5acd',
                  paddingBottom: '4pt'
                }}>
                  🇰🇷 한글 해석
                </div>
                <div className="print-text-content korean" style={{
                  fontSize: '11pt',
                  lineHeight: '1.6',
                  textAlign: 'justify',
                  marginBottom: '12pt',
                  color: '#1976d2',
                  fontWeight: 500
                }}>
                  {data.koreanTranslation}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Etc_01_Display;


