import { saveQuizHistory, updateQuizHistoryFile } from '../services/quizHistoryService';
import { convertQuizDataToHTML, generatePrintableHTMLAndUpload } from '../services/pdfService';

interface SaveQuizHistoryParams {
  userId: string;
  userName: string;
  userNickname: string;
  workTypeId: string;
  workTypeName: string;
  points: number;
  inputText: string;
  quizData: any;
  status?: 'success' | 'partial' | 'failed' | 'refunded';
}

// 문제 생성 내역 저장 및 PDF 생성
export const saveQuizWithPDF = async (params: SaveQuizHistoryParams): Promise<string> => {
  const {
    userId,
    userName,
    userNickname,
    workTypeId,
    workTypeName,
    points,
    inputText,
    quizData,
    status = 'success'
  } = params;

  try {
    // 1. 내역 저장
    const historyId = await saveQuizHistory(
      userId,
      userName,
      userNickname,
      workTypeId,
      workTypeName,
      points,
      inputText,
      quizData,
      status
    );

    console.log(`📝 내역 저장 완료 (${workTypeName}): ${historyId}`);
    return historyId;
  } catch (error) {
    console.error(`❌ 내역 저장 실패 (${workTypeName}):`, error);
    throw error;
  }
};

// 패키지 퀴즈 내역 일괄 저장 (하나의 내역으로 저장)
export const savePackageQuizHistory = async (
  userId: string,
  userName: string,
  userNickname: string,
  packageQuizzes: any[],
  inputText: string,
  workTypePoints: any[],
  uiToFirebaseIdMap: Record<string, string>,
  packageId?: string // 패키지 ID 추가 (P01, P02, P03)
): Promise<void> => {
  try {
    console.log(`📦 패키지 내역 저장 시작 (${packageId}):`, {
      userId,
      packageQuizzesCount: packageQuizzes.length,
      workTypePointsCount: workTypePoints.length
    });
    
    // 패키지 정보 수집
    const packageWorkTypes: string[] = [];
    let totalPoints = 0;
    const allQuizData: any[] = [];
    
    packageQuizzes.forEach(quiz => {
      const firebaseId = uiToFirebaseIdMap[quiz.workTypeId];
      const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId);
      const points = workTypePoint?.points || 0;
      
      packageWorkTypes.push(quiz.workTypeId);
      totalPoints += points;
      
      const quizData = extractQuizData(quiz);
      if (quizData) {
        allQuizData.push({
          workTypeId: quiz.workTypeId,
          workTypeName: getWorkTypeName(quiz.workTypeId),
          data: quizData
        });
      }
    });

    // 패키지 내역 저장
    const { saveQuizHistory } = await import('../services/quizHistoryService');
    const historyId = await saveQuizHistory(
      userId,
      userName,
      userNickname,
      packageId || 'package', // 패키지 식별자 (P01, P02, P03)
      `패키지#${packageId?.replace('P', '') || '?'} 퀴즈 (${packageWorkTypes.length}개 유형)`,
      totalPoints,
      inputText,
      {
        isPackage: true,
        packageWorkTypes,
        quizzes: allQuizData
      },
      'success'
    );

    console.log(`📝 패키지 내역 저장 완료: ${historyId}`);
    console.log('✅ 패키지 퀴즈 내역 저장 완료');
  } catch (error) {
    console.error('❌ 패키지 퀴즈 내역 저장 실패:', error);
  }
};

// 패키지 데이터를 HTML로 변환
const convertPackageDataToHTML = (allQuizData: any[], isAnswer: boolean): string => {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>패키지 퀴즈 ${isAnswer ? '(정답)' : '(문제)'}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .quiz-section { margin-bottom: 30px; page-break-inside: avoid; }
        .quiz-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
        .quiz-content { margin-left: 20px; }
        .question { margin-bottom: 10px; }
        .answer { color: #1976d2; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>패키지 퀴즈 ${isAnswer ? '(정답)' : '(문제)'}</h1>
  `;

  allQuizData.forEach((quiz, index) => {
    html += `
      <div class="quiz-section">
        <div class="quiz-title">${index + 1}. ${quiz.workTypeName}</div>
        <div class="quiz-content">
          ${convertQuizDataToHTML(quiz.data, quiz.workTypeName, quiz.workTypeId, isAnswer)}
        </div>
      </div>
    `;
  });

  html += `
    </body>
    </html>
  `;

  return html;
};

// 유형명 가져오기
export const getWorkTypeName = (workTypeId: string): string => {
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
    '12': '본문 문장별 해석(수정)',
    '13': '빈칸 채우기 (단어-주관식)',
    '14': '빈칸 채우기 (문장-주관식)',
    '15': '본문 단어 학습'
  };
  
  return typeNames[workTypeId] || `유형#${workTypeId}`;
};

// 퀴즈 데이터 추출 (PackageQuizItem에서 실제 퀴즈 데이터만 추출)
const extractQuizData = (quiz: any): any => {
  if (quiz.quiz) return quiz.quiz;
  if (quiz.work01Data) return quiz.work01Data;
  if (quiz.work02Data) return quiz.work02Data;
  if (quiz.work03Data) return quiz.work03Data;
  if (quiz.work04Data) return quiz.work04Data;
  if (quiz.work05Data) return quiz.work05Data;
  if (quiz.work06Data) return quiz.work06Data;
  if (quiz.work07Data) return quiz.work07Data;
  if (quiz.work08Data) return quiz.work08Data;
  if (quiz.work09Data) return quiz.work09Data;
  if (quiz.work10Data) return quiz.work10Data;
  if (quiz.work11Data) return quiz.work11Data;
  if (quiz.work12Data) return quiz.work12Data;
  if (quiz.work13Data) return quiz.work13Data;
  if (quiz.work14Data) return quiz.work14Data;
  if (quiz.work15Data) return quiz.work15Data;
  
  return quiz;
};

