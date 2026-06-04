import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import { imageToTextWithOpenAIVision } from '../../../services/work14Service';
import { translateToKorean as translateToKoreanCommon, callOpenAI } from '../../../services/common';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { getUserCurrentPoints, getWorkTypePoints, deductUserPoints, refundUserPoints } from '../../../services/pointService';
import { saveQuizHistory, updateQuizHistoryFile, getQuizHistory } from '../../../services/quizHistoryService';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import FileFormatSelector from '../shared/FileFormatSelector';
import { FileFormat, generateAndUploadFile } from '../../../services/pdfService';
import ReactDOM from 'react-dom/client';
import './Etc_01_ImageProblemAnalyzer.css';
import '../../../styles/PrintFormat.css';

interface ProblemAnalysisResult {
  englishText: string;
  koreanTranslation: string;
  problemType: string;
  answers: string[];
  analysis: string;
}

// 입력 방식 타입
const INPUT_MODES = [
  { key: 'capture', label: '캡처화면 붙여넣기', description: 'Ctrl+V로 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 첨부', description: '간단한 파일 선택' },
  { key: 'upload', label: '이미지 업로드', description: '드래그 앤 드롭 + 미리보기' },
  { key: 'text', label: '✍️ 영어 본문 직접 붙여넣기', description: '영어 텍스트 직접 입력' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];

const Etc_01_ImageProblemAnalyzer: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [englishText, setEnglishText] = useState<string>(''); // 영어 본문 직접 입력
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ProblemAnalysisResult | null>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<string>('');
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [printMode, setPrintMode] = useState<'none' | 'problem' | 'answer'>('none');
  const [fileFormat, setFileFormat] = useState<FileFormat>('pdf');

  // 포인트 관련 상태 (ETC#01)
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const WORK_TYPE_ID = '15';
  const WORK_TYPE_NAME = '본문 해석 및 추출';

  const saveHistory = async (result: ProblemAnalysisResult) => {
    if (!currentUser?.uid) return;
    try {
      await saveQuizHistory(
        currentUser.uid,
        (userData?.name || '사용자'),
        (userData?.nickname || '사용자'),
        WORK_TYPE_ID,
        WORK_TYPE_NAME,
        pointsToDeduct,
        result.englishText,
        {
          englishText: result.englishText,
          koreanTranslation: result.koreanTranslation,
          problemType: result.problemType,
          analysis: result.analysis
        },
        'success'
      );
    } catch (e) {
      console.error('내역 저장 실패:', e);
    }
  };

  // 포인트 초기화
  React.useEffect(() => {
    const initPoints = async () => {
      try {
        const points = await getWorkTypePoints();
        const type15 = points.find((p: any) => p.id === WORK_TYPE_ID)?.points || 0;
        setPointsToDeduct(type15);
        if (currentUser?.uid) {
          const cur = await getUserCurrentPoints(currentUser.uid);
          setUserCurrentPoints(cur);
        }
      } catch (e) {
        console.error('포인트 초기화 실패:', e);
      }
    };
    initPoints();
  }, [currentUser?.uid]);

  // 입력 방식 변경 핸들러
  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setSelectedFile(null);
    setPreviewUrl('');
    setEnglishText(''); // 텍스트 초기화
    setAnalysisResult(null);
    setError('');
    setProgress('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 캡처화면 붙여넣기 처리
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    // 텍스트 모드나 이미지 파일 업로드 모드일 때는 기본 동작 허용 (텍스트 붙여넣기)
    if (inputMode !== 'capture') {
      return;
    }
    
    // 캡처 모드일 때만 이미지 처리
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          setSelectedFile(file);
          setError('');
          
          // 미리보기 생성
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string);
          };
          reader.readAsDataURL(file);
          
          // 자동으로 분석 시작
          setTimeout(() => {
            analyzeProblem();
          }, 500);
          // 이미지를 찾았으므로 기본 동작(텍스트 붙여넣기) 막기
          e.preventDefault();
          return;
        }
      }
    }
    
    // 이미지를 찾지 못했을 때는 기본 동작 허용 (텍스트 붙여넣기 가능)
  };

  // 파일 선택 처리
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 이미지 파일만 허용
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드할 수 있습니다.');
        return;
      }
      
      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('파일 크기는 10MB 이하여야 합니다.');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      
      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 파일 드래그 앤 드롭 처리
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect({ target: { files: [file] } } as any);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // PHP API BASE URL 정규화 (':8000' 등 프로토콜 누락 시 보정)
  const getPhpApiBaseUrl = (): string => {
    let base = (process.env.REACT_APP_PHP_API_BASE_URL || 'https://edgeenglish.net/php_api_proxy').trim();
    // ':8000'처럼 시작하면 http://localhost 접두사 부여
    if (base.startsWith(':')) {
      base = `${window.location.protocol}//localhost${base}`;
    }
    // 'localhost:8000'처럼 프로토콜 누락 대비
    if (!/^https?:\/\//i.test(base)) {
      base = `${window.location.protocol}//${base.replace(/^\/\//, '')}`;
    }
    // 끝에 슬래시 제거
    base = base.replace(/\/$/, '');
    return base;
  };

  const analyzeImageWithOpenAILocally = async (base64Image: string, extractedText: string): Promise<ProblemAnalysisResult> => {
    // 프롬프트 최적화 (간결하게)
    let prompt: string;
    if (extractedText) {
      // OCR 텍스트가 있으면 이미지 분석을 간소화
      prompt = `이미지는 영어 문제입니다. OCR로 추출된 텍스트를 기반으로 분석하세요:\n\n추출된 텍스트: ${extractedText}\n\n1. 텍스트를 자연스러운 영어 본문으로 정리\n2. 문제 유형 파악 (독해/문법/어휘)\n3. 정답 추출 (있는 경우)\n4. 간단한 분석 제공`;
    } else {
      // OCR 텍스트가 없으면 이미지에서 직접 추출
      prompt = `이미지에서 영어 문제를 분석하세요:\n1. 영어 텍스트 추출 및 정리\n2. 문제 유형 파악\n3. 정답 추출\n4. 간단한 분석`;
    }

    prompt += `\n\n응답은 JSON 형식으로:\n{"englishText":"본문","koreanTranslation":"번역","problemType":"유형","answers":["정답"],"analysis":"분석"}`;

    const requestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user' as const,
          content: [
            {
              type: 'text' as const,
              text: prompt
            },
            {
              type: 'image_url' as const,
              image_url: {
                url: base64Image
              }
            }
          ]
        }
      ],
      max_tokens: 1200,
      temperature: 0.5
    };

    const response = await callOpenAI(requestBody);

    if (!response.ok) {
      const errorPayload = await response.text();
      throw new Error(`OpenAI API 호출 실패: ${response.status} ${response.statusText} - ${errorPayload}`);
    }

    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content || '';

    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    }

    const jsonString = content.slice(jsonStart, jsonEnd);
    const parsed = JSON.parse(jsonString);

    const sanitized: ProblemAnalysisResult = {
      englishText: parsed.englishText || '',
      koreanTranslation: parsed.koreanTranslation || '',
      problemType: parsed.problemType || '',
      answers: Array.isArray(parsed.answers) ? parsed.answers : [parsed.answers].filter(Boolean),
      analysis: parsed.analysis || ''
    };

    return sanitized;
  };

  // 영어 본문만 해석하는 함수
  const translateEnglishText = async () => {
    if (!englishText.trim() || !currentUser) return;

    setIsAnalyzing(true);
    setError('');
    setProgress('영어 본문을 해석하는 중...');

    try {
      // 기존 유형에서 사용하던 공통 번역 경로 사용
      // 포인트 차감
      const deduction = await deductUserPoints(
        currentUser.uid,
        WORK_TYPE_ID,
        WORK_TYPE_NAME,
        currentUser.displayName || '사용자',
        currentUser.displayName || '사용자'
      );
      if (!deduction.success) {
        throw new Error(deduction.error || '포인트 차감 실패');
      }
      setUserCurrentPoints(deduction.remainingPoints);

      const original = normalizeText(englishText);
      const ko = await translateToKoreanCommon(original);

      const sanitized: ProblemAnalysisResult = {
        englishText: original,
        koreanTranslation: normalizeText(ko),
        problemType: '',
        answers: [],
        analysis: '',
      };

      // 결과 저장
      await saveAnalysisResult(sanitized);

      setAnalysisResult(sanitized);
      await saveHistory(sanitized);
      setProgress('해석 완료!');

    } catch (err) {
      console.error('해석 중 오류:', err);
      setError('본문 해석 중 오류가 발생했습니다. 다시 시도해주세요.');
      // 실패 시 환불
      try {
        if (currentUser?.uid && pointsToDeduct > 0) {
          await refundUserPoints(
            currentUser.uid,
            pointsToDeduct,
            WORK_TYPE_NAME,
            currentUser.displayName || '사용자',
            currentUser.displayName || '사용자',
            `${WORK_TYPE_NAME} 실패 환불`
          );
          const cur = await getUserCurrentPoints(currentUser.uid);
          setUserCurrentPoints(cur);
        }
      } catch (e) {
        console.error('환불 실패:', e);
      }
    } finally {
      setIsAnalyzing(false);
      setProgress('');
    }
  };

  // 문제 분석 실행
  const analyzeProblem = async () => {
    if (!selectedFile || !currentUser) return;

    setIsAnalyzing(true);
    setError('');
    setProgress('이미지에서 텍스트를 추출하는 중...');

    try {
      // 포인트 차감
      const deduction = await deductUserPoints(
        currentUser.uid,
        WORK_TYPE_ID,
        WORK_TYPE_NAME,
        currentUser.displayName || '사용자',
        currentUser.displayName || '사용자'
      );
      if (!deduction.success) {
        throw new Error(deduction.error || '포인트 차감 실패');
      }
      setUserCurrentPoints(deduction.remainingPoints);

      // 1단계: OCR로 텍스트 추출
      let extractedText = '';
      try {
        console.log('🔄 OCR 처리 시작...');
        extractedText = await imageToTextWithOpenAIVision(selectedFile);
        console.log('✅ OCR 처리 완료:', extractedText.substring(0, 100) + '...');
        setProgress('영어 텍스트를 분석하는 중...');
      } catch (ocrError) {
        console.error('OCR 처리 실패:', ocrError);
        // OCR 실패 시 직접 이미지 분석으로 진행
        setProgress('이미지를 직접 분석하는 중...');
      }

      // 2단계: 이미지를 Base64로 변환
      const base64Image = await fileToBase64(selectedFile);
      
      // 3단계: AI 분석 (OCR 텍스트가 있으면 함께 전달)
      const result = await analyzeImageWithAI(base64Image, extractedText);
      const sanitized: ProblemAnalysisResult = {
        ...result,
        // 보기 드문 특수문자들을 안전한 문자로 정규화하여 �(U+FFFD) 표시 방지
        englishText: normalizeText(result.englishText),
        koreanTranslation: normalizeText(result.koreanTranslation),
        problemType: normalizeText(result.problemType || ''),
        analysis: normalizeText(result.analysis || ''),
      };
      
      setProgress('번역을 생성하는 중...');
      
      // 4단계: 결과 저장
      await saveAnalysisResult(sanitized);
      
      setAnalysisResult(sanitized);
      await saveHistory(sanitized);
      setProgress('분석 완료!');
      
    } catch (err) {
      console.error('분석 중 오류:', err);
      setError('문제 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
      // 실패 시 환불
      try {
        if (currentUser?.uid && pointsToDeduct > 0) {
          await refundUserPoints(
            currentUser.uid,
            pointsToDeduct,
            WORK_TYPE_NAME,
            currentUser.displayName || '사용자',
            currentUser.displayName || '사용자',
            `${WORK_TYPE_NAME} 실패 환불`
          );
          const cur = await getUserCurrentPoints(currentUser.uid);
          setUserCurrentPoints(cur);
        }
      } catch (e) {
        console.error('환불 실패:', e);
      }
    } finally {
      setIsAnalyzing(false);
      setProgress('');
    }
  };

  // 파일을 Base64로 변환
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 텍스트 정규화: BOM, 비정상 유니코드, 제어문자 제거 및 NFC 정규화
  const normalizeText = (text: string): string => {
    if (!text) return '';
    // 1) UTF-8 BOM 제거, 2) 흔한 깨짐 시퀀스 정리, 3) 제어문자 제거, 4) 정규화
    return text
      .replace(/^\uFEFF/, '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/�+/g, '')
      .normalize('NFC')
      .trim();
  };

  // AI를 사용한 이미지 분석
  const analyzeImageWithAI = async (base64Image: string, extractedText?: string): Promise<ProblemAnalysisResult> => {
    // Firebase Functions 프록시를 통해 직접 호출
    console.log('🖼️ 이미지 분석 요청 시작:', {
      imageSize: base64Image.length,
      extractedTextLength: extractedText?.length || 0,
      userId: currentUser?.uid
    });
    
    try {
      return await analyzeImageWithOpenAILocally(base64Image, extractedText || '');
    } catch (error) {
      console.error('이미지 분석 실패:', error);
      throw error;
    }
  };

  // 분석 결과 저장
  const saveAnalysisResult = async (result: ProblemAnalysisResult) => {
    if (!currentUser) return;

    try {
      await addDoc(collection(db, 'problemAnalysis'), {
        userId: currentUser.uid,
        englishText: result.englishText,
        koreanTranslation: result.koreanTranslation,
        problemType: result.problemType,
        answers: result.answers,
        analysis: result.analysis,
        createdAt: serverTimestamp(),
        fileName: selectedFile?.name || 'unknown',
      });
    } catch (error) {
      console.error('결과 저장 중 오류:', error);
    }
  };

  // 새 분석 시작
  const startNewAnalysis = () => {
    setInputMode('upload');
    setSelectedFile(null);
    setPreviewUrl('');
    setEnglishText(''); // 텍스트 초기화
    setAnalysisResult(null);
    setError('');
    setProgress('');
    setPrintMode('none');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 문제생성목록으로 이동
  const goToQuizList = () => {
    navigate('/quiz-list');
  };

  // 인쇄(정답) 핸들러 - PDF/DOC 저장
  const handlePrintAnswer = async () => {
    console.log('🖨️ [Etc01] 인쇄(정답) 핸들러 시작');
    
    if (!analysisResult) {
      console.error('❌ [Etc01] analysisResult가 없습니다.');
      alert('저장할 내용이 없습니다.');
      return;
    }

    console.log('📋 [Etc01] analysisResult 내용:', {
      hasEnglishText: !!analysisResult.englishText,
      englishTextLength: analysisResult.englishText?.length || 0,
      englishTextPreview: analysisResult.englishText?.substring(0, 50) || '',
      hasKoreanTranslation: !!analysisResult.koreanTranslation,
      koreanTranslationLength: analysisResult.koreanTranslation?.length || 0,
      koreanTranslationPreview: analysisResult.koreanTranslation?.substring(0, 50) || ''
    });

    if (!currentUser?.uid) {
      console.error('❌ [Etc01] currentUser.uid가 없습니다.');
      alert('로그인이 필요합니다.');
      return;
    }

    console.log('✅ [Etc01] 기본 검증 완료, 인쇄 프로세스 시작');
    
    // 기존 스타일 제거
    const existingStyle = document.getElementById('print-style-etc01-answer');
    if (existingStyle) {
      console.log('🗑️ [Etc01] 기존 스타일 제거');
      existingStyle.remove();
    }
    
    // A4 세로 페이지 스타일 동적 추가 (디버깅용 색상별 테두리 포함)
    const style = document.createElement('style');
    style.id = 'print-style-etc01-answer';
    style.textContent = `
      @page {
        margin: 0;
        size: A4 portrait;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
        }
        body > *:not(#print-root-etc01-answer) {
          display: none !important;
        }
        #root {
          display: none !important;
        }
        /* 최상위 컨테이너 - 콘텐츠 높이에 맞춤 */
        #print-root-etc01-answer {
          display: block !important;
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          background: white !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 999999 !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }
        #print-root-etc01-answer * {
          visibility: visible !important;
          opacity: 1 !important;
          max-width: 100% !important;
        }
        /* a4-page-template - 고정 29.7cm 높이 제거, 콘텐츠만큼만 */
        #print-root-etc01-answer .a4-page-template {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          page-break-after: auto !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }
        /* a4-page-header - 헤더 영역 */
        #print-root-etc01-answer .a4-page-header {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: none !important;
          padding: 0.5cm 0.75cm 0.25cm 0.75cm !important;
          border: none !important;
          border-bottom: none !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          flex: none !important;
        }
        #print-root-etc01-answer .print-header-work01 {
          border: none !important;
          border-bottom: none !important;
          padding: 0.15rem 0 !important;
          margin: 0 !important;
        }
        html.etc01-print-active {
          font-size: 16pt !important;
        }
        #print-root-etc01-answer.etc01-print-root,
        #print-root-etc01-answer.etc01-print-root.only-print {
          width: 100% !important;
          max-width: 100% !important;
          font-size: 16pt !important;
          position: relative !important;
          left: auto !important;
          top: auto !important;
        }
        #print-root-etc01-answer .a4-page-template {
          width: 100% !important;
          max-width: 100% !important;
          font-size: 16pt !important;
        }
        #print-root-etc01-answer.only-print .a4-page-template * {
          font-size: inherit !important;
        }
        #print-root-etc01-answer .print-header-text-work01 {
          border: none !important;
          border-bottom: none !important;
          font-size: 11pt !important;
          margin-bottom: 0.35rem !important;
        }
        /* a4-page-content - 상하좌우 적정 여백 */
        #print-root-etc01-answer .a4-page-content {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          flex: none !important;
          flex-grow: 0 !important;
          padding: 0.35cm 0.75cm 0.65cm 0.75cm !important;
          margin: 0 !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }
        #print-root-etc01-answer .a4-page-content,
        #print-root-etc01-answer .quiz-content {
          font-size: 16pt !important;
        }
        #print-root-etc01-answer .quiz-content {
          box-shadow: none !important;
          -webkit-box-shadow: none !important;
        }
        #print-root-etc01-answer .problem-instruction {
          font-size: 14pt !important;
          margin-top: 0.15cm !important;
          margin-bottom: 0.65rem !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        #print-root-etc01-answer .print-content-section {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }
        #print-root-etc01-answer .print-divider {
          margin: 10pt 0 !important;
          box-sizing: border-box !important;
        }
        #print-root-etc01-answer .print-section-title {
          font-size: 14pt !important;
          font-weight: bold !important;
          margin-bottom: 8pt !important;
          box-sizing: border-box !important;
        }
        #print-root-etc01-answer .print-text-content,
        #print-root-etc01-answer .print-text-content.korean,
        #print-root-etc01-answer .problem-passage {
          font-size: 16pt !important;
          line-height: 1.65 !important;
          margin-bottom: 10pt !important;
          box-sizing: border-box !important;
        }
        #print-root-etc01-answer .print-content-section:last-child .print-text-content {
          margin-bottom: 0 !important;
        }
        #print-root-etc01-answer .print-section-title,
        #print-root-etc01-answer .print-text-content {
          max-width: 100% !important;
          width: 100% !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
      }
      @media screen {
        /* 화면에서는 인쇄용 컨테이너 완전히 숨기기 */
        #print-root-etc01-answer {
          display: none !important;
          visibility: hidden !important;
          position: absolute !important;
          left: -9999px !important;
          top: -9999px !important;
          opacity: 0 !important;
          z-index: -1 !important;
          width: 21cm !important;
          max-width: 21cm !important;
          background: white !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        #print-root-etc01-answer * {
          max-width: 100% !important;
          max-height: 100% !important;
        }
        /* a4-page-template - A4 페이지 전체 */
        #print-root-etc01-answer .a4-page-template {
          width: 100% !important;
          max-width: 21cm !important;
          height: auto !important;
          max-height: 29.7cm !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        /* a4-page-header - 헤더 영역 */
        #print-root-etc01-answer .a4-page-header {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: 5cm !important;
          border: none !important;
          border-bottom: none !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        /* print-header-work01 하위 모든 border 제거 */
        #print-root-etc01-answer .print-header-work01 {
          border: none !important;
          border-bottom: none !important;
        }
        #print-root-etc01-answer .print-header-text-work01 {
          border: none !important;
          border-bottom: none !important;
        }
        #print-root-etc01-answer .a4-page-content {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          padding: 0.35cm 0.75cm 0.65cm 0.75cm !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }
        #print-root-etc01-answer .problem-instruction {
          font-size: 12pt !important;
          margin-top: 0.15cm !important;
          margin-bottom: 0.65rem !important;
          box-sizing: border-box !important;
        }
        #print-root-etc01-answer .print-content-section {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }
        #print-root-etc01-answer .print-divider {
          box-sizing: border-box !important;
        }
        #print-root-etc01-answer .print-section-title {
          box-sizing: border-box !important;
        }
        #print-root-etc01-answer .print-text-content {
          box-sizing: border-box !important;
        }
        #print-root-etc01-answer .problem-instruction,
        #print-root-etc01-answer .print-section-title,
        #print-root-etc01-answer .print-text-content {
          max-width: 100% !important;
          box-sizing: border-box !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
      }
    `;
    document.head.appendChild(style);
    console.log('✅ [Etc01] CSS 스타일 추가 완료');
    
    // 인쇄용 컨테이너 생성 (화면 밖에 배치하여 보이지 않게)
    const printContainer = document.createElement('div');
    printContainer.id = 'print-root-etc01-answer';
    printContainer.className = 'only-print print-answer-mode etc01-print-root';
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '100%';
    printContainer.style.maxWidth = '100%';
    printContainer.style.background = 'white';
    printContainer.style.zIndex = '9999';
    // 화면에서는 보이지 않게, 인쇄 시에만 보이게
    printContainer.style.visibility = 'hidden';
    document.body.appendChild(printContainer);
    console.log('✅ [Etc01] 인쇄 컨테이너 생성 및 DOM 추가 완료 (화면 밖 배치):', {
      containerId: printContainer.id,
      containerPosition: printContainer.style.position,
      containerLeft: printContainer.style.left,
      containerWidth: printContainer.style.width,
      containerZIndex: printContainer.style.zIndex,
      containerVisibility: printContainer.style.visibility,
      isInBody: document.body.contains(printContainer)
    });

    // 원래 화면은 그대로 유지 (숨기지 않음)
    console.log('✅ [Etc01] 원래 문제 생성 결과 페이지 유지');

    console.log('🔄 [Etc01] React 렌더링 시작...');
    // React 18 방식으로 렌더링 - 중간 컨테이너 제거하고 직접 배치
    const root = ReactDOM.createRoot(printContainer);
    root.render(
      <div className="a4-page-template etc01-print-answer">
        <div className="a4-page-header">
          <PrintHeaderWork01 />
        </div>
        <div className="a4-page-content">
          <div className="quiz-content">
          {/* 문제 제목 컨테이너 */}
          <div className="problem-instruction" style={{
            fontWeight: 800, 
            fontSize: '14pt', 
            background: '#222', 
            color: '#fff', 
            padding: '0.55rem 0.65rem', 
            borderRadius: '8px', 
            marginBottom: '0.65rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            width: '100%'
          }}>
            <span>영어 본문 추출 결과 및 한글해석</span>
            <span style={{fontSize: '11pt', fontWeight: '700', color: '#FFD700'}}>ETC#01</span>
          </div>
          
          {/* 영어 본문 컨테이너 */}
          <div className="print-content-section">
            <div className="print-section-title" style={{
              fontSize: '14pt',
              fontWeight: 'bold',
              marginBottom: '8pt',
              color: '#2d3a60',
              borderBottom: '2px solid #6a5acd',
              paddingBottom: '4pt'
            }}>
              📖 영어 본문
            </div>
            <div className="print-text-content problem-passage" style={{
              fontSize: '16pt',
              lineHeight: '1.65',
              textAlign: 'justify',
              marginBottom: '10pt',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {analysisResult.englishText}
            </div>
          </div>
          
          <div className="print-divider" style={{
            borderTop: '1px solid #ddd',
            margin: '10pt 0'
          }}></div>
          
          {/* 한글 해석 컨테이너 */}
          <div className="print-content-section">
            <div className="print-section-title" style={{
              fontSize: '14pt',
              fontWeight: 'bold',
              marginBottom: '8pt',
              color: '#2d3a60',
              borderBottom: '2px solid #6a5acd',
              paddingBottom: '4pt'
            }}>
              🇰🇷 한글 해석
            </div>
            <div className="print-text-content korean problem-passage" style={{
              fontSize: '16pt',
              lineHeight: '1.65',
              textAlign: 'justify',
              marginBottom: 0,
              color: '#1976d2',
              fontWeight: '500',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {analysisResult.koreanTranslation}
            </div>
          </div>
          </div>
        </div>
      </div>
    );

    // 렌더링 완료 대기 및 파일 생성
    const waitForRender = async (maxAttempts = 10): Promise<HTMLElement | null> => {
      console.log(`⏳ [Etc01] 렌더링 완료 대기 시작 (최대 ${maxAttempts}회 시도)`);
      for (let i = 0; i < maxAttempts; i++) {
        const element = document.getElementById('print-root-etc01-answer');
        if (element) {
          const templateElement = element.querySelector('.a4-page-template');
          const hasContent = templateElement && templateElement.children.length > 0;
          
          if (i === 0 || i === maxAttempts - 1) {
            console.log(`🔍 [Etc01] 렌더링 확인 (시도 ${i + 1}/${maxAttempts}):`, {
              hasElement: !!element,
              hasTemplate: !!templateElement,
              templateChildrenCount: templateElement?.children.length || 0,
              elementInnerHTML: element.innerHTML.substring(0, 200),
              elementComputedStyle: {
                display: window.getComputedStyle(element).display,
                position: window.getComputedStyle(element).position,
                visibility: window.getComputedStyle(element).visibility,
                opacity: window.getComputedStyle(element).opacity
              }
            });
          }
          
          if (hasContent) {
            console.log(`✅ [Etc01] 렌더링 완료 확인 (시도 ${i + 1}/${maxAttempts})`);
            return element;
          }
        } else {
          if (i === 0 || i === maxAttempts - 1) {
            console.warn(`⚠️ [Etc01] 인쇄 컨테이너를 찾을 수 없음 (시도 ${i + 1}/${maxAttempts})`);
          }
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      console.warn('⚠️ [Etc01] 렌더링 완료 확인 실패, 최대 시도 횟수 초과');
      const finalElement = document.getElementById('print-root-etc01-answer');
      if (finalElement) {
        console.log('📊 [Etc01] 최종 요소 상태:', {
          innerHTML: finalElement.innerHTML.substring(0, 500),
          children: Array.from(finalElement.children).map(c => ({
            tagName: c.tagName,
            className: c.className,
            childrenCount: c.children.length
          }))
        });
      }
      return finalElement;
    };

    const cleanupEtc01Print = () => {
      document.documentElement.classList.remove('etc01-print-active');
      root.unmount();
      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }
      const styleElement = document.getElementById('print-style-etc01-answer');
      if (styleElement?.parentNode) {
        styleElement.remove();
      }
    };

    const preparePrintElementForDialog = (printElement: HTMLElement) => {
      printElement.style.display = 'block';
      printElement.style.position = 'relative';
      printElement.style.left = 'auto';
      printElement.style.top = 'auto';
      printElement.style.width = '100%';
      printElement.style.maxWidth = '100%';
      printElement.style.background = 'white';
      printElement.style.zIndex = '999999';
      printElement.style.visibility = 'visible';
      printElement.style.opacity = '1';
      const templateEl = printElement.querySelector('.a4-page-template');
      if (templateEl) {
        const tpl = templateEl as HTMLElement;
        tpl.style.display = 'block';
        tpl.style.visibility = 'visible';
        tpl.style.opacity = '1';
      }
    };

    setTimeout(async () => {
      console.log('⏰ [Etc01] setTimeout 콜백 실행 시작');
      const element = await waitForRender();
      if (!element) {
        console.error('❌ [Etc01] 인쇄 컨테이너를 찾을 수 없습니다.');
        cleanupEtc01Print();
        return;
      }

      let removePrintListeners: (() => void) | null = null;

      // PDF: Firebase 업로드 전에 먼저 인쇄 (스타일/DOM 제거 전에 미리보기)
      if (fileFormat === 'pdf') {
        const onBeforePrint = () => {
          document.documentElement.classList.add('etc01-print-active');
          preparePrintElementForDialog(element);
        };
        const onAfterPrint = () => {
          removePrintListeners?.();
        };
        const attachPrintListeners = () => {
          window.addEventListener('beforeprint', onBeforePrint);
          window.addEventListener('afterprint', onAfterPrint);
        };
        removePrintListeners = () => {
          window.removeEventListener('beforeprint', onBeforePrint);
          window.removeEventListener('afterprint', onAfterPrint);
        };
        attachPrintListeners();

        preparePrintElementForDialog(element);
        document.documentElement.classList.add('etc01-print-active');
        await new Promise((resolve) => setTimeout(resolve, 80));
        console.log('🖨️ [Etc01] window.print() 호출 (업로드 전)');
        window.print();
      }

      try {
        // 요소가 제대로 렌더링되었는지 확인
        const templateElement = element.querySelector('.a4-page-template');
        const headerElement = element.querySelector('.a4-page-header');
        const contentElement = element.querySelector('.a4-page-content');
        const englishTextElement = element.querySelector('.print-text-content:not(.korean)');
        const koreanTextElement = element.querySelector('.print-text-content.korean');
        
        console.log('📊 [Etc01] DOM 요소 상세 확인:', {
          elementId: element.id,
          elementRect: element.getBoundingClientRect(),
          hasTemplate: !!templateElement,
          templateRect: templateElement?.getBoundingClientRect(),
          templateHeight: templateElement?.getBoundingClientRect().height,
          templateChildrenCount: templateElement?.children.length || 0,
          hasHeader: !!headerElement,
          hasContent: !!contentElement,
          contentChildrenCount: contentElement?.children.length || 0,
          hasEnglishText: !!englishTextElement,
          englishTextContent: englishTextElement?.textContent?.substring(0, 100) || '',
          hasKoreanText: !!koreanTextElement,
          koreanTextContent: koreanTextElement?.textContent?.substring(0, 100) || '',
          computedStyles: {
            element: {
              display: window.getComputedStyle(element).display,
              position: window.getComputedStyle(element).position,
              visibility: window.getComputedStyle(element).visibility,
              opacity: window.getComputedStyle(element).opacity,
              width: window.getComputedStyle(element).width,
              height: window.getComputedStyle(element).height
            },
            template: templateElement ? {
              display: window.getComputedStyle(templateElement).display,
              visibility: window.getComputedStyle(templateElement).visibility,
              opacity: window.getComputedStyle(templateElement).opacity
            } : null
          }
        });

        if (!templateElement) {
          console.error('❌ [Etc01] A4 페이지 템플릿을 찾을 수 없습니다.');
          cleanupEtc01Print();
          return;
        }

        console.log('📄 [Etc01] 파일 생성 시작...');
        // currentUser.uid 사용
        const result = await generateAndUploadFile(
          element as HTMLElement,
          currentUser.uid,
          `etc01_answer_${Date.now()}`,
          'ETC#01_정답',
          { isAnswerMode: true, orientation: 'portrait', fileFormat }
        );
        
        console.log('✅ [Etc01] 파일 생성 완료:', result);
        
        // 문제 내역에 파일 URL 저장
        const history = await getQuizHistory(currentUser.uid, { limit: 10 });
        const etc01History = history.find(h => h.workTypeId === WORK_TYPE_ID);
        
        if (etc01History) {
          await updateQuizHistoryFile(etc01History.id, result.url, result.fileName, 'answer');
          const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
          console.log(`📁 [Etc01] ETC#01 정답 ${formatName} 저장 완료:`, result.fileName);
        }
      } catch (error) {
        console.error(`❌ [Etc01] 파일 저장 실패 (${fileFormat}):`, error);
        console.error('❌ [Etc01] 에러 상세:', {
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          errorName: error instanceof Error ? error.name : undefined
        });
        alert(`파일 저장 중 오류가 발생했습니다: ${error}`);
      } finally {
        removePrintListeners?.();
        cleanupEtc01Print();
      }
    }, 200);
    
    console.log('✅ [Etc01] handlePrintAnswer 함수 실행 완료 (비동기 작업 시작)');
  };

  return (
    <div className={`etc-01-container${printMode !== 'none' ? ' print-mode-active' : ''}`} onPaste={handlePaste}>
      <div className="etc-01-header">
        <h1>📦 본문 해석 및 추출</h1>
        <p className="etc-01-description">
          영어 문제 이미지를 업로드하면 AI가 문제를 분석하고 본문 해석을 제공합니다.
        </p>
      </div>

      {!analysisResult ? (
        <div className="etc-01-upload-section">
          {/* 입력 방식 선택 */}
          <div className="etc-01-input-type-section">
            {INPUT_MODES.map((mode) => (
              <div key={mode.key} className="etc-01-input-mode-card">
                <label className="etc-01-input-mode-label">
                  <div className="etc-01-input-mode-header">
                    <input
                      type="radio"
                      name="inputMode"
                      checked={inputMode === mode.key}
                      onChange={() => handleInputModeChange(mode.key)}
                    />
                    <div className="etc-01-input-mode-title">{mode.label}</div>
                    {mode.key === 'capture' && (
                      <button
                        type="button"
                        className="etc-01-help-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowHelpModal(true);
                        }}
                        title="화면 캡처 방법 보기"
                      >
                        ?
                      </button>
                    )}
                  </div>
                  <div className="etc-01-input-mode-description">{mode.description}</div>
                </label>
              </div>
            ))}
          </div>

          {/* 영어 본문 직접 붙여넣기 */}
          {inputMode === 'text' && (
            <div className="etc-01-text-input-area">
              <textarea
                className="etc-01-text-input"
                placeholder="여기에 영어 본문을 붙여넣거나 직접 입력하세요..."
                value={englishText}
                onChange={(e) => setEnglishText(e.target.value)}
                rows={12}
              />
              {englishText.trim() && (
                <div className="etc-01-text-input-info">
                  <p>✅ 영어 본문 입력 완료 ({englishText.trim().length}자)</p>
                </div>
              )}
            </div>
          )}

          {/* 캡처화면 붙여넣기 */}
          {inputMode === 'capture' && (
            <div>
              <div
                className={`etc-01-paste-area${isPasteFocused ? ' paste-focused' : ''}${selectedFile ? ' paste-success' : ''}`}
                tabIndex={0}
                onClick={() => setIsPasteFocused(true)}
                onFocus={() => setIsPasteFocused(true)}
                onBlur={() => setIsPasteFocused(false)}
                onPaste={handlePaste}
              >
                {selectedFile ? (
                  <div className="etc-01-paste-success">
                    <div className="etc-01-paste-success-icon">✅</div>
                    <div className="etc-01-paste-success-text">이미지가 성공적으로 붙여졌습니다!</div>
                    <div className="etc-01-paste-file-info">
                      <p>📁 {selectedFile.name}</p>
                      <p>📏 {(selectedFile.size / 1024 / 1024) < 1 
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                        : `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
                      </p>
                    </div>
                    <div className="etc-01-paste-success-actions">
                      <button 
                        className="etc-01-change-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          startNewAnalysis();
                        }}
                      >
                        다른 이미지 붙여넣기
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="etc-01-paste-icon">📋</div>
                    <div className="etc-01-paste-text">Ctrl+V로 캡처한 이미지를 붙여넣으세요</div>
                    <div className="etc-01-paste-desc">스크린샷이나 사진을 클립보드에 복사한 후 여기에 붙여넣기 하세요</div>
                    <div className="etc-01-paste-tip">
                      💡 <b>팁:</b> 화면 캡처 후 Ctrl+V로 붙여넣기
                    </div>
                    {isAnalyzing && (
                      <div className="etc-01-processing">
                        AI 분석 처리 중...
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* 이미지 파일 첨부 (간단한 방식) */}
          {inputMode === 'image' && (
            <div className="etc-01-simple-upload">
              <div className="etc-01-simple-upload-content">
                <div className="etc-01-simple-upload-icon">📁</div>
                <div className="etc-01-simple-upload-text">
                  <h3>간단한 파일 선택</h3>
                  <p>클릭하여 이미지 파일을 선택하세요</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  id="fileInput"
                  style={{ display: 'none' }}
                />
                <label htmlFor="fileInput" className="etc-01-simple-upload-btn">
                  파일 선택
                </label>
                {selectedFile && (
                  <div className="etc-01-simple-file-info">
                    <p>✅ {selectedFile.name}</p>
                    <p>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 이미지 업로드 (고급 방식 - 드래그 앤 드롭 + 미리보기) */}
          {inputMode === 'upload' && (
            <div 
              className="etc-01-upload-area"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              {previewUrl ? (
                <div className="etc-01-preview">
                  <img src={previewUrl} alt="업로드된 이미지" />
                  <div className="etc-01-preview-overlay">
                    <p>이미지가 선택되었습니다</p>
                    <div className="etc-01-preview-info">
                      <p>📁 {selectedFile?.name}</p>
                      <p>📏 {(selectedFile?.size || 0) / 1024 / 1024 < 1 
                        ? `${((selectedFile?.size || 0) / 1024).toFixed(1)} KB`
                        : `${((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB`}
                      </p>
                    </div>
                    <button 
                      className="etc-01-change-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        startNewAnalysis();
                      }}
                    >
                      다른 이미지 선택
                    </button>
                  </div>
                </div>
              ) : (
                <div className="etc-01-upload-placeholder">
                  <div className="etc-01-upload-icon">📷</div>
                  <h3>드래그 앤 드롭으로 이미지 업로드</h3>
                  <p>이미지를 여기로 드래그하거나 클릭하여 파일을 선택하세요</p>
                  <div className="etc-01-upload-features">
                    <div className="etc-01-feature-item">
                      <span className="etc-01-feature-icon">🎯</span>
                      <span>드래그 앤 드롭 지원</span>
                    </div>
                    <div className="etc-01-feature-item">
                      <span className="etc-01-feature-icon">👁️</span>
                      <span>실시간 미리보기</span>
                    </div>
                    <div className="etc-01-feature-item">
                      <span className="etc-01-feature-icon">📊</span>
                      <span>파일 정보 표시</span>
                    </div>
                  </div>
                  <div className="etc-01-upload-info">
                    <p>• 지원 형식: JPG, PNG, GIF</p>
                    <p>• 최대 크기: 10MB</p>
                    <p>• 영어 문제 이미지 권장</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="etc-01-error">
              <p>❌ {error}</p>
            </div>
          )}

          {/* 분석 버튼 */}
          {selectedFile && (
            <div className="etc-01-analyze-section">
              <button 
                className="etc-01-analyze-btn"
                onClick={() => setShowPointModal(true)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? '분석 중...' : '문제 분석 시작'}
              </button>
              
              {progress && (
                <div className="etc-01-progress">
                  <p>{progress}</p>
                </div>
              )}
            </div>
          )}

          {/* 텍스트 해석 버튼 */}
          {inputMode === 'text' && englishText.trim() && (
            <div className="etc-01-analyze-section">
              <button 
                className="etc-01-analyze-btn"
                onClick={() => setShowPointModal(true)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? '해석 중...' : '영어 본문 해석 시작'}
              </button>
              
              {progress && (
                <div className="etc-01-progress">
                  <p>{progress}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="etc-01-result-section">
          {/* 분석 결과 */}
          <div className="etc-01-result-header">
            <h2>📋 분석 결과</h2>
            <div className="etc-01-result-actions">
              <button 
                className="etc-01-new-analysis-btn"
                onClick={startNewAnalysis}
              >
                🔄 새 분석
              </button>
              <button 
                className="etc-01-action-btn primary"
                onClick={goToQuizList}
              >
                문제생성목록
              </button>
              {/* 파일 형식 선택 및 저장 버튼 */}
              <FileFormatSelector
                value={fileFormat}
                onChange={setFileFormat}
              />
              {fileFormat === 'pdf' ? (
                <button
                  type="button"
                  onClick={handlePrintAnswer}
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
              ) : (
                <button
                  type="button"
                  onClick={handlePrintAnswer}
                  style={{
                    width: '130px',
                    height: '48px',
                    padding: '0.75rem 1rem',
                    fontSize: '11pt',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  💾 저장 (정답)
                </button>
              )}
            </div>
          </div>

          {/* 영어 본문 */}
          <div className="etc-01-text-section">
            <h3>📖 영어 본문</h3>
            <div className="etc-01-text-content">
              {analysisResult.englishText}
            </div>
          </div>

          {/* 한글 해석 */}
          <div className="etc-01-text-section">
            <h3>🇰🇷 한글 해석</h3>
            <div className="etc-01-text-content korean">
              {analysisResult.koreanTranslation}
            </div>
          </div>

          

          {/* 인쇄 버튼은 상단 액션 영역으로 이동함 */}
        </div>
      )}
      
      {/* 인쇄 페이지 */}
      {printMode !== 'none' && analysisResult && (
        <div className="only-print">
          <div className="a4-page-template">
            <div className="a4-page-header">
              <PrintHeaderWork01 />
            </div>
            <div className="a4-page-content">
              <div className="quiz-content">
                <div className="problem-instruction" style={{
                  fontWeight: 800, 
                  fontSize: '12pt', 
                  background: '#222', 
                  color: '#fff', 
                  padding: '0.55rem 0.65rem', 
                  borderRadius: '8px', 
                  marginBottom: '0.65rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  width: '100%'
                }}>
                  <span>영어 본문 추출 결과 및 한글해석</span>
                  <span style={{fontSize: '0.9rem', fontWeight: '700', color: '#FFD700'}}>ETC#01</span>
                </div>
                
                <div className="print-content-section">
                  <div className="print-section-title" style={{
                    fontSize: '12pt',
                    fontWeight: 'bold',
                    marginBottom: '8pt',
                    color: '#2d3a60',
                    borderBottom: '2px solid #6a5acd',
                    paddingBottom: '4pt'
                  }}>
                    📖 영어 본문
                  </div>
                  <div className="print-text-content" style={{
                    fontSize: '12pt',
                    lineHeight: '1.65',
                    textAlign: 'justify',
                    marginBottom: '10pt'
                  }}>
                    {analysisResult.englishText}
                  </div>
                </div>
                
                <div className="print-divider" style={{
                  borderTop: '1px solid #ddd',
                  margin: '10pt 0'
                }}></div>
                
                <div className="print-content-section">
                  <div className="print-section-title" style={{
                    fontSize: '12pt',
                    fontWeight: 'bold',
                    marginBottom: '8pt',
                    color: '#2d3a60',
                    borderBottom: '2px solid #6a5acd',
                    paddingBottom: '4pt'
                  }}>
                    🇰🇷 한글 해석
                  </div>
                  <div className="print-text-content korean" style={{
                    fontSize: '12pt',
                    lineHeight: '1.65',
                    textAlign: 'justify',
                    marginBottom: 0,
                    color: '#1976d2',
                    fontWeight: '500'
                  }}>
                    {analysisResult.koreanTranslation}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isAnalyzing && (
        <div className="centered-hourglass-overlay">
          <div className="centered-hourglass-content">
            <div className="centered-hourglass-spinner">⏳</div>
            <div className="loading-text">
              {progress || 'AI가 문제를 분석 중입니다...'}
            </div>
          </div>
        </div>
      )}
      
      {/* 화면 캡처 도움말 모달 */}
      <ScreenshotHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* 포인트 차감 확인 모달 */}
      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={() => {
          setShowPointModal(false);
          if (selectedFile) analyzeProblem();
          else translateEnglishText();
        }}
        workTypeName={WORK_TYPE_NAME}
        pointsToDeduct={pointsToDeduct}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - pointsToDeduct}
      />
    </div>
  );
};

export default Etc_01_ImageProblemAnalyzer;
