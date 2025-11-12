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
  if (section.type === 'options' && chunkMeta.showOptions === false) {
    return null;
  }
  if (section.type === 'answer' && chunkMeta.showAnswer === false) {
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
          {normalizedItem.chunkMeta?.isSplitChunk &&
            typeof normalizedItem.chunkMeta.totalChunks === 'number' && (
              <span className="print-chunk-info">
                ({(normalizedItem.chunkMeta.chunkIndex ?? 0) + 1}/
                {normalizedItem.chunkMeta.totalChunks})
              </span>
            )}
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
      if (variant === 'sentence-translation') {
        return (
          <div key={key} className="print-sentence-korean-inline">
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
            return (
              <div key={`${key}-option-${optionIndex}`} className="print-option">
                {displayLabel && <span>{displayLabel} </span>}
                {option.text}
                {isAnswerMode && option.isCorrect && (
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
          <div className="print-answer-label">
            {section.meta?.description || '정답'}
          </div>
          <div className="print-answer-content">
            {section.items.map((item, itemIndex) => (
              <div key={`${key}-answer-${itemIndex}`}>{item}</div>
            ))}
          </div>
        </div>
      ) : null;
    case 'translation':
      return section.text ? (
        <div key={key} className="print-translation-section">
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
    console.log('🧾 카드 렌더링', {
      workTypeId: normalizedItem.workTypeId,
      sectionTypes: normalizedItem.sections.map((section) => section.type),
      chunkMeta: normalizedItem.chunkMeta
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

