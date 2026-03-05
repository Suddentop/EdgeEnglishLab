<?php
/**
 * CORS 헤더 - secure-api-proxy.php 맨 위(다른 출력 전)에 이 블록을 추가하세요.
 * 원인: 브라우저가 cross-origin 요청 시 서버 응답에 Access-Control-Allow-Origin 이 없으면 차단함.
 * 자세한 설명: docs/CORS_AND_API_PROXY.md
 */

$allowed_origins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://edgeenglish.net',
    'https://www.edgeenglish.net',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
// 이하 기존 OpenAI 프록시 로직 계속
