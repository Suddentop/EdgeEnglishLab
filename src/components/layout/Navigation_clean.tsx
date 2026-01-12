import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Modal from 'react-modal';
import './Navigation.css';
import { isAdmin } from '../../utils/adminUtils';

const WORK_MENUS = [
  { label: '📦 본문 해석 및 본문 추출', path: '/etc_01_image-problem-analyzer' },
  { label: '📦 패키지 퀴즈 #01 (여러 유형 생성)', path: '/package-quiz' },
  { label: '📦 패키지 퀴즈 #02 (2단 출력)', path: '/package-quiz-2step' },
  { label: '📦 패키지 퀴즈 #03 (본문 집중 문제)', path: '/package-quiz-3order' },
  { label: '01. 문단 순서 맞추기', path: '/work_01_article-order' },
  { label: '02. 유사단어 독해', path: '/work_02_reading-comprehension' },
  { label: '03. 빈칸(단어) 찾기', path: '/work_03_vocabulary-word' },
  { label: '04. 빈칸(구) 찾기', path: '/work_04_blank-phrase-inference' },
  { label: '05. 빈칸(문장) 찾기', path: '/work_05_blank-sentence-inference' },
  { label: '06. 문장 위치 찾기', path: '/work_06_sentence-position' },
  { label: '07. 주제 추론', path: '/work_07_main-idea-inference' },
  { label: '08. 제목 추론', path: '/work_08_title-inference' },
  { label: '09. 어법 오류 찾기', path: '/work_09_grammar-error' },
  { label: '10. 다중 어법 오류 찾기', path: '/work_10_multi-grammar-error' },
  { label: '11. 본문 문장별 해석', path: '/work_11_sentence-translation' },
  { label: '12. 단어 학습 (단어문제)', path: '/work_12_word-study' },
  { label: '13. 단어 학습 (본문 - 단어문제)', path: '/work_15_passage-word-study' },
  { label: '14. 빈칸 채우기 (단어-주관식)', path: '/work_13_blank-fill-word' },
  { label: '15. 빈칸 채우기 (문장-주관식)', path: '/work_14_blank-fill-sentence' }
];

