import React, { useState, useEffect } from 'react';
import './PointDeductionModal.css';

interface PointDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  workTypeName: string;
  pointsToDeduct: number;
  userCurrentPoints: number;
  remainingPoints: number;
}

const PointDeductionModal: React.FC<PointDeductionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  workTypeName,
  pointsToDeduct,
  userCurrentPoints,
  remainingPoints
}) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  // 포인트를 1,000단위로 구분하여 표시하는 함수
  const formatPoints = (points: number): string => {
    return points.toLocaleString();
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className={`point-deduction-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className="point-deduction-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚠️ 포인트 차감 확인</h3>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="point-info">
            <div className="info-line info-title">문제 유형: {workTypeName}</div>
            <div className="info-line info-detail">
              <span className="info-label">차감될 포인트:</span>
              <span className="info-value points-to-deduct">-{formatPoints(pointsToDeduct)}P</span>
            </div>
            <div className="info-line info-detail">
              <span className="info-label">현재 보유 포인트:</span>
              <span className="info-value current-points">{formatPoints(userCurrentPoints)}P</span>
            </div>
            <div className="info-line info-detail">
              <span className="info-label">차감 후 잔여 포인트:</span>
              <span className="info-value remaining-points">{formatPoints(remainingPoints)}P</span>
            </div>
          </div>
          
          <div className="warning-message">
            <p>⚠️ 문제 생성 시 위의 포인트가 차감됩니다.</p>
            <p>문제 생성에 실패할 경우 차감된 포인트는 자동으로 환불됩니다.</p>
          </div>
        </div>
        
        <div className="modal-actions">
          <button onClick={handleClose} className="btn-secondary">
            취소
          </button>
          <button onClick={onConfirm} className="btn-primary">
            문제 생성 진행
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointDeductionModal;

