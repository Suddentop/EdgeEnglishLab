import React from 'react';
import PrintHeaderWork01 from './PrintHeaderWork01';

interface A4MultiPageTemplateProps {
  children: React.ReactNode;
}

const A4MultiPageTemplate: React.FC<A4MultiPageTemplateProps> = ({ children }) => {
  // 간단한 구현: 현재는 단일 페이지로 시작
  // 실제 구현에서는 content 높이를 측정하여 여러 페이지로 분할해야 함
  
  return (
    <div className="a4-multi-page-container">
      {/* 첫 번째 페이지 */}
      <div className="a4-page-template">
        <div className="a4-page-header">
          <PrintHeaderWork01 />
        </div>
        <div className="a4-page-content">
          {children}
        </div>
      </div>
      
      {/* 내용이 넘칠 경우를 위한 추가 페이지들은 CSS의 page-break로 자동 생성 */}
    </div>
  );
};

export default A4MultiPageTemplate;