const Navigation: React.FC = () => {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showWorkMenu, setShowWorkMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 900;
    }
    return false;
  });

  // 반응형 체크
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 로그아웃
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
    }
  };

  // 메뉴 클릭 시 로그인 체크
  const handleMenuClick = (path: string) => {
    if (!currentUser && path !== '/' && path !== '/guide' && path !== '/feedback' && path !== '/login' && path !== '/signup') {
      setShowAuthModal(true);
      return;
    }
    navigate(path);
    if (isMobile) {
      // 모바일에서는 메뉴 닫기
      document.querySelector('.navigation')?.classList.remove('mobile-open');
    }
  };

  // 현재 경로 확인
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      {isMobile && (
        <button 
          className="mobile-menu-toggle"
          onClick={() => document.querySelector('.navigation')?.classList.toggle('mobile-open')}
          style={{
            position: 'fixed',
            top: '12px',
            left: '12px',
            zIndex: 1001,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            padding: '8px',
            cursor: 'pointer',
            fontSize: '20px'
          }}
        >
          ☰
        </button>
      )}
      <nav className="navigation">
        {/* 로고 */}
        <Link to="/" className="logo" onClick={() => handleMenuClick('/')}>
          <img src={process.env.PUBLIC_URL + '/images/logo.png'} alt="Edge English Lab" className="logo-image" />
          <div className="logo-text">
            <h1>Edge English Lab</h1>
            <span className="tagline">AI 영어 문제 생성 플랫폼</span>
          </div>
        </Link>

        {/* 사이드바 컨텐츠 */}
        <div className="sidebar-content">
          {/* 홈 */}
          <div className="sidebar-section">
            <button
              className={`sidebar-menu-item ${isActive('/') ? 'active' : ''}`}
              onClick={() => handleMenuClick('/')}
            >
              <span className="sidebar-menu-item-icon">🏠</span>
              <span className="sidebar-menu-item-text">홈</span>
            </button>
          </div>

          {/* 문제생성 섹션 */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">문제생성</div>
            <button
              className={`sidebar-menu-item ${showWorkMenu ? 'active' : ''}`}
              onClick={() => setShowWorkMenu(!showWorkMenu)}
            >
              <span className="sidebar-menu-item-icon">{showWorkMenu ? '▼' : '▶'}</span>
              <span className="sidebar-menu-item-text">문제생성</span>
            </button>
            {showWorkMenu && (
              <div className="sidebar-submenu">
                {WORK_MENUS.map(menu => (
                  <button
                    key={menu.path}
                    className={`sidebar-submenu-item ${isActive(menu.path) ? 'active' : ''}`}
                    onClick={() => handleMenuClick(menu.path)}
                  >
                    {menu.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 나의문제목록 */}
          {currentUser && (
            <div className="sidebar-section">
              <button
                className={`sidebar-menu-item ${isActive('/quiz-list') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/quiz-list')}
              >
                <span className="sidebar-menu-item-icon">📋</span>
                <span className="sidebar-menu-item-text">나의문제목록</span>
              </button>
            </div>
          )}

          {/* Feedback */}
          <div className="sidebar-section">
            <button
              className={`sidebar-menu-item ${isActive('/feedback') ? 'active' : ''}`}
              onClick={() => handleMenuClick('/feedback')}
            >
              <span className="sidebar-menu-item-icon">💬</span>
              <span className="sidebar-menu-item-text">Feedback</span>
            </button>
          </div>

          {/* 이용안내 */}
          <div className="sidebar-section">
            <button
              className={`sidebar-menu-item ${isActive('/guide') ? 'active' : ''}`}
              onClick={() => handleMenuClick('/guide')}
            >
              <span className="sidebar-menu-item-icon">📖</span>
              <span className="sidebar-menu-item-text">이용안내</span>
            </button>
          </div>

          {/* 내 정보 */}
          {currentUser && (
            <div className="sidebar-section">
              <button
                className={`sidebar-menu-item ${isActive('/profile') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/profile')}
              >
                <span className="sidebar-menu-item-icon">👤</span>
                <span className="sidebar-menu-item-text">내 정보</span>
              </button>
            </div>
          )}

          {/* 포인트구매 */}
          {currentUser && (
            <div className="sidebar-section">
              <button
                className={`sidebar-menu-item ${isActive('/point-charge') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/point-charge')}
              >
                <span className="sidebar-menu-item-icon">💰</span>
                <span className="sidebar-menu-item-text">포인트구매</span>
              </button>
            </div>
          )}

          {/* 관리자 */}
          {currentUser && isAdmin(userData) && (
            <div className="sidebar-section">
              <button
                className={`sidebar-menu-item ${isActive('/admin') ? 'active' : ''}`}
                onClick={() => handleMenuClick('/admin')}
              >
                <span className="sidebar-menu-item-icon">⚙️</span>
                <span className="sidebar-menu-item-text">관리자</span>
              </button>
            </div>
          )}
        </div>

        {/* 사용자 영역 */}
        <div className="sidebar-user-section">
          {currentUser ? (
            <>
              <div className="sidebar-user-info">
                {userData?.nickname || userData?.email || '사용자'}
              </div>
              <div className="sidebar-user-actions">
                <button className="sidebar-action-button" onClick={handleLogout}>
                  로그아웃
                </button>
              </div>
            </>
          ) : (
            <div className="sidebar-user-actions">
              <button 
                className="sidebar-action-button" 
                onClick={() => handleMenuClick('/login')}
              >
                로그인
              </button>
              <button 
                className="sidebar-action-button" 
                onClick={() => handleMenuClick('/signup')}
              >
                회원가입
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* 모바일 오버레이 */}
      {isMobile && (
        <div 
          className="mobile-sidebar-overlay"
          onClick={() => document.querySelector('.navigation')?.classList.remove('mobile-open')}
          style={{
            display: document.querySelector('.navigation.mobile-open') ? 'block' : 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 999
          }}
        />
      )}

      <Modal
        isOpen={showAuthModal}
        onRequestClose={() => setShowAuthModal(false)}
        className="auth-modal"
        overlayClassName="auth-modal-overlay"
        ariaHideApp={false}
      >
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>로그인이 필요합니다</h2>
          <p>이 기능을 사용하려면 로그인이 필요합니다.</p>
          <button onClick={() => { setShowAuthModal(false); navigate('/login'); }} className="modal-login-btn">로그인 하러 가기</button>
        </div>
      </Modal>
    </>
  );
};

export default Navigation;
