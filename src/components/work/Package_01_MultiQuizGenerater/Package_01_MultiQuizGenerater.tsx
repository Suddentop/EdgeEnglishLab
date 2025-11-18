import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Package_01_MultiQuizGenerater.css';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import ApiKeyCheck from '../../common/ApiKeyCheck';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { savePackageQuizHistory } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
import { createQuiz } from '../../../utils/textProcessor';
import { Quiz, SentenceTranslationQuiz } from '../../../types/types';
import { generateWork02Quiz, Work02QuizData } from '../../../services/work02Service';
import { imageToTextWithOpenAIVision, splitSentences, countWordsInSentence, filterValidSentences, generateBlankQuizWithAI, translateToKorean as work14TranslateToKorean } from '../../../services/work14Service';
import { generateWork05Quiz } from '../../../services/work05Service';
import { generateWork09Quiz } from '../../../services/work09Service';
import PrintFormatPackage01, { PrintFormatPackage01Work02, PrintFormatPackage01Work03, PrintFormatPackage01Work04, PrintFormatPackage01Work05, PrintFormatPackage01Work06, PrintFormatPackage01Work07, PrintFormatPackage01Work08, PrintFormatPackage01Work09, PrintFormatPackage01Work10, PrintFormatPackage01Work11, PrintFormatPackage01Work13, PrintFormatPackage01Work14 } from './PrintFormatPackage01';
import './PrintFormatPackage01.css';
import '../shared/PrintControls.css';
import FileFormatSelector from '../shared/FileFormatSelector';
import { callOpenAI } from '../../../services/common';
import { FileFormat, generateAndUploadFile } from '../../../services/pdfService';
import { formatBlankedText } from '../Package_02_TwoStepQuiz/printNormalization';

interface WordReplacement {
  original: string;           // 원본 단어/숙어
  replacement: string;        // 교체된 단어/숙어
  originalMeaning: string;    // 원본 단어/숙어의 한국어 뜻
  replacementMeaning: string; // 교체된 단어/숙어의 한국어 뜻
}

interface BlankFillItem {
  blankedText: string;
  correctAnswers: string[]; // 각 빈칸의 정답 배열
  translation: string;
  userAnswer: string;
  isCorrect: boolean | null;
  reasoning?: string; // 주제어 선정 이유
}

// 각 Work 컴포넌트의 문제 생성 함수들을 직접 구현

// 프록시 서버 또는 직접 OpenAI API 호출 헬퍼 함수
async function callOpenAIAPI(requestBody: any): Promise<Response> {
  // common.ts의 callOpenAI 함수를 사용하여 프록시 서버 우선 사용
  return await callOpenAI(requestBody);
}

// OpenAI API를 사용하여 영어를 한글로 번역
async function translateToKorean(englishText: string): Promise<string> {
  try {
    console.log('🌐 번역 시작:', englishText.substring(0, 50) + '...');

    const prompt = `다음 영어 본문을 자연스러운 한국어로 번역해주세요. 번역만 출력하고 다른 설명은 하지 마세요.

영어 본문:
${englishText}`;

    const response = await callOpenAIAPI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('❌ API 오류:', response.status, errorText);
      
      // 401 에러인 경우 더 명확한 메시지 제공
      if (response.status === 401) {
        let errorMessage = 'OpenAI API 인증 실패';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch (e) {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(`API 인증 실패: ${errorMessage}. API 키를 확인해주세요.`);
      }
      
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

// Work_13: 빈칸 채우기 문제 (단어-주관식) 생성
async function generateWork13Quiz(passage: string, retryCount: number = 0): Promise<BlankFillItem> {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
  
  // 먼저 문장을 분할하고 필터링
  const allSentences = splitSentences(passage);
  const { validSentences, skippedSentences } = filterValidSentences(allSentences);
  
  console.log('문장 분석 (AI 호출 전):', {
    전체문장수: allSentences.length,
    유효문장수: validSentences.length,
    제외문장수: skippedSentences.length,
    제외된문장들: skippedSentences.map(s => `${s.substring(0, 30)}... (${countWordsInSentence(s)}개 단어)`)
  });
  
  const prompt = `다음 ${validSentences.length}개 문장에서 각 문장마다 핵심 단어 1개씩을 선택하여 빈칸 문제를 만들어주세요.

**문장 목록:**
${validSentences.map((sentence, index) => `${index + 1}. ${sentence}`).join('\n')}

**작업:**
- 각 문장에서 가장 중요한 단어 1개를 선택
- 선택한 단어를 (_______________)로 교체
- 총 ${validSentences.length}개 문장 = ${validSentences.length}개 단어 선택

**단어 선택 기준:**
- 문장의 핵심 의미를 나타내는 단어 (동사, 명사, 형용사)
- 관사, 전치사, 접속사는 제외
- 문장의 첫 번째나 마지막 단어를 무작정 선택하지 말 것

**출력 형식 (JSON만):**
{
  "blankedText": "빈칸이 포함된 전체 본문",
  "correctAnswers": ["단어1", "단어2", "단어3", ...]
}

**중요:**
- 반드시 ${validSentences.length}개의 단어를 선택해야 함
- 모든 문장에서 1개씩 선택 (건너뛰지 말 것)
- JSON 형식으로만 응답

입력된 영어 본문:
${passage}`;
    
  try {
    const response = await callOpenAIAPI({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `You are an expert English teacher creating blank-fill problems. 

CRITICAL RULES:
1. Respond ONLY in valid JSON format
2. Select exactly ONE word from EACH sentence provided
3. Never skip any sentence - process ALL sentences
4. Choose meaningful words (nouns, verbs, adjectives) not function words
5. The number of selected words must equal the number of sentences

You will receive a list of sentences. Process each sentence in order and select the most important word from each one.` 
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });
    
    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('AI 응답 전체:', data);
    console.log('AI 응답 내용:', data.choices[0].message.content);
    
    const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    
    console.log('추출된 JSON:', jsonMatch[0]);
    
    let result: any;
    try {
      result = JSON.parse(jsonMatch[0]);
      console.log('파싱된 결과:', result);
    } catch {
      throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
    }
    
    // 필수 필드 검증
    if (!result.blankedText || !result.correctAnswers || !Array.isArray(result.correctAnswers)) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    // 문장 수와 선택된 단어 수 일치 검증
    const selectedWordsCount = result.correctAnswers.length;
    
    console.log('문장 수 검증:', {
      validSentencesCount: validSentences.length,
      selectedWordsCount: selectedWordsCount,
      validSentences: validSentences.map(s => s.substring(0, 50) + '...')
    });
    
    // 1단계: 개수 검증
    console.log('🔢 1단계: 개수 검증');
    if (validSentences.length !== selectedWordsCount) {
      console.error('❌ 개수 불일치 상세:', {
        유효문장수: validSentences.length,
        선택된단어수: selectedWordsCount,
        차이: validSentences.length - selectedWordsCount,
        비율: `${selectedWordsCount}/${validSentences.length} (${Math.round(selectedWordsCount/validSentences.length*100)}%)`
      });
      
      // 재시도 로직 (최대 2회)
      if (retryCount < 2) {
        console.log(`🔄 재시도 ${retryCount + 1}/2 - 더 강화된 프롬프트로 재시도`);
        return generateWork13Quiz(passage, retryCount + 1);
      }
      
      throw new Error(`AI가 ${validSentences.length}개 문장 중 ${selectedWordsCount}개만 처리했습니다. 모든 문장에서 단어를 선택해야 합니다. 다시 시도해주세요.`);
    }
  
    // 2단계: 각 문장별 단어 존재 검증
    console.log('🔍 2단계: 문장별 단어 존재 검증');
    const selectedWords = result.correctAnswers;
    const sentenceWordMapping: { 
      index: number, 
      sentence: string, 
      hasWord: boolean, 
      foundWord?: string,
      searchAttempts: string[]
    }[] = [];
    
    for (let i = 0; i < validSentences.length; i++) {
      const sentence = validSentences[i];
      const searchAttempts: string[] = [];
      
      // 각 선택된 단어로 검색 시도
      let foundWord: string | undefined;
      for (const word of selectedWords) {
        searchAttempts.push(`"${word}" 검색 시도`);
        if (sentence.toLowerCase().includes(word.toLowerCase())) {
          foundWord = word;
          searchAttempts.push(`✅ "${word}" 발견!`);
          break;
        } else {
          searchAttempts.push(`❌ "${word}" 없음`);
        }
      }
      
      sentenceWordMapping.push({
        index: i + 1,
        sentence: sentence.substring(0, 80) + (sentence.length > 80 ? '...' : ''),
        hasWord: !!foundWord,
        foundWord: foundWord,
        searchAttempts: searchAttempts
      });
      
      console.log(`  문장 ${i + 1}: ${foundWord ? '✅' : '❌'} ${foundWord ? `"${foundWord}"` : '단어 없음'}`);
    }
    
    const missingSentences = sentenceWordMapping.filter(item => !item.hasWord);
    
    if (missingSentences.length > 0) {
      console.error('❌ 누락된 문장들 상세 분석:');
      missingSentences.forEach(item => {
        console.error(`  문장 ${item.index}: "${item.sentence}"`);
        console.error(`  검색 시도들:`, item.searchAttempts);
      });
      
      console.error('❌ 선택된 단어들 전체:', selectedWords);
      console.error('❌ 전체 문장-단어 매핑:', sentenceWordMapping);
      
      // 재시도 로직 (최대 2회)
      if (retryCount < 2) {
        console.log(`🔄 재시도 ${retryCount + 1}/2 - 누락된 문장 문제로 재시도`);
        return generateWork13Quiz(passage, retryCount + 1);
      }
      
      throw new Error(`AI가 ${missingSentences.length}개 문장에서 단어를 선택하지 않았습니다. 모든 문장에서 단어를 선택해야 합니다. 다시 시도해주세요.`);
    }
    
    console.log('✅ 모든 문장에서 단어 선택 완료 - 검증 통과');
    console.log('🔍 === AI 응답 상세 분석 완료 ===');
    
    // 각 정답 단어가 본문에 실제로 존재하는지 검증 (대소문자 구분 없이)
    const correctAnswers = result.correctAnswers;
    const passageLower = passage.toLowerCase();
    
    console.log('검증 정보:', {
      originalPassage: passage.substring(0, 100) + '...',
      correctAnswers: correctAnswers,
      passageLower: passageLower.substring(0, 100) + '...'
    });
    
    for (let i = 0; i < correctAnswers.length; i++) {
      const answerLower = correctAnswers[i].toLowerCase();
      
      if (!passageLower.includes(answerLower)) {
        // 정확한 단어 경계로 다시 검증
        const wordBoundaryRegex = new RegExp(`\\b${answerLower}\\b`);
        if (!wordBoundaryRegex.test(passageLower)) {
          console.error('정답 단어 검증 실패:', {
            correctAnswer: correctAnswers[i],
            passage: passage.substring(0, 200)
          });
          throw new Error(`정답 단어 "${correctAnswers[i]}"가 본문에 존재하지 않습니다. AI 응답 오류입니다.`);
        }
      }
    }

    // 빈칸 본문이 원본 본문과 일치하는지 검증
    let blankRestore = result.blankedText;
    for (let i = 0; i < correctAnswers.length; i++) {
      blankRestore = blankRestore.replace(/\(_{15}\)/, correctAnswers[i]);
    }
    
    // 공백과 구두점을 정규화하여 비교
    const normalizeText = (text: string) => {
      return text
        .trim()
        .replace(/\s+/g, ' ')  // 여러 공백을 하나로
        .replace(/[.,!?;:]/g, '')  // 구두점 제거
        .toLowerCase();
    };
    
    const normalizedOriginal = normalizeText(passage);
    const normalizedRestored = normalizeText(blankRestore);
    
    console.log('빈칸 본문 검증:', {
      original: normalizedOriginal.substring(0, 100),
      restored: normalizedRestored.substring(0, 100),
      blankedText: result.blankedText.substring(0, 100),
      match: normalizedRestored === normalizedOriginal
    });
    
    if (normalizedRestored !== normalizedOriginal) {
      console.warn('빈칸 본문 검증 실패 - 상세 정보:', {
        original: passage.substring(0, 300),
        blankedText: result.blankedText.substring(0, 300),
        restored: blankRestore.substring(0, 300),
        correctAnswers: correctAnswers
      });
      
      // 정답 단어가 본문에 존재하고, 빈칸이 적절히 배치되어 있으면 통과
      const allAnswersExist = correctAnswers.every((answer: string) => 
        passageLower.includes(answer.toLowerCase())
      );
      if (allAnswersExist && result.blankedText.includes('(_______________)')) {
        console.log('정답 단어가 본문에 존재하고 빈칸이 적절히 배치되어 있어 통과합니다.');
      } else {
        throw new Error('빈칸 본문이 원본 본문과 일치하지 않습니다. AI 응답 오류입니다.');
      }
    }
    
    // 번역은 별도 함수로 처리
    console.log('번역 시작...');
    const translation = await translateToKorean(passage);
    result.translation = translation;
    
    console.log('최종 검증 전 결과:', {
      blankedText: result.blankedText,
      correctAnswers: result.correctAnswers,
      translation: result.translation
    });
    
    if (!result.blankedText || !result.correctAnswers || !result.translation) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    console.log('AI 응답 검증 완료, 반환할 결과:', result);
    return result;
    
  } catch (error) {
    console.error('AI 문제 생성 오류:', error);
    throw error;
  }
}

// Work_14: 빈칸 채우기 문제 (문장-주관식) 생성
async function generateWork14Quiz(passage: string): Promise<BlankQuiz> {
  try {
    console.log('🔄 Work_14 문제 생성 시작...');
    
    // 원래의 유형#14의 개선된 로직 사용
    const result = await generateBlankQuizWithAI(passage);
    
    console.log('✅ Work_14 문제 생성 완료:', {
      blankedText: result.blankedText.substring(0, 100) + '...',
      selectedSentencesCount: result.correctAnswers.length,
      translation: result.translation.substring(0, 50) + '...'
    });
    
    return {
      blankedText: result.blankedText,
      options: [], // 주관식 문제이므로 빈 배열
      answerIndex: -1, // 주관식 문제이므로 -1
      selectedSentences: result.correctAnswers,
      correctAnswers: result.correctAnswers, // 정답 문장들 추가
      translation: result.translation,
      userAnswer: '',
      isCorrect: null,
      reasoning: undefined
    };
  } catch (error) {
    console.error('❌ Work_14 문제 생성 오류:', error);
    throw error;
  }
}


interface BlankQuiz {
  blankedText: string;
  options: string[];
  answerIndex: number;
  translation: string;
  optionTranslations?: string[]; // 유형#05용: 선택지별 한글 해석
  selectedSentences?: string[]; // 유형#14용: 선택된 문장들
  correctAnswers?: string[]; // 유형#14용: 정답 문장들
  userAnswer?: string;
  isCorrect?: boolean | null;
  reasoning?: string;
}

interface SentencePositionQuiz {
  missingSentence: string;
  numberedPassage: string;
  answerIndex: number; // 0~4 (①~⑤)
  translation: string;
}

interface MainIdeaQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation: string;
  optionTranslations: string[];
}

interface TitleQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  answerTranslation?: string;
}

interface GrammarQuiz {
  passage: string;
  options: string[];
  answerIndex: number;
  translation: string;
  original: string; // 정답의 원래(정상) 단어/구
}

interface MultiGrammarQuiz {
  passage: string; // 번호/밑줄 적용된 본문
  options: number[]; // [1,2,3,4,5]
  answerIndex: number; // 정답(틀린 단어 개수-1)
  translation: string;
  originalWords: string[];
  transformedWords: string[];
  wrongIndexes: number[];
}

interface PackageQuizItem {
  workType: string;
  workTypeId: string;
  quiz?: Quiz;  // Work_01용
  work02Data?: Work02QuizData;  // Work_02용
  work03Data?: BlankQuiz;  // Work_03용
  work04Data?: BlankQuiz;  // Work_04용
  work05Data?: BlankQuiz;  // Work_05용
  work06Data?: SentencePositionQuiz;  // Work_06용
  work07Data?: MainIdeaQuiz;  // Work_07용
  work08Data?: TitleQuiz;  // Work_08용
  work09Data?: GrammarQuiz;  // Work_09용
  work10Data?: MultiGrammarQuiz;  // Work_10용
  work11Data?: SentenceTranslationQuiz;  // Work_11용
  work13Data?: BlankFillItem;  // Work_13용
  work14Data?: BlankQuiz;  // Work_14용 (문장 빈칸 채우기)
  translatedText: string;
}


// 문제 유형 정의
const WORK_TYPES = [
  { id: '01', name: '문단 순서 맞추기', path: '/work_01_article-order' },
  { id: '02', name: '독해 문제', path: '/work_02_reading-comprehension' },
  { id: '03', name: '빈칸(단어) 문제', path: '/work_03_vocabulary-word' },
  { id: '04', name: '빈칸(구) 문제', path: '/work_04_blank-phrase-inference' },
  { id: '05', name: '빈칸(문장) 문제', path: '/work_05_blank-sentence-inference' },
  { id: '06', name: '문장 위치 찾기', path: '/work_06_sentence-position' },
  { id: '07', name: '주제 추론', path: '/work_07_main-idea-inference' },
  { id: '08', name: '제목 추론', path: '/work_08_title-inference' },
  { id: '09', name: '어법 오류 문제', path: '/work_09_grammar-error' },
  { id: '10', name: '다중 어법 오류 문제', path: '/work_10_multi-grammar-error' },
  { id: '11', name: '본문 문장별 해석', path: '/work_11_sentence-translation' },
  { id: '13', name: '빈칸 채우기 문제 (단어-주관식)', path: '/work_13_blank-fill-word' },
  { id: '14', name: '빈칸 채우기 문제 (문장-주관식)', path: '/work_14_fill-sentence' }
];

// UI ID(01,02,03...)를 Firebase ID(1,2,3...)로 변환하는 매핑
const UI_TO_FIREBASE_ID_MAP: {[key: string]: string} = {
  '01': '1', '02': '2', '03': '3', '04': '4', '05': '5',
  '06': '6', '07': '7', '08': '8', '09': '9', '10': '10', '11': '11', '13': '13', '14': '14'
};


// 입력 방식 타입
const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];

