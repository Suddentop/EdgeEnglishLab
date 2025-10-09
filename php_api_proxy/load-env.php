<?php
/**
 * .env 파일 로더
 * PHP는 Node.js처럼 자동으로 .env를 로드하지 않으므로 수동으로 파싱
 */

function loadEnv($path = '.env') {
    if (!file_exists($path)) {
        return;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // 주석 제거
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // KEY=VALUE 파싱
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // 따옴표 제거
            $value = trim($value, '"\'');
            
            // 환경 변수 설정
            putenv("$key=$value");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

// .env 파일 로드
loadEnv(__DIR__ . '/.env');
?>


