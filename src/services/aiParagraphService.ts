// AI 기반 의미 단락 분할 및 섞기 서비스
// 서비스 제공자의 OpenAI API 키를 사용하여 모든 사용자에게 AI 기능 제공

export interface AIParagraphResponse {
  success: boolean;
  paragraphs?: string[];
  shuffledParagraphs?: string[];
  error?: string;
  originalText?: string;
}

// 서비스 제공자의 OpenAI API 키 확인
const getOpenAIKey = (): string | null => {
  // 환경변수에서 서비스 제공자의 API 키 가져오기
  return process.env.REACT_APP_OPENAI_API_KEY || null;
};

// AI 기반 의미 단락 분할 및 섞기
export async function divideParagraphsWithAI(text: string, title?: string): Promise<AIParagraphResponse> {
  const apiKey = getOpenAIKey();
  
  if (!apiKey) {
    return {
      success: false,
      error: 'AI 서비스가 현재 이용할 수 없습니다. 잠시 후 다시 시도해주세요.'
    };
  }

  // 입력 텍스트 길이 검사
  if (text.length < 100) {
    return {
      success: false,
      error: `입력된 텍스트가 너무 짧습니다. 의미있는 단락 분할을 위해 최소 100자 이상의 텍스트를 입력해주세요.\n현재 글자 수: ${text.length}자`
    };
  }

  try {
    console.log('🤖 AI 기반 단락 분할 및 섞기 시작...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `당신은 영어 텍스트 분석 및 문제 생성 전문가입니다. 주어진 영어 본문을 의미와 주제에 따라 정확히 4개의 단락으로 나누고, 이를 적절히 섞어서 문제를 만들 수 있도록 해야 합니다.

🚨 절대 금지 사항 (매우 중요):
1. 원본 문장의 순서를 절대 바꾸지 마세요
2. 하나의 문장을 떼어내서 다른 단락에 붙이지 마세요  
3. 문장이나 단어를 수정, 삭제, 추가하지 마세요
4. 모든 문장은 원본에 나타난 순서 그대로 유지해야 합니다
5. 원본 텍스트의 내용을 변경하지 마세요

📋 단락 분할 원칙:
1. 텍스트를 처음부터 끝까지 순서대로 읽으면서 의미 단위를 파악하세요
2. 자연스러운 의미 전환점에서만 단락을 나누세요
3. 각 단락은 연속된 문장들로만 구성되어야 합니다
4. 반드시 정확히 4개의 단락으로 나누세요
5. 각 단락이 하나의 완전한 의미 단위를 형성하도록 하세요
6. 단락 내 문장들의 순서는 원본과 동일해야 합니다
7. 단락 간의 의미적 연결성을 고려하세요

🔍 의미 단위 파악 방법:
- 주제나 관점의 변화
- 시간적 순서의 변화
- 논리적 흐름의 전환
- 예시나 설명의 시작/끝
- 결론이나 요약의 시작

🎲 섞기 원칙 (매우 중요):
1. 4개 단락을 완전히 뒤섞어야 합니다
2. 최소 3개 단락이 원래 위치에 있으면 안됩니다
3. 섞인 결과가 너무 쉽게 맞출 수 없어야 합니다
4. 섞인 순서는 매번 다르게 생성되어야 합니다
5. 섞인 순서는 반드시 [숫자, 숫자, 숫자, 숫자] 형태로 출력해야 합니다

📝 출력 형식 (정확히 따라주세요):
**원본 단락 1:**
[첫 번째 의미 단위의 연속된 문장들 - 원본 순서 유지]

**원본 단락 2:**  
[두 번째 의미 단위의 연속된 문장들 - 원본 순서 유지]

**원본 단락 3:**
[세 번째 의미 단위의 연속된 문장들 - 원본 순서 유지]

**원본 단락 4:**
[네 번째 의미 단위의 연속된 문장들 - 원본 순서 유지]

**섞인 순서:**
[3, 1, 4, 2]

⚠️ 주의: 문장을 재배치하거나 순서를 바꾸는 것은 절대 금지입니다. 원본 텍스트의 흐름을 그대로 따라가면서 의미적으로 자연스러운 지점에서만 단락을 구분하고, 단락 자체는 뒤섞어주세요. 섞인 순서는 반드시 [숫자, 숫자, 숫자, 숫자] 형태로 출력해야 합니다.`
          },
          {
            role: "user",
            content: `다음 영어 텍스트를 의미 기반으로 정확히 4개의 단락으로 나누고, 4개 단락을 적절히 섞어주세요. 절대로 문장 순서를 바꾸거나 문장을 다른 단락으로 이동시키지 마세요:\n\n${text}`
          }
        ],
        max_tokens: 3000,
        temperature: 0.1 // 더 일관된 결과를 위해 온도 낮춤
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API 오류: ${errorData.error?.message || '알 수 없는 오류'}`);
    }

    const data = await response.json();
    const aiResult = data.choices[0].message.content;
    
    // AI 결과에서 단락과 섞인 순서 추출
    const { paragraphs, shuffledOrder } = extractParagraphsAndShuffleFromAIResponse(aiResult);
    
    if (paragraphs.length !== 4) {
      throw new Error('AI가 정확히 4개의 단락으로 분할하지 못했습니다.');
    }

    if (!shuffledOrder || shuffledOrder.length !== 4) {
      throw new Error('AI가 섞인 순서를 제대로 생성하지 못했습니다.');
    }

    // 원본 문장 순서 검증
    const isValidOrder = validateOriginalOrder(text, paragraphs);
    if (!isValidOrder) {
      console.warn('⚠️ AI가 문장 순서를 변경했습니다. 규칙 기반으로 폴백합니다.');
      throw new Error('AI가 원본 문장 순서를 변경했습니다.');
    }

    // 섞인 단락 생성
    const shuffledParagraphs = shuffledOrder.map((index, i) => paragraphs[index - 1]);

    console.log('✅ AI 단락 분할 및 섞기 완료');
    
    return {
      success: true,
      paragraphs,
      shuffledParagraphs,
      originalText: text
    };
    
  } catch (error) {
    console.error('❌ AI API 오류:', error);
    
    // AI 실패 시 규칙 기반으로 폴백
    console.log('🔄 규칙 기반 분할로 폴백...');
    return divideParagraphsWithFallback(text);
  }
}

