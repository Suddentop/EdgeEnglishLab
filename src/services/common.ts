/**
 * Quiz Generator 공통 헬퍼 함수들
 * 모든 유형의 문제 생성에서 공통으로 사용되는 함수들
 */

/**
 * OpenAI API 호출 헬퍼 함수
 * 프록시 서버 또는 직접 API 호출을 선택적으로 처리
 */
export async function callOpenAI(requestBody: any): Promise<Response> {
  const proxyUrl = process.env.REACT_APP_API_PROXY_URL || 'http://localhost:8000/api-proxy.php';
  const directApiKey = process.env.REACT_APP_OPENAI_API_KEY;
  
  console.log('🔍 환경 변수 확인:', {
    proxyUrl: proxyUrl ? '설정됨' : '없음',
    directApiKey: directApiKey ? '설정됨' : '없음'
  });
  
  // 프록시 서버를 우선적으로 사용
  console.log('🤖 OpenAI 프록시 서버 호출 중...');
  return await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

