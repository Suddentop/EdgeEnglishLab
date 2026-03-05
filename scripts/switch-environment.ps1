# 작업 환경 전환 스크립트 (engquiz / dev / ollama)
# 사용: .\scripts\switch-environment.ps1 -Environment engquiz
#       .\scripts\switch-environment.ps1 -Environment dev
#       .\scripts\switch-environment.ps1 -Environment ollama

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("engquiz", "dev", "ollama")]
    [string]$Environment
)

$ErrorActionPreference = "Stop"
$branch = switch ($Environment) {
    "engquiz" { "main" }
    "dev"     { "dev" }
    "ollama"  { "ollama" }
}

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

Write-Host ""
Write-Host "=== 작업 환경 전환: $Environment ===" -ForegroundColor Cyan
Write-Host ""

# 1. fetch & checkout & pull
Write-Host "1. 원격 브랜치 가져오는 중..." -ForegroundColor Yellow
git fetch origin
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "2. 브랜치 전환: $branch" -ForegroundColor Yellow
git checkout $branch
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "3. 최신 내용 가져오는 중..." -ForegroundColor Yellow
git pull origin $branch
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "현재 브랜치: $branch" -ForegroundColor Green
Write-Host ""

# 2. .env.local 안내
$envPath = Join-Path $projectRoot ".env.local"
if ($Environment -eq "ollama") {
    Write-Host ".env.local 확인:" -ForegroundColor Yellow
    Write-Host "  REACT_APP_API_PROXY_URL=http://localhost:4000" -ForegroundColor White
    Write-Host "  (Ollama 프록시: npm run proxy:ollama 실행 후 사용)" -ForegroundColor Gray
} else {
    Write-Host ".env.local 확인:" -ForegroundColor Yellow
    Write-Host "  REACT_APP_API_PROXY_URL=https://us-central1-edgeenglishlab.cloudfunctions.net/openaiProxy" -ForegroundColor White
    Write-Host "  (Firebase OpenAI API 프록시)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "환경 전환 완료. 자세한 루틴은 WORK_ENVIRONMENTS.md 를 참고하세요." -ForegroundColor Cyan
Write-Host ""
