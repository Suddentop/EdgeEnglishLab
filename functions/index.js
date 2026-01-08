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
const axios = require('axios');

// .env 파일 로드 (로컬 개발 및 프로덕션 환경 모두)
// Firebase Functions 배포 시 .env 파일도 함께 배포되며, dotenv로 로드해야 함
require('dotenv').config();

admin.initializeApp();

// CORS 설정
const cors = require('cors')({ origin: true });

// OpenAI 클라이언트 캐시 변수
let openai = null;

// OpenAI 설정 (API 키가 있는 경우에만)
// v2 환경에서는 함수 호출 시점에 config를 읽어야 함
function getOpenAIClient() {
  if (openai) {
    return openai;      
  }
  
  try {
    let apiKey;
    let apiKeySource = 'none';
    
    // 먼저 환경 변수 확인 (v2 방식, 우선순위 1)
    if (process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY;
      apiKeySource = 'environment variable (process.env.OPENAI_API_KEY)';
      console.log('✅ API Key from environment variable');
    }
    
    // 환경 변수가 없으면 functions.config() 확인 (v1 방식, 우선순위 2)
    if (!apiKey) {
      try {
        const config = functions.config();
        apiKey = config.openai?.api_key;
        if (apiKey) {
          apiKeySource = 'functions.config()';
          console.log('✅ API Key from functions.config()');
        }
      } catch (configError) {
        console.log('⚠️ functions.config() 접근 실패:', configError.message);
      }
    }
    
    if (apiKey) {
      // API 키 일부만 로그에 표시 (보안)
      const maskedKey = apiKey.length > 12 
        ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
        : '****';
      console.log(`✅ API Key loaded from ${apiKeySource}`);
      console.log(`   Key preview: ${maskedKey} (length: ${apiKey.length})`);
      
      openai = new OpenAI({ apiKey });
      console.log('✅ OpenAI client initialized successfully');
      return openai;
    } else {
      console.error('❌ OpenAI API 키가 설정되지 않았습니다.');
      console.error('   확인 사항:');
      console.error('   - process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '설정됨' : '없음');
      try {
        const config = functions.config();
        console.error('   - functions.config().openai?.api_key:', config.openai?.api_key ? '설정됨' : '없음');
      } catch (e) {
        console.error('   - functions.config() 접근 실패');
      }
      return null;
    }
  } catch (error) {
    console.error('❌ OpenAI API 키 설정 오류:', error.message);
    return null;
  }
}

/**
 * Toss Payments 설정 헬퍼
 */
function getTossConfig() {
  const config = functions.config();
  const tossConfig = config?.toss || {};

  const secretKey = process.env.TOSS_SECRET_KEY || tossConfig.secret_key;
  const securityKey = process.env.TOSS_SECURITY_KEY || tossConfig.security_key;
  const clientKey = process.env.TOSS_CLIENT_KEY || tossConfig.client_key;

  return { secretKey, securityKey, clientKey };
}

function maskKey(key) {
  if (!key) {
    return '****';
  }
  return key.length > 12
    ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}`
    : '****';
}

function getTossAuthorization(secretKey) {
  if (!secretKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      '토스페이먼츠 시크릿 키가 설정되지 않았습니다.'
    );
  }

  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
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

      // 로그인 실패 횟수 리셋
      await admin.firestore().collection('users').doc(targetUserId).update({
        loginAttempts: 0,
        lockedUntil: null
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

    // 로그인 실패 횟수 리셋
    await admin.firestore().collection('users').doc(targetUserId).update({
      loginAttempts: 0,
      lockedUntil: null
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
 * 로그인 실패 횟수 추적 및 잠금 처리
 */
exports.trackLoginFailure = functions.https.onRequest((req, res) => {
  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  return cors(req, res, async () => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ success: false, message: '이메일이 필요합니다.' });
        return;
      }

      // 이메일로 사용자 찾기
      const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);
      if (!userRecord) {
        // 사용자가 없어도 기본 메시지만 반환 (보안상 사용자 존재 여부를 노출하지 않음)
        res.json({ success: true, message: '비밀번호가 올바르지 않습니다.' });
        return;
      }

      const userId = userRecord.uid;
      const userDoc = await admin.firestore().collection('users').doc(userId).get();

      if (!userDoc.exists) {
        res.json({ success: true, message: '비밀번호가 올바르지 않습니다.' });
        return;
      }

      const data = userDoc.data();
      const lockedUntil = data.lockedUntil;

      // 잠금 상태 확인
      if (lockedUntil) {
        const lockedUntilTime = lockedUntil.toMillis();
        const now = Date.now();

        if (now < lockedUntilTime) {
          // 아직 잠겨 있음
          const remainingMinutes = Math.ceil((lockedUntilTime - now) / 60000);
          res.json({
            success: true,
            locked: true,
            remainingMinutes: remainingMinutes,
            message: `계정이 잠겨 있습니다. ${remainingMinutes}분 후에 다시 시도해주세요.`
          });
          return;
        } else {
          // 잠금 시간이 지났으면 잠금 해제
          await admin.firestore().collection('users').doc(userId).update({
            lockedUntil: null,
            loginAttempts: 0
          });
        }
      }

      // 실패 횟수 증가
      const currentAttempts = (data.loginAttempts || 0) + 1;
      const MAX_ATTEMPTS = 5;

      if (currentAttempts >= MAX_ATTEMPTS) {
        // 5회 실패 시 30분간 잠금
        const lockDuration = 30 * 60 * 1000; // 30분 (밀리초)
        const lockedUntil = admin.firestore.Timestamp.fromMillis(Date.now() + lockDuration);

        await admin.firestore().collection('users').doc(userId).update({
          loginAttempts: currentAttempts,
          lockedUntil: lockedUntil
        });

        res.json({
          success: true,
          locked: true,
          remainingMinutes: 30,
          message: '비밀번호를 5회 잘못 입력하여 계정이 30분간 잠겼습니다. 잠시 후 다시 시도해주세요.'
        });
      } else {
        // 실패 횟수만 증가
        await admin.firestore().collection('users').doc(userId).update({
          loginAttempts: currentAttempts
        });

        const remainingAttempts = MAX_ATTEMPTS - currentAttempts;
        res.json({
          success: true,
          locked: false,
          remainingAttempts: remainingAttempts,
          message: `비밀번호가 올바르지 않습니다. (남은 시도 횟수: ${remainingAttempts}회)`
        });
      }
    } catch (error) {
      console.error('로그인 실패 추적 오류:', error);
      res.status(500).json({ success: false, message: '로그인 실패 추적 중 오류가 발생했습니다.' });
    }
  });
});

/**
 * 비밀번호 재설정 시 로그인 실패 횟수 리셋
 */
exports.resetLoginAttempts = functions.https.onRequest((req, res) => {
  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  return cors(req, res, async () => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ success: false, message: '이메일이 필요합니다.' });
        return;
      }

      // 이메일로 사용자 찾기
      const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);
      if (!userRecord) {
        res.json({ success: true, message: '사용자를 찾을 수 없습니다.' });
        return;
      }

      const userId = userRecord.uid;
      await admin.firestore().collection('users').doc(userId).update({
        loginAttempts: 0,
        lockedUntil: null
      });

      res.json({ success: true, message: '로그인 실패 횟수가 리셋되었습니다.' });
    } catch (error) {
      console.error('로그인 실패 횟수 리셋 오류:', error);
      res.status(500).json({ success: false, message: '로그인 실패 횟수 리셋 중 오류가 발생했습니다.' });
    }
  });
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

    const openaiClient = getOpenAIClient();
    if (!openaiClient) {
      res.status(503).json({ error: 'OpenAI API가 설정되지 않았습니다.' });
      return;
    }

    // OpenAI API를 사용하여 영어 단어와 한글 뜻 추출
    const completion = await openaiClient.chat.completions.create({
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
    const openaiClient = getOpenAIClient();
    if (!openaiClient) {
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
        const response = await openaiClient.chat.completions.create({
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
 * OpenAI API 범용 프록시
 * 모든 OpenAI API 호출을 여기서 처리
 */
exports.openaiProxy = functions.https.onRequest(async (req, res) => {
  // CORS 설정
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 함수 호출 시점에 OpenAI 클라이언트 가져오기
    const openaiClient = getOpenAIClient();
    if (!openaiClient) {
      console.error('❌ OpenAI API가 설정되지 않았습니다.');
      console.error('환경 변수 확인:');
      console.error('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '설정됨' : '없음');
      
      // v1 config도 확인
      try {
        const config = functions.config();
        console.error('  functions.config().openai?.api_key:', config.openai?.api_key ? '설정됨' : '없음');
      } catch (configError) {
        console.error('  functions.config() 접근 실패');
      }
      
      res.status(503).json({ 
        error: 'OpenAI API가 설정되지 않았습니다.',
        message: 'Firebase Functions에 OPENAI_API_KEY 환경 변수를 설정해주세요.'
      });
      return;
    }

    const requestBody = req.body;
    console.log('✅ OpenAI API 요청 수신:', {
      model: requestBody.model,
      message_count: requestBody.messages?.length || 0,
      has_image: requestBody.messages?.some((msg) => 
        Array.isArray(msg.content) && msg.content.some((item) => item.type === 'image_url')
      ) || false
    });

    // OpenAI API 직접 호출
    const completion = await openaiClient.chat.completions.create(requestBody);
    
    console.log('✅ OpenAI API 호출 성공:', {
      model: completion.model,
      usage: completion.usage
    });
    res.json(completion);
  } catch (error) {
    console.error('❌ OpenAI API 오류 발생:');
    console.error('  에러 타입:', error?.constructor?.name || typeof error);
    console.error('  에러 메시지:', error?.message || String(error));
    console.error('  에러 코드:', error?.code);
    console.error('  에러 상태:', error?.status);
    
    // 401 에러인 경우 API 키 정보 추가 출력
    if (error?.status === 401 || error?.code === 'invalid_api_key') {
      console.error('  ⚠️ API 키 인증 실패 - 설정된 키를 확인해주세요.');
      console.error('  현재 사용 중인 키 소스:', process.env.OPENAI_API_KEY ? 'environment variable' : 'functions.config()');
      
      // API 키 마스킹하여 일부만 표시
      const currentKey = process.env.OPENAI_API_KEY || (() => {
        try {
          const config = functions.config();
          return config.openai?.api_key;
        } catch (e) {
          return null;
        }
      })();
      
      if (currentKey) {
        const maskedKey = currentKey.length > 12 
          ? `${currentKey.substring(0, 8)}...${currentKey.substring(currentKey.length - 4)}`
          : '****';
        console.error('  현재 설정된 키 (마스킹):', maskedKey);
        console.error('  키 길이:', currentKey.length);
      }
      
      console.error('  💡 해결 방법:');
      console.error('     1. Firebase Console에서 환경 변수 확인');
      console.error('     2. 유효한 OpenAI API 키로 업데이트');
      console.error('     3. firebase deploy --only functions:openaiProxy 실행');
    }
    
    console.error('  전체 에러:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // OpenAI API 특정 에러 처리
    if (error?.status === 401) {
      res.status(401).json({ 
        error: 'OpenAI API 인증 실패',
        details: 'API 키가 유효하지 않습니다. OPENAI_API_KEY를 확인해주세요.',
        message: error.message
      });
    } else if (error?.status === 429) {
      res.status(429).json({ 
        error: 'OpenAI API 요청 한도 초과',
        details: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        message: error.message
      });
    } else if (error?.status === 400) {
      res.status(400).json({ 
        error: 'OpenAI API 요청 형식 오류',
        details: '요청 데이터 형식이 올바르지 않습니다.',
        message: error.message
      });
    } else {
      res.status(500).json({ 
        error: 'API 호출 중 오류가 발생했습니다.',
        details: error?.message || '알 수 없는 오류',
        code: error?.code,
        status: error?.status
      });
    }
  }
});

/**
 * Toss Payments - 결제 승인
 */
exports.confirmTossPayment = functions.https.onCall(async (data) => {
  const { secretKey } = getTossConfig();
  const { paymentKey, orderId, amount } = data || {};

  if (!paymentKey || !orderId || !amount) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'paymentKey, orderId, amount는 필수값입니다.'
    );
  }

  try {
    const authorization = getTossAuthorization(secretKey);
    const response = await axios.post(
      'https://api.tosspayments.com/v1/payments/confirm',
      { paymentKey, orderId, amount },
      {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json'
        },
        timeout: 1000 * 30
      }
    );

    console.log('✅ Toss 결제 승인 성공:', {
      orderId,
      amount,
      paymentKeyPreview: maskKey(paymentKey)
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || '결제 승인에 실패했습니다.';
    console.error('❌ Toss 결제 승인 실패:', {
      orderId,
      paymentKeyPreview: maskKey(paymentKey),
      errorMessage,
      code: error.response?.data?.code
    });

    throw new functions.https.HttpsError('internal', errorMessage);
  }
});

/**
 * Toss Payments - 결제 정보 조회
 */
exports.getTossPaymentInfo = functions.https.onCall(async (data) => {
  const { secretKey } = getTossConfig();
  const { paymentKey } = data || {};

  if (!paymentKey) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'paymentKey는 필수값입니다.'
    );
  }

  try {
    const authorization = getTossAuthorization(secretKey);
    const response = await axios.get(
      `https://api.tosspayments.com/v1/payments/${paymentKey}`,
      {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json'
        },
        timeout: 1000 * 15
      }
    );

    console.log('✅ Toss 결제 정보 조회 성공:', {
      paymentKeyPreview: maskKey(paymentKey)
    });

    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || '결제 정보를 조회할 수 없습니다.';
    console.error('❌ Toss 결제 정보 조회 실패:', {
      paymentKeyPreview: maskKey(paymentKey),
      errorMessage,
      code: error.response?.data?.code
    });

    throw new functions.https.HttpsError('internal', errorMessage);
  }
});

