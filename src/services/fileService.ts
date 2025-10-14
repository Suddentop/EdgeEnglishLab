import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

export interface FileUploadResult {
  url: string;
  fileName: string;
  size: number;
}

// 문제 생성 결과를 JSON 파일로 저장
export const saveQuizToFile = async (
  userId: string,
  historyId: string,
  quizData: any,
  workTypeName: string
): Promise<FileUploadResult> => {
  try {
    // 파일명 생성: 날짜_유형_사용자ID_내역ID.json
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
    const fileName = `quiz_${dateStr}_${timeStr}_${workTypeName.replace(/[^a-zA-Z0-9]/g, '_')}_${userId}_${historyId}.json`;
    
    // JSON 데이터 준비
    const fileData = {
      metadata: {
        userId,
        historyId,
        workTypeName,
        createdAt: now.toISOString(),
        version: '1.0'
      },
      quizData
    };

    // JSON을 Blob으로 변환
    const jsonString = JSON.stringify(fileData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Firebase Storage에 업로드
    const fileRef = ref(storage, `quiz-files/${userId}/${fileName}`);
    await uploadBytes(fileRef, blob);
    
    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(fileRef);
    
    return {
      url: downloadURL,
      fileName,
      size: blob.size
    };
  } catch (error) {
    console.error('파일 저장 실패:', error);
    throw error;
  }
};

// PDF 파일로 저장 (문제용)
export const saveQuizToPDF = async (
  userId: string,
  historyId: string,
  quizData: any,
  workTypeName: string,
  isAnswerMode: boolean = false
): Promise<FileUploadResult> => {
  try {
    // 임시 HTML 생성
    const htmlContent = generateQuizHTML(quizData, workTypeName, isAnswerMode);
    
    // HTML을 Blob으로 변환
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    // 파일명 생성
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const mode = isAnswerMode ? 'answer' : 'problem';
    const fileName = `quiz_${dateStr}_${timeStr}_${workTypeName.replace(/[^a-zA-Z0-9]/g, '_')}_${mode}_${userId}_${historyId}.html`;
    
    // Firebase Storage에 업로드
    const fileRef = ref(storage, `quiz-files/${userId}/${fileName}`);
    await uploadBytes(fileRef, blob);
    
    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(fileRef);
    
    return {
      url: downloadURL,
      fileName,
      size: blob.size
    };
  } catch (error) {
    console.error('PDF 파일 저장 실패:', error);
    throw error;
  }
};

// HTML 생성 함수
const generateQuizHTML = (quizData: any, workTypeName: string, isAnswerMode: boolean): string => {
  const title = isAnswerMode ? `${workTypeName} - 정답` : `${workTypeName} - 문제`;
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Malgun Gothic', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .quiz-item {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        .question-title {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 15px;
        }
        .question-content {
            margin-bottom: 15px;
        }
        .options {
            margin-left: 20px;
        }
        .option {
            margin-bottom: 8px;
        }
        .answer {
            background-color: #e8f5e8;
            padding: 10px;
            border-left: 4px solid #4caf50;
            margin-top: 15px;
        }
        .translation {
            background-color: #f0f7ff;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            border-left: 4px solid #1976d2;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .quiz-item { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p>생성일: ${new Date().toLocaleDateString()}</p>
    </div>
    
    ${generateQuizContent(quizData, isAnswerMode)}
    
    <div class="translation">
        <h3>📖 본문 해석</h3>
        <p>${quizData.translatedText || '번역 정보가 없습니다.'}</p>
    </div>
</body>
</html>`;
};

// 퀴즈 콘텐츠 생성
const generateQuizContent = (quizData: any, isAnswerMode: boolean): string => {
  if (!quizData || !Array.isArray(quizData)) {
    return '<p>퀴즈 데이터가 없습니다.</p>';
  }

  return quizData.map((item: any, index: number) => {
    let content = '';
    
    // 유형별 콘텐츠 생성
    if (item.workTypeId === '01' && item.quiz) {
      content = generateWork01Content(item.quiz, isAnswerMode);
    } else if (item.workTypeId === '02' && item.work02Data) {
      content = generateWork02Content(item.work02Data, isAnswerMode);
    } else if (item.workTypeId === '03' && item.work03Data) {
      content = generateWork03Content(item.work03Data, isAnswerMode);
    }
    // 다른 유형들도 추가 가능
    
    return `
      <div class="quiz-item">
        <div class="question-title">#${index + 1}. ${getWorkTypeName(item.workTypeId)}</div>
        ${content}
      </div>
    `;
  }).join('');
};

// 유형별 콘텐츠 생성 함수들
const generateWork01Content = (quiz: any, isAnswerMode: boolean): string => {
  let content = `
    <div class="question-content">
      <p><strong>문제:</strong> 다음 단락들을 원래 순서대로 배열한 것을 고르세요</p>
      <div class="options">
        ${quiz.shuffledParagraphs?.map((p: any) => `<div class="option">${p.label}: ${p.content}</div>`).join('') || ''}
      </div>
      <div class="options">
        ${quiz.choices?.map((choice: string[], i: number) => 
          `<div class="option">${['①', '②', '③', '④'][i]} ${choice.join(' → ')}</div>`
        ).join('') || ''}
      </div>
    </div>
  `;
  
  if (isAnswerMode) {
    content += `
      <div class="answer">
        <strong>정답:</strong> ${['①', '②', '③', '④'][quiz.answerIndex || 0]} ${quiz.choices?.[quiz.answerIndex || 0]?.join(' → ') || ''}
      </div>
    `;
  }
  
  return content;
};

const generateWork02Content = (work02Data: any, isAnswerMode: boolean): string => {
  return `
    <div class="question-content">
      <p><strong>문제:</strong> 다음 본문을 읽고 해석하세요</p>
      <div class="question-content">
        ${work02Data.modifiedText || ''}
      </div>
    </div>
  `;
};

const generateWork03Content = (work03Data: any, isAnswerMode: boolean): string => {
  let content = `
    <div class="question-content">
      <p><strong>문제:</strong> 다음 빈칸에 들어갈 가장 적절한 단어를 고르세요</p>
      <div class="question-content">
        ${work03Data.blankedText || ''}
      </div>
      <div class="options">
        ${work03Data.options?.map((option: string, i: number) => 
          `<div class="option">${['①', '②', '③', '④', '⑤'][i]} ${option}</div>`
        ).join('') || ''}
      </div>
    </div>
  `;
  
  if (isAnswerMode) {
    content += `
      <div class="answer">
        <strong>정답:</strong> ${['①', '②', '③', '④', '⑤'][work03Data.answerIndex || 0]} ${work03Data.options?.[work03Data.answerIndex || 0] || ''}
      </div>
    `;
  }
  
  return content;
};

// 유형명 가져오기
const getWorkTypeName = (workTypeId: string): string => {
  const typeNames: Record<string, string> = {
    '01': '문단 순서 맞추기',
    '02': '유사단어 독해',
    '03': '빈칸(단어) 찾기',
    '04': '빈칸(구) 찾기',
    '05': '빈칸(문장) 찾기',
    '06': '문장 위치 찾기',
    '07': '주제 추론',
    '08': '제목 추론',
    '09': '어법 오류 찾기',
    '10': '다중 어법 오류 찾기',
    '11': '본문 문장별 해석',
    '13': '빈칸 채우기 (단어-주관식)',
    '14': '빈칸 채우기 (문장-주관식)'
  };
  
  return typeNames[workTypeId] || `유형#${workTypeId}`;
};

// 파일 다운로드
export const downloadFile = async (url: string, fileName: string): Promise<void> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    // 다운로드 링크 생성
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    
    // 다운로드 실행
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // URL 해제
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('파일 다운로드 실패:', error);
    throw error;
  }
};

// 파일 삭제
export const deleteFile = async (userId: string, fileName: string): Promise<void> => {
  try {
    const fileRef = ref(storage, `quiz-files/${userId}/${fileName}`);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('파일 삭제 실패:', error);
    throw error;
  }
};
