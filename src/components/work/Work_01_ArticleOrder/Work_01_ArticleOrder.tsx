import React, { useState, useRef, useEffect } from 'react';
import { createQuiz } from '../../../utils/textProcessor';
import { Quiz } from '../../../types/types';
import { isAIServiceAvailable } from '../../../services/aiParagraphService';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { useAuth } from '../../../contexts/AuthContext';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
// import A4PageTemplate from '../../common/A4PageTemplate';
import './Work_01_ArticleOrder.css';
import '../../../styles/PrintFormat.css';

interface Work_11_ArticleOrderProps {
  onQuizGenerated?: (quiz: Quiz) => void;
}

type InputType = 'clipboard' | 'file' | 'text';
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
  console.log('OpenAI Vision API Key:', apiKey); // 디버깅용
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

const visionPrompt = `영어문제로 사용되는 본문이야.\n이 이미지의 내용을 수작업으로 정확히 읽고, 영어 본문만 추려내서 보여줘.\n글자는 인쇄글씨체 이외에 손글씨나 원, 밑줄 등 표시되어있는 것은 무시해. 본문중에 원문자 1, 2, 3... 등으로 표시된건 제거해줘. 원문자 제거후 줄을 바꾸거나 문단을 바꾸지말고, 전체가 한 문단으로 구성해줘. 영어 본문만, 아무런 설명이나 안내문 없이, 한 문단으로만 출력해줘.`;

