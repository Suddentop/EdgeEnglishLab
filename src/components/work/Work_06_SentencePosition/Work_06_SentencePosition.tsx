import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import './Work_06_SentencePosition.css';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../../../styles/PrintFormat.css';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { useAuth } from '../../../contexts/AuthContext';

const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];
type PrintMode = 'none' | 'no-answer' | 'with-answer';

interface SentencePositionQuiz {
  missingSentence: string;
  numberedPassage: string;
  answerIndex: number; // 0~4 (①~⑤)
  translation: string;
}

const Work_06_SentencePosition: React.FC = () => {
  const { userData, loading } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<SentencePositionQuiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);

  // 포인트 관련 초기화
  useEffect(() => {
    const initializePoints = async () => {
      try {
        const points = await getWorkTypePoints();
        setWorkTypePoints(points);
        
        // 유형#06의 포인트 설정
        const workType6Points = points.find(wt => wt.id === '6')?.points || 0;
        setPointsToDeduct(workType6Points);
        
        // 로딩이 완료되고 userData가 있을 때만 포인트 조회
        if (!loading && userData && userData.uid) {
          const currentPoints = await getUserCurrentPoints(userData.uid);
          setUserCurrentPoints(currentPoints);
        }
      } catch (error) {
        console.error('포인트 초기화 오류:', error);
      }
    };
    
    // 로딩이 완료된 후에만 포인트 초기화
    if (!loading) {
      initializePoints();
    }
  }, [userData?.uid, loading]);

  // 컴포넌트 마운트 시 스크롤 최상단
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 문제 생성 후 스크롤 최상단
  useEffect(() => {
    if (quiz) {
      window.scrollTo(0, 0);
    }
  }, [quiz]);

  // 동적 페이지 분할 결정을 위한 상태
  const [pageLayoutInfo, setPageLayoutInfo] = useState({
    needsSecondPage: false,
    canFitTranslationWithAnswer: false,
    canFitAnswerWithTranslation: false,
    page1Content: '',
    page2Content: '',
    page3Content: ''
  });

  // 인쇄(정답) 페이지 분할 로직만 독립적으로 계산
  useEffect(() => {
    if (!inputText || !quiz) return;

    // A4 페이지 기준 설정 (실제 인쇄 크기)
    const A4_HEIGHT_MM = 297; // A4 높이 (mm)
    const A4_WIDTH_MM = 210;  // A4 너비 (mm)
    const MARGIN_TOP_MM = 20;  // 상단 여백
    const MARGIN_BOTTOM_MM = 20; // 하단 여백
    const HEADER_HEIGHT_MM = 15; // 헤더 높이
    const FOOTER_HEIGHT_MM = 10; // 푸터 높이
    
    // 실제 사용 가능한 컨텐츠 영역 높이
    const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM;
    
    // mm를 픽셀로 변환 (1mm ≈ 3.78px, 96dpi 기준)
    const MM_TO_PX = 3.78;
    const CONTENT_HEIGHT_PX = CONTENT_HEIGHT_MM * MM_TO_PX;
    
    // 각 요소별 높이 계산 함수
    const calculateElementHeight = (text: string, fontSize: number, lineHeight: number, padding: number = 0) => {
      const availableWidth = A4_WIDTH_MM * MM_TO_PX * 0.9; // 90% 사용 (여백 10%)
      const charWidth = fontSize * 0.55; // 문자 폭 추정
      const charsPerLine = Math.floor(availableWidth / charWidth);
      const lines = Math.ceil(text.length / charsPerLine);
      return (lines * fontSize * lineHeight) + padding;
    };

    // ========================================
    // 인쇄(정답) 페이지 분할 로직만 독립적으로 계산
    // ========================================
    
    // 1. 문제제목 컨테이너 높이
    const problemTitleHeight = calculateElementHeight('아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.', 16, 1.2, 14);
    
    // 2. 주요문장 박스 높이
    const missingSentenceBoxHeight = calculateElementHeight(`주요 문장: ${quiz.missingSentence}`, 16, 1.2, 32);
    
    // 3. 번호가 매겨진 본문 높이
    const numberedPassageHeight = calculateElementHeight(quiz.numberedPassage, 16, 1.7, 32);
    
    // 4. 정답 표시 높이
    const answerHeight = calculateElementHeight(`정답: ①②③④⑤[${quiz.answerIndex}]`, 16, 1.2, 20) + 24; // marginBottom 1.5rem (24px) 추가
    
    // 5. 본문 해석 컨테이너 높이
    const translationHeight = calculateElementHeight(quiz.translation || '', 16, 1.6, 32);
    const translationContainerHeight = translationHeight; // 제목 제거로 높이 계산 단순화
    
    // 6. 인쇄(정답) 1페이지 높이 계산 (문제제목 + 주요문장박스 + 번호본문 + 정답)
    const answerPage1Height = problemTitleHeight + missingSentenceBoxHeight + numberedPassageHeight + answerHeight;
    
    // 7. 1페이지에 정답 + 해석이 들어갈 수 있는지 확인
    const canFitAnswerWithTranslation = (answerPage1Height + translationContainerHeight + 32) <= CONTENT_HEIGHT_PX; // 정답과 해석 사이 여백 32px (2rem)
    
    // 8. 인쇄(정답) 페이지 분할 결정
    const needsSecondPageForAnswer = answerPage1Height > CONTENT_HEIGHT_PX;
    
    // 9. 2페이지에 정답 + 해석이 들어갈 수 있는지 확인 (1페이지에 안 들어가는 경우에만)
    const canFitTranslationWithAnswer = needsSecondPageForAnswer && 
      (answerHeight + translationContainerHeight + 32) <= CONTENT_HEIGHT_PX; // 정답과 해석 사이 여백 32px (2rem)
    
    console.log('=== 유형#06 인쇄(정답) 페이지 분할 로직 ===');
    console.log('전체 페이지 높이:', Math.round(CONTENT_HEIGHT_PX), 'px');
    console.log('문제제목 높이:', Math.round(problemTitleHeight), 'px');
    console.log('주요문장박스 높이:', Math.round(missingSentenceBoxHeight), 'px');
    console.log('번호본문 높이:', Math.round(numberedPassageHeight), 'px');
    console.log('정답 높이:', Math.round(answerHeight), 'px');
    console.log('해석 컨테이너 높이:', Math.round(translationContainerHeight), 'px');
    console.log('1페이지 높이:', Math.round(answerPage1Height), 'px');
    console.log('1페이지에 정답+해석 포함 가능:', canFitAnswerWithTranslation);
    console.log('2페이지 분할:', needsSecondPageForAnswer);
    console.log('2페이지에 해석 포함 가능:', canFitTranslationWithAnswer);
    console.log('=====================================');

    setPageLayoutInfo({
      needsSecondPage: false, // 인쇄(문제)는 항상 1페이지
      canFitTranslationWithAnswer,
      canFitAnswerWithTranslation,
      page1Content: `정답: ${Math.round(answerPage1Height)}px / ${Math.round(CONTENT_HEIGHT_PX)}px`,
      page2Content: `분할: ${needsSecondPageForAnswer ? '2페이지' : '1페이지'}`,
      page3Content: `해석 포함: ${canFitTranslationWithAnswer ? '2페이지에 함께' : '3페이지 분리'}`
    });
  }, [inputText, quiz]);

  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setQuiz(null);
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      // OCR → textarea에 자동 입력
      setIsExtractingText(true);
      try {
        const ocrText = await imageToTextWithOpenAIVision(file);
        setInputText(ocrText);
        setTimeout(() => {
          if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
          }
        }, 0);
      } catch (err) {
        alert('OCR 처리 중 오류가 발생했습니다.');
      } finally {
        setIsExtractingText(false);
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (inputMode !== 'capture') return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setImageFile(file);
          setImagePreview(URL.createObjectURL(file));
          setIsExtractingText(true);
      try {
        const ocrText = await imageToTextWithOpenAIVision(file);
            setInputText(ocrText);
            setTimeout(() => {
              if (textAreaRef.current) {
                textAreaRef.current.style.height = 'auto';
                textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
              }
            }, 0);
          } catch (err) {
            alert('OCR 처리 중 오류가 발생했습니다.');
          } finally {
        setIsExtractingText(false);
      }
        }
        e.preventDefault();
        return;
      }
    }
    e.preventDefault();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  };

  async function imageToTextWithOpenAIVision(imageFile: File): Promise<string> {
    const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const base64 = await fileToBase64(imageFile);
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const prompt = `이 이미지에서 영어 본문만 정확하게 추출해주세요.

**추출 요구사항:**
1. 영어 본문만 추출 (한글 설명, 문제 번호, 제목 등은 제외)
2. 문장 구분을 명확히 하여 마침표(.), 느낌표(!), 물음표(?) 유지
3. 모든 영어 텍스트를 하나의 연속된 문단으로 출력
4. 줄바꿈 없이 공백으로 문장들을 연결
5. 특수문자나 번호 매김은 제외

**출력 형태:** 순수한 영어 본문만 (예: "Sentence one. Sentence two. Sentence three.")`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: base64 } }
            ]
          }
        ],
        max_tokens: 2048
      })
    });
    const data = await response.json();
    let extractedText = data.choices[0].message.content.trim();
    
    // OCR 결과 후처리
    extractedText = cleanupOCRText(extractedText);
    
    return extractedText;
  }

  // OCR 텍스트 정리 함수
  function cleanupOCRText(text: string): string {
    // 1. 한글 텍스트 제거
    text = text.replace(/[가-힣]+/g, '');
    
    // 2. 번호 매김 제거 (1), (2), [1], 1., 등
    text = text.replace(/^\s*[\(\[]?\d+[\.\)\]]\s*/gm, '');
    text = text.replace(/\b\d+\.\s*/g, '');
    
    // 3. 특수 기호 정리
    text = text.replace(/['"'"]/g, '"'); // 따옴표 통일
    text = text.replace(/['']/g, "'"); // 아포스트로피 통일
    
    // 4. 연속 공백 정리
    text = text.replace(/\s+/g, ' ');
    
    // 5. 문장 간 공백 보장
    text = text.replace(/([.!?])\s*([A-Z])/g, '$1 $2');
    
    // 6. 앞뒤 공백 제거
    text = text.trim();
    
    // 7. 빈 문자열 체크
    if (!text || text.length < 10) {
      throw new Error('추출된 텍스트가 너무 짧습니다. 이미지를 다시 확인해주세요.');
    }
    
    return text;
  }

  async function generateSentencePositionQuizWithAI(passage: string): Promise<SentencePositionQuiz> {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const prompt = `아래 영어 본문에서 글의 주제와 가장 밀접한, 의미 있는 문장 1개를 선정해.

**절대 지켜야 할 규칙 (위반 시 오류):**
1. 본문을 문장 단위로 분할할 때, 정확히 5개의 위치에만 원문자를 삽입
2. 원문자는 반드시 ①, ②, ③, ④, ⑤ 순서대로 사용 (중복 없음, ⑥ 이상 사용 금지)
3. 빠진 문장이 들어갈 위치는 1~5 중 하나로 지정 (answerIndex는 0~4)
4. **절대 금지**: 본문에 "정답위치", "정답", "(정답: X)", "[정답 위치: X]", "[정답 위치]", "정답 위치", "위치", "정답은", "정답이", "정답을" 같은 텍스트를 절대 포함하지 말 것
5. 각 원문자는 문장 앞에 삽입
6. 원문자 뒤에는 반드시 공백이 있어야 함
7. ⑥, ⑦, ⑧, ⑨, ⑩ 등은 절대 사용하지 말 것
8. 본문에는 영어 문장만 포함하고, 정답 관련 한글 텍스트는 절대 포함하지 말 것
9. 원본 본문에 없던 텍스트는 절대 추가하지 말 것
10. **중요**: numberedPassage 필드에는 오직 영어 문장과 원문자(①~⑤)만 포함하고, 그 외의 모든 텍스트는 제외
11. **절대 금지**: [1], [2], [3], (1), (2), (3), {1}, {2}, {3} 등 모든 숫자 마커 사용 금지
12. **절대 금지**: 원문자 중복 사용 금지 (①, ②, ③, ④, ⑤ 각각 한 번씩만 사용)

**작업 순서:**
1. 본문에서 가장 중요한 주제 문장 1개를 선정하여 제거
2. 남은 본문을 문장 단위로 분할 (마침표, 느낌표, 물음표 기준)
3. 처음 5개 문장 앞에 ①~⑤를 순서대로 삽입 (중복 없이)
4. 빠진 문장이 들어갈 위치를 1~5 중 하나로 결정
5. 본문 해석 제공

**정확한 예시:**
{
  "missingSentence": "The main topic sentence that was removed.",
  "numberedPassage": "① First sentence. ② Second sentence. ③ Third sentence. ④ Fourth sentence. ⑤ Fifth sentence. Additional sentences without numbers.",
  "answerIndex": 2,
  "translation": "본문 해석"
}

**절대 금지사항 (위반 시 오류):**
- 본문에 "[정답 위치: X]" 텍스트 포함 금지
- 본문에 "[정답 위치]" 텍스트 포함 금지
- 본문에 "정답 위치(X)" 텍스트 포함 금지
- 본문에 "정답 위치 X" 텍스트 포함 금지
- 본문에 "정답(X)" 텍스트 포함 금지
- 본문에 "정답 X" 텍스트 포함 금지
- 본문에 "위치(X)" 텍스트 포함 금지
- 본문에 "위치 X" 텍스트 포함 금지
- 본문에 "정답" 또는 "위치" 관련 텍스트 포함 금지
- 본문에 "[1]", "[2]", "[3]" 등 숫자만 있는 대괄호 포함 금지
- 본문에 "(1)", "(2)", "(3)" 등 숫자만 있는 괄호 포함 금지
- 본문에 "{1}", "{2}", "{3}" 등 숫자만 있는 중괄호 포함 금지
- ⑥ 이상의 원문자 사용 금지
- 원문자 중복 사용 금지 (①, ②, ③, ④, ⑤ 각각 한 번씩만)
- 본문에 한글 텍스트 포함 금지 (영어만)
- 본문에 특수 기호나 숫자 마커 포함 금지
- 원본 본문에 없던 텍스트 추가 금지
- **numberedPassage에는 오직 영어 문장과 원문자만 포함**

**중요**: numberedPassage 필드는 순수하게 영어 문장과 원문자(①~⑤)만 포함해야 하며, 그 외의 모든 설명, 주석, 정답 관련 텍스트, 숫자 마커는 절대 포함하지 마세요.

본문:
${passage}`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
      })
    });
    const data = await response.json();
    const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
    }
    if (!result.missingSentence || !result.numberedPassage || typeof result.answerIndex !== 'number' || !result.translation) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    // 결과 검증
    console.log('AI 원본 결과:', result);
    
    return result;
  }





  // 문제 생성 (포인트 차감 포함)
  const handleGenerateQuiz = async () => {
    console.log('로그인 상태 확인:', { userData, uid: userData?.uid, loading });
    
    // 로딩 중이면 대기
    if (loading) {
      alert('로그인 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    
    // 로그인 상태 확인 (더 안전한 방법)
    if (!userData || !userData.uid) {
      console.error('로그인 상태 오류:', { userData, loading });
      alert('로그인이 필요합니다. 다시 로그인해주세요.');
      return;
    }

    // 포인트 차감 확인
    const workType = workTypePoints.find(wt => wt.id === '6'); // 유형#06
    if (!workType) {
      alert('포인트 설정을 불러올 수 없습니다.');
      return;
    }

    const requiredPoints = workType.points;
    if (userCurrentPoints < requiredPoints) {
      alert(`포인트가 부족합니다. 현재 ${userCurrentPoints.toLocaleString()}P, 필요 ${requiredPoints.toLocaleString()}P`);
      return;
    }

    // 포인트 차감 모달 표시
    setPointsToDeduct(requiredPoints);
    setShowPointModal(true);
  };

  // 포인트 차감 확인 후 실제 문제 생성 실행
  const handlePointDeductionConfirm = () => {
    setShowPointModal(false);
    executeQuizGeneration();
  };

  // 실제 문제 생성 실행
  const executeQuizGeneration = async () => {
    if (!userData?.uid) return;

    let passage = '';
    setIsLoading(true);
    setQuiz(null);
    let deductedPoints = 0;
    
    try {
      // 포인트 차감
      const workType = workTypePoints.find(wt => wt.id === '6');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const deductionResult = await deductUserPoints(
        userData.uid,
        '6',
        workType.name,
        userData.name || '사용자',
        userData.nickname || '사용자'
      );

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
      }

      deductedPoints = deductionResult.deductedPoints;
      setUserCurrentPoints(deductionResult.remainingPoints);

      // 문제 생성 로직 - 로컬 처리 방식으로 변경
      if (inputMode === 'text') {
        if (!inputText.trim()) throw new Error('영어 본문을 입력해주세요.');
        passage = inputText.trim();
      } else if (inputMode === 'image' && imageFile) {
        passage = await imageToTextWithOpenAIVision(imageFile);
      } else if (inputMode === 'capture') {
        // 캡처 이미지에서 추출된 텍스트가 수정되었을 수 있으므로 inputText 사용
        if (!inputText.trim()) throw new Error('영어 본문을 입력해주세요.');
        passage = inputText.trim();
      } else {
        throw new Error('이미지를 첨부해주세요.');
      }
      if (!passage.trim()) throw new Error('추출된 텍스트가 없습니다.');
      
      console.log('원본 본문:', passage);
      
      // 1단계: 원본 본문을 문장 단위로 분할
      const originalSentences = passage
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 0 && s.trim().length > 10);
      
      console.log('원본 문장들:', originalSentences);
      
      if (originalSentences.length < 5) {
        throw new Error('본문에 충분한 문장이 없습니다. 최소 5개의 문장이 필요합니다.');
      }
      
      // 2단계: 주제 문장 선정 및 제거 (AI 기반)
      const { missingSentence, topicSentenceIndex } = await selectAndRemoveTopicSentence(originalSentences);
      
      console.log('선정된 주제 문장:', missingSentence);
      console.log('주제 문장 위치:', topicSentenceIndex);
      
      // 3단계: 주제 문장을 제거한 새로운 본문 생성
      const remainingSentences = originalSentences.filter((_, index) => index !== topicSentenceIndex);
      
      console.log('주제 문장 제거 후 문장들:', remainingSentences);
      console.log('원본 문장 수:', originalSentences.length);
      console.log('제거 후 문장 수:', remainingSentences.length);
      console.log('제거된 문장:', originalSentences[topicSentenceIndex]);
      
      // 4단계: 새로운 본문에 번호 부여 (간단한 로직)
      const { numberedPassage, answerIndex } = assignNumbersSimple(remainingSentences, topicSentenceIndex);
      
      console.log('번호 부여 후 본문:', numberedPassage);
      console.log('정답 위치:', answerIndex);
      
      // 5단계: 번역 생성
      const translation = await generateTranslation(passage);
      
      const quizData = {
        missingSentence: missingSentence.trim(),
        numberedPassage: numberedPassage.trim(),
        answerIndex,
        translation: translation.trim()
      };
      
      console.log('최종 생성된 문제:', quizData);
      
      // 성공적으로 생성됨
      setQuiz(quizData);
      
    } catch (err: any) {
      console.error('문장 위치 문제 생성 오류:', err);
      
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '문장 위치 문제 생성',
            userData.name || '사용자',
            userData.nickname || '사용자',
            '문제 생성 실패로 인한 포인트 환불'
          );
          setUserCurrentPoints(prev => prev + deductedPoints);
        } catch (refundError) {
          console.error('포인트 환불 오류:', refundError);
        }
      }
      
      alert(err.message || '문제 생성 중 오류가 발생했습니다.');
    } finally {
        setIsExtractingText(false);
      }
  };

  // 개선된 주제 문장 선정 함수 (AI 없이)
  function selectTopicSentenceLocally(sentences: string[]): {
    missingSentence: string;
    topicSentenceIndex: number;
  } {
    // 더 정교한 휴리스틱: 여러 기준으로 주제 문장 선정
    
    // 1. 첫 번째 문장이 짧으면 (20자 이하) 두 번째 문장 선택
    if (sentences[0].length <= 20 && sentences.length > 1) {
      const topicSentenceIndex = 1;
      const missingSentence = sentences[topicSentenceIndex];
      
      console.log('짧은 첫 문장으로 인해 두 번째 문장 선택:', missingSentence);
      return { missingSentence, topicSentenceIndex };
    }
    
    // 2. 첫 번째 문장이 "Here are", "This is", "There are" 등으로 시작하면 주제 문장으로 적합
    const firstSentence = sentences[0].toLowerCase();
    if (firstSentence.startsWith('here are') || 
        firstSentence.startsWith('this is') || 
        firstSentence.startsWith('there are') ||
        firstSentence.startsWith('the following') ||
        firstSentence.includes('facts about') ||
        firstSentence.includes('information about')) {
      
      const topicSentenceIndex = 0;
      const missingSentence = sentences[topicSentenceIndex];
      
      console.log('주제 문장 패턴으로 첫 번째 문장 선택:', missingSentence);
      return { missingSentence, topicSentenceIndex };
    }
    
    // 3. 기본값: 첫 번째 문장 선택
    const topicSentenceIndex = 0;
    const missingSentence = sentences[topicSentenceIndex];
    
    console.log('기본값으로 첫 번째 문장 선택:', missingSentence);
    return { missingSentence, topicSentenceIndex };
  }

  // 개선된 번호 부여 함수 - 균등 분산 및 중복 방지
  function assignNumbersSimple(sentences: string[], originalTopicIndex: number): {
    numberedPassage: string;
    answerIndex: number;
  } {
    const circleNumbers = ['①', '②', '③', '④', '⑤'];
    const totalSentences = sentences.length;
    
    console.log('번호 부여 시작:', { totalSentences, originalTopicIndex });
    
    if (totalSentences <= 5) {
      // 5개 이하: 모든 문장에 번호 부여
      let numberedPassage = '';
      for (let i = 0; i < totalSentences; i++) {
        numberedPassage += circleNumbers[i] + ' ' + sentences[i].trim();
        if (i < totalSentences - 1) {
          numberedPassage += ' ';
        }
      }
      const answerIndex = Math.min(originalTopicIndex, totalSentences - 1);
      
      console.log('5개 이하 처리 완료:', { answerIndex });
      return { numberedPassage: numberedPassage.trim(), answerIndex };
    }
    
    // 5개 초과: 균등하게 분산하여 5개 위치 선택
    const selectedIndices = selectDistributedPositions(totalSentences, originalTopicIndex);
    
    console.log('선택된 위치들:', selectedIndices);
    
    // 본문 구성
    let numberedPassage = '';
    let currentNumberIndex = 0;
    
    for (let i = 0; i < totalSentences; i++) {
      if (selectedIndices.includes(i)) {
        // 번호 부여
        numberedPassage += circleNumbers[currentNumberIndex] + ' ' + sentences[i].trim();
        currentNumberIndex++;
      } else {
        // 번호 없이
        numberedPassage += sentences[i].trim();
      }
      
      // 공백 추가
      if (i < totalSentences - 1) {
        numberedPassage += ' ';
      }
    }
    
    // 정답 위치 계산
    const answerIndex = selectedIndices.indexOf(originalTopicIndex);
    
    // 최종 검증
    const usedNumbers = numberedPassage.match(/[①②③④⑤]/g) || [];
    const uniqueNumbers = Array.from(new Set(usedNumbers));
    
    console.log('번호 부여 검증:', {
      usedNumbers,
      uniqueNumbers,
      count: usedNumbers.length,
      answerIndex,
      selectedIndices
    });
    
    if (usedNumbers.length !== 5 || uniqueNumbers.length !== 5) {
      console.error('원문자 중복 또는 개수 오류!', {
        usedNumbers,
        uniqueNumbers,
        count: usedNumbers.length
      });
      throw new Error('원문자 번호 부여에 오류가 발생했습니다.');
    }
    
    return { numberedPassage: numberedPassage.trim(), answerIndex };
  }

  // 균등하게 분산된 위치 선택 함수
  function selectDistributedPositions(totalSentences: number, topicIndex: number): number[] {
    const positions: number[] = [];
    
    // 1단계: 주제 문장 위치를 우선 포함
    positions.push(topicIndex);
    
    // 2단계: 전체 문장을 5등분하여 균등하게 분산
    const step = Math.floor(totalSentences / 5);
    const additionalPositions: number[] = [];
    
    // step 간격으로 위치 선택 (주제 문장 위치 제외)
    for (let i = 0; i < totalSentences; i += step) {
      if (i !== topicIndex && additionalPositions.length < 4) {
        additionalPositions.push(i);
      }
    }
    
    // 3단계: 4개가 안 되면 순차적으로 채우기
    for (let i = 0; i < totalSentences && additionalPositions.length < 4; i++) {
      if (!positions.includes(i) && !additionalPositions.includes(i)) {
        additionalPositions.push(i);
      }
    }
    
    // 4단계: 모든 위치 합치고 정렬
    const allPositions = [...positions, ...additionalPositions];
    const finalPositions = Array.from(new Set(allPositions))
      .sort((a, b) => a - b)
      .slice(0, 5); // 정확히 5개로 제한
    
    console.log('위치 선택 과정:', {
      totalSentences,
      topicIndex,
      step,
      additionalPositions,
      finalPositions
    });
    
    return finalPositions;
  }

  // 주제 문장 선정 및 제거 함수 (기존 AI 방식 - 사용하지 않음)
  async function selectAndRemoveTopicSentence(sentences: string[]): Promise<{
    missingSentence: string;
    topicSentenceIndex: number;
  }> {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const passage = sentences.join(' ');
    
    const prompt = `아래 영어 본문에서 가장 중요한 주제 문장 1개를 찾아서 제거해주세요.

**작업 요구사항:**
1. 본문에서 가장 중요한 주제 문장(핵심 문장) 1개를 찾아주세요.
2. 제거된 주제 문장이 원래 있던 위치(0부터 시작하는 인덱스)를 알려주세요.

**응답 형식:**
{
  "missingSentence": "제거된 주제 문장",
  "topicSentenceIndex": 2
}

**중요:** 
- 제거된 주제 문장은 반드시 원본 본문에 있던 문장이어야 합니다.
- topicSentenceIndex는 제거된 문장이 원래 있던 위치입니다.

본문:
${passage}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    const data = await response.json();
    const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    
    const result = JSON.parse(jsonMatch[0]);
    
    // 검증
    if (!result.missingSentence || typeof result.topicSentenceIndex !== 'number') {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    // 제거된 문장이 원본에 실제로 존재하는지 확인 및 정확한 인덱스 찾기
    const trimmedMissingSentence = result.missingSentence.trim();
    let actualTopicSentenceIndex = -1;
    
    // 정확한 매칭을 위해 모든 문장과 비교
    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].trim() === trimmedMissingSentence) {
        actualTopicSentenceIndex = i;
        break;
      }
    }
    
    // 정확한 매칭이 없는 경우 유사한 문장 찾기
    if (actualTopicSentenceIndex === -1) {
      console.log('정확한 매칭 실패, 유사도 검사 시작...');
      console.log('AI가 반환한 문장:', trimmedMissingSentence);
      console.log('원본 문장들:', sentences);
      
      let bestMatch = { index: -1, similarity: 0 };
      
      for (let i = 0; i < sentences.length; i++) {
        const similarity = calculateStringSimilarity(sentences[i].trim(), trimmedMissingSentence);
        console.log(`문장 ${i} 유사도:`, similarity, sentences[i].trim());
        
        if (similarity > bestMatch.similarity) {
          bestMatch = { index: i, similarity };
        }
      }
      
      console.log('최고 유사도 매치:', bestMatch);
      
      // 50% 이상 일치하는 문장이 있으면 사용 (기존 75%에서 50%로 완화)
      if (bestMatch.similarity > 0.5) {
        actualTopicSentenceIndex = bestMatch.index;
        result.missingSentence = sentences[bestMatch.index].trim(); // 원본 문장으로 교체
        console.log('유사도 매칭 성공:', result.missingSentence);
      }
    }
    
    if (actualTopicSentenceIndex === -1) {
      console.error('모든 매칭 시도 실패');
      console.error('AI 반환 문장:', trimmedMissingSentence);
      console.error('원본 문장들:', sentences);
      throw new Error('제거된 주제 문장이 원본 본문에 존재하지 않습니다.');
    }
    
    // 실제 찾은 인덱스로 교체
    result.topicSentenceIndex = actualTopicSentenceIndex;
    
    return result;
  }

  // 문자열 유사도 계산 함수 (개선된 버전)
  function calculateStringSimilarity(str1: string, str2: string): number {
    // 1. 기본 정규화
    const normalize = (str: string) => str.toLowerCase()
      .replace(/[^\w\s]/g, '') // 특수문자 제거
      .replace(/\s+/g, ' ')    // 연속 공백을 하나로
      .trim();
    
    const norm1 = normalize(str1);
    const norm2 = normalize(str2);
    
    // 2. 정확한 일치 확인
    if (norm1 === norm2) return 1.0;
    
    // 3. 단어 기반 유사도 계산
    const words1 = norm1.split(/\s+/).filter(w => w.length > 0);
    const words2 = norm2.split(/\s+/).filter(w => w.length > 0);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const wordSimilarity = commonWords.length / Math.max(words1.length, words2.length);
    
    // 4. 부분 문자열 매칭 (긴 문장의 경우)
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;
    
    if (longer.includes(shorter) && shorter.length > 20) {
      return Math.max(wordSimilarity, 0.8); // 부분 매칭 보너스
    }
    
    // 5. 문자 기반 유사도 (Levenshtein 거리 기반)
    const charSimilarity = calculateLevenshteinSimilarity(norm1, norm2);
    
    // 6. 최종 유사도는 단어 유사도와 문자 유사도의 평균
    return (wordSimilarity + charSimilarity) / 2;
  }
  
  // Levenshtein 거리 기반 유사도 계산
  function calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }

  // 정확한 번호 부여 함수
  function assignNumbersWithGap(sentences: string[], topicSentenceIndex: number): {
    numberedPassage: string;
    answerIndex: number;
  } {
    const circleNumbers = ['①', '②', '③', '④', '⑤'];
    let numberedPassage = '';
    let answerIndex = -1;

    const totalSentences = sentences.length;

    if (totalSentences < 3) {
      throw new Error('주제 문장을 제거한 후 본문에 충분한 문장이 없습니다. 최소 3개의 문장이 필요합니다.');
    }

    console.log('주제 문장 제거 후 문장 수:', totalSentences);

    // **정확한 로직: 모든 위치에 번호 부여 (주제 문장 위치 포함)**
    
    if (totalSentences <= 5) {
      // 5개 이하: 남은 문장들에 순서대로 번호 부여
      
      // 남은 문장들에 순서대로 번호 부여
      for (let i = 0; i < totalSentences; i++) {
        numberedPassage += circleNumbers[i] + ' ' + sentences[i].trim();
        
        // 공백 추가
        if (i < totalSentences - 1) {
          numberedPassage += ' ';
        }
      }
      
      // 정답은 주제 문장이 들어갈 위치 (topicSentenceIndex + 1번째 위치)
      answerIndex = topicSentenceIndex;
      
    } else {
      // 5개 초과: 간단하고 안전한 로직으로 변경
      
      // 1단계: 주제 문장 위치를 우선 포함
      const selectedIndices: number[] = [topicSentenceIndex];
      
      // 2단계: 나머지 4개 위치를 균등하게 선택
      const step = Math.floor(totalSentences / 5);
      const additionalPositions: number[] = [];
      
      // step 간격으로 위치 선택 (주제 문장 위치 제외)
      for (let i = 0; i < totalSentences && additionalPositions.length < 4; i += step) {
        if (i !== topicSentenceIndex) {
          additionalPositions.push(i);
        }
      }
      
      // 3단계: 4개가 안 되면 순차적으로 채우기
      for (let i = 0; i < totalSentences && additionalPositions.length < 4; i++) {
        if (!selectedIndices.includes(i) && !additionalPositions.includes(i)) {
          additionalPositions.push(i);
        }
      }
      
      // 4단계: 모든 위치 합치고 정렬
      const allPositions = [...selectedIndices, ...additionalPositions];
      const finalIndices = Array.from(new Set(allPositions))
        .sort((a, b) => a - b)
        .slice(0, 5); // 정확히 5개로 제한
      
      console.log('선택된 위치들:', finalIndices);
      console.log('주제 문장 위치:', topicSentenceIndex);
      console.log('전체 문장 수:', totalSentences);
      console.log('추가 위치들:', additionalPositions);
      
      // 5단계: 본문 구성 - 정확한 번호 부여
      let currentNumberIndex = 0;
      
      for (let i = 0; i < totalSentences; i++) {
        if (finalIndices.includes(i)) {
          // 번호 부여 (①, ②, ③, ④, ⑤ 순서대로)
          numberedPassage += circleNumbers[currentNumberIndex] + ' ' + sentences[i].trim();
          currentNumberIndex++;
        } else {
          // 번호 없이
          numberedPassage += sentences[i].trim();
        }
        
        // 공백 추가
        if (i < totalSentences - 1) {
          numberedPassage += ' ';
        }
      }
      
      // 6단계: 정답 위치 계산
      answerIndex = finalIndices.indexOf(topicSentenceIndex);
      
      // 안전장치: 주제 문장 위치가 선택되지 않은 경우
      if (answerIndex === -1) {
        console.error('주제 문장 위치가 선택된 인덱스에 없습니다!', {
          topicSentenceIndex,
          finalIndices,
          totalSentences
        });
        answerIndex = 0; // 기본값
      }
      
      // 7단계: 최종 검증 - 중복 확인
      const usedNumbers = numberedPassage.match(/[①②③④⑤]/g) || [];
      const uniqueNumbers = Array.from(new Set(usedNumbers));
      
      console.log('사용된 원문자들:', usedNumbers);
      console.log('고유한 원문자들:', uniqueNumbers);
      console.log('원문자 개수:', usedNumbers.length);
      
      if (usedNumbers.length !== 5 || uniqueNumbers.length !== 5) {
        console.error('원문자 중복 또는 개수 오류:', {
          usedNumbers,
          uniqueNumbers,
          count: usedNumbers.length,
          finalIndices,
          topicSentenceIndex
        });
        throw new Error('원문자 번호 부여에 오류가 발생했습니다.');
      }
    }
    
    return { numberedPassage: numberedPassage.trim(), answerIndex };
  }







  // 번역 생성 함수
  async function generateTranslation(passage: string): Promise<string> {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const prompt = `아래 영어 본문을 한국어로 번역해주세요.

본문:
${passage}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }



  const handlePrintNoAnswer = () => {
    // 인쇄 전에 브라우저 기본 헤더/푸터 숨기기
    const style = document.createElement('style');
    style.id = 'print-style';
    style.textContent = `
      @page {
        margin: 0;
        size: A4;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
    document.head.appendChild(style);
    
    setPrintMode('no-answer');
    setTimeout(() => {
      window.print();
      // 인쇄 후 스타일 제거
      setTimeout(() => {
        const printStyle = document.getElementById('print-style');
        if (printStyle) {
          printStyle.remove();
        }
        setPrintMode('none');
      }, 1000);
    }, 100);
  };
  
  const handlePrintWithAnswer = () => {
    // 인쇄 전에 브라우저 기본 헤더/푸터 숨기기
    const style = document.createElement('style');
    style.id = 'print-style';
    style.textContent = `
      @page {
        margin: 0;
        size: A4;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
    document.head.appendChild(style);
    
    setPrintMode('with-answer');
    setTimeout(() => {
      window.print();
      // 인쇄 후 스타일 제거
      setTimeout(() => {
        const printStyle = document.getElementById('print-style');
        if (printStyle) {
          printStyle.remove();
        }
        setPrintMode('none');
      }, 1000);
    }, 100);
  };
  const resetQuiz = () => {
    setQuiz(null);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setIsPasteFocused(false);
    setIsLoading(false);
    setIsExtractingText(false);
  };

  // 공통 인쇄(정답) 레이아웃 렌더링 함수
  const renderPrintWithAnswerLayout = () => {
    if (!quiz) return null;

    const commonStyles = {
      instruction: {fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'},
      missingSentenceBox: {border:'2px solid #222', borderRadius:'6px', background:'#f7f8fc', padding:'0.8em 1.2em', marginTop:'1rem', marginBottom:'1rem', fontWeight:700, fontSize:'1rem !important'},
      numberedPassage: {fontSize:'1rem !important', lineHeight:'1.7', margin:'0.3rem 0', background:'#FFF3CD', borderRadius:'8px', padding:'1rem', fontFamily:'inherit', color:'#222', whiteSpace:'pre-line', border:'1.5px solid #e3e6f0'},
      answer: {marginTop:'1.2rem', marginBottom:'1.5rem', color:'#1976d2', fontWeight:700, fontSize:'1rem !important'},
      translation: {marginTop:'0.9rem', fontSize:'0.8rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}
    };

    const renderProblemPage = () => (
      <div className="a4-page-template">
        <div className="a4-page-header">
          <PrintHeaderWork01 />
        </div>
        <div className="a4-page-content">
          <div className="quiz-content">
            <div className="problem-instruction" style={commonStyles.instruction}>
              아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.
            </div>
            <div className="missing-sentence-box" style={commonStyles.missingSentenceBox}>
              <span style={{color:'#222'}}>주요 문장:</span> <span style={{color:'#6a5acd'}}>{quiz.missingSentence}</span>
            </div>
            <div style={commonStyles.numberedPassage}>
              {quiz.numberedPassage}
            </div>
          </div>
        </div>
      </div>
    );

    const renderAnswerPage = () => (
      <div className="a4-page-template">
        <div className="a4-page-header">
          <PrintHeaderWork01 />
        </div>
        <div className="a4-page-content">
          <div className="quiz-content">
            <div className="problem-instruction" style={commonStyles.instruction}>
              정답
            </div>
            <div className="problem-answer" style={commonStyles.answer}>
              정답: {`①②③④⑤`[quiz.answerIndex] || quiz.answerIndex+1}
            </div>
          </div>
        </div>
      </div>
    );

    const renderTranslationPage = () => (
      <div className="a4-page-template">
        <div className="a4-page-header">
          <PrintHeaderWork01 />
        </div>
        <div className="a4-page-content">
          <div className="quiz-content">
            <div className="problem-passage translation" style={commonStyles.translation}>
              {quiz.translation && quiz.translation.trim().length > 0 
                ? quiz.translation 
                : '본문 해석이 생성되지 않았습니다.'}
            </div>
          </div>
        </div>
      </div>
    );

    const renderAnswerWithTranslationPage = () => (
      <div className="a4-page-template">
        <div className="a4-page-header">
          <PrintHeaderWork01 />
        </div>
        <div className="a4-page-content">
          <div className="quiz-content">
            <div className="problem-instruction" style={commonStyles.instruction}>
              정답
            </div>
            <div className="problem-answer" style={commonStyles.answer}>
              정답: {`①②③④⑤`[quiz.answerIndex] || quiz.answerIndex+1}
            </div>
            
            {/* 본문 해석 추가 */}
            <div className="problem-passage translation" style={commonStyles.translation}>
              {quiz.translation && quiz.translation.trim().length > 0 
                ? quiz.translation 
                : '본문 해석이 생성되지 않았습니다.'}
            </div>
          </div>
        </div>
      </div>
    );

    // 인쇄(정답) 페이지 독립적인 레이아웃 결정 로직
    // pageLayoutInfo.canFitTranslationWithAnswer는 인쇄(정답) 페이지의 분할 로직에서 계산됨
    
    // 1페이지 높이 계산 (문제제목 + 주요문장박스 + 번호본문 + 정답)
    const A4_HEIGHT_MM = 297;
    const A4_WIDTH_MM = 210;
    const MARGIN_TOP_MM = 20;
    const MARGIN_BOTTOM_MM = 20;
    const HEADER_HEIGHT_MM = 15;
    const FOOTER_HEIGHT_MM = 10;
    const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM;
    const MM_TO_PX = 3.78;
    const CONTENT_HEIGHT_PX = CONTENT_HEIGHT_MM * MM_TO_PX;
    
    const calculateElementHeight = (text: string, fontSize: number, lineHeight: number, padding: number = 0) => {
      const availableWidth = A4_WIDTH_MM * MM_TO_PX * 0.9;
      const charWidth = fontSize * 0.55;
      const charsPerLine = Math.floor(availableWidth / charWidth);
      const lines = Math.ceil(text.length / charsPerLine);
      return (lines * fontSize * lineHeight) + padding;
    };
    
    const problemTitleHeight = calculateElementHeight('아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.', 16, 1.2, 14);
    const missingSentenceBoxHeight = calculateElementHeight(`주요 문장: ${quiz.missingSentence}`, 16, 1.2, 32);
    const numberedPassageHeight = calculateElementHeight(quiz.numberedPassage, 16, 1.7, 32);
    const answerHeight = calculateElementHeight(`정답: ①②③④⑤[${quiz.answerIndex}]`, 16, 1.2, 20) + 24; // marginBottom 1.5rem (24px) 추가
    const answerPage1Height = problemTitleHeight + missingSentenceBoxHeight + numberedPassageHeight + answerHeight;
    const needsSecondPageForAnswer = answerPage1Height > CONTENT_HEIGHT_PX;
    
    // 해석 컨테이너 높이 계산
    const translationHeight = calculateElementHeight(quiz.translation || '', 16, 1.6, 32);
    const translationContainerHeight = translationHeight; // 제목 제거로 높이 계산 단순화
    
    // 1페이지에 정답+해석이 들어갈 수 있는지 먼저 확인
    if (pageLayoutInfo.canFitAnswerWithTranslation) {
      // 1페이지: 본문+정답+해석 (모든 내용이 1페이지에 들어감)
      return (
        <>
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderWork01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={commonStyles.instruction}>
                  아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.
                </div>
                <div className="missing-sentence-box" style={commonStyles.missingSentenceBox}>
                  <span style={{color:'#222'}}>주요 문장:</span> <span style={{color:'#6a5acd'}}>{quiz.missingSentence}</span>
                </div>
                <div style={commonStyles.numberedPassage}>
                  {quiz.numberedPassage}
                </div>
                <div className="problem-answer" style={commonStyles.answer}>
                  정답: {`①②③④⑤`[quiz.answerIndex] || quiz.answerIndex+1}
                </div>
                
                {/* 본문 해석 추가 */}
                <div className="problem-passage translation" style={commonStyles.translation}>
                  {quiz.translation && quiz.translation.trim().length > 0 
                    ? quiz.translation 
                    : '본문 해석이 생성되지 않았습니다.'}
                </div>
              </div>
            </div>
          </div>
        </>
      );
    } else if (needsSecondPageForAnswer) {
      if (pageLayoutInfo.canFitTranslationWithAnswer) {
        // 2페이지: 본문, 정답+해석
        return (
          <>
            {renderProblemPage()}
            {renderAnswerWithTranslationPage()}
          </>
        );
      } else {
        // 3페이지: 본문, 정답, 해석
        return (
          <>
            {renderProblemPage()}
            {renderAnswerPage()}
            {renderTranslationPage()}
          </>
        );
      }
    } else {
      // 2페이지: 본문+정답, 해석
      return (
        <>
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderWork01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={commonStyles.instruction}>
                  아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.
                </div>
                <div className="missing-sentence-box" style={commonStyles.missingSentenceBox}>
                  <span style={{color:'#222'}}>주요 문장:</span> <span style={{color:'#6a5acd'}}>{quiz.missingSentence}</span>
                </div>
                <div style={commonStyles.numberedPassage}>
                  {quiz.numberedPassage}
                </div>
                <div className="problem-answer" style={commonStyles.answer}>
                  정답: {`①②③④⑤`[quiz.answerIndex] || quiz.answerIndex+1}
                </div>
              </div>
            </div>
          </div>
          {renderTranslationPage()}
        </>
      );
    }
  };

  if (quiz) {
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#06. 주요 문장 위치 찾기 문제</h2>
            <div className="quiz-header-buttons no-print">
              <button onClick={resetQuiz} className="reset-button" style={{
                width: '160px',
                height: '48px',
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}>새 문제 만들기</button>
              <button onClick={handlePrintNoAnswer} className="print-button styled-print" style={{
                width: '160px',
                height: '48px',
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}>
                <span className="print-icon" aria-hidden>🖨️</span>
                <span>인쇄 (문제)</span>
              </button>
              <button onClick={handlePrintWithAnswer} className="print-button styled-print" style={{
                width: '160px',
                height: '48px',
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                boxShadow: '0 4px 6px rgba(240, 147, 251, 0.25)'
              }}>
                <span className="print-icon" aria-hidden>🖨️</span>
                <span>인쇄 (<span style={{color: '#FFD600'}}>정답</span>)</span>
              </button>
            </div>
          </div>
          <div className="sentence-position-section">
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.13rem', background:'#222', color:'#fff', padding:'0.7rem 1.2rem', borderRadius:'8px', marginBottom:'2.0rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#06</span>
            </div>
            <div className="missing-sentence-box" style={{border:'2px solid #222', borderRadius:'6px', background:'#f7f8fc', padding:'0.8em 1.2em', marginBottom:'1.8em', fontWeight:700, fontSize:'1.08rem'}}>
              <span style={{color:'#222'}}>주요 문장:</span> <span style={{color:'#6a5acd'}}>{quiz.missingSentence}</span>
            </div>
            <div className="numbered-passage" style={{fontSize:'1.08rem', lineHeight:1.7, margin:'1.2rem 0', background:'#FFF3CD', borderRadius:'8px', padding:'1.2rem', fontFamily:'inherit', whiteSpace:'pre-line', border:'1.5px solid #e3e6f0'}}>
              {quiz.numberedPassage}
            </div>
          </div>
        </div>
        {printMode === 'no-answer' && (
          <div className="only-print">
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderWork01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#06</span>
                  </div>
                  <div className="missing-sentence-box" style={{border:'2px solid #222', borderRadius:'6px', background:'#f7f8fc', padding:'0.8em 1.2em', marginTop:'1rem', marginBottom:'1rem', fontWeight:700, fontSize:'1rem !important'}}>
                    <span style={{color:'#222'}}>주요 문장:</span> <span style={{color:'#6a5acd'}}>{quiz.missingSentence}</span>
                  </div>
                  <div style={{fontSize:'1rem !important', lineHeight:'1.7', margin:'0.3rem 0', background:'#FFF3CD', borderRadius:'8px', padding:'1rem', fontFamily:'inherit', color:'#222', whiteSpace:'pre-line', border:'1.5px solid #e3e6f0'}}>
                    {quiz.numberedPassage}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {printMode === 'with-answer' && quiz && (
          <div className="only-print print-answer-mode">
            {renderPrintWithAnswerLayout()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>[유형#06] 주요 문장 위치 찾기 문제 생성</h2>
        <p>영어 본문에서 가장 중요한 주제 문장을 찾아 본문에서 제거하고, 본문 문장 사이에 원문자(①~⑤)를 삽입해 위치 찾기 문제를 만듭니다.</p>
      </div>
      <div className="input-type-section">
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'capture'}
            onChange={() => handleInputModeChange('capture')}
          />
          <span>📸 캡처화면 붙여넣기</span>
          <button
            type="button"
            className="screenshot-help-btn"
            onClick={(e) => {
              e.preventDefault();
              setShowHelpModal(true);
            }}
            title="화면 캡처 방법 보기"
          >
            ?
          </button>
        </label>
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'image'}
            onChange={() => handleInputModeChange('image')}
          />
          <span>🖼️ 이미지 파일 첨부</span>
        </label>
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'text'}
            onChange={() => handleInputModeChange('text')}
          />
          <span>✍️ 영어 본문 직접 붙여넣기</span>
        </label>
      </div>
      {inputMode === 'capture' && (
        <div
          className={`input-guide${isPasteFocused ? ' paste-focused' : ''}`}
          tabIndex={0}
          onClick={() => setIsPasteFocused(true)}
          onFocus={() => setIsPasteFocused(true)}
          onBlur={() => setIsPasteFocused(false)}
        >
          <div className="drop-icon">📋</div>
          <div className="drop-text">여기에 이미지를 붙여넣으세요</div>
          <div className="drop-desc">클릭 또는 Tab 후 <b>Ctrl+V</b>로 캡처 이미지를 붙여넣을 수 있습니다.</div>
          {imagePreview && (
            <div className="preview-row">
              <img src={imagePreview} alt="캡처 미리보기" className="preview-img" />
            </div>
          )}
          {(isLoading || isExtractingText) && (
            <div style={{color:'#6a5acd', fontWeight:600, marginTop:'0.7rem'}}>
              OpenAI Vision 처리 중...
            </div>
          )}
        </div>
      )}
      {inputMode === 'image' && (
        <div className="input-guide">
          <div className="file-upload-row">
            <label htmlFor="sentence-position-image" className="file-upload-btn">
              파일 선택
              <input
                id="sentence-position-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </label>
            <span className="file-upload-status">
              {imageFile ? imageFile.name : '선택된 파일 없음'}
            </span>
            {imagePreview && (
              <img src={imagePreview} alt="업로드 미리보기" className="preview-img" />
            )}
            {(isLoading || isExtractingText) && (
              <div className="loading-text">
                OpenAI Vision 처리 중...
              </div>
            )}
          </div>
        </div>
      )}
      <div className="input-section">
        <div className="input-label-row">
          <label htmlFor="sentence-position-text" className="input-label">
            영어 본문 직접 붙여넣기:
          </label>
          {inputText.length < 100 && (
            <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
          )}
        </div>
        <textarea
          id="sentence-position-text"
          ref={textAreaRef}
          value={inputText}
          onChange={handleInputChange}
          placeholder="영어 본문을 직접 붙여넣어 주세요. 최소 100자 이상 권장합니다."
          className="text-input"
          rows={8}
          style={{overflow: 'hidden', resize: 'none'}}
          disabled={inputMode === 'image' && !inputText}
        />
        <div className="text-info">
          <span>글자 수: {inputText.length}자</span>
        </div>
      </div>
      
      
      <button
        onClick={handleGenerateQuiz}
        disabled={isLoading || !inputText.trim()}
        className="generate-button"
      >
        주요 문장 위치 찾기 문제 생성하기
      </button>

      {/* 화면 중앙 모래시계 로딩 스피너 */}
      {(isLoading || isExtractingText) && (
        <div className="centered-hourglass-overlay">
          <div className="centered-hourglass-content">
            <span className="centered-hourglass-spinner">⏳</span>
            <div className="loading-text">
              {isExtractingText ? '📄 텍스트 추출 중...' : '📋 문제 생성 중...'}
            </div>
          </div>
        </div>
      )}
      
      {/* 포인트 차감 확인 모달 */}
      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={handlePointDeductionConfirm}
        workTypeName="주요 문장 위치 찾기 문제 생성"
        pointsToDeduct={pointsToDeduct}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - pointsToDeduct}
      />
      
      {/* 화면 캡처 도움말 모달 */}
      <ScreenshotHelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)} 
      />
    </div>
  );
};

export default Work_06_SentencePosition; 