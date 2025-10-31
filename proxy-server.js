const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// .env 파일 로드
function loadEnv() {
  const envPath = path.join(__dirname, 'php_api_proxy', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ php_api_proxy/.env 파일이 없습니다.');
    console.log('📝 php_api_proxy/.env 파일에 다음 내용을 추가하세요:');
    console.log('OPENAI_API_KEY=your-api-key-here');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return envVars;
}

const env = loadEnv();
const OPENAI_API_KEY = env.OPENAI_API_KEY;

if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
  console.error('❌ OpenAI API 키가 설정되지 않았습니다.');
  console.log('📝 php_api_proxy/.env 파일에 실제 API 키를 입력하세요:');
  console.log('OPENAI_API_KEY=your-real-api-key');
  process.exit(1);
}

const PORT = 8000;

const server = http.createServer((req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Preflight 요청 처리
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // POST 요청만 처리
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  
  // api-proxy.php 또는 analyze-problem-image.php 경로 확인
  if (!req.url.includes('api-proxy.php') && !req.url.includes('analyze-problem-image.php') && req.url !== '/') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      const requestData = JSON.parse(body);
      
      // analyze-problem-image.php 요청인 경우 특별 처리
      if (req.url.includes('analyze-problem-image.php')) {
        console.log(`🖼️ 이미지 분석 요청 처리 중...`);
        console.log(`📋 요청 데이터:`, JSON.stringify(requestData, null, 2));
        
        // 요청 데이터 검증
        if (!requestData.image) {
          console.error('❌ 이미지 데이터가 없습니다.');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false,
            error: 'Missing image data',
            message: '이미지 데이터가 필요합니다.' 
          }));
          return;
        }
        
        // OpenAI Vision API 호출
        const options = {
          hostname: 'api.openai.com',
          port: 443,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        };
        
        // 이미지 분석을 위한 프롬프트 생성
        const prompt = `이 이미지는 영어 문제가 포함된 이미지입니다. 다음을 수행해주세요:

1. 이미지에서 모든 영어 텍스트를 정확히 추출하세요.
2. 추출된 텍스트를 자연스럽고 완벽한 영어 본문으로 정리하세요.
3. 그 본문의 정확한 한글 해석을 제공하세요.

${requestData.extractedText ? `추가 정보: OCR로 추출된 텍스트가 있습니다:\n${requestData.extractedText}\n\n이 텍스트를 참고하여 더 정확한 본문으로 정리해주세요.` : ''}

응답은 다음 JSON 형식으로 해주세요:
{
  "englishText": "정리된 완벽한 영어 본문",
  "koreanTranslation": "정확한 한글 해석",
  "problemType": "영어 문제",
  "answers": [],
  "analysis": "영어 본문 추출 및 한글 해석 제공"
}`;

        const visionRequestData = {
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: requestData.image } }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.2,
          response_format: { type: 'json_object' }
        };
        
        const proxyReq = https.request(options, (proxyRes) => {
          let responseData = '';
          
          proxyRes.on('data', chunk => {
            responseData += chunk;
          });
          
          proxyRes.on('end', () => {
            console.log(`✅ 이미지 분석 완료 (상태: ${proxyRes.statusCode})`);
            
            try {
              const parsedResponse = JSON.parse(responseData);
              const analysisResult = JSON.parse(parsedResponse.choices[0].message.content);
              
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({
                success: true,
                data: analysisResult
              }));
            } catch (parseError) {
              console.error('❌ 응답 파싱 오류:', parseError.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false,
                error: 'Response parsing failed',
                message: parseError.message 
              }));
            }
          });
        });
        
        proxyReq.on('error', (error) => {
          console.error('❌ 이미지 분석 API 호출 오류:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false,
            error: 'Image analysis API error',
            message: error.message 
          }));
        });
        
        proxyReq.write(JSON.stringify(visionRequestData));
        proxyReq.end();
        return;
      }
      
      console.log(`🤖 OpenAI API 요청 전달 중... (모델: ${requestData.model || 'N/A'})`);
      
      // 일반 OpenAI API 호출
      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      };
      
      const proxyReq = https.request(options, (proxyRes) => {
        let responseData = '';
        
        proxyRes.on('data', chunk => {
          responseData += chunk;
        });
        
        proxyRes.on('end', () => {
          console.log(`✅ OpenAI API 응답 받음 (상태: ${proxyRes.statusCode})`);
          
          res.writeHead(proxyRes.statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(responseData);
        });
      });
      
      proxyReq.on('error', (error) => {
        console.error('❌ OpenAI API 호출 오류:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Proxy server error',
          message: error.message 
        }));
      });
      
      proxyReq.write(JSON.stringify(requestData));
      proxyReq.end();
      
    } catch (error) {
      console.error('❌ 요청 처리 오류:', error.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Bad request',
        message: error.message 
      }));
    }
  });
});

server.listen(PORT, () => {
  console.log('======================================');
  console.log('  Node.js API Proxy Server 시작');
  console.log('======================================');
  console.log('');
  console.log(`서버 주소: http://localhost:${PORT}`);
  console.log(`프록시 URL: http://localhost:${PORT}/api-proxy.php`);
  console.log('');
  console.log('이 창을 닫으면 서버가 종료됩니다.');
  console.log('React 앱도 함께 실행해야 합니다.');
  console.log('');
  console.log('======================================');
  console.log('🔑 OpenAI API 키: 설정됨');
  console.log('✅ 준비 완료!');
  console.log('');
});

// 종료 시그널 처리
process.on('SIGINT', () => {
  console.log('\n\n서버를 종료합니다...');
  server.close(() => {
    console.log('✅ 서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

