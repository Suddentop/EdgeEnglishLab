<?php
/**
 * 🔒 보안 강화된 OpenAI API 프록시 서버
 * 
 * 주요 보안 기능:
 * - API Key 완전 숨김
 * - CORS 정책 적용
 * - 입력 검증 및 필터링
 * - 요청 제한 (Rate Limiting)
 * - 실시간 모니터링 및 로깅
 * - 침입 탐지 시스템
 */

// .env 파일 로드 (로컬 개발 환경)
if (file_exists(__DIR__ . '/load-env.php')) {
    require_once __DIR__ . '/load-env.php';
}

// 오류 보고 설정
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// 보안 헤더 설정
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

// CORS 설정
$allowedOrigins = [
    'https://edgeenglish.net',
    'https://www.edgeenglish.net',
    'http://localhost:3000',
    'http://localhost:3001'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!in_array($origin, $allowedOrigins)) {
    http_response_code(403);
    echo json_encode(['error' => 'Origin not allowed']);
    exit();
}

header('Access-Control-Allow-Origin: ' . $origin);
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// OPTIONS 요청 처리
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Max-Age: 3600');
    http_response_code(200);
    exit();
}

// 설정 파일 로드
require_once 'config.php';
require_once 'rate-limiter.php';

// 보안 검증 함수들
function validateRequest($data) {
    if (!isset($data['model']) || !isset($data['messages'])) {
        return ['valid' => false, 'error' => 'Missing required fields'];
    }

    $allowedModels = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'];
    if (!in_array($data['model'], $allowedModels)) {
        return ['valid' => false, 'error' => 'Invalid model'];
    }

    if (!is_array($data['messages']) || count($data['messages']) > 50) {
        return ['valid' => false, 'error' => 'Too many messages'];
    }

    if (isset($data['max_tokens']) && $data['max_tokens'] > 4000) {
        return ['valid' => false, 'error' => 'Token limit exceeded'];
    }

    if (isset($data['temperature']) && ($data['temperature'] < 0 || $data['temperature'] > 2)) {
        return ['valid' => false, 'error' => 'Invalid temperature value'];
    }

    return ['valid' => true];
}

function sanitizeInput($input) {
    $input = strip_tags($input);
    $input = htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
    
    if (strlen($input) > 50000) {
        return substr($input, 0, 50000);
    }
    
    return $input;
}

function validateMessages($messages) {
    foreach ($messages as $message) {
        if (!isset($message['role']) || !isset($message['content'])) {
            return false;
        }
        
        $allowedRoles = ['system', 'user', 'assistant'];
        if (!in_array($message['role'], $allowedRoles)) {
            return false;
        }
        
        if (strlen($message['content']) > 10000) {
            return false;
        }
    }
    
    return true;
}

// 요청 로깅
function logRequest($endpoint, $responseTime, $success, $error = null) {
    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'endpoint' => $endpoint,
        'response_time' => $responseTime,
        'success' => $success,
        'error' => $error
    ];
    
    $logMessage = json_encode($logData) . "\n";
    file_put_contents('api_logs.txt', $logMessage, FILE_APPEND | LOCK_EX);
}

// 메인 처리 로직
try {
    // Rate Limiting 확인
    $rateLimiter = new RateLimiter();
    if (!$rateLimiter->checkRateLimit()) {
        http_response_code(429);
        echo json_encode(['error' => 'Rate limit exceeded. Please try again later.']);
        exit();
    }

    // POST 요청만 허용
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit();
    }

    // 요청 데이터 읽기
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit();
    }

    // 입력 검증
    $validation = validateRequest($data);
    if (!$validation['valid']) {
        http_response_code(400);
        echo json_encode(['error' => $validation['error']]);
        exit();
    }

    if (!validateMessages($data['messages'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid message format']);
        exit();
    }

    // 메시지 내용 정화
    foreach ($data['messages'] as &$message) {
        $message['content'] = sanitizeInput($message['content']);
    }

    $startTime = microtime(true);

    // OpenAI API 호출
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => 'https://api.openai.com/v1/chat/completions',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . OPENAI_API_KEY
        ],
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    $responseTime = round((microtime(true) - $startTime) * 1000, 2);

    if ($error) {
        logRequest('chat/completions', $responseTime, false, $error);
        http_response_code(500);
        echo json_encode(['error' => 'Internal server error']);
        exit();
    }

    if ($httpCode !== 200) {
        logRequest('chat/completions', $responseTime, false, "HTTP $httpCode");
        http_response_code($httpCode);
        echo $response;
        exit();
    }

    // 성공 로그
    logRequest('chat/completions', $responseTime, true);

    // 응답 반환
    echo $response;

} catch (Exception $e) {
    error_log('API Proxy Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>

