/**
 * 테스트 사용자 일괄 생성 스크립트
 * 
 * 사용법:
 * node scripts/batchCreateUsers.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../functions/serviceAccountKey.json'); // Firebase Admin SDK 키 파일 경로

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

// 테스트 사용자 목록
const users = [
  { email: 'edgeuser03@naver.com', password: '@testpw00', name: '테스트유저 #03', nickname: 'edgeuser03' },
  { email: 'edgeuser04@naver.com', password: '@testpw00', name: '테스트유저 #04', nickname: 'edgeuser04' },
  { email: 'edgeuser05@naver.com', password: '@testpw00', name: '테스트유저 #05', nickname: 'edgeuser05' },
  { email: 'edgeuser06@naver.com', password: '@testpw00', name: '테스트유저 #06', nickname: 'edgeuser06' },
  { email: 'edgeuser07@naver.com', password: '@testpw00', name: '테스트유저 #07', nickname: 'edgeuser07' },
  { email: 'edgeuser08@naver.com', password: '@testpw00', name: '테스트유저 #08', nickname: 'edgeuser08' },
  { email: 'edgeuser09@naver.com', password: '@testpw00', name: '테스트유저 #09', nickname: 'edgeuser09' },
  { email: 'edgeuser10@naver.com', password: '@testpw00', name: '테스트유저 #10', nickname: 'edgeuser10' },
  { email: 'edgeuser11@naver.com', password: '@testpw00', name: '테스트유저 #11', nickname: 'edgeuser11' },
  { email: 'edgeuser12@naver.com', password: '@testpw00', name: '테스트유저 #12', nickname: 'edgeuser12' },
  { email: 'edgeuser13@naver.com', password: '@testpw00', name: '테스트유저 #13', nickname: 'edgeuser13' },
  { email: 'edgeuser14@naver.com', password: '@testpw00', name: '테스트유저 #14', nickname: 'edgeuser14' },
  { email: 'edgeuser15@naver.com', password: '@testpw00', name: '테스트유저 #15', nickname: 'edgeuser15' },
  { email: 'edgeuser16@naver.com', password: '@testpw00', name: '테스트유저 #16', nickname: 'edgeuser16' },
  { email: 'edgeuser17@naver.com', password: '@testpw00', name: '테스트유저 #17', nickname: 'edgeuser17' },
  { email: 'edgeuser18@naver.com', password: '@testpw00', name: '테스트유저 #18', nickname: 'edgeuser18' },
  { email: 'edgeuser19@naver.com', password: '@testpw00', name: '테스트유저 #19', nickname: 'edgeuser19' },
  { email: 'edgeuser20@naver.com', password: '@testpw00', name: '테스트유저 #20', nickname: 'edgeuser20' },
  { email: 'edgeuser21@naver.com', password: '@testpw00', name: '테스트유저 #21', nickname: 'edgeuser21' },
  { email: 'edgeuser22@naver.com', password: '@testpw00', name: '테스트유저 #22', nickname: 'edgeuser22' }
];

const defaultPoints = 10000;
const defaultPrintHeader = 'EdgeEnglishLab | AI 영어 문제 생성 플랫폼';
const adminUid = 'YOUR_ADMIN_UID'; // 관리자 UID를 여기에 입력하세요

async function batchCreateUsers() {
  console.log(`\n🚀 일괄 사용자 생성 시작: ${users.length}명\n`);

  const results = {
    success: [],
    failed: []
  };

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const { email, password, name, nickname } = user;

    try {
      console.log(`[${i + 1}/${users.length}] ${email} 생성 중...`);

      // 이메일 중복 확인
      try {
        await auth.getUserByEmail(email);
        console.log(`  ❌ 이미 존재하는 이메일: ${email}`);
        results.failed.push({
          email,
          reason: '이미 존재하는 이메일입니다.'
        });
        continue;
      } catch (error) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      // Firebase Auth에 사용자 생성
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        emailVerified: true
      });

      console.log(`  ✅ Firebase Auth 생성 완료: ${userRecord.uid}`);

      // Firestore에 사용자 정보 저장
      await db.collection('users').doc(userRecord.uid).set({
        name: name,
        nickname: nickname,
        email: email,
        phoneNumber: '',
        role: 'user',
        isActive: true,
        points: defaultPoints,
        totalPaidPoints: 0,
        usedPoints: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: adminUid,
        printHeader: defaultPrintHeader
      });

      console.log(`  ✅ Firestore 저장 완료: ${userRecord.uid}`);

      results.success.push({
        email,
        userId: userRecord.uid,
        name
      });

      // API 제한을 피하기 위해 약간의 지연
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`  ❌ 생성 실패: ${email}`, error.message);
      let errorMessage = '알 수 없는 오류';
      if (error.code === 'auth/email-already-exists') {
        errorMessage = '이미 존재하는 이메일입니다.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '유효하지 않은 이메일 형식입니다.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      results.failed.push({
        email,
        reason: errorMessage
      });
    }
  }

  // 결과 출력
  console.log(`\n📊 일괄 생성 완료\n`);
  console.log(`✅ 성공: ${results.success.length}명`);
  console.log(`❌ 실패: ${results.failed.length}명\n`);

  if (results.success.length > 0) {
    console.log('성공한 사용자:');
    results.success.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.name}) - ${user.userId}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('\n실패한 사용자:');
    results.failed.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - ${user.reason}`);
    });
  }

  console.log('\n✨ 작업 완료!\n');

  // 프로세스 종료
  process.exit(0);
}

// 스크립트 실행
batchCreateUsers().catch((error) => {
  console.error('❌ 스크립트 실행 오류:', error);
  process.exit(1);
});

