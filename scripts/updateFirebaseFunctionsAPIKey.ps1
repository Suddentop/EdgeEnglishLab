# Firebase Functions OpenAI API 키 업데이트 스크립트
# 사용법: .\scripts\updateFirebaseFunctionsAPIKey.ps1 -ApiKey "YOUR_API_KEY"

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

Write-Host "🔧 Firebase Functions API 키 업데이트 시작..." -ForegroundColor Cyan
Write-Host ""

# API 키 유효성 간단 확인
if (-not $ApiKey.StartsWith("sk-")) {
    Write-Host "⚠️ 경고: API 키가 'sk-'로 시작하지 않습니다. 올바른 키인지 확인하세요." -ForegroundColor Yellow
    $confirm = Read-Host "계속하시겠습니까? (y/n)"
    if ($confirm -ne "y") {
        Write-Host "취소되었습니다." -ForegroundColor Red
        exit 0
    }
}

# Firebase Functions 디렉토리로 이동
Set-Location functions

try {
    Write-Host "📝 API 키 설정 중..." -ForegroundColor Yellow
    
    # Firebase Functions v1 config 방식 (deprecated이지만 여전히 작동)
    firebase functions:config:set openai.api_key="$ApiKey"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ API 키 설정 완료" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 Functions 재배포 중..." -ForegroundColor Yellow
        
        # openaiProxy 함수만 재배포
        firebase deploy --only functions:openaiProxy
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ 완료!" -ForegroundColor Green
            Write-Host "💡 Firebase Console에서 Functions 로그를 확인하여 정상 작동 여부를 확인하세요." -ForegroundColor Cyan
            Write-Host "   로그 확인: firebase functions:log" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Functions 배포 실패" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ API 키 설정 실패" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ 오류 발생: $_" -ForegroundColor Red
    exit 1
} finally {
    Set-Location ..
}

