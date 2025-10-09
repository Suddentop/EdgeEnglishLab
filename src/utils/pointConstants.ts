// 포인트 시스템 정책 상수
export const POINT_POLICY = {
  // 문제 생성당 필요한 포인트
  PROBLEM_GENERATION_COST: 200,
  
  // 최소 결제 금액 (원)
  MINIMUM_PURCHASE_AMOUNT: 10000,
  
  // 1원당 획득 포인트 (1:1 비율)
  POINTS_PER_WON: 1,
  
  // 문제 유형별 이름
  PROBLEM_TYPE_NAMES: {
    '01': '문장 순서 테스트',
    '02': '독해 이해',
    '03': '어휘 단어',
    '04': '빈칸 추론 (구)',
    '05': '빈칸 추론 (문장)',
    '06': '문장 위치',
    '07': '주제 추론',
    '08': '제목 추론',
    '09': '문법 오류',
    '10': '다중 문법 오류'
  }
} as const;

// 포인트 거래 타입 상수
export const TRANSACTION_TYPES = {
  PURCHASE: 'purchase',    // 구매로 획득
  USAGE: 'usage',         // 사용
  REFUND: 'refund',       // 환불
  BONUS: 'bonus',         // 보너스
  ADMIN_ADD: 'admin_add', // 관리자 추가
  ADMIN_SUBTRACT: 'admin_subtract', // 관리자 차감
  ADMIN_SET: 'admin_set'  // 관리자 설정
} as const;

// 결제 상태 상수
export const PAYMENT_STATUS = {
  PENDING: 'pending',     // 대기중
  COMPLETED: 'completed', // 완료
  FAILED: 'failed',       // 실패
  REFUNDED: 'refunded'    // 환불됨
} as const;

// 문제 생성 상태 상수
export const PROBLEM_STATUS = {
  PENDING: 'pending',     // 대기중
  PROCESSING: 'processing', // 처리중
  COMPLETED: 'completed', // 완료
  FAILED: 'failed'        // 실패
} as const;
