import React, { useEffect, useRef, useState } from 'react';
import PrintHeaderWork01 from './PrintHeaderWork01';

interface DynamicA4PagesProps {
  children: React.ReactNode;
}

const DynamicA4Pages: React.FC<DynamicA4PagesProps> = ({ children }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    // 간단한 구현: 현재는 단일 페이지로 시작
    // 실제로는 content의 높이를 측정하여 페이지 분할을 해야 함
    setPages([children]);
  }, [children]);

  return (
    <div className="dynamic-a4-pages">
      {pages.map((pageContent, index) => (
        <div key={index} className="a4-page-template">
          {/* 각 페이지마다 헤더 */}
          <div className="a4-page-header">
            <PrintHeaderWork01 />
          </div>
          
          {/* 페이지 내용 */}
          <div className="a4-page-content">
            {pageContent}
          </div>
        </div>
      ))}
      
      {/* 측정용 숨겨진 컨테이너 */}
      <div 
        ref={contentRef}
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          visibility: 'hidden',
          width: '19cm', // A4 width minus padding
          fontSize: '1rem'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default DynamicA4Pages;

