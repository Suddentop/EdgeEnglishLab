/**
 * Work_16 (본문 단어 학습) 문제 생성 로직
 * 여러 영어 본문을 입력받아 각 본문에서 고3 수준의 단어를 추출하여 단어 학습 문제를 생성합니다.
 */

import { callOpenAI } from './common';

/**
 * 단어 학습 관련 타입 정의
 */
export interface WordItem {
  english: string;
  korean: string;
  partOfSpeech?: string; // 품사 (n., v., adj., adv. 등)
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
  passage?: string; // 본문 정보 (여러 본문 구분용)
}

/**
 * 유형#16: 본문 단어 학습 문제 생성 (단일 본문)
 * @param passage - 영어 본문
 * @param quizType - 퀴즈 타입 ('english-to-korean' | 'korean-to-english')
 * @returns 단어 학습 문제 데이터
 */
export async function generateWork16Quiz(
  passage: string, 
  quizType: 'english-to-korean' | 'korean-to-english' = 'english-to-korean'
): Promise<WordQuiz> {
  console.log('🔍 Work_16 문제 생성 시작...');
  console.log('📝 입력 텍스트 길이:', passage.length);
  console.log('🎯 퀴즈 타입:', quizType);

  try {
    // 1단계: 영어 단어 추출 (고3 수준, 15~20개)
    const englishWords = await extractEnglishWords(passage);
    console.log('✅ 추출된 영어 단어:', englishWords);

    // 2단계: 한글뜻 생성
    const words = await generateKoreanMeanings(englishWords);
    console.log('✅ 생성된 단어 목록:', words);
    
    // 품사 정보 확인
    const wordsWithPartOfSpeech = words.filter(w => w.partOfSpeech && w.partOfSpeech.trim().length > 0);
    const wordsWithoutPartOfSpeech = words.filter(w => !w.partOfSpeech || w.partOfSpeech.trim().length === 0);
    console.log('🔍 품사 정보 확인:', {
      totalWords: words.length,
      withPartOfSpeech: wordsWithPartOfSpeech.length,
      withoutPartOfSpeech: wordsWithoutPartOfSpeech.length,
      sampleWithPartOfSpeech: wordsWithPartOfSpeech.slice(0, 3).map(w => ({ 
        english: w.english, 
        partOfSpeech: w.partOfSpeech,
        korean: w.korean 
      })),
      sampleWithoutPartOfSpeech: wordsWithoutPartOfSpeech.slice(0, 3).map(w => ({ 
        english: w.english, 
        partOfSpeech: w.partOfSpeech,
        korean: w.korean 
      }))
    });

    // 3단계: 단어 퀴즈 생성
    const quiz = await generateWordQuiz(words, quizType);
    console.log('✅ 단어 퀴즈 생성 완료:', {
      wordsCount: quiz.words.length,
      sampleWords: quiz.words.slice(0, 3).map(w => ({
        english: w.english,
        korean: w.korean,
        partOfSpeech: w.partOfSpeech
      }))
    });

    // 본문 정보 추가
    return {
      ...quiz,
      passage: passage.substring(0, 100) + '...' // 본문 일부만 저장
    };

  } catch (error) {
    console.error('❌ Work_16 문제 생성 실패:', error);
    throw error;
  }
}

/**
 * 영어 본문에서 중요한 단어들을 추출 (고3 수준, 15~20개)
 * @param passage - 영어 본문
 * @returns 추출된 영어 단어 배열
 */
