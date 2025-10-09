// 사용자 관련 타입
export interface User {
  uid: string;
  name: string;
  nickname: string;
  email: string;
  phoneNumber?: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  points: number; // 보유 포인트
  totalSpent: number; // 총 결제 금액
  currentPoints: number; // 현재 보유 포인트 (points와 동일)
  totalPaidPoints: number; // 누적 충전 포인트
}

// 포인트 거래 내역 타입
export interface PointTransaction {
  id: string;
  userId: string;
  type: 'purchase' | 'usage' | 'refund' | 'bonus';
  amount: number; // 포인트 양 (양수: 획득, 음수: 사용)
  description: string;
  createdAt: Date;
  relatedId?: string; // 관련 결제 ID 또는 문제 생성 ID
}

// 결제 정보 타입
export interface Payment {
  id: string;
  userId: string;
  amount: number; // 결제 금액 (원)
  pointsEarned: number; // 획득 포인트
  paymentMethod: 'card' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  cardInfo?: {
    last4: string;
    brand: string;
  };
  createdAt: Date;
  completedAt?: Date;
}

// 문제 생성 요청 타입
export interface ProblemGenerationRequest {
  id: string;
  userId: string;
  problemType: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10';
  problemTypeName: string;
  pointsRequired: number; // 필요한 포인트 (200)
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  problemData?: any; // 생성된 문제 데이터
}

// 포인트 사용 정책 타입
export interface PointPolicy {
  problemGenerationCost: number; // 문제 1건 생성당 필요한 포인트
  minimumPurchaseAmount: number; // 최소 결제 금액
  pointsPerWon: number; // 1원당 획득 포인트
}

// 관리자 포인트 관리 타입
export interface AdminPointAction {
  id: string;
  adminId: string;
  targetUserId: string;
  action: 'add' | 'subtract' | 'set';
  amount: number;
  reason: string;
  createdAt: Date;
}

// 단락 관련 타입
export interface Paragraph {
  id: string;
  label: string;
  content: string;
  originalOrder?: number; // 원본 순서 추적
}

// 퀴즈 관련 타입
export interface Quiz {
  id: string;
  originalText?: string; // 원본 텍스트
  shuffledParagraphs: Paragraph[]; // 섞인 단락들
  choices: string[][]; // 선택지들
  answerIndex: number; // 정답 인덱스
  correctOrder: string[]; // 정답 순서
  passage?: string;
  translation?: string;
  originalWords?: string[];
  transformedWords?: string[];
  wrongIndexes?: number[];
  options?: number[];
  paragraphs?: Paragraph[];
  sentences?: string[];
  translations?: string[];
}

// AI 단락 응답 타입
export interface AIParagraphResponse {
  success: boolean;
  paragraphs?: string[]; // AI가 분할한 단락들
  shuffledParagraphs?: string[]; // AI가 섞은 단락들
  error?: string; // 에러 메시지
  originalText?: string; // 원본 텍스트
}

// Work_11 문장별 해석 문제 타입
export interface SentenceTranslationQuiz {
  sentences: string[];      // 영어 문장들
  translations: string[];   // 각 문장의 번역
  quizText: string;        // 퀴즈 텍스트
}

// 토스페이먼츠 관련 타입
declare global {
  interface Window {
    TossPayments: (clientKey: string) => any;
  }
}
