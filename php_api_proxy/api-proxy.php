<?php
/**
 * OpenAI API 프록시 서버
 * dothome.co.kr에서 API Key를 안전하게 숨기는 프록시 서버
 */

// .env 파일 로드 (로컬 개발 환경)
if (file_exists(__DIR__ . '/load-env.php')) {
    require_once __DIR__ . '/load-env.php';
}

// CORS 헤더 설정 (개발 환경 지원)
$allowedOrigins = [
    'https://edgeenglish.net',
    'https://www.edgeenglish.net',
    'http://localhost:3000',
    'http://localhost:3001'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    // 기본값으로 메인 도메인 설정
    header('Access-Control-Allow-Origin: https://edgeenglish.net');
}

header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// OPTIONS 요청 처리 (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 환경 변수에서 API Key 로드 (서버에서만 설정)
$OPENAI_API_KEY = getenv('OPENAI_API_KEY');
if (!$OPENAI_API_KEY || $OPENAI_API_KEY === 'your_openai_api_key_here') {
    http_response_code(500);
    echo json_encode(['error' => 'API Key not configured']);
    exit();
}

// 요청 검증
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// 요청 본문 읽기
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit();
}

// 필수 필드 검증
if (!isset($data['model']) || !isset($data['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit();
}

// 요청 로깅 (보안을 위해 민감한 정보는 제외)
error_log('OpenAI API Proxy Request: ' . json_encode([
    'model' => $data['model'],
    'message_count' => count($data['messages']),
    'timestamp' => date('Y-m-d H:i:s')
]));

// OpenAI API 호출
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => 'https://api.openai.com/v1/chat/completions',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($data),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $OPENAI_API_KEY
    ],
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 10
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// 에러 처리
if ($error) {
    error_log('cURL Error: ' . $error);
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred']);
    exit();
}

// 응답 코드 확인
if ($httpCode !== 200) {
    error_log('OpenAI API Error: HTTP ' . $httpCode . ' - ' . $response);
    http_response_code($httpCode);
    echo $response;
    exit();
}

// 성공 응답
echo $response;
?>
