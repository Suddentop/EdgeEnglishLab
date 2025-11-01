import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Modal from 'react-modal';
import './Navigation.css';
import { isAdmin } from '../../utils/adminUtils';

const WORK_MENUS = [
  { label: '📦 본문 해석 및 본문 추출', path: '/work_15_image-problem-analyzer' },
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
  { label: '12. 단어 학습', path: '/work_12_word-study' },
  { label: '13. 빈칸 채우기 (단어-주관식)', path: '/work_13_blank-fill-word' },
  { label: '14. 빈칸 채우기 (문장-주관식)', path: '/work_14_blank-fill-sentence' }
];

const Navigation: React.FC = () => {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownCloseTimer = React.useRef<NodeJS.Timeout | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);


  // 반응형 체크
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 드롭다운 토글 (클릭 시만)
  const handleDropdownToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowDropdown(v => !v);
  };
  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      const dropdown = document.querySelector('.dropdown');
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

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
    if (!currentUser) {
      setShowAuthModal(true);
      setShowDropdown(false);
      setShowMobileMenu(false);
      return;
    }
    navigate(path);
    setShowDropdown(false);
    setShowMobileMenu(false);
  };

  return (
    <nav className="navigation">
      <Link to="/" className="logo">
        <img src={process.env.PUBLIC_URL + '/logo.png'} alt="Edge English Lab" className="logo-image" />
        <div className="logo-text">
          <h1>
            Edge English Lab
            <span className="tagline">AI 영어 문제 생성 플랫폼</span>
          </h1>
        </div>
      </Link>
      {/* 모바일/태블릿: 햄버거 */}
      {isMobile && (
        <div className="hamburger-menu">
          <button className="hamburger-btn" onClick={() => setShowMobileMenu(v => !v)}>
            ☰
          </button>
          {showMobileMenu && (
            <div className="mobile-menu-content">
              <button className="mobile-menu-close" onClick={() => setShowMobileMenu(false)}>×</button>
              {/* 문제생성 */}
              <button
                className="mobile-menu-item mobile-single-item"
                onClick={() => { setShowMobileMenu(false); }}
              >
                문제생성
              </button>
              
              {/* 문제생성 하위 메뉴들 */}
              {WORK_MENUS.map(menu => (
                <button
                  key={menu.path}
                  className="mobile-menu-item mobile-sub-item"
                  onClick={() => handleMenuClick(menu.path)}
                >
                  {menu.label}
                </button>
              ))}
              
              {/* 나의문제목록 */}
              <button
                className="mobile-menu-item mobile-single-item"
                onClick={() => { setShowMobileMenu(false); navigate('/quiz-list'); }}
              >
                나의문제목록
              </button>
              
              {/* Feedback */}
              <button
                className="mobile-menu-item mobile-single-item"
                onClick={() => { setShowMobileMenu(false); navigate('/feedback'); }}
              >
                Feedback
              </button>
              
              {/* 내 정보 */}
              {currentUser && (
                <button
                  className="mobile-menu-item mobile-single-item"
                  onClick={() => { setShowMobileMenu(false); navigate('/profile'); }}
                >
                  내 정보
                </button>
              )}
              
              {/* 포인트구매 */}
              {currentUser && (
                <button
                  className="mobile-menu-item mobile-single-item"
                  onClick={() => { setShowMobileMenu(false); navigate('/point-charge'); }}
                >
                  포인트구매
                </button>
              )}
              
              {/* 관리자 */}
              {currentUser && isAdmin(userData) && (
                <button
                  className="mobile-menu-item mobile-single-item"
                  onClick={() => { setShowMobileMenu(false); navigate('/admin'); }}
                >
                  관리자
                </button>
              )}
              
              {/* 로그아웃 */}
              {currentUser && (
                <button
                  className="mobile-menu-item mobile-single-item"
                  onClick={() => { setShowMobileMenu(false); handleLogout(); }}
                >
                  로그아웃
                </button>
              )}
              
              {/* 로그인/회원가입 (로그인하지 않은 상태일 때만) */}
              {!currentUser && (
                <>
                  <button
                    className="mobile-menu-item mobile-single-item"
                    onClick={() => { setShowMobileMenu(false); navigate('/login'); }}
                  >
                    로그인
                  </button>
                  <button
                    className="mobile-menu-item mobile-single-item"
                    onClick={() => { setShowMobileMenu(false); navigate('/signup'); }}
                  >
                    회원가입
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
      <div className="nav-links">
        {/* PC: 드롭다운 */}
        {!isMobile && (
          <div className="dropdown">
            <button 
              className="dropdown-btn"
              onClick={handleDropdownToggle}
              onMouseDown={e => e.preventDefault()}
              aria-expanded={showDropdown}
              aria-haspopup="true"
            >문제생성 ▼</button>
            {showDropdown && (
              <div className="dropdown-content">
                {WORK_MENUS.map(menu => (
                  <button
                    key={menu.path}
                    className="dropdown-item"
                    onClick={() => handleMenuClick(menu.path)}
                  >
                    {menu.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* 나의문제목록 버튼: PC 화면에서만 보임 */}
        {currentUser && !isMobile && (
          <button
            className="nav-text-link"
            onClick={() => navigate('/quiz-list')}
          >
            나의문제목록
          </button>
        )}
        
        {/* 포인트구매 버튼: PC 화면에서만 보임 */}
        {currentUser && !isMobile && (
          <button
            className="nav-text-link point-purchase-link"
            onClick={() => {
              navigate('/point-charge');
            }}
          >
            포인트구매
          </button>
        )}
        {/* Feedback 메뉴 */}
        {!isMobile && (
          <Link to="/feedback" className="nav-text-link feedback-link">
            Feedback
          </Link>
        )}
        {/* 개인정보 수정 링크: PC 화면에서만 보임 */}
        {currentUser && !isMobile && (
          <button
            className="nav-text-link profile-link"
            onClick={() => {
              navigate('/profile');
            }}
          >
            내정보
          </button>
        )}
        {/* 관리자 메뉴: PC 화면에서 관리자 권한 사용자에게만 표시 */}
        {currentUser && isAdmin(userData) && !isMobile && (
          <Link to="/admin" className="nav-text-link admin-link">
            관리자
          </Link>
        )}
        {currentUser ? (
          <>
            {/* 로그아웃 링크: PC 화면에서만 보임 */}
            {!isMobile && (
              <button onClick={handleLogout} className="nav-text-link auth-link">로그아웃</button>
            )}
          </>
        ) : (
          <>
            {/* 회원가입/로그인 링크: PC 화면에서만 보임 */}
            {!isMobile && (
              <>
                <Link to="/signup" className="nav-text-link auth-link">회원가입</Link>
                <Link to="/login" className="nav-text-link auth-link">로그인</Link>
              </>
            )}
          </>
        )}
      </div>
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

    </nav>
  );
};

export default Navigation; 