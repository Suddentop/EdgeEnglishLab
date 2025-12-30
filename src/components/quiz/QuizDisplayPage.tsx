import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import ReactDOMServer from 'react-dom/server';
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
import PrintFormatWork11New from '../work/Work_11_SentenceTranslation/PrintFormatWork11New';
import PrintFormatWork13New from '../work/Work_13_BlankFillWord/PrintFormatWork13New';
import PrintFormatWork14New from '../work/Work_14_BlankFillSentence/PrintFormatWork14New';
import HistoryPrintWork12 from '../work/Work_12_WordStudy/HistoryPrintWork12';
import HistoryPrintWork15 from '../work/Work_15_PassageWordStudy/HistoryPrintWork15';
import HistoryPrintWork15Doc from '../work/Work_15_PassageWordStudy/HistoryPrintWork15Doc';
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
    const state = location.state as any;

    if (state && state.quizData) {
      const quizzes = state.quizData.generatedData?.quizzes || [];
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
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(문제) 시작');
    
    // 패키지/단일 유형에 따른 페이지 스타일 동적 추가
    const style = document.createElement('style');
    style.id = 'print-style-package';
    const isSingleWork = ((!
      packageType || !packageType.startsWith('P')
    ) && Array.isArray(packageQuiz) && packageQuiz.length === 1);
    
    // 유형#01은 가로, 단일 유형이면 세로, 패키지#01도 세로
    // 유형#06, #07, #08, #09는 가로로 표시
    const first = packageQuiz[0] || {} as any;
    const typeId = first.workTypeId;
    const isType01Single = isSingleWork && typeId === '01';
    const isLandscapeType = isSingleWork && (typeId === '01' || typeId === '02' || typeId === '03' || typeId === '04' || typeId === '05' || typeId === '06' || typeId === '07' || typeId === '08' || typeId === '09' || typeId === '10' || typeId === '13' || typeId === '14');
    
    if (packageType === 'P01' || (isSingleWork && !isLandscapeType)) {
      // Package#01 또는 단일 유형(가로 유형 제외): A4 세로
      // 유형#12는 HistoryPrintWork12가 자체 스타일을 가지고 있으므로 명시적인 크기 설정
      if (isSingleWork && typeId === '12') {
        style.textContent = `
          @page {
            margin: 0;
            size: A4 portrait;
          }
          @media print {
            html, body {
              width: 21cm !important;
              height: 29.7cm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #root {
              display: none !important;
            }
          }
        `;
      } else if (packageType === 'P01') {
        // 패키지#01: 유형#12와 동일하게 명시적인 크기 설정
        style.textContent = `
          @page {
            margin: 0;
            size: A4 portrait;
          }
          @media print {
            html, body {
              width: 21cm !important;
              height: 29.7cm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #root {
              display: none !important;
            }
            .a4-page-template {
              width: 21cm !important;
              height: 29.7cm !important;
            }
          }
        `;
      } else {
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
      }
    } else {
      // Package#02, #03, 유형#01, #02, #03, #04, #05, #06, #07, #08, #13, #14: A4 가로
      // 유형#07, #08, #09, #10, #11, #13, #14는 PrintFormatWork07New, PrintFormatWork08New, PrintFormatWork09New, PrintFormatWork10New, PrintFormatWork11New, PrintFormatWork13New, PrintFormatWork14New 컴포넌트가 자체 스타일을 가지고 있으므로 간단한 스타일만 적용
      if (isSingleWork && (typeId === '07' || typeId === '08' || typeId === '09' || typeId === '10' || typeId === '11' || typeId === '13' || typeId === '14')) {
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
    }
    document.head.appendChild(style);
    
    // 인쇄용 컨테이너 생성
    const printContainer = document.createElement('div');
    // first, typeId, isType01Single은 위에서 이미 선언됨
    const containerId = packageType === 'P01' || (isSingleWork && !isType01Single && typeId !== '02' && typeId !== '03' && typeId !== '04' && typeId !== '05' && typeId !== '06' && typeId !== '07' && typeId !== '08' && typeId !== '09' && typeId !== '10' && typeId !== '11' && typeId !== '12')
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
                            : packageType === '11' || (isSingleWork && typeId === '11')
                              ? 'print-root-work11-new'
                              : (isSingleWork && typeId === '12')
                                ? 'print-root-work12-new'
                                : packageType === '13' || (isSingleWork && typeId === '13')
                                  ? 'print-root-work13-new'
                                  : packageType === '14' || (isSingleWork && typeId === '14')
                                    ? 'print-root-work14-new'
                                    : packageType === '15' || (isSingleWork && typeId === '15')
                                      ? 'print-root-work15-new'
            : 'print-root-package02';
    printContainer.id = containerId;
    
    // DOC 저장인 경우 화면에 보이지 않도록 설정
    if (fileFormat === 'doc') {
      printContainer.style.display = 'none';
      printContainer.style.visibility = 'hidden';
      printContainer.style.position = 'absolute';
      printContainer.style.left = '-9999px';
      printContainer.style.top = '-9999px';
      printContainer.style.width = '1px';
      printContainer.style.height = '1px';
      printContainer.style.overflow = 'hidden';
    } else {
      // 유형#12인 경우 인쇄용 컨테이너 스타일 명시적 설정
      if (isSingleWork && typeId === '12') {
        printContainer.style.display = 'block';
        printContainer.style.visibility = 'visible';
        printContainer.style.position = 'relative';
        printContainer.style.width = 'auto';
        printContainer.style.height = 'auto';
        printContainer.style.overflow = 'visible';
      }
    }
    
    document.body.appendChild(printContainer);

    // 기존 화면 숨기기 (DOC 저장인 경우에는 숨기지 않음)
    const appRoot = document.getElementById('root');
    if (appRoot && fileFormat !== 'doc') {
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
        console.log('🖨️ [QuizDisplayPage] 유형#12 인쇄(문제) 데이터:', {
          hasWork12Data: !!first.work12Data,
          hasData: !!first.data,
          dataKeys: data ? Object.keys(data) : [],
          wordsCount: data?.words?.length || 0,
          sampleWords: data?.words?.slice(0, 3),
          quizType: data?.quizType
        });
        
        // 유형#12는 오버레이 방식 사용 (PDF만)
        if (fileFormat === 'pdf') {
          const workTypeName = '유형#12_문제';
          
          // React 컴포넌트를 정적 HTML로 렌더링
          const markup = ReactDOMServer.renderToStaticMarkup(
            <HistoryPrintWork12 data={data} isAnswerMode={false} />
          );
          
          console.log('🖨️ [QuizDisplayPage] 유형#12 인쇄(문제) - 렌더링된 마크업 길이:', markup.length);
          console.log('🖨️ [QuizDisplayPage] 유형#12 인쇄(문제) - 마크업 샘플:', markup.substring(0, 500));
          
          // 기존 printContainer 제거
          if (printContainer && printContainer.parentNode) {
            printContainer.parentNode.removeChild(printContainer);
          }
          
          // 오버레이 생성
          const overlayId = 'work12-print-overlay';
          const existingOverlay = document.getElementById(overlayId);
          if (existingOverlay && existingOverlay.parentNode) {
            existingOverlay.parentNode.removeChild(existingOverlay);
          }
          
          const overlay = document.createElement('div');
          overlay.id = overlayId;
          Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            backgroundColor: '#ffffff',
            zIndex: '9999',
            overflow: 'hidden',
            width: '100%',
            height: '100%'
          } as Partial<CSSStyleDeclaration>);
          
          // PrintFormat12.css의 스타일을 가져와서 오버레이에 주입
          const PRINT_STYLES = `
            @page {
              size: A4 portrait !important;
              margin: 0 !important;
            }
            html, body {
              width: 21cm !important;
              height: 29.7cm !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', 'Segoe UI', Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media print {
              html, body {
                width: 21cm !important;
                height: 29.7cm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
              }
              .a4-page-template-work12 {
                width: 21cm !important;
                max-width: 21cm !important;
                height: 29.7cm !important;
                max-height: 29.7cm !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
              }
            }
            .a4-page-template-work12 {
              width: 21cm !important;
              max-width: 21cm !important;
              height: 29.7cm !important;
              max-height: 29.7cm !important;
              box-sizing: border-box;
              padding: 0;
              margin: 0;
              display: flex;
              flex-direction: column;
            }
            .a4-page-header-work12 {
              width: 100%;
              margin-bottom: 0.4cm;
              text-align: center;
            }
            .print-header-text-work12 {
              font-size: 11pt;
              font-weight: 700;
            }
            .a4-page-content-work12 {
              width: 100% !important;
              flex: 1;
              display: flex;
              flex-direction: column;
              min-height: 0;
            }
            .problem-instruction-work12 {
              font-weight: 800;
              font-size: 11pt;
              background: #F0F0F0;
              color: #000000;
              padding: 0.6rem 0.5rem;
              border-radius: 6px;
              margin: 0 0 0.6rem 0;
              box-sizing: border-box;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .problem-instruction-text-work12 {
              flex: 1 1 auto;
            }
            .problem-type-label-work12 {
              margin-left: 0.5cm;
              font-size: 10pt;
              font-weight: 700;
              color: #000000;
            }
            .word-list-container-work12 {
              display: flex !important;
              gap: 0.5cm;
              width: 100% !important;
              margin: 0;
              flex: 1;
              min-height: 0;
              align-items: stretch;
            }
            .word-list-column-work12 {
              flex: 1 1 50% !important;
              width: 50% !important;
              min-width: 0;
            }
            .word-list-table-work12 {
              width: 100% !important;
              max-width: 100% !important;
              border-collapse: collapse;
              margin: 0;
              font-size: 10pt;
              background: #ffffff;
              border: 2px solid #000000;
            }
            .word-list-table-work12 th {
              background: #e3f2fd;
              color: #000000;
              font-weight: 700;
              font-size: 10pt;
              padding: 0.35rem 0.5rem;
              text-align: center;
              border: 1px solid #000000;
            }
            .word-list-table-work12 td {
              border: 1px solid #000000;
              padding: 0.35rem 0.5rem;
              text-align: left;
              font-size: 10pt;
              font-weight: 500;
              color: #000000;
            }
            .word-list-table-work12 td:first-child,
            .word-list-table-work12 th:first-child {
              text-align: center;
              width: 10% !important;
            }
            .word-list-table-work12 th:nth-child(2),
            .word-list-table-work12 td:nth-child(2) {
              width: 36% !important;
            }
            .word-list-table-work12 th:nth-child(3),
            .word-list-table-work12 td:nth-child(3) {
              width: 54% !important;
            }
            .word-list-table-work12 tr:nth-child(even) {
              background: #f8f9fa;
            }
            .word-list-table-work12 tr:nth-child(odd) {
              background: #ffffff;
            }
            .word-list-table-work12 .answer-cell {
              color: #1976d2 !important;
              font-weight: 700 !important;
              background: #f0f8ff !important;
            }
            @media screen {
              #work12-print-overlay {
                display: none !important;
                visibility: hidden !important;
                position: absolute !important;
                left: -9999px !important;
                top: -9999px !important;
                opacity: 0 !important;
                z-index: -1 !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
              }
            }
            @media print {
              body#work12-print-active * {
                visibility: visible !important;
              }
              .only-print-work12 {
                display: block !important;
              }
              #work12-print-overlay {
                display: block !important;
                visibility: visible !important;
                left: 0 !important;
                opacity: 1 !important;
                z-index: 9999 !important;
                position: fixed !important;
                overflow: hidden !important;
                width: 100% !important;
                height: 100% !important;
              }
            }
          `;
          
          // 오버레이에 인쇄용 스타일 + 마크업 주입
          overlay.innerHTML = `
            <style>${PRINT_STYLES}</style>
            ${markup}
          `;
          
          document.body.appendChild(overlay);
          
          // body에 임시 id를 부여하여 PRINT_STYLES 내 @media print 규칙이 적용되도록 함
          const prevBodyId = document.body.getAttribute('id');
          document.body.setAttribute('id', 'work12-print-active');
          
          console.log('🖨️ [QuizDisplayPage] 유형#12 오버레이 추가 완료', {
            overlayId,
            hasContent: overlay.innerHTML.length > 0,
            childrenCount: overlay.children.length,
            markupLength: markup.length
          });
          
          // 오버레이가 완전히 렌더링될 때까지 충분한 시간 대기
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(() => {
                // 오버레이 내용이 제대로 렌더링되었는지 확인
                const overlayContent = overlay.querySelector('.only-print-work12');
                console.log('🖨️ [QuizDisplayPage] 인쇄 전 오버레이 확인:', {
                  overlayExists: !!overlay,
                  overlayContentExists: !!overlayContent,
                  overlayDisplay: window.getComputedStyle(overlay).display,
                  overlayVisibility: window.getComputedStyle(overlay).visibility,
                  overlayRect: overlay.getBoundingClientRect()
                });
                
                window.print();
                
                // 인쇄 다이얼로그가 열린 후 오버레이 숨기기 (더 긴 지연)
                setTimeout(() => {
                  overlay.style.display = 'none';
                  overlay.style.visibility = 'hidden';
                  overlay.style.position = 'absolute';
                  overlay.style.left = '-9999px';
                  overlay.style.top = '-9999px';
                  overlay.style.opacity = '0';
                  overlay.style.zIndex = '-1';
                  overlay.style.width = '0';
                  overlay.style.height = '0';
                  overlay.style.overflow = 'hidden';
                }, 500); // 인쇄 다이얼로그가 열릴 시간 확보
              
              // 인쇄 후 오버레이 정리
              setTimeout(() => {
                const ov = document.getElementById(overlayId);
                if (ov && ov.parentNode) {
                  ov.parentNode.removeChild(ov);
                }
                
                // body id 되돌리기
                if (prevBodyId) {
                  document.body.setAttribute('id', prevBodyId);
                } else {
                  document.body.removeAttribute('id');
                }
                
                // appRoot 다시 표시
                if (appRoot) {
                  appRoot.style.display = '';
                }
                
                // PDF 저장 (인쇄 미리보기 창이 닫힌 후 실행)
                setTimeout(async () => {
                  console.log('📄 [QuizDisplayPage] PDF 저장 시작 (2초 후)');
                  
                  // DOM 변경 감지: 화면에 나타나는 요소 추적
                  const domObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                      mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                          const el = node as HTMLElement;
                          const rect = el.getBoundingClientRect();
                          const computed = window.getComputedStyle(el);
                          // 화면에 보이는 요소 감지 (rect가 화면 범위 내에 있고, display가 none이 아니고, opacity가 0이 아닌 경우)
                          if (rect.width > 0 && rect.height > 0 && 
                              computed.display !== 'none' && 
                              computed.visibility !== 'hidden' &&
                              parseFloat(computed.opacity) > 0 &&
                              (rect.top >= 0 || rect.left >= 0 || rect.bottom <= window.innerHeight || rect.right <= window.innerWidth)) {
                            console.warn('⚠️ [QuizDisplayPage] 화면에 나타난 요소 감지:', {
                              id: el.id,
                              className: el.className,
                              tagName: el.tagName,
                              display: computed.display,
                              visibility: computed.visibility,
                              opacity: computed.opacity,
                              position: computed.position,
                              zIndex: computed.zIndex,
                              rect: rect,
                              innerHTML: el.innerHTML.substring(0, 200)
                            });
                          }
                        }
                      });
                    });
                  });
                  domObserver.observe(document.body, { 
                    childList: true, 
                    subtree: true, 
                    attributes: true, 
                    attributeFilter: ['style', 'class', 'id'] 
                  });
                  
                  try {
                    console.log('📄 [QuizDisplayPage] PDF 저장용 컨테이너 생성 시작');
                    
                    // printContainer를 다시 생성하여 PDF 저장에 사용 (화면에 보이지 않도록 설정)
                    const pdfContainer = document.createElement('div');
                    pdfContainer.id = 'print-root-work12-new';
                    // display: none으로 시작하여 완전히 숨김 (모든 속성을 !important로 설정)
                    pdfContainer.style.cssText = 'display: none !important; position: fixed !important; left: -99999px !important; top: -99999px !important; width: 21cm !important; height: 29.7cm !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; z-index: -9999 !important; visibility: hidden !important; transform: scale(0) !important;';
                    document.body.appendChild(pdfContainer);
                    
                    console.log('📄 [QuizDisplayPage] PDF 저장용 컨테이너 생성 완료:', {
                      id: pdfContainer.id,
                      display: window.getComputedStyle(pdfContainer).display,
                      visibility: window.getComputedStyle(pdfContainer).visibility,
                      opacity: window.getComputedStyle(pdfContainer).opacity,
                      position: window.getComputedStyle(pdfContainer).position,
                      rect: pdfContainer.getBoundingClientRect()
                    });
                    
                    // React 렌더링 중에도 계속 숨김 상태 유지
                    const observer = new MutationObserver(() => {
                      if (pdfContainer.style.display !== 'none') {
                        pdfContainer.style.cssText = 'display: none !important; position: fixed !important; left: -99999px !important; top: -99999px !important; width: 21cm !important; height: 29.7cm !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; z-index: -9999 !important; visibility: hidden !important; transform: scale(0) !important;';
                      }
                    });
                    observer.observe(pdfContainer, { attributes: true, attributeFilter: ['style', 'class'] });
                    
                    const pdfRoot = ReactDOM.createRoot(pdfContainer);
                    pdfRoot.render(<HistoryPrintWork12 data={data} isAnswerMode={false} />);
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // 렌더링 후 상태 확인
                    console.log('📄 [QuizDisplayPage] React 렌더링 후 상태:', {
                      id: pdfContainer.id,
                      display: window.getComputedStyle(pdfContainer).display,
                      visibility: window.getComputedStyle(pdfContainer).visibility,
                      opacity: window.getComputedStyle(pdfContainer).opacity,
                      rect: pdfContainer.getBoundingClientRect(),
                      innerHTML: pdfContainer.innerHTML.substring(0, 200)
                    });
                    
                    // PDF 생성 직전에만 display: block으로 변경 (하지만 여전히 화면 밖에 있고 opacity: 0)
                    observer.disconnect(); // 관찰 중지
                    pdfContainer.style.cssText = 'display: block !important; position: fixed !important; left: -99999px !important; top: -99999px !important; width: 21cm !important; height: 29.7cm !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; z-index: -9999 !important; visibility: visible !important; transform: scale(1) !important;';
                    
                    console.log('📄 [QuizDisplayPage] PDF 생성 직전 상태:', {
                      id: pdfContainer.id,
                      display: window.getComputedStyle(pdfContainer).display,
                      visibility: window.getComputedStyle(pdfContainer).visibility,
                      opacity: window.getComputedStyle(pdfContainer).opacity,
                      rect: pdfContainer.getBoundingClientRect()
                    });
                    
                    // html2canvas는 opacity: 0인 요소도 캡처할 수 있으므로 visibility 변경 불필요
                    const result = await generateAndUploadFile(
                      pdfContainer as HTMLElement,
                      userData.uid,
                      `${packageType.toLowerCase() || 'quiz'}_problem_${Date.now()}`,
                      workTypeName,
                      { 
                        isAnswerMode: false, 
                        orientation: 'portrait',
                        fileFormat 
                      }
                    );
                    console.log(`📁 ${workTypeName} PDF 저장 완료:`, result.fileName);
                    
                    // PDF 저장 후 즉시 다시 숨기기
                    pdfContainer.style.cssText = 'display: none !important; position: fixed !important; left: -99999px !important; top: -99999px !important; width: 21cm !important; height: 29.7cm !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; z-index: -9999 !important; visibility: hidden !important; transform: scale(0) !important;';
                    
                    // PDF 저장 후 정리
                    pdfRoot.unmount();
                    if (pdfContainer.parentNode) {
                      pdfContainer.parentNode.removeChild(pdfContainer);
                    }
                    
                    // DOM 관찰 중지
                    domObserver.disconnect();
                    console.log('✅ [QuizDisplayPage] PDF 저장 완료 및 DOM 관찰 중지');
                  } catch (error) {
                    console.error(`❌ PDF 저장 실패:`, error);
                    // 에러 발생 시에도 DOM 관찰 중지
                    domObserver.disconnect();
                  }
                }, 2000); // 인쇄 미리보기 창이 닫힐 시간 확보
              }, 100);
              }, 300); // 오버레이 렌더링 대기 시간
            });
          });
          
          return; // 오버레이 방식 사용 시 root.render 호출하지 않음
        } else {
          // DOC 저장은 기존 방식 사용
          root.render(<HistoryPrintWork12 data={data} />);
        }
        
        // 렌더링 완료 확인 및 디버깅
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const onlyPrintElement = printContainer.querySelector('.only-print-work12');
            const pageTemplate = printContainer.querySelector('.a4-page-template-work12');
            const wordTable = printContainer.querySelector('.word-list-table-work12');
            console.log('🔍 [QuizDisplayPage] 유형#12 렌더링 확인:', {
              containerId: containerId,
              containerExists: !!printContainer,
              containerDisplay: getComputedStyle(printContainer).display,
              containerVisibility: getComputedStyle(printContainer).visibility,
              onlyPrintElementExists: !!onlyPrintElement,
              onlyPrintElementDisplay: onlyPrintElement ? getComputedStyle(onlyPrintElement as HTMLElement).display : null,
              onlyPrintElementVisibility: onlyPrintElement ? getComputedStyle(onlyPrintElement as HTMLElement).visibility : null,
              pageTemplateExists: !!pageTemplate,
              wordTableExists: !!wordTable,
              wordTableRows: wordTable ? (wordTable as HTMLTableElement).rows.length : 0,
              containerInnerHTML: printContainer.innerHTML.substring(0, 200)
            });
          });
        });
      } else if (typeId === '15') {
        // 유형#15 DOC 저장은 별도 처리 (오버레이 방식 사용하지 않음)
        if (fileFormat === 'doc') {
          // DOC 저장은 아래 setTimeout 내부에서 처리됨
          // 여기서는 오버레이 방식을 사용하지 않고 일반 방식으로 처리
          // root.render는 아래에서 처리됨
        } else if (fileFormat === 'pdf') {
          // 유형#15 PDF 저장은 Work_15_PassageWordStudy.tsx와 동일한 방식으로 오버레이 사용
          const work15Data = first.work15Data || first.data?.work15Data || first.data || first;
        console.log('🔍 [QuizDisplayPage] 유형#15 인쇄(문제) - 단일 문제:', {
          firstKeys: Object.keys(first || {}),
          hasWork15Data: !!work15Data,
          work15DataKeys: work15Data ? Object.keys(work15Data) : [],
          hasWords: !!work15Data?.words,
          wordsCount: work15Data?.words?.length || 0,
          hasQuizzes: !!work15Data?.quizzes,
          quizzesCount: work15Data?.quizzes?.length || 0,
          work15DataType: typeof work15Data,
          work15DataIsArray: Array.isArray(work15Data)
        });
        
        // work15Data가 WordQuiz 객체인 경우 quizzes 배열로 변환
        let data: any;
        if (work15Data?.words && Array.isArray(work15Data.words) && work15Data.words.length > 0) {
          // 단일 WordQuiz 객체인 경우 quizzes 배열로 변환
          data = {
            quizzes: [{
              words: work15Data.words,
              quizType: work15Data.quizType || 'english-to-korean',
              totalQuestions: work15Data.totalQuestions || work15Data.words.length,
              passage: work15Data.passage
            }]
          };
        } else if (work15Data?.quizzes && Array.isArray(work15Data.quizzes)) {
          // 이미 quizzes 배열인 경우
          data = work15Data;
        } else {
          // 그 외의 경우 원본 데이터 사용
          data = work15Data;
        }
        
        console.log('🔍 [QuizDisplayPage] 유형#15 인쇄(문제) - 변환된 데이터:', {
          hasQuizzes: !!data?.quizzes,
          quizzesCount: data?.quizzes?.length || 0,
          firstQuizWordsCount: data?.quizzes?.[0]?.words?.length || 0,
          firstQuizSample: data?.quizzes?.[0]?.words?.slice(0, 2)
        });
        
        // Work_15_PassageWordStudy.tsx와 동일한 PRINT_STYLES 사용
        const PRINT_STYLES = `
          @page {
            size: A4 landscape;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', 'Segoe UI', Arial, sans-serif;
            width: 29.7cm !important;
            height: 21cm !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @media print {
            html, body {
              overflow: hidden;
            }
          }
          
          .only-print-work15 {
            display: block !important;
          }
          .a4-landscape-page-template-work15 {
            width: 29.7cm;
            height: 21cm;
            margin: 0;
            padding: 0;
            background: #ffffff;
            box-sizing: border-box;
            page-break-inside: avoid;
            position: relative;
            display: flex !important;
            flex-direction: column;
            font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', 'Segoe UI', Arial, sans-serif;
          }
          .a4-landscape-page-template-work15:not(:last-child) {
            page-break-after: always;
            break-after: page;
          }
          .a4-landscape-page-header-work15 {
            width: 100%;
            height: 1.5cm;
            flex-shrink: 0;
            padding: 0.5cm 0.8cm 0 0.8cm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .print-header-work15 {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .print-header-text-work15 {
            font-size: 11pt;
            font-weight: 700;
            color: #000;
          }
          .print-header-work15::after {
            content: '';
            width: 100%;
            height: 1px;
            background-color: #333;
            margin-top: 0.3cm;
          }
          .a4-landscape-page-content-work15 {
            width: 100%;
            flex: 1;
            padding: 0.4cm 0.8cm 1cm 0.8cm;
            box-sizing: border-box;
            overflow: visible;
          }
          .quiz-content-work15 {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .problem-instruction-work15 {
            font-weight: 800;
            font-size: 11pt;
            background: #F0F0F0;
            color: #000000;
            padding: 0.7rem 0.6rem;
            border-radius: 8px;
            margin: 0 0 0.8rem 0;
            width: 100%;
            box-sizing: border-box;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .problem-instruction-text-work15 {
            flex: 1 1 auto;
          }
          .problem-type-label-work15 {
            margin-left: 0.5cm;
            font-size: 10pt;
            font-weight: 700;
            color: #000000;
          }
          .word-list-container-work15 {
            display: flex;
            gap: 0.5cm;
            width: 100%;
            margin: 1rem 0;
          }
          .word-list-column-work15 {
            flex: 1 1 50%;
            width: 50%;
          }
          .word-list-table-work15 {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
            font-size: 9pt;
            background: #ffffff;
            border: 2px solid #000000;
          }
          .word-list-table-work15 th {
            background: #e3f2fd;
            color: #000000;
            font-weight: 700;
            font-size: 9pt;
            padding: 0.35rem;
            text-align: center;
            border: 1px solid #000000;
          }
          .word-list-table-work15 td {
            border: 1px solid #000000;
            padding: 0.35rem;
            text-align: left;
            font-size: 9pt;
            font-weight: 500;
            color: #000000;
          }
          .word-list-table-work15 td:first-child,
          .word-list-table-work15 th:first-child {
            text-align: center;
            width: 15%;
          }
          .word-list-table-work15 td:nth-child(2),
          .word-list-table-work15 th:nth-child(2),
          .word-list-table-work15 td:nth-child(3),
          .word-list-table-work15 th:nth-child(3) {
            width: 42.5%;
          }
          .word-list-table-work15 tr:nth-child(even) {
            background: #f8f9fa;
          }
          .word-list-table-work15 tr:nth-child(odd) {
            background: #ffffff;
          }
          .word-list-table-work15 .answer-cell {
            color: #1976d2 !important;
            font-weight: 700 !important;
            background: #f0f8ff !important;
          }
          @media screen {
            #work15-print-overlay,
            #work15-print-overlay-answer {
              display: none !important;
              visibility: hidden !important;
              left: -9999px !important;
              opacity: 0 !important;
              z-index: -1 !important;
              position: absolute !important;
              overflow: hidden !important;
            }
          }
          @media print {
            body#work15-print-active * {
              visibility: visible !important;
            }
            .only-print-work15 {
              display: block !important;
            }
            #work15-print-overlay,
            #work15-print-overlay-answer {
              display: block !important;
              visibility: visible !important;
              left: 0 !important;
              opacity: 1 !important;
              z-index: 9999 !important;
              position: fixed !important;
              overflow: hidden !important;
              width: 100% !important;
              height: 100% !important;
            }
          }
        `;
        
        // React 컴포넌트를 정적 HTML로 렌더링
        const markup = ReactDOMServer.renderToStaticMarkup(
          <HistoryPrintWork15 data={data} isAnswerMode={false} />
        );
        
        console.log('🖨️ [QuizDisplayPage] 유형#15 인쇄(문제) - 렌더링된 마크업 길이:', markup.length);
        
        // 기존 printContainer 제거
        if (printContainer && printContainer.parentNode) {
          printContainer.parentNode.removeChild(printContainer);
        }
        
        // 오버레이 생성
        const overlayId = 'work15-print-overlay';
        const existingOverlay = document.getElementById(overlayId);
        if (existingOverlay && existingOverlay.parentNode) {
          existingOverlay.parentNode.removeChild(existingOverlay);
        }
        
        const overlay = document.createElement('div');
        overlay.id = overlayId;
        Object.assign(overlay.style, {
          position: 'fixed',
          inset: '0',
          backgroundColor: '#ffffff',
          zIndex: '9999',
          overflow: 'hidden',
          width: '100%',
          height: '100%'
        } as Partial<CSSStyleDeclaration>);
        
        // 오버레이에 인쇄용 스타일 + 마크업 주입
        overlay.innerHTML = `
          <style>${PRINT_STYLES}</style>
          <div style="width: 100%; height: 100%; overflow: hidden; margin: 0; padding: 0;">
            ${markup}
          </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 오버레이 내부의 모든 요소에 스크롤바 방지 스타일 적용
        const overlayContent = overlay.querySelector('div');
        if (overlayContent) {
          overlayContent.style.overflow = 'hidden';
          overlayContent.style.width = '100%';
          overlayContent.style.height = '100%';
          overlayContent.style.margin = '0';
          overlayContent.style.padding = '0';
        }
        
        // body에 임시 id를 부여하여 PRINT_STYLES 내 @media print 규칙이 적용되도록 함
        const prevBodyId = document.body.getAttribute('id');
        document.body.setAttribute('id', 'work15-print-active');
        
        // 약간의 지연 후 인쇄 실행
        setTimeout(() => {
          window.print();
          
          // window.print() 호출 직후 즉시 오버레이 숨기기
          overlay.style.display = 'none';
          overlay.style.visibility = 'hidden';
          overlay.style.left = '-9999px';
          overlay.style.opacity = '0';
          overlay.style.zIndex = '-1';
          
          // 인쇄 후 오버레이 정리
          setTimeout(() => {
            const ov = document.getElementById(overlayId);
            if (ov && ov.parentNode) {
              ov.parentNode.removeChild(ov);
            }
            
            // body id 되돌리기
            if (prevBodyId) {
              document.body.setAttribute('id', prevBodyId);
            } else {
              document.body.removeAttribute('id');
            }
            
            // appRoot 다시 표시
            if (appRoot) {
              appRoot.style.display = '';
            }
          }, 100);
        }, 300);
        
        return; // 오버레이 방식 사용 시 root.render 호출하지 않음
        } else if (fileFormat === 'doc') {
          // DOC 저장은 일반 방식으로 처리 (아래 setTimeout 내부에서 root.render 호출)
          // 여기서는 root.render를 호출하지 않음 (setTimeout 내부에서 처리)
        }
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
      } else if (typeId === '14') {
        // 유형#14는 PrintFormatWork14New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work14Data = item.work14Data || item.quiz || item.data?.work14Data || item.data || item;
          
          return {
            id: item.id || work14Data.id,
            blankedText: work14Data.blankedText || '',
            correctAnswers: work14Data.correctAnswers || [],
            translation: work14Data.translation || '',
            selectedSentences: work14Data.selectedSentences || []
          };
        });
        root.render(<PrintFormatWork14New quizzes={rawQuizzes} isAnswerMode={false} />);
      } else {
        root.render(<PrintFormatPackage01 packageQuiz={packageQuiz} translatedText={globalTranslatedText} />);
      }
    } else if (packageType === 'P01') {
      root.render(<PrintFormatPackage01 packageQuiz={packageQuiz} isAnswerMode={false} />);
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
    } else if (packageType === '14') {
      // 유형#14는 PrintFormatWork14New 사용 (packageType이 '14'인 경우)
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work14Data = item.work14Data || item.quiz || item.data?.work14Data || item.data || item;
        
        return {
          id: item.id || work14Data.id,
          blankedText: work14Data.blankedText || '',
          correctAnswers: work14Data.correctAnswers || [],
          translation: work14Data.translation || '',
          selectedSentences: work14Data.selectedSentences || []
        };
      });
      root.render(<PrintFormatWork14New quizzes={rawQuizzes} isAnswerMode={false} />);
    } else if (packageType === '15') {
      // 유형#15 (여러 문제일 때) - 나의문제목록에서 불러온 경우
      // DOC 저장은 별도 처리 (오버레이 방식 사용하지 않음)
      if (fileFormat === 'doc') {
        // DOC 저장은 일반 방식으로 처리 (root.render 먼저 호출)
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work15Data = item.work15Data || item.quiz || item.data?.work15Data || item.data || item;
          return {
            words: Array.isArray(work15Data?.words) ? work15Data.words : [],
            quizType: work15Data?.quizType || 'english-to-korean',
            totalQuestions: work15Data?.totalQuestions || (work15Data?.words?.length || 0),
            passage: work15Data?.passage || ''
          };
        });
        
        root.render(<HistoryPrintWork15 data={{ quizzes: rawQuizzes }} isAnswerMode={false} />);
        // DOC 저장은 아래 setTimeout 내부에서 처리됨
      } else if (fileFormat === 'pdf') {
        // PDF 저장은 오버레이 방식 사용
        console.log('🔍 유형#15 인쇄(문제) - 여러 문제 (packageType=15):', {
          packageQuizLength: packageQuiz.length,
          firstItem: packageQuiz[0],
          firstItemKeys: packageQuiz[0] ? Object.keys(packageQuiz[0]) : []
        });
        
        const rawQuizzes = packageQuiz.map((item: any, index: number) => {
        // 여러 방법으로 work15Data 찾기
        const work15Data = item.work15Data || item.quiz || item.data?.work15Data || item.data || item;
        
        console.log(`🔍 유형#15 Quiz ${index + 1} 데이터 추출 (packageType=15, 문제):`, {
          itemKeys: Object.keys(item || {}),
          hasWork15Data: !!item.work15Data,
          work15DataKeys: work15Data ? Object.keys(work15Data) : [],
          work15DataType: typeof work15Data,
          work15DataIsArray: Array.isArray(work15Data),
          hasWords: !!work15Data?.words,
          wordsCount: work15Data?.words?.length || 0,
          wordsType: Array.isArray(work15Data?.words) ? 'array' : typeof work15Data?.words,
          quizType: work15Data?.quizType,
          sampleWords: work15Data?.words?.slice(0, 2)
        });
        
        // work15Data가 WordQuiz 객체인 경우 words 배열 추출
        const words = Array.isArray(work15Data?.words) ? work15Data.words : [];
        
        if (words.length === 0) {
          console.warn(`⚠️ 유형#15 Quiz ${index + 1}에 단어가 없습니다. (문제)`, {
            work15Data,
            work15DataKeys: work15Data ? Object.keys(work15Data) : []
          });
        }
        
        const extracted = {
          words: words,
          quizType: work15Data?.quizType || 'english-to-korean',
          totalQuestions: work15Data?.totalQuestions || words.length || 0,
          passage: work15Data?.passage || ''
        };
        
        console.log(`✅ 유형#15 Quiz ${index + 1} 추출 결과 (packageType=15, 문제):`, {
          wordsCount: extracted.words.length,
          quizType: extracted.quizType,
          sampleWords: extracted.words.slice(0, 2).map((w: any) => ({
            english: w.english,
            korean: w.korean,
            partOfSpeech: w.partOfSpeech
          }))
        });
        
        return extracted;
      });
      
      console.log('🖨️ 유형#15 인쇄(문제) 최종 rawQuizzes (packageType=15):', rawQuizzes);
      console.log('🔍 [QuizDisplayPage] 유형#15 인쇄(문제) - 여러 문제 데이터 확인:', {
        quizzesCount: rawQuizzes.length,
        quizzesWithWords: rawQuizzes.filter((q: any) => q.words && q.words.length > 0).length,
        firstQuizWordsCount: rawQuizzes[0]?.words?.length || 0,
        secondQuizWordsCount: rawQuizzes[1]?.words?.length || 0,
        allQuizzesHaveWords: rawQuizzes.every((q: any) => q.words && q.words.length > 0)
      });
      
      // 유형#15은 오버레이 방식 사용 (Work_15_PassageWordStudy.tsx와 동일)
      // PRINT_STYLES는 위에서 이미 정의됨 (단일 문제 처리 부분)
      const PRINT_STYLES_MULTI = `
        @page {
          size: A4 landscape;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', 'Segoe UI', Arial, sans-serif;
          width: 29.7cm !important;
          height: auto !important;
          min-height: 21cm !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          html, body {
            overflow: visible !important;
            height: auto !important;
          }
        }
        #work15-print-overlay,
        #work15-print-overlay-answer {
          overflow: visible !important;
        }
        #work15-print-overlay > *:not(style),
        #work15-print-overlay-answer > *:not(style) {
          overflow: visible !important;
          width: 100% !important;
          height: auto !important;
          min-height: 21cm !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #work15-print-overlay *,
        #work15-print-overlay-answer * {
          box-sizing: border-box;
        }
        
        .only-print-work15 {
          display: block !important;
        }
        .a4-landscape-page-template-work15 {
          width: 29.7cm !important;
          height: 21cm !important;
          min-height: 21cm !important;
          max-height: 21cm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', 'Segoe UI', Arial, sans-serif !important;
          overflow: hidden !important;
        }
        .a4-landscape-page-template-work15:not(:last-child) {
          page-break-after: always !important;
          break-after: page !important;
          margin-bottom: 0 !important;
        }
        .a4-landscape-page-template-work15:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .a4-landscape-page-header-work15 {
          width: 100%;
          height: 1.5cm;
          flex-shrink: 0;
          padding: 0.5cm 0.8cm 0 0.8cm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .print-header-work15 {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .print-header-text-work15 {
          font-size: 11pt;
          font-weight: 700;
          color: #000;
        }
        .print-header-work15::after {
          content: '';
          width: 100%;
          height: 1px;
          background-color: #333;
          margin-top: 0.3cm;
        }
        .a4-landscape-page-content-work15 {
          width: 100%;
          flex: 1;
          padding: 0.4cm 0.8cm 1cm 0.8cm;
          box-sizing: border-box;
          overflow: visible;
        }
        .quiz-content-work15 {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .problem-instruction-work15 {
          font-weight: 800;
          font-size: 11pt;
          background: #F0F0F0;
          color: #000000;
          padding: 0.7rem 0.6rem;
          border-radius: 8px;
          margin: 0 0 0.8rem 0;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .problem-instruction-text-work15 {
          flex: 1 1 auto;
        }
        .problem-type-label-work15 {
          margin-left: 0.5cm;
          font-size: 10pt;
          font-weight: 700;
          color: #000000;
        }
        .word-list-container-work15 {
          display: flex;
          gap: 0.5cm;
          width: 100%;
          margin: 1rem 0;
          position: relative;
        }
        .word-list-column-work15 {
          flex: 1 1 50%;
          width: 50%;
          display: flex;
          flex-direction: column;
        }
        .quiz-card-work15 {
          width: 100%;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        /* 홀수개 문제인 경우 마지막 페이지: 왼쪽 단에만 배치 */
        .single-quiz-container {
          justify-content: flex-start !important;
        }
        .single-quiz-column {
          flex: 0 0 50% !important;
          max-width: 50% !important;
          width: 50% !important;
        }
        .single-quiz-column .quiz-card-work15 {
          width: 100% !important;
          max-width: 100% !important;
        }
        .word-list-table-work15 {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
          font-size: 9pt;
          background: #ffffff;
          border: 2px solid #000000;
        }
        .word-list-table-work15 th {
          background: #e3f2fd;
          color: #000000;
          font-weight: 700;
          font-size: 9pt;
          padding: 0.35rem;
          text-align: center;
          border: 1px solid #000000;
        }
        .word-list-table-work15 td {
          border: 1px solid #000000;
          padding: 0.35rem;
          text-align: left;
          font-size: 9pt;
          font-weight: 500;
          color: #000000;
        }
        .word-list-table-work15 td:first-child,
        .word-list-table-work15 th:first-child {
          text-align: center;
          width: 15%;
        }
        .word-list-table-work15 td:nth-child(2),
        .word-list-table-work15 th:nth-child(2),
        .word-list-table-work15 td:nth-child(3),
        .word-list-table-work15 th:nth-child(3) {
          width: 42.5%;
        }
        .word-list-table-work15 tr:nth-child(even) {
          background: #f8f9fa;
        }
        .word-list-table-work15 tr:nth-child(odd) {
          background: #ffffff;
        }
        .word-list-table-work15 .answer-cell {
          color: #1976d2 !important;
          font-weight: 700 !important;
          background: #f0f8ff !important;
        }
        @media screen {
          #work15-print-overlay,
          #work15-print-overlay-answer {
            display: none !important;
            visibility: hidden !important;
            left: -9999px !important;
            opacity: 0 !important;
            z-index: -1 !important;
            position: absolute !important;
            overflow: hidden !important;
          }
        }
        @media print {
          body#work15-print-active * {
            visibility: visible !important;
          }
          .only-print-work15 {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            height: auto !important;
          }
          .a4-landscape-page-template-work15 {
            display: flex !important;
            visibility: visible !important;
            width: 29.7cm !important;
            height: 21cm !important;
            min-height: 21cm !important;
            max-height: 21cm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .a4-landscape-page-template-work15:not(:last-child) {
            page-break-after: always !important;
            break-after: page !important;
          }
          .a4-landscape-page-template-work15:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          #work15-print-overlay,
          #work15-print-overlay-answer {
            display: block !important;
            visibility: visible !important;
            left: 0 !important;
            top: 0 !important;
            opacity: 1 !important;
            z-index: 9999 !important;
            position: relative !important; /* fixed에서 relative로 변경 */
            overflow: visible !important;
            width: 100% !important;
            height: auto !important;
            min-height: 42cm !important; /* 2페이지 = 21cm * 2 */
          }
          #work15-print-overlay .only-print-work15,
          #work15-print-overlay-answer .only-print-work15 {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            height: auto !important;
          }
          #work15-print-overlay .a4-landscape-page-template-work15,
          #work15-print-overlay-answer .a4-landscape-page-template-work15 {
            display: flex !important;
            visibility: visible !important;
            width: 29.7cm !important;
            height: 21cm !important;
            min-height: 21cm !important;
            max-height: 21cm !important;
          }
        }
      `;
      
      // React 컴포넌트를 정적 HTML로 렌더링
      const markup = ReactDOMServer.renderToStaticMarkup(
        <HistoryPrintWork15 data={{ quizzes: rawQuizzes }} isAnswerMode={false} />
      );
      
      console.log('🖨️ [QuizDisplayPage] 유형#15 인쇄(문제) - 여러 문제 렌더링된 마크업 길이:', markup.length);
      
      // 기존 printContainer 제거
      if (printContainer && printContainer.parentNode) {
        printContainer.parentNode.removeChild(printContainer);
      }
      
      // 오버레이 생성
      const overlayId = 'work15-print-overlay';
      const existingOverlay = document.getElementById(overlayId);
      if (existingOverlay && existingOverlay.parentNode) {
        existingOverlay.parentNode.removeChild(existingOverlay);
      }
      
      const overlay = document.createElement('div');
      overlay.id = overlayId;
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        backgroundColor: '#ffffff',
        zIndex: '9999',
        overflow: 'visible', // hidden에서 visible로 변경
        width: '100%',
        height: 'auto', // 100%에서 auto로 변경
        minHeight: '42cm' // 2페이지 = 21cm * 2
      } as Partial<CSSStyleDeclaration>);
      
      // 오버레이에 인쇄용 스타일 + 마크업 주입
      overlay.innerHTML = `
        <style>${PRINT_STYLES_MULTI}</style>
        ${markup}
      `;
      
      document.body.appendChild(overlay);
      
        // body에 임시 id를 부여하여 PRINT_STYLES 내 @media print 규칙이 적용되도록 함
        const prevBodyId = document.body.getAttribute('id');
        document.body.setAttribute('id', 'work15-print-active');
        
        // 약간의 지연 후 인쇄 실행
        setTimeout(() => {
          window.print();
          
          // window.print() 호출 직후 즉시 오버레이 숨기기
          overlay.style.display = 'none';
          overlay.style.visibility = 'hidden';
          overlay.style.left = '-9999px';
          overlay.style.opacity = '0';
          overlay.style.zIndex = '-1';
          
          // 인쇄 후 오버레이 정리
          setTimeout(() => {
            const ov = document.getElementById(overlayId);
            if (ov && ov.parentNode) {
              ov.parentNode.removeChild(ov);
            }
            
            // body id 되돌리기
            if (prevBodyId) {
              document.body.setAttribute('id', prevBodyId);
            } else {
              document.body.removeAttribute('id');
            }
            
            // appRoot 다시 표시
            if (appRoot) {
              appRoot.style.display = '';
            }
          }, 100);
        }, 300);
        
        return; // 오버레이 방식 사용 시 root.render 호출하지 않음
      } else if (fileFormat === 'doc') {
        // DOC 저장은 일반 방식으로 처리 (아래 setTimeout 내부에서 root.render 호출)
        // 여기서는 root.render를 호출하지 않음 (setTimeout 내부에서 처리)
      }
    } else if (typeId === '11' || packageType === '11') {
      // 유형#11는 PrintFormatWork11New 사용 (여러 문제인 경우에도)
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work11Data = item.work11Data || item.quiz || item.data?.work11Data || item.data || item;
        
        return {
          id: item.id || work11Data.id,
          sentences: work11Data.sentences || [],
          translations: work11Data.translations || [],
          quizText: work11Data.quizText || ''
        };
      });
      root.render(<PrintFormatWork11New quizzes={rawQuizzes} isAnswerMode={false} />);
    } else {
      root.render(<SimplePrintFormatPackage02 packageQuiz={packageQuiz} />);
    }

    // 유형#07, #08, #09, #10, #11, #13, #14는 원래 인쇄 방식과 동일하게 처리
    // 단, DOC 저장인 경우에는 파일 생성 로직을 실행해야 하므로 return하지 않음
    // 유형#12는 HistoryPrintWork12를 사용하므로 quick print 로직에서 제외
    const shouldUseQuickPrint = (isSingleWork && (typeId === '07' || typeId === '08' || typeId === '09' || typeId === '10' || typeId === '11' || typeId === '13' || typeId === '14' || typeId === '15') || packageType === '14' || packageType === '15' || packageType === '11') && fileFormat === 'pdf';
    
    if (shouldUseQuickPrint) {
      // 원래 방식: activatePrintContainer 후 바로 인쇄 (PDF만)
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
            typeId === '13' ? 'print-style-work13-landscape' :
            typeId === '14' ? 'print-style-work14-landscape' :
            'print-style-work13-landscape'
          );
          if (styleElement) {
            styleElement.remove();
          }
        }, 100);
      }, 500);
      return; // 유형#07, #08, #09, #10, #13, #14 (PDF만)는 여기서 종료
    }

    // 렌더링 완료 후 인쇄 및 파일 생성
    // DOC 저장은 렌더링 시간이 더 필요함 (특히 Work_06, Work_02)
    const renderDelay = fileFormat === 'doc' 
      ? ((packageType === '06' || (isSingleWork && typeId === '06')) ? 2000 : 
         (packageType === '02' || (isSingleWork && typeId === '02')) ? 2000 : 1500)
      : ((packageType === '01' || isType01Single) ? 1000 : 500);
    
    setTimeout(async () => {
      // 파일 생성 및 Firebase Storage 업로드
      try {
        // 유형#01, #02, #03의 경우 실제 렌더링된 컨테이너 ID 사용
        let elementId = containerId;
        if (packageType === '01' || isType01Single) {
          elementId = 'print-root-work01-new';
        } else if (packageType === 'P01') {
          // 패키지#01은 containerId를 그대로 사용 (인쇄(정답)과 동일)
          elementId = containerId;
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
        } else if (packageType === '13' || (isSingleWork && typeId === '13')) {
          elementId = 'print-root-work13-new';
        } else if (packageType === '14' || (isSingleWork && typeId === '14')) {
          elementId = 'print-root-work14-new';
        } else if (packageType === '15' || (isSingleWork && typeId === '15')) {
          elementId = 'print-root-work15-new';
        }
        const element = document.getElementById(elementId);
        if (element) {
          // 디버깅: 실제 DOM에 렌더링된 페이지 요소 확인
          // 유형#12는 .a4-page-template-work12를 사용
          // 패키지#01은 .a4-page-template를 사용
          const pageElements = element.querySelectorAll('.a4-landscape-page-template, .a4-page-template, .a4-page-template-work12, .print-page');
          
          // 패키지#01 전용 디버깅 정보
          if (packageType === 'P01') {
            const htmlElement = document.documentElement;
            const bodyElement = document.body;
            const htmlRect = htmlElement.getBoundingClientRect();
            const bodyRect = bodyElement.getBoundingClientRect();
            const htmlComputed = window.getComputedStyle(htmlElement);
            const bodyComputed = window.getComputedStyle(bodyElement);
            const containerRect = element.getBoundingClientRect();
            const containerComputed = window.getComputedStyle(element);
            const firstPageTemplate = element.querySelector('.a4-page-template');
            const firstPageRect = firstPageTemplate?.getBoundingClientRect();
            const firstPageComputed = firstPageTemplate ? window.getComputedStyle(firstPageTemplate) : null;
            
            console.log('🔍 [패키지#01] 인쇄(문제) 상세 디버깅:', {
              '@page 설정': 'A4 portrait',
              'html 크기': {
                width: htmlRect.width,
                height: htmlRect.height,
                computedWidth: htmlComputed.width,
                computedHeight: htmlComputed.height,
                expectedWidth: '21cm',
                expectedHeight: '29.7cm'
              },
              'body 크기': {
                width: bodyRect.width,
                height: bodyRect.height,
                computedWidth: bodyComputed.width,
                computedHeight: bodyComputed.height
              },
              'container 크기': {
                id: elementId,
                width: containerRect.width,
                height: containerRect.height,
                computedWidth: containerComputed.width,
                computedHeight: containerComputed.height,
                display: containerComputed.display,
                visibility: containerComputed.visibility,
                position: containerComputed.position
              },
              '첫 번째 페이지 템플릿': firstPageTemplate ? {
                width: firstPageRect?.width,
                height: firstPageRect?.height,
                computedWidth: firstPageComputed?.width,
                computedHeight: firstPageComputed?.height,
                expectedWidth: '21cm',
                expectedHeight: '29.7cm'
              } : null,
              'totalPages': pageElements.length,
              'pageTemplates': Array.from(pageElements).map((page, idx) => {
                const rect = page.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(page);
                return {
                  index: idx,
                  id: page.id,
                  className: page.className,
                  width: rect.width,
                  height: rect.height,
                  computedWidth: computedStyle.width,
                  computedHeight: computedStyle.height,
                  pageBreakAfter: computedStyle.pageBreakAfter,
                  breakAfter: computedStyle.breakAfter
                };
              })
            });
          } else {
            console.log('🔍 실제 DOM 페이지 요소 확인 (인쇄 문제):', {
              totalPages: pageElements.length,
              containerId: elementId,
              hasOnlyPrintWork12: element.querySelector('.only-print-work12') !== null,
              hasA4PageTemplateWork12: element.querySelector('.a4-page-template-work12') !== null,
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
        // packageType === '15'인 경우 DOC 저장은 별도 로직에서 처리하므로 여기서는 건너뜀
        if (fileFormat === 'doc' && packageType === '15') {
          // packageType === '15'인 경우 DOC 저장은 아래 별도 로직에서 처리
          // 여기서는 내용 체크를 건너뜀
        } else if (fileFormat === 'doc') {
          const pageElements = element.querySelectorAll('.a4-landscape-page-template, .a4-page-template, .print-page, .a4-landscape-page-template-work15');
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
                const pageElementsRetry = retryElement.querySelectorAll('.a4-landscape-page-template, .a4-page-template, .print-page, .a4-landscape-page-template-work15');
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
                              packageType === '14' ? '유형#14_문제' :
                              packageType === '15' ? '유형#15_문제' :
                              '문제';

          // 유형#12는 PDF는 오버레이 방식, DOC는 기존 방식 사용
          if (typeId === '12' && fileFormat === 'doc') {
            // DOC 저장: HistoryPrintWork12를 printContainer에 렌더링
            const data: any = first.work12Data || first.data?.work12Data || first.data || first;
            const workTypeName = '유형#12_문제';
            
            root.render(<HistoryPrintWork12 data={data} isAnswerMode={false} />);
            
            // 렌더링 대기
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // DOC 저장
            const docElement = document.getElementById(containerId) || printContainer;
            const result = await generateAndUploadFile(
              docElement as HTMLElement,
              userData.uid,
              `${packageType.toLowerCase() || 'quiz'}_problem_${Date.now()}`,
              workTypeName,
              { 
                isAnswerMode: false, 
                orientation: 'portrait',
                fileFormat: 'doc'
              }
            );
            
            console.log(`📁 ${workTypeName} DOC 저장 완료:`, result.fileName);
          } else if ((typeId === '15' || packageType === '15') && fileFormat === 'doc') {
            // 유형#15 DOC 저장: 헤더만 표시하는 전용 컴포넌트 사용
            const workTypeName = '유형#15_문제';
            
            // packageType === '15'인 경우 여러 문제 처리
            if (packageType === '15') {
              const rawQuizzes = packageQuiz.map((item: any) => {
                const work15Data = item.work15Data || item.quiz || item.data?.work15Data || item.data || item;
                return {
                  words: Array.isArray(work15Data?.words) ? work15Data.words : [],
                  quizType: work15Data?.quizType || 'english-to-korean',
                  totalQuestions: work15Data?.totalQuestions || (work15Data?.words?.length || 0),
                  passage: work15Data?.passage || ''
                };
              });
              
              root.render(<HistoryPrintWork15 data={{ quizzes: rawQuizzes }} isAnswerMode={false} />);
            } else {
              // typeId === '15'인 경우 단일 문제 처리
              root.render(<HistoryPrintWork15Doc />);
            }
            
            // 렌더링 대기 (여러 문제인 경우 더 긴 대기 시간 필요)
            const renderWaitTime = packageType === '15' ? 2000 : 1000;
            await new Promise(resolve => setTimeout(resolve, renderWaitTime));
            
            // 렌더링 완료 확인
            const docElement = document.getElementById(containerId) || printContainer;
            if (!docElement) {
              console.error(`❌ DOC 저장 컨테이너를 찾을 수 없습니다: ${containerId}`);
              alert('문서 내용을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
              return;
            }
            
            // 페이지 요소 확인
            const pageElements = docElement.querySelectorAll('.a4-landscape-page-template-work15, .a4-page-template, .print-page');
            const hasContent = pageElements.length > 0 || (docElement.textContent && docElement.textContent.trim().length > 50);
            
            if (!hasContent) {
              console.error(`❌ DOC 저장 컨테이너에 내용이 없습니다: ${containerId}`, {
                pageElementsCount: pageElements.length,
                textContentLength: docElement.textContent?.trim().length || 0
              });
              
              // 추가 대기 후 재시도
              await new Promise(resolve => setTimeout(resolve, 1000));
              const retryPageElements = docElement.querySelectorAll('.a4-landscape-page-template-work15, .a4-page-template, .print-page');
              const retryHasContent = retryPageElements.length > 0 || (docElement.textContent && docElement.textContent.trim().length > 50);
              
              if (!retryHasContent) {
                console.error('❌ 재시도 실패: 여전히 내용이 없습니다');
                alert('문서 내용을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
                return;
              }
            }
            
            console.log(`✅ DOC 저장 컨테이너 확인: ${containerId}, 페이지 수: ${pageElements.length}`);
            
            // DOC 저장
            const result = await generateAndUploadFile(
              docElement as HTMLElement,
              userData.uid,
              `${packageType.toLowerCase() || 'quiz'}_problem_${Date.now()}`,
              workTypeName,
              { 
                isAnswerMode: false, 
                orientation: 'landscape',
                fileFormat: 'doc'
              }
            );
            
            console.log(`📁 ${workTypeName} DOC 저장 완료:`, result.fileName);
          } else {
            // 다른 유형은 기존 로직 사용
            const result = await generateAndUploadFile(
              element as HTMLElement,
              userData.uid,
              `${packageType.toLowerCase() || 'quiz'}_problem_${Date.now()}`,
              workTypeName,
              { 
                isAnswerMode: false, 
                orientation: (packageType === 'P01' || (isSingleWork && !isType01Single && typeId !== '02' && typeId !== '03' && typeId !== '04' && typeId !== '05' && typeId !== '06' && typeId !== '07' && typeId !== '08' && typeId !== '09' && typeId !== '10' && typeId !== '13' && typeId !== '14')) ? 'portrait' : 'landscape',
                fileFormat 
              }
            );
            
            const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
            console.log(`📁 ${workTypeName} ${formatName} 저장 완료:`, result.fileName);
            
            // PDF인 경우에만 브라우저 인쇄
            if (fileFormat === 'pdf') {
              window.print();
            }
          }
        }
      } catch (error) {
        console.error(`❌ 파일 저장 실패 (${fileFormat}):`, error);
      }

      // 인쇄 후 정리
      // 유형#12는 PDF 저장이 비동기로 실행되므로 더 긴 대기 시간 필요
      const cleanupDelay = (typeId === '12' && fileFormat === 'pdf') ? 2000 : (fileFormat === 'pdf' ? 100 : 500);
      setTimeout(() => {
        root.unmount();
        if (printContainer.parentNode) {
          document.body.removeChild(printContainer);
        }
        if (appRoot) {
          appRoot.style.display = 'block';
        }
        const styleElement = document.getElementById('print-style-package');
        if (styleElement) {
          document.head.removeChild(styleElement);
        }
        console.log('✅ 인쇄(문제) 완료');
      }, cleanupDelay);
    }, (packageType === '01' || isType01Single || typeId === '12') ? 1000 : 500); // 유형#01, #12는 렌더링 시간이 더 필요할 수 있음
  };

  // 인쇄(정답) 핸들러
  const handlePrintAnswer = async () => {
    if (!packageQuiz || packageQuiz.length === 0) {
      alert('인쇄할 문제가 없습니다.');
      return;
    }

    console.log('🖨️ 인쇄(정답) 시작', { fileFormat });
    
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
    const isLandscapeType = isSingleWork && (typeId === '01' || typeId === '02' || typeId === '03' || typeId === '04' || typeId === '05' || typeId === '06' || typeId === '07' || typeId === '08' || typeId === '09' || typeId === '10' || typeId === '13' || typeId === '14');
    
    if (packageType === 'P01' || (isSingleWork && !isLandscapeType)) {
      // Package#01 또는 단일 유형(가로 유형 제외): A4 세로
      // 유형#12는 HistoryPrintWork12가 자체 스타일을 가지고 있으므로 명시적인 크기 설정
      if (isSingleWork && typeId === '12') {
        style.textContent = `
          @page {
            margin: 0;
            size: A4 portrait;
          }
          @media print {
            html, body {
              width: 21cm !important;
              height: 29.7cm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #root {
              display: none !important;
            }
          }
        `;
      } else if (packageType === 'P01') {
        // 패키지#01: 유형#12와 동일하게 명시적인 크기 설정
        style.textContent = `
          @page {
            margin: 0;
            size: A4 portrait;
          }
          @media print {
            html, body {
              width: 21cm !important;
              height: 29.7cm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #root {
              display: none !important;
            }
            .a4-page-template {
              width: 21cm !important;
              height: 29.7cm !important;
            }
          }
        `;
      } else {
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
      }
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
    const containerId = packageType === 'P01' || (isSingleWork && !isType01Single && typeId !== '02' && typeId !== '03' && typeId !== '04' && typeId !== '05' && typeId !== '06' && typeId !== '07' && typeId !== '08' && typeId !== '09' && typeId !== '10' && typeId !== '11' && typeId !== '12')
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
                              : (isSingleWork && typeId === '12')
                                ? 'print-root-work12-new-answer'
                                : packageType === '13' || (isSingleWork && typeId === '13')
                                  ? 'print-root-work13-new-answer'
                                  : packageType === '14' || (isSingleWork && typeId === '14')
                                    ? 'print-root-work14-new-answer'
                                    : packageType === '15' || (isSingleWork && typeId === '15')
                                      ? 'print-root-work15-new-answer'
            : 'print-root-package02-answer';
    printContainer.id = containerId;
    
    // DOC 저장인 경우 화면에 보이지 않도록 설정
    if (fileFormat === 'doc') {
      printContainer.style.display = 'none';
      printContainer.style.visibility = 'hidden';
      printContainer.style.position = 'absolute';
      printContainer.style.left = '-9999px';
      printContainer.style.top = '-9999px';
      printContainer.style.width = '1px';
      printContainer.style.height = '1px';
      printContainer.style.overflow = 'hidden';
    } else {
      // 유형#12인 경우 인쇄용 컨테이너 스타일 명시적 설정
      if (isSingleWork && typeId === '12') {
        printContainer.style.display = 'block';
        printContainer.style.visibility = 'visible';
        printContainer.style.position = 'relative';
        printContainer.style.width = 'auto';
        printContainer.style.height = 'auto';
        printContainer.style.overflow = 'visible';
      }
    }
    
    document.body.appendChild(printContainer);

    // 기존 화면 숨기기 (DOC 저장인 경우에는 숨기지 않음)
    const appRoot = document.getElementById('root');
    if (appRoot && fileFormat !== 'doc') {
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
        console.log('🖨️ [QuizDisplayPage] 유형#12 인쇄(정답) 데이터:', {
          hasWork12Data: !!first.work12Data,
          hasData: !!first.data,
          dataKeys: data ? Object.keys(data) : [],
          wordsCount: data?.words?.length || 0,
          sampleWords: data?.words?.slice(0, 3),
          quizType: data?.quizType
        });
        
        // 유형#12는 PDF는 오버레이 방식, DOC는 기존 방식 사용
        if (fileFormat === 'pdf') {
          const workTypeName = '유형#12_정답';
          
          // React 컴포넌트를 정적 HTML로 렌더링
          const markup = ReactDOMServer.renderToStaticMarkup(
            <HistoryPrintWork12 data={data} isAnswerMode={true} />
          );
          
          console.log('🖨️ [QuizDisplayPage] 유형#12 인쇄(정답) - 렌더링된 마크업 길이:', markup.length);
          console.log('🖨️ [QuizDisplayPage] 유형#12 인쇄(정답) - 마크업 샘플:', markup.substring(0, 500));
          
          // 기존 printContainer 제거
          if (printContainer && printContainer.parentNode) {
            printContainer.parentNode.removeChild(printContainer);
          }
          
          // 오버레이 생성
          const overlayId = 'work12-print-overlay-answer';
          const existingOverlay = document.getElementById(overlayId);
          if (existingOverlay && existingOverlay.parentNode) {
            existingOverlay.parentNode.removeChild(existingOverlay);
          }
          
          const overlay = document.createElement('div');
          overlay.id = overlayId;
          Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            backgroundColor: '#ffffff',
            zIndex: '9999',
            overflow: 'hidden',
            width: '100%',
            height: '100%'
          } as Partial<CSSStyleDeclaration>);
          
          // PrintFormat12.css의 스타일을 가져와서 오버레이에 주입
          const PRINT_STYLES = `
            @page {
              size: A4 portrait !important;
              margin: 0 !important;
            }
            html, body {
              width: 21cm !important;
              height: 29.7cm !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', 'Segoe UI', Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media print {
              html, body {
                width: 21cm !important;
                height: 29.7cm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
              }
              .a4-page-template-work12 {
                width: 21cm !important;
                max-width: 21cm !important;
                height: 29.7cm !important;
                max-height: 29.7cm !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
              }
            }
            .a4-page-template-work12 {
              width: 21cm !important;
              max-width: 21cm !important;
              height: 29.7cm !important;
              max-height: 29.7cm !important;
              box-sizing: border-box;
              padding: 0;
              margin: 0;
              display: flex;
              flex-direction: column;
            }
            .a4-page-header-work12 {
              width: 100%;
              margin-bottom: 0.4cm;
              text-align: center;
            }
            .print-header-text-work12 {
              font-size: 11pt;
              font-weight: 700;
            }
            .a4-page-content-work12 {
              width: 100% !important;
              flex: 1;
              display: flex;
              flex-direction: column;
              min-height: 0;
            }
            .problem-instruction-work12 {
              font-weight: 800;
              font-size: 11pt;
              background: #F0F0F0;
              color: #000000;
              padding: 0.6rem 0.5rem;
              border-radius: 6px;
              margin: 0 0 0.6rem 0;
              box-sizing: border-box;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .problem-instruction-text-work12 {
              flex: 1 1 auto;
            }
            .problem-type-label-work12 {
              margin-left: 0.5cm;
              font-size: 10pt;
              font-weight: 700;
              color: #000000;
            }
            .word-list-container-work12 {
              display: flex !important;
              gap: 0.5cm;
              width: 100% !important;
              margin: 0;
              flex: 1;
              min-height: 0;
              align-items: stretch;
            }
            .word-list-column-work12 {
              flex: 1 1 50% !important;
              width: 50% !important;
              min-width: 0;
            }
            .word-list-table-work12 {
              width: 100% !important;
              max-width: 100% !important;
              border-collapse: collapse;
              margin: 0;
              font-size: 10pt;
              background: #ffffff;
              border: 2px solid #000000;
            }
            .word-list-table-work12 th {
              background: #e3f2fd;
              color: #000000;
              font-weight: 700;
              font-size: 10pt;
              padding: 0.35rem 0.5rem;
              text-align: center;
              border: 1px solid #000000;
            }
            .word-list-table-work12 td {
              border: 1px solid #000000;
              padding: 0.35rem 0.5rem;
              text-align: left;
              font-size: 10pt;
              font-weight: 500;
              color: #000000;
            }
            .word-list-table-work12 td:first-child,
            .word-list-table-work12 th:first-child {
              text-align: center;
              width: 10% !important;
            }
            .word-list-table-work12 th:nth-child(2),
            .word-list-table-work12 td:nth-child(2) {
              width: 36% !important;
            }
            .word-list-table-work12 th:nth-child(3),
            .word-list-table-work12 td:nth-child(3) {
              width: 54% !important;
            }
            .word-list-table-work12 tr:nth-child(even) {
              background: #f8f9fa;
            }
            .word-list-table-work12 tr:nth-child(odd) {
              background: #ffffff;
            }
            .word-list-table-work12 .answer-cell {
              color: #1976d2 !important;
              font-weight: 700 !important;
              background: #f0f8ff !important;
            }
            @media screen {
              #work12-print-overlay-answer {
                display: none !important;
                visibility: hidden !important;
                position: absolute !important;
                left: -9999px !important;
                top: -9999px !important;
                opacity: 0 !important;
                z-index: -1 !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
              }
            }
            @media print {
              body#work12-print-active * {
                visibility: visible !important;
              }
              .only-print-work12 {
                display: block !important;
              }
              #work12-print-overlay-answer {
                display: block !important;
                visibility: visible !important;
                left: 0 !important;
                opacity: 1 !important;
                z-index: 9999 !important;
                position: fixed !important;
                overflow: hidden !important;
                width: 100% !important;
                height: 100% !important;
              }
            }
          `;
          
          // 오버레이에 인쇄용 스타일 + 마크업 주입
          overlay.innerHTML = `
            <style>${PRINT_STYLES}</style>
            ${markup}
          `;
          
          document.body.appendChild(overlay);
          
          // body에 임시 id를 부여하여 PRINT_STYLES 내 @media print 규칙이 적용되도록 함
          const prevBodyId = document.body.getAttribute('id');
          document.body.setAttribute('id', 'work12-print-active');
          
          console.log('🖨️ [QuizDisplayPage] 유형#12 오버레이 추가 완료 (정답)', {
            overlayId,
            hasContent: overlay.innerHTML.length > 0,
            childrenCount: overlay.children.length,
            markupLength: markup.length
          });
          
          // 오버레이가 완전히 렌더링될 때까지 충분한 시간 대기
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(() => {
                // 오버레이 내용이 제대로 렌더링되었는지 확인
                const overlayContent = overlay.querySelector('.only-print-work12');
                console.log('🖨️ [QuizDisplayPage] 인쇄 전 오버레이 확인 (정답):', {
                  overlayExists: !!overlay,
                  overlayContentExists: !!overlayContent,
                  overlayDisplay: window.getComputedStyle(overlay).display,
                  overlayVisibility: window.getComputedStyle(overlay).visibility,
                  overlayRect: overlay.getBoundingClientRect()
                });
                
                window.print();
                
                // 인쇄 다이얼로그가 열린 후 오버레이 숨기기 (더 긴 지연)
                setTimeout(() => {
                  overlay.style.display = 'none';
                  overlay.style.visibility = 'hidden';
                  overlay.style.position = 'absolute';
                  overlay.style.left = '-9999px';
                  overlay.style.top = '-9999px';
                  overlay.style.opacity = '0';
                  overlay.style.zIndex = '-1';
                  overlay.style.width = '0';
                  overlay.style.height = '0';
                  overlay.style.overflow = 'hidden';
                }, 500); // 인쇄 다이얼로그가 열릴 시간 확보
              
              // 인쇄 후 오버레이 정리
              setTimeout(() => {
                // 디버깅: body의 모든 자식 요소 확인
                const bodyChildren = Array.from(document.body.children).map(el => ({
                  id: el.id,
                  tagName: el.tagName,
                  className: el.className,
                  display: window.getComputedStyle(el).display,
                  visibility: window.getComputedStyle(el).visibility,
                  opacity: window.getComputedStyle(el).opacity,
                  position: window.getComputedStyle(el).position,
                  zIndex: window.getComputedStyle(el).zIndex,
                  rect: el.getBoundingClientRect()
                }));
                console.log('🔍 [QuizDisplayPage] 인쇄 후 body 자식 요소 확인 (정답):', bodyChildren);
                
                // work12 관련 모든 요소 찾기
                const work12Elements = document.querySelectorAll('[id*="work12"], [class*="work12"], [id*="print-root"]');
                console.log('🔍 [QuizDisplayPage] work12 관련 요소 확인 (정답):', Array.from(work12Elements).map(el => ({
                  id: el.id,
                  className: el.className,
                  tagName: el.tagName,
                  display: window.getComputedStyle(el).display,
                  visibility: window.getComputedStyle(el).visibility,
                  opacity: window.getComputedStyle(el).opacity,
                  position: window.getComputedStyle(el).position,
                  rect: el.getBoundingClientRect()
                })));
                
                const ov = document.getElementById(overlayId);
                if (ov && ov.parentNode) {
                  console.log('🗑️ [QuizDisplayPage] 오버레이 제거 (정답):', overlayId);
                  ov.parentNode.removeChild(ov);
                }
                
                // body id 되돌리기
                if (prevBodyId) {
                  document.body.setAttribute('id', prevBodyId);
                } else {
                  document.body.removeAttribute('id');
                }
                
                // appRoot 다시 표시
                if (appRoot) {
                  appRoot.style.display = '';
                }
                
                // PDF 저장 (인쇄 미리보기 창이 닫힌 후 실행)
                setTimeout(async () => {
                  console.log('📄 [QuizDisplayPage] PDF 저장 시작 (2초 후, 정답)');
                  
                  // DOM 변경 감지: 화면에 나타나는 요소 추적
                  const domObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                      mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                          const el = node as HTMLElement;
                          const rect = el.getBoundingClientRect();
                          const computed = window.getComputedStyle(el);
                          // 화면에 보이는 요소 감지 (rect가 화면 범위 내에 있고, display가 none이 아니고, opacity가 0이 아닌 경우)
                          if (rect.width > 0 && rect.height > 0 && 
                              computed.display !== 'none' && 
                              computed.visibility !== 'hidden' &&
                              parseFloat(computed.opacity) > 0 &&
                              (rect.top >= 0 || rect.left >= 0 || rect.bottom <= window.innerHeight || rect.right <= window.innerWidth)) {
                            console.warn('⚠️ [QuizDisplayPage] 화면에 나타난 요소 감지 (정답):', {
                              id: el.id,
                              className: el.className,
                              tagName: el.tagName,
                              display: computed.display,
                              visibility: computed.visibility,
                              opacity: computed.opacity,
                              position: computed.position,
                              zIndex: computed.zIndex,
                              rect: rect,
                              innerHTML: el.innerHTML.substring(0, 200)
                            });
                          }
                        }
                      });
                    });
                  });
                  domObserver.observe(document.body, { 
                    childList: true, 
                    subtree: true, 
                    attributes: true, 
                    attributeFilter: ['style', 'class', 'id'] 
                  });
                  
                  try {
                    // printContainer를 다시 생성하여 PDF 저장에 사용 (화면에 보이지 않도록 설정)
                    const pdfContainer = document.createElement('div');
                    pdfContainer.id = 'print-root-work12-new-answer';
                    // display: none으로 시작하여 완전히 숨김 (모든 속성을 !important로 설정)
                    pdfContainer.style.cssText = 'display: none !important; position: fixed !important; left: -99999px !important; top: -99999px !important; width: 21cm !important; height: 29.7cm !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; z-index: -9999 !important; visibility: hidden !important; transform: scale(0) !important;';
                    document.body.appendChild(pdfContainer);
                    
                    console.log('📄 [QuizDisplayPage] PDF 저장용 컨테이너 생성 완료 (정답):', {
                      id: pdfContainer.id,
                      display: window.getComputedStyle(pdfContainer).display,
                      visibility: window.getComputedStyle(pdfContainer).visibility,
                      opacity: window.getComputedStyle(pdfContainer).opacity,
                      position: window.getComputedStyle(pdfContainer).position,
                      rect: pdfContainer.getBoundingClientRect()
                    });
                    
                    // React 렌더링 중에도 계속 숨김 상태 유지
                    const observer = new MutationObserver(() => {
                      if (pdfContainer.style.display !== 'none') {
                        pdfContainer.style.cssText = 'display: none !important; position: fixed !important; left: -99999px !important; top: -99999px !important; width: 21cm !important; height: 29.7cm !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; z-index: -9999 !important; visibility: hidden !important; transform: scale(0) !important;';
                      }
                    });
                    observer.observe(pdfContainer, { attributes: true, attributeFilter: ['style', 'class'] });
                    
                    const pdfRoot = ReactDOM.createRoot(pdfContainer);
                    pdfRoot.render(<HistoryPrintWork12 data={data} isAnswerMode={true} />);
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // 렌더링 후 상태 확인
                    console.log('📄 [QuizDisplayPage] React 렌더링 후 상태 (정답):', {
                      id: pdfContainer.id,
                      display: window.getComputedStyle(pdfContainer).display,
                      visibility: window.getComputedStyle(pdfContainer).visibility,
                      opacity: window.getComputedStyle(pdfContainer).opacity,
                      rect: pdfContainer.getBoundingClientRect(),
                      innerHTML: pdfContainer.innerHTML.substring(0, 200)
                    });
                    
                    // PDF 생성 직전에만 display: block으로 변경 (하지만 여전히 화면 밖에 있고 opacity: 0)
                    observer.disconnect(); // 관찰 중지
                    pdfContainer.style.cssText = 'display: block !important; position: fixed !important; left: -99999px !important; top: -99999px !important; width: 21cm !important; height: 29.7cm !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; z-index: -9999 !important; visibility: visible !important; transform: scale(1) !important;';
                    
                    console.log('📄 [QuizDisplayPage] PDF 생성 직전 상태 (정답):', {
                      id: pdfContainer.id,
                      display: window.getComputedStyle(pdfContainer).display,
                      visibility: window.getComputedStyle(pdfContainer).visibility,
                      opacity: window.getComputedStyle(pdfContainer).opacity,
                      rect: pdfContainer.getBoundingClientRect()
                    });
                    
                    // html2canvas는 opacity: 0인 요소도 캡처할 수 있으므로 visibility 변경 불필요
                    const result = await generateAndUploadFile(
                      pdfContainer as HTMLElement,
                      userData.uid,
                      `${packageType.toLowerCase() || 'quiz'}_answer_${Date.now()}`,
                      workTypeName,
                      { 
                        isAnswerMode: true, 
                        orientation: 'portrait',
                        fileFormat 
                      }
                    );
                    console.log(`📁 ${workTypeName} PDF 저장 완료:`, result.fileName);
                    
                    // PDF 저장 후 즉시 다시 숨기기
                    pdfContainer.style.cssText = 'display: none !important; position: fixed !important; left: -99999px !important; top: -99999px !important; width: 21cm !important; height: 29.7cm !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; z-index: -9999 !important; visibility: hidden !important; transform: scale(0) !important;';
                    
                    // PDF 저장 후 정리
                    pdfRoot.unmount();
                    if (pdfContainer.parentNode) {
                      pdfContainer.parentNode.removeChild(pdfContainer);
                    }
                    
                    // DOM 관찰 중지
                    domObserver.disconnect();
                    console.log('✅ [QuizDisplayPage] PDF 저장 완료 및 DOM 관찰 중지 (정답)');
                  } catch (error) {
                    console.error(`❌ PDF 저장 실패:`, error);
                    // 에러 발생 시에도 DOM 관찰 중지
                    domObserver.disconnect();
                  }
                }, 2000); // 인쇄 미리보기 창이 닫힐 시간 확보
              }, 100);
              }, 300); // 오버레이 렌더링 대기 시간
            });
          });
          
          return; // 오버레이 방식 사용 시 root.render 호출하지 않음
        } else if (fileFormat === 'doc') {
          // DOC 저장: HistoryPrintWork12를 printContainer에 렌더링
          const workTypeName = '유형#12_정답';
          
          root.render(<HistoryPrintWork12 data={data} isAnswerMode={true} />);
          
          // 렌더링 대기
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // DOC 저장
          const docElement = document.getElementById(containerId) || printContainer;
          const result = await generateAndUploadFile(
            docElement as HTMLElement,
            userData.uid,
            `${packageType.toLowerCase() || 'quiz'}_answer_${Date.now()}`,
            workTypeName,
            { 
              isAnswerMode: true, 
              orientation: 'portrait',
              fileFormat: 'doc'
            }
          );
          
          console.log(`📁 ${workTypeName} DOC 저장 완료:`, result.fileName);
        }
      } else if (typeId === '15') {
        const work15Data = first.work15Data || first.data?.work15Data || first.data || first;
        console.log('🔍 [QuizDisplayPage] 유형#15 인쇄(정답) - 단일 문제:', {
          firstKeys: Object.keys(first || {}),
          hasWork15Data: !!work15Data,
          work15DataKeys: work15Data ? Object.keys(work15Data) : [],
          hasWords: !!work15Data?.words,
          wordsCount: work15Data?.words?.length || 0,
          hasQuizzes: !!work15Data?.quizzes,
          quizzesCount: work15Data?.quizzes?.length || 0,
          work15DataType: typeof work15Data,
          work15DataIsArray: Array.isArray(work15Data)
        });
        
        // work15Data가 WordQuiz 객체인 경우 quizzes 배열로 변환
        let data: any;
        if (work15Data?.words && Array.isArray(work15Data.words) && work15Data.words.length > 0) {
          // 단일 WordQuiz 객체인 경우 quizzes 배열로 변환
          data = {
            quizzes: [{
              words: work15Data.words,
              quizType: work15Data.quizType || 'english-to-korean',
              totalQuestions: work15Data.totalQuestions || work15Data.words.length,
              passage: work15Data.passage
            }]
          };
        } else if (work15Data?.quizzes && Array.isArray(work15Data.quizzes)) {
          // 이미 quizzes 배열인 경우
          data = work15Data;
        } else {
          // 그 외의 경우 원본 데이터 사용
          data = work15Data;
        }
        
        console.log('🔍 [QuizDisplayPage] 유형#15 인쇄(정답) - 변환된 데이터:', {
          hasQuizzes: !!data?.quizzes,
          quizzesCount: data?.quizzes?.length || 0,
          firstQuizWordsCount: data?.quizzes?.[0]?.words?.length || 0,
          firstQuizSample: data?.quizzes?.[0]?.words?.slice(0, 2)
        });
        
        // 유형#15은 오버레이 방식 사용 (인쇄(문제)와 동일)
        // PRINT_STYLES는 인쇄(문제) 부분에서 이미 정의됨
        const PRINT_STYLES_ANSWER = `
          @page {
            size: A4 landscape;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', 'Segoe UI', Arial, sans-serif;
            width: 29.7cm !important;
            height: 21cm !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @media print {
            html, body {
              overflow: hidden;
            }
          }
          
          .only-print-work15 {
            display: block !important;
          }
          .a4-landscape-page-template-work15 {
            width: 29.7cm;
            height: 21cm;
            margin: 0;
            padding: 0;
            background: #ffffff;
            box-sizing: border-box;
            page-break-inside: avoid;
            position: relative;
            display: flex !important;
            flex-direction: column;
            font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', 'Segoe UI', Arial, sans-serif;
          }
          .a4-landscape-page-template-work15:not(:last-child) {
            page-break-after: always;
            break-after: page;
          }
          .a4-landscape-page-header-work15 {
            width: 100%;
            height: 1.5cm;
            flex-shrink: 0;
            padding: 0.5cm 0.8cm 0 0.8cm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .print-header-work15 {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .print-header-text-work15 {
            font-size: 11pt;
            font-weight: 700;
            color: #000;
          }
          .print-header-work15::after {
            content: '';
            width: 100%;
            height: 1px;
            background-color: #333;
            margin-top: 0.3cm;
          }
          .a4-landscape-page-content-work15 {
            width: 100%;
            flex: 1;
            padding: 0.4cm 0.8cm 1cm 0.8cm;
            box-sizing: border-box;
            overflow: visible;
          }
          .quiz-content-work15 {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .problem-instruction-work15 {
            font-weight: 800;
            font-size: 11pt;
            background: #F0F0F0;
            color: #000000;
            padding: 0.7rem 0.6rem;
            border-radius: 8px;
            margin: 0 0 0.8rem 0;
            width: 100%;
            box-sizing: border-box;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .problem-instruction-text-work15 {
            flex: 1 1 auto;
          }
          .problem-type-label-work15 {
            margin-left: 0.5cm;
            font-size: 10pt;
            font-weight: 700;
            color: #000000;
          }
          .word-list-container-work15 {
            display: flex;
            gap: 0.5cm;
            width: 100%;
            margin: 1rem 0;
          }
          .word-list-column-work15 {
            flex: 1 1 50%;
            width: 50%;
          }
          .word-list-table-work15 {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
            font-size: 9pt;
            background: #ffffff;
            border: 2px solid #000000;
          }
          .word-list-table-work15 th {
            background: #e3f2fd;
            color: #000000;
            font-weight: 700;
            font-size: 9pt;
            padding: 0.35rem;
            text-align: center;
            border: 1px solid #000000;
          }
          .word-list-table-work15 td {
            border: 1px solid #000000;
            padding: 0.35rem;
            text-align: left;
            font-size: 9pt;
            font-weight: 500;
            color: #000000;
          }
          .word-list-table-work15 td:first-child,
          .word-list-table-work15 th:first-child {
            text-align: center;
            width: 15%;
          }
          .word-list-table-work15 td:nth-child(2),
          .word-list-table-work15 th:nth-child(2),
          .word-list-table-work15 td:nth-child(3),
          .word-list-table-work15 th:nth-child(3) {
            width: 42.5%;
          }
          .word-list-table-work15 tr:nth-child(even) {
            background: #f8f9fa;
          }
          .word-list-table-work15 tr:nth-child(odd) {
            background: #ffffff;
          }
          .word-list-table-work15 .answer-cell {
            color: #1976d2 !important;
            font-weight: 700 !important;
            background: #f0f8ff !important;
          }
          @media screen {
            #work15-print-overlay,
            #work15-print-overlay-answer {
              display: none !important;
              visibility: hidden !important;
              left: -9999px !important;
              opacity: 0 !important;
              z-index: -1 !important;
              position: absolute !important;
              overflow: hidden !important;
            }
          }
          @media print {
            body#work15-print-active * {
              visibility: visible !important;
            }
            .only-print-work15 {
              display: block !important;
            }
            #work15-print-overlay,
            #work15-print-overlay-answer {
              display: block !important;
              visibility: visible !important;
              left: 0 !important;
              opacity: 1 !important;
              z-index: 9999 !important;
              position: fixed !important;
              overflow: hidden !important;
              width: 100% !important;
              height: 100% !important;
            }
          }
        `;
        
        // React 컴포넌트를 정적 HTML로 렌더링
        const markup = ReactDOMServer.renderToStaticMarkup(
          <HistoryPrintWork15 data={data} isAnswerMode={true} />
        );
        
        console.log('🖨️ [QuizDisplayPage] 유형#15 인쇄(정답) - 단일 문제 렌더링된 마크업 길이:', markup.length);
        
        // 기존 printContainer 제거
        if (printContainer && printContainer.parentNode) {
          printContainer.parentNode.removeChild(printContainer);
        }
        
        // 오버레이 생성
        const overlayId = 'work15-print-overlay-answer';
        const existingOverlay = document.getElementById(overlayId);
        if (existingOverlay && existingOverlay.parentNode) {
          existingOverlay.parentNode.removeChild(existingOverlay);
        }
        
        const overlay = document.createElement('div');
        overlay.id = overlayId;
        Object.assign(overlay.style, {
          position: 'fixed',
          inset: '0',
          backgroundColor: '#ffffff',
          zIndex: '9999',
          overflow: 'hidden',
          width: '100%',
          height: '100%'
        } as Partial<CSSStyleDeclaration>);
        
        // 오버레이에 인쇄용 스타일 + 마크업 주입
        overlay.innerHTML = `
          <style>${PRINT_STYLES_ANSWER}</style>
          <div style="width: 100%; height: 100%; overflow: hidden; margin: 0; padding: 0;">
            ${markup}
          </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 오버레이 내부의 모든 요소에 스크롤바 방지 스타일 적용
        const overlayContent = overlay.querySelector('div');
        if (overlayContent) {
          overlayContent.style.overflow = 'hidden';
          overlayContent.style.width = '100%';
          overlayContent.style.height = '100%';
          overlayContent.style.margin = '0';
          overlayContent.style.padding = '0';
        }
        
        // body에 임시 id를 부여하여 PRINT_STYLES 내 @media print 규칙이 적용되도록 함
        const prevBodyId = document.body.getAttribute('id');
        document.body.setAttribute('id', 'work15-print-active');
        
        // 약간의 지연 후 인쇄 실행
        setTimeout(() => {
          window.print();
          
          // window.print() 호출 직후 즉시 오버레이 숨기기
          overlay.style.display = 'none';
          overlay.style.visibility = 'hidden';
          overlay.style.left = '-9999px';
          overlay.style.opacity = '0';
          overlay.style.zIndex = '-1';
          
          // 인쇄 후 오버레이 정리
          setTimeout(() => {
            const ov = document.getElementById(overlayId);
            if (ov && ov.parentNode) {
              ov.parentNode.removeChild(ov);
            }
            
            // body id 되돌리기
            if (prevBodyId) {
              document.body.setAttribute('id', prevBodyId);
            } else {
              document.body.removeAttribute('id');
            }
            
            // appRoot 다시 표시
            if (appRoot) {
              appRoot.style.display = '';
            }
          }, 100);
        }, 300);
        
        return; // 오버레이 방식 사용 시 root.render 호출하지 않음
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
      } else if (typeId === '11') {
        // 유형#11는 PrintFormatWork11New 사용
        const rawQuizzes = packageQuiz.map((item: any) => {
          const work11Data = item.work11Data || item.quiz || item.data?.work11Data || item.data || item;
          
          return {
            id: item.id || work11Data.id,
            sentences: work11Data.sentences || [],
            translations: work11Data.translations || [],
            quizText: work11Data.quizText || ''
          };
        });
        root.render(<PrintFormatWork11New quizzes={rawQuizzes} isAnswerMode={true} />);
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
      } else if (typeId === '14') {
        // 유형#14는 PrintFormatWork14New 사용 (유형#13 로직과 동일하게 구성)
        console.log('🔍 유형#14 인쇄(정답) - packageQuiz 구조:', {
          packageQuizLength: packageQuiz.length,
          firstItem: packageQuiz[0],
          firstItemKeys: packageQuiz[0] ? Object.keys(packageQuiz[0]) : []
        });
        
        const rawQuizzes = packageQuiz.map((item: any, index: number) => {
          // 여러 방법으로 work14Data 찾기
          const work14Data = item.work14Data || item.quiz || item.data?.work14Data || item.data || item;
          
          console.log(`🔍 유형#14 Quiz ${index + 1} 데이터 추출:`, {
            item,
            work14Data,
            hasBlankedText: !!work14Data?.blankedText,
            correctAnswers: work14Data?.correctAnswers,
            selectedSentences: work14Data?.selectedSentences,
            translation: work14Data?.translation
          });
          
          const extracted = {
            id: item.id || work14Data?.id || `quiz-${index}`,
            blankedText: work14Data?.blankedText || '',
            correctAnswers: work14Data?.correctAnswers || work14Data?.selectedSentences || [],
            selectedSentences: work14Data?.selectedSentences || [],
            translation: work14Data?.translation || ''
          };
          
          console.log(`✅ 유형#14 Quiz ${index + 1} 추출 결과:`, extracted);
          
          return extracted;
        });
        
        console.log('🖨️ 유형#14 인쇄(정답) 최종 rawQuizzes:', rawQuizzes);
        root.render(<PrintFormatWork14New quizzes={rawQuizzes} isAnswerMode={true} />);
      } else {
        root.render(<PrintFormatPackage01 packageQuiz={packageQuiz} isAnswerMode={true} translatedText={globalTranslatedText} />);
      }
    } else if (packageType === 'P01') {
      root.render(<PrintFormatPackage01 packageQuiz={packageQuiz} isAnswerMode={true} />);
    } else if (packageType === 'P02') {
      root.render(<PrintFormatPackage02 packageQuiz={packageQuiz} isAnswerMode={true} />);
    } else if (packageType === 'P03') {
      root.render(<PrintFormatPackage03 packageQuiz={packageQuiz} isAnswerMode={true} />);
    } else if (packageType === '13') {
      // 유형#13 (여러 문제일 때)
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
    } else if (packageType === '14') {
      // 유형#14 (여러 문제일 때) - 나의문제목록에서 불러온 경우
      console.log('🔍 유형#14 인쇄(정답) - 여러 문제 (packageType=14):', {
        packageQuizLength: packageQuiz.length,
        firstItem: packageQuiz[0],
        firstItemKeys: packageQuiz[0] ? Object.keys(packageQuiz[0]) : []
      });
      
      const rawQuizzes = packageQuiz.map((item: any, index: number) => {
        // 여러 방법으로 work14Data 찾기
        const work14Data = item.work14Data || item.quiz || item.data?.work14Data || item.data || item;
        
        console.log(`🔍 유형#14 Quiz ${index + 1} 데이터 추출 (packageType=14):`, {
          item,
          work14Data,
          hasBlankedText: !!work14Data?.blankedText,
          correctAnswers: work14Data?.correctAnswers,
          selectedSentences: work14Data?.selectedSentences,
          translation: work14Data?.translation
        });
        
        const extracted = {
          id: item.id || work14Data?.id || `quiz-${index}`,
          blankedText: work14Data?.blankedText || '',
          correctAnswers: work14Data?.correctAnswers || work14Data?.selectedSentences || [],
          selectedSentences: work14Data?.selectedSentences || [],
          translation: work14Data?.translation || ''
        };
        
        console.log(`✅ 유형#14 Quiz ${index + 1} 추출 결과 (packageType=14):`, extracted);
        
        return extracted;
      });
      
      console.log('🖨️ 유형#14 인쇄(정답) 최종 rawQuizzes (packageType=14):', rawQuizzes);
      // 나의문제목록에서 불러온 경우에만 디버그 테두리 표시
      root.render(<PrintFormatWork14New quizzes={rawQuizzes} isAnswerMode={true} showDebugBorders={true} />);
    } else if (packageType === '15') {
      // 유형#15 (여러 문제일 때) - 나의문제목록에서 불러온 경우
      // DOC 저장인 경우 오버레이 렌더링을 건너뛰고 setTimeout 안의 DOC 저장 로직으로 이동
      console.log('🔍 유형#15 fileFormat 확인:', { fileFormat, isDoc: fileFormat === 'doc', isPdf: fileFormat === 'pdf' });
      if (fileFormat === 'doc') {
        // DOC 저장은 setTimeout 안에서 처리하므로 여기서는 건너뜀
        console.log('🔍 유형#15 DOC 저장(정답) - 오버레이 렌더링 건너뜀, setTimeout 안에서 처리');
      } else {
        // PDF 저장인 경우에만 오버레이 방식으로 렌더링
        console.log('🔍 유형#15 인쇄(정답) - 여러 문제 (packageType=15):', {
        packageQuizLength: packageQuiz.length,
        firstItem: packageQuiz[0],
        firstItemKeys: packageQuiz[0] ? Object.keys(packageQuiz[0]) : []
      });
      
      const rawQuizzes = packageQuiz.map((item: any, index: number) => {
        // 여러 방법으로 work15Data 찾기
        const work15Data = item.work15Data || item.quiz || item.data?.work15Data || item.data || item;
        
        console.log(`🔍 유형#15 Quiz ${index + 1} 데이터 추출 (packageType=15, 정답):`, {
          itemKeys: Object.keys(item || {}),
          hasWork15Data: !!item.work15Data,
          work15DataKeys: work15Data ? Object.keys(work15Data) : [],
          work15DataType: typeof work15Data,
          work15DataIsArray: Array.isArray(work15Data),
          hasWords: !!work15Data?.words,
          wordsCount: work15Data?.words?.length || 0,
          wordsType: Array.isArray(work15Data?.words) ? 'array' : typeof work15Data?.words,
          quizType: work15Data?.quizType,
          sampleWords: work15Data?.words?.slice(0, 2)
        });
        
        // work15Data가 WordQuiz 객체인 경우 words 배열 추출
        const words = Array.isArray(work15Data?.words) ? work15Data.words : [];
        
        if (words.length === 0) {
          console.warn(`⚠️ 유형#15 Quiz ${index + 1}에 단어가 없습니다. (정답)`, {
            work15Data,
            work15DataKeys: work15Data ? Object.keys(work15Data) : []
          });
        }
        
        const extracted = {
          words: words,
          quizType: work15Data?.quizType || 'english-to-korean',
          totalQuestions: work15Data?.totalQuestions || words.length || 0,
          passage: work15Data?.passage || ''
        };
        
        console.log(`✅ 유형#15 Quiz ${index + 1} 추출 결과 (packageType=15, 정답):`, {
          wordsCount: extracted.words.length,
          quizType: extracted.quizType,
          sampleWords: extracted.words.slice(0, 2).map((w: any) => ({
            english: w.english,
            korean: w.korean,
            partOfSpeech: w.partOfSpeech
          }))
        });
        
        return extracted;
      });
      
      console.log('🖨️ 유형#15 인쇄(정답) 최종 rawQuizzes (packageType=15):', rawQuizzes);
      console.log('🔍 [QuizDisplayPage] 유형#15 인쇄(정답) - 여러 문제 데이터 확인:', {
        quizzesCount: rawQuizzes.length,
        quizzesWithWords: rawQuizzes.filter((q: any) => q.words && q.words.length > 0).length,
        firstQuizWordsCount: rawQuizzes[0]?.words?.length || 0,
        secondQuizWordsCount: rawQuizzes[1]?.words?.length || 0,
        allQuizzesHaveWords: rawQuizzes.every((q: any) => q.words && q.words.length > 0)
      });
      
      // 유형#15은 오버레이 방식 사용 (인쇄(문제)와 동일)
      // PRINT_STYLES_MULTI는 인쇄(문제) 여러 문제 부분에서 이미 정의됨
      const PRINT_STYLES_MULTI_ANSWER = `
        @page {
          size: A4 landscape;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', 'Segoe UI', Arial, sans-serif;
          width: 29.7cm !important;
          height: auto !important;
          min-height: 21cm !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          html, body {
            overflow: visible !important;
            height: auto !important;
          }
        }
        #work15-print-overlay,
        #work15-print-overlay-answer {
          overflow: visible !important;
        }
        #work15-print-overlay > *:not(style),
        #work15-print-overlay-answer > *:not(style) {
          overflow: visible !important;
          width: 100% !important;
          height: auto !important;
          min-height: 21cm !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #work15-print-overlay *,
        #work15-print-overlay-answer * {
          box-sizing: border-box;
        }
        
        .only-print-work15 {
          display: block !important;
        }
        .a4-landscape-page-template-work15 {
          width: 29.7cm !important;
          height: 21cm !important;
          min-height: 21cm !important;
          max-height: 21cm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Nanum Gothic', 'Segoe UI', Arial, sans-serif !important;
          overflow: hidden !important;
        }
        .a4-landscape-page-template-work15:not(:last-child) {
          page-break-after: always !important;
          break-after: page !important;
          margin-bottom: 0 !important;
        }
        .a4-landscape-page-template-work15:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .a4-landscape-page-header-work15 {
          width: 100%;
          height: 1.5cm;
          flex-shrink: 0;
          padding: 0.5cm 0.8cm 0 0.8cm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .print-header-work15 {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .print-header-text-work15 {
          font-size: 11pt;
          font-weight: 700;
          color: #000;
        }
        .print-header-work15::after {
          content: '';
          width: 100%;
          height: 1px;
          background-color: #333;
          margin-top: 0.3cm;
        }
        .a4-landscape-page-content-work15 {
          width: 100%;
          flex: 1;
          padding: 0.4cm 0.8cm 1cm 0.8cm;
          box-sizing: border-box;
          overflow: visible;
        }
        .quiz-content-work15 {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .problem-instruction-work15 {
          font-weight: 800;
          font-size: 11pt;
          background: #F0F0F0;
          color: #000000;
          padding: 0.7rem 0.6rem;
          border-radius: 8px;
          margin: 0 0 0.8rem 0;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .problem-instruction-text-work15 {
          flex: 1 1 auto;
        }
        .problem-type-label-work15 {
          margin-left: 0.5cm;
          font-size: 10pt;
          font-weight: 700;
          color: #000000;
        }
        .word-list-container-work15 {
          display: flex;
          gap: 0.5cm;
          width: 100%;
          margin: 1rem 0;
          position: relative;
        }
        .word-list-column-work15 {
          flex: 1 1 50%;
          width: 50%;
          display: flex;
          flex-direction: column;
        }
        .quiz-card-work15 {
          width: 100%;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        /* 홀수개 문제인 경우 마지막 페이지: 왼쪽 단에만 배치 */
        .single-quiz-container {
          justify-content: flex-start !important;
        }
        .single-quiz-column {
          flex: 0 0 50% !important;
          max-width: 50% !important;
          width: 50% !important;
        }
        .single-quiz-column .quiz-card-work15 {
          width: 100% !important;
          max-width: 100% !important;
        }
        .word-list-table-work15 {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
          font-size: 9pt;
          background: #ffffff;
          border: 2px solid #000000;
        }
        .word-list-table-work15 th {
          background: #e3f2fd;
          color: #000000;
          font-weight: 700;
          font-size: 9pt;
          padding: 0.35rem;
          text-align: center;
          border: 1px solid #000000;
        }
        .word-list-table-work15 td {
          border: 1px solid #000000;
          padding: 0.35rem;
          text-align: left;
          font-size: 9pt;
          font-weight: 500;
          color: #000000;
        }
        .word-list-table-work15 td:first-child,
        .word-list-table-work15 th:first-child {
          text-align: center;
          width: 15%;
        }
        .word-list-table-work15 td:nth-child(2),
        .word-list-table-work15 th:nth-child(2),
        .word-list-table-work15 td:nth-child(3),
        .word-list-table-work15 th:nth-child(3) {
          width: 42.5%;
        }
        .word-list-table-work15 tr:nth-child(even) {
          background: #f8f9fa;
        }
        .word-list-table-work15 tr:nth-child(odd) {
          background: #ffffff;
        }
        .word-list-table-work15 .answer-cell {
          color: #1976d2 !important;
          font-weight: 700 !important;
          background: #f0f8ff !important;
        }
        @media screen {
          #work15-print-overlay,
          #work15-print-overlay-answer {
            display: none !important;
            visibility: hidden !important;
            left: -9999px !important;
            opacity: 0 !important;
            z-index: -1 !important;
            position: absolute !important;
            overflow: hidden !important;
          }
        }
        @media print {
          body#work15-print-active * {
            visibility: visible !important;
          }
          .only-print-work15 {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            height: auto !important;
          }
          .a4-landscape-page-template-work15 {
            display: flex !important;
            visibility: visible !important;
            width: 29.7cm !important;
            height: 21cm !important;
            min-height: 21cm !important;
            max-height: 21cm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .a4-landscape-page-template-work15:not(:last-child) {
            page-break-after: always !important;
            break-after: page !important;
          }
          .a4-landscape-page-template-work15:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          #work15-print-overlay,
          #work15-print-overlay-answer {
            display: block !important;
            visibility: visible !important;
            left: 0 !important;
            top: 0 !important;
            opacity: 1 !important;
            z-index: 9999 !important;
            position: relative !important; /* fixed에서 relative로 변경 */
            overflow: visible !important;
            width: 100% !important;
            height: auto !important;
            min-height: 42cm !important; /* 2페이지 = 21cm * 2 */
          }
          #work15-print-overlay .only-print-work15,
          #work15-print-overlay-answer .only-print-work15 {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            height: auto !important;
          }
          #work15-print-overlay .a4-landscape-page-template-work15,
          #work15-print-overlay-answer .a4-landscape-page-template-work15 {
            display: flex !important;
            visibility: visible !important;
            width: 29.7cm !important;
            height: 21cm !important;
            min-height: 21cm !important;
            max-height: 21cm !important;
          }
        }
      `;
      
      // React 컴포넌트를 정적 HTML로 렌더링
      const markup = ReactDOMServer.renderToStaticMarkup(
        <HistoryPrintWork15 data={{ quizzes: rawQuizzes }} isAnswerMode={true} />
      );
      
      console.log('🖨️ [QuizDisplayPage] 유형#15 인쇄(정답) - 여러 문제 렌더링된 마크업 길이:', markup.length);
      
      // 기존 printContainer 제거
      if (printContainer && printContainer.parentNode) {
        printContainer.parentNode.removeChild(printContainer);
      }
      
      // 오버레이 생성
      const overlayId = 'work15-print-overlay-answer';
      const existingOverlay = document.getElementById(overlayId);
      if (existingOverlay && existingOverlay.parentNode) {
        existingOverlay.parentNode.removeChild(existingOverlay);
      }
      
      const overlay = document.createElement('div');
      overlay.id = overlayId;
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        backgroundColor: '#ffffff',
        zIndex: '9999',
        overflow: 'visible', // hidden에서 visible로 변경
        width: '100%',
        height: 'auto', // 100%에서 auto로 변경
        minHeight: '42cm' // 2페이지 = 21cm * 2
      } as Partial<CSSStyleDeclaration>);
      
      // 오버레이에 인쇄용 스타일 + 마크업 주입
      overlay.innerHTML = `
        <style>${PRINT_STYLES_MULTI_ANSWER}</style>
        ${markup}
      `;
      
      document.body.appendChild(overlay);
      
        // body에 임시 id를 부여하여 PRINT_STYLES 내 @media print 규칙이 적용되도록 함
        const prevBodyId = document.body.getAttribute('id');
        document.body.setAttribute('id', 'work15-print-active');
        
        // 약간의 지연 후 인쇄 실행 (PDF인 경우에만)
        if (fileFormat === 'pdf') {
          setTimeout(() => {
            window.print();
          
          // window.print() 호출 직후 즉시 오버레이 숨기기
          overlay.style.display = 'none';
          overlay.style.visibility = 'hidden';
          overlay.style.left = '-9999px';
          overlay.style.opacity = '0';
          overlay.style.zIndex = '-1';
          
          // 인쇄 후 오버레이 정리
          setTimeout(() => {
            const ov = document.getElementById(overlayId);
            if (ov && ov.parentNode) {
              ov.parentNode.removeChild(ov);
            }
            
            // body id 되돌리기
            if (prevBodyId) {
              document.body.setAttribute('id', prevBodyId);
            } else {
              document.body.removeAttribute('id');
            }
            
            // appRoot 다시 표시
            if (appRoot) {
              appRoot.style.display = '';
            }
          }, 100);
        }, 300);
        }
      }
      
      // DOC 저장인 경우 오버레이 렌더링을 건너뛰었지만 setTimeout이 실행되도록 return하지 않음
      // PDF 저장인 경우에만 return (오버레이 방식 사용 시 root.render 호출하지 않음)
      if (fileFormat === 'pdf') {
        return; // 오버레이 방식 사용 시 root.render 호출하지 않음
      }
      
      // DOC 저장인 경우 setTimeout이 실행되도록 계속 진행 (return하지 않음)
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
      const rawQuizzes = packageQuiz.map((item: any, index: number) => {
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

        // 디버깅: translation 데이터 확인
        if (process.env.NODE_ENV === 'development' || !translation) {
          console.log(`🔍 Work_10 문제 ${index + 1} translation 추출:`, {
            hasTranslation: !!translation,
            translationLength: translation?.length || 0,
            translationPreview: translation?.substring(0, 100) || '없음',
            work10DataKeys: Object.keys(work10Data),
            work10DataTranslation: work10Data.translation,
            work10DataTranslatedText: work10Data.translatedText,
            itemKeys: Object.keys(item)
          });
        }

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
    } else if (packageType === '11') {
      // 유형#11는 PrintFormatWork11New 사용
      const rawQuizzes = packageQuiz.map((item: any) => {
        const work11Data = item.work11Data || item.quiz || item.data?.work11Data || item.data || item;
        
        return {
          id: item.id || work11Data.id,
          sentences: work11Data.sentences || [],
          translations: work11Data.translations || [],
          quizText: work11Data.quizText || ''
        };
      });
      root.render(<PrintFormatWork11New quizzes={rawQuizzes} isAnswerMode={true} />);
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

    // 유형#07, #08, #09, #10, #11, #13, #14는 원래 인쇄 방식과 동일하게 처리
    if (isSingleWork && (typeId === '07' || typeId === '08' || typeId === '09' || typeId === '10' || typeId === '11' || typeId === '13' || typeId === '14')) {
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
            typeId === '13' ? 'print-style-work13-landscape' :
            'print-style-work14-landscape'
          );
          if (styleElement) {
            styleElement.remove();
          }
          console.log('✅ 인쇄(정답) 완료');
        }, 100);
      }, 500);
      return; // 유형#07, #08, #09, #10, #13, #14는 여기서 종료
    }

    // 렌더링 완료 후 인쇄 및 파일 생성
    // DOC 저장은 렌더링 시간이 더 필요함 (특히 Work_06, Work_02, Work_15)
    const renderDelay = fileFormat === 'doc' 
      ? ((packageType === '06' || (isSingleWork && typeId === '06')) ? 2000 : 
         (packageType === '02' || (isSingleWork && typeId === '02')) ? 2000 :
         (packageType === '15' || (isSingleWork && typeId === '15')) ? 2000 : 1500)
      : ((packageType === '01' || isType01Single) ? 1000 : 500);
    
    console.log('⏰ setTimeout 실행 예정 (정답):', { renderDelay, fileFormat, packageType, typeId });
    setTimeout(async () => {
      console.log('⏰ setTimeout 실행됨 (정답):', { fileFormat, packageType, typeId });
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
        } else if (packageType === '14' || (isSingleWork && typeId === '14')) {
          elementId = 'print-root-work14-new-answer';
        } else if (packageType === '15' || (isSingleWork && typeId === '15')) {
          elementId = 'print-root-work15-new-answer';
        }
        const element = document.getElementById(elementId);
        if (element) {
          // 디버깅: 실제 DOM에 렌더링된 페이지 요소 확인
          // 패키지#01은 .a4-page-template를 사용
          const pageElements = element.querySelectorAll('.a4-landscape-page-template, .a4-page-template, .print-page, .a4-landscape-page-template-work15');
          
          // 패키지#01 전용 디버깅 정보
          if (packageType === 'P01') {
            const htmlElement = document.documentElement;
            const bodyElement = document.body;
            const htmlRect = htmlElement.getBoundingClientRect();
            const bodyRect = bodyElement.getBoundingClientRect();
            const htmlComputed = window.getComputedStyle(htmlElement);
            const bodyComputed = window.getComputedStyle(bodyElement);
            const containerRect = element.getBoundingClientRect();
            const containerComputed = window.getComputedStyle(element);
            const firstPageTemplate = element.querySelector('.a4-page-template');
            const firstPageRect = firstPageTemplate?.getBoundingClientRect();
            const firstPageComputed = firstPageTemplate ? window.getComputedStyle(firstPageTemplate) : null;
            
            console.log('🔍 [패키지#01] 인쇄(정답) 상세 디버깅:', {
              '@page 설정': 'A4 portrait',
              'html 크기': {
                width: htmlRect.width,
                height: htmlRect.height,
                computedWidth: htmlComputed.width,
                computedHeight: htmlComputed.height,
                expectedWidth: '21cm',
                expectedHeight: '29.7cm'
              },
              'body 크기': {
                width: bodyRect.width,
                height: bodyRect.height,
                computedWidth: bodyComputed.width,
                computedHeight: bodyComputed.height
              },
              'container 크기': {
                id: elementId,
                width: containerRect.width,
                height: containerRect.height,
                computedWidth: containerComputed.width,
                computedHeight: containerComputed.height,
                display: containerComputed.display,
                visibility: containerComputed.visibility,
                position: containerComputed.position
              },
              '첫 번째 페이지 템플릿': firstPageTemplate ? {
                width: firstPageRect?.width,
                height: firstPageRect?.height,
                computedWidth: firstPageComputed?.width,
                computedHeight: firstPageComputed?.height,
                expectedWidth: '21cm',
                expectedHeight: '29.7cm'
              } : null,
              'totalPages': pageElements.length,
              'pageTemplates': Array.from(pageElements).map((page, idx) => {
                const rect = page.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(page);
                return {
                  index: idx,
                  id: page.id,
                  className: page.className,
                  width: rect.width,
                  height: rect.height,
                  computedWidth: computedStyle.width,
                  computedHeight: computedStyle.height,
                  pageBreakAfter: computedStyle.pageBreakAfter,
                  breakAfter: computedStyle.breakAfter
                };
              })
            });
          } else {
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
        // packageType === '15'인 경우 DOC 저장은 별도 로직에서 처리하므로 여기서는 건너뜀
        if (fileFormat === 'doc' && packageType === '15') {
          // packageType === '15'인 경우 DOC 저장은 아래 별도 로직에서 처리
          // 여기서는 내용 체크를 건너뜀
        } else if (fileFormat === 'doc') {
          const pageElements = element.querySelectorAll('.a4-landscape-page-template, .a4-page-template, .print-page, .a4-landscape-page-template-work15');
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
                const pageElementsRetry = retryElement.querySelectorAll('.a4-landscape-page-template, .a4-page-template, .print-page, .a4-landscape-page-template-work15');
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
          packageType === '14' ? '유형#14_정답' :
          packageType === '15' ? '유형#15_정답' :
          '정답';
          
          // 유형#15 DOC 저장: 저장(문제)와 동일한 방식으로 처리
          console.log('🔍 setTimeout 안에서 유형#15 DOC 저장 확인:', { typeId, packageType, fileFormat, isDoc: fileFormat === 'doc', condition: (typeId === '15' || packageType === '15') && fileFormat === 'doc' });
          if ((typeId === '15' || packageType === '15') && fileFormat === 'doc') {
            // 유형#15 DOC 저장: 헤더만 표시하는 전용 컴포넌트 사용
            console.log('✅ 유형#15 DOC 저장(정답) 로직 실행 시작');
            const workTypeName = '유형#15_정답';
            
            // packageType === '15'인 경우 여러 문제 처리
            if (packageType === '15') {
              const rawQuizzes = packageQuiz.map((item: any) => {
                const work15Data = item.work15Data || item.quiz || item.data?.work15Data || item.data || item;
                return {
                  words: Array.isArray(work15Data?.words) ? work15Data.words : [],
                  quizType: work15Data?.quizType || 'english-to-korean',
                  totalQuestions: work15Data?.totalQuestions || (work15Data?.words?.length || 0),
                  passage: work15Data?.passage || ''
                };
              });
              
              root.render(<HistoryPrintWork15 data={{ quizzes: rawQuizzes }} isAnswerMode={true} />);
            } else {
              // typeId === '15'인 경우 단일 문제 처리
              root.render(<HistoryPrintWork15Doc />);
            }
            
            // 렌더링 대기 (여러 문제인 경우 더 긴 대기 시간 필요)
            const renderWaitTime = packageType === '15' ? 2000 : 1000;
            await new Promise(resolve => setTimeout(resolve, renderWaitTime));
            
            // 렌더링 완료 확인
            const docElement = document.getElementById(containerId) || printContainer;
            if (!docElement) {
              console.error(`❌ DOC 저장 컨테이너를 찾을 수 없습니다: ${containerId}`);
              alert('문서 내용을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
              return;
            }
            
            // 페이지 요소 확인
            const pageElements = docElement.querySelectorAll('.a4-landscape-page-template-work15, .a4-page-template, .print-page');
            const hasContent = pageElements.length > 0 || (docElement.textContent && docElement.textContent.trim().length > 50);
            
            if (!hasContent) {
              console.error(`❌ DOC 저장 컨테이너에 내용이 없습니다: ${containerId}`, {
                pageElementsCount: pageElements.length,
                textContentLength: docElement.textContent?.trim().length || 0
              });
              
              // 추가 대기 후 재시도
              await new Promise(resolve => setTimeout(resolve, 1000));
              const retryPageElements = docElement.querySelectorAll('.a4-landscape-page-template-work15, .a4-page-template, .print-page');
              const retryHasContent = retryPageElements.length > 0 || (docElement.textContent && docElement.textContent.trim().length > 50);
              
              if (!retryHasContent) {
                console.error('❌ 재시도 실패: 여전히 내용이 없습니다');
                alert('문서 내용을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
                return;
              }
            }
            
            console.log(`✅ DOC 저장 컨테이너 확인: ${containerId}, 페이지 수: ${pageElements.length}`);
            
            // DOC 저장
            const result = await generateAndUploadFile(
              docElement as HTMLElement,
              userData.uid,
              `${packageType.toLowerCase() || 'quiz'}_answer_${Date.now()}`,
              workTypeName,
              { 
                isAnswerMode: true, 
                orientation: 'landscape',
                fileFormat: 'doc'
              }
            );
            
            console.log(`📁 ${workTypeName} DOC 저장 완료:`, result.fileName);
          } else if (typeId === '12' && fileFormat === 'pdf') {
            // 유형#12는 인쇄 미리보기를 먼저 실행한 후 PDF 저장
            // 인쇄 미리보기 먼저 실행
            // 충분한 렌더링 시간 확보
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setTimeout(() => {
                  const onlyPrintElement = printContainer.querySelector('.only-print-work12') as HTMLElement;
                  const pageTemplate = printContainer.querySelector('.a4-page-template-work12') as HTMLElement;
                  const wordTable = printContainer.querySelector('.word-list-table-work12') as HTMLElement;
                  
                  if (onlyPrintElement && pageTemplate) {
                    // 인쇄 미리보기에서 보이도록 스타일 강제 적용 (화면과 인쇄 모두)
                    onlyPrintElement.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; left: auto !important; top: auto !important; width: auto !important; height: auto !important;';
                    pageTemplate.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important; position: relative !important; left: auto !important; top: auto !important; width: 21cm !important; height: 29.7cm !important;';
                    
                    // printContainer도 명시적으로 설정
                    printContainer.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; left: auto !important; top: auto !important; width: auto !important; height: auto !important; overflow: visible !important;';
                    
                    // 상세 디버깅: 요소의 실제 상태 확인
                    const onlyPrintRect = onlyPrintElement.getBoundingClientRect();
                    const pageTemplateRect = pageTemplate.getBoundingClientRect();
                    const printContainerRect = printContainer.getBoundingClientRect();
                    const onlyPrintComputed = window.getComputedStyle(onlyPrintElement);
                    const pageTemplateComputed = window.getComputedStyle(pageTemplate);
                    const printContainerComputed = window.getComputedStyle(printContainer);
                    
                    console.log('✅ 유형#12 인쇄 요소 확인 완료 (정답), 인쇄 시작', {
                      onlyPrintElement: !!onlyPrintElement,
                      pageTemplate: !!pageTemplate,
                      wordTable: !!wordTable,
                      printContainerInBody: document.body.contains(printContainer),
                      onlyPrintRect: {
                        width: onlyPrintRect.width,
                        height: onlyPrintRect.height,
                        top: onlyPrintRect.top,
                        left: onlyPrintRect.left,
                        visible: onlyPrintRect.width > 0 && onlyPrintRect.height > 0
                      },
                      pageTemplateRect: {
                        width: pageTemplateRect.width,
                        height: pageTemplateRect.height,
                        top: pageTemplateRect.top,
                        left: pageTemplateRect.left,
                        visible: pageTemplateRect.width > 0 && pageTemplateRect.height > 0
                      },
                      printContainerRect: {
                        width: printContainerRect.width,
                        height: printContainerRect.height,
                        top: printContainerRect.top,
                        left: printContainerRect.left,
                        visible: printContainerRect.width > 0 && printContainerRect.height > 0
                      },
                      onlyPrintComputed: {
                        display: onlyPrintComputed.display,
                        visibility: onlyPrintComputed.visibility,
                        opacity: onlyPrintComputed.opacity,
                        position: onlyPrintComputed.position
                      },
                      pageTemplateComputed: {
                        display: pageTemplateComputed.display,
                        visibility: pageTemplateComputed.visibility,
                        opacity: pageTemplateComputed.opacity,
                        position: pageTemplateComputed.position,
                        width: pageTemplateComputed.width,
                        height: pageTemplateComputed.height
                      },
                      printContainerComputed: {
                        display: printContainerComputed.display,
                        visibility: printContainerComputed.visibility,
                        opacity: printContainerComputed.opacity,
                        position: printContainerComputed.position
                      },
                      innerHTMLLength: printContainer.innerHTML.length,
                      innerHTMLPreview: printContainer.innerHTML.substring(0, 500)
                    });
                    
                    // 인쇄 미리보기에서 보이도록 #root를 일시적으로 표시
                    const appRoot = document.getElementById('root');
                    const originalRootDisplay = appRoot ? appRoot.style.display : '';
                    if (appRoot) {
                      appRoot.style.display = 'block';
                      console.log('🔧 #root를 일시적으로 표시함 (정답):', {
                        originalDisplay: originalRootDisplay,
                        newDisplay: appRoot.style.display
                      });
                    }
                    
                    // 추가 대기 후 인쇄 (브라우저가 스타일을 적용할 시간 확보)
                    setTimeout(() => {
                      // 인쇄 전 최종 상태 확인
                      const finalOnlyPrintRect = onlyPrintElement.getBoundingClientRect();
                      const finalPageTemplateRect = pageTemplate.getBoundingClientRect();
                      const finalPrintContainerRect = printContainer.getBoundingClientRect();
                      
                      console.log('🖨️ window.print() 호출 전 최종 상태 (정답):', {
                        onlyPrintVisible: finalOnlyPrintRect.width > 0 && finalOnlyPrintRect.height > 0,
                        pageTemplateVisible: finalPageTemplateRect.width > 0 && finalPageTemplateRect.height > 0,
                        printContainerVisible: finalPrintContainerRect.width > 0 && finalPrintContainerRect.height > 0,
                        onlyPrintSize: { width: finalOnlyPrintRect.width, height: finalOnlyPrintRect.height },
                        pageTemplateSize: { width: finalPageTemplateRect.width, height: finalPageTemplateRect.height },
                        printContainerSize: { width: finalPrintContainerRect.width, height: finalPrintContainerRect.height },
                        bodyChildren: Array.from(document.body.children).map(el => ({
                          id: el.id,
                          tagName: el.tagName,
                          className: el.className,
                          display: window.getComputedStyle(el).display,
                          visibility: window.getComputedStyle(el).visibility
                        }))
                      });
                      
                      window.print();
                      
                      // 인쇄 후 #root 다시 숨기기
                      setTimeout(() => {
                        if (appRoot) {
                          appRoot.style.display = originalRootDisplay || 'none';
                        }
                      }, 100);
                      
                      // 인쇄 후 PDF 저장 (비동기로 실행하여 인쇄 미리보기가 먼저 열리도록)
                      setTimeout(async () => {
                        try {
                          const result = await generateAndUploadFile(
                            element as HTMLElement,
                            userData.uid,
                            `${packageType.toLowerCase() || 'quiz'}_answer_${Date.now()}`,
                            workTypeName,
                            { 
                              isAnswerMode: true, 
                              orientation: 'portrait',
                              fileFormat 
                            }
                          );
                          console.log(`📁 ${workTypeName} PDF 저장 완료:`, result.fileName);
                        } catch (error) {
                          console.error(`❌ PDF 저장 실패:`, error);
                        }
                      }, 1000);
                    }, 300);
                  } else {
                    console.warn('⚠️ 유형#12 인쇄 요소를 찾을 수 없습니다 (정답).', {
                      onlyPrintElement: !!onlyPrintElement,
                      pageTemplate: !!pageTemplate,
                      printContainerExists: !!printContainer,
                      printContainerInBody: document.body.contains(printContainer),
                      printContainerHTML: printContainer.innerHTML.substring(0, 200)
                    });
                    // 요소를 찾을 수 없어도 인쇄 시도
                    setTimeout(() => {
                      window.print();
                      // PDF 저장도 시도
                      setTimeout(async () => {
                        try {
                          const result = await generateAndUploadFile(
                            element as HTMLElement,
                            userData.uid,
                            `${packageType.toLowerCase() || 'quiz'}_answer_${Date.now()}`,
                            workTypeName,
                            { 
                              isAnswerMode: true, 
                              orientation: 'portrait',
                              fileFormat 
                            }
                          );
                          console.log(`📁 ${workTypeName} PDF 저장 완료:`, result.fileName);
                        } catch (error) {
                          console.error(`❌ PDF 저장 실패:`, error);
                        }
                      }, 1000);
                    }, 500);
                  }
                }, 500);
              });
            });
          } else {
            // 다른 유형은 기존 로직 사용
            const result = await generateAndUploadFile(
              element as HTMLElement,
              userData.uid,
              `${packageType.toLowerCase() || 'quiz'}_answer_${Date.now()}`,
              workTypeName,
              { 
                isAnswerMode: true, 
                orientation: (packageType === 'P01' || (isSingleWork && !isType01Single && typeId !== '02' && typeId !== '03' && typeId !== '04' && typeId !== '05' && typeId !== '06' && typeId !== '07' && typeId !== '08' && typeId !== '09' && typeId !== '10' && typeId !== '13' && typeId !== '14')) ? 'portrait' : 'landscape',
                fileFormat 
              }
            );
            
            const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
            console.log(`📁 ${workTypeName} ${formatName} 저장 완료:`, result.fileName);
            
            // PDF인 경우에만 브라우저 인쇄
            if (fileFormat === 'pdf') {
              window.print();
            }
          }
        }
      } catch (error) {
        console.error(`❌ 파일 저장 실패 (${fileFormat}):`, error);
      }

      // 인쇄 후 정리
      // 유형#12는 PDF 저장이 비동기로 실행되므로 더 긴 대기 시간 필요
      const cleanupDelay = (typeId === '12' && fileFormat === 'pdf') ? 2000 : (fileFormat === 'pdf' ? 100 : 500);
      setTimeout(() => {
        root.unmount();
        if (printContainer.parentNode) {
          document.body.removeChild(printContainer);
        }
        if (appRoot) {
          appRoot.style.display = 'block';
        }
        const styleElement = document.getElementById('print-style-package-answer');
        if (styleElement) {
          document.head.removeChild(styleElement);
        }
        console.log('✅ 인쇄(정답) 완료');
      }, cleanupDelay);
    }, (packageType === '01' || isType01Single || typeId === '12') ? 1000 : 500); // 유형#01, #12는 렌더링 시간이 더 필요할 수 있음
  };

  // 목록보기 버튼
  const handleBackToList = () => {
    const state = location.state as any;
    const returnPage = state?.returnPage;
    const filterUserId = state?.filterUserId;
    navigate('/quiz-list', {
      state: {
        ...(returnPage && { returnPage }),
        ...(filterUserId && { filterUserId })
      }
    });
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
            onClick={() => {
              console.log('🔘 저장(정답) 버튼 클릭:', { fileFormat, buttonText: fileFormat === 'pdf' ? '🖨️인쇄(정답)' : '💾저장(정답)' });
              handlePrintAnswer();
            }}
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
