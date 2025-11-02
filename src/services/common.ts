/**
 * Quiz Generator 공통 헬퍼 함수들
 * 모든 유형의 문제 생성에서 공통으로 사용되는 함수들
 */

/**
 * OpenAI API 호출 헬퍼 함수
 * 프록시 서버 또는 직접 API 호출을 선택적으로 처리
 */
export async function callOpenAI(requestBody: any): Promise<Response> {
  const proxyUrl = process.env.REACT_APP_API_PROXY_URL || '';
  const directApiKey = process.env.REACT_APP_OPENAI_API_KEY;
  
  // 프록시 URL이 설정된 경우 프록시 사용 (프로덕션)
  if (proxyUrl) {
    return await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  }
  
  // 개발 환경: 직접 API 호출
  if (!directApiKey) {
    throw new Error('API Key가 설정되지 않았습니다. .env.local 파일에 REACT_APP_OPENAI_API_KEY를 설정해주세요.');
  }
  
  return await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${directApiKey}`,
    },
    body: JSON.stringify(requestBody),
  });
}

/**
 * 영어 본문을 한국어로 번역하는 공통 함수
 */
export async function translateToKorean(englishText: string): Promise<string> {
  try {
    console.log('🌐 번역 시작:', englishText.substring(0, 50) + '...');

    const prompt = `다음 영어 본문을 자연스러운 한국어로 번역해주세요. 번역만 출력하고 다른 설명은 하지 마세요.

영어 본문:
${englishText}`;

    const response = await callOpenAI({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 오류:', response.status, errorText);
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

/**
 * Vision API를 사용하여 이미지에서 텍스트 추출
 * 프록시 또는 직접 호출을 자동으로 처리
 */
export async function extractTextFromImage(imageBase64: string, prompt?: string): Promise<string> {
  const defaultPrompt = `영어문제로 사용되는 본문이야.
이 이미지의 내용을 수작업으로 정확히 읽고, 영어 본문만 추려내서 보여줘.
글자는 인쇄글씨체 이외에 손글씨나 원, 밑줄 등 표시되어있는 것은 무시해. 
본문중에 원문자 1, 2, 3... 등으로 표시된건 제거해줘. 
원문자 제거후 줄을 바꾸거나 문단을 바꾸지말고, 전체가 한 문단으로 구성해줘. 
영어 본문만, 아무런 설명이나 안내문 없이, 한 문단으로만 출력해줘.`;
  
  const visionPrompt = prompt || defaultPrompt;
  
  const requestBody = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: visionPrompt },
          { type: 'image_url' as const, image_url: { url: imageBase64 } }
        ]
      }
    ],
    max_tokens: 2048
  };

  const response = await callOpenAI(requestBody);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision API 호출 실패: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Vision API 응답 형식 오류');
  }
  
  return data.choices[0].message.content.trim();
}