/**
 * Quiz Generator 공통 헬퍼 함수들
 * 모든 유형의 문제 생성에서 공통으로 사용되는 함수들
 */

/**
 * 문제 생성 시 다양성을 추가하는 프롬프트 지시문 생성
 * 동일한 본문이라도 다른 문제가 생성되도록 도와줍니다.
 * 매번 다른 랜덤 시드를 추가하여 더 확실한 다양성을 보장합니다.
 */
export function addVarietyToPrompt(basePrompt: string): string {
  // 매번 다른 랜덤 시드 생성 (타임스탬프 + 랜덤 숫자)
  const randomSeed = Date.now() + Math.floor(Math.random() * 10000);
  
  // 다양한 접근 방식 중 하나를 랜덤하게 선택
  const approaches = [
    '본문의 첫 번째 부분에 집중하여 문제를 생성',
    '본문의 중간 부분에 집중하여 문제를 생성',
    '본문의 마지막 부분에 집중하여 문제를 생성',
    '본문 전체를 종합적으로 분석하여 문제를 생성',
    '본문의 논리적 구조에 집중하여 문제를 생성',
    '본문의 감정적 톤에 집중하여 문제를 생성',
    '본문의 인과관계에 집중하여 문제를 생성',
    '본문의 대조와 비교에 집중하여 문제를 생성'
  ];
  const selectedApproach = approaches[Math.floor(Math.random() * approaches.length)];
  
  const varietyInstructions = [
    '**다양성 요구사항 (중요):**',
    `- 이번 생성은 시드 ${randomSeed}를 사용하며, "${selectedApproach}"하세요.`,
    '- 동일한 본문이라도 매번 완전히 다른 관점과 접근 방식으로 문제를 생성해주세요.',
    '- 선택지의 표현 방식, 어휘 선택, 문장 구조를 이전과 다르게 만들어주세요.',
    '- 정답의 위치를 랜덤하게 배치하고, 오답 선택지도 다양한 유형으로 생성해주세요.',
    '- 본문의 다른 부분이나 다른 해석 관점을 활용하여 문제의 다양성을 확보해주세요.',
    '- 이전에 생성한 문제와는 확실히 다른 선택지와 정답 위치를 사용해주세요.',
    ''
  ].join('\n');

  return `${basePrompt}\n\n${varietyInstructions}`;
}

/**
 * 문제 생성에 적합한 temperature 값 반환
 * 다양성을 위해 기본값을 높게 설정하되, 약간의 랜덤 변동을 추가하여 더 확실한 다양성 보장
 */
export function getProblemGenerationTemperature(customTemperature?: number): number {
  // 기본값: 0.7 (다양성과 일관성의 균형)
  // 약간의 랜덤 변동 추가 (±0.1)로 매번 다른 결과 보장
  const baseTemp = customTemperature !== undefined ? customTemperature : 0.7;
  const variation = (Math.random() - 0.5) * 0.2; // -0.1 ~ +0.1 범위
  const finalTemp = Math.max(0.5, Math.min(0.9, baseTemp + variation)); // 0.5 ~ 0.9 범위로 제한
  
  return Math.round(finalTemp * 100) / 100; // 소수점 2자리로 반올림
}

/**
 * API 프록시 상대 경로.
 * 근본 원인: edgeenglish.net 서버가 CORS 헤더를 보내지 않아, 브라우저가 cross-origin 요청을 차단함.
 * 대응: 브라우저가 같은 origin으로만 요청하도록 상대 경로 사용. (로컬은 개발 서버 프록시 경유)
 * 자세한 설명: docs/CORS_AND_API_PROXY.md
 */
const EDGEENGLISH_PROXY_PATH = '/secure-api-proxy.php';

/**
 * 실제 요청에 쓸 URL. localhost 또는 edgeenglish.net일 때 상대 경로를 쓰면
 * 브라우저는 same-origin 요청만 하므로 CORS 차단이 발생하지 않음.
 */
