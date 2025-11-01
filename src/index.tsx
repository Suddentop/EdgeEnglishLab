import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { HashRouter } from 'react-router-dom';

// HashRouter 사용 - .htaccess 파일 없이도 클라이언트 사이드 라우팅 작동
// URL 형식: http://edgeenglish.net/#/profile (서버 설정 불필요)

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  // React Strict Mode 비활성화 - 개발 모드에서의 이중 렌더링 문제 해결
  <HashRouter>
    <App />
  </HashRouter>
); 