/**
 * Toss Payments - 결제 취소
 */
exports.cancelTossPayment = functions.https.onCall(async (data) => {
  const { secretKey } = getTossConfig();
  const { paymentKey, cancelReason, cancelAmount } = data || {};

  if (!paymentKey || !cancelReason) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'paymentKey와 cancelReason은 필수값입니다.'
    );
  }

  try {
    const authorization = getTossAuthorization(secretKey);
    const response = await axios.post(
      `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
      {
        cancelReason,
        cancelAmount: cancelAmount || undefined
      },
      {
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json'
        },
        timeout: 1000 * 30
      }
    );

    console.log('✅ Toss 결제 취소 성공:', {
      paymentKeyPreview: maskKey(paymentKey),
      cancelReason,
      cancelAmount
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || '결제 취소에 실패했습니다.';
    console.error('❌ Toss 결제 취소 실패:', {
      paymentKeyPreview: maskKey(paymentKey),
      cancelReason,
      cancelAmount,
      errorMessage,
      code: error.response?.data?.code
    });

    throw new functions.https.HttpsError('internal', errorMessage);
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
        // 사용자가 이미 삭제되었거나 존재하지 않는 경우에도 계속 진행
        if (error.code !== 'auth/user-not-found') {
          console.log(`Firebase Auth 사용자 삭제 실패: ${error.message}`);
        }
      }
      
      // 3. Firestore에서 사용자 완전 삭제
      await admin.firestore().collection('users').doc(userId).delete();
      
      console.log(`Firestore 사용자 완전 삭제 완료: ${userId}`);
      
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
 * 관리자가 사용자를 생성하는 함수
 */
exports.createUserByAdmin = functions.https.onRequest(async (req, res) => {
  // CORS 설정
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { adminUid, userData } = req.body;
      
      if (!adminUid || !userData) {
        res.status(400).json({ success: false, message: 'adminUid와 userData가 필요합니다.' });
        return;
      }
      
      const { email, password, name, nickname, phoneNumber, role } = userData;
      
      if (!email || !password || !name || !nickname) {
        res.status(400).json({ success: false, message: '이메일, 비밀번호, 이름, 닉네임은 필수입니다.' });
        return;
      }
      
      console.log(`관리자 사용자 생성: ${adminUid} -> ${email}`);
      
      // 1. 관리자 권한 확인
      const adminDoc = await admin.firestore().collection('users').doc(adminUid).get();
      if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
        res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
        return;
      }
      
      // 2. 이메일 중복 확인
      try {
        await admin.auth().getUserByEmail(email);
        res.status(400).json({ success: false, message: '이미 존재하는 이메일입니다.' });
        return;
      } catch (error) {
        // 사용자가 존재하지 않으면 계속 진행
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }
      
      // 3. Firebase Auth에 사용자 생성
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        emailVerified: true // 관리자가 생성한 계정은 이메일 인증 완료 상태로 생성
      });
      
      console.log(`Firebase Auth 사용자 생성 완료: ${userRecord.uid}`);
      
      // 4. Firestore에 사용자 정보 저장
      const defaultPoints = 30000; // 신규 회원가입 시 기본 포인트
      const defaultPrintHeader = 'EdgeEnglishLab | AI 영어 문제 생성 플랫폼';
      
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        name: name,
        nickname: nickname,
        email: email,
        phoneNumber: phoneNumber || '',
        role: role || 'user',
        isActive: true,
        points: defaultPoints,
        totalPaidPoints: 0,
        usedPoints: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: adminUid,
        printHeader: defaultPrintHeader
      });
      
      console.log(`Firestore 사용자 정보 저장 완료: ${userRecord.uid}`);
      
      res.json({
        success: true,
        message: '사용자가 성공적으로 생성되었습니다.',
        userId: userRecord.uid
      });
      
    } catch (error) {
      console.error('사용자 생성 오류:', error);
      
      let errorMessage = '사용자 생성 중 오류가 발생했습니다.';
      if (error.code === 'auth/email-already-exists') {
        errorMessage = '이미 존재하는 이메일입니다.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '유효하지 않은 이메일 형식입니다.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다.';
      }
      
      res.status(500).json({ 
        success: false, 
        message: errorMessage, 
        error: error.message 
      });
    }
});

/**
 * 관리자가 여러 사용자를 일괄 생성하는 함수
 */
exports.batchCreateUsersByAdmin = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { adminUid, users } = req.body;
    
      if (!adminUid || !users || !Array.isArray(users)) {
        res.status(400).json({ success: false, message: 'adminUid와 users 배열이 필요합니다.' });
        return;
      }

      if (users.length === 0) {
        res.status(400).json({ success: false, message: '생성할 사용자 목록이 비어있습니다.' });
        return;
      }

      if (users.length > 100) {
        res.status(400).json({ success: false, message: '한 번에 최대 100명까지 생성할 수 있습니다.' });
        return;
      }

      console.log(`관리자 일괄 사용자 생성 시작: ${adminUid} -> ${users.length}명`);

      // 1. 관리자 권한 확인
      const adminDoc = await admin.firestore().collection('users').doc(adminUid).get();
      if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
        res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
        return;
      }

      const defaultPoints = 30000;
      const defaultPrintHeader = 'EdgeEnglishLab | AI 영어 문제 생성 플랫폼';

      const results = {
        success: [],
        failed: []
      };

      // 각 사용자 생성
      for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        const { email, password, name, nickname, phoneNumber, role } = userData;

        try {
          // 필수 필드 확인
          if (!email || !password || !name || !nickname) {
            results.failed.push({
              email: email || '이메일 없음',
              reason: '이메일, 비밀번호, 이름, 닉네임은 필수입니다.'
            });
            continue;
          }

          // 이메일 중복 확인
          try {
            await admin.auth().getUserByEmail(email);
            results.failed.push({
              email: email,
              reason: '이미 존재하는 이메일입니다.'
            });
            continue;
          } catch (error) {
            if (error.code !== 'auth/user-not-found') {
              throw error;
            }
          }

          // Firebase Auth에 사용자 생성
          const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            emailVerified: true
          });

          // Firestore에 사용자 정보 저장
          await admin.firestore().collection('users').doc(userRecord.uid).set({
            name: name,
            nickname: nickname,
            email: email,
            phoneNumber: phoneNumber || '',
            role: role || 'user',
            isActive: true,
            points: defaultPoints,
            totalPaidPoints: 0,
            usedPoints: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: adminUid,
            printHeader: defaultPrintHeader
          });

          results.success.push({
            email: email,
            userId: userRecord.uid,
            name: name
          });

          console.log(`사용자 생성 완료 (${i + 1}/${users.length}): ${email}`);
        } catch (error) {
          console.error(`사용자 생성 실패: ${email}`, error);
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
            email: email || '이메일 없음',
            reason: errorMessage
          });
        }
      }

      console.log(`일괄 사용자 생성 완료: 성공 ${results.success.length}명, 실패 ${results.failed.length}명`);

      res.json({
        success: true,
        message: `일괄 생성 완료: 성공 ${results.success.length}명, 실패 ${results.failed.length}명`,
        results: results
      });
    } catch (error) {
      console.error('일괄 사용자 생성 오류:', error);
      res.status(500).json({
        success: false,
        message: '일괄 사용자 생성 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  });
});

/**
 * 모든 사용자의 포인트를 일괄 변경하는 함수 (관리자 전용)
 */
exports.updateAllUserPoints = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { adminUid, targetPoints } = req.body;

      if (!adminUid) {
        res.status(400).json({ success: false, message: 'adminUid가 필요합니다.' });
        return;
      }

      const points = targetPoints || 60000;

      // 관리자 권한 확인
      const adminDoc = await admin.firestore().collection('users').doc(adminUid).get();
      if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
        res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
        return;
      }

      console.log(`관리자 ${adminUid}가 모든 사용자 포인트를 ${points}P로 변경 시작`);

      const usersRef = admin.firestore().collection('users');
      const snapshot = await usersRef.get();

      if (snapshot.empty) {
        res.json({
          success: true,
          message: '변경할 사용자가 없습니다.',
          updatedCount: 0
        });
        return;
      }

      let updateCount = 0;
      const batchSize = 500;
      let batch = admin.firestore().batch();
      let batchCount = 0;

      const docsToUpdate = [];
      snapshot.forEach((doc) => {
        const userData = doc.data();
        const currentPoints = userData.points || 0;

        // 포인트가 이미 목표값과 같으면 건너뛰기
        if (currentPoints === points) {
          return;
        }

        docsToUpdate.push(doc);
      });

      // 배치로 처리
      for (let i = 0; i < docsToUpdate.length; i++) {
        const doc = docsToUpdate[i];
        batch.update(doc.ref, {
          points: points
        });

        updateCount++;
        batchCount++;

        // 배치 제한에 도달하면 커밋하고 새 배치 시작
        if (batchCount >= batchSize) {
          await batch.commit();
          batch = admin.firestore().batch();
          batchCount = 0;
        }
      }

      // 남은 변경사항 커밋
      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(`포인트 변경 완료: ${updateCount}명의 사용자 포인트가 ${points}P로 변경됨`);

      res.json({
        success: true,
        message: `${updateCount}명의 사용자 포인트가 ${points}P로 변경되었습니다.`,
        updatedCount: updateCount,
        targetPoints: points
      });
    } catch (error) {
      console.error('포인트 일괄 변경 오류:', error);
      res.status(500).json({
        success: false,
        message: '포인트 일괄 변경 중 오류가 발생했습니다.',
        error: error.message
      });
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
 * TODO: Node.js 22 환경에서 pubsub API 이슈로 임시 비활성화
 */
// exports.cleanupOldQuizHistory = functions.pubsub.schedule('0 3 * * *')
//   .timeZone('Asia/Seoul')
//   .onRun(async (context) => {
//     try {
//       console.log('=== 6개월 이상 된 문제 생성 내역 정리 시작 ===');
//       
//       const now = admin.firestore.Timestamp.now();
//       const sixMonthsAgo = new Date();
//       sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
//       const sixMonthsAgoTimestamp = admin.firestore.Timestamp.fromDate(sixMonthsAgo);
//       
//       // createdAt이 6개월 이전인 데이터 조회
//       const quizHistoryRef = admin.firestore().collection('quizHistory');
//       const oldDocsQuery = quizHistoryRef
//         .where('createdAt', '<', sixMonthsAgoTimestamp);
//       
//       const snapshot = await oldDocsQuery.get();
//       
//       if (snapshot.empty) {
//         console.log('삭제할 6개월 이상 된 내역이 없습니다.');
//         return null;
//       }
//       
//       // 배치로 삭제 (Firestore 제한: 한 번에 최대 500개)
//       const batchSize = 500;
//       const docs = snapshot.docs;
//       let deletedCount = 0;
//       
//       for (let i = 0; i < docs.length; i += batchSize) {
//         const batch = admin.firestore().batch();
//         const batchDocs = docs.slice(i, i + batchSize);
//         
//         batchDocs.forEach(doc => {
//           batch.delete(doc.ref);
//         });
//         
//         await batch.commit();
//         deletedCount += batchDocs.length;
//         console.log(`배치 ${Math.floor(i / batchSize) + 1}: ${batchDocs.length}개 삭제 완료`);
//       }
//       
//       console.log(`=== 총 ${deletedCount}개의 6개월 이상 된 내역 삭제 완료 ===`);
//       return null;
//     } catch (error) {
//       console.error('6개월 이상 된 내역 정리 오류:', error);
//       throw error;
//     }
//   });
