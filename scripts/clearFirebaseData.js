const admin = require('firebase-admin');

// Firebase Admin SDK 초기화 (환경 변수 사용)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://edgeenglishlab-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // 삭제할 문서가 없으면 완료
    resolve();
    return;
  }

  // 배치 삭제
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  // 재귀적으로 다음 배치 처리
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function clearAllData() {
  console.log('🔥 Firebase 데이터 삭제 시작...');
  
  try {
    // 1. packageQuizzes 컬렉션 삭제
    console.log('📦 packageQuizzes 컬렉션 삭제 중...');
    await deleteCollection('packageQuizzes');
    console.log('✅ packageQuizzes 컬렉션 삭제 완료');

    // 2. users 컬렉션에서 packageQuizzes 서브컬렉션 삭제
    console.log('👥 users 컬렉션의 packageQuizzes 서브컬렉션 삭제 중...');
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const packageQuizzesRef = userDoc.ref.collection('packageQuizzes');
      await deleteCollection(`users/${userDoc.id}/packageQuizzes`);
      console.log(`✅ 사용자 ${userDoc.id}의 packageQuizzes 삭제 완료`);
    }

    // 3. 기타 관련 컬렉션들 삭제 (필요시)
    const collectionsToDelete = [
      'quizResults',
      'userProgress',
      'temporaryQuizzes'
    ];

    for (const collectionName of collectionsToDelete) {
      try {
        console.log(`🗑️ ${collectionName} 컬렉션 삭제 중...`);
        await deleteCollection(collectionName);
        console.log(`✅ ${collectionName} 컬렉션 삭제 완료`);
      } catch (error) {
        console.log(`⚠️ ${collectionName} 컬렉션 삭제 중 오류 (컬렉션이 존재하지 않을 수 있음):`, error.message);
      }
    }

    console.log('🎉 모든 데이터 삭제 완료!');
    
  } catch (error) {
    console.error('❌ 데이터 삭제 중 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
clearAllData();
