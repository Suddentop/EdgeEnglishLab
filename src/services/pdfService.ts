import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, UnderlineType, TabStopType, TabStopPosition } from 'docx';
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
        hasA4TemplateWork16: element.querySelector('.a4-landscape-page-template-work16') !== null,
        hasA4TemplateWork12: element.querySelector('.a4-page-template-work12') !== null,
        isAnswerMode
      });
    }
    
    const pageElements = element.querySelectorAll('.print-page, .a4-landscape-page-template, .a4-landscape-page-template-work16, .a4-page-template-work12');
    const hasMultiplePages = pageElements.length > 0;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📄 페이지 요소 검색 결과:', {
        totalPages: pageElements.length,
        pageIds: Array.from(pageElements).map(el => (el as HTMLElement).id),
        hasMultiplePages
      });
    }
    
    // PDF 생성
    // orientation 파라미터를 강제로 적용 (요소 크기와 무관하게)
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // 디버깅: PDF 크기 확인
    if (process.env.NODE_ENV === 'development') {
      console.log('📄 PDF 생성 설정:', {
        orientation,
        pdfWidth,
        pdfHeight,
        expectedPortrait: orientation === 'portrait' ? '210mm x 297mm' : '297mm x 210mm',
        actualSize: `${pdfWidth}mm x ${pdfHeight}mm`
      });
    }
    
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
          // 화면에 보이지 않도록 완전히 숨김 (html2canvas는 opacity: 0인 요소도 캡처 가능)
          tempContainer.style.position = 'fixed';
          tempContainer.style.top = '-99999px';
          tempContainer.style.left = '-99999px';
          tempContainer.style.width = `${A4_LANDSCAPE_WIDTH_PX}px`;
          tempContainer.style.height = `${A4_LANDSCAPE_HEIGHT_PX}px`;
          tempContainer.style.overflow = 'hidden';
          tempContainer.style.backgroundColor = '#ffffff';
          tempContainer.style.opacity = '0';
          tempContainer.style.visibility = 'hidden';
          tempContainer.style.pointerEvents = 'none';
          tempContainer.style.zIndex = '-9999';
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
      let elementWidth = element.scrollWidth || element.offsetWidth || 800;
      let elementHeight = element.scrollHeight || element.offsetHeight || 600;
      
      // orientation 파라미터를 기반으로 크기 조정
      // portrait인 경우: width < height가 되도록 보장
      // landscape인 경우: width > height가 되도록 보장
      if (orientation === 'portrait' && elementWidth > elementHeight) {
        // 가로가 더 긴 경우, 세로로 강제 변환
        // A4 세로: 21cm x 29.7cm (794px x 1123px at 96 DPI)
        const A4_PORTRAIT_WIDTH_PX = 794; // 21cm
        
        // 요소의 실제 내용 높이를 기준으로 조정
        // scrollHeight를 사용하여 실제 내용 높이 확인
        const actualContentHeight = element.scrollHeight || elementHeight;
        
        // 너비를 A4 세로 기준으로 고정
        elementWidth = A4_PORTRAIT_WIDTH_PX;
        // 높이는 실제 내용 높이 사용 (최소값 보장)
        elementHeight = Math.max(actualContentHeight, 600);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Portrait 모드: 요소 크기 조정', {
            original: { width: element.scrollWidth || element.offsetWidth, height: element.scrollHeight || element.offsetHeight },
            adjusted: { width: elementWidth, height: elementHeight },
            actualContentHeight
          });
        }
      } else if (orientation === 'landscape' && elementWidth < elementHeight) {
        // 세로가 더 긴 경우, 가로로 강제 변환
        // A4 가로: 29.7cm x 21cm (1123px x 794px at 96 DPI)
        const A4_LANDSCAPE_WIDTH_PX = 1123; // 29.7cm
        const A4_LANDSCAPE_HEIGHT_PX = 794; // 21cm
        
        const actualContentWidth = element.scrollWidth || elementWidth;
        
        // 너비를 A4 가로 기준으로 고정
        elementWidth = A4_LANDSCAPE_WIDTH_PX;
        // 높이는 실제 내용 높이 사용 (최대값 제한)
        elementHeight = Math.min(element.scrollHeight || elementHeight, A4_LANDSCAPE_HEIGHT_PX);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Landscape 모드: 요소 크기 조정', {
            original: { width: element.scrollWidth || element.offsetWidth, height: element.scrollHeight || element.offsetHeight },
            adjusted: { width: elementWidth, height: elementHeight },
            actualContentWidth
          });
        }
      }
      
      // A4 가로 크기 상수 정의 (유형#16용)
      const A4_LANDSCAPE_WIDTH_PX = 1123; // 29.7cm
      const A4_LANDSCAPE_HEIGHT_PX = 794; // 21cm
      
      console.log('📏 요소 크기:', { width: elementWidth, height: elementHeight, orientation });

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
            const clonedEl = clonedElement as HTMLElement;
            clonedEl.style.width = `${elementWidth}px`;
            clonedEl.style.height = `${elementHeight}px`;
            clonedEl.style.maxWidth = `${elementWidth}px`;
            clonedEl.style.minWidth = `${elementWidth}px`;
            clonedEl.style.boxSizing = 'border-box';
            clonedEl.style.overflow = 'hidden'; // 스크롤바 방지
            
            // body와 html 요소도 스크롤바 방지
            const body = clonedDoc.body;
            if (body) {
              body.style.overflow = 'hidden';
              body.style.margin = '0';
              body.style.padding = '0';
            }
            const html = clonedDoc.documentElement;
            if (html) {
              html.style.overflow = 'hidden';
              html.style.margin = '0';
              html.style.padding = '0';
            }
            
            // 패키지#01인 경우 추가 스타일 적용
            if (element.id === 'print-root-package01' || element.id === 'print-root-package01-answer') {
              clonedEl.style.width = '794px'; // 21cm
              clonedEl.style.maxWidth = '794px';
              clonedEl.style.minWidth = '794px';
              
              // 내부 .print-container도 조정
              const printContainer = clonedEl.querySelector('.print-container');
              if (printContainer) {
                (printContainer as HTMLElement).style.width = '794px';
                (printContainer as HTMLElement).style.maxWidth = '794px';
                (printContainer as HTMLElement).style.minWidth = '794px';
              }
            }
            
            // 유형#16인 경우 추가 스타일 적용
            if (element.id === 'print-root-work16-new' || element.id === 'print-root-work16-new-answer') {
              clonedEl.style.width = `${A4_LANDSCAPE_WIDTH_PX}px`; // 29.7cm
              clonedEl.style.height = `${A4_LANDSCAPE_HEIGHT_PX}px`; // 21cm
              clonedEl.style.maxWidth = `${A4_LANDSCAPE_WIDTH_PX}px`;
              clonedEl.style.minWidth = `${A4_LANDSCAPE_WIDTH_PX}px`;
              clonedEl.style.maxHeight = `${A4_LANDSCAPE_HEIGHT_PX}px`;
              clonedEl.style.minHeight = `${A4_LANDSCAPE_HEIGHT_PX}px`;
              clonedEl.style.overflow = 'hidden';
              
              // 내부 .a4-landscape-page-template-work16 요소도 조정
              const work16Pages = clonedEl.querySelectorAll('.a4-landscape-page-template-work16');
              work16Pages.forEach((page) => {
                const pageEl = page as HTMLElement;
                pageEl.style.width = `${A4_LANDSCAPE_WIDTH_PX}px`;
                pageEl.style.height = `${A4_LANDSCAPE_HEIGHT_PX}px`;
                pageEl.style.maxWidth = `${A4_LANDSCAPE_WIDTH_PX}px`;
                pageEl.style.minWidth = `${A4_LANDSCAPE_WIDTH_PX}px`;
                pageEl.style.maxHeight = `${A4_LANDSCAPE_HEIGHT_PX}px`;
                pageEl.style.minHeight = `${A4_LANDSCAPE_HEIGHT_PX}px`;
                pageEl.style.overflow = 'hidden';
              });
            }
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

    // 유형#02 교체된 단어 강조 (.print-word-highlight)
    if (el.classList.contains('print-word-highlight')) {
      nextStyles.bold = true;
    }

    // 유형#13 빈칸 정답 (.print-blank-filled-answer) - 파란색 진하게
    if (el.classList.contains('print-blank-filled-answer')) {
      nextStyles.bold = true;
      nextStyles.color = '1565C0'; // 파란색 (#1565c0)
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

const htmlToDocxParagraphs = (element: HTMLElement, isAnswerMode: boolean = false): (Paragraph | Table)[] => {
  const paragraphs: (Paragraph | Table)[] = [];
  
  // DOM에서 정답 모드 확인 (백업)
  const isAnswerModeFromDOM = element.classList.contains('print-container-answer') || 
                              element.querySelector('.print-container-answer') !== null;
  const actualIsAnswerMode = isAnswerMode || isAnswerModeFromDOM;
  
  // 디버깅: 요소 구조 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 htmlToDocxParagraphs 시작:', {
      elementId: element.id,
      elementClass: element.className,
      elementTag: element.tagName,
      hasPrintQuestionCard: element.querySelector('.print-question-card') !== null,
      printQuestionCardCount: element.querySelectorAll('.print-question-card').length,
      hasA4LandscapeTemplate: element.querySelector('.a4-landscape-page-template') !== null,
      a4LandscapeTemplateCount: element.querySelectorAll('.a4-landscape-page-template').length,
      hasPrintColumn: element.querySelector('.print-column') !== null,
      printColumnCount: element.querySelectorAll('.print-column').length,
      textContentLength: element.textContent?.trim().length || 0
    });
  }
  
  // 유형#12 특별 처리
  const work12Template = element.querySelector('.a4-page-template-work12, .only-print-work12');
  if (work12Template) {
    // 유형#12 헤더 찾기
    const work12Header = work12Template.querySelector('.a4-page-header-work12, .print-header-work12');
    if (work12Header) {
      const headerText = work12Header.querySelector('.print-header-text-work12');
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
              spacing: { after: 100 },
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
    
    // 문제 제목 및 유형번호 찾기
    const problemInstruction = work12Template.querySelector('.problem-instruction-work12');
    if (problemInstruction) {
      const instructionText = problemInstruction.querySelector('.problem-instruction-text-work12');
      const typeLabel = problemInstruction.querySelector('.problem-type-label-work12');
      
      const instruction = instructionText?.textContent?.trim() || '';
      const typeBadge = typeLabel?.textContent?.trim() || '유형#12';
      
      if (instruction) {
        // 문제 제목 (유형번호는 우측 정렬)
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: instruction,
                font: 'Noto Sans KR',
                size: 22, // 11pt
                color: '000000' // 검은색
              }),
              new TextRun({
                text: '\t',
                font: 'Noto Sans KR'
              }),
              new TextRun({
                text: typeBadge,
                font: 'Noto Sans KR',
                size: 22,
                bold: true,
                color: '000000' // 검은색
              })
            ],
            spacing: { before: 100, after: 100 },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: TabStopPosition.MAX
              }
            ],
            shading: {
              type: ShadingType.SOLID,
              color: 'FFFFFF', // 흰색 배경
              fill: 'FFFFFF' // 흰색 배경
            }
          })
        );
      }
    }
    
    // 단어 테이블 찾기 (2단 레이아웃 처리)
    const wordListContainer = work12Template.querySelector('.word-list-container-work12');
    if (wordListContainer) {
      const columns = wordListContainer.querySelectorAll('.word-list-column-work12');
      
      if (columns.length === 2) {
        // 좌우 컬럼이 모두 있는 경우: 하나의 큰 테이블로 통합하여 2단 레이아웃 구현
        const leftTable = columns[0].querySelector('.word-list-table-work12');
        const rightTable = columns[1].querySelector('.word-list-table-work12');
        
        if (leftTable && rightTable) {
          const leftThead = leftTable.querySelector('thead');
          const leftTbody = leftTable.querySelector('tbody');
          const rightThead = rightTable.querySelector('thead');
          const rightTbody = rightTable.querySelector('tbody');
          
          if (leftThead && leftTbody && rightThead && rightTbody) {
            // 왼쪽 테이블의 행 수와 오른쪽 테이블의 행 수 중 더 큰 값 사용
            const leftRows = Array.from(leftTbody.querySelectorAll('tr'));
            const rightRows = Array.from(rightTbody.querySelectorAll('tr'));
            const maxRows = Math.max(leftRows.length, rightRows.length);
            
            // 헤더 행 생성 (좌우 각각)
            const leftHeaderRow = leftThead.querySelector('tr');
            const rightHeaderRow = rightThead.querySelector('tr');
            
            if (leftHeaderRow && rightHeaderRow) {
              const leftHeaderCells = Array.from(leftHeaderRow.querySelectorAll('th')).map((th, index, array) => {
                let text = th.textContent?.trim() || '';
                // "한국어"를 "한글뜻"으로, "영어"를 "영어단어"로 변경
                if (text === '한국어') {
                  text = '한글뜻';
                } else if (text === '영어') {
                  text = '영어단어';
                }
                const isLastCell = index === array.length - 1;
                return new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: text,
                          bold: true,
                          font: 'Noto Sans KR',
                          size: 20, // 10pt
                          color: '000000' // 검은색
                        })
                      ],
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 40, after: 40 }
                    })
                  ],
                  margins: {
                    top: 60,
                    bottom: 60,
                    left: 100,
                    right: 100
                  },
                  shading: {
                    type: ShadingType.SOLID,
                    color: 'E0E0E0', // 연한 회색 배경
                    fill: 'E0E0E0' // 연한 회색 배경
                  },
                  borders: isLastCell ? {
                    right: {
                      color: '000000',
                      size: 40, // 2pt - 진한 테두리
                      style: BorderStyle.SINGLE
                    }
                  } : undefined
                });
              });
              
              const rightHeaderCells = Array.from(rightHeaderRow.querySelectorAll('th')).map((th, index) => {
                let text = th.textContent?.trim() || '';
                // "한국어"를 "한글뜻"으로, "영어"를 "영어단어"로 변경
                if (text === '한국어') {
                  text = '한글뜻';
                } else if (text === '영어') {
                  text = '영어단어';
                }
                const isFirstCell = index === 0;
                return new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: text,
                          bold: true,
                          font: 'Noto Sans KR',
                          size: 20, // 10pt
                          color: '000000' // 검은색
                        })
                      ],
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 40, after: 40 }
                    })
                  ],
                  margins: {
                    top: 60,
                    bottom: 60,
                    left: 100,
                    right: 100
                  },
                  shading: {
                    type: ShadingType.SOLID,
                    color: 'E0E0E0', // 연한 회색 배경
                    fill: 'E0E0E0' // 연한 회색 배경
                  },
                  borders: isFirstCell ? {
                    left: {
                      color: '000000',
                      size: 40, // 2pt - 진한 테두리
                      style: BorderStyle.SINGLE
                    }
                  } : undefined
                });
              });
              
              // 헤더 행: 왼쪽 컬럼 + 오른쪽 컬럼 (구분 열 제거)
              const headerRow = new TableRow({
                children: [
                  ...leftHeaderCells,
                  ...rightHeaderCells
                ]
              });
              
              // 바디 행들 생성
              const bodyRows: TableRow[] = [];
              for (let i = 0; i < maxRows; i++) {
                const leftRow = leftRows[i];
                const rightRow = rightRows[i];
                
                const leftCells = leftRow 
                  ? Array.from(leftRow.querySelectorAll('td')).map((td, cellIndex, array) => {
                      const text = td.textContent?.trim() || '';
                      const isAnswerCell = td.classList.contains('answer-cell');
                      const isLastCell = cellIndex === array.length - 1;
                      
                      return new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: text,
                                font: 'Noto Sans KR',
                                size: 20, // 10pt
                                bold: isAnswerCell,
                                color: isAnswerCell ? '1976D2' : '000000' // 정답 셀은 파란색
                              })
                            ],
                            alignment: cellIndex === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                            spacing: { before: 20, after: 20 }
                          })
                        ],
                        margins: {
                          top: 40,
                          bottom: 40,
                          left: 100,
                          right: 100
                        },
                        shading: undefined, // 정답 셀 배경색 제거
                        borders: isLastCell ? {
                          right: {
                            color: '000000',
                            size: 40, // 2pt - 진한 테두리
                            style: BorderStyle.SINGLE
                          }
                        } : undefined
                      });
                    })
                  : [
                      new TableCell({ children: [new Paragraph({ text: '' })] }),
                      new TableCell({ children: [new Paragraph({ text: '' })] }),
                      new TableCell({ children: [new Paragraph({ text: '' })] })
                    ];
                
                const rightCells = rightRow
                  ? Array.from(rightRow.querySelectorAll('td')).map((td, cellIndex) => {
                      const text = td.textContent?.trim() || '';
                      const isAnswerCell = td.classList.contains('answer-cell');
                      const isFirstCell = cellIndex === 0;
                      
                      return new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: text,
                                font: 'Noto Sans KR',
                                size: 20, // 10pt
                                bold: isAnswerCell,
                                color: isAnswerCell ? '1976D2' : '000000' // 정답 셀은 파란색
                              })
                            ],
                            alignment: cellIndex === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                            spacing: { before: 20, after: 20 }
                          })
                        ],
                        margins: {
                          top: 40,
                          bottom: 40,
                          left: 100,
                          right: 100
                        },
                        shading: undefined, // 정답 셀 배경색 제거
                        borders: isFirstCell ? {
                          left: {
                            color: '000000',
                            size: 40, // 2pt - 진한 테두리
                            style: BorderStyle.SINGLE
                          }
                        } : undefined
                      });
                    })
                  : [
                      new TableCell({ children: [new Paragraph({ text: '' })] }),
                      new TableCell({ children: [new Paragraph({ text: '' })] }),
                      new TableCell({ children: [new Paragraph({ text: '' })] })
                    ];
                
                bodyRows.push(
                  new TableRow({
                    children: [
                      ...leftCells,
                      ...rightCells
                    ]
                  })
                );
              }
              
              // 통합 테이블 생성 (2단 레이아웃)
              paragraphs.push(
                new Table({
                  rows: [headerRow, ...bodyRows],
                  width: {
                    size: 100,
                    type: WidthType.PERCENTAGE
                  },
                  columnWidths: [
                    500, 2700, 1800, // 왼쪽: No. 5%, 한글뜻 27% (6), 영어단어 18% (4) - 6:4 비율, 전체의 50%
                    500, 2700, 1800  // 오른쪽: No. 5%, 한글뜻 27% (6), 영어단어 18% (4) - 6:4 비율, 전체의 50%
                  ]
                })
              );
            }
          }
        }
      } else {
        // 단일 컬럼인 경우: 기존 로직 사용
        const wordTables = work12Template.querySelectorAll('.word-list-table-work12');
        if (wordTables.length > 0) {
          wordTables.forEach((table) => {
            const thead = table.querySelector('thead');
            const tbody = table.querySelector('tbody');
            
            if (thead && tbody) {
              const headerRow = thead.querySelector('tr');
              if (headerRow) {
                const headerCells = Array.from(headerRow.querySelectorAll('th')).map((th) => {
                  let text = th.textContent?.trim() || '';
                  // "한국어"를 "한글뜻"으로, "영어"를 "영어단어"로 변경
                  if (text === '한국어') {
                    text = '한글뜻';
                  } else if (text === '영어') {
                    text = '영어단어';
                  }
                  return new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: text,
                            bold: true,
                            font: 'Noto Sans KR',
                            size: 20, // 10pt
                            color: '000000' // 검은색
                          })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 40, after: 40 }
                      })
                    ],
                    margins: {
                      top: 60,
                      bottom: 60,
                      left: 100,
                      right: 100
                    },
                    shading: {
                      type: ShadingType.SOLID,
                      color: 'E0E0E0', // 연한 회색 배경
                      fill: 'E0E0E0' // 연한 회색 배경
                    }
                  });
                });
                
                const bodyRows = Array.from(tbody.querySelectorAll('tr')).map((tr) => {
                  const cells = Array.from(tr.querySelectorAll('td')).map((td, cellIndex) => {
                    const text = td.textContent?.trim() || '';
                    const isAnswerCell = td.classList.contains('answer-cell');
                    
                    return new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: text,
                              font: 'Noto Sans KR',
                              size: 20, // 10pt
                              bold: isAnswerCell,
                              color: isAnswerCell ? '1976D2' : '000000' // 정답 셀은 파란색
                            })
                          ],
                          alignment: cellIndex === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                          spacing: { before: 20, after: 20 }
                        })
                      ],
                      margins: {
                        top: 40,
                        bottom: 40,
                        left: 100,
                        right: 100
                      },
                      shading: undefined // 정답 셀 배경색 제거
                    });
                  });
                  
                  return new TableRow({
                    children: cells
                  });
                });
                
                paragraphs.push(
                  new Table({
                    rows: [
                      new TableRow({
                        children: headerCells
                      }),
                      ...bodyRows
                    ],
                    width: {
                      size: 100,
                      type: WidthType.PERCENTAGE
                    },
                    columnWidths: [1200, 4800, 3200] // No.: 12%, 한글뜻: 48% (6), 영어단어: 32% (4) - 6:4 비율
                  })
                );
              }
            }
          });
        }
      }
      
      // 테이블 후 간격
      paragraphs.push(
        new Paragraph({
          text: '',
          spacing: { before: 100, after: 0 }
        })
      );
    }
    
    // 유형#12 처리가 완료되었으므로 여기서 반환
    if (process.env.NODE_ENV === 'development') {
      const wordListContainer = work12Template.querySelector('.word-list-container-work12');
      const tableCount = wordListContainer 
        ? wordListContainer.querySelectorAll('.word-list-table-work12').length 
        : 0;
      
      console.log('🔍 htmlToDocxParagraphs - 유형#12 처리 완료:', {
        totalParagraphs: paragraphs.length,
        hasHeader: !!work12Header,
        hasInstruction: !!problemInstruction,
        hasWordListContainer: !!wordListContainer,
        tableCount: tableCount
      });
    }
    
    return paragraphs;
  }
  
  // 헤더 찾기 (가로선 포함) - PDF와 동일한 구조
  // 패키지#02: .print-header-package02 > .print-header-text-package02
  // 유형#01-15: .a4-page-header > .print-header-text-work01
  const header = element.querySelector('.a4-landscape-page-header, .a4-page-header, .print-header-package02');
  if (header) {
    // 여러 헤더 텍스트 셀렉터 시도
    const headerText = header.querySelector('.print-header-text-package02, .print-header-text-work01, .print-header-text');
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
  // 유형#15는 .quiz-content를 사용하지만 특수 구조이므로 별도로 처리됨
  // 패키지#01 유형#11: .work-11-print도 포함
  // 패키지#01: .a4-page-template을 우선으로 찾고, wrapper div는 제외 (중복 방지)
  // 패키지#02: .print-question-card 사용
  // 유형#05, #06: .a4-landscape-page-template 사용
  const allCards = element.querySelectorAll('.print-question-card, .quiz-content, .work-11-print, .a4-page-template, .a4-landscape-page-template, [data-work-type]');
  
  // 디버깅: 찾은 카드 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 htmlToDocxParagraphs - 찾은 카드:', {
      totalCards: allCards.length,
      cards: Array.from(allCards).map((card, idx) => ({
        index: idx,
        tagName: card.tagName,
        className: card.className,
        id: (card as HTMLElement).id,
        dataWorkType: (card as HTMLElement).getAttribute('data-work-type'),
        hasPrintQuestionCard: card.querySelector('.print-question-card') !== null,
        textContentPreview: card.textContent?.trim().substring(0, 50) || ''
      }))
    });
  }
  
  // 중복 제거 및 필터링 강화
  const uniqueCards: Element[] = [];
  const processedSet = new Set<Element>();

  // 1. 템플릿 클래스 우선 수집 (가장 확실한 페이지 단위)
  const templates: Element[] = [];
  const templatesWithCards: Element[] = []; // 내부에 .print-question-card가 있는 템플릿
  allCards.forEach((card) => {
    if (card.classList.contains('a4-page-template') || card.classList.contains('a4-landscape-page-template')) {
      // 내부에 print-question-card가 있으면 템플릿 수집 제외 (카드 단위로 처리하기 위해)
      // 이렇게 해야 다단 컬럼 등의 복잡한 레이아웃에서 카드별로 정확히 분리됨
      if (card.querySelector('.print-question-card')) {
        templatesWithCards.push(card);
        return;
      }
      templates.push(card);
    }
  });

  // 헬퍼 함수: 요소 간의 DOM 거리 계산 (깊이 기준)
  const getElementDistance = (ancestor: Element, descendant: Element): number => {
    let distance = 0;
    let current: Element | null = descendant;
    while (current && current !== ancestor) {
      distance++;
      current = current.parentElement;
    }
    return current === ancestor ? distance : Infinity;
  };

  // 템플릿들 간의 중복(포함 관계) 제거
  templates.forEach(template => {
    let isChild = false;
    for (const other of templates) {
      if (template !== other && other.contains(template)) {
        isChild = true;
        break;
      }
    }
    if (!isChild) {
      uniqueCards.push(template);
      processedSet.add(template);
    }
  });

  // 1.5. templatesWithCards에 있는 템플릿 내부의 .print-question-card 찾아서 추가
  // 이렇게 해야 .a4-landscape-page-template 내부에 .print-question-card가 있는 경우 카드를 찾을 수 있음
  templatesWithCards.forEach(template => {
    const cardsInsideTemplate = template.querySelectorAll('.print-question-card');
    cardsInsideTemplate.forEach(card => {
      // 이미 추가된 카드인지 확인
      if (!processedSet.has(card)) {
        // 다른 템플릿 내부에 있는지 확인 (중복 방지)
        let isInsideOtherTemplate = false;
        for (const otherTemplate of templatesWithCards) {
          if (otherTemplate !== template && otherTemplate.contains(card)) {
            // 다른 템플릿도 이 카드를 포함하고 있으면, 더 가까운 템플릿만 사용
            // (일반적으로는 발생하지 않지만 안전을 위해)
            const templateDistance = getElementDistance(template, card);
            const otherTemplateDistance = getElementDistance(otherTemplate, card);
            if (otherTemplateDistance < templateDistance) {
              isInsideOtherTemplate = true;
              break;
            }
          }
        }
        if (!isInsideOtherTemplate) {
          uniqueCards.push(card);
          processedSet.add(card);
        }
      }
    });
  });

  // 2. 나머지 요소 처리 (독립적인 카드이거나 컨텐츠인 경우)
  allCards.forEach((card) => {
    // 템플릿 클래스는 이미 위에서 처리했거나 제외되었으므로 스킵
    if (card.classList.contains('a4-page-template') || card.classList.contains('a4-landscape-page-template')) {
      return;
    }

    // 이미 처리된 요소의 자손인지 확인 (템플릿 내부에 있는 요소면 제외)
    // 단, 템플릿이 제외된 경우(내부에 .print-question-card가 있는 경우)에는 카드를 포함해야 함
    let isInsideProcessed = false;
    for (const processed of uniqueCards) {
      if (processed.contains(card)) {
        isInsideProcessed = true;
        break;
      }
    }
    // 템플릿 내부에 .print-question-card가 있는 경우, 템플릿은 제외되었으므로 카드는 포함해야 함
    // templatesWithCards에 있는 템플릿 내부의 카드는 포함
    if (isInsideProcessed) {
      let isInsideTemplateWithCards = false;
      for (const templateWithCards of templatesWithCards) {
        if (templateWithCards.contains(card)) {
          isInsideTemplateWithCards = true;
          break;
        }
      }
      // 템플릿 내부에 카드가 있는 경우가 아니면 제외
      if (!isInsideTemplateWithCards) {
        return;
      }
    }

    // 이미 처리된 요소가 이 요소의 내부에 있는지 확인 (Wrapper인 경우 제외)
    let containsProcessed = false;
    for (const processed of uniqueCards) {
      if (card.contains(processed)) {
        containsProcessed = true;
        break;
      }
    }
    if (containsProcessed) return;

    // 유효한 요소만 추가
    if (card.classList.contains('print-question-card') || 
        card.classList.contains('quiz-content') || 
        card.classList.contains('work-11-print') ||
        card.hasAttribute('data-work-type')) {
      uniqueCards.push(card);
      processedSet.add(card);
    }
  });
  
  const questionCards = uniqueCards;
  
  // 디버깅: 최종 선택된 카드 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 htmlToDocxParagraphs - 최종 선택된 카드:', {
      totalQuestionCards: questionCards.length,
      questionCards: Array.from(questionCards).map((card, idx) => ({
        index: idx,
        tagName: card.tagName,
        className: card.className,
        id: (card as HTMLElement).id,
        dataWorkType: (card as HTMLElement).getAttribute('data-work-type'),
        textContentPreview: card.textContent?.trim().substring(0, 100) || ''
      }))
    });
  }
  
  // 패키지#02인지 확인 (헤더 또는 .print-question-card 존재 여부)
  const isPackage02 = element.querySelector('.print-header-package02') !== null || 
                      element.querySelector('.print-question-card') !== null;
  
  // 유형#11 처리 플래그 (순서를 유지하기 위해 questionCards 루프 안에서 처리)
  let work11SentencesProcessed = false;
  
  // 유형#11인지 확인하는 헬퍼 함수
  const isWork11Card = (card: Element): boolean => {
    // data-work-type 속성 확인
    const workType = (card as HTMLElement).getAttribute('data-work-type');
    if (workType === '11' || workType === '011') {
      return true;
    }
    
    // .work-11-print 클래스 확인 (패키지#01 유형#11)
    if (card.classList.contains('work-11-print')) {
      return true;
    }
    
    // 부모 요소에서도 확인 (패키지#01의 경우 wrapper div에 있을 수 있음)
    let parent = (card as HTMLElement).parentElement;
    while (parent) {
      const parentWorkType = parent.getAttribute('data-work-type');
      if (parentWorkType === '11' || parentWorkType === '011') {
        return true;
      }
      // 부모가 .work-11-print인 경우도 확인
      if (parent.classList.contains('work-11-print')) {
        return true;
      }
      parent = parent.parentElement;
    }
    
    // 타입 뱃지 텍스트 확인
    const typeBadge = card.querySelector('.print-question-type-badge, .question-type-badge, .problem-type-badge');
    const rawTypeLabel = typeBadge?.textContent?.trim() || '';
    const typeLabel = rawTypeLabel ? rawTypeLabel.replace(/\s+/g, '') : '';
    
    // 제목에서도 확인
    const title = card.querySelector('.print-question-title, .question-title');
    const titleText = title?.textContent?.trim() || '';
    
    return typeLabel.includes('11') || 
           typeLabel.includes('#11') || 
           titleText.includes('#11') || 
           titleText.includes('본문 문장별 해석');
  };
  
  // 유형#11의 모든 문장을 카드별로 수집하는 함수
  const collectWork11SentencesByCard = (allWork11Cards: Element[]): Array<{
    cardTitle: string;
    typeBadge: string;
    instruction: string;
    sentences: Array<{ englishText: string; koreanText: string }>
  }> => {
    const cardGroups: Array<{
      cardTitle: string;
      typeBadge: string;
      instruction: string;
      sentences: Array<{ englishText: string; koreanText: string }>
    }> = [];
    
    allWork11Cards.forEach((card, cardIdx) => {
      // 카드 제목 추출
      const titleElement = card.querySelector('.print-question-title, .question-title');
      let cardTitle = titleElement?.textContent?.trim() || '';
      // 제목에서 타입 뱃지 제거 (이미 포함되어 있을 수 있음)
      cardTitle = cardTitle.replace(/\s*유형#\d+\s*/g, '').trim();
      
      // 타입 뱃지 추출
      const typeBadgeElement = card.querySelector('.print-question-type-badge, .question-type-badge, .problem-type-badge');
      let typeBadgeText = typeBadgeElement?.textContent?.trim() || '';
      // 타입 뱃지가 없으면 data-work-type에서 생성
      if (!typeBadgeText) {
        const workType = (card as HTMLElement).getAttribute('data-work-type');
        if (workType === '11' || workType === '011') {
          typeBadgeText = '유형#11';
        }
      }
      
      // 지시문 추출
      const instructionElement = card.querySelector('.print-instruction, .problem-instruction');
      let instruction = instructionElement?.textContent?.trim() || '';
      // "문제: " 제거
      if (instruction.startsWith('문제:')) {
        instruction = instruction.replace(/^문제:\s*/, '').trim();
      }
      if (instruction.startsWith('문제 :')) {
        instruction = instruction.replace(/^문제\s*:\s*/, '').trim();
      }
      // 지시문이 없으면 기본 지시문 사용
      if (!instruction) {
        instruction = '다음 본문의 각 문장을 한국어로 해석하세요.';
      }
      
      // PrintFormatWork11New: .work11-sentence-item 사용
      // 패키지#01 유형#11: .work11-print-answer-sentence, .work11-print-problem-sentence도 포함
      // 패키지#02 유형#11: .print-sentence-item, .sentence-item도 포함
      const sentenceItems = card.querySelectorAll('.work11-sentence-item, .print-sentence-item, .sentence-item, .work11-print-answer-sentence, .work11-print-problem-sentence');
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 유형#11 카드 ${cardIdx + 1}에서 문장 ${sentenceItems.length}개 발견`);
      }
      
      const sentences: Array<{ englishText: string; koreanText: string }> = [];
      
      sentenceItems.forEach((item) => {
        // PrintFormatWork11New: .work11-sentence-item 처리
        if (item.classList.contains('work11-sentence-item')) {
          const itemElement = item as HTMLElement;
          
          // 영어 문장 추출 (.work11-sentence-text 또는 .work11-sentence-english 내부)
          const sentenceText = itemElement.querySelector('.work11-sentence-text');
          const sentenceEnglish = itemElement.querySelector('.work11-sentence-english');
          let englishText = '';
          
          if (sentenceText) {
            englishText = sentenceText.textContent?.trim() || '';
          } else if (sentenceEnglish) {
            // .work11-sentence-english 내부에서 번호 제거
            const englishClone = sentenceEnglish.cloneNode(true) as HTMLElement;
            const numberSpan = englishClone.querySelector('.work11-sentence-number');
            if (numberSpan) {
              numberSpan.remove();
            }
            englishText = englishClone.textContent?.trim() || '';
          } else {
            // 폴백: 전체 텍스트에서 번호 제거
            let fullText = itemElement.textContent?.trim() || '';
            // 번호 제거 (예: "1. " 또는 "1.")
            fullText = fullText.replace(/^\d+\.\s*/, '').trim();
            // 해석 부분 제거 (": "로 시작하는 부분)
            const translationIndex = fullText.indexOf(': ');
            if (translationIndex > 0) {
              englishText = fullText.substring(0, translationIndex).trim();
            } else {
              englishText = fullText;
            }
          }
          
          // 한국어 해석 추출 (.work11-sentence-translation)
          const translationDiv = itemElement.querySelector('.work11-sentence-translation');
          let koreanText = '';
          if (translationDiv) {
            let translationText = translationDiv.textContent?.trim() || '';
            // ": " 제거
            translationText = translationText.replace(/^:\s*/, '').trim();
            koreanText = translationText;
          }
          
          if (englishText) {
            sentences.push({ englishText, koreanText });
          }
        }
        // 패키지#01 유형#11: .work11-print-answer-sentence, .work11-print-problem-sentence 처리
        else if (item.classList.contains('work11-print-answer-sentence') || item.classList.contains('work11-print-problem-sentence')) {
          const itemElement = item as HTMLElement;
          // 첫 번째 div에 문장 번호와 영어 문장이 있음
          const firstDiv = itemElement.querySelector('div:first-child');
          if (firstDiv) {
            let englishText = firstDiv.textContent?.trim() || '';
            // "1. " 같은 번호 제거
            englishText = englishText.replace(/^\d+\.\s*/, '').trim();
            
            // 두 번째 div에 한국어 해석이 있음 (정답 모드일 때만)
            const secondDiv = itemElement.querySelector('div:nth-child(2)');
            let koreanText = '';
            if (secondDiv && item.classList.contains('work11-print-answer-sentence')) {
              koreanText = secondDiv.textContent?.trim() || '';
            }
            
            if (englishText) {
              sentences.push({ englishText, koreanText });
            }
          }
        } else {
          // 패키지#02 유형#11: 기존 로직
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
          
          if (englishText) {
            sentences.push({ englishText, koreanText });
          }
        }
      });
      
      if (sentences.length > 0) {
        cardGroups.push({
          cardTitle,
          typeBadge: typeBadgeText,
          instruction,
          sentences
        });
      }
    });
    
    return cardGroups;
  };
  
  // 본문해석 섹션이 카드 처리 루프에서 처리되었는지 추적
  let translationProcessedInCardLoop = false;
  
  if (questionCards.length > 0) {
    questionCards.forEach((card, cardIndex) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 카드 ${cardIndex + 1}/${questionCards.length} 처리 시작:`, {
          tagName: card.tagName,
          className: card.className,
          id: (card as HTMLElement).id,
          dataWorkType: (card as HTMLElement).getAttribute('data-work-type'),
          textContentLength: card.textContent?.trim().length || 0
        });
      }
      
      // 유형#15인 경우 건너뛰기 (별도 처리됨)
      // 유형#15는 .quiz-content 또는 .a4-page-content 내부에 .print-content-section이 있고,
      // .print-question-card가 없는 구조입니다.
      // 단, 카드 자체가 .print-question-card인 경우는 제외해야 합니다.
      const isCardItselfQuestionCard = card.classList.contains('print-question-card');
      
      // 카드 자체가 .print-question-card인 경우는 유형#15가 아님 (건너뛰지 않음)
      if (!isCardItselfQuestionCard) {
        // 카드 자체가 .print-question-card가 아닌 경우에만 유형#15 체크
        // 단, .a4-landscape-page-template은 유형#06 등 다른 유형에서도 사용하므로 제외
        const isLandscapeTemplate = card.classList.contains('a4-landscape-page-template');
        
        if (!isLandscapeTemplate) {
          // .a4-landscape-page-template이 아닌 경우에만 유형#15 체크
          const cardWork15Content = card.querySelector('.quiz-content') || card.querySelector('.a4-page-content');
          const cardHasPrintContentSection = cardWork15Content?.querySelector('.print-content-section') !== null;
          // 내부에 .print-question-card가 없는 경우만 유형#15로 판단
          const cardHasQuestionCardInside = card.querySelector('.print-question-card') !== null;
          if (cardHasPrintContentSection && !cardHasQuestionCardInside) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`⏭️ 카드 ${cardIndex + 1} 건너뛰기 (유형#15)`);
            }
            return; // 유형#15는 별도 처리되므로 건너뛰기
          }
        }
      }
      
      // .a4-page-template인 경우 내부의 .a4-page-content를 찾아서 처리
      let actualCard = card as HTMLElement;
      let pageContentForWorkType: HTMLElement | null = null;
      if (card.classList.contains('a4-page-template')) {
        const pageContent = card.querySelector('.a4-page-content');
        if (pageContent) {
          // actualCard는 항상 .a4-page-content로 설정 (내부 요소를 찾기 위해)
          actualCard = pageContent as HTMLElement;
          pageContentForWorkType = pageContent as HTMLElement;
        }
      }
      
      // data-work-type 속성 확인 (카드 자체 또는 부모 요소에서)
      let workType = actualCard.getAttribute('data-work-type');
      if (!workType) {
        // .a4-page-content인 경우 내부의 .problem-instruction에서 찾기
        if (pageContentForWorkType) {
          const instruction = pageContentForWorkType.querySelector('.problem-instruction[data-work-type]');
          if (instruction) {
            workType = instruction.getAttribute('data-work-type') || '';
          }
        }
        
        // 여전히 없으면 부모 요소에서 찾기 (패키지#01의 경우 wrapper div에 있을 수 있음)
        if (!workType) {
          let parent = actualCard.parentElement;
        while (parent && !workType) {
          workType = parent.getAttribute('data-work-type') || '';
          parent = parent.parentElement;
        }
      }
      }
      
      // .a4-page-template인 경우 내부에서 workType 찾기 (백업)
      if (!workType && card.classList.contains('a4-page-template')) {
        const pageContent = card.querySelector('.a4-page-content');
        if (pageContent) {
          const instruction = pageContent.querySelector('.problem-instruction[data-work-type]');
          if (instruction) {
            workType = instruction.getAttribute('data-work-type') || '';
          }
        }
      }
      
      // 패키지#03: workType이 없으면 타입 뱃지나 제목에서 추출 시도
      if (!workType) {
        const typeBadge = actualCard.querySelector('.print-question-type-badge, .question-type-badge, .problem-type-badge');
        const typeBadgeText = typeBadge?.textContent?.trim() || '';
        if (typeBadgeText) {
          // "유형#01" 형식에서 "01" 추출
          const match = typeBadgeText.match(/유형#?(\d+)/);
          if (match) {
            workType = match[1];
          }
        }
        
        // 여전히 없으면 제목에서 추출
        if (!workType) {
          const title = actualCard.querySelector('.print-question-title, .question-title');
          const titleText = title?.textContent?.trim() || '';
          const titleMatch = titleText.match(/유형#?(\d+)/);
          if (titleMatch) {
            workType = titleMatch[1];
          }
        }
      }
      
      const isWork11 = workType === '11' || workType === '011';
      
      // 타입 뱃지 텍스트 확인
      const typeBadge = actualCard.querySelector('.print-question-type-badge, .question-type-badge, .problem-type-badge');
      const rawTypeLabel = typeBadge?.textContent?.trim() || '';
      let typeLabel = rawTypeLabel ? rawTypeLabel.replace(/\s+/g, '') : '';
      
      // 패키지#01: data-work-type 속성에서 typeLabel 생성
      if (!typeLabel && workType) {
        typeLabel = `유형#${workType.padStart(2, '0')}`;
      }
      
      // 제목에서도 확인
      const title = actualCard.querySelector('.print-question-title, .question-title');
      const titleText = title?.textContent?.trim() || '';
      
      const isWork11ByText = typeLabel.includes('11') || 
                             typeLabel.includes('#11') || 
                             titleText.includes('#11') || 
                             titleText.includes('본문 문장별 해석');
      
      // 유형#11 처리 (순서를 유지하기 위해 여기서 처리)
      if (!work11SentencesProcessed && (isWork11 || isWork11ByText || isWork11Card(card))) {
        // 모든 유형#11 카드 찾기
        const allWork11Cards = Array.from(questionCards).filter(c => isWork11Card(c));
        
        if (allWork11Cards.length > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 유형#11 카드 ${allWork11Cards.length}개 발견 (순서 유지)`);
          }
          
          // 유형#11의 모든 문장을 카드별로 수집
          const cardGroups = collectWork11SentencesByCard(allWork11Cards);
          
          // 같은 문제 번호를 가진 카드들을 그룹화 (페이지 분할로 인해 여러 카드로 나뉜 경우 처리)
          const groupedByProblemNumber = new Map<string, typeof cardGroups>();
          let lastProblemNumber = '';
          let problemIndex = 0;
          
          cardGroups.forEach((cardGroup, index) => {
            // 제목에서 문제 번호 추출 (예: "문제 4 : 문장별 해석" -> "4")
            const problemNumberMatch = cardGroup.cardTitle.match(/문제\s*(\d+)\s*[:：]/);
            let problemNumber = problemNumberMatch ? problemNumberMatch[1] : '';
            
            // 제목이 없거나 문제 번호를 찾을 수 없는 경우 (분할된 부분일 수 있음)
            if (!problemNumber) {
              // 이전 카드의 문제 번호를 사용 (분할된 부분으로 간주)
              if (lastProblemNumber) {
                problemNumber = lastProblemNumber;
              } else {
                // 첫 번째 카드인데 문제 번호가 없으면 인덱스 기반으로 생성
                problemNumber = `${problemIndex + 1}`;
                problemIndex++;
              }
            } else {
              // 새로운 문제 번호 발견
              lastProblemNumber = problemNumber;
              problemIndex = parseInt(problemNumber, 10);
            }
            
            if (!groupedByProblemNumber.has(problemNumber)) {
              groupedByProblemNumber.set(problemNumber, []);
            }
            groupedByProblemNumber.get(problemNumber)!.push(cardGroup);
          });
          
          // 그룹화된 문제들을 하나의 문제로 병합
          const mergedCardGroups: Array<{
            cardTitle: string;
            typeBadge: string;
            instruction: string;
            sentences: Array<{ englishText: string; koreanText: string }>
          }> = [];
          
          groupedByProblemNumber.forEach((groups, problemNumber) => {
            if (groups.length > 0) {
              // 첫 번째 그룹의 제목, 타입 뱃지, 지시문 사용
              const firstGroup = groups[0];
              const allSentences: Array<{ englishText: string; koreanText: string }> = [];
              
              // 모든 그룹의 문장을 순서대로 합치기
              groups.forEach((group) => {
                allSentences.push(...group.sentences);
              });
              
              mergedCardGroups.push({
                cardTitle: firstGroup.cardTitle,
                typeBadge: firstGroup.typeBadge,
                instruction: firstGroup.instruction,
                sentences: allSentences
              });
              
              if (process.env.NODE_ENV === 'development' && groups.length > 1) {
                console.log(`🔗 문제 ${problemNumber}: ${groups.length}개 카드를 하나로 병합 (총 ${allSentences.length}개 문장)`);
              }
            }
          });
          
          // 각 카드(문제)별로 개별 처리
          if (mergedCardGroups.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ 유형#11 총 ${mergedCardGroups.length}개 문제를 개별 처리`);
            }
            
            // 각 카드(문제)별로 처리
            mergedCardGroups.forEach((cardGroup, cardGroupIndex) => {
              // 첫 번째 문제가 아니면 위에 간격 추가
              if (cardGroupIndex > 0) {
                paragraphs.push(
                  new Paragraph({
                    text: '',
                    spacing: { before: 400, after: 0 }
                  })
                );
              }
              
              // 카드 제목 표시 (제목과 "유형#11"을 탭으로 분리하여 우측 정렬)
              if (cardGroup.cardTitle) {
                const titleChildren: TextRun[] = [
                  new TextRun({
                    text: cardGroup.cardTitle,
                    bold: true,
                    font: 'Noto Sans KR'
                  })
                ];
                
                // 타입 뱃지가 있으면 탭 문자 후 우측에 배치
                if (cardGroup.typeBadge) {
                  titleChildren.push(
                    new TextRun({
                      text: '\t' + cardGroup.typeBadge,
                      bold: true,
                      font: 'Noto Sans KR'
                    })
                  );
                }
                
                paragraphs.push(
                  new Paragraph({
                    children: titleChildren,
                    spacing: { before: cardGroupIndex > 0 ? 400 : 200, after: 200 },
                    tabStops: [
                      {
                        type: TabStopType.RIGHT,
                        position: 14400 // A4 용지 너비 (21cm ≈ 14400 twips, 우측 끝에 배치)
                      }
                    ],
                    shading: {
                      type: ShadingType.SOLID,
                      color: 'E0E0E0' // 연한 회색 하이라이트
                    }
                  })
                );
              }
              
              // 지시문 표시 (제목과 별도로)
              if (cardGroup.instruction) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cardGroup.instruction,
                        font: 'Noto Sans KR'
                      })
                    ],
                    spacing: { before: 0, after: 200 }
                  })
                );
              }
              
              // 각 카드의 문장 처리 (각 문제별로 문장 번호 1부터 시작)
              cardGroup.sentences.forEach((sentence, sentenceIndex) => {
                const isFirstSentence = sentenceIndex === 0;
                const isLastSentence = sentenceIndex === cardGroup.sentences.length - 1;
                
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
                
                // 문제 모드 또는 정답 모드: 각 문장 앞에 "문장 1. ", "문장 2. " 등 추가 (진하게)
                // 각 문제별로 문장 번호가 1부터 시작하도록 sentenceIndex + 1 사용
                const isProblemMode = !sentence.koreanText; // 한글 해석이 없으면 문제 모드
                // 정답 모드이거나 문제 모드일 때 문장 번호 추가
                const sentenceLabel = (actualIsAnswerMode || isProblemMode) ? `문장 ${sentenceIndex + 1}. ` : '';
                
                const children: TextRun[] = [];
                
                // 문장 레이블이 있으면 진하게 추가
                if (sentenceLabel) {
                  children.push(
                    new TextRun({
                      text: sentenceLabel,
                      font: 'Noto Sans KR',
                      bold: true
                    })
                  );
                }
                
                // 영어 문장 추가
                children.push(
                  new TextRun({
                    text: sentence.englishText,
                    font: 'Noto Sans KR'
                  })
                );
                
                if (sentence.koreanText) {
                  children.push(
                    new TextRun({
                      break: 1,
                      text: sentence.koreanText,
                      font: 'Noto Sans KR',
                      italics: true,
                      color: '444444'
                    })
                  );
                } else {
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
                      after: isLastSentence ? 0 : 400  // 각 문장 아래 두 줄 띄기 (마지막 문장 제외)
                    },
                    indent: { left: 0, right: 0 },
                    border: borderConfig
                  })
                );
                
                // 마지막 문장 아래에 빈 줄 추가 (두 줄 띄기)
                if (isLastSentence) {
                  paragraphs.push(
                    new Paragraph({
                      text: '',
                      spacing: { before: 0, after: 0 }
                    })
                  );
                }
              });
            });
            
            // 유형#11 블록과 다음 문제 사이 빈 줄
            paragraphs.push(
              new Paragraph({
                text: '',
                spacing: { before: 200, after: 0 }
              })
            );
            
            work11SentencesProcessed = true;
          }
        }
        
        // 유형#11은 처리했으므로 이 카드는 건너뛰기
        return;
      }
      
      // 유형#11은 이미 처리되었으므로 건너뛰기
      if (work11SentencesProcessed && (isWork11 || isWork11ByText || isWork11Card(card))) {
        return;
      }
      
      const titleSpan = actualCard.querySelector('.print-question-title span, .question-title');
      const titleSpanText = titleSpan?.textContent?.trim() || '';
      
      const instruction = actualCard.querySelector('.print-instruction, .problem-instruction');
      let instructionText = instruction?.textContent?.trim() || '';
      let instructionHandled = false;
      
      // 패키지#01: instructionText에서 "문제: " 제거
      if (instructionText.startsWith('문제:')) {
        instructionText = instructionText.replace(/^문제:\s*/, '').trim();
      }
      if (instructionText.startsWith('문제 :')) {
        instructionText = instructionText.replace(/^문제\s*:\s*/, '').trim();
      }
      
      // 패키지#01: instructionText에서 "유형#XX" 패턴 제거 (중복 방지)
      if (typeLabel) {
        // typeLabel이 "유형#10"이면 instructionText에서 "유형#10" 제거
        instructionText = instructionText.replace(new RegExp(typeLabel.replace('#', '#'), 'g'), '').trim();
        // 앞뒤 공백 정리
        instructionText = instructionText.replace(/\s+/g, ' ').trim();
      }
      
      // 패키지#01: data-work-type 속성에서 workTypeId 가져오기
      if (!typeLabel) {
        const workType = (card as HTMLElement).getAttribute('data-work-type');
        if (workType) {
          typeLabel = `유형#${workType.padStart(2, '0')}`;
        }
      }
      
      // 패키지#01: 유형#02, 07, 08, 09, 10, 14의 경우 앞에 빈 줄 추가
      // 단, 유형#01 다음에 오는 유형#02는 빈 줄 추가하지 않음 (유형#01의 마지막 옵션 after spacing이 0이므로)
      const needsExtraSpacing = workType === '02' || workType === '07' || workType === '08' || 
                                 workType === '09' || workType === '10' || workType === '14' ||
                                 workType === '2' || workType === '7' || workType === '8' || 
                                 workType === '9' || workType === '14';
      
      // 이전 카드가 유형#01인지 확인
      let previousCardIsWork01 = false;
      if (cardIndex > 0) {
        const previousCard = questionCards[cardIndex - 1] as HTMLElement;
        let previousWorkType = previousCard.getAttribute('data-work-type');
        if (!previousWorkType) {
          let parent = previousCard.parentElement;
          while (parent && !previousWorkType) {
            previousWorkType = parent.getAttribute('data-work-type') || '';
            parent = parent.parentElement;
          }
        }
        previousCardIsWork01 = previousWorkType === '01' || previousWorkType === '1';
      }
      
      // 유형#02가 유형#01 다음에 오는 경우 빈 줄 추가하지 않음
      const isWork02AfterWork01 = (workType === '02' || workType === '2') && previousCardIsWork01;
      
      if (needsExtraSpacing && cardIndex > 0 && !isWork02AfterWork01) {
        // 빈 줄 추가
        paragraphs.push(
          new Paragraph({
            text: '',
            spacing: { before: 0, after: 0 }
          })
        );
      }
      
      // 패키지#02: 유형#02 다음에 유형#03이 오는 경우 빈 줄 추가
      let previousCardTypeLabel = '';
      if (cardIndex > 0) {
        const previousCard = questionCards[cardIndex - 1] as HTMLElement;
        const previousTypeBadge = previousCard.querySelector('.print-question-type-badge, .question-type-badge, .problem-type-badge');
        const previousRawTypeLabel = previousTypeBadge?.textContent?.trim() || '';
        previousCardTypeLabel = previousRawTypeLabel ? previousRawTypeLabel.replace(/\s+/g, '') : '';
        
        // 패키지#01의 경우 data-work-type에서도 확인
        if (!previousCardTypeLabel) {
          let previousWorkType = previousCard.getAttribute('data-work-type');
          if (!previousWorkType) {
            let parent = previousCard.parentElement;
            while (parent && !previousWorkType) {
              previousWorkType = parent.getAttribute('data-work-type') || '';
              parent = parent.parentElement;
            }
          }
          if (previousWorkType) {
            previousCardTypeLabel = `유형#${previousWorkType.padStart(2, '0')}`;
          }
        }
      }
      
      const isWork02 = previousCardTypeLabel.includes('유형#02') || previousCardTypeLabel.includes('#02');
      const isWork03 = typeLabel.includes('유형#03') || typeLabel.includes('#03');
      
      // 패키지#02: 유형#02 다음에 유형#03이 오는 경우 빈 줄 추가
      if (isWork02 && isWork03 && cardIndex > 0) {
        paragraphs.push(
          new Paragraph({
            text: '',
            spacing: { before: 0, after: 0 }
          })
        );
      }
      
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
            spacing: { before: cardIndex > 0 ? (needsExtraSpacing ? 600 : 400) : 200, after: 200 }
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
            spacing: { before: cardIndex > 0 ? (needsExtraSpacing ? 600 : 400) : 200, after: 200 }
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
            spacing: { before: cardIndex > 0 ? (needsExtraSpacing ? 600 : 400) : 200, after: 200 }
          })
        );
      }
      
      if (!instructionHandled && instructionText) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: instructionText,
                bold: true,
                font: 'Noto Sans KR'
              })
            ],
            spacing: { before: cardIndex > 0 ? (needsExtraSpacing ? 600 : 400) : 200, after: 200 }
          })
        );
      }
      
      // Work_06 등: 주요 문장 표시
      const missingSentence = actualCard.querySelector('.print-missing-sentence, .missing-sentence, .missing-sentence-box');
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
        const found = actualCard.querySelector(selector) as HTMLElement | null;
        if (found) {
          // 패키지#03: .print-shuffled-paragraphs를 찾았을 때 내부의 .print-paragraph-item 확인
          // 유형#01인 경우 .print-shuffled-paragraphs는 단락 처리에서 사용하므로 본문으로 처리하지 않음
          if (selector === '.print-shuffled-paragraphs' && !workType) {
            const paragraphItems = found.querySelectorAll('.print-paragraph-item');
            if (paragraphItems.length > 0) {
              // 첫 번째 .print-paragraph-item의 레이블 확인
              const firstItem = paragraphItems[0] as HTMLElement;
              const labelElement = firstItem.querySelector('strong');
              const label = labelElement?.textContent?.trim() || '';
              const isWork01Label = /^[A-D][:：]?$/.test(label.replace(/\s/g, ''));
              
              if (isWork01Label) {
                // 유형#01로 판단, workType 설정
                workType = '01';
                if (process.env.NODE_ENV === 'development') {
                  console.log(`🔍 카드 ${cardIndex + 1} 유형#01 감지 (.print-shuffled-paragraphs 내부 레이블 확인):`, {
                    label,
                    paragraphItemsCount: paragraphItems.length
                  });
                }
                // .print-shuffled-paragraphs는 본문으로 처리하지 않음 (단락 처리에서 사용)
                continue;
              }
            }
          }
          
          passage = found;
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 카드 ${cardIndex + 1} 본문 찾음:`, {
              selector,
              className: found.className,
              textLength: found.textContent?.trim().length || 0,
              workType
            });
          }
          break;
        }
      }
      
      // 본문이 여러 개 있을 수 있으므로 모든 본문 요소 찾기
      if (!passage) {
        // 모든 본문 요소 찾기
        const allPassages = actualCard.querySelectorAll(passageSelectors.join(', '));
        if (allPassages.length > 0) {
          passage = allPassages[0] as HTMLElement;
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 카드 ${cardIndex + 1} 본문 찾음 (fallback):`, {
              totalFound: allPassages.length,
              className: passage.className,
              textLength: passage.textContent?.trim().length || 0,
              workType
            });
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`⚠️ 카드 ${cardIndex + 1} 본문을 찾지 못했습니다:`, {
              workType,
              cardHTML: (actualCard as HTMLElement).innerHTML.substring(0, 200)
            });
          }
        }
      }
      
      // 패키지#01: 페이지 분할로 인해 본문이 다른 페이지에 있을 수 있음
      // 같은 유형의 다른 페이지에서 본문 찾기 시도 (유형#03, 04, 05, 07, 08, 13, 14)
      if (!passage && workType && (workType === '03' || workType === '04' || workType === '05' || workType === '07' || workType === '08' || workType === '13' || workType === '14')) {
        // 같은 유형의 다른 .a4-page-template 찾기
        const allTemplates = element.querySelectorAll('.a4-page-template');
        for (const template of Array.from(allTemplates)) {
          if (template === card) continue; // 현재 카드는 이미 확인했으므로 스킵
          
          // 같은 유형인지 확인 (data-work-type 또는 instruction 내부의 유형#XX 확인)
          const templateWorkType = (template as HTMLElement).getAttribute('data-work-type');
          const templateInstruction = template.querySelector('.problem-instruction');
          const templateInstructionText = templateInstruction?.textContent || '';
          const isSameWorkType = templateWorkType === workType || 
                                 templateInstructionText.includes(`유형#${workType.padStart(2, '0')}`) ||
                                 templateInstructionText.includes(`유형#${workType}`);
          
          if (isSameWorkType) {
            const templatePageContent = template.querySelector('.a4-page-content');
            if (templatePageContent) {
              for (const selector of passageSelectors) {
                const found = templatePageContent.querySelector(selector) as HTMLElement | null;
                if (found && found.textContent?.trim()) {
                  passage = found;
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`🔍 카드 ${cardIndex + 1} 본문 찾음 (다른 페이지에서):`, {
                      selector,
                      className: found.className,
                      textLength: found.textContent?.trim().length || 0,
                      workType,
                      templateIndex: Array.from(allTemplates).indexOf(template)
                    });
                  }
                  break;
                }
              }
              if (passage) break;
            }
          }
        }
      }
      
      // 패키지#01: 클래스가 없는 본문 요소 찾기 (유형#06, #08, #09, #10, #11, #13, #14)
      // problem-instruction 다음에 오는 요소 중에서 본문으로 보이는 요소 찾기
      if (!passage) {
        const instruction = actualCard.querySelector('.problem-instruction');
        if (instruction) {
          // instruction 다음에 오는 모든 div 요소 확인
          let nextSibling = instruction.nextElementSibling;
          while (nextSibling) {
            // missing-sentence-box는 건너뛰기
            if (nextSibling.classList.contains('missing-sentence-box')) {
              nextSibling = nextSibling.nextElementSibling;
              continue;
            }
            
            // div 요소이고, 문제 선택지나 번역이 아닌 경우
            if (nextSibling.tagName === 'DIV' && 
                !nextSibling.classList.contains('problem-options') &&
                !nextSibling.classList.contains('option') &&
                !nextSibling.classList.contains('translation') &&
                !nextSibling.classList.contains('korean-translation')) {
              const element = nextSibling as HTMLElement;
              const text = element.textContent?.trim() || '';
              // 텍스트가 충분히 긴 경우 본문으로 간주 (최소 50자)
              if (text.length >= 50) {
                passage = element;
                break;
              }
            }
            nextSibling = nextSibling.nextElementSibling;
          }
        }
      }
      
      // 유형#06: missing-sentence-box 다음에 오는 본문 찾기
      if (!passage) {
        const missingSentenceBox = actualCard.querySelector('.missing-sentence-box');
        if (missingSentenceBox) {
          let nextSibling = missingSentenceBox.nextElementSibling;
          while (nextSibling) {
            if (nextSibling.tagName === 'DIV') {
              const element = nextSibling as HTMLElement;
              const text = element.textContent?.trim() || '';
              if (text.length >= 50) {
                passage = element;
                break;
              }
            }
            nextSibling = nextSibling.nextElementSibling;
          }
        }
      }
      
      // 패키지#01 Work_01: .shuffled-paragraph 요소들을 직접 찾기
      // 단일 유형#01: .print-paragraph-item 요소들을 찾기
      let shuffledParagraphsProcessed = false;
      
      // 유형#01인 경우 무조건 .shuffled-paragraph 또는 .print-paragraph-item을 찾기 (passage 조건 무시)
      // workType이 본문 찾기 로직에서 설정되었을 수 있으므로 다시 확인
      const isWork01 = workType === '01' || workType === '1';
      
      // 패키지#03: workType이 아직 설정되지 않았고 .print-shuffled-paragraphs가 있는 경우
      // 내부의 .print-paragraph-item 레이블을 확인하여 유형#01인지 판단
      if (!isWork01 && !workType && passage && passage.classList.contains('print-shuffled-paragraphs')) {
        const paragraphItems = passage.querySelectorAll('.print-paragraph-item');
        if (paragraphItems.length > 0) {
          const firstItem = paragraphItems[0] as HTMLElement;
          const labelElement = firstItem.querySelector('strong');
          const label = labelElement?.textContent?.trim() || '';
          const isWork01Label = /^[A-D][:：]?$/.test(label.replace(/\s/g, ''));
          
          if (isWork01Label) {
            workType = '01';
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔍 카드 ${cardIndex + 1} 유형#01 감지 (passage 확인 후):`, {
                label,
                paragraphItemsCount: paragraphItems.length
              });
            }
          }
        }
      }
      
      // isWork01 재계산 (workType이 설정된 후)
      const finalIsWork01 = workType === '01' || workType === '1';
      
      // 패키지#02: 유형#03, 04, 05, 07, 08, 13, 14도 .print-paragraph-item을 사용하지만 본문으로 처리해야 함
      // 유형#01이 아니고 passage가 없으면 .print-paragraph-item을 본문으로 처리
      if (!isWork01 && !passage) {
        const paragraphItems = actualCard.querySelectorAll('.print-paragraph-item');
        if (paragraphItems.length > 0) {
          // 레이블이 A, B, C, D가 아닌 경우 본문으로 처리
          const firstItem = paragraphItems[0] as HTMLElement;
          const labelElement = firstItem.querySelector('strong');
          const label = labelElement?.textContent?.trim() || '';
          const isWork01Label = /^[A-D][:：]?$/.test(label.replace(/\s/g, ''));
          
          if (!isWork01Label) {
            // 본문으로 처리
            passage = firstItem;
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔍 카드 ${cardIndex + 1} 본문 찾음 (.print-paragraph-item, 유형#${workType}):`, {
                selector: '.print-paragraph-item',
                className: firstItem.className,
                textLength: firstItem.textContent?.trim().length || 0,
                workType,
                label
              });
            }
          }
        }
      }
      
      // 유형#01인 경우에만 단락 처리 로직 실행
      if (finalIsWork01) {
        // 먼저 .shuffled-paragraph 찾기 (패키지#01)
        let shuffledParagraphs = actualCard.querySelectorAll('.shuffled-paragraph');
        
        // .shuffled-paragraph가 없으면 .print-paragraph-item 찾기 (단일 유형#01)
        if (shuffledParagraphs.length === 0) {
          shuffledParagraphs = actualCard.querySelectorAll('.print-paragraph-item');
        }
        
        if (shuffledParagraphs.length > 0) {
          shuffledParagraphsProcessed = true;
          
          // 디버깅: 모든 단락 레이블 확인
          const paragraphLabels = Array.from(shuffledParagraphs).map((p: any) => {
            const labelElement = p.querySelector('strong');
            if (!labelElement) return 'unknown';
            let label = labelElement.textContent?.trim() || 'unknown';
            // "A:", "B:" 형식에서 콜론 제거
            label = label.replace(/[:：]\s*$/, '');
            return label;
          });
          console.log('🔍 유형#01 단락 확인:', {
            totalCount: shuffledParagraphs.length,
            labels: paragraphLabels,
            hasA: paragraphLabels.includes('A'),
            hasB: paragraphLabels.includes('B'),
            hasC: paragraphLabels.includes('C'),
            hasD: paragraphLabels.includes('D'),
            isPrintParagraphItem: shuffledParagraphs.length > 0 && (shuffledParagraphs[0] as HTMLElement).classList.contains('print-paragraph-item')
          });
          
          // A 단락이 없으면 경고 (단, .print-paragraph-item의 경우 레이블이 없을 수 있으므로 경고만)
          if (!paragraphLabels.includes('A') && !paragraphLabels.some(l => l === 'unknown' || l === '')) {
            console.warn('⚠️ 유형#01: A 단락이 없습니다!', {
              foundLabels: paragraphLabels,
              totalCount: shuffledParagraphs.length
            });
          }
          
          // .shuffled-paragraph 요소들을 각각 처리
          shuffledParagraphs.forEach((paraElement, paraIndex) => {
            const para = paraElement as HTMLElement;
            
            // 디버깅: 각 단락의 레이블과 내용 확인
            const labelElement = para.querySelector('strong');
            let label = labelElement ? (labelElement.textContent?.trim() || 'unknown') : 'unknown';
            // "A:", "B:" 형식에서 콜론 제거
            if (label && label !== 'unknown') {
              label = label.replace(/[:：]\s*$/, '');
            }
            const content = para.textContent?.trim() || '';
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔍 단락 ${paraIndex + 1} 처리:`, {
                label: label,
                contentLength: content.length,
                contentPreview: content.substring(0, 50)
              });
            }
            
            const lineRuns = extractTextRunsByLine(para);
            
            // lineRuns가 비어있어도 단락의 텍스트 내용이 있으면 처리
            if (lineRuns.length === 0) {
              // 단락의 전체 텍스트를 직접 처리
              const textContent = para.textContent?.trim() || '';
              if (textContent) {
                const isFirstParagraph = paraIndex === 0;
                const isLastParagraph = paraIndex === shuffledParagraphs.length - 1;
                const isWork01 = workType === '01' || workType === '1';
                
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: textContent,
                        font: 'Noto Sans KR'
                      })
                    ],
                    spacing: {
                      before: isFirstParagraph ? 160 : 80,
                      after: isLastParagraph && isWork01 ? 80 : 160
                    },
                    indent: { left: 0, right: 0 },
                    border: {
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
                      },
                      top: isFirstParagraph ? {
                        color: '000000',
                        size: 6,
                        style: BorderStyle.SINGLE,
                        space: DOCX_BORDER_SPACE
                      } : undefined,
                      bottom: isLastParagraph ? {
                        color: '000000',
                        size: 6,
                        style: BorderStyle.SINGLE,
                        space: DOCX_BORDER_SPACE
                      } : undefined
                    }
                  })
                );
              }
            } else {
              // lineRuns가 있는 경우 기존 로직 사용
              lineRuns.forEach((runs, lineIndex) => {
                if (runs.length === 0) {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn(`⚠️ 단락 ${label}의 line ${lineIndex}에 runs가 없습니다.`);
                  }
                  return;
                }

                const isFirstLine = lineIndex === 0;
                const isLastLine = lineIndex === lineRuns.length - 1;
                const isFirstParagraph = paraIndex === 0 && isFirstLine;

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

                // 유형#01의 마지막 문단인지 확인
                const isWork01 = workType === '01' || workType === '1';
                const isLastParagraph = paraIndex === shuffledParagraphs.length - 1;
                
                paragraphs.push(
                  new Paragraph({
                    children: runs,
                    spacing: {
                      before: isFirstParagraph ? 160 : (isFirstLine ? 80 : 0),
                      after: isLastLine ? (isWork01 && isLastParagraph ? 80 : 160) : 80
                    },
                    indent: { left: 0, right: 0 },
                    border: borderConfig
                  })
                );
              });
            }
          });
          // passage를 설정하여 이후 처리 스킵하지 않도록 함
          passage = shuffledParagraphs[0] as HTMLElement;
        }
      }
      
      // 본문 처리: shuffled-paragraph는 이미 처리했으므로 제외
      // print-paragraph-item은 유형#01인 경우 이미 처리했으므로 제외
      // 하지만 유형#03, 04, 05, 07, 08, 13, 14의 경우 print-paragraph-item이 본문이므로 처리해야 함
      // finalIsWork01 사용 (workType이 설정된 후)
      const shouldProcessPassage = passage && 
        !passage.classList.contains('shuffled-paragraph') && 
        (!passage.classList.contains('print-paragraph-item') || !finalIsWork01) &&
        !passage.classList.contains('print-shuffled-paragraphs');
      
      if (shouldProcessPassage && passage) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 카드 ${cardIndex + 1} 본문 처리 시작:`, {
            workType,
            className: passage.className,
            textLength: passage.textContent?.trim().length || 0,
            isPrintParagraphItem: passage.classList.contains('print-paragraph-item'),
            isWork01
          });
        }
        const lineRuns = extractTextRunsByLine(passage);
        if (lineRuns.length > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ 카드 ${cardIndex + 1} 본문 lineRuns 생성:`, {
              workType,
              lineCount: lineRuns.length
            });
          }
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
      
      // 유형#06 정답 정보 컨테이너 (본문 바로 아래에 표시)
      // workType 변수는 이미 위에서 선언되었으므로 재사용
      const isWork06 = workType === '6' || workType === '06';
      if (isWork06) {
        const work06Answer = actualCard.querySelector('.print-work06-info-container') as HTMLElement | null;
        if (work06Answer) {
          const answerText = work06Answer.textContent?.trim() || '';
          if (answerText && answerText !== '\u00A0') { // non-breaking space가 아닌 경우만
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 유형#06 정답 정보 컨테이너 발견 (본문 아래):', answerText);
            }
            
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: answerText,
                    bold: true,
                    color: '0066cc', // CSS에서 사용하는 색상과 동일
                    font: 'Noto Sans KR'
                  })
                ],
                spacing: { before: 120, after: 120 }
              })
            );
          }
        }
      }
      
      // 여러 개의 본문 요소가 있는 경우 추가 처리
      // (예: 유형#01의 여러 문단)
      // 단, .shuffled-paragraph는 이미 처리했으므로 제외
      // 유형#01의 경우 .shuffled-paragraph를 제외하고 다른 본문 요소만 처리
      if (!shuffledParagraphsProcessed) {
        const allPassages = actualCard.querySelectorAll('.print-html-block, .print-paragraph-item, .print-shuffled-paragraphs, .shuffled-paragraph');
        if (allPassages.length > 1) {
          // 첫 번째 본문은 이미 처리되었으므로 나머지 처리
          Array.from(allPassages).slice(1).forEach((additionalPassage) => {
            // .shuffled-paragraph는 이미 처리했으므로 건너뛰기
            if ((additionalPassage as HTMLElement).classList.contains('shuffled-paragraph')) {
              return;
            }
            // 유형#01의 경우 .print-shuffled-paragraphs와 .print-paragraph-item은 이미 처리했으므로 건너뛰기
            if (isWork01 && (
              (additionalPassage as HTMLElement).classList.contains('print-shuffled-paragraphs') ||
              (additionalPassage as HTMLElement).classList.contains('print-paragraph-item')
            )) {
              return;
            }
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
      }
      
      // Work_11: 문장별 해석
      const sentenceItems = actualCard.querySelectorAll('.print-sentence-item, .sentence-item');
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
      const passageWithUnderline = actualCard.querySelector('.print-passage-with-underline') as HTMLElement | null;
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
      const options = actualCard.querySelectorAll('.print-option, .option, .quiz-option');
      if (options.length > 0) {
        const answerMarkElement = actualCard.querySelector('.print-answer-mark');
        const answerIndexAttr = answerMarkElement?.getAttribute('data-answer-index');
        const answerIndex = answerIndexAttr ? parseInt(answerIndexAttr, 10) : -1;
        
        // 유형#07, 08은 한글해석을 별도 줄로 표시
        const isWork07 = workType === '7' || workType === '07';
        const isWork08 = workType === '8' || workType === '08';
        const needsTranslationLineBreak = isWork07 || isWork08;
        
        // 유형#01 확인
        const isWork01 = workType === '01' || workType === '1';
        // 유형#10 확인
        const isWork10 = workType === '10' || workType === '010';
        
        options.forEach((option, optionIndex) => {
          if (process.env.NODE_ENV === 'development' && isWork10) {
            console.log(`🔍 유형#10 옵션 ${optionIndex} HTML 구조:`, option.outerHTML.substring(0, 200));
          }
          
          // 각 옵션 내에서 .print-answer-mark 요소 찾기
          const optionAnswerMark = option.querySelector('.print-answer-mark');
          const hasAnswerMarkInOption = optionAnswerMark && optionAnswerMark.textContent?.trim();
          
          // 유형#07, 08: 한글해석을 별도로 찾기
          const optionTranslation = needsTranslationLineBreak 
            ? option.querySelector('.print-option-translation') 
            : null;
          
          // 유형#10: "어법상 틀린 단어" 정보를 별도로 찾기
          let grammarErrorText = '';
          if (isWork10) {
            // 옵션 내부의 모든 div를 확인하여 "어법상 틀린 단어"가 포함된 div 찾기
            const optionDivs = option.querySelectorAll('div');
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔍 유형#10 옵션 ${optionIndex} div 개수:`, optionDivs.length);
            }
            optionDivs.forEach((div) => {
              const divText = div.textContent?.trim() || '';
              if (divText.includes('어법상 틀린 단어')) {
                grammarErrorText = divText;
                if (process.env.NODE_ENV === 'development') {
                  console.log(`✅ 유형#10 옵션 ${optionIndex}에서 "어법상 틀린 단어" 정보 발견:`, grammarErrorText);
                }
              }
            });
            // div에서 찾지 못한 경우, 옵션 전체 텍스트에서 확인
            if (!grammarErrorText) {
              const optionFullText = option.textContent || '';
              if (optionFullText.includes('어법상 틀린 단어')) {
                // "어법상 틀린 단어" 이후의 텍스트 추출
                const match = optionFullText.match(/어법상 틀린 단어\s*[:：]\s*(.+)/);
                if (match && match[1]) {
                  grammarErrorText = `어법상 틀린 단어 : ${match[1].trim()}`;
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`✅ 유형#10 옵션 ${optionIndex} 전체 텍스트에서 "어법상 틀린 단어" 정보 발견:`, grammarErrorText);
                  }
                }
              }
            }
          }
          
          let optionText = '';
          let answerMarkText = '';
          let translationText = '';
          
          if (hasAnswerMarkInOption) {
            // .print-answer-mark가 옵션 내에 있는 경우 (유형#01 등)
            const answerMarkTextContent = optionAnswerMark.textContent?.trim() || '';
            // 옵션 텍스트에서 정답 마크와 한글해석 제거
            const optionClone = option.cloneNode(true) as HTMLElement;
            const answerMarkClone = optionClone.querySelector('.print-answer-mark');
            if (answerMarkClone) {
              answerMarkClone.remove();
            }
            if (needsTranslationLineBreak) {
              const translationClone = optionClone.querySelector('.print-option-translation');
              if (translationClone) {
                translationClone.remove();
              }
            }
            // 유형#10: "어법상 틀린 단어" 정보가 포함된 div 제거
            if (isWork10 && grammarErrorText) {
              const grammarErrorDivs = optionClone.querySelectorAll('div');
              grammarErrorDivs.forEach((div) => {
                const divText = div.textContent?.trim() || '';
                if (divText.includes('어법상 틀린 단어')) {
                  div.remove();
                }
              });
            }
            optionText = optionClone.textContent?.trim() || '';
            answerMarkText = answerMarkTextContent;
          } else {
            // 일반적인 경우
            if (needsTranslationLineBreak && optionTranslation) {
              // 한글해석 제거 후 옵션 텍스트 추출
              const optionClone = option.cloneNode(true) as HTMLElement;
              const translationClone = optionClone.querySelector('.print-option-translation');
              if (translationClone) {
                translationText = translationClone.textContent?.trim() || '';
                translationClone.remove();
              }
              // 유형#10: "어법상 틀린 단어" 정보가 포함된 div 제거
              if (isWork10 && grammarErrorText) {
                const grammarErrorDivs = optionClone.querySelectorAll('div');
                grammarErrorDivs.forEach((div) => {
                  const divText = div.textContent?.trim() || '';
                  if (divText.includes('어법상 틀린 단어')) {
                    div.remove();
                  }
                });
              }
              optionText = optionClone.textContent?.trim() || '';
            } else {
              // 유형#10: "어법상 틀린 단어" 정보가 포함된 div 제거
              if (isWork10 && grammarErrorText) {
                const optionClone = option.cloneNode(true) as HTMLElement;
                const grammarErrorDivs = optionClone.querySelectorAll('div');
                grammarErrorDivs.forEach((div) => {
                  const divText = div.textContent?.trim() || '';
                  if (divText.includes('어법상 틀린 단어')) {
                    div.remove();
                  }
                });
                optionText = optionClone.textContent?.trim() || '';
              } else {
                optionText = option.textContent?.trim() || '';
              }
            }
          }
          
          // 유형#07, 08: 한글해석을 별도로 찾지 못한 경우, textContent에서 추출 시도
          if (needsTranslationLineBreak && !translationText && optionTranslation) {
            translationText = optionTranslation.textContent?.trim() || '';
          }
          
          if (optionText || answerMarkText || translationText || grammarErrorText) {
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
                  color: '1976D2',
                  font: 'Noto Sans KR'
                })
              );
            } else if (answerIndex === optionIndex) {
              children.push(
                new TextRun({
                  text: '  (정답)',
                  bold: true,
                  color: '1976D2',
                  font: 'Noto Sans KR'
                })
              );
            }
            
            // 옵션 텍스트 Paragraph 추가
            const isLastOption = optionIndex === options.length - 1;
            // 유형#01의 마지막 옵션인 경우 after spacing을 줄임 (한 줄만 띄기)
            // 유형#10의 경우 "어법상 틀린 단어" 정보가 있으면 after spacing을 0으로 설정
            const optionAfterSpacing = isWork01 && isLastOption ? 0 : 
              (needsTranslationLineBreak && translationText ? 0 : 
              (isWork10 && grammarErrorText ? 0 : 100));
            
            paragraphs.push(
              new Paragraph({
                children,
                indent: { left: 400 },
                spacing: { before: optionIndex === 0 ? 200 : 80, after: optionAfterSpacing }
              })
            );
            
            // 유형#07, 08: 한글해석을 별도 Paragraph로 추가
            if (needsTranslationLineBreak && translationText) {
              // 유형#01의 마지막 옵션의 한글해석인 경우 after spacing을 줄임
              const translationAfterSpacing = isWork01 && isLastOption ? 0 : 100;
              
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: translationText,
                      font: 'Noto Sans KR',
                      italics: true,
                      color: '374151'
                    })
                  ],
                  indent: { left: 600 }, // 옵션보다 더 들여쓰기
                  spacing: { before: 40, after: translationAfterSpacing }
                })
              );
            }
            
            // 유형#10: "어법상 틀린 단어" 정보를 별도 Paragraph로 추가
            if (isWork10 && grammarErrorText) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`📝 유형#10 옵션 ${optionIndex} "어법상 틀린 단어" Paragraph 추가:`, grammarErrorText);
              }
              
              // "어법상 틀린 단어 :" 부분과 나머지 부분을 분리
              let grammarErrorLabel = '어법상 틀린 단어 :';
              let grammarErrorContent = grammarErrorText;
              
              if (grammarErrorText.includes('어법상 틀린 단어 :')) {
                const parts = grammarErrorText.split('어법상 틀린 단어 :');
                if (parts.length === 2) {
                  grammarErrorContent = parts[1].trim();
                }
              } else if (grammarErrorText.includes('어법상 틀린 단어:')) {
                const parts = grammarErrorText.split('어법상 틀린 단어:');
                if (parts.length === 2) {
                  grammarErrorContent = parts[1].trim();
                }
              } else if (grammarErrorText.startsWith('어법상 틀린 단어')) {
                // 이미 "어법상 틀린 단어"로 시작하는 경우
                const match = grammarErrorText.match(/어법상 틀린 단어\s*[:：]\s*(.+)/);
                if (match && match[1]) {
                  grammarErrorContent = match[1].trim();
                } else {
                  // 레이블이 없는 경우 그대로 사용
                  grammarErrorContent = grammarErrorText.replace(/^어법상 틀린 단어\s*[:：]\s*/, '').trim();
                }
              }
              
              const isLastOptionForGrammar = isLastOption;
              const grammarAfterSpacing = isLastOptionForGrammar ? 100 : 100;
              
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: grammarErrorLabel,
                      font: 'Noto Sans KR',
                      italics: true,
                      color: '666666'
                    }),
                    new TextRun({
                      text: ` ${grammarErrorContent}`,
                      font: 'Noto Sans KR',
                      italics: true,
                      color: '666666'
                    })
                  ],
                  indent: { left: 600 }, // 옵션보다 더 들여쓰기
                  spacing: { before: 40, after: grammarAfterSpacing }
                })
              );
            } else if (isWork10 && process.env.NODE_ENV === 'development') {
              console.log(`⚠️ 유형#10 옵션 ${optionIndex}에서 "어법상 틀린 단어" 정보를 찾지 못했습니다.`);
            }
          }
        });
      }
      
      // 유형#10 어법 오류 정보 텍스트 블록 (4지선다 아래)
      const isWork10 = workType === '10' || workType === '010';
      if (isWork10) {
        const textBlock = actualCard.querySelector('.print-text-block-work10, .print-text-block') as HTMLElement | null;
        if (textBlock) {
          const textContent = textBlock.textContent?.trim() || '';
          if (textContent && textContent !== '\u00A0') {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 유형#10 텍스트 블록 발견:', textContent);
            }
            
            // "어법상 틀린 단어: " 부분을 굵게 처리
            let formattedText = textContent;
            if (textContent.startsWith('어법상 틀린 단어:')) {
              const parts = textContent.split('어법상 틀린 단어:');
              if (parts.length === 2 && parts[1].trim()) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: '어법상 틀린 단어:',
                        bold: true,
                        font: 'Noto Sans KR'
                      }),
                      new TextRun({
                        text: ` ${parts[1].trim()}`,
                        font: 'Noto Sans KR'
                      })
                    ],
                    indent: { left: 400 },
                    spacing: { before: 120, after: 100 }
                  })
                );
              } else {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: textContent,
                        font: 'Noto Sans KR'
                      })
                    ],
                    indent: { left: 400 },
                    spacing: { before: 120, after: 100 }
                  })
                );
              }
            } else {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: textContent,
                      font: 'Noto Sans KR'
                    })
                  ],
                  indent: { left: 400 },
                  spacing: { before: 120, after: 100 }
                })
              );
            }
          }
        }
      }
      
      // 유형#02 교체된 단어 테이블 (정답 모드)
      const replacementsTable = actualCard.querySelector('.print-replacements-table') as HTMLTableElement | null;
      if (replacementsTable && replacementsTable.tagName === 'TABLE') {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 유형#02 교체된 단어 테이블 발견');
        }
        
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
      const answerSection = actualCard.querySelector('.print-answer-section');
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
      const translation = actualCard.querySelector('.print-translation-section, .translation');
      if (translation) {
        translationProcessedInCardLoop = true;
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 카드 ${cardIndex + 1} 본문해석 섹션 발견:`, {
            hasTranslation: !!translation,
            className: translation.className,
            cardTextPreview: actualCard.textContent?.trim().substring(0, 100) || ''
          });
        }
        
        // 마지막 본문해석(print-translation-last)인 경우, 이전 유형과의 간격 추가
        const isLastTranslation = translation.classList.contains('print-translation-last');
        if (isLastTranslation) {
          // 마지막 유형과 본문해석 사이에 두 줄 추가
          paragraphs.push(
            new Paragraph({
              text: '',
              spacing: { before: 0, after: 200 }
            })
          );
          paragraphs.push(
            new Paragraph({
              text: '',
              spacing: { before: 0, after: 200 }
            })
          );
        } else {
          // 일반 해석 섹션인 경우 기존 로직 유지
          if (paragraphs.length > 0) {
            const lastParagraph = paragraphs[paragraphs.length - 1];
            if (lastParagraph && (lastParagraph as any).spacing?.after === 0) {
              paragraphs.pop();
            }
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
        !actualCard.querySelector('.print-answer-mark') &&
        !actualCard.querySelector('.print-translation-section, .translation') &&
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
  
  // 유형#15 처리: .quiz-content 또는 .a4-page-content 내부의 .print-content-section 처리
  // 유형#15는 .quiz-content 또는 .a4-page-content 안에 .print-content-section이 있고, .print-question-card가 없는 구조
  const work15QuizContent = element.querySelector('.quiz-content') || element.querySelector('.a4-page-content');
  const work15HasPrintContentSection = work15QuizContent?.querySelector('.print-content-section') !== null;
  const work15HasQuestionCard = element.querySelector('.print-question-card') !== null;
  const work15IsWork15 = work15HasPrintContentSection && !work15HasQuestionCard;
  
  if (work15IsWork15 && work15QuizContent) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 유형#15 DOC 변환 시작:', {
        hasPrintContentSection: work15HasPrintContentSection,
        hasQuestionCard: work15HasQuestionCard,
        isWork15: work15IsWork15,
        contentSectionsCount: work15QuizContent.querySelectorAll('.print-content-section').length,
        containerClass: work15QuizContent.className
      });
    }
    // 유형#15의 경우: .print-content-section을 찾아서 처리
    const contentSections = work15QuizContent.querySelectorAll('.print-content-section');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 유형#15 섹션 개수:', contentSections.length);
    }
    
    contentSections.forEach((section, sectionIndex) => {
      const sectionTitle = section.querySelector('.print-section-title');
      const sectionText = section.querySelector('.print-text-content');
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 유형#15 섹션 ${sectionIndex + 1}:`, {
          hasTitle: !!sectionTitle,
          hasText: !!sectionText,
          titleText: sectionTitle?.textContent?.trim()?.substring(0, 50),
          textPreview: sectionText?.textContent?.trim()?.substring(0, 50)
        });
      }
      
      // 섹션 제목 추가
      if (sectionTitle) {
        const titleText = sectionTitle.textContent?.trim() || '';
        if (titleText) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: titleText,
                  bold: true,
                  size: 24, // 12pt
                  font: 'Noto Sans KR'
                })
              ],
              spacing: { before: sectionIndex === 0 ? 200 : 400, after: 200 }
            })
          );
        }
      }
      
      // 섹션 텍스트 추가 (박스 테두리 포함)
      if (sectionText) {
        const lineRuns = extractTextRunsByLine(sectionText as HTMLElement);
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
    });
  }
  
  // 패키지#03: 인쇄(정답) 모드일 때 마지막 문제 다음에 본문해석 추가
  // 단, 카드 처리 루프에서 이미 처리된 경우 중복 처리 방지
  if (actualIsAnswerMode && !translationProcessedInCardLoop) {
    // 모든 카드에서 본문해석 섹션 찾기 (마지막 것만 처리)
    const translationSections = element.querySelectorAll('.print-translation-section');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 패키지#03 본문해석 섹션 검색:', {
        isAnswerMode: actualIsAnswerMode,
        translationSectionsCount: translationSections.length,
        translationProcessedInCardLoop,
        elementId: element.id,
        elementClass: element.className,
        elementTag: element.tagName
      });
      
      if (translationSections.length > 0) {
        Array.from(translationSections).forEach((section, idx) => {
          const title = (section as HTMLElement).querySelector('.print-translation-title');
          const content = (section as HTMLElement).querySelector('.print-translation-content');
          console.log(`🔍 본문해석 섹션 ${idx + 1}:`, {
            hasTitle: !!title,
            titleText: title?.textContent?.trim(),
            hasContent: !!content,
            contentLength: content?.textContent?.trim().length || 0,
            contentPreview: content?.textContent?.trim().substring(0, 100) || ''
          });
        });
      } else {
        // 본문해석 섹션을 찾지 못한 경우, print-question-card 내부에서 translation 관련 요소 찾기
        const allCards = element.querySelectorAll('.print-question-card');
        console.log('🔍 print-question-card 검색:', {
          totalCards: allCards.length,
          cardsWithTranslation: Array.from(allCards).filter(card => 
            card.querySelector('.print-translation-section, .translation')
          ).length
        });
      }
    }
    
    if (translationSections.length > 0) {
      // 마지막 본문해석 섹션 처리
      const lastTranslationSection = translationSections[translationSections.length - 1] as HTMLElement;
      
      // 이전 내용과의 간격 추가
      paragraphs.push(
        new Paragraph({
          text: '',
          spacing: { before: 0, after: 200 }
        })
      );
      paragraphs.push(
        new Paragraph({
          text: '',
          spacing: { before: 0, after: 200 }
        })
      );

      const translationTitle = lastTranslationSection.querySelector('.print-translation-title, h3');
      if (translationTitle) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: translationTitle.textContent?.trim() || '본문 해석:',
                bold: true,
                color: '1565c0',
                font: 'Noto Sans KR',
                size: 24 // 12pt
              })
            ],
            spacing: { after: 150 }
          })
        );
      }
      
      const translationContent = lastTranslationSection.querySelector('.print-translation-content, p');
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
                  font: 'Noto Sans KR',
                  size: 22 // 11pt
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
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ 패키지#03 본문해석 추가 완료:', {
          translationSectionsCount: translationSections.length,
          hasTitle: !!translationTitle,
          hasContent: !!translationContent,
          contentLength: translationContent?.textContent?.trim().length || 0
        });
      }
    } else {
      // 본문해석 섹션을 찾지 못한 경우, 카드 처리 루프에서 이미 처리되었는지 확인
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ 패키지#03 본문해석 섹션을 찾지 못했습니다. 카드 처리 루프에서 이미 처리되었을 수 있습니다.');
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
  
  // 디버깅: 최종 결과 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 htmlToDocxParagraphs 최종 결과:', {
      totalParagraphs: paragraphs.length,
      hasContent: paragraphs.length > 0,
      paragraphTypes: paragraphs.map(p => p.constructor.name)
    });
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
    
    // 디버깅: DOC 생성 시작
    console.log('📄 generateAndUploadDOC 시작:', {
      elementId: element.id,
      elementClass: element.className,
      workTypeName,
      isAnswerMode,
      hasPrintQuestionCard: element.querySelector('.print-question-card') !== null,
      printQuestionCardCount: element.querySelectorAll('.print-question-card').length,
      hasA4LandscapeTemplate: element.querySelector('.a4-landscape-page-template') !== null,
      a4LandscapeTemplateCount: element.querySelectorAll('.a4-landscape-page-template').length,
      textContentLength: element.textContent?.trim().length || 0
    });
    
    // HTML을 구조화된 DOCX Paragraph로 변환 (PDF 디자인과 동일하게)
    const paragraphs = htmlToDocxParagraphs(element, isAnswerMode);
    
    // 디버깅: 변환 결과 확인
    console.log('📄 htmlToDocxParagraphs 결과:', {
      totalParagraphs: paragraphs.length,
      hasContent: paragraphs.length > 0
    });
    
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
  
  console.log('📄 ========== generateAndUploadFile 시작 ==========');
  console.log('📄 generateAndUploadFile 호출:', {
    fileFormat,
    fileFormatType: typeof fileFormat,
    isDoc: fileFormat === 'doc',
    isPdf: fileFormat === 'pdf',
    options,
    workTypeName,
    elementId: element?.id,
    elementTagName: element?.tagName
  });
  
  switch (fileFormat) {
    case 'doc':
      console.log('📄 DOC 생성 경로로 이동');
      console.trace('📄 generateAndUploadDOC 호출 스택');
      return await generateAndUploadDOC(element, userId, historyId, workTypeName, options);
    case 'pdf':
    default:
      console.log('📄 PDF 생성 경로로 이동 (또는 기본값)');
      console.trace('📄 generateAndUploadPDF 호출 스택');
      return await generateAndUploadPDF(element, userId, historyId, workTypeName, options);
  }
};

