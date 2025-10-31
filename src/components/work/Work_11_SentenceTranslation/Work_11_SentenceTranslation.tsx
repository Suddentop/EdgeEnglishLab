import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserCurrentPoints, getWorkTypePoints, deductUserPoints, refundUserPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import PointDeductionModal from '../../modal/PointDeductionModal';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import Work11DynamicPrintPages from './Work11DynamicPrintPages';
import './Work_11_SentenceTranslation.css';
import '../../../styles/PrintFormat.css';

interface Work_11_SentenceTranslationProps {
  onQuizGenerated?: (quiz: any) => void; // Quiz 타입을 사용하지 않으므로 any로 변경
}

type InputMode = 'capture' | 'file' | 'text';
type PrintMode = 'none' | 'no-answer' | 'with-answer';

// 파일 → base64 변환
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// OpenAI Vision API 호출
async function callOpenAIVisionAPI(imageBase64: string, prompt: string, apiKey: string): Promise<string> {
  // console.log('OpenAI Vision API Key:', apiKey); // 보안상 제거됨
  if (!apiKey) throw new Error('API Key가 비어 있습니다. .env 파일과 개발 서버 재시작을 확인하세요.');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }
      ],
      max_tokens: 2048
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    console.error('OpenAI Vision API 응답:', errText);
    throw new Error('OpenAI Vision API 호출 실패: ' + errText);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

const visionPrompt = `영어문제로 사용되는 본문이야.\n이 이미지의 내용을 수작업으로 정확히 읽고, 영어 본문만 추려내서 보여줘.\n\n중요한 지침:\n1. 글자는 인쇄글씨체 이외에 손글씨나 원, 밑줄 등 표시되어있는 것은 무시해.\n2. 본문중에 원문자 ①, ②, ③... 등으로 표시된건 제거해줘.\n3. 구두점(마침표, 쉼표, 세미콜론, 콜론)을 매우 정확하게 인식해줘. 특히 마침표(.)와 쉼표(,)를 구분해서 정확히 추출해줘.\n4. 인용문의 시작과 끝을 정확히 인식하고, 인용부호("")를 올바르게 표시해줘.\n5. 문장의 끝은 마침표(.)로, 나열이나 연결은 쉼표(,)로 정확히 구분해줘.\n6. 원문자 제거후 줄을 바꾸거나 문단을 바꾸지말고, 전체가 한 문단으로 구성해줘.\n7. 영어 본문만, 아무런 설명이나 안내문 없이, 한 문단으로만 출력해줘.`;

