import React from 'react';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';

interface Work11DynamicPrintPagesProps {
  sentences: string[];
  translations: string[];
  includeAnswer: boolean;
  printMode: 'no-answer' | 'with-answer';
  customHeader?: React.ReactNode;
}

const Work11DynamicPrintPages: React.FC<Work11DynamicPrintPagesProps> = ({
  sentences,
  translations,
  includeAnswer,
  printMode,
  customHeader
}) => {
  console.log('🖨️ Work11DynamicPrintPages 렌더링:', {
    sentencesCount: sentences.length,
    translationsCount: translations.length,
    includeAnswer,
    printMode
  });

  // 간단한 페이지네이션 로직
  const itemsPerPage = 5;
  const totalPages = Math.ceil(sentences.length / itemsPerPage);

  const renderContainer = (sentence: string, translation: string, index: number, pageNumber: number) => {
    const containerStyle: React.CSSProperties = {
      marginBottom: '0.5rem',
      padding: '0.3rem 1rem 0.2rem 1rem',
      borderRadius: '8px',
      pageBreakInside: 'avoid',
      breakInside: 'avoid',
      display: 'flex',
      flexDirection: 'column'
    };

    if (includeAnswer) {
      containerStyle.backgroundColor = '#F1F8E9';
      containerStyle.border = '1px solid #e3f2fd';
    } else {
      containerStyle.backgroundColor = '#FFF3CD';
      containerStyle.border = '1px solid #e3f2fd';
    }

    return (
      <div 
        key={`page-${pageNumber}-container-${index}`}
        className={includeAnswer ? "work11-print-answer-sentence" : "work11-print-problem-sentence"}
        style={containerStyle}
      >
        <div style={{
          fontSize: '1rem',
          lineHeight: '1.2',
          color: '#000',
          marginBottom: '0.2rem'
        }}>
          <span style={{fontWeight: 'bold', color: '#333'}}>
            {index + 1}. 
          </span>
          {sentence}
        </div>
        
        {includeAnswer ? (
          <div style={{
            fontSize: '0.8rem',
            lineHeight: '1.2',
            color: '#1976d2',
            fontWeight: '500',
            marginTop: '0.1rem',
            paddingBottom: '0.2rem'
          }}>
            {translation}
          </div>
        ) : (
          <div style={{
            height: '24px',
            marginTop: '0.3rem'
          }}>
          </div>
        )}
      </div>
    );
  };

  const renderPage = (pageIndex: number) => {
    const startIndex = pageIndex * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, sentences.length);
    const pageSentences = sentences.slice(startIndex, endIndex);
    const pageTranslations = translations.slice(startIndex, endIndex);

    return (
      <div 
        key={`dynamic-page-${pageIndex + 1}`}
        className="a4-page-template work11-dynamic-page-template"
        style={{
          width: '21cm',
          height: '29.7cm',
          margin: '0',
          padding: '0',
          background: 'white',
          boxSizing: 'border-box',
          pageBreakInside: 'avoid',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          border: 'none'
        }}
      >
        <div className="a4-page-header" style={{
          width: '100%',
          height: '1.5cm',
          flexShrink: 0,
          padding: '0.5cm 0.3cm 0 0.3cm',
          boxSizing: 'border-box'
        }}>
          {customHeader || <PrintHeaderWork01 />}
        </div>

        <div className="a4-page-content" style={{
          width: '100%',
          flex: 1,
          padding: '0 1cm 1cm 1cm',
          boxSizing: 'border-box',
          overflow: 'visible'
        }}>
          <div className="problem-instruction" style={{
            fontWeight: 800,
            fontSize: '1rem',
            background: '#222',
            color: '#fff',
            padding: '0.7rem 0.5rem',
            borderRadius: '8px',
            marginBottom: '1.2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%'
          }}>
            <span>
              {pageIndex === 0 
                ? "다음 본문의 각 문장을 한국어로 해석하세요."
                : `번역할 문장들 (계속) - ${pageIndex + 1}페이지`
              }
            </span>
            <span style={{
              fontSize: '0.9rem',
              fontWeight: '700',
              color: '#FFD700'
            }}>
              유형#11
            </span>
          </div>
          
          <div style={{ marginTop: '0.9rem' }}>
            {pageSentences.map((sentence, index) => 
              renderContainer(sentence, pageTranslations[index], startIndex + index, pageIndex + 1)
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="work11-dynamic-print-container">
      {Array.from({ length: totalPages }, (_, index) => 
        renderPage(index)
      )}
    </div>
  );
};

export default Work11DynamicPrintPages;
