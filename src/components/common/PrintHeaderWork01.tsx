import React from 'react';
import { getCurrentPrintHeader } from '../../utils/printHeader';

const PrintHeaderWork01: React.FC = () => {
  const headerText = getCurrentPrintHeader();

  return (
    <div className="print-header-work01">
      <div className="print-header-text-work01">
        {headerText}
      </div>
      <div className="print-header-divider"></div>
    </div>
  );
};

export default PrintHeaderWork01;
