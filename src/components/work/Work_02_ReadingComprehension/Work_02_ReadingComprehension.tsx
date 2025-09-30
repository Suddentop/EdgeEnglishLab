import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import './Work_02_ReadingComprehension.css';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { useAuth } from '../../../contexts/AuthContext';
import '../../../styles/PrintFormat.css';

interface WordReplacement {
  original: string;           // 원본 단어/숙어
  replacement: string;        // 교체된 단어/숙어
  originalMeaning: string;    // 원본 단어/숙어의 한국어 뜻
  replacementMeaning: string; // 교체된 단어/숙어의 한국어 뜻
  originalPosition?: number;  // 원본 텍스트에서 교체된 위치
  replacedPosition?: number;  // 교체된 텍스트에서 교체된 위치
}

interface Work_02_ReadingComprehensionData {
  title: string;
  originalText: string;      // 원본 본문
  modifiedText: string;      // 단어가 교체된 본문
  replacements: WordReplacement[];  // 교체된 단어들
  translation: string;       // 본문 해석
}

// 입력 방식 타입
const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];

type PrintMode = 'none' | 'no-answer' | 'with-answer';

const Work_02_ReadingComprehension: React.FC = () => {
  const { userData, loading } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Work_02_ReadingComprehensionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [shouldSplit, setShouldSplit] = useState(false);
  const problemRef = useRef<HTMLDivElement>(null);
  const [showScreenshotHelp, setShowScreenshotHelp] = useState(false);
  
  // 페이지 분할 관련 상태
  const [needsSecondPage, setNeedsSecondPage] = useState(false);
  const [needsThirdPage, setNeedsThirdPage] = useState(false);
  const [isCalculatingLayout, setIsCalculatingLayout] = useState(false);
  const [firstPageIncludesReplacements, setFirstPageIncludesReplacements] = useState(false);
  
  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);



  // 페이지 분할 계산 함수 (실제 DOM 높이 측정)
  const calculatePageLayout = async () => {
    if (!quiz) {
      console.log('❌ 퀴즈 데이터가 없어서 페이지 분할 계산을 건너뜁니다.');
      return;
    }
    
    console.log('🔄 페이지 분할 계산을 시작합니다...');
    setIsCalculatingLayout(true);
    
    try {
      // A4 페이지 크기 (실제 A4 크기 기준, px 단위)
      const A4_WIDTH = 794; // px (210mm * 3.78px/mm)
      const A4_HEIGHT = 1123; // px (297mm * 3.78px/mm)
      const TOP_MARGIN = 25; // px (6.6mm)
      const BOTTOM_MARGIN = 25; // px (6.6mm)
      const LEFT_MARGIN = 20; // px (5.3mm)
      const RIGHT_MARGIN = 20; // px (5.3mm)
      const HEADER_HEIGHT = 30; // px (8mm)
      
      // 실제 A4 콘텐츠 영역 계산
      const availableWidth = A4_WIDTH - LEFT_MARGIN - RIGHT_MARGIN; // 754px
      const availableHeight = A4_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN - HEADER_HEIGHT; // 1048px
      
      console.log(`📏 A4 페이지 크기: ${availableWidth}px × ${availableHeight}px`);
      
      // 임시 컨테이너 생성
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        width: ${availableWidth}px;
        height: auto;
        padding: 0;
        margin: 0;
        box-sizing: border-box;
        font-family: 'Noto Sans KR', Arial, sans-serif;
        font-size: 16px;
        line-height: 1.7;
        background: white;
        visibility: hidden;
        pointer-events: none;
      `;
      
      document.body.appendChild(tempContainer);
      
      // 1. 문제제목 + 영어본문 높이 측정 (더 정확하게)
      const firstPageContent = document.createElement('div');
      firstPageContent.style.cssText = `
        width: 100%;
        padding: 0;
        margin: 0;
        box-sizing: border-box;
      `;
      
      const problemTitle = document.createElement('div');
      problemTitle.style.cssText = `
        font-weight: 800;
        font-size: 16px;
        background: #222;
        color: #fff;
        padding: 11px 8px;
        border-radius: 8px;
        margin-bottom: 19px;
        width: 100%;
        box-sizing: border-box;
      `;
      problemTitle.textContent = '문제: 다음 본문을 읽고 해석하세요';

      const englishPassage = document.createElement('div');
      englishPassage.style.cssText = `
        font-size: 14px;
        padding: 16px;
        background: #fff3cd;
        border-radius: 8px;
        font-family: inherit;
        color: #222;
        line-height: 1.7;
        box-sizing: border-box;
        word-wrap: break-word;
        margin: 0;
      `;
      englishPassage.textContent = quiz.modifiedText;
      
      firstPageContent.appendChild(problemTitle);
      firstPageContent.appendChild(englishPassage);
      tempContainer.appendChild(firstPageContent);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      const firstPageHeight = firstPageContent.scrollHeight;
      
      console.log(`📏 1페이지 높이 상세 분석:`);
      console.log(`- 문제제목 높이: ${problemTitle.scrollHeight}px`);
      console.log(`- 영어본문 높이: ${englishPassage.scrollHeight}px`);
      console.log(`- 1페이지 총 높이: ${firstPageHeight}px`);
      
      // 2. 교체된단어들 제목 + 표 높이 측정
      const replacementsContent = document.createElement('div');
      replacementsContent.style.cssText = `
        width: 100%;
        padding: 0;
        margin: 0;
        box-sizing: border-box;
      `;
      
      const replacementsTitle = document.createElement('div');
      replacementsTitle.style.cssText = `
        font-weight: 800;
        font-size: 16px;
        background: #222;
        color: #fff;
        padding: 11px 8px;
        border-radius: 8px;
        margin-bottom: 8px;
        margin-top: 16px;
        width: 100%;
        box-sizing: border-box;
      `;
      replacementsTitle.textContent = '교체된 단어들';
      
      const replacementsTable = document.createElement('div');
      replacementsTable.style.cssText = `
        font-size: 13px;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        font-family: inherit;
        color: #222;
        line-height: 1.7;
        box-sizing: border-box;
      `;
      
      // 교체된 단어들 테이블 HTML 생성
      let tableHTML = '<table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #ddd;">';
      tableHTML += '<thead><tr>';
      tableHTML += '<th style="background: #f5f5f5; color: #333; font-weight: 600; padding: 6px 12px; text-align: center; font-size: 13px; border: 1px solid #ddd;">원래 단어</th>';
      tableHTML += '<th style="background: #f5f5f5; color: #333; font-weight: 600; padding: 6px 12px; text-align: center; font-size: 13px; border: 1px solid #ddd;">교체된 단어</th>';
      tableHTML += '<th style="background: #f5f5f5; color: #333; font-weight: 600; padding: 6px 12px; text-align: center; font-size: 13px; border: 1px solid #ddd;">원래 단어</th>';
      tableHTML += '<th style="background: #f5f5f5; color: #333; font-weight: 600; padding: 6px 12px; text-align: center; font-size: 13px; border: 1px solid #ddd;">교체된 단어</th>';
      tableHTML += '</tr></thead><tbody>';
      
      if (quiz.replacements && quiz.replacements.length > 0) {
        const halfLength = Math.ceil(quiz.replacements.length / 2);
        for (let i = 0; i < halfLength; i++) {
          const leftReplacement = quiz.replacements[i * 2];
          const rightReplacement = quiz.replacements[i * 2 + 1];
          
          tableHTML += '<tr>';
          
          // 왼쪽 열
          if (leftReplacement) {
            tableHTML += `<td style="padding: 6px 12px; border: 1px solid #ddd; text-align: left; vertical-align: middle; font-size: 13px;">
              <span style="font-weight: 600; color: #d97706;">${leftReplacement.original}</span>
              <span style="color: #666; font-style: italic;"> (${leftReplacement.originalMeaning})</span>
            </td>
            <td style="padding: 6px 12px; border: 1px solid #ddd; text-align: left; vertical-align: middle; font-size: 13px;">
              <span style="font-weight: 600; color: #1976d2;">${leftReplacement.replacement}</span>
              <span style="color: #1976d2; font-style: italic;"> (${leftReplacement.replacementMeaning})</span>
            </td>`;
          } else {
            tableHTML += '<td style="padding: 6px 12px; border: 1px solid #ddd;"></td><td style="padding: 6px 12px; border: 1px solid #ddd;"></td>';
          }
          
          // 오른쪽 열
          if (rightReplacement) {
            tableHTML += `<td style="padding: 6px 12px; border: 1px solid #ddd; text-align: left; vertical-align: middle; font-size: 13px;">
              <span style="font-weight: 600; color: #d97706;">${rightReplacement.original}</span>
              <span style="color: #666; font-style: italic;"> (${rightReplacement.originalMeaning})</span>
            </td>
            <td style="padding: 6px 12px; border: 1px solid #ddd; text-align: left; vertical-align: middle; font-size: 13px;">
              <span style="font-weight: 600; color: #1976d2;">${rightReplacement.replacement}</span>
              <span style="color: #1976d2; font-style: italic;"> (${rightReplacement.replacementMeaning})</span>
            </td>`;
          } else {
            tableHTML += '<td style="padding: 6px 12px; border: 1px solid #ddd;"></td><td style="padding: 6px 12px; border: 1px solid #ddd;"></td>';
          }
          
          tableHTML += '</tr>';
        }
      }
      
      tableHTML += '</tbody></table>';
      replacementsTable.innerHTML = tableHTML;
      
      replacementsContent.appendChild(replacementsTitle);
      replacementsContent.appendChild(replacementsTable);
      tempContainer.appendChild(replacementsContent);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      const replacementsHeight = replacementsContent.scrollHeight;
      
      // 3. 한글 해석 높이 측정 (실제 인쇄 스타일과 동일하게)
      const koreanTranslation = document.createElement('div');
      koreanTranslation.style.cssText = `
        font-size: 16px;
        padding: 16px;
        background: #F1F8E9;
        border-radius: 8px;
        font-family: inherit;
        color: #222;
        line-height: 1.7;
        box-sizing: border-box;
        word-wrap: break-word;
        width: 100%;
        max-width: 100%;
        overflow-wrap: break-word;
        white-space: normal;
        margin: 0;
      `;
      koreanTranslation.textContent = quiz.translation || '번역을 생성하는 중...';
      
      tempContainer.appendChild(koreanTranslation);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      const koreanTranslationHeight = koreanTranslation.scrollHeight;
      
      // 임시 컨테이너 제거
      document.body.removeChild(tempContainer);
      
      // 페이지 분할 로직 결정 (3페이지 분할 지원)
      let needsSecondPage = false;
      let needsThirdPage = false;
      
      // A, B, C 높이 정의
      const A = firstPageHeight;        // 문제 제목 + 영어 본문
      const B = replacementsHeight;     // 교체된 단어들 제목 + 테이블
      const C = koreanTranslationHeight; // 한글 해석
      const availableSpace = availableHeight; // 1048px (실제 A4 크기 기준)
      
      console.log(`📏 측정된 높이:`);
      console.log(`- A (문제+본문): ${A}px`);
      console.log(`- B (교체된단어들): ${B}px`);
      console.log(`- C (한글해석): ${C}px`);
      console.log(`- 사용 가능 공간: ${availableSpace}px`);
      
      const totalHeight = A + B + C;
      
      console.log(`🔍 페이지 분할 로직 분석:`);
      console.log(`- A + B + C = ${A} + ${B} + ${C} = ${totalHeight}px`);
      console.log(`- A + B = ${A} + ${B} = ${A + B}px`);
      console.log(`- B + C = ${B} + ${C} = ${B + C}px`);
      
      if (totalHeight <= availableSpace) {
        // A+B+C ≤ 1048px → 1페이지
        needsSecondPage = false;
        needsThirdPage = false;
        setFirstPageIncludesReplacements(true);
        console.log('✅ 1페이지: A+B+C 모두 1페이지에 들어갑니다');
      } else if (A + B <= availableSpace) {
        // A+B+C > 1048px, A+B ≤ 1048px → 1페이지(A+B), 2페이지(C)
        needsSecondPage = true;
        needsThirdPage = false;
        setFirstPageIncludesReplacements(true);
        console.log('✅ 2페이지: 1페이지(A+B), 2페이지(C)');
      } else if (A <= availableSpace && B + C <= availableSpace) {
        // A+B+C > 1048px, A+B > 1048px, A ≤ 1048px, B+C ≤ 1048px → 1페이지(A), 2페이지(B+C)
        needsSecondPage = true;
        needsThirdPage = false;
        setFirstPageIncludesReplacements(false);
        console.log('✅ 2페이지: 1페이지(A), 2페이지(B+C)');
      } else {
        // A+B+C > 1048px, A+B > 1048px, A > 1048px 또는 B+C > 1048px → 1페이지(A), 2페이지(B), 3페이지(C)
        needsSecondPage = true;
        needsThirdPage = true;
        setFirstPageIncludesReplacements(false);
        console.log('✅ 3페이지: 1페이지(A), 2페이지(B), 3페이지(C)');
      }
      
      setNeedsSecondPage(needsSecondPage);
      setNeedsThirdPage(needsThirdPage);
      
      console.log(`=== 최종 페이지 분할 결과 ===`);
      console.log(`2페이지 필요: ${needsSecondPage}`);
      console.log(`3페이지 필요: ${needsThirdPage}`);
      console.log(`✅ 상태 설정 완료`);
      
    } catch (error) {
      console.error('페이지 레이아웃 계산 오류:', error);
      // 오류 시 기본값으로 1페이지 설정
      setNeedsSecondPage(false);
      setNeedsThirdPage(false);
    } finally {
      setIsCalculatingLayout(false);
    }
  };

  // 교체된단어들 테이블 렌더링 함수
  const renderReplacementsTable = () => {
    if (!quiz || !quiz.replacements || quiz.replacements.length === 0) {
      return (
        <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
          교체된 단어가 없습니다.
        </div>
      );
    }

    const totalReplacements = quiz.replacements.length;
    const halfLength = Math.ceil(totalReplacements / 2);

    return (
      <table className="replacements-table">
        <thead>
          <tr>
            <th>원래 단어</th>
            <th>교체된 단어</th>
            <th>원래 단어</th>
            <th>교체된 단어</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: halfLength }, (_, rowIndex) => {
            const leftReplacement = quiz.replacements[rowIndex * 2];
            const rightReplacement = quiz.replacements[rowIndex * 2 + 1];
            
            return (
              <tr key={rowIndex}>
                <td>
                  {leftReplacement && (
                    <>
                      <span className="original-word">{leftReplacement.original}</span>
                      <span className="original-meaning"> ({leftReplacement.originalMeaning})</span>
                    </>
                  )}
                </td>
                <td>
                  {leftReplacement && (
                    <>
                      <span className="replacement-word">{leftReplacement.replacement}</span>
                      <span className="replacement-meaning"> ({leftReplacement.replacementMeaning})</span>
                    </>
                  )}
                </td>
                <td>
                  {rightReplacement && (
                    <>
                      <span className="original-word">{rightReplacement.original}</span>
                      <span className="original-meaning"> ({rightReplacement.originalMeaning})</span>
                    </>
                  )}
                </td>
                <td>
                  {rightReplacement && (
                    <>
                      <span className="replacement-word">{rightReplacement.replacement}</span>
                      <span className="replacement-meaning"> ({rightReplacement.replacementMeaning})</span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  // 퀴즈가 생성되면 페이지 분할 계산
  useEffect(() => {
    if (quiz) {
      console.log('🎯 퀴즈 데이터 감지, 페이지 분할 계산 시작');
      calculatePageLayout();
    }
  }, [quiz]);

  // 포인트 관련 초기화
  useEffect(() => {
    const initializePoints = async () => {
      try {
        const points = await getWorkTypePoints();
        setWorkTypePoints(points);
        
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

  // 컴포넌트 마운트 및 문제 생성 후 스크롤 최상단
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [quiz]);

  // 입력 방식 변경 핸들러
  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setQuiz(null);
  };

  // 이미지 파일 업로드 핸들러
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      // OCR → textarea에 자동 입력
      setIsLoading(true);
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
        setIsLoading(false);
      }
    }
  };

  // 이미지 붙여넣기 핸들러
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (inputMode !== 'capture') return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
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

  // AI 응답 검증 함수 (강화된 버전)
  function validateGPTResponse(response: any): boolean {
    if (!response || !response.replacements || !Array.isArray(response.replacements)) return false;

    // 실제 문장별 분리해서 각 단어가 몇 문장에 선택됐는지 추적
    const sentences = response.originalText.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 0);
    const actualSentenceCount = sentences.length;
    
    // sentenceCount가 undefined이거나 잘못된 경우 실제 문장 수로 수정
    if (response.sentenceCount === undefined || response.sentenceCount === null) {
      console.warn(`⚠️ AI가 sentenceCount를 제대로 반환하지 않았습니다: ${response.sentenceCount}, 실제 문장 수로 수정`);
      response.sentenceCount = actualSentenceCount;
    } else if (response.sentenceCount !== actualSentenceCount) {
      console.warn(`⚠️ AI가 보고한 문장 수(${response.sentenceCount})와 실제 문장 수(${actualSentenceCount})가 일치하지 않지만, 실제 문장 수로 수정`);
      response.sentenceCount = actualSentenceCount;
    }

    const sentenceCount = response.sentenceCount;
    const replacements = response.replacements;
    
    console.log(`AI가 보고한 문장 수: ${sentenceCount}, 실제 문장 수: ${actualSentenceCount}`);
    console.log(`선택된 단어 수: ${replacements.length}`);

    // 문장 수가 올바른지 확인 (동적 검증)
    if (actualSentenceCount < 3 || actualSentenceCount > 15) {
      console.warn(`❌ 문장 수가 적절하지 않습니다: ${actualSentenceCount}개 (3-15개 범위 내여야 함)`);
      return false;
    }

    if (replacements.length !== actualSentenceCount) {
      console.warn(`❌ 선택된 단어 수가 문장 수와 일치하지 않습니다: ${replacements.length}개 (문장 수: ${actualSentenceCount}개)`);
      return false;
    }

    // 중복 단어 검증 (엄격)
    const selectedWords = replacements.map((r: any) => r.original.toLowerCase().trim());
    const uniqueWords = new Set(selectedWords);
    if (uniqueWords.size !== selectedWords.length) {
      console.warn(`❌ 중복된 단어가 선택되었습니다: ${selectedWords.length}개 중 ${uniqueWords.size}개만 고유`);
      return false;
    }

    const sentenceMap = new Map<number, string[]>();

    for (let i = 0; i < sentences.length; i++) {
      sentenceMap.set(i, []);
    }

    for (let r of replacements) {
      const matchedIndex = sentences.findIndex((s: string) => s.includes(r.original));
      if (matchedIndex === -1) continue;
      sentenceMap.get(matchedIndex)?.push(r.original);
    }

    // 각 문장에서 선택된 단어 개수 상세 로깅
    console.log("각 문장별 선택된 단어:");
    for (const [index, words] of Array.from(sentenceMap.entries())) {
      const sentence = sentences[index].substring(0, 50) + "...";
      console.log(`문장 ${index + 1}: "${sentence}" → ${words.length}개 단어 선택: [${words.join(', ')}]`);
      
      if (words.length !== 1) {
        console.warn(`❌ CRITICAL ERROR: Sentence ${index + 1} has ${words.length} selected words: [${words.join(', ')}]`);
        console.warn(`❌ This violates the absolute rule: only 1 word per sentence allowed`);
        return false;
      }
    }

    // 자기 자신으로 교체하는 경우 체크
    for (const replacement of replacements) {
      if (replacement.original.toLowerCase().trim() === replacement.replacement.toLowerCase().trim()) {
        console.warn(`❌ Word "${replacement.original}" was replaced with itself`);
        return false;
      }
    }

    // modifiedText에서 모든 선택된 단어가 교체되었는지 확인 (더 관대한 검증)
    const modifiedText = response.modifiedText || '';
    let unreplacedCount = 0;
    for (const replacement of replacements) {
      if (modifiedText.toLowerCase().includes(replacement.original.toLowerCase())) {
        console.warn(`⚠️ Word "${replacement.original}" was not replaced in modifiedText`);
        unreplacedCount++;
      }
    }
    
    // 교체되지 않은 단어가 전체의 30% 이상일 때만 실패 (동적 검증)
    const maxAllowedUnreplaced = Math.ceil(actualSentenceCount * 0.3);
    if (unreplacedCount > maxAllowedUnreplaced) {
      console.warn(`❌ Too many words not replaced: ${unreplacedCount} (max allowed: ${maxAllowedUnreplaced})`);
      return false;
    }
    
    console.log(`✅ 검증 통과: ${unreplacedCount}개 단어가 교체되지 않았지만 허용 범위 내`);

    return true;
  }

  // AI로 단어 교체 및 독해 문제 생성 (재시도 메커니즘 포함)
  async function generateReadingComprehensionWithAI(passage: string): Promise<Work_02_ReadingComprehensionData> {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    
    if (!apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.');
    }

    // Step-by-Step 방식은 재시도가 필요 없음 (각 단계가 단순함)
    try {
      const response = await callOpenAI(passage, apiKey);
      return response;
    } catch (error) {
      console.error('Step-by-Step 처리 실패:', error);
      throw error;
    }
  }

    // Step 1: 문장 분리
  async function splitSentences(passage: string, apiKey: string): Promise<string[]> {
    const prompt = `You will receive an English passage. Split it into individual sentences.
Use the following rules:
- End of sentence is marked by '.', '?', or '!' followed by a space or newline.
- Keep sentence punctuation.
- Do not merge or break sentences.

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no code blocks.

Passage:
${passage}

Required JSON format:
{
  "sentences": ["Sentence 1.", "Sentence 2?", "Sentence 3!"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0
      })
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('AI로부터 올바른 응답을 받지 못했습니다.');
    }

    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
    }

    try {
      // JSON 정리: 불필요한 문자 제거
      let cleanJson = jsonMatch[0]
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/\n/g, ' ')
        .trim();
      
      const result = JSON.parse(cleanJson);
      if (!result.sentences || !Array.isArray(result.sentences)) {
        console.error('AI 응답 구조:', result);
        throw new Error('AI 응답에 sentences 배열이 없습니다.');
      }
      return result.sentences;
    } catch (parseError) {
      console.error('원본 JSON:', jsonMatch[0]);
      console.error('정리된 JSON:', jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').replace(/\n/g, ' ').trim());
      throw new Error(`JSON 파싱 실패: ${parseError}`);
    }
  }

  // Step 2: 문장별 단어 선택
  async function selectWordFromSentence(sentence: string, index: number, apiKey: string, usedWords: string[] = []): Promise<{index: number, original: string}> {
    const usedWordsText = usedWords.length > 0 ? `\n\nALREADY USED WORDS (do not select these): ${usedWords.join(', ')}` : '';
    
    const prompt = `You are selecting one important word from sentence #${index + 1} below.

RULES:
1. Only ONE word should be selected. Never more than one.
2. Select a word that is NOT already used in previous sentences.
3. Choose a meaningful word that would be good for vocabulary learning.

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no code blocks.

Sentence: "${sentence}"${usedWordsText}

Required JSON format:
{
  "index": ${index},
  "original": "selectedWord"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0
        })
      });

      if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('AI로부터 올바른 응답을 받지 못했습니다.');
      }

    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
    }

        try {
      // JSON 정리: 불필요한 문자 제거
      let cleanJson = jsonMatch[0]
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/\n/g, ' ')
        .trim();
      
      const result = JSON.parse(cleanJson);
      if (!result.original || typeof result.original !== 'string') {
        console.error('AI 응답 구조:', result);
        throw new Error('AI 응답에 original 필드가 없습니다.');
      }
      return result;
      } catch (parseError) {
      console.error('원본 JSON:', jsonMatch[0]);
      console.error('정리된 JSON:', jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').replace(/\n/g, ' ').trim());
      throw new Error(`JSON 파싱 실패: ${parseError}`);
    }
  }

  // Step 3: 단어 유의어 추천
  async function getSynonym(word: string, apiKey: string): Promise<{original: string, replacement: string, originalMeaning: string, replacementMeaning: string}> {
    const prompt = `Provide one appropriate synonym for the word "${word}" used in a reading comprehension context.

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, no code blocks.

Required JSON format:
{
  "original": "${word}",
  "replacement": "synonym_word",
  "originalMeaning": "한국어 뜻",
  "replacementMeaning": "한국어 뜻"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0
      })
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('AI로부터 올바른 응답을 받지 못했습니다.');
    }

    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
    }

    try {
      // JSON 정리: 불필요한 문자 제거
      let cleanJson = jsonMatch[0]
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/\n/g, ' ')
        .trim();
      
      // JSON 파싱 시도
      const result = JSON.parse(cleanJson);
      
      // 필수 필드 검증
      if (!result.original || !result.replacement || !result.originalMeaning || !result.replacementMeaning) {
        console.error('AI 응답 구조:', result);
        throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
      }
      
      return result;
      } catch (parseError) {
      console.error('원본 JSON:', jsonMatch[0]);
      console.error('정리된 JSON:', jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').replace(/\n/g, ' ').trim());
      throw new Error(`JSON 파싱 실패: ${parseError}`);
    }
  }

  // Step 4: 문장별 본문 치환 (순차 처리)
  function replaceWordsInTextSequentially(originalText: string, sentences: string[], replacements: any[]): string {
    let modifiedText = originalText;
    let currentPosition = 0;
    
    // 각 문장별로 순차적으로 처리
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const replacement = replacements[i];
      
      if (!replacement) continue;
      
      // 현재 문장의 시작 위치 찾기
      const sentenceStart = modifiedText.indexOf(sentence, currentPosition);
      if (sentenceStart === -1) {
        console.warn(`문장 ${i + 1}을 찾을 수 없음: "${sentence.substring(0, 50)}..."`);
        continue;
      }
      
      const sentenceEnd = sentenceStart + sentence.length;
      
      // 현재 문장 내에서만 단어 교체
      const sentenceText = modifiedText.substring(sentenceStart, sentenceEnd);
      const escapedOriginal = replacement.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedOriginal}\\b`, 'gi');
      
      const beforeReplace = sentenceText;
      const modifiedSentence = sentenceText.replace(regex, replacement.replacement);
      
      if (beforeReplace !== modifiedSentence) {
        console.log(`문장 ${i + 1} 교체 성공: "${replacement.original}" → "${replacement.replacement}"`);
        // 전체 텍스트에서 해당 문장 부분만 교체
        modifiedText = modifiedText.substring(0, sentenceStart) + modifiedSentence + modifiedText.substring(sentenceEnd);
      } else {
        console.warn(`문장 ${i + 1} 교체 실패: "${replacement.original}"를 찾을 수 없음`);
      }
      
      // 다음 문장 처리를 위해 위치 업데이트
      currentPosition = sentenceStart + modifiedSentence.length;
    }
    
    return modifiedText;
  }

  // Step 5: 검증
  function validateResult(originalText: string, modifiedText: string, replacements: any[]): boolean {
    let successCount = 0;
    let totalCount = replacements.length;
    
    // 각 단어가 실제로 교체되었는지 확인
    for (const replacement of replacements) {
      if (modifiedText.toLowerCase().includes(replacement.replacement.toLowerCase())) {
        successCount++;
      } else {
        console.warn(`단어 "${replacement.original}"이 "${replacement.replacement}"로 교체되지 않았습니다.`);
      }
    }
    
    // 80% 이상 성공하면 통과
    const successRate = successCount / totalCount;
    console.log(`교체 성공률: ${successCount}/${totalCount} (${(successRate * 100).toFixed(1)}%)`);
    
    return successRate >= 0.8;
  }

  // Step 6: 본문 번역
  async function translateText(text: string, apiKey: string): Promise<string> {
    const prompt = `Translate the following English text to Korean. 
