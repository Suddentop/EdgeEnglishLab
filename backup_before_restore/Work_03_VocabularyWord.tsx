import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import './Work_03_VocabularyWord.css';
import '../../../styles/PrintFormat.css';
import './Work_03_PrintFormat.css'; // 유형#03 전용 PrintFormat.css - 마지막에 로드
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { useAuth } from '../../../contexts/AuthContext';

interface VocabularyItem {
  word: string;
  definition: string;
  sentence: string;
  options?: string[];
  type: 'fill-blank' | 'multiple-choice' | 'definition';
}

interface Work_03_VocabularyWordData {
  title: string;
  items: VocabularyItem[];
}

// 입력 방식 타입
const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];

type PrintMode = 'none' | 'no-answer' | 'with-answer';

interface BlankQuiz {
  blankedText: string;
  options: string[];
  answerIndex: number;
  translation: string;
}

const Work_03_VocabularyWord: React.FC = () => {
  const { userData, loading } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<BlankQuiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const [needsSecondPage, setNeedsSecondPage] = useState(false);
  const [pageLayout, setPageLayout] = useState<{
    type: 'single' | 'double' | 'triple';
    pages: Array<{
      components: ('A' | 'B' | 'C')[];
      totalHeight: number;
    }>;
  }>({ type: 'single', pages: [] });
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
        
        // 유형#03의 포인트 설정
        const workType3Points = points.find(wt => wt.id === '3')?.points || 0;
        setPointsToDeduct(workType3Points);
        
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

  // 컨테이너 높이 계산 함수 (더 정확한 계산)
  const calculateContainerHeight = (component: 'A' | 'B' | 'C', quiz: BlankQuiz, inputText: string): number => {
    const instructionHeight = 50; // 문제 설명 높이 (검은색 배경)
    const marginHeight = 20; // 각 섹션 간 여백
    const paddingHeight = 20; // 컨테이너 내부 패딩
    
    switch (component) {
      case 'A': {
        // 문제 제목 + 영어 본문
        const titleHeight = 50; // "다음 빈칸에 들어갈 단어로..." 제목
        const textHeight = Math.max(40, (inputText.length / 60) * 15); // 글자 수에 따른 높이 (더 정확하게)
        return instructionHeight + titleHeight + textHeight + paddingHeight + marginHeight;
      }
      case 'B': {
        // 4지선다 선택항목 (제목 제거됨)
        const optionsHeight = quiz.options.length * 25 + 10; // 선택지 개수 * 25px + 여백 (더 정확하게)
        return optionsHeight + marginHeight;
      }
      case 'C': {
        // 본문해석 제목 + 한글 해석
        const translationTitleHeight = 50; // "본문 해석" 제목
        const translationHeight = Math.max(40, (quiz.translation?.length || 0) / 40) * 15; // 번역 길이에 따른 높이 (더 정확하게)
        return instructionHeight + translationTitleHeight + translationHeight + paddingHeight + marginHeight;
      }
      default:
        return 0;
    }
  };

  // 페이지 분할 로직
  const calculatePageLayout = (quiz: BlankQuiz, inputText: string) => {
    // A4 템플릿 정확한 이용가능 공간 계산
    // A4 전체 높이: 29.7cm = 1123px (96 DPI 기준)
    // A4 페이지 헤더: 1.5cm = 57px
    // A4 페이지 콘텐츠 패딩: 하단 1cm = 38px
    // 이용가능 공간 = 1123px - 57px - 38px = 1028px
    const AVAILABLE_HEIGHT = 1028; // A4 이용가능 공간 (정확한 계산값)
    
    const heightA = calculateContainerHeight('A', quiz, inputText);
    const heightB = calculateContainerHeight('B', quiz, inputText);
    const heightC = calculateContainerHeight('C', quiz, inputText);
    
    console.log('컨테이너 높이:', { A: heightA, B: heightB, C: heightC });
    console.log('높이 합계:', heightA + heightB + heightC, 'vs 이용가능 공간:', AVAILABLE_HEIGHT);
    console.log('A+B 높이:', heightA + heightB, 'vs 이용가능 공간:', AVAILABLE_HEIGHT);
    
    // A + B + C ≤ 1028 → 1페이지에 A,B,C 모두 포함 (부동소수점 오차 고려)
    if (heightA + heightB + heightC <= AVAILABLE_HEIGHT + 0.1) {
      return {
        type: 'single' as const,
        pages: [{
          components: ['A', 'B', 'C'] as ('A' | 'B' | 'C')[],
          totalHeight: heightA + heightB + heightC
        }]
      };
    }
    
    // A + B + C > 1028, A + B ≤ 1028 → 1페이지 A+B, 2페이지에 C (부동소수점 오차 고려)
    if (heightA + heightB <= AVAILABLE_HEIGHT + 0.1) {
      return {
        type: 'double' as const,
        pages: [
          {
            components: ['A', 'B'] as ('A' | 'B' | 'C')[],
            totalHeight: heightA + heightB
          },
          {
            components: ['C'] as ('A' | 'B' | 'C')[],
            totalHeight: heightC
          }
        ]
      };
    }
    
    // A + B + C > 1028, A + B > 1028, A ≤ 1028 → 1페이지 A, 2페이지에 B+C (부동소수점 오차 고려)
    if (heightA <= AVAILABLE_HEIGHT + 0.1) {
      return {
        type: 'double' as const,
        pages: [
          {
            components: ['A'] as ('A' | 'B' | 'C')[],
            totalHeight: heightA
          },
          {
            components: ['B', 'C'] as ('A' | 'B' | 'C')[],
            totalHeight: heightB + heightC
          }
        ]
      };
    }
    
    // A + B + C > 1028, A + B > 1028, A > 1028 → 1페이지 A, 2페이지 B, 3페이지 C (부동소수점 오차 고려)
    return {
      type: 'triple' as const,
      pages: [
        {
          components: ['A'] as ('A' | 'B' | 'C')[],
          totalHeight: heightA
        },
        {
          components: ['B'] as ('A' | 'B' | 'C')[],
          totalHeight: heightB
        },
        {
          components: ['C'] as ('A' | 'B' | 'C')[],
          totalHeight: heightC
        }
      ]
    };
  };

  // 문제 생성 후 스크롤 최상단 및 페이지 분리 체크
  useEffect(() => {
    if (quiz) {
      window.scrollTo(0, 0);
      
      // 동적 페이지 레이아웃 계산
      const layout = calculatePageLayout(quiz, inputText);
      setPageLayout(layout);
      
      // 기존 로직과의 호환성을 위해 needsSecondPage도 설정
      setNeedsSecondPage(layout.type !== 'single');
      
      console.log('계산된 페이지 레이아웃:', layout);
    }
  }, [quiz, inputText]);

  // 입력 방식 변경
  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setQuiz(null);
    setSelected(null);
  };

  // 이미지 파일 업로드
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

  // 붙여넣기(클립보드) 이미지 처리
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

  // 본문 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  };

  // 이미지 → 텍스트 (OpenAI Vision API)
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

  // 본문에서 이미 ()로 묶인 단어나 구 추출
  const excludedWords: string[] = [];
  const bracketRegex = /\(([^)]+)\)/g;
  let match;
  while ((match = bracketRegex.exec(inputText)) !== null) {
    excludedWords.push(match[1].trim());
  }

  // OpenAI API를 사용하여 영어를 한글로 번역 (유형#01과 동일한 방식)
  async function translateToKorean(englishText: string, apiKey: string): Promise<string> {
    try {
      console.log('🌐 번역 시작:', englishText.substring(0, 50) + '...');
      
      if (!apiKey) {
        throw new Error('API 키가 설정되지 않았습니다.');
      }

      const prompt = `다음 영어 본문을 자연스러운 한국어로 번역하세요.

번역 요구사항:
- 자연스럽고 매끄러운 한국어
- 원문의 의미를 정확히 전달
- 문학적이고 읽기 쉬운 문체

번역만 반환하세요 (다른 텍스트 없이):

${englishText}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that provides natural Korean translations.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API 오류:', response.status, errorText);
        throw new Error(`API 호출 실패: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ 번역 완료');
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('API 응답 형식 오류');
      }
      
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('❌ 번역 오류:', error);
      throw error;
    }
  }

  // 본문 → 빈칸 문제/객관식 생성 (AI) - 번역은 별도 함수로 처리
  async function generateBlankQuizWithAI(passage: string): Promise<BlankQuiz> {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const prompt = `아래 영어 본문에서 글의 주제와 가장 밀접한, 의미 있는 단어(명사, 키워드 등) 1개를 선정해.

1. 반드시 본문에 실제로 등장한 단어(철자, 형태, 대소문자까지 동일)를 정답으로 선정해야 해. 변형, 대체, 동의어, 어형 변화 없이 본문에 있던 그대로 사용해야 해.

2. 문제의 본문(빈칸 포함)은 반드시 사용자가 입력한 전체 본문과 완전히 동일해야 하며, 일부 문장만 추출하거나, 문장 순서를 바꾸거나, 본문을 요약/변형해서는 안 돼. 오직 정답 단어만 ()로 치환해.

3. 입력된 본문에 이미 ()로 묶인 단어나 구가 있다면, 그 부분은 절대 빈칸 처리 대상으로 삼지 마세요. 반드시 괄호 밖에 있는 단어만 빈칸 후보로 선정하세요.

4. 아래 단어/구는 절대 빈칸 처리하지 마세요: ${excludedWords.length > 0 ? excludedWords.join(', ') : '없음'}

5. 정답(핵심단어) + 오답(비슷한 품사의 단어 4개, 의미는 다름) 총 5개를 생성해.

6. 정답의 위치는 1~5번 중 랜덤.

7. JSON 형식으로 응답하세요:

{
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answerIndex": 0
}

입력된 영어 본문:
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
        max_tokens: 1200,
        temperature: 0.7
      })
    });
    const data = await response.json();
    console.log('AI 응답 전체:', data);
    console.log('AI 응답 내용:', data.choices[0].message.content);
    
    const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    
    console.log('추출된 JSON:', jsonMatch[0]);
    
    let result: any;
    try {
      result = JSON.parse(jsonMatch[0]);
      console.log('파싱된 결과:', result);
    } catch {
      throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
    }
    // 정답 단어가 본문에 실제로 존재하는지 검증
    if (!passage.includes(result.options[result.answerIndex])) {
      throw new Error('정답 단어가 본문에 존재하지 않습니다. AI 응답 오류입니다.');
    }
    // blankedText를 프론트엔드에서 직접 생성 (괄호 split 방식, 괄호 안/밖 완벽 구분, 디버깅 로그 포함)
    function replaceFirstOutsideBrackets(text: string, word: string): string {
      let replaced = false;
      // 괄호로 split (괄호 안/밖 구분)
      const tokens = text.split(/([()])/);
      let inBracket = false;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') {
          inBracket = true;
          continue;
        }
        if (tokens[i] === ')') {
          inBracket = false;
          continue;
        }
        if (!inBracket && !replaced) {
          // 괄호 밖에서만 단어 치환 (단어 경계 체크)
          const regex = new RegExp(`\\b${word}\\b`);
          if (regex.test(tokens[i])) {
            tokens[i] = tokens[i].replace(regex, '(__________)');
            replaced = true;
          }
        }
      }
      // split으로 괄호가 사라지므로, 다시 조립
      let result = '';
      inBracket = false;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') {
          inBracket = true;
          result += '(';
          continue;
        }
        if (tokens[i] === ')') {
          inBracket = false;
          result += ')';
          continue;
        }
        result += tokens[i];
      }
      return result;
    }
    const answer = result.options[result.answerIndex];
    const blankedText = replaceFirstOutsideBrackets(passage, answer);
    result.blankedText = blankedText;
    
    // 빈칸 본문이 원본 본문과 일치하는지 검증
    const blankRestore = result.blankedText.replace(/\( *_{6,}\)/, answer);
    if (blankRestore.trim() !== passage.trim()) {
      throw new Error('빈칸 본문이 원본 본문과 일치하지 않습니다. AI 응답 오류입니다.');
    }
    
    // 번역은 별도 함수로 처리
    console.log('번역 시작...');
    const translation = await translateToKorean(passage, apiKey);
    result.translation = translation;
    
    console.log('최종 검증 전 결과:', {
      blankedText: result.blankedText,
      options: result.options,
      answerIndex: result.answerIndex,
      translation: result.translation
    });
    
    if (!result.blankedText || !result.options || typeof result.answerIndex !== 'number' || !result.translation) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    console.log('AI 응답 검증 완료, 반환할 결과:', result);
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
    const workType = workTypePoints.find(wt => wt.id === '3'); // 유형#03
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
      const workType = workTypePoints.find(wt => wt.id === '3');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const deductionResult = await deductUserPoints(
        userData.uid,
        '3',
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
      
      const quizData = await generateBlankQuizWithAI(passage);
      console.log('생성된 퀴즈 데이터:', quizData);
      console.log('quizData.translation:', quizData.translation);
      setQuiz(quizData);
      
    } catch (err: any) {
      console.error('어휘 문제 생성 오류:', err);
      
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '어휘 문제 생성',
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
      setIsLoading(false);
    }
  };

  // 인쇄 핸들러 - 브라우저 기본 헤더/푸터 숨기기
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
  // 컴포넌트 렌더링 함수들
  const renderComponentA = (displayBlankedText: string) => (
    <>
      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', border:'3px solid #ff0000'}}>
        <span>다음 빈칸에 들어갈 단어로 가장 적절한 것을 고르시오.</span>
        <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#03</span>
      </div>
      <div style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7', border:'3px solid #00ff00'}}>
        {displayBlankedText}
      </div>
    </>
  );

  const renderComponentB = (quiz: BlankQuiz) => (
    <>
      <div className="problem-options" style={{margin:'1rem 0', border:'3px solid #0000ff'}}>
        {quiz.options.map((opt, i) => (
          <div key={i} style={{fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'}}>
            {`①②③④⑤`[i] || `${i+1}.`} {opt}
            {quiz.answerIndex === i && (
              <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}>(정답)</span>
            )}
          </div>
        ))}
      </div>
    </>
  );

  const renderComponentC = (quiz: BlankQuiz) => (
    <>
      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%', border:'3px solid #ff00ff'}}>
        본문 해석
      </div>
      <div className="problem-passage translation work-03-translation-container" style={{marginTop:'0.9rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7', border:'3px solid #ffff00', fontSize:'1.5rem', padding:'1.5rem 1.5rem'}}>
        {quiz.translation ? (
          <div style={{fontFamily:'inherit', color:'#222', fontSize:'1.5rem'}}>
            {(() => {
              const answerWord = quiz.options[quiz.answerIndex];
              const translation = quiz.translation;
              
              // 정답 단어와 관련된 한국어 표현들을 찾아서 밑줄 처리
              const answerRelatedPatterns = [
                // 정답 단어가 직접 포함된 경우
                answerWord,
                answerWord.toLowerCase(),
                // 한국어로 번역된 정답 단어의 의미와 관련된 표현들
                ...(answerWord.toLowerCase().includes('believe') ? ['믿', '믿음', '신뢰'] : []),
                ...(answerWord.toLowerCase().includes('change') ? ['변화', '바꾸', '달라'] : []),
                ...(answerWord.toLowerCase().includes('important') ? ['중요', '필요', '필수'] : []),
                ...(answerWord.toLowerCase().includes('significant') ? ['중요', '의미', '상당'] : []),
                ...(answerWord.toLowerCase().includes('success') ? ['성공', '성취', '달성'] : []),
                ...(answerWord.toLowerCase().includes('future') ? ['미래', '앞으로', '앞날'] : []),
                ...(answerWord.toLowerCase().includes('hope') ? ['희망', '바라', '기대'] : []),
                ...(answerWord.toLowerCase().includes('dream') ? ['꿈', '꿈꾸', '바라'] : []),
                ...(answerWord.toLowerCase().includes('goal') ? ['목표', '목적', '달성'] : []),
                ...(answerWord.toLowerCase().includes('challenge') ? ['도전', '어려움', '과제'] : []),
                ...(answerWord.toLowerCase().includes('opportunity') ? ['기회', '가능성', '찬스'] : []),
                ...(answerWord.toLowerCase().includes('experience') ? ['경험', '체험', '경험'] : []),
                ...(answerWord.toLowerCase().includes('knowledge') ? ['지식', '앎', '학습'] : []),
                ...(answerWord.toLowerCase().includes('wisdom') ? ['지혜', '슬기', '현명'] : [])
              ];
              
              // 한국어 단어 단위로 분리 (공백, 쉼표, 마침표 등으로 구분)
              const words = translation.split(/([,\s.?!;:])/);
              
              return words.map((word, index) => {
                const isAnswerRelated = answerRelatedPatterns.some(pattern => 
                  word.includes(pattern)
                );
                
                                return (
                                  <span key={index} style={{fontFamily:'inherit'}}>
                                    {isAnswerRelated ? (
                                      <span style={{
                                        textDecoration: 'underline',
                                        textDecorationColor: '#1976d2',
                                        textDecorationThickness: '2px',
                                        fontWeight: 'bold',
                                        color: '#1976d2',
                                        fontFamily:'inherit'
                                      }}>
                                        {word}
                                      </span>
                                    ) : (
                                      <span style={{fontFamily:'inherit', color:'#222'}}>
                                        {word}
                                      </span>
                                    )}
                                  </span>
                                );
              });
            })()}
          </div>
        ) : (
          <span style={{fontFamily:'inherit', color:'#222'}}>
            본문 해석이 생성되지 않았습니다.
          </span>
        )}
      </div>
    </>
  );

  // 리셋
  const resetQuiz = () => {
    setQuiz(null);
    setSelected(null);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setIsPasteFocused(false);
  };

  // 문제 풀이/출력 화면
  if (quiz) {
    // 정답 단어 길이만큼 밑줄로 빈칸 생성
    const answer = quiz.options[quiz.answerIndex] || '';
    // const blankLength = answer.length;
    // const blankStr = '(' + '_'.repeat(blankLength) + ')';
    // displayBlankedText에서 .replace(/\([^)]*\)/, blankStr)와 같은 치환 코드를 완전히 제거
    const displayBlankedText = quiz.blankedText; // 오직 치환 함수 결과만 그대로 사용
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#03.빈칸(단어) 추론 문제</h2>
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
          <div className="quiz-section">
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.18rem', background:'#222', color:'#fff', padding:'0.7rem 1.2rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>다음 빈칸에 들어갈 단어로 가장 적절한 것을 고르시오.</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#03</span>
            </div>
            <div  style={{fontSize:'1.08rem', lineHeight:1.7, margin:'1.2rem 0', background:'#FFF3CD', borderRadius:'8px', padding:'1.2rem', fontFamily:'inherit'}}>
              {displayBlankedText}
            </div>
            <div className="problem-options" style={{margin:'1.2rem 0'}}>
              {quiz.options.map((opt, i) => (
                <label key={i} style={{display:'block', fontSize:'1.08rem', margin:'0.4rem 0', cursor:'pointer', fontWeight: selected === i ? 700 : 400, color: selected === i ? '#6a5acd' : '#222', fontFamily:'inherit'}}>
                  <input
                    type="radio"
                    name="blank-quiz"
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
              </div>
            )}
          </div>
        </div>
        {/* 인쇄용: 문제만 - 동적 페이지 분할 */}
        {printMode === 'no-answer' && (
          <div className="only-print">
            {pageLayout.pages.map((page, pageIndex) => (
              <div key={pageIndex} className="a4-page-template" style={{border:'5px solid #000000'}}>
                <div className="a4-page-header" style={{border:'2px solid #808080'}}>
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content" style={{border:'2px solid #c0c0c0'}}>
                  <div className="quiz-content" style={{border:'2px solid #ffa500'}}>
                    {page.components.map((component, componentIndex) => {
                      switch (component) {
                        case 'A':
                          return (
                            <div key={`${pageIndex}-${componentIndex}`}>
                              {renderComponentA(displayBlankedText)}
                            </div>
                          );
                        case 'B':
                          return (
                            <div key={`${pageIndex}-${componentIndex}`}>
                              {renderComponentB(quiz)}
                            </div>
                          );
                        case 'C':
                          // 문제만 인쇄할 때는 해석(C) 제외
                          return null;
                        default:
                          return null;
                      }
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* 인쇄용: 정답포함 - 동적 페이지 분할 */}
        {printMode === 'with-answer' && quiz && (
          <div className="only-print print-answer-mode">
            {pageLayout.pages.map((page, pageIndex) => (
              <div key={pageIndex} className="a4-page-template" style={{border:'5px solid #000000'}}>
                <div className="a4-page-header" style={{border:'2px solid #808080'}}>
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content" style={{border:'2px solid #c0c0c0'}}>
                  <div className="quiz-content" style={{border:'2px solid #ffa500'}}>
                    {page.components.map((component, componentIndex) => {
                      switch (component) {
                        case 'A':
                          return (
                            <div key={`${pageIndex}-${componentIndex}`}>
                              {renderComponentA(displayBlankedText)}
                            </div>
                          );
                        case 'B':
                          return (
                            <div key={`${pageIndex}-${componentIndex}`}>
                              {renderComponentB(quiz)}
                            </div>
                          );
                        case 'C':
                          return (
                            <div key={`${pageIndex}-${componentIndex}`}>
                              {renderComponentC(quiz)}
                            </div>
                          );
                        default:
                          return null;
                      }
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 입력/옵션/버튼 UI
  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>[유형#03] 빈칸(단어) 추론 문제 생성</h2>
        <p>영어 본문에서 가장 중요한 단어를 빈칸으로 바꾸고, 객관식 5지선다 문제를 생성합니다.</p>
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
          {isLoading && (
            <div style={{color:'#6a5acd', fontWeight:600, marginTop:'0.7rem'}}>
              OpenAI Vision 처리 중...
            </div>
          )}
        </div>
      )}
      {inputMode === 'image' && (
        <div className="input-guide">
          <div className="file-upload-row">
            <label htmlFor="blank-quiz-image" className="file-upload-btn">
              파일 선택
              <input
                id="blank-quiz-image"
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
            {isLoading && (
              <div className="loading-text">
                OpenAI Vision 처리 중...
              </div>
            )}
          </div>
        </div>
      )}
      <div className="input-section">
        <div className="input-label-row">
          <label htmlFor="blank-quiz-text" className="input-label">
            영어 본문 직접 붙여넣기:
          </label>
          {inputText.length < 100 && (
            <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
          )}
        </div>
        <textarea
          id="blank-quiz-text"
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
        어휘(빈칸) 문제 생성하기
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
        workTypeName="어휘(빈칸) 문제 생성"
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

export default Work_03_VocabularyWord; 