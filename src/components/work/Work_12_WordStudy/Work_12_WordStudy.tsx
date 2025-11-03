import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import './Work_12_WordStudy.css';
import ScreenshotHelpModal from '../../modal/ScreenshotHelpModal';
import PointDeductionModal from '../../modal/PointDeductionModal';
import { deductUserPoints, refundUserPoints, getWorkTypePoints, getUserCurrentPoints } from '../../../services/pointService';
import { saveQuizWithPDF, getWorkTypeName } from '../../../utils/quizHistoryHelper';
import { useAuth } from '../../../contexts/AuthContext';
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
import './PrintFormat12.css';

// PrintFormat12의 타입을 사용
type WordItem = WordItemWork12;
type WordQuestion = WordQuestionWork12Type;
type WordQuiz = WordQuizWork12Type;

// 입력 방식 타입
const INPUT_MODES = [
  { key: 'capture', label: '캡처 이미지 붙여넣기' },
  { key: 'image', label: '이미지 파일 업로드' },
  { key: 'text', label: '본문 직접 붙여넣기' }
] as const;
type InputMode = typeof INPUT_MODES[number]['key'];

// PrintFormat12의 타입을 사용
type PrintMode = PrintModeWork12;

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
  const [printMode, setPrintMode] = useState<PrintMode>('none');
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
    setInputText('');
    setImageFile(null);
    setImagePreview(null);
    setQuiz(null);
    setSelectedAnswers({});
    setExtractedWords([]);
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
        const words = await extractWordsFromImage(file);
        setExtractedWords(words);
        // 단어들을 텍스트로 변환하여 textarea에 표시
        const wordsText = words.map(word => `${word.english}: ${word.korean}`).join('\n');
        setInputText(wordsText);
        setTimeout(() => {
          if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
          }
        }, 0);
      } catch (err) {
        alert('단어 추출 중 오류가 발생했습니다.');
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
            const words = await extractWordsFromImage(file);
            setExtractedWords(words);
            // 단어들을 텍스트로 변환하여 textarea에 표시
            const wordsText = words.map(word => `${word.english}: ${word.korean}`).join('\n');
            setInputText(wordsText);
            setTimeout(() => {
              if (textAreaRef.current) {
                textAreaRef.current.style.height = 'auto';
                textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
              }
            }, 0);
          } catch (err) {
            alert('단어 추출 중 오류가 발생했습니다.');
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
    setInputText(e.target.value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  };

  // 이미지에서 영어 단어와 한글 뜻 추출 (OpenAI Vision API)
  async function extractWordsFromImage(imageFile: File): Promise<WordItem[]> {
    const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    const base64 = await fileToBase64(imageFile);
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY as string;
    
    const prompt = `이 이미지는 영어 단어 학습용 워크시트입니다. 이미지에 표시된 모든 영어 단어와 그에 대응하는 한글 뜻을 완전히 추출해주세요.

중요한 지침:
1. 이미지에 있는 모든 영어 단어를 빠짐없이 찾아주세요 (일부만 추출하지 마세요)
2. 각 영어 단어에 대응하는 한글 뜻을 정확히 매칭해주세요
3. 단어 목록이 여러 열이나 행으로 나뉘어 있어도 모두 추출해주세요
4. 번호가 있는 경우 번호는 제외하고 영어 단어와 한글 뜻만 추출해주세요
5. 최소 10개 이상의 단어를 추출해주세요 (가능한 한 많이)

응답 형식 (JSON 배열):
[
  {"english": "asset", "korean": "자산"},
  {"english": "independent", "korean": "독립적인"},
  {"english": "continuity", "korean": "연속성"}
]

주의사항:
- 영어 단어와 한글 뜻만 추출하고, 다른 설명이나 번호는 포함하지 마세요
- 모든 단어를 빠짐없이 추출해주세요
- JSON 형식으로만 응답해주세요`;

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
        max_tokens: 4096
      })
    });
    
    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    try {
      console.log('AI 응답 내용:', content);
      
      // JSON 파싱 시도
      let jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const words = JSON.parse(jsonMatch[0]);
        const filteredWords = words.filter((word: any) => word.english && word.korean);
        console.log('추출된 단어 수:', filteredWords.length);
        return filteredWords;
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
      
      throw new Error('JSON 형식을 찾을 수 없습니다.');
    } catch (error) {
      console.error('단어 추출 파싱 오류:', error);
      console.error('원본 응답:', content);
      throw new Error('단어 추출에 실패했습니다. 이미지를 다시 확인해주세요.');
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
    const lines = text.split('\n').filter(line => line.trim());
    const words: WordItem[] = [];
    const englishOnlyWords: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      let english = '';
      let korean = '';
      
      // 1. "영어: 한글" 또는 "영어：한글" 형식
      let match = trimmedLine.match(/^(.+?)\s*[:：]\s*(.+)$/);
      if (match) {
        english = match[1].trim();
        korean = match[2].trim();
      }
      
      // 2. "영어 - 한글" 형식
      if (!match) {
        match = trimmedLine.match(/^(.+?)\s*-\s*(.+)$/);
        if (match) {
          english = match[1].trim();
          korean = match[2].trim();
        }
      }
      
      // 3. "영어 한글" 형식 (공백으로 구분, 영어가 먼저 오는 경우)
      if (!match) {
        // 영어 단어는 보통 알파벳으로만 구성되고, 한글은 한글 문자로만 구성됨
        const words = trimmedLine.split(/\s+/);
        if (words.length >= 2) {
          const firstWord = words[0].trim();
          const restWords = words.slice(1).join(' ').trim();
          
          // 첫 번째 단어가 영어(알파벳)이고, 나머지가 한글인지 확인
          if (/^[a-zA-Z]+$/.test(firstWord) && /^[가-힣\s]+$/.test(restWords)) {
            english = firstWord;
            korean = restWords;
          }
        }
      }
      
      // 4. 영어 단어만 있는 경우 (한글뜻이 없는 경우)
      if (!match && !english && !korean) {
        // 줄 전체가 영어 단어인지 확인 (알파벳, 공백, 하이픈, 아포스트로피만 포함)
        if (/^[a-zA-Z\s\-']+$/.test(trimmedLine) && !/^[가-힣]/.test(trimmedLine)) {
          // 숙어를 하나의 단위로 처리
          const processedWords = extractIdiomsAndWords(trimmedLine);
          englishOnlyWords.push(...processedWords);
        }
      }
      
      // 유효한 단어 쌍이면 추가
      if (english && korean && english !== korean) {
        words.push({ english, korean });
      }
    }
    
    // 영어 단어만 있는 경우 한글뜻 생성
    if (englishOnlyWords.length > 0) {
      console.log('영어 단어만 발견됨:', englishOnlyWords);
      // 영어 단어만 있는 경우는 별도로 처리 (generateKoreanMeanings 함수에서 처리)
      return { words, englishOnlyWords };
    }
    
    return words;
  }

  // 영어 단어만 있는 경우 한글뜻 생성
  async function generateKoreanMeanings(englishWords: string[]): Promise<WordItem[]> {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    const prompt = `다음 영어 단어들의 한국어 뜻을 정확하게 번역해주세요. 각 단어의 가장 일반적이고 적절한 한국어 뜻을 제공해주세요.

영어 단어 목록:
${englishWords.join(', ')}

응답 형식 (JSON 배열):
[
  {"english": "word1", "korean": "한글뜻1"},
  {"english": "word2", "korean": "한글뜻2"},
  ...
]

주의사항:
- 각 영어 단어에 대해 가장 적절한 한국어 뜻을 제공해주세요
- 복합어나 구문이 아닌 단일 단어의 뜻을 제공해주세요
- JSON 형식으로만 응답해주세요`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 2048
      })
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

  // 단어 퀴즈 생성
  async function generateWordQuiz(words: WordItem[], quizType: 'english-to-korean' | 'korean-to-english'): Promise<WordQuiz> {
    console.log('📝 단어 퀴즈 생성 시작:', { wordsCount: words.length, quizType });
    
    let questions: WordQuestion[];
    
    if (quizType === 'english-to-korean') {
      questions = generateEnglishToKoreanQuiz(words);
    } else {
      questions = generateKoreanToEnglishQuiz(words);
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
      words,
      quizType,
      questions,
      totalQuestions: questions.length
    };
    
    console.log('✅ 단어 퀴즈 생성 완료:', quiz);
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
      if (inputMode === 'text') {
        if (!inputText.trim()) throw new Error('영어 단어 텍스트를 입력해주세요.');
        const parseResult = parseWordsFromText(inputText.trim());
        
        // parseResult가 객체인 경우 (영어 단어만 있는 경우)
        if (typeof parseResult === 'object' && 'englishOnlyWords' in parseResult) {
          const { words: parsedWords, englishOnlyWords } = parseResult as any;
          
          if (parsedWords.length > 0) {
            words = parsedWords;
          } else if (englishOnlyWords.length > 0) {
            // 영어 단어만 있는 경우 한글뜻 생성
            console.log('영어 단어만 발견됨, 한글뜻 생성 중...');
            words = await generateKoreanMeanings(englishOnlyWords);
          } else {
            throw new Error('유효한 단어를 찾을 수 없습니다.');
          }
        } else {
          // parseResult가 배열인 경우 (기존 방식)
          words = parseResult as WordItem[];
        }
      } else if (inputMode === 'image' && imageFile) {
        words = await extractWordsFromImage(imageFile);
      } else if (inputMode === 'capture') {
        // 캡처 이미지에서 추출된 텍스트가 수정되었을 수 있으므로 inputText 사용
        if (!inputText.trim()) throw new Error('영어 본문을 입력해주세요.');
        const parseResult = parseWordsFromText(inputText.trim());
        if (Array.isArray(parseResult)) {
          words = parseResult;
        } else {
          words = parseResult.words;
        }
      } else {
        throw new Error('이미지를 첨부해주세요.');
      }
      
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

  // 인쇄 핸들러 - 브라우저 기본 헤더/푸터 숨기기 - 유형#04와 동일
  const handlePrintNoAnswer = () => {
    // 인쇄 전에 브라우저 기본 헤더/푸터 숨기기 - 유형#04와 동일
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
        .only-print-work12 {
          display: block !important;
        }
        .a4-page-template-work12 {
          display: block !important;
        }
        .print-header-work12 {
          display: flex !important;
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
    // 인쇄 전에 브라우저 기본 헤더/푸터 숨기기 - 유형#04와 동일
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
        .only-print-work12 {
          display: block !important;
        }
        .print-answer-mode-work12 {
          display: block !important;
        }
        .a4-page-template-work12 {
          display: block !important;
        }
        .print-header-work12 {
          display: flex !important;
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
                      <th style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: '15%'}}>No.</th>
                      <th style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: quiz.quizType === 'english-to-korean' ? '42.5%' : '57.5%'}}>{quiz.quizType === 'english-to-korean' ? '영어 단어' : '한글 뜻'}</th>
                      <th style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: quiz.quizType === 'english-to-korean' ? '42.5%' : '27.5%'}}>{quiz.quizType === 'english-to-korean' ? '한글 뜻' : '영어 단어'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quiz.words.slice(0, Math.ceil(quiz.words.length / 2)).map((word, index) => (
                      <tr key={index}>
                        <td style={{border: '1px solid #000000', padding: '0.8rem', textAlign: 'center', fontSize: '1rem', fontWeight: '500', color: '#000000'}}>
                          {index + 1}
                        </td>
                        <td style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '500', color: '#000000'}}>
                          {quiz.quizType === 'english-to-korean' ? word.english : word.korean}
                        </td>
                        <td style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', color: '#000000'}}>
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
                        <th style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: '15%'}}>No.</th>
                        <th style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: quiz.quizType === 'english-to-korean' ? '42.5%' : '57.5%'}}>{quiz.quizType === 'english-to-korean' ? '영어 단어' : '한글 뜻'}</th>
                        <th style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '700', color: '#000000', width: quiz.quizType === 'english-to-korean' ? '42.5%' : '27.5%'}}>{quiz.quizType === 'english-to-korean' ? '한글 뜻' : '영어 단어'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quiz.words.slice(Math.ceil(quiz.words.length / 2)).map((word, index) => (
                        <tr key={index + Math.ceil(quiz.words.length / 2)}>
                          <td style={{border: '1px solid #000000', padding: '0.8rem', textAlign: 'center', fontSize: '1rem', fontWeight: '500', color: '#000000'}}>
                            {index + Math.ceil(quiz.words.length / 2) + 1}
                          </td>
                          <td style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', fontWeight: '500', color: '#000000'}}>
                            {quiz.quizType === 'english-to-korean' ? word.english : word.korean}
                          </td>
                          <td style={{border: '1px solid #000000', padding: '0.8rem', fontSize: '1rem', color: '#000000'}}>
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
        {/* 인쇄용: 문제만 - 유형#04와 동일한 구조 */}
        {printMode === 'no-answer' && quiz && (
          <div className="only-print-work12">
            <div className="a4-page-template-work12">
              <div className="a4-page-header-work12">
                <PrintHeaderWork12 />
              </div>
              <div className="a4-page-content-work12">
                <div className="quiz-content-work12">
                  <ProblemInstructionWork12>
                    {quiz.quizType === 'english-to-korean' ? '다음 영어 단어의 한글 뜻을 고르시오.' : '다음 한글 뜻에 해당하는 영어 단어를 고르시오.'}
                  </ProblemInstructionWork12>
                  
                  <WordQuizContainerWork12>
                    <WordListTableWork12 
                      words={quiz.words} 
                      showAnswers={false}
                      quizType={quiz.quizType}
                    />
                  </WordQuizContainerWork12>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* 인쇄용: 정답포함 - 유형#04와 동일한 구조 */}
        {printMode === 'with-answer' && quiz && (
          <div className="only-print-work12 print-answer-mode-work12">
            <div className="a4-page-template-work12">
              <div className="a4-page-header-work12">
                <PrintHeaderWork12 />
              </div>
              <div className="a4-page-content-work12">
                <div className="quiz-content-work12">
                  <ProblemInstructionWork12>
                    {quiz.quizType === 'english-to-korean' ? '다음 영어 단어의 한글 뜻을 고르시오.' : '다음 한글 뜻에 해당하는 영어 단어를 고르시오.'}
                  </ProblemInstructionWork12>
                  
                  <WordQuizContainerWork12>
                    <WordListTableWork12 
                      words={quiz.words} 
                      showAnswers={true}
                      quizType={quiz.quizType}
                    />
                  </WordQuizContainerWork12>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 입력/옵션/버튼 UI
  return (
    <div className="quiz-generator" onPaste={handlePaste}>
      <div className="generator-header">
        <h2>[유형#12] 영어 단어 학습 문제 생성</h2>
        <p>영어 본문에서 중요한 단어들을 추출하여 단어 학습 문제를 생성합니다.</p>
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
      <div className="quiz-type-section" style={{margin: '1.5rem 0', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef'}}>
        <h3 style={{margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#495057'}}>문제 유형 선택</h3>
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
          <label htmlFor="word-study-text" className="input-label">
            {inputMode === 'text' ? '영어 단어 텍스트 붙여넣기: 50단어 미만 입력 가능' : (
              <>
                추출된 단어 목록: <span style={{color: 'red'}}>(문제 출제는 50개 단어까지 가능합니다.)</span>
              </>
            )}
          </label>
          {inputMode === 'text' && inputText.length < 50 && (
            <span className="warning">⚠️ 더 많은 단어를 입력하면 더 좋은 결과를 얻을 수 있습니다.</span>
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
          {extractedWords.length > 0 && (
            <span style={{marginLeft: '1rem', color: '#1976d2', fontWeight: '600'}}>
              추출된 단어: {extractedWords.length}개
            </span>
          )}
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