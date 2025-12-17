import React from 'react';
import { getCurrentPrintHeader } from '../../../utils/printHeader';

const PrintHeaderPackage02: React.FC = () => {
  const headerText = getCurrentPrintHeader();

  return (
    <div className="print-header-package02">
      <div className="print-header-text-package02">
        {headerText}
      </div>
    </div>
  );
};

export default PrintHeaderPackage02;

			