// OpenAI Vision 결과에서 안내문 제거
function cleanOpenAIVisionResult(text: string): string {
  // "Sure! ..." 또는 "Here is ..." 등 안내문 제거
  return text.replace(/^(Sure!|Here is|Here are|Here's|Here's)[^\n:]*[:：]?\s*/i, '').trim();
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

const Work_11_ArticleOrder: React.FC<Work_11_ArticleOrderProps> = ({ onQuizGenerated }) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [error, setError] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [inputType, setInputType] = useState<InputType>('text');
  const [tooltip, setTooltip] = useState('');
  const [pastedImageUrl, setPastedImageUrl] = useState<string | null>(null);
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const aiAvailable = isAIServiceAvailable();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [showScreenshotHelp, setShowScreenshotHelp] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [needsSecondPage, setNeedsSecondPage] = useState(false);
  const [needsAnswerSecondPage, setNeedsAnswerSecondPage] = useState(false);
  const [needsAnswerThirdPage, setNeedsAnswerThirdPage] = useState(false);
  const [needsAnswerPage2Split, setNeedsAnswerPage2Split] = useState(false);
  
  // 포인트 관련 상태
  const { userData, loading } = useAuth();
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<number>(0);

  // 포인트 초기화
  useEffect(() => {
    const initializePoints = async () => {
      if (!loading && userData) {
        try {
          const [workTypePointsData, userPoints] = await Promise.all([
            getWorkTypePoints(),
            getUserCurrentPoints(userData.uid)
          ]);
          
          const workType = workTypePointsData.find(wt => wt.id === '1');
          if (workType) {
            setWorkTypePoints(workType.points);
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
  }, [userData?.uid, loading]);

  // 본문 글자 수 기반 페이지 분할 결정
  const checkContentLength = () => {
    if (!quiz) return;
    
    // 본문 내용의 총 글자 수 계산 (공백 포함)
    const totalContentLength = quiz.shuffledParagraphs.reduce((total, paragraph) => {
      return total + paragraph.content.length;
    }, 0);
    
    // 2,000자 미만이면 1페이지, 2,000자 이상이면 2페이지
    setNeedsSecondPage(totalContentLength >= 2000);
  };

  // 정답 페이지용 2페이지 고정 구성 (본문+정답, 해석)
  const checkAnswerContentLength = () => {
    if (!quiz || !translatedText) return;
    
    // 2페이지 고정 구성으로 단순화
    setNeedsAnswerSecondPage(true); // 항상 2페이지 (해석 페이지 포함)
    setNeedsAnswerThirdPage(false); // 3페이지 구성 사용 안함
    
    console.log('📊 인쇄(정답) 2페이지 고정 구성:', {
      page1: '본문 + 정답 + 선택지',
      page2: '해석 (2,700자 기준 분할)'
    });
  };

  // 해석 페이지 분할 결정 (2페이지 구성에서 해석 페이지 분할)
  const checkAnswerPage2Split = () => {
    if (!quiz || !translatedText) return;
    
    // 해석 페이지의 총 글자 수 계산 (영어 원문 + 한글 해석)
    const correctOrder = quiz.choices[quiz.answerIndex];
    const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
      ? quiz.shuffledParagraphs 
      : (quiz.paragraphs || []);
    
    // 영어 원문 총 글자수
    const totalEnglishLength = correctOrder.reduce((total, paragraphLabel) => {
      const paragraph = availableParagraphs.find(p => p.label === paragraphLabel);
      return paragraph?.content ? total + paragraph.content.length : total;
    }, 0);
    
    // 한글 해석 총 글자수
    const totalTranslationLength = translatedText.length;
    
    // 해석 페이지 총 글자수 (영어 + 한글 + 레이아웃 여백 고려)
    const totalInterpretationLength = totalEnglishLength + totalTranslationLength;
    
    // 해석 페이지 분할 로직 (2,700자 기준):
    // - 2,700자 미만: 해석 1페이지 (A,B,C,D 모든 해석)
    // - 2,700자 이상: 해석 2페이지 (A,B,C 해석 / D 해석)
    setNeedsAnswerPage2Split(totalInterpretationLength >= 2700);
    
    console.log('📖 해석 페이지 분할 분석:', {
      totalEnglishLength,
      totalTranslationLength,
      totalInterpretationLength,
      needsSplit: totalInterpretationLength >= 2700,
      splitStructure: totalInterpretationLength >= 2700 ? 'A,B,C / D 분할' : '통합 페이지'
    });
  };

  // 퀴즈가 생성되면 내용 길이 확인
  useEffect(() => {
    if (quiz) {
      checkContentLength();
    }
  }, [quiz]);

  // 번역 텍스트가 변경되면 정답 페이지 길이 확인
  useEffect(() => {
    if (quiz && translatedText) {
      checkAnswerContentLength();
      checkAnswerPage2Split();
    }
  }, [quiz, translatedText]);

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

  // Vision API로 이미지에서 영어 본문 추출
  const handleImageToText = async (image: File | Blob) => {
    setIsVisionLoading(true);
    setIsExtractingText(true);
    setTooltip('');
    setError('');
    try {
      if (image instanceof Blob) {
        setPastedImageUrl(URL.createObjectURL(image));
      }
      const imageBase64 = await fileToBase64(image as File);
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
      const resultText = await callOpenAIVisionAPI(imageBase64, visionPrompt, apiKey);
      setText(cleanOpenAIVisionResult(resultText));
      setPastedImageUrl(null);
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.style.height = 'auto';
          textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
        }
      }, 0);
    } catch (err: any) {
      setError('OpenAI Vision API 호출 실패: ' + (err?.message || err));
      setPastedImageUrl(null);
    } finally {
      setIsVisionLoading(false);
      setIsExtractingText(false);
    }
  };

  // 붙여넣기(클립보드) 이미지 처리
  const handlePaste = (e: React.ClipboardEvent) => {
    if (inputType !== 'clipboard') return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageToText(file);
        }
        e.preventDefault();
        return;
      }
    }
    setTooltip('캡처 이미지가 감지되지 않았습니다. 이미지를 붙여넣어 주세요.');
    e.preventDefault();
  };

  // 파일 업로드 이미지 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setTooltip('이미지 파일만 첨부 가능합니다.');
      return;
    }
    handleImageToText(file);
  };

  // 입력방식 변경 시 상태 초기화
  const handleInputTypeChange = (type: InputType) => {
    setInputType(type);
    setTooltip('');
    setError('');
    setText('');
    if (type === 'file' && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  };

  // 문제 생성 핸들러
  const handleGenerateQuiz = async () => {
    if (!text.trim()) {
      setError('본문을 입력해주세요.');
      return;
    }

    // 로그인 및 포인트 확인
    if (loading) {
      setError('로그인 정보를 확인 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (!userData || !userData.uid) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (userCurrentPoints < pointsToDeduct) {
              setError(`포인트가 부족합니다. 현재 ${userCurrentPoints.toLocaleString()}포인트, 필요 ${pointsToDeduct.toLocaleString()}포인트`);
      return;
    }

    // 포인트 차감 확인 모달 표시
    setShowPointModal(true);
  };

  // 포인트 차감 확인 후 문제 생성 실행
  const handlePointDeductionConfirm = async () => {
    setShowPointModal(false);
    setIsLoading(true);
    setError('');

    try {
              // 포인트 차감
        const deductionResult = await deductUserPoints(
          userData!.uid, 
          '11', 
          '문장 순서 맞추기',
          userData!.displayName || '사용자',
          userData!.nickname || '사용자'
        );
      
      if (deductionResult.success) {
        setUserCurrentPoints(deductionResult.remainingPoints);
        
        // 문제 생성
        console.log('🔍 문제 생성 시작...');
        console.log('📝 입력 텍스트 길이:', text.length);
        console.log('🤖 AI 사용 여부:', useAI);
        
        const quiz = await createQuiz(text, useAI);
        
        // 섞기 결과 검증
        console.log('🔍 섞기 결과 검증...');
        const shuffledLabels = quiz.shuffledParagraphs.map(p => p.label);
        const correctLabels = quiz.correctOrder;
        
        console.log('📊 섞기 결과 분석:');
        console.log('- 섞인 순서 (라벨):', shuffledLabels);
        console.log('- 원본 순서 (라벨):', correctLabels);
        
        console.log('생성된 퀴즈 정보:', {
          originalText: quiz.originalText,
          shuffledParagraphs: quiz.shuffledParagraphs,
          correctOrder: quiz.correctOrder,
          choices: quiz.choices,
          answerIndex: quiz.answerIndex
        });
        
                 setQuiz(quiz);
         
                   // 영어 원본문을 한글로 번역 (단락별 개별 번역)
          try {
            const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
            console.log('🔑 API 키 확인:', apiKey ? '있음' : '없음');
            
            if (!apiKey) {
              setTranslatedText('번역을 사용하려면 .env 파일에 REACT_APP_OPENAI_API_KEY를 설정해주세요.');
              return;
            }
            
            if (!quiz.originalText) {
              setTranslatedText('번역할 원본 텍스트가 없습니다.');
              return;
            }
            
            // 정답 순서대로 단락별 번역
            const correctOrder = quiz.choices[quiz.answerIndex];
            const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
              ? quiz.shuffledParagraphs 
              : (quiz.paragraphs || []);
            
            console.log('🔄 단락별 병렬 번역 시작...');
            
            // 모든 단락을 병렬로 번역
            const translationPromises = correctOrder.map(async (paragraphLabel, index) => {
              const paragraph = availableParagraphs.find(p => p.label === paragraphLabel);
              
              if (paragraph && paragraph.content) {
                console.log(`📝 ${paragraphLabel} 단락 번역 시작...`);
                try {
                  const translation = await translateToKorean(paragraph.content, apiKey);
                  console.log(`✅ ${paragraphLabel} 단락 번역 완료`);
                  return { index, translation, label: paragraphLabel };
                } catch (error) {
                  console.error(`❌ ${paragraphLabel} 단락 번역 실패:`, error);
                  return { index, translation: `[${paragraphLabel}] 번역 실패`, label: paragraphLabel };
                }
              } else {
                console.warn(`⚠️ ${paragraphLabel} 단락을 찾을 수 없음`);
                return { index, translation: `[${paragraphLabel}] 단락 없음`, label: paragraphLabel };
              }
            });
            
            // 모든 번역이 완료될 때까지 대기
            const translationResults = await Promise.all(translationPromises);
            
            // 원래 순서대로 정렬하여 결합
            const sortedTranslations = translationResults
              .sort((a, b) => a.index - b.index)
              .map(result => result.translation);
            
            const combinedTranslation = sortedTranslations.join('\n\n');
            setTranslatedText(combinedTranslation);
            console.log('✅ 모든 단락 병렬 번역 완료');
            
          } catch (error) {
            console.error('❌ 번역 실패:', error);
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            setTranslatedText(`번역 실패: ${errorMessage}`);
          }
         
         onQuizGenerated && onQuizGenerated(quiz);
       } else {
        throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
      }
    } catch (err) {
      // 오류 발생 시 포인트 환불
      try {
        await refundUserPoints(
          userData!.uid, 
          pointsToDeduct,
          '문장 순서 맞추기',
          userData!.displayName || '사용자',
          userData!.nickname || '사용자'
        );
        // 환불 후 현재 포인트 다시 가져오기
        const updatedPoints = await getUserCurrentPoints(userData!.uid);
        setUserCurrentPoints(updatedPoints);
      } catch (refundError) {
        console.error('포인트 환불 실패:', refundError);
      }
      setError(err instanceof Error ? err.message : '문제 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 인쇄 함수들
  const handlePrintNoAnswer = () => {
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
      setTimeout(() => {
        const printStyle = document.getElementById('print-style');
        if (printStyle) {
          printStyle.remove();
        }
        setPrintMode('none');
      }, 1000);
    }, 100);
  };

  // 리셋
  const resetQuiz = () => {
    setQuiz(null);
    setText('');
    setPastedImageUrl(null);
    setIsPasteFocused(false);
    setError('');
    setTooltip('');
    setTranslatedText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 문제가 생성된 경우 문제 표시
  if (quiz) {
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#01. 문장 순서 맞추기</h2>
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
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.13rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#01</span>
            </div>
            
            
            <div className="problem-passage">
              {quiz.shuffledParagraphs.map((paragraph, index) => (
                <div key={paragraph.id} className="shuffled-paragraph">
                  <strong>{paragraph.label}:</strong> {paragraph.content}
                </div>
              ))}
            </div>
            <div className="problem-options">
              {quiz.choices.map((choice, index) => (
                <div key={index} className="option">
                  {['①', '②', '③', '④'][index]} {choice.join(' → ')}
                </div>
              ))}
            </div>
            <div className="screen-answer-footer" style={{color: '#1976d2', fontWeight: 700, fontSize: '1.1rem', textAlign: 'center', marginTop: '2rem', padding: '0.8rem', backgroundColor: '#f0f7ff', borderRadius: '8px'}}>
              정답: {['①', '②', '③', '④'][quiz.answerIndex]}
            </div>
          </div>
        </div>

        {/* 인쇄용 문제 (정답 없음) - 동적 페이지 분할 */}
        {printMode === 'no-answer' && (
          <div className="only-print">
            {needsSecondPage ? (
              // 2페이지 분할: 문제제목+본문, 4지선다
              <>
                {/* 첫 번째 페이지: 문제제목 + 본문 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                        <span>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</span>
                        <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#01</span>
                      </div>
                      <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.75rem'}}>
                        {quiz.shuffledParagraphs.map((paragraph, index) => (
                          <div key={paragraph.id} className="shuffled-paragraph">
                            <strong>{paragraph.label}:</strong> {paragraph.content}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 두 번째 페이지: 4지선다 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      {quiz.choices.map((choice, index) => (
                        <div key={index} className="option" style={{fontSize:'0.75rem', marginTop:'0', paddingLeft:'0.6rem', paddingRight:'0.6rem', paddingTop:'5px', paddingBottom:'5px', marginBottom:'4px'}}>
                          {['①', '②', '③', '④'][index]} {choice.join(' → ')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // 1페이지: 모든 내용 포함
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                      문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요
                    </div>
                    <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'0.75rem'}}>
                      {quiz.shuffledParagraphs.map((paragraph, index) => (
                        <div key={paragraph.id} className="shuffled-paragraph">
                          <strong>{paragraph.label}:</strong> {paragraph.content}
                        </div>
                      ))}
                    </div>
                    {quiz.choices.map((choice, index) => (
                      <div key={index} className="option" style={{fontSize:'0.75rem', marginTop: index === 0 ? '1.5rem' : '4px', paddingTop:'5px', paddingBottom:'5px'}}>
                        {['①', '②', '③', '④'][index]} {choice.join(' → ')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 인쇄용 문제 (정답 포함) - 2페이지 독립 구조 */}
        {printMode === 'with-answer' && (
          <div className="only-print work-01-print">
            {/* 1페이지: 본문 + 정답 + 선택지 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderWork01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    <span>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#01</span>
                  </div>
                  <div className="problem-passage" style={{marginTop:'0.9rem', fontSize:'1rem'}}>
                    {quiz.shuffledParagraphs.map((paragraph, index) => (
                      <div key={paragraph.id} className="shuffled-paragraph">
                        <strong>{paragraph.label}:</strong> {paragraph.content}
                      </div>
                    ))}
                  </div>
                  <div style={{color: '#1976d2', fontWeight: 700, fontSize: '1rem', margin: '1.5rem 0', padding: '0.8rem 1rem', background: '#fff', border: '1px solid #ddd', borderRadius: '5px'}}>
                    {['①', '②', '③', '④'][quiz.answerIndex]} {quiz.choices[quiz.answerIndex].join(' → ')}
                    <span style={{color: '#1976d2', fontWeight: 800, marginLeft: '8px'}}>(정답)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2페이지: 해석 - 2,700자 기준으로 분할 */}
            {needsAnswerPage2Split ? (
              // 해석 2,700자 이상: A,B,C 해석 / D 해석으로 분할
              <>
                {/* 2-1페이지: A, B, C 해석 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight: '800', fontSize: '1rem', background: '#222', color: '#fff', padding: '0.7rem 0.5rem', borderRadius: '8px', marginBottom: '1.2rem', display: 'block', width:'100%'}}>
                        본문 해석
                      </div>
                      
                      {/* A, B, C 단락과 해석만 표시 */}
                      {(() => {
                        const correctOrder = quiz.choices[quiz.answerIndex];
                        const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
                          ? quiz.shuffledParagraphs 
                          : (quiz.paragraphs || []);
                        
                        // A, B, C만 표시 (첫 3개)
                        return correctOrder.slice(0, 3).map((paragraphLabel, index) => {
                          const paragraph = availableParagraphs.find(p => p.label === paragraphLabel);
                          
                          if (!paragraph || !paragraph.content) {
                            return (
                              <div key={paragraphLabel} style={{color: 'red', padding: '1rem', border: '1px solid red'}}>
                                단락을 찾을 수 없습니다: {paragraphLabel}
                              </div>
                            );
                          }
                          
                          return (
                            <div key={paragraphLabel} className="paragraph-simple" style={{marginBottom: '1.5rem'}}>
                              <div style={{marginBottom: '0.5rem', fontSize: '1rem', paddingLeft: '0.6rem', paddingRight: '0.6rem'}}>
                                <strong style={{fontSize: '1rem', color: '#333'}}>{paragraph.label}:</strong> {paragraph.content}
                              </div>
                              <div style={{
                                width: '100%',
                                minHeight: '60px',
                                border: '1px solid #ccc',
                                backgroundColor: '#F1F8E9',
                                marginTop: '0.5rem',
                                padding: '0.6rem',
                                fontSize: '1rem',
                                lineHeight: '1.4',
                                color: '#333'
                              }}>
                                {translatedText ? (
                                  (() => {
                                    if (!translatedText) return '번역 중...';
                                    // 단락별로 분리된 번역 텍스트에서 해당 인덱스의 번역 가져오기
                                    const translations = translatedText.split('\n\n');
                                    return translations[index] || '번역 없음';
                                  })()
                                ) : (
                                  '번역 중...'
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* 2-2페이지: D 해석 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight: '800', fontSize: '1rem', background: '#222', color: '#fff', padding: '0.7rem 0.5rem', borderRadius: '8px', marginBottom: '3rem', display: 'block', width:'100%'}}>
                        본문 해석 (계속)
                      </div>
                      
                      {/* D 단락과 해석만 표시 */}
                      {(() => {
                        const correctOrder = quiz.choices[quiz.answerIndex];
                        const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
                          ? quiz.shuffledParagraphs 
                          : (quiz.paragraphs || []);
                        
                        // D만 표시 (마지막 1개)
                        const lastParagraphLabel = correctOrder[3];
                        const paragraph = availableParagraphs.find(p => p.label === lastParagraphLabel);
                        
                        if (!paragraph || !paragraph.content) {
                          return (
                            <div style={{color: 'red', padding: '1rem', border: '1px solid red'}}>
                              단락을 찾을 수 없습니다: {lastParagraphLabel}
                            </div>
                          );
                        }
                        
                        return (
                          <div className="paragraph-simple" style={{marginBottom: '1.5rem', marginTop: '0rem'}}>
                            <div style={{marginBottom: '0.5rem', fontSize: '1rem', paddingLeft: '0.6rem', paddingRight: '0.6rem'}}>
                              <strong style={{fontSize: '1rem', color: '#333'}}>{paragraph.label}:</strong> {paragraph.content}
                            </div>
                            <div style={{
                              width: '100%',
                              minHeight: '60px',
                              border: '1px solid #ccc',
                              backgroundColor: '#F1F8E9',
                              marginTop: '0.5rem',
                              padding: '0.6rem',
                              fontSize: '1rem',
                              lineHeight: '1.4',
                              color: '#333'
                            }}>
                              {translatedText ? (
                                (() => {
                                  if (!translatedText) return '번역 중...';
                                  // 단락별로 분리된 번역 텍스트에서 해당 인덱스의 번역 가져오기 (D는 인덱스 3)
                                  const translations = translatedText.split('\n\n');
                                  return translations[3] || '번역 없음';
                                })()
                              ) : (
                                '번역 중...'
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // 해석 2,700자 미만: A,B,C,D 모든 해석을 1페이지에
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    <div className="problem-instruction" style={{fontWeight: '800', fontSize: '1rem', background: '#222', color: '#fff', padding: '0.7rem 0.5rem', borderRadius: '8px', marginBottom: '1.2rem', display: 'block', width:'100%'}}>
                      본문 해석
                    </div>
                    
                    {/* 정답 순서대로 각 단락과 해석 표시 */}
                    {(() => {
                      const correctOrder = quiz.choices[quiz.answerIndex];
                      const availableParagraphs = quiz.shuffledParagraphs && quiz.shuffledParagraphs.length > 0 && quiz.shuffledParagraphs[0].content 
                        ? quiz.shuffledParagraphs 
                        : (quiz.paragraphs || []);
                      
                      return correctOrder.map((paragraphLabel, index) => {
                        const paragraph = availableParagraphs.find(p => p.label === paragraphLabel);
                        
                        if (!paragraph || !paragraph.content) {
                          return (
                            <div key={paragraphLabel} style={{color: 'red', padding: '1rem', border: '1px solid red'}}>
                              단락을 찾을 수 없습니다: {paragraphLabel}
                            </div>
                          );
                        }
                        
                        return (
                          <div key={paragraphLabel} className="paragraph-simple" style={{marginBottom: '1.5rem'}}>
                            <div style={{marginBottom: '0.5rem', fontSize: '1rem', paddingLeft: '0.6rem', paddingRight: '0.6rem'}}>
                              <strong style={{fontSize: '1rem', color: '#333'}}>{paragraph.label}:</strong> {paragraph.content}
                            </div>
                            <div style={{
                              width: '100%',
                              minHeight: '60px',
                              border: '1px solid #ccc',
                              backgroundColor: '#F1F8E9',
                              marginTop: '0.5rem',
                              padding: '0.6rem',
                              fontSize: '1rem',
                              lineHeight: '1.4',
                              color: '#333'
                            }}>
                              {translatedText ? (
                                (() => {
                                  if (!translatedText) return '번역 중...';
                                  // 단락별로 분리된 번역 텍스트에서 해당 인덱스의 번역 가져오기
                                  const translations = translatedText.split('\n\n');
                                  return translations[index] || '번역 없음';
                                })()
                              ) : (
                                '번역 중...'
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-generator">
      <div className="generator-header">
        <h2>[유형#01] 문장 순서 맞추기</h2>
        <p>본문을 4개로 분할하고 섞어서 올바른 순서를 찾는 문제를 생성합니다.</p>
      </div>

      {/* 입력 방식 선택 */}
      <div className="input-type-section">
        <label>
          <input
            type="radio"
            name="inputType"
            checked={inputType === 'clipboard'}
            onChange={() => handleInputTypeChange('clipboard')}
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
            name="inputType"
            checked={inputType === 'file'}
            onChange={() => handleInputTypeChange('file')}
          />
          <span>🖼️ 이미지 파일 첨부</span>
        </label>
        <label>
          <input
            type="radio"
            name="inputType"
            checked={inputType === 'text'}
            onChange={() => handleInputTypeChange('text')}
          />
          <span>✍️ 영어 본문 직접 붙여넣기</span>
        </label>
      </div>

      {/* 입력 방식별 안내 및 입력 UI */}
      {inputType === 'clipboard' && (
        <div
          className={`input-guide${isPasteFocused ? ' paste-focused' : ''}`}
          tabIndex={0}
          onClick={() => setIsPasteFocused(true)}
          onFocus={() => setIsPasteFocused(true)}
          onBlur={() => setIsPasteFocused(false)}
          onPaste={handlePaste}
        >
          <div className="drop-icon">📋</div>
          <div className="drop-text">여기에 이미지를 붙여넣으세요</div>
          <div className="drop-desc">클릭 또는 Tab 후 <b>Ctrl+V</b>로 캡처 이미지를 붙여넣을 수 있습니다.</div>
          {pastedImageUrl && (
            <div className="preview-row">
              <img src={pastedImageUrl} alt="붙여넣은 이미지 미리보기" className="preview-img" />
              {isVisionLoading && <span className="loading-text">OpenAI Vision 처리 중...</span>}
            </div>
          )}
          {isVisionLoading && !pastedImageUrl && (
            <div className="loading-text">OpenAI Vision 처리 중...</div>
          )}
          {tooltip && <div className="error-text">{tooltip}</div>}
        </div>
      )}
      {inputType === 'file' && (
        <div className="input-guide">
          <div className="file-upload-row">
            <label htmlFor="file-upload" className="file-upload-btn">
              파일 선택
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isLoading}
                style={{ display: 'none' }}
              />
            </label>
            <span className="file-upload-status">
              {fileInputRef.current && fileInputRef.current.files && fileInputRef.current.files.length > 0
                ? fileInputRef.current.files[0].name
                : '선택된 파일 없음'}
            </span>
          </div>
        </div>
      )}
      {/* OCR/입력 결과 textarea */}
      <div className="input-section">
        <div className="input-label-row">
          <label htmlFor="text-input" className="input-label">
            영어 본문 직접 붙여넣기:
          </label>
          {text.length < 100 && (
            <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
          )}
        </div>
        <textarea
          id="text-input"
          ref={textAreaRef}
          value={text}
          onChange={handleTextChange}
          placeholder="영어 본문을 직접 붙여넣어 주세요. 최소 100자 이상 권장합니다."
          className="text-input"
          rows={8}
          style={{overflow: 'hidden', resize: 'none'}}
          disabled={inputType !== 'text'}
        />
        <div className="text-info">
          <span>글자 수: {text.length}자</span>
        </div>
        {tooltip && <div className="tooltip">{tooltip}</div>}
        {isVisionLoading && <div style={{color:'#6a5acd', fontWeight:600, marginTop:'0.5rem'}}>OpenAI Vision 처리 중...</div>}
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* 분할 방식 선택 (문제 생성 버튼 위로 이동) */}
      <div className="ai-option-section">
        <div className="option-group">
          <label className="option-label">
            <input
              type="radio"
              name="splitMethod"
              checked={!useAI}
              onChange={() => setUseAI(false)}
            />
            <span className="option-text">📋 규칙 기반 분할 (기본)</span>
          </label>
          <p className="option-description">전환어와 문장 수를 기준으로 단락을 분할합니다.</p>
        </div>
        <div className="option-group">
          <label className="option-label">
            <input
              type="radio"
              name="splitMethod"
              checked={useAI}
              onChange={() => setUseAI(true)}
              disabled={!aiAvailable}
            />
            <span className="option-text">🤖 AI 기반 의미 분할 (고급)</span>
          </label>
          <p className="option-description">
            {aiAvailable
              ? 'OpenAI GPT-4가 의미와 주제를 분석하여 자연스럽게 단락을 분할하고, 적절하게 섞어서 문제를 생성합니다.'
              : 'AI 서비스가 현재 이용할 수 없습니다. 규칙 기반 분할을 사용해주세요.'}
          </p>
          {!aiAvailable && (
            <div className="service-unavailable">⚠️ AI 기능이 일시적으로 이용할 수 없습니다.</div>
          )}
        </div>
      </div>


      <button
        onClick={handleGenerateQuiz}
        disabled={isLoading || !text.trim()}
        className="generate-button"
      >
        {useAI ? '🤖 AI로 문제 생성' : '📋 문제 생성'}
      </button>

      {/* 화면 중앙 모래시계 로딩 스피너 */}
      {(isLoading || isExtractingText) && (
        <div className="centered-hourglass-overlay">
          <div className="centered-hourglass-content">
            <span className="centered-hourglass-spinner">⏳</span>
            <div className="loading-text">
              {isExtractingText ? '📄 텍스트 추출 중...' : (useAI ? '🤖 AI 분석 중...' : '📋 문제 생성 중...')}
            </div>
          </div>
        </div>
      )}
      
      {/* 화면 캡처 도움말 모달 */}
      <ScreenshotHelpModal
        isOpen={showScreenshotHelp}
        onClose={() => setShowScreenshotHelp(false)}
      />

      {/* 포인트 차감 확인 모달 */}
      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={handlePointDeductionConfirm}
        pointsToDeduct={pointsToDeduct}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - pointsToDeduct}
        workTypeName="문장 순서 맞추기"
      />
    </div>
  );
};

export default Work_11_ArticleOrder;