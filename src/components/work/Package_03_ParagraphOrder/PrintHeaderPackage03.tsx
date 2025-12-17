import React from 'react';
import { getCurrentPrintHeader } from '../../../utils/printHeader';

const PrintHeaderPackage03: React.FC = () => {
  const headerText = getCurrentPrintHeader();

  return (
    <div className="print-header-package03">
      <div className="print-header-text-package03">
        {headerText}
      </div>
    </div>
  );
};

export default PrintHeaderPackage03;

