<?php
/**
 * 환경변수 테스트 파일
 * 서버에 업로드하여 API 키가 제대로 로드되는지 확인
 * 
 * 접속: https://edgeenglish.net/php_api_proxy/test-env.php
 */

header('Content-Type: application/json; charset=utf-8');

// .env 파일 로드
if (file_exists(__DIR__ . '/load-env.php')) {
    require_once __DIR__ . '/load-env.php';
}

$result = [
    'status' => 'OK',
    'env_file_exists' => file_exists(__DIR__ . '/.env'),
    'env_file_readable' => is_readable(__DIR__ . '/.env'),
    'api_key_loaded' => !empty(getenv('OPENAI_API_KEY')),
    'api_key_first_10_chars' => substr(getenv('OPENAI_API_KEY'), 0, 10),
    'allowed_origin_1' => getenv('ALLOWED_ORIGIN_1'),
    'allowed_origin_2' => getenv('ALLOWED_ORIGIN_2'),
    'rate_limit' => getenv('API_RATE_LIMIT'),
    'current_directory' => __DIR__,
    'php_version' => phpversion(),
];

echo json_encode($result, JSON_PRETTY_PRINT);
?>





