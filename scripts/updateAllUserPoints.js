/**
 * 모든 사용자의 포인트를 60,000으로 일괄 변경하는 스크립트
 * 
 * 사용법:
 * node scripts/updateAllUserPoints.js
 * 
 * 주의: 이 스크립트는 모든 사용자의 포인트를 변경합니다.
 */

const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin SDK 초기화
const serviceAccountPath = path.join(__dirname, '../functions/serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  console.log('✅ Firebase Admin SDK 초기화 완료');
} catch (error) {
  console.error('❌ Firebase Admin SDK 초기화 실패:', error.message);
  console.error('💡 functions/serviceAccountKey.json 파일이 필요합니다.');
  process.exit(1);
}

const TARGET_POINTS = 60000;

async function updateAllUserPoints() {
  try {
    console.log(`\n🔄 모든 사용자의 포인트를 ${TARGET_POINTS.toLocaleString()}P로 변경 시작...\n`);
    
    const db = admin.firestore();
    const usersRef = db.collection('users');
    
    // 모든 사용자 조회
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      console.log('⚠️ 사용자가 없습니다.');
      return;
    }
    
    console.log(`📊 총 ${snapshot.size}명의 사용자 발견\n`);
    
    const batch = db.batch();
    let updateCount = 0;
    const batchSize = 500; // Firestore 배치 제한
    
    snapshot.forEach((doc) => {
      const userData = doc.data();
      const currentPoints = userData.points || 0;
      
      // 포인트가 이미 목표값과 같으면 건너뛰기
      if (currentPoints === TARGET_POINTS) {
        console.log(`⏭️  ${userData.email || doc.id}: 이미 ${TARGET_POINTS.toLocaleString()}P (건너뜀)`);
        return;
      }
      
      batch.update(doc.ref, {
        points: TARGET_POINTS
      });
      
      updateCount++;
      console.log(`✅ ${userData.email || doc.id}: ${currentPoints.toLocaleString()}P → ${TARGET_POINTS.toLocaleString()}P`);
      
      // 배치 제한에 도달하면 커밋
      if (updateCount % batchSize === 0) {
        console.log(`\n💾 배치 커밋 중... (${updateCount}명 처리)\n`);
        batch.commit();
      }
    });
    
    // 남은 변경사항 커밋
    if (updateCount % batchSize !== 0) {
      console.log(`\n💾 최종 배치 커밋 중...\n`);
      await batch.commit();
    }
    
    console.log(`\n🎉 완료! 총 ${updateCount}명의 사용자 포인트가 ${TARGET_POINTS.toLocaleString()}P로 변경되었습니다.\n`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
updateAllUserPoints()
  .then(() => {
    console.log('✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });

