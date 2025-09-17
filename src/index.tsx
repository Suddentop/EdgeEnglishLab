import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

// React Router future flags 설정
const router = {
  // Firebase 호스팅에서는 루트 경로 사용
  basename: '/',
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_prependBasename: true
  }
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  // React Strict Mode 비활성화 - 개발 모드에서의 이중 렌더링 문제 해결
  <BrowserRouter {...router}>
    <App />
  </BrowserRouter>
); 