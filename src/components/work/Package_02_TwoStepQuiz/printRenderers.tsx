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
  // 유형#01, #03, #04, #05, #07, #08, #10의 경우 options를 항상 표시 (유형#01은 첫 번째 청크에 options가 있음)
  if (section.type === 'options' && chunkMeta.showOptions === false && normalizedItem.workTypeId !== '01' && normalizedItem.workTypeId !== '03' && normalizedItem.workTypeId !== '04' && normalizedItem.workTypeId !== '05' && normalizedItem.workTypeId !== '07' && normalizedItem.workTypeId !== '08' && normalizedItem.workTypeId !== '10') {
    return null;
  }
  // 정답 섹션은 chunkMeta가 있고 showAnswer가 false인 경우에만 제외
  // 단, 유형#06의 경우 항상 정답 섹션 렌더링
  // chunkMeta가 없거나 showAnswer가 true/undefined인 경우에는 렌더링
  if (section.type === 'answer' && normalizedItem.workTypeId !== '06' && chunkMeta && chunkMeta.showAnswer === false) {
    return null;
  }
  if (section.type === 'translation' && chunkMeta.showTranslation === false) {
    return null;
  }
  // 유형#10의 text 섹션은 항상 렌더링 (필터링 방지)
  if (section.type === 'text' && normalizedItem.workTypeId === '10' && section.key?.includes('text-10-test-label')) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 유형#10 텍스트 섹션 렌더링 확인:', {
        key: section.key,
        text: section.text,
        workTypeId: normalizedItem.workTypeId,
        isAnswerMode: options.isAnswerMode
      });
    }
  }

  switch (section.type) {
    case 'title': {
      const showTypeBadge = normalizedItem.workTypeId !== '14'; // 유형#14는 문제 번호만 노출
      return (
        <div key={key} className="print-question-title">
          <span>{section.text}</span>
          {showTypeBadge && (
            <span className="print-question-type-badge">유형#{normalizedItem.workTypeId}</span>
          )}
        </div>
      );
    }
    case 'instruction':
      return section.text ? (
        <div key={key} className="print-instruction">
          {section.text}
        </div>
      ) : null;
    case 'paragraph': {
      const variant = section.meta?.variant;
      if (variant === 'sentence') {
        // 유형#11의 경우 줄간격 증가를 위한 클래스 추가
        const isWork01To11 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'].includes(normalizedItem.workTypeId);
        const sentenceClassName = isWork01To11 
          ? 'print-sentence-item print-sentence-item-work01-11' 
          : 'print-sentence-item';
        return (
          <div key={key} className={sentenceClassName}>
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
        const isWork01To11 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'].includes(normalizedItem.workTypeId);
        const sentenceClassName = isWork01To11 
          ? 'print-sentence-item print-sentence-with-translation print-sentence-item-work01-11' 
          : 'print-sentence-item print-sentence-with-translation';
        return (
          <div key={key} className={sentenceClassName}>
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
        // 유형#06: 주요 문장을 검정색으로 표시
        const text = section.text || '';
        const parts = text.split('주요 문장 :');
        return (
          <div key={key} className="print-paragraph-item print-missing-sentence">
            {parts.length > 1 ? (
              <>
                <span style={{ fontWeight: 700, color: '#000' }}>주요 문장 :</span>
                <span style={{ color: '#000' }}>{parts[1]}</span>
              </>
            ) : (
              text
            )}
          </div>
        );
      }
      if (variant === 'numbered-passage') {
        // 유형#06: 영어본문 컨테이너로 표시 (print-passage 클래스 사용)
        const isWork01To11 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'].includes(normalizedItem.workTypeId);
        const passageClassName = isWork01To11 
          ? 'print-passage print-passage-work01-11' 
          : 'print-passage';
        return (
          <div key={key} className={passageClassName} style={{ marginTop: '0.4cm' }}>
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
      // 유형#01-11과 #13, 14의 경우 줄간격 증가를 위한 클래스 추가
      const isWork01To11 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'].includes(normalizedItem.workTypeId);
      const isWork13Or14 = normalizedItem.workTypeId === '13' || normalizedItem.workTypeId === '14';
      let paragraphClassName = 'print-paragraph-item';
      if (isWork01To11) {
        paragraphClassName += ' print-paragraph-item-work01-11';
      } else if (isWork13Or14) {
        paragraphClassName += ' print-paragraph-item-work13-14';
      }
      return (
        <div key={key} className={paragraphClassName}>
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
      // 유형#06의 work06-info variant는 특별한 컨테이너로 렌더링 (텍스트가 없어도 컨테이너는 표시)
      if (normalizedItem.workTypeId === '06' && section.meta?.variant === 'work06-info') {
        if (process.env.NODE_ENV === 'development') {
          console.log('🎨 유형#06 정보 컨테이너 렌더링:', {
            key,
            text: section.text,
            className: 'print-work06-info-container'
          });
        }
        return (
          <div key={key} className="print-work06-info-container">
            {section.text || '\u00A0'} {/* 빈 텍스트일 때도 공간 확보를 위해 non-breaking space 사용 */}
          </div>
        );
      }
      // 유형#09 인쇄(정답) 모드: 텍스트 블록 렌더링
      if (normalizedItem.workTypeId === '09' && 
          section.key?.includes('text-09-test-label')) {
        const displayText = section.text || '';
        
        // "어법상 틀린 단어: " 다음에 줄바꿈 처리 및 진하게 표시
        let formattedText: React.ReactNode = displayText;
        if (typeof displayText === 'string' && displayText.startsWith('어법상 틀린 단어:')) {
          const parts = displayText.split('어법상 틀린 단어:');
          if (parts.length === 2 && parts[1].trim()) {
            formattedText = (
              <>
                <strong>어법상 틀린 단어:</strong> {parts[1].trim()}
              </>
            );
          }
        }
        
        return (
          <div 
            key={key} 
            className="print-text-block print-text-block-work09" 
            style={{ 
              minHeight: '0.5cm',
              padding: '0.1cm',
              marginTop: '0.01cm',
              marginBottom: '0.02cm',
              fontSize: '0.8rem',
              lineHeight: '1.4',
              color: '#333'
            }}
          >
            {formattedText}
          </div>
        );
      }

      // 유형#10 인쇄(정답) 모드: 텍스트 블록 렌더링 (항상 표시)
      if (normalizedItem.workTypeId === '10' && 
          (section.key?.includes('text-10-test-label') || section.key?.includes('wrong-words'))) {
        console.log('🎨 유형#10 텍스트 블록 렌더링 (항상 로그):', {
          key,
          text: section.text,
          className: 'print-text-block',
          sectionKey: section.key,
          hasText: !!section.text,
          workTypeId: normalizedItem.workTypeId,
          isAnswerMode: options.isAnswerMode,
          sectionType: section.type
        });
        
        // 텍스트가 없어도 컨테이너는 표시 (디버깅을 위해)
        const displayText = section.text || '(텍스트 없음)';
        
        // "어법상 틀린 단어: " 다음에 줄바꿈 처리 및 진하게 표시
        let formattedText: React.ReactNode = displayText;
        if (typeof displayText === 'string' && displayText.startsWith('어법상 틀린 단어:')) {
          const parts = displayText.split('어법상 틀린 단어:');
          if (parts.length === 2 && parts[1].trim()) {
            formattedText = (
              <>
                <strong>어법상 틀린 단어:</strong> <br />
                {parts[1].trim()}
              </>
            );
          }
        }
        
        // 틀린 단어 정보 섹션은 간격을 더 줄임
        const isWrongWordsSection = section.key?.includes('wrong-words');
        const compactSpacing = section.meta?.compactSpacing || isWrongWordsSection;
        
        // 선택지 다음에 오는 텍스트 블록은 여백을 80% 줄임 (0.05cm → 0.01cm)
        const marginTopValue = compactSpacing ? '0.01cm' : '0.02cm'; // 80% 감소
        
        return (
          <div 
            key={key} 
            className="print-text-block print-text-block-work10" 
            style={{ 
              minHeight: '0.5cm',
              padding: '0.1cm',
              marginTop: marginTopValue, // 선택지 다음 텍스트 블록 여백 80% 감소
              marginBottom: '0.02cm', // 80% 감소: 0.1cm → 0.02cm (번역 섹션과의 간격)
              display: 'block',
              visibility: 'visible',
              opacity: 1,
              background: '#ffffff',
              position: 'relative',
              zIndex: 10,
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {formattedText}
          </div>
        );
      }
      // 일반 text 섹션 렌더링 (유형#10의 틀린 단어 정보 포함)
      if (normalizedItem.workTypeId === '10' && section.key?.includes('wrong-words')) {
        // 틀린 단어 정보 섹션은 간격을 더 줄임 (선택지 다음이므로 80% 감소)
        const compactSpacing = section.meta?.compactSpacing !== false;
        return section.text ? (
          <div 
            key={key} 
            className="print-text-block print-text-block-work10"
            style={{
              marginTop: compactSpacing ? '0.01cm' : '0.02cm', // 80% 감소 (0.05cm → 0.01cm)
              marginBottom: '0.02cm', // 80% 감소: 0.1cm → 0.02cm (번역 섹션과의 간격)
              padding: '0.1cm'
            }}
          >
            {section.text}
          </div>
        ) : null;
      }
      
      return section.text ? (
        <div key={key} className="print-text-block">
          {section.text}
        </div>
      ) : null;
    case 'html':
      // 고정단락박스인 경우 특별 처리 (유형#01) - 패키지#03과 동일하게 처리
      if (section.key === 'fixed-paragraph-01') {
        return section.html ? (
          <div
            key={key}
            style={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              marginLeft: '0',
              marginRight: '0',
              paddingLeft: '0',
              paddingRight: '0'
            }}
            dangerouslySetInnerHTML={{ __html: section.html }}
          />
        ) : null;
      }
      
      // 유형#02의 경우 영어 본문이므로 print-passage 클래스 사용
      const isWork02 = normalizedItem.workTypeId === '02';
      const isWork01To11 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'].includes(normalizedItem.workTypeId);
      const isWork13Or14 = normalizedItem.workTypeId === '13' || normalizedItem.workTypeId === '14';
      let htmlClassName = isWork02 ? 'print-passage' : 'print-html-block';
      // 유형#01-11의 경우 줄간격 증가를 위한 클래스 추가
      if (isWork01To11) {
        if (isWork02) {
          htmlClassName += ' print-passage-work01-11';
        } else {
          htmlClassName += ' print-html-block-work01-11';
        }
      } else if (isWork13Or14) {
        // 유형#13, 14의 경우 줄간격 증가를 위한 클래스 추가
        htmlClassName += ' print-html-block-work13-14';
      }
      
      // 유형#10 디버깅: HTML 내용 확인
      if (normalizedItem.workTypeId === '10') {
        console.log('🎨 유형#10 HTML 렌더링:', {
          key: section.key,
          htmlLength: section.html?.length || 0,
          htmlPreview: section.html?.substring(0, 300) || '없음',
          hasWordIdx: section.html?.includes('word-idx') || false,
          hasUnderline: section.html?.includes('<u>') || false,
          className: htmlClassName
        });
      }
      
      return section.html ? (
        <div
          key={key}
          className={htmlClassName}
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
                <div className="print-option-text">
                {displayLabel && <span>{displayLabel} </span>}
                {option.text}
                {isAnswerMode && option.isCorrect && showAnswerMarkTypes.includes(normalizedItem.workTypeId) && (
                  <span className="print-answer-mark"> (정답)</span>
                )}
                {isAnswerMode && option.isCorrect && !showAnswerMarkTypes.includes(normalizedItem.workTypeId) && (
                  <span className="print-answer-mark" data-answer-index={optionIndex}></span>
                )}
                </div>
                {isAnswerMode && option.translation && (
                  <div className="print-option-translation">{option.translation}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : null;
    case 'table':
      // 유형#02의 경우 컨테이너 div 없이 table을 직접 반환 (단에 직접 배치)
      return section.rows && section.rows.length > 0 ? (
        <table key={key} className="print-replacements-table">
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
      ) : null;
    case 'answer':
      // 디버깅: 유형#06의 정답 섹션 렌더링 확인 (항상 로그 출력)
      if (normalizedItem.workTypeId === '06') {
        console.log('🔍 유형#06 정답 섹션 렌더링 시도:', {
          hasItems: !!section.items,
          itemsLength: section.items?.length,
          items: section.items,
          key,
          chunkMeta,
          showAnswer: chunkMeta?.showAnswer,
          workTypeId: normalizedItem.workTypeId,
          sectionType: section.type,
          willRender: !(section.type === 'answer' && normalizedItem.workTypeId !== '06' && chunkMeta && chunkMeta.showAnswer === false)
        });
      }
      const shouldRenderAnswer = section.items && section.items.length > 0 && 
        !(section.type === 'answer' && normalizedItem.workTypeId !== '06' && chunkMeta && chunkMeta.showAnswer === false);
      
      if (!shouldRenderAnswer && normalizedItem.workTypeId === '06') {
        console.warn('⚠️ 유형#06 정답 섹션이 렌더링되지 않음:', {
          hasItems: !!section.items,
          itemsLength: section.items?.length,
          chunkMetaShowAnswer: chunkMeta?.showAnswer
        });
      }
      
      if (!shouldRenderAnswer || !section.items || section.items.length === 0) {
        return null;
      }
      
      // 이 시점에서 section.items는 확실히 존재하고 길이가 0보다 큼
      const items = section.items;
      return (
        <div key={key} className="print-answer-section">
          {/* items의 첫 번째 항목이 이미 "정답:" 또는 "정답 : "으로 시작하는 경우 라벨을 표시하지 않음 */}
          {items[0] && !items[0].toString().trim().startsWith('정답') && (
            <div className="print-answer-label">
              {section.meta?.description || '정답'}
            </div>
          )}
          <div className="print-answer-content">
            {items.map((item, itemIndex) => (
              <div key={`${key}-answer-${itemIndex}`}>{item}</div>
            ))}
          </div>
        </div>
      );
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
        <div 
          key={key} 
          className={`print-translation-section ${section.key === 'translation-last-item' ? 'print-translation-last' : ''}`}
        >
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

  // 유형#10 디버깅: 섹션 확인 (항상 로그)
  if (normalizedItem.workTypeId === '10') {
    const textSections = normalizedItem.sections.filter(s => s.type === 'text');
    console.log('🧾 유형#10 카드 렌더링 (항상 로그):', {
      workTypeId: normalizedItem.workTypeId,
      totalSections: normalizedItem.sections.length,
      sectionTypes: normalizedItem.sections.map((section) => section.type),
      sectionKeys: normalizedItem.sections.map((section) => section.key),
      textSectionsCount: textSections.length,
      textSectionsKeys: textSections.map(s => s.key),
      textSections: textSections,
      chunkMeta: normalizedItem.chunkMeta,
      isAnswerMode: options.isAnswerMode
    });
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
      data-work-type={normalizedItem.workTypeId}
    >
      {normalizedItem.sections.map((section, sectionIndex) =>
        renderSectionNode(normalizedItem, section, sectionIndex, keyPrefix, options)
      )}
    </div>
  );
};