async function extractEnglishWords(passage: string): Promise<string[]> {
  const prompt = `다음 영어 본문을 읽고, **대한민국 고등학교 교육과정 수학능력평가(수능) 수준**의 중요한 단어를 15~20개 추출해주세요. 수능 수준의 문맥 추론이 필요한 학술적(academic), 정교한(sophisticated) 어휘를 우선 선택하세요.

**⚠️ CRITICAL: 단어 형태 변환 규칙**
- **동사**: 반드시 원형(기본형)으로 추출
  - 예: "went", "goes", "going", "gone" → "go"
  - 예: "analyzed", "analyzing", "analyzes" → "analyze"
  - 예: "conducted", "conducting", "conducts" → "conduct"
- **명사**: 규칙 복수형(s/es로 끝나는 경우)만 단수형으로 변환, 불규칙 복수형은 그대로 유지
  - 예: "books", "studies", "phenomena" → "book", "study", "phenomenon" (규칙 복수형 → 단수형)
  - 예: "children", "people", "data" → "children", "people", "data" (불규칙 복수형은 그대로)
- **형용사/부사**: 비교급/최상급도 그대로 유지
  - 예: "better", "best", "more important", "most significant" → "better", "best", "important", "significant" (그대로 유지)
- **고3 수준이 아닌 단어 제외**: "children", "better", "good", "bad" 등 초등/중등 수준의 기본 단어는 제외하고, 고3/수능 수준의 학술적 어휘만 선택

추출 기준:
- 명사, 동사, 형용사, 부사 등 의미 있는 단어
- 고유명사, 인명, 지명 제외
- 기초 단어 (a, an, the, is, are, was, were 등) 제외
- **초등/중등 수준의 기본 단어 제외** (children, better, good, bad, big, small 등)
- 복합어나 구문이 아닌 단일 단어
- 본문의 핵심 내용을 이해하는 데 중요한 단어
- Grade 12, CSAT 수준의 학술적 어휘를 우선 선택

본문:
${passage}

응답 형식 (JSON 배열):
["word1", "word2", "word3", ...]

주의사항:
- JSON 형식으로만 응답해주세요
- 15~20개의 단어를 추출해주세요 (가능한 한 20개에 가깝게)
- 중복된 단어는 제외해주세요
- 수능 수준의 학술적 어휘를 우선 선택해주세요
- **동사는 원형으로, 명사는 규칙 복수형만 단수형으로, 불규칙 복수형과 비교급/최상급은 그대로 유지**
- **고3 수준이 아닌 기본 단어는 제외**`;

  const response = await callOpenAI({
    model: 'gpt-4o',
    messages: [
      { 
        role: 'system', 
        content: 'You are a helpful assistant that extracts important English words from text for Korean high school students preparing for the CSAT (College Scholastic Ability Test). Extract words following these rules: 1) Verbs must be in base form (infinitive): "went"→"go", "analyzed"→"analyze". 2) Nouns: Convert regular plurals (ending in s/es) to singular ("books"→"book"), but keep irregular plurals as-is ("children"→"children", "data"→"data"). 3) Adjectives/Adverbs: Keep comparative/superlative forms as-is ("better"→"better", "more important"→"important"). 4) Only select Grade 12/CSAT level academic vocabulary, exclude elementary/middle school level basic words like "children", "better", "good", "bad".' 
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 1500,
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
      
      // 15~20개 범위로 조정
      if (filteredWords.length < 15) {
        console.warn('⚠️ 추출된 단어가 15개 미만입니다:', filteredWords.length);
      } else if (filteredWords.length > 20) {
        // 20개 초과 시 앞에서 20개만 선택
        return filteredWords.slice(0, 20);
      }
      
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
 * 단일 영어 단어의 한글뜻 생성 (단어 추가 시 사용)
 * @param englishWord - 영어 단어
 * @returns 한글뜻이 포함된 단어 객체
 */
export async function generateSingleWordMeaning(englishWord: string): Promise<WordItem> {
  console.log('🔍 단일 단어 한글뜻 생성:', englishWord);
  
  try {
    const words = await generateKoreanMeanings([englishWord]);
    if (words.length > 0) {
      return words[0];
    } else {
      // 실패 시 기본값 반환
      return {
        english: englishWord,
        korean: '(뜻 없음)',
        partOfSpeech: 'n.'
      };
    }
  } catch (error) {
    console.error('❌ 단일 단어 한글뜻 생성 실패:', error);
    // 실패 시 기본값 반환
    return {
      english: englishWord,
      korean: '(뜻 없음)',
      partOfSpeech: 'n.'
    };
  }
}

/**
 * 영어 단어들의 한글뜻 생성
 * @param englishWords - 영어 단어 배열
 * @returns 한글뜻이 포함된 단어 배열
 */
async function generateKoreanMeanings(englishWords: string[]): Promise<WordItem[]> {
  const prompt = `다음 영어 단어들의 한국어 뜻과 품사를 정확하게 제공해주세요. 각 단어의 가장 일반적이고 적절한 한국어 뜻과 품사를 제공해주세요.

**⚠️ 중요:**
- 동사는 원형(기본형)으로 제공되었으므로 원형 단어의 기본 뜻을 제공해주세요
- 명사는 단수형 또는 불규칙 복수형으로 제공되었으므로 해당 형태의 뜻을 제공해주세요
- 형용사/부사는 원급 또는 비교급/최상급 형태로 제공되었으므로 해당 형태의 뜻을 제공해주세요

**품사 약자 (반드시 포함해야 함):**
- 명사: "n."
- 동사: "v."
- 형용사: "adj."
- 부사: "adv."
- 전치사: "prep."
- 접속사: "conj."
- 대명사: "pron."
- 감탄사: "interj."

**⚠️ CRITICAL: 각 단어마다 반드시 partOfSpeech 필드를 포함해야 합니다. 품사를 판단할 수 없는 경우에도 가장 가능성 높은 품사를 제공해주세요.**

영어 단어 목록:
${englishWords.join(', ')}

응답 형식 (JSON 배열) - **반드시 이 형식을 정확히 따르세요:**
[
  {"english": "word1", "korean": "한글뜻1", "partOfSpeech": "n."},
  {"english": "word2", "korean": "한글뜻2", "partOfSpeech": "v."},
  {"english": "word3", "korean": "한글뜻3", "partOfSpeech": "adj."},
  {"english": "word4", "korean": "한글뜻4", "partOfSpeech": "adv."},
  ...
]

**⚠️ 필수 사항 (절대 지켜야 함):**
1. **모든 단어에 partOfSpeech 필드가 반드시 포함되어야 합니다**
2. **partOfSpeech는 반드시 다음 중 하나여야 합니다: "n.", "v.", "adj.", "adv.", "prep.", "conj.", "pron.", "interj."**
3. **partOfSpeech 필드가 없거나 빈 문자열이면 안 됩니다**
4. 각 영어 단어에 대해 가장 적절한 한국어 뜻을 제공해주세요
5. 각 단어의 품사를 정확하게 판단하여 약자로 제공해주세요
6. 복합어나 구문이 아닌 단일 단어의 뜻을 제공해주세요
7. 제공된 단어 형태 그대로의 뜻을 제공해주세요 (동사는 원형, 명사는 단수/불규칙복수, 형용사/부사는 원급/비교급/최상급)
8. JSON 형식으로만 응답해주세요

**예시 (이 형식을 정확히 따라주세요):**
입력: ["assume", "talent", "accomplished"]
출력: [
  {"english": "assume", "korean": "가정하다", "partOfSpeech": "v."},
  {"english": "talent", "korean": "재능", "partOfSpeech": "n."},
  {"english": "accomplished", "korean": "성취한", "partOfSpeech": "adj."}
]`;

  const response = await callOpenAI({
    model: 'gpt-4o',
    messages: [
      { 
        role: 'system', 
        content: `You are a helpful assistant that provides Korean translations and part of speech information for English words. 

**CRITICAL REQUIREMENTS:**
1. You MUST include the "partOfSpeech" field for EVERY word in the response.
2. The partOfSpeech field is MANDATORY and cannot be omitted or left empty.
3. Use these abbreviations ONLY: "n." (noun), "v." (verb), "adj." (adjective), "adv." (adverb), "prep." (preposition), "conj." (conjunction), "pron." (pronoun), "interj." (interjection).
4. If you cannot determine the part of speech, use the most likely one based on context.
5. Your response must be valid JSON with partOfSpeech field for every word.

**Example format (you MUST follow this exactly):**
[
  {"english": "assume", "korean": "가정하다", "partOfSpeech": "v."},
  {"english": "talent", "korean": "재능", "partOfSpeech": "n."},
  {"english": "accomplished", "korean": "성취한", "partOfSpeech": "adj."}
]

**REMEMBER: partOfSpeech is REQUIRED for every word. Do not omit it.**` 
      },
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
      console.log('🔍 파싱된 원본 단어 수:', words.length);
      console.log('🔍 파싱된 원본 단어 샘플 (품사 포함 여부 확인):', words.slice(0, 3).map((w: any) => ({
        english: w.english,
        korean: w.korean,
        partOfSpeech: w.partOfSpeech,
        hasPartOfSpeech: !!(w.partOfSpeech && typeof w.partOfSpeech === 'string' && w.partOfSpeech.trim().length > 0)
      })));
      
      const filteredWords = words.filter((word: any) => word.english && word.korean);
      console.log('생성된 한글뜻 수:', filteredWords.length);
      
      // 품사가 없는 단어들에 대해 기본 품사 추론 시도
      const wordsWithPartOfSpeech = filteredWords.map((w: any) => {
        if (!w.partOfSpeech || w.partOfSpeech.trim().length === 0) {
          // 기본 품사 추론 (간단한 휴리스틱)
          const english = w.english.toLowerCase();
          let inferredPartOfSpeech = 'n.'; // 기본값은 명사
          
          // 동사 패턴 (일반적인 동사 어미)
          if (english.endsWith('ate') || english.endsWith('ize') || english.endsWith('ify') || 
              english.endsWith('en') || english.endsWith('ed') || english.endsWith('ing')) {
            inferredPartOfSpeech = 'v.';
          }
          // 형용사 패턴
          else if (english.endsWith('ful') || english.endsWith('less') || english.endsWith('ous') || 
                   english.endsWith('ive') || english.endsWith('al') || english.endsWith('ic') ||
                   english.endsWith('able') || english.endsWith('ible')) {
            inferredPartOfSpeech = 'adj.';
          }
          // 부사 패턴
          else if (english.endsWith('ly')) {
            inferredPartOfSpeech = 'adv.';
          }
          
          console.warn(`⚠️ 품사가 없는 단어 "${w.english}"에 대해 추론된 품사 "${inferredPartOfSpeech}"를 사용합니다.`);
          return { ...w, partOfSpeech: inferredPartOfSpeech };
        }
        return w;
      });
      
      // 품사 포함 여부 확인 및 로그
      const finalWordsWithPartOfSpeech = wordsWithPartOfSpeech.filter((w: any) => w.partOfSpeech && w.partOfSpeech.trim().length > 0);
      const finalWordsWithoutPartOfSpeech = wordsWithPartOfSpeech.filter((w: any) => !w.partOfSpeech || w.partOfSpeech.trim().length === 0);
      
      console.log('품사 포함 단어 수:', finalWordsWithPartOfSpeech.length);
      if (finalWordsWithoutPartOfSpeech.length > 0) {
        console.warn('⚠️ 여전히 품사가 없는 단어들:', finalWordsWithoutPartOfSpeech.map((w: any) => w.english));
      }
      if (finalWordsWithPartOfSpeech.length > 0) {
        console.log('✅ 품사가 있는 단어 샘플:', finalWordsWithPartOfSpeech.slice(0, 5).map((w: any) => ({ 
          english: w.english, 
          partOfSpeech: w.partOfSpeech,
          korean: w.korean
        })));
      }
      
      // 품사가 없는 단어가 하나라도 있으면 품사만 다시 요청
      if (finalWordsWithoutPartOfSpeech.length > 0) {
        console.log(`⚠️ 품사가 없는 단어 ${finalWordsWithoutPartOfSpeech.length}개 발견. 품사만 다시 요청합니다...`);
        try {
          const wordsNeedingPartOfSpeech = finalWordsWithoutPartOfSpeech.map((w: any) => w.english);
          const partOfSpeechPrompt = `다음 영어 단어들의 품사만 정확하게 제공해주세요. 각 단어의 품사를 다음 약자로 제공해주세요: "n." (명사), "v." (동사), "adj." (형용사), "adv." (부사), "prep." (전치사), "conj." (접속사), "pron." (대명사), "interj." (감탄사).

영어 단어 목록:
${wordsNeedingPartOfSpeech.join(', ')}

응답 형식 (JSON 배열):
[
  {"english": "word1", "partOfSpeech": "n."},
  {"english": "word2", "partOfSpeech": "v."},
  ...
]`;

          const partOfSpeechResponse = await callOpenAI({
            model: 'gpt-4o',
            messages: [
              { 
                role: 'system', 
                content: 'You are a helpful assistant that provides part of speech information for English words. You must provide the partOfSpeech field for every word using abbreviations: n., v., adj., adv., prep., conj., pron., interj.' 
              },
              { role: 'user', content: partOfSpeechPrompt }
            ],
            max_tokens: 1024,
            temperature: 0.1
          });

          if (partOfSpeechResponse.ok) {
            const partOfSpeechData = await partOfSpeechResponse.json();
            const partOfSpeechContent = partOfSpeechData.choices[0].message.content.trim();
            const partOfSpeechJsonMatch = partOfSpeechContent.match(/\[[\s\S]*\]/);
            
            if (partOfSpeechJsonMatch) {
              const partOfSpeechWords = JSON.parse(partOfSpeechJsonMatch[0]);
              const partOfSpeechMap = new Map<string, string>();
              
              partOfSpeechWords.forEach((item: any) => {
                if (item.english && item.partOfSpeech) {
                  partOfSpeechMap.set(item.english.toLowerCase(), item.partOfSpeech.trim());
                }
              });
              
              // 품사 정보 업데이트
              wordsWithPartOfSpeech.forEach((w: any) => {
                if (!w.partOfSpeech || w.partOfSpeech.trim().length === 0) {
                  const pos = partOfSpeechMap.get(w.english.toLowerCase());
                  if (pos) {
                    w.partOfSpeech = pos;
                    console.log(`✅ "${w.english}"의 품사를 "${pos}"로 업데이트했습니다.`);
                  } else {
                    // 재요청 후에도 품사가 없으면 기본 품사 추론
                    const english = w.english.toLowerCase();
                    let inferredPartOfSpeech = 'n.'; // 기본값은 명사
                    
                    if (english.endsWith('ate') || english.endsWith('ize') || english.endsWith('ify') || 
                        english.endsWith('en') || english.endsWith('ed') || english.endsWith('ing')) {
                      inferredPartOfSpeech = 'v.';
                    } else if (english.endsWith('ful') || english.endsWith('less') || english.endsWith('ous') || 
                               english.endsWith('ive') || english.endsWith('al') || english.endsWith('ic') ||
                               english.endsWith('able') || english.endsWith('ible')) {
                      inferredPartOfSpeech = 'adj.';
                    } else if (english.endsWith('ly')) {
                      inferredPartOfSpeech = 'adv.';
                    }
                    
                    w.partOfSpeech = inferredPartOfSpeech;
                    console.warn(`⚠️ "${w.english}"의 품사를 재요청 후에도 찾지 못해 추론된 품사 "${inferredPartOfSpeech}"를 사용합니다.`);
                  }
                }
              });
            }
          }
        } catch (error) {
          console.error('품사 재요청 중 오류 발생:', error);
          // 오류가 발생해도 기존 데이터 반환
        }
      }
      
      // 최종 확인: 모든 단어에 품사가 있는지 확인
      const finalCheck = wordsWithPartOfSpeech.filter((w: any) => !w.partOfSpeech || w.partOfSpeech.trim().length === 0);
      if (finalCheck.length > 0) {
        console.error('❌ 최종 확인: 여전히 품사가 없는 단어가 있습니다:', finalCheck.map((w: any) => w.english));
        // 마지막으로 기본 품사 할당
        finalCheck.forEach((w: any) => {
          w.partOfSpeech = 'n.'; // 기본값
          console.warn(`⚠️ "${w.english}"에 기본 품사 "n."을 할당했습니다.`);
        });
      }
      
      console.log('✅ 최종 반환 단어 수:', wordsWithPartOfSpeech.length);
      console.log('✅ 최종 품사 포함 단어 샘플:', wordsWithPartOfSpeech.slice(0, 5).map((w: any) => ({
        english: w.english,
        korean: w.korean,
        partOfSpeech: w.partOfSpeech
      })));
      
      return wordsWithPartOfSpeech;
    } else {
      throw new Error('JSON 형식을 찾을 수 없습니다.');
    }
  } catch (parseError) {
    console.error('한글뜻 생성 파싱 오류:', parseError);
    throw new Error('한글뜻 생성 결과를 파싱할 수 없습니다.');
  }
}

/**
 * 단어 목록만으로 퀴즈 재생성 (단어 편집 후 사용)
 * @param words - 수정된 단어 목록
 * @param quizType - 퀴즈 타입
 * @param passage - 본문 정보 (선택)
 * @returns 단어 퀴즈
 */
export async function regenerateWork16QuizFromWords(
  words: WordItem[],
  quizType: 'english-to-korean' | 'korean-to-english' = 'english-to-korean',
  passage?: string
): Promise<WordQuiz> {
  console.log('🔄 Work_16 퀴즈 재생성 시작 (단어 목록 기반)...');
  console.log('📝 단어 수:', words.length);
  
  try {
    const quiz = await generateWordQuiz(words, quizType);
    return {
      ...quiz,
      passage: passage || quiz.passage
    };
  } catch (error) {
    console.error('❌ Work_16 퀴즈 재생성 실패:', error);
    throw error;
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

