import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import './Work_08_TitleInference.css';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../../../styles/PrintFormat.css';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';

const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];
type PrintMode = 'none' | 'no-answer' | 'with-answer';

interface TitleQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation?: string;
  optionTranslations?: string[];
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

const Work_08_TitleInference: React.FC = () => {
  const { userData, loading } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<TitleQuiz | null>(null);
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

  // 포인트 관련 초기화
  useEffect(() => {
    const initializePoints = async () => {
      try {
        const points = await getWorkTypePoints();
        setWorkTypePoints(points);
        
        // 유형#08의 포인트 설정
        const workType8Points = points.find(wt => wt.id === '8')?.points || 0;
        setPointsToDeduct(workType8Points);
        
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

    console.log('📏 유형#08 동적 페이지 분할 계산:', {
      availableHeight: availableHeight.toFixed(2) + 'px',
      sectionAHeight: sectionAHeight.toFixed(2) + 'px',
      sectionBHeight: sectionBHeight.toFixed(2) + 'px',
      sectionCHeight: sectionCHeight.toFixed(2) + 'px',
      totalHeight: totalHeight.toFixed(2) + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
      quizTextLength: quiz.passage.length,
      translationTextLength: translatedText.length
    });

    // 실제 A4 크기 기준 검증
    console.log('🔍 실제 A4 크기 기준 계산:', {
      A4_SIZE: '210mm × 297mm = 794px × 1123px (96 DPI)',
      CONTENT_AREA: A4_CONFIG.CONTENT_WIDTH + 'px × ' + A4_CONFIG.CONTENT_HEIGHT + 'px',
      TOP_MARGIN: A4_CONFIG.TOP_MARGIN + 'px',
      BOTTOM_MARGIN: A4_CONFIG.BOTTOM_MARGIN + 'px',
      LEFT_MARGIN: A4_CONFIG.LEFT_MARGIN + 'px',
      RIGHT_MARGIN: A4_CONFIG.RIGHT_MARGIN + 'px',
      HEADER_HEIGHT: A4_CONFIG.HEADER_HEIGHT + 'px',
      FOOTER_HEIGHT: A4_CONFIG.FOOTER_HEIGHT + 'px',
      availableHeight: availableHeight + 'px',
      safetyMargin: safetyMargin + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight + 'px'
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
    const optionsHeaderHeight = A4_CONFIG.OPTIONS_HEADER_HEIGHT + A4_CONFIG.OPTIONS_HEADER_MARGIN; // 41px
    let optionsHeight = 0;
    quiz.options.forEach(option => {
      optionsHeight += calculateContainerHeight(option, 11, 16, 1.3);
    });
    const sectionBHeight = optionsHeaderHeight + optionsHeight;

    // 이용 가능한 공간 계산 (실제 A4 크기 기준)
    const availableHeight = A4_CONFIG.CONTENT_HEIGHT; // 1048px
    const safetyMargin = 50; // px (실제 A4 기준 적절한 여백)
    const effectiveAvailableHeight = availableHeight - safetyMargin; // 998px

    const totalHeight = sectionAHeight + sectionBHeight;

    console.log('📏 유형#08 인쇄(문제) 페이지 분할 계산:', {
      availableHeight: availableHeight.toFixed(2) + 'px',
      sectionAHeight: sectionAHeight.toFixed(2) + 'px',
      sectionBHeight: sectionBHeight.toFixed(2) + 'px',
      totalHeight: totalHeight.toFixed(2) + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
      quizTextLength: quiz.passage.length
    });

    // 페이지 분할 로직 (2섹션: A+B)
    if (totalHeight <= effectiveAvailableHeight) {
      // A+B ≤ 998px → 1페이지에 A+B 모두 포함
      setPageLayoutInfo({
        needsSecondPage: false,
        needsThirdPage: false,
        page1Content: 'A+B',
        page2Content: '',
        page3Content: ''
      });
    } else {
      // A+B > 998px → 1페이지에 A 포함, 2페이지에 B 포함
      setPageLayoutInfo({
        needsSecondPage: true,
        needsThirdPage: false,
        page1Content: 'A',
        page2Content: 'B',
        page3Content: ''
      });
    }
  };

  // 페이지 분할 계산 실행
  useEffect(() => {
    if (quiz) {
      if (printMode === 'with-answer') {
        calculateAnswerPageLayout();
      } else if (printMode === 'no-answer') {
        calculateProblemPageLayout();
      }
    }
  }, [quiz, printMode]);

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
                  <span>다음 글의 제목으로 가장 적절한 것을 고르시오.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#08</span>
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
      // 1페이지: A+B
      return renderPage1();
    } else {
      // 2페이지: A (1페이지), B (2페이지)
      return (
        <>
          {renderPage1()}
          {renderPage2()}
        </>
      );
    }
  };

  // 공통 인쇄(정답) 레이아웃 렌더링 함수 (유형#03과 동일한 조건부 렌더링)
  const renderPrintWithAnswerLayout = () => {
    if (!quiz) return null;

    const commonStyles = {
      instruction: {fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'},
      passage: {marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'},
      options: {margin:'1rem 0'},
      option: {fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'},
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
                <div className="problem-instruction" style={commonStyles.instruction}>
                  <span>다음 글의 제목으로 가장 적절한 것을 고르시오.</span>
                  <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#08</span>
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
                    <div style={{fontSize:'0.8rem', marginTop:'0.2rem', marginLeft:'1rem', color:'#333', fontWeight:500}}>
                      {quiz.optionTranslations && quiz.optionTranslations[i] && quiz.optionTranslations[i].trim() !== '' 
                        ? quiz.optionTranslations[i] 
                        : '해석 생성 중...'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* C. 본문해석 제목 + 한글 해석 컨테이너 */}
            {(pageLayoutInfo.page1Content.includes('C') || pageLayoutInfo.page1Content === 'C') && (
              <>
                <div className="problem-instruction" style={{...commonStyles.instruction, display:'block'}}>
                  본문 해석
                </div>
                <div className="problem-passage translation" style={commonStyles.translation}>
                  {quiz.translation || '본문 해석이 생성되지 않았습니다.'}
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
                    <div style={{fontSize:'0.8rem', marginTop:'0.2rem', marginLeft:'1rem', color:'#333', fontWeight:500}}>
                      {quiz.optionTranslations && quiz.optionTranslations[i] && quiz.optionTranslations[i].trim() !== '' 
                        ? quiz.optionTranslations[i] 
                        : '해석 생성 중...'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* C. 본문해석 제목 + 한글 해석 컨테이너 */}
            {(pageLayoutInfo.page2Content.includes('C') || pageLayoutInfo.page2Content === 'C') && (
              <>
                <div className="problem-instruction" style={{...commonStyles.instruction, display:'block'}}>
                  본문 해석
                </div>
                <div className="problem-passage translation" style={commonStyles.translation}>
                  {quiz.translation || '본문 해석이 생성되지 않았습니다.'}
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
                <div className="problem-instruction" style={{...commonStyles.instruction, display:'block'}}>
                  본문 해석
                </div>
                <div className="problem-passage translation" style={commonStyles.translation}>
                  {quiz.translation || '본문 해석이 생성되지 않았습니다.'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );

    // 페이지 분할에 따른 조건부 렌더링
    if (!pageLayoutInfo.needsSecondPage) {
      // 1페이지만
      return renderPage1();
    } else if (!pageLayoutInfo.needsThirdPage) {
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
          // 이미지를 찾았으므로 기본 동작(텍스트 붙여넣기) 막기
          e.preventDefault();
          return;
        }
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

  async function generateTitleQuizWithAI(passage: string): Promise<TitleQuiz> {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const prompt = `아래 영어 본문을 읽고, 글의 주제의식에 가장 적합한 제목(title) 1개를 선정해.

요구사항:
1. 정답 제목(문장/구) + 오답(비슷한 길이의 제목 4개, 의미는 다름) 총 5개를 생성
2. 정답의 위치는 1~5번 중 랜덤
3. 본문 해석도 함께 제공
4. 각 옵션(1번~5번)에 대한 한글 해석을 반드시 제공

아래 JSON 형식으로 정확히 응답해줘:

{
  "passage": "영어 본문 내용",
  "options": ["첫번째 옵션 제목", "두번째 옵션 제목", "세번째 옵션 제목", "네번째 옵션 제목", "다섯번째 옵션 제목"],
  "answerIndex": 2,
  "translation": "본문의 한글 해석",
  "answerTranslation": "정답 제목의 한글 해석",
  "optionTranslations": ["첫번째 옵션의 한글 해석", "두번째 옵션의 한글 해석", "세번째 옵션의 한글 해석", "네번째 옵션의 한글 해석", "다섯번째 옵션의 한글 해석"]
}

본문:
${passage}

중요: optionTranslations 배열에는 반드시 5개의 한글 해석이 순서대로 들어가야 합니다. 각 옵션의 제목을 한국어로 자연스럽게 번역해주세요.`;
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
    if (!result.passage || !result.options || typeof result.answerIndex !== 'number' || !result.translation) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    // answerTranslation이 없으면 빈 문자열로 보완
    if (!('answerTranslation' in result) || result.answerTranslation == null) {
      result.answerTranslation = '';
    }
    // optionTranslations이 없으면 빈 배열로 보완
    if (!('optionTranslations' in result) || !Array.isArray(result.optionTranslations)) {
      result.optionTranslations = [];
    }
    
    // optionTranslations 배열의 길이가 options 배열과 다르면 보완
    if (result.optionTranslations.length !== result.options.length) {
      const missingTranslations = result.options.length - result.optionTranslations.length;
      for (let i = 0; i < missingTranslations; i++) {
        result.optionTranslations.push('해석 생성 중 오류 발생');
      }
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
    const workType = workTypePoints.find(wt => wt.id === '8'); // 유형#08
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
      const workType = workTypePoints.find(wt => wt.id === '8');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const deductionResult = await deductUserPoints(
        userData.uid,
        '8',
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
      
      const quizData = await generateTitleQuizWithAI(passage);
      setQuiz(quizData);

      // 문제 생성 내역 저장
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          const workTypePoint = workTypePoints.find(wt => wt.id === '8');
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '08',
            workTypeName: getWorkTypeName('08'),
            points: workTypePoint?.points || 0,
            inputText: passage,
            quizData: quizData,
            status: 'success'
          });
          console.log('✅ Work_08 내역 저장 완료');
        } catch (historyError) {
          console.error('❌ Work_08 내역 저장 실패:', historyError);
        }
      }
      
    } catch (err: any) {
      console.error('제목 추론 문제 생성 오류:', err);
      
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '제목 추론 문제 생성',
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
            <h2 className="no-print">#08. 제목 추론 문제</h2>
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
          <div className="title-inference-section">
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.13rem', background:'#222', color:'#fff', padding:'0.7rem 1.2rem', borderRadius:'8px', marginBottom:'0.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>다음 글의 제목으로 가장 적절한 것을 고르시오.</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#08</span>
            </div>
            <div className="problem-passage" style={{fontSize:'1.08rem', lineHeight:1.7, margin:'1.2rem 0', background:'#f7f8fc', borderRadius:'8px', padding:'1.2rem', fontFamily:'inherit'}}>
              {quiz.passage}
            </div>
            <div className="problem-options" style={{margin:'1.2rem 0'}}>
              {quiz.options.map((opt, i) => (
                <label key={i} style={{display:'block', fontSize:'1.08rem', margin:'0.4rem 0', cursor:'pointer', fontWeight: selected === i ? 700 : 400, color: selected === i ? '#6a5acd' : '#222', fontFamily:'inherit'}}>
                  <input
                    type="radio"
                    name="title-quiz"
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
                {quiz.answerTranslation && (
                  <div style={{marginTop:'0.4em', color:'#388e3c', fontWeight:600}}>
                    정답 해석: {quiz.answerTranslation}
                  </div>
                )}
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
        <h2>[유형#08] 제목 추론 문제 생성</h2>
        <p>영어 본문의 주제의식에 맞는 제목을 AI가 추론해 5지선다 객관식 문제로 출제합니다.</p>
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
            <label htmlFor="title-inference-image" className="file-upload-btn">
              파일 선택
              <input
                id="title-inference-image"
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
          <label htmlFor="title-inference-text" className="input-label">
            영어 본문 직접 붙여넣기: (2,000자 미만 권장)
          </label>
          {inputText.length < 100 && (
            <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
          )}
        </div>
        <textarea
          id="title-inference-text"
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
        제목 추론 문제 생성하기
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
        workTypeName="제목 추론 문제 생성"
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

export default Work_08_TitleInference; 