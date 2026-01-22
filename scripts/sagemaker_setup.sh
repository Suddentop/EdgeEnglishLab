#!/bin/bash
# AWS SageMaker 환경 설정 스크립트
# Windows PowerShell에서는 WSL 또는 Git Bash를 사용하거나, 동일한 내용을 PowerShell 스크립트로 변환 필요

echo "🚀 AWS SageMaker 환경 설정 시작..."

# 1. AWS CLI 설치 확인
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI가 설치되지 않았습니다."
    echo "다음 명령어로 설치하세요:"
    echo "  Windows: https://aws.amazon.com/cli/"
    echo "  또는: pip install awscli"
    exit 1
fi

# 2. AWS 자격 증명 확인
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "⚠️ AWS 자격 증명이 환경 변수에 설정되지 않았습니다."
    echo "aws configure 명령어로 설정하거나, 환경 변수를 설정하세요."
fi

# 3. S3 버킷 생성
BUCKET_NAME="engquiz-training-data-$(date +%s)"
echo "📦 S3 버킷 생성 중: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME --region ap-northeast-2

if [ $? -eq 0 ]; then
    echo "✅ S3 버킷 생성 완료: $BUCKET_NAME"
    echo "환경 변수에 추가하세요:"
    echo "  export SAGEMAKER_TRAINING_BUCKET=$BUCKET_NAME"
else
    echo "❌ S3 버킷 생성 실패"
    exit 1
fi

# 4. 모델 아티팩트 버킷 생성
ARTIFACT_BUCKET="engquiz-model-artifacts-$(date +%s)"
echo "📦 모델 아티팩트 버킷 생성 중: $ARTIFACT_BUCKET"
aws s3 mb s3://$ARTIFACT_BUCKET --region ap-northeast-2

if [ $? -eq 0 ]; then
    echo "✅ 모델 아티팩트 버킷 생성 완료: $ARTIFACT_BUCKET"
    echo "환경 변수에 추가하세요:"
    echo "  export SAGEMAKER_ARTIFACT_BUCKET=$ARTIFACT_BUCKET"
else
    echo "❌ 모델 아티팩트 버킷 생성 실패"
    exit 1
fi

# 5. IAM 역할 생성 (신뢰 정책)
echo "🔐 IAM 역할 생성 중..."
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "sagemaker.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
    --role-name SageMakerExecutionRole \
    --assume-role-policy-document file://trust-policy.json

if [ $? -eq 0 ]; then
    echo "✅ IAM 역할 생성 완료"
    
    # 필요한 권한 부여
    aws iam attach-role-policy \
        --role-name SageMakerExecutionRole \
        --policy-arn arn:aws:iam::aws:policy/AmazonSageMakerFullAccess
    
    aws iam attach-role-policy \
        --role-name SageMakerExecutionRole \
        --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
    
    echo "✅ IAM 권한 부여 완료"
else
    echo "⚠️ IAM 역할이 이미 존재할 수 있습니다."
fi

# 6. Python 가상환경 생성
echo "🐍 Python 가상환경 설정 중..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ 가상환경 생성 완료"
else
    echo "⚠️ 가상환경이 이미 존재합니다."
fi

source venv/bin/activate  # Windows에서는 venv\Scripts\activate

# 7. 필수 패키지 설치
echo "📦 필수 패키지 설치 중..."
pip install --upgrade pip
pip install sagemaker boto3 transformers torch pandas numpy datasets

echo "✅ 패키지 설치 완료"

# 8. 설정 파일 생성
echo "📝 설정 파일 생성 중..."
cat > .env.sagemaker <<EOF
# AWS SageMaker 설정
AWS_REGION=ap-northeast-2
SAGEMAKER_TRAINING_BUCKET=$BUCKET_NAME
SAGEMAKER_ARTIFACT_BUCKET=$ARTIFACT_BUCKET
SAGEMAKER_ROLE_ARN=$(aws iam get-role --role-name SageMakerExecutionRole --query 'Role.Arn' --output text)
EOF

echo "✅ 설정 파일 생성 완료: .env.sagemaker"
echo ""
echo "🎉 환경 설정이 완료되었습니다!"
echo ""
echo "다음 단계:"
echo "1. .env.sagemaker 파일을 확인하세요"
echo "2. 데이터 준비 스크립트를 실행하세요: python scripts/prepare_training_data.py"
echo "3. 학습 작업을 시작하세요: python scripts/launch_training_job.py"
