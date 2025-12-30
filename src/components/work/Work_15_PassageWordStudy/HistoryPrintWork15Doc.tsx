import React from 'react';
import {
  PrintHeaderWork15,
  A4PageTemplateWork15
} from './PrintFormat15';
import './PrintFormat15.css';

/**
 * 유형#15 DOC 저장용 컴포넌트 (헤더만 표시)
 * A4 가로형 2단 레이아웃에 헤더만 표시
 */
const HistoryPrintWork15Doc: React.FC = () => {
  return (
    <div className="only-print-work15">
      <A4PageTemplateWork15>
        <div className="print-content-work15">
          <div className="word-list-container-work15">
            {/* 왼쪽 단: 헤더 영역 */}
            <div className="word-list-column-work15">
              <div className="doc-header-placeholder-work15">
                {/* 헤더는 A4PageTemplateWork15 내부에 이미 있음 */}
              </div>
            </div>
            {/* 오른쪽 단: 헤더 영역 */}
            <div className="word-list-column-work15">
              <div className="doc-header-placeholder-work15">
                {/* 헤더는 A4PageTemplateWork15 내부에 이미 있음 */}
              </div>
            </div>
          </div>
        </div>
      </A4PageTemplateWork15>
    </div>
  );
};

export default HistoryPrintWork15Doc;



