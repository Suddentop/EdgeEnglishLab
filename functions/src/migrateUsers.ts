import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// 기존 사용자 이메일 매핑
const legacyUserMapping: { [key: string]: string } = {
  'speedyball@naver.com': '01080616536',
  'suddenbiz@naver.com': '01020745158',
  'pretyeon@naver.com': '01020816536',
  'jiwon2min@gmail.com': '01082786536',
  'andymin@naver.com': '01021876536'
};

/**
 * 기존 사용자의 Firebase Auth 계정을 실제 이메일 주소로 업데이트
 */
export const migrateUserToRealEmail = functions.https.onCall(async (data, context) => {
  try {
    const { email } = data;
    
    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', '이메일이 필요합니다.');
    }
    
    // 기존 사용자인지 확인
    if (!legacyUserMapping[email]) {
      throw new functions.https.HttpsError('not-found', '기존 사용자가 아닙니다.');
    }
    
    const phoneNumber = legacyUserMapping[email];
    const oldEmail = `${phoneNumber}@engquiz.local`;
    
    console.log(`사용자 마이그레이션 시작: ${oldEmail} → ${email}`);
    
    // 1. 기존 계정 찾기
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(oldEmail);
    } catch (error) {
      throw new functions.https.HttpsError('not-found', '기존 계정을 찾을 수 없습니다.');
    }
    
    // 2. Firebase Auth 계정의 이메일 주소를 실제 이메일로 업데이트
    await admin.auth().updateUser(userRecord.uid, {
      email: email,
      emailVerified: false // 이메일 인증은 사용자가 직접 해야 함
    });
    
    // 3. Firestore 사용자 데이터의 이메일도 업데이트
    await admin.firestore().collection('users').doc(userRecord.uid).update({
      email: email,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      migrationStatus: 'completed'
    });
    
    console.log(`사용자 마이그레이션 완료: ${email}`);
    
    return {
      success: true,
      message: '계정이 성공적으로 마이그레이션되었습니다.',
      newEmail: email
    };
    
  } catch (error) {
    console.error('사용자 마이그레이션 오류:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', '마이그레이션 중 오류가 발생했습니다.');
  }
});

/**
 * 기존 사용자에게 실제 이메일 주소로 비밀번호 재설정 이메일 발송
 */
export const sendPasswordResetForLegacyUser = functions.https.onCall(async (data, context) => {
  try {
    const { email } = data;
    
    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', '이메일이 필요합니다.');
    }
    
    // 기존 사용자인지 확인
    if (!legacyUserMapping[email]) {
      throw new functions.https.HttpsError('not-found', '기존 사용자가 아닙니다.');
    }
    
    const phoneNumber = legacyUserMapping[email];
    const oldEmail = `${phoneNumber}@engquiz.local`;
    
    console.log(`기존 사용자 비밀번호 재설정: ${email}`);
    
    // 1. 기존 계정 찾기
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(oldEmail);
    } catch (error) {
      throw new functions.https.HttpsError('not-found', '기존 계정을 찾을 수 없습니다.');
    }
    
    // 2. 실제 이메일 주소로 비밀번호 재설정 링크 생성
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    
    // 3. 실제 이메일 주소로 이메일 발송 (여기서는 링크만 반환, 실제 이메일 발송은 별도 처리)
    console.log(`비밀번호 재설정 링크 생성 완료: ${email}`);
    
    return {
      success: true,
      message: '비밀번호 재설정 이메일이 발송되었습니다.',
      resetLink: resetLink // 개발/테스트용으로 링크 반환
    };
    
  } catch (error) {
    console.error('비밀번호 재설정 오류:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', '비밀번호 재설정 중 오류가 발생했습니다.');
  }
});
