import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import './Work_05_BlankSentenceInference.css';
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

interface BlankQuiz {
  blankedText: string;
  options: string[];
  answerIndex: number;
  translation: string;
}

const Work_05_BlankSentenceInference: React.FC = () => {
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
        
        // 유형#05의 포인트 설정
        const workType5Points = points.find(wt => wt.id === '5')?.points || 0;
        setPointsToDeduct(workType5Points);
        
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

  // 본문 길이에 따른 페이지 분할 결정
  useEffect(() => {
    setNeedsSecondPage(inputText.length >= 2000);
  }, [inputText]);

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

  // 본문에서 이미 ()로 묶인 문장 추출
  const excludedSentences: string[] = [];
  const bracketRegex = /\(([^)]+)\)/g;
  let match;
  while ((match = bracketRegex.exec(inputText)) !== null) {
    excludedSentences.push(match[1].trim());
  }

  // 별도 번역 함수 추가 (유형#01과 동일)
  async function translateToKorean(englishText: string, apiKey: string): Promise<string> {
    try {
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
            { role: 'user', content: `다음 영어 본문을 자연스러운 한국어로 번역해주세요:\n\n${englishText}` }
          ],
          max_tokens: 800,
          temperature: 0.3
        })
      });
      
      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content.trim();
      } else {
        throw new Error('AI 응답 형식이 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('번역 오류:', error);
      return '번역을 생성할 수 없습니다.';
    }
  }

  async function generateBlankQuizWithAI(passage: string): Promise<BlankQuiz> {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const prompt = `아래 영어 본문에서 글의 주제와 가장 밀접한, 의미 있는 문장(sentence) 1개를 선정해.\n1. 반드시 본문에 실제로 등장한 문장(철자, 형태, 대소문자까지 동일)을 정답으로 선정해야 해. 변형, 대체, 동의어, 어형 변화 없이 본문에 있던 그대로 사용해야 해.\n2. 문제의 본문(빈칸 포함)은 반드시 사용자가 입력한 전체 본문과 완전히 동일해야 하며, 일부 문장만 추출하거나, 문장 순서를 바꾸거나, 본문을 요약/변형해서는 안 돼. 오직 정답 문장만 ()로 치환해.\n3. 입력된 본문에 이미 ()로 묶인 문장이 있다면, 그 부분은 절대 빈칸 처리 대상으로 삼지 마세요. 반드시 괄호 밖에 있는 문장만 빈칸 후보로 선정하세요.\n4. 아래 문장은 절대 빈칸 처리하지 마세요: ${excludedSentences.length > 0 ? excludedSentences.join(', ') : '없음'}\n5. 정답(문장) + 오답(비슷한 길이의 문장 4개, 의미는 다름) 총 5개를 생성해.\n6. 정답의 위치는 1~5번 중 랜덤.\n7. 아래 JSON 형식으로 응답:\n{\n  "options": ["...", ...],\n  "answerIndex": 2 // 0~4\n}\n주의: options의 정답(정답 인덱스에 해당하는 문장)은 반드시 본문에 있던 문장과 완전히 일치해야 하며, 변형/대체/동의어/어형 변화가 있으면 안 됨. 문제의 본문(빈칸 포함)은 반드시 입력한 전체 본문과 동일해야 함. 입력된 본문에 이미 ()로 묶인 부분은 빈칸 처리 대상에서 제외해야 함.\n본문:\n${passage}`;
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
    // 정답 문장이 본문에 실제로 존재하는지 검증
    if (!passage.includes(result.options[result.answerIndex])) {
      throw new Error('정답 문장이 본문에 존재하지 않습니다. AI 응답 오류입니다.');
    }
    // blankedText를 프론트엔드에서 직접 생성 (괄호 split 방식, 괄호 안/밖 완벽 구분)
    function replaceFirstOutsideBrackets(text: string, sentence: string): string {
      let replaced = false;
      const tokens = text.split(/([()])/);
      let inBracket = false;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') { inBracket = true; continue; }
        if (tokens[i] === ')') { inBracket = false; continue; }
        if (!inBracket && !replaced) {
          const regex = new RegExp(sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          if (regex.test(tokens[i])) {
            tokens[i] = tokens[i].replace(regex, '(__________)');
            replaced = true;
          }
        }
      }
      let result = '';
      inBracket = false;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') { inBracket = true; result += '('; continue; }
        if (tokens[i] === ')') { inBracket = false; result += ')'; continue; }
        result += tokens[i];
      }
      return result;
    }
    const answer = result.options[result.answerIndex];
    const blankedText = replaceFirstOutsideBrackets(passage, answer);
    result.blankedText = blankedText;
    // 복원 검증
    const blankRestore = result.blankedText.replace(/\( *_{6,}\)/, answer);
    if (blankRestore.trim() !== passage.trim()) {
      throw new Error('빈칸 본문이 원본 본문과 일치하지 않습니다. AI 응답 오류입니다.');
    }
    if (!result.blankedText || !result.options || typeof result.answerIndex !== 'number') {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    // 별도 번역 함수로 본문 번역 처리
    const translation = await translateToKorean(passage, apiKey);
    result.translation = translation;
    
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
    const workType = workTypePoints.find(wt => wt.id === '5'); // 유형#05
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
      const workType = workTypePoints.find(wt => wt.id === '5');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const deductionResult = await deductUserPoints(
        userData.uid,
        '5',
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
      } else if ((inputMode === 'image' || inputMode === 'capture') && imageFile) {
        passage = await imageToTextWithOpenAIVision(imageFile);
      } else {
        throw new Error('이미지를 첨부해주세요.');
      }
      if (!passage.trim()) throw new Error('추출된 텍스트가 없습니다.');
      
      const quizData = await generateBlankQuizWithAI(passage);
      setQuiz(quizData);
      
    } catch (err: any) {
      console.error('빈칸 문제 생성 오류:', err);
      
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '빈칸(문장) 문제 생성',
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
  };

  if (quiz) {
    // 정답 문장 단어 수 × 5만큼 밑줄로 빈칸 생성, 최대 30자로 제한
    const answer = quiz.options[quiz.answerIndex] || '';
    const wordCount = answer.trim().split(/\s+/).length;
    const blankLength = Math.max(answer.length, wordCount * 5);
    const maxBlankLength = 30;
    const blankStr = '(' + '_'.repeat(Math.min(blankLength, maxBlankLength)) + ')';
    // 괄호 안에 어떤 내용이 있든 첫 번째만 밑줄로 치환
    const displayBlankedText = quiz.blankedText.replace(/\([^)]*\)/, blankStr);
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#05. 빈칸(문장) 추론 문제</h2>
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
                transition: 'all 0.3s ease'
              }}>
                <span className="print-icon" aria-hidden>🖨️</span>
                <span>인쇄 (<span style={{color: '#FFD600'}}>정답</span>)</span>
              </button>
            </div>
          </div>
          <div className="quiz-section">
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.18rem', background:'#222', color:'#fff', padding:'0.7rem 1.2rem', borderRadius:'8px', marginBottom:'1.2rem', display:'inline-block'}}>
              다음 빈칸에 들어갈 문장(sentence)으로 가장 적절한 것을 고르시오.
            </div>
            <div className="problem-passage" style={{fontSize:'1.08rem', lineHeight:1.7, margin:'1.2rem 0', background:'#f7f8fc', borderRadius:'8px', padding:'1.2rem', fontFamily:'inherit'}}>
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
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                        다음 빈칸에 들어갈 문장(sentence)으로 가장 적절한 것을 고르시오.
                      </div>
                      <div style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        {displayBlankedText}
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
                      다음 빈칸에 들어갈 문장(sentence)으로 가장 적절한 것을 고르시오.
                    </div>
                    <div style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                      {displayBlankedText}
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
              // 3페이지 구성: 본문, 4지선다, 해석 (본문 2000자 이상)
              <>
                {/* 1페이지: 문제제목 + 본문 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                        다음 빈칸에 들어갈 문장(sentence)으로 가장 적절한 것을 고르시오.
                      </div>
                      <div style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        {displayBlankedText}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2페이지: 4지선다 + 정답 */}
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
                            {quiz.answerIndex === i && (
                              <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}>(정답)</span>
                            )}
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
              // 2페이지 구성: 본문+4지선다, 해석 (본문 2000자 미만)
              <>
                {/* 1페이지: 문제제목 + 본문 + 4지선다 + 정답 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                        다음 빈칸에 들어갈 문장(sentence)으로 가장 적절한 것을 고르시오.
                      </div>
                      <div style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        {displayBlankedText}
                      </div>
                      <div className="problem-options" style={{margin:'1rem 0'}}>
                        {quiz.options.map((opt, i) => (
                          <div key={i} style={{fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'}}>
                            {`①②③④⑤`[i] || `${i+1}.`} {opt}
                            {quiz.answerIndex === i && (
                              <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}>(정답)</span>
                            )}
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
        <h2>[유형#05] 빈칸(문장) 추론 문제 생성</h2>
        <p>영어 본문에서 가장 중요한 문장(sentence)을 빈칸으로 바꾸고, 객관식 5지선다 문제를 생성합니다.</p>
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
          disabled={inputMode !== 'text' && inputMode !== 'capture' && inputMode !== 'image'}
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
        빈칸(문장) 문제 생성하기
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
        workTypeName="빈칸(문장) 문제 생성"
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

export default Work_05_BlankSentenceInference; 