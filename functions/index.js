/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const OpenAI = require('openai');

admin.initializeApp();

// CORS 설정
const cors = require('cors')({ origin: true });

// OpenAI 설정 (API 키가 있는 경우에만)
let openai = null;
try {
  const apiKey = functions.config().openai?.api_key || process.env.OPENAI_API_KEY;
  if (apiKey) {
    openai = new OpenAI({ apiKey });
  }
} catch (error) {
  console.log('OpenAI API 키가 설정되지 않았습니다.');
}

/**
 * 관리자가 사용자 비밀번호를 변경하는 함수 (HTTP 요청 방식)
 */
exports.changeUserPasswordByAdmin = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { targetUserId, newPassword, adminUid } = req.body;

      if (!targetUserId || !newPassword || !adminUid) {
        res.status(400).json({ success: false, message: '필수 매개변수가 누락되었습니다.' });
        return;
      }

      console.log('관리자 비밀번호 변경:', adminUid, '->', targetUserId);

      // 관리자 권한 확인
      const adminUserDoc = await admin.firestore().collection('users').doc(adminUid).get();
      
      if (!adminUserDoc.exists || adminUserDoc.data().role !== 'admin') {
        res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
        return;
      }

      // 대상 사용자 확인
      const targetUserDoc = await admin.firestore().collection('users').doc(targetUserId).get();
      
      if (!targetUserDoc.exists) {
        res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        return;
      }

      // Firebase Auth에서 비밀번호 변경
      await admin.auth().updateUser(targetUserId, {
        password: newPassword
      });

      // 비밀번호 변경 이력 기록
      await admin.firestore().collection('passwordHistory').add({
        targetUserId: targetUserId,
        adminId: adminUid,
        changedAt: admin.firestore.FieldValue.serverTimestamp(),
        reason: '관리자에 의한 비밀번호 변경'
      });

      console.log('비밀번호 변경 완료:', targetUserId);

      res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      res.status(500).json({ success: false, message: '비밀번호 변경 중 오류가 발생했습니다.', error: error.message });
    }
  });
});

/**
 * 관리자가 사용자 비밀번호를 변경하는 함수 (기존 onCall 방식 유지)
 */
exports.changeUserPassword = functions.https.onCall(async (data, context) => {
  console.log('changeUserPassword 호출됨');
  console.log('context.auth:', context.auth);
  console.log('data:', data);
  
  // 인증 확인 - 더 관대한 방식으로 변경
  if (!context.auth) {
    console.log('인증 실패: context.auth가 null');
    console.log('context 전체:', JSON.stringify(context, null, 2));
    throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  
  console.log('인증 성공, 사용자 ID:', context.auth.uid);
  console.log('사용자 토큰:', context.auth.token);

  const { targetUserId, newPassword } = data;

  if (!targetUserId || !newPassword) {
    throw new functions.https.HttpsError('invalid-argument', '필수 매개변수가 누락되었습니다.');
  }

  try {
    // 관리자 권한 확인
    const adminUserDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    
    if (!adminUserDoc.exists || adminUserDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', '관리자 권한이 필요합니다.');
    }

    // 대상 사용자 확인
    const targetUserDoc = await admin.firestore().collection('users').doc(targetUserId).get();
    
    if (!targetUserDoc.exists) {
      throw new functions.https.HttpsError('not-found', '사용자를 찾을 수 없습니다.');
    }

    // Firebase Auth에서 비밀번호 변경
    await admin.auth().updateUser(targetUserId, {
      password: newPassword
    });

    // 비밀번호 변경 이력 기록
    await admin.firestore().collection('passwordHistory').add({
      targetUserId: targetUserId,
      adminId: context.auth.uid,
      changedAt: admin.firestore.FieldValue.serverTimestamp(),
      reason: '관리자에 의한 비밀번호 변경'
    });

    return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' };
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    throw new functions.https.HttpsError('internal', '비밀번호 변경 중 오류가 발생했습니다.');
  }
});

/**
 * 영어 단어와 뜻 추출 API
 */
exports.extractWords = functions.https.onRequest(async (req, res) => {
  // CORS 설정
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: '텍스트가 필요합니다.' });
      return;
    }

    if (!openai) {
      res.status(503).json({ error: 'OpenAI API가 설정되지 않았습니다.' });
      return;
    }

    // OpenAI API를 사용하여 영어 단어와 한글 뜻 추출
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "당신은 영어 교육 전문가입니다. 주어진 텍스트에서 영어 단어와 그에 해당하는 한글 뜻을 추출해주세요. 응답은 JSON 형식으로 제공해주세요."
        },
        {
          role: "user",
          content: `다음 텍스트에서 영어 단어와 한글 뜻을 추출해주세요:\n\n${text}\n\n응답 형식: [{"english": "단어", "korean": "뜻"}]`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // JSON 응답 파싱 시도
    let words;
    try {
      // JSON 코드 블록이 있는 경우 추출
      const jsonMatch = responseText.match(/\[.*\]/s);
      if (jsonMatch) {
        words = JSON.parse(jsonMatch[0]);
      } else {
        // 직접 파싱 시도
        words = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      // 수동으로 단어 추출
      words = extractWordsManually(text);
    }

    res.json({ words });
  } catch (error) {
    console.error('단어 추출 오류:', error);
    res.status(500).json({ error: '단어 추출 중 오류가 발생했습니다.' });
  }
});