export function getEffectiveProxyUrl(proxyUrl: string): string {
  if (!proxyUrl) return proxyUrl;
  if (!proxyUrl.startsWith('https://edgeenglish.net/')) return proxyUrl;
  if (typeof window === 'undefined') return proxyUrl;
  const origin = window.location.origin;
  const useRelative =
    origin === 'https://edgeenglish.net' ||
    origin === 'https://www.edgeenglish.net' ||
    origin.startsWith('http://localhost');
  return useRelative ? EDGEENGLISH_PROXY_PATH : proxyUrl;
}

/**
 * OpenAI API 호출 헬퍼 함수
 * 보안을 위해 프록시 서버만 사용 (직접 API 호출 제거)
 */
export async function callOpenAI(requestBody: any): Promise<Response> {
  const proxyUrl = process.env.REACT_APP_API_PROXY_URL || '';
  const effectiveUrl = getEffectiveProxyUrl(proxyUrl);

  // 환경 변수 확인 로그 (디버깅용)
  console.log('🔍 [callOpenAI] 환경 변수 확인:', {
    'REACT_APP_API_PROXY_URL': proxyUrl ? `설정됨 (${proxyUrl})` : '❌ 없음',
    '사용 모드': proxyUrl ? '프록시 서버' : '❌ 프록시 미설정',
    ...(effectiveUrl !== proxyUrl && { '실제 요청 (CORS 회피)': effectiveUrl }),
  });

  // 프록시 URL이 필수로 설정되어야 함 (보안상 직접 API 호출 제거)
  if (!proxyUrl) {
    const errorMessage = '프록시 서버가 설정되지 않았습니다. REACT_APP_API_PROXY_URL 환경 변수를 설정해주세요.';
    console.error('❌ [보안 오류]', errorMessage);
    console.error('💡 Firebase Functions 프록시를 사용하려면:');
    console.error('   .env.local 파일에 다음을 추가하세요:');
    console.error('   REACT_APP_API_PROXY_URL=https://us-central1-edgeenglishlab.cloudfunctions.net/openaiProxy');
    console.error('');
    console.error('💡 또는 PHP 프록시 서버를 사용하려면:');
    console.error('   REACT_APP_API_PROXY_URL=https://edgeenglish.net/secure-api-proxy.php');
    throw new Error(errorMessage);
  }
  
  // 프록시 서버를 통해서만 API 호출 (localhost 시 상대 경로 → 개발 서버 프록시 경유)
  console.log('✅ [프록시 모드] 프록시 서버 사용:', effectiveUrl);
  const response = await fetch(effectiveUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  // 프록시 응답에서 401 에러인 경우 상세 정보 제공
  if (response.status === 401) {
    // 응답 본문을 읽기 전에 복제하여 원본 응답의 본문을 보존 (body stream already read 오류 방지)
    const clone = response.clone();
    const errorText = await clone.text().catch(() => '');
    let errorMessage = 'OpenAI API 인증 실패 (401)';
    
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.error?.message) {
        errorMessage = `OpenAI API 인증 실패: ${errorData.error.message}`;
      }
    } catch (e) {
      // JSON 파싱 실패 시 기본 메시지 사용
    }
    
    console.error('❌ API 인증 오류:', errorMessage);
    console.error('💡 해결 방법:');
    console.error('   1. 프록시 서버의 OpenAI API 키가 올바른지 확인하세요.');
    console.error('   2. API 키가 만료되지 않았는지 확인하세요.');
    console.error('   3. 프록시 서버 설정을 확인하세요.');
  }
  
  return response;
}

/**
 * 영어 본문을 한국어로 번역하는 공통 함수
 */
export async function translateToKorean(englishText: string): Promise<string> {
  try {
    console.log('🌐 번역 시작:', englishText.substring(0, 50) + '...');

    const prompt = `다음 영어 본문을 대한민국 수능(CSAT) 영어 독해 지문의 고3 수준 해설에 적합한 학술적이고 정교한 한국어로 번역해주세요.
문맥을 완벽하게 반영하여 매끄럽고 품격 있는 문장으로 번역해야 합니다.
번역 결과만 출력하고 설명은 포함하지 마세요.

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
