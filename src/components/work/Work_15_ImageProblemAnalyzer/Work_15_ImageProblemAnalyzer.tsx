import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import { imageToTextWithOpenAIVision } from '../../../services/work14Service';
import { translateToKorean as translateToKoreanCommon } from '../../../services/common';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { getUserCurrentPoints, getWorkTypePoints, deductUserPoints, refundUserPoints } from '../../../services/pointService';
import { saveQuizHistory } from '../../../services/quizHistoryService';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import './Work_15_ImageProblemAnalyzer.css';
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

const Work_15_ImageProblemAnalyzer: React.FC = () => {
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

  // 포인트 관련 상태 (유형#15)
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
    console.log('📋 붙여넣기 이벤트 발생:', { inputMode, clipboardItems: e.clipboardData.items.length });
    
    if (inputMode !== 'capture') {
      console.log('❌ 캡처 모드가 아님:', inputMode);
      return;
    }
    
    const items = e.clipboardData.items;
    console.log('📋 클립보드 아이템 수:', items.length);
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`📋 아이템 ${i}:`, { type: item.type, kind: item.kind });
      
      if (item.type.indexOf('image') !== -1) {
        console.log('✅ 이미지 발견!');
        const file = item.getAsFile();
        if (file) {
          console.log('✅ 파일 생성 성공:', { name: file.name, size: file.size, type: file.type });
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
        }
        break;
      }
    }
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

  const canUseDirectOpenAI = Boolean(process.env.REACT_APP_OPENAI_API_KEY);

  const analyzeImageWithOpenAILocally = async (base64Image: string, extractedText: string): Promise<ProblemAnalysisResult> => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API Key가 설정되어 있지 않습니다.');
    }

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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        max_tokens: 1200,
        temperature: 0.5
      })
    });

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
    const PHP_API_BASE_URL = getPhpApiBaseUrl();
    const useDirectFallback = canUseDirectOpenAI && window.location.hostname === 'localhost';
    
    console.log('🖼️ 이미지 분석 요청 시작:', {
      url: `${PHP_API_BASE_URL}/analyze-problem-image.php`,
      imageSize: base64Image.length,
      extractedTextLength: extractedText?.length || 0,
      userId: currentUser?.uid
    });
    
    try {
    const response = await fetch(`${PHP_API_BASE_URL}/analyze-problem-image.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        extractedText: extractedText || '',
        userId: currentUser?.uid,
      }),
    });

    console.log('🖼️ 이미지 분석 응답 상태:', response.status);

    if (!response.ok) {
      let errorMessage = 'AI 분석 요청 실패';
      try {
        const errorData = await response.json();
        console.error('🖼️ 이미지 분석 에러 상세:', errorData);
        errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      } catch (parseError) {
        console.error('🖼️ 에러 응답 파싱 실패:', parseError);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('🖼️ 이미지 분석 성공:', result);
    
    if (!result.success || !result.data) {
      throw new Error('AI 분석 결과가 올바르지 않습니다.');
    }
    
    return result.data;
    } catch (error) {
      if (useDirectFallback) {
        console.warn('⚠️ 원격 이미지 분석 실패, 로컬 OpenAI 호출로 전환합니다.', error);
        return await analyzeImageWithOpenAILocally(base64Image, extractedText || '');
      }
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

  return (
    <div className={`work-15-container${printMode !== 'none' ? ' print-mode-active' : ''}`} onPaste={handlePaste}>
      <div className="work-15-header">
        <h1>📦 본문 해석 및 추출</h1>
        <p className="work-15-description">
          영어 문제 이미지를 업로드하면 AI가 문제를 분석하고 본문 해석을 제공합니다.
        </p>
      </div>

      {!analysisResult ? (
        <div className="work-15-upload-section">
          {/* 입력 방식 선택 */}
          <div className="work-15-input-type-section">
            {INPUT_MODES.map((mode) => (
              <div key={mode.key} className="work-15-input-mode-card">
                <label className="work-15-input-mode-label">
                  <div className="work-15-input-mode-header">
                    <input
                      type="radio"
                      name="inputMode"
                      checked={inputMode === mode.key}
                      onChange={() => handleInputModeChange(mode.key)}
                    />
                    <div className="work-15-input-mode-title">{mode.label}</div>
                    {mode.key === 'capture' && (
                      <button
                        type="button"
                        className="work-15-help-btn"
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
                  <div className="work-15-input-mode-description">{mode.description}</div>
                </label>
              </div>
            ))}
          </div>

          {/* 영어 본문 직접 붙여넣기 */}
          {inputMode === 'text' && (
            <div className="work-15-text-input-area">
              <textarea
                className="work-15-text-input"
                placeholder="여기에 영어 본문을 붙여넣거나 직접 입력하세요..."
                value={englishText}
                onChange={(e) => setEnglishText(e.target.value)}
                rows={12}
              />
              {englishText.trim() && (
                <div className="work-15-text-input-info">
                  <p>✅ 영어 본문 입력 완료 ({englishText.trim().length}자)</p>
                </div>
              )}
            </div>
          )}

          {/* 캡처화면 붙여넣기 */}
          {inputMode === 'capture' && (
            <div>
              <div
                className={`work-15-paste-area${isPasteFocused ? ' paste-focused' : ''}${selectedFile ? ' paste-success' : ''}`}
                tabIndex={0}
                onClick={() => setIsPasteFocused(true)}
                onFocus={() => setIsPasteFocused(true)}
                onBlur={() => setIsPasteFocused(false)}
                onPaste={handlePaste}
              >
                {selectedFile ? (
                  <div className="work-15-paste-success">
                    <div className="work-15-paste-success-icon">✅</div>
                    <div className="work-15-paste-success-text">이미지가 성공적으로 붙여졌습니다!</div>
                    <div className="work-15-paste-file-info">
                      <p>📁 {selectedFile.name}</p>
                      <p>📏 {(selectedFile.size / 1024 / 1024) < 1 
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                        : `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
                      </p>
                    </div>
                    <div className="work-15-paste-success-actions">
                      <button 
                        className="work-15-change-btn"
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
                    <div className="work-15-paste-icon">📋</div>
                    <div className="work-15-paste-text">Ctrl+V로 캡처한 이미지를 붙여넣으세요</div>
                    <div className="work-15-paste-desc">스크린샷이나 사진을 클립보드에 복사한 후 여기에 붙여넣기 하세요</div>
                    <div className="work-15-paste-tip">
                      💡 <b>팁:</b> 화면 캡처 후 Ctrl+V로 붙여넣기
                    </div>
                    {isAnalyzing && (
                      <div className="work-15-processing">
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
            <div className="work-15-simple-upload">
              <div className="work-15-simple-upload-content">
                <div className="work-15-simple-upload-icon">📁</div>
                <div className="work-15-simple-upload-text">
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
                <label htmlFor="fileInput" className="work-15-simple-upload-btn">
                  파일 선택
                </label>
                {selectedFile && (
                  <div className="work-15-simple-file-info">
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
              className="work-15-upload-area"
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
                <div className="work-15-preview">
                  <img src={previewUrl} alt="업로드된 이미지" />
                  <div className="work-15-preview-overlay">
                    <p>이미지가 선택되었습니다</p>
                    <div className="work-15-preview-info">
                      <p>📁 {selectedFile?.name}</p>
                      <p>📏 {(selectedFile?.size || 0) / 1024 / 1024 < 1 
                        ? `${((selectedFile?.size || 0) / 1024).toFixed(1)} KB`
                        : `${((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB`}
                      </p>
                    </div>
                    <button 
                      className="work-15-change-btn"
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
                <div className="work-15-upload-placeholder">
                  <div className="work-15-upload-icon">📷</div>
                  <h3>드래그 앤 드롭으로 이미지 업로드</h3>
                  <p>이미지를 여기로 드래그하거나 클릭하여 파일을 선택하세요</p>
                  <div className="work-15-upload-features">
                    <div className="work-15-feature-item">
                      <span className="work-15-feature-icon">🎯</span>
                      <span>드래그 앤 드롭 지원</span>
                    </div>
                    <div className="work-15-feature-item">
                      <span className="work-15-feature-icon">👁️</span>
                      <span>실시간 미리보기</span>
                    </div>
                    <div className="work-15-feature-item">
                      <span className="work-15-feature-icon">📊</span>
                      <span>파일 정보 표시</span>
                    </div>
                  </div>
                  <div className="work-15-upload-info">
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
            <div className="work-15-error">
              <p>❌ {error}</p>
            </div>
          )}

          {/* 분석 버튼 */}
          {selectedFile && (
            <div className="work-15-analyze-section">
              <button 
                className="work-15-analyze-btn"
                onClick={() => setShowPointModal(true)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? '분석 중...' : '문제 분석 시작'}
              </button>
              
              {progress && (
                <div className="work-15-progress">
                  <p>{progress}</p>
                </div>
              )}
            </div>
          )}

          {/* 텍스트 해석 버튼 */}
          {inputMode === 'text' && englishText.trim() && (
            <div className="work-15-analyze-section">
              <button 
                className="work-15-analyze-btn"
                onClick={() => setShowPointModal(true)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? '해석 중...' : '영어 본문 해석 시작'}
              </button>
              
              {progress && (
                <div className="work-15-progress">
                  <p>{progress}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="work-15-result-section">
          {/* 분석 결과 */}
          <div className="work-15-result-header">
            <h2>📋 분석 결과</h2>
            <div className="work-15-result-actions">
              <button 
                className="work-15-new-analysis-btn"
                onClick={startNewAnalysis}
              >
                🔄 새 분석
              </button>
              <button 
                className="work-15-action-btn primary"
                onClick={goToQuizList}
              >
                문제생성목록
              </button>
              {/* 인쇄 버튼을 우측 액션 영역으로 이동 */}
              <button 
                className="work-15-print-btn"
                onClick={() => {
                  // A4 세로형 인쇄 스타일 주입
                  const styleId = 'print-style-work15';
                  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
                  if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    styleEl.textContent = `
                      @page { margin: 0; size: A4 portrait; }
                      @media print { body { margin: 0; padding: 0; } }
                    `;
                    document.head.appendChild(styleEl);
                  }

                  // 현재 탭에서 인쇄용 화면 렌더
                  setPrintMode('problem');

                  // 인쇄 실행 후 정리
                  setTimeout(() => {
                    window.print();
                    setTimeout(() => {
                      const el = document.getElementById(styleId);
                      if (el && el.parentNode) el.parentNode.removeChild(el);
                      setPrintMode('none');
                    }, 200);
                  }, 100);
                }}
              >
                🖨️ 인쇄 (저장)
              </button>
            </div>
          </div>

          {/* 영어 본문 */}
          <div className="work-15-text-section">
            <h3>📖 영어 본문</h3>
            <div className="work-15-text-content">
              {analysisResult.englishText}
            </div>
          </div>

          {/* 한글 해석 */}
          <div className="work-15-text-section">
            <h3>🇰🇷 한글 해석</h3>
            <div className="work-15-text-content korean">
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
                  fontSize: '1rem', 
                  background: '#222', 
                  color: '#fff', 
                  padding: '0.7rem 0.5rem', 
                  borderRadius: '8px', 
                  marginBottom: '1.2rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  width: '100%'
                }}>
                  <span>영어 본문 추출 결과 및 한글해석</span>
                  <span style={{fontSize: '0.9rem', fontWeight: '700', color: '#FFD700'}}>유형#15</span>
                </div>
                
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
                  <div className="print-text-content" style={{
                    fontSize: '11pt',
                    lineHeight: '1.6',
                    textAlign: 'justify',
                    marginBottom: '12pt'
                  }}>
                    {analysisResult.englishText}
                  </div>
                </div>
                
                <div className="print-divider" style={{
                  borderTop: '1px solid #ddd',
                  margin: '15pt 0'
                }}></div>
                
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
                  <div className="print-text-content korean" style={{
                    fontSize: '11pt',
                    lineHeight: '1.6',
                    textAlign: 'justify',
                    marginBottom: '12pt',
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

export default Work_15_ImageProblemAnalyzer;