/**
 * OCR API - 이미지에서 텍스트 추출
 */
exports.ocr = functions.https.onRequest(async (req, res) => {
  // CORS 설정
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    if (!openai) {
      res.status(503).json({ error: 'OpenAI API가 설정되지 않았습니다.' });
      return;
    }

    // multipart/form-data 처리
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage() });
    
    upload.single('image')(req, res, async (err) => {
      if (err) {
        res.status(400).json({ error: '이미지 업로드 오류' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: '이미지 파일이 필요합니다.' });
        return;
      }

      try {
        // OpenAI Vision API를 사용하여 이미지에서 텍스트 추출
        const response = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "이 이미지에서 영어 텍스트를 추출해주세요. 텍스트만 반환하고 다른 설명은 하지 마세요."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000
        });

        const text = response.choices[0]?.message?.content || '';
        res.json({ text });
      } catch (visionError) {
        console.error('Vision API 오류:', visionError);
        res.status(500).json({ error: '이미지 처리 중 오류가 발생했습니다.' });
      }
    });
  } catch (error) {
    console.error('OCR 오류:', error);
    res.status(500).json({ error: 'OCR 처리 중 오류가 발생했습니다.' });
  }
});

/**
 * Excel 파일을 텍스트로 변환 API
 */
exports.excelToText = functions.https.onRequest(async (req, res) => {
  // CORS 설정
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // multipart/form-data 처리
    const multer = require('multer');
    const upload = multer({ storage: multer.memoryStorage() });
    
    upload.single('excel')(req, res, async (err) => {
      if (err) {
        res.status(400).json({ error: 'Excel 파일 업로드 오류' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'Excel 파일이 필요합니다.' });
        return;
      }

      try {
        // Excel 파일을 텍스트로 변환
        const XLSX = require('xlsx');
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        
        let text = '';
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          jsonData.forEach(row => {
            if (Array.isArray(row)) {
              row.forEach(cell => {
                if (cell && typeof cell === 'string') {
                  text += cell + ' ';
                }
              });
            }
          });
        });

        res.json({ text: text.trim() });
      } catch (excelError) {
        console.error('Excel 처리 오류:', excelError);
        res.status(500).json({ error: 'Excel 파일 처리 중 오류가 발생했습니다.' });
      }
    });
  } catch (error) {
    console.error('Excel 변환 오류:', error);
    res.status(500).json({ error: 'Excel 변환 중 오류가 발생했습니다.' });
  }
});

// 전화번호 기반 로직 제거됨 - 모든 사용자는 이제 이메일 기반으로 관리됨

/**
 * 더 이상 사용하지 않음 - 모든 사용자는 이메일 기반으로 관리됨
 */
exports.migrateUserToRealEmail = functions.https.onCall(async (data, context) => {
  throw new functions.https.HttpsError('unavailable', '이 기능은 더 이상 사용되지 않습니다. 모든 사용자는 이메일 기반으로 관리됩니다.');
});

/**
 * 더 이상 사용하지 않음 - 모든 사용자는 이메일 기반으로 관리됨
 */
exports.sendPasswordResetForLegacyUser = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    res.status(410).json({ 
      success: false, 
      message: '이 기능은 더 이상 사용되지 않습니다. 모든 사용자는 이메일 기반으로 관리됩니다.' 
    });
  });
});

/**
 * 더 이상 사용하지 않음 - 모든 사용자는 이메일 기반으로 관리됨
 */
