<?php
// analyze-problem-image.php
// 영어 문제 이미지 분석 API

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
    error_log('CRITICAL: OPENAI_API_KEY not configured in analyze-problem-image.php');
    http_response_code(500);
    echo json_encode(['error' => 'OpenAI API key not configured', 'debug' => 'Check server environment variables']);
    exit();
}

// API 키 유효성 간단 검증
if (!str_starts_with($openai_api_key, 'sk-')) {
    error_log('CRITICAL: OPENAI_API_KEY format invalid in analyze-problem-image.php');
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

if (!isset($input['image'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required field: image']);
    exit();
}

if (empty($input['image'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Image data cannot be empty']);
    exit();
}

$base64Image = $input['image'];
$extractedText = $input['extractedText'] ?? '';
$userId = $input['userId'] ?? 'anonymous';

try {
    // OpenAI Vision API를 사용한 이미지 분석
    $analysisResult = analyzeImageWithOpenAI($base64Image, $extractedText, $openai_api_key);
    
    // 결과 반환
    echo json_encode([
        'success' => true,
        'data' => $analysisResult
    ]);
    
} catch (Exception $e) {
    error_log("Image analysis error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Analysis failed',
        'message' => $e->getMessage()
    ]);
}

/**
 * OpenAI Vision API를 사용한 이미지 분석
 */
function analyzeImageWithOpenAI($base64Image, $extractedText, $apiKey) {
    $url = 'https://api.openai.com/v1/chat/completions';
    
    // 이미지에서 텍스트 추출 및 문제 분석을 위한 프롬프트
    $prompt = "이 이미지는 영어 문제입니다. 다음을 수행해주세요:

1. 이미지에서 모든 영어 텍스트를 정확히 추출하세요.
2. 추출된 텍스트를 자연스러운 영어 본문으로 정리하세요.
3. 문제의 유형을 파악하세요 (독해, 문법, 어휘 등).
4. 정답을 찾아주세요 (있는 경우).
5. 문제에 대한 간단한 분석을 제공하세요.";

    // OCR로 추출된 텍스트가 있으면 추가 정보로 활용
    if (!empty($extractedText)) {
        $prompt .= "\n\n추가 정보: OCR로 추출된 텍스트가 있습니다:\n" . $extractedText . "\n\n이 텍스트를 참고하여 더 정확한 분석을 해주세요.";
    }

    $prompt .= "\n\n응답은 다음 JSON 형식으로 해주세요:
{
  \"englishText\": \"추출된 영어 본문\",
  \"koreanTranslation\": \"한글 번역\",
  \"problemType\": \"문제 유형\",
  \"answers\": [\"정답1\", \"정답2\"],
  \"analysis\": \"문제 분석 설명\"
}";

    $data = [
        'model' => 'gpt-4o',
        'messages' => [
            [
                'role' => 'user',
                'content' => [
                    [
                        'type' => 'text',
                        'text' => $prompt
                    ],
                    [
                        'type' => 'image_url',
                        'image_url' => [
                            'url' => $base64Image
                        ]
                    ]
                ]
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
    
    // 필수 필드 확인
    $requiredFields = ['englishText', 'koreanTranslation', 'problemType', 'answers', 'analysis'];
    foreach ($requiredFields as $field) {
        if (!isset($parsedResult[$field])) {
            $parsedResult[$field] = '';
        }
    }
    
    // answers가 배열이 아닌 경우 배열로 변환
    if (!is_array($parsedResult['answers'])) {
        $parsedResult['answers'] = [$parsedResult['answers']];
    }
    
    return $parsedResult;
}

/**
 * 사용량 제한 체크 (선택사항)
 */
function checkRateLimit($userId) {
    // Redis나 데이터베이스를 사용한 사용량 제한 구현
    // 현재는 기본 구현
    return true;
}

/**
 * 로그 기록
 */
function logAnalysis($userId, $result) {
    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'userId' => $userId,
        'success' => true,
        'problemType' => $result['problemType'] ?? 'unknown'
    ];
    
    error_log("Image analysis completed: " . json_encode($logData));
}
?>
