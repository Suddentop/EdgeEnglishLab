<?php
// translate-english-text.php
// 영어 본문 텍스트 번역 API

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS 요청 처리
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// POST 요청만 허용
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// 환경 변수 로드
require_once 'load-env.php';

// OpenAI API 키 확인
$openai_api_key = getenv('OPENAI_API_KEY');
if (!$openai_api_key) {
    error_log('CRITICAL: OPENAI_API_KEY not configured in translate-english-text.php');
    http_response_code(500);
    echo json_encode(['error' => 'OpenAI API key not configured', 'debug' => 'Check server environment variables']);
    exit();
}

// API 키 유효성 간단 검증
if (!str_starts_with($openai_api_key, 'sk-')) {
    error_log('CRITICAL: OPENAI_API_KEY format invalid in translate-english-text.php');
    http_response_code(500);
    echo json_encode(['error' => 'API Key format invalid', 'debug' => 'API key should start with sk-']);
    exit();
}

// 요청 데이터 파싱 및 검증
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit();
}

if (!isset($input['englishText'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required field: englishText']);
    exit();
}

if (empty($input['englishText'])) {
    http_response_code(400);
    echo json_encode(['error' => 'English text cannot be empty']);
    exit();
}

$englishText = $input['englishText'];
$userId = $input['userId'] ?? 'anonymous';

try {
    // OpenAI API를 사용한 영어 텍스트 번역
    $translationResult = translateEnglishTextWithOpenAI($englishText, $openai_api_key);
    
    // 결과 반환
    echo json_encode([
        'success' => true,
        'data' => $translationResult
    ]);
    
} catch (Exception $e) {
    error_log("Text translation error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Translation failed',
        'message' => $e->getMessage()
    ]);
}

/**
 * OpenAI API를 사용한 영어 텍스트 번역
 */
function translateEnglishTextWithOpenAI($englishText, $apiKey) {
    $url = 'https://api.openai.com/v1/chat/completions';
    
    // 영어 본문을 한글로 번역하는 프롬프트
    $prompt = "다음 영어 본문을 자연스러운 한국어로 번역해주세요.

요구사항:
1. 문맥을 고려하여 정확하고 자연스러운 번역을 제공하세요.
2. 영어 원문을 그대로 유지하세요.
3. 문제 유형을 파악하여 적절한 번역을 제공하세요.

영어 본문:
{$englishText}

응답은 다음 JSON 형식으로 해주세요:
{
  \"englishText\": \"원문 영어 본문 (변경 없음)\",
  \"koreanTranslation\": \"한글 번역\",
  \"problemType\": \"문제 유형 (독해, 문법, 어휘 등)\",
  \"answers\": [\"정답1\", \"정답2\"],
  \"analysis\": \"문제에 대한 간단한 분석\"
}";

    $data = [
        'model' => 'gpt-4o',
        'messages' => [
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ],
        'max_tokens' => 2000,
        'temperature' => 0.3
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        throw new Exception("cURL error: " . $error);
    }
    
    if ($httpCode !== 200) {
        throw new Exception("OpenAI API error: HTTP " . $httpCode . " - " . $response);
    }
    
    $result = json_decode($response, true);
    
    if (!$result || !isset($result['choices'][0]['message']['content'])) {
        throw new Exception("Invalid response from OpenAI API");
    }
    
    $content = $result['choices'][0]['message']['content'];
    
    // JSON 응답 파싱
    $jsonStart = strpos($content, '{');
    $jsonEnd = strrpos($content, '}') + 1;
    
    if ($jsonStart === false || $jsonEnd === false) {
        throw new Exception("No valid JSON found in response");
    }
    
    $jsonString = substr($content, $jsonStart, $jsonEnd - $jsonStart);
    $parsedResult = json_decode($jsonString, true);
    
    if (!$parsedResult) {
        throw new Exception("Failed to parse JSON response");
    }
    
    return $parsedResult;
}
?>


