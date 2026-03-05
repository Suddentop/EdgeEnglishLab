/**
 * Work_12 (단어 학습) 문제 생성 로직
 * 원본: src/components/work/Work_12_WordStudy/Work_12_WordStudy.tsx
 * 
 * 이 파일은 원본 컴포넌트에서 문제 생성 로직만 추출한 것입니다.
 * 원본 파일은 수정하지 않았으며, 로직을 복사하여 독립적으로 사용합니다.
 */

import { callOpenAI } from './common';

/**
 * 단어 학습 관련 타입 정의
 */
export interface WordItem {
  english: string;
  korean: string;
}

export interface WordQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  correctAnswer: string;
  wordItem: WordItem;
}

export interface WordQuiz {
  words: WordItem[];
  quizType: 'english-to-korean' | 'korean-to-english';
  questions: WordQuestion[];
  totalQuestions: number;
}

/**
 * 유형#12: 단어 학습 문제 생성
 * @param passage - 영어 본문
 * @param quizType - 퀴즈 타입 ('english-to-korean' | 'korean-to-english')
 * @returns 단어 학습 문제 데이터
 */
export async function generateWork12Quiz(passage: string, quizType: 'english-to-korean' | 'korean-to-english' = 'english-to-korean'): Promise<WordQuiz> {
  console.log('🔍 Work_12 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);
  console.log('🎯 퀴즈 타입:', quizType);

  try {
    // 1단계: 영어 단어 추출
    const englishWords = await extractEnglishWords(passage);
    console.log('✅ 추출된 영어 단어:', englishWords);

    // 2단계: 한글뜻 생성
    const words = await generateKoreanMeanings(englishWords);
    console.log('✅ 생성된 단어 목록:', words);

    // 3단계: 단어 퀴즈 생성
    const quiz = await generateWordQuiz(words, quizType);
    console.log('✅ 단어 퀴즈 생성 완료:', quiz);

    return quiz;

  } catch (error) {
    console.error('❌ Work_12 문제 생성 실패:', error);
    throw error;
  }
}

/**
 * 영어 본문에서 중요한 단어들을 추출
 * @param passage - 영어 본문
 * @returns 추출된 영어 단어 배열
 */
async function extractEnglishWords(passage: string): Promise<string[]> {
    const prompt = `다음 영어 본문을 읽고, **대한민국 고등학교 교육과정 수학능력평가(수능) 수준**의 중요한 단어 8-12개를 추출해주세요. 수능 수준의 문맥 추론이 필요한 학술적/문학적 어휘를 우선 선택하세요.

추출 기준:
- 명사, 동사, 형용사, 부사 등 의미 있는 단어
- 고유명사, 인명, 지명 제외
- 기초 단어 (a, an, the, is, are, was, were 등) 제외
- 복합어나 구문이 아닌 단일 단어
- 본문의 핵심 내용을 이해하는 데 중요한 단어

본문:
${passage}

응답 형식 (JSON 배열):
["word1", "word2", "word3", ...]

주의사항:
- JSON 형식으로만 응답해주세요
- 8-12개의 단어를 추출해주세요
- 중복된 단어는 제외해주세요`;

  const response = await callOpenAI({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant that extracts important English words from text.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API 오류: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  try {
    console.log('단어 추출 AI 응답:', content);
    
    // JSON 파싱 시도
    let jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const words = JSON.parse(jsonMatch[0]);
      const filteredWords = words.filter((word: string) => typeof word === 'string' && word.trim().length > 0);
      console.log('추출된 단어 수:', filteredWords.length);
      return filteredWords;
    } else {
      throw new Error('JSON 형식을 찾을 수 없습니다.');
    }
  } catch (parseError) {
    console.error('단어 추출 파싱 오류:', parseError);
    throw new Error('단어 추출 결과를 파싱할 수 없습니다.');
  }
}

/**
 * 영어 단어들의 한글뜻 생성
 * @param englishWords - 영어 단어 배열
 * @returns 한글뜻이 포함된 단어 배열
 */
async function generateKoreanMeanings(englishWords: string[]): Promise<WordItem[]> {
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

  const response = await callOpenAI({
    model: 'gpt-4o',
    messages: [
      { role: 'user', content: prompt }
    ],
    max_tokens: 2048,
    temperature: 0.3
  });

  if (!response.ok) {
    throw new Error(`OpenAI API 오류: ${response.status}`);
  }

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
    } else {
      throw new Error('JSON 형식을 찾을 수 없습니다.');
    }
  } catch (parseError) {
    console.error('한글뜻 생성 파싱 오류:', parseError);
    throw new Error('한글뜻 생성 결과를 파싱할 수 없습니다.');
  }
}

/**
 * 단어 퀴즈 생성
 * @param words - 단어 목록
 * @param quizType - 퀴즈 타입
 * @returns 단어 퀴즈
 */
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

/**
 * 영어 → 한국어 퀴즈 생성
 * @param words - 단어 목록
 * @returns 퀴즈 문제들
 */
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

/**
 * 한국어 → 영어 퀴즈 생성
 * @param words - 단어 목록
 * @returns 퀴즈 문제들
 */
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

/**
 * 객관식 옵션 생성
 * @param correctAnswer - 정답
 * @param allAnswers - 모든 답안
 * @returns 객관식 옵션들
 */
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

/**
 * 단일 영어 단어의 한글뜻 생성 (단어 편집 시 새 단어 추가용)
 * @param englishWord - 영어 단어
 * @returns 한글뜻이 포함된 단어 객체
 */
export async function generateSingleWordMeaning(englishWord: string): Promise<WordItem> {
  try {
    const words = await generateKoreanMeanings([englishWord]);
    if (words.length > 0) {
      return words[0];
    }
    return { english: englishWord, korean: '(뜻 없음)' };
  } catch (error) {
    console.error('❌ 단일 단어 한글뜻 생성 실패:', error);
    return { english: englishWord, korean: '(뜻 없음)' };
  }
}

