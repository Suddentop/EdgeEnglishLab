import React, { useState, useRef, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';
import { generateWork15Quiz, WordQuiz, WordItem, regenerateWork15QuizFromWords, generateSingleWordMeaning } from '../../../services/work15Service';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import { callOpenAI } from '../../../services/common';
import { processWithConcurrency } from '../../../utils/concurrency';
import HistoryPrintWork15 from './HistoryPrintWork15';
import './Work_15_PassageWordStudy.css';
import './PrintFormat15.css';

type InputType = 'clipboard' | 'file' | 'text';

// 입력 아이템 인터페이스 정의
interface InputItem {
  id: string;
  inputType: InputType;
  text: string;
  pastedImageUrl: string | null;
  isExpanded: boolean;
  isExtracting: boolean;
  error: string;
}

// 파일 → base64 변환
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// OpenAI Vision API 호출 (프록시만 사용)
async function callOpenAIVisionAPI(imageBase64: string, prompt: string): Promise<string> {
  const proxyUrl = process.env.REACT_APP_API_PROXY_URL || '';
  
  if (!proxyUrl) {
    throw new Error('프록시 서버가 설정되지 않았습니다. REACT_APP_API_PROXY_URL 환경 변수를 설정해주세요.');
  }

  let imageUrl = imageBase64;
  
  if (!imageBase64.startsWith('data:')) {
    try {
      imageUrl = imageBase64;
    } catch (error) {
      console.warn('⚠️ 이미지 URL 처리 실패, base64 직접 사용:', error);
    }
  }

  const proxyRequest = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: prompt },
          { type: 'image_url' as const, image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 2048
  };

  let lastError: Error | null = null;
  const maxRetries = 3;
  const retryDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await callOpenAI(proxyRequest);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error('OpenAI Vision API 호출 실패: ' + errText);
      }
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`⚠️ Vision API 호출 실패 (시도 ${attempt}/${maxRetries}):`, lastError.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }
    }
  }
  
  throw lastError || new Error('OpenAI Vision API 호출 실패: 알 수 없는 오류');
}

const visionPrompt = `영어문제로 사용되는 본문이야.\n이 이미지의 내용을 수작업으로 정확히 읽고, 영어 본문만 추려내서 보여줘.\n글자는 인쇄글씨체 이외에 손글씨나 원, 밑줄 등 표시되어있는 것은 무시해. 본문중에 원문자 1, 2, 3... 등으로 표시된건 제거해줘. 원문자 제거후 줄을 바꾸거나 문단을 바꾸지말고, 전체가 한 문단으로 구성해줘. 영어 본문만, 아무런 설명이나 안내문 없이, 한 문단으로만 출력해줘.`;

// OpenAI Vision 결과에서 안내문 제거
function cleanOpenAIVisionResult(text: string): string {
  return text.replace(/^(Sure!|Here is|Here are|Here's|Here's)[^\n:]*[:：]?\s*/i, '').trim();
}

