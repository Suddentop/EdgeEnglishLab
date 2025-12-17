// 인쇄/저장용 문제지 헤더 기본값 및 전역 관리 유틸
//
// - DEFAULT_PRINT_HEADER: 신규 가입자 및 설정하지 않은 사용자의 기본 헤더
// - setCurrentPrintHeader: 현재 로그인 사용자의 헤더 문자열을 설정
// - getCurrentPrintHeader: 인쇄/저장 컴포넌트에서 현재 헤더 문자열을 읽을 때 사용
//
// React Context 바깥(새로운 ReactDOM root로 렌더링되는 인쇄 컴포넌트 포함)에서도
// 동일한 값을 공유하기 위해 모듈 레벨 변수로 관리합니다.

export const DEFAULT_PRINT_HEADER = 'EdgeEnglishLab | AI 영어 문제 생성 플랫폼';

let currentPrintHeader: string = DEFAULT_PRINT_HEADER;

/**
 * 현재 로그인 사용자의 문제지 헤더 문자열을 설정
 * - 빈 문자열이거나 null/undefined이면 기본 헤더로 되돌립니다.
 */
export const setCurrentPrintHeader = (value?: string | null): void => {
  const trimmed = (value ?? '').trim();
  currentPrintHeader = trimmed.length > 0 ? trimmed : DEFAULT_PRINT_HEADER;
};

/**
 * 인쇄(문제/정답), 저장(문제/정답) 헤더에서 사용할 현재 헤더 문자열을 반환
 */
export const getCurrentPrintHeader = (): string => {
  return currentPrintHeader;
};


