/**
 * OpenAI 및 Firebase 사용량 및 비용 예측 유틸리티
 */

// OpenAI gpt-4o 가격 (2024년 기준, USD)
const OPENAI_PRICING = {
  'gpt-4o': {
    input: 2.50 / 1000000,  // $2.50 per 1M input tokens
    output: 10.00 / 1000000  // $10.00 per 1M output tokens
  }
};

// Firebase 가격 (2024년 기준, USD)
const FIREBASE_PRICING = {
  firestore: {
    write: 0.18 / 100000,    // $0.18 per 100K document writes
    read: 0.06 / 100000,     // $0.06 per 100K document reads
    storage: 0.18 / 100000   // $0.18 per 100K document deletes
  },
  storage: {
    upload: 0.026 / 1024 / 1024,  // $0.026 per GB uploaded
    download: 0.012 / 1024 / 1024, // $0.012 per GB downloaded
    storage: 0.026 / 1024 / 1024 / 30  // $0.026 per GB per month
  }
};

// USD to KRW 환율 (기본값, 실제로는 API로 가져올 수 있음)
const USD_TO_KRW = 1350;

/**
 * 텍스트 길이를 토큰 수로 추정 (대략적인 계산)
 * 영어: 1 토큰 ≈ 4 문자
 * 한국어: 1 토큰 ≈ 1.5 문자
 */
function estimateTokens(text: string, isKorean: boolean = false): number {
  if (isKorean) {
    return Math.ceil(text.length / 1.5);
  }
  return Math.ceil(text.length / 4);
}

/**
 * 프롬프트와 응답의 토큰 수 추정
 */
function estimatePromptTokens(prompt: string): number {
  // 시스템 프롬프트 + 사용자 프롬프트
  const systemPrompt = 100; // 대략적인 시스템 프롬프트 토큰
  return systemPrompt + estimateTokens(prompt);
}

function estimateResponseTokens(maxTokens: number, actualLength?: number): number {
  if (actualLength !== undefined) {
    return estimateTokens(actualLength.toString(), false);
  }
  // max_tokens의 70% 정도 사용한다고 가정
  return Math.ceil(maxTokens * 0.7);
}

/**
 * 문제 유형별 API 호출 패턴 정의
 */
interface WorkTypeConfig {
  name: string;
  apiCalls: Array<{
    description: string;
    promptLength: number; // 프롬프트 길이 (문자)
    maxTokens: number;
    isKorean: boolean; // 한국어 응답 여부
  }>;
  firestoreWrites: number; // Firestore 쓰기 횟수
  storageUploads: number; // Storage 업로드 횟수 (PDF 등)
  storageSizeKB?: number; // 업로드 파일 크기 (KB)
}