exports.migrateAllLegacyUsers = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    res.status(410).json({ 
      success: false, 
      message: '이 기능은 더 이상 사용되지 않습니다. 모든 사용자는 이메일 기반으로 관리됩니다.' 
    });
  });
});

/**
 * 더 이상 사용하지 않음 - 모든 사용자는 이메일 기반으로 관리됨
 */
exports.migrateSpecificUser = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    res.status(410).json({ 
      success: false, 
      message: '이 기능은 더 이상 사용되지 않습니다. 모든 사용자는 이메일 기반으로 관리됩니다.' 
    });
  });
});

/**
 * 관리자가 사용자를 삭제하는 함수 (Firebase Auth + Firestore)
 */
exports.deleteUserByAdmin = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { userId, adminUid } = req.body;
      
      if (!userId || !adminUid) {
        res.status(400).json({ success: false, message: 'userId와 adminUid가 필요합니다.' });
        return;
      }
      
      console.log(`관리자 사용자 삭제: ${adminUid} -> ${userId}`);
      
      // 1. 관리자 권한 확인
      const adminDoc = await admin.firestore().collection('users').doc(adminUid).get();
      if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
        res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
        return;
      }
      
      // 2. Firebase Auth에서 사용자 삭제
      try {
        await admin.auth().deleteUser(userId);
        console.log(`Firebase Auth 사용자 삭제 완료: ${userId}`);
      } catch (error) {
        console.log(`Firebase Auth 사용자 삭제 실패 (이미 삭제되었을 수 있음): ${error.message}`);
      }
      
      // 3. Firestore에서 사용자 비활성화
      await admin.firestore().collection('users').doc(userId).update({
        isActive: false,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedBy: adminUid
      });
      
      console.log(`Firestore 사용자 비활성화 완료: ${userId}`);
      
      res.json({
        success: true,
        message: '사용자가 성공적으로 삭제되었습니다.'
      });
      
    } catch (error) {
      console.error('사용자 삭제 오류:', error);
      res.status(500).json({ success: false, message: '사용자 삭제 중 오류가 발생했습니다.', error: error.message });
    }
  });
});

/**
 * 관리자가 사용자 정보를 업데이트하는 함수
 */
exports.updateUserByAdmin = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { userId, adminUid, userData } = req.body;
      
      if (!userId || !adminUid || !userData) {
        res.status(400).json({ success: false, message: 'userId, adminUid, userData가 필요합니다.' });
        return;
      }
      
      console.log(`관리자 사용자 정보 업데이트: ${adminUid} -> ${userId}`);
      
      // 1. 관리자 권한 확인
      const adminDoc = await admin.firestore().collection('users').doc(adminUid).get();
      if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
        res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
        return;
      }
      
      // 2. Firestore에서 사용자 정보 업데이트
      await admin.firestore().collection('users').doc(userId).update({
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: adminUid
      });
      
      console.log(`Firestore 사용자 정보 업데이트 완료: ${userId}`);
      
      res.json({
        success: true,
        message: '사용자 정보가 성공적으로 업데이트되었습니다.'
      });
      
    } catch (error) {
      console.error('사용자 정보 업데이트 오류:', error);
      res.status(500).json({ success: false, message: '사용자 정보 업데이트 중 오류가 발생했습니다.', error: error.message });
    }
  });
});

/**
 * 사용자 계정 상태 확인 함수 (이메일 기반)
 */
exports.checkUserAccountStatus = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const { email } = req.body;
      
      if (!email) {
        res.status(400).json({ success: false, message: '이메일이 필요합니다.' });
        return;
      }
      
      console.log(`사용자 계정 상태 확인: ${email}`);
      
      const results = {
        email: email,
        firebaseAuthAccount: null,
        firestoreAccount: null
      };
      
      // 1. Firebase Auth에서 확인
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        results.firebaseAuthAccount = {
          email: email,
          uid: userRecord.uid,
          exists: true,
          emailVerified: userRecord.emailVerified
        };
      } catch (error) {
        results.firebaseAuthAccount = {
          email: email,
          exists: false,
          error: error.message
        };
      }
      
      // 2. Firestore에서 확인
      try {
        const usersSnapshot = await admin.firestore().collection('users')
          .where('email', '==', email)
          .limit(1)
          .get();
        
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          results.firestoreAccount = {
            uid: userDoc.id,
            data: userDoc.data(),
            exists: true
          };
        } else {
          results.firestoreAccount = { exists: false };
        }
      } catch (error) {
        results.firestoreAccount = {
          exists: false,
          error: error.message
        };
      }
      
      console.log('사용자 계정 상태 확인 완료:', results);
      
      res.json({
        success: true,
        message: '사용자 계정 상태 확인 완료',
        results: results
      });
      
    } catch (error) {
      console.error('사용자 계정 상태 확인 오류:', error);
      res.status(500).json({ success: false, message: '계정 상태 확인 중 오류가 발생했습니다.', error: error.message });
    }
  });
});

