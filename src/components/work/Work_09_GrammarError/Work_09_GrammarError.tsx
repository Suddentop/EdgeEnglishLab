import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import './Work_09_GrammarError.css';
import PrintHeader from '../../common/PrintHeader';
import PrintHeaderWork01 from '../../common/PrintHeaderWork01';
import '../../../styles/PrintFormat.css';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import { extractTextFromImage, callOpenAI } from '../../../services/common';

const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];
type PrintMode = 'none' | 'no-answer' | 'with-answer';

interface GrammarQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  original: string; // 정답의 원래(정상) 단어/구
}

const Work_09_GrammarError: React.FC = () => {
  const { userData, loading } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<GrammarQuiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const [needsSecondPage, setNeedsSecondPage] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [pageLayoutInfo, setPageLayoutInfo] = useState({
    needsSecondPage: false,
    needsThirdPage: false,
    page1Content: '',
    page2Content: '',
    page3Content: ''
  });

  // A4 페이지 설정 (실제 A4 크기 기준, px 단위)
  const A4_CONFIG = {
    PAGE_WIDTH: 794,
    PAGE_HEIGHT: 1123,
    TOP_MARGIN: 25,
    BOTTOM_MARGIN: 25,
    LEFT_MARGIN: 20,
    RIGHT_MARGIN: 20,
    HEADER_HEIGHT: 30,
    FOOTER_HEIGHT: 20,
    CONTENT_WIDTH: 754,
    CONTENT_HEIGHT: 1048,
    INSTRUCTION_HEIGHT: 30,
    INSTRUCTION_MARGIN: 11,
    OPTIONS_HEADER_HEIGHT: 30,
    OPTIONS_HEADER_MARGIN: 11,
    TRANSLATION_HEADER_HEIGHT: 30,
    TRANSLATION_HEADER_MARGIN: 11,
  };

  // 텍스트 높이 계산 함수 (실제 A4 크기 기준)
  function calculateContainerHeight(text: string, padding: number = 38, fontSize: number = 16, lineHeight: number = 1.7): number {
    const availableWidthPx = A4_CONFIG.CONTENT_WIDTH - 40;
    const charWidthPx = fontSize * 0.55;
    const charsPerLine = Math.floor(availableWidthPx / charWidthPx);
    const lines = Math.ceil(text.length / charsPerLine);
    return (lines * fontSize * lineHeight) + padding;
  }
  
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
        
        // 유형#09의 포인트 설정
        const workType9Points = points.find(wt => wt.id === '9')?.points || 0;
        setPointsToDeduct(workType9Points);
        
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

  // 동적 페이지 분할 로직 (유형#03 방식 적용)
  useEffect(() => {
    if (!quiz) return;

    const availableHeight = A4_CONFIG.CONTENT_HEIGHT;
    const safetyMargin = 100; // 보수적 여백으로 증가
    const effectiveAvailableHeight = availableHeight - safetyMargin;

    // A. 문제 제목 + 영어 본문 컨테이너
    const problemTitleHeight = A4_CONFIG.INSTRUCTION_HEIGHT + A4_CONFIG.INSTRUCTION_MARGIN;
    const englishPassageHeight = calculateContainerHeight(quiz.passage, 16, 16, 1.7); // padding 0.5rem = 8px, 상하 합계 16px
    const sectionAHeight = problemTitleHeight + englishPassageHeight;

    // B. 4지선다 선택항목 컨테이너 (제목 제거됨)
    let optionsHeight = 0;
    quiz.options.forEach(option => {
      optionsHeight += calculateContainerHeight(`${option}`, 11, 16, 1.3);
    });
    const sectionBHeight = optionsHeight;

    // C. 본문해석 제목 + 한글 해석 컨테이너 (동적 크기)
    const translationHeaderHeight = A4_CONFIG.TRANSLATION_HEADER_HEIGHT + A4_CONFIG.TRANSLATION_HEADER_MARGIN;
    const translationHeight = calculateContainerHeight(quiz.translation, 32, 12.8, 1.7); // padding 1rem = 16px, 상하 합계 32px, fontSize 0.8rem = 12.8px
    const sectionCHeight = translationHeaderHeight + translationHeight;

    const totalHeight = sectionAHeight + sectionBHeight + sectionCHeight;

    // Debugging logs for height calculations
    console.log('📏 유형#09 동적 페이지 분할 계산:', {
      availableHeight: availableHeight.toFixed(2) + 'px',
      sectionAHeight: sectionAHeight.toFixed(2) + 'px',
      sectionBHeight: sectionBHeight.toFixed(2) + 'px',
      sectionCHeight: sectionCHeight.toFixed(2) + 'px',
      totalHeight: totalHeight.toFixed(2) + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight.toFixed(2) + 'px',
      passageLength: quiz.passage.length,
      translationLength: quiz.translation.length
    });

    // 실제 A4 크기 기준 검증
    console.log('🔍 실제 A4 크기 기준 계산:', {
      A4_SIZE: '210mm × 297mm = 794px × 1123px (96 DPI)',
      CONTENT_AREA: A4_CONFIG.CONTENT_WIDTH + 'px × ' + A4_CONFIG.CONTENT_HEIGHT + 'px',
      availableHeight: availableHeight + 'px',
      safetyMargin: safetyMargin + 'px',
      effectiveAvailableHeight: effectiveAvailableHeight + 'px'
    });

    // 페이지 분할 조건 (유형#03과 동일한 로직)
    if (totalHeight <= effectiveAvailableHeight) {
      // 케이스 1: A+B+C ≤ 998px → 1페이지에 모든 내용
      setPageLayoutInfo({ needsSecondPage: false, needsThirdPage: false, page1Content: 'A+B+C', page2Content: '', page3Content: '' });
      setNeedsSecondPage(false);
    } else if (sectionAHeight + sectionBHeight <= effectiveAvailableHeight) {
      // 케이스 2: A+B ≤ 998px → 1페이지에 A+B, 2페이지에 C
      if (sectionCHeight <= effectiveAvailableHeight) {
        setPageLayoutInfo({ needsSecondPage: true, needsThirdPage: false, page1Content: 'A+B', page2Content: 'C', page3Content: '' });
      } else {
        setPageLayoutInfo({ needsSecondPage: true, needsThirdPage: true, page1Content: 'A+B', page2Content: 'C-part1', page3Content: 'C-part2' });
      }
      setNeedsSecondPage(true);
    } else if (sectionAHeight <= effectiveAvailableHeight) {
      // 케이스 3: A ≤ 998px → 1페이지에 A, 2페이지에 B+C
      if (sectionBHeight + sectionCHeight <= effectiveAvailableHeight) {
        setPageLayoutInfo({ needsSecondPage: true, needsThirdPage: false, page1Content: 'A', page2Content: 'B+C', page3Content: '' });
      } else {
        setPageLayoutInfo({ needsSecondPage: true, needsThirdPage: true, page1Content: 'A', page2Content: 'B', page3Content: 'C' });
      }
      setNeedsSecondPage(true);
    } else {
      // 케이스 4: A > 998px → 1페이지에 A, 2페이지에 B, 3페이지에 C
      setPageLayoutInfo({ needsSecondPage: true, needsThirdPage: true, page1Content: 'A', page2Content: 'B', page3Content: 'C' });
      setNeedsSecondPage(true);
    }
  }, [quiz]);

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
    
    // 공통 헬퍼 함수 사용 (프록시 자동 지원)
    return await extractTextFromImage(base64);
  }

  // ===== 새로운 단계별 MCP 방식 =====
  
  // MCP 1: 단어 선정 서비스
  async function selectWords(passage: string): Promise<string[]> {
    const prompt = `아래 영어 본문에서 어법(문법) 변형이 가능한 서로 다른 "단어" 5개만 선정하세요.

중요한 규칙:
- 반드시 "단어"만 선정하세요. 여러 단어로 이루어진 구(phrase)는 절대 선정하지 마세요.
- 동일한 단어를 두 번 이상 선택하지 마세요.
- 반드시 각기 다른 문장에서 1개씩만 단어를 선정하세요. (즉, 한 문장에 2개 이상의 단어를 선택하지 마세요.)
- 어법(문법) 변형이 가능한 단어만 선정하세요 (동사, 명사, 형용사, 부사 등).

결과는 아래 JSON 배열 형식으로만 반환하세요:
["단어1", "단어2", "단어3", "단어4", "단어5"]

본문:
${passage}`;

    // 공통 헬퍼 함수 사용 (프록시 자동 지원)
    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that only returns valid JSON arrays.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 호출 실패: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // 마크다운 코드 블록 제거
    let wordsJson = content;
    if (content.includes('```Json') || content.includes('```json')) {
      wordsJson = content.replace(/```(?:Json|json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
    }
    
    try {
      const words = JSON.parse(wordsJson);
      if (!Array.isArray(words) || words.length !== 5) {
        throw new Error('Invalid word selection format');
      }
      return words;
    } catch (error) {
      console.error('단어 선정 실패:', error);
      throw new Error('단어 선정에 실패했습니다.');
    }
  }

  // MCP 2: 번호/밑줄 적용 서비스
  // 원본 단어와 변형된 단어를 매핑하여 본문에 적용하는 함수 (등장 순서대로 번호 매기기)
  function applyNumberAndUnderline(
    passage: string, 
    originalWords: string[], 
    transformedWords: string[]
  ): string {
    let result = passage;
    
    // 1단계: 본문에서 각 단어의 위치를 찾아서 등장 순서대로 정렬
    const wordPositions: { word: string, transformedWord: string, index: number, position: number }[] = [];
    
    originalWords.forEach((originalWord, index) => {
      const transformedWord = transformedWords[index];
      const regex = new RegExp(`\\b${originalWord}\\b`);
      const match = result.match(regex);
      if (match && match.index !== undefined) {
        wordPositions.push({
          word: originalWord,
          transformedWord: transformedWord,
          index: index,
          position: match.index
        });
      }
    });
    
    // 본문에서 등장하는 위치 순서대로 정렬
    wordPositions.sort((a, b) => a.position - b.position);
    
    console.log('단어 등장 순서:', wordPositions.map((wp, i) => 
      `${i + 1}. "${wp.word}" → "${wp.transformedWord}" (위치: ${wp.position})`
    ));
    
    // 2단계: 등장 순서대로 번호를 매기면서 교체 (뒤에서부터 처리해서 위치 변화 방지)
    const used = new Set<string>();
    wordPositions.reverse().forEach((wordPos, reverseIndex) => {
      const numberIndex = wordPositions.length - 1 - reverseIndex; // 실제 번호 (0~4)
      const num = '①②③④⑤'[numberIndex];
      
      // 이미 변환된 단어는 건너뜀 (중복 방지)
      if (used.has(wordPos.word)) return;
      
      // 원본 단어를 변형된 단어로 교체하면서 번호/밑줄 적용
      const regex = new RegExp(`\\b${wordPos.word}\\b`);
      if (regex.test(result)) {
        result = result.replace(regex, `${num}<u>${wordPos.transformedWord}</u>`);
        used.add(wordPos.word);
        console.log(`단어 교체: "${wordPos.word}" → "${wordPos.transformedWord}" (번호: ${numberIndex + 1})`);
      }
    });
    
    // 번호 매핑 검증 로깅
    console.log('=== 번호 매핑 검증 ===');
    console.log('단어 등장 순서:', wordPositions.map((wp, i) => ({
      순서: i + 1,
      번호: '①②③④⑤'[i],
      원본단어: wp.word,
      변형단어: wp.transformedWord,
      원본인덱스: wp.index
    })));
    
    // 5개 모두 적용되었는지 검증
    const numCount = (result.match(/[①②③④⑤]/g) || []).length;
    const underlineCount = (result.match(/<u>.*?<\/u>/g) || []).length;
    
    console.log(`번호/밑줄 적용 결과: 번호 ${numCount}개, 밑줄 ${underlineCount}개`);
    
    if (numCount !== 5 || underlineCount !== 5) {
      throw new Error(`번호/밑줄 적용 실패: 번호 ${numCount}개, 밑줄 ${underlineCount}개 적용됨`);
    }
    
    return result;
  }

  // 마크다운 밑줄을 <u>태그로 변환하는 함수 추가
  function convertMarkdownUnderlineToU(text: string): string {
    // **단어** 또는 __단어__ 또는 _단어_ 를 <u>단어</u>로 변환
    return text
      .replace(/\*\*(.+?)\*\*/g, '<u>$1</u>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/_(.+?)_/g, '<u>$1</u>');
  }

  // MCP 3: 어법 변형 서비스 (재시도 로직 포함)
  async function transformWord(words: string[]): Promise<{
    transformedWords: string[];
    answerIndex: number;
    original: string;
    grammarType: string;
  }> {
    const grammarTypes = [
      '시제', '조동사', '수동태', '준동사', '가정법', 
      '관계사', '형/부', '수일치/관사', '비교', '도치/강조'
    ];
    
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`어법 변형 시도 ${attempt}/${maxRetries}...`);
      
      const prompt = `You must transform exactly ONE word from the list to create a grammar error for an English quiz.

Original words: ${JSON.stringify(words)}
Grammar types: ${grammarTypes.join(', ')}

CRITICAL REQUIREMENTS:
1. Choose exactly ONE word randomly from the 5 words
2. Transform that word incorrectly according to one grammar rule
3. Keep the other 4 words exactly the same
4. The transformed word must be grammatically WRONG

Examples of transformations:
- "individual" → "individuals" (wrong number)
- "violent" → "violently" (wrong part of speech)
- "depends" → "depend" (wrong subject-verb agreement)
- "beautiful" → "beautifully" (adjective to adverb incorrectly)
- "have" → "has" (wrong verb form)

Return ONLY this JSON format:
{
  "transformedWords": ["word1", "WRONG_WORD", "word3", "word4", "word5"],
  "answerIndex": 1,
  "original": "CORRECT_WORD",
  "grammarType": "SELECTED_GRAMMAR_TYPE"
}

Make sure the transformed word is actually DIFFERENT and WRONG compared to the original!`;

      try {
        // 공통 헬퍼 함수 사용 (프록시 자동 지원)
        const response = await callOpenAI({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that only returns valid JSON objects.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7, // 재시도할 때마다 조금 더 창의적으로
          max_tokens: 1000,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API 호출 실패: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        // 마크다운 코드 블록 제거
        let resultJson = content;
        if (content.includes('```Json') || content.includes('```json')) {
          resultJson = content.replace(/```(?:Json|json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
        }
        
        const result = JSON.parse(resultJson);
        
        // 기본 유효성 검증
        if (!Array.isArray(result.transformedWords) || 
            result.transformedWords.length !== 5 ||
            typeof result.answerIndex !== 'number' ||
            result.answerIndex < 0 || result.answerIndex > 4 ||
            !result.original || !result.grammarType) {
          throw new Error('Invalid transformation format');
        }
        
        // 핵심 검증: 실제로 단어가 변형되었는지 확인
        const originalWord = words[result.answerIndex];
        const transformedWord = result.transformedWords[result.answerIndex];
        
        if (originalWord === transformedWord) {
          console.error(`시도 ${attempt}: 단어 변형 실패 - 동일한 단어`, {
            originalWord,
            transformedWord,
            answerIndex: result.answerIndex
          });
          if (attempt === maxRetries) {
            throw new Error(`단어가 실제로 변형되지 않았습니다: "${originalWord}" → "${transformedWord}"`);
          }
          continue; // 다시 시도
        }
        
        // original 필드가 실제 원본 단어와 일치하는지 확인
        if (result.original !== originalWord) {
          console.error(`시도 ${attempt}: 원본 단어 불일치`, {
            expected: originalWord,
            received: result.original
          });
          if (attempt === maxRetries) {
            throw new Error(`원본 단어가 일치하지 않습니다: 예상 "${originalWord}", 실제 "${result.original}"`);
          }
          continue; // 다시 시도
        }
        
        console.log(`시도 ${attempt}: 어법 변형 검증 통과!`, {
          originalWord,
          transformedWord,
          answerIndex: result.answerIndex,
          grammarType: result.grammarType
        });
        
        return result;
        
      } catch (error) {
        console.error(`시도 ${attempt} 실패:`, error);
        if (attempt === maxRetries) {
          throw new Error('어법 변형에 실패했습니다.');
        }
      }
    }
    
    throw new Error('모든 재시도가 실패했습니다.');
  }

  // MCP 4: 해설 생성 서비스
  // (generateExplanation 함수 전체 삭제)

  // MCP 5: 번역 서비스
  async function translatePassage(passage: string): Promise<string> {
    const prompt = `다음 영어 본문을 자연스러운 한국어로 번역하세요.

번역 요구사항:
- 자연스럽고 매끄러운 한국어
- 원문의 의미를 정확히 전달
- 문학적이고 읽기 쉬운 문체

번역만 반환하세요 (다른 텍스트 없이):

${passage}`;

    // 공통 헬퍼 함수 사용 (프록시 자동 지원)
    const response = await callOpenAI({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that provides natural Korean translations.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 호출 실패: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  // MCP 6: 전체 통합 - 단계별 MCP를 순차 호출하여 최종 문제 생성
  async function generateGrammarQuizStepByStep(passage: string): Promise<GrammarQuiz & { original: string }> {
    try {
      // Step 1: 단어 선정
      const words = await selectWords(passage);
      // Step 2: 어법 변형
      const transformation = await transformWord(words);
      // Step 3: 원본 단어를 변형된 단어로 교체하면서 번호/밑줄 적용
      const numberedPassage = applyNumberAndUnderline(passage, words, transformation.transformedWords);
      
      // Step 4: 번역
      const translation = await translatePassage(passage);
      
      // 객관식은 본문에 번호가 매겨진 순서 그대로 (섞지 않음)
      const optionsInOrder = transformation.transformedWords;
      
      console.log('🎯 최종 결과 조합:');
      console.log('원본 단어들:', words);
      console.log('변형된 단어들:', transformation.transformedWords);
      console.log('객관식 옵션 (순서 그대로):', optionsInOrder);
      console.log('원본 정답 인덱스:', transformation.answerIndex);
      console.log('정답 인덱스 (변경 없음):', transformation.answerIndex);
      
      const result: GrammarQuiz & { original: string } = {
        passage: numberedPassage,
        options: optionsInOrder,
        answerIndex: transformation.answerIndex,
        original: transformation.original,
        translation
      };
      
      console.log('✅ Work_09 문제 생성 완료:', result);
      return result;
    } catch (error) {
      throw new Error(`문제 생성에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
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
    const workType = workTypePoints.find(wt => wt.id === '9'); // 유형#09
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
      const workType = workTypePoints.find(wt => wt.id === '9');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const deductionResult = await deductUserPoints(
        userData.uid,
        '9',
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
      
      const quizData = await generateGrammarQuizStepByStep(passage);
      setQuiz(quizData);

      // 문제 생성 내역 저장
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          const workTypePoint = workTypePoints.find(wt => wt.id === '9');
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '09',
            workTypeName: getWorkTypeName('09'),
            points: workTypePoint?.points || 0,
            inputText: passage,
            quizData: quizData,
            status: 'success'
          });
          console.log('✅ Work_09 내역 저장 완료');
        } catch (historyError) {
          console.error('❌ Work_09 내역 저장 실패:', historyError);
        }
      }
      
    } catch (err: any) {
      console.error('문법 오류 문제 생성 오류:', err);
      
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '문법 오류 문제 생성',
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
    setPageLayoutInfo({
      needsSecondPage: false,
      needsThirdPage: false,
      page1Content: '',
      page2Content: '',
      page3Content: ''
    });
  };

  if (quiz) {
    const numberSymbols = ['①','②','③','④','⑤'];
    const answerNumber = numberSymbols[quiz.answerIndex];
    
    // 정답 검증 로깅
    console.log('=== 정답 표시 검증 ===');
    console.log('퀴즈 데이터:', quiz);
    console.log('정답 인덱스:', quiz.answerIndex);
    console.log('정답 번호:', answerNumber);
    console.log('정답 단어:', quiz.options[quiz.answerIndex]);
    console.log('원래 단어:', quiz.original);
    console.log('선택지 배열:', quiz.options);
    
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#09. 어법 변형 문제</h2>
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
          <div className="grammar-error-section">
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.13rem', background:'#222', color:'#fff', padding:'0.7rem 1.2rem', borderRadius:'8px', marginBottom:'0.6rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#09</span>
            </div>
            <div className="problem-passage" style={{fontSize:'1.08rem', lineHeight:1.7, margin:'1.2rem 0', background:'#f7f8fc', borderRadius:'8px', padding:'1.2rem', fontFamily:'inherit'}}>
              <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(quiz.passage).replace(/\n/g, '<br/>')}} />
            </div>
            <div className="problem-answer no-print" style={{marginTop:'1.2rem', color:'#1976d2', fontWeight:700}}>
              정답: {answerNumber} {quiz.options[quiz.answerIndex]}
              <div style={{marginTop:'0.7rem', color:'#1976d2', fontWeight:400, fontSize:'1rem'}}>
                정답의 원래(정상) 단어/구: {quiz.original}
              </div>
              <div className="translation-section" style={{marginTop:'1.2rem'}}>
                <h3 style={{fontSize:'1.05rem', color:'#222', marginBottom:'0.5rem'}}>본문 해석</h3>
                <div style={{background: '#f1f8e9', padding: '1rem', borderRadius: '8px', border: '1.5px solid #c8e6c9', fontSize: '0.98rem', lineHeight: '1.6'}}>
                  {quiz.translation}
                </div>
              </div>
            </div>
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
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                        <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                        <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#09</span>
                      </div>
                      <div style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(quiz.passage).replace(/\n/g, '<br/>')}} />
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
                      다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?
                    </div>
                    <div style={{marginTop:'0.9rem', fontSize:'1rem !important', padding:'1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                      <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(quiz.passage).replace(/\n/g, '<br/>')}} />
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
            {/* 1페이지 */}
            <div className="a4-page-template">
              <div className="a4-page-header">
                <PrintHeaderWork01 />
              </div>
              <div className="a4-page-content">
                <div className="quiz-content">
                  {/* A. 문제 제목 + 영어 본문 컨테이너 */}
                  {(pageLayoutInfo.page1Content.includes('A') || pageLayoutInfo.page1Content === 'A') && (
                    <>
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                        <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                        <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#09</span>
                      </div>
                      <div style={{marginTop:'0.1rem', fontSize:'1rem !important', padding:'0.5rem 1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                        <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(quiz.passage).replace(/\n/g, '<br/>')}} />
                      </div>
                    </>
                  )}

                   {/* B. 4지선다 선택항목 컨테이너 */}
                   {(pageLayoutInfo.page1Content.includes('B') || pageLayoutInfo.page1Content === 'B') && (
                     <div className="problem-options" style={{margin:'0.2rem 0'}}>
                       <div style={{fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'}}>
                         {`①②③④⑤`[quiz.answerIndex] || `${quiz.answerIndex+1}.`} {quiz.options[quiz.answerIndex]}
                         <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답: 원래/정상 단어 : {quiz.original})</span>
                       </div>
                     </div>
                   )}

                  {/* C. 본문해석 제목 + 한글 해석 컨테이너 */}
                  {(pageLayoutInfo.page1Content.includes('C') || pageLayoutInfo.page1Content === 'C') && (
                    <>
                      <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.2rem', display:'block', width:'100%'}}>
                        본문 해석
                      </div>
                      <div className="problem-passage translation korean-translation" style={{fontSize:'0.5rem !important', lineHeight:1.7, margin:'0.1rem 0', background:'#f1f8e9', borderRadius:'8px', padding:'2rem 1rem', fontFamily:'inherit', color:'#222'}}>
                        {quiz.translation || '본문 해석이 생성되지 않았습니다.'}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 2페이지 */}
            {pageLayoutInfo.needsSecondPage && (
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    {/* A. 문제 제목 + 영어 본문 컨테이너 */}
                    {(pageLayoutInfo.page2Content.includes('A') || pageLayoutInfo.page2Content === 'A') && (
                      <>
                        <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                          <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                          <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#09</span>
                        </div>
                        <div style={{marginTop:'0.1rem', fontSize:'1rem !important', padding:'0.5rem 1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                          <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(quiz.passage).replace(/\n/g, '<br/>')}} />
                        </div>
                      </>
                    )}

                     {/* B. 4지선다 선택항목 컨테이너 */}
                     {(pageLayoutInfo.page2Content.includes('B') || pageLayoutInfo.page2Content === 'B') && (
                       <div className="problem-options" style={{margin:'0.2rem 0'}}>
                         <div style={{fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'}}>
                           {`①②③④⑤`[quiz.answerIndex] || `${quiz.answerIndex+1}.`} {quiz.options[quiz.answerIndex]}
                           <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답: 원래/정상 단어 : {quiz.original})</span>
                         </div>
                       </div>
                     )}

                    {/* C. 본문해석 제목 + 한글 해석 컨테이너 */}
                    {(pageLayoutInfo.page2Content.includes('C') || pageLayoutInfo.page2Content === 'C') && (
                      <>
                        <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.2rem', display:'block', width:'100%'}}>
                          본문 해석
                        </div>
                        <div className="problem-passage translation" style={{fontSize:'0.8rem !important', lineHeight:1.7, margin:'0.1rem 0', background:'#f1f8e9', borderRadius:'8px', padding:'2rem 1rem', fontFamily:'inherit', color:'#222'}}>
                          {quiz.translation || '본문 해석이 생성되지 않았습니다.'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3페이지 */}
            {pageLayoutInfo.needsThirdPage && (
              <div className="a4-page-template">
                <div className="a4-page-header">
                  <PrintHeaderWork01 />
                </div>
                <div className="a4-page-content">
                  <div className="quiz-content">
                    {/* A. 문제 제목 + 영어 본문 컨테이너 */}
                    {(pageLayoutInfo.page3Content.includes('A') || pageLayoutInfo.page3Content === 'A') && (
                      <>
                        <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                          <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                          <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#09</span>
                        </div>
                        <div style={{marginTop:'0.1rem', fontSize:'1rem !important', padding:'0.5rem 1rem', background:'#fff3cd', borderRadius:'8px', fontFamily:'inherit', color:'#222', lineHeight:'1.7'}}>
                          <span dangerouslySetInnerHTML={{__html: convertMarkdownUnderlineToU(quiz.passage).replace(/\n/g, '<br/>')}} />
                        </div>
                      </>
                    )}

                     {/* B. 4지선다 선택항목 컨테이너 */}
                     {(pageLayoutInfo.page3Content.includes('B') || pageLayoutInfo.page3Content === 'B') && (
                       <div className="problem-options" style={{margin:'0.2rem 0'}}>
                         <div style={{fontSize:'1rem !important', margin:'0.3rem 0', fontFamily:'inherit', color:'#222'}}>
                           {`①②③④⑤`[quiz.answerIndex] || `${quiz.answerIndex+1}.`} {quiz.options[quiz.answerIndex]}
                           <span style={{color:'#1976d2', fontWeight:800, marginLeft:8}}> (정답: 원래/정상 단어 : {quiz.original})</span>
                         </div>
                       </div>
                     )}

                    {/* C. 본문해석 제목 + 한글 해석 컨테이너 */}
                    {(pageLayoutInfo.page3Content.includes('C') || pageLayoutInfo.page3Content === 'C') && (
                      <>
                        <div className="problem-instruction" style={{fontWeight:800, fontSize:'1rem !important', background:'#222', color:'#fff', padding:'0.7rem 0.5rem', borderRadius:'8px', marginBottom:'0.2rem', display:'block', width:'100%'}}>
                          본문 해석
                        </div>
                        <div className="problem-passage translation" style={{fontSize:'0.8rem !important', lineHeight:1.7, margin:'0.1rem 0', background:'#f1f8e9', borderRadius:'8px', padding:'2rem 1rem', fontFamily:'inherit', color:'#222'}}>
                          {quiz.translation || '본문 해석이 생성되지 않았습니다.'}
                        </div>
                      </>
                    )}
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
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>[유형#09] 어법 변형 객관식 문제 생성</h2>
        <p>영어 본문에서 어법(문법) 변형이 가능한 부분을 AI가 선정, 5지선다 객관식 어법 문제로 출제합니다.</p>
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
            <div style={{color:'#d32f2f', fontWeight:600, marginTop:'0.7rem'}}>
              OpenAI Vision 처리 중...
            </div>
          )}
        </div>
      )}
      {inputMode === 'image' && (
        <div className="input-guide">
          <div className="file-upload-row">
            <label htmlFor="grammar-error-image" className="file-upload-btn">
              파일 선택
              <input
                id="grammar-error-image"
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
          <label htmlFor="grammar-error-text" className="input-label">
            영어 본문 직접 붙여넣기:
          </label>
          {inputText.length < 100 && (
            <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
          )}
        </div>
        <textarea
          id="grammar-error-text"
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
        어법 변형 문제 생성하기
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
        workTypeName="어법 변형 문제 생성"
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

export default Work_09_GrammarError; 