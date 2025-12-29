import React from 'react';
import {
  PrintHeaderWork16,
  A4PageTemplateWork16
} from './PrintFormat16';
import './PrintFormat16.css';

/**
 * 유형#16 DOC 저장용 컴포넌트 (헤더만 표시)
 * A4 가로형 2단 레이아웃에 헤더만 표시
 */
const HistoryPrintWork16Doc: React.FC = () => {
  return (
    <div className="only-print-work16">
      <A4PageTemplateWork16>
        <div className="print-content-work16">
          <div className="word-list-container-work16">
            {/* 왼쪽 단: 헤더 영역 */}
            <div className="word-list-column-work16">
              <div className="doc-header-placeholder-work16">
                {/* 헤더는 A4PageTemplateWork16 내부에 이미 있음 */}
              </div>
            </div>
            {/* 오른쪽 단: 헤더 영역 */}
            <div className="word-list-column-work16">
              <div className="doc-header-placeholder-work16">
                {/* 헤더는 A4PageTemplateWork16 내부에 이미 있음 */}
              </div>
            </div>
          </div>
        </div>
      </A4PageTemplateWork16>
    </div>
  );
};

export default HistoryPrintWork16Doc;


