/**
 * 안전한 프로덕션 빌드 스크립트
 * REACT_APP_OPENAI_API_KEY가 빌드에 포함되지 않도록 보장
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 안전한 프로덕션 빌드 시작...\n');

// 1. .env.local 파일 백업 및 임시 제거 (dotenv 로드 전에 수행)
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envLocalBackupPath = path.join(__dirname, '..', '.env.local.backup');
let envLocalExists = false;
let envLocalBackedUp = false;

if (fs.existsSync(envLocalPath)) {
  envLocalExists = true;
  console.log('⚠️  .env.local 파일 발견 - 임시 백업 중...');
  
  // .env.local 내용 확인
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  
  // REACT_APP_OPENAI_API_KEY가 있는지 확인
  if (envContent.includes('REACT_APP_OPENAI_API_KEY')) {
    console.log('❌ .env.local에 REACT_APP_OPENAI_API_KEY가 포함되어 있습니다!');
    console.log('   프로덕션 빌드에서 API 키가 노출되는 것을 방지하기 위해 임시로 제거합니다.\n');
    
    // 백업
    fs.copyFileSync(envLocalPath, envLocalBackupPath);
    envLocalBackedUp = true;
    
    // REACT_APP_OPENAI_API_KEY 제거한 새 파일 생성
    const lines = envContent.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('REACT_APP_OPENAI_API_KEY') && 
             !trimmed.startsWith('# REACT_APP_OPENAI_API_KEY');
    });
    
    fs.writeFileSync(envLocalPath, filteredLines.join('\n'));
    console.log('✅ .env.local에서 REACT_APP_OPENAI_API_KEY 제거 완료\n');
  } else {
    console.log('✅ .env.local에 REACT_APP_OPENAI_API_KEY가 없습니다.\n');
  }
} else {
  console.log('✅ .env.local 파일이 없습니다.\n');
}

// 1-1. .env.local 파일 수정 후 dotenv 로드
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// 2. 환경 변수 확인 및 설정
console.log('📝 환경 변수 확인 중...');
const requiredEnvVars = [
  'REACT_APP_API_PROXY_URL',
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

const missingVars = [];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log('⚠️  다음 환경 변수가 설정되지 않았습니다:');
  missingVars.forEach(v => console.log(`   - ${v}`));
  console.log('\n💡 PowerShell에서 환경 변수를 설정한 후 다시 빌드하세요.');
  console.log('   예: $env:REACT_APP_API_PROXY_URL="https://edgeenglish.net/secure-api-proxy.php"\n');
}

// 3. REACT_APP_OPENAI_API_KEY가 환경 변수에 있는지 확인
if (process.env.REACT_APP_OPENAI_API_KEY) {
  console.log('❌ 경고: REACT_APP_OPENAI_API_KEY가 환경 변수에 설정되어 있습니다!');
  console.log('   프로덕션 빌드에서는 API 키를 사용하지 않습니다.');
  console.log('   프록시 서버를 통해 API를 호출하므로 클라이언트에 키가 필요 없습니다.\n');
  
  // 환경 변수에서 제거
  delete process.env.REACT_APP_OPENAI_API_KEY;
  console.log('✅ 환경 변수에서 REACT_APP_OPENAI_API_KEY 제거 완료\n');
}

// 4. 빌드 실행
console.log('🔨 React 앱 빌드 시작...\n');
try {
  execSync('react-scripts build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      REACT_APP_OPENAI_API_KEY: undefined // 명시적으로 undefined 설정
    }
  });
  console.log('\n✅ 빌드 완료!\n');
} catch (error) {
  console.error('\n❌ 빌드 실패!\n');
  process.exit(1);
}

// 5. 소스 코드에서 REACT_APP_OPENAI_API_KEY 사용 검사
console.log('🔍 소스 코드에서 API 키 사용 검사 중...\n');
const srcPath = path.join(__dirname, '..', 'src');
let foundApiKeyInSource = false;
const problematicFiles = [];

function searchInDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // node_modules, build 등 제외
      if (!['node_modules', 'build', '.git'].includes(file)) {
        searchInDirectory(filePath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // REACT_APP_OPENAI_API_KEY 사용 검사
      if (content.includes('REACT_APP_OPENAI_API_KEY') || 
          content.includes('process.env.REACT_APP_OPENAI_API_KEY') ||
          content.match(/Authorization.*Bearer.*process\.env/) ||
          content.match(/fetch\(['"]https:\/\/api\.openai\.com/)) {
        problematicFiles.push(filePath.replace(path.join(__dirname, '..'), ''));
        foundApiKeyInSource = true;
      }
    }
  });
}

searchInDirectory(srcPath);

if (foundApiKeyInSource) {
  console.log('❌ [보안 경고] 소스 코드에서 API 키 사용이 발견되었습니다!');
  console.log('   다음 파일들을 확인하세요:\n');
  problematicFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
  console.log('\n⚠️  이 파일들은 프록시 서버를 사용하도록 수정해야 합니다.');
  console.log('   직접 API 호출을 제거하고 callOpenAI 함수를 사용하세요.\n');
  console.log('❌ 빌드를 중단합니다. 보안 문제를 해결한 후 다시 빌드하세요.\n');
  process.exit(1);
} else {
  console.log('✅ 소스 코드에서 API 키 직접 사용이 없습니다.\n');
}

// 6. 빌드 파일 검증
console.log('🔍 빌드 파일 검증 중...\n');
const buildJsPath = path.join(__dirname, '..', 'build', 'static', 'js');
if (fs.existsSync(buildJsPath)) {
  const jsFiles = fs.readdirSync(buildJsPath).filter(f => f.endsWith('.js') && !f.endsWith('.map'));
  
  let foundApiKey = false;
  jsFiles.forEach(file => {
    const filePath = path.join(buildJsPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // API 키 패턴 검색 (sk-로 시작하는 키)
    if (content.match(/sk-[a-zA-Z0-9]{20,}/)) {
      console.log(`❌ 경고: ${file}에 API 키가 포함되어 있습니다!`);
      foundApiKey = true;
    }
    
    // REACT_APP_OPENAI_API_KEY 환경 변수 참조 검사
    if (content.includes('REACT_APP_OPENAI_API_KEY')) {
      console.log(`❌ 경고: ${file}에 REACT_APP_OPENAI_API_KEY 참조가 포함되어 있습니다!`);
      foundApiKey = true;
    }
  });
  
  if (!foundApiKey) {
    console.log('✅ 빌드 파일에 API 키가 포함되지 않았습니다.');
  } else {
    console.log('\n❌ [치명적 오류] 빌드 파일에 API 키가 포함되어 있습니다!');
    console.log('   이 빌드는 절대 배포하지 마세요. API 키가 노출될 수 있습니다.');
    console.log('   소스 코드를 수정하고 다시 빌드하세요.\n');
    process.exit(1);
  }
} else {
  console.log('⚠️  빌드 파일을 찾을 수 없습니다.');
}

// 7. .env.local 복원
if (envLocalBackedUp && fs.existsSync(envLocalBackupPath)) {
  console.log('\n🔄 .env.local 파일 복원 중...');
  fs.copyFileSync(envLocalBackupPath, envLocalPath);
  fs.unlinkSync(envLocalBackupPath);
  console.log('✅ .env.local 파일 복원 완료\n');
}

console.log('🎉 안전한 빌드 프로세스 완료!\n');

