<?php
/**
 * 🔐 서버 설정 파일
 * 
 * 주의: 이 파일은 서버에서만 접근 가능해야 합니다.
 * 클라이언트에서 직접 접근할 수 없도록 .htaccess로 보호됩니다.
 */

// API Key 설정 (환경 변수에서 로드)
$apiKey = getenv('OPENAI_API_KEY');
if (!$apiKey) {
    error_log('CRITICAL: OPENAI_API_KEY environment variable not set');
    die('Server configuration error: API key not configured');
}
define('OPENAI_API_KEY', $apiKey);

// 보안 설정
define('SECURE_MODE', true);
define('LOG_REQUESTS', true);
define('MAX_REQUEST_SIZE', 50000); // 바이트
define('MAX_MESSAGES', 50);
define('MAX_TOKENS', 4000);

// 허용된 도메인 목록
$ALLOWED_DOMAINS = [
    'edgeenglish.net',
    'www.edgeenglish.net',
    'localhost'
];

// Rate Limiting 설정
define('RATE_LIMIT_REQUESTS', 300); // 시간당 최대 요청 수
define('RATE_LIMIT_WINDOW', 3600);  // 시간 창 (초)

// 로그 설정
define('LOG_FILE', 'api_logs.txt');
define('LOG_MAX_SIZE', 10485760); // 10MB

// 보안 토큰 (선택사항)
define('SECURITY_TOKEN', 'your_security_token_here');

// 개발 모드 (배포 시 false로 변경)
define('DEBUG_MODE', false);

// CORS 설정
define('CORS_ALLOWED_ORIGINS', [
    'https://edgeenglish.net',
    'https://www.edgeenglish.net',
    'http://localhost:3000',
    'http://localhost:3001'
]);

// 입력 검증 설정
define('ALLOWED_MODELS', [
    'gpt-4o',
    'gpt-4',
    'gpt-3.5-turbo'
]);

define('ALLOWED_ROLES', [
    'system',
    'user',
    'assistant'
]);

// 온도 제한
define('MIN_TEMPERATURE', 0);
define('MAX_TEMPERATURE', 2);

// 메시지 길이 제한
define('MAX_MESSAGE_LENGTH', 10000);

// 응답 타임아웃 설정
define('API_TIMEOUT', 30);
define('API_CONNECT_TIMEOUT', 10);

// 에러 메시지 설정
define('ERROR_MESSAGES', [
    'INVALID_JSON' => 'Invalid JSON format',
    'MISSING_FIELDS' => 'Missing required fields',
    'INVALID_MODEL' => 'Invalid model specified',
    'TOO_MANY_MESSAGES' => 'Too many messages',
    'TOKEN_LIMIT_EXCEEDED' => 'Token limit exceeded',
    'INVALID_TEMPERATURE' => 'Invalid temperature value',
    'INVALID_MESSAGE_FORMAT' => 'Invalid message format',
    'RATE_LIMIT_EXCEEDED' => 'Rate limit exceeded. Please try again later.',
    'METHOD_NOT_ALLOWED' => 'Method not allowed',
    'ORIGIN_NOT_ALLOWED' => 'Origin not allowed',
    'INTERNAL_SERVER_ERROR' => 'Internal server error'
]);

// 보안 검증 함수
function isValidDomain($domain) {
    global $ALLOWED_DOMAINS;
    return in_array($domain, $ALLOWED_DOMAINS);
}

function isSecureRequest() {
    return isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
}

function getClientIP() {
    $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
    
    foreach ($ipKeys as $key) {
        if (!empty($_SERVER[$key])) {
            $ips = explode(',', $_SERVER[$key]);
            $ip = trim($ips[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function generateSecurityHeaders() {
    $headers = [
        'X-Content-Type-Options: nosniff',
        'X-Frame-Options: DENY',
        'X-XSS-Protection: 1; mode=block',
        'Strict-Transport-Security: max-age=31536000; includeSubDomains'
    ];
    
    foreach ($headers as $header) {
        header($header);
    }
}

// 초기화
if (SECURE_MODE) {
    generateSecurityHeaders();
}

// 디버그 모드 설정
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}
?>

