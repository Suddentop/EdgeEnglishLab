import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import './Work_07_MainIdeaInference.css';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../../../styles/PrintFormat.css';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import { callOpenAI } from '../../../services/common';

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

// A4 페이지 설정 (실제 A4 크기 기준, px 단위)
const A4_CONFIG = {
  // 실제 A4 크기: 210mm × 297mm = 794px × 1123px (96 DPI)
  PAGE_WIDTH: 794,          // px (210mm * 3.78px/mm)
  PAGE_HEIGHT: 1123,        // px (297mm * 3.78px/mm)
  
  // 인쇄 여백 (실제 인쇄 시 표준 여백)
  TOP_MARGIN: 25,           // px (6.6mm)
  BOTTOM_MARGIN: 25,        // px (6.6mm)
  LEFT_MARGIN: 20,          // px (5.3mm)
  RIGHT_MARGIN: 20,         // px (5.3mm)
  
  // 헤더/푸터 영역
  HEADER_HEIGHT: 30,        // px (8mm)
  FOOTER_HEIGHT: 20,        // px (5.3mm)
  
  // 콘텐츠 영역 계산
  CONTENT_WIDTH: 754,       // px (794 - 20 - 20)
  CONTENT_HEIGHT: 1048,     // px (1123 - 25 - 25 - 30 - 20)
  
  // 섹션별 높이 설정
  INSTRUCTION_HEIGHT: 30,   // px
  INSTRUCTION_MARGIN: 11,   // px
  TRANSLATION_HEADER_HEIGHT: 30,  // px
  TRANSLATION_HEADER_MARGIN: 11,  // px
  OPTIONS_HEADER_HEIGHT: 30,      // px
  OPTIONS_HEADER_MARGIN: 11,      // px
};

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
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // 페이지 분할 정보 상태
  const [pageLayoutInfo, setPageLayoutInfo] = useState({
    needsSecondPage: false,
    needsThirdPage: false,
    page1Content: '',
    page2Content: '',
    page3Content: ''
  });
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);

  // 텍스트 높이 계산 함수 (실제 A4 크기 기준)
  const calculateContainerHeight = (text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number => {
    // 실제 A4 콘텐츠 너비 사용 (754px - 좌우 패딩 40px = 714px)
    const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40; // px
    const charWidthPx = fontSize * 0.55; // px 단위 문자 폭
    const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
    const lines = Math.ceil(text.length / charsPerLine);
    return (lines * fontSize * lineHeight) + padding; // px 단위로 반환
  };

  // 인쇄(정답) 페이지 분할 계산 함수 (유형#03과 동일한 로직)
  const calculateAnswerPageLayout = () => {
    if (!quiz) return;

    // A. 문제 제목 + 영어 본문 컨테이너
    const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN; // 41px
    const englishPassageHeight = calculateContainerHeight(quiz.passage, 38, 16, 1.7);
    const sectionAHeight = problemTitleHeight + englishPassageHeight;

    // B. 4지선다 선택항목 컨테이너
    const optionsHeaderHeight = A4_CONFIG.OPTIONS_HEADER_HEIGHT + A4_CONFIG.OPTIONS_HEADER_MARGIN; // 41px
    let optionsHeight = 0;
    quiz.options.forEach(option => {
      optionsHeight += calculateContainerHeight(`${option} (정답)`, 11, 16, 1.3);
    });
    const sectionBHeight = optionsHeaderHeight + optionsHeight;

    // C. 본문해석 제목 + 한글 해석 컨테이너
    const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT + A4_CONFIG.TRANSLATION_HEADER_MARGIN; // 41px
    const translatedText = quiz.translation || '본문 해석이 생성되지 않았습니다.';
    const translationHeight = calculateContainerHeight(translatedText, 38, 16, 1.7);
    const sectionCHeight = translationHeaderHeight + translationHeight;

    // 이용 가능한 공간 계산 (실제 A4 크기 기준)
    const availableHeight = A4_CONFIG.CONTENT_HEIGHT; // 1048px
    const safetyMargin = 50; // px (실제 A4 기준 적절한 여백)
    const effectiveAvailableHeight = availableHeight - safetyMargin; // 998px

    const totalHeight = sectionAHeight + sectionBHeight + sectionCHeight;

    console.log('📏 유형#07 인쇄(정답) 동적 페이지 분할 계산:', {
      availableHeight: availableHeight.toFixed(2) + 'px',
      sectionAHeight: sectionAHeight.toFixed(2) + 'px',
      sectionBHeight: sectionBHeight.toFixed(2) + 'px',
      sectionCHeight: sectionCHeight.toFixed(2) + 'px',
      totalHeight: totalHeight.toFixed(2) + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
      quizTextLength: quiz.passage.length,
      translationTextLength: translatedText.length
    });

    // 페이지 분할 로직 (유형#03과 동일한 4가지 케이스)
    if (totalHeight <= effectiveAvailableHeight) {
      // 케이스 1: A+B+C ≤ 998px → 1페이지에 A, B, C 모두 포함
      setPageLayoutInfo({
        needsSecondPage: false,
        needsThirdPage: false,
        page1Content: 'A+B+C',
        page2Content: '',
        page3Content: ''
      });
    } else if (sectionAHeight + sectionBHeight <= effectiveAvailableHeight) {
      // 케이스 2: A+B+C > 998px, A+B ≤ 998px → 1페이지에 A+B 포함, 2페이지에 C 포함
      if (sectionCHeight <= effectiveAvailableHeight) {
        setPageLayoutInfo({
          needsSecondPage: true,
          needsThirdPage: false,
          page1Content: 'A+B',
          page2Content: 'C',
          page3Content: ''
        });
      } else {
        setPageLayoutInfo({
          needsSecondPage: true,
          needsThirdPage: true,
          page1Content: 'A+B',
          page2Content: 'C-part1',
          page3Content: 'C-part2'
        });
      }
    } else if (sectionAHeight <= effectiveAvailableHeight) {
      // 케이스 3: A+B+C > 998px, A+B > 998px, A ≤ 998px → 1페이지에 A 포함, 2페이지에 B+C 포함
      if (sectionBHeight + sectionCHeight <= effectiveAvailableHeight) {
        setPageLayoutInfo({
          needsSecondPage: true,
          needsThirdPage: false,
          page1Content: 'A',
          page2Content: 'B+C',
          page3Content: ''
        });
      } else {
        setPageLayoutInfo({
          needsSecondPage: true,
          needsThirdPage: true,
          page1Content: 'A',
          page2Content: 'B',
          page3Content: 'C'
        });
      }
    } else {
      // 케이스 4: A+B+C > 998px, A+B > 998px, A > 998px → 1페이지에 A 포함, 2페이지에 B 포함, 3페이지에 C 포함
      setPageLayoutInfo({
        needsSecondPage: true,
        needsThirdPage: true,
        page1Content: 'A',
        page2Content: 'B',
        page3Content: 'C'
      });
    }
  };

  // 인쇄(문제) 페이지 분할 계산 함수 (2섹션 로직)
  const calculateProblemPageLayout = () => {
    if (!quiz) return;

    // A. 문제 제목 + 영어 본문 컨테이너
    const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN; // 41px
    const englishPassageHeight = calculateContainerHeight(quiz.passage, 38, 16, 1.7);
    const sectionAHeight = problemTitleHeight + englishPassageHeight;

    // B. 4지선다 선택항목 컨테이너
    let optionsHeight = 0;
    quiz.options.forEach(option => {
      optionsHeight += calculateContainerHeight(option, 11, 16, 1.3);
    });
    const sectionBHeight = optionsHeight;

    // 이용 가능한 공간 계산 (실제 A4 크기 기준)
    const availableHeight = A4_CONFIG.CONTENT_HEIGHT; // 1048px
    const safetyMargin = 50; // px (실제 A4 기준 적절한 여백)
    const effectiveAvailableHeight = availableHeight - safetyMargin; // 998px

    const totalHeight = sectionAHeight + sectionBHeight;

    console.log('📏 유형#07 인쇄(문제) 동적 페이지 분할 계산 (2섹션):', {
      availableHeight: availableHeight.toFixed(2) + 'px',
      sectionAHeight: sectionAHeight.toFixed(2) + 'px',
      sectionBHeight: sectionBHeight.toFixed(2) + 'px',
      totalHeight: totalHeight.toFixed(2) + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
      quizTextLength: quiz.passage.length
    });

    // 페이지 분할 로직 (2가지 케이스)
    if (totalHeight <= effectiveAvailableHeight) {
      // 케이스 1: A+B ≤ 998px → 1페이지에 A, B 모두 포함
      setPageLayoutInfo({
        needsSecondPage: false,
        needsThirdPage: false,
        page1Content: 'A+B',
        page2Content: '',
        page3Content: ''
      });
    } else {
      // 케이스 2: A+B > 998px → 1페이지에 A 포함, 2페이지에 B 포함
      setPageLayoutInfo({
        needsSecondPage: true,
        needsThirdPage: false,
        page1Content: 'A',
        page2Content: 'B',
        page3Content: ''
      });
    }
  };

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

  // 페이지 분할 계산 실행
  useEffect(() => {
    if (quiz) {
      if (printMode === 'with-answer' && quiz.translation) {
        calculateAnswerPageLayout();
      } else if (printMode === 'no-answer') {
        calculateProblemPageLayout();
      }
    }
  }, [quiz, quiz?.translation, printMode]);

  // 공통 인쇄(정답) 레이아웃 렌더링 함수 (유형#03과 동일한 조건부 렌더링)
  const renderPrintWithAnswerLayout = () => {
    if (!quiz) return null;

    const commonStyles = {
      instruction: {fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'},
      passage: {marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'},
      options: {margin:'1rem 0'},
      option: {fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'},
      optionTranslation: {fontSize:'0.9rem', marginTop:'0.2rem', color:'#333', fontWeight:500, paddingLeft:'1.5rem'},
      translation: {marginTop:'0.9rem', fontSize:'0.5rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}
    };

    // 1페이지 렌더링
    const renderPage1 = () => (
      <div className="a4-page-template">
        <div className="a4-page-header">
          <PrintHeaderWork01 />
        </div>
        <div className="a4-page-content">
          <div className="quiz-content">
            {/* A. 문제 제목 + 영어 본문 컨테이너 */}
            {(pageLayoutInfo.page1Content.includes('A') || pageLayoutInfo.page1Content === 'A') && (
              <>
                <div className="problem-instruction" style={{...commonStyles.instruction, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span>다음 글의 주제로 가장 적절한 것을 고르시오.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
                </div>
                <div style={commonStyles.passage}>
                  {quiz.passage}
                </div>
              </>
            )}

            {/* B. 4지선다 선택항목 컨테이너 */}
            {(pageLayoutInfo.page1Content.includes('B') || pageLayoutInfo.page1Content === 'B') && (
              <div className="problem-options" style={commonStyles.options}>
                {quiz.options.map((opt, i) => (
                  <div key={i} style={commonStyles.option}>
                    <div>
                      {`①②③④⑤`[i] || `${i+1}.`} {opt}
                      {quiz.answerIndex === i && (
                        <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}>(정답)</span>
                      )}
                    </div>
                    <div style={commonStyles.optionTranslation}>
                      {quiz.optionTranslations && quiz.optionTranslations[i] ? quiz.optionTranslations[i] : '해석 없음'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* C. 본문해석 제목 + 한글 해석 컨테이너 */}
            {(pageLayoutInfo.page1Content.includes('C') || pageLayoutInfo.page1Content === 'C') && (
              <>
                <div className="problem-instruction" style={commonStyles.instruction}>
                  본문 해석
                </div>
                <div className="problem-passage translation" style={commonStyles.translation}>
                  {quiz.translation && quiz.translation.trim().length > 0 
                    ? quiz.translation 
                    : '본문 해석이 생성되지 않았습니다.'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );

    // 2페이지 렌더링
    const renderPage2 = () => (
      <div className="a4-page-template">
        <div className="a4-page-header">
          <PrintHeaderWork01 />
        </div>
        <div className="a4-page-content">
          <div className="quiz-content">
            {/* B. 4지선다 선택항목 컨테이너 */}
            {(pageLayoutInfo.page2Content.includes('B') || pageLayoutInfo.page2Content === 'B') && (
              <div className="problem-options" style={commonStyles.options}>
                {quiz.options.map((opt, i) => (
                  <div key={i} style={commonStyles.option}>
                    <div>
                      {`①②③④⑤`[i] || `${i+1}.`} {opt}
                      {quiz.answerIndex === i && (
                        <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}>(정답)</span>
                      )}
                    </div>
                    <div style={commonStyles.optionTranslation}>
                      {quiz.optionTranslations && quiz.optionTranslations[i] ? quiz.optionTranslations[i] : '해석 없음'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* C. 본문해석 제목 + 한글 해석 컨테이너 */}
            {(pageLayoutInfo.page2Content.includes('C') || pageLayoutInfo.page2Content === 'C') && (
              <>
                <div className="problem-instruction" style={commonStyles.instruction}>
                  본문 해석
                </div>
                <div className="problem-passage translation" style={commonStyles.translation}>
                  {quiz.translation && quiz.translation.trim().length > 0 
                    ? quiz.translation 
                    : '본문 해석이 생성되지 않았습니다.'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );

    // 3페이지 렌더링
    const renderPage3 = () => (
      <div className="a4-page-template">
        <div className="a4-page-header">
          <PrintHeaderWork01 />
        </div>
        <div className="a4-page-content">
          <div className="quiz-content">
            {/* C. 본문해석 제목 + 한글 해석 컨테이너 */}
            {(pageLayoutInfo.page3Content.includes('C') || pageLayoutInfo.page3Content === 'C') && (
              <>
                <div className="problem-instruction" style={commonStyles.instruction}>
                  본문 해석
                </div>
                <div className="problem-passage translation" style={commonStyles.translation}>
                  {quiz.translation && quiz.translation.trim().length > 0 
                    ? quiz.translation 
                    : '본문 해석이 생성되지 않았습니다.'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );

    // 페이지 분할에 따른 조건부 렌더링
    if (!pageLayoutInfo.needsSecondPage && !pageLayoutInfo.needsThirdPage) {
      // 1페이지만
      return renderPage1();
    } else if (pageLayoutInfo.needsSecondPage && !pageLayoutInfo.needsThirdPage) {
      // 2페이지
      return (
        <>
          {renderPage1()}
          {renderPage2()}
        </>
      );
    } else {
      // 3페이지
      return (
        <>
          {renderPage1()}
          {renderPage2()}
          {renderPage3()}
        </>
      );
    }
  };

  // 인쇄(문제) 레이아웃 렌더링 함수 (2섹션 로직)
  const renderPrintProblemLayout = () => {
    if (!quiz) return null;

    const commonStyles = {
      instruction: {fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'},
      passage: {marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'},
      options: {margin:'1rem 0'},
      option: {fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'}
    };

    // 1페이지 렌더링
    const renderPage1 = () => (
      <div className="a4-page-template">
        <div className="a4-page-header">
          <PrintHeaderWork01 />
        </div>
        <div className="a4-page-content">
          <div className="quiz-content">
            {/* A. 문제 제목 + 영어 본문 컨테이너 */}
            {(pageLayoutInfo.page1Content.includes('A') || pageLayoutInfo.page1Content === 'A') && (
              <>
                <div className="problem-instruction" style={commonStyles.instruction}>
                  <span>다음 글의 주제로 가장 적절한 것을 고르시오.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
                </div>
                <div style={commonStyles.passage}>
                  {quiz.passage}
                </div>
              </>
            )}

            {/* B. 4지선다 선택항목 컨테이너 */}
            {(pageLayoutInfo.page1Content.includes('B') || pageLayoutInfo.page1Content === 'B') && (
              <div className="problem-options" style={commonStyles.options}>
                {quiz.options.map((opt, i) => (
                  <div key={i} style={commonStyles.option}>
                    {`①②③④⑤`[i] || `${i+1}.`} {opt}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    // 2페이지 렌더링
    const renderPage2 = () => (
      <div className="a4-page-template">
        <div className="a4-page-header">
          <PrintHeaderWork01 />
        </div>
        <div className="a4-page-content">
          <div className="quiz-content">
            {/* B. 4지선다 선택항목 컨테이너 */}
            {(pageLayoutInfo.page2Content.includes('B') || pageLayoutInfo.page2Content === 'B') && (
              <div className="problem-options" style={commonStyles.options}>
                {quiz.options.map((opt, i) => (
                  <div key={i} style={commonStyles.option}>
                    {`①②③④⑤`[i] || `${i+1}.`} {opt}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    // 페이지 분할에 따른 조건부 렌더링
    if (!pageLayoutInfo.needsSecondPage) {
      // 1페이지만
      return renderPage1();
    } else {
      // 2페이지
      return (
        <>
          {renderPage1()}
          {renderPage2()}
        </>
      );
    }
  };

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
    // 텍스트 모드나 이미지 파일 업로드 모드일 때는 기본 동작 허용 (텍스트 붙여넣기)
    if (inputMode !== 'capture') {
      return;
    }
    
    // 캡처 모드일 때만 이미지 처리
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
    // 이미지를 찾지 못했을 때는 기본 동작 허용 (텍스트 붙여넣기 가능)
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
    // const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const prompt = `영어문제로 사용되는 본문이야.
이 이미지의 내용을 수작업으로 정확히 읽고, 영어 본문만 추려내서 보여줘.
글자는 인쇄글씨체 이외에 손글씨나 원, 밑줄 등 표시되어있는 것은 무시해. 
본문중에 원문자 1, 2, 3... 등으로 표시된건 제거해줘. 
원문자 제거후 줄을 바꾸거나 문단을 바꾸지말고, 전체가 한 문단으로 구성해줘. 
영어 본문만, 아무런 설명이나 안내문 없이, 한 문단으로만 출력해줘.`;
    const response = await callOpenAI({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: base64 } }
            ]
          }
        ],
        max_tokens: 2048
    });
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async function generateMainIdeaQuizWithAI(passage: string): Promise<MainIdeaQuiz> {
    // const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const prompt = `아래 영어 본문을 읽고, **대한민국 고등학교 교육과정 수학능력평가(수능) 수준**의 주제 추론 문제를 만들어주세요. 글의 주제를 가장 잘 요약하는 문장/구 1개를 선정하되, **수능 수준의 추론 능력을 평가할 수 있는** 주제 요약을 선택하세요.

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
    const response = await callOpenAI({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3 // 더 낮은 temperature로 일관성 향상
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
    
    // 선택지 섞기 및 정답 위치 랜덤화
    const shuffledResult = shuffleOptionsAndUpdateAnswerIndex(result);
    
    return shuffledResult;
  }

  // 선택지 섞기 및 정답 위치 랜덤화 함수
  function shuffleOptionsAndUpdateAnswerIndex(quiz: MainIdeaQuiz): MainIdeaQuiz {
    // 원본 정답과 해석 저장
    const originalAnswer = quiz.options[quiz.answerIndex];
    const originalAnswerTranslation = quiz.answerTranslation;
    const originalAnswerTranslationInArray = quiz.optionTranslations[quiz.answerIndex];
    
    // 정답을 제외한 나머지 선택지들
    const wrongOptions = quiz.options.filter((_, index) => index !== quiz.answerIndex);
    const wrongTranslations = quiz.optionTranslations.filter((_, index) => index !== quiz.answerIndex);
    
    // 정답을 랜덤한 위치에 배치 (0~4 중 하나)
    const newAnswerIndex = Math.floor(Math.random() * 5);
    
    // 새로운 배열 생성 (5개 슬롯)
    const newOptions = new Array(5);
    const newOptionTranslations = new Array(5);
    
    // 정답을 지정된 위치에 배치
    newOptions[newAnswerIndex] = originalAnswer;
    newOptionTranslations[newAnswerIndex] = originalAnswerTranslationInArray;
    
    // 나머지 위치에 오답들을 랜덤하게 배치
    const remainingIndices = [];
    for (let i = 0; i < 5; i++) {
      if (i !== newAnswerIndex) {
        remainingIndices.push(i);
      }
    }
    
    // 오답들을 랜덤하게 섞어서 배치
    for (let i = wrongOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wrongOptions[i], wrongOptions[j]] = [wrongOptions[j], wrongOptions[i]];
      [wrongTranslations[i], wrongTranslations[j]] = [wrongTranslations[j], wrongTranslations[i]];
    }
    
    // 오답들을 남은 위치에 배치
    let wrongIndex = 0;
    for (const index of remainingIndices) {
      newOptions[index] = wrongOptions[wrongIndex];
      newOptionTranslations[index] = wrongTranslations[wrongIndex];
      wrongIndex++;
    }
    
    console.log('🎲 선택지 섞기 완료:', {
      originalAnswerIndex: quiz.answerIndex,
      newAnswerIndex: newAnswerIndex,
      originalAnswer: originalAnswer,
      shuffledOptions: newOptions,
      randomSeed: Math.random()
    });
    
    return {
      ...quiz,
      options: newOptions,
      optionTranslations: newOptionTranslations,
      answerIndex: newAnswerIndex,
      answerTranslation: originalAnswerTranslation
    };
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
    // const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
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
    const response = await callOpenAI({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.1 // 재시도 시 매우 낮은 temperature로 일관성 극대화
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
    
    // 선택지 섞기 및 정답 위치 랜덤화
    const shuffledResult = shuffleOptionsAndUpdateAnswerIndex(result);
    
    return shuffledResult;
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

      // 문제 생성 내역 저장
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          const workTypePoint = workTypePoints.find(wt => wt.id === '7');
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '07',
            workTypeName: getWorkTypeName('07'),
            points: workTypePoint?.points || 0,
            inputText: passage,
            quizData: quizData,
            status: 'success'
          });
          console.log('✅ Work_07 내역 저장 완료');
        } catch (historyError) {
          console.error('❌ Work_07 내역 저장 실패:', historyError);
        }
      }
      
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
                background: 'linear-gradient(135deg, #bef264 0%, #a3e635 100%)',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(190, 242, 100, 0.25)',
                transition: 'all 0.3s ease'
              }}>새문제</button>
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
            {renderPrintProblemLayout()}
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