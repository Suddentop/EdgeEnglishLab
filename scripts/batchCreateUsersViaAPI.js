/**
 * Cloud Function API를 통한 테스트 사용자 일괄 생성 스크립트
 * 
 * 사용법:
 * 1. 관리자 UID를 ADMIN_UID 변수에 입력
 * 2. node scripts/batchCreateUsersViaAPI.js
 * 
 * 또는 관리자 UID를 인자로 전달:
 * node scripts/batchCreateUsersViaAPI.js YOUR_ADMIN_UID
 */

const fetch = require('node-fetch');

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

// ⚠️ 관리자 UID (명령줄 인자로 전달하거나 여기에 직접 입력)
const ADMIN_UID = process.argv[2] || 'YOUR_ADMIN_UID_HERE';

const API_URL = 'https://us-central1-edgeenglishlab.cloudfunctions.net/batchCreateUsersByAdmin';

async function batchCreateUsers() {
  if (ADMIN_UID === 'YOUR_ADMIN_UID_HERE') {
    console.error('❌ 오류: ADMIN_UID를 설정해주세요!');
    console.log('스크립트 파일의 ADMIN_UID 변수에 관리자 UID를 입력하세요.');
    process.exit(1);
  }

  console.log(`\n🚀 Cloud Function을 통한 일괄 사용자 생성 시작: ${users.length}명\n`);
  console.log(`관리자 UID: ${ADMIN_UID}\n`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        adminUid: ADMIN_UID,
        users: users
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ 일괄 생성 실패:', result.message);
      process.exit(1);
    }

    // 결과 출력
    console.log(`\n📊 일괄 생성 완료\n`);
    console.log(`✅ 성공: ${result.results.success.length}명`);
    console.log(`❌ 실패: ${result.results.failed.length}명\n`);

    if (result.results.success.length > 0) {
      console.log('성공한 사용자:');
      result.results.success.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.name}) - ${user.userId}`);
      });
    }

    if (result.results.failed.length > 0) {
      console.log('\n실패한 사용자:');
      result.results.failed.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} - ${user.reason}`);
      });
    }

    console.log('\n✨ 작업 완료!\n');
  } catch (error) {
    console.error('❌ 스크립트 실행 오류:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
batchCreateUsers();

