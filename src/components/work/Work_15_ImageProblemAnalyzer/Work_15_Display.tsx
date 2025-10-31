import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../../../styles/PrintFormat.css';

interface Work15Data {
  englishText: string;
  koreanTranslation: string;
  problemType?: string;
  analysis?: string;
}

const Work_15_Display: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<Work15Data | null>(null);

  useEffect(() => {
    const state = location.state as any;
    const generated = state?.quizData?.generatedData;
    try {
      const parsed: Work15Data = typeof generated === 'string' ? JSON.parse(generated) : generated;
      setData(parsed || null);
    } catch (e) {
      console.error('유형#15 내역 파싱 실패:', e);
      setData(null);
    }
  }, [location.state]);

  const handlePrint = () => {
    const styleId = 'print-style-work15-list';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        @page { margin: 0; size: A4 portrait; }
        @media print { body { margin: 0; padding: 0; } }
      `;
      document.head.appendChild(styleEl);
    }
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        const el = document.getElementById(styleId);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 200);
    }, 100);
  };

  if (!data) {
    return (
      <div style={{ padding: '1rem' }}>
        <p>내역을 불러오지 못했습니다.</p>
        <button onClick={() => navigate('/quiz-list')}>목록으로</button>
      </div>
    );
  }

  return (
    <div className="work15-display-page">
      {/* 상단 액션 */}
      <div className="no-print" style={{ padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0, fontWeight: 800 }}>📦 본문 해석 및 추출 (유형#15)</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="work-15-action-btn primary" onClick={() => navigate('/quiz-list')}>문제생성목록</button>
          <button className="work-15-print-btn" onClick={handlePrint}>🖨️ 인쇄 (저장)</button>
        </div>
      </div>

      {/* 화면 표시용 콘텐츠 */}
      <div className="no-print" style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 24px' }}>
        <div className="work-15-text-section" style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <h3 style={{ color: '#1976d2', margin: '0 0 12px 0' }}>📖 영어 본문</h3>
          <div className="work-15-text-content" style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, lineHeight: 1.8, whiteSpace: 'pre-wrap', borderLeft: '4px solid #1976d2' }}>
            {data.englishText}
          </div>
        </div>

        <div className="work-15-text-section" style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#1976d2', margin: '0 0 12px 0' }}>🇰🇷 한글 해석</h3>
          <div className="work-15-text-content korean" style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, lineHeight: 1.8, whiteSpace: 'pre-wrap', borderLeft: '4px solid #1976d2', color: '#1976d2', fontWeight: 500 }}>
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
                <span style={{fontSize: '0.9rem', fontWeight: 700, color: '#FFD700'}}>유형#15</span>
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

export default Work_15_Display;


