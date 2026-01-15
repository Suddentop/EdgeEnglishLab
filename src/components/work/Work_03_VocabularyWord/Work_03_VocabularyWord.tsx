import React, { useState, ChangeEvent, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './Work_03_VocabularyWord.css';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import { extractTextFromImage, callOpenAI, translateToKorean } from '../../../services/common';
import { generateWork03Quiz } from '../../../services/work03Service';
import '../../../styles/PrintFormat.css';
import PrintFormatWork03New from './PrintFormatWork03New';
import { processWithConcurrency } from '../../../utils/concurrency';

// A4 페이지 설정 상수 (실제 A4 크기 기준, px 단위)
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

// 텍스트 높이 계산 함수 (실제 A4 크기 기준, px 단위) - 정확한 계산
function calculateContainerHeight(text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number {
  // 실제 A4 콘텐츠 너비 사용 (754px - 좌우 패딩 40px = 714px)
  const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40; // px
  
  // 더 정확한 문자 폭 계산 (영어: 0.6, 한글: 1.0, 혼합: 0.7)
  const hasKorean = /[가-힣]/.test(text);
  const charWidthPx = hasKorean ? fontSize * 0.7 : fontSize * 0.6;
  
  const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
  const lines = Math.ceil(text.length / charsPerLine);
  
  // 기본 패딩만 사용 (추가 여백 제거)
  return (lines * fontSize * lineHeight) + padding; // px 단위로 반환
}

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

// 입력 아이템 인터페이스 (Work_01, Work_02와 동일)
type InputType = 'clipboard' | 'file' | 'text';

interface InputItem {
  id: string;
  inputType: InputType;
  text: string;
  pastedImageUrl: string | null;
  isExpanded: boolean;
  isExtracting: boolean;
  error: string;
}

// 파일 → base64 변환
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface BlankQuiz {
  id?: string;
  blankedText: string;
  options: string[];
  answerIndex: number;
  translation?: string;
}

const Work_03_VocabularyWord: React.FC = () => {
  const { userData, loading } = useAuth();
  
  // 상태 관리: 여러 아이템 지원
  const [items, setItems] = useState<InputItem[]>([
    { id: '1', inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }
  ]);
  
  const [quizzes, setQuizzes] = useState<BlankQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);
  
  // 아이템 관리 함수들
  const addItem = () => {
    const newItem: InputItem = {
      id: Date.now().toString(),
      inputType: 'text', 
      text: '',
      pastedImageUrl: null,
      isExpanded: true,
      isExtracting: false,
      error: ''
    };
    setItems(prev => prev.map(item => ({ ...item, isExpanded: false })).concat(newItem));
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      setItems([{ id: Date.now().toString(), inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }]);
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<InputItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const toggleExpand = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isExpanded: !item.isExpanded } : item));
  };

  // 이미지 -> 텍스트 (개별 아이템용)
  const handleImageToText = async (id: string, image: File | Blob) => {
    updateItem(id, { isExtracting: true, error: '' });
    
    try {
      let previewUrl = null;
      if (image instanceof Blob) {
        previewUrl = URL.createObjectURL(image);
        updateItem(id, { pastedImageUrl: previewUrl });
      }
      
      const imageBase64 = await fileToBase64(image as File);
      const resultText = await extractTextFromImage(imageBase64);
      
      updateItem(id, { 
        text: resultText,
        isExtracting: false 
      });
    } catch (err: any) {
      updateItem(id, { 
        error: '이미지 텍스트 추출 실패: ' + (err?.message || err),
        isExtracting: false
      });
    }
  };

  const handlePaste = (id: string, e: React.ClipboardEvent) => {
    const item = items.find(i => i.id === id);
    if (!item || item.inputType !== 'clipboard') return;

    const clipItems = e.clipboardData.items;
    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.indexOf('image') !== -1) {
        const file = clipItems[i].getAsFile();
        if (file) {
          handleImageToText(id, file);
          e.preventDefault();
          return;
        }
      }
    }
  };

  const handleFileChange = (id: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      updateItem(id, { error: '이미지 파일만 첨부 가능합니다.' });
      return;
    }
    handleImageToText(id, file);
    e.target.value = '';
  };

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

  // 문제 생성 후 스크롤 최상단
  useEffect(() => {
    if (quizzes.length > 0) {
      window.scrollTo(0, 0);
    }
  }, [quizzes]);

  // 페이지 분할 계산 함수 (개별 퀴즈용 - 현재는 사용하지 않지만 호환성을 위해 유지)
  const calculatePageLayoutForQuiz = (quizData: BlankQuiz): any => {
    if (!quizData || !quizData.translation) return {
      needsSecondPage: false,
      needsThirdPage: false
    };

    // 실제 A4 콘텐츠 영역 높이 사용
    const availableHeight = A4_CONFIG.CONTENT_HEIGHT; // 1048px
    
    // A. 문제 제목 컨테이너 + 영어 본문 컨테이너 높이 (여백 최적화)
    const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT; // 제목 높이만
    const englishPassageHeight = calculateContainerHeight(quizData.blankedText, 38, 16, 1.7); // 본문 높이
    const sectionAHeight = problemTitleHeight + englishPassageHeight; // 제목과 본문 사이 여백은 calculateContainerHeight 내부 패딩으로 처리
    
    // B. 4지선다 선택항목 컨테이너 높이 (여백 최적화)
    const optionsHeaderHeight = A4_CONFIG.OPTIONS_HEADER_HEIGHT; // 제목 높이만
    let optionsHeight = 0;
    quizData.options.forEach(option => {
      optionsHeight += calculateContainerHeight(`${option} (정답)`, 11, 16, 1.3);
    });
    const sectionBHeight = optionsHeaderHeight + optionsHeight; // 제목과 선택지 사이 여백은 calculateContainerHeight 내부 패딩으로 처리
    
    // C. 본문해석 제목 컨테이너 + 한글 해석 컨테이너 높이 (여백 최적화)
    const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT; // 제목 높이만
    const translationHeight = calculateContainerHeight(quizData.translation || '', 38, 16, 1.7); // 해석 높이
    const sectionCHeight = translationHeaderHeight + translationHeight; // 제목과 해석 사이 여백은 calculateContainerHeight 내부 패딩으로 처리
    
    // 안전 마진 적용 (실제 A4 기준 적절한 여백)
    const safetyMargin = 50; // px (실제 A4 기준 적절한 여백)
    const effectiveAvailableHeight = availableHeight - safetyMargin;
    // 1048 - 50 = 998px
    
    console.log('📏 유형#03 동적 페이지 분할 계산 (실제 A4 크기 기준):', {
      availableHeight: availableHeight.toFixed(2) + 'px',
      sectionAHeight: sectionAHeight.toFixed(2) + 'px',
      sectionBHeight: sectionBHeight.toFixed(2) + 'px',
      sectionCHeight: sectionCHeight.toFixed(2) + 'px',
      totalHeight: (sectionAHeight + sectionBHeight + sectionCHeight).toFixed(2) + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
      quizTextLength: quizData.blankedText.length,
      translationTextLength: (quizData.translation || '').length,
      // 상세 계산 정보
      problemTitleHeight: problemTitleHeight.toFixed(2) + 'px',
      englishPassageHeight: englishPassageHeight.toFixed(2) + 'px',
      optionsHeaderHeight: optionsHeaderHeight.toFixed(2) + 'px',
      optionsHeight: optionsHeight.toFixed(2) + 'px',
      translationHeaderHeight: translationHeaderHeight.toFixed(2) + 'px',
      translationHeight: translationHeight.toFixed(2) + 'px'
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
    
    // 페이지 분할 로직 (실제 A4 크기 기준)
    const totalHeight = sectionAHeight + sectionBHeight + sectionCHeight;
    
    if (totalHeight <= effectiveAvailableHeight) {
      // A+B+C ≤ 998px → 1페이지에 A,B,C 모두 포함
      return {
        needsSecondPage: false,
        needsThirdPage: false,
        page1Content: 'A+B+C',
        page2Content: '',
        page3Content: ''
      };
    } else if (sectionAHeight + sectionBHeight <= effectiveAvailableHeight) {
      // A+B+C > 998px, A+B ≤ 998px → 1페이지 A+B 포함, 2페이지에 C 포함
      if (sectionCHeight <= effectiveAvailableHeight) {
        // C가 한 페이지에 들어갈 수 있음
        return {
          needsSecondPage: true,
          needsThirdPage: false,
          page1Content: 'A+B',
          page2Content: 'C',
          page3Content: ''
        };
      } else {
        // C가 한 페이지에 들어가지 않음 → 2페이지에 C 일부, 3페이지에 C 나머지
        return {
          needsSecondPage: true,
          needsThirdPage: true,
          page1Content: 'A+B',
          page2Content: 'C-part1',
          page3Content: 'C-part2'
        };
      }
    } else if (sectionAHeight <= effectiveAvailableHeight) {
      // A+B+C > 998px, A+B > 998px, A ≤ 998px → 1페이지에 A포함, 2페이지에 B+C포함
      if (sectionBHeight + sectionCHeight <= effectiveAvailableHeight) {
        // B+C가 한 페이지에 들어갈 수 있음
        return {
          needsSecondPage: true,
          needsThirdPage: false,
          page1Content: 'A',
          page2Content: 'B+C',
          page3Content: ''
        };
      } else {
        // B+C가 한 페이지에 들어가지 않음 → 2페이지에 B, 3페이지에 C
        return {
          needsSecondPage: true,
          needsThirdPage: true,
          page1Content: 'A',
          page2Content: 'B',
          page3Content: 'C'
        };
      }
    } else {
      // A+B+C > 998px, A+B > 998px, A > 998px → 1페이지에 A포함, 2페이지에 B포함, 3페이지에 C포함
      return {
        needsSecondPage: true,
        needsThirdPage: true,
        page1Content: 'A',
        page2Content: 'B',
        page3Content: 'C'
      };
    }
  };



  // 본문 → 빈칸 문제/객관식 생성 (AI) - work03Service 사용
  // 이 함수는 호환성을 위해 유지하지만, 실제로는 generateWork03Quiz를 사용합니다.
  async function generateBlankQuizWithAI(passage: string, previouslySelectedWords?: string[]): Promise<BlankQuiz> {
    // work03Service의 generateWork03Quiz 함수 사용
    return await generateWork03Quiz(passage, previouslySelectedWords);
  }

  // 영어본문 한글 번역 함수
  async function translateToKorean(englishText: string): Promise<string> {
    const prompt = `다음 영어 본문을 자연스러운 한국어로 번역해주세요. 번역만 출력하고 다른 설명은 하지 마세요.

영어 본문:
${englishText}`;

    // 공통 헬퍼 함수 사용 (프록시 자동 지원)
    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 호출 실패: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  // 문제 생성 (포인트 차감 포함)
  const handleGenerateQuiz = async () => {
    const validItems = items.filter(item => item.text.trim().length >= 10);
    
    if (validItems.length === 0) {
      alert('문제 생성을 위해 최소 하나의 본문을 입력해주세요.');
      return;
    }
    
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
    const workType = workTypePoints.find(wt => wt.id === '3');
    if (!workType) {
      alert('포인트 설정을 불러올 수 없습니다.');
      return;
    }

    const requiredPoints = workType.points * validItems.length;
    if (userCurrentPoints < requiredPoints) {
      alert(`포인트가 부족합니다. 현재 ${userCurrentPoints.toLocaleString()}P, 필요 ${requiredPoints.toLocaleString()}P (${workType.points.toLocaleString()}P × ${validItems.length}개)`);
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

    const validItems = items.filter(item => item.text.trim().length >= 10);
    if (validItems.length === 0) return;

    setIsLoading(true);
    setQuizzes([]);
    let deductedPoints = 0;
    
    try {
      // 포인트 차감
      const workType = workTypePoints.find(wt => wt.id === '3');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const requiredPoints = workType.points * validItems.length;
      const deductionResult = await deductUserPoints(
        userData.uid,
        '3',
        workType.name,
        userData.name || '사용자',
        userData.nickname || '사용자',
        requiredPoints
      );

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
      }

      deductedPoints = deductionResult.deductedPoints;
      setUserCurrentPoints(deductionResult.remainingPoints);

      // 동일한 본문별로 그룹화하여 이전 선택 추적
      const passageGroups = new Map<string, { items: typeof validItems, selectedWords: string[] }>();
      
      validItems.forEach(item => {
        const passage = item.text.trim();
        if (!passageGroups.has(passage)) {
          passageGroups.set(passage, { items: [], selectedWords: [] });
        }
        passageGroups.get(passage)!.items.push(item);
      });

      const generatedQuizzes: BlankQuiz[] = [];

      // 각 본문 그룹별로 순차 처리 (동일 본문 내에서 이전 선택 추적)
      for (const [passage, group] of Array.from(passageGroups.entries())) {
        console.log(`📝 본문 그룹 처리 시작: "${passage.substring(0, 50)}..." (${group.items.length}개 아이템)`);
        
        // 동일 본문 내에서는 순차 처리
        for (let i = 0; i < group.items.length; i++) {
          const item = group.items[i];
          
          try {
            console.log(`  🔄 아이템 ${i + 1}/${group.items.length} 처리 중...`);
            console.log(`  📌 이전 선택 단어: ${group.selectedWords.length > 0 ? group.selectedWords.join(', ') : '없음'}`);
            
            // 이전 선택 단어를 포함하여 문제 생성
            const quizData = await generateWork03Quiz(passage, group.selectedWords);
            const translation = await translateToKorean(passage);
            
            const quizDataWithTranslation: BlankQuiz = { 
              ...quizData, 
              translation,
              id: item.id
            };
            
            // 생성된 문제의 정답 단어를 이전 선택 목록에 추가
            const selectedWord = quizData.options[quizData.answerIndex];
            group.selectedWords.push(selectedWord);
            console.log(`  ✅ 정답 단어 "${selectedWord}" 선택됨 (이제 제외 목록에 추가됨)`);
            
            generatedQuizzes.push(quizDataWithTranslation);
          } catch (itemError: any) {
            console.error(`아이템 ${item.id} 처리 중 오류:`, itemError);
            alert(`본문 "${passage.substring(0, 50)}..." 처리 중 오류가 발생했습니다: ${itemError.message}`);
          }
        }
      }

      if (generatedQuizzes.length === 0) {
        throw new Error('생성된 문제가 없습니다.');
      }

      setQuizzes(generatedQuizzes);

      // 문제 생성 내역 저장 (여러 퀴즈를 배열로 저장)
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          const workType = workTypePoints.find(wt => wt.id === '3');
          const requiredPoints = workType ? workType.points * validItems.length : 0;
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '03',
            workTypeName: getWorkTypeName('03'),
            points: requiredPoints, // 실제 차감된 포인트 (workType.points * validItems.length)
            inputText: validItems.map(item => item.text.trim()).join('\n\n---\n\n'),
            quizData: generatedQuizzes, // 배열로 저장
            status: 'success'
          });
          console.log('✅ Work_03 내역 저장 완료 (번역 포함)', generatedQuizzes.length, '개 문제');
        } catch (historyError) {
          console.error('❌ Work_03 내역 저장 실패:', historyError);
        }
      }
      
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

  // 인쇄 핸들러 - 추후 구현 예정
  // const handlePrintNoAnswer = () => { ... }
  // const handlePrintWithAnswer = () => { ... }
  // 리셋
  const resetAll = () => {
    setQuizzes([]);
    setItems([{ id: Date.now().toString(), inputType: 'text', text: '', pastedImageUrl: null, isExpanded: true, isExtracting: false, error: '' }]);
  };

  // 인쇄 핸들러 (Work_02 방식 적용)
  const triggerPrint = (mode: 'no-answer' | 'with-answer') => {
    if (quizzes.length === 0) return;
    
    console.log('🖨️ 인쇄 시작:', mode);
    
    const styleId = 'print-style-work03-landscape';
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @page {
        size: A4 landscape !important;
        margin: 0 !important;
      }
      @media print {
        html, body {
          width: 29.7cm !important;
          height: 21cm !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #root {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    const printContainer = document.createElement('div');
    printContainer.id = mode === 'with-answer' ? 'print-root-work03-new-answer' : 'print-root-work03-new';
    document.body.appendChild(printContainer);

    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.display = 'none';
    }

    const root = ReactDOM.createRoot(printContainer);
    root.render(<PrintFormatWork03New quizzes={quizzes} isAnswerMode={mode === 'with-answer'} />);

    const activatePrintContainer = () => {
      const inner = printContainer.querySelector('.print-container, .print-container-answer');
      if (inner) {
        inner.classList.add('pdf-generation-active');
      } else {
        requestAnimationFrame(activatePrintContainer);
      }
    };
    activatePrintContainer();

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        root.unmount();
        document.body.removeChild(printContainer);
        if (appRoot) {
          appRoot.style.display = 'block';
        }
        const styleElement = document.getElementById(styleId);
        if (styleElement) {
          document.head.removeChild(styleElement);
        }
        console.log('✅ 인쇄 완료');
      }, 100);
    }, 500);
  };

  // 퀴즈 결과 화면
  if (quizzes.length > 0) {
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#03. 빈칸(단어) 추론 문제 (총 {quizzes.length}문제)</h2>
            <div className="quiz-header-buttons no-print">
              <button onClick={resetAll} className="reset-button" style={{
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
              <button onClick={() => triggerPrint('no-answer')} className="print-button" style={{
                width: '130px',
                height: '48px',
                padding: '0.75rem 1rem',
                fontSize: '11pt',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(102, 126, 234, 0.25)',
                marginRight: '10px'
              }}>🖨️ 인쇄 (문제)</button>
              <button onClick={() => triggerPrint('with-answer')} className="print-button" style={{
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
              }}>🖨️ 인쇄 (정답)</button>
            </div>
          </div>
          <div className="quiz-content no-print">
            <div style={{ padding: '1rem', background: '#f0f7ff', borderRadius: '8px', marginBottom: '2rem', borderLeft: '4px solid #1976d2' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1976d2' }}>총 {quizzes.length}개의 문제가 생성되었습니다.</h3>
            </div>

            {quizzes.map((quiz, idx) => {
              const quizId = quiz.id || `quiz-${idx}`;
              const displayBlankedText = quiz.blankedText;
              
              return (
                <div key={quizId} className="quiz-item-card" style={{ 
                  marginBottom: '2rem', 
                  padding: '1.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0'
                }}>
                  <div className="quiz-item-header work03-header" style={{ 
                    marginBottom: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '0.5rem'
                  }}>
                    <h3 style={{ margin: 0, color: '#333', fontSize: '1rem', fontWeight: '500' }}>
                      문제 {idx + 1} : 빈칸(단어) 추론
                    </h3>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      유형#03
                    </span>
                  </div>

                  <div className="problem-instruction work03-instruction" style={{
                    fontWeight: 500, 
                    fontSize: '0.95rem', 
                    background: '#f5f5f5', 
                    color: '#000', 
                    padding: '0.6rem 1rem', 
                    borderRadius: '0', 
                    marginBottom: '1.5rem',
                    textAlign: 'left',
                    borderTop: '1px solid #e0e0e0',
                    borderBottom: '1px solid #e0e0e0'
                  }}>
                    다음 빈칸에 들어갈 단어로 가장 적절한 것을 고르시오.
                  </div>
                  
                  <div className="problem-passage work03-passage" style={{
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    margin: '0 0 1.5rem 0',
                    background: '#ffffff',
                    backgroundColor: '#ffffff',
                    border: '1px solid transparent',
                    padding: '1rem',
                    fontFamily: 'inherit',
                    color: '#333'
                  }}>
                    {displayBlankedText}
                  </div>
                  
                  <div className="problem-options work03-options" style={{
                    margin: '0 0 1.5rem 0',
                    backgroundColor: '#ffffff',
                    background: '#ffffff',
                    border: '1px solid transparent'
                  }}>
                    {quiz.options.map((opt, i) => (
                      <div key={i} className="option work03-option" style={{
                        display: 'block',
                        fontSize: '1rem',
                        margin: '0.5rem 0',
                        padding: '0.5rem 1rem',
                        fontFamily: 'inherit',
                        backgroundColor: '#ffffff',
                        background: '#ffffff',
                        border: '1px solid transparent',
                        borderRadius: '0',
                        color: '#333'
                      }}>
                        {`①②③④⑤`[i] || `${i+1}.`} {opt}
                      </div>
                    ))}
                  </div>

                  {quiz.translation && (
                    <div className="translation-section" style={{ marginTop: '2rem' }}>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600', color: '#333' }}>본문 해석:</h3>
                      <div className="translation-content work03-translation" style={{
                        background: '#F5F5F5',
                        backgroundColor: '#F5F5F5',
                        padding: '1rem',
                        borderRadius: '0',
                        fontSize: '1rem',
                        lineHeight: 1.7,
                        color: '#333',
                        border: '1px solid transparent'
                      }}>
                        {quiz.translation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
                      </div>
                </div>
        {/* 인쇄 기능은 추후 구현 예정 */}
      </div>
    );
  }

  // 입력/옵션/버튼 UI
  return (
    <div className="quiz-generator">
      <div className="generator-header">
        <h2>메뉴#03. 빈칸(단어) 추론 문제 생성</h2>
        <p>여러 개의 본문을 입력하여 한 번에 여러 문제를 생성할 수 있습니다.</p>
      </div>

      <div className="input-items-list">
        {items.map((item, index) => (
          <div key={item.id} className={`input-item ${item.isExpanded ? 'expanded' : ''}`}>
            <div className="input-item-header" onClick={() => toggleExpand(item.id)}>
              <div className="input-item-title">
                <span>#{index + 1}</span>
                <span className={`input-item-status ${item.text.length > 0 ? 'has-text' : ''}`}>
                  {item.text.length > 0 ? `텍스트 ${item.text.length}자` : '입력 대기'}
                </span>
      </div>
              <div className="input-item-controls">
                <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} title="삭제">🗑️</button>
                <span className="expand-icon">{item.isExpanded ? '🔼' : '🔽'}</span>
            </div>
            </div>

            {item.isExpanded && (
              <div className="input-item-content">
                <div className="input-type-section" style={{ marginBottom: '15px' }}>
                  <label><input type="radio" checked={item.inputType === 'clipboard'} onChange={() => updateItem(item.id, { inputType: 'clipboard', error: '' })} /><span>📸 캡처화면 붙여넣기</span></label>
                  <label><input type="radio" checked={item.inputType === 'file'} onChange={() => updateItem(item.id, { inputType: 'file', error: '' })} /><span>🖼️ 이미지 파일 첨부</span></label>
                  <label><input type="radio" checked={item.inputType === 'text'} onChange={() => updateItem(item.id, { inputType: 'text', error: '' })} /><span>✍️ 직접 붙여넣기</span></label>
        </div>
                   
                {item.inputType === 'clipboard' && (
                  <div className="input-guide" tabIndex={0} onPaste={(e) => handlePaste(item.id, e)} style={{ minHeight: '120px' }}>
                    <div className="drop-icon">📋</div>
                    <div className="drop-text">여기에 이미지를 붙여넣으세요 (Ctrl+V)</div>
                    {item.pastedImageUrl && <div className="preview-row"><img src={item.pastedImageUrl} alt="Preview" className="preview-img" /></div>}
                    {item.isExtracting && <div className="loading-text">텍스트 추출 중...</div>}
              </div>
            )}
                {item.inputType === 'file' && (
                  <div className="input-guide" style={{ minHeight: '80px' }}>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(item.id, e)} disabled={item.isExtracting} />
                    {item.isExtracting && <span className="loading-text">추출 중...</span>}
        </div>
      )}

        <textarea
                  value={item.text}
                  onChange={(e) => updateItem(item.id, { text: e.target.value })}
                  placeholder="영어 본문이 여기에 표시됩니다. 직접 입력하거나 수정할 수 있습니다."
          className="text-input"
                  rows={6}
                  style={{ marginTop: '10px', width: '100%' }}
        />
                {item.error && <div className="error-message">❌ {item.error}</div>}
        </div>
            )}
          </div>
        ))}
      </div>
      
      <button onClick={addItem} className="add-item-button">➕ 본문 추가하기</button>
      
      <button onClick={handleGenerateQuiz} disabled={isLoading} className="generate-button" style={{ marginTop: '20px' }}>
        {items.filter(i => i.text.length >= 10).length > 1 ? `📋 ${items.filter(i => i.text.length >= 10).length}개 문제 일괄 생성` : '📋 어휘(빈칸) 문제 생성'}
      </button>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="centered-hourglass-overlay">
          <div className="centered-hourglass-content">
            <span className="centered-hourglass-spinner">⏳</span>
            <div className="loading-text">문제 생성 중...</div>
          </div>
        </div>
      )}
      
      <ScreenshotHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={handlePointDeductionConfirm}
        workTypeName={`어휘(빈칸) 문제 생성 (${items.filter(i => i.text.length >= 10).length}문제)`}
        pointsToDeduct={pointsToDeduct}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - pointsToDeduct}
      />
    </div>
  );
};

export default Work_03_VocabularyWord; 