import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, UnderlineType } from 'docx';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export type FileFormat = 'pdf' | 'doc';

export interface PDFGenerationOptions {
  isAnswerMode?: boolean;
  orientation?: 'portrait' | 'landscape';
  filename?: string;
}

export interface FileGenerationOptions extends PDFGenerationOptions {
  fileFormat?: FileFormat;
}

// HTML 요소를 PDF로 변환하여 Firebase Storage에 업로드
export const generateAndUploadPDF = async (
  element: HTMLElement,
  userId: string,
  historyId: string,
  workTypeName: string,
  options: PDFGenerationOptions = {}
): Promise<{ url: string; fileName: string; size: number }> => {
  try {
    const { isAnswerMode = false, orientation = 'portrait' } = options;
    
    // Package#02인지 확인: .print-page 또는 .a4-landscape-page-template 요소가 있는지 확인
    // 디버깅: 요소 구조 확인
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 PDF 생성 요소 확인:', {
        elementId: element.id,
        elementClass: element.className,
        elementTag: element.tagName,
        hasPrintPage: element.querySelector('.print-page') !== null,
        hasA4Template: element.querySelector('.a4-landscape-page-template') !== null,
        isAnswerMode
      });
    }
    
    const pageElements = element.querySelectorAll('.print-page, .a4-landscape-page-template');
    const hasMultiplePages = pageElements.length > 0;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📄 페이지 요소 검색 결과:', {
        totalPages: pageElements.length,
        pageIds: Array.from(pageElements).map(el => (el as HTMLElement).id),
        hasMultiplePages
      });
    }
    
    // PDF 생성
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    if (hasMultiplePages) {
      // 여러 페이지가 있는 경우 (Package#02): 각 페이지를 개별 PDF 페이지로 추가
      console.log(`📄 ${pageElements.length}개 페이지를 개별 PDF 페이지로 변환 중...`);
      
      // A4 가로 크기 (mm 단위)
      const A4_LANDSCAPE_WIDTH_MM = 297; // 가로
      const A4_LANDSCAPE_HEIGHT_MM = 210; // 세로
      // 픽셀 변환 (96 DPI 기준)
      const MM_TO_PX = 96 / 25.4; // 1mm = 약 3.78px
      const A4_LANDSCAPE_WIDTH_PX = A4_LANDSCAPE_WIDTH_MM * MM_TO_PX;
      const A4_LANDSCAPE_HEIGHT_PX = A4_LANDSCAPE_HEIGHT_MM * MM_TO_PX;
      
      for (let i = 0; i < pageElements.length; i++) {
        const pageElement = pageElements[i] as HTMLElement;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`📄 페이지 ${i + 1}/${pageElements.length} 처리 시작:`, {
            pageId: pageElement.id,
            pageClass: pageElement.className,
            pageRect: pageElement.getBoundingClientRect()
          });
        }
        
        // 첫 페이지가 아니면 새 PDF 페이지 추가
        if (i > 0) {
          pdf.addPage();
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ PDF 페이지 ${i + 1} 추가됨`);
          }
        }
        
        // 현재 페이지의 위치와 크기 계산
        const pageRect = pageElement.getBoundingClientRect();
        const originalStyles = {
          position: pageElement.style.position,
          top: pageElement.style.top,
          left: pageElement.style.left,
          display: pageElement.style.display,
          visibility: pageElement.style.visibility,
          opacity: pageElement.style.opacity,
          transform: pageElement.style.transform,
          zIndex: pageElement.style.zIndex
        };
        
        // 다른 페이지 요소들을 완전히 숨기기
        const hiddenElements: Array<{ el: HTMLElement; styles: Partial<CSSStyleDeclaration> }> = [];
        pageElements.forEach((el, idx) => {
          if (idx !== i) {
            const hiddenEl = el as HTMLElement;
            const hiddenStyles = {
              display: hiddenEl.style.display,
              visibility: hiddenEl.style.visibility,
              opacity: hiddenEl.style.opacity,
              position: hiddenEl.style.position
            };
            hiddenEl.style.display = 'none';
            hiddenEl.style.visibility = 'hidden';
            hiddenEl.style.opacity = '0';
            hiddenEl.style.position = 'fixed';
            hiddenEl.style.left = '-99999px';
            hiddenEl.style.top = '-99999px';
            hiddenElements.push({ el: hiddenEl, styles: hiddenStyles });
          }
        });
        
        // 임시 컨테이너를 try 블록 밖에서 선언 (finally에서 접근 가능하도록)
        let tempContainer: HTMLElement | null = null;
        
        try {
          // 현재 페이지 요소를 완전히 격리하기 위해 임시 컨테이너 생성
          tempContainer = document.createElement('div');
          tempContainer.id = `temp-pdf-page-${i}`;
          tempContainer.style.position = 'fixed';
          tempContainer.style.top = '0px';
          tempContainer.style.left = '0px';
          tempContainer.style.width = `${A4_LANDSCAPE_WIDTH_PX}px`;
          tempContainer.style.height = `${A4_LANDSCAPE_HEIGHT_PX}px`;
          tempContainer.style.overflow = 'hidden';
          tempContainer.style.backgroundColor = '#ffffff';
          tempContainer.style.zIndex = '99999';
          document.body.appendChild(tempContainer);
          
          // 현재 페이지 요소를 임시 컨테이너로 이동
          const clonedPage = pageElement.cloneNode(true) as HTMLElement;
          clonedPage.style.position = 'relative';
          clonedPage.style.top = '0px';
          clonedPage.style.left = '0px';
          clonedPage.style.width = `${A4_LANDSCAPE_WIDTH_PX}px`;
          clonedPage.style.height = `${A4_LANDSCAPE_HEIGHT_PX}px`;
          clonedPage.style.display = 'block';
          clonedPage.style.visibility = 'visible';
          clonedPage.style.opacity = '1';
          clonedPage.style.transform = 'none';
          clonedPage.style.margin = '0';
          clonedPage.style.padding = '0';
          tempContainer.appendChild(clonedPage);
          
          // 원본 페이지 요소는 숨김
          pageElement.style.display = 'none';
          
          // 임시 컨테이너를 Canvas로 변환 (완전히 격리된 상태)
          const canvas = await html2canvas(tempContainer, {
            useCORS: true,
            logging: process.env.NODE_ENV === 'development',
            width: A4_LANDSCAPE_WIDTH_PX,
            height: A4_LANDSCAPE_HEIGHT_PX,
            scale: 2, // 고해상도를 위해 2배 스케일
            allowTaint: true,
            backgroundColor: '#ffffff',
            foreignObjectRendering: false,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            windowWidth: A4_LANDSCAPE_WIDTH_PX,
            windowHeight: A4_LANDSCAPE_HEIGHT_PX,
            onclone: (clonedDoc: Document) => {
              // tempContainer가 null이 아니어야 함
              if (!tempContainer) return;
              
              // 복제된 문서에서 tempContainer 찾기
              const body = clonedDoc.body;
              if (body) {
                const tempContainerClone = body.querySelector(`#${tempContainer.id}`) as HTMLElement;
                
                if (tempContainerClone) {
                  // body의 모든 자식을 제거하고 tempContainer만 남김
                  Array.from(body.children).forEach(child => {
                    if (child !== tempContainerClone) {
                      child.remove();
                    }
                  });
                  
                  // tempContainer가 body의 유일한 자식이 되도록 보장
                  if (tempContainerClone.parentNode !== body) {
                    body.appendChild(tempContainerClone);
                  }
                } else {
                  // tempContainer를 찾을 수 없으면 body의 모든 자식 제거
                  Array.from(body.children).forEach(child => child.remove());
                }
                
                // body 스타일 설정
                body.style.margin = '0';
                body.style.padding = '0';
                body.style.overflow = 'hidden';
                body.style.backgroundColor = '#ffffff';
                body.style.width = `${A4_LANDSCAPE_WIDTH_PX}px`;
                body.style.height = `${A4_LANDSCAPE_HEIGHT_PX}px`;
              }
              
              // html 요소 스타일 설정
              const html = clonedDoc.documentElement;
              if (html) {
                html.style.margin = '0';
                html.style.padding = '0';
                html.style.overflow = 'hidden';
                html.style.backgroundColor = '#ffffff';
                html.style.width = `${A4_LANDSCAPE_WIDTH_PX}px`;
                html.style.height = `${A4_LANDSCAPE_HEIGHT_PX}px`;
              }
            }
          } as any);
          
          if (canvas.width <= 0 || canvas.height <= 0) {
            console.error(`❌ 페이지 ${i + 1} Canvas 크기 오류:`, { width: canvas.width, height: canvas.height });
            continue;
          }
          
          // Canvas를 Data URL로 변환
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          // PDF 페이지 크기에 맞게 이미지 추가 (페이지 전체 크기 사용)
          pdf.addImage(imgData, 'JPEG', 0, 0, A4_LANDSCAPE_WIDTH_MM, A4_LANDSCAPE_HEIGHT_MM);
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ 페이지 ${i + 1}/${pageElements.length} 추가 완료`, {
              canvasSize: { width: canvas.width, height: canvas.height },
              pdfSize: { width: A4_LANDSCAPE_WIDTH_MM, height: A4_LANDSCAPE_HEIGHT_MM },
              pageRect: { width: pageRect.width, height: pageRect.height, top: pageRect.top, left: pageRect.left }
            });
          }
        } finally {
          // 임시 컨테이너 제거
          if (tempContainer && tempContainer.parentNode) {
            tempContainer.parentNode.removeChild(tempContainer);
            tempContainer = null;
          }
          
          // 원본 페이지 요소 원래 상태로 복원
          Object.keys(originalStyles).forEach(key => {
            (pageElement.style as any)[key] = originalStyles[key as keyof typeof originalStyles] || '';
          });
          
          // 숨겨진 요소들 원래 상태로 복원
          hiddenElements.forEach(({ el, styles }) => {
            if (styles.display !== undefined) el.style.display = styles.display as string;
            if (styles.visibility !== undefined) el.style.visibility = styles.visibility as string;
            if (styles.opacity !== undefined) el.style.opacity = styles.opacity as string;
            if (styles.position !== undefined) el.style.position = styles.position as string;
            el.style.left = '';
            el.style.top = '';
          });
        }
      }
    } else {
      // 단일 페이지인 경우: 기존 로직 사용
      // 요소 크기 확인 및 조정
      const elementWidth = element.scrollWidth || element.offsetWidth || 800;
      const elementHeight = element.scrollHeight || element.offsetHeight || 600;
      
      console.log('📏 요소 크기:', { width: elementWidth, height: elementHeight });

      // HTML을 Canvas로 변환
      const canvas = await html2canvas(element, {
        useCORS: true,
        logging: process.env.NODE_ENV === 'development', // 개발 환경에서만 로깅
        width: elementWidth,
        height: elementHeight,
        scale: 1,
        allowTaint: true,
        backgroundColor: '#ffffff',
        foreignObjectRendering: false,
        removeContainer: true,
        onclone: (clonedDoc: Document) => {
          // 복제된 문서에서 요소가 제대로 렌더링되도록 보장
          const clonedElement = clonedDoc.querySelector(`#${element.id}`) || clonedDoc.body;
          if (clonedElement) {
            (clonedElement as HTMLElement).style.width = `${elementWidth}px`;
            (clonedElement as HTMLElement).style.height = `${elementHeight}px`;
          }
        }
      } as any);

      console.log('📏 Canvas 크기:', { width: canvas.width, height: canvas.height });

      // Canvas 크기 재확인 및 조정
      if (canvas.width <= 0 || canvas.height <= 0) {
        console.error('❌ Canvas 크기 오류:', { width: canvas.width, height: canvas.height });
        throw new Error(`Canvas 크기가 유효하지 않습니다. (${canvas.width}x${canvas.height})`);
      }

      // Canvas를 Data URL로 직접 변환
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      const imgX = Math.max(0, (pdfWidth - scaledWidth) / 2);
      const imgY = 0;

      // 유효한 좌표와 크기인지 확인
      if (isNaN(imgX) || isNaN(imgY) || isNaN(scaledWidth) || isNaN(scaledHeight) || 
          scaledWidth <= 0 || scaledHeight <= 0) {
        throw new Error('PDF 이미지 크기 계산 오류');
      }

      pdf.addImage(imgData, 'JPEG', imgX, imgY, scaledWidth, scaledHeight);
    }

    // PDF를 Blob으로 변환
    const pdfBlob = pdf.output('blob');

    // 파일명 생성
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const mode = isAnswerMode ? 'answer' : 'problem';
    const fileName = `quiz_${dateStr}_${timeStr}_${workTypeName.replace(/[^a-zA-Z0-9]/g, '_')}_${mode}_${userId}_${historyId}.pdf`;

    // Firebase Storage에 업로드
    const storageRef = ref(storage, `quiz-files/${userId}/${fileName}`);
    await uploadBytes(storageRef, pdfBlob);

    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(storageRef);

    return {
      url: downloadURL,
      fileName,
      size: pdfBlob.size
    };
  } catch (error) {
    console.error('PDF 생성 및 업로드 실패:', error);
    throw error;
  }
};