const Work_15_PassageWordStudy: React.FC = () => {
  // 상태 관리
  const [items, setItems] = useState<InputItem[]>([
    { id: '1', inputType: 'clipboard', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<WordQuiz[]>([]); // 생성된 퀴즈 배열
  const quizType: 'english-to-korean' = 'english-to-korean'; // 고정: 영어→한글만 사용
  const [showScreenshotHelp, setShowScreenshotHelp] = useState(false);
  
  // 단어 편집 관련 상태
  const [editingQuizIndex, setEditingQuizIndex] = useState<number | null>(null); // 편집 중인 퀴즈 인덱스
  const [editingWords, setEditingWords] = useState<WordItem[]>([]); // 편집 중인 단어 목록
  const [newWordEnglish, setNewWordEnglish] = useState<string>(''); // 새 단어 입력
  const [isGeneratingMeaning, setIsGeneratingMeaning] = useState(false); // 한글뜻 생성 중

  // 포인트 관련 상태
  const { userData, loading } = useAuth();
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);

  // 포인트 초기화
  useEffect(() => {
    const initializePoints = async () => {
      if (!loading && userData) {
        try {
          const [workTypePointsData, userPoints] = await Promise.all([
            getWorkTypePoints(),
            getUserCurrentPoints(userData.uid)
          ]);
          
          setWorkTypePoints(workTypePointsData);
          const workType = workTypePointsData.find((wt: any) => wt.id === '15');
          if (workType) {
            setPointsToDeduct(workType.points);
          }
          setUserCurrentPoints(userPoints);
        } catch (error) {
          console.error('포인트 초기화 오류:', error);
        }
      }
    };
    if (!loading) {
      initializePoints();
    }
  }, [loading, userData]);

  // 아이템 관리 함수들
  const addItem = () => {
    const newItem: InputItem = {
      id: Date.now().toString(),
      inputType: 'clipboard',
      text: '',
      pastedImageUrl: null,
      isExpanded: true,
      isExtracting: false,
      error: ''
    };
    setItems(prev => prev.map(item => ({ ...item, isExpanded: false })).concat(newItem));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      setItems([{ id: Date.now().toString(), inputType: 'clipboard', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }]);
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<InputItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const toggleExpand = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isExpanded: !item.isExpanded } : item));
  };

  // Vision API 핸들러 (개별 아이템용)
  const handleImageToText = async (id: string, image: File | Blob) => {
    updateItem(id, { isExtracting: true, error: '' });
    
    try {
      let previewUrl = null;
      if (image instanceof Blob) {
        previewUrl = URL.createObjectURL(image);
        updateItem(id, { pastedImageUrl: previewUrl });
      }
      
      const imageBase64 = await fileToBase64(image as File);
      const resultText = await callOpenAIVisionAPI(imageBase64, visionPrompt);
      
      updateItem(id, { 
        text: cleanOpenAIVisionResult(resultText),
        pastedImageUrl: null,
        isExtracting: false 
      });
    } catch (err: any) {
      updateItem(id, { 
        error: 'OpenAI Vision API 호출 실패: ' + (err?.message || err),
        isExtracting: false,
        pastedImageUrl: null
      });
    }
  };

  // 이벤트 핸들러들
  const handlePaste = (id: string, e: React.ClipboardEvent) => {
    const item = items.find(i => i.id === id);
    if (!item || item.inputType !== 'clipboard') return;

    const clipItems = e.clipboardData.items;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.indexOf('image') !== -1) {
        const file = clipItems[i].getAsFile();
        if (file) {
          handleImageToText(id, file);
          e.preventDefault();
          return;
        }
      }
    }
  };

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      updateItem(id, { error: '이미지 파일만 첨부 가능합니다.' });
      return;
    }
    handleImageToText(id, file);
    e.target.value = '';
  };

  // 문제 생성 핸들러
  const handleGenerateQuiz = async () => {
    const validItems = items.filter(item => item.text.trim().length >= 10);
    
    if (validItems.length === 0) {
      alert('문제 생성을 위해 최소 하나의 본문을 입력해주세요.');
      return;
    }

    if (loading) return;
    if (!userData || !userData.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    const totalPoints = pointsToDeduct * validItems.length;
    if (userCurrentPoints < totalPoints) {
      alert(`포인트가 부족합니다. 현재 ${userCurrentPoints.toLocaleString()}포인트, 필요 ${totalPoints.toLocaleString()}포인트 (${validItems.length}문제)`);
      return;
    }

    setShowPointModal(true);
  };

  const handlePointDeductionConfirm = async () => {
    setShowPointModal(false);
    setIsLoading(true);
    setQuizzes([]);

    const validItems = items.filter(item => item.text.trim().length >= 10);
    const generatedQuizzes: WordQuiz[] = [];
    let successCount = 0;
    let failCount = 0;

    try {
      const totalPoints = pointsToDeduct * validItems.length;
      const deductionResult = await deductUserPoints(
        userData!.uid, 
        '15',
        `본문 단어 학습 (${validItems.length}문제)`,
        userData!.displayName || '사용자',
        userData!.nickname || '사용자',
        totalPoints
      );
      
      if (deductionResult.success) {
        setUserCurrentPoints(deductionResult.remainingPoints);
        
        const allInputTexts: string[] = [];
        const results = await processWithConcurrency(validItems, 3, async (item) => {
          try {
            console.log(`🔍 문제 생성 시작 (ID: ${item.id})...`);
            const quiz = await generateWork15Quiz(item.text, quizType);
            return { quiz, input: item.text };
          } catch (err) {
            console.error(`❌ 문제 생성 실패 (ID: ${item.id}):`, err);
            return null;
          }
        });

        results.forEach(res => {
          if (!res) {
            failCount++;
            return;
          }
          generatedQuizzes.push(res.quiz);
          allInputTexts.push(res.input);
          successCount++;
        });

        setQuizzes(generatedQuizzes);
        
        if (generatedQuizzes.length > 0 && userData!.uid) {
          try {
            const combinedInputText = allInputTexts.join('\n\n---\n\n');
            await saveQuizWithPDF({
              userId: userData!.uid,
              userName: userData!.name || '사용자',
              userNickname: userData!.nickname || '사용자',
              workTypeId: '15',
              workTypeName: `${getWorkTypeName('15')} (${generatedQuizzes.length}문제)`,
              points: totalPoints,
              inputText: combinedInputText,
              quizData: generatedQuizzes,
              status: 'success'
            });
            console.log(`✅ 유형#15 내역 저장 완료 (${generatedQuizzes.length}문제)`);
          } catch (historyError) {
            console.error('❌ 유형#15 내역 저장 실패:', historyError);
          }
        }
        
        if (failCount > 0) {
          alert(`${validItems.length}건 중 ${successCount}건 성공, ${failCount}건 실패했습니다.`);
        }
        
      } else {
        alert('포인트 차감 실패: ' + deductionResult.error);
      }
    } catch (err) {
      console.error('처리 중 오류:', err);
      alert('오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      window.scrollTo(0, 0);
    }
  };

  // 인쇄 스타일 정의
  const PRINT_STYLES = `
    @page {
      size: A4 landscape;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Roboto', sans-serif;
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
    
    /* 화면에서도 오버레이에 표시되도록 */
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
      font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Roboto', sans-serif;
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

    /* 화면에서 인쇄용 오버레이를 완전히 숨기기 */
    @media screen {
      #work15-print-overlay {
        display: none !important;
        visibility: hidden !important;
        left: -9999px !important;
        opacity: 0 !important;
        z-index: -1 !important;
        position: absolute !important;
      }
    }
    
    /* 다른 유형의 @media print { body * { visibility: hidden; } } 규칙을 무력화하기 위해
       인쇄 시점에만 body에 id="work15-print-active"를 temporarily 부여하고,
       그 안의 모든 요소를 다시 보이게 강제한다. */
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
      #work15-print-overlay {
        display: block !important;
        visibility: visible !important;
        left: 0 !important;
        top: 0 !important;
        opacity: 1 !important;
        z-index: 9999 !important;
        position: relative !important; /* fixed에서 relative로 변경 */
        width: 100% !important;
        height: auto !important;
        min-height: 42cm !important; /* 2페이지 = 21cm * 2 */
        overflow: visible !important;
      }
      #work15-print-overlay .only-print-work15 {
        display: block !important;
        visibility: visible !important;
        width: 100% !important;
        height: auto !important;
      }
      #work15-print-overlay .a4-landscape-page-template-work15 {
        display: flex !important;
        visibility: visible !important;
        width: 29.7cm !important;
        height: 21cm !important;
        min-height: 21cm !important;
        max-height: 21cm !important;
      }
    }
  `;

  // 인쇄 트리거
  type PrintMode = 'no-answer' | 'with-answer';
  
  const triggerPrint = (mode: PrintMode) => {
    if (!quizzes || quizzes.length === 0) {
      console.warn('🖨️ [Work15] triggerPrint 호출되었지만 quiz 데이터가 없습니다.', { mode });
      return;
    }

    console.log('🖨️ [Work15] triggerPrint 시작', {
      mode,
      quizzesCount: quizzes.length,
      totalWords: quizzes.reduce((sum, q) => sum + (q.words?.length || 0), 0)
    });

    // 각 퀴즈를 독립적으로 전달 (본문별로 분리)
    const dataForPrint: any = {
      quizzes: quizzes.map((quiz, index) => {
        const words = Array.isArray(quiz.words) ? quiz.words : [];
        const wordsWithPartOfSpeech = words.filter((w: any) => w.partOfSpeech && w.partOfSpeech.trim().length > 0);
        console.log(`🖨️ [Work15] 퀴즈 ${index + 1} 데이터:`, {
          wordsCount: words.length,
          hasWords: words.length > 0,
          quizType: quiz.quizType || quizType,
          sampleWords: words.slice(0, 3).map((w: any) => ({
            english: w.english,
            korean: w.korean,
            partOfSpeech: w.partOfSpeech,
            hasPartOfSpeech: !!(w.partOfSpeech && w.partOfSpeech.trim().length > 0)
          })),
          wordsWithPartOfSpeechCount: wordsWithPartOfSpeech.length,
          wordsWithoutPartOfSpeechCount: words.length - wordsWithPartOfSpeech.length
        });
        return {
          words: words,
          quizType: quiz.quizType || quizType,
          totalQuestions: quiz.totalQuestions || words.length,
          passage: quiz.passage
        };
      }),
      quizType: quizType
    };
    console.log('🖨️ [Work15] 인쇄용 데이터 준비 완료', { 
      quizzesCount: quizzes.length,
      dataForPrintQuizzesCount: dataForPrint.quizzes.length,
      quizzes: dataForPrint.quizzes.map((q: any) => ({ 
        wordsCount: q.words.length,
        hasWords: q.words.length > 0,
        wordsWithPartOfSpeech: q.words.filter((w: any) => w.partOfSpeech && w.partOfSpeech.trim().length > 0).length
      }))
    });

    // React 컴포넌트를 정적 HTML로 렌더링
    const markup = ReactDOMServer.renderToStaticMarkup(
      <HistoryPrintWork15
        data={dataForPrint}
        isAnswerMode={mode === 'with-answer'}
      />
    );

    console.log('🖨️ [Work15] 렌더링된 마크업 길이:', markup.length);
    console.log('🖨️ [Work15] 마크업 샘플:', markup.substring(0, 500));
    
    // 렌더링된 페이지 수 확인
    const pageCount = (markup.match(/a4-landscape-page-template-work15/g) || []).length;
    const expectedPageCount = Math.ceil(quizzes.length / 2);
    console.log('🖨️ [Work15] 렌더링된 페이지 수:', pageCount);
    console.log('🖨️ [Work15] 예상 페이지 수:', expectedPageCount);
    
    // 각 페이지의 내용 확인
    const pageMatches = markup.match(/<div class="a4-landscape-page-template-work15[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g);
    if (pageMatches) {
      console.log('🖨️ [Work15] 페이지별 마크업 확인:', {
        pageCount: pageMatches.length,
        pageLengths: pageMatches.map((p, i) => ({
          pageIndex: i,
          length: p.length,
          hasContent: p.includes('word-list-table-work15'),
          sample: p.substring(0, 200)
        }))
      });
    }
    
    // 문제 번호 확인
    const problemMatches = markup.match(/문제 \d+\./g);
    console.log('🖨️ [Work15] 마크업에 포함된 문제 번호:', problemMatches);
    
    if (pageCount !== expectedPageCount) {
      console.error(`🖨️ [Work15] 페이지 수 불일치! 예상: ${expectedPageCount}, 실제: ${pageCount}`);
      console.log('🖨️ [Work15] 전체 마크업:', markup);
    } else {
      console.log('🖨️ [Work15] 모든 페이지가 마크업에 포함되었습니다.');
    }

    // 현재 창 위에 전체 화면 오버레이 컨테이너 생성
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
      overflow: 'visible' // auto에서 visible로 변경하여 모든 페이지가 보이도록
    } as Partial<CSSStyleDeclaration>);

    // 오버레이에 인쇄용 스타일 + 마크업 주입
    overlay.innerHTML = `
      <style>${PRINT_STYLES}</style>
      ${markup}
    `;

    document.body.appendChild(overlay);
    
    // 인쇄 스타일이 제대로 주입되었는지 확인
    const styleElement = overlay.querySelector('style');
    console.log('🖨️ [Work15] 인쇄 스타일 확인:', {
      styleElementExists: !!styleElement,
      styleContentLength: styleElement ? styleElement.textContent?.length || 0 : 0,
      styleContentSample: styleElement ? styleElement.textContent?.substring(0, 200) : null,
      printStylesLength: PRINT_STYLES.length
    });

    // 디버깅: 오버레이 내용 확인
    console.log('🖨️ [Work15] 오버레이 추가 완료', {
      overlayId,
      hasContent: overlay.innerHTML.length > 0,
      childrenCount: overlay.children.length
    });
    
    // 실제 DOM에서 페이지 수 확인 (더 상세한 정보)
    setTimeout(() => {
      const pageElements = overlay.querySelectorAll('.a4-landscape-page-template-work15');
      const onlyPrintDiv = overlay.querySelector('.only-print-work15');
      
      // 오버레이 스타일 확인
      const overlayStyle = window.getComputedStyle(overlay);
      console.log('🖨️ [Work15] 오버레이 스타일 확인:', {
        display: overlayStyle.display,
        visibility: overlayStyle.visibility,
        position: overlayStyle.position,
        width: overlayStyle.width,
        height: overlayStyle.height,
        overflow: overlayStyle.overflow,
        zIndex: overlayStyle.zIndex
      });
      
      // only-print-work15 스타일 확인
      if (onlyPrintDiv) {
        const onlyPrintStyle = window.getComputedStyle(onlyPrintDiv);
        const onlyPrintRect = onlyPrintDiv.getBoundingClientRect();
        console.log('🖨️ [Work15] only-print-work15 스타일 확인:', {
          display: onlyPrintStyle.display,
          visibility: onlyPrintStyle.visibility,
          width: onlyPrintStyle.width,
          height: onlyPrintStyle.height,
          rect: {
            top: onlyPrintRect.top,
            left: onlyPrintRect.left,
            width: onlyPrintRect.width,
            height: onlyPrintRect.height
          },
          childrenCount: onlyPrintDiv.children.length,
          innerHTMLLength: onlyPrintDiv.innerHTML.length
        });
      }
      
      // 각 페이지 요소 상세 확인
      const pageDetails = Array.from(pageElements).map((el, idx) => {
        const rect = el.getBoundingClientRect();
        const computed = window.getComputedStyle(el);
        const parent = el.parentElement;
        const parentRect = parent ? parent.getBoundingClientRect() : null;
        const parentComputed = parent ? window.getComputedStyle(parent) : null;
        
        return {
          index: idx,
          className: el.className,
          id: el.id,
          childrenCount: el.children.length,
          textContentLength: el.textContent ? el.textContent.length : 0,
          innerHTMLLength: el.innerHTML.length,
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right
          },
          computedStyle: {
            display: computed.display,
            visibility: computed.visibility,
            width: computed.width,
            height: computed.height,
            minHeight: computed.minHeight,
            maxHeight: computed.maxHeight,
            position: computed.position,
            pageBreakAfter: computed.pageBreakAfter,
            breakAfter: computed.breakAfter
          },
          parent: parent ? {
            tagName: parent.tagName,
            className: parent.className,
            rect: parentRect,
            computedStyle: {
              display: parentComputed?.display,
              width: parentComputed?.width,
              height: parentComputed?.height
            }
          } : null
        };
      });
      
      console.log('🖨️ [Work15] 실제 DOM 페이지 수 확인 (상세):', {
        pageElementsCount: pageElements.length,
        expectedPages: Math.ceil(quizzes.length / 2),
        onlyPrintDivExists: !!onlyPrintDiv,
        onlyPrintDivChildren: onlyPrintDiv ? onlyPrintDiv.children.length : 0,
        pageDetails
      });
      
      // 마크업에서 두 번째 페이지 확인
      const markupContainsPage1 = markup.includes('work15-page-1');
      const markupContainsProblem3 = markup.includes('문제 3.');
      const markupContainsProblem4 = markup.includes('문제 4.');
      console.log('🖨️ [Work15] 마크업 내용 확인:', {
        markupLength: markup.length,
        containsPage1: markupContainsPage1,
        containsProblem3: markupContainsProblem3,
        containsProblem4: markupContainsProblem4,
        page0Index: markup.indexOf('work15-page-0'),
        page1Index: markup.indexOf('work15-page-1'),
        problem3Index: markup.indexOf('문제 3.'),
        problem4Index: markup.indexOf('문제 4.')
      });
      
      // 두 번째 페이지의 마크업 샘플
      if (markupContainsPage1) {
        const page1Start = markup.indexOf('work15-page-1');
        const page1Sample = markup.substring(page1Start, Math.min(page1Start + 500, markup.length));
        console.log('🖨️ [Work15] 두 번째 페이지 마크업 샘플:', page1Sample);
      }
    }, 100);

    // body에 임시 id를 부여하여 PRINT_STYLES 내 @media print 규칙이 적용되도록 함
    const prevBodyId = document.body.getAttribute('id');
    document.body.setAttribute('id', 'work15-print-active');

    // 모든 페이지가 렌더링되었는지 확인하는 함수
    const checkAllPagesRendered = (): boolean => {
      const pageElements = overlay.querySelectorAll('.a4-landscape-page-template-work15');
      const expectedPages = Math.ceil(quizzes.length / 2);
      const actualPages = pageElements.length;
      
      // 각 페이지의 높이 확인
      const pageHeights = Array.from(pageElements).map((el, idx) => {
        const rect = el.getBoundingClientRect();
        const computed = window.getComputedStyle(el);
        return {
          index: idx,
          height: rect.height,
          computedHeight: computed.height,
          hasContent: el.textContent && el.textContent.trim().length > 100
        };
      });
      
      console.log('🖨️ [Work15] 페이지 렌더링 확인:', {
        expectedPages,
        actualPages,
        allRendered: actualPages === expectedPages,
        pageHeights
      });
      
      return actualPages === expectedPages;
    };

    // 약간의 지연 후 인쇄 실행 (모든 페이지가 렌더링될 때까지 대기)
    const startPrint = () => {
      // 페이지 렌더링 확인
      if (!checkAllPagesRendered()) {
        console.warn('🖨️ [Work15] 일부 페이지가 아직 렌더링되지 않았습니다. 추가 대기...');
        setTimeout(startPrint, 200);
        return;
      }

      console.log('🖨️ [Work15] 모든 페이지가 렌더링되었습니다. 인쇄를 시작합니다.');
      
      // 모든 페이지가 보이도록 스크롤 확인 (더 상세한 정보)
      const pageElements = overlay.querySelectorAll('.a4-landscape-page-template-work15');
      pageElements.forEach((page, idx) => {
        const rect = page.getBoundingClientRect();
        const computed = window.getComputedStyle(page);
        const parent = page.parentElement;
        const parentRect = parent ? parent.getBoundingClientRect() : null;
        const parentComputed = parent ? window.getComputedStyle(parent) : null;
        
        // 페이지 내부 콘텐츠 확인
        const content = page.querySelector('.print-content-work15');
        const contentRect = content ? content.getBoundingClientRect() : null;
        const contentComputed = content ? window.getComputedStyle(content) : null;
        
        // 테이블 확인
        const tables = page.querySelectorAll('.word-list-table-work15');
        const tableCount = tables.length;
        const tableRects = Array.from(tables).map(t => t.getBoundingClientRect());
        
        console.log(`🖨️ [Work15] 페이지 ${idx} 상세 정보:`, {
          element: {
            rect: {
              top: rect.top,
              left: rect.left,
              height: rect.height,
              width: rect.width,
              bottom: rect.bottom,
              right: rect.right
            },
            computed: {
              display: computed.display,
              visibility: computed.visibility,
              width: computed.width,
              height: computed.height,
              minHeight: computed.minHeight,
              maxHeight: computed.maxHeight,
              position: computed.position,
              pageBreakAfter: computed.pageBreakAfter,
              breakAfter: computed.breakAfter
            },
            isVisible: rect.height > 0 && rect.width > 0,
            textContentLength: page.textContent ? page.textContent.length : 0,
            innerHTMLLength: page.innerHTML.length
          },
          parent: parent ? {
            tagName: parent.tagName,
            className: parent.className,
            rect: parentRect,
            computed: {
              display: parentComputed?.display,
              width: parentComputed?.width,
              height: parentComputed?.height
            }
          } : null,
          content: content ? {
            exists: true,
            rect: contentRect,
            computed: {
              display: contentComputed?.display,
              width: contentComputed?.width,
              height: contentComputed?.height
            }
          } : null,
          tables: {
            count: tableCount,
            rects: tableRects
          }
        });
      });
      
      // 추가 대기 시간 (브라우저가 모든 스타일을 적용할 시간)
      setTimeout(() => {
        // 인쇄 전 모든 페이지가 보이도록 스크롤
        overlay.scrollTop = 0;
        
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
        }, 100);
      }, 500);
    };

    // 초기 대기 후 인쇄 시작
    setTimeout(startPrint, 300);
  };

  const handlePrintNoAnswer = () => {
    console.log('🖨️ [Work15] 인쇄(문제) 버튼 클릭');
    triggerPrint('no-answer');
  };
  
  const handlePrintWithAnswer = () => {
    console.log('🖨️ [Work15] 인쇄(정답) 버튼 클릭');
    triggerPrint('with-answer');
  };

  // 리셋
  const resetAll = () => {
    setQuizzes([]);
    setItems([{ id: Date.now().toString(), inputType: 'clipboard', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }]);
    setEditingQuizIndex(null);
    setEditingWords([]);
    setNewWordEnglish('');
  };

  // 단어 편집 모드 시작
  const startEditingWords = (quizIndex: number) => {
    setEditingQuizIndex(quizIndex);
    setEditingWords([...quizzes[quizIndex].words]); // 현재 단어 목록 복사
    setNewWordEnglish('');
  };

  // 단어 편집 취소
  const cancelEditingWords = () => {
    setEditingQuizIndex(null);
    setEditingWords([]);
    setNewWordEnglish('');
  };

  // 단어 수정
  const updateWord = (index: number, field: 'english' | 'korean' | 'partOfSpeech', value: string) => {
    const updated = [...editingWords];
    updated[index] = { ...updated[index], [field]: value };
    setEditingWords(updated);
  };

  // 단어 삭제
  const deleteWord = (index: number) => {
    if (window.confirm('이 단어를 삭제하시겠습니까?')) {
      const updated = editingWords.filter((_, i) => i !== index);
      setEditingWords(updated);
    }
  };

  // 단어 추가
  const addWord = async () => {
    const english = newWordEnglish.trim();
    if (!english) {
      alert('영어 단어를 입력해주세요.');
      return;
    }

    // 중복 확인
    if (editingWords.some(w => w.english.toLowerCase() === english.toLowerCase())) {
      alert('이미 존재하는 단어입니다.');
      setNewWordEnglish('');
      return;
    }

    setIsGeneratingMeaning(true);
    try {
      const newWord = await generateSingleWordMeaning(english);
      setEditingWords([...editingWords, newWord]);
      setNewWordEnglish('');
    } catch (error) {
      console.error('단어 추가 실패:', error);
      alert('단어 추가 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingMeaning(false);
    }
  };

  // 수정된 단어 목록으로 퀴즈 재생성
  const saveEditedWords = async (quizIndex: number) => {
    if (editingWords.length === 0) {
      alert('최소 1개 이상의 단어가 필요합니다.');
      return;
    }

    setIsLoading(true);
    try {
      const originalQuiz = quizzes[quizIndex];
      const regeneratedQuiz = await regenerateWork15QuizFromWords(
        editingWords,
        quizType,
        originalQuiz.passage
      );

      const updatedQuizzes = [...quizzes];
      updatedQuizzes[quizIndex] = regeneratedQuiz;
      setQuizzes(updatedQuizzes);

      // 편집 모드 종료
      cancelEditingWords();

      alert('단어 목록이 업데이트되었습니다.');
    } catch (error) {
      console.error('퀴즈 재생성 실패:', error);
      alert('퀴즈 재생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 퀴즈 생성 완료 화면
  if (quizzes.length > 0) {
    return (
      <div className="quiz-display">
        <div className="quiz-header no-print">
          <h2>#15. 본문 단어 학습 (총 {quizzes.length}문제)</h2>
          <div className="quiz-header-buttons">
            <button 
              onClick={resetAll} 
              style={{
                width: '130px',
                height: '48px',
                padding: '0.75rem 1rem',
                fontSize: '11pt',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #bef264 0%, #a3e635 100%)',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(190, 242, 100, 0.25)'
              }}
            >
              새문제
            </button>
            <button 
              onClick={handlePrintNoAnswer} 
              style={{
                width: '130px',
                height: '48px',
                padding: '0.75rem 1rem',
                fontSize: '11pt',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)'
              }}
            >
              🖨️ 인쇄 (문제)
            </button>
            <button 
              onClick={handlePrintWithAnswer} 
              style={{
                width: '130px',
                height: '48px',
                padding: '0.75rem 1rem',
                fontSize: '11pt',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(240, 147, 251, 0.25)'
              }}
            >
              🖨️ 인쇄 (정답)
            </button>
          </div>
        </div>

        <div className="quiz-content no-print">
          <div style={{ padding: '1rem', background: '#f0f7ff', borderRadius: '8px', marginBottom: '2rem', borderLeft: '4px solid #1976d2' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1976d2' }}>
              총 {quizzes.length}개의 문제가 생성되었습니다.
            </h3>
          </div>
          
          {/* 생성된 문제 상세 리스트 */}
          <div className="generated-quizzes-list">
            {quizzes.map((quiz, idx) => (
              <div key={idx} className="quiz-item-card" style={{ marginBottom: '3rem', borderTop: '2px solid #eee', paddingTop: '2rem' }}>
                <div className="quiz-item-header" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: '#1976d2' }}>문제 {idx + 1}</h3>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#eee', fontSize: '0.8rem', color: '#666' }}>유형#15</span>
                  </div>
                  {editingQuizIndex !== idx && (
                    <button
                      onClick={() => startEditingWords(idx)}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        border: '2px solid #1976d2',
                        borderRadius: '6px',
                        background: '#fff',
                        color: '#1976d2',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#1976d2';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.color = '#1976d2';
                      }}
                    >
                      ✏️ 단어 편집
                    </button>
                  )}
                </div>

                <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.1rem', background:'#222', color:'#fff', padding:'0.7rem 0.8rem', borderRadius:'8px', marginBottom:'1rem'}}>
                  다음 영어 단어의 한글 뜻을 고르시오.
                </div>

                {/* 단어 편집 모드 */}
                {editingQuizIndex === idx && (
                  <div style={{
                    background: '#fff3cd',
                    border: '2px solid #ffc107',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, color: '#856404' }}>✏️ 단어 편집 모드</h4>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => saveEditedWords(idx)}
                          disabled={isLoading}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            border: 'none',
                            borderRadius: '6px',
                            background: '#28a745',
                            color: '#fff',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1
                          }}
                        >
                          {isLoading ? '저장 중...' : '💾 저장'}
                        </button>
                        <button
                          onClick={cancelEditingWords}
                          disabled={isLoading}
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            border: 'none',
                            borderRadius: '6px',
                            background: '#6c757d',
                            color: '#fff',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1
                          }}
                        >
                          ❌ 취소
                        </button>
                      </div>
                    </div>

                    {/* 단어 추가 입력 */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <input
                        type="text"
                        value={newWordEnglish}
                        onChange={(e) => setNewWordEnglish(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !isGeneratingMeaning) {
                            addWord();
                          }
                        }}
                        placeholder="새 영어 단어 입력 후 Enter 또는 추가 버튼 클릭"
                        disabled={isGeneratingMeaning}
                        style={{
                          flex: 1,
                          padding: '0.6rem',
                          fontSize: '0.95rem',
                          border: '2px solid #ffc107',
                          borderRadius: '6px',
                          outline: 'none'
                        }}
                      />
                      <button
                        onClick={addWord}
                        disabled={isGeneratingMeaning || !newWordEnglish.trim()}
                        style={{
                          padding: '0.6rem 1.2rem',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          border: 'none',
                          borderRadius: '6px',
                          background: isGeneratingMeaning || !newWordEnglish.trim() ? '#ccc' : '#17a2b8',
                          color: '#fff',
                          cursor: isGeneratingMeaning || !newWordEnglish.trim() ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isGeneratingMeaning ? '생성 중...' : '➕ 추가'}
                      </button>
                    </div>

                    {/* 편집 가능한 단어 목록 */}
                    <div style={{
                      maxHeight: '400px',
                      overflowY: 'auto',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      background: '#fff'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8f9fa' }}>
                            <th style={{ padding: '0.6rem', border: '1px solid #ddd', textAlign: 'center', width: '5%' }}>No.</th>
                            <th style={{ padding: '0.6rem', border: '1px solid #ddd', textAlign: 'center', width: '25%' }}>영어 단어</th>
                            <th style={{ padding: '0.6rem', border: '1px solid #ddd', textAlign: 'center', width: '10%' }}>품사</th>
                            <th style={{ padding: '0.6rem', border: '1px solid #ddd', textAlign: 'center', width: '50%' }}>한글 뜻</th>
                            <th style={{ padding: '0.6rem', border: '1px solid #ddd', textAlign: 'center', width: '10%' }}>삭제</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingWords.map((word, wordIdx) => (
                            <tr key={wordIdx} style={{ background: wordIdx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                              <td style={{ padding: '0.6rem', border: '1px solid #ddd', textAlign: 'center' }}>
                                {wordIdx + 1}
                              </td>
                              <td style={{ padding: '0.6rem', border: '1px solid #ddd' }}>
                                <input
                                  type="text"
                                  value={word.english}
                                  onChange={(e) => updateWord(wordIdx, 'english', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.4rem',
                                    fontSize: '0.9rem',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    outline: 'none'
                                  }}
                                />
                              </td>
                              <td style={{ padding: '0.6rem', border: '1px solid #ddd' }}>
                                <input
                                  type="text"
                                  value={word.partOfSpeech || ''}
                                  onChange={(e) => updateWord(wordIdx, 'partOfSpeech', e.target.value)}
                                  placeholder="n., v., adj., ..."
                                  style={{
                                    width: '100%',
                                    padding: '0.4rem',
                                    fontSize: '0.9rem',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    outline: 'none'
                                  }}
                                />
                              </td>
                              <td style={{ padding: '0.6rem', border: '1px solid #ddd' }}>
                                <input
                                  type="text"
                                  value={word.korean}
                                  onChange={(e) => updateWord(wordIdx, 'korean', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.4rem',
                                    fontSize: '0.9rem',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    outline: 'none'
                                  }}
                                />
                              </td>
                              <td style={{ padding: '0.6rem', border: '1px solid #ddd', textAlign: 'center' }}>
                                <button
                                  onClick={() => deleteWord(wordIdx)}
                                  style={{
                                    padding: '0.3rem 0.6rem',
                                    fontSize: '0.85rem',
                                    border: 'none',
                                    borderRadius: '4px',
                                    background: '#dc3545',
                                    color: '#fff',
                                    cursor: 'pointer'
                                  }}
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* 단어 테이블 표시 (편집 모드가 아닐 때만) */}
                {editingQuizIndex !== idx && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: quiz.words.length > 10 ? '1fr 1fr' : '1fr',
                    gap: '2rem',
                    marginTop: '1rem'
                  }}>
                  <div style={{
                    background: '#ffffff',
                    border: '2px solid #000000',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                      <thead>
                        <tr style={{background: '#e3f2fd'}}>
                          <th style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: '15%'}}>No.</th>
                          <th style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: '42.5%'}}>영어 단어</th>
                          <th style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: '42.5%'}}>한글 뜻</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quiz.words.slice(0, Math.ceil(quiz.words.length / 2)).map((word, index) => {
                          // 품사가 있으면 품사+한글뜻 표시
                          const partOfSpeech = word.partOfSpeech?.trim();
                          const hasPartOfSpeech = partOfSpeech && partOfSpeech.length > 0;
                          const displayKorean = hasPartOfSpeech
                            ? `${partOfSpeech} ${word.korean}`
                            : word.korean;
                          
                          return (
                            <tr key={index}>
                              <td style={{border: '1px solid #000000', padding: '0.8rem', textAlign: 'center', fontSize: '1rem', fontWeight: '500', color: '#000000'}}>
                                {index + 1}
                              </td>
                              <td style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '500', color: '#000000'}}>
                                {word.english}
                              </td>
                              <td style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', color: '#000000'}}>
                                {displayKorean}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {quiz.words.length > 10 && (
                    <div style={{
                      background: '#ffffff',
                      border: '2px solid #000000',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}>
                      <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                          <tr style={{background: '#e3f2fd'}}>
                            <th style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: '15%'}}>No.</th>
                            <th style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: '42.5%'}}>영어 단어</th>
                            <th style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: '42.5%'}}>한글 뜻</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quiz.words.slice(Math.ceil(quiz.words.length / 2)).map((word, index) => {
                            // 품사가 있으면 품사+한글뜻 표시
                            const partOfSpeech = word.partOfSpeech?.trim();
                            const hasPartOfSpeech = partOfSpeech && partOfSpeech.length > 0;
                            const displayKorean = hasPartOfSpeech
                              ? `${partOfSpeech} ${word.korean}`
                              : word.korean;
                            
                            return (
                              <tr key={index + Math.ceil(quiz.words.length / 2)}>
                                <td style={{border: '1px solid #000000', padding: '0.8rem', textAlign: 'center', fontSize: '1rem', fontWeight: '500', color: '#000000'}}>
                                  {index + Math.ceil(quiz.words.length / 2) + 1}
                                </td>
                                <td style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '500', color: '#000000'}}>
                                  {word.english}
                                </td>
                                <td style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', color: '#000000'}}>
                                  {displayKorean}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-generator no-print">
      <div className="generator-header">
        <h2>메뉴#13. 본문 단어 학습 문제 생성 (본문-단어문제)</h2>
        <p>여러 개의 영어 본문을 입력하여 각 본문에서 고3 수준의 단어를 추출하여 단어 학습 문제를 생성합니다.</p>
      </div>

      <div className="input-items-list">
        {items.map((item, index) => (
          <div key={item.id} className={`input-item ${item.isExpanded ? 'expanded' : ''}`}>
            <div className="input-item-header" onClick={() => toggleExpand(item.id)}>
              <div className="input-item-title">
                <span>#{index + 1}</span>
                <span className={`input-item-status ${item.text.length > 0 ? 'has-text' : ''}`}>
                  {item.text.length > 0 ? `텍스트 ${item.text.length}자` : '입력 대기'}
                </span>
              </div>
              <div className="input-item-controls">
                <button 
                  className="icon-btn delete" 
                  onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                  title="삭제"
                >
                  🗑️
                </button>
                <span className="expand-icon">{item.isExpanded ? '🔼' : '🔽'}</span>
              </div>
            </div>

            {item.isExpanded && (
              <div className="input-item-content">
                {/* 입력 방식 선택 */}
                <div className="input-type-section" style={{ marginBottom: '15px' }}>
                  <label>
                    <input
                      type="radio"
                      checked={item.inputType === 'clipboard'}
                      onChange={() => updateItem(item.id, { inputType: 'clipboard', error: '' })}
                    />
                    <span>📸 캡처화면 붙여넣기</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={item.inputType === 'file'}
                      onChange={() => updateItem(item.id, { inputType: 'file', error: '' })}
                    />
                    <span>🖼️ 이미지 파일 첨부</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={item.inputType === 'text'}
                      onChange={() => updateItem(item.id, { inputType: 'text', error: '' })}
                    />
                    <span>✍️ 직접 붙여넣기</span>
                  </label>
                </div>

                {/* 입력 UI */}
                {item.inputType === 'clipboard' && (
                  <div
                    className="input-guide"
                    tabIndex={0}
                    onPaste={(e) => handlePaste(item.id, e)}
                    style={{ minHeight: '120px' }}
                  >
                    <div className="drop-icon">📋</div>
                    <div className="drop-text">여기에 이미지를 붙여넣으세요 (Ctrl+V)</div>
                    {item.pastedImageUrl && (
                      <div className="preview-row">
                        <img src={item.pastedImageUrl} alt="Preview" className="preview-img" />
                      </div>
                    )}
                    {item.isExtracting && <div className="loading-text">텍스트 추출 중...</div>}
                  </div>
                )}

                {item.inputType === 'file' && (
                  <div className="input-guide" style={{ minHeight: '80px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(item.id, e)}
                      disabled={item.isExtracting}
                    />
                    {item.isExtracting && <span className="loading-text">추출 중...</span>}
                  </div>
                )}

                <textarea
                  value={item.text}
                  onChange={(e) => updateItem(item.id, { text: e.target.value })}
                  placeholder="영어 본문을 입력하세요. AI가 본문을 분석하여 고3 수준의 단어 15~20개를 추출합니다.

캡처 이미지 붙여넣기를 한 경우 '텍스트 추출 중...'이 완료된 후 '본문 추가하기'를 누르시거나 '일괄생성' 버튼을 눌러주세요.

직접 본문을 입력하거나 추출된 텍스트를 수정할 수 있습니다."
                  className="text-input"
                  rows={6}
                  style={{ marginTop: '10px', width: '100%' }}
                />
                
                {item.error && <div className="error-message">❌ {item.error}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={addItem} className="add-item-button">
        ➕ 본문 추가하기
      </button>

      <button
        onClick={handleGenerateQuiz}
        disabled={isLoading}
        className="generate-button"
        style={{ marginTop: '20px' }}
      >
        {items.filter(i => i.text.length >= 10).length > 1 
          ? `📋 ${items.filter(i => i.text.length >= 10).length}개 문제 일괄 생성` 
          : '📋 문제 생성'}
      </button>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="centered-hourglass-overlay">
          <div className="centered-hourglass-content">
            <span className="centered-hourglass-spinner">⏳</span>
            <div className="loading-text">
              문제를 생성하고 있습니다...<br/>
              잠시만 기다려주세요.
            </div>
          </div>
        </div>
      )}

      <ScreenshotHelpModal
        isOpen={showScreenshotHelp}
        onClose={() => setShowScreenshotHelp(false)}
      />

      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={handlePointDeductionConfirm}
        pointsToDeduct={pointsToDeduct * items.filter(i => i.text.length >= 10).length}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - (pointsToDeduct * items.filter(i => i.text.length >= 10).length)}
        workTypeName={`본문 단어 학습 (${items.filter(i => i.text.length >= 10).length}문제)`}
      />
    </div>
  );
};

export default Work_15_PassageWordStudy;