const WORK_TYPE_CONFIGS: Record<string, WorkTypeConfig> = {
  '01': {
    name: '문장 순서 배열',
    apiCalls: [
      { description: '문장 분리', promptLength: 500, maxTokens: 1500, isKorean: false },
      { description: '문제 생성', promptLength: 500, maxTokens: 1000, isKorean: false }
    ],
    firestoreWrites: 2, // 내역 저장 + 포인트 거래
    storageUploads: 0
  },
  '02': {
    name: '독해 문제',
    apiCalls: [
      { description: '문장 분리', promptLength: 200, maxTokens: 1000, isKorean: false },
      { description: '단어 선택 (문장당)', promptLength: 300, maxTokens: 200, isKorean: false },
      { description: '단어 교체 (문장당)', promptLength: 300, maxTokens: 300, isKorean: false },
      { description: '본문 번역', promptLength: 500, maxTokens: 2000, isKorean: true }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '03': {
    name: '어휘 문제',
    apiCalls: [
      { description: '문제 생성', promptLength: 500, maxTokens: 1200, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '04': {
    name: '빈칸 추론 (구)',
    apiCalls: [
      { description: '문제 생성', promptLength: 500, maxTokens: 1200, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '05': {
    name: '빈칸 추론 (문장)',
    apiCalls: [
      { description: '문제 생성', promptLength: 500, maxTokens: 3000, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '06': {
    name: '문장 위치',
    apiCalls: [
      { description: '문제 생성', promptLength: 500, maxTokens: 2000, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '07': {
    name: '주제 추론',
    apiCalls: [
      { description: '문제 생성', promptLength: 500, maxTokens: 2000, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '08': {
    name: '제목 추론',
    apiCalls: [
      { description: '문제 생성', promptLength: 500, maxTokens: 2000, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '09': {
    name: '문법 오류',
    apiCalls: [
      { description: '오류 후보 생성', promptLength: 500, maxTokens: 2000, isKorean: false },
      { description: '문제 생성', promptLength: 500, maxTokens: 1000, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '10': {
    name: '다중 문법 오류',
    apiCalls: [
      { description: '오류 후보 생성', promptLength: 500, maxTokens: 2000, isKorean: false },
      { description: '문제 생성', promptLength: 500, maxTokens: 3000, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '11': {
    name: '문장 번역',
    apiCalls: [
      { description: '문제 생성', promptLength: 500, maxTokens: 1000, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '12': {
    name: '단어 학습',
    apiCalls: [
      { description: '단어 추출', promptLength: 500, maxTokens: 1000, isKorean: false },
      { description: '문제 생성', promptLength: 500, maxTokens: 2048, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '13': {
    name: '빈칸 채우기 (단어)',
    apiCalls: [
      { description: '문제 생성', promptLength: 500, maxTokens: 1000, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '14': {
    name: '빈칸 채우기 (문장)',
    apiCalls: [
      { description: '문제 생성', promptLength: 500, maxTokens: 1000, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  },
  '15': {
    name: '지문 단어 학습',
    apiCalls: [
      { description: '단어 추출', promptLength: 500, maxTokens: 1500, isKorean: false },
      { description: '문제 생성', promptLength: 500, maxTokens: 2048, isKorean: false }
    ],
    firestoreWrites: 2,
    storageUploads: 0
  }
};

/**
 * 비용 예측 결과 인터페이스
 */
export interface CostEstimate {
  openai: {
    totalTokens: {
      input: number;
      output: number;
    };
    cost: {
      input: number; // USD
      output: number; // USD
      total: number; // USD
      totalKRW: number; // KRW
    };
    apiCalls: Array<{
      description: string;
      inputTokens: number;
      outputTokens: number;
      cost: number; // USD
    }>;
  };
  firebase: {
    firestore: {
      writes: number;
      cost: number; // USD
      costKRW: number; // KRW
    };
    storage: {
      uploads: number;
      sizeKB: number;
      cost: number; // USD
      costKRW: number; // KRW
    };
    total: {
      cost: number; // USD
      costKRW: number; // KRW
    };
  };
  total: {
    cost: number; // USD
    costKRW: number; // KRW
  };
}

/**
 * 문제 생성 비용 예측
 * @param inputText 입력 텍스트 (영어 본문)
 * @param workTypeId 문제 유형 ID ('01', '02', ...)
 * @param options 추가 옵션
 */
export function estimateCost(
  inputText: string,
  workTypeId: string,
  options: {
    includeTranslation?: boolean;
    includePDF?: boolean;
    sentenceCount?: number; // Work_02 등에서 문장 수가 필요한 경우
  } = {}
): CostEstimate {
  const config = WORK_TYPE_CONFIGS[workTypeId];
  if (!config) {
    throw new Error(`알 수 없는 문제 유형: ${workTypeId}`);
  }

  const inputLength = inputText.length;
  const sentenceCount = options.sentenceCount || Math.ceil(inputLength / 100); // 대략적인 문장 수 추정

  // OpenAI 비용 계산
  const apiCalls: CostEstimate['openai']['apiCalls'] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const call of config.apiCalls) {
    // 프롬프트에 입력 텍스트 포함
    const promptLength = call.promptLength + inputLength;
    const inputTokens = estimatePromptTokens(inputText.substring(0, promptLength));
    
    // 문장당 반복되는 경우 (Work_02 등)
    const repeatCount = call.description.includes('문장당') ? sentenceCount : 1;
    
    const outputTokens = estimateResponseTokens(call.maxTokens) * repeatCount;
    
    const inputCost = inputTokens * OPENAI_PRICING['gpt-4o'].input * repeatCount;
    const outputCost = outputTokens * OPENAI_PRICING['gpt-4o'].output;
    const totalCost = inputCost + outputCost;

    totalInputTokens += inputTokens * repeatCount;
    totalOutputTokens += outputTokens;

    apiCalls.push({
      description: call.description + (repeatCount > 1 ? ` (${repeatCount}회)` : ''),
      inputTokens: inputTokens * repeatCount,
      outputTokens,
      cost: totalCost
    });
  }

  // 번역 추가 (일부 유형에서)
  if (options.includeTranslation && !config.apiCalls.some(c => c.description.includes('번역'))) {
    const translationInputTokens = estimatePromptTokens(inputText);
    const translationOutputTokens = estimateTokens(inputText, true); // 한국어 번역
    const translationCost = 
      translationInputTokens * OPENAI_PRICING['gpt-4o'].input +
      translationOutputTokens * OPENAI_PRICING['gpt-4o'].output;

    totalInputTokens += translationInputTokens;
    totalOutputTokens += translationOutputTokens;

    apiCalls.push({
      description: '본문 번역',
      inputTokens: translationInputTokens,
      outputTokens: translationOutputTokens,
      cost: translationCost
    });
  }

  const openaiInputCost = totalInputTokens * OPENAI_PRICING['gpt-4o'].input;
  const openaiOutputCost = totalOutputTokens * OPENAI_PRICING['gpt-4o'].output;
  const openaiTotalCost = openaiInputCost + openaiOutputCost;

  // Firebase 비용 계산
  const firestoreWrites = config.firestoreWrites;
  const firestoreCost = firestoreWrites * FIREBASE_PRICING.firestore.write;

  const storageUploads = options.includePDF ? config.storageUploads + 2 : config.storageUploads; // 문제 + 정답 PDF
  const storageSizeKB = options.includePDF ? (config.storageSizeKB || 500) * 2 : (config.storageSizeKB || 0);
  const storageCost = storageSizeKB * 1024 * FIREBASE_PRICING.storage.upload; // KB to bytes

  const firebaseTotalCost = firestoreCost + storageCost;

  // 총 비용
  const totalCost = openaiTotalCost + firebaseTotalCost;

  return {
    openai: {
      totalTokens: {
        input: totalInputTokens,
        output: totalOutputTokens
      },
      cost: {
        input: openaiInputCost,
        output: openaiOutputCost,
        total: openaiTotalCost,
        totalKRW: openaiTotalCost * USD_TO_KRW
      },
      apiCalls
    },
    firebase: {
      firestore: {
        writes: firestoreWrites,
        cost: firestoreCost,
        costKRW: firestoreCost * USD_TO_KRW
      },
      storage: {
        uploads: storageUploads,
        sizeKB: storageSizeKB,
        cost: storageCost,
        costKRW: storageCost * USD_TO_KRW
      },
      total: {
        cost: firebaseTotalCost,
        costKRW: firebaseTotalCost * USD_TO_KRW
      }
    },
    total: {
      cost: totalCost,
      costKRW: totalCost * USD_TO_KRW
    }
  };
}

/**
 * 비용을 포맷팅하여 반환
 */
export function formatCost(cost: number, currency: 'USD' | 'KRW' = 'KRW'): string {
  if (currency === 'USD') {
    return `$${cost.toFixed(4)}`;
  }
  return `${Math.round(cost).toLocaleString()}원`;
}

/**
 * 토큰 수를 포맷팅하여 반환
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(2)}K`;
  }
  return tokens.toLocaleString();
}

