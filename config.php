<?php
/**
 * 서버 환경 설정 파일
 * dothome.co.kr 서버에서만 사용
 */

// 환경 변수 로드 (서버에서 설정)
$config = [
    'OPENAI_API_KEY' => getenv('OPENAI_API_KEY') ?: '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',
    'API_RATE_LIMIT' => 300,
    'API_TIMEOUT' => 60,
    'ALLOWED_ORIGINS' => [
        'https://edgeenglish.net',
        'https://www.edgeenglish.net'
    ],
    'LOG_FILE' => 'api_logs.txt'
];

// API Key 검증
if ($config['OPENAI_API_KEY'] === 'your_openai_api_key_here') {
    error_log('OpenAI API Key not configured properly');
}

return $config;
?>
