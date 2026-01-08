import React from 'react';
import { estimateCost, formatCost, formatTokens, CostEstimate } from '../../utils/costEstimator';
import './CostEstimateDisplay.css';

interface CostEstimateDisplayProps {
  inputText: string;
  workTypeId: string;
  options?: {
    includeTranslation?: boolean;
    includePDF?: boolean;
    sentenceCount?: number;
  };
  className?: string;
}

export const CostEstimateDisplay: React.FC<CostEstimateDisplayProps> = ({
  inputText,
  workTypeId,
  options = {},
  className = ''
}) => {
  if (!inputText || inputText.trim().length < 10) {
    return null;
  }

  let estimate: CostEstimate;
  try {
    estimate = estimateCost(inputText, workTypeId, options);
  } catch (error) {
    console.error('비용 예측 오류:', error);
    return null;
  }

  return (
    <div className={`cost-estimate-display ${className}`}>
      <div className="cost-estimate-header">
        <h4>💰 예상 사용량 및 비용</h4>
        <span className="cost-estimate-note">* 실제 사용량과 다를 수 있습니다</span>
      </div>

      <div className="cost-estimate-content">
        {/* OpenAI 비용 */}
        <div className="cost-section">
          <div className="cost-section-header">
            <span className="cost-section-title">🤖 OpenAI (gpt-4o)</span>
            <span className="cost-section-total">
              {formatCost(estimate.openai.cost.totalKRW)} 
              <span className="cost-usd"> ({formatCost(estimate.openai.cost.total, 'USD')})</span>
            </span>
          </div>
          
          <div className="cost-details">
            <div className="cost-detail-item">
              <span className="cost-detail-label">입력 토큰:</span>
              <span className="cost-detail-value">
                {formatTokens(estimate.openai.totalTokens.input)} 
                ({formatCost(estimate.openai.cost.input * 1350)})
              </span>
            </div>
            <div className="cost-detail-item">
              <span className="cost-detail-label">출력 토큰:</span>
              <span className="cost-detail-value">
                {formatTokens(estimate.openai.totalTokens.output)} 
                ({formatCost(estimate.openai.cost.output * 1350)})
              </span>
            </div>
            
            <div className="cost-api-calls">
              <div className="cost-api-calls-title">API 호출 내역:</div>
              {estimate.openai.apiCalls.map((call, index) => (
                <div key={index} className="cost-api-call-item">
                  <span className="cost-api-call-desc">{call.description}</span>
                  <span className="cost-api-call-tokens">
                    {formatTokens(call.inputTokens)} + {formatTokens(call.outputTokens)} 
                    ({formatCost(call.cost * 1350)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Firebase 비용 */}
        <div className="cost-section">
          <div className="cost-section-header">
            <span className="cost-section-title">🔥 Firebase</span>
            <span className="cost-section-total">
              {formatCost(estimate.firebase.total.costKRW)} 
              <span className="cost-usd"> ({formatCost(estimate.firebase.total.cost, 'USD')})</span>
            </span>
          </div>
          
          <div className="cost-details">
            <div className="cost-detail-item">
              <span className="cost-detail-label">Firestore 쓰기:</span>
              <span className="cost-detail-value">
                {estimate.firebase.firestore.writes}회 
                ({formatCost(estimate.firebase.firestore.costKRW)})
              </span>
            </div>
            {estimate.firebase.storage.uploads > 0 && (
              <div className="cost-detail-item">
                <span className="cost-detail-label">Storage 업로드:</span>
                <span className="cost-detail-value">
                  {estimate.firebase.storage.uploads}개 파일 
                  ({formatCost(estimate.firebase.storage.sizeKB)}KB, {formatCost(estimate.firebase.storage.costKRW)})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 총 비용 */}
        <div className="cost-total">
          <div className="cost-total-label">총 예상 비용:</div>
          <div className="cost-total-value">
            {formatCost(estimate.total.costKRW)}
            <span className="cost-usd"> ({formatCost(estimate.total.cost, 'USD')})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