type PrintMode = 'none' | 'no-answer' | 'with-answer';

const Package_01_MultiQuizGenerater: React.FC = () => {
  const { userData, loading } = useAuth();
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [packageQuiz, setPackageQuiz] = useState<PackageQuizItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const [fileFormat, setFileFormat] = useState<FileFormat>('pdf');
  const [useAI] = useState(false);
  
  // 진행 상황 추적을 위한 상태
  const [progressInfo, setProgressInfo] = useState({
    completed: 0,
    total: 0,
    currentType: '',
    currentTypeId: ''
  });
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // 화면 전환 상태 관리
  const [showQuizDisplay, setShowQuizDisplay] = useState(false);
  const [translatedText, setTranslatedText] = useState<string>('');
  
  // 선택된 문제 유형 관리
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<{[key: string]: boolean}>(() => {
    // localStorage에서 이전 선택 상태 복원
    const savedSelections = localStorage.getItem('package01_selectedWorkTypes');
    if (savedSelections) {
      try {
        const parsed = JSON.parse(savedSelections);
        // 저장된 선택 상태가 있으면 사용, 없으면 기본값 사용
        return parsed;
      } catch (error) {
        console.error('저장된 선택 상태 파싱 오류:', error);
      }
    }
    
    // 기본값: 모든 유형 선택
    const initial: {[key: string]: boolean} = {};
    WORK_TYPES.forEach(type => {
      initial[type.id] = true;
    });
    return initial;
  });
  
  // 포인트 관련 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointsToDeduct, setPointsToDeduct] = useState(0);
  const [userCurrentPoints, setUserCurrentPoints] = useState(0);
  const [workTypePoints, setWorkTypePoints] = useState<any[]>([]);
  

  // 선택된 유형들의 총 포인트 계산 함수
  const calculateTotalPoints = () => {
    const selectedTypes = WORK_TYPES.filter(type => selectedWorkTypes[type.id]);
    return selectedTypes.reduce((total, type) => {
      const firebaseId = UI_TO_FIREBASE_ID_MAP[type.id];
      const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId)?.points || 0;
      return total + workTypePoint;
    }, 0);
  };

  // 선택 상태를 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('package01_selectedWorkTypes', JSON.stringify(selectedWorkTypes));
  }, [selectedWorkTypes]);

  // 포인트 정보 로드
  useEffect(() => {
    const loadPointInfo = async () => {
      try {
        const [points, workTypes] = await Promise.all([
          getUserCurrentPoints(userData?.uid || ''),
          getWorkTypePoints()
        ]);
        setUserCurrentPoints(points);
        setWorkTypePoints(workTypes);
      } catch (error) {
        console.error('포인트 정보 로드 실패:', error);
      }
    };

    if (userData) {
      loadPointInfo();
    }
  }, [userData]);

  // 입력 모드 변경 핸들러
  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setInputText('');
    setImageFile(null);
    setPackageQuiz(null);
  };

  // 텍스트 입력 핸들러
  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  };

  // 이미지 파일 선택 핸들러
  const handleImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // OCR → textarea에 자동 입력
      setIsExtractingText(true);
      try {
        const ocrText = await imageToTextWithOpenAIVision(file);
        console.log('📝 추출된 텍스트 길이:', ocrText.length);
        
        if (ocrText && ocrText.trim().length > 0) {
          setInputText(ocrText);
          // 이미지 파일 업로드 후에도 텍스트 모드로 전환
          setInputMode('text');
          setTimeout(() => {
            if (textAreaRef.current) {
              textAreaRef.current.style.height = 'auto';
              textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
              textAreaRef.current.focus();
            }
          }, 100);
        } else {
          console.warn('⚠️ 추출된 텍스트가 비어있음');
          alert('이미지에서 텍스트를 추출할 수 없습니다. 다른 이미지를 시도해주세요.');
        }
      } catch (err) {
        console.error('❌ 이미지 텍스트 추출 실패:', err);
        alert(`OCR 처리 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsExtractingText(false);
      }
    }
  };

  // 문제 유형 선택/해제 핸들러
  const handleWorkTypeToggle = (workTypeId: string) => {
    setSelectedWorkTypes(prev => ({
      ...prev,
      [workTypeId]: !prev[workTypeId]
    }));
  };

  // 붙여넣기(클립보드) 이미지 처리
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
          setImageFile(file);
          setIsExtractingText(true);
          try {
            console.log('🔄 OCR 처리 시작...');
            console.log('📁 파일 정보:', { name: file.name, size: file.size, type: file.type });
            // console.log('🔑 API 키 확인:', process.env.REACT_APP_OPENAI_API_KEY ? '설정됨' : '설정되지 않음'); // 보안상 제거됨
            
            const ocrText = await imageToTextWithOpenAIVision(file);
            console.log('✅ OCR 처리 완료:', ocrText.substring(0, 100) + '...');
            console.log('📝 추출된 텍스트 길이:', ocrText.length);
            
            if (ocrText && ocrText.trim().length > 0) {
              console.log('🔄 setInputText 호출 전 - 현재 inputText:', inputText);
              console.log('🔄 setInputText 호출 전 - ocrText 길이:', ocrText.length);
              setInputText(ocrText);
              setInputMode('text'); // OCR 완료 후 텍스트 모드로 전환
              console.log('✅ setInputText 호출 완료 및 inputMode를 text로 변경');
              
              // 상태 업데이트 확인을 위한 setTimeout
              setTimeout(() => {
                console.log('🔄 setInputText 호출 후 - inputText 상태:', inputText);
                console.log('🔄 setInputText 호출 후 - inputText 길이:', inputText?.length || 0);
                console.log('🔄 현재 inputMode:', inputMode);
              }, 100);
            } else {
              console.warn('⚠️ 추출된 텍스트가 비어있음');
              alert('이미지에서 텍스트를 추출할 수 없습니다. 다른 이미지를 시도해주세요.');
            }
          } catch (err) {
            console.error('❌ OCR 처리 오류 상세:', err);
            console.error('❌ 오류 타입:', typeof err);
            console.error('❌ 오류 메시지:', err instanceof Error ? err.message : String(err));
            console.error('❌ 오류 스택:', err instanceof Error ? err.stack : 'No stack trace');
            alert(`OCR 처리 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`);
          } finally {
            setIsExtractingText(false);
          }
        } else {
          console.error('❌ 파일 생성 실패');
        }
        // 이미지를 찾았으므로 기본 동작(텍스트 붙여넣기) 막기
        e.preventDefault();
        return;
      }
    }
    
    // 이미지를 찾지 못했을 때는 기본 동작 허용 (텍스트 붙여넣기 가능)
  };

  // 모든 유형 선택/해제
  const handleSelectAll = () => {
    const allSelected = Object.values(selectedWorkTypes).every(selected => selected);
    const newSelection: {[key: string]: boolean} = {};
    WORK_TYPES.forEach(type => {
      newSelection[type.id] = !allSelected;
    });
    setSelectedWorkTypes(newSelection);
  };

  // Work_01 (문장 순서 맞추기) 문제 생성 함수
  const generateWork01Quiz = async (inputText: string, useAI: boolean = false): Promise<Quiz> => {
    console.log('🔍 Work_01 문제 생성 시작...');
    console.log('📝 입력 텍스트 길이:', inputText.length);
    console.log('🤖 AI 사용 여부:', useAI);
    
    try {
      const quiz = await createQuiz(inputText, useAI);
      
      // 섞기 결과 검증
      console.log('🔍 섞기 결과 검증...');
      const shuffledLabels = quiz.shuffledParagraphs.map(p => p.label);
      const correctLabels = quiz.correctOrder;
      
      console.log('📊 섞기 결과 분석:');
      console.log('- 섞인 순서 (라벨):', shuffledLabels);
      console.log('- 원본 순서 (라벨):', correctLabels);
      
      // 전체 텍스트 번역 수행
      console.log('🌐 전체 텍스트 번역 시작...');
      let translation = '';
      try {
        const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
        if (apiKey) {
          const response = await callOpenAIAPI({
          model: 'gpt-3.5-turbo',
          messages: [
            {
                  role: 'system',
              content: 'You are a professional English to Korean translator. Translate the given English text into natural Korean. Maintain the original paragraph structure and formatting.'
            },
            {
                  role: 'user',
              content: inputText
            }
          ],
          max_tokens: 2000,
          temperature: 0.3
        });
        
          if (response.ok) {
            const data = await response.json();
            translation = data.choices[0].message.content;
            console.log('✅ 번역 완료');
          } else {
            console.error('❌ 번역 API 오류:', response.status);
            translation = '번역 실패';
          }
        } else {
          console.warn('⚠️ OpenAI API 키가 없습니다.');
          translation = '번역 불가 (API 키 없음)';
        }
      } catch (error) {
        console.error('❌ 번역 실패:', error);
        translation = '번역 실패';
      }
      
      console.log('✅ Work_01 퀴즈 생성 완료:', {
        originalText: quiz.originalText,
        shuffledParagraphs: quiz.shuffledParagraphs,
        correctOrder: quiz.correctOrder,
        choices: quiz.choices,
        answerIndex: quiz.answerIndex,
        translation: translation
      });
      
      return {
        ...quiz,
        translation: translation
      };
    } catch (error) {
      console.error('❌ Work_01 문제 생성 실패:', error);
      throw error;
    }
  };

  // Work_04 (빈칸 구 문제) 문제 생성 함수
  const generateWork04Quiz = async (inputText: string): Promise<BlankQuiz> => {
    console.log('🔍 Work_04 문제 생성 시작...');
    console.log('📝 입력 텍스트 길이:', inputText.length);

    try {
      // passage에서 이미 ()로 묶인 구 추출
      const excludedPhrases: string[] = [];
      const bracketRegex = /\(([^)]+)\)/g;
      let match;
      while ((match = bracketRegex.exec(inputText)) !== null) {
        excludedPhrases.push(match[1].trim());
      }
      
      const prompt = `아래 영어 본문에서 글의 주제와 가장 밀접한, 의미 있는 구(phrase, 3~10단어 이내) 1개를 선정해.

1. 반드시 본문에 실제로 등장한 구(철자, 형태, 대소문자까지 동일)를 정답으로 선정해야 해. 변형, 대체, 동의어, 어형 변화 없이 본문에 있던 그대로 사용해야 해.

2. 문제의 본문(빈칸 포함)은 반드시 사용자가 입력한 전체 본문과 완전히 동일해야 하며, 일부 문장만 추출하거나, 문장 순서를 바꾸거나, 본문을 요약/변형해서는 안 돼. 오직 정답 구만 ()로 치환해.

3. 입력된 본문에 이미 ()로 묶인 단어나 구가 있다면, 그 부분은 절대 빈칸 처리 대상으로 삼지 마세요. 반드시 괄호 밖에 있는 구만 빈칸 후보로 선정하세요.

4. 아래 구는 절대 빈칸 처리하지 마세요: ${excludedPhrases.length > 0 ? excludedPhrases.join(', ') : '없음'}

5. 정답(구) + 오답(비슷한 길이의 구 4개, 의미는 다름) 총 5개를 생성해.

6. 정답의 위치는 1~5번 중 랜덤.

7. 본문 해석도 함께 제공.

8. 아래 JSON 형식으로 응답:

{
  "options": ["...", ...],
  "answerIndex": 2, // 0~4
  "translation": "..."
}

주의: options의 정답(정답 인덱스에 해당하는 구)는 반드시 본문에 있던 구와 완전히 일치해야 하며, 변형/대체/동의어/어형 변화가 있으면 안 됨. 문제의 본문(빈칸 포함)은 반드시 입력한 전체 본문과 동일해야 함. 입력된 본문에 이미 ()로 묶인 부분은 빈칸 처리 대상에서 제외해야 함.

본문:
${inputText}`;

      const response = await callOpenAIAPI({
        model: 'gpt-4o',
        messages: [
          {
              role: 'user',
            content: prompt
          }
        ],
          max_tokens: 2048
      });

      if (!response.ok) {
        throw new Error(`OpenAI API 오류: ${response.status}`);
      }

      const data = await response.json();
      console.log('AI 응답 전체:', data);
      console.log('AI 응답 내용:', data.choices[0].message.content);
      
      const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
      
      console.log('추출된 JSON:', jsonMatch[0]);
      
      let quizData: any;
      try {
        quizData = JSON.parse(jsonMatch[0]);
        console.log('파싱된 결과:', quizData);
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError);
        throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
      }

      // blankedText 생성 (정답 구를 밑줄로 치환)
      const correctAnswer = quizData.options[quizData.answerIndex];
      const blankStr = '(__________)'; // Work_04와 동일한 형태
      const blankedText = inputText.replace(correctAnswer, blankStr);
      
      const quiz: BlankQuiz = {
        blankedText: blankedText,
        options: quizData.options,
        answerIndex: quizData.answerIndex,
        translation: quizData.translation
      };

      console.log('✅ Work_04 문제 생성 완료:', quiz);
      return quiz;
      
    } catch (error) {
      console.error('❌ Work_04 문제 생성 실패:', error);
      throw error;
    }
  };

  // generateWork05Quiz는 work05Service.ts의 개선된 함수를 사용
  // 이 함수는 더 이상 사용되지 않으며, 모든 로직이 work05Service.ts에 통합됨

  // Work_06 (문장 위치 찾기) 문제 생성 함수
  const generateWork06Quiz = async (inputText: string): Promise<SentencePositionQuiz> => {
    console.log('🔍 Work_06 문제 생성 시작...');
    console.log('📝 입력 텍스트 길이:', inputText.length);

    try {
      // 1단계: 원본 본문을 문장 단위로 분할
      const originalSentences = inputText
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 0 && s.trim().length > 10);
      
      console.log('원본 문장들:', originalSentences);
      
      if (originalSentences.length < 5) {
        throw new Error('본문에 충분한 문장이 없습니다. 최소 5개의 문장이 필요합니다.');
      }
      
      // 2단계: 주제 문장 선정 및 제거 (AI 기반 방식, 실패 시 휴리스틱 방식)
      let missingSentence: string;
      let topicSentenceIndex: number;
      
      try {
        const result = await selectAndRemoveTopicSentence(originalSentences);
        missingSentence = result.missingSentence;
        topicSentenceIndex = result.topicSentenceIndex;
        console.log('✅ AI 기반 주제 문장 선정 성공');
      } catch (aiError) {
        console.warn('⚠️ AI 기반 주제 문장 선정 실패, 휴리스틱 방식으로 전환:', aiError);
        const result = selectTopicSentenceLocally(originalSentences);
        missingSentence = result.missingSentence;
        topicSentenceIndex = result.topicSentenceIndex;
        console.log('✅ 휴리스틱 방식으로 주제 문장 선정 완료');
      }
      
      console.log('선정된 주제 문장:', missingSentence);
      console.log('주제 문장 위치:', topicSentenceIndex);
      
      // 3단계: 주제 문장을 제거한 새로운 본문 생성
      const remainingSentences = originalSentences.filter((_, index) => index !== topicSentenceIndex);
      
      console.log('주제 문장 제거 후 문장들:', remainingSentences);
      
      // 4단계: 새로운 본문에 번호 부여
      const { numberedPassage, answerIndex } = assignNumbersSimple(remainingSentences, topicSentenceIndex);
      
      console.log('번호 부여 후 본문:', numberedPassage);
      console.log('정답 위치:', answerIndex);
      
      // 5단계: 번역 생성
      const translation = await translateToKorean(inputText);
      
      const quizData: SentencePositionQuiz = {
        missingSentence: missingSentence.trim(),
        numberedPassage: numberedPassage.trim(),
        answerIndex,
        translation: translation.trim()
      };
      
      console.log('✅ Work_06 문제 생성 완료:', quizData);
      return quizData;
      
    } catch (error) {
      console.error('❌ Work_06 문제 생성 실패:', error);
      throw error;
    }
  };

  const generateWork07Quiz = async (inputText: string): Promise<MainIdeaQuiz> => {
    console.log('🔍 Work_07 문제 생성 시작...');
    console.log('📝 입력 텍스트 길이:', inputText.length);

    try {
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
${inputText}

중요 규칙:
- answerIndex는 0~4 사이의 숫자 (배열 인덱스)
- answerTranslation은 반드시 options[answerIndex]의 정확한 번역
- optionTranslations는 모든 선택지의 해석 배열 (options와 동일한 순서)
- 예시: answerIndex=1, options[1]="The future is uncertain but promising." → answerTranslation="미래는 불확실하지만 희망적입니다."
- optionTranslations[1]도 "미래는 불확실하지만 희망적입니다."가 되어야 함
- 모든 해석이 정확히 일치해야 함`;

      console.log('🤖 OpenAI API 호출 중...');
      const response = await callOpenAIAPI({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
          temperature: 0.3
      });

      if (!response.ok) {
        throw new Error(`OpenAI API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🤖 AI 응답 전체:', data);
      
      const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
      
      let result;
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
      }
      
      // 필수 필드 검증
      if (!result.passage || !result.options || typeof result.answerIndex !== 'number' || 
          !result.translation || !result.answerTranslation || !result.optionTranslations) {
        throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
      }
      
      // 정답 인덱스 검증
      if (result.answerIndex < 0 || result.answerIndex >= result.options.length) {
        throw new Error('정답 인덱스가 유효하지 않습니다.');
      }
      
      // optionTranslations 배열 검증
      if (!Array.isArray(result.optionTranslations) || result.optionTranslations.length !== result.options.length) {
        throw new Error('optionTranslations 배열이 올바르지 않습니다.');
      }
      
      // 정답 해석 검증
      const needsRetry = checkAnswerTranslationMismatch(result.options[result.answerIndex], result.answerTranslation);
      if (needsRetry) {
        console.warn('정답 해석이 정답과 일치하지 않습니다. 재시도합니다.');
        return await generateWork07QuizRetry(inputText, 1);
      }
      
      console.log('✅ Work_07 문제 생성 완료:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Work_07 문제 생성 실패:', error);
      throw error;
    }
  };

  // 정답 해석 불일치 검증 함수 (Work_07에서 가져옴)
  const checkAnswerTranslationMismatch = (correctAnswer: string, answerTranslation: string): boolean => {
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
  };

  // 재시도 함수 (Work_07에서 가져옴)
  const generateWork07QuizRetry = async (inputText: string, retryCount: number): Promise<MainIdeaQuiz> => {
    
    if (retryCount > 3) {
      throw new Error('최대 재시도 횟수를 초과했습니다.');
    }
    
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
${inputText}

중요 규칙:
- answerIndex는 0~4 사이의 숫자 (배열 인덱스)
- answerTranslation은 반드시 options[answerIndex]의 정확한 번역
- optionTranslations는 모든 선택지의 해석 배열 (options와 동일한 순서)
- 예시: answerIndex=1, options[1]="The future is uncertain but promising." → answerTranslation="미래는 불확실하지만 희망적입니다."
- optionTranslations[1]도 "미래는 불확실하지만 희망적입니다."가 되어야 함
- 모든 해석이 정확히 일치해야 함`;

    const response = await callOpenAIAPI({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3
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
    
    if (!result.passage || !result.options || typeof result.answerIndex !== 'number' || 
        !result.translation || !result.answerTranslation || !result.optionTranslations) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    // 정답 해석 검증
    const needsRetry = checkAnswerTranslationMismatch(result.options[result.answerIndex], result.answerTranslation);
    if (needsRetry) {
      console.warn(`정답 해석이 정답과 일치하지 않습니다. 재시도 ${retryCount + 1}/3`);
      return await generateWork07QuizRetry(inputText, retryCount + 1);
    }
    
    return result;
  };

  // Work_08 제목 추론 문제 생성 함수
  const generateWork08Quiz = async (inputText: string): Promise<TitleQuiz> => {
    console.log('🔄 Work_08 문제 생성 시작...');
    
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const prompt = `아래 영어 본문을 읽고, 글의 주제의식에 가장 적합한 제목(title) 1개를 선정해.\n1. 정답 제목(문장/구) + 오답(비슷한 길이의 제목 4개, 의미는 다름) 총 5개를 생성해.\n2. 정답의 위치는 1~5번 중 랜덤.\n3. 본문 해석도 함께 제공.\n4. 아래 JSON 형식으로, 반드시 answerTranslation(정답 제목의 한글 해석) 필드를 별도 포함해서 응답:\n{\n  \"passage\": \"...\",\n  \"options\": [\"...\", \"...\", \"...\", \"...\", \"...\"],\n  \"answerIndex\": 2,\n  \"translation\": \"...\",\n  \"answerTranslation\": \"정답 제목의 한글 해석\"\n}\n본문:\n${inputText}\n정답(제목)의 한글 해석도 반드시 포함해줘.\n정답(제목) 영어 문장과 그 한글 해석(answerTranslation)도 반드시 별도 필드로 포함해줘.`;

    const response = await callOpenAIAPI({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
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
    
    console.log('✅ Work_08 문제 생성 완료:', result);
    return result;
  };

  // Work_09 핵심 함수들
  const selectWords = async (passage: string): Promise<string[]> => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
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

    const response = await callOpenAIAPI({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that only returns valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    console.log('단어 선정 AI 응답 전체:', data);
    console.log('단어 선정 AI 응답 내용:', content);
    
    // 마크다운 코드 블록 제거
    let wordsJson = content;
    if (content.includes('```Json') || content.includes('```json')) {
      wordsJson = content.replace(/```(?:Json|json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
    }
    
    console.log('정리된 JSON:', wordsJson);
    
    try {
      const words = JSON.parse(wordsJson);
      console.log('파싱된 단어 배열:', words);
      if (!Array.isArray(words) || words.length !== 5) {
        throw new Error('Invalid word selection format');
      }
      return words;
    } catch (error) {
      console.error('단어 선정 실패:', error);
      throw new Error('단어 선정에 실패했습니다.');
    }
  };

  const transformWord = async (words: string[]): Promise<{
    transformedWords: string[];
    answerIndex: number;
    original: string;
    grammarType: string;
  }> => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
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

      const response = await callOpenAIAPI({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are a helpful assistant that only returns valid JSON objects.' },
            { role: 'user', content: prompt }
          ],
        max_tokens: 1000,
        temperature: 0.7
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      console.log('AI 응답 전체:', data);
      console.log('AI 응답 내용:', content);
      
      // 마크다운 코드 블록 제거
      let resultJson = content;
      if (content.includes('```Json') || content.includes('```json')) {
        resultJson = content.replace(/```(?:Json|json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
      }
      
      console.log('정리된 JSON:', resultJson);
      
      try {
        const result = JSON.parse(resultJson);
        console.log('파싱된 결과:', result);
        
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
            throw new Error(`원본 단어가 일치하지 않습니다: 예상 "${originalWord}", 받은 "${result.original}"`);
          }
          continue; // 다시 시도
        }
        
        console.log(`✅ 어법 변형 성공 (시도 ${attempt}):`, result);
        return result;
      } catch (error) {
        console.log(`❌ 어법 변형 실패 (시도 ${attempt}):`, error);
        if (attempt === maxRetries) {
          throw new Error(`어법 변형에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
      }
    }
    
    throw new Error('어법 변형에 실패했습니다.');
  };

  const applyNumberAndUnderline = (
    passage: string, 
    originalWords: string[], 
    transformedWords: string[]
  ): string => {
    let result = passage;
    
    console.log('🔍 applyNumberAndUnderline 시작');
    console.log('원본 단어들:', originalWords);
    console.log('변형된 단어들:', transformedWords);
    
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
        console.log(`단어 "${originalWord}" 위치 찾음: ${match.index}`);
      } else {
        console.warn(`단어 "${originalWord}"를 본문에서 찾을 수 없음`);
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
  };

  const translatePassage = async (passage: string): Promise<string> => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const prompt = `다음 영어 본문을 자연스러운 한국어로 번역하세요.

번역 요구사항:
- 자연스럽고 매끄러운 한국어
- 원문의 의미를 정확히 전달
- 문학적이고 읽기 쉬운 문체

번역만 반환하세요 (다른 텍스트 없이):

${passage}`;

    const response = await callOpenAIAPI({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that provides natural Korean translations.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });

    if (!response.ok) {
      throw new Error(`번역 API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  };

  // Work_09 (어법 변형 문제) 문제 생성 함수 - work09Service 사용
  // generateWork09Quiz는 work09Service.ts의 개선된 함수를 사용

  // Work_10 (다중 어법 오류 문제) 문제 생성 함수
  const generateWork10Quiz = async (inputText: string): Promise<MultiGrammarQuiz> => {
    console.log('🔍 Work_10 문제 생성 시작...');
    
    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
      const prompt = `아래 영어 본문에서 어법(문법) 변형이 가능한 서로 다른 "단어" 8개를 선정하세요.
이 중 3~8개(랜덤)만 어법상 틀리게 변형하고, 나머지는 원형을 유지하세요.

아래 JSON 형식으로만 응답하세요:
{
  "originalWords": ["...", ...], // 8개 원본 단어
  "transformedWords": ["...", ...], // 8개 변형(틀린/정상) 단어
  "wrongIndexes": [0,1,2,5,6,7], // 틀린 단어의 인덱스(0~7), 개수는 3~8개
  "translation": "..." // 본문 번역
}
본문:
${inputText}`;

      const response = await callOpenAIAPI({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      console.log('AI 응답 전체:', data);
      console.log('AI 응답 내용:', content);
      
      // 마크다운 코드 블록 제거
      let resultJson = content;
      if (content.includes('```Json') || content.includes('```json')) {
        resultJson = content.replace(/```(?:Json|json)?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
      }
      
      console.log('정리된 JSON:', resultJson);
      
      let result;
      try {
        result = JSON.parse(resultJson);
      } catch (error) {
        throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
      }

      if (!result.originalWords || !result.transformedWords || !Array.isArray(result.wrongIndexes) || !result.translation) {
        throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
      }

      // 옵션, 정답 계산
      const wrongCount = result.wrongIndexes.length;
      const options = [3, 4, 5, 6, 7, 8];
      const answerIndex = options.indexOf(wrongCount);

      // 본문에 번호/밑줄 적용
      const numberedPassage = applyNumberAndUnderlineWork10(inputText, result.originalWords, result.transformedWords, result.wrongIndexes);

      const quizData: MultiGrammarQuiz = {
        passage: numberedPassage,
        options,
        answerIndex,
        translation: result.translation,
        originalWords: result.originalWords,
        transformedWords: result.transformedWords,
        wrongIndexes: result.wrongIndexes
      };

      console.log('✅ Work_10 문제 생성 완료:', quizData);
      return quizData;
    } catch (error) {
      throw new Error(`Work_10 문제 생성에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  // Work_10용 본문 내 8개 단어에 번호/진하게를 정확히 한 번씩 적용하는 함수
  const applyNumberAndUnderlineWork10 = (
    passage: string,
    originalWords: string[],
    transformedWords: string[],
    wrongIndexes: number[]
  ): string => {
    let result = passage;
    const used: boolean[] = Array(originalWords.length).fill(false);
    const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
    
    // 역순으로 처리하여 인덱스 충돌 방지
    for (let i = originalWords.length - 1; i >= 0; i--) {
      if (used[i]) continue;
      const originalWord = originalWords[i];
      const displayWord = wrongIndexes.includes(i) ? transformedWords[i] : originalWord;
      const circleNumber = circleNumbers[i];
      const numbered = `<strong>${circleNumber} ${displayWord}</strong>`;
      
      // 첫 번째 등장만 치환
      const regex = new RegExp(`\\b${originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const match = regex.exec(result);
      if (match) {
        const before = result.substring(0, match.index);
        const after = result.substring(match.index + match[0].length);
        result = before + numbered + after;
        used[i] = true;
      }
    }
    
    return result;
  };

  // Work_11 (문장별 해석 문제) 문제 생성 함수
  const generateWork11Quiz = async (inputText: string): Promise<SentenceTranslationQuiz> => {
    console.log('🔍 Work_11 문제 생성 시작...');
    
    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
      
      // 영어 텍스트를 문장 단위로 분리 (약어 보호)
      let processedText = inputText;
      
      // 일반적인 약어들을 임시로 보호 (마침표를 특수 문자로 치환)
      const abbreviations = [
        'e.g.', 'i.e.', 'etc.', 'vs.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.',
        'U.S.', 'U.K.', 'U.S.A.', 'Ph.D.', 'B.A.', 'M.A.', 'Inc.', 'Corp.',
        'Ltd.', 'Co.', 'St.', 'Ave.', 'Blvd.', 'Rd.', 'Jr.', 'Sr.',
        'A.D.', 'B.C.', 'C.E.', 'B.C.E.'
      ];
      
      // 약어의 마침표를 임시로 치환
      abbreviations.forEach(abbr => {
        const protectedAbbr = abbr.replace(/\./g, '___DOT___');
        processedText = processedText.replace(new RegExp(abbr.replace(/\./g, '\\.'), 'g'), protectedAbbr);
      });
      
      // 문장 분리 (마침표, 느낌표, 물음표로 분리)
      const sentences = processedText
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      // 약어 복원
      const finalSentences = sentences.map(sentence => {
        let restored = sentence;
        abbreviations.forEach(abbr => {
          const protectedAbbr = abbr.replace(/\./g, '___DOT___');
          restored = restored.replace(new RegExp(protectedAbbr.replace(/___DOT___/g, '\\.'), 'g'), abbr);
        });
        return restored;
      });
      
      console.log(`📝 ${finalSentences.length}개 문장 분리 완료`);
      
      // 각 문장을 번역
      const translations: string[] = [];
      for (let i = 0; i < finalSentences.length; i++) {
        const sentence = finalSentences[i];
        if (sentence.trim().length === 0) {
          translations.push('');
          continue;
        }
        
        try {
          const response = await callOpenAIAPI({
        model: 'gpt-4o',
        messages: [
                {
                  role: 'system',
                content: '당신은 영어-한국어 번역 전문가입니다. 주어진 영어 문장을 자연스러운 한국어로 번역해주세요.'
                },
                {
                  role: 'user',
                content: `다음 영어 문장을 한국어로 번역해주세요:\n\n${sentence}`
                }
              ],
        max_tokens: 500,
              temperature: 0.3
      });
          
          if (!response.ok) {
            throw new Error(`번역 API 오류: ${response.status}`);
          }
          
          const data = await response.json();
          const translation = data.choices[0].message.content.trim();
          translations.push(translation);
          console.log(`📝 문장 ${i + 1} 번역 완료:`, translation.substring(0, 30) + '...');
        } catch (error) {
          console.error(`문장 ${i + 1} 번역 실패:`, error);
          translations.push(`[번역 실패: ${sentence}]`);
        }
      }
      
      // 퀴즈 텍스트 생성
      let quizText = '본문 문장별 해석\n\n';
      finalSentences.forEach((sentence, index) => {
        if (sentence.trim().length > 0) {
          quizText += `${index + 1}. ${sentence}\n`;
          quizText += `   해석: _________________________________________________\n\n`;
        }
      });
      
      const quizData: SentenceTranslationQuiz = {
        sentences: finalSentences,
        translations: translations,
        quizText: quizText
      };

      console.log('✅ Work_11 문제 생성 완료:', quizData);
      return quizData;
    } catch (error) {
      throw new Error(`Work_11 문제 생성에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  // AI 기반 주제 문장 선정 함수 (Work_06에서 가져옴)
  const selectAndRemoveTopicSentence = async (sentences: string[]): Promise<{
    missingSentence: string;
    topicSentenceIndex: number;
  }> => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    const passage = sentences.join(' ');
    
    const prompt = `아래 영어 본문에서 가장 중요한 주제 문장 1개를 찾아서 제거해주세요.

**작업 요구사항:**
1. 본문에서 가장 중요한 주제 문장(핵심 문장) 1개를 찾아주세요.
2. 제거된 주제 문장이 원래 있던 위치(0부터 시작하는 인덱스)를 알려주세요.

**응답 형식:**
{
  "missingSentence": "제거된 주제 문장",
  "topicSentenceIndex": 2
}

**중요:** 
- 제거된 주제 문장은 반드시 원본 본문에 있던 문장이어야 합니다.
- topicSentenceIndex는 제거된 문장이 원래 있던 위치입니다.

본문:
${passage}`;

    const response = await callOpenAIAPI({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
      });

    const data = await response.json();
    const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    
    const result = JSON.parse(jsonMatch[0]);
    
    // 검증
    if (!result.missingSentence || typeof result.topicSentenceIndex !== 'number') {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }
    
    // 제거된 문장이 원본에 실제로 존재하는지 확인 및 정확한 인덱스 찾기
    const trimmedMissingSentence = result.missingSentence.trim();
    let actualTopicSentenceIndex = -1;
    
    // 정확한 매칭을 위해 모든 문장과 비교
    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].trim() === trimmedMissingSentence) {
        actualTopicSentenceIndex = i;
        break;
      }
    }
    
    // 정확한 매칭이 없는 경우 유사한 문장 찾기
    if (actualTopicSentenceIndex === -1) {
      for (let i = 0; i < sentences.length; i++) {
        // 75% 이상 일치하는 문장 찾기
        const similarity = calculateStringSimilarity(sentences[i].trim(), trimmedMissingSentence);
        if (similarity > 0.75) {
          actualTopicSentenceIndex = i;
          result.missingSentence = sentences[i].trim(); // 원본 문장으로 교체
          break;
        }
      }
    }
    
    if (actualTopicSentenceIndex === -1) {
      throw new Error('제거된 주제 문장이 원본 본문에 존재하지 않습니다.');
    }
    
    // 실제 찾은 인덱스로 교체
    result.topicSentenceIndex = actualTopicSentenceIndex;
    
    return result;
  };

  // 문자열 유사도 계산 함수 (Work_06에서 가져옴)
  const calculateStringSimilarity = (str1: string, str2: string): number => {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);
    
    return commonWords.length / totalWords;
  };

  // 주제 문장 선정 함수 (로컬 휴리스틱 방식 - 백업용)
  const selectTopicSentenceLocally = (sentences: string[]): {
    missingSentence: string;
    topicSentenceIndex: number;
  } => {
    // 더 정교한 휴리스틱: 여러 기준으로 주제 문장 선정
    
    // 1. 첫 번째 문장이 짧으면 (20자 이하) 두 번째 문장 선택
    if (sentences[0].length <= 20 && sentences.length > 1) {
      const topicSentenceIndex = 1;
      const missingSentence = sentences[topicSentenceIndex];
      
      console.log('짧은 첫 문장으로 인해 두 번째 문장 선택:', missingSentence);
      return { missingSentence, topicSentenceIndex };
    }
    
    // 2. 첫 번째 문장이 "Here are", "This is", "There are" 등으로 시작하면 주제 문장으로 적합
    const firstSentence = sentences[0].toLowerCase();
    if (firstSentence.startsWith('here are') || 
        firstSentence.startsWith('this is') || 
        firstSentence.startsWith('there are') ||
        firstSentence.startsWith('the following') ||
        firstSentence.includes('facts about') ||
        firstSentence.includes('information about')) {
      
      const topicSentenceIndex = 0;
      const missingSentence = sentences[topicSentenceIndex];
      
      console.log('주제 문장 패턴으로 첫 번째 문장 선택:', missingSentence);
      return { missingSentence, topicSentenceIndex };
    }
    
    // 3. 기본값: 첫 번째 문장 선택
    const topicSentenceIndex = 0;
    const missingSentence = sentences[topicSentenceIndex];
    
    console.log('기본값으로 첫 번째 문장 선택:', missingSentence);
    return { missingSentence, topicSentenceIndex };
  };

  // 번호 부여 함수 (Work_06에서 가져옴)
  const assignNumbersSimple = (sentences: string[], originalTopicIndex: number): {
    numberedPassage: string;
    answerIndex: number;
  } => {
    const circleNumbers = ['①', '②', '③', '④', '⑤'];
    const totalSentences = sentences.length;
    
    console.log('번호 부여 시작:', { totalSentences, originalTopicIndex });
    
    if (totalSentences <= 5) {
      // 5개 이하: 모든 문장에 번호 부여
      let numberedPassage = '';
      for (let i = 0; i < totalSentences; i++) {
        numberedPassage += circleNumbers[i] + ' ' + sentences[i].trim();
        if (i < totalSentences - 1) {
          numberedPassage += ' ';
        }
      }
      const answerIndex = Math.min(originalTopicIndex, totalSentences - 1);
      
      console.log('5개 이하 처리 완료:', { answerIndex });
      return { numberedPassage: numberedPassage.trim(), answerIndex };
    }
    
    // 5개 초과: 균등하게 분산하여 5개 위치 선택
    const selectedIndices = selectDistributedPositions(totalSentences, originalTopicIndex);
    
    console.log('선택된 위치들:', selectedIndices);
    
    // 본문 구성
    let numberedPassage = '';
    let currentNumberIndex = 0;
    
    for (let i = 0; i < totalSentences; i++) {
      if (selectedIndices.includes(i)) {
        // 번호 부여
        numberedPassage += circleNumbers[currentNumberIndex] + ' ' + sentences[i].trim();
        currentNumberIndex++;
      } else {
        // 번호 없이
        numberedPassage += sentences[i].trim();
      }
      
      // 공백 추가
      if (i < totalSentences - 1) {
        numberedPassage += ' ';
      }
    }
    
    // 정답 위치 계산
    const answerIndex = selectedIndices.indexOf(originalTopicIndex);
    
    // 최종 검증
    const usedNumbers = numberedPassage.match(/[①②③④⑤]/g) || [];
    const uniqueNumbers = Array.from(new Set(usedNumbers));
    
    console.log('번호 부여 검증:', {
      usedNumbers,
      uniqueNumbers,
      count: usedNumbers.length,
      answerIndex,
      selectedIndices
    });
    
    if (usedNumbers.length !== 5 || uniqueNumbers.length !== 5) {
      console.error('원문자 중복 또는 개수 오류!', {
        usedNumbers,
        uniqueNumbers,
        count: usedNumbers.length
      });
      throw new Error('원문자 번호 부여에 오류가 발생했습니다.');
    }
    
    return { numberedPassage: numberedPassage.trim(), answerIndex };
  };

  // 균등하게 분산된 위치 선택 함수 (Work_06에서 가져옴)
  const selectDistributedPositions = (totalSentences: number, topicIndex: number): number[] => {
    const positions: number[] = [];
    
    // 1단계: 주제 문장 위치를 우선 포함
    positions.push(topicIndex);
    
    // 2단계: 전체 문장을 5등분하여 균등하게 분산
    const step = Math.floor(totalSentences / 5);
    const additionalPositions: number[] = [];
    
    // step 간격으로 위치 선택 (주제 문장 위치 제외)
    for (let i = 0; i < totalSentences; i += step) {
      if (i !== topicIndex && additionalPositions.length < 4) {
        additionalPositions.push(i);
      }
    }
    
    // 3단계: 4개가 안 되면 순차적으로 채우기
    for (let i = 0; i < totalSentences && additionalPositions.length < 4; i++) {
      if (!positions.includes(i) && !additionalPositions.includes(i)) {
        additionalPositions.push(i);
      }
    }
    
    // 4단계: 모든 위치 합치고 정렬
    const allPositions = [...positions, ...additionalPositions];
    const finalPositions = Array.from(new Set(allPositions))
      .sort((a, b) => a - b)
      .slice(0, 5); // 정확히 5개로 제한
    
    console.log('위치 선택 과정:', {
      totalSentences,
      topicIndex,
      step,
      additionalPositions,
      finalPositions
    });
    
    return finalPositions;
  };

  // Work_03 (빈칸 단어 문제) 문제 생성 함수
  const generateWork03Quiz = async (inputText: string): Promise<BlankQuiz> => {
    console.log('🔍 Work_03 문제 생성 시작...');
    console.log('📝 입력 텍스트 길이:', inputText.length);

    try {
      const excludedWords: string[] = []; // 제외할 단어들 (필요시 추가)
      
      const prompt = `아래 영어 본문에서 글의 주제와 가장 밀접한, 의미 있는 단어(명사, 키워드 등) 1개를 선정해.

1. 반드시 본문에 실제로 등장한 단어(철자, 형태, 대소문자까지 동일)를 정답으로 선정해야 해. 변형, 대체, 동의어, 어형 변화 없이 본문에 있던 그대로 사용해야 해.

2. 문제의 본문(빈칸 포함)은 반드시 사용자가 입력한 전체 본문과 완전히 동일해야 하며, 일부 문장만 추출하거나, 문장 순서를 바꾸거나, 본문을 요약/변형해서는 안 돼. 오직 정답 단어만 ()로 치환해.

3. 입력된 본문에 이미 ()로 묶인 단어나 구가 있다면, 그 부분은 절대 빈칸 처리 대상으로 삼지 마세요. 반드시 괄호 밖에 있는 단어만 빈칸 후보로 선정하세요.

4. 아래 단어/구는 절대 빈칸 처리하지 마세요: ${excludedWords.length > 0 ? excludedWords.join(', ') : '없음'}

5. 정답(핵심단어) + 오답(비슷한 품사의 단어 4개, 의미는 다름) 총 5개를 생성해.

6. 정답의 위치는 1~5번 중 랜덤.

7. JSON 형식으로 응답하세요:

{
  "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "answerIndex": 0
}

입력된 영어 본문:
${inputText}`;

      const response = await callOpenAIAPI({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.7
      });

      const data = await response.json();
      console.log('AI 응답 전체:', data);
      console.log('AI 응답 내용:', data.choices[0].message.content);
      
      const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
      
      console.log('추출된 JSON:', jsonMatch[0]);
      
      let result: any;
      try {
        result = JSON.parse(jsonMatch[0]);
        console.log('파싱된 결과:', result);
      } catch {
        throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
      }

      // 정답 단어가 본문에 실제로 존재하는지 검증
      if (!inputText.includes(result.options[result.answerIndex])) {
        throw new Error('정답 단어가 본문에 존재하지 않습니다. AI 응답 오류입니다.');
      }

      // blankedText를 프론트엔드에서 직접 생성 (괄호 split 방식, 괄호 안/밖 완벽 구분)
      const replaceFirstOutsideBrackets = (text: string, word: string): string => {
        let replaced = false;
        // 괄호로 split (괄호 안/밖 구분)
        const tokens = text.split(/([()])/);
        let inBracket = false;
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i] === '(') {
            inBracket = true;
            continue;
          }
          if (tokens[i] === ')') {
            inBracket = false;
            continue;
          }
          if (!inBracket && !replaced) {
            // 괄호 밖에서만 단어 치환 (단어 경계 체크)
            const regex = new RegExp(`\\b${word}\\b`);
            if (regex.test(tokens[i])) {
              tokens[i] = tokens[i].replace(regex, '(__________)');
              replaced = true;
            }
          }
        }
        // split으로 괄호가 사라지므로, 다시 조립
        let result = '';
        inBracket = false;
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i] === '(') {
            inBracket = true;
            result += '(';
            continue;
          }
          if (tokens[i] === ')') {
            inBracket = false;
            result += ')';
            continue;
          }
          result += tokens[i];
        }
        return result;
      };

      const blankedText = replaceFirstOutsideBrackets(inputText, result.options[result.answerIndex]);
      console.log('빈칸 처리된 텍스트:', blankedText);

      // 번역 생성
      const translation = await translateToKorean(inputText);

      const blankQuiz: BlankQuiz = {
        blankedText: blankedText,
        options: result.options,
        answerIndex: result.answerIndex,
        translation: translation
      };

      console.log('✅ Work_03 퀴즈 생성 완료:', blankQuiz);
      return blankQuiz;

    } catch (error) {
      console.error('❌ Work_03 문제 생성 실패:', error);
      throw error;
    }
  };

  // 개별 유형 생성 함수 (병렬 처리용)
  const generateSingleWorkTypeQuiz = async (workType: any, inputText: string): Promise<PackageQuizItem | null> => {
    try {
      console.log(`🔄 ${workType.name} (유형#${workType.id}) 생성 시작...`);
      
      let quizData: any;
      let translatedText = '';

      switch (workType.id) {
        case '01': // 문장 순서 맞추기
          quizData = await generateWork01Quiz(inputText, useAI);
          translatedText = quizData.translation;
          break;
          
        case '02': // 독해 문제
          quizData = await generateWork02Quiz(inputText);
          translatedText = quizData.translation;
          break;
          
        case '03': // 빈칸 단어 문제
          quizData = await generateWork03Quiz(inputText);
          translatedText = quizData.translation;
          break;
          
        case '04': // 빈칸 구 문제
          quizData = await generateWork04Quiz(inputText);
          translatedText = quizData.translation;
          break;
          
        case '05': // 빈칸 문장 문제
          quizData = await generateWork05Quiz(inputText);
          translatedText = quizData.translation;
          break;
          
        case '06': // 문장 위치 찾기 문제
          quizData = await generateWork06Quiz(inputText);
          translatedText = quizData.translation;
          break;
          
        case '07': // 주제 추론 문제
          quizData = await generateWork07Quiz(inputText);
          translatedText = quizData.translation;
          break;
          
        case '08': // 제목 추론 문제
          quizData = await generateWork08Quiz(inputText);
          translatedText = quizData.translation;
          break;
          
        case '09': // 어법 변형 문제
          quizData = await generateWork09Quiz(inputText);
          translatedText = quizData.translation;
          break;
          
        case '10': // 다중 어법 오류 문제
          quizData = await generateWork10Quiz(inputText);
          translatedText = quizData.translation;
          break;
          
        case '11': // 문장별 해석 문제
          quizData = await generateWork11Quiz(inputText);
          translatedText = quizData.translations.join(' ');
          break;
          
        case '13': // 빈칸 채우기 문제 (단어-주관식)
          quizData = await generateWork13Quiz(inputText);
          translatedText = quizData.translation;
          break;
          
        case '14': // 빈칸 채우기 문제 (문장-주관식)
          quizData = await generateWork14Quiz(inputText);
          translatedText = quizData.translation;
          break;
          
        default:
          console.log(`❌ 알 수 없는 유형: ${workType.id}`);
          return null;
      }

      console.log(`✅ ${workType.name} (유형#${workType.id}) 생성 완료`);
      
      // PackageQuizItem 형태로 반환
      const result: PackageQuizItem = {
        workType: workType.name,
        workTypeId: workType.id,
        translatedText: translatedText,
        ...(workType.id === '01' ? { quiz: quizData } : 
            workType.id === '02' ? { work02Data: quizData } :
            workType.id === '03' ? { work03Data: quizData } :
            workType.id === '04' ? { work04Data: quizData } :
            workType.id === '05' ? { work05Data: quizData } :
            workType.id === '06' ? { work06Data: quizData } :
            workType.id === '07' ? { work07Data: quizData } :
            workType.id === '08' ? { work08Data: quizData } :
            workType.id === '09' ? { work09Data: quizData } :
            workType.id === '10' ? { work10Data: quizData } :
            workType.id === '11' ? { work11Data: quizData } :
            workType.id === '13' ? { work13Data: quizData } :
            workType.id === '14' ? { work14Data: quizData } : {})
      };

      return result;
    } catch (error) {
      console.error(`❌ ${workType.name} (유형#${workType.id}) 생성 실패:`, error);
      return null; // 실패한 경우 null 반환
    }
  };

  // 패키지 퀴즈 생성 함수 (병렬 처리)
  const generatePackageQuiz = async (inputText: string) => {
    console.log('📦 패키지 퀴즈 생성 시작 (병렬 처리)...');
    console.log('📝 입력 텍스트:', inputText.substring(0, 100) + '...');
    
    const selectedTypes = WORK_TYPES.filter(type => selectedWorkTypes[type.id]);
    
    // 진행 상황 초기화
    setProgressInfo({
      completed: 0,
      total: selectedTypes.length,
      currentType: '병렬 처리 중...',
      currentTypeId: ''
    });
    
    // 병렬로 모든 유형 생성 (실시간 진행 상황 업데이트)
    const quizPromises = selectedTypes.map(async (workType, index) => {
      const result = await generateSingleWorkTypeQuiz(workType, inputText);
      
      // 각 유형이 완료될 때마다 진행 상황 업데이트
      setProgressInfo(prev => ({
        ...prev,
        completed: prev.completed + 1,
        currentType: result ? `${workType.name} 완료` : `${workType.name} 실패`,
        currentTypeId: workType.id
      }));
      
      return result;
    });
    
    // 모든 Promise가 완료될 때까지 대기
    const results = await Promise.all(quizPromises);
    
    // 성공한 결과만 필터링
    const generatedQuizzes = results.filter(quiz => quiz !== null) as PackageQuizItem[];
    
    // 완료 상태 업데이트
    setProgressInfo(prev => ({
      ...prev,
      completed: generatedQuizzes.length,
      currentType: '완료',
      currentTypeId: ''
    }));
    
    console.log(`📦 패키지 퀴즈 생성 완료: ${generatedQuizzes.length}/${selectedTypes.length} 유형 성공`);
    
    return generatedQuizzes;
  };

  // 포인트 차감 및 문제 생성
  const handleGenerateQuiz = async () => {
    console.log('로그인 상태 확인:', { userData, uid: userData?.uid, loading });
    
    // 로딩 중이면 대기
    if (loading) {
      alert('로그인 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    
    // 로그인 상태 확인 (더 안전한 방법)
    if (!userData || !userData.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 입력 텍스트 확인
    if (!inputText.trim()) {
      alert('영어 본문을 입력해주세요.');
      return;
    }

    // 선택된 유형 확인
    const selectedTypes = WORK_TYPES.filter(type => selectedWorkTypes[type.id]);
    if (selectedTypes.length === 0) {
      alert('생성할 문제 유형을 선택해주세요.');
      return;
    }

    // 선택된 유형들의 총 포인트 계산
    const totalPoints = calculateTotalPoints();
    
    // 각 유형별 포인트 로깅
    selectedTypes.forEach(type => {
      const firebaseId = UI_TO_FIREBASE_ID_MAP[type.id];
      const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId)?.points || 0;
      console.log(`유형#${type.id} (${type.name}): ${workTypePoint}P`);
    });
    
    console.log(`선택된 유형들: ${selectedTypes.map(t => `#${t.id}`).join(', ')}`);
    console.log(`총 차감 포인트: ${totalPoints}P`);

    if (userCurrentPoints < totalPoints) {
      alert(`포인트가 부족합니다. 현재 ${userCurrentPoints.toLocaleString()}P, 필요 ${totalPoints.toLocaleString()}P`);
      return;
    }

    // 포인트 차감 모달 표시
    setPointsToDeduct(totalPoints);
    setShowPointModal(true);
  };

  // 포인트 차감 확인 후 실제 문제 생성 실행
  const handlePointDeductionConfirm = () => {
    setShowPointModal(false);
    executeQuizGeneration();
  };

  // 포인트 환불 처리 함수
  const handlePointRefund = async (deductedPoints: number, reason: string) => {
    if (deductedPoints > 0 && userData?.uid) {
      try {
        const selectedTypes = WORK_TYPES.filter(type => selectedWorkTypes[type.id]);
        await refundUserPoints(
          userData.uid,
          deductedPoints,
          `패키지 퀴즈 생성 (${selectedTypes.length}개 유형)`,
          userData.name || '사용자',
          userData.nickname || '사용자',
          reason
        );
        
        // 사용자 포인트 다시 조회
        const currentPoints = await getUserCurrentPoints(userData.uid);
        setUserCurrentPoints(currentPoints);
        
        console.log('💰 포인트 환불 완료:', deductedPoints);
        return true;
      } catch (refundError) {
        console.error('❌ 포인트 환불 실패:', refundError);
        return false;
      }
    }
    return true;
  };

  // 실제 문제 생성 실행
  const executeQuizGeneration = async () => {
    if (!userData?.uid) return;

    setIsLoading(true);
    setPackageQuiz(null);
    let deductedPoints = 0;
    let successfulTypes: string[] = [];
    
    try {
      // 선택된 유형들에 대해서만 포인트 차감
      const selectedTypes = WORK_TYPES.filter(type => selectedWorkTypes[type.id]);
      let remainingPoints = userCurrentPoints;
      
      for (const type of selectedTypes) {
        const firebaseId = UI_TO_FIREBASE_ID_MAP[type.id];
        console.log(`🔍 포인트 차감 대상: 유형#${type.id} -> Firebase ID: ${firebaseId}`);
        
        const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId);
        console.log(`🔍 찾은 포인트 설정:`, workTypePoint);
        
        if (workTypePoint) {
          console.log(`💰 포인트 차감: 유형#${type.id} (${type.name}) - ${workTypePoint.points}P`);
          
          const deductionResult = await deductUserPoints(
            userData.uid,
            firebaseId,
            type.name,
            userData.name || '사용자',
            userData.nickname || '사용자'
          );

          console.log(`💰 포인트 차감 결과:`, deductionResult);

          if (!deductionResult.success) {
            throw new Error(deductionResult.error || '포인트 차감에 실패했습니다.');
          }

          deductedPoints += deductionResult.deductedPoints;
          remainingPoints = deductionResult.remainingPoints; // 마지막 차감 결과의 남은 포인트 사용
        } else {
          console.error(`❌ 유형#${type.id}의 포인트 설정을 찾을 수 없습니다.`);
          throw new Error(`유형#${type.id}의 포인트 설정을 찾을 수 없습니다.`);
        }
      }

      setUserCurrentPoints(remainingPoints);

      // 문제 생성 실행
      console.log('📦 패키지 퀴즈 생성 시작...');
      console.log('입력된 텍스트:', inputText);
      console.log('선택된 유형들:', selectedTypes.map(t => t.name));
      
      const generatedQuizzes = await generatePackageQuiz(inputText);
      
      if (generatedQuizzes.length === 0) {
        throw new Error('생성된 문제가 없습니다.');
      }

      // 성공한 유형들 추적
      successfulTypes = generatedQuizzes.map(quiz => quiz.workTypeId);
      
      // 부분적 실패 확인: 일부 유형만 생성된 경우
      const failedTypes = selectedTypes.filter(type => !successfulTypes.includes(type.id));
      
      if (failedTypes.length > 0) {
        console.warn(`⚠️ 일부 유형 생성 실패: ${failedTypes.map(t => t.name).join(', ')}`);
        
        // 실패한 유형들의 포인트만 환불
        let refundAmount = 0;
        for (const failedType of failedTypes) {
          const firebaseId = UI_TO_FIREBASE_ID_MAP[failedType.id];
          const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId);
          if (workTypePoint) {
            refundAmount += workTypePoint.points;
          }
        }
        
        if (refundAmount > 0) {
          await handlePointRefund(
            refundAmount, 
            `일부 유형 생성 실패로 인한 포인트 환불 (${failedTypes.map(t => t.name).join(', ')})`
          );
        }
      }
      
      // 생성된 퀴즈들을 패키지 퀴즈로 설정
      setPackageQuiz(generatedQuizzes);
      
      // Work_01 퀴즈가 있으면 번역 수행
      const work01Quiz = generatedQuizzes.find(item => item.workTypeId === '01');
      if (work01Quiz && work01Quiz.quiz?.originalText) {
        try {
          const translation = await translateToKorean(work01Quiz.quiz?.originalText || '');
            setTranslatedText(translation);
          console.log('✅ 번역 완료');
        } catch (error) {
          console.error('❌ 번역 실패:', error);
          const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
          setTranslatedText(`번역 실패: ${errorMessage}`);
        }
      }
      
      // 화면 전환
      setShowQuizDisplay(true);
      
      console.log('✅ 패키지 퀴즈 생성 완료:', generatedQuizzes);

      // 문제 생성 내역 저장
      if (userData?.uid) {
        try {
          await savePackageQuizHistory(
            userData.uid,
            userData.name || '사용자',
            userData.nickname || '사용자',
            generatedQuizzes,
            inputText,
            workTypePoints,
            UI_TO_FIREBASE_ID_MAP,
            'P01' // 패키지#01 식별자
          );
        } catch (historyError) {
          console.error('📝 내역 저장 실패:', historyError);
        }
      }
      
    } catch (error) {
      console.error('❌ 문제 생성 실패:', error);
      
      // 전체 실패 시 모든 차감된 포인트 환불
      await handlePointRefund(
        deductedPoints, 
        '문제 생성 실패로 인한 포인트 환불'
      );
      
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      alert(`문제 생성 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };



  // 새 문제 만들기 (화면 초기화, 선택 상태는 유지)
  const handleNewProblem = () => {
    setShowQuizDisplay(false);
    setPackageQuiz(null);
    setTranslatedText('');
    setInputText('');
    // 선택 상태는 유지하고 화면만 초기화
    setPrintMode('none');
  };

  // 선택 상태 완전 초기화 (모든 유형 해제)
  const handleResetSelections = () => {
    const allWorkTypesFalse = WORK_TYPES.reduce((acc, type) => {
      acc[type.id] = false;
      return acc;
    }, {} as Record<string, boolean>);
    setSelectedWorkTypes(allWorkTypesFalse);
  };

  // 본문에서 교체된 단어에 밑줄 표시 - Work_02와 동일한 함수
  const renderTextWithUnderlines = (text: string, replacements: WordReplacement[], isOriginal: boolean = true) => {
    if (!replacements || replacements.length === 0) return text;
    
    // 문장 분리 (원본 본문과 동일한 방식)
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    let resultElements: (string | JSX.Element)[] = [];
    let elementIndex = 0;
    let currentPosition = 0;
    
    // 각 문장별로 처리
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const replacement = replacements[i];
      
      if (!replacement) {
        // 교체 정보가 없는 문장은 그대로 추가
        resultElements.push(sentence);
        currentPosition += sentence.length;
        continue;
      }
      
      // 현재 문장의 시작 위치 찾기
      const sentenceStart = text.indexOf(sentence, currentPosition);
      if (sentenceStart === -1) {
        resultElements.push(sentence);
        currentPosition += sentence.length;
        continue;
      }
      
      const sentenceEnd = sentenceStart + sentence.length;
      
      // 현재 문장 내에서만 선택된 단어 찾기
      const wordToHighlight = isOriginal ? replacement.original : replacement.replacement;
      const escapedWord = wordToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      
      let sentenceElements: (string | JSX.Element)[] = [];
      let lastIndex = 0;
      let match;
      
      // 문장 내에서 해당 단어 찾기
      while ((match = regex.exec(sentence)) !== null) {
        // 이전 위치부터 현재 단어 시작까지의 텍스트
        if (match.index > lastIndex) {
          sentenceElements.push(sentence.slice(lastIndex, match.index));
        }
        
        // 밑줄 표시된 단어
        sentenceElements.push(
          <span key={elementIndex++} style={{textDecoration: 'underline', fontWeight: 'bold', color: '#2d5aa0'}}>
            {match[0]}
          </span>
        );
        
        lastIndex = match.index + match[0].length;
      }
      
      // 마지막 부분
      if (lastIndex < sentence.length) {
        sentenceElements.push(sentence.slice(lastIndex));
      }
      
      // 문장 요소들을 결과에 추가
      resultElements.push(...sentenceElements);
      currentPosition = sentenceEnd;
    }
    
    return resultElements.length > 0 ? resultElements : text;
  };

  // 인쇄(문제) 함수 - 패키지#02 전용: 모든 유형이 연결된 하나의 인쇄물
  const handlePrintProblem = async () => {
    console.log('🖨️ 인쇄(문제) 시작 - printMode:', 'no-answer');
    console.log('📦 packageQuiz:', packageQuiz);
    
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
        .print-container {
          display: block !important;
        }
        .no-print {
          display: none !important;
        }
        .a4-page-template {
          --print-margin-horizontal: 0.8cm;
        }
      }
    `;
    document.head.appendChild(style);
    
    setPrintMode('no-answer');
    setTimeout(async () => {
      console.log('🖨️ 인쇄 실행 - printMode:', 'no-answer');
      
      // 파일 생성 및 Firebase Storage 업로드
      try {
        const { updateQuizHistoryFile } = await import('../../../services/quizHistoryService');
        
        const element = document.getElementById('print-root');
        if (element) {
          const result = await generateAndUploadFile(
            element as HTMLElement,
            userData?.uid || '',
            `package01_problem_${Date.now()}`,
            '패키지#01_문제',
            { isAnswerMode: false, orientation: 'portrait', fileFormat }
          );
          
          // 패키지 내역에 파일 URL 저장 (가장 최근 패키지 내역 찾기)
          if (userData?.uid) {
            const { getQuizHistory } = await import('../../../services/quizHistoryService');
            const history = await getQuizHistory(userData.uid, { limit: 10 });
            const packageHistory = history.find(h => h.workTypeId === 'P01');
            
            if (packageHistory) {
              await updateQuizHistoryFile(packageHistory.id, result.url, result.fileName, 'problem');
               const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
              console.log(`📁 패키지#01 문제 ${formatName} 저장 완료:`, result.fileName);
            }
          }
        }
      } catch (error) {
        console.error(`❌ 파일 저장 실패 (${fileFormat}):`, error);
      }
      
      // PDF인 경우에만 브라우저 인쇄, DOC/HWP는 이미 다운로드됨
       if (fileFormat === 'pdf') {
         window.print();
      }
      setTimeout(() => {
        const printStyle = document.getElementById('print-style');
        if (printStyle) {
          printStyle.remove();
        }
        setPrintMode('none');
        console.log('🖨️ 인쇄 완료 - printMode:', 'none');
      }, 1000);
    }, 100);
  };

  // 인쇄(정답) 함수 - 패키지#02 전용: 모든 유형이 연결된 하나의 인쇄물
  const handlePrintAnswer = async () => {
    console.log('🖨️ 인쇄(정답) 시작 - printMode:', 'with-answer');
    console.log('📦 packageQuiz:', packageQuiz);
    
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
        .print-container {
          display: block !important;
        }
        .no-print {
          display: none !important;
        }
        .a4-page-template {
          --print-margin-horizontal: 0.8cm;
        }
      }
    `;
    document.head.appendChild(style);
    
    setPrintMode('with-answer');
    setTimeout(async () => {
      console.log('🖨️ 인쇄 실행 - printMode:', 'with-answer');
      
      // 파일 생성 및 Firebase Storage 업로드
      try {
        const { updateQuizHistoryFile } = await import('../../../services/quizHistoryService');
        
        const element = document.getElementById('print-root');
        if (element) {
          const result = await generateAndUploadFile(
            element as HTMLElement,
            userData?.uid || '',
            `package01_answer_${Date.now()}`,
            '패키지#01_정답',
            { isAnswerMode: true, orientation: 'portrait', fileFormat }
          );
          
          // 패키지 내역에 파일 URL 저장 (가장 최근 패키지 내역 찾기)
          if (userData?.uid) {
            const { getQuizHistory } = await import('../../../services/quizHistoryService');
            const history = await getQuizHistory(userData.uid, { limit: 10 });
            const packageHistory = history.find(h => h.workTypeId === 'P01');
            
            if (packageHistory) {
              await updateQuizHistoryFile(packageHistory.id, result.url, result.fileName, 'answer');
               const formatName = fileFormat === 'pdf' ? 'PDF' : 'DOC';
              console.log(`📁 패키지#01 정답 ${formatName} 저장 완료:`, result.fileName);
            }
          }
        }
      } catch (error) {
        console.error(`❌ 파일 저장 실패 (${fileFormat}):`, error);
      }
      
      // PDF인 경우에만 브라우저 인쇄, DOC/HWP는 이미 다운로드됨
       if (fileFormat === 'pdf') {
         window.print();
      }
      setTimeout(() => {
        const printStyle = document.getElementById('print-style');
        if (printStyle) {
          printStyle.remove();
        }
        setPrintMode('none');
        console.log('🖨️ 인쇄 완료 - printMode:', 'none');
      }, 1000);
    }, 100);
  };

  // 로딩 중이거나 사용자 데이터가 없을 때
  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!userData) {
    return <div className="error">로그인이 필요합니다.</div>;
  }

  // 퀴즈 표시 화면 - 플로우차트 요구사항: 모든 선택된 유형을 한 화면에 동시 표시
  if (showQuizDisplay && packageQuiz && packageQuiz.length > 0) {
    return (
      <React.Fragment>
        <div className="quiz-display no-print">
          <div className="quiz-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', width: '100%' }}>
              <div style={{ flex: '1' }}>
                <h2 style={{
                  fontFamily: "'Noto Sans KR', 'Segoe UI', 'Apple SD Gothic Neo', Arial, sans-serif",
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: '#000000',
                  margin: '0',
                  letterSpacing: '-1px'
                }}>📦 패키지 퀴즈 #01 (여러 유형 생성)</h2>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleNewProblem}
                style={{
                  width: '120px',
                  height: '48px',
                  padding: '0.75rem 1rem',
                  fontSize: '11pt',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#e2e8f0',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                새문제
              </button>
              
              {/* 파일 형식 선택 */}
              <FileFormatSelector
                value={fileFormat}
                onChange={setFileFormat}
              />
              
               {fileFormat === 'pdf' ? (
                 <>
                   <button
                     type="button"
                     onClick={handlePrintProblem}
                     style={{
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
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '0.5rem'
                     }}
                   >
                     🖨️ 인쇄 (문제)
                   </button>
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
                       boxShadow: '0 4px 6px rgba(240, 147, 251, 0.25)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '0.5rem'
                     }}
                   >
                     🖨️ 인쇄 (정답)
                   </button>
                 </>
               ) : (
                 <>
                   <button
                     type="button"
                     onClick={handlePrintProblem}
                     style={{
                       width: '130px',
                       height: '48px',
                       padding: '0.75rem 1rem',
                       fontSize: '11pt',
                       fontWeight: '600',
                       border: 'none',
                       borderRadius: '8px',
                       background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
                       color: 'white',
                       cursor: 'pointer',
                       boxShadow: '0 4px 6px rgba(14, 165, 233, 0.25)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '0.5rem'
                     }}
                   >
                     💾 저장 (문제)
                   </button>
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
                       boxShadow: '0 4px 6px rgba(16, 185, 129, 0.25)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '0.5rem'
                     }}
                   >
                     💾 저장 (정답)
                   </button>
                 </>
               )}
              </div>
            </div>
          </div>

          {/* 생성된 모든 유형의 문제들을 순서대로 표시 */}
          {packageQuiz.map((quizItem, index) => {
            // Work_01 (문장 순서 맞추기) 표시
            if (quizItem.workTypeId === '01' && quizItem.quiz) {
              return (
                <div key={`work-01-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div className="work-header">
                    <h3 style={{
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: '#000',
                      margin: '0 0 1rem 0',
                      padding: '0'
                    }}>#01. 문장 순서 맞추기</h3>
                  </div>
                  
                  {/* 문제 지시문 */}
                  <div className="problem-instruction work-01-problem-instruction" style={{
                    fontWeight: '800',
                    fontSize: '1.18rem',
                    background: '#222',
                    color: '#fff',
                    padding: '0.7rem 1.2rem',
                    borderRadius: '8px',
                    marginBottom: '1.2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <span>문제: 다음 단락들을 원래 순서대로 배열한 것을 고르세요</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#01</span>
                  </div>

                  {/* 섞인 단락들 */}
                  <div className="problem-passage">
                    {quizItem.quiz.shuffledParagraphs.map((paragraph, pIndex) => (
                      <div key={paragraph.id} className="shuffled-paragraph">
                        <strong>{paragraph.label}:</strong> {paragraph.content}
                      </div>
                    ))}
                  </div>

                  {/* 선택지 */}
                  <div className="problem-options">
                    {quizItem.quiz.choices.map((choice, cIndex) => (
                      <div key={cIndex} className="option">
                        {['①', '②', '③', '④'][cIndex]} {choice.join(' → ')}
                      </div>
                    ))}
                  </div>

                  {/* 정답 표시 */}
                  <div className="screen-answer-footer" style={{
                    color: '#1976d2', 
                    fontWeight: 700, 
                    fontSize: '1.1rem', 
                    textAlign: 'center', 
                    marginTop: '2rem', 
                    padding: '0.8rem', 
                    backgroundColor: '#f0f7ff', 
                    borderRadius: '8px', 
                    border: '2px solid #1976d2'
                  }}>
                    <span>{['①', '②', '③', '④'][quizItem.quiz.answerIndex || 0]} {quizItem.quiz.choices[quizItem.quiz.answerIndex || 0].join(' → ')}</span> <span>(정답)</span>
                  </div>
                </div>
              );
            }

            // Work_02 (독해 문제) 표시
            if (quizItem.workTypeId === '02' && quizItem.work02Data) {
              return (
                <div key={`work-02-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div className="work-header">
                    <h3 style={{
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: '#000',
                      margin: '0 0 1rem 0',
                      padding: '0'
                    }}>#02. 독해 문제</h3>
                  </div>

                  {/* 문제 제목 */}
                  <div className="problem-instruction work-02-problem-instruction" style={{fontWeight: '800', fontSize: '1.18rem', background: '#222', color: '#fff', padding: '0.7rem 1.2rem', borderRadius: '8px', marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                    <span>문제: 다음 본문을 읽고 해석하세요</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#02</span>
                  </div>

                  {/* 원본 본문 보기 */}
                  <h4>원본 본문:</h4>
                  <div className="text-content no-print" style={{padding: '1.2rem', marginBottom: '1.5rem', border: '1.5px solid #e3e6f0', borderRadius: '8px'}}>
                    {renderTextWithUnderlines(quizItem.work02Data.originalText || '', quizItem.work02Data.replacements || [], true)}
                  </div>

                  {/* 변경된 본문 (문제) */}
                  <h4>다음 본문을 읽고 해석하세요.</h4>
                  <div className="text-content no-print" style={{background: '#fff3cd', padding: '1.2rem', borderRadius: '8px', border: '1.5px solid #ffeaa7', marginBottom: '1.5rem'}}>
                    {renderTextWithUnderlines(quizItem.work02Data.modifiedText || '', quizItem.work02Data.replacements || [], false)}
                  </div>
                      
                  {/* 교체된 단어 목록 (하나의 4열 테이블) */}
                  <h4>교체된 단어들:</h4>
                  {quizItem.work02Data?.replacements && quizItem.work02Data.replacements.length > 0 ? (
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
                        {Array.from({ length: Math.ceil((quizItem.work02Data?.replacements.length || 0) / 2) }, (_, rowIndex) => (
                          <tr key={rowIndex}>
                            <td>
                              {quizItem.work02Data?.replacements[rowIndex * 2] && (
                                <>
                                  <span className="original-word">{quizItem.work02Data.replacements[rowIndex * 2].original}</span>
                                  <span className="original-meaning">({quizItem.work02Data.replacements[rowIndex * 2].originalMeaning})</span>
                                </>
                              )}
                            </td>
                            <td>
                              {quizItem.work02Data?.replacements[rowIndex * 2] && (
                                <>
                                  <span className="replacement-word">{quizItem.work02Data.replacements[rowIndex * 2].replacement}</span>
                                  <span className="replacement-meaning">({quizItem.work02Data.replacements[rowIndex * 2].replacementMeaning})</span>
                                </>
                              )}
                            </td>
                            <td>
                              {quizItem.work02Data?.replacements[rowIndex * 2 + 1] && (
                                <>
                                  <span className="original-word">{quizItem.work02Data.replacements[rowIndex * 2 + 1].original}</span>
                                  <span className="original-meaning">({quizItem.work02Data.replacements[rowIndex * 2 + 1].originalMeaning})</span>
                                </>
                              )}
                            </td>
                            <td>
                              {quizItem.work02Data?.replacements[rowIndex * 2 + 1] && (
                                <>
                                  <span className="replacement-word">{quizItem.work02Data.replacements[rowIndex * 2 + 1].replacement}</span>
                                  <span className="replacement-meaning">({quizItem.work02Data.replacements[rowIndex * 2 + 1].replacementMeaning})</span>
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
                    <h4>본문 해석:</h4>
                    <div className="translation-content" style={{background: '#f1f8e9', padding: '1.2rem', borderRadius: '8px', border: '1.5px solid #c8e6c9'}}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                </div>
              );
            }

            // Work_03 (빈칸 단어 문제) 표시
            if (quizItem.workTypeId === '03' && quizItem.work03Data) {
              return (
                <div key={`work-03-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div className="work-header">
                    <h3 style={{
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: '#000',
                      margin: '0 0 1rem 0',
                      padding: '0'
                    }}>#03. 빈칸(단어) 문제</h3>
                  </div>
                  
                  {/* 문제 지시문 */}
                  <div className="problem-instruction work-03-problem-instruction" style={{
                    fontWeight: '800',
                    fontSize: '1.18rem',
                    background: '#222',
                    color: '#fff',
                    padding: '0.7rem 1.2rem',
                    borderRadius: '8px',
                    marginBottom: '1.2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <span>다음 빈칸에 들어갈 가장 적절한 단어를 고르세요.</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#03</span>
                  </div>

                  {/* 문제 본문 */}
                  <div className="problem-passage work-03-problem-passage" style={{
                    background: '#f7f8fc',
                    border: '1.5px solid #e3e6f0',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    marginBottom: '1rem',
                    fontSize: '1.08rem',
                    lineHeight: '1.7',
                    fontFamily: 'inherit'
                  }}>
                    {quizItem.work03Data.blankedText}
                  </div>

                  {/* 선택지 */}
                  <div className="problem-options work-03-problem-options" style={{
                    background: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {quizItem.work03Data.options.map((option, optionIndex) => (
                      <label key={optionIndex} className="option" style={{
                        display: 'block',
                        background: '#fff',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        padding: '0.8rem 1rem',
                        margin: '0.5rem 0',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '1rem',
                        fontFamily: 'inherit'
                      }}>
                        <input
                          type="radio"
                          name={`work-03-${index}`}
                          value={optionIndex}
                          style={{ marginRight: '0.5rem' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>

                  {/* 정답 표시 (정답 모드일 때만) */}
                  {printMode === 'with-answer' && (
                    <div className="problem-answer work-03-problem-answer" style={{
                      background: '#e8f5e8',
                      border: '2px solid #4caf50',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      color: '#1976d2',
                      fontWeight: '700',
                      fontSize: '1.1rem'
                    }}>
                      정답: {quizItem.work03Data.options[quizItem.work03Data.answerIndex]}
                    </div>
                  )}

                  {/* 번역 */}
                  <div className="translation-section no-print">
                    <h4>본문 해석:</h4>
                    <div className="translation-content" style={{background: '#f1f8e9', padding: '1.2rem', borderRadius: '8px', border: '1.5px solid #c8e6c9'}}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                </div>
              );
            }

            // Work_04 (빈칸 구 문제) 표시
            if (quizItem.workTypeId === '04' && quizItem.work04Data) {
              return (
                <div key={`work-04-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {/* 문제 유형 제목 */}
                  <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: '#000',
                    margin: '0 0 1rem 0',
                    padding: '0'
                  }}>
                    #04. 빈칸(구) 문제
                  </h3>

                  {/* 문제 제목 */}
                  <div className="problem-instruction work-04-problem-instruction" style={{
                    fontWeight: '800',
                    fontSize: '1.18rem',
                    background: '#222',
                    color: '#fff',
                    padding: '0.7rem 1.2rem',
                    borderRadius: '8px',
                    marginBottom: '1.2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <span>문제: 다음 빈칸에 들어갈 구(phrase)로 가장 적절한 것을 고르시오.</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#04</span>
                  </div>

                  {/* 문제 본문 */}
                  <div className="problem-passage work-04-problem-passage" style={{
                    background: '#f7f8fc',
                    border: '1.5px solid #e3e6f0',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    marginBottom: '1rem',
                    fontSize: '1.08rem',
                    lineHeight: '1.7',
                    fontFamily: 'inherit'
                  }}>
                    {quizItem.work04Data.blankedText}
                  </div>

                  {/* 선택지 */}
                  <div className="problem-options work-04-problem-options" style={{
                    background: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {quizItem.work04Data.options.map((option, optionIndex) => (
                      <label key={optionIndex} className="option" style={{
                        display: 'block',
                        background: '#fff',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        padding: '0.8rem 1rem',
                        margin: '0.5rem 0',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}>
                        <input
                          type="radio"
                          name={`work04-${index}`}
                          value={optionIndex}
                          style={{ marginRight: '0.8rem' }}
                        />
                        {['①', '②', '③', '④', '⑤'][optionIndex]} {option}
                      </label>
                    ))}
                  </div>

                  {/* 정답 표시 */}
                  {printMode === 'with-answer' && (
                    <div className="answer-section" style={{
                      background: '#e8f5e8',
                      border: '2px solid #4caf50',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      color: '#1976d2',
                      fontWeight: '700',
                      fontSize: '1.1rem'
                    }}>
                      정답: {quizItem.work04Data.options[quizItem.work04Data.answerIndex]}
                    </div>
                  )}

                  {/* 번역 */}
                  <div className="translation-section no-print">
                    <h4>본문 해석:</h4>
                    <div className="translation-content" style={{background: '#f1f8e9', padding: '1.2rem', borderRadius: '8px', border: '1.5px solid #c8e6c9'}}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                </div>
              );
            }

            if (quizItem.workTypeId === '05' && quizItem.work05Data) {
              return (
                <div key={`work-05-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {/* 문제 유형 제목 */}
                  <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: '#000',
                    margin: '0 0 1rem 0',
                    padding: '0'
                  }}>
                    #05. 빈칸(문장) 문제
                  </h3>

                  {/* 문제 제목 */}
                  <div className="problem-instruction work-05-problem-instruction" style={{
                    fontWeight: '800',
                    fontSize: '1.18rem',
                    background: '#222',
                    color: '#fff',
                    padding: '0.7rem 1.2rem',
                    borderRadius: '8px',
                    marginBottom: '1.2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <span>문제: 다음 빈칸에 들어갈 가장 적절한 문장을 고르세요.</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#05</span>
                  </div>

                  {/* 문제 본문 */}
                  <div className="problem-passage work-05-problem-passage" style={{
                    background: '#f7f8fc',
                    border: '1.5px solid #e3e6f0',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    marginBottom: '1.5rem',
                    fontSize: '1.1rem',
                    lineHeight: '1.7',
                    fontFamily: 'inherit'
                  }}>
                    {quizItem.work05Data.blankedText}
                  </div>

                  {/* 선택지 */}
                  <div className="problem-options work-05-problem-options" style={{
                    background: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {quizItem.work05Data.options.map((option, optionIndex) => (
                      <label key={optionIndex} className="option" style={{
                        display: 'block',
                        background: '#fff',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        padding: '0.8rem 1rem',
                        marginBottom: '0.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '1rem',
                        lineHeight: '1.5'
                      }}>
                        <input
                          type="radio"
                          name={`work-05-${index}`}
                          value={optionIndex}
                          style={{ marginRight: '0.5rem' }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>

                  {/* 정답 표시 */}
                  {printMode === 'with-answer' && (
                    <div className="answer-section" style={{
                      background: '#e8f5e8',
                      border: '2px solid #4caf50',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      color: '#1976d2',
                      fontWeight: '700',
                      fontSize: '1.1rem'
                    }}>
                      정답: {quizItem.work05Data.options[quizItem.work05Data.answerIndex]}
                    </div>
                  )}

                  {/* 번역 */}
                  <div className="translation-section no-print">
                    <h4>본문 해석:</h4>
                    <div className="translation-content" style={{background: '#f1f8e9', padding: '1.2rem', borderRadius: '8px', border: '1.5px solid #c8e6c9'}}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                </div>
              );
            }

            // Work_06 (문장 위치 찾기) 표시
            if (quizItem.workTypeId === '06' && quizItem.work06Data) {
              return (
                <div key={`work-06-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {/* 문제 유형 제목 */}
                  <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: '#000',
                    margin: '0 0 1rem 0',
                    padding: '0'
                  }}>
                    #06. 문장 위치 찾기 문제
                  </h3>

                  {/* 문제 제목 */}
                  <div className="work-06-title" style={{
                    fontWeight: 800,
                    fontSize: '1rem !important',
                    background: '#222',
                    color: '#fff',
                    padding: '0.7rem 0.5rem',
                    borderRadius: '8px',
                    marginBottom: '1.2rem',
                    display: 'block',
                    width: '100%'
                  }}>
                    문제: 아래 본문에서 빠진 주제 문장을 가장 적절한 위치에 넣으시오.
                  </div>

                  {/* 빠진 문장 표시 */}
                  <div className="work-06-missing-sentence" style={{
                    border: '2px solid #222',
                    borderRadius: '6px',
                    background: '#f7f8fc',
                    padding: '0.8em 1.2em',
                    marginTop: '1rem',
                    marginBottom: '1rem',
                    fontWeight: 700,
                    fontSize: '1rem !important'
                  }}>
                    <span style={{color: '#222'}}>주요 문장:</span> <span style={{color: '#6a5acd'}}>{quizItem.work06Data.missingSentence}</span>
                  </div>

                  {/* 번호가 매겨진 본문 */}
                  <div className="work-06-passage" style={{
                    fontSize: '1rem !important',
                    lineHeight: 1.7,
                    margin: '0.3rem 0 0 0',
                    background: '#FFF3CD',
                    borderRadius: '8px',
                    padding: '1rem',
                    fontFamily: 'inherit',
                    color: '#222',
                    whiteSpace: 'pre-line',
                    border: '1.5px solid #e3e6f0'
                  }}>
                    {quizItem.work06Data.numberedPassage}
                  </div>

                  {/* 정답 표시 */}
                  {printMode === 'with-answer' && (
                    <div className="work-06-answer" style={{
                      marginTop: '0',
                      marginBottom: '0',
                      color: '#1976d2',
                      fontWeight: '700',
                      fontSize: '1rem !important'
                    }}>
                      정답: {`①②③④⑤`[quizItem.work06Data.answerIndex] || quizItem.work06Data.answerIndex + 1}
                    </div>
                  )}

                  {/* 번역 */}
                  <div className="translation-section no-print">
                    <h4>본문 해석:</h4>
                    <div className="work-06-translation" style={{background: '#f1f8e9', padding: '1.2rem', borderRadius: '8px', border: '1.5px solid #c8e6c9'}}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                </div>
              );
            }

            if (quizItem.workTypeId === '07' && quizItem.work07Data) {
              return (
                <div key={`work-07-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {/* 문제 유형 제목 */}
                  <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: '#000',
                    margin: '0 0 1rem 0',
                    padding: '0'
                  }}>
                    #07. 주제 추론 문제
                  </h3>

                  {/* 문제 제목 */}
                  <div className="work-07-title" style={{
                    fontWeight: '800',
                    fontSize: '1.18rem',
                    background: '#222',
                    color: '#fff',
                    padding: '0.7rem 1.2rem',
                    borderRadius: '8px',
                    marginBottom: '1.2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <span>문제: 다음 본문의 주제를 가장 잘 나타내는 문장을 고르세요.</span>
                    <span style={{fontSize:'0.9rem', fontWeight:'700', color:'#FFD700'}}>유형#07</span>
                  </div>

                  {/* 본문 */}
                  <div className="work-07-passage" style={{
                    background: '#FFF3CD',
                    border: '1.5px solid #e3e6f0',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    marginBottom: '1.5rem',
                    fontSize: '1.1rem',
                    lineHeight: '1.7',
                    fontFamily: 'inherit'
                  }}>
                    {quizItem.work07Data.passage}
                  </div>

                  {/* 선택지 */}
                  <div className="problem-options work-07-problem-options" style={{
                    background: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {quizItem.work07Data.options.map((option, optionIndex) => (
                      <label key={optionIndex} className="option" style={{
                        display: 'block',
                        background: '#fff',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        padding: '0.8rem 1rem',
                        marginBottom: '0.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '1rem',
                        lineHeight: '1.5'
                      }}>
                        <div style={{display: 'flex', alignItems: 'flex-start'}}>
                          <input
                            type="radio"
                            name={`work-07-${index}`}
                            value={optionIndex}
                            style={{ marginRight: '0.5rem', marginTop: '0.1rem' }}
                          />
                          <div>
                            <div style={{fontWeight: '500'}}>
                              {String.fromCharCode(65 + optionIndex)}. {option}
                            </div>
                            {quizItem.work07Data?.optionTranslations && quizItem.work07Data?.optionTranslations[optionIndex] && (
                              <div style={{fontSize:'0.85rem', color:'#666', marginTop:'0.3rem'}}>
                                {quizItem.work07Data?.optionTranslations[optionIndex]}
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* 정답 표시 */}
                  {printMode === 'with-answer' && (
                    <div className="work-07-answer" style={{
                      background: '#e8f5e8',
                      border: '2px solid #4caf50',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      color: '#1976d2',
                      fontWeight: '700',
                      fontSize: '1.1rem'
                    }}>
                      정답: {quizItem.work07Data.options[quizItem.work07Data.answerIndex]}
                    </div>
                  )}

                  {/* 번역 */}
                  <div className="translation-section no-print">
                    <h4>본문 해석:</h4>
                    <div className="work-07-translation" style={{background: '#f1f8e9', padding: '1.2rem', borderRadius: '8px', border: '1.5px solid #c8e6c9'}}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                </div>
              );
            }

            // Work_08 제목 추론 문제
            if (quizItem.workTypeId === '08' && quizItem.work08Data) {
              return (
                <div key={`work-08-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {/* 문제 유형 제목 */}
                  <div className="work-08-title" style={{
                    marginBottom: '0.8rem',
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: '#000'
                  }}>
                    #08. 제목 추론 문제
                  </div>

                  {/* 문제 지시사항 */}
                  <div className="work-08-missing-sentence" style={{
                    background: '#000',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '0.8rem 1.2rem',
                    marginBottom: '0.8rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>문제: 다음 본문에 가장 적합한 제목을 고르세요.</span>
                    <span style={{fontSize: '0.9rem', color: '#FFD700'}}>유형#08</span>
                  </div>

                  {/* 본문 */}
                  <div className="work-08-passage" style={{
                    background: '#FFF3CD',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    marginBottom: '1.5rem',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: '#212529'
                  }}>
                    {quizItem.work08Data.passage}
                  </div>

                  {/* 선택지 */}
                  <div className="work-08-options" style={{marginBottom: '1.5rem'}}>
                    {quizItem.work08Data.options.map((option, optionIndex) => (
                      <div key={optionIndex} style={{
                        padding: '0.8rem',
                        marginBottom: '0.5rem',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        backgroundColor: '#fff',
                        fontSize: '1rem',
                        lineHeight: '1.5'
                      }}>
                        {`①②③④⑤`[optionIndex] || `${optionIndex+1}.`} {option}
                      </div>
                    ))}
                  </div>

                  {/* 정답 (with-answer 모드에서만 표시) */}
                  {printMode === 'with-answer' && (
                    <div className="work-08-answer" style={{
                      background: '#e8f5e8',
                      border: '2px solid #4caf50',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      color: '#1976d2',
                      fontWeight: '700',
                      fontSize: '1.1rem'
                    }}>
                      정답: {`①②③④⑤`[quizItem.work08Data.answerIndex] || `${quizItem.work08Data.answerIndex+1}.`} {quizItem.work08Data.options[quizItem.work08Data.answerIndex]}
                    </div>
                  )}

                  {/* 번역 */}
                  <div className="translation-section no-print">
                    <h4>본문 해석:</h4>
                    <div className="work-08-translation" style={{background: '#f1f8e9', padding: '1.2rem', borderRadius: '8px', border: '1.5px solid #c8e6c9'}}>
                      {quizItem.translatedText}
                    </div>
                  </div>
                </div>
              );
            }

            // Work_10 다중 어법 오류 문제
            if (quizItem.workTypeId === '10' && quizItem.work10Data) {
              const convertMarkdownUnderlineToU = (text: string): string => {
                return text.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
              };

              return (
                <div key={`work-10-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {/* 문제 유형 제목 */}
                  <div className="work-10-header" style={{
                    marginBottom: '0.8rem',
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: '#000'
                  }}>
                    #10. 다중 어법 오류 문제
                  </div>

                  {/* 문제 지시사항 */}
                  <div className="work-10-title" style={{
                    background: '#000',
                    color: '#fff',
                    padding: '0.7rem 1.2rem',
                    borderRadius: '8px',
                    marginBottom: '0.6rem',
                    fontSize: '1.13rem',
                    fontWeight: '800',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것의 개수는?</span>
                    <span style={{fontSize: '0.9rem', fontWeight: '700', color: '#FFD700'}}>유형#10</span>
                  </div>

                  {/* 본문 */}
                  <div className="work-10-passage" style={{
                    fontSize: '1.08rem',
                    lineHeight: 1.7,
                    margin: '1.2rem 0',
                    background: '#FFF3CD',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    fontFamily: 'inherit'
                  }}>
                    <span dangerouslySetInnerHTML={{__html: (quizItem.work10Data.passage || '').replace(/\n/g, '<br/>')}} />
                  </div>

                  {/* 객관식 옵션 */}
                  <div className="work-10-options" style={{
                    margin: '1.5rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem'
                  }}>
                    {quizItem.work10Data.options.map((option, optionIndex) => (
                      <div key={optionIndex} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.8rem 1rem',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '1.05rem'
                      }}>
                        <span style={{
                          marginRight: '1rem',
                          fontWeight: '700',
                          color: '#333'
                        }}>
                          {optionIndex + 1}.
                        </span>
                        <span style={{fontWeight: '600'}}>{option}개</span>
                      </div>
                    ))}
                  </div>

                  {/* 정답 표시 */}
                  <div className="work-10-answer" style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#e8f5e8',
                    borderRadius: '8px',
                    border: '2px solid #4caf50'
                  }}>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      color: '#1976d2',
                      marginBottom: '0.5rem'
                    }}>
                      정답: {quizItem.work10Data.options[quizItem.work10Data.answerIndex]}개
                    </div>
                    <div style={{
                      fontSize: '0.95rem',
                      color: '#666',
                      lineHeight: 1.5
                    }}>
                      어법상 틀린 단어: {quizItem.work10Data?.wrongIndexes.map(index => 
                        `${'①②③④⑤⑥⑦⑧'[index]}${quizItem.work10Data?.transformedWords[index]} → ${quizItem.work10Data?.originalWords[index]}`
                      ).join(', ')}
                    </div>
                  </div>

                  {/* 번역 */}
                  <div className="work-10-translation" style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1976d2',
                      marginBottom: '0.5rem'
                    }}>
                      본문 해석
                    </div>
                    <div style={{
                      fontSize: '0.95rem',
                      lineHeight: 1.6,
                      color: '#333'
                    }}>
                      {quizItem.work10Data.translation}
                    </div>
                  </div>
                </div>
              );
            }

            // Work_11 문장별 해석 문제
            if (quizItem.workTypeId === '11' && quizItem.work11Data) {
              return (
                <div key={`work-11-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {/* 문제 유형 제목 */}
                  <div className="work-11-header" style={{
                    marginBottom: '0.8rem',
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: '#000'
                  }}>
                    #11. 본문 문장별 해석 문제
                  </div>

                  {/* 문제 지시사항 */}
                  <div className="work-11-title" style={{
                    background: '#000',
                    color: '#fff',
                    padding: '0.7rem 1.2rem',
                    borderRadius: '8px',
                    marginBottom: '0.6rem',
                    fontSize: '1.13rem',
                    fontWeight: '800',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <span>다음 본문의 각 문장을 한국어로 해석하세요.</span>
                    <span style={{fontSize: '0.9rem', fontWeight: '700', color: '#FFD700'}}>유형#11</span>
                  </div>

                  {/* 문장별 해석 문제 */}
                  <div className="work-11-content" style={{
                    margin: '1.2rem 0'
                  }}>
                    {quizItem.work11Data?.sentences.map((sentence, sentenceIndex) => (
                      <div key={sentenceIndex} className="sentence-item" style={{
                        background: '#FFF3CD',
                        borderRadius: '8px',
                        padding: '0.3rem 1.2rem',
                        border: '1.5px solid #e3e6f0',
                        marginBottom: '1rem',
                        fontFamily: 'inherit',
                        transition: 'border-color 0.2s',
                        boxShadow: '0 1px 4px rgba(44,62,80,0.04)'
                      }}>
                        <div className="sentence-header" style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '0.5rem',
                          marginBottom: '0.5rem'
                        }}>
                          <span className="sentence-number" style={{
                            fontWeight: '700',
                            color: '#6a5acd',
                            fontSize: '1.08rem',
                            flexShrink: 0,
                            verticalAlign: 'baseline',
                            lineHeight: 1
                          }}>{sentenceIndex + 1}.</span>
                          <span className="sentence-content" style={{
                            fontSize: '1.05rem',
                            lineHeight: '1.2',
                            color: '#232946',
                            fontFamily: 'Noto Sans KR, Segoe UI, Apple SD Gothic Neo, Arial, sans-serif',
                            flex: 1,
                            verticalAlign: 'baseline'
                          }}>{sentence}</span>
                        </div>
                        <div className="translation-container" style={{
                          marginBottom: '0.3rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span className="translation-label" style={{
                            fontWeight: '600',
                            color: '#4a5568',
                            fontFamily: 'Noto Sans KR, Segoe UI, Apple SD Gothic Neo, Arial, sans-serif',
                            whiteSpace: 'nowrap'
                          }}>해석:</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 정답 표시 */}
                  <div className="work-11-answer" style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#e8f5e8',
                    borderRadius: '8px',
                    border: '2px solid #4caf50'
                  }}>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '700',
                      color: '#1976d2',
                      marginBottom: '1rem'
                    }}>
                      정답
                    </div>
                    {quizItem.work11Data?.sentences.map((sentence, sentenceIndex) => (
                      <div key={sentenceIndex} style={{
                        marginBottom: '1rem',
                        padding: '0.8rem',
                        backgroundColor: '#F1F8E9',
                        borderRadius: '6px',
                        border: '1px solid #c8e6c9'
                      }}>
                        <div style={{
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          color: '#1976d2',
                          marginBottom: '0.3rem'
                        }}>
                          {sentenceIndex + 1}. {sentence}
                        </div>
                        <div style={{
                          fontSize: '0.95rem',
                          color: '#333',
                          lineHeight: 1.5
                        }}>
                          {quizItem.work11Data?.translations[sentenceIndex]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // Work_13 빈칸 채우기 문제 (단어-주관식)
            if (quizItem.workTypeId === '13' && quizItem.work13Data) {
              return (
                <div key={`work-13-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {/* 문제 유형 제목 */}
                  <div className="work-13-header" style={{
                    marginBottom: '0.8rem',
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: '#000',
                    textAlign: 'left'
                  }}>
                    #13. 빈칸 채우기 문제 (단어-주관식)
                  </div>

                  {/* 문제 지시사항 */}
                  <div className="work-13-title" style={{
                    background: '#222',
                    color: '#fff',
                    padding: '0.7rem 1.2rem',
                    borderRadius: '8px',
                    marginBottom: '1.2rem',
                    fontSize: '1.13rem',
                    fontWeight: '800',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>다음 빈칸에 들어갈 단어를 직접 입력하시오.</span>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: '#FFD700'
                    }}>
                      유형#13
                    </span>
                  </div>

                  {/* 빈칸 본문 */}
                  <div style={{
                    fontSize: '1.08rem',
                    lineHeight: 1.7,
                    margin: '1.2rem 0',
                    background: '#FFF3CD',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    fontFamily: 'inherit',
                    border: '2px solid #e3e6f0'
                  }}>
                    {formatBlankedText(
                      quizItem.work13Data.blankedText || '',
                      quizItem.work13Data.correctAnswers || []
                    )}
                  </div>

                  {/* 정답 표시 */}
                  <div style={{
                    marginTop: '1.2rem',
                    color: '#1976d2',
                    fontWeight: 700
                  }}>
                    <span style={{color: '#1976d2'}}>
                      정답: {quizItem.work13Data.correctAnswers?.join(', ') || '정답 없음'}
                    </span>
                  </div>

                  {/* 한국어 번역 */}
                  <div style={{
                    marginTop: '1.2rem',
                    padding: '1rem',
                    backgroundColor: '#F1F8E9',
                    borderRadius: '8px',
                    border: '2px solid #e3e6f0'
                  }}>
                    <div style={{
                      fontWeight: '700',
                      marginBottom: '0.5rem',
                      color: '#000'
                    }}>
                      본문 해석:
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      lineHeight: 1.6,
                      color: '#333'
                    }}>
                      {quizItem.work13Data.translation}
                    </div>
                  </div>
                </div>
              );
            }

            // Work_14 빈칸 채우기 문제 (문장-주관식)
            if (quizItem.workTypeId === '14' && quizItem.work14Data) {
              return (
                <div key={`work-14-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {/* 문제 유형 제목 */}
                  <div className="work-14-header" style={{
                    marginBottom: '0.8rem',
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: '#000'
                  }}>
                    #14. 빈칸 채우기 문제 (문장-주관식)
                  </div>

                  {/* 문제 지시사항 */}
                  <div className="work-14-title" style={{
                    background: '#222',
                    color: '#fff',
                    padding: '0.7rem 1.2rem',
                    borderRadius: '8px',
                    marginBottom: '1.2rem',
                    fontSize: '1.13rem',
                    fontWeight: '800',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>다음 빈칸에 들어갈 문장을 직접 입력하시오.</span>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: '#FFD700'
                    }}>
                      유형#14
                    </span>
                  </div>

                  {/* 빈칸 본문 */}
                  <div style={{
                    fontSize: '1.08rem',
                    lineHeight: 1.7,
                    margin: '1.2rem 0',
                    background: '#FFF3CD',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    fontFamily: 'inherit',
                    border: '2px solid #e3e6f0',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    overflow: 'hidden'
                  }}>
                    {formatBlankedText(
                      quizItem.work14Data.blankedText || '',
                      quizItem.work14Data.correctAnswers || []
                    )}
                  </div>

                  {/* 정답 표시 */}
                  <div style={{
                    marginTop: '1.2rem',
                    color: '#1976d2',
                    fontWeight: 700
                  }}>
                    <div style={{color: '#1976d2', marginBottom: '0.5rem'}}>
                      정답 문장들:
                    </div>
                    {quizItem.work14Data.selectedSentences?.map((sentence, idx) => {
                      const alphabetLabel = String.fromCharCode(65 + idx); // A=65, B=66, C=67...
                      // 정답 문장에서 빈칸 형식 제거
                      let cleanSentence = sentence || '';
                      if (cleanSentence) {
                        // 패턴 1: (____________________A____________________) 형식 (긴 언더스코어, 알파벳 앞뒤)
                        cleanSentence = cleanSentence.replace(/\(_{5,}[A-Z]_{5,}\)/g, '').trim();
                        // 패턴 2: (_+A_+) - 언더스코어 앞뒤 (짧은 경우)
                        cleanSentence = cleanSentence.replace(/\(_+[A-Z]_+\)/g, '').trim();
                        // 패턴 3: ( A _+ ) 또는 ( A_+ )
                        cleanSentence = cleanSentence.replace(/\(\s*[A-Z]\s*_+\s*\)/g, '').trim();
                        cleanSentence = cleanSentence.replace(/\(\s*[A-Z]_+\s*\)/g, '').trim();
                        // 패턴 4: (A_+) - 공백 없는 경우
                        cleanSentence = cleanSentence.replace(/\([A-Z]_+\)/g, '').trim();
                        // 패턴 5: ( _+ ) 일반 빈칸
                        cleanSentence = cleanSentence.replace(/\(_+\)/g, '').trim();
                        // 패턴 6: 공백 포함 모든 패턴
                        cleanSentence = cleanSentence.replace(/\(\s*[A-Z]?\s*_+\s*[A-Z]?\s*\)/g, '').trim();
                        // 패턴 7: 언더스코어가 3개 이상이고 알파벳이 포함된 모든 패턴
                        cleanSentence = cleanSentence.replace(/\([^)]*_{3,}[^)]*[A-Z][^)]*\)/g, '').trim();
                        cleanSentence = cleanSentence.replace(/\([^)]*[A-Z][^)]*_{3,}[^)]*\)/g, '').trim();
                      }
                      
                      return (
                        <div key={idx} style={{
                          marginBottom: '0.3rem',
                          padding: '0.5rem',
                          backgroundColor: '#E3F2FD',
                          borderRadius: '4px',
                          fontSize: '0.95rem',
                          lineHeight: 1.4
                        }}>
                          {alphabetLabel}. {cleanSentence || sentence}
                        </div>
                      );
                    })}
                  </div>

                  {/* 한국어 번역 */}
                  <div style={{
                    marginTop: '1.2rem',
                    padding: '1rem',
                    backgroundColor: '#F1F8E9',
                    borderRadius: '8px',
                    border: '2px solid #e3e6f0'
                  }}>
                    <div style={{
                      fontWeight: '700',
                      marginBottom: '0.5rem',
                      color: '#000'
                    }}>
                      본문 해석:
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      lineHeight: 1.6,
                      color: '#333'
                    }}>
                      {quizItem.work14Data.translation}
                    </div>
                  </div>
                </div>
              );
            }

            // Work_09 어법 변형 문제
            if (quizItem.workTypeId === '09' && quizItem.work09Data) {
              const convertMarkdownUnderlineToU = (text: string): string => {
                return text.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
              };

              const answerNumber = `①②③④⑤`[quizItem.work09Data.answerIndex] || `${quizItem.work09Data.answerIndex + 1}`;

              return (
                <div key={`work-09-${index}`} className="work-section" style={{
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {/* 문제 유형 제목 */}
                  <div className="work-09-header" style={{
                    marginBottom: '0.8rem',
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: '#000'
                  }}>
                    #09. 어법 오류 문제
                  </div>

                  {/* 문제 지시사항 */}
                  <div className="work-09-title" style={{
                    background: '#222',
                    color: '#fff',
                    padding: '0.7rem 1.2rem',
                    borderRadius: '8px',
                    marginBottom: '0.6rem',
                    fontSize: '1.13rem',
                    fontWeight: '800',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <span>다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?</span>
                    <span style={{fontSize: '0.9rem', fontWeight: '700', color: '#FFD700'}}>유형#09</span>
                  </div>

                  {/* 본문 */}
                  <div className="work-09-passage" style={{
                    fontSize: '1.08rem',
                    lineHeight: 1.7,
                    margin: '1.2rem 0',
                    background: '#FFF3CD',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    fontFamily: 'inherit'
                  }}>
                    <span dangerouslySetInnerHTML={{__html: (quizItem.work09Data.passage || '').replace(/\n/g, '<br/>')}} />
                  </div>

                  {/* 선택지 */}
                  <div className="work-09-options" style={{
                    margin: '1.5rem 0',
                    fontSize: '1.08rem'
                  }}>
                    {quizItem.work09Data.options.map((option, optionIndex) => (
                      <div key={optionIndex} style={{
                        margin: '0.5rem 0',
                        padding: '0.8rem',
                        background: '#f8f9fa',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          marginRight: '0.8rem',
                          fontWeight: '700',
                          color: '#495057',
                          minWidth: '2rem'
                        }}>
                          {`①②③④⑤⑥`[optionIndex] || `${optionIndex + 1}.`}
                        </span>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>

                  {/* 정답 표시 */}
                  {printMode === 'with-answer' && (
                    <div className="work-09-answer" style={{
                      background: '#e8f5e8',
                      border: '2px solid #4caf50',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      color: '#1976d2',
                      fontWeight: '700',
                      fontSize: '1.1rem'
                    }}>
                      정답: {answerNumber} {quizItem.work09Data.options[quizItem.work09Data.answerIndex]}
                      <div style={{marginTop: '0.7rem', color: '#1976d2', fontWeight: '400', fontSize: '1rem'}}>
                        정답의 원래(정상) 단어/구: {quizItem.work09Data.original}
                      </div>
                    </div>
                  )}

                  {/* 번역 */}
                  <div className="work-09-translation" style={{
                    background: '#f1f8e9',
                    border: '1.5px solid #c8e6c9',
                    borderRadius: '8px',
                    padding: '1.2rem',
                    marginTop: '1.5rem',
                    fontSize: '1rem',
                    lineHeight: 1.7,
                    color: '#2e7d32'
                  }}>
                    <strong>본문 해석:</strong><br />
                    {quizItem.translatedText}
                  </div>
                </div>
              );
            }

            // TODO: Work_10~11 유형들도 여기에 추가 예정
            return null;
          })}
        </div>

        {/* 인쇄용 문제 - 모든 유형이 연결된 하나의 인쇄물 */}
        {printMode !== 'none' && (() => {
          console.log('🖨️ 인쇄용 렌더링 시작 - printMode:', printMode, 'packageQuiz:', packageQuiz);
          return (
          <div className="print-container">
            {packageQuiz.map((quizItem, index) => {
              // Work_01 인쇄용
              if (quizItem.workTypeId === '01' && quizItem.quiz) {
                return (
                  <PrintFormatPackage01
                    key={`print-work-01-${index}`}
                    quiz={quizItem.quiz}
                    translatedText={quizItem.translatedText || quizItem.quiz.translation || ''}
                    printMode={printMode}
                  />
                );
              }

              // Work_02 인쇄용
              if (quizItem.workTypeId === '02' && quizItem.work02Data) {
                return (
                  <PrintFormatPackage01Work02
                    key={`print-work-02-${index}`}
                    work02Data={quizItem.work02Data}
                    translatedText={quizItem.translatedText}
                    printMode={printMode}
                  />
                );
              }

              // Work_03 인쇄용
              if (quizItem.workTypeId === '03' && quizItem.work03Data) {
                return (
                  <PrintFormatPackage01Work03
                    key={`print-work-03-${index}`}
                    work03Data={quizItem.work03Data}
                    translatedText={quizItem.translatedText}
                    printMode={printMode}
                  />
                );
              }

              // Work_04 인쇄용
              if (quizItem.workTypeId === '04' && quizItem.work04Data) {
                return (
                  <PrintFormatPackage01Work04
                    key={`print-work-04-${index}`}
                    work04Data={quizItem.work04Data}
                    translatedText={quizItem.translatedText}
                    printMode={printMode}
                  />
                );
              }

              // Work_05 인쇄용
              if (quizItem.workTypeId === '05' && quizItem.work05Data) {
                return (
                  <PrintFormatPackage01Work05
                    key={`print-work-05-${index}`}
                    work05Data={quizItem.work05Data}
                    translatedText={quizItem.translatedText}
                    printMode={printMode}
                  />
                );
              }

              // Work_06 인쇄용
              if (quizItem.workTypeId === '06' && quizItem.work06Data) {
                return (
                  <PrintFormatPackage01Work06
                    key={`print-work-06-${index}`}
                    work06Data={quizItem.work06Data}
                    translatedText={quizItem.translatedText}
                    printMode={printMode}
                  />
                );
              }

              // Work_07 인쇄용
              if (quizItem.workTypeId === '07' && quizItem.work07Data) {
                console.log('🖨️ Work_07 인쇄용 렌더링:', {
                  workTypeId: quizItem.workTypeId,
                  hasWork07Data: !!quizItem.work07Data,
                  printMode,
                  work07Data: quizItem.work07Data,
                  translatedText: quizItem.translatedText
                });
                return (
                  <PrintFormatPackage01Work07
                    key={`print-work-07-${index}`}
                    work07Data={quizItem.work07Data}
                    translatedText={quizItem.translatedText}
                    printMode={printMode}
                  />
                );
              }
              
              // Work_07 데이터가 없는 경우 로그
              if (quizItem.workTypeId === '07' && !quizItem.work07Data) {
                console.error('❌ Work_07 데이터가 없습니다:', {
                  workTypeId: quizItem.workTypeId,
                  hasWork07Data: !!quizItem.work07Data,
                  quizItemKeys: Object.keys(quizItem)
                });
              }

              // Work_08 인쇄용
              if (quizItem.workTypeId === '08' && quizItem.work08Data) {
                console.log('🖨️ Work_08 인쇄용 렌더링:', {
                  workTypeId: quizItem.workTypeId,
                  hasWork08Data: !!quizItem.work08Data,
                  printMode,
                  work08Data: quizItem.work08Data,
                  translatedText: quizItem.translatedText
                });
                return (
                  <PrintFormatPackage01Work08
                    key={`print-work-08-${index}`}
                    work08Data={quizItem.work08Data}
                    translatedText={quizItem.translatedText}
                    printMode={printMode}
                  />
                );
              }

              // Work_09 인쇄용
              if (quizItem.workTypeId === '09' && quizItem.work09Data) {
                console.log('🖨️ Work_09 인쇄용 렌더링:', {
                  workTypeId: quizItem.workTypeId,
                  hasWork09Data: !!quizItem.work09Data,
                  printMode,
                  work09Data: quizItem.work09Data,
                  translatedText: quizItem.translatedText
                });
                return (
                  <PrintFormatPackage01Work09
                    key={`print-work-09-${index}`}
                    work09Data={quizItem.work09Data}
                    translatedText={quizItem.translatedText}
                    printMode={printMode}
                  />
                );
              }

              // Work_10 인쇄용
              if (quizItem.workTypeId === '10' && quizItem.work10Data) {
                console.log('🖨️ Work_10 인쇄용 렌더링:', {
                  workTypeId: quizItem.workTypeId,
                  hasWork10Data: !!quizItem.work10Data,
                  printMode,
                  work10Data: quizItem.work10Data,
                  translatedText: quizItem.translatedText
                });
                return (
                  <PrintFormatPackage01Work10
                    key={`print-work-10-${index}`}
                    work10Data={quizItem.work10Data}
                    translatedText={quizItem.translatedText}
                    printMode={printMode}
                  />
                );
              }

              // Work_11 문장별 해석 문제
              if (quizItem.workTypeId === '11' && quizItem.work11Data) {
                return (
                  <PrintFormatPackage01Work11
                    key={`print-work-11-${index}`}
                    work11Data={quizItem.work11Data}
                    printMode={printMode}
                  />
                );
              }

              // Work_13 빈칸 채우기 문제 (단어-주관식)
              if (quizItem.workTypeId === '13' && quizItem.work13Data) {
                return (
                  <PrintFormatPackage01Work13
                    key={`print-work-13-${index}`}
                    work13Data={quizItem.work13Data}
                    printMode={printMode}
                  />
                );
              }

              // Work_14 빈칸 채우기 문제 (문장-주관식)
              if (quizItem.workTypeId === '14' && quizItem.work14Data) {
                return (
                  <PrintFormatPackage01Work14
                    key={`print-work-14-${index}`}
                    work14Data={quizItem.work14Data}
                    printMode={printMode}
                  />
                );
              }

              
              // Work_08 데이터가 없는 경우 로그
              if (quizItem.workTypeId === '08' && !quizItem.work08Data) {
                console.error('❌ Work_08 데이터가 없습니다:', {
                  workTypeId: quizItem.workTypeId,
                  hasWork08Data: !!quizItem.work08Data,
                  quizItemKeys: Object.keys(quizItem)
                });
              }

              return null;
            })}
          </div>
          );
        })()}
      </React.Fragment>
    );
  }

  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>📦 패키지 퀴즈 생성 (유형#01~14 통합)</h2>
        <p>하나의 영어 본문으로 유형#01부터 #11까지 모든 유형의 문제를 한번에 생성합니다.</p>
      </div>
      <div className="input-type-section">
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'capture'}
            onChange={() => handleInputModeChange('capture')}
          />
          📸 캡처화면 붙여넣기
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
          🖼️ 이미지 파일 첨부
        </label>
        <label>
          <input
            type="radio"
            name="inputMode"
            checked={inputMode === 'text'}
            onChange={() => handleInputModeChange('text')}
          />
          ✍️ 영어 본문 직접 붙여넣기
        </label>
      </div>

      {inputMode === 'capture' && (
        <div>
          <div
            className={`input-guide${isPasteFocused ? ' paste-focused' : ''}`}
            tabIndex={0}
            onClick={() => setIsPasteFocused(true)}
            onFocus={() => setIsPasteFocused(true)}
            onBlur={() => setIsPasteFocused(false)}
            onPaste={handlePaste}
          >
            <div className="drop-icon">📋</div>
            <div className="drop-text">Ctrl+V로 캡처한 이미지를 붙여넣으세요</div>
            <div className="drop-desc">스크린샷이나 사진을 클립보드에 복사한 후 여기에 붙여넣기 하세요</div>
            <div style={{fontSize: '0.9rem', color: '#666', marginTop: '0.5rem'}}>
              💡 <b>팁:</b> 화면 캡처 후 Ctrl+V로 붙여넣기
            </div>
            {isLoading && (
              <div style={{color:'#6a5acd', fontWeight:600, marginTop:'0.7rem'}}>
                OpenAI Vision 처리 중...
              </div>
            )}
          </div>
          {/* 캡처 모드에서도 텍스트가 추출되면 글자수 표시 */}
          {inputText && (
            <div className="text-info" style={{marginTop: '0.5rem'}}>
              <span>글자 수: {inputText.length}자</span>
            </div>
          )}
        </div>
      )}
      {inputMode === 'image' && (
        <div>
          <div className="file-upload-row">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              id="fileInput"
              style={{ display: 'none' }}
            />
            <label htmlFor="fileInput" className="file-upload-btn">
              📁 파일 선택
            </label>
            <div className="file-upload-status">
              {imageFile ? imageFile.name : '선택된 파일이 없습니다'}
            </div>
          </div>
          {/* 이미지 모드에서도 텍스트가 추출되면 글자수 표시 */}
          {inputText && (
            <div className="text-info" style={{marginTop: '0.5rem'}}>
              <span>글자 수: {inputText.length}자</span>
            </div>
          )}
        </div>
      )}
      {inputMode === 'text' && (
        <div className="input-section">
          <div className="input-label-row">
            <label htmlFor="textInput" className="input-label">
              영어 본문 직접 붙여넣기: (2,000자 미만 권장)
            </label>
            {inputText.length < 100 && (
              <span className="warning">⚠️ 더 긴 본문을 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
            )}
          </div>
          <textarea
            id="textInput"
            ref={textAreaRef}
            value={inputText}
            onChange={handleTextChange}
            placeholder="영어 본문을 직접 붙여넣어 주세요. 최소 100자 이상 권장합니다."
            className="text-input"
            rows={8}
          />
          <div className="text-info">
            <span>글자 수: {inputText.length}자</span>
          </div>
        </div>
      )}

      <div className="work-types-selection">
        <div className="work-types-header">
          <h3>생성할 문제 유형 선택</h3>
          <button 
            type="button" 
            className="select-all-button"
            onClick={handleSelectAll}
          >
            {Object.values(selectedWorkTypes).every(selected => selected) ? '전체 해제' : '전체 선택'}
          </button>
        </div>
        <div className="work-types-grid">
          {WORK_TYPES.map(type => {
            const firebaseId = UI_TO_FIREBASE_ID_MAP[type.id];
            const workTypePoint = workTypePoints.find(wt => wt.id === firebaseId);
            const points = workTypePoint?.points || 0;
            
            return (
              <label key={type.id} className="work-type-checkbox">
                <input
                  type="checkbox"
                  checked={selectedWorkTypes[type.id] || false}
                  onChange={() => handleWorkTypeToggle(type.id)}
                />
                <div className="checkbox-label">
                  <span className="work-type-id">#{type.id}</span>
                  <span className="work-type-name">{type.name}</span>
                  <span className="work-type-points">({points}P)</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>


        {(isLoading || isExtractingText) && (
          <div className="centered-hourglass-overlay">
            <div className="centered-hourglass-content">
              <div className="centered-hourglass-spinner">⏳</div>
              <div className="loading-text">
                {isExtractingText ? '📄 텍스트 추출 중...' : '📋 패키지 문제 생성 중...'}
              </div>
            
            {/* 진행 상황 표시 */}
            {progressInfo.total > 0 && (
              <div className="progress-info">
                <div className="progress-text">
                  {progressInfo.completed} / {progressInfo.total} 유형 완료
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${(progressInfo.completed / progressInfo.total) * 100}%` 
                    }}
                  ></div>
                </div>
                {progressInfo.currentType && (
                  <div className="current-type">
                    현재 생성 중: {progressInfo.currentType} (유형#{progressInfo.currentTypeId})
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      <button
        type="button"
        className="generate-button"
        onClick={handleGenerateQuiz}
        disabled={isLoading || calculateTotalPoints() === 0}
      >
        {isLoading ? '생성 중...' : '패키지 퀴즈 생성'}
      </button>

      {/* 포인트 차감 확인 모달 */}
      <PointDeductionModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
        onConfirm={handlePointDeductionConfirm}
        workTypeName={`패키지 퀴즈 생성 (${Object.values(selectedWorkTypes).filter(selected => selected).length}개 유형)`}
        pointsToDeduct={pointsToDeduct}
        userCurrentPoints={userCurrentPoints}
        remainingPoints={userCurrentPoints - pointsToDeduct}
      />


      {/* 도움말 모달 */}
      <ScreenshotHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
};

export default Package_01_MultiQuizGenerater;
