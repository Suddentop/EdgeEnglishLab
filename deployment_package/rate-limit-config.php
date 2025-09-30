<?php
/**
 * 요청 제한 설정 변경 예시
 */

// 기본 설정 (시간당 300회)
$defaultRateLimit = new RateLimiter('rate_limit.json', 300, 3600);

// 설정 변경 예시들:

// 1. 시간당 200회로 증가
$higherRateLimit = new RateLimiter('rate_limit.json', 200, 3600);

// 2. 30분당 150회로 변경
$shorterWindow = new RateLimiter('rate_limit.json', 150, 1800);

// 3. 하루당 1000회로 변경
$dailyLimit = new RateLimiter('rate_limit.json', 1000, 86400);

// 4. 요청 제한 완전 비활성화 (권장하지 않음)
$unlimited = new RateLimiter('rate_limit.json', 999999, 3600);
?>
