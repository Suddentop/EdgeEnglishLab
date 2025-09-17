import React from 'react';
import '../../styles/PrintFormat.css';

const PrintHeader: React.FC = () => (
  <div className="print-header">
    <img src={process.env.PUBLIC_URL + '/logo.png'} alt="Edge English Lab" className="print-header-logo" />
    <div className="print-header-texts">
      <span className="print-header-title">Edge English Lab</span>
      <span className="print-header-tagline">AI 영어 문제 생성 플랫폼</span>
    </div>
  </div>
);

export default PrintHeader; 