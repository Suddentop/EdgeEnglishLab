/**
 * 관리자 권한 관련 유틸리티 함수들 (JSX 미사용)
 */

/**
 * 사용자가 관리자인지 확인
 */
export const isAdmin = (userData: any): boolean => {
  return userData?.role === 'admin';
};

/**
 * 관리자 권한이 필요한 작업에 대한 권한 확인
 */
export const checkAdminPermission = (userData: any): boolean => {
  if (!userData) return false;
  return isAdmin(userData);
};