// OpenAI Vision 결과에서 안내문 제거 및 구두점 정리
function cleanOpenAIVisionResult(text: string): string {
  // "Sure! ..." 또는 "Here is ..." 등 안내문 제거
  let cleaned = text.replace(/^(Sure!|Here is|Here are|Here's|Here's)[^\n:]*[:：]?\s*/i, '').trim();
  
  // 구두점 정리: 인용문 내의 구두점 오류 수정
  // "wrote," → "wrote." (인용문 시작 전 마침표)
  cleaned = cleaned.replace(/wrote,(\s*")/g, 'wrote.$1');
  
  // 기타 일반적인 구두점 오류 수정
  // 문장 끝에 쉼표가 있는 경우 마침표로 변경 (단, 나열이나 연결이 아닌 경우)
  cleaned = cleaned.replace(/([a-z])(,)(\s*)([A-Z])/g, (match, p1, p2, p3, p4) => {
    // 인용문 내부가 아닌 경우에만 마침표로 변경
    const beforeQuote = cleaned.substring(0, cleaned.indexOf(match));
    const quoteCount = (beforeQuote.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) { // 인용문 외부
      return p1 + '.' + p3 + p4;
    }
    return match; // 인용문 내부는 그대로 유지
  });
  
  return cleaned;
}

// OpenAI API를 사용하여 영어를 한글로 번역
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
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      throw new Error(`번역 API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    const translation = data.choices[0].message.content.trim();
    console.log('🌐 번역 완료:', translation.substring(0, 50) + '...');
    return translation;
  } catch (error) {
    console.error('번역 오류:', error);
    throw error;
  }
}

// 문장별 해석 문제 생성
async function generateSentenceTranslationQuiz(englishText: string, apiKey: string): Promise<{
  sentences: string[];
  translations: string[];
  quizText: string;
}> {
  try {
    console.log('📝 문장별 해석 문제 생성 시작');
    
    // 영어 텍스트를 문장 단위로 분리 (약어 보호)
    let processedText = englishText;
    
    // 일반적인 약어들을 임시로 보호 (마침표를 특수 문자로 치환)
    const abbreviations = [
      'e.g.', 'i.e.', 'etc.', 'vs.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.',
      'U.S.', 'U.K.', 'U.S.A.', 'Ph.D.', 'B.A.', 'M.A.', 'Inc.', 'Corp.',
      'Ltd.', 'Co.', 'St.', 'Ave.', 'Blvd.', 'Rd.', 'Jr.', 'Sr.',
      'A.D.', 'B.C.', 'C.E.', 'B.C.E.'
    ];
    
    // 약어의 마침표를 임시 문자로 치환
    abbreviations.forEach(abbr => {
      const regex = new RegExp(abbr.replace('.', '\\.'), 'gi');
      processedText = processedText.replace(regex, abbr.replace(/\./g, '§§§'));
    });
    
    // 숫자 패턴 보호 (예: 1.5, 2.3, 10.25 등)
    processedText = processedText.replace(/\b\d+\.\d+\b/g, (match) => {
      return match.replace(/\./g, '§§§');
    });
    
    // 인용문을 고려한 문장 분리
    const sentences: string[] = [];
    let currentSentence = '';
    let inQuotes = false;
    let quoteCount = 0;
    
    for (let i = 0; i < processedText.length; i++) {
      const char = processedText[i];
      const nextChar = processedText[i + 1];
      
      if (char === '"') {
        quoteCount++;
        inQuotes = quoteCount % 2 === 1; // 홀수면 인용문 시작, 짝수면 인용문 끝
        currentSentence += char;
        } else if (/[.!?]/.test(char)) {
          currentSentence += char;
          
          // 인용문 밖에서 마침표/느낌표/물음표를 만나면 문장 분리
          if (!inQuotes) {
            if (currentSentence.trim().length > 0) {
              sentences.push(currentSentence.trim());
            }
            currentSentence = '';
          } else {
            // 인용문 안에서 마침표를 만난 경우, 다음 문자가 따옴표인지 확인
            if (nextChar === '"') {
              // 마침표 다음에 따옴표가 오면 인용문이 끝나는 것
              // 따옴표까지 포함해서 현재 문장에 추가하고 문장 분리
              currentSentence += nextChar;
              i++; // 따옴표 문자를 건너뛰기
              
              if (currentSentence.trim().length > 0) {
                sentences.push(currentSentence.trim());
              }
              currentSentence = '';
              inQuotes = false; // 인용문 상태 초기화
            }
          }
        } else {
        currentSentence += char;
      }
    }
    
    // 마지막 문장 처리
    if (currentSentence.trim().length > 0) {
      sentences.push(currentSentence.trim());
    }
    
    // 문장 정리 및 마침표 추가
    const finalSentences = sentences
      .filter(s => s.length > 0)
      .map(s => {
        // 임시 문자를 다시 마침표로 복원
        const restored = s.replace(/§§§/g, '.');
        // 문장 끝에 마침표가 없으면 추가
        return restored + (restored.endsWith('.') || restored.endsWith('!') || restored.endsWith('?') ? '' : '.');
      });
    
    console.log('📝 분리된 문장 수:', finalSentences.length);
    
    // 각 문장을 한국어로 번역
    const translations: string[] = [];
    for (let i = 0; i < finalSentences.length; i++) {
      const sentence = finalSentences[i];
      if (sentence.trim().length > 0) {
        try {
          const translation = await translateToKorean(sentence, apiKey);
          translations.push(translation);
          console.log(`📝 문장 ${i + 1} 번역 완료:`, translation.substring(0, 30) + '...');
        } catch (error) {
          console.error(`문장 ${i + 1} 번역 실패:`, error);
          translations.push(`[번역 실패: ${sentence}]`);
        }
      }
    }
    
    // 퀴즈 텍스트 생성
    let quizText = '본문 문장별 해석\n\n';
    finalSentences.forEach((sentence, index) => {
      if (sentence.trim().length > 0) {
        quizText += `${index + 1}. ${sentence}\n`;
        quizText += `   해석: _________________________________________________\n\n`;
      }
    });
    
    return { sentences: finalSentences, translations, quizText };
  } catch (error) {
    console.error('문장별 해석 문제 생성 오류:', error);
    throw error;
  }
}

const Work_11_SentenceTranslation: React.FC<Work_11_SentenceTranslationProps> = ({ onQuizGenerated }) => {
  const { user } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // 문제생성 중 모래시계 상태
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [error, setError] = useState<string>('');
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const [needsSecondPage, setNeedsSecondPage] = useState(false);
  const [quizData, setQuizData] = useState<{
    sentences: string[];
    translations: string[];
    quizText: string;
  } | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [showPointDeductionModal, setShowPointDeductionModal] = useState(false);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [isPointDeducted, setIsPointDeducted] = useState(false);
  const [isPointRefunded, setIsPointRefunded] = useState(false);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [showScreenshotHelp, setShowScreenshotHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // 사용자 정보 및 포인트 정보 로드
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        try {
          console.log('🔍 사용자 정보 로드 시작:', user.uid);
          
          const points = await getUserCurrentPoints(user.uid);
          console.log('💰 사용자 현재 포인트:', points);
          setUserCurrentPoints(points);
          
          console.log('📋 getWorkTypePoints 함수 호출 시작');
          const workPoints = await getWorkTypePoints();
          console.log('📋 전체 유형별 포인트:', workPoints);
          console.log('📋 workPoints 타입:', typeof workPoints);
          console.log('📋 workPoints 길이:', Array.isArray(workPoints) ? workPoints.length : '배열이 아님');
          
          if (Array.isArray(workPoints)) {
            const workType11 = workPoints.find(wt => wt.id === '11');
            console.log('🎯 유형#11 포인트 설정:', workType11);
            
            if (workType11) {
              setWorkTypePoints(workPoints);
              console.log('✅ 유형#11 포인트 설정 완료:', workType11.points);
            } else {
              console.error('❌ 유형#11 포인트 설정을 찾을 수 없음');
              console.log('🔍 사용 가능한 유형들:', workPoints.map(wt => ({ id: wt.id, name: wt.name })));
              setWorkTypePoints([]); // 기본값 설정
            }
          } else {
            console.error('❌ workPoints가 배열이 아님:', workPoints);
            setWorkTypePoints([]); // 기본값 설정
          }
          
          setUserData({ uid: user.uid, points, workPoints });
        } catch (error) {
          console.error('사용자 정보 로드 실패:', error);
          console.error('에러 상세:', error);
          // 기본값 설정
          setWorkTypePoints([]);
        }
      } else {
        console.log('❌ 사용자 정보가 없음');
      }
    };
    
    loadUserData();
  }, [user]);

  // 컴포넌트 마운트 시 스크롤 최상단
  // 본문 길이에 따른 페이지 분할 결정
  useEffect(() => {
    setNeedsSecondPage(inputText.length >= 2000);
  }, [inputText]);

  // 텍스트 영역 높이 자동 조정
  useEffect(() => {
    if (textAreaRef.current) {
      const textarea = textAreaRef.current;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.max(120, Math.min(800, scrollHeight));
      textarea.style.height = newHeight + 'px';
      // 스크롤바가 생기지 않도록 overflow hidden 유지
      if (scrollHeight <= 800) {
        textarea.style.overflow = 'hidden';
      } else {
        textarea.style.overflow = 'auto';
      }
    }
  }, [inputText]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 문제 생성 후 스크롤 최상단
  useEffect(() => {
    if (quizData) {
      window.scrollTo(0, 0);
    }
  }, [quizData]);

  // 이미지 파일 선택 처리
  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      // OCR → textarea에 자동 입력
      setIsExtractingText(true);
      try {
        const extractedText = await extractTextFromImage(file);
        setInputText(extractedText);
        setTimeout(() => {
          if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
          }
        }, 0);
      } catch (err) {
        console.error('OCR 처리 중 오류가 발생했습니다:', err);
        setError('OCR 처리 중 오류가 발생했습니다.');
      } finally {
        setIsExtractingText(false);
      }
    }
  };

  // 이미지에서 텍스트 추출
  const extractTextFromImage = async (file: File): Promise<string> => {
    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다.');
      }
      
      const base64 = await fileToBase64(file);
      const extractedText = await callOpenAIVisionAPI(base64, visionPrompt, apiKey);
      const cleanedText = cleanOpenAIVisionResult(extractedText);
      
      return cleanedText;
    } catch (error) {
      console.error('이미지 텍스트 추출 실패:', error);
      throw error;
    }
  };

  // 클립보드에서 이미지 붙여넣기
  const handlePaste = async (event: React.ClipboardEvent) => {
    if (inputMode !== 'capture') return;
    
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setImageFile(file);
          setImagePreview(URL.createObjectURL(file));
          setIsExtractingText(true);
          try {
            const extractedText = await extractTextFromImage(file);
            setInputText(extractedText);
            console.log('📸 캡처 이미지에서 텍스트 추출 완료:', extractedText.substring(0, 100) + '...');
          } catch (err) {
            console.error('OCR 처리 중 오류가 발생했습니다:', err);
            setError('OCR 처리 중 오류가 발생했습니다.');
          } finally {
            setIsExtractingText(false);
          }
        }
        event.preventDefault();
        return;
      }
    }
    event.preventDefault();
  };

  // 문장별 해석 문제 생성
  const handleGenerateQuiz = async () => {
    if (!inputText.trim()) {
      setError('텍스트를 입력해주세요.');
      return;
    }
    
    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }
    
    console.log('🚀 문제 생성 시작');
    console.log('💰 현재 포인트:', userCurrentPoints);
    
    // 항상 포인트 차감 확인 모달을 먼저 표시 (유형#10과 동일)
    setShowPointDeductionModal(true);
  };

  // 포인트 차감 모달에서 확인 시 실제 문제 생성 진행
  const handleGenerateQuizWithPointDeduction = async () => {
    if (!inputText.trim()) {
      setError('텍스트를 입력해주세요.');
      return;
    }
    
    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }
    
    console.log('🚀 문제 생성 시작');
    console.log('💰 현재 포인트:', userCurrentPoints);
    
    // 유형#11 포인트
    const requiredPoints = workTypePoints.find(wt => wt.id === '11')?.points || 0;
    console.log('🎯 필요 포인트:', requiredPoints);
    
    // 포인트 부족 확인
    if (userCurrentPoints < requiredPoints) {
      setError('포인트가 부족합니다. 포인트를 충전해주세요.');
      return;
    }
    
    // 모달 닫기 및 모래시계 표시
    setShowPointDeductionModal(false);
    setIsGenerating(true);
    setError('');
    
    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다.');
      }
      
      console.log('💳 포인트 차감 시작:', requiredPoints);
      
      // 포인트 차감
      const deductionResult = await deductUserPoints(
        user.uid, 
        '11', 
        '본문 문장별 해석',
        user.displayName || '사용자',
        user.displayName || '사용자'
      );
      
      if (deductionResult.success) {
        setIsPointDeducted(true);
        setUserCurrentPoints(deductionResult.remainingPoints);
        console.log('✅ Firebase 포인트 차감 완료');
      } else {
        throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
      }
      
      // 문장별 해석 문제 생성
      const quizData = await generateSentenceTranslationQuiz(inputText, apiKey);
      setQuizData(quizData);

      // 문제 생성 내역 저장
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          const workTypePoint = workTypePoints.find(wt => wt.id === '11');
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '11',
            workTypeName: getWorkTypeName('11'),
            points: workTypePoint?.points || 0,
            inputText: inputText,
            quizData: quizData,
            status: 'success'
          });
          console.log('✅ Work_11 내역 저장 완료');
        } catch (historyError) {
          console.error('❌ Work_11 내역 저장 실패:', historyError);
        }
      }
      
      console.log('✅ 문장별 해석 문제 생성 완료');
    } catch (error) {
      console.error('문제 생성 실패:', error);
      setError('문제 생성에 실패했습니다: ' + (error as Error).message);
      
      // 포인트 환불
      if (isPointDeducted) {
        try {
          console.log('🔄 포인트 환불 시작');
          await refundUserPoints(
            user.uid, 
            requiredPoints, 
            '본문 문장별 해석',
            user.displayName || '사용자',
            user.displayName || '사용자',
            '문제 생성 실패로 인한 포인트 환불'
          );
          setIsPointRefunded(true);
          setUserCurrentPoints(prev => prev + requiredPoints);
          console.log('✅ 포인트 환불 완료');
        } catch (refundError) {
          console.error('포인트 환불 실패:', refundError);
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // 포인트 차감 모달 닫기
  const handleClosePointDeductionModal = () => {
    setShowPointDeductionModal(false);
  };

  // 인쇄 모드 변경
  const handlePrintModeChange = (mode: PrintMode) => {
    setPrintMode(mode);
    
    // 인쇄 모드 변경 후 자동으로 인쇄 실행
    if (mode !== 'none') {
      setTimeout(() => {
        window.print();
        // 인쇄 후 printMode를 'none'으로 리셋
        setTimeout(() => {
          setPrintMode('none');
        }, 100);
      }, 100);
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

  // 인쇄
  const handlePrint = () => {
    window.print();
  };

  // 새로 시작
  const handleReset = () => {
    setInputText('');
    setImageFile(null);
    setImagePreview('');
    setQuizData(null);
    setPrintMode('none');
    setError('');
    setIsPointDeducted(false);
    setIsPointRefunded(false);
  };

  // 문제가 생성된 경우 문제 표시
  if (quizData) {
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#11. 본문 문장별 해석 문제</h2>
            <div className="quiz-header-buttons no-print">
              <button onClick={handleReset} className="reset-button" style={{
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
                🖨️ 인쇄 (문제)
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
                🖨️ 인쇄 (정답)
              </button>
            </div>
          </div>
          
          <div className="quiz-content">
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.13rem', background:'#222', color:'#fff', padding:'0.7rem 1.2rem', borderRadius:'8px', marginBottom:'0.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>다음 본문의 각 문장을 한국어로 해석하세요.</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#11</span>
            </div>
            
            <div className="sentences-container">
              {quizData?.sentences.map((sentence, index) => (
                <div key={index} className="sentence-item">
                  <div className="sentence-header">
                    <span className="sentence-number">{index + 1}.</span>
                    <span className="sentence-content">{sentence}</span>
                  </div>
                  <div className="translation-container">
                    <span className="translation-label">해석:</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 인쇄용 문제 (정답 없음) - 새로운 동적 페이지네이션 사용 */}
        {printMode === 'no-answer' && (
          <div className="only-print">
            <Work11DynamicPrintPages
              sentences={quizData?.sentences || []}
              translations={quizData?.translations || []}
              includeAnswer={false}
              printMode="no-answer"
            />
          </div>
        )}

        {/* 인쇄용 문제 (정답 포함) - 새로운 동적 페이지네이션 사용 */}
        {printMode === 'with-answer' && (
          <div className="only-print print-answer-mode">
            <Work11DynamicPrintPages
              sentences={quizData?.sentences || []}
              translations={quizData?.translations || []}
              includeAnswer={true}
              printMode="with-answer"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      {/* 페이지 제목과 설명 - 문제 생성 전에만 표시 */}
      <div className="generator-header">
        <h2>[유형#11] 본문 문장별 해석 문제 생성</h2>
        <p>영어 본문을 입력하면 각 문장별로 해석을 작성할 수 있는 문제를 생성합니다.</p>
      </div>
      
      {/* 입력 폼 - 문제 생성 전에만 표시 */}
      <div className="input-type-section">
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'capture'}
            onChange={() => setInputMode('capture')}
          />
          <span>📸 캡처화면 붙여넣기</span>
          <button
            type="button"
            className="screenshot-help-btn"
            onClick={(e) => {
              e.preventDefault();
              setShowScreenshotHelp(true);
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
            checked={inputMode === 'file'}
            onChange={() => setInputMode('file')}
          />
          <span>🖼️ 이미지 파일 첨부</span>
        </label>
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'text'}
            onChange={() => setInputMode('text')}
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
          {isProcessing && (
            <div style={{color:'#d32f2f', fontWeight:600, marginTop:'0.7rem'}}>
              OpenAI Vision 처리 중...
            </div>
          )}
        </div>
      )}
      
      {inputMode === 'file' && (
        <div className="input-guide">
          <div className="file-upload-row">
            <label htmlFor="sentence-translation-image" className="file-upload-btn">
              파일 선택
              <input
                id="sentence-translation-image"
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                style={{ display: 'none' }}
              />
            </label>
            <span className="file-upload-status">
              {imageFile ? imageFile.name : '선택된 파일 없음'}
            </span>
            {imagePreview && (
              <img src={imagePreview} alt="업로드 미리보기" className="preview-img" />
            )}
            {isProcessing && (
              <div className="loading-text">
                OpenAI Vision 처리 중...
              </div>
            )}
          </div>
        </div>
      )}
      

      
      <div className="input-section">
        <div className="input-label-row">
          <label htmlFor="sentence-translation-text" className="input-label">
            영어 본문 직접 붙여넣기:
          </label>
          {inputText.length < 100 && (
            <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
          )}
        </div>
        <textarea
          id="sentence-translation-text"
          ref={textAreaRef}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            // 텍스트 양에 따라 자동으로 높이 조정
            const textarea = e.target;
            textarea.style.height = 'auto';
            // scrollHeight를 더 정확하게 계산하기 위해 임시로 높이를 설정
            const scrollHeight = textarea.scrollHeight;
            const newHeight = Math.max(120, Math.min(800, scrollHeight));
            textarea.style.height = newHeight + 'px';
            // 스크롤바가 생기지 않도록 overflow hidden 유지
            if (scrollHeight <= 800) {
              textarea.style.overflow = 'hidden';
            } else {
              textarea.style.overflow = 'auto';
            }
          }}
          placeholder="영어 본문을 직접 붙여넣어 주세요. 최소 100자 이상 권장합니다."
          className="text-input"
          rows={5}
          style={{
            overflow: 'hidden', 
            resize: 'none',
            minHeight: '120px',
            maxHeight: '800px'
          }}
          disabled={inputMode === 'file' && !inputText}
        />
        <div className="text-info">
          <span>글자 수: {inputText.length}자</span>
        </div>
      </div>
      
      
      <button
        onClick={handleGenerateQuiz}
        disabled={isProcessing || !inputText.trim()}
        className="generate-button"
      >
        본문 문장별 해석 문제 생성하기
      </button>

      {/* 화면 중앙 모래시계 로딩 스피너 */}
      {(isProcessing || isExtractingText) && (
        <div className="centered-hourglass-overlay">
          <div className="centered-hourglass-content">
            <span className="centered-hourglass-spinner">⏳</span>
            <div className="loading-text">
              {isExtractingText ? '📄 텍스트 추출 중...' : '📋 문제 생성 중...'}
            </div>
          </div>
        </div>
      )}

      {/* 포인트 차감 확인 후 문제생성 중 모래시계 로딩 스피너 */}
      {isGenerating && (
        <div className="centered-hourglass-overlay">
          <div className="centered-hourglass-content">
            <span className="centered-hourglass-spinner">⏳</span>
            <div className="loading-text">
              {isExtractingText ? '📄 텍스트 추출 중...' : '📋 문제 생성 중...'}
            </div>
            <div className="loading-subtext">잠시만 기다려주세요...</div>
          </div>
        </div>
      )}
      
      {/* 오류 메시지 */}
      {error && <div className="error-message">{error}</div>}

      {/* 스크린샷 도움말 모달 */}
      <ScreenshotHelpModal
        isOpen={showScreenshotHelp}
        onClose={() => setShowScreenshotHelp(false)}
      />

      {/* 포인트 차감 모달 */}
      <PointDeductionModal
        isOpen={showPointDeductionModal}
        onClose={handleClosePointDeductionModal}
        onConfirm={handleGenerateQuizWithPointDeduction}
        workTypeName="본문 문장별 해석"
        pointsToDeduct={(workTypePoints.find(wt => wt.id === '11')?.points || 0)}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - (workTypePoints.find(wt => wt.id === '11')?.points || 0)}
      />
    </div>
  );
};

export default Work_11_SentenceTranslation; 