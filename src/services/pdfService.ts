import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export interface PDFGenerationOptions {
  isAnswerMode?: boolean;
  orientation?: 'portrait' | 'landscape';
  filename?: string;
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
    
    // 요소 크기 확인 및 조정
    const elementWidth = element.scrollWidth || element.offsetWidth || 800;
    const elementHeight = element.scrollHeight || element.offsetHeight || 600;
    
    console.log('📏 요소 크기:', { width: elementWidth, height: elementHeight });

    // HTML을 Canvas로 변환
    const canvas = await html2canvas(element, {
      useCORS: true,
      logging: true, // 디버깅을 위해 로깅 활성화
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
    
    // PDF 생성
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
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

