<?php
/**
 * API 요청 제한 및 인증 관리
 */

class RateLimiter {
    private $storageFile;
    private $maxRequests;
    private $timeWindow;

    public function __construct($storageFile = 'rate_limit.json', $maxRequests = 300, $timeWindow = 3600) {
        $this->storageFile = $storageFile;
        $this->maxRequests = $maxRequests;
        $this->timeWindow = $timeWindow;
    }

    /**
     * 요청 제한 확인
     */
    public function checkRateLimit($identifier = null) {
        if (!$identifier) {
            $identifier = $this->getClientIdentifier();
        }

        $data = $this->loadData();
        $currentTime = time();

        // 오래된 데이터 정리
        if (isset($data[$identifier])) {
            $data[$identifier] = array_filter($data[$identifier], function($timestamp) use ($currentTime) {
                return ($currentTime - $timestamp) < $this->timeWindow;
            });
        }

        // 요청 수 확인
        $requestCount = isset($data[$identifier]) ? count($data[$identifier]) : 0;

        if ($requestCount >= $this->maxRequests) {
            return false; // 요청 제한 초과
        }

        // 새 요청 기록
        $data[$identifier][] = $currentTime;
        $this->saveData($data);

        return true;
    }

    /**
     * 클라이언트 식별자 생성
     */
    private function getClientIdentifier() {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        return hash('sha256', $ip . $userAgent);
    }

    /**
     * 데이터 로드
     */
    private function loadData() {
        if (file_exists($this->storageFile)) {
            $content = file_get_contents($this->storageFile);
            return json_decode($content, true) ?: [];
        }
        return [];
    }

    /**
     * 데이터 저장
     */
    private function saveData($data) {
        file_put_contents($this->storageFile, json_encode($data));
    }
}

/**
 * API 키 검증
 */
function validateApiKey($providedKey) {
    $validKeys = [
        hash('sha256', 'your_secret_key_here'),
        // 추가 키들...
    ];
    
    return in_array(hash('sha256', $providedKey), $validKeys);
}

/**
 * 요청 검증
 */
function validateRequest($data) {
    // 필수 필드 확인
    if (!isset($data['model']) || !isset($data['messages'])) {
        return false;
    }

    // 모델 허용 목록
    $allowedModels = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'];
    if (!in_array($data['model'], $allowedModels)) {
        return false;
    }

    // 메시지 개수 제한
    if (count($data['messages']) > 50) {
        return false;
    }

    // 토큰 수 제한
    if (isset($data['max_tokens']) && $data['max_tokens'] > 4000) {
        return false;
    }

    return true;
}
?>
