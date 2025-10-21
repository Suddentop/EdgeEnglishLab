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
  
  // api-proxy.php 경로 확인
  if (!req.url.includes('api-proxy.php') && req.url !== '/') {
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
      
      console.log(`🤖 OpenAI API 요청 전달 중... (모델: ${requestData.model || 'N/A'})`);
      
      // OpenAI API 호출
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

