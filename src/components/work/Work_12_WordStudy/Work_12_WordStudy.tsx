import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import ReactDOMServer from 'react-dom/server';
import './Work_12_WordStudy.css';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import { callOpenAI } from '../../../services/common';
import { 
  PrintHeaderWork12, 
  A4PageTemplateWork12, 
  ProblemInstructionWork12, 
  WordQuizContainerWork12, 
  WordQuestionWork12, 
  WordListTableWork12, 
  PrintFooterWork12, 
  PrintContainerWork12,
  createPaginatedContent,
  getPageTitle,
  PrintModeWork12,
  WordItemWork12,
  WordQuestionWork12Type,
  WordQuizWork12Type
} from './PrintFormat12';
import HistoryPrintWork12 from './HistoryPrintWork12';
import './PrintFormat12.css';

// PrintFormat12의 타입을 사용
type WordItem = WordItemWork12;
type WordQuestion = WordQuestionWork12Type;
type WordQuiz = WordQuizWork12Type;

// 인쇄 모드 타입 (PrintFormat12와 동일하게 유지)
type PrintMode = PrintModeWork12;

// 입력 방식 타입
const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];

const Work_12_WordStudy: React.FC = () => {
  const { userData, loading } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<WordQuiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: number}>({});
  const [quizType, setQuizType] = useState<'english-to-korean' | 'korean-to-english'>('english-to-korean');
  const [extractedWords, setExtractedWords] = useState<WordItem[]>([]);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);

  // 인쇄용 최소 스타일 (A4 세로 + 2단 단어표)
  const PRINT_STYLES = `
    @page {
      size: A4 portrait !important;
      margin: 0 !important;
    }
    html, body {
      width: 21cm !important;
      height: 29.7cm !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Roboto', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      html, body {
        width: 21cm !important;
        height: 29.7cm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
      }
      .a4-page-template-work12 {
        width: 21cm !important;
        max-width: 21cm !important;
        height: 29.7cm !important;
        max-height: 29.7cm !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
      }
    }
    .a4-page-template-work12 {
      width: 21cm !important;
      max-width: 21cm !important;
      height: 29.7cm !important;
      max-height: 29.7cm !important;
      box-sizing: border-box;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
    }
    .a4-page-header-work12 {
      width: 100%;
      margin-bottom: 0.4cm;
      text-align: center;
    }
    .print-header-text-work12 {
      font-size: 11pt;
      font-weight: 700;
    }
    .a4-page-content-work12 {
      width: 100% !important;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .problem-instruction-work12 {
      font-weight: 800;
      font-size: 11pt;
      background: #F0F0F0;
      color: #000000;
      padding: 0.6rem 0.5rem;
      border-radius: 6px;
      margin: 0 0 0.6rem 0;
      box-sizing: border-box;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .problem-instruction-text-work12 {
      flex: 1 1 auto;
    }
    .problem-type-label-work12 {
      margin-left: 0.5cm;
      font-size: 10pt;
      font-weight: 700;
      color: #000000;
    }
    .word-list-container-work12 {
      display: flex !important;
      gap: 0.5cm;
      width: 100% !important;
      margin: 0;
      flex: 1;
      min-height: 0;
      align-items: stretch;
    }
    .word-list-column-work12 {
      flex: 1 1 50% !important;
      width: 50% !important;
      min-width: 0;
    }
    .word-list-table-work12 {
      width: 100% !important;
      max-width: 100% !important;
      border-collapse: collapse;
      font-size: 10pt;
      background: #ffffff;
      border: 2px solid #000000;
      table-layout: fixed;
      height: 100%;
    }
    .word-list-table-work12 th {
      background: #e3f2fd;
      color: #000000;
      font-weight: 700;
      font-size: 10pt;
      padding: 0.33rem 0.5rem;
      text-align: center;
      border: 1px solid #000000;
    }
    .word-list-table-work12 td {
      border: 1px solid #000000;
      padding: 0.33rem 0.5rem;
      font-size: 10pt;
      font-weight: 500;
      line-height: 1.5;
    }
    /* 번호 열: 두 자릿 수가 보일 정도로 고정 */
    .word-list-table-work12 th:first-child,
    .word-list-table-work12 td:first-child {
      text-align: center;
      width: 10% !important;
      min-width: 10% !important;
      max-width: 10% !important;
    }
    /* 영어단어 열: 한글뜻 열과 4:6 비율 */
    .word-list-table-work12 th:nth-child(2),
    .word-list-table-work12 td:nth-child(2) {
      width: 36% !important;
      min-width: 36% !important;
      max-width: 36% !important;
    }
    /* 한글뜻 열: 영어단어 열과 6:4 비율 */
    .word-list-table-work12 th:nth-child(3),
    .word-list-table-work12 td:nth-child(3) {
      width: 54% !important;
      min-width: 54% !important;
      max-width: 54% !important;
    }
    .word-list-table-work12 tr:nth-child(even) {
      background: #f8f9fa;
    }
    .word-list-table-work12 .answer-cell {
      color: #1976d2;
      font-weight: 700;
      background: #f0f8ff;
    }

    /* 다른 유형의 @media print { body * { visibility: hidden; } } 규칙을 무력화하기 위해
       인쇄 시점에만 body에 id="work12-print-active"를 temporarily 부여하고,
       그 안의 모든 요소를 다시 보이게 강제한다. */
    @media print {
      body#work12-print-active * {
        visibility: visible !important;
      }
    }
  `;

  // 디버깅용: 컴포넌트 마운트/퀴즈 상태 변화 로그
  useEffect(() => {
    console.log('🧪 [Work12] Work_12_WordStudy 마운트됨', {
      locationHref: window.location.href
    });
  }, []);

  useEffect(() => {
    if (quiz) {
      console.log('🧪 [Work12] quiz 상태 갱신됨', {
        wordsCount: quiz.words?.length,
        quizType: quiz.quizType,
        totalQuestions: quiz.totalQuestions
      });
    }
  }, [quiz]);

  // 포인트 관련 초기화
  useEffect(() => {
    const initializePoints = async () => {
      try {
        const points = await getWorkTypePoints();
        setWorkTypePoints(points);
        
        // 유형#12의 포인트 설정
        const workType12Points = points.find(wt => wt.id === '12')?.points || 0;
        setPointsToDeduct(workType12Points);
        
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

  // 입력 방식 변경
  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    // inputText는 유지 (기존에 입력된 단어 목록 유지)
    // setInputText(''); // 제거: 기존 입력된 단어 유지
    setImageFile(null);
    setImagePreview(null);
    setQuiz(null);
    setSelectedAnswers({});
    // extractedWords는 유지 (기존에 추출된 단어 목록 유지)
    // setExtractedWords([]); // 제거: 기존 추출된 단어 유지
  };

  // 단어 수 제한 체크 및 처리 함수
  const limitWordsTo60 = (words: WordItem[]): WordItem[] => {
    if (words.length > 60) {
      alert(`최대 문제생성 가능 개수 60개가 초과됐습니다.\n입력된 단어: ${words.length}개\n60개까지만 사용됩니다.`);
      return words.slice(0, 60);
    }
    return words;
  };

  // 기존 단어에 새 단어를 추가하고 60개 제한을 적용하는 함수
  const addWordsWithLimit = (newWords: WordItem[], existingWords: WordItem[] = []): WordItem[] => {
    const totalWords = [...existingWords, ...newWords];
    
    if (totalWords.length > 60) {
      alert(`최대 문제생성 가능 개수 60개가 초과됐습니다.\n현재 단어: ${totalWords.length}개\n60개까지만 사용됩니다.\n추가 이미지를 캡처할 수 없습니다.`);
      return totalWords.slice(0, 60);
    }
    
    return totalWords;
  };

  // 텍스트에서 현재 단어를 빠르게 파싱하는 함수 (간단한 버전, 콘솔 로그 최소화)
  const parseWordsFromTextSimple = (text: string): WordItem[] => {
    if (!text.trim()) return [];
    
    const lines = text.split('\n').filter(line => line.trim());
    const words: WordItem[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      let english = '';
      let korean = '';
      
      // 탭으로 구분된 형식
      if (trimmedLine.includes('\t')) {
        const parts = trimmedLine.split('\t').map(p => p.trim()).filter(p => p);
        if (parts.length >= 2) {
          english = parts[0];
          korean = parts.slice(1).join(' ');
        }
      }
      
      // 콜론으로 구분된 형식
      if (!english && !korean) {
        const match = trimmedLine.match(/^(.+?)\s*[:：]\s*(.+)$/);
        if (match) {
          english = match[1].trim();
          korean = match[2].trim();
        }
      }
      
      // 하이픈으로 구분된 형식
      if (!english && !korean) {
        const match = trimmedLine.match(/^(.+?)\s*-\s*(.+)$/);
        if (match) {
          english = match[1].trim();
          korean = match[2].trim();
        }
      }
      
      // 공백으로 구분된 형식 (영어 + 한글)
      if (!english && !korean) {
        const wordsArray = trimmedLine.split(/\s+/);
        if (wordsArray.length >= 2) {
          let englishParts: string[] = [];
          let koreanParts: string[] = [];
          let foundKorean = false;
          
          for (const word of wordsArray) {
            const trimmedWord = word.trim();
            if (!trimmedWord) continue;
            
            if (/^[가-힣]/.test(trimmedWord)) {
              foundKorean = true;
              koreanParts.push(trimmedWord);
            } else if (!foundKorean && /^[a-zA-Z]/.test(trimmedWord)) {
              englishParts.push(trimmedWord);
            } else if (foundKorean) {
              koreanParts.push(trimmedWord);
            }
          }
          
          if (englishParts.length > 0 && koreanParts.length > 0) {
            english = englishParts.join(' ');
            korean = koreanParts.join(' ');
          }
        }
      }
      
      // 유효한 단어 쌍이면 추가
      if (english && korean && english !== korean) {
        words.push({ english, korean });
      }
      // 영어 단어만 있는 경우는 문제 생성 시 한글뜻을 생성하므로 여기서는 카운트하지 않음
    }
    
    return words;
  };

  // 이미지 파일 업로드
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      // 이미지에서 단어 추출
      setIsLoading(true);
      setIsExtractingText(true);
      try {
        let words = await extractWordsFromImage(file);
        
        // 한글 뜻이 없는 단어가 있는지 확인하고 자동 생성
        const wordsWithoutKorean = words.filter(w => !w.korean || w.korean.trim().length === 0);
        if (wordsWithoutKorean.length > 0) {
          console.log('한글 뜻이 없는 단어 발견, 자동 생성 중...', wordsWithoutKorean.length, '개');
          const englishOnlyWords = wordsWithoutKorean.map(w => w.english);
          const koreanMeanings = await generateKoreanMeanings(englishOnlyWords);
          
          // 한글 뜻이 생성된 단어들로 업데이트
          words = words.map(word => {
            if (!word.korean || word.korean.trim().length === 0) {
              const meaning = koreanMeanings.find(m => m.english.toLowerCase() === word.english.toLowerCase());
              if (meaning) {
                return { ...word, korean: meaning.korean };
              }
            }
            return word;
          });
        }
        
        // 기존 단어에 새 단어 추가 (60개 제한 적용)
        const currentWords = parseWordsFromTextSimple(inputText);
        const updatedWords = addWordsWithLimit(words, currentWords);
        setExtractedWords(updatedWords);
        // 단어들을 텍스트로 변환하여 textarea에 표시 (기존 텍스트 + 새 텍스트)
        const wordsText = updatedWords.map(word => `${word.english}: ${word.korean}`).join('\n');
        setInputText(wordsText);
        setTimeout(() => {
          if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
          }
        }, 0);
      } catch (err: any) {
        const errorMessage = err?.message || '이미지에서 단어를 추출할 수 없어요. 다시 한번 붙여넣어 주세요! 😊';
        alert(errorMessage);
      } finally {
        setIsExtractingText(false);
        setIsLoading(false);
      }
    }
  };

  // 붙여넣기(클립보드) 이미지 처리
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    // 텍스트 모드나 이미지 파일 업로드 모드일 때는 기본 동작 허용 (텍스트 붙여넣기)
    if (inputMode !== 'capture') {
      return;
    }
    
    // 현재 입력된 텍스트를 파싱해서 실제 단어 개수 확인
    const currentWordCount = parseWordsFromTextSimple(inputText).length;
    
    // 이미 60개에 도달했으면 추가 불가
    if (currentWordCount >= 60) {
      alert('최대 문제생성 가능 개수 60개에 도달했습니다.\n추가 이미지를 캡처할 수 없습니다.');
      e.preventDefault();
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
          setIsLoading(true);
          setIsExtractingText(true);
          try {
            let newWords = await extractWordsFromImage(file);
            
            // 한글 뜻이 없는 단어가 있는지 확인하고 자동 생성
            const wordsWithoutKorean = newWords.filter(w => !w.korean || w.korean.trim().length === 0);
            if (wordsWithoutKorean.length > 0) {
              console.log('한글 뜻이 없는 단어 발견, 자동 생성 중...', wordsWithoutKorean.length, '개');
              const englishOnlyWords = wordsWithoutKorean.map(w => w.english);
              const koreanMeanings = await generateKoreanMeanings(englishOnlyWords);
              
              // 한글 뜻이 생성된 단어들로 업데이트
              newWords = newWords.map(word => {
                if (!word.korean || word.korean.trim().length === 0) {
                  const meaning = koreanMeanings.find(m => m.english.toLowerCase() === word.english.toLowerCase());
                  if (meaning) {
                    return { ...word, korean: meaning.korean };
                  }
                }
                return word;
              });
            }
            
            // 현재 입력된 텍스트를 파싱해서 기존 단어 목록 가져오기
            const currentWords = parseWordsFromTextSimple(inputText);
            
            // 기존 단어에 새 단어 추가 (60개 제한 적용)
            const updatedWords = addWordsWithLimit(newWords, currentWords);
            setExtractedWords(updatedWords);
            
            // 단어들을 텍스트로 변환하여 textarea에 표시 (기존 텍스트 + 새 텍스트)
            const wordsText = updatedWords.map(word => `${word.english}: ${word.korean}`).join('\n');
            setInputText(wordsText);
            
            setTimeout(() => {
              if (textAreaRef.current) {
                textAreaRef.current.style.height = 'auto';
                textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
              }
            }, 0);
          } catch (err: any) {
            const errorMessage = err?.message || '이미지에서 단어를 추출할 수 없어요. 다시 한번 붙여넣어 주세요! 😊';
            alert(errorMessage);
          } finally {
            setIsExtractingText(false);
            setIsLoading(false);
          }
          // 이미지를 찾았으므로 기본 동작(텍스트 붙여넣기) 막기
          e.preventDefault();
          return;
        }
      }
    }
    
    // 이미지를 찾지 못했을 때는 기본 동작 허용 (텍스트 붙여넣기 가능)
  };

  // 본문 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setInputText(newText);
    
    // 텍스트가 변경될 때마다 실제 단어 개수를 계산하여 extractedWords 업데이트
    // (캡처 모드에서 이미지로 추출한 경우나 텍스트 모드에서 입력한 경우 모두 처리)
    if (inputMode === 'capture' || inputMode === 'text') {
      // 전체 텍스트를 파싱하여 단어 목록 업데이트 (사용자가 직접 편집한 경우)
      const parsedWords = parseWordsFromTextSimple(newText);
      setExtractedWords(parsedWords);
    }
    
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  };

  // 이미지에서 영어 단어와 한글 뜻 추출 (OpenAI Vision API) - 재시도 로직 포함
  async function extractWordsFromImage(imageFile: File, retryCount: number = 0): Promise<WordItem[]> {
    const MAX_RETRIES = 2; // 최대 3회 시도 (0, 1, 2)
    
    const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    const base64 = await fileToBase64(imageFile);
    
    // 재시도 시 더 강력한 프롬프트 사용
    const basePrompt = `You are an expert at extracting text from images. This image contains an English vocabulary worksheet with English words and their Korean translations.

CRITICAL REQUIREMENTS:
1. You MUST extract ONLY English words (words written in English alphabet) from the image
2. DO NOT extract Korean-only words or phrases - ONLY extract entries that have an English word
3. For each English word found, extract its corresponding Korean translation if visible
4. If Korean translation is not visible, leave the "korean" field as an empty string ""
5. Extract words from ALL columns and rows, even if the layout is complex
6. Ignore numbers, labels, Korean-only entries, or other non-English-word content
7. Extract at least 5-60 words (extract as many as possible)
8. The "english" field MUST contain ONLY English alphabet characters (a-z, A-Z), spaces, hyphens, or apostrophes
9. The "english" field MUST NOT contain any Korean characters (한글) or other non-English characters

OUTPUT FORMAT (MUST be valid JSON array only, no other text):
[
  {"english": "word1", "korean": "뜻1"},
  {"english": "word2", "korean": "뜻2"},
  {"english": "word3", "korean": ""}
]

IMPORTANT:
- You MUST respond with ONLY a valid JSON array
- Do NOT say "I cannot" or "I'm unable" - extract what you can see
- Even if the image is blurry or unclear, extract any English words you can identify
- ONLY extract entries that have an English word - skip Korean-only entries
- The "english" field must be a valid English word, NOT Korean text
- NO explanations, NO apologies, ONLY JSON array`;

    const retryPrompt = retryCount > 0 
      ? `${basePrompt}\n\nRETRY ATTEMPT ${retryCount + 1}: Please try again. Look more carefully at the image. Extract any English words you can identify, even if partially visible.`
      : basePrompt;
    
    try {
      const response = await callOpenAI({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: [
              { type: 'text', text: retryPrompt },
              { type: 'image_url', image_url: { url: base64 } }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.3 // 더 일관된 결과를 위해 낮은 temperature 사용
      });
      
      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      console.log(`[시도 ${retryCount + 1}/${MAX_RETRIES + 1}] AI 응답 내용:`, content.substring(0, 200));
      
      // AI가 거부하거나 처리할 수 없다고 응답한 경우 확인
      const rejectionPhrases = [
        "I'm sorry",
        "I can't assist",
        "I cannot",
        "unable to",
        "can't help",
        "unable to transcribe",
        "unable to read",
        "죄송합니다",
        "도와드릴 수 없",
        "처리할 수 없"
      ];
      const isRejection = rejectionPhrases.some(phrase => 
        content.toLowerCase().includes(phrase.toLowerCase())
      );
      
      if (isRejection) {
        console.warn(`[시도 ${retryCount + 1}/${MAX_RETRIES + 1}] AI가 이미지 처리를 거부했습니다:`, content);
        // 재시도 가능하면 재시도
        if (retryCount < MAX_RETRIES) {
          console.log(`재시도 중... (${retryCount + 1}/${MAX_RETRIES})`);
          // 1초 대기 후 재시도
          await new Promise(resolve => setTimeout(resolve, 1000));
          return extractWordsFromImage(imageFile, retryCount + 1);
        }
        throw new Error('이미지에서 단어를 추출할 수 없어요. 다른 이미지로 다시 시도해주세요! 😊');
      }
      
      // JSON 파싱 시도
      let jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const words = JSON.parse(jsonMatch[0]);
          // 영어 단어가 있고, 실제로 영어 문자로만 구성되어 있는지 검증
          const filteredWords = words.filter((word: any) => {
            if (!word.english || word.english.trim().length === 0) {
              return false;
            }
            // 영어 필드가 실제로 영어 문자(알파벳, 공백, 하이픈, 아포스트로피)로만 구성되어 있는지 확인
            // 한글이 포함되어 있으면 제외
            const englishField = word.english.trim();
            const isEnglishOnly = /^[a-zA-Z\s\-']+$/.test(englishField) && !/^[가-힣]/.test(englishField);
            if (!isEnglishOnly) {
              console.warn(`[필터링] 영어가 아닌 항목 제외: "${englishField}"`);
              return false;
            }
            return true;
          });
          console.log(`[시도 ${retryCount + 1}/${MAX_RETRIES + 1}] 추출된 단어 수:`, filteredWords.length);
          
          if (filteredWords.length === 0) {
            // 단어가 하나도 추출되지 않았고 재시도 가능하면 재시도
            if (retryCount < MAX_RETRIES) {
              console.log(`단어가 추출되지 않아 재시도 중... (${retryCount + 1}/${MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              return extractWordsFromImage(imageFile, retryCount + 1);
            }
            throw new Error('이미지에서 단어를 찾을 수 없어요. 더 선명한 이미지로 다시 붙여넣어 주세요! 😊');
          }
          
          console.log('추출된 단어 샘플:', filteredWords.slice(0, 5));
          
          // 한글 뜻이 없는 단어가 있는지 확인
          const wordsWithoutKorean = filteredWords.filter((word: any) => !word.korean || word.korean.trim().length === 0);
          if (wordsWithoutKorean.length > 0) {
            console.log('한글 뜻이 없는 단어 수:', wordsWithoutKorean.length);
            // 한글 뜻이 없는 단어들에 대해 한글 뜻 생성
            const englishOnlyWords = wordsWithoutKorean.map((w: any) => w.english);
            try {
              const koreanMeanings = await generateKoreanMeanings(englishOnlyWords);
              // 한글 뜻이 생성된 단어들로 업데이트
              const wordsWithKorean = filteredWords.map((word: any) => {
                if (!word.korean || word.korean.trim().length === 0) {
                  const meaning = koreanMeanings.find((m: WordItem) => m.english.toLowerCase() === word.english.toLowerCase());
                  if (meaning) {
                    return { ...word, korean: meaning.korean };
                  }
                }
                return word;
              });
              return wordsWithKorean;
            } catch (error) {
              console.error('한글 뜻 생성 실패:', error);
              // 한글 뜻 생성 실패 시에도 영어 단어는 반환 (한글 뜻은 빈 문자열)
              return filteredWords.map((word: any) => ({
                english: word.english,
                korean: word.korean || ''
              }));
            }
          }
          
          return filteredWords;
        } catch (parseError) {
          console.error('JSON 파싱 오류:', parseError);
          // JSON 파싱 실패 시 재시도
          if (retryCount < MAX_RETRIES) {
            console.log(`JSON 파싱 실패로 재시도 중... (${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return extractWordsFromImage(imageFile, retryCount + 1);
          }
          throw new Error('이미지에서 단어를 추출할 수 없어요. 다시 한번 붙여넣어 주세요! 😊');
        }
      }
      
      // JSON 형식을 찾을 수 없는 경우, 텍스트에서 단어 쌍 추출 시도
      console.log('JSON 형식이 없어서 텍스트 파싱 시도');
      const lines = content.split('\n').filter((line: string) => line.trim());
      const words: WordItem[] = [];
      
      for (const line of lines) {
        // "영어: 한글" 또는 "영어 - 한글" 형식 찾기
        const match = line.match(/^(.+?)\s*[:：-]\s*(.+)$/);
        if (match) {
          const english = match[1].trim().replace(/^\d+\.?\s*/, ''); // 번호 제거
          const korean = match[2].trim();
          if (english && korean && /^[a-zA-Z\s]+$/.test(english) && /^[가-힣\s]+$/.test(korean)) {
            words.push({ english, korean });
          }
        }
      }
      
      if (words.length > 0) {
        console.log('텍스트 파싱으로 추출된 단어 수:', words.length);
        return words;
      }
      
      // JSON도 없고 텍스트 파싱도 실패한 경우 재시도
      if (retryCount < MAX_RETRIES) {
        console.log(`파싱 실패로 재시도 중... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return extractWordsFromImage(imageFile, retryCount + 1);
      }
      
      throw new Error('이미지에서 단어를 찾을 수 없어요. 더 선명한 이미지로 다시 붙여넣어 주세요! 😊');
    } catch (error: any) {
      console.error(`[시도 ${retryCount + 1}/${MAX_RETRIES + 1}] 단어 추출 오류:`, error);
      
      // 재시도 가능한 오류인 경우 재시도
      if (retryCount < MAX_RETRIES && !error.message?.includes('😊')) {
        console.log(`오류 발생으로 재시도 중... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return extractWordsFromImage(imageFile, retryCount + 1);
      }
      
      // 이미 친근한 메시지가 있으면 그대로 사용, 아니면 기본 메시지
      if (error.message && (error.message.includes('다시') || error.message.includes('😊'))) {
        throw error;
      }
      throw new Error('이미지에서 단어를 추출할 수 없어요. 다른 이미지로 다시 시도해주세요! 😊');
    }
  }

  // 숙어와 단어를 구분하여 추출하는 함수
  function extractIdiomsAndWords(text: string): string[] {
    // 일반적인 영어 숙어 패턴들
    const commonIdioms = [
      // 4단어 숙어
      'in the face of', 'on the other hand', 'at the end of', 'in the middle of',
      'in front of', 'in back of', 'in spite of', 'in case of', 'in terms of',
      'in order to', 'in addition to', 'in relation to', 'in accordance with',
      'on the basis of', 'on the part of', 'on the side of', 'on the way to',
      'at the beginning of', 'at the expense of', 'at the mercy of', 'at the risk of',
      'by means of', 'by way of', 'by virtue of', 'by reason of',
      'for the sake of', 'for the purpose of', 'for the benefit of',
      'with regard to', 'with respect to', 'with reference to', 'with the exception of',
      'relative to', 'reluctant to do',
      
      // 3단어 숙어
      'in order to', 'in front of', 'in back of', 'in spite of', 'in case of',
      'in terms of', 'in addition to', 'in relation to', 'on the other hand',
      'at the end of', 'at the beginning of', 'at the expense of', 'at the mercy of',
      'by means of', 'by way of', 'by virtue of', 'for the sake of',
      'with regard to', 'with respect to', 'with reference to',
      'turn into', 'reflect on',
      
      // 2단어 숙어
      'in order', 'in front', 'in back', 'in spite', 'in case', 'in terms',
      'in addition', 'in relation', 'on the', 'at the', 'by means', 'by way',
      'by virtue', 'for the', 'with regard', 'with respect', 'with reference',
      'such as', 'as well', 'as soon', 'as long', 'as far', 'as much',
      'more than', 'less than', 'rather than', 'other than', 'except for',
      'due to', 'owing to', 'according to', 'thanks to', 'prior to',
      'up to', 'down to', 'out of', 'into', 'onto', 'upon', 'within',
      'without', 'throughout', 'along with', 'together with', 'alongside',
      'instead of', 'regardless of', 'irrespective of', 'apart from',
      'as for', 'as to', 'as of', 'as in', 'as if', 'as though',
      'give up', 'look up', 'look for', 'look after', 'look into', 'look forward to',
      'get up', 'get on', 'get off', 'get in', 'get out', 'get over', 'get through',
      'put on', 'put off', 'put up', 'put down', 'put away', 'put out',
      'take on', 'take off', 'take up', 'take down', 'take away', 'take out',
      'come up', 'come on', 'come off', 'come in', 'come out', 'come over',
      'go on', 'go off', 'go up', 'go down', 'go in', 'go out', 'go over',
      'turn on', 'turn off', 'turn up', 'turn down', 'turn around', 'turn out',
      'break up', 'break down', 'break in', 'break out', 'break off',
      'make up', 'make out', 'make off', 'make for', 'make over',
      'set up', 'set off', 'set out', 'set in', 'set down',
      'run up', 'run down', 'run in', 'run out', 'run over', 'run into',
      'carry on', 'carry out', 'carry off', 'carry over',
      'bring up', 'bring down', 'bring in', 'bring out', 'bring about',
      'call up', 'call off', 'call in', 'call out', 'call for',
      'pick up', 'pick out', 'pick on', 'pick off',
      'drop off', 'drop in', 'drop out', 'drop by',
      'show up', 'show off', 'show in', 'show out',
      'work out', 'work on', 'work in', 'work up',
      'find out', 'find in', 'find out about',
      'figure out', 'figure in', 'figure on',
      'point out', 'point to', 'point at',
      'deal with', 'deal in', 'deal out',
      'care for', 'care about', 'care to',
      'wait for', 'wait on', 'wait up',
      'stand up', 'stand for', 'stand by', 'stand out',
      'sit down', 'sit up', 'sit in', 'sit out',
      'lie down', 'lie in', 'lie about', 'lie to',
      'wake up', 'wake up to',
      'fall down', 'fall off', 'fall in', 'fall out', 'fall over',
      'move on', 'move in', 'move out', 'move over',
      'pass by', 'pass on', 'pass out', 'pass over',
      'live on', 'live in', 'live up to', 'live with',
      'die down', 'die out', 'die off',
      'grow up', 'grow in', 'grow out of',
      'cut up', 'cut down', 'cut in', 'cut out', 'cut off',
      'pull up', 'pull down', 'pull in', 'pull out', 'pull off',
      'push up', 'push down', 'push in', 'push out', 'push off',
      'hold up', 'hold down', 'hold in', 'hold out', 'hold off',
      'keep up', 'keep down', 'keep in', 'keep out', 'keep off',
      'let up', 'let down', 'let in', 'let out', 'let off',
      'give in', 'give out', 'give off', 'give away',
      'send up', 'send down', 'send in', 'send out', 'send off',
      'throw up', 'throw down', 'throw in', 'throw out', 'throw off',
      'catch up', 'catch on', 'catch in', 'catch out',
      'reach out', 'reach for', 'reach in',
      'touch on', 'touch up', 'touch down',
      'stick to', 'stick up', 'stick out', 'stick around',
      'hang up', 'hang on', 'hang out', 'hang around',
      'tie up', 'tie down', 'tie in', 'tie off',
      'wrap up', 'wrap in', 'wrap around',
      'fill up', 'fill in', 'fill out', 'fill up with',
      'empty out', 'empty into',
      'clean up', 'clean out', 'clean off',
      'wash up', 'wash out', 'wash off',
      'dry up', 'dry out', 'dry off',
      'heat up', 'heat through',
      'cool down', 'cool off',
      'warm up', 'warm through',
      'slow down', 'slow up',
      'speed up', 'speed through',
      'hurry up', 'hurry along',
      'calm down', 'calm up',
      'settle down', 'settle in', 'settle up', 'settle for',
      'start up', 'start out', 'start off', 'start over',
      'stop by', 'stop in', 'stop off', 'stop over',
      'end up', 'end in', 'end with',
      'finish up', 'finish off', 'finish with',
      'complete with', 'complete in',
      'continue on', 'continue with',
      'carry on with', 'carry on about',
      'go on with', 'go on about',
      'keep on with', 'keep on about',
      'stay on', 'stay in', 'stay out', 'stay up', 'stay with',
      'remain in', 'remain out', 'remain up', 'remain with',
      'leave out', 'leave in', 'leave off', 'leave behind',
      'arrive at', 'arrive in', 'arrive on',
      'depart from', 'depart for',
      'return to', 'return from',
      'come back', 'go back', 'get back', 'give back', 'take back',
      'bring back', 'send back', 'call back',
      'look back', 'think back', 'turn back',
      'move back', 'step back', 'walk back',
      'run back', 'drive back', 'fly back',
      'head back', 'make back', 'find back',
      'reluctant to', 'willing to', 'able to', 'ready to',
      'likely to', 'unlikely to', 'bound to', 'sure to',
      'certain to', 'guaranteed to', 'promised to',
      'expected to', 'supposed to', 'meant to',
      'trying to', 'attempting to', 'planning to',
      'hoping to', 'wishing to', 'wanting to',
      'needing to', 'having to', 'going to',
      'used to', 'accustomed to', 'addicted to',
      'devoted to', 'committed to', 'dedicated to',
      'opposed to', 'object to', 'react to',
      'respond to', 'reply to', 'answer to',
      'listen to', 'speak to', 'talk to',
      'write to', 'read to', 'show to',
      'give to', 'send to', 'bring to',
      'take to', 'get to', 'come to',
      'go to', 'move to', 'travel to',
      'return to', 'come back to', 'go back to',
      'get back to', 'turn back to', 'look back to'
    ];

    // 숙어를 길이 순으로 정렬 (긴 것부터 매칭)
    const sortedIdioms = commonIdioms.sort((a, b) => b.length - a.length);
    
    const result: string[] = [];
    let remainingText = text.toLowerCase().trim();
    
    while (remainingText.length > 0) {
      let matched = false;
      
      // 숙어 매칭 시도
      for (const idiom of sortedIdioms) {
        if (remainingText.startsWith(idiom + ' ') || remainingText === idiom) {
          result.push(idiom);
          remainingText = remainingText.substring(idiom.length).trim();
          matched = true;
          break;
        }
      }
      
      // 숙어가 매칭되지 않으면 단어로 처리
      if (!matched) {
        const words = remainingText.split(/\s+/);
        if (words.length > 0) {
          const firstWord = words[0].trim();
          if (firstWord) {
            result.push(firstWord);
            remainingText = remainingText.substring(firstWord.length).trim();
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }
    
    return result.filter(word => word.trim().length > 0);
  }

  // 텍스트에서 영어 단어와 한글 뜻 파싱
  function parseWordsFromText(text: string): WordItem[] | { words: WordItem[], englishOnlyWords: string[] } {
    console.log('🔍 [parseWordsFromText] 파싱 시작');
    console.log('📝 [parseWordsFromText] 입력 텍스트 길이:', text.length);
    console.log('📝 [parseWordsFromText] 입력 텍스트 (처음 500자):', text.substring(0, 500));
    
    const lines = text.split('\n').filter(line => line.trim());
    console.log('📝 [parseWordsFromText] 총 라인 수:', lines.length);
    
    const words: WordItem[] = [];
    const englishOnlyWords: string[] = [];
    const failedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      let english = '';
      let korean = '';
      let matchedFormat = '';
      
      // 0. 탭으로 구분된 형식 (가장 먼저 체크) - "영어\t한글"
      if (trimmedLine.includes('\t')) {
        const parts = trimmedLine.split('\t').map(p => p.trim()).filter(p => p);
        if (parts.length >= 2) {
          english = parts[0];
          korean = parts.slice(1).join(' '); // 여러 탭이 있을 경우 나머지 모두 한글 뜻으로 처리
          matchedFormat = '탭 구분';
          console.log(`✅ [parseWordsFromText] 라인 ${i + 1} (${matchedFormat}): "${english}" → "${korean}"`);
        }
      }
      
      // 1. "영어: 한글" 또는 "영어：한글" 형식
      if (!english && !korean) {
        let match = trimmedLine.match(/^(.+?)\s*[:：]\s*(.+)$/);
        if (match) {
          english = match[1].trim();
          korean = match[2].trim();
          matchedFormat = '콜론 구분';
          console.log(`✅ [parseWordsFromText] 라인 ${i + 1} (${matchedFormat}): "${english}" → "${korean}"`);
        }
        
        // 2. "영어 - 한글" 형식
        if (!match) {
          match = trimmedLine.match(/^(.+?)\s*-\s*(.+)$/);
          if (match) {
            english = match[1].trim();
            korean = match[2].trim();
            matchedFormat = '하이픈 구분';
            console.log(`✅ [parseWordsFromText] 라인 ${i + 1} (${matchedFormat}): "${english}" → "${korean}"`);
          }
        }
        
        // 3. "영어 한글" 형식 (공백으로 구분, 영어가 먼저 오는 경우)
        if (!match) {
          // 영어 단어는 보통 알파벳으로만 구성되고, 한글은 한글 문자로만 구성됨
          const words = trimmedLine.split(/\s+/);
          if (words.length >= 2) {
            // 영어 부분과 한글 부분을 구분
            let englishParts: string[] = [];
            let koreanParts: string[] = [];
            let foundKorean = false;
            
            for (const word of words) {
              const trimmedWord = word.trim();
              if (!trimmedWord) continue;
              
              // 한글이 발견되면 이후는 모두 한글
              if (/^[가-힣]/.test(trimmedWord)) {
                foundKorean = true;
                koreanParts.push(trimmedWord);
              } else if (!foundKorean && /^[a-zA-Z]/.test(trimmedWord)) {
                // 한글이 발견되기 전까지는 영어
                englishParts.push(trimmedWord);
              } else if (foundKorean) {
                // 한글 발견 후에는 모두 한글
                koreanParts.push(trimmedWord);
              }
            }
            
            if (englishParts.length > 0 && koreanParts.length > 0) {
              english = englishParts.join(' ');
              korean = koreanParts.join(' ');
              matchedFormat = '공백 구분';
              console.log(`✅ [parseWordsFromText] 라인 ${i + 1} (${matchedFormat}): "${english}" → "${korean}"`);
            }
          }
        }
      }
      
      // 4. 영어 단어만 있는 경우 (한글뜻이 없는 경우)
      if (!english && !korean) {
        // 줄 전체가 영어 단어인지 확인 (알파벳, 공백, 하이픈, 아포스트로피만 포함)
        if (/^[a-zA-Z\s\-']+$/.test(trimmedLine) && !/^[가-힣]/.test(trimmedLine)) {
          // 숙어를 하나의 단위로 처리
          const processedWords = extractIdiomsAndWords(trimmedLine);
          englishOnlyWords.push(...processedWords);
          matchedFormat = '영어만 (숙어 추출)';
          console.log(`⚠️ [parseWordsFromText] 라인 ${i + 1} (${matchedFormat}): "${trimmedLine}" → 숙어 ${processedWords.length}개 추출`);
        } else {
          failedLines.push(trimmedLine);
          console.log(`❌ [parseWordsFromText] 라인 ${i + 1} 파싱 실패: "${trimmedLine}"`);
        }
      }
      
      // 유효한 단어 쌍이면 추가
      if (english && korean && english !== korean) {
        words.push({ english, korean });
      } else if (english && korean && english === korean) {
        console.log(`⚠️ [parseWordsFromText] 라인 ${i + 1} 영어와 한글이 동일하여 제외: "${english}"`);
      }
    }
    
    console.log('📊 [parseWordsFromText] 파싱 결과:');
    console.log(`  - 성공한 단어 쌍: ${words.length}개`);
    console.log(`  - 영어만 발견된 단어: ${englishOnlyWords.length}개`);
    console.log(`  - 파싱 실패한 라인: ${failedLines.length}개`);
    if (failedLines.length > 0) {
      console.log('  - 실패한 라인 목록:', failedLines);
    }
    
    // 영어 단어만 있는 경우 한글뜻 생성
    if (englishOnlyWords.length > 0) {
      console.log('📝 [parseWordsFromText] 영어 단어만 발견됨:', englishOnlyWords);
      // 영어 단어만 있는 경우는 별도로 처리 (generateKoreanMeanings 함수에서 처리)
      return { words, englishOnlyWords };
    }
    
    return words;
  }

  // 영어 단어만 있는 경우 한글뜻 생성
  async function generateKoreanMeanings(englishWords: string[]): Promise<WordItem[]> {
    const { callOpenAI } = await import('../../../services/common');

    const prompt = `다음 영어 단어들의 한국어 뜻과 품사를 정확하게 번역해주세요. 각 단어의 가장 일반적이고 적절한 한국어 뜻과 품사를 제공해주세요.

영어 단어 목록:
${englishWords.join(', ')}

응답 형식 (JSON 배열):
[
  {"english": "word1", "korean": "한글뜻1", "partOfSpeech": "n."},
  {"english": "word2", "korean": "한글뜻2", "partOfSpeech": "v."},
  ...
]

품사 표기 규칙 (영어 약어 사용):
- 명사: "n."
- 동사: "v."
- 형용사: "adj."
- 부사: "adv."
- 전치사: "prep."
- 접속사: "conj."
- 대명사: "pron."
- 감탄사: "interj."
- 한 단어가 여러 품사로 사용될 수 있는 경우, 가장 일반적인 품사 하나만 제공해주세요

주의사항:
- 각 영어 단어에 대해 가장 적절한 한국어 뜻과 품사를 제공해주세요
- 복합어나 구문이 아닌 단일 단어의 뜻을 제공해주세요
- JSON 형식으로만 응답해주세요`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 2048
    });
    
    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    try {
      console.log('한글뜻 생성 AI 응답:', content);
      
      // JSON 파싱 시도
      let jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const words = JSON.parse(jsonMatch[0]);
        const filteredWords = words.filter((word: any) => word.english && word.korean);
        console.log('생성된 한글뜻 수:', filteredWords.length);
        return filteredWords;
      }
      
      throw new Error('JSON 형식을 찾을 수 없습니다.');
    } catch (error) {
      console.error('한글뜻 생성 파싱 오류:', error);
      console.error('원본 응답:', content);
      throw new Error('한글뜻 생성에 실패했습니다.');
    }
  }

  // 문제 생성 함수들
  function generateEnglishToKoreanQuiz(words: WordItem[]): WordQuestion[] {
    return words.map(word => {
      const options = generateOptions(word.korean, words.map(w => w.korean));
      return {
        question: word.english,
        options,
        answerIndex: 0,
        correctAnswer: word.korean,
        wordItem: word
      };
    });
  }

  function generateKoreanToEnglishQuiz(words: WordItem[]): WordQuestion[] {
    return words.map(word => {
      const options = generateOptions(word.english, words.map(w => w.english));
      return {
        question: word.korean,
        options,
        answerIndex: 0,
        correctAnswer: word.english,
        wordItem: word
      };
    });
  }

  function generateOptions(correctAnswer: string, allAnswers: string[]): string[] {
    const options = [correctAnswer];
    const shuffled = allAnswers.filter(answer => answer !== correctAnswer).sort(() => Math.random() - 0.5);
    
    // 3개의 오답 선택
    for (let i = 0; i < 3 && i < shuffled.length; i++) {
      options.push(shuffled[i]);
    }
    
    // 4개 미만이면 더미 옵션 추가
    while (options.length < 4) {
      const dummyOptions = ['선택지1', '선택지2', '선택지3', '선택지4'];
      const dummy = dummyOptions[options.length - 1];
      if (!options.includes(dummy)) {
        options.push(dummy);
      } else {
        break;
      }
    }
    
    // 옵션 섞기
    return options.sort(() => Math.random() - 0.5);
  }

  // 단어 목록에 품사 정보 추가 (품사가 없는 경우)
  async function addPartOfSpeechToWords(words: WordItem[]): Promise<WordItem[]> {
    // 품사 정보가 없는 단어들만 필터링
    const wordsWithoutPos = words.filter(word => !word.partOfSpeech);
    
    if (wordsWithoutPos.length === 0) {
      console.log('📝 모든 단어에 품사 정보가 있습니다.');
      return words;
    }
    
    console.log(`📝 품사 정보 생성 중: ${wordsWithoutPos.length}개 단어`);
    
    const { callOpenAI } = await import('../../../services/common');
    
    const englishWords = wordsWithoutPos.map(w => w.english);
    const prompt = `다음 영어 단어들의 품사를 정확하게 판단해주세요. 각 단어의 가장 일반적인 품사 하나만 제공해주세요.

영어 단어 목록:
${englishWords.join(', ')}

응답 형식 (JSON 배열):
[
  {"english": "word1", "partOfSpeech": "n."},
  {"english": "word2", "partOfSpeech": "v."},
  ...
]

품사 표기 규칙 (영어 약어 사용):
- 명사: "n."
- 동사: "v."
- 형용사: "adj."
- 부사: "adv."
- 전치사: "prep."
- 접속사: "conj."
- 대명사: "pron."
- 감탄사: "interj."
- 한 단어가 여러 품사로 사용될 수 있는 경우, 가장 일반적인 품사 하나만 제공해주세요

주의사항:
- 각 영어 단어에 대해 가장 일반적인 품사를 제공해주세요
- JSON 형식으로만 응답해주세요`;

    try {
      const response = await callOpenAI({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 2048
      });
      
      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      console.log('품사 생성 AI 응답:', content);
      
      // JSON 파싱 시도
      let jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const posData = JSON.parse(jsonMatch[0]);
        
        // 품사 정보를 단어 목록에 매핑
        const wordsWithPos = words.map(word => {
          if (word.partOfSpeech) {
            return word; // 이미 품사가 있으면 그대로
          }
          
          // 품사 정보 찾기
          const posInfo = posData.find((item: any) => 
            item.english && item.english.toLowerCase() === word.english.toLowerCase()
          );
          
          if (posInfo && posInfo.partOfSpeech) {
            return {
              ...word,
              partOfSpeech: posInfo.partOfSpeech.trim()
            };
          }
          
          return word; // 품사를 찾지 못한 경우 그대로
        });
        
        console.log(`✅ 품사 정보 추가 완료: ${wordsWithPos.filter(w => w.partOfSpeech).length}개 단어`);
        return wordsWithPos;
      }
      
      throw new Error('JSON 형식을 찾을 수 없습니다.');
    } catch (error) {
      console.error('품사 생성 오류:', error);
      // 오류 발생 시 원본 단어 목록 반환 (품사 없이)
      return words;
    }
  }

  // 단어 퀴즈 생성
  async function generateWordQuiz(words: WordItem[], quizType: 'english-to-korean' | 'korean-to-english'): Promise<WordQuiz> {
    console.log('📝 단어 퀴즈 생성 시작:', { wordsCount: words.length, quizType });
    
    // 품사 정보가 없는 단어들에 품사 추가
    const wordsWithPos = await addPartOfSpeechToWords(words);
    
    // 디버깅: 품사 정보 확인
    console.log('📝 품사 정보 추가 후:', {
      wordsCount: wordsWithPos.length,
      wordsWithPosCount: wordsWithPos.filter(w => w.partOfSpeech).length,
      wordsWithoutPosCount: wordsWithPos.filter(w => !w.partOfSpeech).length,
      sampleWords: wordsWithPos.slice(0, 3).map(w => ({
        english: w.english,
        korean: w.korean,
        partOfSpeech: w.partOfSpeech
      }))
    });
    
    let questions: WordQuestion[];
    
    if (quizType === 'english-to-korean') {
      questions = generateEnglishToKoreanQuiz(wordsWithPos);
    } else {
      questions = generateKoreanToEnglishQuiz(wordsWithPos);
    }
    
    // 정답 인덱스 업데이트
    questions = questions.map(question => {
      const correctIndex = question.options.indexOf(question.correctAnswer);
      return {
        ...question,
        answerIndex: correctIndex
      };
    });
    
    const quiz: WordQuiz = {
      words: wordsWithPos, // 품사 정보가 포함된 단어 목록 사용
      quizType,
      questions,
      totalQuestions: questions.length
    };
    
    console.log('✅ 단어 퀴즈 생성 완료:', {
      wordsCount: quiz.words.length,
      wordsWithPosCount: quiz.words.filter(w => w.partOfSpeech).length,
      sampleWords: quiz.words.slice(0, 3).map(w => ({
        english: w.english,
        korean: w.korean,
        partOfSpeech: w.partOfSpeech
      }))
    });
    return quiz;
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
    const workType = workTypePoints.find(wt => wt.id === '12'); // 유형#12
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

    let words: WordItem[] = [];
    setIsLoading(true);
    setQuiz(null);
    setSelectedAnswers({});
    let deductedPoints = 0;
    
    try {
      // 포인트 차감
      const workType = workTypePoints.find(wt => wt.id === '12');
      if (!workType) throw new Error('포인트 설정을 찾을 수 없습니다.');

      const deductionResult = await deductUserPoints(
        userData.uid,
        '12',
        workType.name,
        userData.name || '사용자',
        userData.nickname || '사용자'
      );

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
      }

      deductedPoints = deductionResult.deductedPoints;
      setUserCurrentPoints(deductionResult.remainingPoints);

      // 단어 추출 로직
      console.log('🔍 [executeQuizGeneration] 단어 추출 시작');
      console.log('📝 [executeQuizGeneration] 입력 모드:', inputMode);
      console.log('📝 [executeQuizGeneration] 입력 텍스트 길이:', inputText.length);
      
      if (inputMode === 'text') {
        if (!inputText.trim()) throw new Error('영어 단어 텍스트를 입력해주세요.');
        console.log('📝 [executeQuizGeneration] 텍스트 모드 - 파싱 시작');
        const parseResult = parseWordsFromText(inputText.trim());
        console.log('📝 [executeQuizGeneration] 파싱 결과 타입:', typeof parseResult, Array.isArray(parseResult) ? '배열' : '객체');
        
        // parseResult가 객체인 경우 (영어 단어만 있는 경우 또는 혼합)
        if (typeof parseResult === 'object' && 'englishOnlyWords' in parseResult) {
          const { words: parsedWords, englishOnlyWords } = parseResult as any;
          console.log('📝 [executeQuizGeneration] 영어 단어만 포함된 결과:', {
            parsedWordsCount: parsedWords.length,
            englishOnlyWordsCount: englishOnlyWords.length
          });
          
          // 영어+한글이 있는 단어들
          words = parsedWords;
          
          // 영어 단어만 있는 경우 한글뜻 생성
          if (englishOnlyWords.length > 0) {
            console.log('📝 [executeQuizGeneration] 영어 단어만 발견됨, 한글뜻 생성 중...', englishOnlyWords);
            const koreanMeanings = await generateKoreanMeanings(englishOnlyWords);
            // 생성된 한글 뜻을 기존 단어 목록에 추가
            words = [...words, ...koreanMeanings];
            console.log('✅ [executeQuizGeneration] 한글뜻 생성 완료:', koreanMeanings.length, '개');
          }
          
          if (words.length === 0) {
            throw new Error('유효한 단어를 찾을 수 없습니다.');
          }
          
          console.log('✅ [executeQuizGeneration] 최종 파싱된 단어:', words.length, '개');
        } else {
          // parseResult가 배열인 경우 (영어+한글 모두 있는 경우)
          words = parseResult as WordItem[];
          
          // 한글 뜻이 없는 단어가 있는지 확인하고 자동 생성
          const wordsWithoutKorean = words.filter(w => !w.korean || w.korean.trim().length === 0);
          if (wordsWithoutKorean.length > 0) {
            console.log('📝 [executeQuizGeneration] 한글 뜻이 없는 단어 발견, 자동 생성 중...', wordsWithoutKorean.length, '개');
            const englishOnlyWords = wordsWithoutKorean.map(w => w.english);
            const koreanMeanings = await generateKoreanMeanings(englishOnlyWords);
            
            // 한글 뜻이 생성된 단어들로 업데이트
            words = words.map(word => {
              if (!word.korean || word.korean.trim().length === 0) {
                const meaning = koreanMeanings.find(m => m.english.toLowerCase() === word.english.toLowerCase());
                if (meaning) {
                  return { ...word, korean: meaning.korean };
                }
              }
              return word;
            });
            console.log('✅ [executeQuizGeneration] 한글뜻 자동 생성 완료');
          }
          
          console.log('✅ [executeQuizGeneration] 파싱된 단어 (배열):', words.length, '개');
        }
        
        // 60개 초과 시 제한 적용 및 입력창 업데이트
        if (words.length > 60) {
          alert(`최대 문제생성 가능 개수 60개가 초과됐습니다.\n입력된 단어: ${words.length}개\n60개까지만 사용됩니다.`);
          words = words.slice(0, 60);
          // 입력창 텍스트도 60개까지만 유지
          const limitedText = words.map(word => `${word.english}: ${word.korean}`).join('\n');
          setInputText(limitedText);
        }
      } else if (inputMode === 'image' && imageFile) {
        console.log('📝 [executeQuizGeneration] 이미지 모드 - 단어 추출 시작');
        words = await extractWordsFromImage(imageFile);
        console.log('✅ [executeQuizGeneration] 이미지에서 추출된 단어:', words.length, '개');
        
        // 60개 초과 시 제한 적용 및 입력창 업데이트
        if (words.length > 60) {
          alert(`최대 문제생성 가능 개수 60개가 초과됐습니다.\n입력된 단어: ${words.length}개\n60개까지만 사용됩니다.`);
          words = words.slice(0, 60);
          // 입력창 텍스트도 60개까지만 유지
          const limitedText = words.map(word => `${word.english}: ${word.korean}`).join('\n');
          setInputText(limitedText);
          setExtractedWords(words);
        }
      } else if (inputMode === 'capture') {
        // 캡처 이미지에서 추출된 텍스트가 수정되었을 수 있으므로 inputText 사용
        if (!inputText.trim()) throw new Error('영어 본문을 입력해주세요.');
        console.log('📝 [executeQuizGeneration] 캡처 모드 - 파싱 시작');
        const parseResult = parseWordsFromText(inputText.trim());
        if (Array.isArray(parseResult)) {
          words = parseResult;
          console.log('✅ [executeQuizGeneration] 캡처에서 파싱된 단어 (배열):', words.length, '개');
        } else {
          words = parseResult.words;
          console.log('✅ [executeQuizGeneration] 캡처에서 파싱된 단어 (객체):', words.length, '개');
        }
        
        // 60개 초과 시 제한 적용 및 입력창 업데이트
        if (words.length > 60) {
          alert(`최대 문제생성 가능 개수 60개가 초과됐습니다.\n입력된 단어: ${words.length}개\n60개까지만 사용됩니다.`);
          words = words.slice(0, 60);
          // 입력창 텍스트도 60개까지만 유지
          const limitedText = words.map(word => `${word.english}: ${word.korean}`).join('\n');
          setInputText(limitedText);
          setExtractedWords(words);
        }
      } else {
        throw new Error('이미지를 첨부해주세요.');
      }
      
      console.log('📊 [executeQuizGeneration] 최종 추출된 단어 수:', words.length);
      console.log('📝 [executeQuizGeneration] 추출된 단어 샘플 (처음 5개):', words.slice(0, 5).map(w => ({ english: w.english, korean: w.korean })));
      
      if (words.length === 0) throw new Error('추출된 단어가 없습니다.');
      if (words.length < 3) throw new Error('최소 3개 이상의 단어가 필요합니다.');
      
      // 단어 퀴즈 생성
      const quizData = await generateWordQuiz(words, quizType);
      console.log('생성된 단어 퀴즈:', quizData);
      setQuiz(quizData);

      // 문제 생성 내역 저장 (유형#12)
      if (userData?.uid && workTypePoints.length > 0) {
        try {
          const workTypePoint = workTypePoints.find(wt => wt.id === '12');
          await saveQuizWithPDF({
            userId: userData.uid,
            userName: userData.name || '사용자',
            userNickname: userData.nickname || '사용자',
            workTypeId: '12',
            workTypeName: '단어 학습 문제',
            points: workTypePoint?.points || 0,
            inputText: inputText,
            quizData: quizData,
            status: 'success'
          });
          console.log('✅ Work_12 내역 저장 완료');
        } catch (historyError) {
          console.error('❌ Work_12 내역 저장 실패:', historyError);
        }
      }
      
    } catch (err: any) {
      console.error('단어 문제 생성 오류:', err);
      
      // 포인트 환불
      if (deductedPoints > 0 && userData?.uid) {
        try {
          await refundUserPoints(
            userData.uid,
            deductedPoints,
            '단어 학습 문제 생성',
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

  // 인쇄 트리거 - 새 창을 열어 그 안에서 렌더링/인쇄 (가장 안정적인 방식)
  const triggerPrint = async (mode: PrintMode) => {
    if (!quiz) {
      console.warn('🖨️ [Work12] triggerPrint 호출되었지만 quiz 데이터가 없습니다.', { mode });
      return;
    }

    console.log('🖨️ [Work12] triggerPrint 시작(새 창)', {
      mode,
      wordsCount: quiz.words?.length,
      quizType,
      totalQuestions: quiz.totalQuestions,
      locationHref: window.location.href
    });

    // 품사 정보가 없는 단어들에 품사 추가 (비동기로 처리, 인쇄는 즉시 진행)
    let wordsForPrint = quiz.words || [];
    const wordsWithoutPos = wordsForPrint.filter(w => !w.partOfSpeech);
    
    // 품사 생성은 백그라운드에서 처리 (인쇄는 품사 없이도 진행)
    if (wordsWithoutPos.length > 0) {
      console.log(`🖨️ [Work12] 품사 정보가 없는 단어 ${wordsWithoutPos.length}개 발견, 품사 생성은 백그라운드에서 처리...`);
      // 품사 생성은 비동기로 처리하되 인쇄는 기다리지 않음
      addPartOfSpeechToWords(wordsForPrint).then(wordsWithPos => {
        // 품사 생성 완료 후 quiz 상태 업데이트 (다음 인쇄 시 사용)
        if (quiz) {
          setQuiz({
            ...quiz,
            words: wordsWithPos
          });
        }
        console.log(`🖨️ [Work12] 품사 정보 추가 완료 (백그라운드): ${wordsWithPos.filter(w => w.partOfSpeech).length}개 단어`);
      }).catch(err => {
        console.error('🖨️ [Work12] 품사 생성 오류 (백그라운드):', err);
      });
    }

    // HistoryPrintWork12에서 기대하는 데이터 형태로 변환
    const dataForPrint: any = {
      words: wordsForPrint,
      questions: quiz.questions,
      quizType: quiz.quizType,
      totalQuestions: quiz.totalQuestions
    };
    
    // 디버깅: 품사 정보 확인
    console.log('🖨️ [Work12] 인쇄용 데이터 준비 완료 (새 창)', {
      wordsCount: dataForPrint.words?.length,
      sampleWords: dataForPrint.words?.slice(0, 3).map((w: WordItem) => ({
        english: w.english,
        korean: w.korean,
        partOfSpeech: w.partOfSpeech,
        hasPartOfSpeech: !!w.partOfSpeech
      })),
      wordsWithPos: dataForPrint.words?.filter((w: WordItem) => w.partOfSpeech).length,
      wordsWithoutPos: dataForPrint.words?.filter((w: WordItem) => !w.partOfSpeech).length
    });

    // React 컴포넌트를 정적 HTML로 렌더링
    const markup = ReactDOMServer.renderToStaticMarkup(
      <HistoryPrintWork12
        data={dataForPrint}
        isAnswerMode={mode === 'with-answer'}
      />
    );

    // 현재 창 위에 전체 화면 오버레이 컨테이너 생성
    const overlayId = 'work12-print-overlay';
    const existingOverlay = document.getElementById(overlayId);
    if (existingOverlay && existingOverlay.parentNode) {
      existingOverlay.parentNode.removeChild(existingOverlay);
    }

    const overlay = document.createElement('div');
    overlay.id = overlayId;
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      backgroundColor: '#ffffff',
      zIndex: '9999',
      overflow: 'hidden'
    } as Partial<CSSStyleDeclaration>);

    // 오버레이에 인쇄용 스타일 + 마크업 주입
    overlay.innerHTML = `
      <style>${PRINT_STYLES}</style>
      ${markup}
    `;

    document.body.appendChild(overlay);

    // body에 임시 id를 부여하여 PRINT_STYLES 내 @media print 규칙이 적용되도록 함
    const prevBodyId = document.body.getAttribute('id');
    document.body.setAttribute('id', 'work12-print-active');

    // 한글뜻 열의 폰트 크기를 자동으로 조정하는 함수
    const adjustFontSizeForPrint = () => {
      const koreanCells = overlay.querySelectorAll('.word-list-table-work12 td:nth-child(3)');
      const minFontSize = 7; // 최소 폰트 크기 (pt)
      const maxFontSize = 10; // 최대 폰트 크기 (pt)
      
      koreanCells.forEach((cell) => {
        if (cell instanceof HTMLElement) {
          let fontSize = maxFontSize;
          
          // 임시로 최대 폰트 크기 설정하여 측정
          cell.style.fontSize = `${maxFontSize}pt`;
          cell.style.whiteSpace = 'nowrap';
          cell.style.overflow = 'hidden';
          
          // 텍스트가 넘치는지 확인
          while (cell.scrollWidth > cell.clientWidth && fontSize > minFontSize) {
            fontSize -= 0.5; // 0.5pt씩 줄임
            cell.style.fontSize = `${fontSize}pt`;
          }
          
          // 최소 크기까지 줄였는데도 넘치면 최소 크기로 고정
          if (cell.scrollWidth > cell.clientWidth && fontSize <= minFontSize) {
            cell.style.fontSize = `${minFontSize}pt`;
          }
        }
      });
    };

    // 최소 지연 후 인쇄 실행 (렌더링 완료 대기 및 폰트 크기 조정)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // 폰트 크기 조정 실행
        adjustFontSizeForPrint();
        
        // 추가 지연 후 인쇄 (폰트 크기 조정 완료 대기)
        setTimeout(() => {
          window.print();

          // window.print() 호출 직후 즉시 오버레이 숨기기
          overlay.style.display = 'none';
          overlay.style.visibility = 'hidden';
          overlay.style.position = 'absolute';
          overlay.style.left = '-9999px';
          overlay.style.top = '-9999px';
          overlay.style.opacity = '0';
          overlay.style.zIndex = '-1';
          overlay.style.width = '0';
          overlay.style.height = '0';
          overlay.style.overflow = 'hidden';
        }, 50);

      // 인쇄 후 오버레이 정리
      setTimeout(() => {
        const ov = document.getElementById(overlayId);
        if (ov && ov.parentNode) {
          ov.parentNode.removeChild(ov);
        }

         // body id 되돌리기
        if (prevBodyId) {
          document.body.setAttribute('id', prevBodyId);
        } else {
          document.body.removeAttribute('id');
        }
      }, 100);
      });
    });
  };

  const handlePrintNoAnswer = async () => {
    console.log('🖨️ [Work12] 인쇄(문제) 버튼 클릭');
    await triggerPrint('no-answer');
  };
  
  const handlePrintWithAnswer = async () => {
    console.log('🖨️ [Work12] 인쇄(정답) 버튼 클릭');
    await triggerPrint('with-answer');
  };
  // 리셋
  const resetQuiz = () => {
    setQuiz(null);
    setSelectedAnswers({});
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setIsPasteFocused(false);
    setExtractedWords([]);
    setIsLoading(false);
    setIsExtractingText(false);
  };

  // 문제 풀이/출력 화면
  if (quiz) {
    return (
      <div>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <h2 className="no-print">#12.단어 학습 문제</h2>
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
          <div className="quiz-section">
            <div className="problem-instruction" style={{fontWeight:800, fontSize:'1.18rem', background:'#222', color:'#fff', padding:'0.7rem 1.2rem', borderRadius:'8px', marginBottom:'1.2rem', display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
              <span>{quiz.quizType === 'english-to-korean' ? '다음 영어 단어의 한글 뜻을 고르시오.' : '다음 한글 뜻에 해당하는 영어 단어를 고르시오.'}</span>
              <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#12</span>
            </div>
            
            {/* 주관식 테이블 형태 - 모든 단어 표시 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: quiz.words.length > 10 ? '1fr 1fr' : '1fr',
              gap: '2rem',
              marginTop: '1rem'
            }}>
              {/* 왼쪽 테이블 (1번부터 절반까지) */}
              <div style={{
                background: '#ffffff',
                border: '2px solid #000000',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{background: '#e3f2fd'}}>
                      <th style={{border: '1px solid #000000', padding: '0.78rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: '15%'}}>No.</th>
                      <th style={{border: '1px solid #000000', padding: '0.78rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: quiz.quizType === 'english-to-korean' ? '42.5%' : '57.5%'}}>{quiz.quizType === 'english-to-korean' ? '영어 단어' : '한글 뜻'}</th>
                      <th style={{border: '1px solid #000000', padding: '0.78rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: quiz.quizType === 'english-to-korean' ? '42.5%' : '27.5%'}}>{quiz.quizType === 'english-to-korean' ? '한글 뜻' : '영어 단어'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quiz.words.slice(0, Math.ceil(quiz.words.length / 2)).map((word, index) => (
                      <tr key={index}>
                        <td style={{border: '1px solid #000000', padding: '0.78rem', textAlign: 'center', fontSize: '1rem', fontWeight: '500', color: '#000000'}}>
                          {index + 1}
                        </td>
                        <td style={{border: '1px solid #000000', padding: '0.78rem', fontSize: '1rem', fontWeight: '500', color: '#000000'}}>
                          {quiz.quizType === 'english-to-korean' ? word.english : word.korean}
                        </td>
                        <td style={{border: '1px solid #000000', padding: '0.78rem', fontSize: '1rem', color: '#000000'}}>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 오른쪽 테이블 (절반+1번부터 끝까지) - 10개 초과일 때만 표시 */}
              {quiz.words.length > 10 && (
                <div style={{
                  background: '#ffffff',
                  border: '2px solid #000000',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                      <tr style={{background: '#e3f2fd'}}>
                        <th style={{border: '1px solid #000000', padding: '0.78rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: '15%'}}>No.</th>
                        <th style={{border: '1px solid #000000', padding: '0.78rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: quiz.quizType === 'english-to-korean' ? '42.5%' : '57.5%'}}>{quiz.quizType === 'english-to-korean' ? '영어 단어' : '한글 뜻'}</th>
                        <th style={{border: '1px solid #000000', padding: '0.78rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: quiz.quizType === 'english-to-korean' ? '42.5%' : '27.5%'}}>{quiz.quizType === 'english-to-korean' ? '한글 뜻' : '영어 단어'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quiz.words.slice(Math.ceil(quiz.words.length / 2)).map((word, index) => (
                        <tr key={index + Math.ceil(quiz.words.length / 2)}>
                          <td style={{border: '1px solid #000000', padding: '0.78rem', textAlign: 'center', fontSize: '1rem', fontWeight: '500', color: '#000000'}}>
                            {index + Math.ceil(quiz.words.length / 2) + 1}
                          </td>
                          <td style={{border: '1px solid #000000', padding: '0.78rem', fontSize: '1rem', fontWeight: '500', color: '#000000'}}>
                            {quiz.quizType === 'english-to-korean' ? word.english : word.korean}
                          </td>
                          <td style={{border: '1px solid #000000', padding: '0.78rem', fontSize: '1rem', color: '#000000'}}>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 입력/옵션/버튼 UI
  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>메뉴#12. 영어 단어 학습 문제 생성 (단어문제)</h2>
        <p style={{marginBottom: '0.08rem'}}>영어 본문에서 중요한 단어들을 추출하여 단어 학습 문제를 생성합니다.</p>
        <p style={{marginTop: '0', fontSize: '0.95rem', color: '#666'}}>캡처화면 붙여넣기는 연속해서 여러 화면을 붙여넣을 수 있습니다</p>
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
          <span>✍️ 영어 단어 텍스트 붙여넣기</span>
        </label>
      </div>
      
      {/* 문제 유형 선택 */}
      <div className="quiz-type-section" style={{margin: '1.5rem auto', padding: '0.5rem 1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', maxWidth: 'fit-content'}}>
        <h3 style={{margin: '0', fontSize: '1.1rem', color: '#495057'}}>문제 유형 선택</h3>
        <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
          <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', background: quizType === 'english-to-korean' ? '#e3f2fd' : 'transparent', border: quizType === 'english-to-korean' ? '2px solid #1976d2' : '2px solid #e0e0e0'}}>
            <input
              type="radio"
              name="quizType"
              value="english-to-korean"
              checked={quizType === 'english-to-korean'}
              onChange={(e) => setQuizType(e.target.value as 'english-to-korean' | 'korean-to-english')}
              style={{marginRight: '0.5rem'}}
            />
            <span style={{fontWeight: quizType === 'english-to-korean' ? '600' : '400', color: quizType === 'english-to-korean' ? '#1976d2' : '#495057'}}>
              🇺🇸 영어 → 🇰🇷 한글
            </span>
          </label>
          <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', background: quizType === 'korean-to-english' ? '#e3f2fd' : 'transparent', border: quizType === 'korean-to-english' ? '2px solid #1976d2' : '2px solid #e0e0e0'}}>
            <input
              type="radio"
              name="quizType"
              value="korean-to-english"
              checked={quizType === 'korean-to-english'}
              onChange={(e) => setQuizType(e.target.value as 'english-to-korean' | 'korean-to-english')}
              style={{marginRight: '0.5rem'}}
            />
            <span style={{fontWeight: quizType === 'korean-to-english' ? '600' : '400', color: quizType === 'korean-to-english' ? '#1976d2' : '#495057'}}>
              🇰🇷 한글 → 🇺🇸 영어
            </span>
          </label>
        </div>
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
        <div className="input-guide" style={{border: '2px solid #339af0', padding: '0.5rem'}}>
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
          <label htmlFor="word-study-text" className="input-label">
            {inputMode === 'text' ? (
              <>
                영어 단어 텍스트 붙여넣기 : 최대 <span style={{color: 'red'}}>60개 단어 이하</span>로 문제생성이 가능합니다.
              </>
            ) : (
              <>
                추출된 단어 목록 : 최대 <span style={{color: 'red'}}>60개 단어 이하</span>로 문제생성이 가능합니다.
              </>
            )}
          </label>
          {extractedWords.length > 0 && (
            <span style={{
              marginLeft: 'auto',
              padding: '0.25rem 0.75rem',
              backgroundColor: '#e3f2fd',
              color: '#1976d2',
              fontWeight: '600',
              borderRadius: '4px',
              fontSize: '0.95rem'
            }}>
              추출된 단어: {extractedWords.length}개
            </span>
          )}
        </div>
        <textarea
          id="word-study-text"
          ref={textAreaRef}
          value={inputText}
          onChange={handleInputChange}
          placeholder={inputMode === 'text' ? 
            "영어 단어와 한글 뜻을 입력해주세요.\n\n지원하는 형식:\napple: 사과\nbook - 책\ncomputer 컴퓨터\nhappy : 행복한\nstudy - 공부하다\nin the face of: ~에 직면하여\ngive up: 포기하다\nreluctant to do: ~하기를 꺼리다\n\n또는 영어 단어만 입력해도 됩니다:\napple\nbook\ncomputer\nhappy\nstudy\nin the face of\ngive up\nreluctant to do\nreflect on\nturn into" : 
            "이미지에서 추출된 단어들이 여기에 표시됩니다."}
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
        영어 단어 문제 생성하기
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
        workTypeName="단어 학습 문제 생성"
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

export default Work_12_WordStudy; 