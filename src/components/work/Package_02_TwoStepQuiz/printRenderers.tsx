import React from 'react';
import {
  OPTION_LABELS,
  NormalizedQuizItem,
  PrintSection
} from './printNormalization';

export interface RenderOptions {
  isAnswerMode: boolean;
}

export const renderSectionNode = (
  normalizedItem: NormalizedQuizItem,
  section: PrintSection,
  sectionIndex: number,
  keyPrefix: string,
  options: RenderOptions
): React.ReactNode => {
  const key = `${keyPrefix}-section-${sectionIndex}`;
  const { isAnswerMode } = options;

  const chunkMeta = normalizedItem.chunkMeta || {};
  if (section.type === 'instruction' && chunkMeta.showInstruction === false) {
    return null;
  }
  // 유형#05, #07, #08의 경우 options를 항상 표시
  if (section.type === 'options' && chunkMeta.showOptions === false && normalizedItem.workTypeId !== '05' && normalizedItem.workTypeId !== '07' && normalizedItem.workTypeId !== '08') {
    return null;
  }
  // 정답 섹션은 chunkMeta가 있고 showAnswer가 false인 경우에만 제외
  // chunkMeta가 없거나 showAnswer가 true/undefined인 경우에는 렌더링
  if (section.type === 'answer' && chunkMeta && chunkMeta.showAnswer === false) {
    return null;
  }
  if (section.type === 'translation' && chunkMeta.showTranslation === false) {
    return null;
  }

  switch (section.type) {
    case 'title':
      return (
        <div key={key} className="print-question-title">
          <span>{section.text}</span>
          <span className="print-question-type-badge">유형#{normalizedItem.workTypeId}</span>
          {/* 패키지#02 인쇄(정답) 페이지에서 모든 유형의 청크 정보 표시하지 않음 */}
        </div>
      );
    case 'instruction':
      return section.text ? (
        <div key={key} className="print-instruction">
          {section.text}
        </div>
      ) : null;
    case 'paragraph': {
      const variant = section.meta?.variant;
      if (variant === 'sentence') {
        return (
          <div key={key} className="print-sentence-item">
            <div className="print-sentence-english">
              {section.label ? (
                <span className="sentence-number">{section.label}</span>
              ) : null}{' '}
              {section.text}
            </div>
          </div>
        );
      }
      if (variant === 'sentence-with-translation') {
        // 유형#11 정답 모드: 영어 문장과 한글 해석을 구분선 없이 함께 표시
        const translation = section.meta?.translation;
        return (
          <div key={key} className="print-sentence-item print-sentence-with-translation">
            <div className="print-sentence-english">
              {section.label ? (
                <span className="sentence-number">{section.label}</span>
              ) : null}{' '}
              {section.text}
            </div>
            {translation && (
              <div className="print-sentence-korean-inline" style={{
                marginTop: '0.1rem',
                paddingTop: 0,
                paddingBottom: 0,
                paddingLeft: '0.15cm',
                paddingRight: '0.15cm',
                borderTop: 'none',
                borderBottom: 'none'
              }}>
                {translation}
              </div>
            )}
          </div>
        );
      }
      if (variant === 'sentence-translation') {
        return (
          <div key={key} className="print-sentence-korean-inline">
            {section.text}
          </div>
        );
      }
      if (variant === 'missing-sentence') {
        // 유형#06: 주요 문장을 진하게 파란색으로 표시
        const text = section.text || '';
        const parts = text.split('주요 문장:');
        return (
          <div key={key} className="print-paragraph-item print-missing-sentence">
            {parts.length > 1 ? (
              <>
                <span style={{ fontWeight: 700, color: '#1976d2' }}>주요 문장:</span>
                {parts[1]}
              </>
            ) : (
              text
            )}
          </div>
        );
      }
      if (variant === 'numbered-passage') {
        // 유형#06: 영어본문 앞에 여백 추가
        return (
          <div key={key} className="print-paragraph-item" style={{ marginTop: '0.4cm' }}>
            {section.label ? (
              <strong>
                {section.label}
                {section.text ? ': ' : ''}
              </strong>
            ) : null}
            {section.text}
          </div>
        );
      }
      return (
        <div key={key} className="print-paragraph-item">
          {section.label ? (
            <strong>
              {section.label}
              {section.text ? ': ' : ''}
            </strong>
          ) : null}
          {section.text}
        </div>
      );
    }
    case 'text':
      return section.text ? (
        <div key={key} className="print-text-block">
          {section.text}
        </div>
      ) : null;
    case 'html':
      return section.html ? (
        <div
          key={key}
          className="print-html-block"
          dangerouslySetInnerHTML={{ __html: section.html }}
        />
      ) : null;
    case 'options':
      return section.options && section.options.length > 0 ? (
        <div key={key} className="print-options">
          {section.options.map((option, optionIndex) => {
            const displayLabel = option.label || OPTION_LABELS[optionIndex] || '';
            // 정답 마크를 표시할 유형 목록
            const showAnswerMarkTypes = ['01', '03', '04', '05', '07', '08', '09', '10'];
            return (
              <div key={`${key}-option-${optionIndex}`} className="print-option">
                {displayLabel && <span>{displayLabel} </span>}
                {option.text}
                {isAnswerMode && option.isCorrect && showAnswerMarkTypes.includes(normalizedItem.workTypeId) && (
                  <span className="print-answer-mark"> (정답)</span>
                )}
                {isAnswerMode && option.isCorrect && !showAnswerMarkTypes.includes(normalizedItem.workTypeId) && (
                  <span className="print-answer-mark" data-answer-index={optionIndex}></span>
                )}
                {isAnswerMode && option.translation && (
                  <>
                    {'\u00A0\u00A0'}
                    <span className="print-option-translation">{option.translation}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : null;
    case 'table':
      return section.rows && section.rows.length > 0 ? (
        <div key={key} className="print-replacements-table">
          <table>
            {section.headers && section.headers.length > 0 && (
              <thead>
                <tr>
                  {section.headers.map((header, headerIndex) => (
                    <th key={`${key}-header-${headerIndex}`}>{header}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {section.rows.map((row, rowIndex) => (
                <tr key={`${key}-row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${key}-row-${rowIndex}-cell-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null;
    case 'answer':
      return section.items && section.items.length > 0 ? (
        <div key={key} className="print-answer-section">
          {/* items의 첫 번째 항목이 이미 "정답: "으로 시작하는 경우 라벨을 표시하지 않음 */}
          {section.items[0] && !section.items[0].toString().startsWith('정답:') && (
            <div className="print-answer-label">
              {section.meta?.description || '정답'}
            </div>
          )}
          <div className="print-answer-content">
            {section.items.map((item, itemIndex) => (
              <div key={`${key}-answer-${itemIndex}`}>{item}</div>
            ))}
          </div>
        </div>
      ) : null;
    case 'translation':
      // 유형#06의 경우 answerIndex를 originalItem에서 직접 가져오기
      let answerIndex: number | undefined = undefined;
      if (normalizedItem.workTypeId === '06' && isAnswerMode) {
        // 여러 소스에서 answerIndex 확인
        const originalItem = normalizedItem.originalItem;
        if (originalItem?.work06Data?.answerIndex !== undefined && typeof originalItem.work06Data.answerIndex === 'number') {
          answerIndex = originalItem.work06Data.answerIndex;
        } else if (section.meta?.answerIndex !== undefined && typeof section.meta.answerIndex === 'number') {
          answerIndex = section.meta.answerIndex;
        }
      }
      
      // 디버깅: 유형#06의 translation 섹션 확인
      if (process.env.NODE_ENV === 'development' && normalizedItem.workTypeId === '06') {
        console.log('🔍 유형#06 translation 렌더링:', {
          isAnswerMode,
          workTypeId: normalizedItem.workTypeId,
          answerIndex,
          hasMeta: !!section.meta,
          metaAnswerIndex: section.meta?.answerIndex,
          originalItemWork06Data: normalizedItem.originalItem?.work06Data,
          originalItemWork06DataAnswerIndex: normalizedItem.originalItem?.work06Data?.answerIndex
        });
      }
      
      return section.text ? (
        <div key={key} className="print-translation-section">
          {/* 유형#06의 경우 영어본문과 한글해석 사이에 정답 표시 */}
          {isAnswerMode && normalizedItem.workTypeId === '06' && answerIndex !== undefined && (
            <div className="print-answer-before-translation">
              정답 : {OPTION_LABELS[answerIndex] || '-'}
            </div>
          )}
          <div className="print-translation-title">본문해석 :</div>
          <div className="print-translation-content">{section.text}</div>
        </div>
      ) : null;
    case 'list':
      return section.items && section.items.length > 0 ? (
        <ul key={key} className="print-list">
          {section.items.map((item, itemIndex) => (
            <li key={`${key}-list-${itemIndex}`}>{item}</li>
          ))}
        </ul>
      ) : null;
    case 'spacer':
      return <div key={key} className="print-section-spacer" />;
    default:
      return null;
  }
};

export const renderNormalizedCardNode = (
  normalizedItem: NormalizedQuizItem,
  keyPrefix: string,
  options: RenderOptions
): React.ReactNode => {
  if (!normalizedItem.sections || normalizedItem.sections.length === 0) {
    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    const answerSections = normalizedItem.sections.filter(s => s.type === 'answer');
    console.log('🧾 카드 렌더링', {
      workTypeId: normalizedItem.workTypeId,
      sectionTypes: normalizedItem.sections.map((section) => section.type),
      chunkMeta: normalizedItem.chunkMeta,
      answerSectionsCount: answerSections.length,
      answerSectionsKeys: answerSections.map(s => s.key)
    });
  }

  return (
    <div
      key={`card-${keyPrefix}`}
      className="print-question-card"
    >
      {normalizedItem.sections.map((section, sectionIndex) =>
        renderSectionNode(normalizedItem, section, sectionIndex, keyPrefix, options)
      )}
    </div>
  );
};