// 원본 문장 순서 검증 함수
function validateOriginalOrder(originalText: string, paragraphs: string[]): boolean {
  try {
    // 원본 텍스트를 문장 단위로 분할
    const originalSentences = originalText
      .replace(/\.\s+/g, '.|SPLIT|')
      .replace(/[!?]\s+/g, '|SPLIT|')
      .split('|SPLIT|')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // 단락들을 합쳐서 문장 단위로 분할
    const combinedText = paragraphs.join(' ');
    const paragraphSentences = combinedText
      .replace(/\.\s+/g, '.|SPLIT|')
      .replace(/[!?]\s+/g, '|SPLIT|')
      .split('|SPLIT|')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // 문장 수가 같은지 확인
    if (originalSentences.length !== paragraphSentences.length) {
      console.warn('문장 수가 다릅니다:', originalSentences.length, 'vs', paragraphSentences.length);
      return false;
    }

    // 각 문장이 동일한 순서로 있는지 확인
    for (let i = 0; i < originalSentences.length; i++) {
      const original = originalSentences[i].replace(/\s+/g, ' ').trim();
      const paragraph = paragraphSentences[i].replace(/\s+/g, ' ').trim();
      
      if (original !== paragraph) {
        console.warn(`문장 ${i+1}이 다릅니다:`);
        console.warn('원본:', original);
        console.warn('AI결과:', paragraph);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('순서 검증 중 오류:', error);
    return false;
  }
}

// AI 응답에서 단락과 섞인 순서 추출 (수정된 함수)
function extractParagraphsAndShuffleFromAIResponse(aiResponse: string): { paragraphs: string[], shuffledOrder: number[] } {
  const paragraphs: string[] = [];
  let shuffledOrder: number[] = [];
  
  console.log('🔍 AI 응답에서 단락과 섞인 순서 추출 시작...');
  console.log('📝 AI 응답:', aiResponse.substring(0, 200) + '...');
  
  // **원본 단락 X:** 형태로 시작하는 패턴 찾기
  const paragraphMatches = aiResponse.match(/\*\*원본 단락 \d+:\*\*\s*([\s\S]*?)(?=\*\*원본 단락 \d+:\*\*|$)/g);
  
  if (paragraphMatches) {
    console.log('✅ 패턴 매칭으로 단락 추출:', paragraphMatches.length, '개');
    for (const match of paragraphMatches) {
      // **원본 단락 X:** 부분 제거하고 내용만 추출
      let content = match.replace(/^\*\*원본 단락 \d+:\*\*\s*/, '').trim();
      
      // 주제 설명 부분 제거 (- 주제: ... 형태)
      content = content.replace(/\s*-\s*주제:.*$/gm, '').trim();
      
      if (content) {
        paragraphs.push(content);
        console.log(`📄 단락 ${paragraphs.length}:`, content.substring(0, 50) + '...');
      }
    }
  }
  
  // **섞인 순서:** 부분에서 순서 추출
  const shuffleMatch = aiResponse.match(/\*\*섞인 순서:\*\*\s*\[([^\]]+)\]/);
  if (shuffleMatch) {
    const orderText = shuffleMatch[1];
    console.log('🎲 섞인 순서 텍스트:', orderText);
    // 숫자들을 추출 (예: "3, 1, 4, 2")
    const numbers = orderText.match(/\d+/g);
    if (numbers && numbers.length === 4) {
      shuffledOrder = numbers.map(n => parseInt(n));
      console.log('✅ 섞인 순서 추출:', shuffledOrder);
    }
  }
  
  // 패턴 매칭이 안 되면 줄바꿈으로 분할 시도
  if (paragraphs.length === 0) {
    console.log('⚠️ 패턴 매칭 실패, 줄바꿈으로 분할 시도...');
    const lines = aiResponse.split('\n').filter(line => line.trim().length > 0);
    let currentParagraph = '';
    
    for (const line of lines) {
      if (line.includes('원본 단락') && line.includes(':')) {
        if (currentParagraph) {
          paragraphs.push(currentParagraph.trim());
          currentParagraph = '';
        }
      } else if (!line.includes('주제:') && !line.includes('섞인 순서:')) {
        currentParagraph += line + ' ';
      }
    }
    
    if (currentParagraph) {
      paragraphs.push(currentParagraph.trim());
    }
  }
  
  // 섞인 순서가 없으면 기본 섞기 생성
  if (shuffledOrder.length === 0) {
    console.log('⚠️ 섞인 순서를 찾을 수 없음, 기본 섞기 생성');
    shuffledOrder = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
  }
  
  console.log('📊 최종 추출 결과:');
  console.log('- 단락 수:', paragraphs.length);
  console.log('- 섞인 순서:', shuffledOrder);
  
  return { paragraphs, shuffledOrder };
}

// AI 실패 시 폴백용 기본 분할 함수
function divideParagraphsWithFallback(text: string): AIParagraphResponse {
  const sentences = text
    .replace(/\.\s+([A-Z])/g, '.|SPLIT|$1')
    .replace(/[!?]\s+([A-Z])/g, '|SPLIT|$1')
    .replace(/[.!?]$/, '|SPLIT|')
    .split('|SPLIT|')
    .map(s => s.trim())
    .filter(s => s.length > 5);

  const paragraphs: string[] = [];
  const sentencesPerParagraph = Math.ceil(sentences.length / 4);
  
  for (let i = 0; i < 4; i++) {
    const startIdx = i * sentencesPerParagraph;
    const endIdx = Math.min(startIdx + sentencesPerParagraph, sentences.length);
    const paragraphSentences = sentences.slice(startIdx, endIdx);
    
    if (paragraphSentences.length > 0) {
      const paragraph = paragraphSentences
        .map(s => s.trim().match(/[.!?]$/) ? s.trim() : s.trim() + '.')
        .join(' ');
      paragraphs.push(paragraph);
    }
  }
  
  return {
    success: true,
    paragraphs,
    originalText: text
  };
}

// AI 서비스 이용 가능 여부 확인
export function isAIServiceAvailable(): boolean {
  return getOpenAIKey() !== null;
} 