Provide a natural, accurate Korean translation that maintains the original meaning and context.

IMPORTANT: Return ONLY the Korean translation. No explanations, no markdown, no code blocks.

English text: "${text}"

Korean translation:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('AI로부터 올바른 응답을 받지 못했습니다.');
    }

    const translation = data.choices[0].message.content.trim();
    
    // 번역 결과 검증
    if (!translation || translation.length < 10) {
      throw new Error('번역 결과가 너무 짧거나 비어있습니다.');
    }
    
    return translation;
  }

  // 메인 함수: Step-by-Step Multi-call
  async function callOpenAI(passage: string, apiKey: string): Promise<Work_02_ReadingComprehensionData> {
    try {
      // Step 1: 문장 분리
      console.log('Step 1: 문장 분리 중...');
      const sentences = await splitSentences(passage, apiKey);
      console.log(`분리된 문장 수: ${sentences.length}`);

      // Step 2: 각 문장에서 단어 선택
      console.log('Step 2: 문장별 단어 선택 중...');
      const selectedWords = [];
      const usedWords = new Set<string>(); // 중복 방지를 위한 Set
      
      for (let i = 0; i < sentences.length; i++) {
        const usedWordsArray = Array.from(usedWords);
        const wordSelection = await selectWordFromSentence(sentences[i], i, apiKey, usedWordsArray);
        
        // 중복 단어 검증
        if (usedWords.has(wordSelection.original.toLowerCase())) {
          console.warn(`중복 단어 감지: "${wordSelection.original}" (문장 ${i + 1})`);
          // 중복된 경우 다른 단어 선택을 위해 재시도
          const retrySelection = await selectWordFromSentence(sentences[i], i, apiKey, usedWordsArray);
          if (usedWords.has(retrySelection.original.toLowerCase())) {
            console.warn(`재시도 후에도 중복: "${retrySelection.original}" (문장 ${i + 1})`);
          }
          selectedWords.push(retrySelection);
          usedWords.add(retrySelection.original.toLowerCase());
          console.log(`문장 ${i + 1}: "${retrySelection.original}" 선택 (재시도)`);
        } else {
          selectedWords.push(wordSelection);
          usedWords.add(wordSelection.original.toLowerCase());
          console.log(`문장 ${i + 1}: "${wordSelection.original}" 선택`);
        }
      }

      // Step 3: 각 단어의 유의어 추천
      console.log('Step 3: 유의어 추천 중...');
      const replacements = [];
      for (const wordSelection of selectedWords) {
        const synonym = await getSynonym(wordSelection.original, apiKey);
        replacements.push(synonym);
        console.log(`"${synonym.original}" → "${synonym.replacement}"`);
      }

      // Step 4: 본문 치환 (문장별 순차 처리)
      console.log('Step 4: 본문 치환 중...');
      const modifiedText = replaceWordsInTextSequentially(passage, sentences, replacements);

      // Step 5: 검증
      console.log('Step 5: 검증 중...');
              if (!validateResult(passage, modifiedText, replacements)) {
          throw new Error('검증 실패: 일부 단어가 제대로 교체되지 않았습니다.');
        }

        // Step 6: 본문 번역
        console.log('Step 6: 본문 번역 중...');
        const translation = await translateText(passage, apiKey);
        console.log('번역 완료:', translation.substring(0, 50) + '...');

        // 결과 조립
        return {
          title: '독해 문제',
          originalText: passage,
          modifiedText: modifiedText,
          replacements: replacements,
          translation: translation
        };

    } catch (error: any) {
      // 네트워크 오류
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('인터넷 연결을 확인해주세요. 네트워크 오류가 발생했습니다.');
      }
      // 이미 처리된 에러는 그대로 전달
      throw error;
    }
  }

  // 포인트 차감 확인
  const handlePointDeductionConfirm = async () => {
    if (!userData?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    setShowPointModal(false);
    await executeQuizGeneration();
  };

  // 독해 문제 생성 (포인트 차감 포함)
  const generateReadingQuiz = async () => {
    // 로딩 중이면 대기
    if (loading) {
      alert('로그인 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    
    // 로그인 상태 확인
    if (!userData || !userData.uid) {
      alert('로그인이 필요합니다. 다시 로그인해주세요.');
      return;
    }

    // 포인트 차감 확인
    const workType = workTypePoints.find(wt => wt.id === '2'); // 유형#02
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

  // 실제 문제 생성 실행
  const executeQuizGeneration = async () => {
    if (!userData?.uid) return;

    let passage = '';
    setIsLoading(true);
    let deductedPoints = 0;
    
    try {
      // 포인트 차감
      const workType = workTypePoints.find(wt => wt.id === '2');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const deductionResult = await deductUserPoints(
        userData.uid,
        '2',
        workType.name,
        userData.name || '사용자',
        userData.nickname || '사용자'
      );

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
      }

      deductedPoints = deductionResult.deductedPoints;
      setUserCurrentPoints(deductionResult.remainingPoints);

      // 1. 입력 방식에 따라 본문 확보
      if (inputMode === 'text') {
        if (!inputText.trim()) {
          throw new Error('영어 본문을 입력해주세요.');
        }
        passage = inputText.trim();
      } else if (inputMode === 'image' && imageFile) {
        try {
          passage = await imageToTextWithOpenAIVision(imageFile);
        } catch (visionError: any) {
          throw new Error(`이미지 텍스트 추출 실패: ${visionError.message || '이미지에서 텍스트를 추출할 수 없습니다.'}`);
        }
      } else if (inputMode === 'capture') {
        // 캡처 이미지에서 추출된 텍스트가 수정되었을 수 있으므로 inputText 사용
        if (!inputText.trim()) {
          throw new Error('영어 본문을 입력해주세요.');
        }
        passage = inputText.trim();
      } else {
        throw new Error('이미지를 첨부해주세요.');
      }

      if (!passage.trim()) {
        throw new Error('추출된 텍스트가 없습니다. 다른 이미지를 시도하거나 텍스트를 직접 입력해주세요.');
      }

      // 2. AI로 단어 교체 및 독해 문제 생성
      const quizData = await generateReadingComprehensionWithAI(passage);
      setQuiz(quizData);
      
    } catch (err: any) {
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '독해 문제 생성',
            userData.name || '사용자',
            userData.nickname || '사용자',
            '문제 생성 실패로 인한 포인트 환불'
          );
          setUserCurrentPoints(prev => prev + deductedPoints);
        } catch (refundError) {
          console.error('포인트 환불 오류:', refundError);
        }
      }
      
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      alert(`❌ 문제 생성 실패\n\n${errorMessage}\n\n차감된 포인트는 환불되었습니다.`);
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

  // 리셋
  const resetQuiz = () => {
    setQuiz(null);
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setIsPasteFocused(false);
  };

  // 본문에서 교체된 단어에 밑줄 표시 - 중복 방지 로직 포함
  const renderTextWithUnderlines = (text: string, replacements: WordReplacement[], isOriginal: boolean = true) => {
    if (!replacements || replacements.length === 0) return text;
    
    // 문장 분리 (원본 본문과 동일한 방식)
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    let resultElements: (string | JSX.Element)[] = [];
    let elementIndex = 0;
    let currentPosition = 0;
    
    // 이미 사용된 교체 정보를 추적하여 중복 방지
    const usedReplacements = new Set<string>();
    
    // 각 문장별로 처리하여 해당 문장의 교체된 단어만 밑줄 표시
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      
      // 현재 문장의 시작 위치 찾기
      const sentenceStart = text.indexOf(sentence, currentPosition);
      if (sentenceStart === -1) {
        resultElements.push(sentence);
        if (i < sentences.length - 1) resultElements.push(' ');
        continue;
      }
      
      const sentenceEnd = sentenceStart + sentence.length;
      
      // 이 문장에 해당하는 교체 정보 찾기 (내용 기반 매칭, 중복 방지)
      let replacement: WordReplacement | null = null;
      
      // 교체 정보 중에서 현재 문장에 포함된 단어를 찾기 (아직 사용되지 않은 것만)
      for (const rep of replacements) {
        const wordToFind = isOriginal ? rep.original : rep.replacement;
        if (!wordToFind) continue;
        
        // 이미 사용된 교체 정보인지 확인
        const replacementKey = `${rep.original}-${rep.replacement}`;
        if (usedReplacements.has(replacementKey)) continue;
        
        if (sentence.toLowerCase().includes(wordToFind.toLowerCase())) {
          // 단어 경계를 고려한 정확한 매칭 확인
          const escapedWord = wordToFind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
          if (regex.test(sentence)) {
            replacement = rep;
            usedReplacements.add(replacementKey); // 사용된 교체 정보로 표시
            break; // 첫 번째 매칭만 사용
          }
        }
      }
      
      if (!replacement) {
        // 교체 정보가 없는 문장은 그대로 추가
        resultElements.push(sentence);
        if (i < sentences.length - 1) resultElements.push(' ');
        currentPosition = sentenceEnd;
        continue;
      }
      
      const wordToHighlight = isOriginal ? replacement.original : replacement.replacement;
      if (!wordToHighlight) {
        resultElements.push(sentence);
        if (i < sentences.length - 1) resultElements.push(' ');
        currentPosition = sentenceEnd;
        continue;
      }
      
      // 해당 문장에서 교체된 단어의 첫 번째 매칭만 찾기
      const escapedWord = wordToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'i'); // 대소문자 구분 없이 첫 번째 매칭만
      
      const match = regex.exec(sentence);
      if (match) {
        // 단어 앞부분
        if (match.index > 0) {
          resultElements.push(sentence.substring(0, match.index));
        }
        
        // 밑줄 표시된 단어
        resultElements.push(
          <span key={elementIndex++} style={{textDecoration: 'underline', fontWeight: 'bold', color: '#2d5aa0'}}>
            {match[0]}
          </span>
        );
        
        // 단어 뒷부분
        if (match.index + match[0].length < sentence.length) {
          resultElements.push(sentence.substring(match.index + match[0].length));
        }
      } else {
        // 매칭되는 단어가 없으면 그대로 추가
        resultElements.push(sentence);
      }
      
      // 문장 사이에 공백 추가
      if (i < sentences.length - 1) {
        resultElements.push(' ');
      }
      
      currentPosition = sentenceEnd;
    }
    
    return resultElements.length > 0 ? resultElements : text;
  };

  // 인쇄용 텍스트 렌더링 - 중복 방지 로직 포함
  const renderPrintTextWithUnderlines = (text: string, replacements: WordReplacement[], isOriginal: boolean = true) => {
    if (!replacements || replacements.length === 0) return text;
    
    // 문장 분리 (원본 본문과 동일한 방식)
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    // 각 문장별로 처리할 HTML 결과
    let processedSentences: string[] = [];
    let currentPosition = 0;
    
    // 이미 사용된 교체 정보를 추적하여 중복 방지
    const usedReplacements = new Set<string>();
    
    // 각 문장별로 처리하여 해당 문장의 교체된 단어만 HTML 태그 적용
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      
      // 현재 문장의 시작 위치 찾기
      const sentenceStart = text.indexOf(sentence, currentPosition);
      if (sentenceStart === -1) {
        processedSentences.push(sentence);
        continue;
      }
      
      const sentenceEnd = sentenceStart + sentence.length;
      
      // 이 문장에 해당하는 교체 정보 찾기 (내용 기반 매칭, 중복 방지)
      let replacement: WordReplacement | null = null;
      
      // 교체 정보 중에서 현재 문장에 포함된 단어를 찾기 (아직 사용되지 않은 것만)
      for (const rep of replacements) {
        const wordToFind = isOriginal ? rep.original : rep.replacement;
        if (!wordToFind) continue;
        
        // 이미 사용된 교체 정보인지 확인
        const replacementKey = `${rep.original}-${rep.replacement}`;
        if (usedReplacements.has(replacementKey)) continue;
        
        if (sentence.toLowerCase().includes(wordToFind.toLowerCase())) {
          // 단어 경계를 고려한 정확한 매칭 확인
          const escapedWord = wordToFind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
          if (regex.test(sentence)) {
            replacement = rep;
            usedReplacements.add(replacementKey); // 사용된 교체 정보로 표시
            break; // 첫 번째 매칭만 사용
          }
        }
      }
      
      if (!replacement) {
        // 교체 정보가 없는 문장은 그대로 추가
        processedSentences.push(sentence);
        currentPosition = sentenceEnd;
        continue;
      }
      
      const wordToHighlight = isOriginal ? replacement.original : replacement.replacement;
      if (!wordToHighlight) {
        processedSentences.push(sentence);
        currentPosition = sentenceEnd;
        continue;
      }
      
      // 해당 문장에서 교체된 단어의 첫 번째 매칭만 찾기
      const escapedWord = wordToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'i'); // 대소문자 구분 없이 첫 번째 매칭만
      
      // 문장 내에서 해당 단어만 HTML 태그로 감싸기
      const processedSentence = sentence.replace(regex, `<u><strong>$&</strong></u>`);
      processedSentences.push(processedSentence);
      
      currentPosition = sentenceEnd;
    }
    
    // 처리된 문장들을 공백으로 연결하여 반환
    return processedSentences.join(' ');
  };

  // 문제 풀이/출력 화면
  if (quiz) {
    return (
      <div>
        {/* 화면용 */}
        <div className="quiz-display no-print">
        <div className="quiz-header">
            <h2 className="no-print">#02. 독해 문제</h2>
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
              }}>
                새 문제 만들기
            </button>
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


        {/* 문제 제목 */}
        <div className="problem-title work-02-problem-title" style={{fontWeight: '800 !important', fontSize: '1rem !important', background: '#222 !important', color: '#fff !important', padding: '0.2rem 0.4rem !important', borderRadius: '3px !important', marginBottom: '0.3rem !important', display: 'block !important', width: '100% !important'}}>
          문제: 다음 본문을 읽고 해석하세요
        </div>

          {/* 원본 본문 보기 */}
            <h3>원본 본문:</h3>
                     <div className="text-content no-print" style={{padding: '1.2rem', marginBottom: '1.5rem', borderRadius: '8px', border: '2px solid #ddd'}}>
               {renderTextWithUnderlines(quiz.originalText, quiz.replacements, true)}
           </div>

          {/* 변경된 본문 (문제) */}
            <h3>다음 본문을 읽고 해석하세요.</h3>
          <div className="text-content no-print" style={{background: '#fff3cd', padding: '1.2rem', borderRadius: '8px', marginBottom: '1.5rem'}}>
              {renderTextWithUnderlines(quiz.modifiedText, quiz.replacements, false)}
                </div>
                
          {/* 교체된 단어 목록 (하나의 4열 테이블) */}
            <h3>교체된 단어들:</h3>
            {quiz.replacements && quiz.replacements.length > 0 ? (
            <table className="replacements-table no-print">
              <thead>
                <tr>
                  <th>원래 단어</th>
                  <th>교체된 단어</th>
                  <th>원래 단어</th>
                  <th>교체된 단어</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil(quiz.replacements.length / 2) }, (_, rowIndex) => (
                  <tr key={rowIndex}>
                    <td>
                      {quiz.replacements[rowIndex * 2] && (
                        <>
                          <span className="original-word">{quiz.replacements[rowIndex * 2].original}</span>
                          <span className="original-meaning"> ({quiz.replacements[rowIndex * 2].originalMeaning})</span>
                        </>
                      )}
                    </td>
                    <td>
                      {quiz.replacements[rowIndex * 2] && (
                        <>
                          <span className="replacement-word">{quiz.replacements[rowIndex * 2].replacement}</span>
                          <span className="replacement-meaning"> ({quiz.replacements[rowIndex * 2].replacementMeaning})</span>
                        </>
                      )}
                    </td>
                    <td>
                      {quiz.replacements[rowIndex * 2 + 1] && (
                        <>
                          <span className="original-word">{quiz.replacements[rowIndex * 2 + 1].original}</span>
                          <span className="original-meaning"> ({quiz.replacements[rowIndex * 2 + 1].originalMeaning})</span>
                        </>
                      )}
                    </td>
                    <td>
                      {quiz.replacements[rowIndex * 2 + 1] && (
                        <>
                          <span className="replacement-word">{quiz.replacements[rowIndex * 2 + 1].replacement}</span>
                          <span className="replacement-meaning"> ({quiz.replacements[rowIndex * 2 + 1].replacementMeaning})</span>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-print" style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                교체된 단어가 없습니다.
              </div>
            )}

          {/* 번역 */}
          <div className="translation-section no-print">
            <h3>본문 해석:</h3>
            <div className="translation-content problem-passage translation" style={{background: '#f1f8e9', padding: '1.2rem', borderRadius: '8px', fontSize: '1rem', transform:'scale(0.9)', transformOrigin:'top left', width:'111.11%'}}>
              {quiz.translation}
              </div>
          </div>
        </div>

        {/* 인쇄용: 문제만 - A4 템플릿 사용 */}
        {printMode === 'no-answer' && (
          <div className="only-print">
            {/* 1페이지: 문제제목 + 본문만 (교체된 단어들 제거) */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderWork01 />
            </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                  문제: 다음 본문을 읽고 해석하세요
                </div>
                  <div className="problem-passage" style={{marginTop:'0.63rem', marginBottom:'0.8rem', fontSize:'0.9rem', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(quiz.modifiedText, quiz.replacements, false)}}>
                </div>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* 인쇄용: 정답포함 - A4 템플릿 사용 */}
        {printMode === 'with-answer' && quiz && (
          <div className="only-print print-answer-mode">
            {!needsSecondPage ? (
              // 1페이지: 모든 내용
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                      문제: 다음 본문을 읽고 해석하세요
                    </div>
                    <div className="problem-passage" style={{marginTop:'0.63rem', marginBottom:'0.8rem', fontSize:'0.9rem', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(quiz.modifiedText, quiz.replacements, false)}}>
                    </div>
                    <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0rem', display:'block', width:'100%', marginTop:'1.5rem'}}>
                      교체된 단어들
                    </div>
                    {quiz.replacements && quiz.replacements.length > 0 ? (
                      <div style={{marginTop:'0rem'}}>
                        {renderReplacementsTable()}
                      </div>
                    ) : (
                      <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                        교체된 단어가 없습니다.
                      </div>
                    )}
                    <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%', marginTop:'1.5rem'}}>
                      본문 해석
                    </div>
                    <div className="problem-passage translation" style={{marginTop:'0.63rem', fontSize:'1rem !important', padding:'1rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                      {quiz.translation || '번역을 생성하는 중...'}
                    </div>
                  </div>
                </div>
              </div>
            ) : needsThirdPage ? (
              // 3페이지 구성: 1페이지(문제+본문), 2페이지(교체된단어들), 3페이지(한글해석)
              <>
                {/* 1페이지: 문제제목 + 영어본문 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                        문제: 다음 본문을 읽고 해석하세요
                      </div>
                      <div className="problem-passage" style={{marginTop:'0.63rem', marginBottom:'0.8rem', fontSize:'0.9rem', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(quiz.modifiedText, quiz.replacements, false)}}>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2페이지: 교체된단어들 제목 + 교체된단어들 표 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%'}}>
                        교체된 단어들
                      </div>
                      {quiz.replacements && quiz.replacements.length > 0 ? (
                        <div>
                          {renderReplacementsTable()}
                        </div>
                      ) : (
                        <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                          교체된 단어가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3페이지: 한글해석 */}
                <div className="a4-page-template">
                  <div className="a4-page-header">
                    <PrintHeaderWork01 />
                  </div>
                  <div className="a4-page-content">
                    <div className="quiz-content">
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%', marginTop:'1.5rem'}}>
                        본문 해석
                      </div>
                      <div className="problem-passage translation" style={{marginTop:'0.63rem', fontSize:'1rem !important',  padding:'1rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        {quiz.translation || '번역을 생성하는 중...'}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : needsSecondPage ? (
              firstPageIncludesReplacements ? (
                // 2페이지 구성: 1페이지(문제+본문+교체된단어들), 2페이지(한글해석)
                <>
                  {/* 1페이지: 문제제목 + 영어본문 + 교체된단어들 */}
                  <div className="a4-page-template">
                    <div className="a4-page-header">
                      <PrintHeaderWork01 />
                    </div>
                    <div className="a4-page-content">
                      <div className="quiz-content">
                        <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                          문제: 다음 본문을 읽고 해석하세요
                        </div>
                        <div className="problem-passage" style={{marginTop:'0.63rem', marginBottom:'0.8rem', fontSize:'0.9rem', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(quiz.modifiedText, quiz.replacements, false)}}>
                        </div>
                        <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%', marginTop:'1.5rem'}}>
                          교체된 단어들
                        </div>
                        {quiz.replacements && quiz.replacements.length > 0 ? (
                          <div>
                            {renderReplacementsTable()}
                          </div>
                        ) : (
                          <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                            교체된 단어가 없습니다.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2페이지: 한글해석만 */}
                  <div className="a4-page-template">
                    <div className="a4-page-header">
                      <PrintHeaderWork01 />
                    </div>
                    <div className="a4-page-content">
                      <div className="quiz-content">
                        <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%', marginTop:'1.5rem'}}>
                          본문 해석
                        </div>
                        <div className="problem-passage translation" style={{marginTop:'0.63rem', fontSize:'1rem !important', padding:'1rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                          {quiz.translation || '번역을 생성하는 중...'}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // 2페이지 구성: 1페이지(문제+본문), 2페이지(교체된단어들+한글해석)
                <>
                  {/* 1페이지: 문제제목 + 영어본문 */}
                  <div className="a4-page-template">
                    <div className="a4-page-header">
                      <PrintHeaderWork01 />
                    </div>
                    <div className="a4-page-content">
                      <div className="quiz-content">
                        <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                          문제: 다음 본문을 읽고 해석하세요
                        </div>
                        <div className="problem-passage" style={{marginTop:'0.63rem', marginBottom:'0.8rem', fontSize:'0.9rem', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(quiz.modifiedText, quiz.replacements, false)}}>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2페이지: 교체된단어들 제목 + 교체된단어들 표 + 한글해석 */}
                  <div className="a4-page-template">
                    <div className="a4-page-header">
                      <PrintHeaderWork01 />
                    </div>
                    <div className="a4-page-content">
                      <div className="quiz-content">
                        <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%'}}>
                          교체된 단어들
                        </div>
                        {quiz.replacements && quiz.replacements.length > 0 ? (
                          <div>
                            {renderReplacementsTable()}
                          </div>
                        ) : (
                          <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                            교체된 단어가 없습니다.
                          </div>
                        )}
                        <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%', marginTop:'1.5rem'}}>
                          본문 해석
                        </div>
                        <div className="problem-passage translation" style={{marginTop:'0.63rem', fontSize:'1rem !important',  padding:'1rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                          {quiz.translation || '번역을 생성하는 중...'}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )
            ) : (
              // 1페이지 구성: 모든 내용 (문제제목 + 영어본문 + 교체된단어들 + 한글해석)
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'block', width:'100%'}}>
                      문제: 다음 본문을 읽고 해석하세요
                    </div>
                    <div className="problem-passage" style={{marginTop:'0.63rem', marginBottom:'0.8rem', fontSize:'0.9rem', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}} dangerouslySetInnerHTML={{__html: renderPrintTextWithUnderlines(quiz.modifiedText, quiz.replacements, false)}}>
                    </div>
                    <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0rem', display:'block', width:'100%', marginTop:'1.5rem'}}>
                      교체된 단어들
                    </div>
                    {quiz.replacements && quiz.replacements.length > 0 ? (
                      <div style={{marginTop:'0rem'}}>
                        {renderReplacementsTable()}
                      </div>
                    ) : (
                      <div style={{textAlign: 'center', color: '#666', fontStyle: 'italic'}}>
                        교체된 단어가 없습니다.
                      </div>
                    )}
                    <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.8rem', display:'block', width:'100%', marginTop:'1.5rem'}}>
                      본문 해석
                    </div>
                    <div className="problem-passage translation" style={{marginTop:'0.63rem', fontSize:'1rem !important',  padding:'1rem', background:'#F1F8E9', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                      {quiz.translation || '번역을 생성하는 중...'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 입력/옵션/버튼 UI
  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>[유형#02] 독해 문제 생성</h2>
        <p>영어 본문에서 문맥상 의미가 있는 단어를 선정하여, 선정된 단어와 같은 의미를 가진 단어로 교체된 본문을 독해하는 문제를 생성합니다.</p>
      </div>

      {/* 입력 방식 선택 */}
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

      {/* 입력 방식별 안내 및 입력 UI */}
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
            <label htmlFor="reading-image" className="file-upload-btn">
              파일 선택
              <input
                id="reading-image"
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
          <label htmlFor="reading-text" className="input-label">
            영어 본문 직접 붙여넣기:
          </label>
          {inputText.length < 100 && (
            <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
          )}
        </div>
        <textarea
          id="reading-text"
          ref={textAreaRef}
          value={inputText}
          onChange={handleInputChange}
          placeholder="독해 문제를 만들고 싶은 영어 본문을 붙여넣어 주세요. AI가 중요한 단어/숙어를 선정하여 유의어로 교체한 독해 문제를 생성합니다."
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
        onClick={generateReadingQuiz}
        disabled={isLoading || !inputText.trim()}
        className="generate-button"
      >
          독해 문제 생성
        </button>

        {/* 화면 중앙 모래시계 로딩 스피너 */}
        {(isLoading || isExtractingText) && (
          <div className="centered-hourglass-overlay">
            <div className="centered-hourglass-content">
              <span className="centered-hourglass-spinner">⏳</span>
              <div className="loading-text">
                {isExtractingText ? '📄 텍스트 추출 중...' : '📋 독해 문제 생성 중...'}
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
        workTypeName="유형#02 독해 문제 생성"
        pointsToDeduct={pointsToDeduct}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - pointsToDeduct}
      />
    </div>
  );
};

export default Work_02_ReadingComprehension; 