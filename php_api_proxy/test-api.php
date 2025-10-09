<?php
/**
 * OpenAI API 프록시 서버 테스트 파일
 * API Key가 올바르게 설정되었는지 확인
 * 
 * ⚠️ 보안 경고: 프로덕션 환경에서는 이 파일을 삭제하거나 접근을 차단하세요!
 */

// .env 파일 로드 (로컬 개발 환경)
if (file_exists(__DIR__ . '/load-env.php')) {
    require_once __DIR__ . '/load-env.php';
}

// 환경 변수에서 API Key 로드
$OPENAI_API_KEY = getenv('OPENAI_API_KEY');

echo "<h2>OpenAI API Key 테스트</h2>";

if (!$OPENAI_API_KEY) {
    echo "<p style='color: red;'><strong>❌ API Key가 설정되지 않았습니다.</strong></p>";
    echo "<p>서버 환경 변수에 OPENAI_API_KEY를 설정해주세요.</p>";
    exit();
}

echo "<p><strong>API Key:</strong> " . substr($OPENAI_API_KEY, 0, 20) . "...</p>";

// 간단한 테스트 요청
$testData = [
    'model' => 'gpt-3.5-turbo',
    'messages' => [
        ['role' => 'user', 'content' => 'Hello, this is a test message. Please respond with "API connection successful".']
    ],
    'max_tokens' => 50,
    'temperature' => 0.1
];

echo "<h3>API 연결 테스트 중...</h3>";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => 'https://api.openai.com/v1/chat/completions',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($testData),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $OPENAI_API_KEY
    ],
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "<p style='color: red;'><strong>❌ cURL 오류:</strong> $error</p>";
} else {
    echo "<p><strong>HTTP 상태 코드:</strong> $httpCode</p>";
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if ($data && isset($data['choices'][0]['message']['content'])) {
            echo "<p style='color: green;'><strong>✅ API 연결 성공!</strong></p>";
            echo "<p><strong>AI 응답:</strong> " . htmlspecialchars($data['choices'][0]['message']['content']) . "</p>";
            echo "<p><strong>사용된 토큰:</strong> " . ($data['usage']['total_tokens'] ?? 'N/A') . "</p>";
        } else {
            echo "<p style='color: orange;'><strong>⚠️ 응답 형식 오류</strong></p>";
            echo "<pre>" . htmlspecialchars($response) . "</pre>";
        }
    } else {
        echo "<p style='color: red;'><strong>❌ API 오류 (HTTP $httpCode)</strong></p>";
        echo "<pre>" . htmlspecialchars($response) . "</pre>";
    }
}

echo "<hr>";
echo "<h3>다음 단계</h3>";
echo "<ol>";
echo "<li>위 테스트가 성공하면 api-proxy.php 파일을 사용할 수 있습니다.</li>";
echo "<li>실제 서비스에서는 test-api.php 파일을 삭제하거나 접근을 차단하세요.</li>";
echo "<li>React 앱에서 REACT_APP_API_PROXY_URL 환경 변수를 설정하세요.</li>";
echo "</ol>";
?>

