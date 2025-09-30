<?php
/**
 * 보안 강화 OpenAI API 프록시 서버
 * dothome.co.kr에서 API Key를 안전하게 숨기는 프록시 서버
 */

require_once 'rate-limiter.php';

// CORS 헤더 설정
$allowedOrigins = [
    'https://edgeenglish.net',
    'https://www.edgeenglish.net'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
header('Content-Type: application/json; charset=utf-8');

// OPTIONS 요청 처리 (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 요청 로깅 함수
function logRequest($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $logMessage = "[$timestamp] [$level] [$ip] $message" . PHP_EOL;
    file_put_contents('api_logs.txt', $logMessage, FILE_APPEND | LOCK_EX);
}

// 환경 변수에서 API Key 로드
$OPENAI_API_KEY = getenv('OPENAI_API_KEY') ?: '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';
if (!$OPENAI_API_KEY || $OPENAI_API_KEY === 'your_openai_api_key_here') {
    logRequest('OpenAI API Key not configured', 'ERROR');
    http_response_code(500);
    echo json_encode(['error' => 'API Key not configured']);
    exit();
}

// 요청 제한 확인
$rateLimiter = new RateLimiter();
if (!$rateLimiter->checkRateLimit()) {
    logRequest('Rate limit exceeded', 'WARNING');
    http_response_code(429);
    echo json_encode(['error' => 'Rate limit exceeded. Please try again later.']);
    exit();
}

// 요청 검증
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logRequest('Invalid request method: ' . $_SERVER['REQUEST_METHOD'], 'WARNING');
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// 요청 본문 읽기
$input = file_get_contents('php://input');
if (empty($input)) {
    logRequest('Empty request body', 'WARNING');
    http_response_code(400);
    echo json_encode(['error' => 'Empty request body']);
    exit();
}

$data = json_decode($input, true);
if (!$data) {
    logRequest('Invalid JSON in request body', 'WARNING');
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit();
}

// 요청 검증
if (!validateRequest($data)) {
    logRequest('Request validation failed', 'WARNING');
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request parameters']);
    exit();
}

// 요청 로깅 (민감한 정보 제외)
logRequest('Valid request received: model=' . $data['model'] . ', messages=' . count($data['messages']));

// OpenAI API 호출
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => 'https://api.openai.com/v1/chat/completions',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($data),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $OPENAI_API_KEY,
        'User-Agent: EngQuiz-API-Proxy/1.0'
    ],
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
$info = curl_getinfo($ch);
curl_close($ch);

// 에러 처리
if ($error) {
    logRequest('cURL Error: ' . $error, 'ERROR');
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred']);
    exit();
}

// 응답 코드 확인
if ($httpCode !== 200) {
    logRequest('OpenAI API Error: HTTP ' . $httpCode . ' - ' . $response, 'ERROR');
    
    // OpenAI API 에러 응답을 그대로 전달
    if ($httpCode >= 400 && $httpCode < 500) {
        http_response_code($httpCode);
    } else {
        http_response_code(500);
    }
    
    echo $response;
    exit();
}

// 성공 로깅
logRequest('API call successful: ' . $info['total_time'] . 's');

// 성공 응답
echo $response;
?>
