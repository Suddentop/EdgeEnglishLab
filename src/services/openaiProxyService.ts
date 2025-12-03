/**
 * OpenAI API 프록시 서비스
 * dothome.co.kr의 PHP 프록시 서버를 통해 OpenAI API 호출
 */

interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: {
        url: string;
      };
    }>;
  }>;
  max_tokens?: number;
  temperature?: number;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenAIProxyService {
  private readonly proxyUrl: string;
  private readonly timeout: number;

  constructor() {
    // 프로덕션: 프록시 URL 사용, 개발: 빈 문자열 (직접 호출)
    this.proxyUrl = process.env.REACT_APP_API_PROXY_URL || '';
    this.timeout = 60000; // 60초
  }

  /**
   * OpenAI API 호출 (환경에 따라 프록시 또는 직접 호출)
   */
  async callOpenAI(request: OpenAIRequest): Promise<OpenAIResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      let response: Response;

      // 프록시 URL이 설정되어 있으면 프록시 사용 (프로덕션)
      if (this.proxyUrl) {
        console.log('🤖 OpenAI 프록시 서버 호출 중...');
        response = await fetch(this.proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal
        });
      } else {
        // 프록시 URL이 없으면 에러 발생 (보안상 직접 호출 제거)
        throw new Error('프록시 서버가 설정되지 않았습니다. REACT_APP_API_PROXY_URL 환경 변수를 설정해주세요.');
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API 오류:', response.status, errorText);
        throw new Error(`API 오류: ${response.status} - ${errorText}`);
      }

      const data: OpenAIResponse = await response.json();
      console.log('✅ OpenAI API 응답 성공');
      
      return data;
    } catch (error: any) {
      console.error('❌ OpenAI API 호출 실패:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('요청 시간 초과 (60초)');
      }
      
      throw error;
    }
  }

  /**
   * 빈칸 채우기 문제 생성 (Work 13)
   */
  async generateBlankFillQuiz(passage: string, retryCount: number = 0): Promise<any> {
    const validSentences = passage.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const prompt = `
아래 영어 본문에서 빈칸 채우기 문제를 생성해주세요.

규칙:
- 각 문장에서 1개씩 단어를 선택 (총 ${validSentences.length}개)
- 모든 문장에서 1개씩 선택 (건너뛰지 말 것)
- JSON 형식으로만 응답

입력된 영어 본문:
${passage}`;

    const request: OpenAIRequest = {
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
    };

    const response = await this.callOpenAI(request);
    
    const jsonMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    }

    let result: any;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
    }

    // 필수 필드 검증
    if (!result.blankedText || !result.correctAnswers || !Array.isArray(result.correctAnswers)) {
      throw new Error('AI 응답에 필수 필드가 누락되었습니다.');
    }

    return result;
  }

  /**
   * 주제 추론 문제 생성 (Work 07)
   */
  async generateMainIdeaQuiz(inputText: string): Promise<any> {
    const prompt = `
아래 영어 본문의 주제를 파악하고 객관식 문제를 만들어주세요.

${inputText}

중요 규칙:
- answerIndex는 0~4 사이의 숫자 (배열 인덱스)
- answerTranslation은 반드시 options[answerIndex]의 정확한 번역
- optionTranslations는 모든 선택지의 해석 배열 (options와 동일한 순서)
- 예시: answerIndex=1, options[1]="The future is uncertain but promising." → answerTranslation="미래는 불확실하지만 희망적입니다."
- optionTranslations[1]도 "미래는 불확실하지만 희망적입니다."가 되어야 함
- 모든 해석이 정확히 일치해야 함`;

    const request: OpenAIRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3
    };

    const response = await this.callOpenAI(request);
    
    const jsonMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    }

    let result: any;
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

    return result;
  }

  /**
   * 어휘 문제 생성 (Work 03)
   */
  async generateVocabularyQuiz(passage: string, excludedWords: string[] = []): Promise<any> {
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
${passage}`;

    const request: OpenAIRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      temperature: 0.7
    };

    const response = await this.callOpenAI(request);
    
    const jsonMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON 형식을 찾을 수 없습니다.');
    }

    let result: any;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('AI 응답의 JSON 형식이 올바르지 않습니다.');
    }

    return result;
  }
}

// 싱글톤 인스턴스 생성
export const openAIProxyService = new OpenAIProxyService();
export default openAIProxyService;