// 인쇄 가능한 HTML 생성 및 PDF 업로드
export const generatePrintableHTMLAndUpload = async (
  htmlContent: string,
  userId: string,
  historyId: string,
  workTypeName: string,
  isAnswerMode: boolean = false
): Promise<{ url: string; fileName: string; size: number }> => {
  try {
    // 임시 div 생성
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm'; // A4 width
    tempDiv.style.padding = '20mm';
    document.body.appendChild(tempDiv);

    try {
      // PDF 생성 및 업로드
      const result = await generateAndUploadPDF(
        tempDiv,
        userId,
        historyId,
        workTypeName,
        { isAnswerMode }
      );

      return result;
    } finally {
      // 임시 div 제거
      document.body.removeChild(tempDiv);
    }
  } catch (error) {
    console.error('HTML PDF 변환 실패:', error);
    throw error;
  }
};

// 문제 데이터를 HTML로 변환
export const convertQuizDataToHTML = (
  quizData: any,
  workTypeName: string,
  workTypeId: string,
  isAnswerMode: boolean = false
): string => {
  const title = isAnswerMode ? `${workTypeName} - 정답` : `${workTypeName} - 문제`;
  
  let quizContent = '';
  
  // 유형별 HTML 생성
  switch (workTypeId) {
    case '01':
      quizContent = generateWork01HTML(quizData, isAnswerMode);
      break;
    case '02':
      quizContent = generateWork02HTML(quizData, isAnswerMode);
      break;
    case '03':
    case '04':
    case '05':
      quizContent = generateBlankQuizHTML(quizData, workTypeId, isAnswerMode);
      break;
    case '06':
      quizContent = generateWork06HTML(quizData, isAnswerMode);
      break;
    case '07':
    case '08':
      quizContent = generateMainIdeaOrTitleHTML(quizData, isAnswerMode);
      break;
    case '09':
    case '10':
      quizContent = generateGrammarQuizHTML(quizData, isAnswerMode);
      break;
    case '11':
      quizContent = generateWork11HTML(quizData, isAnswerMode);
      break;
    case '13':
      quizContent = generateWork13HTML(quizData, isAnswerMode);
      break;
    case '14':
      quizContent = generateWork14HTML(quizData, isAnswerMode);
      break;
    default:
      quizContent = '<p>지원하지 않는 문제 유형입니다.</p>';
  }

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
            line-height: 1.8;
            padding: 20mm;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #333;
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #1a1a1a;
        }
        .header .date {
            font-size: 14px;
            color: #666;
        }
        .quiz-content {
            margin-bottom: 30px;
        }
        .question-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #2c3e50;
            padding: 10px;
            background: #f8f9fa;
            border-left: 4px solid #3498db;
        }
        .passage {
            padding: 20px;
            background: #fafafa;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 15px;
            line-height: 2;
        }
        .options {
            margin: 15px 0;
            padding-left: 10px;
        }
        .option {
            margin-bottom: 12px;
            padding: 8px;
            font-size: 15px;
        }
        .answer-section {
            margin-top: 20px;
            padding: 15px;
            background: #e8f5e9;
            border: 2px solid #4caf50;
            border-radius: 5px;
        }
        .answer-label {
            font-weight: bold;
            color: #2e7d32;
            margin-bottom: 10px;
        }
        .translation {
            margin-top: 30px;
            padding: 20px;
            background: #e3f2fd;
            border: 2px solid #2196f3;
            border-radius: 5px;
        }
        .translation h3 {
            color: #1565c0;
            margin-bottom: 15px;
            font-size: 16px;
        }
        .highlight {
            text-decoration: underline;
            font-weight: bold;
            color: #d32f2f;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        table th, table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        table th {
            background: #f5f5f5;
            font-weight: bold;
        }
        @media print {
            body { padding: 10mm; }
            .answer-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <div class="date">생성일: ${new Date().toLocaleDateString('ko-KR')}</div>
    </div>
    <div class="quiz-content">
        ${quizContent}
    </div>
</body>
</html>`;
};

// 유형별 HTML 생성 함수들
const generateWork01HTML = (quiz: any, isAnswerMode: boolean): string => {
  let html = `
    <div class="question-title">문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</div>
    <div class="passage">
      ${quiz.shuffledParagraphs?.map((p: any) => `<p><strong>${p.label}:</strong> ${p.content}</p>`).join('') || ''}
    </div>
    <div class="options">
      ${quiz.choices?.map((choice: string[], i: number) => 
        `<div class="option">${['①', '②', '③', '④', '⑤'][i]} ${choice.join(' → ')}</div>`
      ).join('') || ''}
    </div>
  `;
  
  if (isAnswerMode && quiz.answerIndex !== undefined) {
    html += `
      <div class="answer-section">
        <div class="answer-label">✓ 정답</div>
        <div>${['①', '②', '③', '④', '⑤'][quiz.answerIndex]} ${quiz.choices[quiz.answerIndex]?.join(' → ')}</div>
      </div>
    `;
  }
  
  if (quiz.translation) {
    html += `
      <div class="translation">
        <h3>📖 본문 해석</h3>
        <p>${quiz.translation}</p>
      </div>
    `;
  }
  
  return html;
};

const generateWork02HTML = (quiz: any, isAnswerMode: boolean): string => {
  return `
    <div class="question-title">문제: 다음 본문을 읽고 밑줄 친 단어의 뜻을 파악하세요</div>
    <div class="passage">${quiz.modifiedText || quiz.originalText || ''}</div>
    ${quiz.translation ? `
      <div class="translation">
        <h3>📖 본문 해석</h3>
        <p>${quiz.translation}</p>
      </div>
    ` : ''}
    ${isAnswerMode && quiz.replacements ? `
      <div class="answer-section">
        <div class="answer-label">✓ 교체된 단어</div>
        <table>
          <thead>
            <tr>
              <th>원본 단어</th>
              <th>원본 뜻</th>
              <th>교체 단어</th>
              <th>교체 뜻</th>
            </tr>
          </thead>
          <tbody>
            ${quiz.replacements.map((r: any) => `
              <tr>
                <td>${r.original}</td>
                <td>${r.originalMeaning}</td>
                <td>${r.replacement}</td>
                <td>${r.replacementMeaning}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}
  `;
};

const generateBlankQuizHTML = (quiz: any, workTypeId: string, isAnswerMode: boolean): string => {
  const typeNames: Record<string, string> = {
    '03': '단어',
    '04': '구',
    '05': '문장'
  };
  
  let html = `
    <div class="question-title">문제: 다음 빈칸에 들어갈 가장 적절한 ${typeNames[workTypeId]}를 고르세요</div>
    <div class="passage">${quiz.blankedText || ''}</div>
    <div class="options">
      ${quiz.options?.map((option: string, i: number) => 
        `<div class="option">${['①', '②', '③', '④', '⑤'][i]} ${option}</div>`
      ).join('') || ''}
    </div>
  `;
  
  if (isAnswerMode && quiz.answerIndex !== undefined) {
    html += `
      <div class="answer-section">
        <div class="answer-label">✓ 정답</div>
        <div>${['①', '②', '③', '④', '⑤'][quiz.answerIndex]} ${quiz.options[quiz.answerIndex]}</div>
      </div>
    `;
  }
  
  return html;
};

const generateWork06HTML = (quiz: any, isAnswerMode: boolean): string => {
  let html = `
    <div class="question-title">문제: 다음 문장이 들어가기에 가장 적절한 곳을 고르세요</div>
    <div class="passage" style="background: #fff3cd; border-color: #ffc107;">
      <strong>삽입할 문장:</strong> ${quiz.sentenceToInsert || ''}
    </div>
    <div class="passage">
      ${quiz.paragraphWithMarkers || ''}
    </div>
  `;
  
  if (isAnswerMode && quiz.correctPosition !== undefined) {
    html += `
      <div class="answer-section">
        <div class="answer-label">✓ 정답</div>
        <div>위치: ${quiz.correctPosition}</div>
      </div>
    `;
  }
  
  return html;
};

const generateMainIdeaOrTitleHTML = (quiz: any, isAnswerMode: boolean): string => {
  let html = `
    <div class="question-title">문제: ${quiz.options ? '다음 글의 제목으로 가장 적절한 것을 고르세요' : '다음 글의 주제를 파악하세요'}</div>
    <div class="passage">${quiz.passage || ''}</div>
    ${quiz.options ? `
      <div class="options">
        ${quiz.options.map((option: string, i: number) => 
          `<div class="option">${['①', '②', '③', '④', '⑤'][i]} ${option}</div>`
        ).join('')}
      </div>
    ` : ''}
  `;
  
  if (isAnswerMode && quiz.answerIndex !== undefined) {
    html += `
      <div class="answer-section">
        <div class="answer-label">✓ 정답</div>
        <div>${['①', '②', '③', '④', '⑤'][quiz.answerIndex]} ${quiz.options[quiz.answerIndex]}</div>
        ${quiz.answerTranslation ? `<div style="margin-top: 10px;">해석: ${quiz.answerTranslation}</div>` : ''}
      </div>
    `;
  }
  
  if (quiz.translation) {
    html += `
      <div class="translation">
        <h3>📖 본문 해석</h3>
        <p>${quiz.translation}</p>
      </div>
    `;
  }
  
  return html;
};

const generateGrammarQuizHTML = (quiz: any, isAnswerMode: boolean): string => {
  let html = `
    <div class="question-title">문제: 다음 글에서 어법상 틀린 부분을 찾으세요</div>
    <div class="passage">${quiz.passage || ''}</div>
  `;
  
  if (isAnswerMode && quiz.errors) {
    html += `
      <div class="answer-section">
        <div class="answer-label">✓ 정답 (어법 오류)</div>
        <table>
          <thead>
            <tr>
              <th>틀린 표현</th>
              <th>올바른 표현</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            ${quiz.errors.map((error: any) => `
              <tr>
                <td>${error.incorrect}</td>
                <td>${error.correct}</td>
                <td>${error.explanation}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  return html;
};

const generateWork11HTML = (quiz: any, isAnswerMode: boolean): string => {
  return `
    <div class="question-title">문제: 다음 문장들을 해석하세요</div>
    <div class="passage">
      ${quiz.sentences?.map((s: string, i: number) => `<p>${i + 1}. ${s}</p>`).join('') || ''}
    </div>
    ${isAnswerMode && quiz.translations ? `
      <div class="answer-section">
        <div class="answer-label">✓ 정답 (해석)</div>
        ${quiz.translations.map((t: string, i: number) => `<p>${i + 1}. ${t}</p>`).join('')}
      </div>
    ` : ''}
  `;
};

const generateWork13HTML = (quiz: any, isAnswerMode: boolean): string => {
  return `
    <div class="question-title">문제: 다음 빈칸에 들어갈 적절한 단어를 쓰세요 (주관식)</div>
    <div class="passage">${quiz.blankedText || ''}</div>
    ${isAnswerMode && quiz.correctAnswers ? `
      <div class="answer-section">
        <div class="answer-label">✓ 정답</div>
        <p>${quiz.correctAnswers.join(' / ')}</p>
      </div>
    ` : ''}
    ${quiz.translation ? `
      <div class="translation">
        <h3>📖 해석</h3>
        <p>${quiz.translation}</p>
      </div>
    ` : ''}
  `;
};

const generateWork14HTML = (quiz: any, isAnswerMode: boolean): string => {
  return `
    <div class="question-title">문제: 다음 빈칸에 들어갈 적절한 문장을 쓰세요 (주관식)</div>
    <div class="passage">${quiz.blankedText || ''}</div>
    ${isAnswerMode && quiz.correctAnswers ? `
      <div class="answer-section">
        <div class="answer-label">✓ 정답</div>
        <p>${quiz.correctAnswers.join(' / ')}</p>
      </div>
    ` : ''}
  `;
};

// Base64 Data URL을 Uint8Array로 변환 (브라우저 환경)
const base64ToUint8Array = (base64: string): Uint8Array => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// HTML 요소를 Canvas로 변환하여 이미지 Data URL 반환
const elementToImageDataURL = async (element: HTMLElement): Promise<string> => {
  const elementWidth = element.scrollWidth || element.offsetWidth || 800;
  const elementHeight = element.scrollHeight || element.offsetHeight || 600;
  
  const canvas = await html2canvas(element, {
    useCORS: true,
    logging: false,
    width: elementWidth,
    height: elementHeight,
    scale: 1,
    allowTaint: true,
    backgroundColor: '#ffffff',
    foreignObjectRendering: false,
    removeContainer: true,
    onclone: (clonedDoc: Document) => {
      const clonedElement = clonedDoc.querySelector(`#${element.id}`) || clonedDoc.body;
      if (clonedElement) {
        (clonedElement as HTMLElement).style.width = `${elementWidth}px`;
        (clonedElement as HTMLElement).style.height = `${elementHeight}px`;
      }
    }
  } as any);
  
  return canvas.toDataURL('image/png', 1.0);
};