/**
 * 삭제된 사용자들을 Firestore에서 완전히 제거하는 함수
 */
exports.cleanupDeletedUsers = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      console.log('=== 삭제된 사용자 정리 시작 ===');
      
      // 1. Firestore에서 모든 사용자 조회
      const usersSnapshot = await admin.firestore().collection('users').get();
      const results = [];
      
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        const userId = doc.id;
        
        try {
          // 2. Firebase Auth에서 해당 사용자가 존재하는지 확인
          await admin.auth().getUser(userId);
          console.log(`사용자 존재: ${userData.email} (${userId})`);
        } catch (error) {
          if (error.code === 'auth/user-not-found') {
            console.log(`삭제된 사용자 발견: ${userData.email} (${userId})`);
            
            // 3. Firestore에서 사용자 문서 삭제
            await admin.firestore().collection('users').doc(userId).delete();
            
            results.push({
              email: userData.email,
              uid: userId,
              status: 'deleted_from_firestore',
              message: 'Firestore에서 삭제됨'
            });
            
            console.log(`Firestore에서 삭제 완료: ${userData.email}`);
          } else {
            console.error(`사용자 확인 오류 (${userData.email}):`, error);
            results.push({
              email: userData.email,
              uid: userId,
              status: 'error',
              message: error.message
            });
          }
        }
      }
      
      console.log('=== 삭제된 사용자 정리 완료 ===');
      
      res.json({
        success: true,
        message: '삭제된 사용자 정리가 완료되었습니다.',
        results: results
      });
      
    } catch (error) {
      console.error('삭제된 사용자 정리 오류:', error);
      res.status(500).json({ success: false, message: '정리 중 오류가 발생했습니다.', error: error.message });
    }
  });
});

/**
 * 수동으로 단어 추출하는 함수
 */
function extractWordsManually(text) {
  const words = [];
  const lines = text.split('\n');
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine) {
      // 영어 단어와 한글 뜻이 구분자로 나뉘어 있는 경우
      const parts = trimmedLine.split(/[-\s]+/);
      if (parts.length >= 2) {
        const english = parts[0].trim();
        const korean = parts.slice(1).join(' ').trim();
        
        if (english && korean && /^[a-zA-Z]+$/.test(english)) {
          words.push({ english, korean });
        }
      }
    }
  });
  
  return words;
}

/**
 * 6개월 이상 된 문제 생성 내역 자동 삭제 스케줄러
 * 매일 오전 3시(한국시간 기준)에 실행
 */
exports.cleanupOldQuizHistory = functions.pubsub.schedule('0 3 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    try {
      console.log('=== 6개월 이상 된 문제 생성 내역 정리 시작 ===');
      
      const now = admin.firestore.Timestamp.now();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoTimestamp = admin.firestore.Timestamp.fromDate(sixMonthsAgo);
      
      // createdAt이 6개월 이전인 데이터 조회
      const quizHistoryRef = admin.firestore().collection('quizHistory');
      const oldDocsQuery = quizHistoryRef
        .where('createdAt', '<', sixMonthsAgoTimestamp);
      
      const snapshot = await oldDocsQuery.get();
      
      if (snapshot.empty) {
        console.log('삭제할 6개월 이상 된 내역이 없습니다.');
        return null;
      }
      
      // 배치로 삭제 (Firestore 제한: 한 번에 최대 500개)
      const batchSize = 500;
      const docs = snapshot.docs;
      let deletedCount = 0;
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = admin.firestore().batch();
        const batchDocs = docs.slice(i, i + batchSize);
        
        batchDocs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        deletedCount += batchDocs.length;
        console.log(`배치 ${Math.floor(i / batchSize) + 1}: ${batchDocs.length}개 삭제 완료`);
      }
      
      console.log(`=== 총 ${deletedCount}개의 6개월 이상 된 내역 삭제 완료 ===`);
      return null;
    } catch (error) {
      console.error('6개월 이상 된 내역 정리 오류:', error);
      throw error;
    }
  });
