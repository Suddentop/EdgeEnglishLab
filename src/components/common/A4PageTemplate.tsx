import React from 'react';
import PrintHeaderWork01 from './PrintHeaderWork01';

interface A4PageTemplateProps {
  children: React.ReactNode;
  pageNumber?: number;
}

const A4PageTemplate: React.FC<A4PageTemplateProps> = ({ children, pageNumber }) => {
  return (
    <div className="a4-page-template">
      {/* 헤더 영역 */}
      <div className="a4-page-header">
        <PrintHeaderWork01 />
      </div>
      
      {/* 내용 영역 */}
      <div className="a4-page-content">
        {children}
      </div>
    </div>
  );
};

export default A4PageTemplate;

