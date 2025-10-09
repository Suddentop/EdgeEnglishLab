// 임시 API Key 확인용 컴포넌트
import React from 'react';

export const ApiKeyCheck: React.FC = () => {
  const proxyUrl = process.env.REACT_APP_API_PROXY_URL;
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', margin: '20px', border: '1px solid #ddd' }}>
      <h3>🔍 환경 변수 확인</h3>
      <p><strong>REACT_APP_API_PROXY_URL:</strong> {proxyUrl || '❌ 설정 안 됨'}</p>
      <p><strong>REACT_APP_OPENAI_API_KEY:</strong> {apiKey ? `✅ 설정됨 (${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 4)})` : '❌ 설정 안 됨'}</p>
      <p><strong>환경:</strong> {proxyUrl ? '프로덕션 (프록시 사용)' : '개발 (직접 API 호출)'}</p>
    </div>
  );
};

export default ApiKeyCheck;


