import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import { translateToKorean } from '../../services/common';
import PrintFormatPackage02 from '../work/Package_02_TwoStepQuiz/PrintFormatPackage02';
import SimplePrintFormatPackage02 from '../work/Package_02_TwoStepQuiz/SimplePrintFormatPackage02';
import PrintFormatPackage03 from '../work/Package_03_ParagraphOrder/PrintFormatPackage03';
import PrintFormatPackage01 from '../work/Package_01_MultiQuizGenerater/PrintFormatPackage01';
import PrintFormatWork01New from '../work/Work_01_ArticleOrder/PrintFormatWork01New';
import PrintFormatWork02New from '../work/Work_02_ReadingComprehension/PrintFormatWork02New';
import PrintFormatWork03New from '../work/Work_03_VocabularyWord/PrintFormatWork03New';
import PrintFormatWork04New from '../work/Work_04_BlankPhraseInference/PrintFormatWork04New';
import PrintFormatWork05New from '../work/Work_05_BlankSentenceInference/PrintFormatWork05New';
import PrintFormatWork06New from '../work/Work_06_SentencePosition/PrintFormatWork06New';
import PrintFormatWork07New from '../work/Work_07_MainIdeaInference/PrintFormatWork07New';
import PrintFormatWork08New from '../work/Work_08_TitleInference/PrintFormatWork08New';
import PrintFormatWork09New from '../work/Work_09_GrammarError/PrintFormatWork09New';
import PrintFormatWork10New from '../work/Work_10_MultiGrammarError/PrintFormatWork10New';
import PrintFormatWork13New from '../work/Work_13_BlankFillWord/PrintFormatWork13New';
import HistoryPrintWork12 from '../work/Work_12_WordStudy/HistoryPrintWork12';
import SimpleQuizDisplay from './SimpleQuizDisplay';
import FileFormatSelector from '../work/shared/FileFormatSelector';
import { FileFormat, generateAndUploadFile } from '../../services/pdfService';
import { useAuth } from '../../contexts/AuthContext';
import './QuizDisplayPage.css';

const QuizDisplayPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const [packageQuiz, setPackageQuiz] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [packageType, setPackageType] = useState(''); // P01, P02, P03 등
  const [loading, setLoading] = useState(true);
  const [fileFormat, setFileFormat] = useState<FileFormat>('pdf');

  useEffect(() => {
    // URL 파라미터나 state에서 데이터 가져오기
    const state = location.state as any;
    
    console.log('📋 QuizDisplayPage 데이터 로딩:', {
      hasState: !!state,
      hasQuizData: !!(state && state.quizData),
      quizData: state?.quizData,
      generatedData: state?.quizData?.generatedData,
      quizzes: state?.quizData?.generatedData?.quizzes
    });
    
    if (state && state.quizData) {
      const quizzes = state.quizData.generatedData?.quizzes || [];
      console.log('📦 패키지 퀴즈 데이터:', {
        quizzesLength: quizzes.length,
        quizzes: quizzes,
        workTypeId: state.quizData.workTypeId
      });
      
      // 첫 번째 퀴즈 아이템의 구조 확인
      if (quizzes.length > 0) {
        console.log('🔍 첫 번째 퀴즈 아이템 구조:', {
          firstQuiz: quizzes[0],
          hasQuiz: !!quizzes[0].quiz,
          workTypeId: quizzes[0].workTypeId,
          keys: Object.keys(quizzes[0])
        });
      }
      
      setPackageQuiz(quizzes);
      setInputText(state.quizData.inputText || '');
      setPackageType(state.quizData.workTypeId || ''); // P01, P02, P03 등
      setLoading(false);
    } else {
      // 데이터가 없으면 목록으로 돌아가기
      navigate('/quiz-list');
    }
  }, [location, navigate]);

  // 인쇄(문제) 핸들러
  const handlePrintProblem = async () => {
    console.log('🖨️ 인쇄(문제) 시작 - 데이터 확인:', {
      packageQuiz: packageQuiz,
      packageQuizLength: packageQuiz?.length,
      packageType: packageType,
      inputText: inputText,
      fileFormat: fileFormat
    });
    
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }
    
    // 패키지/단일 유형에 따른 페이지 스타일 동적 추가
    const style = document.createElement('style');
    style.id = 'print-style-package';
    const isSingleWork = ((!
      packageType || !packageType.startsWith('P')
    ) && Array.isArray(packageQuiz) && packageQuiz.length === 1);
    
    // 유형#01은 가로, 단일 유형이면 세로, 패키지#01도 세로
    // 유형#06, #07은 가로로 표시
    const first = packageQuiz[0] || {};
    const typeId = first.workTypeId;
    const isType01Single = isSingleWork && typeId === '01';
    const isLandscapeType = isSingleWork && (typeId === '01' || typeId === '02' || typeId === '03' || typeId === '04' || typeId === '05' || typeId === '06' || typeId === '07' || typeId === '08' || typeId === '09' || typeId === '10');
    if (packageType === 'P01' || (isSingleWork && !isLandscapeType)) {
      // Package#01 또는 단일 유형(가로 유형 제외): A4 세로
      style.textContent = `
        @page {
          margin: 0;
          size: A4 portrait;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
        }
      `;
    } else {
      // Package#02, #03, 유형#01, #02, #03, #04, #05, #06, #07, #08, #13: A4 가로
      // 유형#07, #08, #09, #10, #13는 PrintFormatWork07New, PrintFormatWork08New, PrintFormatWork09New, PrintFormatWork10New, PrintFormatWork13New 컴포넌트가 자체 스타일을 가지고 있으므로 간단한 스타일만 적용
      if (isSingleWork && (typeId === '07' || typeId === '08' || typeId === '09' || typeId === '10' || typeId === '13')) {
        // 유형#07, #08: 원래 인쇄 방식과 동일하게 간단한 스타일만 적용
        style.textContent = `
          @page {
            size: A4 landscape !important;
            margin: 0 !important;
          }
          @media print {
            html, body {
              width: 29.7cm !important;
              height: 21cm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #root {
              display: none !important;
            }
          }
        `;
      } else {
        // 다른 유형들: 상세한 스타일 적용
        style.textContent = `
          @page {
            margin: 0;
            size: A4 landscape;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .print-container {
              display: block !important;
              width: 29.7cm;
              min-height: 21cm;
              background: white;
              padding: 0;
              box-sizing: border-box;
            }
            .print-container .a4-landscape-page-template {
              display: block !important;
              width: 29.7cm !important;
              height: 21cm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              box-sizing: border-box !important;
            }
            .print-container .a4-landscape-page-template:not(:last-child):not(.last-page) {
              page-break-after: always !important;
              break-after: page !important;
            }
            .print-container .a4-landscape-page-template:last-child,
            .print-container .a4-landscape-page-template.last-page {
              page-break-after: avoid !important;
              break-after: avoid !important;
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
            .print-container .a4-landscape-page-content {
              display: block !important;
              width: 100% !important;
              height: 100% !important;
            }
            .print-container .print-two-column-container {
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 0.6cm !important;
              width: 100% !important;
              justify-content: space-between !important;
              height: 100% !important;
              flex-direction: row !important;
              position: relative !important;
            }
            .print-container .print-two-column-container::before {
              content: '' !important;
              position: absolute !important;
              top: 0 !important;
              left: 50% !important;
              width: 2px !important;
              height: 100% !important;
              background-color: #ddd !important;
              transform: translateX(-50%) !important;
              z-index: 1 !important;
            }
            .print-container .print-column {
              width: calc(50% - 0.3cm) !important;
              max-width: calc(50% - 0.3cm) !important;
              min-width: calc(50% - 0.3cm) !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              -webkit-column-break-inside: avoid !important;
              margin-bottom: 0.3cm !important;
              border: none !important;
              padding: 0.5cm !important;
              box-sizing: border-box !important;
              display: block !important;
              float: left !important;
            }
            .print-container .print-column:nth-child(odd) {
              clear: left !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `;
      }
      document.head.appendChild(style);
    }
    
    // 인쇄용 컨테이너 생성
    const printContainer = document.createElement('div');
    // first, typeId, isType01Single은 위에서 이미 선언됨
    const containerId = packageType === 'P01' || (isSingleWork && !isType01Single && typeId !== '02' && typeId !== '03' && typeId !== '04' && typeId !== '05' && typeId !== '06' && typeId !== '07' && typeId !== '08')
      ? 'print-root-package01' 
      : packageType === 'P02' 
        ? 'print-root-package02' 
        : packageType === 'P03'
          ? 'print-root-package03'
          : packageType === '01' || isType01Single
            ? 'print-root-work01-new'
            : packageType === '02' || (isSingleWork && typeId === '02')
              ? 'print-root-work02-new'
              : packageType === '03' || (isSingleWork && typeId === '03')
                ? 'print-root-work03-new'
                : packageType === '04' || (isSingleWork && typeId === '04')
                  ? 'print-root-work04-new'
                  : packageType === '05' || (isSingleWork && typeId === '05')
                    ? 'print-root-work05-new'
                    : packageType === '06' || (isSingleWork && typeId === '06')
                      ? 'print-root-work06-new'
                      : packageType === '07' || (isSingleWork && typeId === '07')
                        ? 'print-root-work07-new'
                        : packageType === '08' || (isSingleWork && typeId === '08')
                          ? 'print-root-work08-new'
                          : packageType === '09' || (isSingleWork && typeId === '09')
                            ? 'print-root-work09-new'
                        : packageType === '10' || (isSingleWork && typeId === '10')
                            ? 'print-root-work10-new'
                            : packageType === '13' || (isSingleWork && typeId === '13')
                              ? 'print-root-work13-new'
            : 'print-root-package02';
    printContainer.id = containerId;
    document.body.appendChild(printContainer);

    // 기존 화면 숨기기
    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    // React 18 방식으로 렌더링 (패키지/단일 유형에 따라)
    const root = ReactDOM.createRoot(printContainer);
    if (isSingleWork) {
      // 단일 유형: 유형에 따라 최적 포맷 선택
      // first와 typeId는 위에서 이미 선언됨
      // 번역 텍스트 계산 (전역 전달용 - 포맷 컴포넌트에서 우선 사용)
      const d: any = first.quiz || first.data || first[`work${first.workTypeId?.toString().padStart(2,'0')}Data`] || {};
      const globalTranslatedText =
        first.translatedText ||
        d.translation || d.koreanTranslation || d.korean || d.korTranslation || d.koText || d.korean_text || '';
      // 유형별 포맷 선택
      if (typeId === '12') {
        const data: any = first.work12Data || first.data?.work12Data || first.data || first;
        root.render(<HistoryPrintWork12 data={data} />);
      } else if (typeId === '01') {
        // 유형#01은 PrintFormatWork01New 사용
        const rawQuizzes = packageQuiz.map((item: any) => item.quiz || item);
        root.render(<PrintFormatWork01New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else if (typeId === '02') {
        // 유형#02는 PrintFormatWork02New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work02Data = item.work02Data || item.quiz || item.data?.work02Data || item.data || item;
          return {
            id: item.id || work02Data.id,
            title: work02Data.title || '독해 문제',
            originalText: work02Data.originalText || '',
            modifiedText: work02Data.modifiedText || '',
            replacements: work02Data.replacements || [],
            translation: work02Data.translation || ''
          };
        });
        root.render(<PrintFormatWork02New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else if (typeId === '03') {
        // 유형#03은 PrintFormatWork03New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work03Data = item.work03Data || item.quiz || item.data?.work03Data || item.data || item;
          return {
            id: item.id || work03Data.id,
            blankedText: work03Data.blankedText || '',
            options: work03Data.options || [],
            answerIndex: work03Data.answerIndex || 0,
            translation: work03Data.translation || ''
          };
        });
        root.render(<PrintFormatWork03New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else if (typeId === '04') {
        // 유형#04는 PrintFormatWork04New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work04Data = item.work04Data || item.quiz || item.data?.work04Data || item.data || item;
          return {
            id: item.id || work04Data.id,
            blankedText: work04Data.blankedText || '',
            options: work04Data.options || [],
            answerIndex: work04Data.answerIndex || 0,
            translation: work04Data.translation || ''
          };
        });
        root.render(<PrintFormatWork04New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else if (typeId === '05') {
        // 유형#05는 PrintFormatWork05New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work05Data = item.work05Data || item.quiz || item.data?.work05Data || item.data || item;
          return {
            id: item.id || work05Data.id,
            blankedText: work05Data.blankedText || '',
            options: work05Data.options || [],
            answerIndex: work05Data.answerIndex || 0,
            optionTranslations: work05Data.optionTranslations || [],
            translation: work05Data.translation || ''
          };
        });
        root.render(<PrintFormatWork05New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else if (typeId === '06') {
        // 유형#06은 PrintFormatWork06New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work06Data = item.work06Data || item.quiz || item.data?.work06Data || item.data || item;
          return {
            id: item.id || work06Data.id,
            missingSentence: work06Data.missingSentence || '',
            numberedPassage: work06Data.numberedPassage || '',
            answerIndex: work06Data.answerIndex !== undefined ? work06Data.answerIndex : 0,
            translation: work06Data.translation || ''
          };
        });
        root.render(<PrintFormatWork06New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else if (typeId === '07') {
        // 유형#07은 PrintFormatWork07New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work07Data = item.work07Data || item.quiz || item.data?.work07Data || item.data || item;
          return {
            id: item.id || work07Data.id,
            passage: work07Data.passage || '',
            options: work07Data.options || [],
            answerIndex: work07Data.answerIndex !== undefined ? work07Data.answerIndex : 0,
            translation: work07Data.translation || '',
            answerTranslation: work07Data.answerTranslation || '',
            optionTranslations: work07Data.optionTranslations || []
          };
        });
        root.render(<PrintFormatWork07New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else if (typeId === '08') {
        // 유형#08은 PrintFormatWork08New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work08Data = item.work08Data || item.quiz || item.data?.work08Data || item.data || item;
          // 다양한 데이터 소스에서 필드 추출 (호환성 강화)
          const answerIndex = work08Data.answerIndex !== undefined 
            ? Number(work08Data.answerIndex) 
            : (work08Data.answer !== undefined ? Number(work08Data.answer) : 0);
            
          const translation = work08Data.translation || 
                              work08Data.translatedText || 
                              work08Data.interpret || 
                              work08Data.koreanTranslation || 
                              work08Data.korean || 
                              work08Data.koText || '';

          return {
            id: item.id || work08Data.id,
            passage: work08Data.passage || '',
            options: work08Data.options || [],
            answerIndex: isNaN(answerIndex) ? 0 : answerIndex,
            translation: translation,
            answerTranslation: work08Data.answerTranslation || '',
            optionTranslations: work08Data.optionTranslations || []
          };
        });
        root.render(<PrintFormatWork08New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else if (typeId === '09') {
        // 유형#09는 PrintFormatWork09New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work09Data = item.work09Data || item.quiz || item.data?.work09Data || item.data || item;
          // 다양한 데이터 소스에서 필드 추출 (호환성 강화)
          const answerIndex = work09Data.answerIndex !== undefined 
            ? Number(work09Data.answerIndex) 
            : (work09Data.answer !== undefined ? Number(work09Data.answer) : 0);
            
          const translation = work09Data.translation || 
                              work09Data.translatedText || 
                              work09Data.interpret || 
                              work09Data.koreanTranslation || 
                              work09Data.korean || 
                              work09Data.koText || '';

          return {
            id: item.id || work09Data.id,
            passage: work09Data.passage || '',
            options: work09Data.options || [],
            answerIndex: isNaN(answerIndex) ? 0 : answerIndex,
            translation: translation,
            original: work09Data.original || ''
          };
        });
        root.render(<PrintFormatWork09New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else if (typeId === '10') {
        // 유형#10는 PrintFormatWork10New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work10Data = item.work10Data || item.quiz || item.data?.work10Data || item.data || item;
          // 다양한 데이터 소스에서 필드 추출 (호환성 강화)
          const answerIndex = work10Data.answerIndex !== undefined 
            ? Number(work10Data.answerIndex) 
            : (work10Data.answer !== undefined ? Number(work10Data.answer) : 0);
            
          const translation = work10Data.translation || 
                              work10Data.translatedText || 
                              work10Data.interpret || 
                              work10Data.koreanTranslation || 
                              work10Data.korean || 
                              work10Data.koText || '';

          return {
            id: item.id || work10Data.id,
            passage: work10Data.passage || '',
            numberedPassage: work10Data.numberedPassage || '',
            options: work10Data.options || [],
            answerIndex: isNaN(answerIndex) ? 0 : answerIndex,
            translation: translation,
            originalWords: work10Data.originalWords || [],
            transformedWords: work10Data.transformedWords || [],
            wrongIndexes: work10Data.wrongIndexes || []
          };
        });
        root.render(<PrintFormatWork10New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else if (typeId === '13') {
        // 유형#13는 PrintFormatWork13New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work13Data = item.work13Data || item.quiz || item.data?.work13Data || item.data || item;
          
          return {
            id: item.id || work13Data.id,
            blankedText: work13Data.blankedText || '',
            correctAnswers: work13Data.correctAnswers || [],
            translation: work13Data.translation || ''
          };
        });
        root.render(<PrintFormatWork13New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else {
        root.render(<PrintFormatPackage01 packageQuiz={packageQuiz} translatedText={globalTranslatedText} />);
      }
    } else if (packageType === 'P01') {
      root.render(<PrintFormatPackage01 packageQuiz={packageQuiz} />);
    } else if (packageType === 'P02') {
      root.render(<PrintFormatPackage02 packageQuiz={packageQuiz} />);
    } else if (packageType === 'P03') {
      root.render(<PrintFormatPackage03 packageQuiz={packageQuiz} />);
    } else if (packageType === '01') {
      const rawQuizzes = packageQuiz.map((item: any) => item.quiz || item);
      root.render(<PrintFormatWork01New quizzes={rawQuizzes} isAnswerMode={false} />);
    } else if (packageType === '02') {
      // 유형#02는 PrintFormatWork02New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work02Data = item.work02Data || item.quiz || item.data?.work02Data || item.data || item;
        return {
          id: item.id || work02Data.id,
          title: work02Data.title || '독해 문제',
          originalText: work02Data.originalText || '',
          modifiedText: work02Data.modifiedText || '',
          replacements: work02Data.replacements || [],
          translation: work02Data.translation || ''
        };
      });
      root.render(<PrintFormatWork02New quizzes={rawQuizzes} isAnswerMode={false} />);
    } else if (packageType === '03') {
      // 유형#03은 PrintFormatWork03New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work03Data = item.work03Data || item.quiz || item.data?.work03Data || item.data || item;
        return {
          id: item.id || work03Data.id,
          blankedText: work03Data.blankedText || '',
          options: work03Data.options || [],
          answerIndex: work03Data.answerIndex || 0,
          translation: work03Data.translation || ''
        };
      });
      root.render(<PrintFormatWork03New quizzes={rawQuizzes} isAnswerMode={false} />);
    } else if (packageType === '04') {
      // 유형#04는 PrintFormatWork04New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work04Data = item.work04Data || item.quiz || item.data?.work04Data || item.data || item;
        return {
          id: item.id || work04Data.id,
          blankedText: work04Data.blankedText || '',
          options: work04Data.options || [],
          answerIndex: work04Data.answerIndex || 0,
          translation: work04Data.translation || ''
        };
      });
      root.render(<PrintFormatWork04New quizzes={rawQuizzes} isAnswerMode={false} />);
    } else if (packageType === '05') {
      // 유형#05는 PrintFormatWork05New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work05Data = item.work05Data || item.quiz || item.data?.work05Data || item.data || item;
        return {
          id: item.id || work05Data.id,
          blankedText: work05Data.blankedText || '',
          options: work05Data.options || [],
          answerIndex: work05Data.answerIndex || 0,
          optionTranslations: work05Data.optionTranslations || [],
          translation: work05Data.translation || ''
        };
      });
      root.render(<PrintFormatWork05New quizzes={rawQuizzes} isAnswerMode={false} />);
    } else if (packageType === '06') {
      // 유형#06은 PrintFormatWork06New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work06Data = item.work06Data || item.quiz || item.data?.work06Data || item.data || item;
        return {
          id: item.id || work06Data.id,
          missingSentence: work06Data.missingSentence || '',
          numberedPassage: work06Data.numberedPassage || '',
          answerIndex: work06Data.answerIndex !== undefined ? work06Data.answerIndex : 0,
          translation: work06Data.translation || ''
        };
      });
      root.render(<PrintFormatWork06New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else if (packageType === '07') {
      // 유형#07은 PrintFormatWork07New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work07Data = item.work07Data || item.quiz || item.data?.work07Data || item.data || item;
        return {
          id: item.id || work07Data.id,
          passage: work07Data.passage || '',
          options: work07Data.options || [],
          answerIndex: work07Data.answerIndex !== undefined ? work07Data.answerIndex : 0,
          translation: work07Data.translation || '',
          answerTranslation: work07Data.answerTranslation || '',
          optionTranslations: work07Data.optionTranslations || []
        };
      });
      root.render(<PrintFormatWork07New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else if (packageType === '08') {
      // 유형#08은 PrintFormatWork08New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work08Data = item.work08Data || item.quiz || item.data?.work08Data || item.data || item;
        // 다양한 데이터 소스에서 필드 추출 (호환성 강화)
        const answerIndex = work08Data.answerIndex !== undefined 
          ? Number(work08Data.answerIndex) 
          : (work08Data.answer !== undefined ? Number(work08Data.answer) : 0);
          
        const translation = work08Data.translation || 
                            work08Data.translatedText || 
                            work08Data.interpret || 
                            work08Data.koreanTranslation || 
                            work08Data.korean || 
                            work08Data.koText || '';

        return {
          id: item.id || work08Data.id,
          passage: work08Data.passage || '',
          options: work08Data.options || [],
          answerIndex: isNaN(answerIndex) ? 0 : answerIndex,
          translation: translation,
          answerTranslation: work08Data.answerTranslation || '',
          optionTranslations: work08Data.optionTranslations || []
        };
      });
      root.render(<PrintFormatWork08New quizzes={rawQuizzes} isAnswerMode={false} />);
    } else if (packageType === '09') {
      // 유형#09는 PrintFormatWork09New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work09Data = item.work09Data || item.quiz || item.data?.work09Data || item.data || item;
        // 다양한 데이터 소스에서 필드 추출 (호환성 강화)
        const answerIndex = work09Data.answerIndex !== undefined 
          ? Number(work09Data.answerIndex) 
          : (work09Data.answer !== undefined ? Number(work09Data.answer) : 0);
          
        const translation = work09Data.translation || 
                            work09Data.translatedText || 
                            work09Data.interpret || 
                            work09Data.koreanTranslation || 
                            work09Data.korean || 
                            work09Data.koText || '';

        return {
          id: item.id || work09Data.id,
          passage: work09Data.passage || '',
          options: work09Data.options || [],
          answerIndex: isNaN(answerIndex) ? 0 : answerIndex,
          translation: translation,
          original: work09Data.original || ''
        };
      });
      root.render(<PrintFormatWork09New quizzes={rawQuizzes} isAnswerMode={false} />);
    } else if (packageType === '10') {
      // 유형#10는 PrintFormatWork10New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work10Data = item.work10Data || item.quiz || item.data?.work10Data || item.data || item;
        // 다양한 데이터 소스에서 필드 추출 (호환성 강화)
        const answerIndex = work10Data.answerIndex !== undefined 
          ? Number(work10Data.answerIndex) 
          : (work10Data.answer !== undefined ? Number(work10Data.answer) : 0);
          
        const translation = work10Data.translation || 
                            work10Data.translatedText || 
                            work10Data.interpret || 
                            work10Data.koreanTranslation || 
                            work10Data.korean || 
                            work10Data.koText || '';

        return {
          id: item.id || work10Data.id,
          passage: work10Data.passage || '',
          numberedPassage: work10Data.numberedPassage || '',
          options: work10Data.options || [],
          answerIndex: isNaN(answerIndex) ? 0 : answerIndex,
          translation: translation,
          originalWords: work10Data.originalWords || [],
          transformedWords: work10Data.transformedWords || [],
          wrongIndexes: work10Data.wrongIndexes || []
        };
      });
      root.render(<PrintFormatWork10New quizzes={rawQuizzes} isAnswerMode={false} />);
    } else if (packageType === '13') {
      // 유형#13는 PrintFormatWork13New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work13Data = item.work13Data || item.quiz || item.data?.work13Data || item.data || item;
        
        return {
          id: item.id || work13Data.id,
          blankedText: work13Data.blankedText || '',
          correctAnswers: work13Data.correctAnswers || [],
          translation: work13Data.translation || ''
        };
      });
      root.render(<PrintFormatWork13New quizzes={rawQuizzes} isAnswerMode={false} />);
    } else {
      root.render(<SimplePrintFormatPackage02 packageQuiz={packageQuiz} />);
    }

    // 유형#07, #08, #09, #10, #13는 원래 인쇄 방식과 동일하게 처리
    if (isSingleWork && (typeId === '07' || typeId === '08' || typeId === '09' || typeId === '10' || typeId === '13')) {
      // 원래 방식: activatePrintContainer 후 바로 인쇄
      const activatePrintContainer = () => {
        const inner = printContainer.querySelector('.print-container, .print-container-answer');
        if (inner) {
          inner.classList.add('pdf-generation-active');
        } else {
          requestAnimationFrame(activatePrintContainer);
        }
      };
      activatePrintContainer();

      setTimeout(() => {
        window.print();
        
        setTimeout(() => {
          root.unmount();
          if (printContainer.parentNode) {
            printContainer.parentNode.removeChild(printContainer);
          }
          if (appRoot) {
            appRoot.style.display = '';
          }
          const styleElement = document.getElementById(
            typeId === '07' ? 'print-style-work07-landscape' : 
            typeId === '08' ? 'print-style-work08-landscape' :
            typeId === '09' ? 'print-style-work09-landscape' :
            typeId === '10' ? 'print-style-work10-landscape' :
            'print-style-work13-landscape'
          );
          if (styleElement) {
            styleElement.remove();
          }
          console.log('✅ 인쇄(문제) 완료');
        }, 100);
      }, 500);
      return; // 유형#07, #08, #09, #10, #13는 여기서 종료
    }

    // 렌더링 완료 후 인쇄 및 파일 생성
    // DOC 저장은 렌더링 시간이 더 필요함 (특히 Work_06)
    const renderDelay = fileFormat === 'doc' 
      ? ((packageType === '06' || (isSingleWork && typeId === '06')) ? 2000 : 1500)
      : ((packageType === '01' || isType01Single) ? 1000 : 500);
    
    setTimeout(async () => {
      // 파일 생성 및 Firebase Storage 업로드
      try {
        // 유형#01, #02, #03의 경우 실제 렌더링된 컨테이너 ID 사용
        let elementId = containerId;
        if (packageType === '01' || isType01Single) {
          elementId = 'print-root-work01-new';
        } else if (packageType === '02' || (isSingleWork && typeId === '02')) {
          elementId = 'print-root-work02-new';
        } else if (packageType === '03' || (isSingleWork && typeId === '03')) {
          elementId = 'print-root-work03-new';
        } else if (packageType === '04' || (isSingleWork && typeId === '04')) {
          elementId = 'print-root-work04-new';
        } else if (packageType === '05' || (isSingleWork && typeId === '05')) {
          elementId = 'print-root-work05-new';
        } else if (packageType === '06' || (isSingleWork && typeId === '06')) {
          elementId = 'print-root-work06-new';
        } else if (packageType === '07' || (isSingleWork && typeId === '07')) {
          elementId = 'print-root-work07-new';
        } else if (packageType === '08' || (isSingleWork && typeId === '08')) {
          elementId = 'print-root-work08-new';
        } else if (packageType === '09' || (isSingleWork && typeId === '09')) {
          elementId = 'print-root-work09-new';
        } else if (packageType === '10' || (isSingleWork && typeId === '10')) {
          elementId = 'print-root-work10-new';
        }
        const element = document.getElementById(elementId);
        if (!element) {
          console.error(`❌ 인쇄 컨테이너를 찾을 수 없습니다: ${elementId}`);
          // 대체 시도: 내부 컨테이너 찾기
          const innerElement = document.querySelector('.work01-new-print, .work02-new-print, .work03-new-print, .work04-new-print, .work04-print, .work05-new-print, .work05-print, .work06-new-print, .work06-print');
          if (innerElement) {
            console.log('✅ 대체 컨테이너 찾음:', innerElement);
          }
          return;
        }
        
        // DOM 요소가 실제로 내용을 가지고 있는지 확인 (특히 DOC 저장 시)
        if (fileFormat === 'doc') {
          const pageElements = element.querySelectorAll('.a4-landscape-page-template, .a4-page-template, .print-page');
          const hasContent = pageElements.length > 0 || (element.textContent && element.textContent.trim().length > 50);
          if (!hasContent) {
            console.error(`❌ 인쇄 컨테이너에 내용이 없습니다: ${elementId}`, {
              pageElementsCount: pageElements.length,
              textContentLength: element.textContent?.trim().length || 0
            });
            // 추가 대기 후 재시도
            setTimeout(async () => {
              const retryElement = document.getElementById(elementId);
              if (retryElement && userData?.uid) {
                const pageElementsRetry = retryElement.querySelectorAll('.a4-landscape-page-template, .a4-page-template, .print-page');
                const hasContentRetry = pageElementsRetry.length > 0 || (retryElement.textContent && retryElement.textContent.trim().length > 50);
                if (hasContentRetry) {
                  console.log('✅ 재시도 성공: 내용이 렌더링되었습니다');
                  // 파일 생성 로직 실행
                } else {
                  console.error('❌ 재시도 실패: 여전히 내용이 없습니다');
                  alert('문서 내용을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
                  return;
                }
              }
            }, 1000);
            return;
          }
          console.log(`✅ 인쇄 컨테이너 확인: ${elementId}, 페이지 수: ${pageElements.length}`);
        }
        
        if (element && userData?.uid) {
          const workTypeName = packageType === 'P01' ? '패키지#01_문제' :
                              packageType === 'P02' ? '패키지#02_문제' :
                              packageType === 'P03' ? '패키지#03_문제' :
                              packageType === '01' ? '유형#01_문제' :
                              packageType === '02' ? '유형#02_문제' :
                              packageType === '03' ? '유형#03_문제' :
                              packageType === '07' ? '유형#07_문제' :
                              packageType === '04' ? '유형#04_문제' :
                              packageType === '05' ? '유형#05_문제' :
                              packageType === '06' ? '유형#06_문제' :
                              packageType === '07' ? '유형#07_문제' :
                              packageType === '08' ? '유형#08_문제' :
                              packageType === '09' ? '유형#09_문제' :
                              packageType === '10' ? '유형#10_문제' :
                              packageType === '13' ? '유형#13_문제' :
                              '문제';
          
          const result = await generateAndUploadFile(
            element as HTMLElement,
            userData.uid,
            `${packageType.toLowerCase() || 'quiz'}_problem_${Date.now()}`,
            workTypeName,
            { 
              isAnswerMode: false, 
              orientation: (packageType === 'P01' || (isSingleWork && !isType01Single && typeId !== '02' && typeId !== '03' && typeId !== '04' && typeId !== '05' && typeId !== '06' && typeId !== '07' && typeId !== '08' && typeId !== '09' && typeId !== '10' && typeId !== '13')) ? 'portrait' : 'landscape',
              fileFormat 
            }
          );
          
          const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
          console.log(`📁 ${workTypeName} ${formatName} 저장 완료:`, result.fileName);
        }
      } catch (error) {
        console.error(`❌ 파일 저장 실패 (${fileFormat}):`, error);
      }

      // PDF인 경우에만 브라우저 인쇄, DOC는 이미 다운로드됨
      if (fileFormat === 'pdf') {
        window.print();
      }

      // 인쇄 후 정리
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(printContainer);
        if (appRoot) {
          appRoot.style.display = 'block';
        }
        const styleElement = document.getElementById('print-style-package');
        if (styleElement) {
          document.head.removeChild(styleElement);
        }
        console.log('✅ 인쇄(문제) 완료');
      }, fileFormat === 'pdf' ? 100 : 500);
    }, (packageType === '01' || isType01Single) ? 1000 : 500); // 유형#01은 렌더링 시간이 더 필요할 수 있음
  };

  // 인쇄(정답) 핸들러
  const handlePrintAnswer = async () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(정답) 시작');
    
    // 패키지/단일 유형에 따른 페이지 스타일 동적 추가
    const style = document.createElement('style');
    style.id = 'print-style-package-answer';
    const isSingleWork = ((!
      packageType || !packageType.startsWith('P')
    ) && Array.isArray(packageQuiz) && packageQuiz.length === 1);
    
    // 유형#01은 가로, 단일 유형이면 세로, 패키지#01도 세로
    // 유형#06, #07, #08, #09는 가로로 표시
    const first = packageQuiz[0] || {} as any;
    const typeId = first.workTypeId;
    const isType01Single = isSingleWork && typeId === '01';
    const isLandscapeType = isSingleWork && (typeId === '01' || typeId === '02' || typeId === '03' || typeId === '04' || typeId === '05' || typeId === '06' || typeId === '07' || typeId === '08' || typeId === '09' || typeId === '10');
    
    if (packageType === 'P01' || (isSingleWork && !isLandscapeType)) {
      // Package#01 또는 단일 유형(가로 유형 제외): A4 세로
      style.textContent = `
        @page {
          margin: 0;
          size: A4 portrait;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
        }
      `;
    } else {
      // Package#02, #03, 유형#01: A4 가로
      // 유형#07, #08, #09, #10는 PrintFormatWork07New, PrintFormatWork08New, PrintFormatWork09New, PrintFormatWork10New 컴포넌트가 자체 스타일을 가지고 있으므로 간단한 스타일만 적용
      if (isSingleWork && (typeId === '07' || typeId === '08' || typeId === '09' || typeId === '10')) {
        // 유형#07, #08: 원래 인쇄 방식과 동일하게 간단한 스타일만 적용
        style.textContent = `
          @page {
            size: A4 landscape !important;
            margin: 0 !important;
          }
          @media print {
            html, body {
              width: 29.7cm !important;
              height: 21cm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #root {
              display: none !important;
            }
          }
        `;
      } else {
      // 다른 유형들: 상세한 스타일 적용
      style.textContent = `
        @page {
          margin: 0;
          size: A4 landscape;
        }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        .print-container-answer {
          display: block !important;
          width: 29.7cm;
          min-height: 21cm;
          background: white;
          padding: 0;
          box-sizing: border-box;
        }
        .print-container-answer .a4-landscape-page-template {
          display: block !important;
          width: 29.7cm !important;
          height: 21cm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          box-sizing: border-box !important;
        }
        .print-container-answer .a4-landscape-page-template:not(:last-child):not(.last-page) {
          page-break-after: always !important;
          break-after: page !important;
        }
        .print-container-answer .a4-landscape-page-template:last-child,
        .print-container-answer .a4-landscape-page-template.last-page {
          page-break-after: avoid !important;
          break-after: avoid !important;
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
        }
        .print-container-answer .a4-landscape-page-content {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
        }
        .print-container-answer .print-two-column-container {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 0.6cm !important;
          width: 100% !important;
          justify-content: space-between !important;
          height: 100% !important;
          flex-direction: row !important;
          position: relative !important;
        }
        .print-container-answer .print-two-column-container::before {
          content: '' !important;
          position: absolute !important;
          top: 0 !important;
          left: 50% !important;
          width: 2px !important;
          height: 100% !important;
          background-color: #ddd !important;
          transform: translateX(-50%) !important;
          z-index: 1 !important;
        }
        .print-container-answer .print-question-card {
          width: calc(50% - 0.3cm) !important;
          max-width: calc(50% - 0.3cm) !important;
          min-width: calc(50% - 0.3cm) !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          -webkit-column-break-inside: avoid !important;
          margin-bottom: 0.3cm !important;
          border: none !important;
          padding: 0.5cm !important;
          box-sizing: border-box !important;
          display: block !important;
          float: left !important;
        }
        .print-container-answer .print-question-card:nth-child(odd) {
          clear: left !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
      }
    }
    document.head.appendChild(style);
    
    // 인쇄용 컨테이너 생성
    const printContainer = document.createElement('div');
    // first, typeId, isType01Single은 위에서 이미 선언됨
    const containerId = packageType === 'P01' || (isSingleWork && !isType01Single && typeId !== '02' && typeId !== '03' && typeId !== '04' && typeId !== '05' && typeId !== '06' && typeId !== '07' && typeId !== '08' && typeId !== '09')
      ? 'print-root-package01-answer' 
      : packageType === 'P02' 
        ? 'print-root-package02-answer' 
        : packageType === 'P03'
          ? 'print-root-package03-answer'
          : packageType === '01' || isType01Single
            ? 'print-root-work01-new-answer'
            : packageType === '02' || (isSingleWork && typeId === '02')
              ? 'print-root-work02-new-answer'
              : packageType === '03' || (isSingleWork && typeId === '03')
                ? 'print-root-work03-new-answer'
                : packageType === '04' || (isSingleWork && typeId === '04')
                  ? 'print-root-work04-new-answer'
                  : packageType === '05' || (isSingleWork && typeId === '05')
                    ? 'print-root-work05-new-answer'
                    : packageType === '06' || (isSingleWork && typeId === '06')
                      ? 'print-root-work06-new-answer'
                      : packageType === '07' || (isSingleWork && typeId === '07')
                        ? 'print-root-work07-new-answer'
                        : packageType === '08' || (isSingleWork && typeId === '08')
                          ? 'print-root-work08-new-answer'
                          : packageType === '09' || (isSingleWork && typeId === '09')
                            ? 'print-root-work09-new-answer'
                            : packageType === '10' || (isSingleWork && typeId === '10')
                              ? 'print-root-work10-new-answer'
                              : packageType === '13' || (isSingleWork && typeId === '13')
                                ? 'print-root-work13-new-answer'
            : 'print-root-package02-answer';
    printContainer.id = containerId;
    document.body.appendChild(printContainer);

    // 기존 화면 숨기기
    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    // React 18 방식으로 렌더링 (정답 모드, 패키지/단일 유형에 따라)
    const root = ReactDOM.createRoot(printContainer);
    if (isSingleWork) {
      // typeId는 위에서 이미 선언됨
      // 전역 번역 텍스트 산출
      let globalTranslatedText = first.translatedText || '';
      if (!globalTranslatedText && typeId === '03') {
        const d: any = first.work03Data || first.data?.work03Data || first.data || {};
        const textToTranslate: string = d.blankedText || '';
        try {
          if (textToTranslate) {
            globalTranslatedText = await translateToKorean(textToTranslate);
          }
        } catch (e) {
          console.error('유형#03 번역 생성 실패:', e);
        }
      }
      if (typeId === '12') {
        const data: any = first.work12Data || first.data?.work12Data || first.data || first;
        root.render(<HistoryPrintWork12 data={data} isAnswerMode={true} />);
      } else if (typeId === '01') {
        // 유형#01은 PrintFormatWork01New 사용
        const rawQuizzes = packageQuiz.map((item: any) => item.quiz || item);
        root.render(<PrintFormatWork01New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else if (typeId === '02') {
        // 유형#02는 PrintFormatWork02New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work02Data = item.work02Data || item.quiz || item.data?.work02Data || item.data || item;
          return {
            id: item.id || work02Data.id,
            title: work02Data.title || '독해 문제',
            originalText: work02Data.originalText || '',
            modifiedText: work02Data.modifiedText || '',
            replacements: work02Data.replacements || [],
            translation: work02Data.translation || ''
          };
        });
        root.render(<PrintFormatWork02New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else if (typeId === '03') {
        // 유형#03은 PrintFormatWork03New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work03Data = item.work03Data || item.quiz || item.data?.work03Data || item.data || item;
          return {
            id: item.id || work03Data.id,
            blankedText: work03Data.blankedText || '',
            options: work03Data.options || [],
            answerIndex: work03Data.answerIndex || 0,
            translation: work03Data.translation || ''
          };
        });
        root.render(<PrintFormatWork03New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else if (typeId === '04') {
        // 유형#04는 PrintFormatWork04New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work04Data = item.work04Data || item.quiz || item.data?.work04Data || item.data || item;
          return {
            id: item.id || work04Data.id,
            blankedText: work04Data.blankedText || '',
            options: work04Data.options || [],
            answerIndex: work04Data.answerIndex || 0,
            translation: work04Data.translation || ''
          };
        });
        root.render(<PrintFormatWork04New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else if (typeId === '05') {
        // 유형#05는 PrintFormatWork05New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work05Data = item.work05Data || item.quiz || item.data?.work05Data || item.data || item;
          return {
            id: item.id || work05Data.id,
            blankedText: work05Data.blankedText || '',
            options: work05Data.options || [],
            answerIndex: work05Data.answerIndex || 0,
            optionTranslations: work05Data.optionTranslations || [],
            translation: work05Data.translation || ''
          };
        });
        root.render(<PrintFormatWork05New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else if (typeId === '06') {
        // 유형#06은 PrintFormatWork06New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work06Data = item.work06Data || item.quiz || item.data?.work06Data || item.data || item;
          return {
            id: item.id || work06Data.id,
            missingSentence: work06Data.missingSentence || '',
            numberedPassage: work06Data.numberedPassage || '',
            answerIndex: work06Data.answerIndex !== undefined ? work06Data.answerIndex : 0,
            translation: work06Data.translation || ''
          };
        });
        root.render(<PrintFormatWork06New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else if (typeId === '07') {
        // 유형#07은 PrintFormatWork07New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work07Data = item.work07Data || item.quiz || item.data?.work07Data || item.data || item;
          return {
            id: item.id || work07Data.id,
            passage: work07Data.passage || '',
            options: work07Data.options || [],
            answerIndex: work07Data.answerIndex !== undefined ? work07Data.answerIndex : 0,
            translation: work07Data.translation || '',
            answerTranslation: work07Data.answerTranslation || '',
            optionTranslations: work07Data.optionTranslations || []
          };
        });
        root.render(<PrintFormatWork07New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else if (typeId === '08') {
        // 유형#08은 PrintFormatWork08New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work08Data = item.work08Data || item.quiz || item.data?.work08Data || item.data || item;
          // 다양한 데이터 소스에서 필드 추출 (호환성 강화)
          const answerIndex = work08Data.answerIndex !== undefined 
            ? Number(work08Data.answerIndex) 
            : (work08Data.answer !== undefined ? Number(work08Data.answer) : 0);
            
          const translation = work08Data.translation || 
                              work08Data.translatedText || 
                              work08Data.interpret || 
                              work08Data.koreanTranslation || 
                              work08Data.korean || 
                              work08Data.koText || '';

          return {
            id: item.id || work08Data.id,
            passage: work08Data.passage || '',
            options: work08Data.options || [],
            answerIndex: isNaN(answerIndex) ? 0 : answerIndex,
            translation: translation,
            answerTranslation: work08Data.answerTranslation || '',
            optionTranslations: work08Data.optionTranslations || []
          };
        });
        root.render(<PrintFormatWork08New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else if (typeId === '09') {
        // 유형#09는 PrintFormatWork09New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work09Data = item.work09Data || item.quiz || item.data?.work09Data || item.data || item;
          // 다양한 데이터 소스에서 필드 추출 (호환성 강화)
          const answerIndex = work09Data.answerIndex !== undefined 
            ? Number(work09Data.answerIndex) 
            : (work09Data.answer !== undefined ? Number(work09Data.answer) : 0);
            
          const translation = work09Data.translation || 
                              work09Data.translatedText || 
                              work09Data.interpret || 
                              work09Data.koreanTranslation || 
                              work09Data.korean || 
                              work09Data.koText || '';

          return {
            id: item.id || work09Data.id,
            passage: work09Data.passage || '',
            options: work09Data.options || [],
            answerIndex: isNaN(answerIndex) ? 0 : answerIndex,
            translation: translation,
            original: work09Data.original || ''
          };
        });
        root.render(<PrintFormatWork09New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else if (typeId === '10') {
        // 유형#10는 PrintFormatWork10New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work10Data = item.work10Data || item.quiz || item.data?.work10Data || item.data || item;
          // 다양한 데이터 소스에서 필드 추출 (호환성 강화)
          const answerIndex = work10Data.answerIndex !== undefined 
            ? Number(work10Data.answerIndex) 
            : (work10Data.answer !== undefined ? Number(work10Data.answer) : 0);
            
          const translation = work10Data.translation || 
                              work10Data.translatedText || 
                              work10Data.interpret || 
                              work10Data.koreanTranslation || 
                              work10Data.korean || 
                              work10Data.koText || '';

          return {
            id: item.id || work10Data.id,
            passage: work10Data.passage || '',
            numberedPassage: work10Data.numberedPassage || '',
            options: work10Data.options || [],
            answerIndex: isNaN(answerIndex) ? 0 : answerIndex,
            translation: translation,
            originalWords: work10Data.originalWords || [],
            transformedWords: work10Data.transformedWords || [],
            wrongIndexes: work10Data.wrongIndexes || []
          };
        });
        root.render(<PrintFormatWork10New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else if (typeId === '13') {
        // 유형#13는 PrintFormatWork13New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work13Data = item.work13Data || item.quiz || item.data?.work13Data || item.data || item;
          
          return {
            id: item.id || work13Data.id,
            blankedText: work13Data.blankedText || '',
            correctAnswers: work13Data.correctAnswers || [],
            translation: work13Data.translation || ''
          };
        });
        root.render(<PrintFormatWork13New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else {
        root.render(<PrintFormatPackage01 packageQuiz={packageQuiz} isAnswerMode={true} translatedText={globalTranslatedText} />);
      }
    } else if (packageType === 'P01') {
      root.render(<PrintFormatPackage01 packageQuiz={packageQuiz} isAnswerMode={true} />);
    } else if (packageType === 'P02') {
      root.render(<PrintFormatPackage02 packageQuiz={packageQuiz} isAnswerMode={true} />);
    } else if (packageType === 'P03') {
      root.render(<PrintFormatPackage03 packageQuiz={packageQuiz} isAnswerMode={true} />);
    } else if (packageType === '01') {
      const rawQuizzes = packageQuiz.map((item: any) => item.quiz || item);
      root.render(<PrintFormatWork01New quizzes={rawQuizzes} isAnswerMode={true} />);
    } else if (packageType === '02') {
      // 유형#02는 PrintFormatWork02New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work02Data = item.work02Data || item.quiz || item.data?.work02Data || item.data || item;
        return {
          id: item.id || work02Data.id,
          title: work02Data.title || '독해 문제',
          originalText: work02Data.originalText || '',
          modifiedText: work02Data.modifiedText || '',
          replacements: work02Data.replacements || [],
          translation: work02Data.translation || ''
        };
      });
        root.render(<PrintFormatWork02New quizzes={rawQuizzes} isAnswerMode={true} />);
    } else if (packageType === '03') {
      // 유형#03은 PrintFormatWork03New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work03Data = item.work03Data || item.quiz || item.data?.work03Data || item.data || item;
        return {
          id: item.id || work03Data.id,
          blankedText: work03Data.blankedText || '',
          options: work03Data.options || [],
          answerIndex: work03Data.answerIndex || 0,
          translation: work03Data.translation || ''
        };
      });
      root.render(<PrintFormatWork03New quizzes={rawQuizzes} isAnswerMode={true} />);
    } else if (packageType === '04') {
      // 유형#04는 PrintFormatWork04New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work04Data = item.work04Data || item.quiz || item.data?.work04Data || item.data || item;
        return {
          id: item.id || work04Data.id,
          blankedText: work04Data.blankedText || '',
          options: work04Data.options || [],
          answerIndex: work04Data.answerIndex || 0,
          translation: work04Data.translation || ''
        };
      });
      root.render(<PrintFormatWork04New quizzes={rawQuizzes} isAnswerMode={true} />);
    } else if (packageType === '05') {
      // 유형#05는 PrintFormatWork05New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work05Data = item.work05Data || item.quiz || item.data?.work05Data || item.data || item;
        return {
          id: item.id || work05Data.id,
          blankedText: work05Data.blankedText || '',
          options: work05Data.options || [],
          answerIndex: work05Data.answerIndex || 0,
          optionTranslations: work05Data.optionTranslations || [],
          translation: work05Data.translation || ''
        };
      });
      root.render(<PrintFormatWork05New quizzes={rawQuizzes} isAnswerMode={true} />);
    } else if (packageType === '06') {
      // 유형#06은 PrintFormatWork06New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work06Data = item.work06Data || item.quiz || item.data?.work06Data || item.data || item;
        return {
          id: item.id || work06Data.id,
          missingSentence: work06Data.missingSentence || '',
          numberedPassage: work06Data.numberedPassage || '',
          answerIndex: work06Data.answerIndex !== undefined ? work06Data.answerIndex : 0,
          translation: work06Data.translation || ''
        };
      });
      root.render(<PrintFormatWork06New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else if (packageType === '07') {
      // 유형#07은 PrintFormatWork07New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work07Data = item.work07Data || item.quiz || item.data?.work07Data || item.data || item;
        return {
          id: item.id || work07Data.id,
          passage: work07Data.passage || '',
          options: work07Data.options || [],
          answerIndex: work07Data.answerIndex !== undefined ? work07Data.answerIndex : 0,
          translation: work07Data.translation || '',
          answerTranslation: work07Data.answerTranslation || '',
          optionTranslations: work07Data.optionTranslations || []
        };
      });
      root.render(<PrintFormatWork07New quizzes={rawQuizzes} isAnswerMode={true} />);
    } else if (packageType === '08') {
      // 유형#08은 PrintFormatWork08New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work08Data = item.work08Data || item.quiz || item.data?.work08Data || item.data || item;
        // 다양한 데이터 소스에서 필드 추출 (호환성 강화)
        const answerIndex = work08Data.answerIndex !== undefined 
          ? Number(work08Data.answerIndex) 
          : (work08Data.answer !== undefined ? Number(work08Data.answer) : 0);
          
        const translation = work08Data.translation || 
                            work08Data.translatedText || 
                            work08Data.interpret || 
                            work08Data.koreanTranslation || 
                            work08Data.korean || 
                            work08Data.koText || '';

        return {
          id: item.id || work08Data.id,
          passage: work08Data.passage || '',
          options: work08Data.options || [],
          answerIndex: isNaN(answerIndex) ? 0 : answerIndex,
          translation: translation,
          answerTranslation: work08Data.answerTranslation || '',
          optionTranslations: work08Data.optionTranslations || []
        };
        });
      root.render(<PrintFormatWork08New quizzes={rawQuizzes} isAnswerMode={true} />);
    } else if (packageType === '09') {
      // 유형#09는 PrintFormatWork09New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work09Data = item.work09Data || item.quiz || item.data?.work09Data || item.data || item;
        // 다양한 데이터 소스에서 필드 추출 (호환성 강화)
        const answerIndex = work09Data.answerIndex !== undefined 
          ? Number(work09Data.answerIndex) 
          : (work09Data.answer !== undefined ? Number(work09Data.answer) : 0);
          
        const translation = work09Data.translation || 
                            work09Data.translatedText || 
                            work09Data.interpret || 
                            work09Data.koreanTranslation || 
                            work09Data.korean || 
                            work09Data.koText || '';

        return {
          id: item.id || work09Data.id,
          passage: work09Data.passage || '',
          options: work09Data.options || [],
          answerIndex: isNaN(answerIndex) ? 0 : answerIndex,
          translation: translation,
          original: work09Data.original || ''
        };
      });
      root.render(<PrintFormatWork09New quizzes={rawQuizzes} isAnswerMode={true} />);
    } else if (packageType === '10') {
      // 유형#10는 PrintFormatWork10New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work10Data = item.work10Data || item.quiz || item.data?.work10Data || item.data || item;
        // 다양한 데이터 소스에서 필드 추출 (호환성 강화)
        const answerIndex = work10Data.answerIndex !== undefined 
          ? Number(work10Data.answerIndex) 
          : (work10Data.answer !== undefined ? Number(work10Data.answer) : 0);
          
        const translation = work10Data.translation || 
                            work10Data.translatedText || 
                            work10Data.interpret || 
                            work10Data.koreanTranslation || 
                            work10Data.korean || 
                            work10Data.koText || '';

        return {
          id: item.id || work10Data.id,
          passage: work10Data.passage || '',
          numberedPassage: work10Data.numberedPassage || '',
          options: work10Data.options || [],
          answerIndex: isNaN(answerIndex) ? 0 : answerIndex,
          translation: translation,
          originalWords: work10Data.originalWords || [],
          transformedWords: work10Data.transformedWords || [],
          wrongIndexes: work10Data.wrongIndexes || []
        };
      });
      root.render(<PrintFormatWork10New quizzes={rawQuizzes} isAnswerMode={true} />);
    } else if (packageType === '13') {
      // 유형#13는 PrintFormatWork13New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work13Data = item.work13Data || item.quiz || item.data?.work13Data || item.data || item;
        
        return {
          id: item.id || work13Data.id,
          blankedText: work13Data.blankedText || '',
          correctAnswers: work13Data.correctAnswers || [],
          translation: work13Data.translation || ''
        };
      });
      root.render(<PrintFormatWork13New quizzes={rawQuizzes} isAnswerMode={true} />);
    } else {
      root.render(<SimplePrintFormatPackage02 packageQuiz={packageQuiz} />);
    }

    // 유형#07, #08, #09, #10, #13는 원래 인쇄 방식과 동일하게 처리
    if (isSingleWork && (typeId === '07' || typeId === '08' || typeId === '09' || typeId === '10' || typeId === '13')) {
      // 원래 방식: activatePrintContainer 후 바로 인쇄
      const activatePrintContainer = () => {
        const inner = printContainer.querySelector('.print-container, .print-container-answer');
        if (inner) {
          inner.classList.add('pdf-generation-active');
        } else {
          requestAnimationFrame(activatePrintContainer);
        }
      };
      activatePrintContainer();

      setTimeout(() => {
        window.print();
        
        setTimeout(() => {
          root.unmount();
          if (printContainer.parentNode) {
            printContainer.parentNode.removeChild(printContainer);
          }
          if (appRoot) {
            appRoot.style.display = '';
          }
          const styleElement = document.getElementById(
            typeId === '07' ? 'print-style-work07-landscape' : 
            typeId === '08' ? 'print-style-work08-landscape' :
            typeId === '09' ? 'print-style-work09-landscape' :
            typeId === '10' ? 'print-style-work10-landscape' :
            'print-style-work13-landscape'
          );
          if (styleElement) {
            styleElement.remove();
          }
          console.log('✅ 인쇄(정답) 완료');
        }, 100);
      }, 500);
      return; // 유형#07, #08, #09는 여기서 종료
    }

    // 렌더링 완료 후 인쇄 및 파일 생성
    // DOC 저장은 렌더링 시간이 더 필요함 (특히 Work_06)
    const renderDelay = fileFormat === 'doc' 
      ? ((packageType === '06' || (isSingleWork && typeId === '06')) ? 2000 : 1500)
      : ((packageType === '01' || isType01Single) ? 1000 : 500);
    
    setTimeout(async () => {
      // 파일 생성 및 Firebase Storage 업로드
      try {
        // 유형#01, #02, #03의 경우 실제 렌더링된 컨테이너 ID 사용
        let elementId = containerId;
        if (packageType === '01' || isType01Single) {
          elementId = 'print-root-work01-new-answer';
        } else if (packageType === '02' || (isSingleWork && typeId === '02')) {
          elementId = 'print-root-work02-new-answer';
        } else if (packageType === '03' || (isSingleWork && typeId === '03')) {
          elementId = 'print-root-work03-new-answer';
        } else if (packageType === '04' || (isSingleWork && typeId === '04')) {
          elementId = 'print-root-work04-new-answer';
        } else if (packageType === '05' || (isSingleWork && typeId === '05')) {
          elementId = 'print-root-work05-new-answer';
        } else if (packageType === '06' || (isSingleWork && typeId === '06')) {
          elementId = 'print-root-work06-new-answer';
        } else if (packageType === '07' || (isSingleWork && typeId === '07')) {
          elementId = 'print-root-work07-new-answer';
        } else if (packageType === '08' || (isSingleWork && typeId === '08')) {
          elementId = 'print-root-work08-new-answer';
        } else if (packageType === '09' || (isSingleWork && typeId === '09')) {
          elementId = 'print-root-work09-new-answer';
        } else if (packageType === '10' || (isSingleWork && typeId === '10')) {
          elementId = 'print-root-work10-new-answer';
        } else if (packageType === '13' || (isSingleWork && typeId === '13')) {
          elementId = 'print-root-work13-new-answer';
        }
        const element = document.getElementById(elementId);
        if (element) {
          // 디버깅: 실제 DOM에 렌더링된 페이지 요소 확인
          const pageElements = element.querySelectorAll('.a4-landscape-page-template, .a4-page-template, .print-page');
          console.log('🔍 실제 DOM 페이지 요소 확인 (인쇄 정답):', {
            totalPages: pageElements.length,
            containerId: elementId,
            pages: Array.from(pageElements).map((page, idx) => {
              const rect = page.getBoundingClientRect();
              const computedStyle = window.getComputedStyle(page);
              return {
                index: idx,
                id: page.id,
                className: page.className,
                height: rect.height,
                computedHeight: computedStyle.height,
                pageBreakAfter: computedStyle.pageBreakAfter,
                breakAfter: computedStyle.breakAfter,
                isLastPage: page.classList.contains('last-page'),
                marginBottom: computedStyle.marginBottom,
                paddingBottom: computedStyle.paddingBottom
              };
            })
          });
        }
        if (!element) {
          console.error(`❌ 인쇄 컨테이너를 찾을 수 없습니다: ${elementId}`);
          // 대체 시도: 내부 컨테이너 찾기
          const innerElement = document.querySelector('.work01-new-print, .work02-new-print, .work03-new-print, .work04-new-print, .work04-print, .work05-new-print, .work05-print, .work06-new-print, .work06-print');
          if (innerElement) {
            console.log('✅ 대체 컨테이너 찾음:', innerElement);
          }
          return;
        }
        
        // DOM 요소가 실제로 내용을 가지고 있는지 확인 (특히 DOC 저장 시)
        if (fileFormat === 'doc') {
          const pageElements = element.querySelectorAll('.a4-landscape-page-template, .a4-page-template, .print-page');
          const hasContent = pageElements.length > 0 || (element.textContent && element.textContent.trim().length > 50);
          if (!hasContent) {
            console.error(`❌ 인쇄 컨테이너에 내용이 없습니다: ${elementId}`, {
              pageElementsCount: pageElements.length,
              textContentLength: element.textContent?.trim().length || 0
            });
            // 추가 대기 후 재시도
            setTimeout(async () => {
              const retryElement = document.getElementById(elementId);
              if (retryElement && userData?.uid) {
                const pageElementsRetry = retryElement.querySelectorAll('.a4-landscape-page-template, .a4-page-template, .print-page');
                const hasContentRetry = pageElementsRetry.length > 0 || (retryElement.textContent && retryElement.textContent.trim().length > 50);
                if (hasContentRetry) {
                  console.log('✅ 재시도 성공: 내용이 렌더링되었습니다');
                  // 파일 생성 로직 실행
                } else {
                  console.error('❌ 재시도 실패: 여전히 내용이 없습니다');
                  alert('문서 내용을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
                  return;
                }
              }
            }, 1000);
            return;
          }
          console.log(`✅ 인쇄 컨테이너 확인: ${elementId}, 페이지 수: ${pageElements.length}`);
        }
        
        if (element && userData?.uid) {
          const workTypeName = packageType === 'P01' ? '패키지#01_정답' :
                              packageType === 'P02' ? '패키지#02_정답' :
                              packageType === 'P03' ? '패키지#03_정답' :
                              packageType === '01' || isType01Single ? '유형#01_정답' :
                              packageType === '02' ? '유형#02_정답' :
                              packageType === '03' ? '유형#03_정답' :
                              packageType === '04' ? '유형#04_정답' :
                              packageType === '05' ? '유형#05_정답' :
          packageType === '06' ? '유형#06_정답' :
          packageType === '07' ? '유형#07_정답' :
          packageType === '08' ? '유형#08_정답' :
          packageType === '09' ? '유형#09_정답' :
          packageType === '10' ? '유형#10_정답' :
          packageType === '13' ? '유형#13_정답' :
          '정답';
          
          const result = await generateAndUploadFile(
            element as HTMLElement,
            userData.uid,
            `${packageType.toLowerCase() || 'quiz'}_answer_${Date.now()}`,
            workTypeName,
            { 
              isAnswerMode: true, 
              orientation: (packageType === 'P01' || (isSingleWork && !isType01Single && typeId !== '02' && typeId !== '03' && typeId !== '04' && typeId !== '05' && typeId !== '06' && typeId !== '07' && typeId !== '08' && typeId !== '09' && typeId !== '10' && typeId !== '13')) ? 'portrait' : 'landscape',
              fileFormat 
            }
          );
          
          const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
          console.log(`📁 ${workTypeName} ${formatName} 저장 완료:`, result.fileName);
        }
      } catch (error) {
        console.error(`❌ 파일 저장 실패 (${fileFormat}):`, error);
      }

      // PDF인 경우에만 브라우저 인쇄, DOC는 이미 다운로드됨
      if (fileFormat === 'pdf') {
        window.print();
      }

      // 인쇄 후 정리
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(printContainer);
        if (appRoot) {
          appRoot.style.display = 'block';
        }
        const styleElement = document.getElementById('print-style-package-answer');
        if (styleElement) {
          document.head.removeChild(styleElement);
        }
        console.log('✅ 인쇄(정답) 완료');
      }, fileFormat === 'pdf' ? 100 : 500);
    }, (packageType === '01' || isType01Single) ? 1000 : 500); // 유형#01은 렌더링 시간이 더 필요할 수 있음
  };

  // 목록보기 버튼
  const handleBackToList = () => {
    navigate('/quiz-list');
  };

  if (loading) {
    return (
      <div className="quiz-display-page">
        <div className="loading-container">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    );
  }


  return (
    <div className="quiz-display-page">
      {/* 헤더 */}
      <div className="quiz-display-header">
        <div className="header-left">
          <h1>
            {packageType === 'P01' ? '📦 패키지 퀴즈 #01 (여러 유형 생성)' :
             packageType === 'P02' ? '📦 패키지 퀴즈 #02 (2단계 문제)' :
             packageType === 'P03' ? '📦 패키지 퀴즈 #03 (본문 집중 문제)' :
             '문제 생성 결과'}
          </h1>
          <p>생성된 문제를 확인하고 인쇄할 수 있습니다.</p>
        </div>
        <div className="header-right">
          <button
            onClick={handleBackToList}
            className="back-btn"
          >
            목록보기
          </button>
          
          {/* 파일 형식 선택 */}
          <FileFormatSelector
            value={fileFormat}
            onChange={setFileFormat}
          />
          
          <button
            onClick={handlePrintProblem}
            className="print-btn problem-btn"
          >
            {fileFormat === 'pdf' ? '🖨️인쇄(문제)' : '💾저장(문제)'}
          </button>
          <button
            onClick={handlePrintAnswer}
            className="print-btn answer-btn"
          >
            {fileFormat === 'pdf' ? '🖨️인쇄(정답)' : '💾저장(정답)'}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="quiz-display-content">
        {packageQuiz && packageQuiz.length > 0 ? (
          <SimpleQuizDisplay packageQuiz={packageQuiz} />
        ) : (
          <div className="no-content">
            <p>표시할 문제가 없습니다.</p>
            <p>packageQuiz: {JSON.stringify(packageQuiz)}</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default QuizDisplayPage;
