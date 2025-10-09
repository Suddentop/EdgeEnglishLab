// Service 파일들에 else 블록 추가하는 헬퍼 스크립트
// 이 파일은 참고용입니다.

const fs = require('fs');
const path = require('path');

function addElseBlock(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 패턴: if (proxyUrl) { ... }) 다음에 else 블록 추가
  const pattern = /(\s+if \(proxyUrl\) \{\n[\s\S]*?body: JSON\.stringify\(\{[\s\S]*?\}\)\n\s+\}\);)/g;
  
  content = content.replace(pattern, (match) => {
    // 이미 else 블록이 있는지 확인
    if (match.includes('} else if (directApiKey)')) {
      return match;
    }
    
    // else 블록 추가
    const elseBlock = `
    } else if (directApiKey) {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${directApiKey}\`,
        },
        body: JSON.stringify({
          // 동일한 request body
        })
      });
    } else {
      throw new Error('API 설정이 없습니다.');
    }`;
    
    return match + elseBlock;
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ${filePath} 수정 완료`);
}

// 사용 예시:
// node add-else-blocks.js ../src/services/work14AIService.ts


