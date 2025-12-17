// 인증 세션 및 재인증 관련 유틸리티
// - 로그인 유지 기간(자동 로그인 7일)
// - 민감 작업(결제, 전화번호 변경 등)을 위한 재인증(30분) 체크

const LAST_AUTH_AT_KEY = 'engquiz_last_auth_at';
const REMEMBER_EXPIRE_AT_KEY = 'engquiz_auth_expire_at';
const REMEMBER_FLAG_KEY = 'engquiz_remember_me';

// 민감 작업 재인증 간격: 30분
export const REAUTH_INTERVAL_MS = 30 * 60 * 1000;
// 자동 로그인 유지 기간: 7일
export const REMEMBER_ME_DAYS = 7;

const nowMs = () => Date.now();

export const markLoginSession = (rememberMe: boolean) => {
  const now = nowMs();
  try {
    localStorage.setItem(LAST_AUTH_AT_KEY, String(now));
    localStorage.setItem(REMEMBER_FLAG_KEY, rememberMe ? 'true' : 'false');

    if (rememberMe) {
      const expireAt = now + REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(REMEMBER_EXPIRE_AT_KEY, String(expireAt));
    } else {
      localStorage.removeItem(REMEMBER_EXPIRE_AT_KEY);
    }
  } catch (e) {
    console.warn('markLoginSession 저장 중 로컬스토리지 오류:', e);
  }
};

export const markReauthenticated = () => {
  try {
    localStorage.setItem(LAST_AUTH_AT_KEY, String(nowMs()));
  } catch (e) {
    console.warn('markReauthenticated 저장 중 로컬스토리지 오류:', e);
  }
};

export const hasRememberSessionExpired = (): boolean => {
  try {
    const expireRaw = localStorage.getItem(REMEMBER_EXPIRE_AT_KEY);
    if (!expireRaw) return false;
    const expireAt = Number(expireRaw);
    if (!expireAt || Number.isNaN(expireAt)) return false;
    return nowMs() > expireAt;
  } catch (e) {
    console.warn('hasRememberSessionExpired 조회 중 로컬스토리지 오류:', e);
    return false;
  }
};

export const needsReauthentication = (): boolean => {
  try {
    const lastAuthRaw = localStorage.getItem(LAST_AUTH_AT_KEY);
    if (!lastAuthRaw) return true;
    const lastAuthAt = Number(lastAuthRaw);
    if (!lastAuthAt || Number.isNaN(lastAuthAt)) return true;
    return nowMs() - lastAuthAt > REAUTH_INTERVAL_MS;
  } catch (e) {
    console.warn('needsReauthentication 조회 중 로컬스토리지 오류:', e);
    return true;
  }
};

export const clearAuthSessionState = () => {
  try {
    localStorage.removeItem(LAST_AUTH_AT_KEY);
    localStorage.removeItem(REMEMBER_EXPIRE_AT_KEY);
    localStorage.removeItem(REMEMBER_FLAG_KEY);
  } catch (e) {
    console.warn('clearAuthSessionState 실행 중 로컬스토리지 오류:', e);
  }
};


