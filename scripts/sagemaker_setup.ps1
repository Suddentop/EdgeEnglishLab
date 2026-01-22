# AWS SageMaker 환경 설정 스크립트 (PowerShell)
# Windows PowerShell에서 실행

Write-Host "🚀 AWS SageMaker 환경 설정 시작..." -ForegroundColor Green

# 1. AWS CLI 설치 확인
try {
    $awsVersion = aws --version
    Write-Host "✅ AWS CLI 확인: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI가 설치되지 않았습니다." -ForegroundColor Red
    Write-Host "다음 링크에서 설치하세요: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# 2. AWS 자격 증명 확인
if (-not $env:AWS_ACCESS_KEY_ID -or -not $env:AWS_SECRET_ACCESS_KEY) {
    Write-Host "⚠️ AWS 자격 증명이 환경 변수에 설정되지 않았습니다." -ForegroundColor Yellow
    Write-Host "aws configure 명령어로 설정하거나, 환경 변수를 설정하세요." -ForegroundColor Yellow
}

# 3. S3 버킷 생성
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$bucketName = "engquiz-training-data-$timestamp"
Write-Host "📦 S3 버킷 생성 중: $bucketName" -ForegroundColor Cyan

try {
    aws s3 mb "s3://$bucketName" --region ap-northeast-2
    Write-Host "✅ S3 버킷 생성 완료: $bucketName" -ForegroundColor Green
    $env:SAGEMAKER_TRAINING_BUCKET = $bucketName
    Write-Host "환경 변수 설정: SAGEMAKER_TRAINING_BUCKET=$bucketName" -ForegroundColor Yellow
} catch {
    Write-Host "❌ S3 버킷 생성 실패: $_" -ForegroundColor Red
    exit 1
}

# 4. 모델 아티팩트 버킷 생성
$artifactBucket = "engquiz-model-artifacts-$timestamp"
Write-Host "📦 모델 아티팩트 버킷 생성 중: $artifactBucket" -ForegroundColor Cyan

try {
    aws s3 mb "s3://$artifactBucket" --region ap-northeast-2
    Write-Host "✅ 모델 아티팩트 버킷 생성 완료: $artifactBucket" -ForegroundColor Green
    $env:SAGEMAKER_ARTIFACT_BUCKET = $artifactBucket
    Write-Host "환경 변수 설정: SAGEMAKER_ARTIFACT_BUCKET=$artifactBucket" -ForegroundColor Yellow
} catch {
    Write-Host "❌ 모델 아티팩트 버킷 생성 실패: $_" -ForegroundColor Red
    exit 1
}

# 5. IAM 역할 생성
Write-Host "🔐 IAM 역할 생성 중..." -ForegroundColor Cyan

$trustPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Principal = @{
                Service = "sagemaker.amazonaws.com"
            }
            Action = "sts:AssumeRole"
        }
    )
} | ConvertTo-Json -Depth 10

$trustPolicy | Out-File -FilePath "trust-policy.json" -Encoding UTF8

try {
    aws iam create-role `
        --role-name SageMakerExecutionRole `
        --assume-role-policy-document file://trust-policy.json
    
    Write-Host "✅ IAM 역할 생성 완료" -ForegroundColor Green
    
    # 필요한 권한 부여
    aws iam attach-role-policy `
        --role-name SageMakerExecutionRole `
        --policy-arn arn:aws:iam::aws:policy/AmazonSageMakerFullAccess
    
    aws iam attach-role-policy `
        --role-name SageMakerExecutionRole `
        --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
    
    Write-Host "✅ IAM 권한 부여 완료" -ForegroundColor Green
} catch {
    Write-Host "⚠️ IAM 역할이 이미 존재할 수 있습니다: $_" -ForegroundColor Yellow
}

# 6. Python 가상환경 생성
Write-Host "🐍 Python 가상환경 설정 중..." -ForegroundColor Cyan

if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "✅ 가상환경 생성 완료" -ForegroundColor Green
} else {
    Write-Host "⚠️ 가상환경이 이미 존재합니다." -ForegroundColor Yellow
}

# 가상환경 활성화
& "venv\Scripts\Activate.ps1"

# 7. 필수 패키지 설치
Write-Host "📦 필수 패키지 설치 중..." -ForegroundColor Cyan
pip install --upgrade pip
pip install sagemaker boto3 transformers torch pandas numpy datasets

Write-Host "✅ 패키지 설치 완료" -ForegroundColor Green

# 8. 설정 파일 생성
Write-Host "📝 설정 파일 생성 중..." -ForegroundColor Cyan

$roleArn = aws iam get-role --role-name SageMakerExecutionRole --query 'Role.Arn' --output text

$envContent = @"
# AWS SageMaker 설정
AWS_REGION=ap-northeast-2
SAGEMAKER_TRAINING_BUCKET=$bucketName
SAGEMAKER_ARTIFACT_BUCKET=$artifactBucket
SAGEMAKER_ROLE_ARN=$roleArn
"@

$envContent | Out-File -FilePath ".env.sagemaker" -Encoding UTF8

Write-Host "✅ 설정 파일 생성 완료: .env.sagemaker" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 환경 설정이 완료되었습니다!" -ForegroundColor Green
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Yellow
Write-Host "1. .env.sagemaker 파일을 확인하세요"
Write-Host "2. 데이터 준비 스크립트를 실행하세요: python scripts/prepare_training_data.py"
Write-Host "3. 학습 작업을 시작하세요: python scripts/launch_training_job.py"
