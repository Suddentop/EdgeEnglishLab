import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import './Work_07_MainIdeaInference.css';
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

interface MainIdeaQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation: string;
  optionTranslations: string[]; // 모든 선택지의 해석
}

const Work_07_MainIdeaInference: React.FC = () => {
  const { userData, loading } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<MainIdeaQuiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const [needsSecondPage, setNeedsSecondPage] = useState(false);
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
        
        // 유형#07의 포인트 설정
        const workType7Points = points.find(wt => wt.id === '7')?.points || 0;
        setPointsToDeduct(workType7Points);
        
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

  // 본문 길이에 따른 페이지 분할 결정
  useEffect(() => {
    setNeedsSecondPage(inputText.length >= 2000);
  }, [inputText]);

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

  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setQuiz(null);
    setSelected(null);
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
    const prompt = `영어문제로 사용되는 본문이야.
이 이미지의 내용을 수작업으로 정확히 읽고, 영어 본문만 추려내서 보여줘.
글자는 인쇄글씨체 이외에 손글씨나 원, 밑줄 등 표시되어있는 것은 무시해. 
본문중에 원문자 1, 2, 3... 등으로 표시된건 제거해줘. 
원문자 제거후 줄을 바꾸거나 문단을 바꾸지말고, 전체가 한 문단으로 구성해줘. 
영어 본문만, 아무런 설명이나 안내문 없이, 한 문단으로만 출력해줘.`;
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
    return data.choices[0].message.content.trim();
  }

  async function generateMainIdeaQuizWithAI(passage: string): Promise<MainIdeaQuiz> {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const prompt = `아래 영어 본문을 읽고, 글의 주제를 가장 잘 요약하는 문장/구 1개를 선정해.

단계별 작업:
1단계: 본문을 읽고 주제를 파악
2단계: 주제를 요약하는 정답 문장 1개 생성
3단계: 정답과 유사하지만 다른 의미의 오답 4개 생성
4단계: 5개 선택지를 배열에 배치 (정답 위치는 랜덤)
5단계: 본문 전체를 한글로 번역
6단계: 정답 선택지만 정확히 한글로 번역
7단계: 모든 선택지(1~5번)를 각각 한글로 번역

아래 JSON 형식으로 응답:
{
  "passage": "원본 영어 본문",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answerIndex": 0,
  "translation": "본문 전체의 한글 해석",
  "answerTranslation": "정답 선택지의 정확한 한글 해석",
  "optionTranslations": ["선택지1 해석", "선택지2 해석", "선택지3 해석", "선택지4 해석", "선택지5 해석"]
}

본문:
${passage}

중요 규칙:
- answerIndex는 0~4 사이의 숫자 (배열 인덱스)
- answerTranslation은 반드시 options[answerIndex]의 정확한 번역
- optionTranslations는 모든 선택지의 해석 배열 (options와 동일한 순서)
- 예시: answerIndex=1, options[1]="The future is uncertain but promising." → answerTranslation="미래는 불확실하지만 희망적입니다."
- optionTranslations[1]도 "미래는 불확실하지만 희망적입니다."가 되어야 함
- 모든 해석이 정확히 일치해야 함`;
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
        temperature: 0.3 // 더 낮은 temperature로 일관성 향상
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
    if (!result.passage || !result.options || typeof result.answerIndex !== 'number' || !result.translation || !result.answerTranslation || !result.optionTranslations) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    // 정답 해석 검증 로직 추가
    if (result.answerIndex < 0 || result.answerIndex >= result.options.length) {
      throw new Error('정답 인덱스가 유효하지 않습니다.');
    }
    
    // optionTranslations 배열 검증
    if (!Array.isArray(result.optionTranslations) || result.optionTranslations.length !== result.options.length) {
      throw new Error('optionTranslations 배열이 올바르지 않습니다.');
    }
    
    // 더 강력한 검증 로직
    const correctAnswer = result.options[result.answerIndex];
    const answerTranslation = result.answerTranslation;
    
    // 키워드 기반 검증 강화
    const needsRetry = checkAnswerTranslationMismatch(correctAnswer, answerTranslation);
    if (needsRetry) {
      console.warn('정답 해석이 정답과 일치하지 않습니다. 재시도합니다.');
      return await generateMainIdeaQuizWithAIRetry(passage, 1);
    }
    
    return result;
  }

  // 정답 해석 불일치 검증 함수
  function checkAnswerTranslationMismatch(correctAnswer: string, answerTranslation: string): boolean {
    const answer = correctAnswer.toLowerCase();
    const translation = answerTranslation.toLowerCase();
    
    // 주요 키워드 매칭 검증
    const keywordMappings = [
      { english: 'future', korean: ['미래', '앞으로', '앞날', '장래'] },
      { english: 'uncertain', korean: ['불확실', '애매', '모호'] },
      { english: 'promising', korean: ['희망적', '유망', '기대'] },
      { english: 'believe', korean: ['믿', '신뢰'] },
      { english: 'ability', korean: ['능력', '재능'] },
      { english: 'change', korean: ['변화', '바뀜'] },
      { english: 'justice', korean: ['정의', '공정'] },
      { english: 'equality', korean: ['평등', '동등'] },
      { english: 'resilience', korean: ['회복력', '탄력'] },
      { english: 'hope', korean: ['희망', '소망'] },
      { english: 'overcome', korean: ['극복', '이겨내'] },
      { english: 'challenge', korean: ['도전', '난제'] }
    ];
    
    // 정답에 포함된 키워드가 해석에도 포함되는지 확인
    for (const mapping of keywordMappings) {
      if (answer.includes(mapping.english)) {
        const hasKoreanKeyword = mapping.korean.some(kw => translation.includes(kw));
        if (!hasKoreanKeyword) {
          console.log(`키워드 불일치: "${mapping.english}" → 해석에 "${mapping.korean.join(', ')}" 없음`);
          return true;
        }
      }
    }
    
    // 특별한 경우: "future"가 정답에 있으면 해석에 "미래" 관련 단어가 반드시 있어야 함
    if (answer.includes('future') && !translation.includes('미래') && !translation.includes('앞으로') && !translation.includes('앞날')) {
      return true;
    }
    
    // "believe"가 정답에 있으면 해석에 "믿" 관련 단어가 있어야 함
    if (answer.includes('believe') && !translation.includes('믿')) {
      return true;
    }
    
    return false;
  }

  // 재시도 함수
  async function generateMainIdeaQuizWithAIRetry(passage: string, retryCount: number): Promise<MainIdeaQuiz> {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const prompt = `아래 영어 본문을 읽고, 글의 주제를 가장 잘 요약하는 문장/구 1개를 선정해.

단계별 작업:
1단계: 본문을 읽고 주제를 파악
2단계: 주제를 요약하는 정답 문장 1개 생성
3단계: 정답과 유사하지만 다른 의미의 오답 4개 생성
4단계: 5개 선택지를 배열에 배치 (정답 위치는 랜덤)
5단계: 본문 전체를 한글로 번역
6단계: 정답 선택지만 정확히 한글로 번역
7단계: 모든 선택지(1~5번)를 각각 한글로 번역

아래 JSON 형식으로 응답:
{
  "passage": "원본 영어 본문",
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answerIndex": 0,
  "translation": "본문 전체의 한글 해석",
  "answerTranslation": "정답 선택지의 정확한 한글 해석",
  "optionTranslations": ["선택지1 해석", "선택지2 해석", "선택지3 해석", "선택지4 해석", "선택지5 해석"]
}

본문:
${passage}

중요 규칙:
- answerIndex는 0~4 사이의 숫자 (배열 인덱스)
- answerTranslation은 반드시 options[answerIndex]의 정확한 번역
- optionTranslations는 모든 선택지의 해석 배열 (options와 동일한 순서)
- 예시: answerIndex=1, options[1]="The future is uncertain but promising." → answerTranslation="미래는 불확실하지만 희망적입니다."
- optionTranslations[1]도 "미래는 불확실하지만 희망적입니다."가 되어야 함
- 모든 해석이 정확히 일치해야 함
- 재시도 ${retryCount}번째입니다. 이전에 정답과 해석이 일치하지 않았습니다. 매우 주의하세요.`;
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
        temperature: 0.1 // 재시도 시 매우 낮은 temperature로 일관성 극대화
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
    if (!result.passage || !result.options || typeof result.answerIndex !== 'number' || !result.translation || !result.answerTranslation || !result.optionTranslations) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    // 정답 해석 검증 로직 추가
    if (result.answerIndex < 0 || result.answerIndex >= result.options.length) {
      throw new Error('정답 인덱스가 유효하지 않습니다.');
    }
    
    // optionTranslations 배열 검증
    if (!Array.isArray(result.optionTranslations) || result.optionTranslations.length !== result.options.length) {
      throw new Error('optionTranslations 배열이 올바르지 않습니다.');
    }
    
    // 재시도에서도 검증
    const correctAnswer = result.options[result.answerIndex];
    const answerTranslation = result.answerTranslation;
    const needsRetry = checkAnswerTranslationMismatch(correctAnswer, answerTranslation);
    if (needsRetry && retryCount < 2) {
      console.warn(`재시도 ${retryCount + 1}번째: 정답 해석이 여전히 일치하지 않습니다.`);
      return await generateMainIdeaQuizWithAIRetry(passage, retryCount + 1);
    }
    
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
    const workType = workTypePoints.find(wt => wt.id === '7'); // 유형#07
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
    setSelected(null);
    let deductedPoints = 0;
    
    try {
      // 포인트 차감
      const workType = workTypePoints.find(wt => wt.id === '7');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const deductionResult = await deductUserPoints(
        userData.uid,
        '7',
        workType.name,
        userData.name || '사용자',
        userData.nickname || '사용자'
      );

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
      }

      deductedPoints = deductionResult.deductedPoints;
      setUserCurrentPoints(deductionResult.remainingPoints);

      // 문제 생성 로직
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
      
      const quizData = await generateMainIdeaQuizWithAI(passage);
      setQuiz(quizData);
      
    } catch (err: any) {
      console.error('주제 추론 문제 생성 오류:', err);
      
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '주제 추론 문제 생성',
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
    setSelected(null);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setIsPasteFocused(false);
    setIsLoading(false);
    setIsExtractingText(false);
  };

  if (quiz) {
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#07. 주제 추론 문제</h2>
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
          <div className="main-idea-section">
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.13rem', background:'#222', color:'#fff', padding:'0.7rem 1.2rem', borderRadius:'8px', marginBottom:'0.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>다음 글의 주제로 가장 적절한 것을 고르시오.</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
            </div>
            <div className="problem-passage" style={{fontSize:'1.08rem', lineHeight:1.7, margin:'1.2rem 0', background:'#f7f8fc', borderRadius:'8px', padding:'1.2rem', fontFamily:'inherit'}}>
              {quiz.passage}
            </div>
            <div className="problem-options" style={{margin:'1.2rem 0'}}>
              {quiz.options.map((opt, i) => (
                <label key={i} style={{display:'block', fontSize:'1.08rem', margin:'0.4rem 0', cursor:'pointer', fontWeight: selected === i ? 700 : 400, color: selected === i ? '#6a5acd' : '#222', fontFamily:'inherit'}}>
                  <input
                    type="radio"
                    name="main-idea-quiz"
                    checked={selected === i}
                    onChange={() => setSelected(i)}
                    style={{marginRight:'0.7rem'}}
                  />
                  {`①②③④⑤`[i] || `${i+1}.`} {opt}
                  {selected !== null && quiz.answerIndex === i && (
                    <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}>(정답)</span>
                  )}
                </label>
              ))}
            </div>
            {selected !== null && (
              <div className="problem-answer no-print" style={{marginTop:'1.2rem', color:'#1976d2', fontWeight:700}}>
                정답: {`①②③④⑤`[quiz.answerIndex] || quiz.answerIndex+1} {quiz.options[quiz.answerIndex]}
                <div style={{marginTop:'0.4em', color:'#388e3c', fontWeight:600}}>
                  정답 해석: {quiz.answerTranslation}
                </div>
              </div>
            )}
          </div>
        </div>
        {printMode === 'no-answer' && (
          <div className="only-print">
            {needsSecondPage ? (
              // 2페이지 구성: 본문, 4지선다 (본문 2000자 이상)
              <>
                {/* 1페이지: 문제제목 + 본문 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                        <span>다음 글의 주제로 가장 적절한 것을 고르시오.</span>
                        <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
                      </div>
                      <div style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        {quiz.passage}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2페이지: 4지선다 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                        다음 중에서 가장 적절한 것을 고르시오.
                      </div>
                      <div className="problem-options" style={{margin:'1rem 0'}}>
                        {quiz.options.map((opt, i) => (
                          <div key={i} style={{fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'}}>
                            {`①②③④⑤`[i] || `${i+1}.`} {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // 1페이지 구성: 문제제목 + 본문 + 4지선다 (본문 2000자 미만)
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                      다음 글의 주제로 가장 적절한 것을 고르시오.
                    </div>
                    <div style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                      {quiz.passage}
                    </div>
                    <div className="problem-options" style={{margin:'1rem 0'}}>
                      {quiz.options.map((opt, i) => (
                        <div key={i} style={{fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'}}>
                          {`①②③④⑤`[i] || `${i+1}.`} {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {printMode === 'with-answer' && quiz && (
          <div className="only-print print-answer-mode">
            {needsSecondPage ? (
              // 3페이지 구성: 본문, 4지선다+정답, 본문해석 (본문 2000자 이상)
              <>
                {/* 1페이지: 문제제목 + 본문 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                        <span>다음 글의 주제로 가장 적절한 것을 고르시오.</span>
                        <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
                      </div>
                      <div style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        {quiz.passage}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2페이지: 4지선다 + 정답 + 문제 해석 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                        다음 중에서 가장 적절한 것을 고르시오.
                      </div>
                      <div className="problem-options" style={{margin:'1rem 0'}}>
                        {quiz.options.map((opt, i) => (
                          <div key={i} style={{fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'}}>
                            <div>
                              {`①②③④⑤`[i] || `${i+1}.`} {opt}
                              {quiz.answerIndex === i && (
                                <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}>(정답)</span>
                              )}
                            </div>
                            <div style={{fontSize:'0.9rem', marginTop:'0.2rem', color:'#333', fontWeight:500}}>
                              {quiz.optionTranslations && quiz.optionTranslations[i] ? quiz.optionTranslations[i] : '해석 없음'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3페이지: 본문 해석 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                        본문 해석
                      </div>
                      <div className="problem-passage translation" style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        {quiz.translation || '본문 해석이 생성되지 않았습니다.'}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // 2페이지 구성: 본문+4지선다+정답, 본문해석 (본문 2000자 미만)
              <>
                {/* 1페이지: 문제제목 + 본문 + 4지선다 + 정답 + 문제 해석 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                        <span>다음 글의 주제로 가장 적절한 것을 고르시오.</span>
                        <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
                      </div>
                      <div style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        {quiz.passage}
                      </div>
                      <div className="problem-options" style={{margin:'1rem 0'}}>
                        {quiz.options.map((opt, i) => (
                          <div key={i} style={{fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'}}>
                            <div>
                              {`①②③④⑤`[i] || `${i+1}.`} {opt}
                              {quiz.answerIndex === i && (
                                <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}>(정답)</span>
                              )}
                            </div>
                            <div style={{fontSize:'0.9rem', marginTop:'0.2rem', color:'#333', fontWeight:500}}>
                              {quiz.optionTranslations && quiz.optionTranslations[i] ? quiz.optionTranslations[i] : '해석 없음'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2페이지: 본문 해석 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                        본문 해석
                      </div>
                      <div className="problem-passage translation" style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        {quiz.translation || '본문 해석이 생성되지 않았습니다.'}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>[유형#07] 주제 추론 문제 생성</h2>
        <p>영어 본문의 주제를 AI가 추론해 5지선다 객관식 문제로 출제합니다.</p>
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
            <label htmlFor="main-idea-image" className="file-upload-btn">
              파일 선택
              <input
                id="main-idea-image"
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
          <label htmlFor="main-idea-text" className="input-label">
            영어 본문 직접 붙여넣기: (2,000자 미만 권장)
          </label>
          {inputText.length < 100 && (
            <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
          )}
        </div>
        <textarea
          id="main-idea-text"
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
        주제 추론 문제 생성하기
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
        workTypeName="주제 추론 문제 생성"
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

export default Work_07_MainIdeaInference; 