// 파일 다운로드 헬퍼 함수
const downloadBlob = (blob: Blob, fileName: string): void => {
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

// HTML 요소를 DOCX Paragraph 배열로 변환 (PDF 디자인과 동일하게)
const DOCX_BORDER_SPACE = 40; // 약 2pt 정도의 내부 여백

interface TextRunStyleState {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  color?: string;
}

const normalizeColorToHex = (colorValue: string): string | undefined => {
  if (!colorValue) return undefined;
  const value = colorValue.trim();

  const hexMatch = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }
    if (hex.length >= 6) {
      return hex.slice(0, 6).toUpperCase();
    }
    return hex.toUpperCase();
  }

  const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const toHex = (num: number) => num.toString(16).padStart(2, '0');
    return `${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  return undefined;
};

const createTextRunWithStyles = (text: string, styles: TextRunStyleState): TextRun => {
  const runOptions: any = {
    text,
    font: 'Noto Sans KR',
    preserveSpace: true
  };

  if (styles.bold) {
    runOptions.bold = true;
  }

  if (styles.italics) {
    runOptions.italics = true;
  }

  if (styles.underline) {
    runOptions.underline = { type: UnderlineType.SINGLE };
  }

  if (styles.color) {
    runOptions.color = styles.color;
  }

  return new TextRun(runOptions);
};

const extractTextRunsByLine = (element: HTMLElement): TextRun[][] => {
  const lines: TextRun[][] = [];
  let currentLine: TextRun[] = [];

  const pushCurrentLine = () => {
    if (currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
    }
  };

  const appendText = (text: string, styles: TextRunStyleState) => {
    if (!text) return;

    const normalized = text.replace(/\u00A0/g, ' ');
    const parts = normalized.split(/\n/);

    parts.forEach((part, index) => {
      if (index > 0) {
        pushCurrentLine();
      }

      const collapsed = part.replace(/\s+/g, ' ');
      if (collapsed.length === 0) {
        return;
      }

      currentLine.push(createTextRunWithStyles(collapsed, styles));
    });
  };

  const traverse = (node: Node, inheritedStyles: TextRunStyleState) => {
    if (node.nodeType === Node.TEXT_NODE) {
      appendText(node.textContent || '', inheritedStyles);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    if (tagName === 'br') {
      pushCurrentLine();
      return;
    }

    const nextStyles: TextRunStyleState = { ...inheritedStyles };

    if (tagName === 'strong' || tagName === 'b') {
      nextStyles.bold = true;
    }

    if (tagName === 'em' || tagName === 'i') {
      nextStyles.italics = true;
    }

    if (tagName === 'u') {
      nextStyles.underline = true;
    }

    if (el.classList.contains('grammar-error-highlight')) {
      nextStyles.bold = true;
    }

    const fontWeight = el.style.fontWeight;
    if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
      nextStyles.bold = true;
    }

    const textDecoration = el.style.textDecoration;
    if (textDecoration && textDecoration.toLowerCase().includes('underline')) {
      nextStyles.underline = true;
    }

    const colorHex = normalizeColorToHex(el.style.color);
    if (colorHex) {
      nextStyles.color = colorHex;
    }

    Array.from(el.childNodes).forEach((child) => traverse(child, nextStyles));
  };

  traverse(element, {});

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.filter((line) => line.length > 0);
};

const htmlToDocxParagraphs = (element: HTMLElement): (Paragraph | Table)[] => {
  const paragraphs: (Paragraph | Table)[] = [];
  
  // 헤더 찾기 (가로선 포함) - PDF와 동일한 구조
  const header = element.querySelector('.a4-landscape-page-header, .a4-page-header, .print-header-package02');
  if (header) {
    const headerText = header.querySelector('.print-header-text-package02, .print-header-text');
    if (headerText) {
      const text = headerText.textContent?.trim() || '';
      if (text) {
        // 헤더 텍스트 (중앙 정렬, 굵게, Noto Sans KR, 하단 가로선)
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: text,
                bold: true,
                size: 20, // 10pt
                font: 'Noto Sans KR'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: {
              bottom: {
                color: '000000',
                size: 20, // 1pt
                style: BorderStyle.SINGLE
              }
            }
          })
        );
      }
    }
  }
  
  // 문제 카드들을 찾아서 각각 처리
  const questionCards = element.querySelectorAll('.print-question-card, .quiz-content');
  
  if (questionCards.length > 0) {
    questionCards.forEach((card, cardIndex) => {
      const typeBadge = card.querySelector('.print-question-type-badge, .question-type-badge, .problem-type-badge');
      const rawTypeLabel = typeBadge?.textContent?.trim() || '';
      const typeLabel = rawTypeLabel ? rawTypeLabel.replace(/\s+/g, '') : '';
      const titleSpan = card.querySelector('.print-question-title span, .question-title');
      const titleSpanText = titleSpan?.textContent?.trim() || '';
      
      const instruction = card.querySelector('.print-instruction, .problem-instruction');
      const instructionText = instruction?.textContent?.trim() || '';
      let instructionHandled = false;
      
      if (typeLabel && instructionText) {
        const combinedText = `${typeLabel}. ${instructionText}`;
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: combinedText,
                bold: true,
                font: 'Noto Sans KR'
              })
            ],
            spacing: { before: cardIndex > 0 ? 400 : 200, after: 200 }
          })
        );
        instructionHandled = true;
      } else if (typeLabel && titleSpanText) {
        const combinedText = `${typeLabel}. ${titleSpanText}`;
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: combinedText,
                bold: true,
                font: 'Noto Sans KR'
              })
            ],
            spacing: { before: cardIndex > 0 ? 400 : 200, after: 200 }
          })
        );
      } else if (titleSpanText) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: titleSpanText,
                bold: true,
                font: 'Noto Sans KR'
              })
            ],
            spacing: { before: cardIndex > 0 ? 400 : 200, after: 200 }
          })
        );
      }
      
      if (!instructionHandled && instructionText) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: instructionText,
                font: 'Noto Sans KR'
              })
            ],
            spacing: { before: cardIndex > 0 ? 400 : 200, after: 200 }
          })
        );
      }
      
      // Work_06 등: 주요 문장 표시
      const missingSentence = card.querySelector('.print-missing-sentence, .missing-sentence');
      if (missingSentence) {
        const missingSentenceText = missingSentence.textContent?.trim() || '';
        if (missingSentenceText) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: missingSentenceText,
                  bold: true,
                  font: 'Noto Sans KR'
                })
              ],
              spacing: { before: 120, after: 200 },
              shading: {
                type: ShadingType.CLEAR,
                color: 'auto',
                fill: 'E5E7EB' // Tailwind gray-200
              }
            })
          );
        }
      }
      
      // 본문 (여러 종류의 본문 요소 확인) - 박스 테두리 포함
      // 패키지#02에서 사용하는 모든 본문 클래스 포함
      // 여러 개의 본문 요소가 있을 수 있으므로 querySelectorAll 사용
      const passageSelectors = [
        '.print-shuffled-paragraphs',
        '.problem-passage',
        '.print-passage',
        '.passage',
        '.print-numbered-passage',
        '.print-html-block',
        '.print-paragraph-item'
      ];
      
      // 각 셀렉터를 순서대로 시도하여 본문 찾기
      let passage: HTMLElement | null = null;
      for (const selector of passageSelectors) {
        const found = card.querySelector(selector) as HTMLElement | null;
        if (found) {
          passage = found;
          break;
        }
      }
      
      // 본문이 여러 개 있을 수 있으므로 모든 본문 요소 찾기
      if (!passage) {
        // 모든 본문 요소 찾기
        const allPassages = card.querySelectorAll(passageSelectors.join(', '));
        if (allPassages.length > 0) {
          passage = allPassages[0] as HTMLElement;
        }
      }
      
      if (passage) {
        const lineRuns = extractTextRunsByLine(passage);
        if (lineRuns.length > 0) {
          let isFirstPassage = true;
          lineRuns.forEach((runs, lineIndex) => {
            if (runs.length === 0) {
              return;
            }

            const isFirstLine = lineIndex === 0;
            const isLastLine = lineIndex === lineRuns.length - 1;

            const borderConfig: any = {
              left: {
                color: '000000',
                size: 6,
                style: BorderStyle.SINGLE,
                space: DOCX_BORDER_SPACE
              },
              right: {
                color: '000000',
                size: 6,
                style: BorderStyle.SINGLE,
                space: DOCX_BORDER_SPACE
              }
            };

            if (isFirstLine) {
              borderConfig.top = {
                color: '000000',
                size: 6,
                style: BorderStyle.SINGLE,
                space: DOCX_BORDER_SPACE
              };
            }

            if (isLastLine) {
              borderConfig.bottom = {
                color: '000000',
                size: 6,
                style: BorderStyle.SINGLE,
                space: DOCX_BORDER_SPACE
              };
            }

            paragraphs.push(
              new Paragraph({
                children: runs,
                spacing: {
                  before: isFirstLine && isFirstPassage ? 160 : 80,
                  after: isLastLine ? 160 : 80
                },
                indent: { left: 0, right: 0 },
                border: borderConfig
              })
            );
          });
        }
      }
      
      // 여러 개의 본문 요소가 있는 경우 추가 처리
      // (예: 유형#01의 여러 문단)
      const allPassages = card.querySelectorAll('.print-html-block, .print-paragraph-item, .print-shuffled-paragraphs');
      if (allPassages.length > 1) {
        // 첫 번째 본문은 이미 처리되었으므로 나머지 처리
        Array.from(allPassages).slice(1).forEach((additionalPassage) => {
          const lineRuns = extractTextRunsByLine(additionalPassage as HTMLElement);
          if (lineRuns.length > 0) {
            lineRuns.forEach((runs, lineIndex) => {
              if (runs.length === 0) {
                return;
              }

              const isFirstLine = lineIndex === 0;
              const isLastLine = lineIndex === lineRuns.length - 1;

              const borderConfig: any = {
                left: {
                  color: '000000',
                  size: 6,
                  style: BorderStyle.SINGLE,
                  space: DOCX_BORDER_SPACE
                },
                right: {
                  color: '000000',
                  size: 6,
                  style: BorderStyle.SINGLE,
                  space: DOCX_BORDER_SPACE
                }
              };

              if (isFirstLine) {
                borderConfig.top = {
                  color: '000000',
                  size: 6,
                  style: BorderStyle.SINGLE,
                  space: DOCX_BORDER_SPACE
                };
              }

              if (isLastLine) {
                borderConfig.bottom = {
                  color: '000000',
                  size: 6,
                  style: BorderStyle.SINGLE,
                  space: DOCX_BORDER_SPACE
                };
              }

              paragraphs.push(
                new Paragraph({
                  children: runs,
                  spacing: {
                    before: isFirstLine ? 160 : 80,
                    after: isLastLine ? 160 : 80
                  },
                  indent: { left: 0, right: 0 },
                  border: borderConfig
                })
              );
            });
          }
        });
      }
      
      // Work_11: 문장별 해석
      const sentenceItems = card.querySelectorAll('.print-sentence-item, .sentence-item');
      if (sentenceItems.length > 0) {
        const sentenceBlocks = Array.from(sentenceItems).map((item) => {
          const englishElement = item.querySelector('.print-sentence-english, .sentence-english') as HTMLElement | null;
          let englishText = '';
          let koreanText = '';
          
          if (englishElement) {
            const englishClone = englishElement.cloneNode(true) as HTMLElement;
            const inlineKorean = englishClone.querySelector('.print-sentence-korean-inline, .sentence-korean');
            if (inlineKorean) {
              koreanText = inlineKorean.textContent?.trim() || '';
              inlineKorean.remove();
            }
            englishText = englishClone.textContent?.trim() || '';
          }
          
          const fallbackKorean = item.querySelector('.print-sentence-korean-inline, .sentence-korean');
          if (!koreanText && fallbackKorean) {
            koreanText = fallbackKorean.textContent?.trim() || '';
          }
          
          return { englishText, koreanText };
        }).filter(block => block.englishText);
        
        sentenceBlocks.forEach((block, blockIndex) => {
          const isFirstSentence = blockIndex === 0;
          const isLastSentence = blockIndex === sentenceBlocks.length - 1;
          
          const borderConfig: any = {
            left: {
              color: '000000',
              size: 6,
              style: BorderStyle.SINGLE,
              space: DOCX_BORDER_SPACE
            },
            right: {
              color: '000000',
              size: 6,
              style: BorderStyle.SINGLE,
              space: DOCX_BORDER_SPACE
            }
          };
          
          if (isFirstSentence) {
            borderConfig.top = {
              color: '000000',
              size: 6,
              style: BorderStyle.SINGLE,
              space: DOCX_BORDER_SPACE
            };
          }
          
          if (isLastSentence) {
            borderConfig.bottom = {
              color: '000000',
              size: 6,
              style: BorderStyle.SINGLE,
              space: DOCX_BORDER_SPACE
            };
          }
          
          const children: TextRun[] = [
            new TextRun({
              text: block.englishText,
              font: 'Noto Sans KR'
            })
          ];
          
          // 문장 사이 빈 줄
          let hasKorean = false;
          if (block.koreanText) {
            children.push(
              new TextRun({
                break: 1,
                text: block.koreanText,
                font: 'Noto Sans KR',
                italics: true,
                color: '444444'
              })
            );
            hasKorean = true;
          }
          
          if (!hasKorean) {
            children.push(
              new TextRun({
                break: 1,
                text: '',
                font: 'Noto Sans KR'
              })
            );
          }
          
          paragraphs.push(
            new Paragraph({
              children,
              spacing: {
                before: isFirstSentence ? 200 : 160,
                after: isLastSentence ? 200 : 160
              },
              indent: { left: 0, right: 0 },
              border: borderConfig
            })
          );
        });
        
        // 유형#11 블록과 다음 문제 사이 빈 줄
        paragraphs.push(
          new Paragraph({
            text: '',
            spacing: { before: 200, after: 0 }
          })
        );
      }
      
      // 본문 (Work_02용 - 밑줄이 있는 텍스트) - 박스 테두리 포함
      const passageWithUnderline = card.querySelector('.print-passage-with-underline') as HTMLElement | null;
      if (passageWithUnderline) {
        const lineRuns = extractTextRunsByLine(passageWithUnderline);
        if (lineRuns.length > 0) {
          lineRuns.forEach((runs, lineIndex) => {
            if (runs.length === 0) {
              return;
            }

            const isFirstLine = lineIndex === 0;
            const isLastLine = lineIndex === lineRuns.length - 1;

            const borderConfig: any = {
              left: {
                color: '000000',
                size: 6,
                style: BorderStyle.SINGLE,
                space: DOCX_BORDER_SPACE
              },
              right: {
                color: '000000',
                size: 6,
                style: BorderStyle.SINGLE,
                space: DOCX_BORDER_SPACE
              }
            };

            if (isFirstLine) {
              borderConfig.top = {
                color: '000000',
                size: 6,
                style: BorderStyle.SINGLE,
                space: DOCX_BORDER_SPACE
              };
            }

            if (isLastLine) {
              borderConfig.bottom = {
                color: '000000',
                size: 6,
                style: BorderStyle.SINGLE,
                space: DOCX_BORDER_SPACE
              };
            }

            paragraphs.push(
              new Paragraph({
                children: runs,
                spacing: {
                  before: isFirstLine ? 160 : 80,
                  after: isLastLine ? 160 : 80
                },
                indent: { left: 0, right: 0 },
                border: borderConfig
              })
            );
          });
        }
      }
      
      // 선택지
      const options = card.querySelectorAll('.print-option, .option, .quiz-option');
      if (options.length > 0) {
        const answerMarkElement = card.querySelector('.print-answer-mark');
        const answerIndexAttr = answerMarkElement?.getAttribute('data-answer-index');
        const answerIndex = answerIndexAttr ? parseInt(answerIndexAttr, 10) : -1;
        
        options.forEach((option, optionIndex) => {
          // 각 옵션 내에서 .print-answer-mark 요소 찾기
          const optionAnswerMark = option.querySelector('.print-answer-mark');
          const hasAnswerMarkInOption = optionAnswerMark && optionAnswerMark.textContent?.trim();
          
          let optionText = '';
          let answerMarkText = '';
          
          if (hasAnswerMarkInOption) {
            // .print-answer-mark가 옵션 내에 있는 경우 (유형#01 등)
            const answerMarkTextContent = optionAnswerMark.textContent?.trim() || '';
            // 옵션 텍스트에서 정답 마크 제거
            const optionClone = option.cloneNode(true) as HTMLElement;
            const answerMarkClone = optionClone.querySelector('.print-answer-mark');
            if (answerMarkClone) {
              answerMarkClone.remove();
            }
            optionText = optionClone.textContent?.trim() || '';
            answerMarkText = answerMarkTextContent;
          } else {
            // 일반적인 경우
            optionText = option.textContent?.trim() || '';
          }
          
          if (optionText || answerMarkText) {
            const children: TextRun[] = [];
            
            // 옵션 텍스트 추가
            if (optionText) {
              children.push(
                new TextRun({
                  text: optionText,
                  font: 'Noto Sans KR'
                })
              );
            }
            
            // 정답 마크 추가 (옵션 내에 있는 경우 또는 data-answer-index가 있는 경우)
            if (hasAnswerMarkInOption && answerMarkText) {
              // answerMarkText가 " (정답)" 형식이므로 앞에 공백 하나 더 추가하여 "  (정답)"으로 만듦
              const formattedAnswerText = ' ' + answerMarkText.trimStart();
              children.push(
                new TextRun({
                  text: formattedAnswerText,
                  bold: true,
                  color: 'FF0000',
                  font: 'Noto Sans KR'
                })
              );
            } else if (answerIndex === optionIndex) {
              children.push(
                new TextRun({
                  text: '  (정답)',
                  bold: true,
                  color: 'FF0000',
                  font: 'Noto Sans KR'
                })
              );
            }
            
            paragraphs.push(
              new Paragraph({
                children,
                indent: { left: 400 },
                spacing: { before: optionIndex === 0 ? 200 : 80, after: 100 }
              })
            );
          }
        });
      }
      
      const work06Answer = card.querySelector('.print-work06-answer');
      if (work06Answer) {
        const answerText = work06Answer.textContent?.trim() || '';
        if (answerText) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: answerText,
                  bold: true,
                  color: '1565c0',
                  font: 'Noto Sans KR'
                })
              ],
              spacing: { before: 200, after: 120 }
            })
          );
        }
      }

      const replacementsTable = card.querySelector('.print-replacements-table table');
      if (replacementsTable) {
        paragraphs.push(
          new Paragraph({
            text: '',
            spacing: { before: 200, after: 120 }
          })
        );
        
        const tableRows = Array.from(replacementsTable.querySelectorAll('tr')).map((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('th, td')).map((cell) => {
            const text = cell.textContent?.trim() || '';
            return new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text,
                      bold: rowIndex === 0,
                      font: 'Noto Sans KR'
                    })
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 40 }
                })
              ],
              margins: {
                top: 60,
                bottom: 60,
                left: 60,
                right: 60
              },
              shading: rowIndex === 0 ? {
                type: ShadingType.CLEAR,
                color: 'auto',
                fill: 'E5E7EB'
              } : undefined
            });
          });

          return new TableRow({
            children: cells
          });
        });

        paragraphs.push(
          new Table({
            rows: tableRows,
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            }
          })
        );

        paragraphs.push(
          new Paragraph({
            text: '',
            spacing: { before: 160, after: 0 }
          })
        );
      }

      // 정답 섹션
      const answerSection = card.querySelector('.print-answer-section');
      if (answerSection) {
        const answerLabel = answerSection.querySelector('.print-answer-label');
        const answerContents = Array.from(answerSection.querySelectorAll('.print-answer-content'));
        
        if (answerContents.length > 0) {
          const labelText = (answerLabel?.textContent || '정답').replace(/\s*[:：]?\s*$/, '');
          
          answerContents.forEach((contentEl, contentIndex) => {
            const rawText = contentEl.textContent || '';
            const contentText = rawText.replace(/\s*\n\s*/g, ' ').trim();
            if (!contentText) return;
            
            const isFirst = contentIndex === 0;
            const needsLabelPrefix =
              isFirst &&
              !!labelText &&
              !contentText.startsWith(labelText);
            const effectiveLabel = needsLabelPrefix ? `${labelText} : ` : '';
            
            const iconMatch = contentText.match(/^(①|②|③|④|⑤|⑥|⑦|⑧|⑨)\s*(.*)$/);
            if (iconMatch && isFirst) {
              const [, icon, restText] = iconMatch;
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: effectiveLabel,
                      bold: true,
                      color: '1976D2',
                      font: 'Noto Sans KR'
                    }),
                    new TextRun({
                      text: `${icon} `,
                      font: 'Noto Sans KR',
                      bold: true
                    }),
                    new TextRun({
                      text: restText,
                      font: 'Noto Sans KR'
                    })
                  ],
                  spacing: { before: isFirst ? 200 : 40, after: contentIndex === answerContents.length - 1 ? 160 : 40 }
                })
              );
            } else {
              paragraphs.push(
                new Paragraph({
                  children: [
                    ...(isFirst ? [
                      new TextRun({
                        text: effectiveLabel,
                        bold: true,
                        color: '1976D2',
                        font: 'Noto Sans KR'
                      })
                    ] : []),
                    new TextRun({
                      text: contentText,
                      font: 'Noto Sans KR',
                      bold: false
                    })
                  ],
                  spacing: { before: isFirst ? 200 : 40, after: contentIndex === answerContents.length - 1 ? 160 : 40 }
                })
              );
            }
          });
        }
      }
      
      // 해석 섹션
      const translation = card.querySelector('.print-translation-section, .translation');
      if (translation) {
        if (paragraphs.length > 0) {
          const lastParagraph = paragraphs[paragraphs.length - 1];
          if (lastParagraph && (lastParagraph as any).spacing?.after === 0) {
            paragraphs.pop();
          }
        }

        const translationTitle = translation.querySelector('.print-translation-title, h3');
        if (translationTitle) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: translationTitle.textContent?.trim() || '본문 해석:',
                  bold: true,
                  color: '1565c0',
                  font: 'Noto Sans KR'
                })
              ],
              spacing: { after: 150 }
            })
          );
        }
        
        const translationContent = translation.querySelector('.print-translation-content, p');
        if (translationContent) {
          const contentText = translationContent.textContent?.trim() || '';
          if (contentText) {
            const lines = contentText.split(/\n+/).filter(line => line.trim());
            lines.forEach((line, lineIndex) => {
              const isFirstLine = lineIndex === 0;
              const isLastLine = lineIndex === lines.length - 1;
              
              const borderConfig: any = {
                left: {
                  color: 'C4C7CE',
                  size: 6,
                  style: BorderStyle.SINGLE,
                  space: DOCX_BORDER_SPACE
                },
                right: {
                  color: 'C4C7CE',
                  size: 6,
                  style: BorderStyle.SINGLE,
                  space: DOCX_BORDER_SPACE
                }
              };
              
              if (isFirstLine) {
                borderConfig.top = {
                  color: 'C4C7CE',
                  size: 6,
                  style: BorderStyle.SINGLE,
                  space: DOCX_BORDER_SPACE
                };
              }
              
              if (isLastLine) {
                borderConfig.bottom = {
                  color: 'C4C7CE',
                  size: 6,
                  style: BorderStyle.SINGLE,
                  space: DOCX_BORDER_SPACE
                };
              }
              
              const paragraph = new Paragraph({
                children: [
                  new TextRun({
                    text: line.trim(),
                    font: 'Noto Sans KR'
                  })
                ],
                spacing: {
                  before: isFirstLine ? 160 : 100,
                  after: isLastLine ? 200 : 100
                },
                shading: {
                  type: ShadingType.CLEAR,
                  color: 'auto',
                  fill: 'F3F4F6'
                },
                indent: { left: 0, right: 0 },
                border: borderConfig
              });
              
              paragraphs.push(paragraph);
            });
            
            paragraphs.push(
              new Paragraph({
                text: '',
                spacing: { before: 200, after: 0 }
              })
            );
          }
        }
      }

      if (
        options.length > 0 &&
        !card.querySelector('.print-answer-mark') &&
        !card.querySelector('.print-translation-section, .translation') &&
        sentenceItems.length === 0
      ) {
        paragraphs.push(
          new Paragraph({
            text: '',
            spacing: { before: 200, after: 0 }
          })
        );
      }
    });
  } else {
    // 문제 카드가 없으면 기존 방식으로 파싱
    const problemInstruction = element.querySelector('.problem-instruction, .question-title');
    if (problemInstruction) {
      const instructionText = problemInstruction.textContent?.trim() || '';
      if (instructionText) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: instructionText,
                font: 'Noto Sans KR'
              })
            ],
            spacing: { after: 200 }
          })
        );
      }
    }
    
    const passage = element.querySelector('.problem-passage, .passage, .quiz-content');
    if (passage) {
      const passageText = passage.textContent?.trim() || '';
      if (passageText) {
        const lines = passageText.split(/\n+/).filter(line => line.trim());
        lines.forEach((line, lineIndex) => {
          const isFirstLine = lineIndex === 0;
          const isLastLine = lineIndex === lines.length - 1;
          
          // 박스 테두리 설정: 첫 줄은 상단, 중간은 좌우, 마지막은 하단
          const borderConfig: any = {
            left: {
              color: '000000',
              size: 6, // 0.3pt
              style: BorderStyle.SINGLE,
              space: DOCX_BORDER_SPACE
            },
            right: {
              color: '000000',
              size: 6, // 0.3pt
              style: BorderStyle.SINGLE,
              space: DOCX_BORDER_SPACE
            }
          };
          
          if (isFirstLine) {
            borderConfig.top = {
              color: '000000',
              size: 6, // 0.3pt
              style: BorderStyle.SINGLE,
              space: DOCX_BORDER_SPACE
            };
          }
          
          if (isLastLine) {
            borderConfig.bottom = {
              color: '000000',
              size: 6, // 0.3pt
              style: BorderStyle.SINGLE,
              space: DOCX_BORDER_SPACE
            };
          }
          
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.trim(),
                  font: 'Noto Sans KR'
                })
              ],
              spacing: { 
                before: isFirstLine ? 160 : 80,
                after: isLastLine ? 160 : 80
              },
              indent: { left: 0, right: 0 },
              border: borderConfig
            })
          );
        });
      }
    }
  }
  
  // 모든 텍스트 콘텐츠가 없으면 기본 텍스트 추출
  if (paragraphs.length === 0) {
    const allText = element.textContent?.trim() || '';
    if (allText) {
      const lines = allText.split(/\n+/).filter(line => line.trim());
      lines.forEach(line => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.trim(),
                font: 'Noto Sans KR'
              })
            ],
            spacing: { after: 200 }
          })
        );
      });
    }
  }
  
  return paragraphs;
};

// HTML 요소를 DOC 파일로 변환하여 Firebase Storage에 업로드 및 다운로드
const deriveDocPrefix = (workTypeName: string): string => {
  if (!workTypeName) return 'DOC';

  const packageMatch = workTypeName.match(/패키지#?(\d+)/i);
  if (packageMatch) {
    return `P${packageMatch[1].padStart(2, '0')}`;
  }

  const typeMatch = workTypeName.match(/유형#?(\d+)/i);
  if (typeMatch) {
    return `T${typeMatch[1].padStart(2, '0')}`;
  }

  const normalized = workTypeName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return normalized || 'DOC';
};

export const generateAndUploadDOC = async (
  element: HTMLElement,
  userId: string,
  historyId: string,
  workTypeName: string,
  options: PDFGenerationOptions = {}
): Promise<{ url: string; fileName: string; size: number }> => {
  try {
    const { isAnswerMode = false } = options;
    
    // HTML을 구조화된 DOCX Paragraph로 변환 (PDF 디자인과 동일하게)
    const paragraphs = htmlToDocxParagraphs(element);
    
    // DOCX 문서 생성 (제목/생성일 없이 PDF와 동일한 구조, Noto Sans KR 폰트)
    const doc = new DocxDocument({
      sections: [{
        properties: {},
        children: paragraphs.length > 0 ? paragraphs : [
          new Paragraph({
            children: [
              new TextRun({
                text: '문제 내용이 없습니다.',
                font: 'Noto Sans KR'
              })
            ],
            spacing: { after: 200 }
          })
        ]
      }]
    });
    
    // DOCX를 Blob으로 변환
    const blob = await Packer.toBlob(doc);
    
    // 파일명 생성
    const now = new Date();
    const prefix = deriveDocPrefix(workTypeName);
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const fileName = `${prefix}_${dateStr}_${timeStr}.docx`;
    
    // 파일 다운로드 (Firebase 업로드 전에 먼저 다운로드)
    downloadBlob(blob, fileName);
    
    // Firebase Storage에 업로드
    const storageRef = ref(storage, `quiz-files/${userId}/${fileName}`);
    await uploadBytes(storageRef, blob);
    
    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(storageRef);
    
    return {
      url: downloadURL,
      fileName,
      size: blob.size
    };
  } catch (error) {
    console.error('DOC 생성 및 업로드 실패:', error);
    throw error;
  }
};

// 통합 파일 생성 함수 (형식에 따라 PDF/DOC 생성)
export const generateAndUploadFile = async (
  element: HTMLElement,
  userId: string,
  historyId: string,
  workTypeName: string,
  options: FileGenerationOptions = {}
): Promise<{ url: string; fileName: string; size: number }> => {
  const { fileFormat = 'pdf' } = options;
  
  switch (fileFormat) {
    case 'doc':
      return await generateAndUploadDOC(element, userId, historyId, workTypeName, options);
    case 'pdf':
    default:
      return await generateAndUploadPDF(element, userId, historyId, workTypeName, options);
  }
};

